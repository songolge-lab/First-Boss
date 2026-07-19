// Stage 8C-3 — DRAGON WRATH + COMBO B — literal EXTRACTOR (packaging only).
//
// Extraction / handoff only. This script NEVER re-authors art. It reads the
// APPROVED revised Stage 8C-1 source of truth —
//   dragon_wrath_combo_b_v2_literal.txt  (emitted by dragon_wrath_combo_b_v2_gen.js)
// — slices each approved clip block VERBATIM, and re-groups the eight clips
// into the two downstream integration concerns, each carrying a machine-
// readable META header (palette, anchors, holds, master clock, frame order,
// quality tiers, cleanup contract):
//
//   dragon_wrath_literal.txt  — the STATE + world-space finisher grids
//        dragonWrathRise2 · wrathCharge2 · wrathRelease2
//        wrathBurst2 · lightGreatsword2 · wrathBladeStudy2
//   hero_combo_b_literal.txt  — the two empowered swings
//        heroComboB2Swing1 · heroComboB2Swing2
//
// The clip text is copied byte-for-byte from the approved source, so the
// shipping literals are provably cell-identical to the approved production
// package (dragon_wrath_combo_b_validate.js re-proves this).
//
// The obsolete/rejected v1 package (dragon_wrath_combo_b_v1*) is NEVER read.
//
// Run:  node dragon_wrath_combo_b_extract.js
'use strict';
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const SRC = 'dragon_wrath_combo_b_v2_literal.txt';   // the approved v2 source of truth

// ---- guard: refuse to run against the superseded v1 package ----
const srcText = fs.readFileSync(path.join(DIR, SRC), 'utf8').replace(/\r/g, '');
if (/COMBO B v1 literals|8C-1 ORIGINAL/i.test(srcText) || !/v2 literals/i.test(srcText)) {
  throw new Error('refusing to extract: ' + SRC + ' is not the approved v2 source');
}

// ---- slice one approved clip block VERBATIM (matches the generator's own loader) ----
function sliceClip(name) {
  const m = srcText.match(new RegExp('(  ' + name + ': \\[[\\s\\S]*?\\n  \\],)'));
  if (!m) throw new Error('approved clip not found in source: ' + name);
  return m[1];
}
function parseFrames(block) {
  const inner = block.match(/\[([\s\S]*)\n  \],/)[1];
  return [...inner.matchAll(/\[((?:"[^"]*"(?:, )?)+)\]/g)]
    .map(fm => fm[1].split(', ').map(s => JSON.parse(s)));
}
function dimsOf(block) {
  const frames = parseFrames(block);
  return { frames: frames.length, h: frames[0].length, w: frames[0][0].length };
}

// ---- the canonical package metadata (mirrors dragon_wrath_combo_b_v2_gen.js) ----
// These are documentation/handoff constants, not new gameplay values. Every
// number is exactly what the approved generator asserts; the validator
// cross-checks the ones derivable from the shipping cells.
const PALETTE = {
  light: { W: '#fffdf4', I: '#f2e6bf', y: '#f2c94e', o: '#e0a93c', G: '#c9962e', u: '#8a6420' },
  hero: {
    '0': '#10141e', '1': '#2e3444', '2': '#4a5468', '3': '#7c88a0', '4': '#aeb9cc', '5': '#e2e8f2',
    n: '#141c30', m: '#1c2438', l: '#7fd4ff', L: '#b8ecff', g: '#c9962e',
  },
};
const CANVAS = {
  body: { w: 60, h: 40 }, origin: [15, 16], feetRow: 39, shoulder: [29, 28], hip: 30,
  baseReach: 11, wrathReach: 16, facing: 'RIGHT (runtime full-sprite flip mirrors)',
  onScreenPixel: 'HERO_IDLE_PIXEL 2 -> 120x80 px; row-count >= 20 routes to HERO_REDESIGN_PALETTE',
};
const WORLD = {
  burst: { w: 41, h: 41, cx: 20, cy: 20, space: 'screen/world sky point' },
  greatsword: {
    w: 41, h: 88, cx: 20, pommelRow: 2, guardRow: 12, tipRow: 80,
    onScreen: '82x176 px', space: 'world; TIP row 80 plants on the floor line',
  },
  bladeStudy: { w: 25, h: 13, space: 'documentation only (weapon-state study)' },
};
const CLOCK = {
  total: 201,
  sections: {
    rise:    { t0: 0,   len: 31 },
    swing1:  { t0: 31,  len: 18 },
    swing2:  { t0: 49,  len: 18 },
    charge:  { t0: 67,  len: 90 },   // 90 ticks = ~1.5 s (asserted)
    release: { t0: 157, len: 44 },
  },
  darkenStart: 117, darkenLift: 191,
  flashStart: 154, flashLen: 6, flashFull: 2,
  greatsword: { t0: 157, holds: [6, 6, 8, 4, 10, 10], t: [157, 163, 169, 177, 181, 191], contact: 177, peak: 181, end: 201 },
  note: 'presentation intent, NOT an FSM contract',
};
const TIERS = ['normal', 'lite', 'performance', 'auto'];

// ---- per-clip frame order (tag + phase + hold + behavior) ----
const FRAME_ORDER = {
  dragonWrathRise2: [
    { tag: 'P0 PRESENT',  phase: 'GATHER',     hold: 3, kind: 'oneshot' },
    { tag: 'P1 RAISE',    phase: 'GATHER',     hold: 3, kind: 'oneshot' },
    { tag: 'P2 IGNITE',   phase: 'IGNITE',     hold: 3, kind: 'oneshot' },
    { tag: 'P3 BUILD',    phase: 'BUILD',      hold: 6, kind: 'hold' },
    { tag: 'P4 SNAP',     phase: 'RELEASE',    hold: 5, kind: 'hold' },
    { tag: 'P5 STREAKS',  phase: 'RELEASE',    hold: 3, kind: 'oneshot' },
    { tag: 'P6 FLOURISH', phase: 'SETTLE',     hold: 4, kind: 'oneshot' },
    { tag: 'P7 WRATH IDLE', phase: 'STATE LOOP', hold: 4, kind: 'loop' },
  ],
  heroComboB2Swing1: [
    { tag: 'S1A CARRY',  phase: 'WINDUP',  hold: 3, kind: 'oneshot' },
    { tag: 'S1B PITCH',  phase: 'WINDUP',  hold: 2, kind: 'oneshot', note: 'back leg kicks up' },
    { tag: 'S1C CRASH',  phase: 'ACTIVE',  hold: 6, kind: 'hold', note: 'the giant crescent + floor star' },
    { tag: 'S1D CROUCH', phase: 'RECOVER', hold: 4, kind: 'oneshot', note: 'weight down, deep crouch' },
    { tag: 'S1E SETTLE', phase: 'RECOVER', hold: 3, kind: 'oneshot' },
  ],
  heroComboB2Swing2: [
    { tag: 'S2A DRAG',     phase: 'WINDUP', hold: 3, kind: 'oneshot' },
    { tag: 'S2B SWEEP',    phase: 'ACTIVE', hold: 6, kind: 'hold', note: 'low band + lunge + floor skim' },
    { tag: 'S2C LUNGE',    phase: 'FOLLOW', hold: 4, kind: 'hold', note: 'full stretch' },
    { tag: 'S2D RISE',     phase: 'FOLLOW', hold: 3, kind: 'oneshot', note: 'to vertical, fan' },
    { tag: 'S2E SHOULDER', phase: 'LINK',   hold: 2, kind: 'oneshot', note: 'charge entry (bswordcombo2 carry)' },
  ],
  wrathCharge2: [
    { tag: 'C0 PLANT',  phase: 'ENTRY',   hold: 10, kind: 'oneshot' },
    { tag: 'C1 EARLY',  phase: 'GATHER',  hold: 18, kind: 'hold', note: 'streamers build C1->C3' },
    { tag: 'C2 STRONG', phase: 'BUILD',   hold: 22, kind: 'hold' },
    { tag: 'C3 PEAK',   phase: 'PEAK',    hold: 28, kind: 'hold', note: 'arena darkens (tick 117)' },
    { tag: 'C4 LOOSE',  phase: 'RELEASE', hold: 12, kind: 'oneshot', note: 'the flash fires (tick 154)' },
  ],
  wrathRelease2: [
    { tag: 'F1 GUARD',  phase: 'WATCH',      hold: 22, kind: 'hold', note: 'under the fall' },
    { tag: 'F2 SETTLE', phase: 'STATE ENDS', hold: 22, kind: 'oneshot', note: 'blue returns, light rises' },
  ],
  wrathBurst2: [
    { tag: 'WB0 SEED',     kind: 'oneshot' },
    { tag: 'WB1 WHITEOUT', kind: 'hold', note: 'near-whiteout beat, white-share >= 45%' },
    { tag: 'WB2 CLEAR',    kind: 'oneshot', note: 'hollow core — never stuck' },
  ],
  lightGreatsword2: [
    { tag: 'GS0 FORM',    kind: 'oneshot', note: 'gold contour sketch high; motes converge' },
    { tag: 'GS1 REVEAL',  kind: 'hold', note: 'full golden blade hangs' },
    { tag: 'GS2 DESCENT', kind: 'oneshot', note: 'same sword + fall streaks (GS1 blade == GS2 blade, asserted)' },
    { tag: 'GS3 CONTACT', kind: 'oneshot', note: 'point meets the floor (tick 177)' },
    { tag: 'GS4 PEAK',    kind: 'hold', note: 'huge impact, double halo (tick 181)' },
    { tag: 'GS5 FADE',    kind: 'oneshot', note: 'burns out base-up; crown last; motes rise' },
  ],
  wrathBladeStudy2: [
    { tag: 'STUDY STEEL',     kind: 'doc', note: 'pre-wrath cold-blue blade, reach 11' },
    { tag: 'STUDY IGNITE',    kind: 'doc', note: 'gold runs hilt->tip' },
    { tag: 'STUDY EMPOWERED', kind: 'doc', note: 'W core + gold body, reach 16' },
    { tag: 'STUDY FLARE',     kind: 'doc', note: 'white crackle + tip star' },
    { tag: 'STUDY SETTLE',    kind: 'doc', note: 'gold drains, blue edge returns' },
  ],
};

// ---- cleanup / interruption contract (documentation the validator asserts is present) ----
const CLEANUP = {
  normalCompletion: 'F2 SETTLE drains the state at tick 201: blue blade returns, radiance streamers break into rising motes, darken lifts (191), flash long cleared, giant sword dissolved.',
  interruption: 'any interrupt must: remove the transformed blade (restore the cold-blue steel blade), drop radiance/streamers/crown-halo, cancel any pending giant sword + burst, and restore the screen (lift darken, kill flash). No stale screen treatment or floating sword may survive.',
  heroDeath: 'Dragon Wrath must NOT survive Hero death: force the interruption cleanup on death; the giant sword and burst are world-space and must be despawned explicitly.',
  encounterReset: 'on encounter reset, purge all Dragon Wrath render state (state flag, blade transform, world-space effects, screen overlay) so a fresh encounter starts clean.',
  repeatedUse: 'each activation must spawn exactly one giant sword + one burst; guard against duplicate world-space effects and duplicate darken/letterbox overlays across re-triggers.',
  screenOverlay: 'darken + letterbox + flash are a single render-only overlay pass; it must be idempotent and always restored (darken lift 191, flash <= 6 ticks).',
};

// ---- build a literal file: META header + verbatim approved clip blocks ----
function build(title, note, meta, clipNames) {
  const clips = clipNames.map(n => ({ name: n, block: sliceClip(n), dims: dimsOf(sliceClip(n)) }));
  const dims = {};
  clips.forEach(c => { dims[c.name] = c.dims; });
  const fullMeta = { ...meta, dims };
  const head = [
    '// === ' + title + ' — Stage 8C-3 extracted shipping literal ===',
    '// ' + note,
    '// EXTRACTED VERBATIM from the approved dragon_wrath_combo_b_v2_literal.txt.',
    '// Do not hand-edit the grids; regenerate with dragon_wrath_combo_b_extract.js.',
    '// Nothing here is wired into src/. The obsolete v1 package is NOT used.',
    '/*META',
    JSON.stringify(fullMeta, null, 2),
    'META*/',
    '',
  ].join('\n');
  const body = clips.map(c => c.block).join('\n');
  return head + body + '\n';
}

const stateMeta = {
  package: 'DRAGON WRATH', family: 'HERO LIGHT ECLIPSE', stage: '8C-1 v2 (reference-faithful redo)',
  concern: 'state + world-space finisher grids',
  palette: PALETTE, canvas: CANVAS, world: WORLD, clock: CLOCK, tiers: TIERS,
  frameOrder: {
    dragonWrathRise2: FRAME_ORDER.dragonWrathRise2,
    wrathCharge2: FRAME_ORDER.wrathCharge2,
    wrathRelease2: FRAME_ORDER.wrathRelease2,
    wrathBurst2: FRAME_ORDER.wrathBurst2,
    lightGreatsword2: FRAME_ORDER.lightGreatsword2,
    wrathBladeStudy2: FRAME_ORDER.wrathBladeStudy2,
  },
  cleanup: CLEANUP,
};
const comboMeta = {
  package: 'DRAGON WRATH / COMBO B', family: 'HERO LIGHT ECLIPSE', stage: '8C-1 v2 (reference-faithful redo)',
  concern: 'the two empowered swings',
  swingCount: 2, thirdSwing: false,
  reference: 'bswordcombo (Insignia @adamcyounis) f0-f8 -> Swing 1; f9-f30 -> Swing 2',
  swings: {
    swing1: { name: 'THE CRASH', center: [null], radius: 20, arc: [-125, 55], hands: 2,
      contactFrame: 'S1C CRASH', contactAnchorRow: 'low-front crescent + floor star' },
    swing2: { name: 'THE SWEEP / LUNGE', charge2: [29, 16], radius: 19, arc: [150, 28],
      rise: [28, -85], shoulder: -128, hands: 2, contactFrame: 'S2B SWEEP', note: 'longest lunge in the clip; skims the floor' },
  },
  palette: PALETTE, canvas: CANVAS, tiers: TIERS,
  frameOrder: { heroComboB2Swing1: FRAME_ORDER.heroComboB2Swing1, heroComboB2Swing2: FRAME_ORDER.heroComboB2Swing2 },
};

const stateFile = build(
  'DRAGON WRATH STATE + FINISHER',
  'Activation (dragonWrathRise2) -> reusable WRATH IDLE, the 1.5 s CROWN CHARGE (wrathCharge2), the settle (wrathRelease2), and the world-space DRAGONFALL grids (wrathBurst2 flash, lightGreatsword2 giant sword, wrathBladeStudy2 weapon states).',
  stateMeta,
  ['dragonWrathRise2', 'wrathCharge2', 'wrathRelease2', 'wrathBurst2', 'lightGreatsword2', 'wrathBladeStudy2'],
);
const comboFile = build(
  'HERO COMBO B — TWO EMPOWERED SWINGS',
  'Exactly two swings: Swing 1 THE CRASH (overhead->low-front) and Swing 2 THE SWEEP into the full-stretch lunge. There is NO third swing.',
  comboMeta,
  ['heroComboB2Swing1', 'heroComboB2Swing2'],
);

fs.writeFileSync(path.join(DIR, 'dragon_wrath_literal.txt'), stateFile);
fs.writeFileSync(path.join(DIR, 'hero_combo_b_literal.txt'), comboFile);
console.log('[extract] wrote dragon_wrath_literal.txt  (' + stateFile.length + ' bytes)');
console.log('[extract] wrote hero_combo_b_literal.txt   (' + comboFile.length + ' bytes)');
console.log('[extract] source of truth: ' + SRC + ' (approved v2; v1 NOT used)');
