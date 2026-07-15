// Behaviour harness for Stage 7A-1 (Boss AFK Intimidation).
// Run from the repo root:  node tools/redesign/afk_harness.mjs [normal|lite|performance|auto]
// Drives Player+Enemy headlessly against a stubbed canvas plus the real world rules
// (floor collision, world-bound clamp with the onWallImpact hook, barrier resolution).
//
// The repo is `type: commonjs`, so the ESM sources under src/ cannot be imported by
// node directly. Bootstrap: mirror src/ into a temp `type: module` package and import
// from there. The repo itself is never modified.
import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(tmpdir(), 'afk-harness-' + process.pid);
rmSync(PKG, { recursive: true, force: true });
mkdirSync(join(PKG, 'game'), { recursive: true });
cpSync(join(REPO, 'src'), join(PKG, 'game'), { recursive: true });
writeFileSync(join(PKG, 'package.json'), '{"type":"module"}');
process.on('exit', () => rmSync(PKG, { recursive: true, force: true }));
const M = (rel) => pathToFileURL(join(PKG, rel)).href;

const TIER = process.argv[2] || 'normal';

globalThis.window = {
  location: { search: `?vfxQuality=${TIER}` },
  addEventListener() {}, removeEventListener() {},
};
globalThis.document = { getElementById: () => null };

// Deterministic RNG: the Hero AI rolls Math.random for parry/cast/jump chances,
// so seed it or the spacing tests are flaky run-to-run.
let _seed = 12345;
Math.random = () => { _seed = (_seed * 1664525 + 1013904223) >>> 0; return _seed / 4294967296; };

const { Player } = await import(M('game/entities/Player.js'));
const { Enemy, MoveState } = await import(M('game/entities/Enemy.js'));
const { SpriteManager } = await import(M('game/core/SpriteManager.js'));
const { getVfxQualityLabel } = await import(M('game/core/PerfMonitor.js'));

// ---- recording 2D context stub -------------------------------------------
function makeCtx() {
  const calls = { fillRect: 0, ellipse: 0, arc: 0, quadraticCurveTo: 0, createLinearGradient: 0, createRadialGradient: 0 };
  let shadowBlurMax = 0;
  const grad = { addColorStop() {} };
  const ctx = new Proxy({
    calls, get shadowBlurMax() { return shadowBlurMax; },
    globalAlpha: 1, set shadowBlur(v) { if (v > shadowBlurMax) shadowBlurMax = v; }, get shadowBlur() { return 0; },
  }, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'createLinearGradient' || p === 'createRadialGradient') { return () => { calls[p]++; return grad; }; }
      return (...a) => { if (p in calls) calls[p]++; return undefined; };
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  return ctx;
}

// ---- world ---------------------------------------------------------------
const FLOOR_Y = 600, WORLD_WIDTH = 4000;
function resolveFloor(e) {
  const feet = e.y + e.halfHeight;
  if (feet >= FLOOR_Y && e.velocityY >= 0) { e.y = FLOOR_Y - e.halfHeight; e.velocityY = 0; e.isGrounded = true; }
  else e.isGrounded = false;
}
function clampToWorld(e) {
  const min = e.halfWidth, max = WORLD_WIDTH - e.halfWidth;
  if (e.x < min) { e.x = min; if (e.velocityX < 0) { const b = typeof e.onWallImpact === 'function' && e.onWallImpact(1); if (!b) e.velocityX = 0; } }
  else if (e.x > max) { e.x = max; if (e.velocityX > 0) { const b = typeof e.onWallImpact === 'function' && e.onWallImpact(-1); if (!b) e.velocityX = 0; } }
}
function intersect(a, b) {
  return Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth && Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight;
}
function resolveBarrier(player, enemy) {
  if (!player.afkWaves.length || !enemy) return;
  for (const w of player.afkWaves) {
    if (w.pushedHero || !intersect(w, enemy)) continue;
    w.pushedHero = true;
    enemy.applyIntimidationPush(Math.sign(enemy.x - player.x) || w.dir);
  }
}

const IDLE = { getHorizontal: () => 0, isJumpHeld: () => false, consumeJump: () => false, consumeDash: () => false, jumpBuffer: false, dashBuffer: false, dashHeld: false };
const MOVE = { ...IDLE, getHorizontal: () => 1 };
const JUMP = { ...IDLE, jumpBuffer: true, isJumpHeld: () => true, consumeJump() { this.jumpBuffer = false; return true; } };

function makeWorld(heroX = 700) {
  const p = new Player(1000, 0); p.y = FLOOR_Y - p.halfHeight; p.isGrounded = true;
  const e = new Enemy(heroX, 0); e.applyStats({ hp: 500, move_speed: 5, attack_damage: 20 }, ['pathfind_melee']);
  e.y = FLOOR_Y - e.halfHeight; e.isGrounded = true;
  return { p, e };
}
function step(p, e, input = IDLE) {
  p.update(input);
  resolveBarrier(p, e);
  e.setIntimidated(p.isIntimidating);
  e.update(p.x, p.y, p);
  if (e) p.faceHero(e.x);
  resolveFloor(p); resolveFloor(e); clampToWorld(p); clampToWorld(e);
}

const R = [];
const ok = (name, cond, extra = '') => R.push([cond ? 'PASS' : 'FAIL', name, extra]);

// ===== 1. trigger after exactly 3s of no input ============================
{
  const { p, e } = makeWorld();
  for (let i = 0; i < 179; i++) step(p, e);
  const before = p.afkPhase;
  step(p, e);
  ok('1. no trigger before 180 frames', before === null, `phase@179=${before}`);
  ok('1. triggers on frame 180 (3.0s)', p.afkPhase === 'snap', `phase=${p.afkPhase}`);
  ok('1. isIntimidating true', p.isIntimidating === true);
}

// ===== 2. immediate exit on EVERY input kind ==============================
for (const [label, mk] of [
  ['move', () => MOVE],
  ['jump', () => ({ ...JUMP })],
  ['dash', () => ({ ...IDLE, dashBuffer: true, consumeDash() { this.dashBuffer = false; return true; } })],
  ['attack', () => IDLE],
]) {
  const { p, e } = makeWorld();
  for (let i = 0; i < 200; i++) step(p, e);
  const wasIn = p.afkPhase !== null;
  if (label === 'attack') p._attackHeld = true;
  step(p, e, mk());
  ok(`2. ${label} exits immediately`, wasIn && p.afkPhase === null, `phase=${p.afkPhase}`);
  if (label === 'attack') p._attackHeld = false;
}

// ===== 3. full sequence: snap -> plant -> idle ============================
{
  const { p, e } = makeWorld();
  const seen = [];
  for (let i = 0; i < 400; i++) { step(p, e); if (p.afkPhase && seen[seen.length - 1] !== p.afkPhase) seen.push(p.afkPhase); }
  ok('3. phase order snap->plant->idle', JSON.stringify(seen) === '["snap","plant","idle"]', seen.join('>'));
  ok('3. clip afkIdle at rest', p._animState().name === 'afkIdle');
  ok('3. vignette fully lit', p.afkVignette === 1, `v=${p.afkVignette.toFixed(2)}`);
  ok('3. crack spawned', p._afkCrackTimer > 0);
  // exit -> vignette drains, exit clip plays
  step(p, e, MOVE);
  ok('3. exit clip armed', p._afkExitTimer > 0);
  for (let i = 0; i < 20; i++) step(p, e, IDLE === IDLE ? MOVE : MOVE);
  ok('3. vignette cleared after exit', p.afkVignette === 0, `v=${p.afkVignette}`);
}

// ===== 4. AIRBORNE trigger: forced descent, clean landing, merges to plant =
{
  const { p, e } = makeWorld();
  p.y = FLOOR_Y - p.halfHeight - 300; p.isGrounded = false; p.velocityY = -12;
  let maxStepY = 0, prevY = p.y, sank = 0;
  for (let i = 0; i < 400; i++) {
    step(p, e);
    if (p.afkPhase) { maxStepY = Math.max(maxStepY, Math.abs(p.y - prevY)); }
    prevY = p.y;
    const feet = p.y + p.halfHeight;
    if (feet > FLOOR_Y + 0.001) sank++;
  }
  ok('4. airborne trigger reached planted idle', p.afkPhase === 'idle', `phase=${p.afkPhase}`);
  ok('4. feet never sink through the floor', sank === 0, `sank=${sank}`);
  ok('4. descent step <= FORCE_DOWN_VY (no teleport)', maxStepY <= 22.001, `max=${maxStepY.toFixed(2)}`);
  ok('4. grounded at rest', p.isGrounded === true);
  ok('4. barrier fired on ground contact', p._afkBarrierFired === true);
}

// ===== 5. TAKING DAMAGE during the state ==================================
{
  const { p, e } = makeWorld();
  for (let i = 0; i < 200; i++) step(p, e);
  const hp0 = p.hp, x0 = p.x, phase0 = p.afkPhase;
  const landed = p.takeDamage(80, -1);
  ok('5. hit lands (full damage, unchanged value)', landed && p.hp === hp0 - 80, `hp ${hp0}->${p.hp}`);
  ok('5. no knockback velocity', p.velocityX === 0 && p.velocityY === 0);
  ok('5. state survives the hit', p.afkPhase === phase0);
  ok('5. denial tint (hitFlash lit)', p.hitFlash > 0);
  step(p, e);
  ok('5. boss did not move', Math.abs(p.x - x0) < 0.001);
  ok('5. i-frames applied as normal', p.iFrames > 0);
  // trigger WHILE taking damage
  const w2 = makeWorld();
  w2.p.takeDamage(50, -1);
  for (let i = 0; i < 200; i++) step(w2.p, w2.e);
  ok('5. can trigger while hit-stunned', w2.p.afkPhase !== null, `phase=${w2.p.afkPhase}`);
}

// ===== 6. barrier: pushes AWAY, 0 damage, never a hitbox ==================
{
  const { p, e } = makeWorld(1060);
  const hp0 = e.hp;
  let pushed = false, boxCount = -1, pushSide = 0, pushVx = 0, gapAtPush = 0;
  for (let i = 0; i < 260; i++) {
    const wasPushing = e._intimPushTimer > 0;
    step(p, e);
    if (p.afkWaves.length) boxCount = p.getActiveHitboxes().length;
    if (!wasPushing && e._intimPushTimer > 0) {   // the frame the shove landed
      pushed = true;
      pushSide = Math.sign(e.x - p.x);            // which side of the Boss the Hero was on
      pushVx = e.velocityX;
      gapAtPush = Math.abs(e.x - p.x);
    }
  }
  ok('6. hero was pushed by the barrier', pushed);
  ok('6. barrier dealt ZERO damage', e.hp === hp0, `hp ${hp0}->${e.hp}`);
  ok('6. barrier exposes NO hitbox', boxCount === 0, `activeHitboxes=${boxCount}`);
  // The impulse must point AWAY from the Boss, whichever side the Hero ended up on.
  ok('6. shove points away from the boss', pushed && Math.sign(pushVx) === pushSide,
     `side=${pushSide} vx=${pushVx.toFixed(1)}`);
  ok('6. hero ends farther away than when shoved', Math.abs(e.x - p.x) > gapAtPush,
     `gap ${gapAtPush.toFixed(0)}->${Math.abs(e.x - p.x).toFixed(0)}`);
  ok('6. no fear/stun applied', e.fearStunTimer === 0 && e.iFrames === 0);
}

// ===== 7a. wall ricochet contract (unit) ==================================
{
  const { p, e } = makeWorld();
  e.x = 20; e.y = FLOOR_Y - e.halfHeight; e.isGrounded = true;
  const hp0 = e.hp;
  e.applyIntimidationPush(-1);                    // shoved toward the LEFT wall
  const impulse = Math.abs(e.velocityX);
  e.update(p.x, p.y, p);                          // integrates straight into the wall
  clampToWorld(e);
  ok('7a. ricochets off the wall', e._intimBounced === true);
  ok('7a. velocity reverses away from the wall', e.velocityX > 0, `vx=${e.velocityX.toFixed(1)}`);
  ok('7a. rebound is damped (x0.55, never amplified)', e.velocityX < impulse, `vx=${e.velocityX.toFixed(1)} < ${impulse}`);
  ok('7a. hero is never inside the wall', e.x >= e.halfWidth, `x=${e.x}`);
  ok('7a. wall contact dealt no damage / no stun', e.hp === hp0 && e.fearStunTimer === 0 && e.iFrames === 0);
  // A SECOND wall contact inside the same shove must NOT bounce again (no loop).
  e.x = 0; e.velocityX = -30;
  clampToWorld(e);
  ok('7a. only one ricochet per shove (no bounce loop)', e.velocityX === 0, `vx=${e.velocityX}`);
  ok('7a. still not trapped in the wall', e.x === e.halfWidth);
}

// ===== 7b. wall ricochet in the live loop, no jitter ======================
{
  const { p, e } = makeWorld();
  p.x = 150;                                      // boss near the left wall
  let bounces = 0, stuck = 0, prevBounced = false, maxStep = 0, prevX = e.x;
  for (let i = 0; i < 300; i++) {
    // Hold the Hero cornered until the barrier fires, so the wave definitely
    // shoves it INTO the wall (its wary drift would otherwise wander it away).
    if (!p._afkBarrierFired) { e.x = 40; e.velocityX = 0; }
    step(p, e, IDLE);
    if (e._intimBounced && !prevBounced) bounces++;
    prevBounced = e._intimBounced;
    if (e.x < e.halfWidth - 0.001) stuck++;
    if (e._intimPushTimer > 0) maxStep = Math.max(maxStep, Math.abs(e.x - prevX));
    prevX = e.x;
  }
  ok('7b. hero ricocheted off the wall in the live loop', bounces >= 1, `bounces=${bounces}`);
  ok('7b. exactly one ricochet (no bounce loop)', bounces <= 1, `bounces=${bounces}`);
  ok('7b. never trapped inside the wall', stuck === 0);
  ok('7b. no teleport-scale jitter during the shove', maxStep <= 27, `maxStep=${maxStep.toFixed(1)}`);
  ok('7b. wall bounce dealt no damage', e.hp === e.maxHp);
}

// ===== 8. hero wary standoff, then full recovery ==========================
{
  const { p, e } = makeWorld(880);
  const aggro = new Set();
  for (let i = 0; i < 420; i++) {
    step(p, e);
    if (p.isIntimidating && e._intimPushTimer <= 0) aggro.add(e.moveState);
  }
  const banned = [MoveState.ATTACKING, MoveState.ATTACK_WINDUP, MoveState.CASTING,
                  MoveState.PARRY_STANCE, MoveState.PARRY_COUNTER, MoveState.DASHING,
                  MoveState.DASH_WINDUP, MoveState.AIR_ATTACK];
  ok('8. hero never attacks/casts/parries/dashes while intimidated',
     banned.every((s) => !aggro.has(s)), [...aggro].join(','));
  ok('8. hero keeps its distance', Math.abs(e.x - p.x) >= 260, `gap=${Math.abs(e.x - p.x).toFixed(0)}`);
  ok('8. hero clip is brace', e._animState().name === 'brace', e._animState().name);
  const speed0 = e.maxSpeed, dmg0 = e.attackDamage;
  // release
  for (let i = 0; i < 30; i++) step(p, e, MOVE);
  ok('8. intimidation released on exit', e.isIntimidated === false);
  ok('8. hero stats permanently unchanged', e.maxSpeed === speed0 && e.attackDamage === dmg0);
  let resumed = false;
  for (let i = 0; i < 400; i++) { step(p, e, MOVE); if (e.moveState !== MoveState.WALKING) resumed = true; }
  ok('8. hero AI resumes normal behaviour', resumed, `state=${e.moveState}`);
}

// ===== 9. input resumed DURING the transition (snap / plant) ==============
for (const wait of [182, 190, 196, 205]) {
  const { p, e } = makeWorld();
  for (let i = 0; i < wait; i++) step(p, e);
  const mid = p.afkPhase;
  for (let i = 0; i < 60; i++) step(p, e, MOVE);
  ok(`9. exit mid-'${mid}' recovers control`, p.afkPhase === null && Math.abs(p.velocityX) > 0.5,
     `vx=${p.velocityX.toFixed(2)}`);
}

// ===== 10. combat constants untouched ====================================
{
  const p = new Player(0, 0);
  const hb = p.attackHitbox;
  ok('10. melee reach unchanged', hb.reach === 42, `reach=${hb.reach}`);
  ok('10. melee damage unchanged', hb.damage === 60, `dmg=${hb.damage}`);
  ok('10. melee box unchanged', hb.width === 56 && hb.height === 60);
  ok('10. boss hp pool unchanged', p.maxHp === 1000);
  ok('10. contact damage unchanged', p.contactDamage === 50);
}

// ===== 11. rendering: all phases, all tiers, no throws ====================
{
  const { p, e } = makeWorld(1080);
  const ctx = makeCtx();
  let drawn = 0, phasesDrawn = new Set();
  for (let i = 0; i < 420; i++) {
    step(p, e);
    if (p.afkPhase) phasesDrawn.add(p.afkPhase);
    p.draw(ctx); e.draw(ctx); drawn++;
    if (i === 260) p.takeDamage(30, -1);       // denial tint render path
  }
  SpriteManager.drawIntimidationVignette(ctx, 1280, 720, { intensity: 1 });
  for (let i = 0; i < 40; i++) { step(p, e, MOVE); p.draw(ctx); e.draw(ctx); }
  ok(`11. [${getVfxQualityLabel()}] drew ${drawn} frames with no throw`, true);
  ok(`11. [${getVfxQualityLabel()}] all 3 phases rendered`, phasesDrawn.size === 3, [...phasesDrawn].join(','));
  ok(`11. [${getVfxQualityLabel()}] AFK VFX are hard pixel blocks (fillRect used)`, ctx.calls.fillRect > 1000, `fillRect=${ctx.calls.fillRect}`);
}

// ===== 12. AFK VFX purity: no gradients / no shadowBlur / no giant rect ===
{
  const rects = [];
  const ctx = new Proxy({ globalAlpha: 1, shadowBlur: 0, fillStyle: '#000' }, {
    get(t, p) {
      if (p === 'fillRect') return (x, y, w, h) => rects.push({ x, y, w, h, c: t.fillStyle, a: t.globalAlpha, sb: t.shadowBlur });
      if (p === 'createLinearGradient' || p === 'createRadialGradient') throw new Error('gradient used in AFK VFX');
      if (p in t) return t[p];
      return () => {};
    },
    set(t, p, v) { t[p] = v; return true; },
  });
  SpriteManager.drawIntimidationAura(ctx, 100, 100, 3, { shardPhase: 1, beat: 1, intensity: 1, flip: false });
  SpriteManager.drawPressureWave(ctx, 400, 600, 1, { progress: 0.3, height: 160 });
  SpriteManager.drawPressureWave(ctx, 400, 600, -1, { progress: 0.7, height: 160 });
  SpriteManager.drawIntimidationFlare(ctx, 300, 400, { size: 144, progress: 0.2 });
  SpriteManager.drawPlantCrack(ctx, 300, 600, { age: 0.5, fade: 1, px: 3 });
  SpriteManager.drawHesitationArc(ctx, 700, 600, -1, {});
  SpriteManager.drawWallRepulse(ctx, 20, 600, 1, { progress: 0.3, height: 48 });

  const PAL = new Set(['#060409', '#14101c', '#1a1420', '#6e0f1c', '#a8182a', '#e0263a', '#ff5a4a',
    '#0c0a12', '#3a1014', '#2e3444', '#7c88a0', '#7fd4ff', '#b8ecff',
    '#4a3f33', '#6b5c48', '#8d7b60', '#b3a184']);
  const off = [...new Set(rects.map((r) => r.c))].filter((c) => !PAL.has(c));
  const anyBlur = rects.some((r) => r.sb > 0);
  ok('12. no gradients in AFK VFX', true);   // the ctx proxy throws if one is created
  ok('12. no shadowBlur in AFK VFX', !anyBlur);
  ok('12. palette-legal only', off.length === 0, off.join(' '));
  // "No giant black rectangle": the dark ember/void tones must only ever appear as
  // small blocks or thin lines. (The one wide rect is the PRE-EXISTING approved
  // landing-dust ground line: 64x6 warm stone at a=0.35, reached via drawWallRepulse.)
  const DARK = new Set(['#060409', '#14101c', '#1a1420', '#0c0a12']);
  const darkBlob = rects.find((r) => DARK.has(r.c) && r.w >= 24 && r.h >= 12);
  ok('12. no giant black rectangle', !darkBlob, darkBlob ? `${darkBlob.w}x${darkBlob.h} ${darkBlob.c}` : '');
  const blob = rects.find((r) => r.w >= 48 && r.h >= 16);
  ok('12. no wide+tall solid blob of any colour', !blob, blob ? `${blob.w}x${blob.h} ${blob.c}` : '');
  ok('12. drew real pixel blocks', rects.length > 200, `rects=${rects.length}`);
}


// ===== 13. cancelIntimidation clears everything (cinematic safety) ========
{
  const { p, e } = makeWorld();
  for (let i = 0; i < 260; i++) step(p, e);
  ok('13. state was live', p.isIntimidating && p.afkVignette > 0);
  p.cancelIntimidation(); e.setIntimidated(false);
  ok('13. phase cleared', p.afkPhase === null);
  ok('13. vignette cleared', p.afkVignette === 0);
  ok('13. barrier waves cleared', p.afkWaves.length === 0);
  ok('13. crack cleared', p._afkCrackTimer === 0);
  ok('13. hero released', e.isIntimidated === false);
  ok('13. afk clock reset', p.afkIdleTimer === 0);
  let ctl = false;
  for (let i = 0; i < 10; i++) { step(p, e, MOVE); if (Math.abs(p.velocityX) > 0.5) ctl = true; }
  ok('13. boss controllable again', ctl);
}

// ---- report ---------------------------------------------------------------
const fails = R.filter((r) => r[0] === 'FAIL');
for (const [s, n, x] of R) if (s === 'FAIL' || process.env.VERBOSE) console.log(`${s}  ${n}${x ? '   [' + x + ']' : ''}`);
console.log(`\n[${TIER}] ${R.length - fails.length}/${R.length} passed${fails.length ? `  — ${fails.length} FAILED` : ''}`);
process.exit(fails.length ? 1 : 0);
