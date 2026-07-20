// Stage 8C-5 — DRAGON WRATH + COMBO B integration injector.
//
// Ports the APPROVED Stage 8C-3 shipping literals into the live game, mechanically.
// It NEVER re-authors art: every cell is copied verbatim out of
//   dragon_wrath_literal.txt   (state + finisher grids)
//   hero_combo_b_literal.txt   (the two empowered swings)
// both of which are themselves byte-proven against the approved v2 production
// package by dragon_wrath_combo_b_validate.js (85 checks).
//
// What it emits — idempotent (re-running rewrites the same bytes):
//   src/core/dragonWrathData.js
//     HERO_DRAGON_WRATH_SPRITES  the 5 body clips (60x40)  -> merged into HERO_SHEET
//     DRAGON_WRATH_GRIDS         wrathBurst2 + lightGreatsword2 (world/screen grids)
//     WRATH_BLADE_STUDY          the 5-state weapon study (documentation)
//     DRAGON_WRATH_CLOCK         the approved master clock + per-frame holds, lifted
//                                verbatim from the literals' META so the runtime
//                                schedule IS the approved schedule (never retyped)
//
// The sequence CONTROLLER (src/entities/HeroDragonWrath.js) and the Enemy.js /
// main.js wiring are hand-written code, NOT emitted here.
//
// The obsolete v1 package is refused (see assertV2 below).
//
// Usage: node dragon_wrath_integrate.js

'use strict';
const fs = require('fs');
const path = require('path');

const HERE = __dirname;
const SRC = path.resolve(HERE, '..', '..', 'src');
const OUT = path.join(SRC, 'core', 'dragonWrathData.js');

const STATE_LITERAL = 'dragon_wrath_literal.txt';
const SWING_LITERAL = 'hero_combo_b_literal.txt';

// --- read an approved shipping literal ----------------------------------------
// The literals are object-body FRAGMENTS carrying a /*META ... META*/ JSON header.
// Line comments are stripped; the block comment is inert to eval.
function loadLiteral(file) {
    const raw = fs.readFileSync(path.join(HERE, file), 'utf8').replace(/\r/g, '');
    const meta = JSON.parse(raw.match(/\/\*META\n([\s\S]*?)\nMETA\*\//)[1]);
    const body = raw
        .replace(/\/\*META[\s\S]*?META\*\//, '')
        .split('\n')
        .filter((l) => !l.trimStart().startsWith('//'))
        .join('\n');
    // eslint-disable-next-line no-eval
    return { meta, data: eval('({' + body + '})') };
}

// --- refuse the superseded v1 package -----------------------------------------
function assertV2(meta, file) {
    if (!/v2/i.test(meta.stage || '')) {
        throw new Error(`${file}: stage "${meta.stage}" is not the approved v2 package — refusing.`);
    }
}

const state = loadLiteral(STATE_LITERAL);
const swings = loadLiteral(SWING_LITERAL);
assertV2(state.meta, STATE_LITERAL);
assertV2(swings.meta, SWING_LITERAL);

// --- the five body clips, in approved sequence order --------------------------
const BODY = {
    dragonWrathRise2: state.data.dragonWrathRise2,
    heroComboB2Swing1: swings.data.heroComboB2Swing1,
    heroComboB2Swing2: swings.data.heroComboB2Swing2,
    wrathCharge2: state.data.wrathCharge2,
    wrathRelease2: state.data.wrathRelease2,
};
const GRIDS = {
    wrathBurst2: state.data.wrathBurst2,
    lightGreatsword2: state.data.lightGreatsword2,
};
const STUDY = { wrathBladeStudy2: state.data.wrathBladeStudy2 };

for (const [k, v] of Object.entries({ ...BODY, ...GRIDS, ...STUDY })) {
    if (!Array.isArray(v) || !v.length) throw new Error(`missing/empty clip: ${k}`);
}

// --- the approved clock, lifted verbatim from META ----------------------------
// frameOrder holds are the ONLY source of the runtime schedule. Swing holds come
// from the swing literal's own META; everything else from the state literal's.
const clock = {
    total: state.meta.clock.total,
    sections: state.meta.clock.sections,
    darkenStart: state.meta.clock.darkenStart,
    darkenLift: state.meta.clock.darkenLift,
    flashStart: state.meta.clock.flashStart,
    flashLen: state.meta.clock.flashLen,
    flashFull: state.meta.clock.flashFull,
    greatsword: state.meta.clock.greatsword,
    frameOrder: {
        dragonWrathRise2: state.meta.frameOrder.dragonWrathRise2,
        heroComboB2Swing1: swings.meta.frameOrder.heroComboB2Swing1,
        heroComboB2Swing2: swings.meta.frameOrder.heroComboB2Swing2,
        wrathCharge2: state.meta.frameOrder.wrathCharge2,
        wrathRelease2: state.meta.frameOrder.wrathRelease2,
    },
    world: state.meta.world,
    canvas: state.meta.canvas,
};

// Prove the emitted schedule closes on the approved master clock before writing.
const sum = (name) => clock.frameOrder[name].reduce((a, f) => a + f.hold, 0);
const sections = [
    ['dragonWrathRise2', 'rise'],
    ['heroComboB2Swing1', 'swing1'],
    ['heroComboB2Swing2', 'swing2'],
    ['wrathCharge2', 'charge'],
    ['wrathRelease2', 'release'],
];
let acc = 0;
for (const [clip, sec] of sections) {
    const len = sum(clip);
    const s = clock.sections[sec];
    if (len !== s.len) throw new Error(`${clip}: holds sum ${len} != approved section len ${s.len}`);
    if (acc !== s.t0) throw new Error(`${clip}: starts at ${acc} != approved t0 ${s.t0}`);
    acc += len;
}
if (acc !== clock.total) throw new Error(`schedule sums ${acc} != approved total ${clock.total}`);
if (Object.keys(clock.frameOrder).filter((k) => /Swing/.test(k)).length !== 2) {
    throw new Error('Combo B must be EXACTLY two swings — refusing.');
}

// --- emit ---------------------------------------------------------------------
const q = (s) => JSON.stringify(s);
const emitClip = (name, frames) =>
    `  ${name}: [\n${frames.map((f) => `    [${f.map(q).join(', ')}],`).join('\n')}\n  ],`;
const emitGroup = (frames) => frames.map((f) => `    [${f.map(q).join(', ')}],`).join('\n');

const out = `// AUTO-GENERATED (Stage 8C-5) from tools/redesign/dragon_wrath_literal.txt +
// hero_combo_b_literal.txt — do not edit by hand; regenerate with
// tools/redesign/dragon_wrath_integrate.js.
//
// The approved DRAGON WRATH + HERO COMBO B package (reference-faithful Stage 8C-1
// "v2"), byte-exact from the Stage 8C-3 technical handoff. The superseded v1
// package is NOT used.
//
// BODY CLIPS — 60x40, hero base at (15,16), feet row 39. Row count >= 20 routes
// them to HERO_REDESIGN_PALETTE at HERO_IDLE_PIXEL, exactly like the DAYBREAK and
// MERIDIAN clips. Every effect (radiance, crown halo, trails, streamers, the
// transformed WRATH BLADE) is BAKED into these frames — no runtime slash hook may
// fire over them or every swing shows two trails.
//
//   dragonWrathRise2   8f  activation: present -> raise -> ignite -> build -> snap
//                          -> streaks -> flourish -> WRATH IDLE (the empowered stance)
//   heroComboB2Swing1  5f  Swing 1 — THE CRASH        (overhead -> low-front crescent)
//   heroComboB2Swing2  5f  Swing 2 — THE SWEEP / LUNGE (low floor-skim -> lunge -> rise
//                          -> shoulder, which IS the charge pose)
//   wrathCharge2       5f  the shouldered CROWN CHARGE (90 ticks = ~1.5 s)
//   wrathRelease2      2f  F1 GUARD under the fall, F2 SETTLE — the state ENDS
//
// WORLD / SCREEN GRIDS — detached, pure-LIGHT, they do NOT ride the sprite anchor:
//   wrathBurst2       3f 41x41, centre (20,20) — the strong flash that CLEARS
//   lightGreatsword2  6f 41x88 (82x176 px), col 20, TIP row 80 pins to the floor
//
// WRATH_BLADE_STUDY is the 5-state weapon documentation (steel -> ignite ->
// empowered -> flare -> settle). Reference data; not rendered.
export const HERO_DRAGON_WRATH_SPRITES = {
${Object.entries(BODY).map(([n, f]) => emitClip(n, f)).join('\n')}
};

export const DRAGON_WRATH_GRIDS = {
${Object.entries(GRIDS).map(([n, f]) => emitClip(n, f)).join('\n')}
};

// Weapon-state documentation (25x13). Not rendered — it exists so the empowered
// blade form stays reproducible without guessing (handoff §2).
export const WRATH_BLADE_STUDY = [
${emitGroup(STUDY.wrathBladeStudy2)}
];

// The approved master clock, lifted verbatim from the shipping literals' META so
// the runtime schedule can never drift from the handoff. 201 ticks @60fps; the
// controller runs 1 tick per game frame, so the charge measures 90/60 = 1.5 s.
export const DRAGON_WRATH_CLOCK = ${JSON.stringify(clock, null, 2)};
`;

fs.writeFileSync(OUT, out);
const cells =
    Object.values({ ...BODY, ...GRIDS, ...STUDY }).reduce((a, f) => a + f.reduce((b, g) => b + g.length, 0), 0);
console.log(`wrote ${path.relative(path.resolve(HERE, '..', '..'), OUT)}`);
console.log(`  body clips : ${Object.keys(BODY).length} (${Object.values(BODY).reduce((a, f) => a + f.length, 0)} frames)`);
console.log(`  world grids: ${Object.keys(GRIDS).length} (${Object.values(GRIDS).reduce((a, f) => a + f.length, 0)} frames)`);
console.log(`  clock      : ${clock.total} ticks, charge ${clock.sections.charge.len}, darken ${clock.darkenStart}->${clock.darkenLift}, flash ${clock.flashStart}+${clock.flashLen}`);
console.log(`  rows copied: ${cells}`);
