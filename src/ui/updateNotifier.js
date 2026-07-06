// Auto-update toast (renderer side). Fully self-contained: it builds its own
// DOM/UI and touches nothing in the game loop. Runs only inside the packaged
// Electron app — in a plain browser (`npm start`) or Capacitor, window.updater
// is undefined and this module returns immediately, so gameplay is unaffected.
//
// It talks to main only through the preload bridge (window.updater); it has no
// access to Electron/ipcRenderer directly, keeping contextIsolation intact.

if (window.updater) {
    initUpdateNotifier(window.updater);
}

function initUpdateNotifier(updater) {
    let root = null;
    let textEl = null;
    let actionsEl = null;

    function ensureUI() {
        if (root) return;
        root = document.createElement('div');
        root.className = 'rbg-update';
        root.hidden = true;

        textEl = document.createElement('div');
        textEl.className = 'rbg-update-text';

        actionsEl = document.createElement('div');
        actionsEl.className = 'rbg-update-actions';
        actionsEl.hidden = true;

        const install = document.createElement('button');
        install.className = 'rbg-update-btn rbg-update-primary';
        install.textContent = 'Yeniden başlat ve güncelle';
        install.addEventListener('click', () => updater.install());

        const later = document.createElement('button');
        later.className = 'rbg-update-btn rbg-update-secondary';
        later.textContent = 'Daha sonra';
        later.addEventListener('click', hide);

        actionsEl.append(install, later);
        root.append(textEl, actionsEl);
        document.body.appendChild(root);
    }

    function show(message, withActions) {
        ensureUI();
        textEl.textContent = message;
        actionsEl.hidden = !withActions;
        root.hidden = false;
    }

    function hide() {
        if (root) root.hidden = true;
    }

    updater.onStatus((s) => {
        switch (s.state) {
            case 'available':
                show('Yeni sürüm indiriliyor…', false);
                break;
            case 'downloading': {
                const pct = Math.round(s.percent || 0);
                show(`Yeni sürüm indiriliyor… %${pct}`, false);
                break;
            }
            case 'downloaded':
                show('Güncelleme hazır.', true);
                break;
            // checking / not-available / error stay silent so a normal launch
            // (or an offline machine) shows no noise; errors go to the console.
            case 'error':
                console.warn('Auto-update error:', s.message);
                hide();
                break;
            default:
                break;
        }
    });
}
