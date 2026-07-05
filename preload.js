// preload.js — the only file allowed to touch Electron/Node internals.
// Exposes a small, safe API on window.petAPI. Never exposes ipcRenderer
// directly to the renderer.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('petAPI', {
  moveWindow: (x, y) => ipcRenderer.send('move-window', { x, y }),
  showContextMenu: () => ipcRenderer.send('show-context-menu'),
  quit: () => ipcRenderer.send('quit-app'),
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-action', (_event, action) => callback(action));
  },
});
