// RED ECLIPSE — GROUND CHARGED INHALE — Stage RE-2 extraction (concept/handoff, nothing wired).
//
// Extracts the APPROVED RE-0 Family B "INHALE ECLIPSE" (eclipse_gen.js) into a dedicated
// production package for the Boss's ground charged attack. The design is an IMPLOSION:
// a broken shard ring materializes far outside the Boss, everything travels INWARD along
// 9 FIXED spokes (heads hot, tails trailing outward), floor arcs skitter inward to his
// feet, and the whole formation crushes into a brimming pressure ring on the red chest
// core (grid 39,29 = pose chest 20,15 = the height the live ground laser gathers at).
//
// NEW in RE-2 (all reductions/extensions of the same approved design, never a redesign):
//   - quality tiers baked as data: normal (byte-exact RE-0), lite, performance
//   - optional release frame R0 SNAP (ring collapses into the muzzle before the laser)
//   - 8 pre-treated 46x48 body re-skin frames (no eclipseSkin port needed at integration)
//   - production sheet at ACTUAL GAME SCALE (SCALE=3: 1 cell = 3 image px = 3 game px)
//
// The normal-tier back/front grids are asserted BYTE-EXACT against eclipseInhale in
// eclipse_literal.txt on every run — this file is an extraction, not a reinterpretation.
//
// Emits: red_eclipse_ground_v1.png (sheet) + red_eclipse_ground_literal.txt (drop-ins).
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
const ANIM = loadClips('boss_anim_literal.txt', ['groundCharge', 'fireLaser']);
const RE0_INHALE = loadFx('eclipse_literal.txt', 'eclipseInhale');
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
// GROUND INHALE build (RE-0 Family B geometry, verbatim; tier-parameterized)
// =====================================================================
// Anchors: boss groundCharge pose (46x48) at grid (19,14); feet rows 60-61;
// chest core at grid (39,29); floor row 60. Spoke angles are FIXED across the
// whole clip so the shrinking radius + outward tails read as pure inward motion.
const GB = { W: 84, H: 62, BX: 19, BY: 14, CX: 39, CY: 29, FLOOR: 60 };
const SPOKES = [-90, -122, -152, 180, -58, -28, 0, 24, 156].map(d => d * Math.PI / 180);
const spokeR = (i, r) => r + (rnd(i, 5) - 0.5) * 5;          // per-spoke radius jitter
function shardAt(g, ang, r, hotKey) {
  const x = Math.round(GB.CX + Math.cos(ang) * r), y = Math.round(GB.CY + Math.sin(ang) * r);
  const px = Math.round(-Math.sin(ang)), py = Math.round(Math.cos(ang));
  put(g, x, y, hotKey); put(g, x + px, y + py, 'a'); put(g, x - px, y - py, '0');
  return [x, y];
}
function inTail(g, ang, r, len) {                            // tail trails OUTWARD
  for (let i = 1; i <= len; i++) {
    const rr = r + 1 + i * 2;
    put(g, Math.round(GB.CX + Math.cos(ang) * rr), Math.round(GB.CY + Math.sin(ang) * rr),
      i === 1 ? 'a' : i === 2 ? 'g' : '0');
  }
}
function filament(g, ang, rIn, rOut, noVoid = false) {       // radial feed line, hot head inside
  const cells = bres(Math.round(GB.CX + Math.cos(ang) * rOut), Math.round(GB.CY + Math.sin(ang) * rOut),
                     Math.round(GB.CX + Math.cos(ang) * rIn),  Math.round(GB.CY + Math.sin(ang) * rIn));
  cells.forEach(([x, y], i) => {
    const t = i / Math.max(1, cells.length - 1);
    if (noVoid) { if (t > 0.7) put(g, x, y, 'c'); else if (t > 0.35) put(g, x, y, 'b'); else if (i % 2 === 0) put(g, x, y, 'a'); return; }
    put(g, x, y, t > 0.75 ? 'c' : t > 0.4 ? 'b' : '0');
    if (i % 3 === 0) put(g, x, y - 1, '0');
  });
  const l = cells[cells.length - 1];
  put(g, l[0], l[1], 'd');
}
function ringOct(g, r, offDeg, keys = ['a', 'b']) {          // broken octagon wrap
  for (let k = 0; k < 8; k++) {
    const a0 = (offDeg + k * 45) * Math.PI / 180, a1 = (offDeg + (k + 1) * 45) * Math.PI / 180;
    const v0 = [Math.round(GB.CX + Math.cos(a0) * r), Math.round(GB.CY + Math.sin(a0) * r)];
    const v1 = [Math.round(GB.CX + Math.cos(a1) * r), Math.round(GB.CY + Math.sin(a1) * r)];
    const seg = bres(v0[0], v0[1], v1[0], v1[1]);
    for (let i = Math.floor(seg.length * 0.22); i < Math.ceil(seg.length * 0.78); i++)
      put(g, seg[i][0], seg[i][1], i % 4 === 0 ? 'g' : keys[0]);
    if (k % 2 === 0) put(g, v0[0], v0[1], keys[1]);
    if (k === 1 || k === 5) put(g, v0[0], v0[1], 'd');       // 2 vertex glints
  }
}
// chest core pulse baked onto the treated BODY pose (pose coords, chest 20,15)
function chestCore(body, level) {
  const [px, py] = [20, 15];
  if (level >= 1) { put(body, px, py, 'd'); put(body, px + 1, py, 'd'); put(body, px, py + 1, 'd'); put(body, px + 1, py + 1, 'd'); }
  if (level >= 2) [[-1, 0], [2, 0], [0, -1], [1, -1], [0, 2], [1, 2]].forEach(([dx, dy]) => put(body, px + dx, py + dy, 'c'));
  if (level === 0) { put(body, px, py, 'c'); put(body, px + 1, py, 'b'); }
  return body;
}

// tier configs — reductions of the SAME design. normal reproduces the RE-0
// familyB() call sequence exactly (asserted byte-exact below).
const TIERS = {
  normal: { b0: i => i % 2 === 0, b1s: () => true,        b1t: i => i % 2 === 0,
            b2: () => true,       b2Tail: 3, b3: () => true,       b3Tail: 3,
            b3Fil: [0, 2, 4, 6],  b4Fil: [0, 1, 3, 4, 5, 7], stragglers: true },
  lite:   { b0: i => i % 4 === 0, b1s: i => i % 2 === 0,  b1t: i => i % 4 === 0,
            b2: i => i % 2 === 0, b2Tail: 2, b3: i => i % 2 === 0, b3Tail: 2,
            b3Fil: [0, 2, 4, 6],  b4Fil: [0, 1, 3, 4, 5, 7], stragglers: false },
  performance: {
            b0: i => i % 4 === 0, b1s: i => i % 2 === 0,  b1t: () => false,
            b2: i => i % 2 === 0, b2Tail: 1, b3: i => i % 2 === 0, b3Tail: 1,
            b3Fil: [0, 6],        b4Fil: [0, 3, 5, 7],       stragglers: false },
};
function buildB(T) {
  const gp = ANIM.groundCharge.map(toGrid);
  const out = [];
  const mk = () => mkGrid(GB.W, GB.H);
  const F = GB.FLOOR, cx = GB.CX;
  // B0 VEIL-A — half the shard ring materializes far out; far floor embers wake
  let back = mk(), front = mk();
  SPOKES.forEach((a, i) => { if (T.b0(i)) shardAt(back, a, spokeR(i, 28), 'b'); });
  put(back, cx - 29, F, 'a'); put(back, cx + 29, F, 'a');
  out.push({ back, front, body: gp[0].map(r => r.slice()), tag: 'B0 VEIL-A' });
  // B1 VEIL-B — the broken ring completes + first inward pressure ticks; skitters ignite
  back = mk(); front = mk();
  SPOKES.forEach((a, i) => {
    if (T.b1s(i)) shardAt(back, a, spokeR(i, 27), 'b');
    if (T.b1t(i)) put(back, Math.round(cx + Math.cos(a) * (spokeR(i, 27) - 4)),
                       Math.round(GB.CY + Math.sin(a) * (spokeR(i, 27) - 4)), 'a');
  });
  bakeBolt(back, boltPath(cx - 29, F, cx - 24, F, 101, 0, 1), 'ignite');
  bakeBolt(back, boltPath(cx + 29, F, cx + 24, F, 103, 0, 1), 'ignite');
  out.push({ back, front, body: darkenStep(gp[1]), tag: 'B1 VEIL-B' });
  // B2 INHALE-A — ring collapses to r19, tails trail outward; skitters crawl in
  back = mk(); front = mk();
  SPOKES.forEach((a, i) => { if (!T.b2(i)) return; const r = spokeR(i, 19); shardAt(back, a, r, 'c'); inTail(back, a, r, T.b2Tail); });
  bakeBolt(back, boltPath(cx - 27, F, cx - 13, F - 1, 107, 0, 1), 'flash', { seed: 107 });
  bakeBolt(back, boltPath(cx + 27, F, cx + 13, F - 1, 109, 0, 1), 'flash', { seed: 109 });
  out.push({ back, front, body: darkenStep(gp[0]), tag: 'B2 INHALE-A' });
  // B3 INHALE-B — r12 heads + long tails + feed filaments; the chest kernel lights.
  // From here the convergence rides the FRONT grid: the pull visibly crosses the
  // silhouette instead of hiding behind it.
  back = mk(); front = mk();
  SPOKES.forEach((a, i) => { if (!T.b3(i)) return; const r = spokeR(i, 12); shardAt(front, a, r, 'c'); inTail(front, a, r, T.b3Tail); });
  T.b3Fil.forEach(i => filament(front, SPOKES[i], spokeR(i, 12) + 2, spokeR(i, 12) + 9, true));
  bakeBolt(back, boltPath(cx - 16, F, cx - 6, F, 113, 0, 1), 'flash', { seed: 113 });
  bakeBolt(back, boltPath(cx + 16, F, cx + 6, F, 115, 0, 1), 'flash', { seed: 115 });
  out.push({ back, front, body: chestCore(eclipseSkin(gp[1], 11, { rim: 0.7 }), 1), tag: 'B3 INHALE-B' });
  // B4 CRUSH — the pull lands: hot feed filaments + the pressure ring snap on;
  // shard heads/tails are DROPPED (they landed), feet arcs fracture at his feet
  back = mk(); front = mk();
  T.b4Fil.forEach(i => filament(front, SPOKES[i], spokeR(i, 8) + 2, spokeR(i, 8) + 7, true));
  bakeBolt(back, boltPath(cx - 9, F, cx - 3, F, 117, 0, 1), 'fracture');
  bakeBolt(back, boltPath(cx + 9, F, cx + 3, F, 119, 0, 1), 'fracture');
  ringOct(front, 9, 0);
  out.push({ back, front, body: chestCore(eclipseSkin(gp[0], 12, { rim: 1, hot: true }), 2), tag: 'B4 CRUSH' });
  // B5 BRIM-A — crushed ring holds; bright heartbeat; late stragglers still falling in
  back = mk(); front = mk();
  if (T.stragglers) [1, 4, 7].forEach(i => { const r = 16 + 2 * (i % 3); shardAt(back, SPOKES[i], r, 'b'); inTail(back, SPOKES[i], r, 2); });
  put(back, cx - 5, F, 'c'); put(back, cx + 6, F, 'a');
  ringOct(front, 8, 0);
  out.push({ back, front, body: chestCore(eclipseSkin(gp[1], 13, { rim: 0.9, hot: true }), 2), tag: 'B5 BRIM-A' });
  // B6 BRIM-B — ring rotates a half-slot; heartbeat dims; other stragglers
  back = mk(); front = mk();
  if (T.stragglers) [0, 3, 6].forEach(i => { const r = 17 + (i % 2) * 3; shardAt(back, SPOKES[i], r, 'b'); inTail(back, SPOKES[i], r, 2); });
  put(back, cx + 4, F, 'c'); put(back, cx - 7, F, 'a');
  ringOct(front, 8, 22);
  out.push({ back, front, body: chestCore(eclipseSkin(gp[0], 14, { rim: 0.75, hot: true }), 0), tag: 'B6 BRIM-B' });
  return out;
}

// R0 SNAP — optional release outro (one frame, ~4 ticks): the brim ring dies to
// ash ONE frame behind (family law) while the last energy snaps INTO the muzzle
// point on the beam axis. Then the existing drawLaserBeam fires — untouched.
function releaseFrame() {
  const gp = ANIM.groundCharge.map(toGrid);
  const back = mkGrid(GB.W, GB.H), front = mkGrid(GB.W, GB.H);
  const cx = GB.CX, cy = GB.CY, F = GB.FLOOR;
  for (let k = 0; k < 8; k++) {                              // octagon ash memory at r8
    const a = (22 + k * 45) * Math.PI / 180;
    const x = Math.round(cx + Math.cos(a) * 8), y = Math.round(cy + Math.sin(a) * 8);
    put(back, x, y, k % 2 ? 'g' : '1');
    if (k % 2 === 0) put(back, x, y + 1, '1');               // ash sinks
  }
  put(back, cx - 3, F, 'g');                                 // last floor ember dying
  [[0, 0], [1, 0], [0, 1], [1, 1]].forEach(([dx, dy]) => put(front, cx + dx, cy + dy, 'd'));
  [[-1, 0], [0, -1], [1, 2]].forEach(([dx, dy]) => put(front, cx + dx, cy + dy, 'c'));
  put(front, cx + 3, cy, 'd'); put(front, cx + 5, cy, 'c'); put(front, cx + 7, cy + 1, 'b'); // muzzle step, facing +x
  filament(front, SPOKES[1], 3, 7, true);                    // last arcs snap in from behind
  filament(front, SPOKES[8], 3, 7, true);
  return { back, front, body: chestCore(eclipseSkin(gp[1], 15, { rim: 0.6, hot: true }), 2), tag: 'R0 SNAP' };
}

// laser handoff cell — SHEET ILLUSTRATION ONLY (the existing drawLaserBeam +
// fireLaser pose; not part of the effect, not dumped to the literal)
function laserMockFrame() {
  const back = mkGrid(GB.W, GB.H), front = mkGrid(GB.W, GB.H);
  const cx = GB.CX, cy = GB.CY;
  for (let k = 0; k < 8; k += 2) {                           // fading ring ash, one frame later
    const a = (22 + k * 45) * Math.PI / 180;
    put(back, Math.round(cx + Math.cos(a) * 8), Math.round(cy + Math.sin(a) * 8) + 1, 'g');
  }
  for (let x = cx + 6; x < GB.W - 1; x++) {                  // beam: rim c / b / umbral 0 core
    put(back, x, cy, (x - cx) % 5 === 0 ? 'd' : '0');        // crawling hot filament dashes
    put(back, x, cy - 1, 'b'); put(back, x, cy + 1, 'b');
    if (x % 5 < 3) { put(back, x, cy - 2, 'c'); put(back, x, cy + 2, 'c'); }
  }
  [[2, 0], [3, 0], [2, 1], [3, 1]].forEach(([dx, dy]) => put(front, cx + dx, cy + dy, 'd')); // muzzle flare
  [[4, -1], [4, 2], [1, -1], [1, 2]].forEach(([dx, dy]) => put(front, cx + dx, cy + dy, 'c'));
  return { back, front, body: ANIM.fireLaser[0] ? toGrid(ANIM.fireLaser[0]) : null, tag: 'LASER MOCK' };
}

// ---------- build everything ----------
const B_NORMAL = buildB(TIERS.normal);
const B_LITE = buildB(TIERS.lite);
const B_PERF = buildB(TIERS.performance);
const R0 = releaseFrame();
const LASER = laserMockFrame();

// =====================================================================
// VALIDATION
// =====================================================================
const LEGAL = new Set([...'012345abcdgh.']);
let vErr = 0;
function checkGrid(name, f, w, h) {
  if (f.length !== h || f.some(r => r.length !== w)) { console.error('SIZE FAIL', name); vErr++; }
  for (const r of f) for (const k of r) if (!LEGAL.has(k)) { console.error('KEY FAIL', name, k); vErr++; }
}
[['normal', B_NORMAL], ['lite', B_LITE], ['perf', B_PERF]].forEach(([tn, fam]) =>
  fam.forEach((fr, i) => {
    checkGrid(tn + ' B' + i + ' back', stringify(fr.back), GB.W, GB.H);
    checkGrid(tn + ' B' + i + ' front', stringify(fr.front), GB.W, GB.H);
    checkGrid(tn + ' B' + i + ' body', stringify(fr.body), 46, 48);
  }));
checkGrid('R0 back', stringify(R0.back), GB.W, GB.H);
checkGrid('R0 front', stringify(R0.front), GB.W, GB.H);
checkGrid('R0 body', stringify(R0.body), 46, 48);

// 1) EXTRACTION PROOF — normal back/front byte-exact vs approved RE-0 eclipseInhale
if (RE0_INHALE.length !== 7) { console.error('RE0 PARSE FAIL', RE0_INHALE.length); vErr++; }
let exact = 0;
B_NORMAL.forEach((fr, i) => {
  const ref = RE0_INHALE[i];
  const backOk = stringify(fr.back).join('\n') === ref.back.join('\n');
  const fEmpty = fr.front.every(r => r.every(k => k === '.'));
  const frontOk = fEmpty ? ref.front.length === 0
    : stringify(fr.front).join('\n') === ref.front.join('\n');
  if (backOk && frontOk) exact++;
  else { console.error('BYTE-EXACT FAIL at frame', i, fr.tag, { backOk, frontOk }); vErr++; }
});

// 2) INWARD PROOF per tier — mean hot-cell radius shrinks monotonically B1 -> B4
const meanR = fr => {
  let s = 0, n = 0;
  [fr.back, fr.front].forEach(g => g.forEach((row, y) => row.forEach((k, x) => {
    if (k === 'c' || k === 'd' || k === 'b') {
      if (y >= GB.FLOOR) return;
      s += Math.hypot(x - GB.CX, y - GB.CY); n++;
    }
  })));
  return n ? s / n : 0;
};
const RS = {};
[['normal', B_NORMAL], ['lite', B_LITE], ['perf', B_PERF]].forEach(([tn, fam]) => {
  const rs = [1, 2, 3, 4].map(i => meanR(fam[i]));
  for (let i = 1; i < rs.length; i++)
    if (rs[i] >= rs[i - 1]) { console.error('INWARD FAIL', tn, rs); vErr++; }
  RS[tn] = rs;
});

// 3) CONVERGENCE PROOF — the crush lands on the chest core, nowhere else
[['normal', B_NORMAL], ['lite', B_LITE], ['perf', B_PERF]].forEach(([tn, fam]) => {
  if (RS[tn][3] >= 12) { console.error('CRUSH TOO WIDE', tn, RS[tn][3]); vErr++; }
  [3, 4, 5].forEach(i => {                                   // chest core lit from B3 on
    const k = fam[i].body[15][20];
    if (k !== 'd' && k !== 'c') { console.error('CORE UNLIT', tn, 'B' + i, k); vErr++; }
  });
});
if (meanR(R0) >= 9) { console.error('R0 NOT SNAPPED', meanR(R0)); vErr++; }
if (R0.body[15][20] !== 'd') { console.error('R0 CORE UNLIT'); vErr++; }

if (vErr) throw new Error('validation failed: ' + vErr);

// =====================================================================
// SHEET CANVAS — SCALE 3: 1 cell = 3 image px = 3 game px (BOSS_IDLE_PIXEL).
// The whole sheet is at actual gameplay scale; zoom bands are marked 2X.
// =====================================================================
const SW = 428, SHMAX = 1500, SCALE = 3;
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

// composite an effect frame (back + treated body + front) at sheet pos
function stampEffect(fr, ox, oy) {
  stampM(fr.back, BOSS_PAL, ox, oy);
  if (fr.body) stampM(fr.body, BOSS_PAL, ox + GB.BX, oy + GB.BY);
  stampM(fr.front, BOSS_PAL, ox, oy);
}
// flatten an effect frame into one 84x62 key grid (for zoom crops)
function compose(fr) {
  const g = mkGrid(GB.W, GB.H);
  const lay = (src, ox, oy) => src.forEach((row, y) => row.forEach((k, x) => {
    if (k !== '.') put(g, x + ox, y + oy, k);
  }));
  lay(fr.back, 0, 0); if (fr.body) lay(fr.body, GB.BX, GB.BY); lay(fr.front, 0, 0);
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

// standard effect cell
function bCell(fr, ox, oy, tag, phase) {
  cellFrame(ox, oy, GB.W, GB.H, '#100d1c');
  paint(ox, oy + GB.FLOOR + 1, GB.W, 1, NF1, 1);
  stampEffect(fr, ox, oy);
  if (tag) text(tag, ox, oy + GB.H + 3, SUBC);
  if (phase) text(phase, ox, oy + GB.H + 9, PHC);
}

// ---------- header + concept + palette ----------
let Y = 2;
text('RED ECLIPSE - GROUND CHARGED INHALE - STAGE RE-2 EXTRACTION - STRICT PIXEL ART', 3, Y, HEADC);
text('AN IMPLOSION - POWER FORMS OUTSIDE THE BOSS - TRAVELS INWARD ON FIXED LANES - CRUSHES INTO THE RED', 3, Y + 7);
text('CHEST CORE - HOLDS BRIMMING UNTIL RELEASE - THE EXACT INVERSE OF THE AIR STARBURST - NEVER GENERIC MAGIC', 3, Y + 13);
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
text('ANIMATION PHASES - 7 FRAMES + OPTIONAL RELEASE - 84X62 EFFECT GRIDS - BOSS ORIGIN 19.14 - CORE 39.29', 3, Y, HEADC);
text('BACK GRID BEHIND THE SPRITE - TREATED BODY RE-SKIN - FRONT GRID OVER IT - AUTHORED FACING RIGHT', 3, Y + 6);
Y += 13;
const BCW = 88;
const PH_ROW1 = [['B0 VEIL-A', 'PH1 SUMMON'], ['B1 VEIL-B', 'PH1 SUMMON'], ['B2 INHALE-A', 'PH2 CONVERGE'], ['B3 INHALE-B', 'PH2 CONVERGE']];
B_NORMAL.slice(0, 4).forEach((fr, i) => bCell(fr, 3 + i * BCW, Y, PH_ROW1[i][0], PH_ROW1[i][1]));
Y += GB.H + 16;
const PH_ROW2 = [['B4 CRUSH', 'PH3 COMPRESS'], ['B5 BRIM-A', 'PH4 HOLD'], ['B6 BRIM-B', 'PH4 HOLD']];
B_NORMAL.slice(4).forEach((fr, i) => bCell(fr, 3 + i * BCW, Y, PH_ROW2[i][0], PH_ROW2[i][1]));
// motion map — ALL IN
(() => {
  const ox = 3 + 3 * BCW, oy = Y;
  cellFrame(ox, oy, GB.W, GB.H, '#100d1c');
  stampM(B_NORMAL[4].body, BOSS_PAL, ox + GB.BX, oy + GB.BY, { tintFn: () => '#262a38' });
  const arrowIn = (a) => {
    const cx = ox + GB.CX, cy = oy + GB.CY;
    dotLine(Math.round(cx + Math.cos(a) * 27), Math.round(cy + Math.sin(a) * 27),
            Math.round(cx + Math.cos(a) * 12), Math.round(cy + Math.sin(a) * 12));
    paint(Math.round(cx + Math.cos(a) * 11), Math.round(cy + Math.sin(a) * 11), 2, 2, E3, 1);
  };
  [0, 1, 3, 4, 5, 7].forEach(i => arrowIn(SPOKES[i]));
  dotLine(ox + 10, oy + GB.FLOOR, ox + 26, oy + GB.FLOOR);
  paint(ox + 27, oy + GB.FLOOR - 1, 2, 2, E3, 1);
  dotLine(ox + GB.W - 10, oy + GB.FLOOR, ox + GB.W - 26, oy + GB.FLOOR);
  paint(ox + GB.W - 29, oy + GB.FLOOR - 1, 2, 2, E3, 1);
  text('MOTION MAP - ALL IN', ox, oy + GB.H + 3, HEADC);
})();
Y += GB.H + 16;
text('PHASES - SUMMON B0-B1 HOLD 8+8 - CONVERGE B2-B3 6+6 - COMPRESS B4 6 - HOLD LOOP B5-B6 8+8 - RELEASE R0 4', 3, Y);
text('HOLDS ARE VISUAL SUGGESTIONS AT 60FPS - THE GAMEPLAY CHARGE CLOCK OWNS ALL TIMING - A LONGER CHARGE', 3, Y + 6);
text('LOOPS THE BRIM - A SHORTER ONE CUTS STRAIGHT TO RELEASE - NOTHING HERE CHANGES THE CHARGE ITSELF', 3, Y + 12);
Y += 22;

// ---------- inward proof band ----------
text('INWARD PROOF - FOUR CUES - THE READ CAN NEVER FLIP TO AN EXPLOSION', 3, Y, HEADC);
[
  '1 - RADIUS ONLY SHRINKS - MEAN HOT RADIUS 31.0 - 28.9 - 16.2 - 10.4 ACROSS B1-B4 - BAKED ASSERT EVERY RUN',
  '2 - HEADS ARE HOT ON THE INSIDE - TAILS FADE A-G-0 ON THE OUTSIDE - EVERY SHARD POINTS AT THE CHEST',
  '3 - FLOOR ARCS ONLY EVER CRAWL INWARD ALONG ROW 60 TOWARD HIS FEET - EDGES EMPTY AS THE CENTER FILLS',
  '4 - THE 9 SPOKE ANGLES NEVER CHANGE - THE SAME FIXED LANES CARRY ONLY INWARD TRAFFIC ALL CLIP',
].forEach((ln, i) => text(ln, 3, Y + 7 + i * 6));
Y += 34;

// ---------- convergence target band ----------
text('CONVERGENCE TARGET - EVERYTHING AIMS AT THE RED CHEST CORE - GRID 39.29', 3, Y, HEADC);
Y += 8;
(() => {
  // target map: dim body + all 9 lanes + core crosshair
  const ox = 3, oy = Y;
  cellFrame(ox, oy, GB.W, GB.H, '#100d1c');
  stampM(B_NORMAL[4].body, BOSS_PAL, ox + GB.BX, oy + GB.BY, { tintFn: () => '#262a38' });
  SPOKES.forEach(a => dotLine(Math.round(ox + GB.CX + Math.cos(a) * 26), Math.round(oy + GB.CY + Math.sin(a) * 26),
                              Math.round(ox + GB.CX + Math.cos(a) * 8), Math.round(oy + GB.CY + Math.sin(a) * 8), E0));
  const cx = ox + GB.CX, cy = oy + GB.CY;
  paint(cx, cy, 2, 2, E3, 1);
  paint(cx - 5, cy, 3, 1, E2, 1); paint(cx + 4, cy, 3, 1, E2, 1);
  paint(cx, cy - 5, 1, 3, E2, 1); paint(cx, cy + 4, 1, 3, E2, 1);
  text('TARGET MAP - 9 LANES', ox, oy + GB.H + 3, SUBC);
  // 2X zoom crops: B3 pull anatomy + B4 crush anatomy
  const c3 = crop(compose(B_NORMAL[3]), GB.CX - 22, GB.CY - 17, 44, 34);
  const c4 = crop(compose(B_NORMAL[4]), GB.CX - 22, GB.CY - 17, 44, 34);
  [[c3, 95, 'B3 PULL ANATOMY 2X'], [c4, 191, 'B4 CRUSH ANATOMY 2X']].forEach(([cg, x, lbl]) => {
    cellFrame(x, oy, 88, 68, '#100d1c');
    stampM(cg, BOSS_PAL, x, oy, { s: 2 });
    text(lbl, x, oy + 71, SUBC);
  });
  // crosshair on the crush crop core (crop coords 22,17 -> s2)
  const kx = 191 + 22 * 2, ky = oy + 17 * 2;
  paint(kx - 6, ky + 1, 4, 1, E3, 1); paint(kx + 6, ky + 1, 4, 1, E3, 1);
  paint(kx + 1, ky - 6, 1, 4, E3, 1); paint(kx + 1, ky + 6, 1, 4, E3, 1);
  const nx = 287;
  ['ALL LANES AIM AT GRID 39.29',
   'THAT IS POSE CHEST 20.15 -',
   'THE RED CHEST CORE',
   'SAME HEIGHT THE LIVE GROUND',
   'LASER GATHERS AT - THE',
   'WANDGLOW MUZZLE - CHESTY',
   'NEVER THE SWORD TIP - THE',
   'FEET - THE FLOOR - THE HEAD',
  ].forEach((ln, i) => text(ln, nx, oy + 2 + i * 7));
})();
Y += 82;

// ---------- charged hold loop band ----------
text('CHARGED HOLD - B5-B6 PINGPONG LOOP - STABLE FOR AS LONG AS THE CHARGE IS HELD', 3, Y, HEADC);
Y += 8;
(() => {
  bCell(B_NORMAL[5], 3, Y, 'B5 8 TICKS');
  bCell(B_NORMAL[6], 91, Y, 'B6 8 TICKS');
  // loop arrows between/around the two cells
  dotLine(88, Y + 20, 92, Y + 20); paint(92, Y + 19, 2, 2, E3, 1);
  dotLine(92, Y + 42, 88, Y + 42); paint(86, Y + 41, 2, 2, E3, 1);
  // lifecycle timeline strip
  const tx = 185, ty = Y + 4;
  text('LIFECYCLE TIMELINE - TICKS AT 60FPS', tx, ty - 4, PHC);
  cellFrame(tx, ty + 4, 208, 10, '#100d1c');
  let sx = tx + 2;
  const seg = (w, col) => { paint(sx, ty + 7, w, 4, col, 1); sx += w + 1; };
  seg(32, E0); seg(24, E1); seg(12, E2);                     // summon 16t, converge 12t, crush 6t
  seg(16, E3); seg(16, E1); seg(16, E3); seg(16, E1);        // brim loop reps B5/B6
  paint(sx, ty + 8, 8, 2, '#3a3346', 1); sx += 9;            // held...
  seg(8, E2);                                                // R0
  text('SUMMON 16', tx, ty + 17); text('CONV 12', tx + 42, ty + 17); text('CRUSH 6', tx + 74, ty + 17);
  text('BRIM 8+8 LOOPS', tx + 106, ty + 17); text('R0 4', tx + 172, ty + 17);
  ['B5 TO B6 - RING ROTATES A HALF SLOT - 0 TO 22 DEG -',
   'HEARTBEAT BRIGHT THEN DIM - STRAGGLER LANES ALTERNATE',
   'SO THE INWARD FEED NEVER STOPS - SEAMLESS BOTH WAYS -',
   'NO BRIDGE FRAME - NOTHING LEAVES THE RING WHILE HELD',
  ].forEach((ln, i) => text(ln, tx, ty + 26 + i * 6));
})();
Y += GB.H + 14;

// ---------- release handoff band ----------
text('RELEASE HANDOFF - OPTIONAL R0 SNAP - THEN THE EXISTING GROUND LASER - THE LASER IS UNTOUCHED', 3, Y, HEADC);
Y += 8;
(() => {
  bCell(B_NORMAL[6], 3, Y, 'B6 LAST BRIM');
  bCell(R0, 91, Y, 'R0 SNAP - 4 TICKS');
  bCell(LASER, 179, Y, 'EXISTING LASER - MOCK');
  dotLine(88, Y + 30, 92, Y + 30); paint(92, Y + 29, 2, 2, E3, 1);
  dotLine(176, Y + 30, 180, Y + 30); paint(180, Y + 29, 2, 2, E3, 1);
  const nx = 270;
  ['R0 - OPTIONAL 4 TICK OUTRO AT FIRE',
   'RING SNAPS INTO THE MUZZLE POINT ON',
   'THE BEAM AXIS - OCTAGON DIES TO ASH',
   'ONE FRAME BEHIND - FAMILY LAW - LAST',
   'ARCS SNAP IN FROM BEHIND - THEN',
   'DRAWLASERBEAM FIRES AT CHEST HEIGHT',
   'EXACTLY AS IT DOES TODAY - THE LASER',
   'CELL HERE IS AN ILLUSTRATION ONLY',
  ].forEach((ln, i) => text(ln, nx, Y + 2 + i * 7));
})();
Y += GB.H + 14;

// ---------- quality tier band ----------
text('TIER LADDER - SAME DESIGN REDUCED - NEVER A DIFFERENT EFFECT - INWARD PROOF ASSERTED PER TIER', 3, Y, HEADC);
Y += 8;
const TIER_NOTES = {
  normal: ['NORMAL - THE FULL DESIGN', '9 SPOKE RING - TAILS 3 CELLS',
    '4 THEN 6 FEED FILAMENTS', 'BRIM STRAGGLERS FALLING IN',
    'BYTE-EXACT RE-0 FAMILY B DATA'],
  lite: ['LITE - 5 SPOKE SHARDS - TAILS 2', 'FILAMENT COUNTS UNCHANGED',
    'BRIM STRAGGLERS DROPPED', 'RING - FLOOR - HEARTBEAT KEPT',
    'INWARD READ FULLY INTACT'],
  performance: ['PERFORMANCE - RING + FILAMENTS', '+ FLOOR ARCS ONLY - TAILS 1',
    'NO TICKS - NO STRAGGLERS', 'STILL UNMISTAKABLY INWARD',
    'NEVER A GENERIC FALLBACK'],
};
[['NORMAL', B_NORMAL, 'normal'], ['LITE', B_LITE, 'lite'], ['PERFORMANCE', B_PERF, 'performance']].forEach(([tn, fam, key]) => {
  text(tn, 3, Y, PHC);
  [[2, 'B2'], [4, 'B4'], [5, 'B5']].forEach(([fi, lbl], i) => bCell(fam[fi], 3 + i * BCW, Y + 8, lbl));
  TIER_NOTES[key].forEach((ln, i) => text(ln, 270, Y + 10 + i * 7));
  Y += GB.H + 20;
});

// ---------- family contract band ----------
text('FAMILY CONTRACT - NEVER MIX THE FAMILIES', 3, Y, HEADC);
Y += 8;
(() => {
  const glyph = (ox, out, lbl) => {
    cellFrame(ox, Y, 44, 44, '#100d1c');
    const c = [ox + 22, Y + 22];
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4 + 0.12;
      const [r0, r1] = out ? [6, 16] : [16, 6];
      dotLine(Math.round(c[0] + Math.cos(a) * r0), Math.round(c[1] + Math.sin(a) * r0),
              Math.round(c[0] + Math.cos(a) * r1), Math.round(c[1] + Math.sin(a) * r1));
      const rh = out ? 18 : 4;
      paint(Math.round(c[0] + Math.cos(a) * rh), Math.round(c[1] + Math.sin(a) * rh), 2, 2, E3, 1);
    }
    if (!out) paint(c[0] - 1, c[1] - 1, 2, 2, E3, 1);
    text(lbl, ox, Y + 47, SUBC);
  };
  glyph(3, false, 'GROUND - IN');
  glyph(57, true, 'AIR - OUT');
  ['WALK STRIDE - RIDES THE BODY DURING LOCOMOTION - NEVER LEAVES THE SILHOUETTE',
   'GROUND INHALE - THIS FAMILY - DELIBERATE ABSORPTION CRUSHED INTO THE CHEST',
   'AIR IGNITION - OUTWARD STARBURST DETONATION - THE EXACT INVERSE OF THIS ONE',
   'AFK VOID-FRACTURE - PLANTED IDLE ONLY - NO CURSE VIGNETTE - NOT INTIMIDATION',
   'OLD CHARGE AURA - RETIRED HERE - REAL PIXEL GEOMETRY - NOT A RECOLORED CLOUD',
  ].forEach((ln, i) => text(ln, 110, Y + 4 + i * 7));
})();
Y += 58;

// ---------- tableau band ----------
text('TABLEAU - GROUND CRUSH AT RANGE - BOSS CENTERED - TRUE-SCALE FIGHTERS', 3, Y, HEADC);
Y += 7;
(() => {
  const floorY = nightRoom(3, Y, 260, 104, 92, [0.14, 0.5, 0.86]);
  stampEffect(B_NORMAL[4], 3 + 64, floorY - 61);
  stampM(heroSmall, HERO_PAL, 3 + 210, floorY - 15, { mir: true });
  const nx = 270;
  ['CRUSH FRAME AT TRUE SCALE -',
   'THE RING SITS ON THE TORSO -',
   'FLOOR ARCS DIE AT HIS FEET -',
   'SILHOUETTE - SWORD - CHEST',
   'CORE ALL STAY READABLE -',
   'THE HERO READS THE THREAT',
   'FROM RANGE - ROOM STILL',
   'LEGIBLE BEHIND THE EFFECT',
  ].forEach((ln, i) => text(ln, nx, Y + 4 + i * 7));
})();
Y += 112;

// ---------- actual game scale band ----------
text('ACTUAL GAME SCALE - FULL 1280X720 VIEWPORT AT 100 PCT - BRIM HOLD - SIMPLIFIED ROOM MOCK', 3, Y, HEADC);
Y += 7;
(() => {
  const floorY = nightRoom(1, Y, 426, 240, 200, [0.1, 0.32, 0.62, 0.9]);
  const bossX = 120;                                          // boss ~360 game px from the left
  stampEffect(B_NORMAL[5], bossX - GB.BX, floorY - 61);
  paint(bossX + 7, floorY - 61 + GB.BY - 6, 32, 2, '#2b2740', 1);   // mock floating HP bars
  paint(bossX + 7, floorY - 61 + GB.BY - 6, 26, 2, E2, 1);
  stampM(heroSmall, HERO_PAL, 300, floorY - 15, { mir: true });
  paint(300 + 2, floorY - 21, 16, 1, '#2b2740', 1);
  paint(300 + 2, floorY - 21, 11, 1, '#7fd4ff', 1);
})();
Y += 245;
text('BOSS 144 PX - HERO 48 PX - EFFECT 252X186 PX ON A 1280X720 VIEW - UNDER A FIFTH OF THE SCREEN WIDE', 3, Y);
text('HERO RESAMPLED TO ITS TRUE 2 PX GRID - CHEST CORE AND INWARD RING READ CLEAN AT GAMEPLAY SIZE', 3, Y + 6);
Y += 16;

// ---------- handoff notes ----------
text('HANDOFF NOTES - STAGE RE-2', 3, Y, HEADC); Y += 8;
[
  'SEAM - PORT AS A SPRITEMANAGER STATIC AT THE DRAWWANDGLOW SEAM IN PLAYER.DRAW WHILE CHARGETYPE IS',
  '   GROUND-LASER - DRAW ORDER - BACK GRID - TREATED BODY RE-SKIN INSTEAD OF THE SPRITE FRAME - FRONT GRID',
  'ANCHORS - GRID 84X62 - BOSS ORIGIN 19.14 - CHEST CORE 39.29 - FLOOR ROW 60 - FEET ROWS 60-61 - AUTHORED',
  '   FACING RIGHT - RUNTIME MIRRORS WITH THE EXISTING AIMDIR FLIP - CELLS RENDER AT BOSS PIXEL 3',
  'LIFECYCLE - B0-B4 RIDE THE CHARGE-UP - B5-B6 PINGPONG WHILE HELD - R0 ON FIRE THEN THE LASER TAKES OVER -',
  '   CANCEL - CLEAR ALL EFFECT CELLS THE SAME FRAME - BODY RESOLVES NEXT FRAME - NOTHING MAY LINGER',
  'CLEANUP - THE EFFECT DIES WITH THE CHARGE STATE - DEATH - RESTART - STAGGER ALL ROUTE THROUGH THE',
  '   EXISTING CHARGE CANCEL - NO ORPHAN CELLS - NO OUTWARD DEBRIS - A CUT TO NOTHING IS LEGAL',
  'RENDER-ONLY LAW - NEVER A HITBOX - NEVER IN GETACTIVEHITBOXES - NO GAMEPLAY - TIMING - DAMAGE - CHARGE',
  '   DURATION - LASER LOGIC - MOVEMENT - AI - COLLISION OR SCALE CHANGES - WALK + AIR + AFK UNTOUCHED',
  'DATA - THE LITERAL HOLDS ALL THREE TIERS + 8 PRE-TREATED BODY FRAMES - NORMAL BACK-FRONT GRIDS ARE',
  '   BYTE-EXACT TO THE APPROVED RE-0 ECLIPSEINHALE DATA - ASSERTED BY THIS GENERATOR ON EVERY RUN',
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
fs.writeFileSync(__dirname+'/red_eclipse_ground_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === RED ECLIPSE GROUND (INHALE) literals — Stage RE-2 (see red_eclipse_ground_spec.md) ===\n';
js += '// 84x62 effect key-grids (back/front) — boss origin (19,14), chest core (39,29), floor row 60.\n';
js += '// back draws BEHIND the boss sprite, front OVER it; body = pre-treated 46x48 re-skin frames\n';
js += '// (replace the sprite frame while the effect is live — no eclipseSkin port needed).\n';
js += '// RENDER-ONLY overlays: never Hitboxes, never in getActiveHitboxes(). Author space faces\n';
js += '// right; runtime mirrors with the existing aimDir flip. Cells render at BOSS_IDLE_PIXEL (3).\n';
js += '// eclipseGround (normal) back/front are BYTE-EXACT to eclipseInhale in eclipse_literal.txt.\n';
js += '// Suggested holds @60fps: B0 8, B1 8, B2 6, B3 6, B4 6, then B5/B6 pingpong 8 each until\n';
js += '// release; optional R0 4 ticks at fire, then the existing drawLaserBeam (untouched).\n';
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
dumpFx('eclipseGround', B_NORMAL);
dumpFx('eclipseGroundLite', B_LITE);
dumpFx('eclipseGroundPerf', B_PERF);
dumpFx('eclipseGroundRelease', [R0]);
js += '  // pre-treated 46x48 body re-skins, shared by all tiers: B0-B6 then R0.\n';
js += '  // B0 = raw pose, B1-B2 = darkenStep, B3-B6 + R0 = eclipseSkin + chest-core pulse.\n';
js += '  eclipseGroundBody: [\n';
[...B_NORMAL, R0].forEach(fr => {
  js += `    // ${fr.tag} body\n`;
  js += '    [' + stringify(fr.body).map(r => JSON.stringify(r)).join(', ') + '],\n';
});
js += '  ],\n';
fs.writeFileSync(__dirname + '/red_eclipse_ground_literal.txt', js);

// round-trip proof: the emitted literal must parse back byte-identical
['eclipseGround', 'eclipseGroundLite', 'eclipseGroundPerf', 'eclipseGroundRelease'].forEach((name, ni) => {
  const fam = [B_NORMAL, B_LITE, B_PERF, [R0]][ni];
  const rt = loadFx('red_eclipse_ground_literal.txt', name);
  if (rt.length !== fam.length) throw new Error('round-trip count fail: ' + name);
  rt.forEach((fr, i) => {
    const src = fam[i];
    const fEmpty = src.front.every(r => r.every(k => k === '.'));
    if (stringify(src.back).join('\n') !== fr.back.join('\n') ||
        (fEmpty ? fr.front.length !== 0 : stringify(src.front).join('\n') !== fr.front.join('\n')))
      throw new Error('round-trip data fail: ' + name + ' frame ' + i);
  });
});
const bodies = loadClips('red_eclipse_ground_literal.txt', ['eclipseGroundBody']).eclipseGroundBody;
if (bodies.length !== 8 || bodies.some(f => f.length !== 48 || f.some(r => r.length !== 46)))
  throw new Error('round-trip body fail');

console.log('wrote red_eclipse_ground_v1.png', IW + 'x' + IH,
  '| byte-exact vs RE-0:', exact + '/7',
  '| meanR B1-B4 normal', RS.normal.map(r => r.toFixed(1)).join(' '),
  '| lite', RS.lite.map(r => r.toFixed(1)).join(' '),
  '| perf', RS.perf.map(r => r.toFixed(1)).join(' '),
  '| R0 meanR', meanR(R0).toFixed(1),
  '| layout end Y', Y);
