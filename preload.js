/**
 * preload.js — Secure contextBridge between Electron main & renderer
 * Exposes only the APIs the renderer actually needs, nothing more.
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Window controls
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close:    () => ipcRenderer.send('window-close'),

  // Proxied HTTP GET — main process makes the request (no CSP/CORS issues)
  fetchUrl: (url) => ipcRenderer.invoke('fetch-url', url),

  // System notifications
  showNotification: (title, body) =>
    ipcRenderer.send('show-notification', { title, body }),

  // System theme
  getSystemTheme: () => ipcRenderer.invoke('get-system-theme'),
});
