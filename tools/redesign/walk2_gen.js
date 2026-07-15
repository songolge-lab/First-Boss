// Boss LOCOMOTION REDESIGN R2 — stage 7B-0R revision sheet.
// Targeted correction of walk_v1: the sword is NO LONGER carried in front of the
// body. It is carried BEHIND the silhouette (ref2/ref3 carry logic): a heavy,
// trailing, back-side greatsword. Everything else from walk_v1 is preserved —
// the low-carry oppressive identity, the heavy 6f advance, the 4f frozen-feet
// backward glide, the ~1s black-red silhouette surges, the ember-void palette,
// and the production-sheet format.
//
// CARRY / FACING LAW (authored + runtime):
//   The matrices are authored FACING RIGHT (hero side). The grip sits in the
//   boss's EXISTING rear fist (base art cols 10-11, row 24 — his hanging left
//   hand), and the blade trails DOWN-BACK across the empty rear-lower quadrant
//   (angles 106-113 deg, tip near cols 2-4 / rows 43-47). The runtime aimDir
//   sprite flip (Player.js) mirrors the whole frame whenever the hero is on the
//   left, so the sword lands in the correct hand ON THE TRAILING SIDE in both
//   facings with zero extra wiring. The lead (hero-side) hand is now EMPTY:
//   relaxed hang in idle/advance, raised guard in the retreat.
//
// Emits: walk2_v1.png (sheet) + walk2_literal.txt (drop-in clip matrices).
//
// Sheet map (top -> bottom):
//   band A (checker bg = REAL drop-in matrices, 46x48):
//     row 1  idle         (3) — rear low carry, tip resting behind, breath loop
//     row 2  walkForward  (6) — heavy advance, blade DRAGS behind, sparks on plant
//     row 3  walkBackward (4) — glide: frozen feet, guard hand up, tip lifted
//     row 4  surgeForward (6) — eclipse walk + arcs chest->rear arm->blade->ground
//     row 5  surgeBackward(4) — eclipse glide + arcs crown/shoulders/spine
//   band A right column: OLD (v1 front carry) vs NEW (rear carry) study + drag spark 2x
//   band B: glide afterimage story x3 + surge anchor maps x2
//   band F: FACING LAW — hero right vs hero left (runtime mirror), sword always trailing
//   band C: two cinematic tableaus (advance toward hero-right / glide from hero-LEFT mirrored)
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
// Erase the idle raised blade + fist + bent lead forearm (afk_gen idiom). The
// lead arm is re-drawn EMPTY afterwards (hang / guard) — the sword moves to the
// rear fist that already exists in the base art.
function eraseBlade(g) {
  for (let y = 0; y <= 20; y++) for (let x = 31; x <= 45; x++) g[y][x] = '.';
  for (let y = 13; y <= 20; y++) for (let x = 27; x <= 33; x++) g[y][x] = '.';
  for (let y = 17; y <= 22; y++) for (let x = 24; x <= 29; x++) g[y][x] = '.';
  g[21][31] = '.'; g[21][30] = '.';
}

// ---------- THE HELD SWORD (locked locomotion carry, R2 = REAR side) ----------
// Same parametric drawer as walk_v1 (one source of truth). Angle: 0 = forward
// horizontal, + = down; R2 uses angles > 90 so the blade trails DOWN-BACK from
// the rear fist. Styling unchanged: ember pommel bead / MAIN crossguard with
// bright tips + heart gem / tier-2 short cross / molten b->c->d blade with
// dark+lit flanks / hot tip. reach 23 kept (+~30% vs the old raised idle blade).
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
// v1 lead reach-arm (kept ONLY for the OLD-carry study panel)
function reachArm(g, sx, sy, hx, hy) {
  lineB(g, sx, sy, hx - 1, hy - 1, '2', true);
  setB(g, sx - 1, sy, '2');
}
// R2 lead arm — EMPTY hand, drawn in final (post-bob) space over the erased
// v1 forearm region. 'hang' = relaxed executioner hang beside the front hip
// (with a per-frame swing for the walk); 'guard' = forearm raised across the
// chest, open warding hand toward the hero (the retreat's defensive read).
function leadArm(g, bx, by, mode, swing = 0) {
  const S = (x, y, k) => setB(g, x + bx, y + by, k);
  // rebuilt lead shoulder cap (eraseBlade removes the old thorn cluster)
  S(26, 13, '3'); S(27, 13, '3'); S(28, 14, '2');
  S(26, 14, '3'); S(27, 14, 'b'); S(26, 15, '3'); S(27, 15, '3');
  if (mode === 'guard') {
    S(27, 16, '2'); S(28, 16, '2');                 // upper arm forward
    S(29, 15, '2'); S(29, 14, '3'); S(30, 14, '3'); // forearm rising across the chest
    S(30, 13, '3'); S(29, 13, 'b');                 // warding hand + ember knuckle
    return;
  }
  S(27, 16, '2'); S(27, 17, '2'); S(28, 17, '1');   // upper arm
  S(27, 18, '2'); S(27, 19, '2');                   // elbow
  const fx = 26 + swing;
  S(fx, 20, '2'); S(fx, 21, '2'); S(fx, 22, '2');   // forearm hanging
  S(fx, 23, '3'); S(fx - 1, 23, '3'); S(fx, 24, '1'); // loose empty fist
}

// ---------- frame builder ----------
// legs: list of [band, kneeRow, dx, up] leg re-poses (cut low leg, swing it).
// bob:  [dx,dy] whole-upper-body shift (lean + weight). The rear grip is WELDED
// to the base art's hanging left fist (10-11,24), so hand = REAR_FIST + bob and
// the sword can never detach from the arm. armLift folds the rear forearm up
// (fist -> 13,20 base space) for the retreat's lifted guarded carry.
const REAR_FIST = [11, 24];
function frame(spec) {
  const { legs = [], bob = [0, 0], angle, spark = false, ember = false,
          tailLift = false, armLift = false, lead = 'hang', swing = 0,
          carry = 'rear' } = spec;
  let g = clone(base);
  eraseBlade(g);
  if (tailLift) paste(g, cut(g, 9, 4, 15, 8), -1, -1);       // mask tail streams up-back
  if (armLift) paste(g, cut(g, 9, 21, 12, 24), 2, -4);       // rear forearm folds up
  for (const [band, knee, dx, up] of legs) paste(g, cut(g, band[0], knee, band[1], 47), dx, -up);
  g = moveUpper(g, 28, bob[0], bob[1]);
  if (ember) g = emberUp(g);
  if (carry === 'front') {                                   // v1 carry — study panel only
    reachArm(g, 25 + bob[0], 17 + bob[1], 31, 20);
    heldSword(g, 31, 20, 56, { flash: ember });
    return g;
  }
  leadArm(g, bob[0], bob[1], lead, swing);
  const hand = armLift ? [13 + bob[0], 20 + bob[1]] : [REAR_FIST[0] + bob[0], REAR_FIST[1] + bob[1]];
  const tip = heldSword(g, hand[0], hand[1], angle, { flash: ember });
  if (spark) {                                               // dragged tip bites the floor
    setB(g, tip[0] + 1, 46, 'c');                            // fresh bite at the contact
    setB(g, tip[0] - 1, 45, 'd'); setB(g, tip[0] - 2, 44, 'c'); // sparks kicked up-BACK
    setB(g, tip[0] - 1, 46, 'a'); setB(g, tip[0] + 3, 46, 'a'); // scrape ticks on the line
  }
  return g;
}

// ===== IDLE — 3 frames: exhale / ember inhale / breath peak (chest up 1px). =====
// Poised executioner rest: the sword hangs from the rear fist and trails
// down-back, the hot tip RESTING on the floor behind his heel (a resting drag,
// not the AFK plant — that read stays vertical, in front, and exclusive).
const IDLE_ANGLE = 112;
function idleFrames() {
  const f0 = frame({ angle: IDLE_ANGLE });
  const f1 = frame({ angle: IDLE_ANGLE, ember: true });
  const f2 = frame({ angle: IDLE_ANGLE, bob: [0, -1], ember: true });
  return [f0, f1, f2];
}

// ===== WALK FORWARD — 6-frame heavy advance (ref2 motion language). =====
// Same stride skeleton as v1 (reach -> PLANT -> pass, mirrored half; +1 forward
// lean; single-leg moves per frame). The sword now TRAILS: the blade drags on
// the floor BEHIND him the whole cycle, angle wobbling 110-113 with the weight,
// scrape sparks kicked up-back on the two plant frames. The empty lead hand
// counter-swings +-1 with the stride.
function walkForwardFrames() {
  return [
    frame({ legs: [[FRONT, 36, 3, 1]],  bob: [1, 0],  angle: 111, swing: -1 }),              // f0 reach
    frame({ legs: [[FRONT, 36, 3, 0]],  bob: [1, 1],  angle: 113, swing: -1, spark: true }), // f1 PLANT
    frame({ legs: [[BACK, 38, 2, 3]],   bob: [1, -1], angle: 110 }),                         // f2 pass
    frame({ legs: [[BACK, 36, -3, 1]],  bob: [1, 0],  angle: 111, swing: 1 }),               // f3 push-B (leg trails)
    frame({ legs: [[BACK, 36, -3, 0]],  bob: [1, 1],  angle: 113, swing: 1, spark: true }),  // f4 PLANT-B
    frame({ legs: [[FRONT, 38, -1, 3]], bob: [1, -1], angle: 110 }),                         // f5 pass-B
  ];
}

// ===== WALK BACKWARD — 4-frame glide (ref4 motion language). =====
// Feet FROZEN in one long trailing stance all 4 frames; the upper body drifts in
// a slow circle over the deep trailing lean; the mask tail streams up-back on
// drift-up frames; tattered in-frame trail hints flicker on the FACING contour
// (he slides backward => afterimages sit between him and the hero). R2 retreat
// carry: the rear forearm FOLDS UP (armLift) so the trailing blade lifts clear
// of the floor (tip hovers rows 42-43) — wary and withdrawing, clearly distinct
// from the advance's grinding floor drag — and the empty lead hand raises to a
// GUARD across the chest toward the hero.
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
    armLift: true, lead: 'guard', angle: 106,                 // lifted rear carry + front guard
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
// R2 lightning follows the sword to the REAR-LOW zone: chest core ignite ->
// rear-arm crawl (chest -> rear fist) -> beside-blade crawl down the TRAILING
// blade -> ground skitter at the drag point BEHIND him -> fracture -> sinking
// ash. The power still flows INTO the weapon and the floor — an advancing
// executioner hauling a live blade.
function surgeForwardFrames() {
  const wf = walkForwardFrames();
  const core = [20, 15];                                      // chest core (+1 advance lean)
  const fist = [12, 24];                                      // rear grip (lean applied)
  const bladeA = [12, 29], bladeB = [6, 43];                  // crawl 2px beside the blade line
  const s = [];
  // f0 — entry: body one step dark, the chest core ignites
  let g = darkenStep(wf[0]);
  bakeBolt(g, boltPath(core[0], core[1], core[0] + 5, core[1] + 3, 41, 1, 1), 'ignite');
  s.push(g);
  // f1 — full eclipse: arm crawl flashes chest -> rear fist
  g = eclipse(wf[1], 1);
  bakeBolt(g, boltPath(core[0], core[1], fist[0], fist[1] + 1, 43, 1, 2), 'flash',
    { branches: [{ frac: 0.45, dx: -4, dy: -4 }], seed: 43 });
  s.push(g);
  // f2 — arm re-jitters + the beside-blade crawl lights up down the trailing blade
  g = eclipse(wf[2], 2);
  bakeBolt(g, boltPath(core[0], core[1] - 1, fist[0], fist[1], 47, 2, 1), 'flash', { seed: 47 });
  bakeBolt(g, boltPath(bladeA[0], bladeA[1], bladeB[0], bladeB[1], 53, 2, 1), 'flash', { seed: 53 });
  s.push(g);
  // f3 — blade crawl re-jitters + ground skitter at the drag point behind him
  g = eclipse(wf[3], 3);
  bakeBolt(g, boltPath(bladeA[0], bladeA[1] + 1, bladeB[0] + 1, bladeB[1], 59, 2, 1), 'flash',
    { branches: [{ frac: 0.6, dx: -4, dy: -3 }], seed: 59 });
  bakeBolt(g, boltPath(2, 46, 10, 46, 61, 0, 1), 'flash', { seed: 61 });
  s.push(g);
  // f4 — the flare breaks: blade + ground arcs fracture, arm arc dies to ash
  g = eclipse(wf[4], 4);
  bakeBolt(g, boltPath(bladeA[0], bladeA[1], bladeB[0], bladeB[1], 53, 2, 1), 'fracture');
  bakeBolt(g, boltPath(2, 46, 10, 46, 61, 0, 1), 'fracture');
  bakeBolt(g, boltPath(core[0], core[1], fist[0], fist[1] + 1, 43, 1, 2), 'ash');
  s.push(g);
  // f5 — exit: body one step back toward normal, ash sinks off the sword line
  g = darkenStep(wf[5]);
  bakeBolt(g, boltPath(bladeA[0], bladeA[1], bladeB[0], bladeB[1], 53, 2, 1), 'ash');
  s.push(g);
  return s;
}

// ===== SURGE BACKWARD — 4 frames riding the walkBackward poses (~1s). =====
// Lightning stays HIGH: CROWN + one arc per SHOULDER + SPINE crawl + an arc
// tearing off the trailing edge into empty space UP-BACK (clear of the lifted
// blade below). Forward surge = low / weapon-line, backward surge = high /
// crown-spine — the required placement difference, preserved from v1.
function surgeBackwardFrames() {
  const wb = walkBackwardFrames();
  const s = [];
  // f0 — entry: dark step, ignite at the crown
  let g = darkenStep(wb[0]);
  bakeBolt(g, boltPath(14, 1, 18, 3, 71, 1, 1), 'ignite');
  s.push(g);
  // f1 — full eclipse: crown arc + one short crackle arc per shoulder
  g = eclipse(wb[1], 5);
  bakeBolt(g, boltPath(10, 3, 20, 1, 73, 1, 2), 'flash', { seed: 73 });
  bakeBolt(g, boltPath(5, 13, 13, 9, 79, 1, 2), 'flash',
    { branches: [{ frac: 0.5, dx: -3, dy: 4 }], seed: 79 });
  bakeBolt(g, boltPath(19, 9, 28, 12, 81, 1, 2), 'flash', { seed: 81 });
  s.push(g);
  // f2 — spine crawl down the back contour + an arc tears off the trailing edge
  g = eclipse(wb[2], 6);
  bakeBolt(g, boltPath(8, 9, 6, 26, 83, 2, 1), 'flash', { seed: 83 });
  bakeBolt(g, boltPath(6, 15, 1, 20, 89, 1, 1), 'fracture');
  bakeBolt(g, boltPath(10, 3, 20, 1, 73, 1, 2), 'fracture');
  s.push(g);
  // f3 — exit: dark step back, ash sinks off shoulders and spine
  g = darkenStep(wb[3]);
  bakeBolt(g, boltPath(5, 13, 13, 9, 79, 1, 2), 'ash');
  bakeBolt(g, boltPath(19, 9, 28, 12, 81, 1, 2), 'ash');
  bakeBolt(g, boltPath(8, 9, 6, 26, 83, 2, 1), 'ash');
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
// the rejected v1 front carry, rebuilt for the study panel only (NOT a clip)
const OLD_FRONT = stringify(frame({ carry: 'front' }));

// ---------- validation (drop-in law) ----------
const LEGAL = new Set([...'012345abcdgh.']);
let vErr = 0;
for (const [n, frames] of Object.entries(CLIPS)) frames.forEach((f, i) => {
  if (f.length !== 48 || f.some(r => r.length !== 46)) { console.error('SIZE FAIL', n, i); vErr++; }
  for (const r of f) for (const k of r) if (!LEGAL.has(k)) { console.error('KEY FAIL', n, i, k); vErr++; }
  let low = -1; f.forEach((r, y) => { if ([...r].some(k => k !== '.')) low = y; });
  if (low < 46) { console.error('FLOOR FAIL', n, i, low); vErr++; }
});
if (vErr) throw new Error('validation failed: ' + vErr);

// ================= SHEET CANVAS =================
const SW = 346, SH = 642, SCALE = 4;
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
text('STAGE 7B-0R - BOSS LOCOMOTION R2 - REAR TRAILING CARRY - REAL 46X48 DROP-INS', 3, 2, HEADC);
const A_Y = 10, CELL = 48, ROWH = 64;
const ROWS = [
  ['idle', 'IDLE - 3F BREATH - REAR LOW CARRY - TIP RESTS BEHIND'],
  ['walkForward', 'WALK FWD - 6F HEAVY ADVANCE - BLADE DRAGS BEHIND - SPARKS ON PLANT'],
  ['walkBackward', 'WALK BWD - 4F GLIDE - FROZEN FEET - GUARD UP - TIP LIFTED'],
  ['surgeForward', 'SURGE FWD - 6F 1S - ARCS CHEST + REAR ARM + BLADE + GROUND'],
  ['surgeBackward', 'SURGE BWD - 4F 1S - ARCS CROWN + SHOULDERS + SPINE'],
];
ROWS.forEach(([n, label], r) => {
  const y = A_Y + r * ROWH;
  text(label, 3, y, HEADC);
  CLIPS[n].forEach((f, c) => {
    stampM(f.map(s => [...s]), BOSS_PAL, 3 + c * CELL, y + 7);
    text(String(c), 3 + c * CELL + 22, y + 7 + 49, '#4a4560');
  });
});

// ---------- band A right column: carry correction study + drag spark ----------
const R_X = 296;
(() => {
  text('CARRY', R_X, A_Y, HEADC); text('OLD-NEW', R_X, A_Y + 6, HEADC);
  const dim = k => ('abcdgh'.includes(k) ? BOSS_PAL[k] : '#272233');
  // OLD — the rejected v1 FRONT carry (body dimmed, ember sword kept visible)
  cellFrame(R_X, A_Y + 13, 46, 54, '#100d1c');
  stampM(OLD_FRONT.map(s => [...s]), BOSS_PAL, R_X, A_Y + 16, { tintFn: dim });
  paint(R_X, A_Y + 63, 46, 1, NF1, 1);
  text('V1 FRONT', R_X + 2, A_Y + 69, '#4a4560');
  // NEW — the R2 REAR trailing carry (full color)
  cellFrame(R_X, A_Y + 79, 46, 54, '#100d1c');
  stampM(CLIPS.idle[0].map(s => [...s]), BOSS_PAL, R_X, A_Y + 82);
  paint(R_X, A_Y + 129, 46, 1, NF1, 1);
  text('V2 REAR', R_X + 2, A_Y + 135, '#4a4560');
})();
// drag-spark zoom (2x): the plant frame's rear scrape read (tip drags LEFT-BEHIND)
(() => {
  const y = A_Y + 146;
  text('DRAG', R_X, y, HEADC); text('SPARK 2X', R_X, y + 6, HEADC);
  cellFrame(R_X, y + 13, 46, 30, '#100d1c');
  const ox = R_X + 4, oy = y + 15;
  const B2 = (x, yy, k) => paint(ox + x * 2, oy + yy * 2, 2, 2, BOSS_PAL[k], 1);
  // blade tip diagonal down-LEFT + floor + sparks kicked up-back (behind him)
  B2(16, 0, 'b'); B2(15, 1, 'c'); B2(14, 2, 'c'); B2(13, 3, 'd'); B2(12, 4, 'd');
  B2(17, 0, '1'); B2(16, 1, '1'); B2(15, 2, '1'); B2(14, 3, '1');
  B2(11, 5, 'd');                                             // hot tip on the floor
  B2(9, 4, 'c'); B2(8, 3, 'a');                               // spark thrown up-back
  B2(13, 5, 'c'); B2(9, 5, 'a'); B2(7, 5, 'a');               // scrape ticks behind
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
    dot(bx + 20, by + 15); dot(bx + 12, by + 24);            // chest core -> REAR fist
    dash(bx + 19, by + 16, bx + 13, by + 24);
    dash(bx + 12, by + 29, bx + 6, by + 43);                 // beside-blade crawl (trailing)
    dash(bx + 2, by + 46, bx + 10, by + 46);                 // ground skitter behind him
    dot(bx + 3, by + 45);
  });
  mk(282, CLIPS.walkBackward[1], 'BWD MAP', (bx, by) => {
    dot(bx + 15, by + 1);                                    // crown
    dash(bx + 10, by + 3, bx + 20, by + 1);
    dash(bx + 5, by + 13, bx + 13, by + 9);                  // rear shoulder arc
    dash(bx + 19, by + 9, bx + 28, by + 12);                 // lead shoulder arc
    dash(bx + 8, by + 9, bx + 6, by + 26);                   // spine crawl
    dash(bx + 6, by + 15, bx + 1, by + 20);                  // trailing tear-off (up-back)
    dot(bx + 6, by + 25);
  });
})();

// ---------- band F: FACING LAW (runtime mirror keeps the sword trailing) ----------
const F_Y = B_Y + 72;
text('FACING LAW - ALWAYS FACE THE HERO - SWORD ON THE TRAILING SIDE', 3, F_Y, HEADC);
(() => {
  const idle0 = CLIPS.idle[0].map(s => [...s]);
  const dashLine = (x0, x1, y) => { for (let x = x0; x < x1; x += 4) paint(x, y, 2, 1, E1, 1); };
  const head = (x, y, dir) => { paint(x, y, 1, 1, E2, 1); paint(x - dir, y - 1, 1, 1, E2, 1); paint(x - dir, y + 1, 1, 1, E2, 1); };
  // cell A — hero on the RIGHT: authored frame as-is, sword trails LEFT
  cellFrame(3, F_Y + 7, 166, 56, '#100d1c');
  paint(3, F_Y + 7 + 51, 166, 1, NF1, 1); paint(3, F_Y + 7 + 52, 166, 4, NF0, 1);
  stampM(idle0, BOSS_PAL, 3 + 30, F_Y + 11);
  stampM(heroBase, HERO_PAL, 3 + 126, F_Y + 35, { mir: true });
  dashLine(3 + 82, 3 + 120, F_Y + 34); head(3 + 121, F_Y + 34, 1);
  text('HERO RIGHT - SWORD TRAILS LEFT', 5, F_Y + 66, '#4a4560');
  // cell B — hero on the LEFT: the SAME frame runtime-mirrored, sword trails RIGHT
  cellFrame(177, F_Y + 7, 166, 56, '#100d1c');
  paint(177, F_Y + 7 + 51, 166, 1, NF1, 1); paint(177, F_Y + 7 + 52, 166, 4, NF0, 1);
  stampM(heroBase, HERO_PAL, 177 + 10, F_Y + 35);
  stampM(idle0, BOSS_PAL, 177 + 90, F_Y + 11, { mir: true });
  dashLine(177 + 46, 177 + 86, F_Y + 34); head(177 + 45, F_Y + 34, -1);
  text('HERO LEFT - SWORD TRAILS RIGHT', 179, F_Y + 66, '#4a4560');
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
// tableau 1 — heavy advance mid-surge toward a hero on the RIGHT; the dragged
// blade, its live spark and the smoke wake all trail BEHIND him (left).
(() => {
  const oy = F_Y + 76;
  text('TABLEAU - FWD ADVANCE MID-SURGE - HERO RIGHT', 3, oy, HEADC);
  const floorY = nightRoom(3, oy + 7, T_W, T_H, 58);
  const bx = 3 + 96, by = floorY - 47;
  // scuff ticks + smoke wake trailing the advance (behind the drag point)
  [[-8, 1], [-20, 1], [-32, 2]].forEach(([dx, dy]) => paint(bx + 2 + dx, floorY + dy, 3, 1, '#0c0a12', 1));
  [[-4, -3], [-14, -5], [-24, -2]].forEach(([dx, dy]) => paint(bx + 2 + dx, floorY + dy, 3, 1, SMK, 0.8));
  stampM(CLIPS.surgeForward[2].map(s => [...s]), BOSS_PAL, bx, by);
  paint(bx + 2, floorY - 1, 2, 1, E2, 1); paint(bx - 2, floorY - 1, 1, 1, E0, 1); // live drag spark
  const hx = 3 + 268, hy = floorY - 23;
  stampM(heroBase, HERO_PAL, hx, hy, { mir: true });
})();
// tableau 2 — backward glide mid-surge AWAY from a hero on the LEFT: the whole
// frame is runtime-MIRRORED (sword trails right), afterimages stream toward the
// hero side (his facing side — where he just was).
(() => {
  const oy = F_Y + 76 + 81;
  text('TABLEAU - BWD GLIDE MID-SURGE - HERO LEFT - MIRRORED', 3, oy, HEADC);
  const floorY = nightRoom(3, oy + 7, T_W, T_H, 58);
  const bx = 3 + 190, by = floorY - 47;
  const gf = CLIPS.surgeBackward[1].map(s => [...s]);
  stampM(gf, BOSS_PAL, bx - 24, by, { mir: true, tintFn: (k, x, y) => ((x + y) % 2 ? '#0c0a14' : null) });
  stampM(gf, BOSS_PAL, bx - 12, by, { mir: true, tintFn: (k, x, y) => ((x + y) % 3 === 0 ? null : '#12101c') });
  stampM(gf, BOSS_PAL, bx, by, { mir: true });
  const hx = 3 + 26, hy = floorY - 23;
  stampM(heroBase, HERO_PAL, hx, hy);
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
fs.writeFileSync(__dirname+'/walk2_v1.png',Buffer.concat([Buffer.from([0x89,0x50,0x4E,0x47,0x0D,0x0A,0x1A,0x0A]),
  chunk('IHDR',ihdr),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]));

// ---------- JS-literal dump ----------
let js = '// === BOSS_REDESIGN_SPRITES additions/replacements (46x48, BOSS_REDESIGN_PALETTE) ===\n';
js += '// STAGE 7B-0R (rear trailing carry) — SUPERSEDES walk_literal.txt (7B-0).\n';
js += '// idle REPLACES the current idle; walkForward REPLACES run; walkBackward REPLACES retreat.\n';
js += '// surgeForward / surgeBackward are NEW render-only overlay clips (see walk2_spec.md).\n';
for (const n of Object.keys(CLIPS)) {
  js += `  ${n}: [\n`;
  for (const f of CLIPS[n]) js += '    [' + f.map(r => JSON.stringify(r)).join(', ') + '],\n';
  js += '  ],\n';
}
fs.writeFileSync(__dirname + '/walk2_literal.txt', js);

const widths = [...new Set(Object.values(CLIPS).flat().map(f => f[0].length))];
const heights = [...new Set(Object.values(CLIPS).flat().map(f => f.length))];
// report the sword-tip resting cells for the record
const tipReport = {};
[['idle', 0], ['walkForward', 1], ['walkBackward', 0]].forEach(([n, i]) => {
  const f = CLIPS[n][i]; let cells = [];
  f.forEach((r, y) => { for (let x = 0; x < 14; x++) if (r[x] === 'd') cells.push([x, y]); });
  tipReport[n] = cells.length ? cells[cells.length - 1] : null;
});
console.log('wrote walk2_v1.png', IW + 'x' + IH,
  '| clips:', Object.keys(CLIPS).map(n => `${n}(${CLIPS[n].length})`).join(' '),
  '| frame widths', JSON.stringify(widths), 'heights', JSON.stringify(heights),
  '| rear-tip cells', JSON.stringify(tipReport));
