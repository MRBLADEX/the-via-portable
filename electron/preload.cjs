const {contextBridge, ipcRenderer} = require('electron');

const HID_DEVICE_REQUEST_CHANNEL = 'via:hid-device-request';
const HID_DEVICE_SELECTION_CHANNEL = 'via:hid-device-selection';

contextBridge.exposeInMainWorld('viaDesktop', {
  onHidDeviceRequest: (callback) => {
    const listener = (_event, request) => callback(request);
    ipcRenderer.on(HID_DEVICE_REQUEST_CHANNEL, listener);
    return () => ipcRenderer.removeListener(HID_DEVICE_REQUEST_CHANNEL, listener);
  },
  selectHidDevice: (requestId, deviceId) => {
    ipcRenderer.send(HID_DEVICE_SELECTION_CHANNEL, {requestId, deviceId});
  },
});
