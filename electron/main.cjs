const {app, BrowserWindow, dialog, session, shell} = require('electron');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const http = require('node:http');
const path = require('node:path');

const APP_ROOT = path.resolve(__dirname, '..');
const DIST_ROOT = path.join(APP_ROOT, 'dist');
const LOOPBACK_HOST = '127.0.0.1';
// Keep the origin stable so Chromium's localStorage and IndexedDB survive restarts.
const APP_PORT = 43127;
const CONTENT_TYPES = {
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.txt': 'text/plain; charset=utf-8',
  '.wasm': 'application/wasm',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml; charset=utf-8',
};

let mainWindow;
let appOrigin;
let staticServer;
let savedDeviceIds = new Set();
let permissionFile;

const hasAppOrigin = (origin) => {
  try {
    return new URL(origin).origin === appOrigin;
  } catch {
    return false;
  }
};

const loadSavedDevices = async () => {
  permissionFile = path.join(app.getPath('userData'), 'hid-permissions.json');
  try {
    const data = JSON.parse(await fsp.readFile(permissionFile, 'utf8'));
    savedDeviceIds = new Set(
      Array.isArray(data) ? data.filter((id) => typeof id === 'string') : [],
    );
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.warn('Could not read saved HID permissions:', error);
    }
    savedDeviceIds = new Set();
  }
};

const saveDevicePermission = async (deviceId) => {
  savedDeviceIds.add(deviceId);
  await fsp.mkdir(path.dirname(permissionFile), {recursive: true});
  await fsp.writeFile(
    permissionFile,
    JSON.stringify([...savedDeviceIds], null, 2),
    'utf8',
  );
};

const sendFile = (request, response, filePath) => {
  response.writeHead(200, {
    'Cache-Control': 'no-cache',
    'Content-Type':
      CONTENT_TYPES[path.extname(filePath).toLowerCase()] ??
      'application/octet-stream',
    'X-Content-Type-Options': 'nosniff',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => {
    if (!response.headersSent) response.writeHead(500);
    response.end();
  });
  stream.pipe(response);
};

const handleStaticRequest = async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, {Allow: 'GET, HEAD'});
    response.end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(
      new URL(request.url, 'http://127.0.0.1').pathname,
    );
  } catch {
    response.writeHead(400);
    response.end();
    return;
  }

  const relativePath = pathname.replace(/^[/\\]+/, '') || 'index.html';
  const filePath = path.resolve(DIST_ROOT, relativePath);
  const relativeCheck = path.relative(DIST_ROOT, filePath);
  if (relativeCheck.startsWith('..') || path.isAbsolute(relativeCheck)) {
    response.writeHead(403);
    response.end();
    return;
  }

  let resolvedPath = filePath;
  try {
    const stats = await fsp.stat(resolvedPath);
    if (stats.isDirectory()) resolvedPath = path.join(resolvedPath, 'index.html');
    await fsp.access(resolvedPath, fs.constants.R_OK);
  } catch {
    // Vite's SPA routes have no physical file; serve index.html on direct reload.
    if (
      (request.headers.accept ?? '').includes('text/html') &&
      !path.extname(pathname)
    ) {
      resolvedPath = path.join(DIST_ROOT, 'index.html');
      try {
        await fsp.access(resolvedPath, fs.constants.R_OK);
      } catch {
        response.writeHead(404);
        response.end('The production UI has not been built.');
        return;
      }
    } else {
      response.writeHead(404);
      response.end();
      return;
    }
  }

  sendFile(request, response, resolvedPath);
};

const startStaticServer = () =>
  new Promise((resolve, reject) => {
    const server = http.createServer((request, response) => {
      void handleStaticRequest(request, response).catch((error) => {
        console.error('Static app server error:', error);
        if (!response.headersSent) response.writeHead(500);
        response.end();
      });
    });
    server.once('error', reject);
    server.listen(APP_PORT, LOOPBACK_HOST, () => {
      resolve({server, url: `http://${LOOPBACK_HOST}:${APP_PORT}`});
    });
  });

const formatDeviceId = (id) => `0x${id.toString(16).padStart(4, '0')}`;

const configureHIDPermissions = () => {
  const appSession = session.defaultSession;

  appSession.setPermissionCheckHandler(
    (webContents, permission, requestingOrigin) =>
      permission === 'hid' &&
      webContents.id === mainWindow?.webContents.id &&
      hasAppOrigin(requestingOrigin),
  );

  appSession.setDevicePermissionHandler(
    ({device, deviceType, origin}) =>
      deviceType === 'hid' &&
      hasAppOrigin(origin) &&
      savedDeviceIds.has(device.deviceId),
  );

  appSession.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    const devices = (details.deviceList ?? []).filter(
      (device) => device.deviceId,
    );
    if (!hasAppOrigin(details.origin) || devices.length === 0) {
      callback();
      return;
    }

    const buttons = devices.map(
      (device) =>
        `${device.name || '未命名 HID 设备'} (VID ${formatDeviceId(device.vendorId)}, PID ${formatDeviceId(device.productId)})`,
    );
    const cancelId = buttons.length;
    buttons.push('取消');

    void dialog
      .showMessageBox(mainWindow, {
        type: 'question',
        title: '选择键盘',
        message: '选择要授权给 VIA Keyboard 的 HID 设备：',
        buttons,
        cancelId,
        defaultId: 0,
        noLink: true,
      })
      .then(async ({response}) => {
        const selectedDevice = devices[response];
        if (!selectedDevice) {
          callback();
          return;
        }
        await saveDevicePermission(selectedDevice.deviceId);
        callback(selectedDevice.deviceId);
      })
      .catch((error) => {
        console.error('HID device selection failed:', error);
        callback();
      });
  });
};

const openExternalLink = (url) => {
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      void shell.openExternal(parsed.href);
    }
  } catch {
    // Ignore malformed or unsupported external URLs.
  }
};

const createWindow = async (url) => {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 920,
    minHeight: 640,
    autoHideMenuBar: true,
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.webContents.setWindowOpenHandler(({url: targetUrl}) => {
    openExternalLink(targetUrl);
    return {action: 'deny'};
  });
  mainWindow.webContents.on('will-navigate', (event, targetUrl) => {
    if (!hasAppOrigin(targetUrl)) {
      event.preventDefault();
      openExternalLink(targetUrl);
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.on('closed', () => {
    mainWindow = undefined;
  });

  await mainWindow.loadURL(url);
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  });

  app.whenReady().then(async () => {
    try {
      await loadSavedDevices();
      const {server, url} = await startStaticServer();
      staticServer = server;
      appOrigin = new URL(url).origin;
      configureHIDPermissions();
      await createWindow(url);
    } catch (error) {
      console.error('Could not start VIA Keyboard:', error);
      dialog.showErrorBox(
        'VIA Keyboard failed to start',
        error?.code === 'EADDRINUSE'
          ? `Port ${APP_PORT} on this computer is already in use. Close the application using it and restart VIA Keyboard.`
          : 'Unable to start the local application. Please rebuild the application and try again.',
      );
      app.quit();
    }
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0 && appOrigin) {
      void createWindow(appOrigin);
    }
  });

  app.on('before-quit', () => {
    staticServer?.close();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
