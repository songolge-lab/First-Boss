// Stage 8B-3 — INTEGRATION validator.
//
// Proves that what actually landed in src/ IS the approved art, and that the live
// wiring obeys the handoff contracts. It reads the LIVE SOURCE (src/core/SpriteManager.js,
// src/core/HeroLightEclipse.js, src/entities/Enemy.js) and byte-compares against the
// APPROVED literals — never against the injector's own output — so it certifies the
// shipped game, independent of how the paste happened.
//
// Usage: node hero_integration_validate.js   (exit 0 = ALL PASSED)

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SRC = path.resolve(HERE, '..', '..', 'src');
const SM_PATH = path.join(SRC, 'core', 'SpriteManager.js');
const FAM_PATH = path.join(SRC, 'core', 'HeroLightEclipse.js');
const ENEMY_PATH = path.join(SRC, 'entities', 'Enemy.js');

let pass = 0;
let fail = 0;
const check = (tag, ok, msg) => {
    (ok ? pass++ : fail++);
    console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${tag.padEnd(9)} ${msg}`);
};

// --- load the LIVE source as data ---------------------------------------------
function loadLive(file, names) {
    let text = fs.readFileSync(file, 'utf8');
    text = text.replace(/^import[\s\S]*?;$/gm, '').replace(/^export /gm, '');
    // eslint-disable-next-line no-new-func
    return new Function(`${text}\nreturn { ${names.join(', ')} };`)();
}
function loadDropin(file) {
    const text = fs.readFileSync(path.join(HERE, file), 'utf8');
    const body = text.replace(/^export const /gm, 'const ');
    const names = [...text.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);
    // eslint-disable-next-line no-new-func
    return new Function(`${body}\nreturn { ${names.join(', ')} };`)();
}

// The approved literal is the SOURCE OF TRUTH. It is an object-body fragment, so it
// needs eval-wrapping (this is exactly why the 8B-2 drop-ins exist).
function loadLiteral(file) {
    const frag = fs.readFileSync(path.join(HERE, file), 'utf8').trim().replace(/,\s*$/, '');
    // eslint-disable-next-line no-new-func
    return new Function(`return { ${frag} };`)();
}

const live = loadLive(SM_PATH, ['HERO_REDESIGN_SPRITES', 'HERO_REDESIGN_PALETTE']);
const fam = loadLive(FAM_PATH, ['LIGHT_ECLIPSE_GRIDS', 'LIGHT_ECLIPSE_PALETTE', 'LIGHT_ECLIPSE_BODY_FLARE']);
const comboLit = loadLiteral('hero_combo_literal.txt');
const eclipseLit = loadLiteral('hero_eclipse_literal.txt');
const eclipseDrop = loadDropin('hero_light_eclipse_dropin.mjs');
const enemySrc = fs.readFileSync(ENEMY_PATH, 'utf8');

console.log('\n[8B-3 INTEGRATION VALIDATE] — live src/ vs the APPROVED artifacts\n');

// --- 1. the combo clips in the LIVE SpriteManager are the approved art ---------
const comboKeys = ['heroCombo1', 'heroCombo2', 'heroCombo3', 'heroCombo4'];
const litKey = (k) => k; // the literal uses the same clip names
let cells = 0;
let diffs = 0;
let missing = [];
for (const k of comboKeys) {
    const a = live.HERO_REDESIGN_SPRITES[k];
    const b = comboLit[litKey(k)];
    if (!a || !b) { missing.push(k); continue; }
    if (a.length !== b.length) { diffs++; continue; }
    for (let f = 0; f < a.length; f++) {
        for (let r = 0; r < b[f].length; r++) {
            for (let c = 0; c < b[f][r].length; c++) {
                cells++;
                if (a[f][r][c] !== b[f][r][c]) diffs++;
            }
        }
    }
}
check('EXTRACT', missing.length === 0 && diffs === 0,
    `live heroCombo1..4 == approved literal: ${cells} cells, ${diffs} diffs${missing.length ? ` (MISSING ${missing})` : ''}`);

const counts = comboKeys.map((k) => (live.HERO_REDESIGN_SPRITES[k] || []).length);
check('CLIPS', String(counts) === '4,4,4,6', `frame counts ${counts} (want 4,4,4,6 = 18 frames)`);

const dims = comboKeys.every((k) => (live.HERO_REDESIGN_SPRITES[k] || []).every(
    (f) => f.length === 34 && f.every((r) => r.length === 44)));
check('DIMS', dims, 'all 18 live frames are exactly 44x34');

// --- 2. palette merge: the six LIGHT keys are live and collision-free ----------
const LIGHT = { W: '#fffdf4', I: '#f2e6bf', y: '#f2c94e', o: '#e0a93c', G: '#c9962e', u: '#8a6420' };
const paletteOk = Object.entries(LIGHT).every(([k, v]) => live.HERO_REDESIGN_PALETTE[k] === v);
check('PALETTE', paletteOk, `all six LIGHT keys merged into HERO_REDESIGN_PALETTE with the locked values`);

// Warm law: blue can never exist in the family ramp.
const warm = Object.values(LIGHT).every((hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.substr(i, 2), 16));
    return r >= g && g >= b;
});
check('WARMLAW', warm, 'R >= G >= B on all six LIGHT steps — blue cannot exist in the ramp');

// Every cell of the live clips must resolve to a real palette entry, or the light
// silently drops out at render time.
const legal = new Set(Object.keys(live.HERO_REDESIGN_PALETTE));
let illegal = new Set();
for (const k of comboKeys) {
    for (const f of live.HERO_REDESIGN_SPRITES[k] || []) {
        for (const row of f) for (const ch of row) if (!legal.has(ch)) illegal.add(ch);
    }
}
check('KEYS', illegal.size === 0, `every live combo cell resolves in HERO_REDESIGN_PALETTE${illegal.size ? ` (STRAY: ${[...illegal]})` : ''}`);

// --- 3. floor + body: the re-pose never lost the knight or floated him ---------
// Feet/shadow live on rows 32-33; the clips must plant on them or the Hero pops.
const floorOk = comboKeys.every((k) => (live.HERO_REDESIGN_SPRITES[k] || []).every(
    (f) => f[32].trim() !== '' || f[33].trim() !== ''));
check('FLOOR', floorOk, '18/18 live frames plant on the feet rows (32-33) — no float, no floor clip');

const HERO_KEYS = new Set(['0', '1', '2', '3', '4', '5', 'n', 'm', 'l', 'L', 'g']);
const bodyOk = comboKeys.every((k) => (live.HERO_REDESIGN_SPRITES[k] || []).every(
    (f) => f.some((r) => [...r].some((ch) => HERO_KEYS.has(ch)))));
check('BODY', bodyOk, '18/18 live frames still carry the Dawnguard Knight body');

// --- 4. the escalation read (composite level — see hero_combo_handoff.md §9.1) --
// H1 glint-only << mid band << H4 dominant. NOT strict H1<H2<H3<H4: the composite
// inverts H2/H3 because the body occludes more of H3's thrust lance. Art is correct.
const LIGHT_KEYS = new Set(Object.keys(LIGHT));
const litePx = (f) => f.reduce((n, r) => n + [...r].filter((ch) => LIGHT_KEYS.has(ch)).length, 0);
const hitFrame = { heroCombo1: 2, heroCombo2: 2, heroCombo3: 2, heroCombo4: 3 };
const hitLight = comboKeys.map((k) => litePx(live.HERO_REDESIGN_SPRITES[k][hitFrame[k]]));
check('GLINT', hitLight[0] <= 6, `H1's hit frame is glint-only: ${hitLight[0]} LIGHT px (the light is asleep)`);
check('PEAK', hitLight[3] > 1.5 * Math.max(hitLight[0], hitLight[1], hitLight[2]),
    `H4 SOLSTICE dominates: ${hitLight[3]} LIGHT px vs max ${Math.max(...hitLight.slice(0, 3))}`);
check('ESCALAT', hitLight[0] < Math.min(hitLight[1], hitLight[2]) && Math.max(hitLight[1], hitLight[2]) < hitLight[3],
    `composite escalation H1 ${hitLight[0]} << mid [${hitLight[1]}, ${hitLight[2]}] << H4 ${hitLight[3]}`);

// --- 5. the reusable family module is the approved 8B-0 art -------------------
let fCells = 0;
let fDiffs = 0;
const famKeys = Object.keys(eclipseDrop.LIGHT_ECLIPSE_GRIDS);
for (const k of famKeys) {
    const a = fam.LIGHT_ECLIPSE_GRIDS[k];
    const b = eclipseLit[k];
    if (!a || !b || a.length !== b.length) { fDiffs++; continue; }
    for (let g = 0; g < b.length; g++) {
        for (let r = 0; r < b[g].length; r++) {
            for (let c = 0; c < b[g][r].length; c++) { fCells++; if (a[g][r][c] !== b[g][r][c]) fDiffs++; }
        }
    }
}
// 7 grid keys grouping into the 6 NAMED families (emblem + its micro glyph; halo +
// ground halo), 22 grids total: emblem 1 + micro 1 + halo 3 + ground 2 + slash 4 +
// impact 3 + cycle 8. BODY FLARE is the 6th family and is checked separately below.
const gridCount = famKeys.reduce((n, k) => n + fam.LIGHT_ECLIPSE_GRIDS[k].length, 0);
check('FAMILY', fDiffs === 0 && famKeys.length === 7 && gridCount === 22,
    `live HeroLightEclipse grids == approved literal: ${famKeys.length} keys / ${gridCount} grids, ${fCells} cells, ${fDiffs} diffs`);

// Law 1 — the family itself can never contain the hero's cold blues.
let leak = new Set();
for (const k of famKeys) {
    for (const g of fam.LIGHT_ECLIPSE_GRIDS[k]) {
        for (const row of g) for (const ch of row) if (ch !== '.' && !LIGHT_KEYS.has(ch)) leak.add(ch);
    }
}
check('NOBLUE', leak.size === 0,
    `all live family grids are LIGHT-keys-only — zero blue, zero hero keys${leak.size ? ` (LEAK: ${[...leak]})` : ''}`);

check('BODYFLR', fam.LIGHT_ECLIPSE_BODY_FLARE.length === 3 &&
    fam.LIGHT_ECLIPSE_BODY_FLARE.every((s) => s.back && s.front && s.body),
    '3/3 live BODY FLARE sets carry { back, front, body } (radiant re-skin intact)');

// --- 6. the live wiring contracts ---------------------------------------------
// The single highest wiring risk: the baked trail + the runtime hook both firing.
const slashRetired = !/^\s*if \(this\.moveState === MoveState\.ATTACKING && this\._comboPhase === 'active'\) this\.drawSlashArc\(ctx\);/m.test(enemySrc);
check('RETIRED', slashRetired, 'the melee drawSlashArc hook is NOT called — baked trails cannot double');

// ...but the pogo/air-attack seam is a DIFFERENT hook and must stay live.
check('POGO', /drawPogoStrike\(ctx\)\s*\{[\s\S]*?SpriteManager\.drawHolySlash/.test(enemySrc),
    'the separate pogo/air-attack drawHolySlash seam is still live');

check('PHASEIX', /_comboAnim\(\)\s*\{/.test(enemySrc) && /return this\._comboAnim\(\);/.test(enemySrc),
    'the combo clips are phase-indexed off the FSM via _comboAnim (not free-run)');

// The FSM shapes are read-only for this stage. Any edit here is a gameplay change.
const combos = enemySrc.match(/\{ windup: (\d+), active: (\d+), link: (\d+),/g) || [];
const shapes = combos.map((s) => s.match(/\d+/g).join('/')).join(' ');
check('FSM', shapes === '5/4/7 3/4/7 3/4/8 6/6/10',
    `COMBO.HITS windows untouched: ${shapes}`);

// The hold IS the feel — assert the thresholds still put the HIT frame in each
// active window's back half rather than letting it flash past.
const holdOk = /index = t > 2 \? 1 : 2;/.test(enemySrc) && /index = t > 3 \? 2 : 3;/.test(enemySrc);
check('HOLD', holdOk, 'the HIT frame is HELD for the back half of every active window');

console.log(`\n  ${fail === 0 ? 'ALL PASSED' : 'FAILURES PRESENT'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
