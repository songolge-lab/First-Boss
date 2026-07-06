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

Preferred: **GitHub Actions** (no local Windows build, no personal token). The
[`Release (Windows)`](.github/workflows/release.yml) workflow builds the NSIS
installer and publishes the auto-update artifacts to a **draft** release tagged
`v<version>`. Run it either way:

- **Manually:** Actions tab → *Release (Windows)* → *Run workflow*.
- **By tag:** push a tag matching the `package.json` version, e.g.
  `git tag v1.0.1 && git push origin v1.0.1`.

It uses the built-in `secrets.GITHUB_TOKEN` (as `GH_TOKEN`) with `contents:
write` — no secret to configure. The tag must match `package.json`'s version, since
electron-builder derives the release version from there, not from the tag.

Local alternative (needs a personal token with `repo` scope, **env only**):

```powershell
$env:GH_TOKEN = "<your_personal_access_token>"
npm run electron:publish
```

Both paths create a **draft** release for the current version. Open it on GitHub
and click **Publish**; running clients then pick it up on their next launch. The
workflow does not build the portable exe — it isn't needed for auto-update. `GH_TOKEN`
is used **only** during publish; it is never read by the app at runtime or bundled.

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
