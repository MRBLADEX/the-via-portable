import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {createHash} from 'node:crypto';
import path from 'path';
import {splitVendorChunkPlugin} from 'vite';
import {createHtmlPlugin} from 'vite-plugin-html';
import fs from 'fs';

const definitionsPath = path.resolve('public/definitions');
const hashDefinitions = (directory: string) => {
  const hash = createHash('sha256');
  // Bump this when cached definitions need to be refreshed, even if the files
  // themselves have not changed (for example, after fixing text decoding).
  hash.update('definition-cache-v2\0');
  const visit = (currentDirectory: string) => {
    const entries = fs
      .readdirSync(currentDirectory, {withFileTypes: true})
      .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const entry of entries) {
      const filePath = path.join(currentDirectory, entry.name);
      if (entry.isDirectory()) {
        visit(filePath);
      } else if (entry.isFile()) {
        hash.update(path.relative(directory, filePath).split(path.sep).join('/'));
        hash.update('\0');
        hash.update(fs.readFileSync(filePath));
      }
    }
  };

  visit(directory);
  return hash.digest('hex');
};

const hash = hashDefinitions(definitionsPath);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    createHtmlPlugin({
      inject: {
        data: {
          hash,
        },
      },
    }),
    splitVendorChunkPlugin(),
  ],
  assetsInclude: ['**/*.glb'],
  envDir: '.',
  server: {open: true},
  resolve: {
    alias: {
      src: path.resolve(__dirname, './src'),
      assets: path.resolve(__dirname, './src/assets'),
    },
  },
  optimizeDeps: {
    include: ['@the-via/reader'],
    esbuildOptions: {
      // Node.js global to browser globalThis
      define: {
        global: 'globalThis',
      },
      // Enable esbuild polyfill plugins
      plugins: [],
    },
  },
});
