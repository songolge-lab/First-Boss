// Minimal preload. The game (src/**) needs zero Node/Electron APIs, so this
// intentionally exposes nothing via contextBridge. Kept as a real file (not
// omitted) so webPreferences.preload has a stable path if IPC is ever needed.
