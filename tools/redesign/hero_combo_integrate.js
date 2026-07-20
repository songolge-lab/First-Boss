// Stage 8B-3 — HERO COMBO / LIGHT ECLIPSE integration injector.
//
// Ports the APPROVED 8B-0 / 8B-1 artifacts into the live game, mechanically, from
// the 8B-2 drop-in modules. It NEVER re-authors art: every cell is copied verbatim
// out of hero_combo_dropin.mjs / hero_light_eclipse_dropin.mjs (which are themselves
// byte-proven against the approved literals by the 8B-2 validators).
//
// What it does — all three steps are idempotent (re-running is a no-op):
//   1. merges the six LIGHT keys into HERO_REDESIGN_PALETTE   (SpriteManager.js)
//   2. appends heroCombo1..4 to HERO_REDESIGN_SPRITES         (SpriteManager.js)
//   3. emits the reusable family module                       (src/core/HeroLightEclipse.js)
//
// The FSM phase-indexing + the drawSlashArc retirement are hand-written code changes
// in Enemy.js, NOT emitted here. Verify with: node hero_integration_validate.js
//
// Usage: node hero_combo_integrate.js

const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SRC = path.resolve(HERE, '..', '..', 'src');
const SPRITE_MANAGER = path.join(SRC, 'core', 'SpriteManager.js');
const FAMILY_MODULE = path.join(SRC, 'core', 'HeroLightEclipse.js');

// --- read the approved drop-ins ------------------------------------------------
// The drop-ins are ES modules; this is a CJS script (matching the other tools/).
// Strip the `export` keywords and eval the module body to lift the data out.
function loadDropin(file) {
    const text = fs.readFileSync(path.join(HERE, file), 'utf8');
    const body = text.replace(/^export const /gm, 'const ');
    const names = [...text.matchAll(/^export const (\w+)/gm)].map((m) => m[1]);
    // eslint-disable-next-line no-new-func
    return new Function(`${body}\nreturn { ${names.join(', ')} };`)();
}

const combo = loadDropin('hero_combo_dropin.mjs');
const eclipse = loadDropin('hero_light_eclipse_dropin.mjs');

// --- step 1 + 2: SpriteManager.js ---------------------------------------------
let sm = fs.readFileSync(SPRITE_MANAGER, 'utf8');
let changed1 = false;
let changed2 = false;

// The repo's src/ is CRLF. Emit in the target file's own EOL so the injected blocks
// don't land as a mixed-ending diff.
const EOL = sm.includes('\r\n') ? '\r\n' : '\n';
const eol = (s) => s.replace(/\r?\n/g, EOL);

// 1. palette merge. The six LIGHT keys are collision-free with the hero set
//    (. 0-5 n m l L g) — proven by hero_combo_validate.js's KEYS check.
if (!sm.includes("'W': '#fffdf4'")) {
    const heroPaletteRe = /(export const HERO_REDESIGN_PALETTE = \{\r?\n(?:.*\r?\n)*?)(\};)/;
    const m = sm.match(heroPaletteRe);
    if (!m) throw new Error('HERO_REDESIGN_PALETTE block not found');
    const lightLine = eol(
        '    // STAGE 8B-3 — the six HERO LIGHT ECLIPSE keys (approved 8B-0). White + gold\n' +
        '    // only; the warm law R>=G>=B holds on every step, so blue cannot exist in the\n' +
        "    // effect family. Zero collisions with the hero keys above; 'G' deliberately\n" +
        "    // shares the hero gold value ('g'). See src/core/HeroLightEclipse.js.\n" +
        "    'W': '#fffdf4', 'I': '#f2e6bf', 'y': '#f2c94e', 'o': '#e0a93c', 'G': '#c9962e', 'u': '#8a6420',\n");
    sm = sm.replace(heroPaletteRe, `$1${lightLine}$2`);
    changed1 = true;
}

// 2. clip paste. One frame per line — matching the boss 8A-2 port's formatting.
if (!sm.includes('heroCombo1: [')) {
    const fmt = (frames) => frames.map((f) => `    [${f.map((r) => JSON.stringify(r)).join(', ')}],`).join('\n');
    const header =
        '  // STAGE 8B-3 — HERO COMBO "DAYBREAK CHAIN" (approved 8B-1, extracted 8B-2).\n' +
        '  // The Hero\'s 4-hit direct sword chain: H1 FIRST LIGHT / H2 GILDED CREST /\n' +
        '  // H3 SUNPIERCE / H4 SOLSTICE. 18 frames on a 44x34 canvas (vs the 30x24 base:\n' +
        '  // headroom for overhead blades and smears), hero base pasted at (7,10), feet on\n' +
        '  // rows 32-33. Rows >= 20, so the Enemy animator\'s row-count detection already\n' +
        '  // routes these through HERO_REDESIGN_PALETTE at HERO_IDLE_PIXEL, and drawSprite\'s\n' +
        '  // centerX / feet-bottom anchor self-solves — no bespoke offsets.\n' +
        '  //\n' +
        '  // Frame order per hit == the live FSM phase order: WINDUP / ACTIVE-EARLY /\n' +
        '  // ACTIVE-HIT / LINK (H4 splits windup + link: W4A W4B / A4A A4B / P4 S4). The\n' +
        '  // HIT frame is HELD for the back half of each active window — that hold IS the\n' +
        '  // impact weight and the whole rhythm of the chain. Enemy._animState phase-indexes\n' +
        '  // these off _comboIndex / _comboPhase / _comboPhaseTimer; they must never free-run.\n' +
        '  //\n' +
        '  // The LIGHT ECLIPSE smears/trails are BAKED into these frames (drawn BEHIND the\n' +
        '  // body), which is why the runtime drawSlashArc melee hook is retired in Enemy.js\n' +
        '  // — firing both would double every trail.\n' +
        '  // Authored facing RIGHT like every hero clip; the runtime full-sprite flip mirrors.\n';
    const block = ['heroCombo1', 'heroCombo2', 'heroCombo3', 'heroCombo4']
        .map((k) => `  ${k}: [\n${fmt(combo.HERO_COMBO_SPRITES[k])}\n  ],`)
        .join('\n');

    const spritesRe = /(export const HERO_REDESIGN_SPRITES = \{\r?\n(?:.*\r?\n)*?)(\};)/;
    if (!spritesRe.test(sm)) throw new Error('HERO_REDESIGN_SPRITES block not found');
    sm = sm.replace(spritesRe, `$1${eol(header)}${eol(block)}${EOL}$2`);
    changed2 = true;
}

if (changed1 || changed2) fs.writeFileSync(SPRITE_MANAGER, sm);

// --- step 3: emit the reusable family module ----------------------------------
// The Light Eclipse is a NAMED, REUSABLE family (the Hero mirror of the boss's Red
// Eclipse) — not a one-off effect set for one animation. It gets its own module so
// every later Hero stage composes from these six families instead of inventing a
// new ramp. Data only: no painter, no seam, no gameplay.
const gridLit = (grid) => `[\n${grid.map((r) => `      ${JSON.stringify(r)},`).join('\n')}\n    ]`;

const families = Object.keys(eclipse.LIGHT_ECLIPSE_GRIDS)
    .map((k) => `  ${k}: [\n${eclipse.LIGHT_ECLIPSE_GRIDS[k].map((g) => `    ${gridLit(g)},`).join('\n')}\n  ],`)
    .join('\n');

const bodyFlare = eclipse.LIGHT_ECLIPSE_BODY_FLARE
    .map((set) => `  {\n${['back', 'front', 'body'].map((L) => `    ${L}: ${gridLit(set[L])},`).join('\n')}\n  },`)
    .join('\n');

const anchors = JSON.stringify(eclipse.LIGHT_ECLIPSE_ANCHORS, null, 4)
    .replace(/^/gm, '').replace(/\n/g, '\n');
const holds = JSON.stringify(eclipse.LIGHT_ECLIPSE_HOLDS, null, 4);
const palette = JSON.stringify(eclipse.LIGHT_ECLIPSE_PALETTE, null, 4);

const familyModule = `// src/core/HeroLightEclipse.js
// ---------------------------------------------------------------------------
// HERO LIGHT ECLIPSE — the Hero's named, reusable VFX family (approved Stage
// 8B-0; ported to src/ in Stage 8B-3). AUTO-EMITTED by
// tools/redesign/hero_combo_integrate.js from the approved 8B-2 drop-in, which is
// itself byte-proven against the approved literal. DO NOT hand-edit the data.
//
//   A WHITE disc inside a GOLD corona.
//
// Where the Boss carries a void disc in a hot ember corona (RED ECLIPSE), the Hero
// carries a light eclipse. Holy / solar / luminous — clean and dangerous, never
// soft, never fiery. THE BOSS'S ASH SINKS. THE HERO'S MOTES RISE.
//
// This is a FAMILY, not an effect. Every future Hero light effect — combos, casts,
// parries, projectiles, finishers, the progression matrix's later unlocks
// (invuln_shield, ranged_projectile, multishot, enrage, apex_predator) — composes
// from these six families, plays the CYCLE grammar, and NEVER invents a new ramp.
// When a later stage needs Hero light the question is always "which Light Eclipse
// part is this?" — never "what new effect should I draw?".
//
// THE FIVE LAWS (never break these):
//   1. WHITE + GOLD only. ZERO BLUE, ever. The Hero's own cold-blue accents (visor /
//      sigil / blade glow) are the CHARACTER, not the effect. They stay; the family
//      never contains them.
//   2. True circles. The Hero owns sacred geometry; the Boss owns broken octagons.
//      NEVER bolts — the Boss shatters into jagged bolts, the Hero's rays peel into motes.
//   3. Light RISES. Motes lift and wink out. Light never ashes, never sinks, never smokes.
//   4. North dominates. The longest ray points up (ascension) — the exact inverse of
//      the Boss's south-dominant dive ray.
//   5. Strict pixel art. Hard cells. No blur, no gradients, no glow clouds, no alpha
//      washes, no shadowBlur. (The v1/v2 hero VFX were rejected for exactly this.)
//
// RENDER-ONLY LAW: these grids are overlays. They are NEVER hitboxes, never appear in
// getActiveHitboxes(), and carry no gameplay / timing / AI / physics meaning.
//
// LIVE CONSUMERS
//   • The 4-hit sword combo (heroCombo1..4 in SpriteManager) BAKES its Light Eclipse
//     usage — SLASH glint/shear/hit/follow, IMPACT star, HALO H0 snap, GROUND HALO
//     hint, CYCLE gather — directly into the frames, so it needs no painter here.
// Later stages (cast / parry / charged / ranged) paint FROM these grids at their own
// seams; each must retire the blue v4 effect it supersedes in the SAME pass, or two
// different families draw at once and law 1 breaks.
// ---------------------------------------------------------------------------

// Locked ramp. Warm law R >= G >= B on every step — blue cannot exist here.
// 'G' == the hero sprite's own gold key value; 'u' == the throne-room gold-dark, so
// the deep end anchors to golds already living in the game (native, not imported).
export const LIGHT_ECLIPSE_PALETTE = Object.freeze(${palette});

// Geometry contract — grid centres / anchors.
export const LIGHT_ECLIPSE_ANCHORS = Object.freeze(${anchors});

// Authored hold lengths (frames @60fps) — presentation only.
// NOTE lightCycle: R0<->R1 (indices 3,4) LOOP while the moment is held. A naive
// linear playthrough ends a "ready" state early and the charge reads as finished
// before it is.
export const LIGHT_ECLIPSE_HOLDS = Object.freeze(${holds});

// The six families. All grids are LIGHT-keys-only (validated: zero blue, zero hero
// keys) and render at the hero 2px grid.
//   EMBLEM  — the core motif; micro glyph is the same language at 13x13.
//             Escalation ladder: micro glyph -> impact star -> full emblem.
//   HALO    — H0 SNAP -> H1 SETTLE -> H2 SHIMMER (loops). GROUND HALO sits under the
//             feet ON the floor line (cy row 6 must land on the arena floor, not the
//             grid bottom, or the ellipse floats/clips).
//   SLASH   — S0 GLINT -> S1 SHEAR -> S2 HIT (HOLD) -> S3 FOLLOW. Authored travelling
//             RIGHT; mirror with the existing facing flip, never a hand-rolled one.
//   IMPACT  — P0 FLASH -> P1 STAR -> P2 SPARK-OUT, at the strike contact point.
//             Scales by pixel size, not by new art.
//   CYCLE   — the family GRAMMAR every use follows: GATHER -> IGNITE -> RELEASE
//             (loops while held) -> DISSOLVE (rays peel into motes that RISE).
export const LIGHT_ECLIPSE_GRIDS = Object.freeze({
${families}
});

// BODY FLARE — the centred eclipse on the Dawnguard Knight: BF0 GATHER / BF1 PEAK /
// BF2 RISE. Each set is { back, front, body }; layer order is back -> body -> front.
// \`body\` is the RADIANT SKIN: a palette-only re-skin of the hero (one ramp step
// brighter + a broken gold rim via the hero's own 'g' key), drawn IN PLACE OF the
// normal sprite. It is the exact inverse of the boss's eclipseSkin — the Boss goes
// void, the Hero goes radiant. Its non-empty mask is byte-identical to the base hero
// matrix, so the geometry can never desync from the character.
// The grid centre col == the hero centre col, so the EXISTING aimDir/facing full-sprite
// mirror self-anchors the whole effect. Do not hand-roll a midline mirror — that shifts
// it off the chest core when facing left.
export const LIGHT_ECLIPSE_BODY_FLARE = Object.freeze([
${bodyFlare}
]);
`;

const familyOut = eol(familyModule);
const prev = fs.existsSync(FAMILY_MODULE) ? fs.readFileSync(FAMILY_MODULE, 'utf8') : null;
const changed3 = prev !== familyOut;
if (changed3) fs.writeFileSync(FAMILY_MODULE, familyOut);

console.log('[8B-3 INTEGRATE]');
console.log(`  palette merge     : ${changed1 ? 'INJECTED' : 'already present (no-op)'}`);
console.log(`  heroCombo1..4     : ${changed2 ? 'INJECTED' : 'already present (no-op)'}`);
console.log(`  HeroLightEclipse  : ${changed3 ? 'EMITTED' : 'already up to date (no-op)'}`);
console.log('  (Enemy.js FSM phase-indexing + drawSlashArc retirement are hand-written.)');
