// Stage 8C-5 FOLLOW-UP — DRAGON WRATH once-per-Hero-life usage rule harness.
//
// Drives a LIVE Enemy (src/entities/Enemy.js) headlessly and asserts ONLY the
// availability rule added by this pass: one use per life, at a randomized point in
// that life, consumed on entry, never refunded by interruption, and restored only by
// a real death-and-respawn cycle. Deliberately narrow — the sequence's own visuals,
// timing and cleanup are covered by dragon_wrath_harness.mjs and are untouched here.
//
//   node dragon_wrath_once_per_life_harness.mjs
//
// Exit 0 = all checks passed.

import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');

// Same ESM shim the other 8B/8C harnesses use: the repo is "type": "commonjs"
// (Electron), so copy src/ into a temp package marked as ESM and import the LIVE files.
const PKG = join(tmpdir(), 'dw-once-per-life-' + process.pid);
rmSync(PKG, { recursive: true, force: true });
mkdirSync(join(PKG, 'game'), { recursive: true });
cpSync(join(REPO, 'src'), join(PKG, 'game'), { recursive: true });
writeFileSync(join(PKG, 'package.json'), '{"type":"module"}');
process.on('exit', () => rmSync(PKG, { recursive: true, force: true }));
const M = (rel) => pathToFileURL(join(PKG, rel)).href;

globalThis.window = { location: { search: '' }, addEventListener() {}, removeEventListener() {} };
globalThis.document = { getElementById: () => null };
globalThis.performance = globalThis.performance || { now: () => 0 };

const { Enemy, MoveState } = await import(M('game/entities/Enemy.js'));
const { DRAGON_WRATH_LIFE_DELAY_MIN, DRAGON_WRATH_LIFE_DELAY_MAX,
        rollDragonWrathLifeDelay } = await import(M('game/entities/HeroDragonWrath.js'));

let pass = 0, fail = 0;
const check = (tag, ok, msg) => {
    (ok ? pass++ : fail++);
    console.log(`  [${ok ? 'ok' : 'FAIL'}] ${String(tag).padEnd(3)} ${msg}`);
};

const FLOOR_Y = 520;
const STATS = { hp: 4000, move_speed: 5, attack_damage: 20 };
const ABIL = ['pathfind_melee', 'dash_roll'];

// A fresh Hero life, exactly as main.js spawnEnemy() builds one.
function spawnHero() {
    const e = new Enemy(100, 0);
    e.worldWidth = 3000;
    e.applyStats(STATS, ABIL);
    e.y = FLOOR_Y - e.halfHeight;
    e.isGrounded = true;
    return e;
}

// The Boss, parked in melee range so the WALKING branch reaches the melee start.
const BOSS = { x: 0, y: FLOOR_Y - 45, halfWidth: 30, halfHeight: 45 };
const bounds = { halfWidth: BOSS.halfWidth, halfHeight: BOSS.halfHeight };

// Hold the Boss at a fixed EDGE GAP of 30px: inside COMBO.GAP_PX (42) so the melee
// start is reachable every cycle, but above SPACING.MIN_GAP (16) so the AI never
// takes the contact-danger bail instead.
const HOLD_DX = 30 + 15 + BOSS.halfWidth;   // edgeGap + hero halfWidth + boss halfWidth

function step(e) {
    BOSS.x = e.x + HOLD_DX;
    e.update(BOSS.x, BOSS.y, bounds);
    if (e.y + e.halfHeight >= FLOOR_Y && e.velocityY >= 0) {
        e.y = FLOOR_Y - e.halfHeight; e.velocityY = 0; e.isGrounded = true;
    }
}

// Run a life for `frames`, reporting every frame Dragon Wrath STARTED on.
function runLife(e, frames) {
    const starts = [];
    let wasActive = false;
    for (let i = 0; i < frames; i++) {
        step(e);
        const now = e.moveState === MoveState.DRAGON_WRATH;
        if (now && !wasActive) starts.push(i);
        wasActive = now;
    }
    return starts;
}

console.log('\n[8C-5 FOLLOW-UP] DRAGON WRATH — once per Hero life\n');

// --- 1/2/3. randomized eligibility, never immediate ---------------------------
{
    const rolls = Array.from({ length: 400 }, () => rollDragonWrathLifeDelay());
    const inRange = rolls.every((r) => r >= DRAGON_WRATH_LIFE_DELAY_MIN && r <= DRAGON_WRATH_LIFE_DELAY_MAX);
    check(2, inRange, `every roll inside [${DRAGON_WRATH_LIFE_DELAY_MIN}, ${DRAGON_WRATH_LIFE_DELAY_MAX}] frames`);
    check(2, new Set(rolls).size > 100, `rolls vary between lives (${new Set(rolls).size} distinct of 400)`);
    check(3, DRAGON_WRATH_LIFE_DELAY_MIN > 0 && rolls.every((r) => r > 0),
        `never eligible on spawn (min ${DRAGON_WRATH_LIFE_DELAY_MIN}f ~= ${(DRAGON_WRATH_LIFE_DELAY_MIN / 60).toFixed(1)}s)`);

    const spawnFlags = Array.from({ length: 50 }, () => spawnHero())
        .every((e) => e._dragonWrathUsedThisLife === false && e._dragonWrathEligibility > 0);
    check(3, spawnFlags, 'every fresh spawn: used=false, eligibility timer > 0');

    // No spawn may start Dragon Wrath inside the pre-eligibility window.
    const early = Array.from({ length: 12 }, () => runLife(spawnHero(), DRAGON_WRATH_LIFE_DELAY_MIN - 1).length);
    check(3, early.every((n) => n === 0), `0 activations across 12 lives before frame ${DRAGON_WRATH_LIFE_DELAY_MIN}`);
}

// --- 1/4/7. exactly one activation per life, at the queued safe opportunity ----
{
    const perLife = [];
    for (let i = 0; i < 25; i++) {
        const e = spawnHero();
        const starts = runLife(e, DRAGON_WRATH_LIFE_DELAY_MAX + 900); // well past eligibility
        perLife.push({ starts, elig: e._dragonWrathEligibility, used: e._dragonWrathUsedThisLife });
    }
    const fired = perLife.filter((l) => l.starts.length > 0);
    check(1, perLife.every((l) => l.starts.length <= 1),
        `no life activated twice (max ${Math.max(...perLife.map((l) => l.starts.length))} across 25 lives)`);
    check(1, fired.length === perLife.length, `every life used its single opportunity (${fired.length}/25)`);
    check(7, perLife.every((l) => l.used === true), 'used-this-life stays true for the rest of the life');
    const times = fired.map((l) => l.starts[0]);
    check(2, new Set(times).size > 5, `activation frame differs between lives (${new Set(times).size} distinct)`);
    check(4, times.every((t) => t >= DRAGON_WRATH_LIFE_DELAY_MIN),
        `activation always at/after the rolled point, at a safe melee start (earliest ${Math.min(...times)}f)`);
}

// --- 4. a timer that elapses mid-attack does not interrupt that attack ---------
{
    const e = spawnHero();
    e._dragonWrathEligibility = 1;
    e._startCombo(1);                       // the Hero is mid 4-hit DAYBREAK chain
    const before = e.moveState;
    step(e);
    check(4, e.moveState === before && e.moveState !== MoveState.DRAGON_WRATH,
        'eligibility reached mid-combo does NOT interrupt the running attack');
    check(4, e._dragonWrathUsedThisLife === false, 'and the use is still unspent, waiting for a safe opening');
}

// --- 5/6. consumed on entry; interruption does not refund ---------------------
{
    const e = spawnHero();
    e._dragonWrathEligibility = 0;
    check(5, e._canStartDragonWrath() === true, 'eligible once the rolled point passes');
    e._startDragonWrath(1);
    check(5, e._dragonWrathUsedThisLife === true, 'use consumed immediately on entering the sequence');
    check(5, e._dragonWrath.active === true, 'and only then does the sequence begin its visual phases');

    for (let i = 0; i < 30; i++) step(e);    // partway into the sequence
    e.takeDamage(50, -1);                    // a landed Boss hit cancels it
    check(6, e._dragonWrath.active === false, 'a landed hit interrupts the sequence');
    check(6, e._dragonWrathUsedThisLife === true, 'interruption does NOT refund the use');
    check(6, e._canStartDragonWrath() === false, 'and it cannot be re-selected after the interrupt');
}

// --- 6b. fear / intimidation cancels are likewise non-refunding ---------------
for (const [label, cancel] of [
    ['fear', (e) => e.triggerFear()],
    ['intimidation', (e) => e.setIntimidated(true)],
]) {
    const e = spawnHero();
    e._dragonWrathEligibility = 0;
    e._startDragonWrath(1);
    for (let i = 0; i < 20; i++) step(e);
    cancel(e);
    check(6, e._dragonWrath.active === false && e._dragonWrathUsedThisLife === true,
        `${label} cancel tears the sequence down without refunding the use`);
}

// --- 7. cannot repeat in the same life, even over a very long fight -----------
{
    const e = spawnHero();
    const starts = runLife(e, 60 * 60 * 3);  // 3 real minutes of melee
    check(7, starts.length === 1, `exactly 1 activation across a 3-minute life (got ${starts.length})`);
}

// --- 8/9/10/11. death + respawn is the ONLY thing that restores the use -------
{
    // (8) death mid-sequence: main.js drops the Enemy entirely, and the controller is
    // torn down first. Assert no Dragon Wrath state survives the dying instance.
    const dying = spawnHero();
    dying._dragonWrathEligibility = 0;
    dying._startDragonWrath(1);
    for (let i = 0; i < 40; i++) step(dying);
    dying._dragonWrath.cleanup();            // what handleEnemyDefeated() does
    check(8, dying._dragonWrath.active === false && dying.dragonWrathScreenFx === null,
        'Hero death removes all active Dragon Wrath state (no pending overlay/sword)');

    const reborn = spawnHero();              // the resurrection
    check(9, reborn._dragonWrathUsedThisLife === false, 'respawn restores exactly one use');
    check(9, reborn._dragonWrath.active === false, 'respawn carries no stale sequence state');
    check(10, reborn._dragonWrathEligibility >= DRAGON_WRATH_LIFE_DELAY_MIN,
        `respawn rolls a NEW randomized activation point (${reborn._dragonWrathEligibility}f)`);

    const respawnRolls = Array.from({ length: 60 }, () => spawnHero()._dragonWrathEligibility);
    check(10, new Set(respawnRolls).size > 20, `each respawn re-randomizes (${new Set(respawnRolls).size} distinct of 60)`);

    // (11) an UNUSED opportunity must not carry over: die before the rolled point.
    const shortLife = spawnHero();
    shortLife._dragonWrathEligibility = 5;   // would have been eligible almost immediately
    const next = spawnHero();                // ...but the Hero dies first and a new life starts
    check(11, next._dragonWrathEligibility >= DRAGON_WRATH_LIFE_DELAY_MIN,
        'an unused opportunity is discarded, not inherited by the next life');
    check(11, shortLife._dragonWrathUsedThisLife === false && next._dragonWrathUsedThisLife === false,
        'and the new life starts from a clean unused state of its own');
}

// --- LIFE RESET IS NARROW: ordinary events must never restore the use ---------
{
    const e = spawnHero();
    e._dragonWrathEligibility = 0;
    e._startDragonWrath(1);
    while (e._dragonWrath.active) step(e);    // let the sequence COMPLETE normally
    check(7, e._dragonWrathUsedThisLife === true, 'a normal Dragon Wrath completion does not restore the use');

    e._startCombo(1);
    for (let i = 0; i < 80; i++) step(e);
    check(7, e._dragonWrathUsedThisLife === true, 'a normal attack ending does not restore the use');

    if (e._comboA) { e._startComboA(1); for (let i = 0; i < 200; i++) step(e); }
    check(7, e._dragonWrathUsedThisLife === true, 'Combo A ending does not restore the use');

    e.setIntimidated(true); step(e); e.setIntimidated(false); step(e);
    check(7, e._dragonWrathUsedThisLife === true, 'an ordinary AI state transition does not restore the use');
    check(7, e._canStartDragonWrath() === false, 'still unavailable for the remainder of this life');
}

// --- 12/13. the other attacks are untouched ----------------------------------
{
    const e = spawnHero();
    // With Dragon Wrath spent, the melee start must fall through to the unchanged
    // Combo A / DAYBREAK path exactly as before.
    e._dragonWrathUsedThisLife = true;
    const seen = new Set();
    for (let i = 0; i < 60 * 40; i++) { step(e); seen.add(e.moveState); }
    check(13, seen.has(MoveState.ATTACK_WINDUP) || seen.has(MoveState.ATTACKING),
        'the 4-hit DAYBREAK chain still runs normally with Dragon Wrath spent');
    check(12, seen.has(MoveState.COMBO_A), 'Combo A still selects on its own unchanged 0.35 / ~5s roll');
    check(13, !seen.has(MoveState.DRAGON_WRATH), 'and Dragon Wrath never reappears in that same life');
}

console.log('\n==============================================================');
if (fail === 0) console.log(`ALL PASSED — ${pass}/${pass} checks`);
else console.log(`FAILED — ${fail} of ${pass + fail} checks`);
process.exit(fail === 0 ? 0 : 1);
