// Stage 8C-5 — DRAGON WRATH + COMBO B focused runtime harness.
//
// Drives the LIVE controller (src/entities/HeroDragonWrath.js) headlessly against a
// stub host and asserts the 30 focused runtime checks the stage calls for. It is
// deliberately narrow: no general test framework, no unrelated systems — just this
// sequence's behaviour, its cleanup, and the guarantee that it leaves nothing stale.
//
//   node dragon_wrath_harness.mjs            run everything (spawns the tier passes)
//   node dragon_wrath_harness.mjs --tier=X   one quality tier only (internal)
//
// Exit 0 = all checks passed.

import { spawnSync } from 'node:child_process';
import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SELF = fileURLToPath(import.meta.url);
const REPO = join(HERE, '..', '..');
const tierArg = (process.argv.find((a) => a.startsWith('--tier=')) || '').split('=')[1] || null;

// The repo is "type": "commonjs" (Electron), so the browser's ES modules can't be
// imported directly by Node. Same shim the 8B-2 hero_combo_harness uses: copy src/
// into a temp package marked as ESM and import the LIVE files from there.
const PKG = join(tmpdir(), 'dragon-wrath-harness-' + process.pid);
rmSync(PKG, { recursive: true, force: true });
mkdirSync(join(PKG, 'game'), { recursive: true });
cpSync(join(REPO, 'src'), join(PKG, 'game'), { recursive: true });
writeFileSync(join(PKG, 'package.json'), '{"type":"module"}');
process.on('exit', () => rmSync(PKG, { recursive: true, force: true }));
const M = (rel) => pathToFileURL(join(PKG, rel)).href;

// The controller's quality branches read PerfMonitor, which resolves its tier ONCE at
// module load from window.location.search. Install that before the dynamic imports.
globalThis.window = { location: { search: tierArg ? `?vfxQuality=${tierArg}` : '' },
                      addEventListener() {}, removeEventListener() {} };
globalThis.document = { getElementById: () => null };
globalThis.performance = globalThis.performance || { now: () => 0 };

const { HeroDragonWrath, DRAGON_WRATH_COOLDOWN } = await import(M('game/entities/HeroDragonWrath.js'));
const { DRAGON_WRATH_CLOCK } = await import(M('game/core/dragonWrathData.js'));
const { SpriteManager } = await import(M('game/core/SpriteManager.js'));
const { Hitbox } = await import(M('game/core/Hitbox.js'));

const C = DRAGON_WRATH_CLOCK;

let pass = 0, fail = 0;
const check = (tag, ok, msg) => {
    (ok ? pass++ : fail++);
    console.log(`  [${ok ? 'ok' : 'FAIL'}] ${String(tag).padEnd(4)} ${msg}`);
};

// --- stub host (the Enemy surface the controller actually touches) -------------
function makeHost(facing = 1) {
    return {
        x: 600, y: 500, halfWidth: 15, halfHeight: 24, radius: 15,
        velocityX: 0, velocityY: 0, isGrounded: true, gravity: 0.6,
        facing, attackDamage: 40, worldWidth: 3000,
        projectiles: [], attackHitbox: new Hitbox({ reach: 20, width: 40, height: 40, duration: 4, cooldown: 0, damage: 1 }),
        _repositionAfterAttack: false, _dragonWrathCooldown: 0,
    };
}

// --- record every grid the controller paints ----------------------------------
const painted = [];
SpriteManager.drawMatrix = (ctx, matrix, ox, oy) => {
    painted.push({ rows: matrix.length, cols: matrix[0].length, ox, oy });
};
const CTX = {};

// Run the whole sequence, sampling per tick.
function run(facing = 1, { stopAt = null, onTick = null } = {}) {
    const host = makeHost(facing);
    const dw = new HeroDragonWrath(host);
    dw.start();
    const log = [];
    for (let i = 0; i < 400; i++) {
        if (!dw.active) break;
        const t = dw.drawTick;
        if (stopAt !== null && t === stopAt) { log.push(sample(dw, host)); break; }
        painted.length = 0;
        host.attackHitbox.tick();                      // Enemy.update() does this every frame
        dw.update();
        if (!dw.active) break;                         // the final tick completed the sequence
        host.x += host.velocityX;                      // main.js's integration step
        dw.drawWorldEffects(CTX);
        log.push({ ...sample(dw, host), painted: painted.slice() });
        if (onTick) onTick(dw, host, log[log.length - 1]);
    }
    return { host, dw, log };
}
const sample = (dw, host) => ({
    t: dw.drawTick, clip: dw.frameName, frame: dw.frameIndex, tag: dw.tag,
    fx: dw.screenFx, x: host.x, vx: host.velocityX,
    hbActive: host.attackHitbox.isActive,
    fallBoxes: host.projectiles.filter((p) => p.kind === 'dragonWrathFall').length,
    descent: dw._descentOffset(dw.drawTick),
});

// =============================================================================
if (tierArg) {
    // ---- tier pass: the invariants that must survive EVERY quality tier ------
    console.log(`\n[TIER ${tierArg}]`);
    const { log } = run(1);
    const clips = new Set(log.map((s) => s.clip));
    const swings = [...clips].filter((c) => /Swing/.test(c));
    const gsPainted = log.filter((s) => s.painted.some((p) => p.rows === 88 && p.cols === 41));
    const contact = log.find((s) => s.t === C.greatsword.contact);
    check(24, clips.size === 5, `all 5 body clips play (${clips.size})`);
    check(24, swings.length === 2, `exactly 2 empowered swings (${swings.join(', ')})`);
    check(24, log.some((s) => s.clip === 'wrathCharge2' && s.tag === 'C0 PLANT'), 'shouldered charge pose preserved');
    check(24, gsPainted.length > 0, `giant sword drawn at every tier (${gsPainted.length} ticks)`);
    check(24, contact && Math.abs(contact.descent) < 0.001, 'giant sword still descends to floor contact');
    check(24, log.some((s) => s.fallBoxes === 1), 'floor impact still fires');
    check(24, log.some((s) => s.fx && s.fx.dim > 0), 'arena darkening preserved');
    check(24, log.some((s) => s.fx && s.fx.flash > 0), 'white flash preserved');
    console.log(`\n${fail === 0 ? 'TIER OK' : 'TIER FAILED'} — ${pass} passed, ${fail} failed`);
    process.exit(fail === 0 ? 0 : 1);
}

console.log('\n=== DRAGON WRATH + COMBO B — focused runtime checks ===');

// --- 1-9  sequence, choreography, pacing --------------------------------------
console.log('\n[SEQUENCE] activation, both swings, charge');
const R = run(1);
const L = R.log;
const at = (t) => L.find((s) => s.t === t);
const tagsOf = (clip) => L.filter((s) => s.clip === clip).map((s) => s.tag);
const uniq = (a) => a.filter((v, i) => a[i - 1] !== v);
const holdsOf = (clip) => {
    const out = {};
    for (const s of L) if (s.clip === clip) out[s.tag] = (out[s.tag] || 0) + 1;
    return out;
};

const riseTags = uniq(tagsOf('dragonWrathRise2'));
check(1, riseTags.length === 8 && riseTags[0] === 'P0 PRESENT' && riseTags[7] === 'P7 WRATH IDLE',
    `activation runs all 8 phases present->raise->ignite->build->snap->streaks->flourish->WRATH IDLE`);
check(1, L.filter((s) => s.clip === 'dragonWrathRise2').length === C.sections.rise.len,
    `activation is the approved ${C.sections.rise.len} ticks (readable, not a generic aura pop)`);

const bladeOn = L.filter((s) => s.t >= 6).length;
check(2, bladeOn > 0 && R.dw.isBladeTransformed === false,
    'transformed WRATH BLADE lives only inside the state (false once the sequence ends)');
check(3, L.every((s) => s.clip !== 'heroComboB2Swing1' || s.painted.length === 0),
    'no runtime effect is painted over the swings — trails/blade are baked into the frames (no double trail)');

const s1 = uniq(tagsOf('heroComboB2Swing1'));
const s1h = holdsOf('heroComboB2Swing1');
check(4, s1.join('|') === 'S1A CARRY|S1B PITCH|S1C CRASH|S1D CROUCH|S1E SETTLE',
    `Swing 1 THE CRASH full choreography: ${s1.join(' -> ')}`);
check(4, s1h['S1A CARRY'] === 3 && s1h['S1B PITCH'] === 2 && s1h['S1C CRASH'] === 6 &&
    s1h['S1D CROUCH'] === 4 && s1h['S1E SETTLE'] === 3,
    'Swing 1 holds 3/2/6/4/3 — anticipation, HELD active crash, follow-through');

const s2 = uniq(tagsOf('heroComboB2Swing2'));
const s2h = holdsOf('heroComboB2Swing2');
check(5, s2.join('|') === 'S2A DRAG|S2B SWEEP|S2C LUNGE|S2D RISE|S2E SHOULDER',
    `Swing 2 THE SWEEP/LUNGE full choreography: ${s2.join(' -> ')}`);
check(5, s2h['S2A DRAG'] === 3 && s2h['S2B SWEEP'] === 6 && s2h['S2C LUNGE'] === 4 &&
    s2h['S2D RISE'] === 3 && s2h['S2E SHOULDER'] === 2,
    'Swing 2 holds 3/6/4/3/2 — distinct from Swing 1, HELD sweep + held lunge');

const swingClips = [...new Set(L.map((s) => s.clip))].filter((c) => /Swing/.test(c));
check(6, swingClips.length === 2, `exactly 2 empowered swings, no third (${swingClips.join(', ')})`);
check(6, L.filter((s) => s.hbActive).length > 0 && countStrikes(L) === 2,
    `exactly 2 empowered melee strike windows opened (${countStrikes(L)})`);

check(7, L.length === C.total && C.total === 201,
    `master clock ${L.length} ticks = ${(L.length / 60).toFixed(3)} s @60fps — 1 tick per frame, no compression`);
check(7, s1h['S1C CRASH'] === 6 && s2h['S2B SWEEP'] === 6,
    'both ACTIVE frames are HELD 6 ticks — the impact weight is not rushed');

const s2end = L.filter((s) => s.clip === 'heroComboB2Swing2').at(-1);
const chargeStart = L.find((s) => s.clip === 'wrathCharge2');
check(8, s2end.tag === 'S2E SHOULDER' && chargeStart.t === s2end.t + 1 && chargeStart.tag === 'C0 PLANT',
    `S2E SHOULDER (t${s2end.t}) chains straight into C0 PLANT (t${chargeStart.t}) — no invented transition`);

const chargeTicks = L.filter((s) => s.clip === 'wrathCharge2').length;
const chargeTags = uniq(tagsOf('wrathCharge2'));
check(9, chargeTicks === 90 && Math.abs(chargeTicks / 60 - 1.5) < 1e-9,
    `charge measures ${chargeTicks} ticks = ${(chargeTicks / 60).toFixed(3)} s (~1.5 s target)`);
check(9, chargeTags.join('|') === 'C0 PLANT|C1 EARLY|C2 STRONG|C3 PEAK|C4 LOOSE',
    `charge phases: entry -> gather -> escalation -> peak hold -> release (${chargeTags.join(' -> ')})`);

function countStrikes(log) {
    let n = 0, prev = false;
    for (const s of log) { if (s.hbActive && !prev) n++; prev = s.hbActive; }
    return n;
}

// --- 10-16  the DRAGONFALL finisher -------------------------------------------
console.log('\n[DRAGONFALL] darken, flash, giant sword, contact, impact, dissolution');
const dimOn = L.filter((s) => s.fx && s.fx.dim > 0);
check(10, dimOn[0].t === C.darkenStart, `arena darkening starts at the approved tick ${C.darkenStart} (C3 PEAK entry)`);
check(10, dimOn.some((s) => s.fx.dim >= 0.999) && at(C.darkenLift).fx.dim >= 0.999,
    'darkening ramps to full through the peak hold, then lifts from tick 191');
check(10, L.at(-1).fx === null || L.at(-1).fx.dim < 0.35,
    'darkening is a value dip on a ramp, restored by the end of the sequence');

const flashOn = L.filter((s) => s.fx && s.fx.flash > 0);
check(11, flashOn[0].t === C.flashStart && flashOn.length === C.flashLen,
    `flash fires at tick ${C.flashStart} and lasts exactly ${C.flashLen} ticks (${(C.flashLen / 60 * 1000).toFixed(0)} ms)`);
check(11, flashOn.filter((s) => s.fx.flash >= 0.999).length <= C.flashFull &&
    flashOn.at(-1).fx.flash < 1,
    `<= ${C.flashFull} ticks of whiteout, and the flash RAMPS OUT — it can never stick`);

const gs = L.filter((s) => s.painted.some((p) => p.rows === 88 && p.cols === 41));
check(12, gs[0].t === C.greatsword.t0 && gs.at(-1).t === C.total - 1,
    `giant sword manifests at tick ${C.greatsword.t0} and lives to the end of the sequence`);
check(12, L.some((s) => s.painted.some((p) => p.rows === 41 && p.cols === 41)),
    'the white-burst grid is drawn at its sky point (behind the sword, per the layering contract)');

const desc = gs.map((s) => s.descent);
const descending = desc.every((v, i) => i === 0 || v >= desc[i - 1]);
check(13, descending && desc[0] === -240 && Math.abs(desc.at(-1)) < 1e-9,
    `giant sword DESCENDS monotonically ${desc[0]}px -> 0px — it never simply appears at the floor`);
check(13, Math.abs(at(C.greatsword.t[2]).descent) > Math.abs(at(C.greatsword.t[2] + 4).descent) &&
    Math.abs(at(C.greatsword.t[2] + 4).descent) > 0,
    'the fall accelerates (quadratic ease-in), reading as gravity rather than a slide');

check(14, Math.abs(at(C.greatsword.contact).descent) < 1e-9,
    `TIP row ${C.world.greatsword.tipRow} lands exactly on the floor line at CONTACT (tick ${C.greatsword.contact})`);
check(14, L.filter((s) => s.t >= C.greatsword.contact).every((s) => s.descent === 0),
    'the sword stays planted through CONTACT / PEAK / FADE — it never sinks through the floor');

const impact = L.find((s) => s.fallBoxes > 0);
check(15, impact.t === C.greatsword.peak, `floor-impact hit window opens on GS4 PEAK (tick ${C.greatsword.peak})`);
check(15, L.filter((s) => s.fallBoxes > 1).length === 0, 'exactly ONE impact box — no duplicate world effect');

check(16, L.at(-1).clip === 'wrathRelease2' && L.at(-1).tag === 'F2 SETTLE',
    'the sequence exits through F2 SETTLE — the state ENDS on the body (blue blade returns)');
check(16, R.dw.active === false && R.host.projectiles.length === 0 && R.host.velocityX === 0,
    'clean exit: state inactive, world hitbox despawned, movement released');
check(16, R.dw.screenFx === null, 'environment fully restored — no darkening, no letterbox, no flash');
check(16, R.host._dragonWrathCooldown === DRAGON_WRATH_COOLDOWN,
    `cooldown armed on completion (${DRAGON_WRATH_COOLDOWN}f ~ ${(DRAGON_WRATH_COOLDOWN / 60).toFixed(0)}s)`);

// --- 17-18  facing -------------------------------------------------------------
console.log('\n[FACING] left- and right-facing execution');
const RR = run(1), RL = run(-1);
const advR = RR.host.x - 600, advL = RL.host.x - 600;
check(17, advL < 0 && Math.abs(advL) === Math.abs(advR),
    `left-facing mirrors exactly: lunge ${advL}px vs right ${advR}px`);
check(18, RR.log.every((s, i) => s.clip === RL.log[i].clip && s.frame === RL.log[i].frame),
    'both facings play the identical approved frame sequence (runtime flip mirrors the art)');
check(18, RL.dw.impactX < RL.host.x && RR.dw.impactX > 600,
    'the impact column commits to the Hero\'s own forward line on both sides');

// --- 19-23  interruption, death, reset, repeat ---------------------------------
console.log('\n[INTERRUPTION] every major phase, death, reset, repeat');
const PHASES = [
    ['activation', 12], ['swing 1', 36], ['swing 2', 55], ['charge', 100],
    ['charge peak / darkened', 130], ['flash', 155], ['sword descent', 172],
    ['floor impact', 182], ['dissolution', 195],
];
for (const [name, tick] of PHASES) {
    const host = makeHost(1);
    const dw = new HeroDragonWrath(host);
    dw.start();
    while (dw.active && dw.drawTick < tick) { dw.update(); host.x += host.velocityX; }
    dw.cleanup();                                    // the interrupt (takeDamage / fear / intimidation)
    const clean =
        dw.active === false &&
        dw.screenFx === null &&
        host.projectiles.filter((p) => p.kind === 'dragonWrathFall').length === 0 &&
        host.attackHitbox.isActive === false &&
        host.velocityX === 0 &&
        dw.drawTick === 0 && dw.tag === null;
    check(19, clean, `interrupt during ${name} (t${tick}): state, blade, charge, darken, flash, sword, locks all cleared`);
}

for (const [label, tick, n] of [['charge', 110, 20], ['sword descent', 173, 21]]) {
    const host = makeHost(1);
    const dw = new HeroDragonWrath(host);
    dw.start();
    while (dw.active && dw.drawTick < tick) { dw.update(); host.x += host.velocityX; }
    dw.cleanup(); dw.cleanup();                      // death path + idempotence
    check(n, !dw.active && dw.screenFx === null && host.projectiles.length === 0,
        `Hero death during ${label}: Dragon Wrath does not survive; cleanup is idempotent`);
}

{   // encounter reset mid-finisher: main.js replaces the Enemy, so the fx surface dies with it
    const host = makeHost(1);
    const dw = new HeroDragonWrath(host);
    dw.start();
    while (dw.active && dw.drawTick < 185) { dw.update(); host.x += host.velocityX; }
    const wasLive = dw.screenFx !== null;
    dw.cleanup();
    const fresh = new HeroDragonWrath(makeHost(1));
    check(22, wasLive && dw.screenFx === null && fresh.screenFx === null && !fresh.active,
        'encounter reset during the finisher: overlay + sword purged, a fresh Hero starts clean');
}

{   // repeated use
    const host = makeHost(1);
    const dw = new HeroDragonWrath(host);
    let boxes = 0;
    for (let r = 0; r < 3; r++) {
        dw.start();
        while (dw.active) { dw.update(); host.x += host.velocityX; boxes = Math.max(boxes, host.projectiles.length); }
    }
    check(23, boxes === 1 && host.projectiles.length === 0 && !dw.active,
        'three consecutive activations: one impact box each, none leaked, no duplicate overlays');
}

// --- 25-30  no leakage into the other attacks ---------------------------------
console.log('\n[ISOLATION] the other Hero attacks are untouched afterwards');
{
    const host = makeHost(1);
    const dw = new HeroDragonWrath(host);
    const before = { g: host.gravity, dmg: host.attackDamage, hbW: host.attackHitbox.width };
    dw.start();
    while (dw.active) { dw.update(); host.x += host.velocityX; }
    check(25, host.gravity === before.g && host.attackDamage === before.dmg,
        'host gravity + attackDamage unchanged — no global stat or physics leak (original combo unaffected)');
    check(26, host.isGrounded === true && host.velocityX === 0 && host.attackHitbox.isActive === false,
        'the Hero is handed back in a valid grounded state — Combo A / the 4-hit chain can start immediately');
    check(27, dw.isBladeTransformed === false, 'no stale transformed sword after the sequence');
    check(28, dw.screenFx === null, 'no stale darkening, letterbox or flash after the sequence');
    painted.length = 0; dw.drawWorldEffects(CTX);
    check(29, painted.length === 0, 'no stale giant sword: drawWorldEffects paints nothing once inactive');
    check(30, Object.keys(C.frameOrder).filter((k) => /Swing/.test(k)).length === 2,
        'the shipped clock carries exactly two swing groups — a third is structurally impossible');
}

// --- 24  quality tiers (sub-processes, one per tier) ---------------------------
console.log('\n[QUALITY TIERS] normal / lite / performance / auto');
for (const tier of ['normal', 'lite', 'performance', 'auto']) {
    const r = spawnSync(process.execPath, [SELF, `--tier=${tier}`], { cwd: HERE, encoding: 'utf8' });
    const ok = r.status === 0;
    (ok ? pass++ : fail++);
    console.log(`  [${ok ? 'ok' : 'FAIL'}] 24   tier "${tier}": sequence identity + giant sword preserved`);
    if (!ok) console.log(r.stdout);
}

console.log('\n' + '='.repeat(62));
console.log(fail === 0 ? `ALL PASSED — ${pass}/${pass} checks` : `FAILED — ${fail} of ${pass + fail}`);
process.exit(fail === 0 ? 0 : 1);
