// HERO COMBO — "DAYBREAK CHAIN" (Stage 8B-1, concept — nothing wired into src/).
// Redesign of the Hero's direct sword combo, built on the approved Stage 8B-0
// HERO LIGHT ECLIPSE language. The current in-game Dawnguard Knight (30x24,
// hero_matrix.txt) is the base body; every frame is a re-pose of it on a larger
// 44x34 canvas (feet stay on the last row -> drawSprite's centerX/feet-bottom
// anchor self-solves at runtime, no code change needed for the bigger canvas).
//
// THE CHAIN (maps 1:1 onto the LIVE Enemy.js COMBO.HITS 4-hit FSM — zero
// gameplay / timing / hitbox change; per-hit frames are phase-indexable off
// _comboIndex/_comboPhase/_comboPhaseTimer exactly like the boss 8A-2 port):
//
//   H1 FIRST LIGHT   one-hand descending shear. STEEL smear only + a single
//                    white edge glint — the eclipse is still asleep.
//   H2 GILDED CREST  one-hand rising backhand crescent. Gold enters the smear
//                    (W/I/y band, warm belly rim); the first motes RISE.
//   H3 SUNPIERCE     two-hand lunging THRUST — breaks the swing rhythm.
//                    Radiant lance smear + IMPACT star at the tip.
//   H4 SOLSTICE      two-hand rising full-moon LAUNCHER (the inverse of the
//                    boss's downward Eclipse Breaker): ground-glint gather ->
//                    tip ignite -> full-moon crescent + big impact -> HALO
//                    SNAP peak with rising motes -> settle seam back to idle.
//
// ECLIPSE ESCALATION LAW (asserted): LIGHT-key px on the HIT frames grows
// strictly H1 < H2 < H3 < H4, and H1 carries a glint only (<= 6 LIGHT px).
// The sword stays the star: effects ride the blade path; front accents may
// cover at most 6 body px per frame (asserted).
//
// Emits: hero_combo_v1.png (production sheet) + hero_combo_literal.txt
// (drop-in heroCombo1..4 clips, effects BAKED into the frames).
const fs = require('fs');
const zlib = require('zlib');

// ---------- palettes ----------
// LIGHT ECLIPSE ramp (locked in 8B-0; warm law R >= G >= B — blue cannot exist).
const LIGHT = {
  'W': '#fffdf4',   // white core / glints
  'I': '#f2e6bf',   // ivory transition / motes
  'y': '#f2c94e',   // radiant gold / corona / ray body
  'o': '#e0a93c',   // warm gold / trailing rim / teeth
  'G': '#c9962e',   // deep gold / tips (== hero key g)
  'u': '#8a6420',   // bronze / fade motes (== throne gold dark)
};
const HERO_PAL = {
  '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
  'n': '#141c30', 'm': '#1c2438', 'l': '#7fd4ff', 'L': '#b8ecff', 'g': '#c9962e',
};
const COMBO_PAL = { ...HERO_PAL, ...LIGHT };     // composed frames resolve here
const BOSS_PAL = {
  '0': '#08080c', '1': '#12121a', '2': '#1c1d28', '3': '#2a2c3a', '4': '#3d4052', '5': '#565c74',
  'a': '#6e0f1c', 'b': '#a8182a', 'c': '#e0263a', 'd': '#ff5a4a', 'g': '#3a1014', 'h': '#571820',
};
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';

// ---------- load approved art ----------
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
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const BW = heroBase[0].length, BH = heroBase.length;          // 30 x 24
const BOSS_IDLE = loadClips('walk2_literal.txt', ['idle']).idle;
const toGrid = f => f.map(r => r.split(''));
const stringify = g => g.map(r => r.join(''));

// ---------- authoring canvas ----------
// 44x34. Base hero pasted at (7,10) so the body keeps the same offset from the
// grid center col as on the 30-wide base (aimDir mirror behaves identically);
// feet/shadow land on rows 32/33 (row 33 = last row -> feet-bottom anchor holds).
const GW = 44, GH = 34, OX = 7, OY = 10;
const FLOOR = 33;                 // shadow row (last)
const SHO = [21, 22];             // near (sword) shoulder pivot, canvas coords
const HIP = 24;                   // upper/lower body divide (base 14 + OY)

const mkGrid = (w = GW, h = GH) => Array.from({ length: h }, () => Array(w).fill('.'));
const put = (g, x, y, k) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length) g[y][x] = k; };
const putB = (g, x, y, k) => { if (y >= 0 && y < g.length && x >= 0 && x < g[0].length && g[y][x] === '.') g[y][x] = k; };
const rnd = (i, s) => { const v = Math.sin(i * 127.1 + s * 311.7) * 43758.5453; return v - Math.floor(v); };
const R = Math.round, RAD = d => d * Math.PI / 180;

function lineC(g, x0, y0, x1, y1, k, thick) {
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, x = x0, y = y0;
  for (;;) {
    put(g, x, y, k); if (thick) put(g, x, y + 1, k);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err; if (e2 > -dy) { err -= dy; x += sx; } if (e2 < dx) { err += dx; y += sy; }
  }
}
function ringC(g, cx, cy, r, k, opts = {}) {
  const { dash = 0, phase = 0, arcFrom = -Math.PI - 0.01, arcTo = Math.PI + 0.01, behind = true } = opts;
  const steps = Math.max(16, Math.ceil(Math.PI * 2 * r * 1.5));
  const setter = behind ? putB : put;
  for (let i = 0; i < steps; i++) {
    const a = -Math.PI + i / steps * 2 * Math.PI;
    if (a < arcFrom || a > arcTo) continue;
    if (dash) { const seg = Math.floor(((a + Math.PI) / (2 * Math.PI)) * dash + phase); if (((seg % 2) + 2) % 2) continue; }
    setter(g, R(cx + Math.cos(a) * r), R(cy + Math.sin(a) * r), k);
  }
}
function spark(g, x, y, s = 1, core = 'W', arm = 'y') {
  put(g, x, y, core);
  for (let i = 1; i <= s; i++) { put(g, x + i, y, arm); put(g, x - i, y, arm); put(g, x, y + i, arm); put(g, x, y - i, arm); }
}

// ---------- body toolkit (re-poses of the approved base — house idioms) ----------
function baseBody() {
  const g = mkGrid();
  heroBase.forEach((row, y) => row.forEach((k, x) => { if (k !== '.') g[y + OY][x + OX] = k; }));
  return g;
}
function cut(g, x0, y0, x1, y1) {
  const c = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= GH || x < 0 || x >= GW) continue;
    if (g[y][x] !== '.') { c.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return c;
}
function paste(g, cells, dx, dy) {
  for (const [x, y, k] of cells) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < GW && ny >= 0 && ny < GH) g[ny][nx] = k; }
}
function moveUpper(g, dx, dy) {
  if (!dx && !dy) return g;
  const out = mkGrid();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (g[y][x] === '.') continue;
    if (y <= HIP) { const ny = y + dy, nx = x + dx; if (ny >= 0 && ny < GH && nx >= 0 && nx < GW) out[ny][nx] = g[y][x]; }
    else out[y][x] = g[y][x];
  }
  return out;
}
// cape: base cols 3-9 rows 10-19 -> canvas cols 10-16 rows 20-29
function capeFlow(g, dx, dy) { paste(g, cut(g, 10, 20, 16, 29), dx, dy); return g; }
// legs: BACK cols 17-19, FRONT cols 21-23 (canvas); feet rows stay 32/33 (dy=0)
function lunge(g, fwd, back) {
  paste(g, cut(g, 21, 27, 23, FLOOR), fwd, 0);
  if (back) paste(g, cut(g, 17, 27, 19, FLOOR), -back, 0);
}
// erase the whole sword arm + blade (base rows 12-18, cols 17-29) — torso never
// nicked. MUST run on the un-posed body BEFORE moveUpper/capeFlow, or a vertical
// lean carries base blade px out of the fixed erase window (P4 leftover bug).
function eraseBlade(g) { for (let y = 22; y <= 28; y++) for (let x = 24; x <= 36; x++) g[y][x] = '.'; }
// steel blade with the hero's OWN cold-blue glow edge (character accent, not
// the effect — the Light Eclipse carries the gold; the blade keeps its blue).
function drawSword(g, sho, hx, hy, angleDeg, reach, opts = {}) {
  const { twoHand = false } = opts;
  if (twoHand) lineC(g, sho[0] - 2, sho[1] + 1, hx - 1, hy + 1, '1', false);   // far arm (dark)
  lineC(g, sho[0], sho[1], hx, hy, '2', true);                                  // near forearm
  put(g, hx, hy, '3'); put(g, hx - 1, hy, '3'); put(g, hx, hy + 1, '1');        // fist
  const a = RAD(angleDeg), dx = Math.cos(a), dy = Math.sin(a), px = -dy, py = dx;
  const gx = hx + dx, gy = hy + dy;
  for (let s = -1; s <= 1; s++) put(g, R(gx + px * s), R(gy + py * s), s === 0 ? 'l' : '1'); // guard + gem
  for (let i = 2; i <= reach; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i);
    put(g, bx, by, '4');                                                        // steel core
    put(g, R(bx + px), R(by + py), 'l');                                        // cold-blue glow side
    put(g, R(bx - px), R(by - py), '3');                                        // dark side
  }
  put(g, R(hx + dx * (reach + 1)), R(hy + dy * (reach + 1)), 'L');              // bright tip
  return [R(hx + dx * reach), R(hy + dy * reach)];                              // tip cell
}

// ---------- effect toolkit (fx layers, LIGHT + steel keys only) ----------
// arc smear: angle-stepped crescent band around a pivot. Leading (newest) end
// = a1. Cross-section walks the ramp outer->inner; thickness grows toward the
// blade and tapers at the very head. Clamped above the floor; `skim` drops
// warm ticks where the arc crossed the ground (H4's blade tears out of it).
function arcSmear(fx, px0, py0, r, a0deg, a1deg, ramp, opts = {}) {
  const { maxW = 3, broken = false, dim = false, belly = null, skim = false } = opts;
  const DIM = { W: 'I', I: 'y', y: 'o', o: 'G', G: 'u', '5': '3', '4': '2', '3': '2', '2': '1' };
  const K = k => (dim ? (DIM[k] || k) : k);
  const a0 = RAD(a0deg), a1 = RAD(a1deg);
  const steps = Math.ceil(Math.abs(a1 - a0) * r * 1.7);
  const skimmed = new Set();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, a = a0 + (a1 - a0) * t;
    if (broken && (i % 9 < 4)) continue;
    const w = Math.max(1, R(maxW * (0.30 + 0.70 * Math.sin(Math.min(1, t * 1.12) * Math.PI * 0.58))));
    for (let j = 0; j < w; j++) {
      const rr = r - j;
      const x = R(px0 + Math.cos(a) * rr), y = R(py0 + Math.sin(a) * rr);
      if (y >= FLOOR - 1) { if (skim) skimmed.add(x); continue; }               // ground clamp
      let k = ramp[Math.min(ramp.length - 1, j)];
      if (t < 0.22) k = DIM[k] || k;                                            // tail cools a step
      putB(fx, x, y, K(k));
    }
    if (belly && t > 0.35 && t < 0.72 && rnd(i, 7) < 0.4) {
      const rr = r - w;
      const x = R(px0 + Math.cos(a) * rr), y = R(py0 + Math.sin(a) * rr);
      if (y < FLOOR - 1) putB(fx, x, y, K(belly));
    }
  }
  let n = 0;
  for (const x of [...skimmed].sort((p, q) => p - q)) {
    if (n++ % 2) continue;                                                       // sparse ground-skim ticks
    putB(fx, x, FLOOR - 1, K('o')); if (rnd(x, 13) < 0.5) putB(fx, x + 1, FLOOR, K('u'));
  }
}
// radiant lance smear for the thrust. The blade band itself occupies rows
// yRow-1..yRow+1, so the light rides VISIBLE speed lines above and below it,
// plus launch streaks trailing behind the back — never hidden by the blade.
function lanceSmear(fx, x0, x1, yRow, opts = {}) {
  const { dissolve = false } = opts;
  if (dissolve) {
    for (let x = x0; x <= x1; x++) {
      if ((x % 3) !== 1) continue;
      putB(fx, x, yRow - 3, (x % 2) ? 'o' : 'G');
      putB(fx, x + 1, yRow + 3, 'u');
    }
    for (let i = 0; i < 3; i++) putB(fx, 11 + i * 3, yRow - 3 + i * 3, 'u');
    return;
  }
  for (let x = x0; x <= x1; x++) {                                               // 1px air gap off the blade band
    putB(fx, x, yRow - 3, x % 4 === 3 ? 'I' : 'W');                              // hot upper speed line
    if (x % 2 === 0) putB(fx, x, yRow - 4, 'y');                                 // gold rim above
    putB(fx, x, yRow + 3, x % 4 === 1 ? 'y' : 'I');                              // lower speed line
    if (x % 3 === 0) putB(fx, x, yRow + 4, 'o');                                 // warm rim below
  }
  putB(fx, x1 + 1, yRow - 3, 'W'); putB(fx, x1 + 2, yRow - 2, 'W');              // beam head fan
  putB(fx, x1 + 1, yRow + 3, 'y');
  for (let i = 0; i < 3; i++) {                                                  // launch streaks past the back
    for (let d = 0; d < 3; d++) putB(fx, 10 + i * 2 + d, yRow - 4 + i * 4, i === 1 ? 'y' : 'o');
  }
}
// compact 4-point IMPACT star (the 8B-0 P1 language at accent size)
function impactStar(fx, cx, cy, big = false) {
  const len = big ? 4 : 3;
  put(fx, cx, cy, 'W');
  if (big) { put(fx, cx + 1, cy, 'W'); put(fx, cx, cy + 1, 'W'); put(fx, cx + 1, cy + 1, 'W'); }
  [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => {
    for (let i = 1; i <= len; i++) put(fx, cx + d[0] * i, cy + d[1] * i, i === 1 ? 'W' : (i === len ? 'o' : 'y'));
    if (big) put(fx, cx + d[0] * (len + 2), cy + d[1] * (len + 2), 'G');
  });
  const dd = big ? 3 : 2;
  [[dd, dd], [-dd, dd], [dd, -dd], [-dd, -dd]].forEach(([dx, dy]) => put(fx, cx + dx, cy + dy, 'o'));
}
// HALO SNAP ring (8B-0 H0 language) around the body for the finisher peak
function haloSnap(fx, cx, cy, r) {
  ringC(fx, cx, cy, r, 'y');
  ringC(fx, cx, cy, r - 2.5, 'I', { dash: 12, phase: 0.5 });
  [[0, -r], [0, r], [-r, 0], [r, 0]].forEach(([dx, dy]) => put(fx, cx + dx, cy + dy, 'W'));
  put(fx, cx, cy - r - 2, 'W'); put(fx, cx, cy + r + 2, 'W');                    // N/S snap ticks
}
// underfoot ground glint (the GROUND HALO hint — cast/charge language)
function groundGlint(fx, cx, hot) {
  [[-6, 0], [-3, -1], [0, -1], [3, -1], [6, 0]].forEach(([dx, dy], i) =>
    putB(fx, cx + dx, FLOOR + dy, i % 2 ? 'o' : 'y'));
  if (hot) { putB(fx, cx, FLOOR, 'W'); putB(fx, cx - 8, FLOOR, 'u'); putB(fx, cx + 8, FLOOR, 'u'); }
}
// converging gather motes (CYCLE grammar micro-dose) toward a point
function gatherMotes(fx, tx, ty, pts) {
  pts.forEach(([dx, dy], i) => put(fx, tx + dx, ty + dy, i === 0 ? 'y' : (i === 1 ? 'G' : 'u')));
}

// ---------- frame factory ----------
function makeFrame(o) {
  let body = baseBody();
  eraseBlade(body);                                     // un-posed coords — see note above
  if (o.lunge) lunge(body, o.lunge[0], o.lunge[1]);
  if (o.lean) body = moveUpper(body, o.lean[0], o.lean[1]);
  if (o.cape) capeFlow(body, o.cape[0], o.cape[1]);
  const sho = [SHO[0] + (o.lean ? o.lean[0] : 0), SHO[1] + (o.lean ? o.lean[1] : 0)];
  const tip = drawSword(body, sho, o.hand[0], o.hand[1], o.angle, o.reach, { twoHand: !!o.twoHand });
  const fxB = mkGrid(), fxF = mkGrid(), meta = { motes: [], tip };
  if (o.fx) o.fx(fxB, fxF, meta);
  return { body, fxB, fxF, meta, tag: o.tag, phase: o.phase, hold: o.hold };
}
const mote = (fx, meta, x, y, k) => { put(fx, x, y, k); meta.motes.push([x, y]); };

// =====================================================================
// THE FOUR HITS
// =====================================================================
const COMBO = [];

// ---- H1 FIRST LIGHT — one-hand descending shear (steel + a single glint) ----
COMBO.push({
  name: 'H1 FIRST LIGHT', hands: 1,
  arc: 'HIGH REAR TO LOW FRONT', eclipse: 'GLINT ONLY - THE LIGHT IS ASLEEP',
  frames: [
    makeFrame({ tag: 'W1 GLINT', phase: 'WINDUP 5', hold: 5,
      lean: [-1, 0], cape: [1, 0], hand: [24, 16], angle: -70, reach: 11,
      fx: (b, f) => { put(f, 26, 10, 'W'); put(f, 27, 7, 'W'); put(f, 30, 9, 'y'); } }),
    makeFrame({ tag: 'A1A SHEAR', phase: 'ACTIVE 4 EARLY', hold: 2,
      lean: [1, 0], hand: [26, 19], angle: -30, reach: 12,
      fx: (b) => arcSmear(b, 21, 20, 16, -98, -38, ['5', '4', '3'], { maxW: 2 }) }),
    makeFrame({ tag: 'A1B HIT', phase: 'ACTIVE 4 LATE - HOLD', hold: 2,
      lean: [2, 0], cape: [-1, -1], lunge: [1, 0], hand: [26, 23], angle: 35, reach: 12,
      fx: (b, f) => {
        arcSmear(b, 21, 20, 16, -98, 26, ['5', '4', '3'], { maxW: 3, belly: '2' });
        put(f, 36, 12, 'W'); put(f, 37, 14, 'W');                       // the single apex glint
      } }),
    makeFrame({ tag: 'L1 FOLLOW', phase: 'LINK 7', hold: 7,
      lean: [1, 0], hand: [26, 23], angle: 30, reach: 11,
      fx: (b) => arcSmear(b, 21, 20, 16, -80, 20, ['4', '3'], { maxW: 2, broken: true, dim: true }) }),
  ],
});

// ---- H2 GILDED CREST — one-hand rising backhand (gold enters, motes rise) ----
COMBO.push({
  name: 'H2 GILDED CREST', hands: 1,
  arc: 'LOW FRONT RISING OVERHEAD', eclipse: 'GOLD ENTERS THE SMEAR - FIRST MOTES RISE',
  frames: [
    makeFrame({ tag: 'W2 DIP', phase: 'WINDUP 3', hold: 3,
      lean: [0, 1], hand: [24, 24], angle: 45, reach: 10,
      fx: (b, f) => { put(f, 32, 30, 'y'); put(f, 30, 29, 'W'); } }),
    makeFrame({ tag: 'A2A SHEAR', phase: 'ACTIVE 4 EARLY', hold: 2,
      lean: [1, 0], hand: [26, 20], angle: -15, reach: 12,
      fx: (b) => arcSmear(b, 21, 18, 15, 46, -6, ['W', 'I', 'y'], { maxW: 2 }) }),
    makeFrame({ tag: 'A2B HIT', phase: 'ACTIVE 4 LATE - HOLD', hold: 2,
      lean: [1, -1], cape: [-1, 1], lunge: [1, 0], hand: [24, 14], angle: -60, reach: 12,
      fx: (b, f, m) => {
        arcSmear(b, 21, 18, 15, 42, -56, ['W', 'I', 'y'], { maxW: 3, belly: 'o' });
        mote(f, m, 33, 8, 'I'); mote(f, m, 30, 5, 'y');
      } }),
    makeFrame({ tag: 'L2 FLOAT', phase: 'LINK 7', hold: 7,
      lean: [0, -1], hand: [23, 14], angle: -68, reach: 11,
      fx: (b, f, m) => {
        arcSmear(b, 21, 18, 15, 30, -56, ['W', 'I', 'y'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 33, 4, 'I'); mote(f, m, 30, 2, 'u');
      } }),
  ],
});

// ---- H3 SUNPIERCE — two-hand lunging thrust (radiant lance + impact star) ----
COMBO.push({
  name: 'H3 SUNPIERCE', hands: 2,
  arc: 'STRAIGHT LUNGING THRUST', eclipse: 'RADIANT LANCE SMEAR + IMPACT STAR AT THE TIP',
  frames: [
    makeFrame({ tag: 'W3 COIL', phase: 'WINDUP 3', hold: 3,
      lean: [-2, 0], cape: [1, 0], hand: [20, 22], angle: -4, reach: 11, twoHand: true,
      fx: (b, f, m) => { gatherMotes(f, m.tip[0], m.tip[1], [[3, -1], [2, 2], [5, 0]]); put(f, m.tip[0], m.tip[1], 'W'); } }),
    makeFrame({ tag: 'A3A DRIVE', phase: 'ACTIVE 4 EARLY', hold: 2,
      lean: [2, 0], lunge: [3, 2], hand: [25, 21], angle: -2, reach: 12, twoHand: true,
      fx: (b) => { lanceSmear(b, 26, 34, 21); } }),
    makeFrame({ tag: 'A3B HIT', phase: 'ACTIVE 4 LATE - HOLD', hold: 2,
      lean: [3, 1], cape: [-2, 0], lunge: [4, 2], hand: [27, 22], angle: -3, reach: 13, twoHand: true,
      fx: (b, f) => {
        lanceSmear(b, 23, 37, 22);
        impactStar(f, 40, 18, false);
      } }),
    makeFrame({ tag: 'L3 RECOIL', phase: 'LINK 8', hold: 8,
      lean: [1, 0], lunge: [3, 2], hand: [26, 22], angle: -3, reach: 12, twoHand: true,
      fx: (b, f, m) => {
        lanceSmear(b, 25, 36, 22, { dissolve: true });
        mote(f, m, 33, 17, 'I'); mote(f, m, 37, 16, 'u');
      } }),
  ],
});

// ---- H4 SOLSTICE — two-hand rising full-moon launcher (the eclipse moment) ----
COMBO.push({
  name: 'H4 SOLSTICE', hands: 2,
  arc: 'GROUND REAR RISING FULL MOON - LAUNCHER', eclipse: 'FULL CRESCENT + HALO SNAP + BIG IMPACT + RISING MOTES',
  frames: [
    makeFrame({ tag: 'W4A COIL', phase: 'WINDUP 6 EARLY', hold: 3,
      lean: [-1, 2], cape: [0, 1], hand: [19, 25], angle: 142, reach: 11, twoHand: true,
      fx: (b, f, m) => {
        groundGlint(b, 21, false);
        gatherMotes(f, m.tip[0], m.tip[1], [[-2, -3], [3, -2], [-4, 1]]);
      } }),
    makeFrame({ tag: 'W4B IGNITE', phase: 'WINDUP 6 LATE', hold: 3,
      lean: [0, 2], cape: [0, 1], hand: [19, 25], angle: 140, reach: 11, twoHand: true,
      fx: (b, f, m) => {
        groundGlint(b, 21, true);
        put(f, m.tip[0], m.tip[1], 'W'); put(f, m.tip[0] + 1, m.tip[1] - 1, 'W');
        put(f, m.tip[0] - 1, m.tip[1] - 1, 'I'); put(f, m.tip[0] + 1, m.tip[1] + 1, 'I');
      } }),
    makeFrame({ tag: 'A4A ASCENT', phase: 'ACTIVE 6 EARLY', hold: 3,
      lean: [1, 0], lunge: [2, 1], hand: [25, 22], angle: 25, reach: 12, twoHand: true,
      fx: (b) => arcSmear(b, 21, 17, 15, 140, 30, ['W', 'I', 'y'], { maxW: 3, skim: true }) }),
    makeFrame({ tag: 'A4B HIT', phase: 'ACTIVE 6 LATE - HOLD', hold: 3,
      lean: [1, -2], cape: [-2, 2], lunge: [2, 1], hand: [24, 15], angle: -70, reach: 13, twoHand: true,
      fx: (b, f, m) => {
        arcSmear(b, 21, 17, 15, 140, -62, ['W', 'I', 'y', 'o'], { maxW: 4, belly: 'G', skim: true });
        impactStar(f, 35, 12, true);
        mote(f, m, 26, 2, 'I'); mote(f, m, 31, 4, 'y');
        put(f, 38, 7, 'W');                                              // detached tip glint
      } }),
    makeFrame({ tag: 'P4 PEAK', phase: 'LINK 10 EARLY', hold: 5,
      lean: [0, -1], hand: [26, 13], angle: -100, reach: 12,
      fx: (b, f, m) => {
        haloSnap(b, 20, 16, 11);
        arcSmear(b, 21, 17, 15, -20, -62, ['y', 'o', 'G'], { maxW: 2, broken: true, dim: true });
        mote(f, m, 27, 1, 'u'); mote(f, m, 32, 2, 'I');
      } }),
    makeFrame({ tag: 'S4 SETTLE', phase: 'LINK 10 LATE - SEAM', hold: 5,
      cape: [-1, 0], hand: [25, 23], angle: 20, reach: 11,
      fx: (b, f, m) => {
        ringC(b, 20, 16, 11, 'G', { dash: 10, phase: 0.5, arcFrom: -Math.PI, arcTo: 0 });
        mote(f, m, 24, 1, 'u');
      } }),
  ],
});

// ---------- compose ----------
function compose(fr) {
  const g = mkGrid();
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++) {
    if (fr.fxB[y][x] !== '.') g[y][x] = fr.fxB[y][x];
    if (fr.body[y][x] !== '.') g[y][x] = fr.body[y][x];
    if (fr.fxF[y][x] !== '.') g[y][x] = fr.fxF[y][x];
  }
  return g;
}
COMBO.forEach(hit => hit.frames.forEach(fr => { fr.grid = compose(fr); }));

// =====================================================================
// VALIDATION (throws on violation)
// =====================================================================
let vErr = 0;
const fail = (...m) => { console.error('FAIL', ...m); vErr++; };
// warm law on the LIGHT ramp
for (const [k, hex] of Object.entries(LIGHT)) {
  const [r, g2, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
  if (!(r >= g2 && g2 >= b)) fail('warm law', k, hex);
}
const LK = new Set(Object.keys(LIGHT));
const FXKEYS = new Set([...LK, '5', '4', '3', '2', '1', '.']);   // effects: LIGHT + neutral steel
const ALLKEYS = new Set([...Object.keys(COMBO_PAL), '.']);
const baseCount = heroBase.flat().filter(k => k !== '.').length;
let frameIdx = 0;
COMBO.forEach((hit, hi) => hit.frames.forEach((fr, fi) => {
  const id = `${hit.name} ${fr.tag}`;
  // sizes + legal keys
  if (fr.grid.length !== GH || fr.grid.some(r => r.length !== GW)) fail('size', id);
  fr.grid.flat().forEach(k => { if (!ALLKEYS.has(k)) fail('key', id, k); });
  // fx layers: LIGHT + neutral steel only — never the hero blues / gold key
  [fr.fxB, fr.fxF].forEach((fx, li) => fx.flat().forEach(k => {
    if (!FXKEYS.has(k)) fail('fx key', id, li ? 'front' : 'back', k);
  }));
  // grounded: feet/shadow present on the floor rows
  const feet = fr.grid.slice(FLOOR - 1).flat().filter(k => k !== '.').length;
  if (feet < 6) fail('feet missing', id, feet);
  // body sanity: repose conserves mass (no accidental erase)
  const bodyCount = fr.body.flat().filter(k => k !== '.').length;
  if (bodyCount < baseCount * 0.8 || bodyCount > baseCount * 1.35) fail('body mass', id, bodyCount, 'base', baseCount);
  // front accents may cover at most 6 body px (the sword stays the star)
  let cover = 0;
  for (let y = 0; y < GH; y++) for (let x = 0; x < GW; x++)
    if (fr.fxF[y][x] !== '.' && fr.body[y][x] !== '.') cover++;
  if (cover > 6) fail('body cover', id, cover);
  frameIdx++;
}));
// eclipse escalation law: LIGHT px on the HIT frames strictly grows; H1 glint only
const lightCount = fr => {
  let n = 0;
  [fr.fxB, fr.fxF].forEach(fx => fx.flat().forEach(k => { if (LK.has(k)) n++; }));
  return n;
};
const hitFrames = [COMBO[0].frames[2], COMBO[1].frames[2], COMBO[2].frames[2], COMBO[3].frames[3]];
const esc = hitFrames.map(lightCount);
if (!(esc[0] < esc[1] && esc[1] < esc[2] && esc[2] < esc[3])) fail('escalation', esc.join(' '));
if (esc[0] > 6) fail('H1 not glint-only', esc[0]);
// motes RISE between HIT and follow frames (H2, H4)
const meanY = pts => pts.reduce((s, p) => s + p[1], 0) / pts.length;
if (!(meanY(COMBO[1].frames[3].meta.motes) < meanY(COMBO[1].frames[2].meta.motes))) fail('H2 motes not rising');
if (!(meanY(COMBO[3].frames[4].meta.motes) < meanY(COMBO[3].frames[3].meta.motes))) fail('H4 motes not rising');
// H3 dissolve thins
if (!(lightCount(COMBO[2].frames[3]) < lightCount(COMBO[2].frames[2]))) fail('H3 dissolve not thinning');
// S4 settle seam: sword tip back near the idle carry tip (base tip ~ (36,27))
{
  const tip = COMBO[3].frames[5].meta.tip;
  if (Math.abs(tip[0] - 36) > 3 || Math.abs(tip[1] - 27) > 3) fail('S4 seam tip', tip);
}
// two-hand law: H1/H2 one hand, H3/H4 two hands (authored flags)
if (vErr) throw new Error('validation failed: ' + vErr);

// =====================================================================
// SHEET
// =====================================================================
const SW = 580, SH = 910, SCALE = 4;
const G = Array.from({ length: SH }, () => Array(SW).fill(null));
const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
function paint(x, y, w, h, hexc, a = 1) {
  const src = hex2rgb(hexc);
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
  const { mir = false, s = 1 } = opts;
  const mw = m[0].length;
  m.forEach((row, y) => { for (let x = 0; x < row.length; x++) {
    const k = row[x]; if (k === '.' || k === ' ' || !pal[k]) continue;
    const px = mir ? ox + (mw - 1 - x) * s : ox + x * s;
    paint(px, oy + y * s, s, s, pal[k], 1);
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
const HEADC = '#8d84a8', SUBC = '#4a4560', GOLDC = '#c9962e';

// ---------- header + palettes ----------
text('HERO COMBO - DAYBREAK CHAIN - 4-HIT DIRECT SWORD REDESIGN - STRICT PIXEL ART', 3, 2, HEADC);
text('THE DAWNGUARD KNIGHT REBUILT FROM BASIC UP-DOWN SWINGS INTO AN EXPRESSIVE CHAIN. THE LIGHT ECLIPSE', 3, 9);
text('RISES ACROSS THE COMBO - STEEL GLINT - GILDED SMEAR - RADIANT LANCE - FULL SOLSTICE. SWORD IS THE STAR.', 3, 15);
text('MAPS 1 TO 1 ONTO THE LIVE 4-HIT MELEE FSM - WINDUP - ACTIVE - LINK PER HIT - ZERO GAMEPLAY CHANGE', 3, 23, HEADC);
(() => {
  const keys = ['W', 'I', 'y', 'o', 'G', 'u'];
  const roles = ['CORE', 'IVORY', 'RADIANT', 'WARM', 'DEEP', 'BRONZE'];
  keys.forEach((k, i) => {
    const x = 3 + i * 34;
    cellFrame(x, 30, 30, 10, LIGHT[k]);
    text(k, x + 1, 43, '#6d6488'); text(roles[i], x + 6, 43, SUBC);
  });
  text('LIGHT ECLIPSE RAMP - LOCKED IN 8B-0 - WARM LAW R OVER G OVER B - NO BLUE - NO NEW COLORS', 213, 32);
  text('BODY STAYS IN HERO KEYS - THE BLADE KEEPS ITS OWN COLD-BLUE GLOW - CHARACTER NOT EFFECT', 213, 39);
  text('CANVAS 44X34 - HERO BASE AT 7.10 - FEET ROW 33 - FEET-BOTTOM CENTER ANCHOR SELF-SOLVES', 213, 45);
})();

// ---------- full-sequence overview (2 rows of 9) ----------
let Y = 56;
text('FULL CHAIN - 18 FRAMES - PHASE-INDEXED OFF THE LIVE FSM FIELDS - HOLDS AT 60FPS', 3, Y, HEADC);
(() => {
  const all = [];
  COMBO.forEach((hit, hi) => hit.frames.forEach(fr => all.push({ fr, hi })));
  const oy0 = Y + 8;
  all.forEach(({ fr, hi }, i) => {
    const row = Math.floor(i / 9), col = i % 9;
    const x = 3 + col * 64, y = oy0 + row * 52;
    cellFrame(x, y, GW, GH, '#100d1c');
    stampM(fr.grid, COMBO_PAL, x, y);
    text('H' + (hi + 1), x, y + GH + 3, GOLDC);
    text(fr.tag.split(' ')[0], x + 12, y + GH + 3, SUBC);
  });
})();
Y += 8 + 2 * 52 + 8;

// ---------- per-hit bands (2x) ----------
COMBO.forEach((hit, hi) => {
  text(hit.name + ' - ' + hit.arc + (hit.hands === 2 ? ' - TWO HANDS' : ' - ONE HAND'), 3, Y, HEADC);
  text('ECLIPSE - ' + hit.eclipse, 3, Y + 7, GOLDC);
  const oy = Y + 15;
  hit.frames.forEach((fr, fi) => {
    const x = 3 + fi * 94;
    cellFrame(x, oy, GW * 2, GH * 2, '#100d1c');
    stampM(fr.grid, COMBO_PAL, x, oy, { s: 2 });
    text(fr.tag, x, oy + GH * 2 + 3, SUBC);
    text(fr.phase, x, oy + GH * 2 + 9, '#3a3550');
  });
  Y = oy + GH * 2 + 18;
});

// ---------- smear anatomy band (fx layers only, 2x) ----------
text('SMEAR AND TRAIL LOGIC - EFFECT LAYERS ISOLATED - HIT FRAMES - ALL SET BEHIND THE BODY', 3, Y, HEADC);
(() => {
  const oy = Y + 8;
  const rows = [
    [COMBO[0].frames[2], 'H1 STEEL SMEAR + GLINT'],
    [COMBO[1].frames[2], 'H2 GOLD CRESCENT'],
    [COMBO[2].frames[2], 'H3 RADIANT LANCE + STAR'],
    [COMBO[3].frames[3], 'H4 FULL MOON + IMPACT'],
  ];
  rows.forEach(([fr, cap], i) => {
    const x = 3 + i * 94;
    cellFrame(x, oy, GW * 2, GH * 2, '#100d1c');
    const fxOnly = mkGrid();
    for (let y = 0; y < GH; y++) for (let x2 = 0; x2 < GW; x2++) {
      if (fr.fxB[y][x2] !== '.') fxOnly[y][x2] = fr.fxB[y][x2];
      if (fr.fxF[y][x2] !== '.') fxOnly[y][x2] = fr.fxF[y][x2];
    }
    stampM(fxOnly, COMBO_PAL, x, oy, { s: 2 });
    text(cap, x, oy + GH * 2 + 3, SUBC);
  });
  const nx = 3 + 4 * 94;
  text('ANATOMY -', nx, oy, HEADC);
  text('LEADING EDGE W - BODY I -', nx, oy + 8);
  text('INNER Y - BELLY RIM O -', nx, oy + 14);
  text('SPARSE G BREAKUP', nx, oy + 20);
  text('H1 STAYS STEEL 5-4-3', nx, oy + 28);
  text('THICKNESS GROWS TO THE', nx, oy + 36);
  text('BLADE - TAPERS AT TAIL', nx, oy + 42);
  text('GROUND CLAMP + SKIM', nx, oy + 50);
  text('TICKS WHERE H4 TEARS', nx, oy + 56);
  text('OUT OF THE FLOOR', nx, oy + 62);
})();
Y += 8 + GH * 2 + 16;

// ---------- eclipse entry map ----------
text('WHERE THE LIGHT ECLIPSE ENTERS - 8B-0 FAMILY REUSE MAP', 3, Y, HEADC);
[
  'H1 - NONE - ONE W EDGE GLINT ON WINDUP + APEX - THE SLASH S0 GLINT LANGUAGE',
  'H2 - SLASH BAND - W-I-Y CRESCENT + O BELLY - FOLLOW BREAKS ONE STEP DIMMER - MOTES RISE',
  'H3 - CYCLE GATHER MICRO-DOSE ON COIL - RADIANT LANCE - IMPACT P1 STAR AT THE TIP ON HIT',
  'H4 - GROUND HALO HINT UNDERFOOT ON COIL - W KERNEL IGNITE - FULL CRESCENT + BIG IMPACT ON',
  '     HIT - HALO H0 SNAP RING AT THE PEAK - RING FRAGMENTS + LAST MOTE ON SETTLE',
  'ON-HIT CONFIRM AT RUNTIME - REUSE THE 8B-0 LIGHTIMPACT GRIDS AT THE HITBOX CONTACT POINT',
].forEach((ln, i) => text(ln, 3, Y + 8 + i * 6));
Y += 8 + 6 * 6 + 6;

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
  slit(Math.floor(w * 0.16)); slit(Math.floor(w * 0.72));
  paint(ox, oy + floorRel, w, 1, NF1, 1);
  paint(ox, oy + floorRel + 1, w, h - floorRel - 1, NF0, 1);
  return oy + floorRel;
}
text('TABLEAU 1 - H4 SOLSTICE HIT VS THE BOSS - NIGHT HALL', 3, Y, HEADC);
text('TABLEAU 2 - H3 SUNPIERCE CONTACT', 293, Y, HEADC);
(() => {
  const oy = Y + 7;
  let floorY = nightRoom(3, oy, 280, 74, 62);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 3 + 24, floorY - 47);
  stampM(COMBO[3].frames[3].grid, COMBO_PAL, 3 + 120, floorY - FLOOR, { mir: true });
  floorY = nightRoom(293, oy, 280, 74, 62);
  stampM(toGrid(BOSS_IDLE[0]), BOSS_PAL, 293 + 24, floorY - 47);
  stampM(COMBO[2].frames[2].grid, COMBO_PAL, 293 + 96, floorY - FLOOR, { mir: true });
})();
Y += 7 + 74 + 8;

// ---------- handoff notes ----------
text('HANDOFF NOTES', 3, Y, HEADC); Y += 8;
[
  'CHAIN - H1 FIRST LIGHT - H2 GILDED CREST - H3 SUNPIERCE - H4 SOLSTICE - 4+4+4+6 FRAMES',
  'FSM MAP - WINDUP SHOWS W FRAMES - ACTIVE SHOWS SHEAR THEN HIT HELD - LINK SHOWS FOLLOW -',
  '    H4 SPLITS WINDUP W4A-W4B AND LINK P4-S4 BY PHASE TIMER - SAME IDIOM AS THE BOSS 8A-2 PORT',
  'HANDS - H1 H2 ONE-HAND - H3 H4 TWO-HAND FAR ARM BAKED - THRUST BREAKS THE SWING RHYTHM',
  'LAUNCHER - H4 IS THE UPWARD MIRROR OF THE BOSS DOWNWARD BREAKER - KNOCKBACK 16 READS AS LAUNCH',
  'ESCALATION LAW - LIGHT PX ON HIT FRAMES GROWS STRICTLY H1 TO H4 - ASSERTED IN-GENERATOR',
  'EFFECTS BAKED - SMEARS SET BEHIND THE BODY - FRONT ACCENTS COVER 6 BODY PX MAX - ASSERTED -',
  '    RETIRE THE RUNTIME DRAWHOLYSLASH MELEE HOOK AT INTEGRATION OR TRAILS DOUBLE',
  'SEAM - S4 SETTLE RETURNS THE BLADE TO THE IDLE CARRY TIP - ASSERTED WITHIN 3 CELLS',
  'CANVAS - 44X34 AT THE HERO 2PX GRID - 88X68 ON SCREEN - FEET ROW 33 - DRAWSPRITE SELF-ANCHORS -',
  '    PALETTE - HERO KEYS PLUS THE SIX LIGHT KEYS - EXTEND HERO REDESIGN PALETTE AT INTEGRATION',
  'MOTES RISE - BOSS ASH SINKS - NEVER BOLTS - TRUE CIRCLES ONLY ON THE HERO - MIRROR STAYS PURE',
  'RENDER-ONLY LAW - NO HITBOX - NO TIMING - NO AI CHANGE - HITBOXES KEEP THEIR LIVE SHAPES',
].forEach(ln => { text(ln, 3, Y); Y += 6; });

if (Y > SH - 4) throw new Error('layout overflow: ' + Y);

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
fs.writeFileSync(__dirname+'/hero_combo_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- literal dump ----------
let js = '// === HERO COMBO "DAYBREAK CHAIN" literals (see hero_combo_spec.md) ===\n';
js += '// 4-hit direct sword combo on the 44x34 canvas (hero base at 7,10; feet row 33).\n';
js += '// Effects are BAKED into the frames. Keys = HERO keys + the six LIGHT keys\n';
js += '// (W #fffdf4 / I #f2e6bf / y #f2c94e / o #e0a93c / G #c9962e / u #8a6420) —\n';
js += '// extend HERO_REDESIGN_PALETTE with the LIGHT keys at integration.\n';
js += '// Frame order per hit = FSM phase order: WINDUP / ACTIVE-EARLY / ACTIVE-HIT / LINK\n';
js += '// (H4: W4A W4B / A4A A4B / P4 S4). Render-only — hitboxes and timings unchanged.\n';
COMBO.forEach((hit, hi) => {
  js += `  heroCombo${hi + 1}: [\n`;
  hit.frames.forEach(fr => {
    js += `    // ${fr.tag} — ${fr.phase}\n`;
    js += '    [' + stringify(fr.grid).map(r => JSON.stringify(r)).join(', ') + '],\n';
  });
  js += '  ],\n';
});
fs.writeFileSync(__dirname + '/hero_combo_literal.txt', js);

// round-trip proof
{
  const src = fs.readFileSync(__dirname + '/hero_combo_literal.txt', 'utf8').replace(/\r/g, '');
  for (let hi = 0; hi < 4; hi++) {
    const m = src.match(new RegExp('  heroCombo' + (hi + 1) + ': \\[([\\s\\S]*?)\\n  \\],'));
    const rt = [...m[1].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)].map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
    const orig = COMBO[hi].frames.map(fr => stringify(fr.grid));
    if (JSON.stringify(rt) !== JSON.stringify(orig)) throw new Error('round-trip fail: heroCombo' + (hi + 1));
  }
}

console.log('wrote hero_combo_v1.png', IW + 'x' + IH,
  '| hits', COMBO.map(h => h.frames.length).join('+'), '= 18 frames',
  '| escalation LIGHT px', esc.join(' -> '),
  '| layout end Y', Y);
