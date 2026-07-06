// Preload bridge. The game (src/**) needs zero Node/Electron APIs; the only
// thing exposed is a narrow, one-way update channel so the renderer can show a
// notification and confirm the restart. contextIsolation + sandbox stay on;
// the renderer never touches ipcRenderer/Electron directly.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('updater', {
    // Subscribe to update status pushed from main. Returns an unsubscribe fn.
    // The main-process payload is forwarded as-is (no live event object leaks).
    onStatus: (callback) => {
        const listener = (_event, payload) => callback(payload);
        ipcRenderer.on('updater:status', listener);
        return () => ipcRenderer.removeListener('updater:status', listener);
    },
    // User confirmed "restart and update" -> main runs quitAndInstall().
    install: () => ipcRenderer.send('updater:install'),
    // Optional manual re-check (e.g. a "try again" button after an error).
    check: () => ipcRenderer.send('updater:check'),
});
