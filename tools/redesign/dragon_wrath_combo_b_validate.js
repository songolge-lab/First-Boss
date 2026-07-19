// Stage 8C-3 — DRAGON WRATH + COMBO B — SHIPPING-LITERAL VALIDATOR.
//
// Inspects the LITERAL DATA that will later be integrated (the two extracted
// shipping literals + their META), NOT merely that a generator can execute.
// It also byte-compares the shipping cells against the APPROVED v2 source of
// truth so no redesign drift can slip in during packaging.
//
// Reads the ARTIFACTS:
//   dragon_wrath_literal.txt   (state + world-space finisher grids + META)
//   hero_combo_b_literal.txt   (the two empowered swings + META)
//   dragon_wrath_combo_b_v2_literal.txt  (approved source of truth — for the byte-compare)
//
// Fails LOUDLY (non-zero exit) when required shipping literal data or handoff
// metadata is missing or wrong. Guards specifically against the known
// integration hazards: the obsolete v1 package, a third swing, a shrunk
// blade, a mis-placed giant sword, missing cleanup metadata.
//
// Run:  node dragon_wrath_combo_b_validate.js     (exit 0 = ALL PASSED)
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
let PASS = 0;
const FAILS = [];
function ok(msg) { PASS++; console.log('  [ok] ' + msg); }
function bad(msg) { FAILS.push(msg); console.log('  [FAIL] ' + msg); }
function check(cond, msg, detail) { cond ? ok(msg) : bad(msg + (detail !== undefined ? ' -> ' + detail : '')); }

// ---- artifact loading ----
function readArtifact(file) {
  const text = fs.readFileSync(path.join(DIR, file), 'utf8').replace(/\r/g, '');
  return text;
}
function parseMeta(text, file) {
  const m = text.match(/\/\*META\n([\s\S]*?)\nMETA\*\//);
  if (!m) throw new Error('no META block in ' + file);
  return JSON.parse(m[1]);
}
function parseClips(text) {
  const out = {};
  const re = /  ([A-Za-z0-9]+): \[([\s\S]*?)\n  \],/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    out[m[1]] = [...m[2].matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)]
      .map(fm => fm[1].split(', ').map(s => JSON.parse(s).split('')));
  }
  return out;
}

const LEGAL = new Set(['.', 'W', 'I', 'y', 'o', 'G', 'u',
  '0', '1', '2', '3', '4', '5', 'n', 'm', 'l', 'L', 'g']);
const LIGHT = new Set(['W', 'I', 'y', 'o', 'G', 'u']);
const CHAR_BLUE = new Set(['l', 'L']);   // the character's own cold blue (visor/sigil/steel blade)
const lightCount = g => g.flat().filter(k => LIGHT.has(k)).length;

const stateText = readArtifact('dragon_wrath_literal.txt');
const comboText = readArtifact('hero_combo_b_literal.txt');
const srcText = readArtifact('dragon_wrath_combo_b_v2_literal.txt');

const stateMeta = parseMeta(stateText, 'dragon_wrath_literal.txt');
const comboMeta = parseMeta(comboText, 'hero_combo_b_literal.txt');
const stateClips = parseClips(stateText);
const comboClips = parseClips(comboText);
const srcClips = parseClips(srcText);
const ship = { ...stateClips, ...comboClips };

// ===================================================================
console.log('\n[SOURCE] approved v2 package — not the rejected v1');
// -------------------------------------------------------------------
check(/v2 literals/i.test(srcText), 'source is the approved v2 literal');
check(!/COMBO B v1 literals/i.test(srcText) && !/dragon_wrath_combo_b_v1/i.test(stateText),
  'obsolete v1 package is NOT referenced by the shipping state literal');
check(stateMeta.stage.includes('v2') && comboMeta.stage.includes('v2'), 'both META stamp the v2 redo stage');

// ===================================================================
console.log('\n[EXTRACT] shipping cells are byte-identical to the approved source');
// -------------------------------------------------------------------
const ALL_CLIPS = ['dragonWrathRise2', 'wrathCharge2', 'wrathRelease2', 'wrathBurst2',
  'lightGreatsword2', 'wrathBladeStudy2', 'heroComboB2Swing1', 'heroComboB2Swing2'];
let totalCells = 0, diffs = 0, missingClip = 0;
for (const name of ALL_CLIPS) {
  const s = srcClips[name], t = ship[name];
  if (!s || !t) { missingClip++; continue; }
  if (s.length !== t.length) { diffs++; continue; }
  for (let f = 0; f < s.length; f++)
    for (let y = 0; y < s[f].length; y++)
      for (let x = 0; x < s[f][y].length; x++) { totalCells++; if (s[f][y][x] !== t[f][y][x]) diffs++; }
}
check(missingClip === 0, 'all 8 approved clips present in the shipping literals', missingClip + ' missing');
check(diffs === 0, 'shipping cells match the approved source exactly (' + totalCells + ' cells)', diffs + ' diffs');

// ===================================================================
console.log('\n[CLIPS] required frame groups + dimensions + row widths');
// -------------------------------------------------------------------
const EXPECT = {
  dragonWrathRise2:   { frames: 8, w: 60, h: 40 },
  heroComboB2Swing1:  { frames: 5, w: 60, h: 40 },
  heroComboB2Swing2:  { frames: 5, w: 60, h: 40 },
  wrathCharge2:       { frames: 5, w: 60, h: 40 },
  wrathRelease2:      { frames: 2, w: 60, h: 40 },
  wrathBurst2:        { frames: 3, w: 41, h: 41 },
  lightGreatsword2:   { frames: 6, w: 41, h: 88 },
  wrathBladeStudy2:   { frames: 5, w: 25, h: 13 },
};
for (const [name, e] of Object.entries(EXPECT)) {
  const c = ship[name];
  if (!c) { bad('missing required frame group: ' + name); continue; }
  check(c.length === e.frames, name + ' frame count = ' + e.frames, c.length);
  let dimOK = true, widthOK = true;
  for (const fr of c) {
    if (fr.length !== e.h) dimOK = false;
    for (const row of fr) { if (row.length !== e.w) { widthOK = false; dimOK = false; } }
  }
  check(dimOK, name + ' every frame is ' + e.w + 'x' + e.h);
  check(widthOK, name + ' consistent row widths');
}

// ===================================================================
console.log('\n[PALETTE] legal entries + warm law (no blue can exist in effects)');
// -------------------------------------------------------------------
let illegal = 0, illegalWhere = '';
for (const [name, c] of Object.entries(ship))
  for (const fr of c) for (const row of fr) for (const k of row)
    if (!LEGAL.has(k)) { illegal++; if (!illegalWhere) illegalWhere = name + ':' + k; }
check(illegal === 0, 'every cell is a legal HERO+LIGHT key', illegal ? illegal + ' (' + illegalWhere + ')' : '');
// warm law R>=G>=B on the six LIGHT steps
let warmOK = true;
for (const hex of Object.values(stateMeta.palette.light)) {
  const r = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  if (!(r >= gg && gg >= b)) warmOK = false;
}
check(warmOK, 'LIGHT ramp obeys the warm law R>=G>=B (blue cannot exist)');
// world-space greatsword/burst carry no character blue (l/L) — pure LIGHT
let worldBlue = 0;
for (const name of ['wrathBurst2', 'lightGreatsword2'])
  for (const fr of ship[name]) for (const row of fr) for (const k of row) if (CHAR_BLUE.has(k)) worldBlue++;
check(worldBlue === 0, 'world-space grids (burst/greatsword) are pure LIGHT — no character blue');

// ===================================================================
console.log('\n[SWINGS] exactly two empowered swings — no obsolete third swing');
// -------------------------------------------------------------------
const swingClips = Object.keys(ship).filter(n => /Swing/i.test(n));
check(swingClips.length === 2, 'exactly 2 swing groups', swingClips.join(', '));
check(!ship.heroComboB2Swing3 && !srcClips.heroComboB2Swing3, 'no heroComboB2Swing3 anywhere');
check(comboMeta.swingCount === 2 && comboMeta.thirdSwing === false, 'combo META declares 2 swings, no third');
// the two swings must be visually distinct (different light footprints)
const s1Light = ship.heroComboB2Swing1.map(lightCount).reduce((a, b) => a + b, 0);
const s2Light = ship.heroComboB2Swing2.map(lightCount).reduce((a, b) => a + b, 0);
check(s1Light > 0 && s2Light > 0, 'both swings carry Light Eclipse trail cells', s1Light + ' / ' + s2Light);
check(s1Light !== s2Light, 'Swing 1 and Swing 2 are visually distinct', s1Light + ' vs ' + s2Light);

// ===================================================================
console.log('\n[ANCHORS] body / grip / sword / world anchors present');
// -------------------------------------------------------------------
const cv = stateMeta.canvas;
check(Array.isArray(cv.origin) && cv.origin.length === 2, 'hero sprite origin anchor present', JSON.stringify(cv.origin));
check(typeof cv.feetRow === 'number', 'feet/floor row anchor present', cv.feetRow);
check(Array.isArray(cv.shoulder), 'shoulder (grip root) anchor present', JSON.stringify(cv.shoulder));
check(typeof cv.hip === 'number', 'hip anchor present', cv.hip);
check(cv.wrathReach / cv.baseReach >= 1.3, 'transformed sword reach >= 1.3x steel', (cv.wrathReach / cv.baseReach).toFixed(2));
const gs = stateMeta.world.greatsword;
check(gs.w === 41 && gs.h === 88, 'giant sword dimensions 41x88', gs.w + 'x' + gs.h);
check(gs.cx === 20, 'giant sword horizontal centre = 20', gs.cx);
check(gs.tipRow === 80, 'giant sword floor-contact (TIP) row = 80', gs.tipRow);
check(gs.tipRow < gs.h, 'TIP row is inside the grid (plants, does not clip through)', gs.tipRow + ' < ' + gs.h);
const wb = stateMeta.world.burst;
check(wb.cx === 20 && wb.cy === 20, 'flash centre = (20,20)', wb.cx + ',' + wb.cy);

// verify the giant sword actually TAPERS to a point at the TIP row (not a beam)
const gs1 = ship.lightGreatsword2[1];
const widthAt = (g, y) => { let lo = -1, hi = -1; for (let x = 0; x < g[y].length; x++) if (g[y][x] !== '.') { if (lo < 0) lo = x; hi = x; } return lo < 0 ? 0 : hi - lo + 1; };
const guardW = widthAt(gs1, gs.guardRow), tipW = widthAt(gs1, gs.tipRow - 3);
check(guardW > tipW + 3, 'giant sword tapers guard->tip (a sword, not a vertical beam)', guardW + ' -> ' + tipW);
// descent identity: GS1 REVEAL blade == GS2 DESCENT blade
let descChanged = 0;
const rev = ship.lightGreatsword2[1], des = ship.lightGreatsword2[2];
for (let y = 0; y < rev.length; y++) for (let x = 0; x < rev[y].length; x++)
  if (rev[y][x] !== '.' && des[y][x] !== rev[y][x]) descChanged++;
check(descChanged === 0, 'GS1 REVEAL blade preserved through GS2 DESCENT (no stretch/shrink)', descChanged);

// ===================================================================
console.log('\n[ORDER] Swing 1 / Swing 2 / activation / charge frame ordering');
// -------------------------------------------------------------------
function orderTags(clip) { return (stateMeta.frameOrder[clip] || comboMeta.frameOrder[clip] || []).map(f => f.tag); }
function assertOrder(clip, expectHead) {
  const tags = orderTags(clip);
  const n = ship[clip].length;
  check(tags.length === n, clip + ' META frame order length matches clip', tags.length + ' vs ' + n);
  check(expectHead.every((t, i) => (tags[i] || '').startsWith(t)), clip + ' ordered: ' + expectHead.join(' -> '), tags.join(', '));
}
assertOrder('dragonWrathRise2', ['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7']);
assertOrder('heroComboB2Swing1', ['S1A', 'S1B', 'S1C', 'S1D', 'S1E']);
assertOrder('heroComboB2Swing2', ['S2A', 'S2B', 'S2C', 'S2D', 'S2E']);
assertOrder('wrathCharge2', ['C0', 'C1', 'C2', 'C3', 'C4']);
assertOrder('lightGreatsword2', ['GS0', 'GS1', 'GS2', 'GS3', 'GS4', 'GS5']);
assertOrder('wrathBladeStudy2', ['STUDY STEEL', 'STUDY IGNITE', 'STUDY EMPOWERED', 'STUDY FLARE', 'STUDY SETTLE']);
// two-handed active swing frames present (hands metadata)
check(comboMeta.swings.swing1.hands === 2 && comboMeta.swings.swing2.hands === 2, 'both active swings documented two-handed');

// ===================================================================
console.log('\n[CLOCK] charge=1.5s, darken, flash, giant-sword, close-together');
// -------------------------------------------------------------------
const clk = stateMeta.clock;
const secSum = Object.values(clk.sections).reduce((a, s) => a + s.len, 0);
check(secSum === clk.total, 'section holds sum to the total ' + clk.total, secSum);
check(clk.sections.charge.len === 90, 'charge is 90 ticks (~1.5 s)', clk.sections.charge.len);
check(clk.darkenStart === 117, 'darken starts at tick 117', clk.darkenStart);
check(clk.flashStart === 154 && clk.flashLen === 6 && clk.flashFull === 2,
  'flash: onset 154, len 6, 2-tick whiteout', `${clk.flashStart}/${clk.flashLen}/${clk.flashFull}`);
check(clk.flashStart - clk.darkenStart >= 24, 'darken leads the flash by >= 24 ticks', clk.flashStart - clk.darkenStart);
check(clk.flashLen <= 10 && clk.flashFull <= 4, 'flash is brief (does not linger)');
const g = clk.greatsword;
check(g.contact === 177 && g.peak === 181, 'giant sword contact 177, peak 181', g.contact + '/' + g.peak);
check(g.t0 + g.holds.reduce((a, b) => a + b, 0) === clk.total, 'greatsword clock closes with the master clock', g.end);
check(g.holds.length === ship.lightGreatsword2.length, 'greatsword descent groups match frame count', g.holds.length);

// ===================================================================
console.log('\n[FLASH/BURST] strong-flash-that-clears law survives in the cells');
// -------------------------------------------------------------------
const wShare = grid => grid.flat().filter(k => k === 'W').length / Math.max(1, lightCount(grid));
check(wShare(ship.wrathBurst2[1]) >= 0.45, 'burst peak frame is white-heavy (>=45%)', wShare(ship.wrathBurst2[1]).toFixed(2));
let hollow = 0;
ship.wrathBurst2[2].forEach((row, y) => row.forEach((k, x) => { if (k !== '.' && Math.hypot(x - wb.cx, y - wb.cy) < 4) hollow++; }));
check(hollow === 0, 'burst clears hollow (screen never stuck)', hollow);

// ===================================================================
console.log('\n[IMPACT/FADE] giant sword impact + base-up dissolution');
// -------------------------------------------------------------------
const gsFrames = ship.lightGreatsword2;
check(lightCount(gsFrames[5]) < lightCount(gsFrames[4]) * 0.75, 'FADE thins vs PEAK', lightCount(gsFrames[5]) + ' < ' + Math.round(lightCount(gsFrames[4]) * 0.75));
const thirdCount = (grid, lo, hi) => { let n = 0; grid.forEach((row, y) => { if (y >= lo && y < hi) row.forEach(k => { if (k !== '.') n++; }); }); return n; };
check(thirdCount(gsFrames[5], 59, 88) < thirdCount(gsFrames[4], 59, 88) * 0.6, 'buried (bottom) end burns out first');
check(thirdCount(gsFrames[5], 0, 29) > thirdCount(gsFrames[4], 0, 29) * 0.35, 'crown (top) survives longest');

// ===================================================================
console.log('\n[FACING] authored facing + mirror behavior documented');
// -------------------------------------------------------------------
check(/RIGHT/i.test(stateMeta.canvas.facing), 'authored facing RIGHT + runtime flip documented', stateMeta.canvas.facing);
check(/flip|mirror/i.test(stateMeta.canvas.facing) || /mirror/i.test(stateMeta.canvas.onScreenPixel), 'mirror rule captured');

// ===================================================================
console.log('\n[TIERS] quality tiers documented');
// -------------------------------------------------------------------
check(Array.isArray(stateMeta.tiers) && ['normal', 'lite', 'performance', 'auto'].every(t => stateMeta.tiers.includes(t)),
  'all four quality tiers present', (stateMeta.tiers || []).join(', '));

// ===================================================================
console.log('\n[CLEANUP] interruption / death / reset / repeat cleanup metadata');
// -------------------------------------------------------------------
const cl = stateMeta.cleanup || {};
for (const key of ['normalCompletion', 'interruption', 'heroDeath', 'encounterReset', 'repeatedUse', 'screenOverlay'])
  check(typeof cl[key] === 'string' && cl[key].length > 20, 'cleanup contract: ' + key + ' documented');

// ===================================================================
const total = PASS + FAILS.length;
console.log('\n' + '='.repeat(60));
if (FAILS.length === 0) {
  console.log('ALL PASSED — ' + PASS + '/' + total + ' checks');
  process.exit(0);
} else {
  console.log('FAILED — ' + FAILS.length + ' of ' + total + ' checks:');
  FAILS.forEach(f => console.log('  - ' + f));
  process.exit(1);
}
