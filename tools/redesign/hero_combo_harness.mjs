// Behaviour harness for Stage 8B-3 (HERO COMBO "DAYBREAK CHAIN" integration).
// Run from the repo root:  node tools/redesign/hero_combo_harness.mjs
//
// Drives a REAL headless Enemy through a REAL 4-hit combo — the live FSM, not a
// reimplementation — with a recording SpriteManager spy, and verifies the wiring the
// static validator cannot see: that the clips actually reach drawSprite in the FSM's
// own phase order, that the HIT frame is HELD inside its active window, that the
// retired blue slash never fires on melee while the pogo seam still does, that the
// body-framing anchors don't jump when the padded canvas swaps in, and that the
// facing mirror still flips. Render-only feature -> the gameplay assertions here are
// REGRESSION guards (hitbox/damage/timing must be untouched), not new behaviour.
//
// Repo is `type: commonjs`, so mirror src/ into a temp `type: module` package.
import { cpSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const PKG = join(tmpdir(), 'hero-combo-harness-' + process.pid);
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
const { SpriteManager, HERO_REDESIGN_SPRITES, HERO_REDESIGN_PALETTE } = await import(M('game/core/SpriteManager.js'));

let pass = 0;
let fail = 0;
const check = (tag, ok, msg) => { (ok ? pass++ : fail++); console.log(`  [${ok ? 'PASS' : 'FAIL'}] ${tag.padEnd(9)} ${msg}`); };

// --- recording spy -------------------------------------------------------------
// Identify each drawn frame by identity against the real sheet, so we record the
// CLIP + FRAME INDEX the live animator actually resolved.
const frameId = new Map();
for (const [name, frames] of Object.entries(HERO_REDESIGN_SPRITES)) {
    frames.forEach((f, i) => frameId.set(f, `${name}#${i}`));
}

const rec = { sprites: [], holy: [], shadow: [], slashArc: 0 };
SpriteManager.drawSprite = (ctx, frame, cx, bottomY, opts = {}) => {
    rec.sprites.push({ id: frameId.get(frame) || `?${frame.length}x${frame[0].length}`, cx, bottomY, flip: !!opts.flip, palette: opts.palette });
    return { width: frame[0].length * (opts.pixelSize || 1), height: frame.length * (opts.pixelSize || 1), originX: 0, originY: bottomY - frame.length * (opts.pixelSize || 1) };
};
SpriteManager.drawHolySlash = (...a) => { rec.holy.push(a); };
SpriteManager.drawShadow = (ctx, x, y, w) => { rec.shadow.push(w); };
for (const k of ['drawMatrix', 'drawHeroDashStreaks', 'drawParryRing', 'drawLightWave',
    'drawWallRepulse', 'drawHesitationArc', 'drawLandingDust', 'drawHeroTakeoffMotes']) {
    SpriteManager[k] = () => {};
}

// A no-op 2D context: every VFX path is exercised for real, it just paints nowhere.
const ctx = new Proxy({}, { get: (t, p) => (p === 'canvas' ? { width: 800, height: 450 } : () => {}) });

// --- a real, fully-abled Hero on the ground ------------------------------------
function makeHero() {
    const e = new Enemy(400, 300);
    e.applyStats({ hp: 500, move_speed: 5, attack_damage: 20 },
        ['pathfind_melee', 'dash_roll', 'feint', 'telegraph_awareness']);
    e.isGrounded = true;
    e.y = 300;
    return e;
}

const BOSS = { x: 460, y: 300, halfWidth: 30, halfHeight: 45 };
const bounds = { left: BOSS.x - BOSS.halfWidth, right: BOSS.x + BOSS.halfWidth, top: BOSS.y - BOSS.halfHeight, bottom: BOSS.y + BOSS.halfHeight, halfWidth: BOSS.halfWidth, halfHeight: BOSS.halfHeight };

console.log('\n[8B-3 HERO COMBO HARNESS] — a real Enemy through a real chain\n');

// --- 1. drive one full chain ---------------------------------------------------
const hero = makeHero();
hero._startCombo(1);            // enter the chain exactly as the AI does in range
const timeline = [];
for (let i = 0; i < 200; i++) {
    const before = { idx: hero._comboIndex, phase: hero._comboPhase, t: hero._comboPhaseTimer, ms: hero.moveState };
    rec.sprites.length = 0;
    hero.draw(ctx);
    const drawn = rec.sprites[0];
    timeline.push({ ...before, drawn: drawn && drawn.id });
    if (hero.moveState !== MoveState.ATTACK_WINDUP && hero.moveState !== MoveState.ATTACKING) break;
    hero.update(BOSS.x, BOSS.y, bounds);
    // the chain is done once the Hero leaves the attack states
    if (i > 2 && hero._comboCooldown > 0) { rec.sprites.length = 0; break; }
}

const drawnSeq = timeline.map((t) => t.drawn).filter(Boolean);
const uniqOrder = drawnSeq.filter((v, i) => v !== drawnSeq[i - 1]);

// Every one of the 18 approved frames must actually appear, in clip order.
const expected = [
    'heroCombo1#0', 'heroCombo1#1', 'heroCombo1#2', 'heroCombo1#3',
    'heroCombo2#0', 'heroCombo2#1', 'heroCombo2#2', 'heroCombo2#3',
    'heroCombo3#0', 'heroCombo3#1', 'heroCombo3#2', 'heroCombo3#3',
    'heroCombo4#0', 'heroCombo4#1', 'heroCombo4#2', 'heroCombo4#3', 'heroCombo4#4', 'heroCombo4#5',
];
check('CHAIN', JSON.stringify(uniqOrder) === JSON.stringify(expected),
    `all 18 approved frames play in FSM order H1->H2->H3->H4${JSON.stringify(uniqOrder) !== JSON.stringify(expected) ? `\n           got: ${uniqOrder.join(' ')}` : ''}`);

check('NOLEGACY', !drawnSeq.some((d) => d.startsWith('attack#')),
    'the legacy free-running `attack` clip never renders during the chain');

// --- 2. the HOLD is the feel ---------------------------------------------------
// The HIT frame must occupy the BACK half of its own active window, and must be the
// longest-held frame of its hit — that hold IS the impact weight.
const holdOf = (id) => drawnSeq.filter((d) => d === id).length;
const hits = [['heroCombo1#2', 'heroCombo1#1'], ['heroCombo2#2', 'heroCombo2#1'],
              ['heroCombo3#2', 'heroCombo3#1'], ['heroCombo4#3', 'heroCombo4#2']];
const holdRows = hits.map(([hit, early]) => `${hit.replace('heroCombo', 'H')} held ${holdOf(hit)}f vs early ${holdOf(early)}f`);
check('HOLD', hits.every(([hit, early]) => holdOf(hit) >= holdOf(early) && holdOf(hit) >= 2),
    `the HIT frame is HELD in every hit — ${holdRows.join(' | ')}`);

// The HIT frame must land INSIDE the real active window, never in windup/link.
const hitFramesOutsideActive = timeline.filter((t) => t.drawn &&
    /heroCombo[123]#2|heroCombo4#3/.test(t.drawn) && t.phase !== 'active');
check('INWINDOW', hitFramesOutsideActive.length === 0,
    `every HIT frame renders inside its own ACTIVE window (${hitFramesOutsideActive.length} strays)`);

// --- 3. the double-trail regression (the #1 wiring risk) -----------------------
check('NODOUBLE', rec.holy.length === 0,
    `the retired blue slash never fires across the whole chain (drawHolySlash calls: ${rec.holy.length})`);

// --- 4. the pogo seam is SEPARATE and must still work --------------------------
const pogoHero = makeHero();
pogoHero.moveState = MoveState.AIR_ATTACK;
pogoHero.isGrounded = false;
pogoHero.attackHitbox.trigger(true);   // isActive is a getter off activeTimer
rec.holy.length = 0;
pogoHero.draw(ctx);
check('POGO', rec.holy.length === 1,
    `the pogo/air-attack drawHolySlash seam is still live (calls: ${rec.holy.length})`);

// --- 5. body-framing anchors must not jump when the padded canvas swaps in ------
// The combo canvas is 44x34 vs the base 30x24. If the anchors measured the CANVAS,
// the HP bar would pop 20px up and the shadow would swell the instant the Hero swings.
const idleHero = makeHero();
rec.shadow.length = 0;
idleHero.draw(ctx);
const idleTop = idleHero._spriteTopY;
const idleCY = idleHero._bodyCY;
const idleShadow = rec.shadow[0];

const swingHero = makeHero();
swingHero._startCombo(1);
swingHero._enterComboActive();
rec.shadow.length = 0;
swingHero.draw(ctx);
const swingTop = swingHero._spriteTopY;
const swingCY = swingHero._bodyCY;
const swingShadow = rec.shadow[0];

check('HPANCHOR', idleTop === swingTop,
    `the HP-bar anchor holds across the canvas swap: idle ${idleTop} == mid-swing ${swingTop}`);
check('BODYCY', idleCY === swingCY,
    `the body-framing centre holds: idle ${idleCY} == mid-swing ${swingCY}`);
check('SHADOW', idleShadow === swingShadow,
    `the contact shadow doesn't swell: idle ${idleShadow}px == mid-swing ${swingShadow}px`);

// --- 6. mirror / palette -------------------------------------------------------
const leftHero = makeHero();
leftHero.facing = -1;
leftHero._startCombo(-1);
leftHero._enterComboActive();
rec.sprites.length = 0;
leftHero.draw(ctx);
check('MIRROR', rec.sprites[0] && rec.sprites[0].flip === true,
    'facing -1 routes the combo clip through the existing full-sprite flip');
check('PALETTE', rec.sprites[0] && rec.sprites[0].palette === HERO_REDESIGN_PALETTE,
    'the combo clips render through HERO_REDESIGN_PALETTE (the LIGHT keys resolve)');

// --- 7. GAMEPLAY REGRESSION GUARDS --------------------------------------------
// This stage is render-only. The chain's shape must be bit-identical to pre-8B-3.
const g = makeHero();
g._startCombo(1);
const hb = [];
let ticks = 0;
for (let i = 0; i < 300; i++) {
    g.update(BOSS.x, BOSS.y, bounds);
    ticks++;
    if (g.attackHitbox.isActive) hb.push({ w: g.attackHitbox.width, h: g.attackHitbox.height, d: g.attackHitbox.damage });
    if (g._comboCooldown > 0) break;
}
check('TIMING', ticks === 67, `the chain still totals ${ticks} ticks (~1.1s @60fps — unchanged cadence)`);
const shapes = [...new Set(hb.map((x) => `${x.w}x${x.h}`))].join(' ');
check('HITBOX', shapes === '40x46 42x46 44x48 56x54',
    `hitbox shapes per hit unchanged: ${shapes}`);
const dmg = [...new Set(hb.map((x) => x.d))].join(',');
check('DAMAGE', dmg === '16,18,30', `per-hit damage unchanged (0.8/0.8/0.9/1.5 x 20): ${dmg}`);

console.log(`\n  ${fail === 0 ? 'ALL PASSED' : 'FAILURES PRESENT'} — ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
