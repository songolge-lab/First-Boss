// Boss AFK Intimidation POLISH — stage 7A-2A concept sheet (visual concept ONLY).
// Replaces the REJECTED rectangular-corner screen darkening with the organic
// "curse-pressure" edge family (ref-2 mood: ritual darkness, cursed flame
// tongues, floating void petals) and introduces the "void-fracture" black-red
// lightning family around the planted boss (ref-3 motion language: crackling
// branches, tattered decay) — both adapted strictly into the locked ember-void
// palette. 100% hard pixel cells. No gradients, no shadowBlur, and NO straight
// band edges anywhere in the darkening (every boundary is a tongue silhouette,
// a dither, or a petal). Emits: afk2_v1.png. Nothing wired into src/.
//
// Sheet map (top -> bottom):
//   header
//   band A  — screen darkening: 3 screen mocks (V1 tongues / V2 petals / V3 unified = pick)
//   band A2 — breakdowns: edge motif zoom 2x / breathing loop 0-1-2 / petal set 2x / palette+alpha
//   band B  — lightning: arc anatomy zoom 2x / lifecycle f0-f3 / chest-core sync f0-f3
//   band B2 — aura+arc loop x3 (REAL planted boss) / plant-arc zoom 2x / spawn-anchor map
//   band C  — full tableau 332x88: night throne hall + planted boss + arcs + curse-pressure frame
const fs = require('fs');
const zlib = require('zlib');

// ---------- palettes (locked palette law) ----------
const BOSS_PAL = {
  '0': '#08080c', '1': '#12121a', '2': '#1c1d28', '3': '#2a2c3a', '4': '#3d4052', '5': '#565c74',
  'a': '#6e0f1c', 'b': '#a8182a', 'c': '#e0263a', 'd': '#ff5a4a', 'g': '#3a1014', 'h': '#571820',
};
const HERO_PAL = {
  '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
  'n': '#141c30', 'm': '#1c2438', 'l': '#7fd4ff', 'L': '#b8ecff', 'g': '#c9962e',
};
// ember-void VFX ramp (sampler) + darkening voids + night-hall tones
const E0 = '#6e0f1c', E1 = '#a8182a', E2 = '#e0263a', E3 = '#ff5a4a';
const SMK = '#1a1420', UMB = '#14101c';
const VOID = '#060409', DEEP = '#0a0410';
const ST0 = '#2e3444', ICY = '#7fd4ff';
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8', CRK = '#0c0a12';
const GOLD = '#8a6d24', GOLDL = '#b8923c', DRAPE = '#3f0b16', FLAME = '#e8c25a', FLAME2 = '#ff9a3a';

// ---------- load approved matrices ----------
const bossBase = fs.readFileSync(__dirname + '/boss_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const BH = bossBase.length, BW = bossBase[0].length;   // 48 x 46
const HH = heroBase.length, HW = heroBase[0].length;   // 24 x 30

// ---------- house matrix helpers (afk_gen.js idiom, verbatim) ----------
const clone = g => g.map(r => r.slice());
const blankB = () => Array.from({ length: BH }, () => Array(BW).fill('.'));
const setB = (g, x, y, k) => { if (x >= 0 && x < BW && y >= 0 && y < BH) g[y][x] = k; };
function cut(g, x0, y0, x1, y1, W, H) {
  const c = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= H || x < 0 || x >= W) continue;
    if (g[y][x] !== '.') { c.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return c;
}
function paste(g, cells, dx, dy, W, H) {
  for (const [x, y, k] of cells) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) g[ny][nx] = k; }
}
function moveUpperB(g, hipRow, dx, dy) {
  if (dx === 0 && dy === 0) return g;
  const out = blankB();
  for (let y = 0; y < BH; y++) for (let x = 0; x < BW; x++) {
    if (g[y][x] === '.') continue;
    if (y <= hipRow) { const ny = y + dy, nx = x + dx; if (ny >= 0 && ny < BH && nx >= 0 && nx < BW) out[ny][nx] = g[y][x]; }
    else out[y][x] = g[y][x];
  }
  return out;
}
function lineB(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { setB(g, x, y, k); if (thick) setB(g, x, y + 1, k);
    if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
const emberUp = g => g.map(r => r.map(k => (k === 'a' ? 'b' : k === 'b' ? 'c' : k === 'c' ? 'd' : k)));
function eraseBladeB(g) {
  for (let y = 0; y <= 20; y++) for (let x = 31; x <= 45; x++) g[y][x] = '.';
  for (let y = 13; y <= 20; y++) for (let x = 27; x <= 33; x++) g[y][x] = '.';
  for (let y = 17; y <= 22; y++) for (let x = 24; x <= 29; x++) g[y][x] = '.';
  g[21][31] = '.'; g[21][30] = '.';
}
// ---------- the approved planted sword + idle body (afk_gen.js, verbatim) ----------
function plantedSword(g, gemRow, opts = {}) {
  const { handOn = 'pommel', flash = false, bite = false } = opts;
  const X = 31, r = gemRow;
  setB(g, X, r, flash ? 'c' : 'b');
  setB(g, X - 1, r + 1, '2'); setB(g, X, r + 1, '4'); setB(g, X + 1, r + 1, '2');
  for (let y = r + 2; y <= r + 6; y++) setB(g, X, y, '1');
  setB(g, X, r + 5, 'a');
  const cy = r + 7;
  for (let x = X - 3; x <= X + 3; x++) setB(g, x, cy, '3');
  setB(g, X - 4, cy, '4'); setB(g, X + 4, cy, '4');
  setB(g, X - 4, cy + 1, '3'); setB(g, X - 5, cy + 2, '2');
  setB(g, X + 4, cy + 1, '3'); setB(g, X + 5, cy + 2, '2');
  setB(g, X, cy, flash ? 'd' : 'c');
  setB(g, X - 2, cy + 2, '2'); setB(g, X - 1, cy + 2, '3'); setB(g, X + 1, cy + 2, '3'); setB(g, X + 2, cy + 2, '2');
  const b0 = cy + 2, tip = b0 + 26;
  for (let y = b0; y <= tip && y < BH; y++) {
    const t = (y - b0) / 26;
    setB(g, X, y, t < 0.33 ? 'b' : t < 0.66 ? 'c' : 'd');
    if (y > b0 && y <= tip - 3) setB(g, X - 1, y, '1');
    if (y > b0 && y <= tip - 6) setB(g, X + 1, y, '3');
    else if (y > b0 && y <= tip - 3) setB(g, X + 1, y, '1');
  }
  if (tip < BH) setB(g, X, tip, 'd');
  if (bite && tip + 1 < BH) {
    setB(g, X, tip + 1, 'c'); setB(g, X - 1, tip + 1, 'a'); setB(g, X + 1, tip + 1, 'a');
  }
  const hy = handOn === 'pommel' ? r + 2 : r + 4;
  setB(g, X - 1, hy, '3'); setB(g, X, hy, '4'); setB(g, X + 1, hy, '3');
  setB(g, X - 1, hy + 1, '1'); setB(g, X, hy + 1, '3'); setB(g, X + 1, hy + 1, '1');
  return hy;
}
function reachArm(g, hy) { lineB(g, 25, 17, 29, hy + 1, '2', true); setB(g, 24, 17, '2'); }
const regal = () => moveUpperB(clone(bossBase), 28, -1, 0);
function plantedIdleBase() {
  const g = regal(); eraseBladeB(g);
  reachArm(g, plantedSword(g, 11, { handOn: 'pommel', bite: true }));
  return g;
}
const IDLE0 = plantedIdleBase();
const IDLE1 = emberUp(plantedIdleBase());

// ---------- hero brace (afk_gen.js, verbatim) ----------
const heroClone = () => heroBase.map(r => r.slice());
function heroEraseBlade(g) { for (let y = 10; y <= 18; y++) for (let x = 18; x <= 29; x++) g[y][x] = '.'; }
const hset = (g, x, y, k) => { if (x >= 0 && x < HW && y >= 0 && y < HH) g[y][x] = k; };
function lineB2(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) { hset(g, x, y, k); if (thick) hset(g, x, y + 1, k);
    if (x === x1 && y === y1) break; const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
}
function heroSword(g, hx, hy, angleDeg, reach) {
  lineB2(g, 14, 12, hx, hy, '2', true);
  hset(g, hx, hy, '3'); hset(g, hx - 1, hy, '3'); hset(g, hx, hy + 1, '1');
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx, R = Math.round;
  for (let s = -1; s <= 1; s++) hset(g, R(hx + dx + px * s), R(hy + dy + py * s), s === 0 ? 'l' : '1');
  for (let i = 2; i <= reach; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i);
    hset(g, bx, by, '4'); hset(g, R(bx + px), R(by + py), 'l'); hset(g, R(bx - px), R(by - py), '3');
  }
  hset(g, R(hx + dx * (reach + 1)), R(hy + dy * (reach + 1)), 'L');
}
const heroBlueUp = g => g.map(r => r.map(k => (k === 'l' ? 'L' : k)));
function capeFlow(g, dx, dy) { paste(g, cut(g, 3, 10, 9, 19, HW, HH), dx, dy, HW, HH); return g; }
function braceFrame(capeDx, blue) {
  let g = heroClone();
  capeFlow(g, capeDx, 0);
  paste(g, cut(g, 8, 0, 18, 5, HW, HH), -1, 1, HW, HH);
  heroEraseBlade(g);
  heroSword(g, 16, 13, 18, 8);
  return blue ? heroBlueUp(g) : g;
}
const BRACE1 = braceFrame(-2, true);

// ================= SHEET CANVAS =================
const SW = 340, SH = 400, SCALE = 4;
const G = Array.from({ length: SH }, () => Array(SW).fill(null));   // null = checker bg
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function paint(x, y, w, h, hex, a = 1) {
  const src = hex2rgb(hex);
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= SH) continue;
    for (let xx = x; xx < x + w; xx++) {
      if (xx < 0 || xx >= SW) continue;
      const dst = G[yy][xx] || [0x16, 0x13, 0x22];
      G[yy][xx] = a >= 1 ? src.slice() : [
        Math.round(dst[0] * (1 - a) + src[0] * a),
        Math.round(dst[1] * (1 - a) + src[1] * a),
        Math.round(dst[2] * (1 - a) + src[2] * a)];
    }
  }
}
function stampM(m, pal, ox, oy, opts = {}) {
  const { mir = false, tintFn = null } = opts;
  const mw = m[0].length;
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const k = row[x]; if (k === '.' || k === ' ' || !pal[k]) continue;
    const px = mir ? ox + (mw - 1 - x) : ox + x;
    const hex = tintFn ? tintFn(k, x, y) : pal[k];
    if (hex) paint(px, oy + y, 1, 1, hex, 1);
  } });
}
const cellFrame = (x, y, w, h, bg = '#131020') => {
  paint(x, y, w, h, bg, 1);
  paint(x - 1, y - 1, w + 2, 1, '#2b2740', 1); paint(x - 1, y + h, w + 2, 1, '#2b2740', 1);
  paint(x - 1, y, 1, h, '#2b2740', 1); paint(x + w, y, 1, h, '#2b2740', 1);
};

// ---------- tiny 3x5 pixel font for cell labels ----------
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110110101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100110001110', '7': '111001010010010', '8': '111101010101111',
  '.': '000000000000010', '-': '000000111000000', '+': '000010111010000',
};
function text(str, x, y, color = '#5d5675') {
  let cx = x;
  for (const ch of String(str).toUpperCase()) {
    if (ch === ' ') { cx += 4; continue; }
    const g = FONT[ch]; if (!g) { cx += 4; continue; }
    for (let i = 0; i < 15; i++) if (g[i] === '1') paint(cx + (i % 3), y + Math.floor(i / 3), 1, 1, color, 1);
    cx += 4;
  }
  return cx;
}
const HEADC = '#8d84a8';

// =================================================================
// CURSE-PRESSURE DARKENING (band A family)
// =================================================================
// deterministic hash noise
const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
// tongue-height profile: irregular tents along the edge. curve<1 = round fold,
// curve>1 = sharp flame. bias presses the profile down toward the screen centre
// so the combat band stays readable while corners/edges carry the pressure.
function prof(w, seed, minH, maxH, minSpan, maxSpan, curve, biasFn, grow) {
  const hs = new Array(w).fill(0);
  let x = 0, i = 0;
  while (x < w) {
    const span = minSpan + Math.floor(rnd(i, seed) * (maxSpan - minSpan + 1));
    let peak = minH + Math.floor(rnd(i, seed + 7) * (maxH - minH + 1));
    if ((i + grow) % 3 === 0) peak += 1;                       // breathing growth
    const apex = x + Math.floor(span / 2);
    for (let k = 0; k <= span && x + k < w; k++) {
      const d = Math.min(1, Math.abs(x + k - apex) / Math.max(1, span / 2));
      const hh = Math.round(peak * Math.pow(1 - d, curve));
      if (hh > hs[x + k]) hs[x + k] = hh;
    }
    x += span; i++;
  }
  if (biasFn) for (let j = 0; j < w; j++) hs[j] = Math.round(hs[j] * biasFn(j / Math.max(1, w - 1)));
  return hs;
}
const edgeBias = t => Math.min(1, 0.55 + 0.45 * (Math.abs(t - 0.5) * 2 + 0.15));
const sideBias = t => 0.2 + 0.8 * Math.pow(Math.abs(t - 0.5) * 2, 1.3);
// detached void-petal shapes (ref-2 floating rocks, pixel-chunked)
const PETALS = [
  [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2]],
  [[0, 0], [0, 1], [1, 1]],
  [[0, 0], [1, 0], [0, 1], [1, 1], [2, 0]],
];
// per-variant knobs (absolute px, computed from the mock height)
function knobsFor(h, v) {
  const f = x => Math.max(2, Math.round(h * x));
  if (v === 1) return { bMax: f(.24), bMin: f(.09), bSpan: [6, 11], bCurve: 1.3, tMax: f(.18), tMin: f(.07), tSpan: [8, 13], tCurve: 1.1, sideMax: f(.12), petals: 3, drips: 1, spikes: 5, haze: f(.24) };
  if (v === 2) return { bMax: f(.15), bMin: f(.06), bSpan: [12, 18], bCurve: 0.7, tMax: f(.13), tMin: f(.05), tSpan: [13, 19], tCurve: 0.6, sideMax: f(.17), petals: 10, drips: 3, spikes: 0, haze: f(.30), petalBig: true };
  return { bMax: f(.21), bMin: f(.08), bSpan: [8, 13], bCurve: 1.1, tMax: f(.16), tMin: f(.06), tSpan: [9, 14], tCurve: 0.8, sideMax: f(.14), petals: 6, drips: 2, spikes: 3, haze: f(.27) };
}
// THE darkening painter. Five systems, all organic:
//   0 quantized dither pressure-haze (ref-2 stepped radial darkness; density
//     75/50/25% by noisy edge distance — the noise kills any straight seam)
//   1 rising curse-tongues (bottom, 2 layers + sparse thin spikes)
//   2 hanging void-folds w/ drip tips (top)
//   3 lateral pressure tongues (sides; corners deepen where they overlap 1+2)
//   4 detached void petals drifting just inside the dark zone
// Sparse E0 caps / one E1 wink are the only color accents. phase 0..2 breathes.
function paintCurse(ox, oy, w, h, k, phase, seed) {
  // --- pressure haze (under everything) ---
  if (k.haze > 0) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = Math.min(x, w - 1 - x, y, h - 1 - y) + rnd(x * 7 + y * 13, seed + 51) * 6 - 3;
      let on = false;
      if (d < k.haze * 0.35) on = (x + y + phase) % 4 !== 0;
      else if (d < k.haze * 0.7) on = (x + y + phase) % 2 === 0;
      else if (d < k.haze) on = x % 2 === 0 && (y + phase) % 2 === 0;
      if (on) paint(ox + x, oy + y, 1, 1, VOID, 0.45);
    }
  }
  // --- bottom curse-tongues ---
  const back = prof(w, seed, k.bMin, k.bMax, k.bSpan[0], k.bSpan[1], k.bCurve, edgeBias, phase);
  const mid = prof(w, seed + 13, Math.max(2, Math.round(k.bMin * 0.7)), Math.max(3, Math.round(k.bMax * 0.65)),
    Math.max(3, k.bSpan[0] - 3), Math.max(4, k.bSpan[1] - 5), k.bCurve + 0.3, edgeBias, phase);
  for (let x = 0; x < w; x++) {
    for (let j = 0; j < back[x]; j++) {
      if (j === back[x] - 1 && (x + back[x] + phase) % 2 === 0) continue;   // broken edge
      paint(ox + x, oy + h - 1 - j, 1, 1, DEEP, 0.62);
    }
    if (back[x] > 2 && (x * 7 + seed) % 5 === 0) paint(ox + x, oy + h - 1 - back[x], 1, 1, DEEP, 0.35);
    for (let j = 0; j < mid[x]; j++) {
      if (j === mid[x] - 1 && (x + mid[x] + phase + 1) % 2 === 0) continue;
      paint(ox + x, oy + h - 1 - j, 1, 1, VOID, 0.85);
    }
  }
  // sparse thin spikes near the edges (tall 1px flame slivers)
  if (k.spikes > 0) {
    let placed = 0;
    for (let x = 2; x < w - 2 && placed < k.spikes; x++) {
      const t = x / (w - 1);
      if ((t > 0.22 && t < 0.78) || rnd(x, seed + 29) < 0.88) continue;
      const sh = mid[x] + 3 + (x % 3);
      for (let j = 0; j < sh; j++) paint(ox + x, oy + h - 1 - j, 1, 1, VOID, 0.95);
      placed++;
    }
  }
  // ember caps on mid-tongue apexes (sparse winks)
  let capIdx = 0;
  for (let x = 1; x < w - 1; x++) {
    if (!(mid[x] >= 5 && mid[x] >= mid[x - 1] && mid[x] > mid[x + 1])) continue;
    if ((capIdx + phase) % 3 === 0) {
      paint(ox + x, oy + h - 1 - mid[x], 1, 1, capIdx === 0 && phase === 1 ? E1 : E0, 0.9);
    }
    capIdx++;
  }
  // --- top void-folds ---
  if (k.tMax > 0) {
    const tb = prof(w, seed + 3, k.tMin, k.tMax, k.tSpan[0], k.tSpan[1], k.tCurve, edgeBias, phase);
    const tm = prof(w, seed + 17, Math.max(2, Math.round(k.tMin * 0.7)), Math.max(3, Math.round(k.tMax * 0.6)),
      Math.max(4, k.tSpan[0] - 3), Math.max(5, k.tSpan[1] - 4), k.tCurve + 0.2, edgeBias, phase);
    for (let x = 0; x < w; x++) {
      for (let j = 0; j < tb[x]; j++) {
        if (j === tb[x] - 1 && (x + tb[x] + phase) % 2 === 0) continue;
        paint(ox + x, oy + j, 1, 1, DEEP, 0.62);
      }
      for (let j = 0; j < tm[x]; j++) {
        if (j === tm[x] - 1 && (x + tm[x] + phase + 1) % 2 === 0) continue;
        paint(ox + x, oy + j, 1, 1, VOID, 0.85);
      }
    }
    // drip tips hanging off fold apexes
    if (k.drips > 0) {
      const apexes = [];
      for (let x = 1; x < w - 1; x++)
        if (tm[x] >= 4 && tm[x] >= tm[x - 1] && tm[x] > tm[x + 1]) apexes.push(x);
      for (let i = 0; i < Math.min(k.drips, apexes.length); i++) {
        const x = apexes[Math.floor(i * apexes.length / Math.max(1, k.drips))];
        const len = 3 + Math.floor(rnd(x, seed + 23) * 4) + ((i + phase) % 2);
        for (let j = 0; j < len; j++) paint(ox + x, oy + tm[x] + j, 1, 1, VOID, 0.8);
        if ((i + phase) % 3 === 0) paint(ox + x, oy + tm[x] + len, 1, 1, E0, 0.85);
      }
    }
  }
  // --- lateral pressure tongues (left/right, independent profiles) ---
  if (k.sideMax > 0) {
    const sl = prof(h, seed + 31, 2, k.sideMax, 7, 12, 1.0, sideBias, phase);
    const sr = prof(h, seed + 37, 2, k.sideMax, 7, 12, 1.0, sideBias, phase);
    for (let y = 0; y < h; y++) {
      for (let j = 0; j < sl[y]; j++) {
        if (j === sl[y] - 1 && (y + sl[y] + phase) % 2 === 0) continue;
        paint(ox + j, oy + y, 1, 1, DEEP, 0.58);
      }
      const ml = Math.round(sl[y] * 0.6);
      for (let j = 0; j < ml; j++) paint(ox + j, oy + y, 1, 1, VOID, 0.8);
      for (let j = 0; j < sr[y]; j++) {
        if (j === sr[y] - 1 && (y + sr[y] + phase) % 2 === 0) continue;
        paint(ox + w - 1 - j, oy + y, 1, 1, DEEP, 0.58);
      }
      const mr = Math.round(sr[y] * 0.6);
      for (let j = 0; j < mr; j++) paint(ox + w - 1 - j, oy + y, 1, 1, VOID, 0.8);
    }
  }
  // --- detached void petals (drift +-1 with phase, never leave the dark zone) ---
  for (let i = 0; i < k.petals; i++) {
    const e = i % 4, t = rnd(i, seed + 41), shape = PETALS[i % PETALS.length];
    const drift = ((i + phase) % 3) - 1;
    const big = k.petalBig && i % 3 === 0 ? 2 : 1;
    let px, py;
    if (e === 0) { px = ox + 4 + Math.round(t * (w - 12)); py = oy + h - 6 - Math.floor(rnd(i, seed + 43) * 5); }
    else if (e === 1) { px = ox + 4 + Math.round(t * (w - 12)); py = oy + 2 + Math.floor(rnd(i, seed + 43) * 5); }
    else if (e === 2) { px = ox + 2 + Math.floor(rnd(i, seed + 43) * 6); py = oy + 6 + Math.round(t * (h - 16)); }
    else { px = ox + w - 6 - Math.floor(rnd(i, seed + 43) * 6); py = oy + 6 + Math.round(t * (h - 16)); }
    py += drift;
    for (const [sx, sy] of shape) paint(px + sx * big, py + sy * big, big, big, VOID, 0.88);
    if (i % 2 === 0) paint(px + shape[0][0] * big + big, py + shape[0][1] * big - 1, 1, 1, E0, 0.85);
  }
}

// =================================================================
// VOID-FRACTURE LIGHTNING (band B family)
// =================================================================
function bresCells(x0, y0, x1, y1) {
  const out = []; let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0),
    sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
  for (;;) { out.push([x, y]); if (x === x1 && y === y1) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
  return out;
}
// jittered arc path between two points (deterministic per seed)
function boltPath(x0, y0, x1, y1, seed, jx = 2, jy = 2) {
  const pts = [[x0, y0]];
  const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 4));
  for (let i = 1; i < n; i++) {
    const t = i / n;
    pts.push([Math.round(x0 + (x1 - x0) * t + (rnd(i, seed) - 0.5) * 2 * jx),
              Math.round(y0 + (y1 - y0) * t + (rnd(i, seed + 3) - 0.5) * 2 * jy)]);
  }
  pts.push([x1, y1]);
  const cells = [], kinks = [];
  for (let s = 0; s < pts.length - 1; s++) {
    const seg = bresCells(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]);
    if (s > 0) seg.shift();
    cells.push(...seg);
    if (s < pts.length - 2) kinks.push(cells.length - 1);
  }
  return { cells, kinks };
}
// render an arc in one of its 4 lifecycle modes through pset(x,y,color,alpha).
// anatomy: VOID sheath (the crack) / E2 filament / E3 hot kinks / E1 branches
// with E0 tips / ash = sinking SMK+E0 slivers (matches the aura's sink language)
function renderBolt(bolt, mode, pset, opts = {}) {
  const P = pset || ((x, y, c, a = 1) => paint(x, y, 1, 1, c, a));
  const { cells, kinks } = bolt;
  const kset = new Set(kinks);
  const { branches = [], seed = 7 } = opts;
  if (mode === 'ignite') {
    const [sx, sy] = cells[0];
    P(sx, sy, E3, 1); P(sx + 1, sy, E3, 1); P(sx, sy + 1, E3, 1); P(sx + 1, sy + 1, E3, 1);
    [[-2, -2], [3, -2], [-2, 3], [3, 3]].forEach(([dx, dy]) => P(sx + dx, sy + dy, E2, 1));
    for (let i = 2; i < Math.min(8, cells.length); i++) P(cells[i][0], cells[i][1], VOID, 0.9);
    return;
  }
  if (mode === 'flash') {
    for (let i = 0; i < cells.length; i++) {                 // black crack sheath first
      const [x, y] = cells[i];
      const p = cells[Math.max(0, i - 1)], nn = cells[Math.min(cells.length - 1, i + 1)];
      if (Math.abs(nn[1] - p[1]) >= Math.abs(nn[0] - p[0])) { P(x - 1, y, VOID, 0.85); P(x + 1, y, VOID, 0.85); }
      else { P(x, y - 1, VOID, 0.85); P(x, y + 1, VOID, 0.85); }
    }
    for (const [x, y] of cells) P(x, y, E2, 1);              // red filament
    for (const i of kinks) { const [x, y] = cells[i]; P(x, y, E3, 1); P(x, y - 1, E3, 1); }
    for (const b of branches) {                              // E1 branches w/ E0 tips
      const from = cells[Math.min(cells.length - 1, Math.floor(b.frac * cells.length))];
      const sub = boltPath(from[0], from[1], from[0] + b.dx, from[1] + b.dy, seed + 11, 1, 1);
      sub.cells.forEach(([x, y], i2) => { P(x, y - 1, VOID, 0.7); P(x, y, i2 === sub.cells.length - 1 ? E0 : E1, 1); });
    }
    return;
  }
  if (mode === 'fracture') {
    for (let i = 0; i < cells.length; i++) {
      if (i % 5 >= 3) continue;
      const [x, y] = cells[i];
      P(x, y, kset.has(i) ? E2 : E1, 1);
      if (i % 5 === 0) P(x, y - 1, VOID, 0.8);
    }
    const m = cells[Math.floor(cells.length / 2)];
    P(m[0] + 2, m[1] - 2, E0, 0.85); P(m[0] - 2, m[1] + 3, E0, 0.7);
    return;
  }
  // ash: tattered vertical slivers sinking off the dead arc (ref-3 decay)
  for (let i = 0; i < cells.length; i += 4) {
    const [x, y] = cells[i];
    const len = 2 + ((i >> 2) % 2);
    for (let j = 0; j < len; j++) P(x, y + 1 + j, (i >> 2) % 2 ? SMK : E0, 0.9);
  }
  const m = cells[Math.floor(cells.length / 2)];
  P(m[0] + 2, m[1] + 2, E0, 0.7);
}

// =================================================================
// APPROVED AURA (afk_gen.js paintAura, verbatim — kept as the base layer)
// =================================================================
function paintAura(bx, by, ph) {
  const plantX = bx + 31, floorY = by + 47, coreX = bx + 19, coreY = by + 15;
  const spread = 15 + ph * 3;
  for (let dx = -spread; dx <= spread; dx++) {
    if ((dx + ph) % 3 === 0) continue;
    paint(plantX + dx, floorY + 1, 1, 1, UMB, 0.85);
    if (Math.abs(dx) > spread - 6 && (dx % 2 === 0)) paint(plantX + dx, floorY + 2, 1, 1, UMB, 0.5);
  }
  paint(plantX - spread, floorY, 2, 1, E0, 1); paint(plantX + spread - 1, floorY, 2, 1, E0, 1);
  [[-8, 2], [7, 2], [-13, 1], [12, 1]].forEach(([dx, dy]) => paint(plantX + dx, floorY + dy, 1, 1, E0, 0.8));
  const shards = [
    [bx - 6, by + 12, 4, 1], [bx + 0, by + 4, 5, 2], [bx + 10, by - 3, 4, 1], [bx + 22, by - 5, 6, 2],
    [bx + 33, by - 2, 4, 1], [bx + 42, by + 5, 5, 2], [bx + 48, by + 14, 3, 1],
  ];
  shards.forEach(([sx, sy, ln, wd], i) => {
    const sink = (ph + i) % 3;
    paint(sx, sy + sink, wd, ln, '#060409', 1);
    paint(sx, sy + sink, wd, 1, (i % 3 === 0 && sink === 0) ? E1 : E0, 1);
    if (i % 3 === 1) paint(sx, sy + sink + ln, 1, 1, E0, 0.7);
  });
  paint(bx + 6, by + 20, 1, 6, '#060409', 1); paint(bx + 6, by + 26, 1, 1, E0, 0.8);
  paint(bx + 40, by + 18, 1, 6, '#060409', 1); paint(bx + 40, by + 24, 1, 1, E0, 0.8);
  if (ph === 1) {
    [[-5, 0, 1, 2], [5, 0, 1, 2], [0, -4, 2, 1], [0, 4, 2, 1], [-4, -3, 1, 1], [4, 3, 1, 1],
     [4, -3, 1, 1], [-4, 3, 1, 1]].forEach(([dx, dy, w, h]) =>
      paint(coreX + dx, coreY + dy, w, h, E1, 1));
  } else if (ph === 2) {
    [[-9, 0, 1, 2], [9, 0, 1, 2], [0, -7, 2, 1], [0, 7, 2, 1], [-7, -5, 1, 1], [7, 5, 1, 1],
     [-7, 5, 1, 1], [7, -5, 1, 1]].forEach(([dx, dy, w, h]) =>
      paint(coreX + dx, coreY + dy, w, h, E0, 0.85));
  }
  const motes = [[bx - 3, by + 30, E1], [bx + 45, by + 26, E0], [bx + 26, by - 8, E2]];
  motes.forEach(([mx, my, k], i) => paint(mx, my - ph * 2 - i, 1, 1, k, 1));
}
// the boss arc set per aura phase (chest-core synced: forks fire ON the ph1 beat)
function paintBossArcs(bx, by, ph) {
  const plantX = bx + 31, floorY = by + 47, coreX = bx + 19, coreY = by + 15;
  if (ph === 0) {                                            // calm: micro-sparks only
    paint(coreX + 3, coreY - 2, 1, 1, E2, 1);
    paint(plantX + 1, by + 30, 1, 1, E3, 1);
    paint(plantX - 2, floorY - 6, 1, 1, E0, 0.9);
    return;
  }
  const arcA = boltPath(coreX - 1, coreY - 1, coreX - 12, coreY - 15, 21, 1, 2);
  const arcB = boltPath(coreX + 2, coreY + 1, plantX - 1, by + 16, 27, 1, 1);
  if (ph === 1) {                                            // the beat: both forks flash
    renderBolt(arcA, 'flash', null, { branches: [{ frac: 0.5, dx: -5, dy: -3 }], seed: 21 });
    renderBolt(arcB, 'flash', null, { seed: 27 });
    return;
  }
  // ph 2: chest forks die to ash; the arc crawls BESIDE the planted blade into
  // the ground (offset right so the black sheath separates it from the red blade)
  renderBolt(arcA, 'ash', null, {});
  const crawl = boltPath(plantX + 3, by + 22, plantX + 2, floorY - 2, 33, 2, 0);
  renderBolt(crawl, 'flash', null, { seed: 33 });
  const skit = boltPath(plantX + 1, floorY + 1, plantX + 13, floorY + 1, 35, 0, 1);
  renderBolt(skit, 'fracture', null, {});
}

// =================================================================
// BAND A — three screen mocks
// =================================================================
function roomMock(ox, oy) {                                  // 104x58 inner
  // wall + sparse stone dashes
  for (let y = 4; y < 42; y += 7)
    for (let x = (y % 14 === 4 ? 5 : 10); x < 100; x += 19) paint(ox + x, oy + y, 6, 1, NW1, 1);
  // two pointed window slits w/ cool night light
  const slit = sx => {
    paint(ox + sx + 2, oy + 8, 4, 2, '#141826', 1);
    paint(ox + sx + 1, oy + 10, 6, 2, '#141826', 1);
    paint(ox + sx, oy + 12, 8, 20, '#141826', 1);
    paint(ox + sx + 1, oy + 13, 6, 18, '#1b2438', 1);
    paint(ox + sx + 3, oy + 15, 2, 5, WINL, 0.5); paint(ox + sx + 3, oy + 24, 2, 3, WINL, 0.3);
  };
  slit(14); slit(88);
  // throne hint behind the boss (black bell + dashed gold trace + red drape)
  for (let r = 0; r < 24; r++) {
    const hw = Math.round(4 + 7 * Math.pow(1 - r / 24, 2.0));
    paint(ox + 48 - hw, oy + 43 - r, hw * 2, 1, '#12101a', 1);
    paint(ox + 48 - hw, oy + 43 - r, 1, 1, '#231d2e', 1); paint(ox + 48 + hw - 1, oy + 43 - r, 1, 1, '#231d2e', 1);
    if (r % 4 === 0) { paint(ox + 48 - hw, oy + 43 - r, 1, 1, GOLD, 0.6); paint(ox + 48 + hw - 1, oy + 43 - r, 1, 1, GOLD, 0.6); }
  }
  paint(ox + 45, oy + 22, 1, 1, GOLDL, 1); paint(ox + 51, oy + 22, 1, 1, GOLDL, 1); paint(ox + 48, oy + 20, 1, 2, GOLDL, 1);
  paint(ox + 46, oy + 24, 5, 14, DRAPE, 1); paint(ox + 48, oy + 26, 1, 10, '#2b0a10', 1);
  paint(ox + 40, oy + 42, 17, 2, '#1d1a28', 1);
  // candle
  paint(ox + 30, oy + 32, 1, 9, '#3a3346', 1); paint(ox + 30, oy + 31, 1, 1, FLAME2, 1); paint(ox + 30, oy + 30, 1, 1, FLAME, 1);
  // floor + carpet
  paint(ox, oy + 44, 104, 1, NF1, 1); paint(ox, oy + 45, 104, 13, NF0, 1);
  paint(ox, oy + 46, 104, 4, '#4a0f1a', 1);
  for (let x = 6; x < 100; x += 16) paint(ox + x, oy + 47, 2, 2, GOLD, 0.8);
  // mini planted BOSS (feet on the floor line)
  paint(ox + 45, oy + 33, 4, 11, '#0d0d15', 1);              // body
  paint(ox + 45, oy + 31, 3, 2, '#0d0d15', 1);               // head
  paint(ox + 45, oy + 31, 3, 1, '#2a2c3a', 1);               // head rim (readability)
  paint(ox + 46, oy + 36, 1, 1, E3, 1);                      // chest core
  paint(ox + 49, oy + 35, 2, 1, '#0d0d15', 1);               // arm to pommel
  paint(ox + 51, oy + 33, 1, 1, E1, 1);                      // pommel bead
  paint(ox + 51, oy + 34, 1, 10, E2, 1); paint(ox + 51, oy + 43, 1, 1, E3, 1);  // planted blade
  // mini braced HERO
  paint(ox + 75, oy + 37, 1, 6, '#141c30', 1);               // cape
  paint(ox + 76, oy + 36, 3, 8, ST0, 1);
  paint(ox + 76, oy + 35, 2, 1, ST0, 1); paint(ox + 77, oy + 37, 1, 1, ICY, 1);
}
(() => {
  text('7A-2A AFK INTIMIDATION POLISH - PIXEL CONCEPT SHEET', 4, 3, HEADC);
  text('A. SCREEN DARKENING - CURSE PRESSURE EDGE FAMILY', 4, 12, HEADC);
  const labels = ['V1 CURSE TONGUES', 'V2 VOID PETALS', 'V3 UNIFIED - PICK'];
  for (let v = 1; v <= 3; v++) {
    const ox = 4 + (v - 1) * 112;
    cellFrame(ox, 20, 104, 58, NW0);
    roomMock(ox, 20);
    paintCurse(ox, 20, 104, 58, knobsFor(58, v), 1, v * 3 + 1);
    text(labels[v - 1], ox, 81);
  }
})();

// =================================================================
// BAND A2 — darkening breakdowns
// =================================================================
(() => {
  const y = 92;
  // --- edge motif zoom (2x): back layer / sharp mid tongue / spike / dither / cap / petal ---
  cellFrame(4, y, 44, 44, NW0);
  const p2 = (lx, ly, c, a = 1) => paint(4 + lx * 2, y + ly * 2, 2, 2, c, a);
  for (let lx = 2; lx < 20; lx += 6) p2(lx, 6, NW1, 1);      // wall hint (shows translucency)
  const back22 = [5, 5, 6, 6, 7, 8, 9, 10, 9, 8, 7, 6, 5, 5, 5, 6, 7, 8, 7, 6, 5, 5];
  const mid22 = [2, 2, 3, 4, 6, 9, 12, 10, 7, 5, 3, 2, 2, 3, 4, 6, 8, 6, 4, 3, 2, 2];
  for (let lx = 0; lx < 22; lx++) {
    for (let j = 0; j < back22[lx]; j++) {
      if (j === back22[lx] - 1 && (lx + back22[lx]) % 2 === 0) continue;
      p2(lx, 21 - j, DEEP, 0.55);
    }
    for (let j = 0; j < mid22[lx]; j++) {
      if (j === mid22[lx] - 1 && (lx + mid22[lx] + 1) % 2 === 0) continue;
      p2(lx, 21 - j, VOID, 0.78);
    }
  }
  for (let j = 0; j < mid22[16] + 4; j++) p2(16, 21 - j, VOID, 0.9);   // spike
  p2(6, 21 - 12, E0, 0.9);                                   // cap on the tall apex
  p2(16, 21 - mid22[16] - 4, E1, 0.9);                       // wink on the spike
  [[14, 4], [15, 4], [16, 4], [14, 5], [15, 5], [15, 6]].forEach(([sx, sy]) => p2(sx, sy, VOID, 0.88));
  p2(17, 3, E0, 0.85);                                       // petal + glint
  text('EDGE 2X', 4, y + 47);
  // --- breathing loop 0-1-2 (same seed, tongues grow, caps wink, petals drift) ---
  for (let ph = 0; ph < 3; ph++) {
    const ox = 56 + ph * 38;
    cellFrame(ox, y, 34, 44, NW0);
    for (let yy = 8; yy < 26; yy += 8) paint(ox + 5, y + yy, 5, 1, NW1, 1);
    paint(ox, y + 36, 34, 1, NF1, 1); paint(ox, y + 37, 34, 7, NF0, 1);
    paintCurse(ox, y, 34, 44, { bMax: 11, bMin: 4, bSpan: [6, 10], bCurve: 1.2, tMax: 8, tMin: 3, tSpan: [8, 12], tCurve: 0.8, sideMax: 0, petals: 2, drips: 1, spikes: 1 }, ph, 55);
    text('BREATH ' + ph, ox, y + 47);
  }
  // --- petal set 2x: the 4 shapes + one shown sinking ---
  cellFrame(174, y, 40, 44, NW0);
  const q2 = (lx, ly, c, a = 1) => paint(174 + lx * 2, y + ly * 2, 2, 2, c, a);
  PETALS.forEach((shape, i) => {
    const bx = 2 + (i % 2) * 9, by = 2 + Math.floor(i / 2) * 8;
    shape.forEach(([sx, sy]) => q2(bx + sx, by + sy, VOID, 0.9));
    if (i % 2 === 0) q2(bx + shape[0][0] + 1, by + shape[0][1] - 1, E0, 0.85);
  });
  [[0, 0.9], [4, 0.6], [8, 0.35]].forEach(([dy, a]) =>       // sink ghost column
    PETALS[1].forEach(([sx, sy]) => q2(15 + sx, 3 + dy + sy, VOID, a)));
  text('PETALS 2X', 174, y + 47);
  // --- palette + alpha ---
  cellFrame(222, y, 114, 44, '#131020');
  const swatch = (x, yy, c) => { paint(x - 1, yy - 1, 11, 11, '#2b2740', 1); paint(x, yy, 9, 9, c, 1); };
  [VOID, DEEP, UMB, SMK].forEach((c, i) => swatch(226 + i * 13, y + 4, c));
  [E0, E1, E2, E3].forEach((c, i) => swatch(226 + i * 13, y + 24, c));
  paint(280, y + 4, 52, 36, NW0, 1);
  for (let yy = 10; yy < 32; yy += 9) paint(284, y + 4 + yy, 8, 1, NW1, 1);
  paintCurse(280, y + 4, 52, 36, { bMax: 9, bMin: 3, bSpan: [7, 11], bCurve: 1.1, tMax: 5, tMin: 2, tSpan: [9, 13], tCurve: 0.7, sideMax: 0, petals: 2, drips: 0, spikes: 1 }, 1, 77);
  text('PALETTE + ALPHA', 222, y + 47);
})();

// =================================================================
// BAND B — lightning breakdowns
// =================================================================
(() => {
  text('B. VOID-FRACTURE ARCS - BLACK-RED BOSS LIGHTNING', 4, 150, HEADC);
  const y = 160;
  // --- arc anatomy zoom (2x): sheath / filament / kinks / branch / tip ---
  cellFrame(4, y, 44, 44, NW0);
  const p2 = (lx, ly, c, a = 1) => paint(4 + lx * 2, y + ly * 2, 2, 2, c, a);
  const pts = [[11, 2], [9, 6], [13, 11], [10, 16], [12, 21]];
  const cells = [], kinks = [];
  for (let s = 0; s < pts.length - 1; s++) {
    const seg = bresCells(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]);
    if (s > 0) seg.shift();
    cells.push(...seg);
    if (s < pts.length - 2) kinks.push(cells.length - 1);
  }
  renderBolt({ cells, kinks }, 'flash', p2, { branches: [{ frac: 0.45, dx: 6, dy: 3 }], seed: 61 });
  text('ANATOMY 2X', 4, y + 47);
  // --- lifecycle f0-f3 (identical path every frame) ---
  const modes = ['ignite', 'flash', 'fracture', 'ash'];
  const mLabels = ['F0 IGNITE', 'F1 FLASH', 'F2 FRACT', 'F3 ASH'];
  for (let f = 0; f < 4; f++) {
    const ox = 56 + f * 38;
    cellFrame(ox, y, 34, 44, NW0);
    paint(ox, y + 38, 34, 1, NF1, 1); paint(ox, y + 39, 34, 5, NF0, 1);
    const bolt = boltPath(ox + 18, y + 8, ox + 13, y + 37, 51, 2, 1);
    renderBolt(bolt, modes[f], null, { branches: [{ frac: 0.45, dx: 6, dy: 5 }, { frac: 0.7, dx: -6, dy: 4 }], seed: 51 });
    if (f === 1) { paint(ox + 10, y + 37, 2, 1, E1, 1); paint(ox + 16, y + 37, 2, 1, E1, 1); }  // ground impact ticks
    text(mLabels[f], ox, y + 47);
  }
  // --- chest-core sync (2x chest crop: rest / heartbeat / fork fires on the beat) ---
  const crop = [], cropBeat = [];
  for (let yy = 10; yy <= 22; yy++) { crop.push(IDLE0[yy].slice(12, 30)); cropBeat.push(IDLE1[yy].slice(12, 30)); }
  const stamp2 = (m, ox2, oy2) => m.forEach((row, yy) => { for (let xx = 0; xx < row.length; xx++) {
    const k = row[xx]; if (k === '.' || !BOSS_PAL[k]) continue; paint(ox2 + xx * 2, oy2 + yy * 2, 2, 2, BOSS_PAL[k], 1); } });
  const CX = 7, CY = 5;                                      // chest core inside the crop
  for (let f = 0; f < 3; f++) {
    const ox = 216 + f * 41;
    cellFrame(ox, y, 38, 44, '#100d1c');
    const gx = ox + 1, gy = y + 9;
    stamp2(f >= 1 ? cropBeat : crop, gx, gy);
    const cx = gx + CX * 2 + 1, cy = gy + CY * 2 + 1;        // core centre at 2x
    const q = (dx, dy, w2, h2, c, a = 1) => paint(cx + dx * 2, cy + dy * 2, w2 * 2, h2 * 2, c, a);
    if (f === 1) {                                           // the beat: tight E1 ring
      [[-4, 0, 1, 1], [4, 0, 1, 1], [0, -3, 1, 1], [0, 3, 1, 1], [-3, -2, 1, 1], [3, 2, 1, 1],
       [3, -2, 1, 1], [-3, 2, 1, 1]].forEach(([dx, dy, w2, h2]) => q(dx, dy, w2, h2, E1));
    } else if (f === 2) {                                    // ring fades wide + fork fires
      [[-6, 0, 1, 1], [6, 0, 1, 1], [0, -5, 1, 1], [0, 5, 1, 1]].forEach(([dx, dy, w2, h2]) =>
        q(dx, dy, w2, h2, E0, 0.85));
      const p2 = (x, yy2, c, a = 1) => paint(cx + x * 2, cy + yy2 * 2, 2, 2, c, a);
      renderBolt(boltPath(1, -1, 8, -5, 71, 1, 1), 'flash', p2, { seed: 71 });
    } else {
      q(3, -2, 1, 1, E2, 0.9);                               // rest: one micro-spark
    }
  }
  text('CORE SYNC 0 1 2', 216, y + 47);
})();

// =================================================================
// BAND B2 — aura + arcs on the REAL planted boss, plant zoom, anchor map
// =================================================================
(() => {
  text('AURA + ARC LOOP - PLANTED BOSS 0 1 2', 4, 217, HEADC);
  const y = 226;
  for (let ph = 0; ph < 3; ph++) {
    const ox = 4 + ph * 74;
    cellFrame(ox, y, 66, 58, '#131020');
    paint(ox, y + 53, 66, 1, NF1, 1); paint(ox, y + 54, 66, 4, NF0, 1);
    const bx = ox + 10, by = y + 6;
    paintAura(bx, by, ph);
    stampM(ph === 1 ? IDLE1 : IDLE0, BOSS_PAL, bx, by);
    paintBossArcs(bx, by, ph);
  }
  // --- plant-point arc zoom (2x): crawl + buried tip + crack + ground skitter ---
  const zx = 230;
  cellFrame(zx, y, 52, 58, NW0);
  const p2 = (lx, ly, c, a = 1) => paint(zx + lx * 2, y + 3 + ly * 2, 2, 2, c, a);
  for (let lx = 0; lx < 26; lx++) p2(lx, 19, NF1, 1);
  for (let lx = 0; lx < 26; lx++) for (let ly = 20; ly < 26; ly++) p2(lx, ly, NF0, 1);
  for (let ly = 3; ly <= 17; ly++) {                         // blade
    p2(13, ly, ly > 14 ? E2 : E1, 1); p2(12, ly, '#12121a', 1); p2(14, ly, '#2a2c3a', 1);
  }
  p2(13, 18, E3, 1); p2(13, 19, E2, 1); p2(13, 20, E1, 1);   // buried tip
  // crawl segment on the blade w/ hot kink
  [[14, 6], [15, 7], [14, 8], [13, 9], [14, 10]].forEach(([lx, ly], i) => p2(lx, ly, i === 2 ? E3 : E2, 1));
  [[15, 6], [16, 7], [15, 8]].forEach(([lx, ly]) => p2(lx, ly, VOID, 0.85));
  // crack + ember seep
  [[10, 20], [9, 21], [16, 20], [17, 21], [7, 22], [19, 21]].forEach(([lx, ly]) => p2(lx, ly, CRK, 1));
  [[11, 20], [16, 21]].forEach(([lx, ly]) => p2(lx, ly, E0, 1));
  // ground skitter (fracture mode look)
  [[16, 19], [18, 19], [19, 18], [21, 19], [23, 19]].forEach(([lx, ly], i) => p2(lx, ly, i % 2 ? E1 : E2, 1));
  [[17, 18], [22, 18]].forEach(([lx, ly]) => p2(lx, ly, VOID, 0.8));
  p2(22, 14, E0, 0.9);                                       // rising mote
  text('PLANT ARC 2X', zx, y + 61);
  // --- spawn-anchor map (mono boss + numbered arc anchors) ---
  const ax = 288;
  cellFrame(ax, y, 48, 58, '#100d1c');
  stampM(IDLE0, BOSS_PAL, ax + 1, y + 6, { tintFn: () => '#232532' });
  const anchor = (dx, dy, n, lx) => {
    paint(ax + 1 + dx, y + 6 + dy, 1, 1, E3, 1);
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([qx, qy]) => paint(ax + 1 + dx + qx, y + 6 + dy + qy, 1, 1, E1, 0.7));
    text(String(n), ax + 1 + dx + lx, y + 6 + dy - 2, '#8d84a8');
  };
  anchor(19, 15, 1, -7);                                     // chest core
  anchor(31, 18, 2, 4);                                      // guard gem
  anchor(31, 32, 3, 4);                                      // blade mid
  anchor(31, 46, 4, 4);                                      // plant point
  text('SPAWN ANCHORS', ax, y + 61);
})();

// =================================================================
// BAND C — full tableau
// =================================================================
(() => {
  text('C. TABLEAU - AFK ACTIVE - CENTER READABLE', 4, 298, HEADC);
  const ox = 4, oy = 306, w = 332, h = 88, floorY = oy + 70;
  cellFrame(ox, oy, w, h, NW0);
  // stone dashes
  for (let y = 4; y < 62; y += 8)
    for (let x = (y % 16 === 4 ? 6 : 13); x < w - 4; x += 21) paint(ox + x, oy + y, 7, 1, NW1, 1);
  // windows
  const win = sx => {
    paint(ox + sx + 3, oy + 12, 6, 2, '#141826', 1);
    paint(ox + sx + 1, oy + 14, 10, 2, '#141826', 1);
    paint(ox + sx, oy + 16, 12, 34, '#141826', 1);
    paint(ox + sx + 1, oy + 17, 10, 32, '#1b2438', 1);
    paint(ox + sx + 4, oy + 20, 3, 7, WINL, sx < 100 ? 0.5 : 0.35); paint(ox + sx + 4, oy + 32, 3, 4, WINL, sx < 100 ? 0.3 : 0.2);
    if (sx < 100) paint(ox + sx + 5, oy + 21, 1, 3, '#c6d8f0', 0.5);
  };
  win(44); win(300 - 22);
  // dais + throne behind the boss (plant column = ox+166)
  const tx = ox + 166;
  paint(tx - 24, floorY - 2, 48, 2, '#241e30', 1); paint(tx - 24, floorY - 2, 48, 1, '#332a44', 1);
  paint(tx - 20, floorY - 4, 40, 2, '#241e30', 1); paint(tx - 20, floorY - 4, 40, 1, '#332a44', 1);
  paint(tx - 16, floorY - 6, 32, 2, '#241e30', 1); paint(tx - 16, floorY - 6, 32, 1, '#332a44', 1);
  for (let r = 0; r < 40; r++) {
    const hw = Math.round(6 + 13 * Math.pow(1 - r / 40, 1.35));
    paint(tx - hw, floorY - 7 - r, hw * 2, 1, '#0f0c16', 1);
    paint(tx - hw, floorY - 7 - r, 1, 1, '#231d2e', 1); paint(tx + hw - 1, floorY - 7 - r, 1, 1, '#231d2e', 1);
    if (r % 5 === 0) { paint(tx - hw, floorY - 7 - r, 1, 1, GOLD, 0.75); paint(tx + hw - 1, floorY - 7 - r, 1, 1, GOLD, 0.75); }
  }
  paint(tx - 3, floorY - 49, 7, 2, GOLD, 0.9); paint(tx - 1, floorY - 51, 3, 2, GOLDL, 0.9); // crown band
  paint(tx - 3, floorY - 50, 1, 1, E0, 1); paint(tx + 3, floorY - 50, 1, 1, E0, 1);          // rubies
  paint(tx - 4, floorY - 44, 9, 30, DRAPE, 1);                                             // drape
  paint(tx - 2, floorY - 42, 1, 26, '#2b0a10', 1); paint(tx + 2, floorY - 42, 1, 26, '#2b0a10', 1);
  for (let x = -4; x <= 4; x += 2) paint(tx + x, floorY - 15, 1, 1, GOLD, 0.8);            // fringe
  // candelabra
  const cand = cx => {
    paint(cx, floorY - 16, 1, 16, '#3a3346', 1);
    paint(cx - 2, floorY - 16, 5, 1, '#3a3346', 1);
    paint(cx - 2, floorY - 18, 1, 2, '#3a3346', 1); paint(cx + 2, floorY - 18, 1, 2, '#3a3346', 1);
    [[-2, -19], [0, -17], [2, -19]].forEach(([dx, dy]) => {
      paint(cx + dx, floorY + dy, 1, 1, FLAME2, 1); paint(cx + dx, floorY + dy - 1, 1, 1, FLAME, 1);
    });
  };
  cand(ox + 108); cand(ox + 224);
  // floor + carpet
  paint(ox, floorY, w, 1, NF1, 1); paint(ox, floorY + 1, w, h - (floorY - oy) - 1, NF0, 1);
  paint(ox, floorY + 3, w, 5, '#4a0f1a', 1);
  paint(ox, floorY + 3, w, 1, GOLD, 0.4); paint(ox, floorY + 7, w, 1, GOLD, 0.4);
  for (let x = 10; x < w - 6; x += 24) { paint(ox + x, floorY + 5, 2, 1, GOLDL, 0.9); paint(ox + x + 1, floorY + 4, 1, 3, GOLDL, 0.5); }
  // BOSS planted (heartbeat frame) + aura ph1 + arcs ph1 + crack
  const bx = tx - 31, by = floorY - 47;
  paintAura(bx, by, 1);
  stampM(IDLE1, BOSS_PAL, bx, by);
  paintBossArcs(bx, by, 1);
  const px2 = tx;
  paint(px2 - 3, floorY + 1, 2, 1, CRK, 1); paint(px2 + 2, floorY + 1, 3, 1, CRK, 1);
  paint(px2 - 5, floorY + 2, 2, 1, CRK, 1); paint(px2 + 4, floorY + 2, 2, 1, CRK, 1);
  paint(px2 - 2, floorY + 1, 1, 1, E0, 1); paint(px2 + 2, floorY + 2, 1, 1, E0, 1);
  // HERO braced (mirrored, facing the boss) + hesitation arc
  const hx = ox + 268, hy = floorY - 24;
  stampM(BRACE1.map(r => r.join('')).map(s => [...s]), HERO_PAL, hx, hy, { mir: true });
  [[-16, 0], [-11, -1], [-6, -1], [-1, 0]].forEach(([dx, dy], i) =>
    paint(hx + dx, floorY - 1 + dy, 3, 1, i === 1 ? ICY : ST0, 1));
  // THE NEW DARKENING over the whole screen (V3 unified language, phase 1)
  paintCurse(ox, oy, w, h, { bMax: 15, bMin: 6, bSpan: [8, 13], bCurve: 1.1, tMax: 13, tMin: 5, tSpan: [9, 14], tCurve: 0.8, sideMax: 13, petals: 8, drips: 2, spikes: 3, haze: 22 }, 1, 9);
})();

// ================= PNG writer (house idiom) =================
function crc32(buf){let t=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0;}
  let crc=0xFFFFFFFF;for(const b of buf)crc=t[(crc^b)&0xFF]^(crc>>>8);return(crc^0xFFFFFFFF)>>>0;}
function chunk(type,data){const t=Buffer.from(type,'ascii');const len=Buffer.alloc(4);len.writeUInt32BE(data.length);
  const crc=Buffer.alloc(4);crc.writeUInt32BE(crc32(Buffer.concat([t,data])));return Buffer.concat([len,t,data,crc]);}
const IW=SW*SCALE, IH=SH*SCALE, raw=Buffer.alloc(IH*(1+IW*4));
for(let y=0;y<IH;y++){const row=y*(1+IW*4);raw[row]=0;
  for(let x=0;x<IW;x++){const c=G[Math.floor(y/SCALE)][Math.floor(x/SCALE)];const o=row+1+x*4;
    if(!c){const dk=((Math.floor(x/20)+Math.floor(y/20))%2)===0;raw[o]=dk?0x16:0x1a;raw[o+1]=dk?0x13:0x17;raw[o+2]=dk?0x22:0x27;raw[o+3]=255;}
    else{raw[o]=c[0];raw[o+1]=c[1];raw[o+2]=c[2];raw[o+3]=255;}}}
const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(IW,0);ihdr.writeUInt32BE(IH,4);ihdr[8]=8;ihdr[9]=6;
fs.writeFileSync(__dirname+'/afk2_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));
console.log('wrote afk2_v1.png', IW + 'x' + IH);
