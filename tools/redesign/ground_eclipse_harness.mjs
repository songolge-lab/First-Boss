// Behaviour harness for Stage RE-3 (GROUND CHARGED RED ECLIPSE integration).
// Run from the repo root:
//   node tools/redesign/ground_eclipse_harness.mjs [normal|lite|performance]
//
// Drives a real headless Player through the grounded charged-attack lifecycle and
// verifies the approved Stage RE-2 "INHALE" implosion is wired render-only:
//   - phase mapping (B0..B4 track chargeRatio; B5<->B6 charged-hold loop; R0 release)
//   - ground-only eligibility (never for air charge / idle / other states)
//   - chest-core anchor + facing (flip) in both directions
//   - clean cleanup on early release / cancel / death-restart (no stale cells)
//   - overlap with the Walk Red Eclipse (neither cancelled; clean layering)
//   - byte-exact data port + tier reduction present + no-throw all tiers
//   - gameplay invariants (charge frames, laser, hitboxes, damage) unchanged
//
// Repo is `type: commonjs`; bootstrap src/ into a temp `type: module` package.
import { cpSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(tmpdir(), 'ground-eclipse-harness-' + process.pid);
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
const SM = await import(M('game/core/SpriteManager.js'));
const { SpriteManager, BOSS_REDESIGN_SPRITES } = SM;
const { BOSS_GROUND_ECLIPSE } = await import(M('game/core/groundEclipseData.js'));

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
const stubInput = { getHorizontal: () => 0, isJumpHeld: () => false, consumeJump: () => false, consumeDash: () => false, jumpBuffer: false, dashBuffer: false, dashHeld: false };

let pass = 0, fail = 0; const fails = [];
function ok(name, cond, extra = '') { if (cond) { pass++; } else { fail++; fails.push(name + (extra ? '  [' + extra + ']' : '')); } }

function makePlayer() { const p = new Player(2000, 560); p.halfHeight = 20; return p; }
// Clean grounded GROUND_LASER-charging state at a given charge timer.
function forceGroundCharge(p, timer, aimDir = 1) {
  p.afkPhase = null; p._afkExitTimer = 0; p._laserLockTimer = 0;
  p.airDiveState = 'none'; p._diveCharged = false; p.comboStep = 0;
  p.dashTimer = 0; p.isGrounded = true; p.aimDir = aimDir;
  p._attackHeld = true; p._wasAttackHeld = true; p._chargeType = 'GROUND_LASER';
  p.chargeTimer = timer;
}
// Spy drawGroundEclipse; return the captured calls from one draw().
function drawCapture(p) {
  const orig = SpriteManager.drawGroundEclipse;
  const calls = [];
  SpriteManager.drawGroundEclipse = (c, x, y, index, opts) => { calls.push({ x, y, index, opts: opts || {} }); return orig.call(SpriteManager, c, x, y, index, opts); };
  let threw = null;
  try { p.draw(ctx); } catch (e) { threw = e; }
  SpriteManager.drawGroundEclipse = orig;
  return { calls, threw };
}

// =====================================================================
// 1. Phase mapping — B0..B4 track the REAL charge meter (chargeRatio).
// =====================================================================
{
  const cases = [[6, 0], [12, 1], [18, 1], [24, 2], [30, 2], [36, 3], [42, 3], [48, 4], [54, 4], [59, 4]];
  for (const [timer, wantIdx] of cases) {
    const p = makePlayer(); forceGroundCharge(p, timer);
    const { calls, threw } = drawCapture(p);
    ok(`phase[${TIER}]: chargeTimer ${timer} -> B${wantIdx}`, threw === null && calls.length === 1 && calls[0].index === wantIdx,
      threw ? threw.message : `got ${calls.length ? calls[0].index : 'none'}`);
  }
}

// =====================================================================
// 2. Charged HOLD — fully charged loops B5<->B6, never restarts formation,
//    never leaves the 5/6 band (no outward blow-up).
// =====================================================================
{
  const p = makePlayer(); forceGroundCharge(p, 60);   // isFullyCharged
  ok(`hold[${TIER}]: isFullyCharged at timer 60`, p.isFullyCharged);
  const seen = [];
  for (let i = 0; i < 40; i++) { const { calls, threw } = drawCapture(p); if (threw) { ok('hold: no throw', false, threw.message); break; } seen.push(calls[0].index); }
  const uniq = [...new Set(seen)];
  ok(`hold[${TIER}]: only brim frames B5/B6 while held`, uniq.every((i) => i === 5 || i === 6), 'seen=' + JSON.stringify(uniq));
  ok(`hold[${TIER}]: BOTH B5 and B6 appear (pingpong)`, uniq.includes(5) && uniq.includes(6));
  ok(`hold[${TIER}]: returns to B5 (loops, not one-way)`, seen.indexOf(6) > -1 && seen.lastIndexOf(5) > seen.indexOf(6));
  ok(`hold[${TIER}]: never re-enters formation B0..B4 while held`, seen.every((i) => i >= 5));
}

// =====================================================================
// 3. Compositing — one formation draw paints back + body + front (3 layers)
//    from the byte-exact grids, at the correct sprite anchor; facing flips.
// =====================================================================
for (const [aimDir, wantFlip] of [[1, false], [-1, true]]) {
  const p = makePlayer(); forceGroundCharge(p, 42, aimDir);   // B3: back + body + non-empty front
  // Spy drawMatrix to count the composited layers + confirm palette + dims.
  const origM = SpriteManager.drawMatrix; const layers = [];
  SpriteManager.drawMatrix = (c, m, ox, oy, px, opts) => { layers.push({ rows: m.length, cols: m.length ? m[0].length : 0, ox, oy, opts: opts || {} }); return origM.call(SpriteManager, c, m, ox, oy, px, opts); };
  let threw = null; try { p.draw(ctx); } catch (e) { threw = e; }
  SpriteManager.drawMatrix = origM;
  // 84-wide back/front grids, and 46x48 body layers (the REAL groundCharge sprite +
  // the eclipse body re-skin both land here — both must be anchored identically).
  const back = layers.filter((l) => l.rows === 62 && l.cols === 84);
  const body = layers.filter((l) => l.rows === 48 && l.cols === 46);
  const eff = [...back, ...body.filter((l) => l.opts.palette === SM.BOSS_REDESIGN_PALETTE)];
  ok(`composite[${TIER}]: aim ${aimDir} draws back+front (2x 84x62) + body re-skin over the sprite`, threw === null && back.length === 2 && body.length === 2, threw ? threw.message : `back=${back.length} body=${body.length}`);
  ok(`composite[${TIER}]: aim ${aimDir} all eclipse grids flip=${wantFlip}`, back.every((l) => !!l.opts.flip === wantFlip));
  ok(`composite[${TIER}]: aim ${aimDir} uses BOSS_REDESIGN_PALETTE`, eff.every((l) => l.opts.palette === SM.BOSS_REDESIGN_PALETTE));
  // Chest-core anchor: body layers share drawSprite's origin (centred on this.x, feet
  // on feetY) so the core sits on the pose chest in both facings.
  const feetY = p.y + p.halfHeight, px = 3;
  const wantOX = Math.round(p.x - (46 * px) / 2), wantOY = Math.round(feetY - 48 * px);
  ok(`composite[${TIER}]: aim ${aimDir} body re-skin anchored on the sprite (chest-core stable)`, body.every((l) => l.ox === wantOX && l.oy === wantOY), body.map((l) => `${l.ox},${l.oy}`).join(' | ') + ` want ${wantOX},${wantOY}`);
  // back/front grid offset by exactly (-19,-14) cells from the sprite origin.
  ok(`composite[${TIER}]: aim ${aimDir} back grid offset by pose origin (19,14)`, back.every((l) => l.ox === wantOX - 19 * px && l.oy === wantOY - 14 * px));
}

// =====================================================================
// 4. Ground-ONLY eligibility — never draws for air charge / idle / other states.
// =====================================================================
{
  // Air charge (locked AIR_DIVE) must NOT show the ground eclipse.
  const pa = makePlayer(); forceGroundCharge(pa, 40); pa._chargeType = 'AIR_DIVE'; pa.isGrounded = false;
  ok(`eligibility[${TIER}]: air charge draws NO ground eclipse`, drawCapture(pa).calls.length === 0);
  // Idle (not charging) must NOT show it.
  const pi = makePlayer(); pi.afkPhase = null; pi.isGrounded = true; pi._attackHeld = false; pi.chargeTimer = 0; pi._chargeType = null;
  ok(`eligibility[${TIER}]: idle draws NO ground eclipse`, drawCapture(pi).calls.length === 0);
  // A ground charge that JUMPED keeps the eclipse (charge-type locked, not isGrounded).
  const pj = makePlayer(); forceGroundCharge(pj, 40); pj.isGrounded = false; pj.velocityY = -6;
  ok(`eligibility[${TIER}]: ground charge that jumped KEEPS the eclipse (type-locked)`, drawCapture(pj).calls.length === 1);
}

// =====================================================================
// 5. Full lifecycle via real update() — charge builds, full-charge fire sets the
//    R0 outro, laser fires; charge mechanics UNCHANGED.
// =====================================================================
{
  const p = makePlayer(); p.isGrounded = true; p.aimDir = 1; p._attackHeld = true;
  for (let i = 0; i < 75; i++) { p.update(stubInput); p.isGrounded = true; }
  ok('fire: charge locked GROUND_LASER', p._chargeType === 'GROUND_LASER');
  ok('fire: charge caps at CHARGE.frames (60)', p.chargeTimer === 60 && p.isFullyCharged, 'timer=' + p.chargeTimer);
  // Release while fully charged -> laser fires + R0 outro armed.
  p._attackHeld = false; p.update(stubInput);
  ok('fire: full release fires the laser (laser lock set)', p._laserLockTimer > 0);
  ok('fire: charge cleared after fire', p.chargeTimer === 0 && p._chargeType === null);
  ok('fire: R0 SNAP release outro armed (4 ticks)', p._groundEclipseRelease === 4);
  // The outro draws R0 (release:true) over the fireLaser pose, then decays to 0.
  let sawRelease = false, releaseFrames = 0;
  for (let i = 0; i < 8; i++) {
    const { calls } = drawCapture(p);
    const rc = calls.find((c) => c.opts.release);
    if (rc) { sawRelease = true; releaseFrames++; }
  }
  ok('fire: R0 outro rendered then cleared', sawRelease && p._groundEclipseRelease === 0, 'frames=' + releaseFrames);
}

// =====================================================================
// 6. Cleanup — early release, cancel, and death/restart leave NO stale cells.
// =====================================================================
{
  // Early (short) release: never reaches full, no R0 outro, effect stops next frame.
  const p = makePlayer(); p.isGrounded = true; p.aimDir = 1; p._attackHeld = true;
  for (let i = 0; i < 10; i++) { p.update(stubInput); p.isGrounded = true; }   // ~10 ticks < 60
  ok('cleanup: short charge is not full', !p.isFullyCharged && p.chargeTimer > 0);
  p._attackHeld = false; p.update(stubInput);   // short tap -> combo, NOT laser
  ok('cleanup: short release does NOT arm R0 outro', p._groundEclipseRelease === 0);
  ok('cleanup: short release does NOT fire the laser', p._laserLockTimer === 0);
  // groundCharging is now false -> no eclipse next draw (clean same-frame cut).
  p.comboStep = 0; p._chargeType = null; p.chargeTimer = 0; p._attackHeld = false;
  ok('cleanup: eclipse gone the frame charge ends', drawCapture(p).calls.length === 0);
}
{
  // Cancel via cancelIntimidation (restart / Nemesis card / encounter reset).
  const p = makePlayer(); forceGroundCharge(p, 60);
  for (let i = 0; i < 5; i++) drawCapture(p);   // accrue some hold ticks
  ok('cleanup: hold counter accrued before reset', p._groundEclipseHold > 0);
  p._groundEclipseRelease = 4;
  p.cancelIntimidation();
  ok('cleanup: cancelIntimidation clears hold + release counters', p._groundEclipseHold === 0 && p._groundEclipseRelease === 0);
}
{
  // Death mid-hold: draw() runs but update() did not (no control) — clearing the
  // charge (as respawn/gameover do) stops the eclipse; the render counters reset.
  const p = makePlayer(); forceGroundCharge(p, 60);
  drawCapture(p); drawCapture(p);
  p._attackHeld = false; p.chargeTimer = 0; p._chargeType = null;   // charge cleared on death
  const { calls } = drawCapture(p);
  ok('cleanup: cleared charge => no eclipse (death/gameover)', calls.length === 0);
}

// =====================================================================
// 7. Overlap with the Walk Red Eclipse — a live surge is NOT cancelled by a ground
//    charge; both composite (clean layering, no state conflict).
// =====================================================================
{
  const p = makePlayer(); forceGroundCharge(p, 30);
  // Force a live forward surge overlay (as if walking just before the charge).
  p._surgeActive = true; p._surgeName = 'surgeForward'; p._surgeDir = 'run'; p._surgePhase = 10; p._surgeFlip = false; p._locoControlActive = true;
  const origS = SpriteManager.drawSprite; const seen = [];
  SpriteManager.drawSprite = (c, frame, x, y, opts) => { seen.push(frame); return origS.call(SpriteManager, c, frame, x, y, opts); };
  const { calls, threw } = drawCapture(p);
  SpriteManager.drawSprite = origS;
  const drewSurge = seen.some((f) => BOSS_REDESIGN_SPRITES.surgeForward.includes(f));
  ok(`overlap[${TIER}]: no throw with surge + ground charge`, threw === null, threw && threw.message);
  ok(`overlap[${TIER}]: Walk Red Eclipse overlay STILL drawn (not cancelled)`, drewSurge);
  ok(`overlap[${TIER}]: Ground Red Eclipse also drawn (clean layering)`, calls.length === 1);
  ok(`overlap[${TIER}]: surge state preserved (charge did not cancel it)`, p._surgeActive === true && p._surgeName === 'surgeForward');
}

// =====================================================================
// 8. Data integrity — byte-exact port of the approved literal + tiers present.
// =====================================================================
{
  // Re-parse the approved literal and deep-compare to the shipped data module.
  const lit = readFileSync(join(REPO, 'tools/redesign/red_eclipse_ground_literal.txt'), 'utf8').replace(/\r\n/g, '\n');
  const ref = (new Function('return {\n' + lit + '\n};'))();
  const eq = JSON.stringify(BOSS_GROUND_ECLIPSE) === JSON.stringify(ref);
  ok('data: shipped module is byte-exact to the approved RE-2 literal', eq);
  ok('data: all three tiers present with 7 phase frames', BOSS_GROUND_ECLIPSE.eclipseGround.length === 7 && BOSS_GROUND_ECLIPSE.eclipseGroundLite.length === 7 && BOSS_GROUND_ECLIPSE.eclipseGroundPerf.length === 7);
  ok('data: release (1) + body (8) present', BOSS_GROUND_ECLIPSE.eclipseGroundRelease.length === 1 && BOSS_GROUND_ECLIPSE.eclipseGroundBody.length === 8);
  // Tier reduction is real: lite/perf differ from normal at the convergence frames.
  const flat = (fr) => fr.back.join('') + fr.front.join('');
  ok('data: lite reduces normal (B2 differs)', flat(BOSS_GROUND_ECLIPSE.eclipseGroundLite[2]) !== flat(BOSS_GROUND_ECLIPSE.eclipseGround[2]));
  ok('data: perf reduces lite (B3 differs)', flat(BOSS_GROUND_ECLIPSE.eclipseGroundPerf[3]) !== flat(BOSS_GROUND_ECLIPSE.eclipseGroundLite[3]));
  // INWARD proof (RE-2 rule 1): mean hot-cell radius shrinks B1->B4 in every tier.
  const CX = 39, CY = 29, FLOOR = 60;
  const meanR = (fr) => { let s = 0, n = 0; for (const g of [fr.back, fr.front]) g.forEach((row, y) => { if (y >= FLOOR) return; for (let x = 0; x < row.length; x++) { const k = row[x]; if (k === 'b' || k === 'c' || k === 'd') { s += Math.hypot(x - CX, y - CY); n++; } } }); return n ? s / n : 0; };
  for (const key of ['eclipseGround', 'eclipseGroundLite', 'eclipseGroundPerf']) {
    const rs = [1, 2, 3, 4].map((i) => meanR(BOSS_GROUND_ECLIPSE[key][i]));
    let mono = true; for (let i = 1; i < rs.length; i++) if (rs[i] >= rs[i - 1]) mono = false;
    ok(`data: ${key} radius shrinks B1->B4 (inward, not explosion)`, mono, rs.map((r) => r.toFixed(1)).join('->'));
    ok(`data: ${key} crush lands on the chest core (B4 mean r < 12)`, rs[3] < 12, 'r=' + rs[3].toFixed(1));
  }
}

// =====================================================================
// 9. Gameplay invariants unchanged (visual-only integration).
// =====================================================================
{
  const p = makePlayer();
  ok('inv: CHARGE.frames still 60 (charge duration unchanged)', p.isFullyCharged === false && (() => { p.chargeTimer = 60; return p.isFullyCharged; })());
  ok('inv: melee reach 42 / dmg 60', p.attackHitbox.reach === 42 && p.attackHitbox.damage === 60);
  ok('inv: maxHp 1000 / contactDamage 50', p.maxHp === 1000 && p.contactDamage === 50);
  ok('inv: maxSpeed 8 / jumpForce 17', p.maxSpeed === 8 && p.jumpForce === 17);
  ok('inv: ground eclipse frames are NOT hitboxes', p.getActiveHitboxes().length === 0);
  ok('inv: run 6 / retreat 4 (locomotion intact)', BOSS_REDESIGN_SPRITES.run.length === 6 && BOSS_REDESIGN_SPRITES.retreat.length === 4);
}

// =====================================================================
console.log(`\nSTAGE RE-3 GROUND CHARGED RED ECLIPSE harness  [tier=${TIER}]`);
console.log(`  PASS ${pass}   FAIL ${fail}`);
if (fail) { console.log('  FAILURES:'); for (const f of fails) console.log('   - ' + f); process.exit(1); }
console.log('  ALL CHECKS PASSED');
