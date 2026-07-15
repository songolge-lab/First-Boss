// Behaviour harness for Stage 7B-4 (backward-glide trailing silhouette echoes).
// Run from the repo root:  node tools/redesign/walk4_harness.mjs [normal|lite|performance]
// Drives a real headless Player through draw() with a recording SpriteManager
// spy, and verifies the trailing echoes: real-recent-position tracking, approved
// count/alpha/tint, draw order (behind), surge-skin inheritance, and cleanup on
// every state exit. Render-only feature -> no physics assertions here.
//
// Repo is `type: commonjs`, so mirror src/ into a temp `type: module` package.
import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(tmpdir(), 'walk4-harness-' + process.pid);
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

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra = '') { if (cond) { pass++; } else { fail++; fails.push(name + (extra ? '  [' + extra + ']' : '')); } }

function makePlayer() { const p = new Player(2000, 560); p.halfHeight = 20; return p; }

// Clean grounded backward-glide state (=> _animState() 'retreat').
function forceGlide(p) {
  p.afkPhase = null; p._afkExitTimer = 0; p._laserLockTimer = 0;
  p.airDiveState = 'none'; p._diveCharged = false; p.comboStep = 0;
  p.dashTimer = 0; p._attackHeld = false; p.chargeTimer = 0; p._chargeType = null;
  p.isGrounded = true; p.aimDir = 1; p.velocityX = -5;   // sign vs aimDir => retreat
  p._locoControlActive = true;
}
function forceForward(p) { forceGlide(p); p.velocityX = 5; }   // sign == aimDir => run
function forceIdle(p) { forceGlide(p); p.velocityX = 0; }

// Record every SpriteManager.drawSprite as {frame,x,y,opts,order}. Returns a
// restore fn. Echoes are the calls that carry a low alpha; the main sprite is
// the full-alpha body draw at this.x.
function spyDraw() {
  const orig = SpriteManager.drawSprite; const seen = [];
  SpriteManager.drawSprite = (c, frame, x, y, opts = {}) => { seen.push({ frame, x, y, opts, order: seen.length }); return orig.call(SpriteManager, c, frame, x, y, opts); };
  return { seen, restore: () => { SpriteManager.drawSprite = orig; } };
}
const isEcho = (d) => typeof d.opts.alpha === 'number' && d.opts.alpha < 1;
// The main body draw is the full-alpha (no alpha opt) sprite at this.x.
const isMain = (d, px) => d.x === px && d.opts.alpha === undefined;

// Drive N glide frames, moving x by dx each frame BEFORE drawing so the trail
// records a real path. Returns the last frame's recorded draws + x-history.
function glideRun(p, frames, dx) {
  const xs = [];
  let last = null;
  for (let i = 0; i < frames; i++) {
    p.x += dx; xs.push(p.x);
    p._locoControlActive = true;   // mimic update() re-arming the control flag each frame
    const s = spyDraw();
    p.draw(ctx);
    s.restore();
    last = s.seen;
  }
  return { last, xs };
}

// =====================================================================
// 1. Trail fills during retreat; once warm, exactly 2 echoes per frame with
//    the approved alphas/tints, drawn BEHIND (before) the main sprite.
// =====================================================================
{
  const p = makePlayer(); forceGlide(p);
  const { last, xs } = glideRun(p, 20, -6);   // steady glide, 20 frames
  const echoes = last.filter(isEcho);
  ok('trail: exactly 2 echoes per frame once warm', echoes.length === 2, 'n=' + echoes.length);
  const alphas = echoes.map((e) => e.opts.alpha).sort();
  ok('trail: approved alphas 0.25 + 0.45', alphas.length === 2 && alphas[0] === 0.25 && alphas[1] === 0.45, JSON.stringify(alphas));
  const tints = new Set(echoes.map((e) => e.opts.tint));
  ok('trail: approved tints #12121a + #1c1d28', tints.has('#12121a') && tints.has('#1c1d28'));
  const main = last.find((d) => isMain(d, p.x));
  ok('trail: a full-alpha main sprite is drawn at this.x', !!main);
  ok('trail: both echoes drawn BEHIND the main sprite', main && echoes.every((e) => e.order < main.order));
  // dimmer echo (0.25) is the farther/older one; brighter (0.45) drawn after it.
  const dim = echoes.find((e) => e.opts.alpha === 0.25), bright = echoes.find((e) => e.opts.alpha === 0.45);
  ok('trail: older/dimmer echo drawn before newer/brighter one', dim && bright && dim.order < bright.order);
}

// =====================================================================
// 2. Echoes sit at the Boss's REAL recent positions (lag 6 / lag 12), NOT a
//    fixed offset from the current sprite. Move x by a known dx and check.
// =====================================================================
{
  const p = makePlayer(); forceGlide(p);
  const dx = -7;
  const { last, xs } = glideRun(p, 20, dx);
  const cur = p.x;                       // xs[19]
  const echoes = last.filter(isEcho).sort((a, b) => b.opts.alpha - a.opts.alpha); // [bright(lag6), dim(lag12)]
  // Boss position 6 and 12 frames ago == cur - 6*dx and cur - 12*dx.
  const want6 = xs[xs.length - 1 - 6], want12 = xs[xs.length - 1 - 12];
  ok('recent-pos: brighter echo at the position 6 frames ago', echoes[0] && echoes[0].x === want6, 'got=' + (echoes[0] && echoes[0].x) + ' want=' + want6);
  ok('recent-pos: dimmer echo at the position 12 frames ago', echoes[1] && echoes[1].x === want12, 'got=' + (echoes[1] && echoes[1].x) + ' want=' + want12);
  ok('recent-pos: echoes are NOT a fixed small offset from current x', echoes.every((e) => Math.abs(e.x - cur) > 12), 'cur=' + cur + ' echoX=' + echoes.map((e) => e.x));
  ok('recent-pos: trail depth capped at MAX (13)', p._glideTrail.length === 13, 'len=' + p._glideTrail.length);
}

// =====================================================================
// 3. Cleanup: leaving retreat (forward / idle / airborne) drops the trail and
//    draws ZERO echoes on the exit frame.
// =====================================================================
for (const [label, mutate] of [
  ['forward walk (run)', (p) => forceForward(p)],
  ['idle', (p) => forceIdle(p)],
  ['airborne (jump/fall)', (p) => { p.isGrounded = false; }],
]) {
  const p = makePlayer(); forceGlide(p);
  glideRun(p, 20, -6);
  ok('cleanup[' + label + ']: trail warm before exit', p._glideTrail && p._glideTrail.length > 0);
  mutate(p);
  const s = spyDraw(); p.draw(ctx); s.restore();
  const echoes = s.seen.filter(isEcho);
  ok('cleanup[' + label + ']: zero echoes on exit frame', echoes.length === 0, 'n=' + echoes.length);
  ok('cleanup[' + label + ']: trail nulled on exit', p._glideTrail === null);
}

// =====================================================================
// 4. Cleanup on restart / cinematic: cancelIntimidation() -> trail gone.
// =====================================================================
{
  const p = makePlayer(); forceGlide(p);
  glideRun(p, 20, -6);
  ok('reset: trail warm before cancelIntimidation', p._glideTrail && p._glideTrail.length > 0);
  p.cancelIntimidation();
  ok('reset: cancelIntimidation clears the trail', p._glideTrail === null);
}

// =====================================================================
// 5. Forward walk NEVER produces echoes (regression guard for FIX-1 scope).
// =====================================================================
{
  const p = makePlayer(); forceForward(p);
  let anyEcho = false;
  for (let i = 0; i < 30; i++) { p.x += 6; const s = spyDraw(); p.draw(ctx); s.restore(); if (s.seen.some(isEcho)) anyEcho = true; }
  ok('forward: no glide echoes during forward walk', !anyEcho);
  ok('forward: trail stays null during forward walk', p._glideTrail === null);
}

// =====================================================================
// 6. During a BACKWARD surge the echoes inherit the eclipse skin: the recorded
//    echo frames come from the surgeBackward clip (not the base retreat clip).
// =====================================================================
{
  const p = makePlayer(); forceGlide(p);
  glideRun(p, 20, -6);                 // warm the trail on base retreat frames
  // Force a live backward surge; keep gliding so draw() re-skins + records.
  p._surgeActive = true; p._surgeName = 'surgeBackward'; p._surgeDir = 'retreat'; p._surgePhase = 5;
  // Advance enough frames that the whole lag window is surge-skinned.
  let surgeEchoFrames = [];
  for (let i = 0; i < 15; i++) {
    p.x += -6; p._locoControlActive = true;   // update() re-arms the flag each frame
    p._surgeActive = true; p._surgeName = 'surgeBackward'; p._surgeDir = 'retreat';
    const s = spyDraw(); p.draw(ctx); s.restore();
    surgeEchoFrames = s.seen.filter(isEcho).map((e) => e.frame);
  }
  const surgeSet = BOSS_REDESIGN_SPRITES.surgeBackward;
  const retreatSet = BOSS_REDESIGN_SPRITES.retreat;
  ok('surge: echoes inherit the surgeBackward eclipse skin', surgeEchoFrames.length > 0 && surgeEchoFrames.every((f) => surgeSet.includes(f)), 'frames=' + surgeEchoFrames.length);
  ok('surge: echoes are NOT the base retreat skin while surging', surgeEchoFrames.every((f) => !retreatSet.includes(f)));
}

// =====================================================================
// 7. Non-goals: draw() never throws across the whole glide, and the boss
//    gameplay constants are untouched (spot-check).
// =====================================================================
{
  const p = makePlayer(); forceGlide(p);
  let threw = null;
  try { glideRun(p, 60, -5); } catch (e) { threw = e; }
  ok('draw[' + TIER + ']: glide draw never throws', threw === null, threw && threw.message);
  ok('inv: melee reach 42 / damage 60', p.attackHitbox.reach === 42 && p.attackHitbox.damage === 60);
  ok('inv: maxHp 1000 / maxSpeed 8 / jumpForce 17', p.maxHp === 1000 && p.maxSpeed === 8 && p.jumpForce === 17);
  ok('inv: retreat 4 frames (base glide clip intact)', BOSS_REDESIGN_SPRITES.retreat.length === 4);
  ok('inv: glide echoes are not hitboxes (getActiveHitboxes empty at rest)', p.getActiveHitboxes().length === 0);
}

console.log(`\nSTAGE 7B-4 glide-trail harness  [tier=${TIER}]`);
console.log(`  PASS ${pass}   FAIL ${fail}`);
if (fail) { console.log('  FAILURES:'); for (const f of fails) console.log('   - ' + f); process.exit(1); }
console.log('  ALL CHECKS PASSED');
