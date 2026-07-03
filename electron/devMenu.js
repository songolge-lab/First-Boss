// Dev/admin menu for the Electron desktop launcher (works in dev AND production).
//
// Every preset below just reloads the SAME start URL with a different query
// string. This works because src/core/PerfMonitor.js parses ?perf=1 and
// ?vfxQuality=... from window.location.search once at module load -- so no
// gameplay/VFX code needs to change here, but a full navigation is required
// (not history.pushState) so that re-parse actually happens.
//
// The base URL is whatever main.js is running against: http://localhost:3000
// in dev, or app://bundle/index.html in production. Presets are combined with
// it via the WHATWG URL parser so both origins produce a correct URL:
//   new URL('?vfxQuality=auto', 'http://localhost:3000')      -> http://localhost:3000/?vfxQuality=auto
//   new URL('?vfxQuality=auto', 'app://bundle/index.html')    -> app://bundle/index.html?vfxQuality=auto

const { Menu } = require('electron');

// label -> query string layered onto the base start URL.
const PRESETS = [
    { label: 'Play Auto', query: '?vfxQuality=auto' },
    { label: 'Play Normal', query: '?vfxQuality=normal' },
    { label: 'Play Lite', query: '?vfxQuality=lite' },
    { label: 'Play Performance', query: '?vfxQuality=performance' },
    { label: 'Perf Normal', query: '?perf=1&vfxQuality=normal' },
    { label: 'Perf Lite', query: '?perf=1&vfxQuality=lite' },
    { label: 'Perf Performance', query: '?perf=1&vfxQuality=performance' },
    { label: 'Perf Auto', query: '?perf=1&vfxQuality=auto' },
];

// getWindow: () => BrowserWindow, so the menu always targets the current
// window even if it's recreated. startUrl: the base URL main.js loaded
// (dev-server origin OR app://bundle/index.html) that presets are layered on.
function buildDevMenu(getWindow, startUrl) {
    const urlFor = (query) => new URL(query, startUrl).toString();

    const presetItems = PRESETS.map(({ label, query }) => ({
        label,
        click() {
            const win = getWindow();
            if (win) win.loadURL(urlFor(query));
        },
    }));

    const template = [
        {
            label: 'Dev',
            submenu: [
                ...presetItems,
                { type: 'separator' },
                {
                    label: 'Reload (no query)',
                    click() {
                        const win = getWindow();
                        if (win) win.loadURL(startUrl);
                    },
                },
                { role: 'reload' },
                { role: 'toggleDevTools' },
                { type: 'separator' },
                { role: 'quit' },
            ],
        },
    ];

    return Menu.buildFromTemplate(template);
}

module.exports = { buildDevMenu, PRESETS };
