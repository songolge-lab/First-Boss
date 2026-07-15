// Boss LOCOMOTION REDESIGN — stage 7B-0 concept + production sheet.
// New normal idle (ref3: relaxed-but-threatening low sword carry), heavy forward
// walk (ref2: oppressive advance, blade drag / low-carry), backward glide (ref4:
// frozen feet, drifting body, afterimage trail) and the periodic ~1s black-red
// SILHOUETTE SURGE (ref1) in two variants with DIFFERENT lightning placement:
//   surgeForward  — arcs on the SWORD SIDE (chest -> arm -> blade crawl -> ground)
//   surgeBackward — arcs on the CROWN + SHOULDERS + SPINE + trailing edge
// All frames derive from the APPROVED boss matrix with the house pose pipeline
// (eraseBlade + re-drawn arm/sword, moveUpper/liftLeg, emberUp) and the approved
// void-fracture bolt anatomy (afk2_gen.js), baked with EXISTING palette keys only.
// Emits: walk_v1.png (sheet) + walk_literal.txt (drop-in clip matrices).
//
// Sheet map (top -> bottom):
//   band A (checker bg = REAL drop-in matrices, 46x48):
//     row 1  idle         (3) — new down-outward carry, breath loop
//     row 2  walkForward  (6) — heavy advance, drag sparks on the plant frames
//     row 3  walkBackward (4) — glide: locked feet, circular body drift, trail hints
//     row 4  surgeForward (6) — eclipse walk + arcs on the weapon side
//     row 5  surgeBackward(4) — eclipse glide + arcs on crown/spine
//   band A right column: old-vs-new sword size study / drag-spark zoom
//   band B (solid cells): glide afterimage VFX story x3 + surge anchor maps x2
//   band C: two cinematic tableaus (advance mid-surge / glide mid-surge vs hero)
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
const SMK = '#1a1420', UMB = '#14101c', DK = '#1c1d28';
const NW0 = '#191622', NW1 = '#1d1a28', NF0 = '#221c2b', NF1 = '#3a3346';
const WINL = '#6c82a8';

// ---------- load approved matrices ----------
const base = fs.readFileSync(__dirname + '/boss_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const heroBase = fs.readFileSync(__dirname + '/hero_matrix.txt', 'utf8')
  .replace(/\r/g, '').split('\n').filter(r => r.length).map(r => r.split(''));
const H = base.length, W = base[0].length;          // 48 x 46
const HH = heroBase.length, HW = heroBase[0].length; // 24 x 30

// ---------- house matrix helpers ----------
const clone = g => g.map(r => r.slice());
const blank = () => Array.from({ length: H }, () => Array(W).fill('.'));
const stringify = g => g.map(r => r.join(''));
const setB = (g, x, y, k) => { if (x >= 0 && x < W && y >= 0 && y < H) g[y][x] = k; };
function cut(g, x0, y0, x1, y1) {
  const c = [];
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (y < 0 || y >= H || x < 0 || x >= W) continue;
    if (g[y][x] !== '.') { c.push([x, y, g[y][x]]); g[y][x] = '.'; }
  }
  return c;
}
function paste(g, cells, dx, dy) {
  for (const [x, y, k] of cells) { const nx = x + dx, ny = y + dy; if (nx >= 0 && nx < W && ny >= 0 && ny < H) g[ny][nx] = k; }
}
function moveUpper(g, hipRow, dx, dy) {
  if (dx === 0 && dy === 0) return g;
  const out = blank();
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (g[y][x] === '.') continue;
    if (y <= hipRow) { const ny = y + dy, nx = x + dx; if (ny >= 0 && ny < H && nx >= 0 && nx < W) out[ny][nx] = g[y][x]; }
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
// one full step toward the eclipse (surge entry/exit frames)
const DARK1 = { '5': '4', '4': '3', '3': '2', '2': '1', '1': '0', '0': '0',
                'd': 'c', 'c': 'b', 'b': 'a', 'a': 'g', 'h': 'g', 'g': 'g' };
const darkenStep = g => g.map(r => r.map(k => DARK1[k] || k));
// Leg column bands (from the idle art): back leg cols 12-17, front leg cols 18-26.
const BACK = [12, 17], FRONT = [18, 26];
// Erase the idle raised blade + fist + bent lead forearm (afk_gen idiom) so the
// held-down sword can be re-drawn clean.
function eraseBlade(g) {
  for (let y = 0; y <= 20; y++) for (let x = 31; x <= 45; x++) g[y][x] = '.';
  for (let y = 13; y <= 20; y++) for (let x = 27; x <= 33; x++) g[y][x] = '.';
  for (let y = 17; y <= 22; y++) for (let x = 24; x <= 29; x++) g[y][x] = '.';
  g[21][31] = '.'; g[21][30] = '.';
}

// ---------- THE HELD SWORD (locked locomotion carry) ----------
// Parametric drawer, one source of truth for every frame. Angle: 0 = forward
// horizontal, + = down. Styling matches the approved planted stack: ember pommel
// bead / MAIN crossguard with bright tips + heart gem / tier-2 short cross /
// molten b->c->d blade with dark+lit flanks / hot tip. reach 23 (+~30% vs the
// old raised idle blade) — bigger sword, consistent with the redesign language.
const REACH = 23;
function heldSword(g, hx, hy, angleDeg, opts = {}) {
  const { flash = false } = opts;
  const a = angleDeg * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
  const px = -dy, py = dx, R = Math.round;
  // fist + pommel behind the grip + ember bead
  setB(g, hx, hy, '3'); setB(g, hx - 1, hy, '3'); setB(g, hx, hy + 1, '1');
  setB(g, R(hx - dx), R(hy - dy), '2');
  setB(g, R(hx - dx * 2), R(hy - dy * 2), flash ? 'c' : 'b');
  // continuous ricasso line fist -> blade root, so steep angles can never leave
  // a quantization hole between the guard clusters (overwritten where they land)
  for (let i = 1; i <= 4; i++) setB(g, R(hx + dx * i), R(hy + dy * i), '1');
  // MAIN crossguard: 5-band + bright tips + down-swept horns + heart gem
  const gx = hx + dx * 1.5, gy = hy + dy * 1.5;
  for (let s = -2; s <= 2; s++) setB(g, R(gx + px * s), R(gy + py * s), s === 0 ? (flash ? 'd' : 'c') : '3');
  setB(g, R(gx + px * 3), R(gy + py * 3), '4'); setB(g, R(gx - px * 3), R(gy - py * 3), '4');
  setB(g, R(gx + px * 3 + dx), R(gy + py * 3 + dy), '2'); setB(g, R(gx - px * 3 + dx), R(gy - py * 3 + dy), '2');
  // tier-2 short cross hugging the blade root
  const g2x = hx + dx * 3, g2y = hy + dy * 3;
  setB(g, R(g2x + px), R(g2y + py), '3'); setB(g, R(g2x - px), R(g2y - py), '3');
  setB(g, R(g2x + px * 2), R(g2y + py * 2), '2'); setB(g, R(g2x - px * 2), R(g2y - py * 2), '2');
  // blade: molten core ramp + dark under-flank / lit top-flank, taper at the tip
  for (let i = 4; i <= REACH; i++) {
    const bx = R(hx + dx * i), by = R(hy + dy * i), t = (i - 4) / (REACH - 4);
    setB(g, bx, by, flash ? (t < 0.4 ? 'c' : 'd') : (t < 0.33 ? 'b' : t < 0.66 ? 'c' : 'd'));
    if (i <= REACH - 3) { setB(g, R(bx + px), R(by + py), '1'); setB(g, R(bx - px), R(by - py), '3'); }
    else if (i <= REACH - 1) setB(g, R(bx + px), R(by + py), '1');
  }
  setB(g, R(hx + dx * (REACH + 1)), R(hy + dy * (REACH + 1)), 'd'); // hot tip
  return [R(hx + dx * (REACH + 1)), R(hy + dy * (REACH + 1))];     // tip cell
}
// arm from the (possibly shifted) lead shoulder down to the fist.
function reachArm(g, sx, sy, hx, hy) {
  lineB(g, sx, sy, hx - 1, hy - 1, '2', true);
  setB(g, sx - 1, sy, '2');
}

// ---------- frame builder ----------
// legs: list of [band, kneeRow, dx, up] leg re-poses (cut low leg, swing it).
// bob:  [dx,dy] whole-upper-body shift (lean + weight). Sword drawn AFTER the
// bob at final-space coords so it can never shear at the hip row.
function frame(spec) {
  const { legs = [], bob = [0, 0], hand, angle, spark = false, ember = false, tailLift = false } = spec;
  let g = clone(base);
  eraseBlade(g);
  if (tailLift) paste(g, cut(g, 9, 4, 15, 8), -1, -1);       // mask tail streams up-back
  for (const [band, knee, dx, up] of legs) paste(g, cut(g, band[0], knee, band[1], 47), dx, -up);
  g = moveUpper(g, 28, bob[0], bob[1]);
  if (ember) g = emberUp(g);
  reachArm(g, 25 + bob[0], 17 + bob[1], hand[0], hand[1]);
  const tip = heldSword(g, hand[0], hand[1], angle, { flash: ember });
  if (spark) {                                                // blade tip scrapes the floor
    setB(g, tip[0] + 1, 46, 'd'); setB(g, tip[0] + 2, 45, 'c');
    setB(g, tip[0] - 1, 46, 'c'); setB(g, tip[0] - 3, 46, 'a'); setB(g, tip[0] - 5, 46, 'a');
  }
  return g;
}

// ===== IDLE — 3 frames: exhale / ember inhale / breath peak (chest up 1px). =====
// Composed, predatory rest: blade angled down-and-outward, tip HOVERING clear of
// the floor (never planted — that is the AFK state's read).
const IDLE_HAND = [31, 20], IDLE_ANGLE = 56;
function idleFrames() {
  const f0 = frame({ hand: IDLE_HAND, angle: IDLE_ANGLE });
  const f1 = frame({ hand: IDLE_HAND, angle: IDLE_ANGLE, ember: true });
  const f2 = frame({ hand: [31, 19], angle: IDLE_ANGLE, bob: [0, -1], ember: true });
  return [f0, f1, f2];
}

// ===== WALK FORWARD — 6-frame heavy advance (ref2 motion language). =====
// reach -> PLANT (weight drops 1px, blade tip bites the floor, scrape spark) ->
// pass, then the mirrored half. Whole upper body carries a +1 forward lean; the
// sword rides low ahead of him, tip skimming the ground (drag / low-carry).
function walkForwardFrames() {
  return [
    frame({ legs: [[FRONT, 36, 3, 1]],                 bob: [1, 0],  hand: [32, 22], angle: 66 }),               // f0 reach
    frame({ legs: [[FRONT, 36, 3, 0]],                 bob: [1, 1],  hand: [32, 23], angle: 68, spark: true }),  // f1 PLANT
    frame({ legs: [[BACK, 38, 2, 3]],                  bob: [1, -1], hand: [32, 21], angle: 64 }),               // f2 pass
    frame({ legs: [[BACK, 36, -3, 1]],                 bob: [1, 0],  hand: [32, 22], angle: 66 }),               // f3 push-B (leg trails)
    frame({ legs: [[BACK, 36, -3, 0]],                 bob: [1, 1],  hand: [32, 23], angle: 68, spark: true }),  // f4 PLANT-B
    frame({ legs: [[FRONT, 38, -1, 3]],                bob: [1, -1], hand: [32, 21], angle: 64 }),               // f5 pass-B
  ];
}

// ===== WALK BACKWARD — 4-frame glide (ref4 motion language). =====
// Feet FROZEN in one long trailing stance all 4 frames; the upper body drifts in
// a slow circle (0,0 -> 0,-1 -> -1,-1 -> -1,0) on top of the retreat lean, the
// mask tail streams up-back on the drift-up frames, and tattered in-frame trail
// hints flicker on the FACING contour (he slides backward => afterimages sit
// between him and the hero). The sword keeps a guarded down-outward carry.
const GLIDE_LEGS = [[BACK, 40, -2, 0]];                       // trailing toe, planted
function ghostHints(g, phase) {
  for (let y = 2; y <= 21; y++) {
    let fx = -1;
    for (let x = W - 1; x >= 0; x--) if (g[y][x] !== '.') { fx = x; break; }
    if (fx < 0 || fx > 40) continue;
    if ((y + phase) % 3 === 0) setB(g, fx + 2, y, '1');
    if ((y + phase) % 6 === 1) setB(g, fx + 1, y, '0');
  }
  return g;
}
function walkBackwardFrames() {
  const sway = [[-2, 0], [-2, -1], [-3, -1], [-3, 0]];        // deep trailing lean + circular drift
  return sway.map(([dx, dy], i) => ghostHints(frame({
    legs: GLIDE_LEGS, bob: [dx, dy], tailLift: dy === -1,
    hand: [31 + dx, 18 + dy], angle: 52,                      // higher guarded carry vs the idle
  }), i));
}

// ---------- VOID-FRACTURE bolts, baked with palette keys (afk2 anatomy) ----------
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
// bake an arc into a key grid. anatomy: '0' void sheath / 'c' filament /
// 'd' hot kinks / 'b' branches with 'a' tips / ash = sinking 'g'+'1' slivers.
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
    for (let i = 0; i < cells.length; i++) {                 // black crack sheath first
      const [x, y] = cells[i];
      const p = cells[Math.max(0, i - 1)], nn = cells[Math.min(cells.length - 1, i + 1)];
      if (Math.abs(nn[1] - p[1]) >= Math.abs(nn[0] - p[0])) { setB(g, x - 1, y, '0'); setB(g, x + 1, y, '0'); }
      else { setB(g, x, y - 1, '0'); setB(g, x, y + 1, '0'); }
    }
    for (const [x, y] of cells) setB(g, x, y, 'c');          // red filament
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
  for (let i = 0; i < cells.length; i += 4) {                // ash: sinking slivers
    const [x, y] = cells[i];
    const len = 2 + ((i >> 2) % 2);
    for (let j = 0; j < len; j++) setB(g, x, y + 1 + j, (i >> 2) % 2 ? '1' : 'g');
  }
  const m = cells[Math.floor(cells.length / 2)];
  setB(g, m[0] + 2, m[1] + 2, 'a');
}

// ---------- ECLIPSE (silhouette form, ref1 / approved denial-tint language) ----------
// Body swallowed to near-void with a BROKEN dim-ember rim (unlike the denial
// tint's clean solid rim, so the hit-reaction read stays unique). The molten
// blade keeps a deep-ember memory so the huge sword silhouette stays readable.
function eclipse(g, seed) {
  const out = g.map((row, y) => row.map((k, x) => {
    if (k === '.') return '.';
    if (k === 'b' || k === 'c' || k === 'd') return 'a';
    if (k === 'a' || k === 'g' || k === 'h') return 'g';
    return (x * 3 + y * 7 + seed) % 13 === 0 ? '1' : '0';
  }));
  for (let y = 0; y < H; y++) {
    let lo = -1, hi = -1;
    for (let x = 0; x < W; x++) if (out[y][x] !== '.') { if (lo < 0) lo = x; hi = x; }
    if (lo < 0) continue;
    if ((y + seed) % 3 !== 0) {
      out[y][lo] = (y + seed) % 7 === 0 ? 'c' : 'h';
      out[y][hi] = (y + seed * 2) % 7 === 0 ? 'c' : 'h';
    }
  }
  return out;
}

// ===== SURGE FORWARD — 6 frames riding the walkForward poses (~1s). =====
// Lightning lives on the WEAPON SIDE: chest core ignite -> arm crawl -> beside-
// blade crawl -> ground skitter at the drag point -> fracture -> sinking ash.
function surgeForwardFrames() {
  const wf = walkForwardFrames();
  const core = [20, 15];                                      // chest core (+1 advance lean)
  const armTo = [31, 21], bladeA = [35, 27], bladeB = [42, 43];
  const s = [];
  // f0 — entry: body one step dark, the chest core ignites
  let g = darkenStep(wf[0]);
  bakeBolt(g, boltPath(core[0], core[1], core[0] + 5, core[1] + 3, 41, 1, 1), 'ignite');
  s.push(g);
  // f1 — full eclipse: arm crawl flashes chest -> fist
  g = eclipse(wf[1], 1);
  bakeBolt(g, boltPath(core[0], core[1], armTo[0], armTo[1], 43, 1, 2), 'flash',
    { branches: [{ frac: 0.45, dx: -4, dy: -4 }], seed: 43 });
  s.push(g);
  // f2 — arm re-jitters + the beside-blade crawl lights up
  g = eclipse(wf[2], 2);
  bakeBolt(g, boltPath(core[0], core[1] - 1, armTo[0], armTo[1] - 1, 47, 2, 1), 'flash', { seed: 47 });
  bakeBolt(g, boltPath(bladeA[0], bladeA[1], bladeB[0], bladeB[1], 53, 2, 1), 'flash', { seed: 53 });
  s.push(g);
  // f3 — blade crawl re-jitters + ground skitter at the drag point
  g = eclipse(wf[3], 3);
  bakeBolt(g, boltPath(bladeA[0], bladeA[1] + 1, bladeB[0] - 1, bladeB[1], 59, 2, 1), 'flash',
    { branches: [{ frac: 0.6, dx: 4, dy: -3 }], seed: 59 });
  bakeBolt(g, boltPath(36, 46, 44, 46, 61, 0, 1), 'flash', { seed: 61 });
  s.push(g);
  // f4 — the flare breaks: blade + ground arcs fracture, arm arc dies to ash
  g = eclipse(wf[4], 4);
  bakeBolt(g, boltPath(bladeA[0], bladeA[1], bladeB[0], bladeB[1], 53, 2, 1), 'fracture');
  bakeBolt(g, boltPath(36, 46, 44, 46, 61, 0, 1), 'fracture');
  bakeBolt(g, boltPath(core[0], core[1], armTo[0], armTo[1], 43, 1, 2), 'ash');
  s.push(g);
  // f5 — exit: body one step back toward normal, ash sinks off the sword line
  g = darkenStep(wf[5]);
  bakeBolt(g, boltPath(bladeA[0], bladeA[1], bladeB[0], bladeB[1], 53, 2, 1), 'ash');
  s.push(g);
  return s;
}

// ===== SURGE BACKWARD — 4 frames riding the walkBackward poses (~1s). =====
// Lightning lives on the CROWN + SHOULDER SPAN + SPINE + trailing edge — the
// wraith read: power crackling over the head and back, one arc tearing off the
// glide into empty space behind him. Distinct from the forward surge's placement.
function surgeBackwardFrames() {
  const wb = walkBackwardFrames();
  const s = [];
  // f0 — entry: dark step, ignite at the crown
  let g = darkenStep(wb[0]);
  bakeBolt(g, boltPath(17, 1, 21, 3, 71, 1, 1), 'ignite');
  s.push(g);
  // f1 — full eclipse: crown arc + one short crackle arc per shoulder
  g = eclipse(wb[1], 5);
  bakeBolt(g, boltPath(13, 3, 23, 1, 73, 1, 2), 'flash', { seed: 73 });
  bakeBolt(g, boltPath(7, 13, 16, 9, 79, 1, 2), 'flash',
    { branches: [{ frac: 0.5, dx: -3, dy: 4 }], seed: 79 });
  bakeBolt(g, boltPath(22, 9, 31, 12, 81, 1, 2), 'flash', { seed: 81 });
  s.push(g);
  // f2 — spine crawl down the back contour + an arc tears off the trailing edge
  g = eclipse(wb[2], 6);
  bakeBolt(g, boltPath(11, 9, 9, 27, 83, 2, 1), 'flash', { seed: 83 });
  bakeBolt(g, boltPath(9, 16, 2, 22, 89, 1, 1), 'fracture');
  bakeBolt(g, boltPath(13, 3, 23, 1, 73, 1, 2), 'fracture');
  s.push(g);
  // f3 — exit: dark step back, ash sinks off shoulders and spine
  g = darkenStep(wb[3]);
  bakeBolt(g, boltPath(7, 13, 16, 9, 79, 1, 2), 'ash');
  bakeBolt(g, boltPath(22, 9, 31, 12, 81, 1, 2), 'ash');
  bakeBolt(g, boltPath(11, 9, 9, 27, 83, 2, 1), 'ash');
  s.push(g);
  return s;
}

// ---------- build all clips ----------
const CLIPS = {
  idle: idleFrames().map(stringify),
  walkForward: walkForwardFrames().map(stringify),
  walkBackward: walkBackwardFrames().map(stringify),
  surgeForward: surgeForwardFrames().map(stringify),
  surgeBackward: surgeBackwardFrames().map(stringify),
};

// ================= SHEET CANVAS =================
const SW = 346, SH = 570, SCALE = 4;
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
// tiny 3x5 label font (afk2_gen idiom)
const FONT = {
  A: '010101111101101', B: '110101110101110', C: '011100100100011', D: '110101101101110',
  E: '111100110100111', F: '111100110100100', G: '011100101101011', H: '101101111101101',
  I: '111010010010111', K: '101101110101101', L: '100100100100111', M: '101111111101101',
  N: '110101101101101', O: '010101101101010', P: '110101110100100', R: '110101110110101',
  S: '011100010001110', T: '111010010010010', U: '101101101101111', V: '101101101101010',
  W: '101101111111101', X: '101101010101101', Y: '101101010010010', Z: '111001010100111',
  '0': '111101101101111', '1': '010110010010111', '2': '110001010100111', '3': '111001011001111',
  '4': '101101111001001', '5': '111100110001110', '6': '011100111101111', '7': '111001010010010',
  '8': '111101010101111', '.': '000000000000010', '-': '000000111000000', '+': '000010111010000',
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

// ---------- band A: real matrices on checker ----------
text('STAGE 7B-0 - BOSS LOCOMOTION REDESIGN - REAL 46X48 DROP-IN MATRICES', 3, 2, HEADC);
const A_Y = 10, CELL = 48, ROWH = 64;
const ROWS = [
  ['idle', 'IDLE - 3F BREATH LOOP - LOW CARRY'],
  ['walkForward', 'WALK FWD - 6F HEAVY ADVANCE - DRAG SPARK ON PLANT'],
  ['walkBackward', 'WALK BWD - 4F GLIDE - FEET FROZEN + TRAIL HINTS'],
  ['surgeForward', 'SURGE FWD - 6F 1S - ARCS ON ARM + BLADE + GROUND'],
  ['surgeBackward', 'SURGE BWD - 4F 1S - ARCS ON CROWN + SPINE + TRAIL'],
];
ROWS.forEach(([n, label], r) => {
  const y = A_Y + r * ROWH;
  text(label, 3, y, HEADC);
  CLIPS[n].forEach((f, c) => {
    stampM(f.map(s => [...s]), BOSS_PAL, 3 + c * CELL, y + 7);
    text(String(c), 3 + c * CELL + 22, y + 7 + 49, '#4a4560');
  });
});

// ---------- band A right column ----------
const R_X = 296;
// old-vs-new sword study: the old raised idle blade (extracted) vs the new held
// sword, both resting on one shared floor line at identical scale.
(() => {
  text('SWORD', R_X, A_Y, HEADC); text('OLD-NEW', R_X, A_Y + 6, HEADC);
  cellFrame(R_X, A_Y + 13, 46, 62, '#100d1c');
  const old = blank();
  for (let y = 0; y <= 15; y++) for (let x = 28; x <= 41; x++) old[y][x] = base[y][x];
  stampM(old, BOSS_PAL, R_X - 26, A_Y + 55);                 // old: rows 0-15 -> floor
  const solo = blank();
  heldSword(solo, 8, 14, IDLE_ANGLE);                        // new: same carry angle
  stampM(solo, BOSS_PAL, R_X + 12, A_Y + 22);
  paint(R_X + 2, A_Y + 71, 42, 1, NF1, 1);
  text('OLD', R_X + 3, A_Y + 62, '#4a4560'); text('NEW', R_X + 30, A_Y + 62, '#4a4560');
})();
// drag-spark zoom (2x): the plant frame's scrape read
(() => {
  const y = A_Y + 82;
  text('DRAG', R_X, y, HEADC); text('SPARK 2X', R_X, y + 6, HEADC);
  cellFrame(R_X, y + 13, 46, 30, '#100d1c');
  const ox = R_X + 4, oy = y + 15;
  // 2x blade tip diagonal + floor + sparks (from walkForward f1 geometry)
  const B2 = (x, yy, k) => paint(ox + x * 2, oy + yy * 2, 2, 2, BOSS_PAL[k], 1);
  B2(2, 0, 'c'); B2(3, 1, 'c'); B2(4, 2, 'd'); B2(5, 3, 'd'); B2(6, 4, 'd');
  B2(1, 0, '1'); B2(2, 1, '1'); B2(3, 2, '1'); B2(4, 3, '1');
  B2(7, 5, 'd');                                             // hot tip on the floor
  B2(8, 4, 'c'); B2(9, 3, 'a');                              // thrown spark
  B2(5, 5, 'c'); B2(3, 5, 'a'); B2(1, 5, 'a');               // drag ticks behind
  paint(ox, oy + 12, 38, 1, NF1, 1); paint(ox, oy + 13, 38, 1, NF0, 1);
})();

// ---------- band B: glide afterimage VFX story + surge anchor maps ----------
const B_Y = A_Y + 5 * ROWH + 4;
text('GLIDE AFTERIMAGES - RUNTIME VFX X3', 3, B_Y, HEADC);
(() => {
  const wb0 = CLIPS.walkBackward[0].map(s => [...s]);
  const ghost = (den, hex) => (k, x, y) => ((x + y) % den === 0 ? null : hex);
  for (let c = 0; c < 3; c++) {
    const ox = 3 + c * 72, oy = B_Y + 7;
    cellFrame(ox, oy, 68, 56);
    paint(ox, oy + 51, 68, 1, NF1, 1); paint(ox, oy + 52, 68, 4, NF0, 1);
    const bx = ox + 2, by = oy + 3;
    if (c === 0) {                                           // just detached: one near ghost
      stampM(wb0, BOSS_PAL, bx + 10, by, { tintFn: ghost(3, DK) });
      stampM(wb0, BOSS_PAL, bx, by);
    } else if (c === 1) {                                    // full trail: near + far ghost
      stampM(wb0, BOSS_PAL, bx + 18, by, { tintFn: ghost(2, '#12121a') });
      stampM(wb0, BOSS_PAL, bx + 10, by, { tintFn: ghost(3, DK) });
      stampM(wb0, BOSS_PAL, bx, by);
    } else {                                                 // decay: ghosts dissolve
      stampM(wb0, BOSS_PAL, bx + 20, by, { tintFn: (k, x, y) => (y % 2 === 0 && (x + y) % 2 ? '#12121a' : null) });
      stampM(wb0, BOSS_PAL, bx + 12, by, { tintFn: ghost(2, DK) });
      stampM(wb0, BOSS_PAL, bx, by);
    }
    text(['DETACH', 'TRAIL', 'DECAY'][c], ox + 2, oy + 58, '#4a4560');
  }
})();
// surge anchor maps: mono body + arc anchor dots/paths, forward vs backward
(() => {
  const mk = (ox, frameStr, label, drawArcs) => {
    text(label, ox, B_Y, HEADC);
    cellFrame(ox, B_Y + 7, 52, 56, '#100d1c');
    const bx = ox + 3, by = B_Y + 10;
    stampM(frameStr.map(s => [...s]), BOSS_PAL, bx, by, { tintFn: () => '#262a38' });
    drawArcs(bx, by);
    paint(ox, B_Y + 58, 52, 1, NF1, 1);
  };
  const dot = (x, y) => { paint(x, y, 2, 2, E3, 1); };
  const dash = (x0, y0, x1, y1) => {
    bres(x0, y0, x1, y1).forEach(([x, y], i) => { if (i % 3 !== 2) paint(x, y, 1, 1, E1, 1); });
  };
  mk(222, CLIPS.walkForward[1], 'FWD MAP', (bx, by) => {
    dot(bx + 20, by + 15); dot(bx + 31, by + 21);            // chest core -> fist
    dash(bx + 21, by + 16, bx + 31, by + 21);
    dash(bx + 35, by + 27, bx + 42, by + 43);                // beside-blade crawl
    dash(bx + 36, by + 46, bx + 44, by + 46);                // ground skitter
    dot(bx + 42, by + 44);
  });
  mk(282, CLIPS.walkBackward[1], 'BWD MAP', (bx, by) => {
    dot(bx + 17, by + 1);                                    // crown
    dash(bx + 13, by + 3, bx + 23, by + 1);
    dash(bx + 7, by + 13, bx + 16, by + 9);                  // left shoulder arc
    dash(bx + 22, by + 9, bx + 31, by + 12);                 // right shoulder arc
    dash(bx + 11, by + 9, bx + 9, by + 27);                  // spine crawl
    dash(bx + 9, by + 16, bx + 2, by + 22);                  // trailing tear-off
    dot(bx + 9, by + 26);
  });
})();

// ---------- band C: cinematic tableaus ----------
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
const T_W = 340, T_H = 70;
// tableau 1 — heavy advance mid-surge (forward variant), hero holding ground
(() => {
  const oy = B_Y + 72;
  text('TABLEAU - FORWARD ADVANCE MID-SURGE', 3, oy, HEADC);
  const floorY = nightRoom(3, oy + 7, T_W, T_H, 58);
  const bx = 3 + 96, by = floorY - 47;
  // scuff ticks + smoke wake trailing the advance
  [[-18, 1], [-30, 1], [-42, 2]].forEach(([dx, dy]) => paint(bx + 14 + dx, floorY + dy, 3, 1, '#0c0a12', 1));
  [[-14, -3], [-24, -5], [-34, -2]].forEach(([dx, dy]) => paint(bx + 12 + dx, floorY + dy, 3, 1, SMK, 0.8));
  stampM(CLIPS.surgeForward[2].map(s => [...s]), BOSS_PAL, bx, by);
  paint(bx + 41, floorY, 2, 1, E2, 1); paint(bx + 38, floorY, 1, 1, E0, 1); // live drag spark
  const hx = 3 + 268, hy = floorY - 23;
  stampM(heroBase, HERO_PAL, hx, hy, { mir: true });
})();
// tableau 2 — backward glide mid-surge (backward variant), afterimages toward the hero
(() => {
  const oy = B_Y + 72 + 81;
  text('TABLEAU - BACKWARD GLIDE MID-SURGE', 3, oy, HEADC);
  const floorY = nightRoom(3, oy + 7, T_W, T_H, 58);
  const bx = 3 + 120, by = floorY - 47;
  // eclipse ghosts trail on the FACING side (he slides away from the hero)
  const gf = CLIPS.surgeBackward[1].map(s => [...s]);
  stampM(gf, BOSS_PAL, bx + 24, by, { tintFn: (k, x, y) => ((x + y) % 2 ? '#0c0a14' : null) });
  stampM(gf, BOSS_PAL, bx + 12, by, { tintFn: (k, x, y) => ((x + y) % 3 === 0 ? null : '#12101c') });
  stampM(gf, BOSS_PAL, bx, by);
  const hx = 3 + 262, hy = floorY - 23;
  stampM(heroBase, HERO_PAL, hx, hy, { mir: true });
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
fs.writeFileSync(__dirname+'/walk_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- JS-literal dump ----------
let js = '// === BOSS_REDESIGN_SPRITES additions/replacements (46x48, BOSS_REDESIGN_PALETTE) ===\n';
js += '// idle REPLACES the current idle; walkForward REPLACES run; walkBackward REPLACES retreat.\n';
js += '// surgeForward / surgeBackward are NEW render-only overlay clips (see walk_spec.md).\n';
for (const n of Object.keys(CLIPS)) {
  js += `  ${n}: [\n`;
  for (const f of CLIPS[n]) js += '    [' + f.map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
}
fs.writeFileSync(__dirname + '/walk_literal.txt', js);

const widths = [...new Set(Object.values(CLIPS).flat().map(f => f[0].length))];
const heights = [...new Set(Object.values(CLIPS).flat().map(f => f.length))];
console.log('wrote walk_v1.png', IW + 'x' + IH,
  '| clips:', Object.keys(CLIPS).map(n => `${n}(${CLIPS[n].length})`).join(' '),
  '| frame widths', JSON.stringify(widths), 'heights', JSON.stringify(heights));
