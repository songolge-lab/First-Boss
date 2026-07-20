// Stage 8B-2 — drop-in EXTRACTOR for the approved Hero package.
//
// Reads the two APPROVED literal artifacts and re-packages them as ready-to-paste
// ES modules. Extraction only: every matrix is copied CELL-FOR-CELL from the
// approved literal. No re-authoring, no re-generation, no redesign — if this
// script ever changes a pixel, hero_*_validate.js fails the byte-compare.
//
//   node hero_dropin_extract.js     (rewrites the two *_dropin.mjs files)
//
// Why the *_dropin.mjs files exist at all: the approved *_literal.txt artifacts are
// object-body FRAGMENTS (they need eval-wrapping in braces to parse). The drop-in
// modules are the same data as importable ES modules with the locked palettes
// attached, so Stage 8B-3 can `import` them instead of hand-pasting text.
//
// Reads nothing under src/. Writes only tools/redesign/*_dropin.mjs.
'use strict';
const fs = require('fs');
const DIR = __dirname;

// ---------- the locked LIGHT ECLIPSE ramp (8B-0, approved) ----------
// Warm law: every step satisfies R >= G >= B, so blue cannot exist in the ramp.
// 'G' == the hero sprite's own gold key value; 'u' == the throne-room gold-dark.
const LIGHT = {
  W: '#fffdf4',   // white core / glints / ray hearts
  I: '#f2e6bf',   // ivory transitions / rising motes
  y: '#f2c94e',   // radiant gold / corona ring / ray body / halo
  o: '#e0a93c',   // warm gold / ray outer / trailing rims / teeth
  G: '#c9962e',   // deep gold / tips / rim winks  (== hero key 'g')
  u: '#8a6420',   // bronze / dissolve motes / rare dark edge (== throne gold-dark)
};

// ---------- parse an approved literal fragment ----------
function loadLiteral(file) {
  const raw = fs.readFileSync(DIR + '/' + file, 'utf8').replace(/\r/g, '');
  const body = raw.split('\n').filter(l => !l.trimStart().startsWith('//')).join('\n');
  return eval('({' + body + '})');
}

// ---------- emit ----------
const q = s => JSON.stringify(s);
const emitFrame = f => '    [' + f.map(q).join(',\n     ') + ']';
const emitClip = (name, frames) =>
  `  ${name}: [\n${frames.map(emitFrame).join(',\n')}\n  ],`;

function header(title, notes) {
  return [
    '// ' + title,
    '// AUTO-EXTRACTED by hero_dropin_extract.js from the APPROVED literal artifact.',
    '// DO NOT hand-edit: regenerate with `node hero_dropin_extract.js`.',
    '// Cell-for-cell identical to the approved sheet — see hero_*_validate.js.',
    ...notes.map(n => '// ' + n),
    '',
  ].join('\n');
}

const emitPalette = (name, obj, comment) =>
  `${comment}\nexport const ${name} = Object.freeze({\n` +
  Object.entries(obj).map(([k, v]) => `  ${q(k)}: ${q(v)},`).join('\n') +
  '\n});\n';

// ===================== hero combo drop-in =====================
{
  const C = loadLiteral('hero_combo_literal.txt');
  const CLIPS = ['heroCombo1', 'heroCombo2', 'heroCombo3', 'heroCombo4'];
  const out = [
    header('Stage 8B-2 — HERO COMBO "DAYBREAK CHAIN" drop-in matrices (8B-1 approved).', [
      '4-hit direct sword chain, 18 frames, 44x34 canvas, hero base at (7,10), feet row 33.',
      'Frame order per hit == FSM phase order: WINDUP / ACTIVE-EARLY / ACTIVE-HIT / LINK.',
      'H4 is 6 frames: W4A W4B / A4A A4B(HIT) / P4 S4.',
      'Effects are BAKED into the frames (smears set BEHIND the body).',
      'RENDER-ONLY: no hitbox, timing, damage, AI or physics change.',
    ]),
    emitPalette('LIGHT_KEYS', LIGHT,
      '// The six LIGHT ECLIPSE keys. Merge into HERO_REDESIGN_PALETTE at integration —\n' +
      '// no key collides with the hero set (. 0-5 n m l L g).'),
    '',
    '// Merge-ready palette: hero keys + LIGHT keys. Spread over HERO_REDESIGN_PALETTE.',
    'export const HERO_COMBO_PALETTE_EXT = LIGHT_KEYS;',
    '',
    '// Suggested animator holds — PRESENTATION ONLY, see hero_combo_handoff.md §5.',
    '// These clips are phase-indexed off the live FSM, not free-running.',
    'export const HERO_COMBO_FRAME_COUNTS = Object.freeze({ heroCombo1: 4, heroCombo2: 4, heroCombo3: 4, heroCombo4: 6 });',
    '',
    '// Paste these four keys into HERO_REDESIGN_SPRITES (src/core/SpriteManager.js).',
    'export const HERO_COMBO_SPRITES = {',
    CLIPS.map(n => emitClip(n, C[n])).join('\n'),
    '};',
    '',
  ].join('\n');
  fs.writeFileSync(DIR + '/hero_combo_dropin.mjs', out);
  console.log('wrote hero_combo_dropin.mjs  (18 frames, 44x34)');
}

// ===================== hero light eclipse drop-in =====================
{
  const E = loadLiteral('hero_eclipse_literal.txt');
  const GRIDS = ['lightEmblem', 'lightEmblemMicro', 'lightHalo', 'lightGroundHalo',
    'lightSlash', 'lightImpact', 'lightCycle'];
  // NOTE: each of back/front/body is ONE grid (an array of row strings), so it must
  // be emitted flat — wrapping emitFrame's own brackets again would nest it a level
  // deep and silently break the drop-in shape. hero_eclipse_validate.js [EXTRACT]
  // byte-compares against the literal and catches exactly that.
  const emitGrid = (key, grid) =>
    `      ${key}: [\n        ` + grid.map(q).join(',\n        ') + '\n      ],';
  const bf = E.lightBodyFlare.map(fr =>
    '    {\n' +
    ['back', 'front', 'body'].map(k => emitGrid(k, fr[k])).join('\n') +
    '\n    },').join('\n');

  const out = [
    header('Stage 8B-2 — HERO LIGHT ECLIPSE reusable VFX family drop-in (8B-0 approved).', [
      'The Hero mirror of the boss RED ECLIPSE: a WHITE disc inside a GOLD corona.',
      'White + gold only. ZERO BLUE — the hero\'s own cold accents are the CHARACTER,',
      'never the effect. True circles (the boss owns broken octagons).',
      'Six families: EMBLEM / HALO / SLASH / IMPACT / CYCLE / BODYFLARE.',
      'All grids are RENDER-ONLY overlays at the hero 2px grid. Never hitboxes.',
    ]),
    emitPalette('LIGHT_ECLIPSE_PALETTE', { '.': null, ...LIGHT },
      '// Locked ramp. Warm law R >= G >= B on every step — blue cannot exist here.'),
    '',
    '// Geometry contract — grid centres / anchors. See hero_eclipse_handoff.md §4.',
    'export const LIGHT_ECLIPSE_ANCHORS = Object.freeze({',
    '  lightEmblem:      { w: 41, h: 41, cx: 20, cy: 20 },',
    '  lightEmblemMicro: { w: 13, h: 13, cx: 6,  cy: 6  },',
    '  lightHalo:        { w: 33, h: 33, cx: 16, cy: 16 },',
    '  lightGroundHalo:  { w: 41, h: 13, cx: 20, cy: 6, note: "cy sits ON the floor line" },',
    '  lightSlash:       { w: 37, h: 37, cx: 18, cy: 18, note: "authored travelling RIGHT" },',
    '  lightImpact:      { w: 21, h: 21, cx: 10, cy: 10, note: "sits at the strike contact point" },',
    '  lightCycle:       { w: 45, h: 45, cx: 22, cy: 22 },',
    '  lightBodyFlare:   { w: 48, h: 36, heroOriginX: 9, heroOriginY: 8, cx: 22, cy: 18, feet: 31,',
    '                      note: "cx == hero centre col: the existing aimDir mirror self-anchors it" },',
    '});',
    '',
    '// Authored hold lengths (frames @60fps) — presentation only.',
    'export const LIGHT_ECLIPSE_HOLDS = Object.freeze({',
    '  lightHalo:       [4, 5, 6],           // H0 SNAP / H1 SETTLE / H2 SHIMMER (loop)',
    '  lightSlash:      [3, 3, 6, 3],        // S0 GLINT / S1 SHEAR / S2 HIT (HOLD) / S3 FOLLOW',
    '  lightImpact:     [2, 4, 3],           // P0 FLASH / P1 STAR / P2 SPARK-OUT',
    '  lightCycle:      [6, 6, 4, 5, 5, 4, 5, 6], // G0 G1 I0 R0 R1 D0 D1 D2 (R0<->R1 loops while held)',
    '  lightGroundHalo: [4, 4],',
    '});',
    '',
    'export const LIGHT_ECLIPSE_GRIDS = {',
    GRIDS.map(n => emitClip(n, E[n])).join('\n'),
    '};',
    '',
    '// BODYFLARE: back draws BEHIND the sprite, front OVER it, body is the radiant',
    '// re-skin (HERO keys only; mask is byte-identical to the base hero matrix).',
    'export const LIGHT_ECLIPSE_BODY_FLARE = [',
    bf,
    '];',
    '',
  ].join('\n');
  fs.writeFileSync(DIR + '/hero_light_eclipse_dropin.mjs', out);
  console.log('wrote hero_light_eclipse_dropin.mjs  (6 families + bodyflare)');
}
