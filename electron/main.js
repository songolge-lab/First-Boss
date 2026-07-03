// Electron desktop launcher (dev + production packaging).
//
// Two loading modes, decided purely by the ELECTRON_START_URL env var:
//
//   * DEV      — `npm run electron:dev` sets ELECTRON_START_URL=http://localhost:3000
//                and we load that dev server (the exact same static site the
//                browser workflow serves via `npm start`). Unchanged behavior.
//   * PRODUCTION — no ELECTRON_START_URL (e.g. `npm run electron:start` or a
//                packaged .exe). We serve the bundled game over a custom,
//                privileged `app://` scheme instead of raw file://, so that ES
//                modules and fetch() work exactly like they do over http.
//
// Why a custom scheme and not file://: Chromium blocks ES module imports and
// fetch() over file:// (opaque origin, no proper URL resolution). Registering
// `app://` as a *standard*, *secure* scheme gives the page a real origin so
// `<script type="module">`, `import.meta.url` resolution, and fetch() behave
// the same as on the dev server -- no gameplay/src changes required.

const { app, BrowserWindow, Menu, protocol } = require('electron');
const path = require('path');
const fsp = require('fs').promises;
const { buildDevMenu } = require('./devMenu');

// When set (electron:dev), load this dev server. When unset, we're production
// and load the bundled app:// URL below.
const DEV_SERVER_URL = process.env.ELECTRON_START_URL || null;

// Custom app scheme details. 'bundle' is an arbitrary but stable host; every
// asset (index.html, src/**, styles/**, hero_progression_matrix.json) resolves
// relative to it, so `src/main.js`'s `new URL('../hero_progression_matrix.json',
// import.meta.url)` lands on app://bundle/hero_progression_matrix.json.
const APP_SCHEME = 'app';
const APP_ORIGIN = `${APP_SCHEME}://bundle`;
const PROD_START_URL = `${APP_ORIGIN}/index.html`;

// The URL actually loaded on startup, and the base the dev/admin menu appends
// its ?vfxQuality=... / ?perf=1 query presets to.
const START_URL = DEV_SERVER_URL || PROD_START_URL;

// Root the app:// handler serves files from. In an asar package __dirname is
// <...>/app.asar/electron, so the packaged app root is one level up (fs is
// asar-aware). Unpackaged (electron:start), this is the repo root.
const APP_ROOT = path.join(__dirname, '..');

// The custom scheme MUST be registered as privileged before the app is ready.
// standard      -> real origin + proper relative URL resolution
// secure        -> treated as a secure context (needed for modules)
// supportFetchAPI-> fetch() works against app:// URLs
// corsEnabled/stream -> permissive fetch + streamed responses
protocol.registerSchemesAsPrivileged([
    {
        scheme: APP_SCHEME,
        privileges: {
            standard: true,
            secure: true,
            supportFetchAPI: true,
            corsEnabled: true,
            stream: true,
        },
    },
]);

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.mjs': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.map': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
};

function contentTypeFor(filePath) {
    return MIME_TYPES[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

// Serve one file from APP_ROOT for an app:// request. The path is taken from
// the URL pathname only (query/hash ignored), and a traversal guard keeps the
// resolved file strictly inside APP_ROOT.
async function handleAppRequest(request) {
    try {
        const { pathname } = new URL(request.url);
        let relPath = decodeURIComponent(pathname).replace(/^\/+/, '');
        if (relPath === '') relPath = 'index.html';

        const resolvedRoot = path.resolve(APP_ROOT);
        const resolvedFile = path.resolve(resolvedRoot, relPath);
        if (resolvedFile !== resolvedRoot && !resolvedFile.startsWith(resolvedRoot + path.sep)) {
            return new Response('Forbidden', { status: 403 });
        }

        const data = await fsp.readFile(resolvedFile);
        return new Response(data, {
            status: 200,
            headers: { 'content-type': contentTypeFor(resolvedFile) },
        });
    } catch (err) {
        if (err && err.code === 'ENOENT') {
            return new Response('Not Found', { status: 404 });
        }
        console.error('app:// handler error:', err);
        return new Response('Internal Error', { status: 500 });
    }
}

// Safe, conservative GPU switch: asks Chromium not to disable GPU
// acceleration for hardware on its internal blocklist. This does NOT force
// selection of a specific (e.g. NVIDIA discrete) GPU -- Windows hybrid-
// graphics GPU selection is controlled by the OS/driver (Settings > Display
// > Graphics), not by this switch. Applied before app is ready, and left out
// entirely if it ever throws so a bad flag can't block startup.
try {
    app.commandLine.appendSwitch('ignore-gpu-blocklist');
} catch (err) {
    console.warn('Skipping GPU switch (ignore-gpu-blocklist):', err);
}

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        backgroundColor: '#111116', // matches styles/style.css body background
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    mainWindow.loadURL(START_URL);

    Menu.setApplicationMenu(buildDevMenu(() => mainWindow, START_URL));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(() => {
    // Register the file handler once ready. Harmless in dev (we never load
    // app:// there); required in production so app://bundle/... resolves.
    protocol.handle(APP_SCHEME, handleAppRequest);
    createWindow();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
