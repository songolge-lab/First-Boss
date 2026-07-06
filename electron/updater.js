// GitHub Releases auto-update (electron-updater), main-process side.
//
// Provider/owner/repo come from package.json "build.publish"; the packaged
// app carries that as app-update.yml, so nothing about the GitHub repo is
// hardcoded here and no token is ever needed on the client for PUBLIC releases.
//
// Flow: check on startup -> auto-download -> tell the renderer when a build is
// ready -> install only when the user clicks (renderer sends updater:install).
// Update state is pushed to the renderer over a single 'updater:status' channel.

const { app, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');

let wired = false;

function initAutoUpdate(getWindow) {
    // Only packaged builds have update metadata + an installer to swap in.
    // `electron:start` (unpackaged) and `electron:dev` skip entirely, which
    // also avoids electron-updater's "dev-app-update.yml not found" error.
    if (!app.isPackaged) return;
    if (wired) return;
    wired = true;

    autoUpdater.autoDownload = true;
    // Fallback: if the user never clicks "restart now", still install on quit.
    autoUpdater.autoInstallOnAppQuit = true;

    const send = (payload) => {
        const win = getWindow();
        if (win && !win.isDestroyed()) {
            win.webContents.send('updater:status', payload);
        }
    };

    autoUpdater.on('checking-for-update', () => send({ state: 'checking' }));
    autoUpdater.on('update-available', (info) =>
        send({ state: 'available', version: info?.version }));
    autoUpdater.on('update-not-available', () => send({ state: 'not-available' }));
    autoUpdater.on('download-progress', (p) =>
        send({ state: 'downloading', percent: p?.percent ?? 0 }));
    autoUpdater.on('update-downloaded', (info) =>
        send({ state: 'downloaded', version: info?.version }));
    autoUpdater.on('error', (err) =>
        send({ state: 'error', message: String((err && err.message) || err) }));

    // Renderer confirmed the restart. quitAndInstall closes all windows and
    // relaunches into the freshly installed version (NSIS only — a portable
    // .exe has no installer to run, which is why nsis is the update target).
    ipcMain.on('updater:install', () => {
        autoUpdater.quitAndInstall();
    });

    // Optional manual re-check from the UI ("check again" after an error).
    ipcMain.on('updater:check', () => {
        autoUpdater.checkForUpdates().catch(() => { /* surfaced via 'error' event */ });
    });

    autoUpdater.checkForUpdates().catch(() => { /* surfaced via 'error' event */ });
}

module.exports = { initAutoUpdate };
