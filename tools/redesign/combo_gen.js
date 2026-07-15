// STAGE 8A-0 — BOSS BASIC COMBO REDESIGN production sheet.
// VISUAL DESIGN ONLY — nothing here is wired into src/. Emits:
//   combo_v1.png      — the production sheet
//   combo_literal.txt — drop-in matrices (body clips + effect grids)
//
// DESIGN: a 4-hit combo built FROM the approved boss (boss_matrix.txt body,
// walk2 rear trailing carry, heldSword parametric blade, ember-void palette,
// eclipse/bolt anatomy). The old "up-down sword taps" choreography is replaced
// with reference-inspired body mechanics — reinterpreted, never copied:
//   HIT 1  RISING REND    — the rear low carry IS the wind-up: the trailing
//                           blade whips low->high through the front (uppercut).
//                           Fastest hit. Thin black-red air scar.
//   HIT 2  ECLIPSE WHEEL  — full-body 360 turn: blade wraps over the shoulders,
//                           body pivots THROUGH (away frame), wide low sweep
//                           across the front at knee height. Best reach. Full
//                           flat scar band. (ref4 torque / ref1 turned reach)
//   HIT 3  UMBRAL ORB     — cadence break: sword returns to the rear carry,
//                           the EMPTY lead palm fires the red-eclipse orb —
//                           void disc in a hot corona w/ bolt kinks (Family C
//                           core language at projectile scale). Replaces the
//                           old Dark Flame visual; same moving-hitbox slot.
//   HIT 4  ECLIPSE BREAKER— finisher: two-hand shoulder LOAD (ref3 power pose)
//                           -> eclipse-skinned rush (drive posture, ref2 weight)
//                           -> blade RAMS the floor -> grounded red-eclipse
//                           detonation (broken half-octagon + crystalline rays
//                           + shards + floor skitter). Replaces the old circle
//                           explosion visual. Ends back in the rear carry.
// RED ECLIPSE law: hit1 none / hit2 scar only / hit3 orb IS eclipse / hit4 full
// (eclipse body + detonation). Escalation, never flooding.
// GAMEPLAY: zero changes. All visuals fit the existing COMBO windows
// (commit 14/16/20/10+30) — see combo_spec.md for the hold map.
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
const SMK = '#1a1420', DK = '#1c1d28';
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';

// ---------- load approved matrices ----------
const base = fs.readFileSync(__dirname + '/boss_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const H = base.length, W = base[0].length;          // 48 x 46

// ---------- house matrix helpers (grid-generic bounds) ----------
const clone = g => g.map(r => r.slice());
const blankHW = (w, h) => Array.from({ length: h }, () => Array(w).fill('.'));
const blank = () => blankHW(W, H);
const stringify = g => g.map(r => r.join(''));
const setB = (g, x, y, k) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = k;
};
const setBehind = (g, x, y, k) => {
  if (y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] === '.') g[y][x] = k;
};
function cut(g, x0, y0, x1, y1) {
  const c = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= g.length || x < 0 || x >= g[0].length) continue;
    if (g[y][x] !== '.') { c.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return c;
}
function paste(g, cells, dx, dy) {
  for (const [x, y, k] of cells) setB(g, x + dx, y + dy, k);
}
function moveUpper(g, hipRow, dx, dy) {
  if (dx === 0 && dy === 0) return g;
  const out = blank();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] === '.') continue;
    if (y <= hipRow) setB(out, x + dx, y + dy, g[y][x]);
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
const DARK1 = { '5': '4', '4': '3', '3': '2', '2': '1', '1': '0', '0': '0',
                'd': 'c', 'c': 'b', 'b': 'a', 'a': 'g', 'h': 'g', 'g': 'g' };
const darkenStep = g => g.map(r => r.map(k => DARK1[k] || k));
const mirrorG = g => g.map(r => r.slice().reverse());
// Leg column bands (from the idle art).
const BACK = [12, 17], FRONT = [18, 26];

// Erase the idle raised blade + fist + bent lead forearm (walk2 idiom).
function eraseBlade(g) {
  for (let y = 0; y <= 20; y++) for (let x = 31; x <= 45; x++) g[y][x] = '.';
  for (let y = 13; y <= 20; y++) for (let x = 27; x <= 33; x++) g[y][x] = '.';
  for (let y = 17; y <= 22; y++) for (let x = 24; x <= 29; x++) g[y][x] = '.';
  g[21][31] = '.'; g[21][30] = '.';
}
// Erase the hanging REAR arm + fist so the sword arm can be re-posed.
function eraseRearArm(g) {
  for (let y = 16; y <= 25; y++) for (let x = 8; x <= 13; x++) g[y][x] = '.';
}

// ---------- THE HELD SWORD (walk2 parametric drawer — ONE sword, reach 23) ----------
const REACH = 23;
function heldSword(g, hx, hy, angleDeg, opts = {}) {
  const { flash = false, behind = false } = opts;
  const S = behind ? setBehind : setB;
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx, R = Math.round;
  S(g, hx, hy, '3'); S(g, hx - 1, hy, '3'); S(g, hx, hy + 1, '1');
  S(g, R(hx - dx), R(hy - dy), '2');
  S(g, R(hx - dx * 2), R(hy - dy * 2), flash ? 'c' : 'b');
  for (let i = 1; i <= 4; i++) S(g, R(hx + dx * i), R(hy + dy * i), '1');
  const gx = hx + dx * 1.5, gy = hy + dy * 1.5;
  for (let s = -2; s <= 2; s++) S(g, R(gx + px * s), R(gy + py * s), s === 0 ? (flash ? 'd' : 'c') : '3');
  S(g, R(gx + px * 3), R(gy + py * 3), '4'); S(g, R(gx - px * 3), R(gy - py * 3), '4');
  S(g, R(gx + px * 3 + dx), R(gy + py * 3 + dy), '2'); S(g, R(gx - px * 3 + dx), R(gy - py * 3 + dy), '2');
  const g2x = hx + dx * 3, g2y = hy + dy * 3;
  S(g, R(g2x + px), R(g2y + py), '3'); S(g, R(g2x - px), R(g2y - py), '3');
  S(g, R(g2x + px * 2), R(g2y + py * 2), '2'); S(g, R(g2x - px * 2), R(g2y - py * 2), '2');
  for (let i = 4; i <= REACH; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i), t = (i - 4) / (REACH - 4);
    S(g, bx, by, flash ? (t < 0.4 ? 'c' : 'd') : (t < 0.33 ? 'b' : t < 0.66 ? 'c' : 'd'));
    if (i <= REACH - 3) { S(g, R(bx + px), R(by + py), '1'); S(g, R(bx - px), R(by - py), '3'); }
    else if (i <= REACH - 1) S(g, R(bx + px), R(by + py), '1');
  }
  S(g, R(hx + dx * (REACH + 1)), R(hy + dy * (REACH + 1)), 'd');
  return [R(hx + dx * (REACH + 1)), R(hy + dy * (REACH + 1))];
}

// ---------- arms ----------
// Lead shoulder cap rebuild (eraseBlade removes the thorn cluster).
function leadCap(g, bx, by) {
  const S = (x, y, k) => setB(g, x + bx, y + by, k);
  S(26, 13, '3'); S(27, 13, '3'); S(28, 14, '2');
  S(26, 14, '3'); S(27, 14, 'b'); S(26, 15, '3'); S(27, 15, '3');
}
// R2 lead arm — EMPTY hand: relaxed hang / raised guard (walk2 verbatim).
function leadArm(g, bx, by, mode, swing = 0) {
  const S = (x, y, k) => setB(g, x + bx, y + by, k);
  leadCap(g, bx, by);
  if (mode === 'none') return;
  if (mode === 'guard') {
    S(27, 16, '2'); S(28, 16, '2');
    S(29, 15, '2'); S(29, 14, '3'); S(30, 14, '3');
    S(30, 13, '3'); S(29, 13, 'b');
    return;
  }
  if (mode === 'flung') {                       // counterweight: swept back-down
    S(26, 16, '2'); S(25, 17, '2'); S(24, 18, '2');
    S(23, 19, '2'); S(22, 20, '2'); S(22, 21, '3'); S(21, 21, '3');
    return;
  }
  if (mode === 'cast') {                        // palm thrust forward at chest height
    S(28, 15, '2'); S(29, 15, '2'); S(30, 15, '2'); S(31, 15, '2');
    S(32, 14, '3'); S(33, 14, '3'); S(33, 15, '3'); S(32, 16, '2');
    S(34, 13, '2'); S(34, 15, '2');             // open fingers
    return;
  }
  S(27, 16, '2'); S(27, 17, '2'); S(28, 17, '1');
  S(27, 18, '2'); S(27, 19, '2');
  const fx = 26 + swing;
  S(fx, 20, '2'); S(fx, 21, '2'); S(fx, 22, '2');
  S(fx, 23, '3'); S(fx - 1, 23, '3'); S(fx, 24, '1');
}
// Re-posed REAR sword arm: shoulder (11,16) -> elbow -> hand, dark 2px.
function drawRearArm(g, bx, by, hx, hy) {
  const sx = 11 + bx, sy = 16 + by;
  const ex = Math.round((sx + hx) / 2), ey = Math.round((sy + hy) / 2) + 2;
  lineB(g, sx, sy, ex, ey, '2', true);
  lineB(g, ex, ey, hx, hy, '2', true);
  setB(g, ex, ey + 1, '1');
}
// Second hand joins the grip (two-hand moments): lead shoulder -> stacked fist.
function drawLeadGrip(g, bx, by, hx, hy) {
  leadCap(g, bx, by);
  lineB(g, 27 + bx, 16 + by, hx + 1, hy - 1, '2', true);
  setB(g, hx + 1, hy, '3'); setB(g, hx + 1, hy - 1, '3');
}

// ---------- VOID-FRACTURE bolts (walk2/afk2 anatomy, grid-generic) ----------
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
    setB(g, sx, sy, 'd'); setB(g, sx + 1, sy, 'd'); setB(g, sx, sy + 1, 'd'); setB(g, sx + 1, sy + 1, 'd');
    [[-2, -2], [3, -2], [-2, 3], [3, 3]].forEach(([dx, dy]) => setB(g, sx + dx, sy + dy, 'c'));
    for (let i = 2; i < Math.min(8, cells.length); i++) setB(g, cells[i][0], cells[i][1], '0');
    return;
  }
  if (mode === 'flash') {
    for (let i = 0; i < cells.length; i++) {
      const [x, y] = cells[i];
      const p = cells[Math.max(0, i - 1)], nn = cells[Math.min(cells.length - 1, i + 1)];
      if (Math.abs(nn[1] - p[1]) >= Math.abs(nn[0] - p[0])) { setB(g, x - 1, y, '0'); setB(g, x + 1, y, '0'); }
      else { setB(g, x, y - 1, '0'); setB(g, x, y + 1, '0'); }
    }
    for (const [x, y] of cells) setB(g, x, y, 'c');
    for (const i of kinks) { const [x, y] = cells[i]; setB(g, x, y, 'd'); setB(g, x, y - 1, 'd'); }
    for (const b of branches) {
      const from = cells[Math.min(cells.length - 1, Math.floor(b.frac * cells.length))];
      const sub = boltPath(from[0], from[1], from[0] + b.dx, from[1] + b.dy, seed + 11, 1, 1);
      sub.cells.forEach(([x, y], i2) => { setB(g, x, y - 1, '0'); setB(g, x, y, i2 === sub.cells.length - 1 ? 'a' : 'b'); });
    }
    return;
  }
  if (mode === 'fracture') {
    for (let i = 0; i < cells.length; i++) {
      if (i % 5 >= 3) continue;
      const [x, y] = cells[i];
      setB(g, x, y, kset.has(i) ? 'c' : 'b');
      if (i % 5 === 0) setB(g, x, y - 1, '0');
    }
    const m = cells[Math.floor(cells.length / 2)];
    setB(g, m[0] + 2, m[1] - 2, 'a'); setB(g, m[0] - 2, m[1] + 3, 'a');
    return;
  }
  for (let i = 0; i < cells.length; i += 4) {
    const [x, y] = cells[i];
    const len = 2 + ((i >> 2) % 2);
    for (let j = 0; j < len; j++) setB(g, x, y + 1 + j, (i >> 2) % 2 ? '1' : 'g');
  }
  const m = cells[Math.floor(cells.length / 2)];
  setB(g, m[0] + 2, m[1] + 2, 'a');
}

// ---------- ECLIPSE SKIN (eclipse_gen verbatim: near-void + broken ember rim) ----------
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
    const b = rim < 0.5 ? 'g' : 'h';
    if (rnd(y, seed) < rim * 0.95)      out[y][lo] = rnd(y, seed + 9)  < rim * 0.42 ? 'c' : b;
    if (rnd(y, seed + 4) < rim * 0.95)  out[y][hi] = rnd(y, seed + 13) < rim * 0.42 ? 'c' : b;
  }
  return out;
}

// ---------- AIR SCARS (the sword-trail law: pixel black-red residue) ----------
// Radial scar: the tip path around a pivot. lead edge = hot near aTo, body
// cools toward aFrom, thin '0' smoke sheath on the outer rim, tail tapers.
function scarArc(g, cx, cy, r0, r1, aFrom, aTo, mode) {
  const steps = Math.max(8, Math.round(Math.abs(aTo - aFrom) / 4));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const a = (aFrom + (aTo - aFrom) * t) * Math.PI / 180;
    const dx = Math.cos(a), dy = Math.sin(a);
    for (let r = r0; r <= r1; r++) {
      const x = Math.round(cx + dx * r), y = Math.round(cy + dy * r);
      if (mode === 'ash') {
        if (s % 5 >= 2) continue;
        setBehind(g, x, y, (s + r) % 3 === 0 ? 'g' : 'a');
        if (r === r1 && s % 10 === 0) { setBehind(g, x, y + 1, 'g'); setBehind(g, x, y + 2, '1'); }
        continue;
      }
      if (t < 0.3 && (x + y) % 2 === 0) continue;              // tail taper
      let k;
      if (r === r1) k = t > 0.55 ? '0' : (s % 2 ? '0' : '.');  // smoke sheath
      else if (r === r0) k = '0';
      else k = t > 0.82 ? 'c' : t > 0.5 ? 'b' : t > 0.25 ? 'a' : 'g';
      if (k !== '.') setBehind(g, x, y, k);
    }
    if (mode !== 'ash' && s === steps) {                       // hot licks at the lead edge
      const mr = (r0 + r1) / 2;                                // (behind-only: never on the body)
      setBehind(g, Math.round(cx + dx * mr), Math.round(cy + dy * mr), 'd');
      setBehind(g, Math.round(cx + dx * (mr + 2)), Math.round(cy + dy * (mr + 2)), 'd');
    }
  }
}
// Flat scar band: the side-view low-sweep ellipse (flattened horizontal ring).
function scarBand(g, cx, cy, rx, ry, aFrom, aTo, mode, front = false) {
  const put = front ? setB : setBehind;
  const steps = Math.max(10, Math.round(Math.abs(aTo - aFrom) / 3));
  for (let s = 0; s <= steps; s++) {
    const t = s / steps;
    const a = (aFrom + (aTo - aFrom) * t) * Math.PI / 180;
    const x = Math.round(cx + Math.cos(a) * rx), y = Math.round(cy + Math.sin(a) * ry);
    if (mode === 'ash') {
      if (s % 5 >= 2) continue;
      put(g, x, y, (s % 3) ? 'a' : 'g');
      if (s % 8 === 0) { put(g, x, y + 1, 'g'); put(g, x, y + 2, '1'); }
      continue;
    }
    if (t < 0.22 && s % 2 === 0) continue;
    const body = t > 0.8 ? 'c' : t > 0.45 ? 'b' : t > 0.2 ? 'a' : 'g';
    put(g, x, y, body); put(g, x, y + 1, body === 'c' ? 'b' : 'a');
    put(g, x, y - 1, '0'); put(g, x, y + 2, t > 0.4 ? '0' : '.') ;
    if (t > 0.9) put(g, x, y, 'd');                            // hot leading edge
  }
}

// ---------- frame plumbing ----------
// Build the posed BODY (no sword): erase raised blade, optional leg/crouch/bob,
// then the lead arm mode. Sword + scars + bolts are layered by the hit builders.
function bodyFrame(spec) {
  const { legs = [], bob = [0, 0], crouch = 0, lead = 'hang', swing = 0,
          tailLift = false, shear = 0, ember = false } = spec;
  let g = clone(base);
  eraseBlade(g);
  eraseRearArm(g);
  if (tailLift) paste(g, cut(g, 9, 4, 15, 8), -1, -1);
  for (const [band, knee, dx, up] of legs) paste(g, cut(g, band[0], knee, band[1], 47), dx, -up);
  g = moveUpper(g, 28, bob[0], bob[1] + crouch);
  if (shear) {
    const out = blank();
    for (let y = 0; y < H; y++) { const s = Math.round((H - y) / shear);
      for (let x = 0; x < W; x++) { if (g[y][x] === '.') continue; setB(out, x + s, y, g[y][x]); } }
    g = out;
  }
  if (ember) g = emberUp(g);
  leadArm(g, bob[0] + (shear ? Math.round((H - 15) / shear) : 0), bob[1] + crouch, lead, swing);
  return g;
}

// =====================================================================
// HIT 1 — RISING REND (4f, fastest). The rear carry is the wind-up.
// Blade path: down-back 114 -> under the front 58 -> strike -42 -> vertical -70.
// =====================================================================
function hit1Frames() {
  const out = [];
  // f0 COIL — one breath deeper than the idle carry; weight sinks back.
  let g = bodyFrame({ bob: [-1, 0], crouch: 1, lead: 'hang', swing: -1 });
  drawRearArm(g, -1, 1, 9, 25);
  heldSword(g, 9, 25, 114);
  setB(g, 3, 44, 'a'); setB(g, 5, 46, 'g');                    // tip stirs the dust behind
  out.push(g);
  // f1 SWEEP LOW — the blade whips under the front; body starts to uncoil.
  g = bodyFrame({ legs: [[FRONT, 36, 2, 0]], bob: [1, 0], lead: 'hang', swing: -1 });
  scarArc(g, 14, 22, 19, 22, 108, 72, 'strike');
  drawRearArm(g, 1, 0, 16, 23);
  heldSword(g, 16, 23, 58);
  out.push(g);
  // f2 STRIKE HIGH — the hit: rising diagonal, full uncoil, forward lean.
  g = bodyFrame({ legs: [[FRONT, 36, 3, 0]], bob: [2, -1], lead: 'flung' });
  scarArc(g, 18, 20, 16, 22, 70, -28, 'strike');
  drawRearArm(g, 2, -1, 20, 17);
  heldSword(g, 20, 17, -40);
  out.push(g);
  // f3 FOLLOW — momentum carries the blade near-vertical; the scar ashes.
  g = bodyFrame({ legs: [[FRONT, 36, 3, 0]], bob: [1, -1], lead: 'flung' });
  scarArc(g, 18, 20, 16, 22, 45, -35, 'ash');
  drawRearArm(g, 1, -1, 25, 23);
  heldSword(g, 25, 23, -70);
  out.push(g);
  return out;
}

// =====================================================================
// HIT 2 — ECLIPSE WHEEL (4f, best reach). Full-body turn-through:
// wrap over the shoulders -> AWAY mid-turn (blade behind) -> front low sweep
// -> exit. Scar = flattened horizontal band (the side-view spin ring).
// =====================================================================
function hit2Frames() {
  const out = [];
  // f0 WRAP — blade lies flat back over the shoulders; both hands find the grip.
  let g = bodyFrame({ legs: [[FRONT, 36, 2, 0]], bob: [0, 0], crouch: 2, lead: 'none' });
  drawRearArm(g, 0, 2, 24, 12);
  drawLeadGrip(g, 0, 2, 24, 12);
  heldSword(g, 24, 12, 183);
  out.push(g);
  // f1 AWAY — mid-turn: the body pivots through, seen from behind (mirrored,
  // visor + chest core hidden); the blade sweeps BEHIND at hip height.
  g = bodyFrame({ legs: [[FRONT, 36, 2, 0]], bob: [0, 0], crouch: 2, lead: 'hang' });
  g = mirrorG(g);
  for (let y = 0; y <= 18; y++) for (let x = 0; x < W; x++) {
    const k = g[y][x];
    if (k === 'b' || k === 'c' || k === 'd') g[y][x] = '2';
    else if (k === 'a') g[y][x] = '1';
  }
  scarBand(g, 23, 29, 20, 5, 215, 155, 'strike');              // trail on the back side
  heldSword(g, 34, 26, 168, { behind: true });
  out.push(g);
  // f2 SWEEP — the hit: rotation completes into a wide knee-height front sweep.
  g = bodyFrame({ legs: [[FRONT, 36, 4, 0]], bob: [1, 0], crouch: 2, lead: 'flung' });
  scarBand(g, 22, 29, 19, 5, 165, 30, 'strike', true);
  drawRearArm(g, 1, 2, 21, 25);
  heldSword(g, 21, 25, 12);
  setB(g, 44, 45, 'c'); setB(g, 42, 46, 'a');                  // tip graze ticks
  out.push(g);
  // f3 EXIT — body rises out of the crouch; the band ashes behind the blade.
  g = bodyFrame({ legs: [[FRONT, 36, 2, 0]], bob: [0, 0], crouch: 1, lead: 'hang', swing: 1 });
  scarBand(g, 22, 29, 19, 5, 150, 60, 'ash');
  drawRearArm(g, 0, 1, 25, 23);
  heldSword(g, 25, 23, 48);
  out.push(g);
  return out;
}

// =====================================================================
// HIT 3 — UMBRAL ORB (3f body + 4 orb cells). Cadence break: the sword
// returns to the rear carry and the EMPTY lead palm casts the eclipse orb.
// =====================================================================
function hit3Frames() {
  const out = [];
  // f0 GATHER — planted; a void-fracture arc links the chest core to the palm.
  let g = bodyFrame({ bob: [0, 0], crouch: 1, lead: 'guard' });
  drawRearArm(g, 0, 1, 11, 25);
  heldSword(g, 11, 25, 112);
  bakeBolt(g, boltPath(19, 16, 29, 15, 91, 1, 1), 'flash', { seed: 91 });
  setB(g, 32, 14, '0'); setB(g, 33, 14, 'a'); setB(g, 32, 15, 'a');   // kernel forming
  out.push(g);
  // f1 CAST — the palm thrusts; the orb condenses ahead of the open hand.
  g = bodyFrame({ legs: [[FRONT, 36, 2, 0]], bob: [1, 0], crouch: 1, lead: 'cast' });
  drawRearArm(g, 1, 1, 11, 25);
  heldSword(g, 11, 25, 114);
  const OC = [39, 15];
  for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (m === 0) setB(g, OC[0] + dx, OC[1] + dy, 'd');
    else if (m <= 2) setB(g, OC[0] + dx, OC[1] + dy, 'c');
    else if (m === 3) setB(g, OC[0] + dx, OC[1] + dy, '0');
  }
  setB(g, 36, 12, 'c'); setB(g, 36, 18, 'c');                  // birth winks
  out.push(g);
  // f2 RECOIL — the orb has detached (flight cells take over); ember residue.
  g = bodyFrame({ bob: [-1, 0], crouch: 1, lead: 'cast' });
  drawRearArm(g, -1, 1, 10, 25);
  heldSword(g, 10, 25, 113);
  [[37, 13], [40, 16], [38, 18]].forEach(([x, y]) => setB(g, x, y, 'a'));
  setB(g, 42, 14, 'g');
  out.push(g);
  return out;
}

// ---------- the ORB effect cells (23x23, centre 11,11; travel = +x) ----------
const OG = { W: 23, H: 23, C: 11 };
function orbCells() {
  const mk = () => blankHW(OG.W, OG.H);
  const C = OG.C;
  const out = [];
  // O0 IGNITE — kernel + converging in-ticks (just off the palm).
  let g = mk();
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (m <= 1) setB(g, C + dx, C + dy, 'a');
    else if (m === 2) setB(g, C + dx, C + dy, '0');
  }
  [[-5, -5], [5, -5], [-5, 5], [5, 5]].forEach(([dx, dy]) => {
    setB(g, C + dx, C + dy, 'g'); setB(g, C + Math.sign(dx) * 4, C + Math.sign(dy) * 4, 'a');
  });
  setB(g, C, C - 4, 'c'); setB(g, C, C + 4, 'c');
  out.push(g);
  // O1 FLIGHT A — the red eclipse: void disc + hot corona + kinks + tail.
  g = mk();
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (m <= 2) setB(g, C + dx, C + dy, '0');
    else if (m <= 4) setB(g, C + dx, C + dy, 'd');
    else if (m === 5 && (dx + dy + 9) % 3 !== 0) setB(g, C + dx, C + dy, 'c');
    else if (m === 6 && (dx === 0 || dy === 0)) setB(g, C + dx, C + dy, 'b');
  }
  bakeBolt(g, boltPath(C - 6, C - 6, C - 10, C - 9, 97, 1, 1), 'fracture');
  [[0, 10], [2, 11], [4, 12], [1, 13]].forEach(([x, y], i) => setB(g, x, y, i % 2 ? 'a' : 'g'));
  setB(g, C + 8, C, 'c');                                      // leading lick
  out.push(g);
  // O2 FLIGHT B — shimmer alternate: corona checkers, kinks below, tail shifts.
  g = mk();
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (m <= 2) setB(g, C + dx, C + dy, '0');
    else if (m <= 4) setB(g, C + dx, C + dy, (dx + dy + 20) % 2 ? 'd' : 'c');
    else if (m === 5 && (dx + dy + 10) % 3 !== 0) setB(g, C + dx, C + dy, 'b');
  }
  bakeBolt(g, boltPath(C - 5, C + 6, C - 9, C + 10, 101, 1, 1), 'fracture');
  [[1, 9], [3, 10], [0, 12], [4, 11]].forEach(([x, y], i) => setB(g, x, y, i % 2 ? 'g' : 'a'));
  setB(g, C + 8, C - 1, 'c');
  out.push(g);
  // O3 BURST — the disc dies: broken ring + outward shards + sinking ash.
  g = mk();
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (m <= 1) setB(g, C + dx, C + dy, 'a');
    else if (m === 2 && dx === 0) setB(g, C + dx, C + dy, 'g');
  }
  for (let k = 0; k < 8; k++) {
    const a = (k * 45 + 22) * Math.PI / 180;
    const x = Math.round(C + Math.cos(a) * 7), y = Math.round(C + Math.sin(a) * 7);
    if (k % 4 !== 3) { setB(g, x, y, k % 2 ? 'b' : 'a'); }
    const sx = Math.round(C + Math.cos(a) * 10), sy = Math.round(C + Math.sin(a) * 10);
    if (k % 2 === 0) { setB(g, sx, sy, 'a'); setB(g, sx, sy + 1, 'g'); }
  }
  setB(g, C - 1, C + 5, 'g'); setB(g, C - 1, C + 6, '1');
  out.push(g);
  return out;
}

// =====================================================================
// HIT 4 — ECLIPSE BREAKER (5f body + 4 detonation cells). Two-hand LOAD ->
// eclipse rush -> floor RAM -> detonation -> recover into the rear carry.
// =====================================================================
function hit4Frames() {
  const out = [];
  // f0 LOAD — the ref3 power pose: blade over the rear shoulder, both hands
  // stacked at the chest, body coiled back, ember veins bright.
  let g = bodyFrame({ legs: [[FRONT, 36, 2, 0]], bob: [-2, 1], lead: 'none', ember: true });
  drawRearArm(g, -2, 1, 18, 18);
  drawLeadGrip(g, -2, 1, 18, 18);
  heldSword(g, 18, 18, -135, { flash: true });
  out.push(g);
  // f1 RUSH A — the eclipse ignites; drive posture, blade leading low-forward.
  g = bodyFrame({ shear: 10, lead: 'none' });
  g = eclipseSkin(g, 31, { rim: 0.6 });
  drawRearArm(g, 3, 0, 25, 22);
  drawLeadGrip(g, 3, 0, 25, 22);
  heldSword(g, 25, 22, 35, { flash: true });
  for (const y of [14, 20, 26]) for (let x = 0; x <= 6 - (y % 3) * 2; x += 2) setBehind(g, x, y, y % 2 ? '1' : 'g');
  out.push(g);
  // f2 RUSH B — peak: full eclipse body, hot rim, a bolt tears off behind.
  g = bodyFrame({ shear: 8, lead: 'none' });
  g = eclipseSkin(g, 33, { rim: 1, hot: true });
  drawRearArm(g, 4, 0, 24, 21);
  drawLeadGrip(g, 4, 0, 24, 21);
  heldSword(g, 24, 21, 30, { flash: true });
  bakeBolt(g, boltPath(3, 24, 11, 27, 103, 1, 1), 'fracture');
  for (const y of [13, 19, 25, 31]) for (let x = 0; x <= 5; x += 2) setBehind(g, x, y, y % 2 ? '1' : 'g');
  out.push(g);
  // f3 IMPACT — the blade RAMS the floor ahead; the body uncoils over it.
  g = bodyFrame({ shear: 9, bob: [1, 1], lead: 'flung' });
  g = eclipseSkin(g, 35, { rim: 0.7 });
  drawRearArm(g, 4, 1, 28, 27);
  heldSword(g, 28, 27, 56, { flash: true });
  [[40, 45], [42, 45], [39, 46], [43, 46]].forEach(([x, y], i) => setB(g, x, y, i % 2 ? 'c' : 'd'));
  setB(g, 38, 43, 'c'); setB(g, 44, 43, 'c');                  // bite sparks
  out.push(g);
  // f4 RECOVER — back to the exact rear-carry rest; ember memory on the floor.
  g = bodyFrame({ bob: [0, 0], lead: 'hang' });
  drawRearArm(g, 0, 0, 11, 24);
  heldSword(g, 11, 24, 112);
  [[39, 45], [42, 46], [37, 46]].forEach(([x, y], i) => setB(g, x, y, i ? 'g' : 'a'));
  out.push(g);
  return out;
}

// ---------- the DETONATION cells (72x52, centre 38,34, floor row 48) ----------
const DG = { W: 72, H: 52, CX: 38, CY: 34, FLOOR: 48 };
function detRay(g, angDeg, r0, r1, minor = false) {
  const a = angDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx;
  for (let r = r0; r <= r1; r++) {
    const t = (r - r0) / Math.max(1, r1 - r0);
    const x = Math.round(DG.CX + dx * r), y = Math.round(DG.CY + dy * r);
    if (y > DG.FLOOR) continue;
    if (minor) { setB(g, x, y, t < 0.5 ? 'b' : 'a'); continue; }
    setB(g, x, y, t < 0.3 ? 'd' : t < 0.62 ? 'c' : t < 0.86 ? 'b' : 'a');
    if (t < 0.55 && r1 - r0 > 10) { setB(g, Math.round(x + px), Math.round(y + py), '0'); setB(g, Math.round(x - px), Math.round(y - py), '0'); }
  }
}
function detCore(g, stage) {
  const [cx, cy] = [DG.CX, DG.CY];
  for (let dy = -7; dy <= 7; dy++) for (let dx = -7; dx <= 7; dx++) {
    const m = Math.abs(dx) + Math.abs(dy);
    if (cy + dy > DG.FLOOR) continue;
    if (stage === 'flash') {
      if (m <= 1) setB(g, cx + dx, cy + dy, '0');
      else if (m <= 3) setB(g, cx + dx, cy + dy, 'd');
      else if (m === 4) setB(g, cx + dx, cy + dy, 'c');
    } else if (stage === 'corona') {
      if (m <= 3) setB(g, cx + dx, cy + dy, '0');
      else if (m <= 5) setB(g, cx + dx, cy + dy, 'd');
      else if (m === 6) setB(g, cx + dx, cy + dy, 'c');
      else if (m === 7 && (dx === 0 || dy === 0)) setB(g, cx + dx, cy + dy, 'c');
    } else if (stage === 'break') {
      if (m <= 2) setB(g, cx + dx, cy + dy, '0');
      else if (m === 3 && (dx + dy) % 2 === 0) setB(g, cx + dx, cy + dy, 'c');
      else if (m === 4 && (dx + dy) % 2) setB(g, cx + dx, cy + dy, 'a');
    } else if (stage === 'ember') {
      if (m <= 1) setB(g, cx + dx, cy + dy, 'a');
      else if (m === 2 && dx === 0) setB(g, cx + dx, cy + dy, 'g');
    }
  }
}
function detOct(g, r, offDeg, style) {
  for (let k = 0; k < 8; k++) {
    const a0 = (offDeg + k * 45) * Math.PI / 180, a1 = (offDeg + (k + 1) * 45) * Math.PI / 180;
    const v0 = [Math.round(DG.CX + Math.cos(a0) * r), Math.round(DG.CY + Math.sin(a0) * r)];
    const v1 = [Math.round(DG.CX + Math.cos(a1) * r), Math.round(DG.CY + Math.sin(a1) * r)];
    const seg = bres(v0[0], v0[1], v1[0], v1[1]);
    for (let i = Math.floor(seg.length * 0.2); i < Math.ceil(seg.length * 0.8); i++) {
      if (style === 'crack' && i % 5 >= 3) continue;
      if (seg[i][1] > DG.FLOOR) continue;
      setB(g, seg[i][0], seg[i][1], i % 4 === 0 ? 'g' : 'a');
    }
  }
}
function detShards(g, n, rBase, rSpread, seed, fall = 0) {
  for (let i = 0; i < n; i++) {
    const a = rnd(i, seed) * Math.PI * 2;
    const r = rBase + rnd(i, seed + 2) * rSpread;
    const x = Math.round(DG.CX + Math.cos(a) * r), y = Math.round(DG.CY + Math.sin(a) * r) + fall;
    if (y > DG.FLOOR) continue;
    setB(g, x, y, i % 3 === 0 ? 'b' : 'a');
    if (i % 2 === 0) {
      const ty = Math.round(DG.CY + Math.sin(a) * (r - 3)) + fall;
      if (ty <= DG.FLOOR) setB(g, Math.round(DG.CX + Math.cos(a) * (r - 3)), ty, 'g');
    }
  }
}
const DET_RAYS = [[-90, 21], [-63, 17], [-117, 17], [-30, 15], [-150, 15], [0, 19], [180, 13]];
function detCells() {
  const mk = () => blankHW(DG.W, DG.H);
  const out = [];
  // D0 FLASH — the blade ram births the void core; up-stubs; floor flare.
  let g = mk();
  detCore(g, 'flash');
  [[-90, 10], [-60, 9], [-120, 9]].forEach(([a, r1]) => detRay(g, a, 6, r1, true));
  for (let x = DG.CX - 9; x <= DG.CX + 9; x += 2) setB(g, x, DG.FLOOR - 1, x % 4 ? 'c' : '0');
  setB(g, DG.CX - 3, DG.FLOOR, '0'); setB(g, DG.CX + 3, DG.FLOOR, '0');
  detShards(g, 3, 10, 3, 41);
  out.push(g);
  // D1 BURST — the peak: corona core, crystalline rays, broken octagon,
  // outward shards, void-fracture skitters racing along the floor.
  g = mk();
  DET_RAYS.slice(0, 3).forEach(([a, L]) => detRay(g, a, 8, L));
  DET_RAYS.slice(3).forEach(([a, L]) => detRay(g, a, 7, L, false));
  for (let k = 0; k < 6; k++) detRay(g, -160 + k * 32, 7, 10, true);
  detOct(g, 13, 22, 'full');
  detShards(g, 10, 15, 5, 43);
  detCore(g, 'corona');
  bakeBolt(g, boltPath(DG.CX + 8, DG.FLOOR - 1, DG.CX + 26, DG.FLOOR - 2, 107, 1, 1), 'flash', { seed: 107 });
  bakeBolt(g, boltPath(DG.CX - 8, DG.FLOOR - 1, DG.CX - 24, DG.FLOOR - 2, 109, 1, 1), 'flash', { seed: 109 });
  out.push(g);
  // D2 FRACTURE — rays break into black-red bolts; the octagon cracks.
  g = mk();
  DET_RAYS.slice(0, 2).forEach(([a, L]) => {
    detRay(g, a, 7, Math.round(L * 0.4));
    const ar = a * Math.PI / 180;
    bakeBolt(g, boltPath(Math.round(DG.CX + Math.cos(ar) * L * 0.45), Math.round(DG.CY + Math.sin(ar) * L * 0.45),
                         Math.round(DG.CX + Math.cos(ar) * L * 1.05), Math.round(DG.CY + Math.sin(ar) * L * 1.05),
                         111 + a, 2, 2), 'flash', { seed: 111 + a });
  });
  [[-30, 15], [0, 19], [-150, 15]].forEach(([a, L]) => {
    const ar = a * Math.PI / 180;
    bakeBolt(g, boltPath(Math.round(DG.CX + Math.cos(ar) * 8), Math.round(DG.CY + Math.sin(ar) * 8),
                         Math.round(DG.CX + Math.cos(ar) * (L + 3)), Math.round(DG.CY + Math.sin(ar) * (L + 3)),
                         117 + a, 2, 2), 'fracture');
  });
  detOct(g, 15, 22, 'crack');
  detShards(g, 12, 19, 6, 47, 1);
  detCore(g, 'break');
  bakeBolt(g, boltPath(DG.CX + 10, DG.FLOOR - 1, DG.CX + 28, DG.FLOOR - 2, 119, 1, 1), 'fracture');
  bakeBolt(g, boltPath(DG.CX - 10, DG.FLOOR - 1, DG.CX - 26, DG.FLOOR - 2, 121, 1, 1), 'fracture');
  out.push(g);
  // D3 ASHFALL — sinking slivers; ember memory scorched into the floor.
  g = mk();
  detCore(g, 'ember');
  [[-14, -8], [-6, -14], [4, -12], [12, -6], [16, 2], [-18, 0]].forEach(([dx, dy], i) => {
    const x = DG.CX + dx, y = DG.CY + dy;
    setB(g, x, y, 'g'); setB(g, x, y + 1, i % 2 ? '1' : 'g'); setB(g, x, y + 2, '1');
  });
  for (let x = DG.CX - 16; x <= DG.CX + 18; x += 3) setB(g, x, DG.FLOOR - 1, (x % 2) ? 'g' : 'a');
  setB(g, DG.CX - 4, DG.FLOOR, '0'); setB(g, DG.CX + 5, DG.FLOOR, '0');
  setB(g, DG.CX + 2, DG.CY - 18, '1'); setB(g, DG.CX + 3, DG.CY - 20, '1');   // smoke curl
  out.push(g);
  // the floor eats everything below it (bolt jitter / shard fall clamp)
  for (const c of out) for (let y = DG.FLOOR + 2; y < DG.H; y++) c[y].fill('.');
  return out;
}

// ---------- build everything ----------
const CLIPS = {
  attack1: hit1Frames().map(stringify),
  attack2: hit2Frames().map(stringify),
  attack3: hit3Frames().map(stringify),
  attack4: hit4Frames().map(stringify),
};
const FX = {
  comboOrb: orbCells().map(stringify),
  comboDetonation: detCells().map(stringify),
};

// ---------- validation (drop-in law + design contracts) ----------
const LEGAL = new Set([...'012345abcdgh.']);
let vErr = 0;
const fail = (...m) => { console.error('FAIL', ...m); vErr++; };
for (const [n, frames] of Object.entries(CLIPS)) frames.forEach((f, i) => {
  if (f.length !== 48 || f.some(r => r.length !== 46)) fail('SIZE', n, i);
  for (const r of f) for (const k of r) if (!LEGAL.has(k)) fail('KEY', n, i, k);
  let low = -1; f.forEach((r, y) => { if ([...r].some(k => k !== '.')) low = y; });
  if (low < 46) fail('FLOOR', n, i, low);
  const ember = f.join('').split('').filter(k => 'abcd'.includes(k)).length;
  if (ember < 20) fail('SWORD-PRESENCE', n, i, ember);
});
[['comboOrb', 23, 23], ['comboDetonation', 72, 52]].forEach(([n, w, h]) => FX[n].forEach((f, i) => {
  if (f.length !== h || f.some(r => r.length !== w)) fail('FX SIZE', n, i);
  for (const r of f) for (const k of r) if (!LEGAL.has(k)) fail('FX KEY', n, i, k);
}));
// away frame hides the face: no hot ember above row 18
{
  const f = CLIPS.attack2[1];
  for (let y = 0; y <= 18; y++) for (const k of f[y]) if (k === 'c' || k === 'd') fail('AWAY-FACE', y);
}
// eclipse rush void dominance: rush-peak void count >= 1.5x opener void count
{
  const cnt = (f, keys) => f.join('').split('').filter(k => keys.includes(k)).length;
  const v2 = cnt(CLIPS.attack4[2], '01'), v0 = cnt(CLIPS.attack1[1], '01');
  if (v2 < v0 * 1.5) fail('ECLIPSE-VOID', v2, v0);
}
// finisher seam: last frame's tip back in the rear-lower quadrant
{
  const f = CLIPS.attack4[4]; let tip = null;
  f.forEach((r, y) => { for (let x = 0; x < 14; x++) if (r[x] === 'd') tip = [x, y]; });
  if (!tip || tip[1] < 40) fail('SEAM-TIP', JSON.stringify(tip));
}
// orb law: void disc core + hot corona on both flight cells
FX.comboOrb.slice(1, 3).forEach((f, i) => {
  const C = OG.C;
  if (f[C][C] !== '0') fail('ORB-VOID', i);
  let d = 0;
  for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++)
    if (Math.abs(dx) + Math.abs(dy) <= 4 && f[C + dy][C + dx] === 'd') d++;
  if (d < 8) fail('ORB-CORONA', i, d);
});
// detonation law: D1 reaches up, floor skitter present, D3 fully cooled, half-dome
{
  const D = FX.comboDetonation;
  let up = 99; D[1].forEach((r, y) => { if ([...r].some(k => k !== '.')) up = Math.min(up, y); });
  if (up > 14) fail('DET-REACH', up);
  let sk = 0;
  for (const y of [46, 47, 48]) for (let x = 0; x < DG.W; x++)
    if (Math.abs(x - DG.CX) > 8 && D[1][y][x] !== '.') sk++;
  if (sk < 6) fail('DET-SKITTER', sk);
  if (D[3].join('').includes('d')) fail('DET-COOLED');
  D.forEach((f, i) => { for (let y = DG.FLOOR + 2; y < DG.H; y++) if ([...f[y]].some(k => k !== '.')) fail('DET-UNDERFLOOR', i, y); });
  const dOrb = FX.comboOrb[1].join('').split('').filter(k => k === 'd').length;
  const dDet = D[1].join('').split('').filter(k => k === 'd').length;
  if (dDet <= dOrb) fail('ESCALATION', dDet, dOrb);
}
if (vErr) throw new Error('validation failed: ' + vErr);

// ================= SHEET CANVAS =================
const SW = 364, SH = 806, SCALE = 3;
const G = Array.from({ length: SH }, () => Array(SW).fill(null));
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
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110110101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101010101111', '9': '111101111001111', '.': '000000000000010', '-': '000000111000000', '+': '000010111010000',
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
const HEADC = '#8d84a8', SUBC = '#4a4560';
const toGrid = f => f.map(s => [...s]);

// ---------- header + palette law ----------
text('STAGE 8A-0 - BOSS BASIC COMBO REDESIGN - 4 HITS - REAL 46X48 DROP-INS + FX GRIDS', 3, 2, HEADC);
text('BOSS KEYS ONLY', 3, 9, SUBC);
{
  let px = 66;
  for (const k of '012345abcdgh') {
    paint(px, 8, 7, 7, BOSS_PAL[k], 1);
    text(k, px + 2, 16, SUBC);
    px += 10;
  }
  text('SWORD REACH 23 - FEET ROWS 46-47', 196, 9, SUBC);
}

// ---------- band OV: combo map ----------
const OV_Y = 24;
text('COMBO MAP - ROLES + COMMIT-CHAIN WINDOWS AT 60FPS', 3, OV_Y, HEADC);
{
  const picks = [['attack1', 2, 'H1 RISING REND', 'FASTEST - OPENER', 14, 16],
                 ['attack2', 2, 'H2 ECLIPSE WHEEL', 'TURN - BEST REACH', 16, 16],
                 ['attack3', 1, 'H3 UMBRAL ORB', 'RANGE - CADENCE', 20, 18],
                 ['attack4', 0, 'H4 ECL BREAKER', 'HEAVIEST - ENDER', 10, 30]];
  picks.forEach(([clip, fi, name, role, com, rec], i) => {
    const ox = 3 + i * 91, oy = OV_Y + 7;
    cellFrame(ox, oy, 84, 56, '#100d1c');
    stampM(toGrid(CLIPS[clip][fi]), BOSS_PAL, ox + 18, oy + 3);
    text(name, ox, oy + 60, HEADC);
    text(role, ox, oy + 66, SUBC);
    paint(ox, oy + 73, com, 2, E2, 1);                          // commit bar
    paint(ox + com, oy + 73, rec, 2, '#3a3346', 1);             // chain window bar
  });
  text('BAR - RED COMMIT - GREY CHAIN WINDOW - 1PX 1F', 3, OV_Y + 96, SUBC);
  text('ECLIPSE USE - H1 NONE - H2 SCAR - H3 ORB - H4 BODY + BLAST', 3, OV_Y + 103, SUBC);
}

// ---------- per-hit bands ----------
const CELL = 48;
function hitBand(y, label, clip, tags, notes, extra) {
  text(label, 3, y, HEADC);
  CLIPS[clip].forEach((f, c) => {
    stampM(toGrid(f), BOSS_PAL, 3 + c * CELL, y + 7);
    text(tags[c], 3 + c * CELL, y + 7 + 49, SUBC);
  });
  notes.forEach((ln, i) => text(ln, 214, y + 8 + i * 7, i === 0 ? HEADC : SUBC));
  if (extra) extra(y);
  return y + 68;
}
let yCur = OV_Y + 113;
yCur = hitBand(yCur, 'HIT 1 - RISING REND - 4F - THE REAR CARRY IS THE WIND-UP', 'attack1',
  ['COIL', 'ACT-LO', 'ACT-HI', 'FOLLOW'],
  ['UPPERCUT OFF THE CARRY',
   'BLADE WHIPS LOW-HIGH',
   'THIN SCAR - NO ECLIPSE',
   'F0 1 BREATH PAST IDLE',
   'ENDS HIGH-FWD TO CHAIN'],
  (y) => {                                                     // arc mini-map
    cellFrame(310, y + 7, 50, 50, '#100d1c');
    const cx = 310 + 18, cy = y + 7 + 28;
    for (let a = 110; a >= -40; a -= 10) {
      const r = a * Math.PI / 180;
      paint(Math.round(cx + Math.cos(r) * 19), Math.round(cy + Math.sin(r) * 19), 1, 1, a > -20 ? E1 : E3, 1);
    }
    paint(cx, cy, 2, 2, '#565c74', 1);
    text('TIP PATH', 312, y + 59, SUBC);
  });
yCur = hitBand(yCur, 'HIT 2 - ECLIPSE WHEEL - 4F - FULL BODY TURN-THROUGH', 'attack2',
  ['WRAP 2H', 'AWAY', 'SWEEP', 'EXIT'],
  ['360 PIVOT THROUGH',
   'F0 2-HAND WRAP',
   'F1 SHOWS HIS BACK -',
   'VISOR HIDDEN - BLADE',
   'SWEEPS BEHIND HIM',
   'F2 WIDE KNEE-HIGH CUT',
   'FLAT SCAR BAND',
   'BEST REACH OF ALL'],
  null);
// hit 3 band + orb cells + flight strip
{
  const y = yCur;
  text('HIT 3 - UMBRAL ORB - 3F BODY + 4 ORB CELLS - THE ECLIPSE BALL', 3, y, HEADC);
  CLIPS.attack3.forEach((f, c) => {
    stampM(toGrid(f), BOSS_PAL, 3 + c * CELL, y + 7);
    text(['GATHER', 'CAST', 'RECOIL'][c], 3 + c * CELL, y + 7 + 49, SUBC);
  });
  FX.comboOrb.forEach((f, c) => {
    const ox = 150 + c * 29;
    cellFrame(ox, y + 12, 25, 25, '#0d0a18');
    stampM(toGrid(f), BOSS_PAL, ox + 1, y + 13);
    text(['O0', 'O1', 'O2', 'O3'][c], ox + 8, y + 39, SUBC);
  });
  text('O0 IGNITE - O1 O2 LOOP - O3 BURST', 150, y + 47, SUBC);
  // flight strip: the orb rides the ground line, scorch ticks beneath
  cellFrame(150, y + 53, 130, 14, '#0d0a18');
  paint(150, y + 64, 130, 1, NF1, 1);
  [[162, 1], [196, 2], [230, 1]].forEach(([ox, oi]) => {
    const f = toGrid(FX.comboOrb[oi]);
    for (let yy = 0; yy < 23; yy++) for (let xx = 0; xx < 23; xx++) {
      const k = f[yy][xx]; if (k === '.') continue;
      if (yy >= 4 && yy <= 18) paint(ox + xx - 11, y + 53 + yy - 4, 1, 1, BOSS_PAL[k], 1);
    }
    paint(ox - 6, y + 63, 3, 1, '#3a1014', 1); paint(ox + 3, y + 63, 2, 1, '#3a1014', 1);
  });
  text('FLIGHT RIDES THE GROUND LINE - SCORCH TICKS', 150, y + 69, SUBC);
  const notes = ['SWORD IN REAR CARRY',
                 'EMPTY PALM CASTS',
                 'CHEST ARC TO PALM',
                 'VOID DISC HOT RING',
                 'BOLT KINKS ON RIM',
                 'REPLACES DARK FLAME'];
  notes.forEach((ln, i) => text(ln, 286, y + 8 + i * 7, i === 0 ? HEADC : SUBC));
  yCur = y + 82;
}
// hit 4 band + afterimage story + detonation cells
{
  const y = yCur;
  text('HIT 4 - ECLIPSE BREAKER - 5F - LOAD - RUSH - RAM - DETONATION', 3, y, HEADC);
  CLIPS.attack4.forEach((f, c) => {
    stampM(toGrid(f), BOSS_PAL, 3 + c * CELL, y + 7);
    text(['LOAD', 'RUSH-A', 'RUSH-B', 'IMPACT', 'RECOVER'][c], 3 + c * CELL, y + 7 + 49, SUBC);
  });
  const notes = ['2-HAND SHOULDER LOAD',
                 'ECLIPSE BODY ON THE RUSH',
                 'BROKEN EMBER RIM AT PEAK',
                 'BLADE RAMS THE FLOOR',
                 'F4 ENDS IN THE REAR CARRY',
                 'SEAM BACK TO LOCOMOTION'];
  notes.forEach((ln, i) => text(ln, 246, y + 8 + i * 7, i === 0 ? HEADC : SUBC));
  // rush afterimage story (runtime: drawDashAura idiom, eclipse skin inherits)
  const y2 = y + 68;
  text('RUSH AFTERIMAGES - RUNTIME X3', 3, y2, HEADC);
  const rb = toGrid(CLIPS.attack4[2]);
  const ghost = (den, hex) => (k, x, yy) => ((x + yy) % den === 0 ? null : hex);
  for (let c = 0; c < 3; c++) {
    const ox = 3 + c * 72, oy = y2 + 7;
    cellFrame(ox, oy, 68, 56);
    paint(ox, oy + 51, 68, 1, NF1, 1); paint(ox, oy + 52, 68, 4, NF0, 1);
    const bx = ox + 2, by = oy + 3;
    if (c === 0) { stampM(rb, BOSS_PAL, bx, by); }
    else if (c === 1) {
      stampM(rb, BOSS_PAL, bx - 0 + 0, by, { tintFn: ghost(3, DK) });
      stampM(rb, BOSS_PAL, bx + 10, by);
    } else {
      stampM(rb, BOSS_PAL, bx - 2, by, { tintFn: ghost(2, '#12121a') });
      stampM(rb, BOSS_PAL, bx + 8, by, { tintFn: ghost(3, DK) });
      stampM(rb, BOSS_PAL, bx + 18, by);
    }
    text(['LAUNCH', 'TRAIL', 'FULL RUSH'][c], ox + 2, oy + 58, SUBC);
  }
  // detonation cells
  const y3 = y2 + 72;
  text('DETONATION CELLS - 72X52 - FLOOR ROW 48 - GROUNDED RED ECLIPSE', 3, y3, HEADC);
  FX.comboDetonation.forEach((f, c) => {
    const ox = 3 + c * 90;
    cellFrame(ox, y3 + 7, 74, 54, '#0d0a18');
    stampM(toGrid(f), BOSS_PAL, ox + 1, y3 + 8);
    paint(ox + 1, y3 + 8 + DG.FLOOR + 1, 72, 1, NF1, 1);
    text(['D0 FLASH', 'D1 BURST', 'D2 FRACTURE', 'D3 ASHFALL'][c], ox, y3 + 63, SUBC);
  });
  text('HALF DOME - RAYS UP AND FWD - SKITTERS RACE THE FLOOR - REPLACES THE OLD CIRCLE BLAST', 3, y3 + 70, SUBC);
  yCur = y3 + 78;
}

// ---------- readability + escalation band ----------
{
  const y = yCur;
  text('READABILITY - SPEED - WEIGHT - REACH - ECLIPSE ESCALATION', 3, y, HEADC);
  const rows = [['H1', 26, 8, 14, 0], ['H2', 16, 14, 22, 1], ['H3', 10, 10, 30, 2], ['H4', 8, 22, 26, 3]];
  rows.forEach(([n, sp, wt, rc, ec], i) => {
    const oy = y + 8 + i * 8;
    text(n, 3, oy, SUBC);
    paint(14, oy + 1, sp, 3, '#565c74', 1);
    paint(48, oy + 1, wt, 3, E1, 1);
    paint(80, oy + 1, rc, 3, '#3d4052', 1);
    for (let e = 0; e < ec; e++) paint(116 + e * 5, oy + 1, 3, 3, E3, 1);
  });
  text('SPEED', 14, y + 42, SUBC); text('WEIGHT', 48, y + 42, SUBC);
  text('REACH', 80, y + 42, SUBC); text('ECLIPSE', 116, y + 42, SUBC);
  // escalation strip: the 4 active moments side by side
  const picks = [['attack1', 2], ['attack2', 2], ['attack3', 1], ['attack4', 3]];
  picks.forEach(([c, fi], i) => stampM(toGrid(CLIPS[c][fi]), BOSS_PAL, 162 + i * 50, y + 6));
  text('ACTIVE MOMENTS - DARKER AND HOTTER LEFT TO RIGHT', 162, y + 56, SUBC);
  yCur = y + 64;
}

// ---------- tableaus ----------
function nightRoom(ox, oy, w, h, floorRel) {
  cellFrame(ox, oy, w, h, NW0);
  for (let y = 2; y < floorRel - 2; y += 7)
    for (let x = (y % 14 === 2 ? 4 : 9); x < w - 4; x += 17) paint(ox + x, oy + y, 6, 1, NW1, 1);
  const slit = (sx) => {
    paint(ox + sx, oy + 6, 5, 26, '#141826', 1);
    paint(ox + sx + 1, oy + 8, 3, 22, '#1b2438', 1);
    paint(ox + sx + 2, oy + 10, 1, 5, WINL, 0.55); paint(ox + sx + 2, oy + 18, 1, 3, WINL, 0.35);
  };
  slit(30); slit(Math.floor(w * 0.72));
  paint(ox, oy + floorRel, w, 1, NF1, 1);
  paint(ox, oy + floorRel + 1, w, h - floorRel - 1, NF0, 1);
  return oy + floorRel;
}
const T_W = 358, T_H = 70;
// tableau 1 — the wheel sweep vs the braced hero (true scale relationship)
{
  const oy = yCur;
  text('TABLEAU - HIT 2 SWEEP - HERO AT TRUE SCALE - HERO RIGHT', 3, oy, HEADC);
  const floorY = nightRoom(3, oy + 7, T_W, T_H, 58);
  const bx = 3 + 110, by = floorY - 47;
  stampM(toGrid(CLIPS.attack2[2]), BOSS_PAL, bx, by);
  const hx = 3 + 240, hy = floorY - 23;
  stampM(heroBase, HERO_PAL, hx, hy, { mir: true });
  yCur = oy + 84;
}
// tableau 2 — the finisher impact + live detonation
{
  const oy = yCur;
  text('TABLEAU - HIT 4 IMPACT + D1 BURST - HERO RIGHT', 3, oy, HEADC);
  const floorY = nightRoom(3, oy + 7, T_W, T_H, 58);
  const bx = 3 + 70, by = floorY - 47;
  stampM(toGrid(CLIPS.attack4[3]), BOSS_PAL, bx, by);
  const dg = toGrid(FX.comboDetonation[1]);
  stampM(dg, BOSS_PAL, bx + 30, floorY - DG.FLOOR - 1);
  const hx = 3 + 250, hy = floorY - 23;
  stampM(heroBase, HERO_PAL, hx, hy, { mir: true });
  yCur = oy + 84;
}

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
fs.writeFileSync(__dirname+'/combo_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- JS-literal dump ----------
let js = '// === STAGE 8A-0 — BOSS BASIC COMBO REDESIGN (BOSS_REDESIGN_PALETTE keys) ===\n';
js += '// Body clips 46x48 — DROP-IN replacements for the same names in BOSS_REDESIGN_SPRITES.\n';
js += '// attack1 RISING REND 4f / attack2 ECLIPSE WHEEL 4f / attack3 UMBRAL ORB 3f /\n';
js += '// attack4 ECLIPSE BREAKER 5f. See combo_spec.md for holds + integration seams.\n';
for (const n of Object.keys(CLIPS)) {
  js += `  ${n}: [\n`;
  for (const f of CLIPS[n]) js += '    [' + f.map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
}
js += '// Effect grids (boss keys). comboOrb 23x23 centre 11,11 — replaces the Dark\n';
js += '// Flame visual on kind===flame projectiles. comboDetonation 72x52 centre 38,34\n';
js += '// floor row 48 — replaces the drawExplosion visual on kind===explosion.\n';
for (const n of Object.keys(FX)) {
  js += `  ${n}: [\n`;
  for (const f of FX[n]) js += '    [' + f.map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
}
fs.writeFileSync(__dirname + '/combo_literal.txt', js);

// round-trip parse assert
{
  const t = fs.readFileSync(__dirname + '/combo_literal.txt', 'utf8');
  const m = t.match(/"[.0-9a-h]{23,72}"/g);
  if (!m || m.length !== 16 * 48 + 4 * 23 + 4 * 52) throw new Error('literal round-trip: ' + (m && m.length));
}

console.log('wrote combo_v1.png', IW + 'x' + IH,
  '| clips:', Object.keys(CLIPS).map(n => `${n}(${CLIPS[n].length})`).join(' '),
  '| fx:', Object.keys(FX).map(n => `${n}(${FX[n].length})`).join(' '),
  '| validation clean');
