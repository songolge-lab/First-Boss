// Behaviour harness for Stage 7B-3 / RE-1 (walk-triggered RED ECLIPSE overlay).
// Run from the repo root:  node tools/redesign/surge_harness.mjs [normal|lite|performance]
// Drives a real headless Player: the eclipse trigger scheduler (pure), the
// INDEPENDENT overlay lifecycle (STAGE RE-1: plays to its natural end regardless of
// later player actions, never locks input), the draw() overlay compositing
// (recording ctx), physics-independence, tier behaviour, and gameplay invariants.
//
// The repo is `type: commonjs`, so ESM sources under src/ can't be imported by node
// directly. Bootstrap: mirror src/ into a temp `type: module` package. Repo untouched.
import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(tmpdir(), 'surge-harness-' + process.pid);
rmSync(PKG, { recursive: true, force: true });
mkdirSync(join(PKG, 'game'), { recursive: true });
cpSync(join(REPO, 'src'), join(PKG, 'game'), { recursive: true });
writeFileSync(join(PKG, 'package.json'), '{"type":"module"}');
process.on('exit', () => rmSync(PKG, { recursive: true, force: true }));
const M = (rel) => pathToFileURL(join(PKG, rel)).href;

const TIER = process.argv[2] || 'normal';
globalThis.window = { location: { search: `?vfxQuality=${TIER}` }, addEventListener() {}, removeEventListener() {} };
globalThis.document = { getElementById: () => null };
globalThis.performance = globalThis.performance || { now: () => 0 };

const { Player } = await import(M('game/entities/Player.js'));
const { SpriteManager, BOSS_REDESIGN_SPRITES } = await import(M('game/core/SpriteManager.js'));

// ---- recording 2D context stub -------------------------------------------
function makeCtx() {
  const grad = { addColorStop() {} };
  return new Proxy({ globalAlpha: 1 }, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient' || p === 'createRadialGradient') return () => grad;
      if (p === 'save' || p === 'restore') return () => {};
      return () => undefined;
    },
    set(t, p, v) { t[p] = v; return true; },
  });
}
const ctx = makeCtx();

// ---- assert plumbing ------------------------------------------------------
let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra = '') { if (cond) { pass++; } else { fail++; fails.push(name + (extra ? '  [' + extra + ']' : '')); } }

// Put the Boss into a clean grounded FORWARD-walk state (=> _animState() 'run').
function forceWalk(p, dir /* 'fwd' | 'bwd' */) {
  p.afkPhase = null; p._afkExitTimer = 0; p._laserLockTimer = 0;
  p.airDiveState = 'none'; p._diveCharged = false; p.comboStep = 0;
  p.dashTimer = 0; p._attackHeld = false; p.chargeTimer = 0; p._chargeType = null;
  p.isGrounded = true; p.aimDir = 1;
  p.velocityX = dir === 'bwd' ? -5 : 5;   // sign vs aimDir => run(fwd) / retreat(bwd)
}
function makePlayer() { const p = new Player(2000, 560); p.halfHeight = 20; return p; }

// A tiny deterministic RNG we can install/restore around timing trials.
const REAL_RANDOM = Math.random;
function seedRandom(seed) { let s = seed >>> 0; Math.random = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function restoreRandom() { Math.random = REAL_RANDOM; }

// =====================================================================
// 1. Does NOT trigger while idle
// =====================================================================
{
  const p = makePlayer();
  let fired = false, maxTimer = 0;
  for (let i = 0; i < 1200; i++) { p._locoControlActive = true; p._updateLocomotionSurge('idle'); if (p._surgeActive) fired = true; maxTimer = Math.max(maxTimer, p._surgeTimer); }
  ok('idle: never fires', !fired);
  ok('idle: clock never accrues', maxTimer === 0, 'maxTimer=' + maxTimer);
}

// =====================================================================
// 2. STAGE 7B-4: triggers after EXACTLY 2.5s (150 ticks) of eligible walking,
//    every time (no random spread), regardless of seed. Also: period between
//    consecutive triggers is exactly 150, and flares never overlap (150 > 60).
// =====================================================================
{
  let allExact = true, minTick = Infinity, maxTick = -Infinity, trials = 0;
  for (let seed = 1; seed <= 60; seed++) {
    seedRandom(seed);
    const p = makePlayer();               // constructor picks interval from seeded RNG
    ok('walk: _pickSurgeInterval is exactly 150 (seed ' + seed + ')', p._surgeInterval === 150, 'interval=' + p._surgeInterval);
    let fireTick = -1;
    for (let i = 1; i <= 300; i++) { p._locoControlActive = true; p._updateLocomotionSurge('run'); if (p._surgeActive && fireTick < 0) { fireTick = i; break; } }
    restoreRandom();
    trials++;
    if (fireTick !== 150) allExact = false;
    minTick = Math.min(minTick, fireTick); maxTick = Math.max(maxTick, fireTick);
  }
  ok('walk: fires at EXACTLY 150 ticks (2.5s) every trial', allExact, 'min=' + minTick + ' max=' + maxTick + ' n=' + trials);

  // Period + no-overlap: walk continuously and log every fire tick.
  seedRandom(1);
  const p = makePlayer();
  const fires = []; let maxActiveRun = 0, activeRun = 0;
  for (let i = 1; i <= 700; i++) {
    p._locoControlActive = true; p._updateLocomotionSurge('run');
    if (p._surgeActive) { activeRun++; maxActiveRun = Math.max(maxActiveRun, activeRun); }
    else activeRun = 0;
    if (p._surgeActive && p._surgePhase === 0) fires.push(i);
  }
  restoreRandom();
  const periods = fires.slice(1).map((t, k) => t - fires[k]);
  ok('walk: consecutive triggers are exactly 150 ticks apart', periods.length >= 2 && periods.every((d) => d === 150), 'periods=' + JSON.stringify(periods));
  ok('walk: longest active flare run <= 60 ticks (< 150 interval -> no overlap)', maxActiveRun <= 60, 'maxActiveRun=' + maxActiveRun);
}

// =====================================================================
// 3. Surge lasts ~1s (exactly DURATION=60 active frames); walk clip unchanged.
// =====================================================================
{
  seedRandom(7);
  const p = makePlayer();
  let activeFrames = 0, sawActive = false, everSurgeClipName = null, baseClipStayedRun = true;
  for (let i = 1; i <= 620; i++) {
    p._locoControlActive = true; p._updateLocomotionSurge('run');
    if (p._surgeActive) { sawActive = true; activeFrames++; everSurgeClipName = p._surgeName; if (p._surgeDir !== 'run') baseClipStayedRun = false; }
    if (sawActive && !p._surgeActive) break;   // count exactly one flare
  }
  restoreRandom();
  ok('duration: flare lasts exactly 60 ticks (~1s)', activeFrames === 60, 'activeFrames=' + activeFrames);
  ok('duration: forward walk -> surgeForward', everSurgeClipName === 'surgeForward');
  ok('duration: base locomotion stays run throughout', baseClipStayedRun);
}

// =====================================================================
// 4. Forward vs backward gets the correct approved clip.
// =====================================================================
for (const [dir, want, base] of [['fwd', 'surgeForward', 'run'], ['bwd', 'surgeBackward', 'retreat']]) {
  seedRandom(3);
  const p = makePlayer();
  const clip = base;
  let got = null;
  for (let i = 1; i <= 480; i++) { p._locoControlActive = true; p._updateLocomotionSurge(clip); if (p._surgeActive) { got = p._surgeName; break; } }
  restoreRandom();
  ok('variant: ' + base + ' -> ' + want, got === want, 'got=' + got);
}

// =====================================================================
// 5. STAGE RE-1: changing direction mid-eclipse does NOT cancel or restart it.
//    The captured variant is kept; the base sprite flips live underneath (that is
//    verified in the render section), but the eclipse artwork stays put.
// =====================================================================
{
  seedRandom(11);
  const p = makePlayer();
  // walk forward until an eclipse fires
  for (let i = 1; i <= 480 && !p._surgeActive; i++) { p._locoControlActive = true; p._updateLocomotionSurge('run'); }
  ok('dir-flip: a forward eclipse is live', p._surgeActive && p._surgeName === 'surgeForward');
  const phaseBefore = p._surgePhase;
  // now flip to backward glide — the eclipse must keep playing, unchanged variant
  p._locoControlActive = true; p._updateLocomotionSurge('retreat');
  ok('dir-flip: eclipse persists (not cancelled)', p._surgeActive);
  ok('dir-flip: captured variant unchanged (surgeForward)', p._surgeName === 'surgeForward' && p._surgeDir === 'run');
  ok('dir-flip: lifetime advances, never restarts', p._surgePhase === phaseBefore + 1);
  restoreRandom();
}

// =====================================================================
// 6. STAGE RE-1: NO player action cancels a live eclipse. Attack, jump, fall,
//    dash, charge or stopping (idle) all let it keep playing to its natural end.
//    (The continuity clock for the NEXT trigger resets on non-walking clips, but
//    the active eclipse is untouched.)
// =====================================================================
for (const action of ['attack1', 'attack4', 'airDive', 'dash', 'fireLaser', 'groundCharge', 'jump', 'fall', 'idle']) {
  seedRandom(5);
  const p = makePlayer();
  for (let i = 1; i <= 480 && !p._surgeActive; i++) { p._locoControlActive = true; p._updateLocomotionSurge('run'); }
  const phaseBefore = p._surgePhase;
  p._locoControlActive = true; p._updateLocomotionSurge(action);
  ok('action->' + action + ': eclipse keeps playing', p._surgeActive && p._surgeName === 'surgeForward');
  ok('action->' + action + ': lifetime advances by 1 (not restarted/cancelled)', p._surgePhase === phaseBefore + 1);
  ok('action->' + action + ': next-trigger clock reset', p._surgeTimer === 0);
  restoreRandom();
}

// =====================================================================
// 6b. STAGE RE-1: full playback to the natural end (~60 ticks) no matter what the
//     Boss does the instant after the trigger.
// =====================================================================
for (const after of ['idle', 'jump', 'attack1', 'dash', 'groundCharge', 'retreat']) {
  seedRandom(5);
  const p = makePlayer();
  for (let i = 1; i <= 480 && !p._surgeActive; i++) { p._locoControlActive = true; p._updateLocomotionSurge('run'); }
  ok('full-play[' + after + ']: eclipse live at trigger', p._surgeActive && p._surgePhase === 0);
  let activeCount = 1;   // the trigger frame (phase 0) is already active
  for (let i = 0; i < 200 && p._surgeActive; i++) {
    p._locoControlActive = true; p._updateLocomotionSurge(after);
    if (p._surgeActive) activeCount++;
  }
  ok('full-play[' + after + ']: ran full 60 ticks then ended', activeCount === 60 && !p._surgeActive, 'activeCount=' + activeCount);
  restoreRandom();
}

// =====================================================================
// 7. STAGE RE-1: if AFK begins while an eclipse is live, the eclipse is PRESERVED
//    and finishes its own duration; and no NEW eclipse can trigger during AFK.
// =====================================================================
{
  seedRandom(9);
  const p = makePlayer();
  for (let i = 1; i <= 480 && !p._surgeActive; i++) { p._locoControlActive = true; p._updateLocomotionSurge('run'); }
  ok('afk: an eclipse is live before AFK', p._surgeActive);
  let activeCount = 1;
  for (let i = 0; i < 200 && p._surgeActive; i++) {
    p._locoControlActive = true; p._updateLocomotionSurge('afkIdle');
    if (p._surgeActive) activeCount++;
  }
  ok('afk: eclipse preserved through AFK to its natural end', activeCount === 60 && !p._surgeActive, 'activeCount=' + activeCount);
  let firedAgain = false;
  for (let i = 0; i < 400; i++) { p._locoControlActive = true; p._updateLocomotionSurge('afkIdle'); if (p._surgeActive) firedAgain = true; }
  ok('afk: no NEW eclipse triggers during AFK', !firedAgain && p._surgeTimer === 0);
  restoreRandom();
}

// =====================================================================
// 8. Cinematic / game-over: draw() runs but update() did not, so control flag
//    is false -> the clock cannot accrue or fire.
// =====================================================================
{
  const p = makePlayer();
  let fired = false;
  for (let i = 0; i < 1200; i++) { p._locoControlActive = false; p._updateLocomotionSurge('run'); if (p._surgeActive || p._surgeTimer > 0) fired = true; }
  ok('cinematic: no accrual/fire without control flag', !fired);
}

// =====================================================================
// 9. death/restart clears all surge timers + effects (cancelIntimidation hook).
// =====================================================================
{
  seedRandom(2);
  const p = makePlayer();
  for (let i = 1; i <= 480 && !p._surgeActive; i++) { p._locoControlActive = true; p._updateLocomotionSurge('run'); }
  ok('reset: a flare is live before reset', p._surgeActive);
  p.cancelIntimidation();   // called by main.js at PLAYING.enter (post-cinematic / restart)
  ok('reset: flare + clock fully cleared', !p._surgeActive && p._surgePhase === 0 && p._surgeName === null && p._surgeDir === null && p._surgeTimer === 0);
  restoreRandom();
}

// =====================================================================
// 10. STAGE RE-1: NO input/physics lock. An active eclipse does NOT change update()
//     output at all. Run identical update()s with the eclipse forced ON vs OFF;
//     velocity/pos must be byte-identical (input is never ignored, velocity never
//     forced, facing never pinned).
// =====================================================================
{
  const stubInput = { getHorizontal: () => 1, isJumpHeld: () => false, consumeJump: () => false, consumeDash: () => false, jumpBuffer: false, dashBuffer: false, dashHeld: false };
  function runN(forceSurge) {
    const p = makePlayer(); p.isGrounded = true;
    for (let i = 0; i < 40; i++) {
      if (forceSurge) { p._surgeActive = true; p._surgeName = 'surgeForward'; p._surgeDir = 'run'; }
      p.update(stubInput);
      p.isGrounded = true; // keep grounded like the floor resolver would
    }
    return { x: p.x, vx: p.velocityX, vy: p.velocityY };
  }
  const a = runN(false), b = runN(true);
  ok('no-lock: eclipse does not alter velocityX', a.vx === b.vx, JSON.stringify({ a: a.vx, b: b.vx }));
  ok('no-lock: eclipse does not alter x (input never ignored)', a.x === b.x, JSON.stringify({ a: a.x, b: b.x }));
}

// =====================================================================
// 11. Render / tier (STAGE RE-1): while active, draw() composites the eclipse as a
//     SEPARATE overlay ON TOP of the base sprite — the base sprite still draws
//     underneath (the Boss keeps animating normally). The overlay frame indexes off
//     its OWN _surgePhase, at the current tier, no throw. Also verifies the eclipse
//     survives while the Boss is in a NON-walking base state (e.g. jumping).
// =====================================================================
for (const [dir, key] of [['fwd', 'surgeForward'], ['bwd', 'surgeBackward']]) {
  const p = makePlayer();
  forceWalk(p, dir);
  const baseName = dir === 'bwd' ? 'retreat' : 'run';
  const hold = dir === 'bwd' ? 12 : 5;
  p.anim.set(baseName, hold); p.anim.tick();
  // Force a live eclipse of the matching variant.
  p._surgeActive = true; p._surgeName = key; p._surgeDir = baseName; p._surgePhase = hold; p._surgeFlip = false; p._locoControlActive = true;
  // Spy on every sprite draw.
  const orig = SpriteManager.drawSprite; const seen = [];
  SpriteManager.drawSprite = (c, frame, x, y, opts) => { seen.push(frame); return orig.call(SpriteManager, c, frame, x, y, opts); };
  let threw = null;
  try { p.draw(ctx); } catch (e) { threw = e; }
  SpriteManager.drawSprite = orig;
  const surgeFrames = BOSS_REDESIGN_SPRITES[key];
  const drewSurge = seen.some((f) => surgeFrames.includes(f));
  const drewBase = seen.some((f) => BOSS_REDESIGN_SPRITES[baseName].includes(f));
  ok('render[' + TIER + ']: ' + dir + ' draw() no throw', threw === null, threw && threw.message);
  ok('render[' + TIER + ']: ' + dir + ' eclipse overlay (' + key + ') drawn on top', drewSurge);
  ok('render[' + TIER + ']: ' + dir + ' base walk sprite STILL drawn underneath', drewBase);
  // The overlay frame is indexed off its own _surgePhase (post-tick value used).
  const idx = Math.floor(p._surgePhase / hold) % surgeFrames.length;
  ok('render[' + TIER + ']: ' + dir + ' overlay indexes off _surgePhase (' + idx + ')', seen.includes(surgeFrames[idx]));
}

// Render: the eclipse overlay survives a NON-walking base state (jumping) — the base
// draws its airborne clip while the eclipse overlay still composites on top.
{
  const p = makePlayer();
  p.afkPhase = null; p.comboStep = 0; p.airDiveState = 'none'; p.dashTimer = 0;
  p._attackHeld = false; p.chargeTimer = 0; p._chargeType = null;
  p.isGrounded = false; p.velocityY = -6; p.aimDir = 1;   // airborne -> 'jump' clip
  p._surgeActive = true; p._surgeName = 'surgeForward'; p._surgeDir = 'run'; p._surgePhase = 10; p._surgeFlip = false; p._locoControlActive = true;
  const orig = SpriteManager.drawSprite; const seen = [];
  SpriteManager.drawSprite = (c, frame, x, y, opts) => { seen.push(frame); return orig.call(SpriteManager, c, frame, x, y, opts); };
  let threw = null; try { p.draw(ctx); } catch (e) { threw = e; }
  SpriteManager.drawSprite = orig;
  const drewSurge = seen.some((f) => BOSS_REDESIGN_SPRITES.surgeForward.includes(f));
  ok('render[' + TIER + ']: eclipse overlay survives while airborne (base=jump)', drewSurge && threw === null);
}

// Render: when NOT surging, draw() draws only the base walk skin (regression guard).
{
  const p = makePlayer(); forceWalk(p, 'fwd');
  p.anim.set('run', 5); p.anim.tick();
  p._surgeActive = false; p._locoControlActive = true;
  const orig = SpriteManager.drawSprite; const seen = [];
  SpriteManager.drawSprite = (c, frame, x, y, opts) => { seen.push(frame); return orig.call(SpriteManager, c, frame, x, y, opts); };
  let threw = null; try { p.draw(ctx); } catch (e) { threw = e; }
  SpriteManager.drawSprite = orig;
  const drewBase = seen.some((f) => BOSS_REDESIGN_SPRITES.run.includes(f));
  const drewSurge = seen.some((f) => BOSS_REDESIGN_SPRITES.surgeForward.includes(f));
  ok('render[' + TIER + ']: not-surging draws base run skin only', drewBase && !drewSurge && threw === null);
}

// =====================================================================
// 12. Gameplay invariants unchanged (no constants touched).
// =====================================================================
{
  const p = makePlayer();
  ok('inv: melee reach 42', p.attackHitbox.reach === 42, 'reach=' + p.attackHitbox.reach);
  ok('inv: melee width 56 / height 60', p.attackHitbox.width === 56 && p.attackHitbox.height === 60);
  ok('inv: melee damage 60 / knockback 11', p.attackHitbox.damage === 60 && p.attackHitbox.knockback === 11);
  ok('inv: maxHp 1000 / hp 1000', p.maxHp === 1000 && p.hp === 1000);
  ok('inv: contactDamage 50', p.contactDamage === 50);
  ok('inv: maxSpeed 8 / jumpForce 17 / dashSpeed 28', p.maxSpeed === 8 && p.jumpForce === 17 && p.dashSpeed === 28);
  ok('inv: run 6 frames / retreat 4 frames (base locomotion intact)', BOSS_REDESIGN_SPRITES.run.length === 6 && BOSS_REDESIGN_SPRITES.retreat.length === 4);
  ok('inv: surgeForward 6 / surgeBackward 4 present', BOSS_REDESIGN_SPRITES.surgeForward.length === 6 && BOSS_REDESIGN_SPRITES.surgeBackward.length === 4);
  ok('inv: surge is not a hitbox (getActiveHitboxes empty at rest)', p.getActiveHitboxes().length === 0);
}

// =====================================================================
console.log(`\nSTAGE 7B-3 / RE-1 RED ECLIPSE harness  [tier=${TIER}]`);
console.log(`  PASS ${pass}   FAIL ${fail}`);
if (fail) { console.log('  FAILURES:'); for (const f of fails) console.log('   - ' + f); process.exit(1); }
console.log('  ALL CHECKS PASSED');
