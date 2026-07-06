# Auto-Update (GitHub Releases)

The packaged Windows app checks GitHub Releases on startup, downloads a newer
version in the background, and offers a **"Yeniden başlat ve güncelle"** button.
Built on [`electron-updater`](https://www.electron.build/auto-update) with the
GitHub provider (`songolge-lab/First-Boss`).

Auto-update only runs in the **packaged app** (`app.isPackaged`). In `npm run
electron:dev` / `electron:start` and in the browser it is a no-op — this is
expected, not a bug.

> **Update target = NSIS.** electron-updater can only self-install an NSIS
> build, so releases must include the `nsis` installer. The `portable` .exe
> still builds for convenience but **cannot** auto-update itself.

## 1. Bump the version

`version` in [`package.json`](package.json) is the update marker — a release only
updates clients whose installed version is lower.

```bash
npm version patch   # 1.0.0 -> 1.0.1  (also: minor / major)
```

## 2. Publish a release

Set a GitHub token with `repo` scope **in the environment only** (never in code):

```powershell
$env:GH_TOKEN = "<your_personal_access_token>"
npm run electron:publish
```

This builds the NSIS installer + update metadata and uploads them to a **draft**
GitHub release for the current version. Open the release on GitHub and click
**Publish**. Once public, running clients pick it up on their next launch.

`GH_TOKEN` is used **only** by electron-builder during publish. It is never read
by the app at runtime and is never bundled.

## 3. Artifacts uploaded to the release

electron-updater needs all three (produced in `dist-electron/`):

- `ReverseBossGame-Setup-<version>.exe` — the NSIS installer
- `ReverseBossGame-Setup-<version>.exe.blockmap` — enables delta downloads
- `latest.yml` — version + checksum manifest the updater reads

## 4. Build locally without publishing

```bash
npm run electron:build          # nsis + portable into dist-electron/
npm run electron:build:portable # portable only (old behavior)
```

To smoke-test the update flow, install the `Setup` .exe, publish a release with a
higher version, then relaunch the installed app.

## Security notes

- Assumes a **public** repo/releases: no token is shipped in the client.
- `nodeIntegration: false`, `contextIsolation: true`, `sandbox: true` are kept.
  The renderer reaches update controls only through the `window.updater` preload
  bridge — it never imports Electron directly.
- **Private repo caveat:** electron-updater would then need a `GH_TOKEN` on every
  user's machine to download updates. Embedding a token in the client is not
  safe. If releases must stay private, host the update feed behind your own
  authenticated endpoint (a `generic` provider) or a signed URL service instead
  of GitHub, and keep the repo public only for the release artifacts.
- Installers are unsigned. Windows SmartScreen may warn on first install; add
  Authenticode code signing when a certificate is available.
