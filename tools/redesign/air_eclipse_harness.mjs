// Behaviour harness for Stage RE-5 (AIR CHARGED RED ECLIPSE integration).
// Run from the repo root:
//   node tools/redesign/air_eclipse_harness.mjs [normal|lite|performance]
//
// Drives a real headless Player through the airborne charged-attack lifecycle and
// verifies the approved Stage RE-4 "IGNITION" detonation is wired render-only:
//   - phase mapping (C0..C2 track chargeRatio; C3<->C4 charged-hold loop; C5-C7 tail)
//   - air-ONLY eligibility (never for ground charge / idle / other states)
//   - chest-core anchor + facing (flip) in both directions
//   - peak ignition plays ONCE (C3 not looped continuously)
//   - release tail (fully charged) plays C5->C6->C7 once; partial release = NO tail
//   - clean cleanup on hit / cancel / death-restart (no stale cells)
//   - overlap with the Walk Red Eclipse (neither cancelled; clean layering)
//   - byte-exact data port + tier reduction + OUTWARD (never inward) proof
//   - gameplay invariants (charge frames, dive freeze, hitboxes, damage) unchanged
//
// Repo is `type: commonjs`; bootstrap src/ into a temp `type: module` package.
import { cpSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(tmpdir(), 'air-eclipse-harness-' + process.pid);
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
const { BOSS_AIR_ECLIPSE } = await import(M('game/core/airEclipseData.js'));

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
// Clean AIRBORNE AIR_DIVE-charging state at a given charge timer (draw-only tests).
function forceAirCharge(p, timer, aimDir = 1) {
  p.afkPhase = null; p._afkExitTimer = 0; p._laserLockTimer = 0;
  p.airDiveState = 'none'; p._diveCharged = false; p.comboStep = 0;
  p.dashTimer = 0; p.isGrounded = false; p.aimDir = aimDir;
  p._attackHeld = true; p._wasAttackHeld = true; p._chargeType = 'AIR_DIVE';
  p.chargeTimer = timer;
}
// Spy drawAirEclipse; return the captured calls from one draw().
function airCapture(p) {
  const orig = SpriteManager.drawAirEclipse;
  const calls = [];
  SpriteManager.drawAirEclipse = (c, x, y, index, opts) => { calls.push({ x, y, index, opts: opts || {} }); return orig.call(SpriteManager, c, x, y, index, opts); };
  let threw = null;
  try { p.draw(ctx); } catch (e) { threw = e; }
  SpriteManager.drawAirEclipse = orig;
  return { calls, threw };
}
// Isolate the eclipse's OWN composited layers (wrap drawAirEclipse, count its
// internal drawMatrix calls) so the sprite draw never confuses the layer count.
function airLayers(p) {
  const origAir = SpriteManager.drawAirEclipse;
  const layers = []; let called = 0;
  SpriteManager.drawAirEclipse = (c, x, y, index, opts) => {
    called++;
    const origM = SpriteManager.drawMatrix;
    SpriteManager.drawMatrix = (cc, m, ox, oy, px, o) => { layers.push({ rows: m.length, cols: m.length ? m[0].length : 0, ox, oy, opts: o || {} }); return origM.call(SpriteManager, cc, m, ox, oy, px, o); };
    const r = origAir.call(SpriteManager, c, x, y, index, opts);
    SpriteManager.drawMatrix = origM;
    return r;
  };
  let threw = null; try { p.draw(ctx); } catch (e) { threw = e; }
  SpriteManager.drawAirEclipse = origAir;
  return { layers, called, threw };
}

// =====================================================================
// 1. Phase mapping — C0..C2 track the REAL charge meter (chargeRatio).
// =====================================================================
{
  const cases = [[6, 0], [12, 0], [20, 1], [24, 1], [30, 1], [40, 2], [48, 2], [59, 2]];
  for (const [timer, wantIdx] of cases) {
    const p = makePlayer(); forceAirCharge(p, timer);
    const { calls, threw } = airCapture(p);
    ok(`phase[${TIER}]: chargeTimer ${timer} -> C${wantIdx}`, threw === null && calls.length === 1 && calls[0].index === wantIdx,
      threw ? threw.message : `got ${calls.length ? calls[0].index : 'none'}`);
  }
}

// =====================================================================
// 2. Charged HOLD — fully charged loops C3<->C4, the peak (C3) plays ONCE at the
//    top of the hold, never re-bursts / restarts the gather / blows outward.
// =====================================================================
{
  const p = makePlayer(); forceAirCharge(p, 60);   // isFullyCharged
  ok(`hold[${TIER}]: isFullyCharged at timer 60`, p.isFullyCharged);
  const seen = [];
  for (let i = 0; i < 40; i++) { const { calls, threw } = airCapture(p); if (threw) { ok('hold: no throw', false, threw.message); break; } seen.push(calls[0].index); }
  const uniq = [...new Set(seen)];
  ok(`hold[${TIER}]: only peak frames C3/C4 while held`, uniq.every((i) => i === 3 || i === 4), 'seen=' + JSON.stringify(uniq));
  ok(`hold[${TIER}]: BOTH C3 and C4 appear (pingpong)`, uniq.includes(3) && uniq.includes(4));
  ok(`hold[${TIER}]: peak ignition C3 plays first (once), then pingpongs`, seen[0] === 3 && seen.indexOf(4) > -1 && seen.lastIndexOf(3) > seen.indexOf(4));
  ok(`hold[${TIER}]: never re-enters gather C0..C2 while held`, seen.every((i) => i >= 3));
  // No unbounded growth: the hold counter advances but the frame index stays in {3,4}.
  ok(`hold[${TIER}]: index bounded to the 3/4 band across 40 ticks`, Math.max(...seen) === 4 && Math.min(...seen) === 3);
}

// =====================================================================
// 3. Compositing — one formation draw paints back + body + front (3 layers);
//    the RELEASE tail draws back + front ONLY (no body re-skin). Facing flips.
// =====================================================================
for (const [aimDir, wantFlip] of [[1, false], [-1, true]]) {
  const p = makePlayer(); forceAirCharge(p, 60, aimDir);   // C3 peak: back + body + front
  const { layers, threw } = airLayers(p);
  const back = layers.filter((l) => l.rows === 88 && l.cols === 100);
  const body = layers.filter((l) => l.rows === 48 && l.cols === 46);
  ok(`composite[${TIER}]: aim ${aimDir} formation draws back+front (2x 100x88) + 1 body re-skin`, threw === null && back.length === 2 && body.length === 1, threw ? threw.message : `back=${back.length} body=${body.length}`);
  ok(`composite[${TIER}]: aim ${aimDir} all eclipse grids flip=${wantFlip}`, layers.every((l) => !!l.opts.flip === wantFlip));
  ok(`composite[${TIER}]: aim ${aimDir} uses BOSS_REDESIGN_PALETTE`, layers.every((l) => l.opts.palette === SM.BOSS_REDESIGN_PALETTE));
  // Chest-core anchor: the body re-skin shares drawSprite's origin (centred on this.x,
  // feet on feetY) so the core sits on the pose chest in both facings.
  const feetY = p.y + p.halfHeight, px = 3;
  const wantOX = Math.round(p.x - (46 * px) / 2), wantOY = Math.round(feetY - 48 * px);
  ok(`composite[${TIER}]: aim ${aimDir} body re-skin anchored on the sprite (chest-core stable)`, body.every((l) => l.ox === wantOX && l.oy === wantOY), body.map((l) => `${l.ox},${l.oy}`).join(' | ') + ` want ${wantOX},${wantOY}`);
  // back/front grid offset by exactly (-27,-14) cells from the sprite origin.
  ok(`composite[${TIER}]: aim ${aimDir} back grid offset by pose origin (27,14)`, back.every((l) => l.ox === wantOX - 27 * px && l.oy === wantOY - 14 * px));
}
{
  // Release tail: back + front only (NO body re-skin), so it rides the live dive pose.
  const p = makePlayer(); forceAirCharge(p, 0); p._attackHeld = false; p._chargeType = null; p.chargeTimer = 0;
  p.airDiveState = 'freeze'; p._diveCharged = true; p._airDiveFreezeTimer = 12;
  p._airEclipseRelease = 19; p._airEclipseReleaseFlip = false;
  const { layers, threw } = airLayers(p);
  const back = layers.filter((l) => l.rows === 88 && l.cols === 100);
  const body = layers.filter((l) => l.rows === 48 && l.cols === 46);
  ok(`release-composite[${TIER}]: tail draws back+front ONLY (no body re-skin)`, threw === null && back.length === 2 && body.length === 0, threw ? threw.message : `back=${back.length} body=${body.length}`);
}

// =====================================================================
// 4. Air-ONLY eligibility — never draws for ground charge / idle / other states.
// =====================================================================
{
  // Ground charge (locked GROUND_LASER) must NOT show the air eclipse.
  const pg = makePlayer(); forceAirCharge(pg, 40); pg._chargeType = 'GROUND_LASER'; pg.isGrounded = true;
  ok(`eligibility[${TIER}]: ground charge draws NO air eclipse`, airCapture(pg).calls.length === 0);
  // Idle (not charging) must NOT show it.
  const pi = makePlayer(); pi.afkPhase = null; pi.isGrounded = true; pi._attackHeld = false; pi.chargeTimer = 0; pi._chargeType = null;
  ok(`eligibility[${TIER}]: idle draws NO air eclipse`, airCapture(pi).calls.length === 0);
  // An air charge that touched the ground KEEPS the eclipse (charge-type locked, not isGrounded).
  const pl = makePlayer(); forceAirCharge(pl, 40); pl.isGrounded = true;
  ok(`eligibility[${TIER}]: air charge keeps the eclipse even if grounded (type-locked)`, airCapture(pl).calls.length === 1);
  // AFK intimidation must NOT show it.
  const pa = makePlayer(); forceAirCharge(pa, 40); pa.afkPhase = 'idle'; pa._attackHeld = false; pa.chargeTimer = 0; pa._chargeType = null;
  ok(`eligibility[${TIER}]: AFK draws NO air eclipse`, airCapture(pa).calls.length === 0);
}

// =====================================================================
// 5. Full lifecycle via real update() — charge builds, full-charge release starts the
//    dive + arms the C5-C7 tail; the tail plays C5->C6->C7 once then clears.
// =====================================================================
{
  const p = makePlayer(); p.isGrounded = false; p.aimDir = 1; p._attackHeld = true;
  for (let i = 0; i < 70; i++) { p.update(stubInput); p.isGrounded = false; }
  ok('fire: charge locked AIR_DIVE', p._chargeType === 'AIR_DIVE');
  ok('fire: charge caps at CHARGE.frames (60)', p.chargeTimer === 60 && p.isFullyCharged, 'timer=' + p.chargeTimer);
  ok('fire: isChargeReady armed while held + fully charged airborne', p.isChargeReady === true);
  // Release while fully charged -> dive starts + C5-C7 tail armed (19 ticks).
  p._attackHeld = false; p.update(stubInput);
  ok('fire: full release starts the air dive (freeze)', p.airDiveState === 'freeze' && p._diveCharged === true);
  ok('fire: dive freeze unchanged (DIVE.freeze == 12)', p._airDiveFreezeTimer === 12);
  ok('fire: charge cleared after release', p.chargeTimer === 0 && p._chargeType === null);
  ok('fire: C5-C7 discharge tail armed (19 ticks)', p._airEclipseRelease === 19);
  ok('fire: release facing captured (aim +1 -> flip false)', p._airEclipseReleaseFlip === false);
  // The tail draws C5 (5) -> C6 (6) -> C7 (8), release:true, then decays to 0.
  const tail = [];
  for (let i = 0; i < 25; i++) {
    const { calls } = airCapture(p);
    const rc = calls.find((c) => c.opts.release);
    if (rc) tail.push(rc.index);
  }
  const c5 = tail.filter((i) => i === 5).length, c6 = tail.filter((i) => i === 6).length, c7 = tail.filter((i) => i === 7).length;
  ok('fire: tail plays exactly C5x5, C6x6, C7x8 (19 frames, one-shot)', tail.length === 19 && c5 === 5 && c6 === 6 && c7 === 8, `tail=${JSON.stringify(tail)}`);
  ok('fire: tail order is C5 -> C6 -> C7 (outward, never reversed)', tail.join('') === '5'.repeat(5) + '6'.repeat(6) + '7'.repeat(8));
  ok('fire: tail cleared after it finishes', p._airEclipseRelease === 0);
}
{
  // PARTIAL charge release -> normal dive, NO tail (gather cuts to nothing).
  const p = makePlayer(); p.isGrounded = false; p.aimDir = 1; p._attackHeld = true;
  for (let i = 0; i < 12; i++) { p.update(stubInput); p.isGrounded = false; }
  ok('partial: short charge is not full', !p.isFullyCharged && p.chargeTimer > 0);
  p._attackHeld = false; p.update(stubInput);
  ok('partial: release still starts a (normal) dive', p.airDiveState === 'freeze' && p._diveCharged === false);
  ok('partial: NO discharge tail armed', p._airEclipseRelease === 0);
  ok('partial: no air eclipse drawn after a partial release', airCapture(p).calls.length === 0);
}

// =====================================================================
// 6. Cleanup — hit mid-charge, cancel, and death/restart leave NO stale cells.
// =====================================================================
{
  // Hit while charging: takeDamage cancels charge + clears the render counters.
  const p = makePlayer(); forceAirCharge(p, 60);
  for (let i = 0; i < 6; i++) airCapture(p);           // accrue some hold ticks
  ok('cleanup: hold counter accrued before hit', p._airEclipseHold > 0);
  p.iFrames = 0; p.takeDamage(10, 1);
  ok('cleanup: takeDamage clears charge + air-eclipse counters', p.chargeTimer === 0 && p._chargeType === null && p._airEclipseHold === 0 && p._airEclipseRelease === 0);
  ok('cleanup: no air eclipse the frame after a hit', airCapture(p).calls.length === 0);
}
{
  // Cancel via cancelIntimidation (restart / Nemesis card / encounter reset).
  const p = makePlayer(); forceAirCharge(p, 60);
  for (let i = 0; i < 5; i++) airCapture(p);
  ok('cleanup: hold counter accrued before reset', p._airEclipseHold > 0);
  p._airEclipseRelease = 19;
  p.cancelIntimidation();
  ok('cleanup: cancelIntimidation clears hold + release counters', p._airEclipseHold === 0 && p._airEclipseRelease === 0);
}
{
  // Death mid-hold: draw() runs but update() did not — clearing the charge (as
  // respawn/gameover do via takeDamage) stops the eclipse; render counters reset.
  const p = makePlayer(); forceAirCharge(p, 60);
  airCapture(p); airCapture(p);
  p._attackHeld = false; p.chargeTimer = 0; p._chargeType = null; p._airEclipseHold = 0; p._airEclipseRelease = 0;
  ok('cleanup: cleared charge => no eclipse (death/gameover)', airCapture(p).calls.length === 0);
}

// =====================================================================
// 7. Overlap with the Walk Red Eclipse — a live surge is NOT cancelled by an air
//    charge; both composite (clean layering, no state conflict).
// =====================================================================
{
  const p = makePlayer(); forceAirCharge(p, 40);
  p._surgeActive = true; p._surgeName = 'surgeForward'; p._surgeDir = 'run'; p._surgePhase = 10; p._surgeFlip = false; p._locoControlActive = true;
  const origS = SpriteManager.drawSprite; const seen = [];
  SpriteManager.drawSprite = (c, frame, x, y, opts) => { seen.push(frame); return origS.call(SpriteManager, c, frame, x, y, opts); };
  const { calls, threw } = airCapture(p);
  SpriteManager.drawSprite = origS;
  const drewSurge = seen.some((f) => BOSS_REDESIGN_SPRITES.surgeForward.includes(f));
  ok(`overlap[${TIER}]: no throw with surge + air charge`, threw === null, threw && threw.message);
  ok(`overlap[${TIER}]: Walk Red Eclipse overlay STILL drawn (not cancelled)`, drewSurge);
  ok(`overlap[${TIER}]: Air Red Eclipse also drawn (clean layering)`, calls.length === 1);
  ok(`overlap[${TIER}]: surge state preserved (charge did not cancel it)`, p._surgeActive === true && p._surgeName === 'surgeForward');
}

// =====================================================================
// 8. Data integrity — byte-exact port of the approved literal + OUTWARD proof.
// =====================================================================
{
  const lit = readFileSync(join(REPO, 'tools/redesign/red_eclipse_air_literal.txt'), 'utf8').replace(/\r\n/g, '\n');
  const ref = (new Function('return {\n' + lit + '\n};'))();
  const eq = JSON.stringify(BOSS_AIR_ECLIPSE) === JSON.stringify(ref);
  ok('data: shipped module is byte-exact to the approved RE-4 literal', eq);
  ok('data: all three tiers present with 8 phase frames', BOSS_AIR_ECLIPSE.eclipseAir.length === 8 && BOSS_AIR_ECLIPSE.eclipseAirLite.length === 8 && BOSS_AIR_ECLIPSE.eclipseAirPerf.length === 8);
  ok('data: body (8) present', BOSS_AIR_ECLIPSE.eclipseAirBody.length === 8);
  const flat = (fr) => fr.back.join('') + fr.front.join('');
  ok('data: lite reduces normal (C3 differs)', flat(BOSS_AIR_ECLIPSE.eclipseAirLite[3]) !== flat(BOSS_AIR_ECLIPSE.eclipseAir[3]));
  ok('data: perf reduces lite (C3 differs)', flat(BOSS_AIR_ECLIPSE.eclipseAirPerf[3]) !== flat(BOSS_AIR_ECLIPSE.eclipseAirLite[3]));
  // OUTWARD proof (RE-4 rule 1): gather pulls tight (C0>C1), then radius only GROWS
  // (C1<C2<C3), and the held peak stays stable (|C4-C3|/C3 <= 0.2) — never inward.
  const CX = 47, CY = 29;
  const meanR = (fr) => { let s = 0, n = 0; for (const g of [fr.back, fr.front]) g.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const k = row[x]; if (k === 'b' || k === 'c' || k === 'd') { s += Math.hypot(x - CX, y - CY); n++; } } }); return n ? s / n : 0; };
  for (const key of ['eclipseAir', 'eclipseAirLite', 'eclipseAirPerf']) {
    const rs = [0, 1, 2, 3, 4].map((i) => meanR(BOSS_AIR_ECLIPSE[key][i]));
    ok(`data: ${key} gather pulls tight first (C0 > C1)`, rs[0] > rs[1], rs.map((r) => r.toFixed(1)).join('->'));
    ok(`data: ${key} radius GROWS C1->C2->C3 (outward, never implosion)`, rs[1] < rs[2] && rs[2] < rs[3], rs.map((r) => r.toFixed(1)).join('->'));
    ok(`data: ${key} held peak stays stable at C4 (never re-bursts)`, Math.abs(rs[4] - rs[3]) / rs[3] <= 0.2, `C3=${rs[3].toFixed(1)} C4=${rs[4].toFixed(1)}`);
  }
  // Reach + S-dominance at the C3 peak: the starburst spans all cardinals and the
  // SOUTH ray (aimed at the ground / dive axis) is the longest, in every tier.
  for (const key of ['eclipseAir', 'eclipseAirLite', 'eclipseAirPerf']) {
    let mxS = 0, mxN = 0, mxE = 0, mxW = 0;
    BOSS_AIR_ECLIPSE[key][3].back.forEach((row, y) => { for (let x = 0; x < row.length; x++) { const k = row[x]; if (k !== 'b' && k !== 'c' && k !== 'd') continue; const dx = x - CX, dy = y - CY; if (Math.abs(dx) <= 2) { if (dy > mxS) mxS = dy; if (-dy > mxN) mxN = -dy; } if (Math.abs(dy) <= 2) { if (dx > mxE) mxE = dx; if (-dx > mxW) mxW = -dx; } } });
    ok(`data: ${key} C3 reaches all cardinals (S>=50,N>=24,E/W>=32)`, mxS >= 50 && mxN >= 24 && mxE >= 32 && mxW >= 32, `S=${mxS} N=${mxN} E=${mxE} W=${mxW}`);
    ok(`data: ${key} C3 south ray is dominant (aims at the ground/dive axis)`, mxS > mxN && mxS > mxE && mxS > mxW, `S=${mxS} N=${mxN} E=${mxE} W=${mxW}`);
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
  // Full-charge dive velocity after freeze is the untouched DIVE (vx 11 / vy 21).
  const pd = makePlayer(); pd.isGrounded = false; pd.aimDir = 1; pd._attackHeld = true;
  for (let i = 0; i < 70; i++) { pd.update(stubInput); pd.isGrounded = false; }
  pd._attackHeld = false; pd.update(stubInput);           // release -> freeze
  for (let i = 0; i < 12; i++) { pd.update(stubInput); pd.isGrounded = false; }  // burn the freeze
  ok('inv: charged dive velocity unchanged (vx 11 / vy 21)', Math.abs(pd.velocityX) === 11 && pd.velocityY === 21, `vx=${pd.velocityX} vy=${pd.velocityY} state=${pd.airDiveState}`);
  ok('inv: air eclipse frames are NOT hitboxes', pd.getActiveHitboxes().every((h) => h.kind !== 'eclipse'));
  ok('inv: run/retreat locomotion intact', BOSS_REDESIGN_SPRITES.run.length > 0 && BOSS_REDESIGN_SPRITES.retreat.length > 0);
}

// =====================================================================
console.log(`\nSTAGE RE-5 AIR CHARGED RED ECLIPSE harness  [tier=${TIER}]`);
console.log(`  PASS ${pass}   FAIL ${fail}`);
if (fail) { console.log('  FAILURES:'); for (const f of fails) console.log('   - ' + f); process.exit(1); }
console.log('  ALL CHECKS PASSED');
