const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld(
  "api", {
    getPrinters: () => ipcRenderer.invoke('get-printers'),
    print: (data) => ipcRenderer.invoke('print-invoice', data),
    printToService: (data) => ipcRenderer.invoke('print-to-service', data),
    quitApp: () => ipcRenderer.send('quit-app')
  }
);
