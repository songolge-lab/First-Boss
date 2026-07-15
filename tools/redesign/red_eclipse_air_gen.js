// RED ECLIPSE — AIR CHARGED IGNITION — Stage RE-4 extraction (concept/handoff, nothing wired).
//
// Extracts the APPROVED RE-0 Family C "IGNITION ECLIPSE" (eclipse_gen.js) into a dedicated
// production package for the Boss's air charged attack. The design is a DETONATION — reref1's
// starburst translated into the eclipse identity: power is born at the red chest core while
// the Boss hovers, ignites, and bursts OUTWARD into long STRAIGHT crystalline rays around an
// umbral void-disc core in a hot corona (a literal red eclipse). The south ray is the longest
// (~2.2x) and aims at the ground — the dive axis. On release the rays SHATTER into black-red
// bolts and sink away as ash while the existing charged dive takes over.
// CHEST CORE (grid 47,29 = pose chest 20,15) -> IGNITION -> OUTWARD. The exact inverse of the
// ground inhale (RE-2); never an inward convergence, never a generic aura.
//
// NEW in RE-4 (all reductions/extensions of the same approved design, never a redesign):
//   - quality tiers baked as data: normal (byte-exact RE-0), lite, performance
//   - 8 pre-treated 46x48 body re-skin frames (no eclipseSkin port needed at integration)
//   - production sheet at ACTUAL GAME SCALE (SCALE=3: 1 cell = 3 image px = 3 game px)
//   - outward-motion, corona-core and S-ray-reach proofs asserted per tier on every run
//
// The normal-tier back/front grids are asserted BYTE-EXACT against eclipseIgnition in
// eclipse_literal.txt on every run — this file is an extraction, not a reinterpretation.
//
// Emits: red_eclipse_air_v1.png (sheet) + red_eclipse_air_literal.txt (drop-ins).
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
const E0 = '#6e0f1c', E1 = '#a8182a', E2 = '#e0263a', E3 = '#ff5a4a';
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';

// ---------- load approved clips from the literal artifacts ----------
function loadClips(file, names) {
  const src = fs.readFileSync(__dirname + '/' + file, 'utf8').replace(/\r/g, '');
  const out = {};
  for (const n of names) {
    const m = src.match(new RegExp('  ' + n + ': \\[([\\s\\S]*?)\\n  \\],'));
    if (!m) throw new Error('clip not found: ' + n + ' in ' + file);
    out[n] = [...m[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)]
      .map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
  }
  return out;
}
// effect-grid loader ({back,front} frames) for the RE-0 byte-exact assertion
function loadFx(file, name) {
  const src = fs.readFileSync(__dirname + '/' + file, 'utf8').replace(/\r/g, '');
  const m = src.match(new RegExp('  ' + name + ': \\[([\\s\\S]*?)\\n  \\],'));
  if (!m) throw new Error('fx not found: ' + name + ' in ' + file);
  const out = [];
  const re = /\{ back: \[([\s\S]*?)\],\n      front: (\[\]|\[[\s\S]*?\]) \}/g;
  let fm;
  while ((fm = re.exec(m[1]))) {
    const rows = s => [...s.matchAll(/"([^"]*)"/g)].map(x => x[1]);
    out.push({ back: rows(fm[1]), front: fm[2] === '[]' ? [] : rows(fm[2]) });
  }
  return out;
}
const ANIM = loadClips('boss_anim_literal.txt', ['airCharge', 'chargedDive']);
const RE0_IGNITION = loadFx('eclipse_literal.txt', 'eclipseIgnition');
// the approved RE-2 ground inhale, loaded ONLY for the opposites band on the sheet
const GROUND = loadFx('red_eclipse_ground_literal.txt', 'eclipseGround');
const GROUND_BODY = loadClips('red_eclipse_ground_literal.txt', ['eclipseGroundBody']).eclipseGroundBody;
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
// hero at TRUE game scale for the actual-scale bands: hero cells render at 2 game px
// (vs boss 3), so resample 30x24 -> 20x16 (nearest) = exactly 60x48 game px.
const heroSmall = Array.from({ length: 16 }, (_, y) =>
  Array.from({ length: 20 }, (_, x) => heroBase[Math.floor(y * 1.5)][Math.floor(x * 1.5)]));

const toGrid = f => f.map(r => r.split(''));
const stringify = g => g.map(r => r.join(''));

// ---------- generic grid helpers (verbatim from eclipse_gen.js) ----------
const mkGrid = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, x, y, k) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = k;
};
const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
function bres(x0, y0, x1, y1) {
  const out = []; let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0),
    sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, err = dx - dy, x = x0, y = y0;
  for (;;) { out.push([x, y]); if (x === x1 && y === y1) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; } }
  return out;
}
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
    const seg = bres(pts[s][0], pts[s][1], pts[s + 1][0], pts[s + 1][1]);
    if (s > 0) seg.shift();
    cells.push(...seg);
    if (s < pts.length - 2) kinks.push(cells.length - 1);
  }
  return { cells, kinks };
}
function bakeBolt(g, bolt, mode, opts = {}) {
  const { cells, kinks } = bolt, kset = new Set(kinks);
  const { branches = [], seed = 7 } = opts;
  if (mode === 'ignite') {
    const [sx, sy] = cells[0];
    put(g, sx, sy, 'd'); put(g, sx + 1, sy, 'd'); put(g, sx, sy + 1, 'd'); put(g, sx + 1, sy + 1, 'd');
    [[-2, -2], [3, -2], [-2, 3], [3, 3]].forEach(([dx, dy]) => put(g, sx + dx, sy + dy, 'c'));
    for (let i = 2; i < Math.min(8, cells.length); i++) put(g, cells[i][0], cells[i][1], '0');
    return;
  }
  if (mode === 'flash') {
    for (let i = 0; i < cells.length; i++) {                 // black crack sheath first
      const [x, y] = cells[i];
      const p = cells[Math.max(0, i - 1)], nn = cells[Math.min(cells.length - 1, i + 1)];
      if (Math.abs(nn[1] - p[1]) >= Math.abs(nn[0] - p[0])) { put(g, x - 1, y, '0'); put(g, x + 1, y, '0'); }
      else { put(g, x, y - 1, '0'); put(g, x, y + 1, '0'); }
    }
    for (const [x, y] of cells) put(g, x, y, 'c');           // red filament
    for (const i of kinks) { const [x, y] = cells[i]; put(g, x, y, 'd'); put(g, x, y - 1, 'd'); }
    for (const b of branches) {
      const from = cells[Math.min(cells.length - 1, Math.floor(b.frac * cells.length))];
      const sub = boltPath(from[0], from[1], from[0] + b.dx, from[1] + b.dy, seed + 11, 1, 1);
      sub.cells.forEach(([x, y], i2) => { put(g, x, y - 1, '0'); put(g, x, y, i2 === sub.cells.length - 1 ? 'a' : 'b'); });
    }
    return;
  }
  if (mode === 'fracture') {
    for (let i = 0; i < cells.length; i++) {
      if (i % 5 >= 3) continue;
      const [x, y] = cells[i];
      put(g, x, y, kset.has(i) ? 'c' : 'b');
      if (i % 5 === 0) put(g, x, y - 1, '0');
    }
    const m = cells[Math.floor(cells.length / 2)];
    put(g, m[0] + 2, m[1] - 2, 'a'); put(g, m[0] - 2, m[1] + 3, 'a');
    return;
  }
  for (let i = 0; i < cells.length; i += 4) {                // ash: sinking slivers
    const [x, y] = cells[i];
    const len = 2 + ((i >> 2) % 2);
    for (let j = 0; j < len; j++) put(g, x, y + 1 + j, (i >> 2) % 2 ? '1' : 'g');
  }
  const m = cells[Math.floor(cells.length / 2)];
  put(g, m[0] + 2, m[1] + 2, 'a');
}

// ---------- body treatments (family-shared eclipse language, verbatim) ----------
const DARK1 = { '5': '4', '4': '3', '3': '2', '2': '1', '1': '0', '0': '0',
                'd': 'c', 'c': 'b', 'b': 'a', 'a': 'g', 'h': 'g', 'g': 'g' };
const darkenStep = g => g.map(r => r.map(k => DARK1[k] || k));
function eclipseSkin(gIn, seed, opts = {}) {
  const { rim = 1, hot = false } = opts;
  const HH2 = gIn.length, WW2 = gIn[0].length;
  const out = gIn.map((row, y) => row.map((k, x) => {
    if (k === '.') return '.';
    if (k === 'd') return hot ? ((x + y + seed) % 3 === 0 ? 'c' : 'b') : 'a';
    if (k === 'c') return hot ? 'b' : 'a';
    if (k === 'b') return 'a';
    if (k === 'a' || k === 'g' || k === 'h') return 'g';
    return (x * 3 + y * 7 + seed) % 13 === 0 ? '1' : '0';
  }));
  for (let y = 0; y < HH2; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < WW2; x++) if (out[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    const base = rim < 0.5 ? 'g' : 'h';
    if (rnd(y, seed) < rim * 0.95)      out[y][lo] = rnd(y, seed + 9)  < rim * 0.42 ? 'c' : base;
    if (rnd(y, seed + 4) < rim * 0.95)  out[y][hi] = rnd(y, seed + 13) < rim * 0.42 ? 'c' : base;
  }
  return out;
}

// =====================================================================
// AIR IGNITION build (RE-0 Family C geometry, verbatim; tier-parameterized)
// =====================================================================
// Anchors: boss airCharge pose (46x48) at grid (27,14); chest core at grid
// (47,29); no floor in-frame (airborne). Grid center column 50 == body center
// column, so the whole effect mirrors safely with the existing aimDir flip.
// The 8 ray angles are FIXED for the whole clip; rays are STRAIGHT and
// crystalline (family C's signature) — jagged bolts only appear at decay.
const GC = { W: 100, H: 88, BX: 27, BY: 14, CX: 47, CY: 29 };
const RAYS = [ // [angleDeg, fullLen] — S is the longest: it aims at the ground
  [-90, 25], [90, 56], [0, 34], [180, 34],
  [-45, 17], [-135, 17], [45, 19], [135, 19],
];
function ray(g, angDeg, r0, r1, minor = false) {
  const a = angDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx;
  for (let r = r0; r <= r1; r++) {
    const t = (r - r0) / Math.max(1, r1 - r0);
    const x = Math.round(GC.CX + dx * r), y = Math.round(GC.CY + dy * r);
    if (minor) { put(g, x, y, t < 0.5 ? 'b' : 'a'); continue; }
    put(g, x, y, t < 0.3 ? 'd' : t < 0.62 ? 'c' : t < 0.86 ? 'b' : 'a');
    if (t < 0.55 && r1 - r0 > 12) {
      put(g, Math.round(x + px), Math.round(y + py), '0');
      put(g, Math.round(x - px), Math.round(y - py), '0');
    } else if (t < 0.8 && r1 - r0 > 18) put(g, Math.round(x + px), Math.round(y + py), 'g');
  }
}
// the ECLIPSE core: umbral void disc + hot corona ring + halo (front overlay)
function coronaCore(g, stage) {
  const [cx, cy] = [GC.CX, GC.CY];
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (stage === 'kernel') {
      if (m <= 1) put(g, cx + dx, cy + dy, 'a');
      else if (m === 2) put(g, cx + dx, cy + dy, '0');
    } else if (stage === 'condense') {
      if (m === 0) put(g, cx + dx, cy + dy, 'd');
      else if (m <= 2) put(g, cx + dx, cy + dy, 'c');
      else if (m === 3) put(g, cx + dx, cy + dy, '0');
    } else if (stage === 'ignite') {
      if (m <= 1) put(g, cx + dx, cy + dy, '0');
      else if (m <= 3) put(g, cx + dx, cy + dy, 'd');
      else if (m === 4) put(g, cx + dx, cy + dy, 'c');
    } else if (stage === 'corona') {
      if (m <= 2) put(g, cx + dx, cy + dy, '0');
      else if (m <= 4) put(g, cx + dx, cy + dy, 'd');
      else if (m === 5) put(g, cx + dx, cy + dy, 'c');
      else if (m === 6 && (dx === 0 || dy === 0)) put(g, cx + dx, cy + dy, 'c');
    } else if (stage === 'shimmer') {
      if (m <= 2) put(g, cx + dx, cy + dy, '0');
      else if (m <= 4) put(g, cx + dx, cy + dy, (dx + dy) % 2 ? 'd' : 'c');
      else if (m === 5) put(g, cx + dx, cy + dy, 'b');
    } else if (stage === 'break') {
      if (m <= 2) put(g, cx + dx, cy + dy, '0');
      else if (m === 3 && (dx + dy) % 2 === 0) put(g, cx + dx, cy + dy, 'c');
      else if (m === 4 && (dx + dy) % 2) put(g, cx + dx, cy + dy, 'a');
    } else if (stage === 'ember') {
      if (m <= 1) put(g, cx + dx, cy + dy, 'a');
      else if (m === 2 && dx === 0) put(g, cx + dx, cy + dy, 'g');
    }
  }
}
function octRing(g, r, offDeg, style) {                      // broken octagon geometry
  for (let k = 0; k < 8; k++) {
    if (style === 'faint' && k % 2) continue;
    const a0 = (offDeg + k * 45) * Math.PI / 180, a1 = (offDeg + (k + 1) * 45) * Math.PI / 180;
    const v0 = [Math.round(GC.CX + Math.cos(a0) * r), Math.round(GC.CY + Math.sin(a0) * r)];
    const v1 = [Math.round(GC.CX + Math.cos(a1) * r), Math.round(GC.CY + Math.sin(a1) * r)];
    const seg = bres(v0[0], v0[1], v1[0], v1[1]);
    for (let i = Math.floor(seg.length * 0.2); i < Math.ceil(seg.length * 0.8); i++) {
      if (style === 'crack' && i % 5 >= 3) continue;
      put(g, seg[i][0], seg[i][1], style === 'faint' ? 'g' : i % 4 === 0 ? 'g' : 'a');
    }
  }
}
function outerDashes(g, r, n, seed) {                        // detached outer ring dashes
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2 + rnd(k, seed) * 0.2;
    put(g, Math.round(GC.CX + Math.cos(a) * r), Math.round(GC.CY + Math.sin(a) * r), '0');
    if (k % 3 === 0) put(g, Math.round(GC.CX + Math.cos(a) * (r + 1)), Math.round(GC.CY + Math.sin(a) * (r + 1)), 'g');
  }
}
function shards(g, n, rBase, rSpread, seed, opts = {}) {     // crystal scatter
  const { outward = true, fall = 0 } = opts;
  for (let i = 0; i < n; i++) {
    const a = rnd(i, seed) * Math.PI * 2;
    const r = rBase + rnd(i, seed + 2) * rSpread;
    const x = Math.round(GC.CX + Math.cos(a) * r), y = Math.round(GC.CY + Math.sin(a) * r) + fall;
    put(g, x, y, i % 3 === 0 ? 'b' : 'a');
    const tr = outward ? r - 3 : r + 3;                      // tail: outward flight or inward pull
    if (i % 2 === 0) put(g, Math.round(GC.CX + Math.cos(a) * tr), Math.round(GC.CY + Math.sin(a) * tr) + fall, 'g');
  }
}

// tier configs — reductions of the SAME design. normal reproduces the RE-0
// familyC() call sequence exactly (asserted byte-exact below). Shard cuts take
// the FIRST n of the normal scatter (same seeded stream), so nothing re-rolls.
// performance keeps the 4 cardinals + 4 diagonals + corona core + tip glints
// (the H/V/diagonal starburst skeleton) and drops minors/octagon/dashes/shards.
const TIERS = {
  normal: { c0Shards: 5, c1Shards: 4, c2Shards: 8, c3Shards: 12, c4Shards: 12, c5Shards: 14,
            diag: true, minor: true,  oct: true,  dash: true,  tear: true,  crawl: true,  c6Bolts: 3 },
  lite:   { c0Shards: 3, c1Shards: 2, c2Shards: 4, c3Shards: 6,  c4Shards: 6,  c5Shards: 7,
            diag: true, minor: false, oct: true,  dash: false, tear: true,  crawl: true,  c6Bolts: 2 },
  performance: {
            c0Shards: 2, c1Shards: 2, c2Shards: 0, c3Shards: 0,  c4Shards: 0,  c5Shards: 0,
            diag: true, minor: false, oct: false, dash: false, tear: false, crawl: false, c6Bolts: 1 },
};
function buildC(T) {
  const ap = ANIM.airCharge.map(toGrid);
  const out = [];
  const mk = () => mkGrid(GC.W, GC.H);
  const [cx, cy] = [GC.CX, GC.CY];
  // C0 KERNEL — a void kernel condenses at the chest; tiny in-ticks; close shards drift IN
  let back = mk(), front = mk();
  [[-45, 9, 7], [-135, 9, 7], [45, 10, 8], [135, 10, 8]].forEach(([a, r1, r0]) => {
    const ar = a * Math.PI / 180;
    put(back, Math.round(cx + Math.cos(ar) * r1), Math.round(cy + Math.sin(ar) * r1), 'g');
    put(back, Math.round(cx + Math.cos(ar) * r0), Math.round(cy + Math.sin(ar) * r0), 'a');
  });
  shards(back, T.c0Shards, 13, 4, 21, { outward: false });
  coronaCore(front, 'kernel');
  out.push({ back, front, body: darkenStep(ap[0]), tag: 'C0 KERNEL' });
  // C1 CONDENSE — the kernel goes hot; N-S pre-stubs; the star is about to be born
  back = mk(); front = mk();
  ray(back, -90, 7, 10, true); ray(back, 90, 7, 10, true);
  shards(back, T.c1Shards, 11, 3, 23, { outward: false });
  coronaCore(front, 'condense');
  out.push({ back, front, body: eclipseSkin(ap[1], 21, { rim: 0.6 }), tag: 'C1 CONDENSE' });
  // C2 IGNITE — rays burst to 55 pct; faint octagon; shards begin flying OUT
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L]) => ray(back, a, 7, Math.round(L * 0.55)));
  if (T.diag) RAYS.slice(4).forEach(([a, L]) => ray(back, a, 6, Math.round(L * 0.55), true));
  if (T.oct) octRing(back, 20, 22, 'faint');
  shards(back, T.c2Shards, 10, 4, 25);
  coronaCore(front, 'ignite');
  out.push({ back, front, body: eclipseSkin(ap[0], 22, { rim: 0.8, hot: true }), tag: 'C2 IGNITE' });
  // C3 CORONA — the reref1 frame: full rays, octagon + outer dashes, corona core,
  //             detached tip glints, crystal scatter — the boss hangs inside it
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L]) => ray(back, a, 7, L));
  if (T.diag) RAYS.slice(4).forEach(([a, L]) => ray(back, a, 6, L, true));
  if (T.minor) for (let k = 0; k < 8; k++) ray(back, k * 45 + 22.5, 6, 10, true);   // minor inter-rays
  if (T.oct) octRing(back, 20, 22, 'full');
  if (T.dash) outerDashes(back, 28, 22, 31);
  [[-90, 27], [90, 58], [0, 36], [180, 36]].forEach(([a, r]) => {      // detached tip glints
    const ar = a * Math.PI / 180;
    put(back, Math.round(cx + Math.cos(ar) * r), Math.round(cy + Math.sin(ar) * r), 'd');
  });
  shards(back, T.c3Shards, 14, 6, 27);
  coronaCore(front, 'corona');
  out.push({ back, front, body: eclipseSkin(ap[1], 23, { rim: 1, hot: true }), tag: 'C3 CORONA' });
  // C4 SHIMMER — held peak: minor rays rotate a slot, shards push out, corona pulses
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L]) => ray(back, a, 7, L));
  if (T.diag) RAYS.slice(4).forEach(([a, L]) => ray(back, a, 6, Math.round(L * 0.9), true));
  if (T.minor) for (let k = 0; k < 8; k++) ray(back, k * 45 + 11, 6, 9, true);
  if (T.oct) octRing(back, 21, 45, 'full');
  if (T.dash) outerDashes(back, 29, 18, 33);
  shards(back, T.c4Shards, 19, 6, 29);
  coronaCore(front, 'shimmer');
  out.push({ back, front, body: eclipseSkin(ap[0], 24, { rim: 1, hot: true }), tag: 'C4 SHIMMER' });
  // C5 SHATTER — the rays BREAK into black-red bolts (N+S still flash hot, E+W
  // already fractured); octagon cracks + drifts out
  back = mk(); front = mk();
  RAYS.slice(0, 4).forEach(([a, L], ri) => {                 // inner stumps stay crystalline
    ray(back, a, 7, Math.round(L * 0.35));
    const ar = a * Math.PI / 180;
    bakeBolt(back, boltPath(Math.round(cx + Math.cos(ar) * L * 0.4), Math.round(cy + Math.sin(ar) * L * 0.4),
                            Math.round(cx + Math.cos(ar) * L * 0.95), Math.round(cy + Math.sin(ar) * L * 0.95),
                            41 + a, 2, 2), ri < 2 ? 'flash' : 'fracture', { seed: 41 + a });
  });
  if (T.tear) [[-45, 17], [135, 19]].forEach(([a, L]) => {   // two diagonals tear off whole
    const ar = a * Math.PI / 180;
    bakeBolt(back, boltPath(Math.round(cx + Math.cos(ar) * 8), Math.round(cy + Math.sin(ar) * 8),
                            Math.round(cx + Math.cos(ar) * (L + 4)), Math.round(cy + Math.sin(ar) * (L + 4)),
                            61 + a, 2, 2), 'fracture');
  });
  if (T.oct) octRing(back, 23, 22, 'crack');
  shards(back, T.c5Shards, 24, 7, 35, { fall: 1 });
  coronaCore(front, 'break');
  if (T.crawl)                                               // one bolt crawls OFF him
    bakeBolt(front, boltPath(cx - 5, cy + 9, cx + 5, cy + 17, 141, 1, 1), 'flash', { seed: 141 });
  out.push({ back, front, body: eclipseSkin(ap[1], 25, { rim: 0.7 }), tag: 'C5 SHATTER' });
  // C6 BOLTFALL — only stray bolts remain; ash sinks under the boss
  back = mk(); front = mk();
  const c6bolts = [
    () => bakeBolt(back, boltPath(cx, cy + 33, cx - 2, cy + 50, 143, 2, 1), 'fracture'),
    () => bakeBolt(back, boltPath(cx + 12, cy - 12, cx + 20, cy - 20, 145, 1, 1), 'ash'),
    () => bakeBolt(back, boltPath(cx - 12, cy + 8, cx - 22, cy + 16, 147, 1, 1), 'ash'),
  ];
  c6bolts.slice(0, T.c6Bolts).forEach(f => f());
  [[-9, 36], [0, 40], [11, 37]].forEach(([dx, dy]) => {
    put(back, cx + dx, cy + dy, 'g'); put(back, cx + dx, cy + dy + 1, '1'); put(back, cx + dx, cy + dy + 2, '0');
  });
  coronaCore(front, 'ember');
  out.push({ back, front, body: darkenStep(ap[0]), tag: 'C6 BOLTFALL' });
  // C7 FADE — last ash slivers sink away; the boss resolves back to normal
  back = mk(); front = mk();
  [[-6, 42], [4, 46], [13, 30]].forEach(([dx, dy]) => {
    put(back, cx + dx, cy + dy, 'g'); put(back, cx + dx, cy + dy + 1, '1');
  });
  put(front, cx, cy, 'a');
  out.push({ back, front, body: ap[1].map(r => r.slice()), tag: 'C7 FADE' });
  return out;
}

// dive handoff cell — SHEET ILLUSTRATION ONLY (the existing chargedDive pose +
// existing dive trail idea; not part of the effect, not dumped to the literal)
function diveMockFrame() {
  const back = mkGrid(GC.W, GC.H), front = mkGrid(GC.W, GC.H);
  const cx = GC.CX, cy = GC.CY;
  [[-6, 44], [4, 48]].forEach(([dx, dy]) => put(back, cx + dx, cy + dy, '1'));  // last ash, one frame later
  for (let i = 0; i < 3; i++) {                              // diagonal streaks behind the dive
    const ox = -13 - i * 7, oy = -15 - i * 8;
    bres(cx + ox, cy + oy, cx + ox + 6, cy + oy + 7).forEach(([x, y], j) => {
      if (j % 2 === 0) put(back, x, y, i === 0 ? 'b' : 'a');
    });
  }
  return { back, front, body: toGrid(ANIM.chargedDive[0]), tag: 'DIVE MOCK', diveBody: true };
}

// ---------- build everything ----------
const C_NORMAL = buildC(TIERS.normal);
const C_LITE = buildC(TIERS.lite);
const C_PERF = buildC(TIERS.performance);
const DIVE_MOCK = diveMockFrame();

// =====================================================================
// VALIDATION
// =====================================================================
const LEGAL = new Set([...'012345abcdgh.']);
let vErr = 0;
function checkGrid(name, f, w, h) {
  if (f.length !== h || f.some(r => r.length !== w)) { console.error('SIZE FAIL', name); vErr++; }
  for (const r of f) for (const k of r) if (!LEGAL.has(k)) { console.error('KEY FAIL', name, k); vErr++; }
}
[['normal', C_NORMAL], ['lite', C_LITE], ['perf', C_PERF]].forEach(([tn, fam]) =>
  fam.forEach((fr, i) => {
    checkGrid(tn + ' C' + i + ' back', stringify(fr.back), GC.W, GC.H);
    checkGrid(tn + ' C' + i + ' front', stringify(fr.front), GC.W, GC.H);
    checkGrid(tn + ' C' + i + ' body', stringify(fr.body), 46, 48);
  }));

// 1) EXTRACTION PROOF — normal back/front byte-exact vs approved RE-0 eclipseIgnition
if (RE0_IGNITION.length !== 8) { console.error('RE0 PARSE FAIL', RE0_IGNITION.length); vErr++; }
let exact = 0;
C_NORMAL.forEach((fr, i) => {
  const ref = RE0_IGNITION[i];
  const backOk = stringify(fr.back).join('\n') === ref.back.join('\n');
  const fEmpty = fr.front.every(r => r.every(k => k === '.'));
  const frontOk = fEmpty ? ref.front.length === 0
    : stringify(fr.front).join('\n') === ref.front.join('\n');
  if (backOk && frontOk) exact++;
  else { console.error('BYTE-EXACT FAIL at frame', i, fr.tag, { backOk, frontOk }); vErr++; }
});

// 2) OUTWARD PROOF per tier — the gather pulls tight first (C0 -> C1 shrinks),
//    then the ignition only ever grows (C1 -> C2 -> C3), and the held peak stays
//    stable (C4 within 20 pct of C3 — a held eclipse, never a re-burst).
const meanR = fr => {
  let s = 0, n = 0;
  [fr.back, fr.front].forEach(g => g.forEach((row, y) => row.forEach((k, x) => {
    if (k === 'c' || k === 'd' || k === 'b') { s += Math.hypot(x - GC.CX, y - GC.CY); n++; }
  })));
  return n ? s / n : 0;
};
const RS = {};
[['normal', C_NORMAL], ['lite', C_LITE], ['perf', C_PERF]].forEach(([tn, fam]) => {
  const rs = [0, 1, 2, 3, 4].map(i => meanR(fam[i]));
  if (!(rs[0] > rs[1])) { console.error('GATHER FAIL (C0 !> C1)', tn, rs); vErr++; }
  if (!(rs[1] < rs[2] && rs[2] < rs[3])) { console.error('OUTWARD FAIL', tn, rs); vErr++; }
  if (Math.abs(rs[4] - rs[3]) / rs[3] > 0.2) { console.error('HOLD UNSTABLE', tn, rs); vErr++; }
  RS[tn] = rs;
});

// 3) REACH + S-DOMINANCE PROOF per tier — at the C3 peak the starburst spans all
//    four cardinals and the SOUTH ray is the longest (it aims at the ground).
[['normal', C_NORMAL], ['lite', C_LITE], ['perf', C_PERF]].forEach(([tn, fam]) => {
  let mxS = 0, mxN = 0, mxE = 0, mxW = 0;
  fam[3].back.forEach((row, y) => row.forEach((k, x) => {
    if (k !== 'b' && k !== 'c' && k !== 'd') return;
    const dx = x - GC.CX, dy = y - GC.CY;
    if (Math.abs(dx) <= 2) { if (dy > mxS) mxS = dy; if (-dy > mxN) mxN = -dy; }
    if (Math.abs(dy) <= 2) { if (dx > mxE) mxE = dx; if (-dx > mxW) mxW = -dx; }
  }));
  if (mxS < 50 || mxN < 24 || mxE < 32 || mxW < 32) { console.error('REACH FAIL', tn, { mxS, mxN, mxE, mxW }); vErr++; }
  if (!(mxS > mxN && mxS > mxE && mxS > mxW)) { console.error('S-RAY NOT DOMINANT', tn, { mxS, mxN, mxE, mxW }); vErr++; }
});

// 4) ECLIPSE-CORE PROOF per tier — the front-grid core is a VOID disc in a hot
//    corona from ignite through shimmer (never a filled bright blob), and the
//    kernel/condense gather lights at the exact chest cell.
[['normal', C_NORMAL], ['lite', C_LITE], ['perf', C_PERF]].forEach(([tn, fam]) => {
  if (fam[0].front[GC.CY][GC.CX] !== 'a') { console.error('C0 KERNEL UNLIT', tn); vErr++; }
  if (fam[1].front[GC.CY][GC.CX] !== 'd') { console.error('C1 KERNEL NOT HOT', tn); vErr++; }
  [2, 3, 4].forEach(i => {
    const f = fam[i].front;
    if (f[GC.CY][GC.CX] !== '0') { console.error('CORE NOT VOID', tn, 'C' + i); vErr++; }
    let dRing = 0;
    for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++)
      if (Math.abs(dx) + Math.abs(dy) <= 4 && f[GC.CY + dy][GC.CX + dx] === 'd') dRing++;
    if (dRing < 8) { console.error('CORONA TOO DIM', tn, 'C' + i, dRing); vErr++; }
  });
});

if (vErr) throw new Error('validation failed: ' + vErr);

// =====================================================================
// SHEET CANVAS — SCALE 3: 1 cell = 3 image px = 3 game px (BOSS_IDLE_PIXEL).
// The whole sheet is at actual gameplay scale; zoom bands are marked 2X.
// =====================================================================
const SW = 428, SHMAX = 1900, SCALE = 3;
const G = Array.from({ length: SHMAX }, () => Array(SW).fill(null));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function paint(x, y, w, h, hex, a = 1) {
  const src = hex2rgb(hex);
  for (let yy = y; yy < y + h; yy++) {
    if (yy < 0 || yy >= SHMAX) continue;
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
  const { mir = false, tintFn = null, s = 1 } = opts;
  const mw = m[0].length;
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const k = row[x]; if (k === '.' || k === ' ' || !pal[k]) continue;
    const px = mir ? ox + (mw - 1 - x) * s : ox + x * s;
    const hex = tintFn ? tintFn(k, x, y) : pal[k];
    if (hex) paint(px, oy + y * s, s, s, hex, 1);
  } });
}
const cellFrame = (x, y, w, h, bg = '#131020') => {
  paint(x, y, w, h, bg, 1);
  paint(x - 1, y - 1, w + 2, 1, '#2b2740', 1); paint(x - 1, y + h, w + 2, 1, '#2b2740', 1);
  paint(x - 1, y, 1, h, '#2b2740', 1); paint(x + w, y, 1, h, '#2b2740', 1);
};
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110110101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101010101111', '9': '111101111001111', '.': '000000000000010', '-': '000000111000000',
  '+': '000010111010000',
};
const fontMissing = new Set();
function text(str, x, y, color = '#5d5675') {
  let cx = x;
  for (const ch of String(str).toUpperCase()) {
    if (ch === ' ') { cx += 4; continue; }
    const g = FONT[ch];
    if (!g) { fontMissing.add(ch); cx += 4; continue; }
    for (let i = 0; i < 15; i++) if (g[i] === '1') paint(cx + (i % 3), y + Math.floor(i / 3), 1, 1, color, 1);
    cx += 4;
  }
  return cx;
}
const HEADC = '#8d84a8', SUBC = '#4a4560', PHC = '#6d6488';

// composite an air effect frame (back + treated body + front) at sheet pos
function stampEffect(fr, ox, oy) {
  stampM(fr.back, BOSS_PAL, ox, oy);
  if (fr.body) stampM(fr.body, BOSS_PAL, ox + GC.BX + (fr.diveBody ? 7 : 0), oy + GC.BY + (fr.diveBody ? 9 : 0));
  stampM(fr.front, BOSS_PAL, ox, oy);
}
// flatten an effect frame into one 100x88 key grid (for zoom crops)
function compose(fr) {
  const g = mkGrid(GC.W, GC.H);
  const lay = (src, ox, oy) => src.forEach((row, y) => row.forEach((k, x) => {
    if (k !== '.') put(g, x + ox, y + oy, k);
  }));
  lay(fr.back, 0, 0); if (fr.body) lay(fr.body, GC.BX, GC.BY); lay(fr.front, 0, 0);
  return g;
}
const crop = (g, x0, y0, w, h) => Array.from({ length: h }, (_, y) => g[y0 + y].slice(x0, x0 + w));
function nightRoom(ox, oy, w, h, floorRel, slits = [0.16, 0.72]) {
  cellFrame(ox, oy, w, h, NW0);
  for (let y = 2; y < floorRel - 2; y += 7)
    for (let x = (y % 14 === 2 ? 4 : 9); x < w - 4; x += 17) paint(ox + x, oy + y, 6, 1, NW1, 1);
  const slit = (sx) => {
    paint(ox + sx, oy + 6, 5, 26, '#141826', 1);
    paint(ox + sx + 1, oy + 8, 3, 22, '#1b2438', 1);
    paint(ox + sx + 2, oy + 10, 1, 5, WINL, 0.55); paint(ox + sx + 2, oy + 18, 1, 3, WINL, 0.35);
  };
  slits.forEach(f => slit(Math.floor(w * f)));
  paint(ox, oy + floorRel, w, 1, NF1, 1);
  paint(ox, oy + floorRel + 1, w, h - floorRel - 1, NF0, 1);
  return oy + floorRel;
}
const dotLine = (x0, y0, x1, y1, col = E1) =>
  bres(x0, y0, x1, y1).forEach(([x, y], i) => { if (i % 3 !== 2) paint(x, y, 1, 1, col, 1); });

// standard air effect cell (no floor line — airborne)
function cCell(fr, ox, oy, tag, phase) {
  cellFrame(ox, oy, GC.W, GC.H, '#0d0a18');
  stampEffect(fr, ox, oy);
  if (tag) text(tag, ox, oy + GC.H + 3, SUBC);
  if (phase) text(phase, ox, oy + GC.H + 9, PHC);
}
// ground comparison cell (RE-2 dims, floor line at row 60) — opposites band only
const GBD = { W: 84, H: 62, BX: 19, BY: 14, CX: 39, CY: 29, FLOOR: 60 };
function gCell(fr, body, ox, oy, tag) {
  cellFrame(ox, oy, GBD.W, GBD.H, '#100d1c');
  paint(ox, oy + GBD.FLOOR + 1, GBD.W, 1, NF1, 1);
  stampM(fr.back, BOSS_PAL, ox, oy);
  stampM(body, BOSS_PAL, ox + GBD.BX, oy + GBD.BY);
  if (fr.front.length) stampM(fr.front, BOSS_PAL, ox, oy);
  if (tag) text(tag, ox, oy + GBD.H + 3, SUBC);
}

// ---------- header + concept + palette ----------
let Y = 2;
text('RED ECLIPSE - AIR CHARGED IGNITION - STAGE RE-4 EXTRACTION - STRICT PIXEL ART', 3, Y, HEADC);
text('A DETONATION - POWER IS BORN AT THE RED CHEST CORE WHILE THE BOSS HOVERS - IGNITES - AND BURSTS OUTWARD', 3, Y + 7);
text('INTO A STARBURST OF STRAIGHT CRYSTAL RAYS - THE EXACT INVERSE OF THE GROUND INHALE - NEVER GENERIC MAGIC', 3, Y + 13);
Y += 21;
text('PALETTE LAW - BOSS KEYS ONLY - NO BLUR - NO GRADIENTS - NO GLOW CLOUDS - NO NEW COLORS', 3, Y, HEADC);
(() => {
  const keys = ['0', '1', '2', '4', 'g', 'h', 'a', 'b', 'c', 'd'];
  keys.forEach((k, i) => {
    const x = 3 + i * 22;
    cellFrame(x, Y + 7, 18, 10, BOSS_PAL[k]);
    text(k, x + 7, Y + 20, '#6d6488');
  });
  text('VOID', 5, Y + 27); text('BODY GRAYS', 47, Y + 27); text('DEEP CRIMSON', 91, Y + 27); text('EMBER RAMP A-D', 143, Y + 27);
  text('SHEET RENDERS AT ACTUAL GAME SCALE', 232, Y + 9, HEADC);
  text('1 CELL - 3 GAME PX - ZOOM BANDS MARKED 2X', 232, Y + 16);
})();
text('ARC RAMP ROLE - VOID SHEATH 0 - FILAMENT C - HOT KINKS D - BRANCH B - TIP A - ASH G+1', 3, Y + 34);
Y += 43;

// ---------- phase band ----------
text('ANIMATION PHASES - 8 FRAMES - 100X88 EFFECT GRIDS - BOSS ORIGIN 27.14 - CHEST CORE 47.29 - NO FLOOR', 3, Y, HEADC);
text('BACK GRID BEHIND THE SPRITE - TREATED BODY RE-SKIN - FRONT GRID OVER IT - AUTHORED FACING RIGHT - AIRBORNE', 3, Y + 6);
Y += 13;
const CCW = 108;
const PH_ROW1 = [['C0 KERNEL', 'PH1 GATHER'], ['C1 CONDENSE', 'PH1 GATHER'], ['C2 IGNITE', 'PH2 EXPAND'], ['C3 CORONA', 'PH3 PEAK']];
C_NORMAL.slice(0, 4).forEach((fr, i) => cCell(fr, 3 + i * CCW, Y, PH_ROW1[i][0], PH_ROW1[i][1]));
Y += GC.H + 16;
const PH_ROW2 = [['C4 SHIMMER', 'PH3 PEAK'], ['C5 SHATTER', 'PH4 DISCHARGE'], ['C6 BOLTFALL', 'PH4 DISCHARGE'], ['C7 FADE', 'PH5 FADE']];
C_NORMAL.slice(4).forEach((fr, i) => cCell(fr, 3 + i * CCW, Y, PH_ROW2[i][0], PH_ROW2[i][1]));
Y += GC.H + 16;
text('PHASES - GATHER C0-C1 HOLD 6+6 - EXPAND C2 4 - PEAK LOOP C3-C4 5 EACH - DISCHARGE C5 5 + C6 6 - FADE C7 8', 3, Y);
text('HOLDS ARE VISUAL SUGGESTIONS AT 60FPS - THE GAMEPLAY CHARGE CLOCK OWNS ALL TIMING - THE REAL 60 TICK', 3, Y + 6);
text('CHARGE STRETCHES THE GATHER - A LONGER HOLD LOOPS THE PEAK - CANCEL CUTS TO NOTHING THE SAME FRAME', 3, Y + 12);
Y += 22;

// ---------- outward proof band ----------
text('OUTWARD PROOF - FOUR CUES - THE READ CAN NEVER FLIP TO AN INWARD CONVERGENCE', 3, Y, HEADC);
[
  '1 - GATHER PULLS TIGHT FIRST - C0 SHARDS DRIFT IN - THEN RADIUS ONLY GROWS - HOT RADIUS RISES C1-C2-C3',
  '    AND HOLDS STABLE AT C4 - BAKED ASSERT EVERY RUN - ' +
    'NORMAL ' + RS.normal.map(r => r.toFixed(1)).join(' - '),
  '2 - RAYS RAMP HOT AT THE CORE TO DARK AT THE TIP - D-C-B-A OUTWARD - DETACHED D TIP GLINTS FLY AHEAD',
  '3 - SHARD TAILS POINT AT THE CORE - TAIL BEHIND MOTION - EVERY FRAGMENT READS AS OUTWARD FLIGHT FROZEN',
  '4 - THE 8 RAY ANGLES NEVER CHANGE - S RAY IS THE LONGEST AND AIMS AT THE GROUND - THE DIVE AXIS - DECAY',
  '    ONLY EVER BREAKS OUTWARD - BOLTS FLY OFF THE RAY LINE - ASH SINKS - NOTHING RETURNS TO THE CORE',
].forEach((ln, i) => text(ln, 3, Y + 7 + i * 6));
Y += 46;

// ---------- ignition anchor band (target map + 2X zooms) ----------
text('IGNITION ANCHOR - EVERYTHING IS BORN AT THE RED CHEST CORE - GRID 47.29', 3, Y, HEADC);
Y += 8;
(() => {
  // target map: dim body + all 8 lanes running OUT + core crosshair
  const ox = 3, oy = Y;
  cellFrame(ox, oy, GC.W, GC.H, '#0d0a18');
  stampM(C_NORMAL[3].body, BOSS_PAL, ox + GC.BX, oy + GC.BY, { tintFn: () => '#262a38' });
  RAYS.forEach(([d, L]) => {
    const a = d * Math.PI / 180, cx = ox + GC.CX, cy = oy + GC.CY;
    dotLine(Math.round(cx + Math.cos(a) * 10), Math.round(cy + Math.sin(a) * 10),
            Math.round(cx + Math.cos(a) * (L - 2)), Math.round(cy + Math.sin(a) * (L - 2)), E0);
    paint(Math.round(cx + Math.cos(a) * L) - 1, Math.round(cy + Math.sin(a) * L) - 1, 2, 2, E3, 1);
  });
  const kx = ox + GC.CX, ky = oy + GC.CY;
  paint(kx, ky, 2, 2, E3, 1);
  paint(kx - 5, ky, 3, 1, E2, 1); paint(kx + 4, ky, 3, 1, E2, 1);
  paint(kx, ky - 5, 1, 3, E2, 1); paint(kx, ky + 4, 1, 3, E2, 1);
  text('MOTION MAP - 8 LANES OUT', ox, oy + GC.H + 3, HEADC);
  // 2X zoom crops: C3 ray anatomy + C5 bolt decay anatomy
  const c3 = crop(compose(C_NORMAL[3]), GC.CX - 24, GC.CY - 18, 48, 40);
  const c5 = crop(compose(C_NORMAL[5]), GC.CX - 24, GC.CY - 18, 48, 40);
  [[c3, 111, 'C3 RAY ANATOMY 2X'], [c5, 215, 'C5 BOLT DECAY 2X']].forEach(([cg, x, lbl]) => {
    cellFrame(x, oy, 96, 80, '#0d0a18');
    stampM(cg, BOSS_PAL, x, oy, { s: 2 });
    text(lbl, x, oy + 83, SUBC);
  });
  // crosshair on the ray-anatomy crop core (crop coords 24,18 -> s2)
  const zx = 111 + 24 * 2, zy = oy + 18 * 2;
  paint(zx - 7, zy + 1, 4, 1, E3, 1); paint(zx + 5, zy + 1, 4, 1, E3, 1);
  paint(zx + 1, zy - 7, 1, 4, E3, 1); paint(zx + 1, zy + 5, 1, 4, E3, 1);
  const nx = 318;
  ['ALL 8 RAYS ARE BORN AT GRID',
   '47.29 - THAT IS POSE CHEST',
   '20.15 - THE RED CHEST CORE',
   'THE CORONA DISC RIDES THE',
   'FRONT GRID AT THE SAME CELL',
   'SO THE VOID EYE SITS ON THE',
   'CHEST IN EVERY FACING',
   'NEVER THE FEET - THE FLOOR',
   'THE SWORD TIP - OR A POINT',
   'BEHIND THE BOSS',
  ].forEach((ln, i) => text(ln, nx, oy + 2 + i * 7));
})();
Y += GC.H + 14;

// ---------- charge-ready hold band ----------
text('CHARGE READY HOLD - C3-C4 PINGPONG LOOP - THE IGNITION FIRES ONCE - THE HELD PEAK NEVER RE-BURSTS', 3, Y, HEADC);
Y += 8;
(() => {
  cCell(C_NORMAL[3], 3, Y, 'C3 5 TICKS');
  cCell(C_NORMAL[4], 111, Y, 'C4 5 TICKS');
  dotLine(104, Y + 30, 108, Y + 30); paint(108, Y + 29, 2, 2, E3, 1);
  dotLine(108, Y + 56, 104, Y + 56); paint(102, Y + 55, 2, 2, E3, 1);
  // lifecycle timeline strip
  const tx = 222, ty = Y + 4;
  text('LIFECYCLE TIMELINE - TICKS AT 60FPS', tx, ty - 4, PHC);
  cellFrame(tx, ty + 4, 200, 10, '#100d1c');
  let sx = tx + 2;
  const seg = (w, col) => { paint(sx, ty + 7, w, 4, col, 1); sx += w + 1; };
  seg(12, E0); seg(12, E0); seg(8, E1);                      // gather C0 6 C1 6, expand C2 4
  seg(10, E3); seg(10, E2); seg(10, E3); seg(10, E2);        // peak loop reps C3/C4
  paint(sx, ty + 8, 8, 2, '#3a3346', 1); sx += 9;            // held...
  seg(10, E1); seg(12, E1); seg(16, E0);                     // tail C5 5 C6 6 C7 8
  text('GATHER 16', tx, ty + 17); text('PEAK 5+5 LOOPS', tx + 46, ty + 17); text('TAIL 19', tx + 126, ty + 17);
  text('DIVE', tx + 168, ty + 17);
  ['THE C2 TO C3 IGNITION FIRES ONCE - THE MOMENT THE',
   'METER FILLS - C3 TO C4 MINORS ROTATE A SLOT -',
   'SHARDS DRIFT OUT - CORONA PULSES - RADIUS HOLDS -',
   'ASSERTED STABLE - SEAMLESS BOTH WAYS - NO BRIDGE',
   'FRAME - A HELD ECLIPSE - NEVER A REPEATING BURST',
  ].forEach((ln, i) => text(ln, tx, ty + 26 + i * 6));
})();
Y += GC.H + 14;

// ---------- release handoff band ----------
text('RELEASE HANDOFF - C5-C7 PLAY ONCE INTO THE DIVE - THE EXISTING DIVE - TRAIL - SLAM ARE ALL UNTOUCHED', 3, Y, HEADC);
Y += 8;
(() => {
  cCell(C_NORMAL[5], 3, Y, 'C5 SHATTER - 5');
  cCell(C_NORMAL[6], 111, Y, 'C6 BOLTFALL - 6');
  cCell(C_NORMAL[7], 219, Y, 'C7 FADE - 8');
  cCell(DIVE_MOCK, 327, Y, 'EXISTING DIVE - MOCK');
  [104, 212, 320].forEach(x => { dotLine(x, Y + 40, x + 4, Y + 40); paint(x + 4, Y + 39, 2, 2, E3, 1); });
})();
Y += GC.H + 12;
[
  'RELEASE INTO THE DIVE - C5 RAYS BREAK INTO BLACK-RED BOLTS - N + S STILL FLASH HOT - E + W FRACTURED - TWO',
  'DIAGONALS TEAR OFF WHOLE - ONE BOLT CRAWLS OFF THE BODY - C6 BOLTS + SINKING ASH - C7 LAST ASH + A WINK',
  'THE TAIL RIDES THE EXISTING FREEZE 12 TICKS THEN THE DIVE - C5-C7 DRAW BACK + FRONT ONLY - NEVER THE BODY',
  'RE-SKIN - SO THE TAIL NEVER FIGHTS THE LIVE DIVE POSE - THE DIVE CELL ABOVE IS AN ILLUSTRATION ONLY',
  'PARTIAL RELEASE BEFORE FULL CHARGE - NO TAIL - THE GATHER CUTS HARD TO NOTHING THE SAME FRAME',
].forEach((ln, i) => text(ln, 3, Y + i * 6));
Y += 36;

// ---------- tier ladder band ----------
text('TIER LADDER - SAME DESIGN REDUCED - NEVER A DIFFERENT EFFECT - OUTWARD PROOF ASSERTED PER TIER', 3, Y, HEADC);
Y += 8;
const TIER_NOTES = {
  normal: ['NORMAL - THE FULL DESIGN', '8 RAYS + MINOR INTER-RAYS',
    '+ OCTAGON + OUTER DASHES', '+ ALL SHARDS + BOLT DECAY',
    'BYTE-EXACT RE-0 FAMILY C'],
  lite: ['LITE - ALL 8 MAIN RAYS', 'MINORS + DASHES DROPPED',
    'SHARDS HALVED - OCTAGON -', 'CORE + TIP GLINTS KEPT',
    'OUTWARD READ FULLY INTACT'],
  performance: ['PERFORMANCE - 4 CARDINALS', '+ 4 DIAGONALS + CORONA',
    'CORE + TIP GLINTS - NO', 'OCTAGON - DASHES - SHARDS',
    'STILL AN ECLIPSE - NEVER', 'A GENERIC AURA'],
};
[['NORMAL', C_NORMAL, 'normal'], ['LITE', C_LITE, 'lite'], ['PERFORMANCE', C_PERF, 'performance']].forEach(([tn, fam, key]) => {
  text(tn, 3, Y, PHC);
  [[2, 'C2'], [3, 'C3'], [5, 'C5']].forEach(([fi, lbl], i) => cCell(fam[fi], 3 + i * CCW, Y + 8, lbl));
  TIER_NOTES[key].forEach((ln, i) => text(ln, 327, Y + 10 + i * 7));
  Y += GC.H + 20;
});

// ---------- family contract + opposites band ----------
text('FAMILY CONTRACT - AIR VS GROUND - THE SAME LANGUAGE RUN IN OPPOSITE DIRECTIONS - NEVER MIX THE FAMILIES', 3, Y, HEADC);
Y += 8;
(() => {
  // side-by-side: approved RE-2 ground crush (byte data from its literal) vs this C3 corona
  gCell(GROUND[4], GROUND_BODY[4], 3, Y + 12, 'GROUND B4 - ALL IN');
  cCell(C_NORMAL[3], 95, Y, 'AIR C3 CORONA - ALL OUT');
  const glyph = (ox, oy, out, lbl) => {
    cellFrame(ox, oy, 44, 44, '#100d1c');
    const c = [ox + 22, oy + 22];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + 0.12;
      const [r0, r1] = out ? [6, 16] : [16, 6];
      dotLine(Math.round(c[0] + Math.cos(a) * r0), Math.round(c[1] + Math.sin(a) * r0),
              Math.round(c[0] + Math.cos(a) * r1), Math.round(c[1] + Math.sin(a) * r1));
      const rh = out ? 18 : 4;
      paint(Math.round(c[0] + Math.cos(a) * rh), Math.round(c[1] + Math.sin(a) * rh), 2, 2, E3, 1);
    }
    if (!out) paint(c[0] - 1, c[1] - 1, 2, 2, E3, 1);
    text(lbl, ox, oy + 47, SUBC);
  };
  glyph(203, Y + 12, false, 'IN');
  glyph(203, Y + 12 + 56, true, 'OUT');
  const nx = 256;
  ['GROUND INHALE - POWER FORMS',
   'OUTSIDE - TRAVELS INWARD ON',
   'FIXED LANES - CRUSHES INTO',
   'THE CHEST CORE - BRIMS',
   '',
   'AIR IGNITION - THIS FAMILY -',
   'BORN AT THE CHEST CORE -',
   'IGNITES - BURSTS OUT INTO',
   'THE STARBURST - SHATTERS',
   '',
   'WALK STRIDE ECLIPSE - RIDES',
   'THE BODY - NEVER LEAVES THE',
   'SILHOUETTE - AFK FRACTURE',
   'ARCS STAY AFK ONLY - THE OLD',
   'CHARGE AURA IS RETIRED HERE',
  ].forEach((ln, i) => text(ln, nx, Y + 12 + i * 7));
})();
Y += 132;   // stacked in/out glyphs + 15 note lines run taller than the air cell

// ---------- tableau band ----------
text('TABLEAU - AIRBORNE CORONA OVER THE HALL - BOSS CENTERED - TRUE-SCALE FIGHTERS - S RAY AIMS AT THE GROUND', 3, Y, HEADC);
Y += 7;
(() => {
  const floorY = nightRoom(3, Y, 260, 124, 110, [0.14, 0.5, 0.86]);
  stampEffect(C_NORMAL[3], 3 + 60, floorY - 104);            // feet 42 cells up - S tip 17 over the floor
  stampM(heroSmall, HERO_PAL, 3 + 205, floorY - 15, { mir: true });
  const nx = 270;
  ['CORONA AT TRUE SCALE - THE',
   'BOSS HANGS INSIDE THE STAR',
   'SILHOUETTE - SWORD - CHEST',
   'CORE ALL STAY READABLE -',
   'THE LONG S RAY POINTS AT',
   'THE GROUND THE DIVE WILL',
   'STRIKE - THE HERO READS THE',
   'THREAT FROM BELOW - ROOM',
   'STILL LEGIBLE BEHIND IT',
  ].forEach((ln, i) => text(ln, nx, Y + 4 + i * 7));
})();
Y += 132;

// ---------- actual game scale band ----------
text('ACTUAL GAME SCALE - FULL 1280X720 VIEWPORT AT 100 PCT - CHARGE READY HOLD - SIMPLIFIED ROOM MOCK', 3, Y, HEADC);
Y += 7;
(() => {
  const floorY = nightRoom(1, Y, 426, 240, 200, [0.1, 0.32, 0.62, 0.9]);
  const bossX = 150;                                          // boss ~450 game px from the left
  stampEffect(C_NORMAL[4], bossX - GC.BX, floorY - 150);      // hover: feet ~88 cells over the floor
  paint(bossX + 7, floorY - 150 + GC.BY - 6, 32, 2, '#2b2740', 1);   // mock floating HP bars
  paint(bossX + 7, floorY - 150 + GC.BY - 6, 26, 2, E2, 1);
  stampM(heroSmall, HERO_PAL, 300, floorY - 15, { mir: true });
  paint(300 + 2, floorY - 21, 16, 1, '#2b2740', 1);
  paint(300 + 2, floorY - 21, 11, 1, '#7fd4ff', 1);
})();
Y += 245;
text('BOSS 144 PX - HERO 48 PX - EFFECT 300X264 PX ON A 1280X720 VIEW - UNDER A FOURTH OF THE SCREEN WIDE', 3, Y);
text('HERO RESAMPLED TO ITS TRUE 2 PX GRID - CORONA - RAYS - S AXIS ALL READ CLEAN AT GAMEPLAY SIZE', 3, Y + 6);
Y += 16;

// ---------- handoff notes ----------
text('HANDOFF NOTES - STAGE RE-4', 3, Y, HEADC); Y += 8;
[
  'SEAM - A SPRITEMANAGER STATIC AT THE DRAWCHARGEDAIRAURA + DRAWCHARGEREADYAURA SEAMS IN PLAYER.DRAW',
  '   WHILE CHARGETYPE IS AIR-DIVE - DRAW ORDER - BACK GRID - BODY RE-SKIN INSTEAD OF THE SPRITE FRAME -',
  '   FRONT GRID - THE RELEASE TAIL C5-C7 DRAWS BACK + FRONT ONLY SO IT NEVER FIGHTS THE LIVE DIVE POSE',
  'ANCHORS - GRID 100X88 - BOSS ORIGIN 27.14 - CHEST CORE 47.29 - FACING RIGHT - RUNTIME MIRRORS WITH',
  '   THE EXISTING AIMDIR FLIP - GRID CENTER COLUMN 50 IS THE BODY CENTER - CELLS RENDER AT BOSS PIXEL 3',
  'LIFECYCLE - C0-C2 RIDE THE CHARGE METER - THE IGNITION FIRES ONCE WHEN IT FILLS - C3-C4 PINGPONG WHILE',
  '   CHARGE READY - C5-C7 ONCE ON RELEASE INTO THE DIVE - FREEZE 12 - DIVE - TRAIL - SLAM ALL UNTOUCHED',
  'CLEANUP - CANCEL OR PARTIAL RELEASE CLEARS ALL EFFECT CELLS THE SAME FRAME - BODY RESOLVES NEXT FRAME - NO',
  '   ORPHAN CELLS - NO STALE VFX - A CUT TO NOTHING IS LEGAL AT ANY FRAME - NEVER DRAWS DURING AFK',
  'RENDER-ONLY LAW - NEVER A HITBOX - NEVER IN GETACTIVEHITBOXES - NO GAMEPLAY - TIMING - DAMAGE - CHARGE',
  '   DURATION - HOVER - DIVE - MOVEMENT - AI - COLLISION OR SCALE CHANGES - WALK + GROUND + AFK UNTOUCHED',
  'DATA - THE LITERAL HOLDS ALL THREE TIERS + 8 PRE-TREATED BODY FRAMES - NORMAL BACK-FRONT GRIDS ARE',
  '   BYTE-EXACT TO THE APPROVED RE-0 ECLIPSEIGNITION DATA - ASSERTED BY THIS GENERATOR ON EVERY RUN',
].forEach(ln => { text(ln, 3, Y); Y += 6; });
Y += 2;

if (Y > SHMAX - 4) throw new Error('layout overflow: ' + Y);
if (fontMissing.size) throw new Error('font missing glyphs: ' + [...fontMissing].join(' '));
const SH = Y + 3;

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
fs.writeFileSync(__dirname+'/red_eclipse_air_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === RED ECLIPSE AIR (IGNITION) literals — Stage RE-4 (see red_eclipse_air_spec.md) ===\n';
js += '// 100x88 effect key-grids (back/front) — boss origin (27,14), chest core (47,29), no floor\n';
js += '// in-frame (airborne). back draws BEHIND the boss sprite, front OVER it; body = pre-treated\n';
js += '// 46x48 re-skin frames (replace the sprite frame while the effect is live — no eclipseSkin\n';
js += '// port needed). RENDER-ONLY overlays: never Hitboxes, never in getActiveHitboxes(). Author\n';
js += '// space faces right; runtime mirrors with the existing aimDir flip (grid center column 50 ==\n';
js += '// body center, so the flip is anchor-safe). Cells render at BOSS_IDLE_PIXEL (3).\n';
js += '// eclipseAir (normal) back/front are BYTE-EXACT to eclipseIgnition in eclipse_literal.txt.\n';
js += '// Suggested holds @60fps: C0 6, C1 6, C2 4 (gather rides the real 60-tick charge meter);\n';
js += '// C3/C4 pingpong 5 each while charge-ready; C5 5, C6 6, C7 8 once on release into the dive\n';
js += '// (freeze 12 ticks + dive start). The release tail draws back+front only (no body re-skin).\n';
const dumpFx = (name, fam) => {
  js += `  ${name}: [\n`;
  fam.forEach(fr => {
    js += `    // ${fr.tag}\n`;
    js += '    { back: [' + stringify(fr.back).map(r => JSON.stringify(r)).join(', ') + '],\n';
    const fEmpty = fr.front.every(r => r.every(k => k === '.'));
    js += '      front: ' + (fEmpty ? '[]' : '[' + stringify(fr.front).map(r => JSON.stringify(r)).join(', ') + ']') + ' },\n';
  });
  js += '  ],\n';
};
dumpFx('eclipseAir', C_NORMAL);
dumpFx('eclipseAirLite', C_LITE);
dumpFx('eclipseAirPerf', C_PERF);
js += '  // pre-treated 46x48 body re-skins, shared by all tiers: C0-C7 (airCharge pose).\n';
js += '  // C0 = darkenStep, C1-C5 = eclipseSkin (rim envelope .6/.8/1/1/.7, hot at peak),\n';
js += '  // C6 = darkenStep, C7 = raw pose. Used for C0-C4 only at runtime (the release tail\n';
js += '  // C5-C7 rides the live dive pose and draws back/front only).\n';
js += '  eclipseAirBody: [\n';
C_NORMAL.forEach(fr => {
  js += `    // ${fr.tag} body\n`;
  js += '    [' + stringify(fr.body).map(r => JSON.stringify(r)).join(', ') + '],\n';
});
js += '  ],\n';
fs.writeFileSync(__dirname + '/red_eclipse_air_literal.txt', js);

// round-trip proof: the emitted literal must parse back byte-identical
['eclipseAir', 'eclipseAirLite', 'eclipseAirPerf'].forEach((name, ni) => {
  const fam = [C_NORMAL, C_LITE, C_PERF][ni];
  const rt = loadFx('red_eclipse_air_literal.txt', name);
  if (rt.length !== fam.length) throw new Error('round-trip count fail: ' + name);
  rt.forEach((fr, i) => {
    const src = fam[i];
    const fEmpty = src.front.every(r => r.every(k => k === '.'));
    if (stringify(src.back).join('\n') !== fr.back.join('\n') ||
        (fEmpty ? fr.front.length !== 0 : stringify(src.front).join('\n') !== fr.front.join('\n')))
      throw new Error('round-trip data fail: ' + name + ' frame ' + i);
  });
});
const bodies = loadClips('red_eclipse_air_literal.txt', ['eclipseAirBody']).eclipseAirBody;
if (bodies.length !== 8 || bodies.some(f => f.length !== 48 || f.some(r => r.length !== 46)))
  throw new Error('round-trip body fail');

console.log('wrote red_eclipse_air_v1.png', IW + 'x' + IH,
  '| byte-exact vs RE-0:', exact + '/8',
  '| meanR C0-C4 normal', RS.normal.map(r => r.toFixed(1)).join(' '),
  '| lite', RS.lite.map(r => r.toFixed(1)).join(' '),
  '| perf', RS.performance ? RS.performance.map(r => r.toFixed(1)).join(' ') : RS.perf.map(r => r.toFixed(1)).join(' '),
  '| layout end Y', Y);
