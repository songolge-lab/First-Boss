// src/entities/Player.js
import { Hitbox } from '../core/Hitbox.js';
import { SpriteManager, SpriteAnimator, BOSS_SPRITES, BOSS_PIXEL,
         BOSS_IDLE_PIXEL, BOSS_REDESIGN_PALETTE, BOSS_REDESIGN_SPRITES } from '../core/SpriteManager.js';
import { PerfMonitor } from '../core/PerfMonitor.js';

// Sword tuning. Frame-based to match the existing per-frame physics (~60fps).
// Heavy + committed: a real cooldown between slashes so positioning matters
// (in the spirit of the Hollow-Knight-ish "weighty" combat in CLAUDE.md).
//
// NOTE: this now just SEEDS the shared melee Hitbox at construction. The 4-hit
// combo (below) reconfigures that same hitbox per-hit via configure(), so SWORD
// is effectively the template for hit 1.
const SWORD = Object.freeze({
    REACH_PX: 42,        // hitbox center distance from the Boss center (in facing dir)
    WIDTH: 56,           // hitbox full width
    HEIGHT: 60,          // hitbox full height (a touch taller than the body)
    DURATION_FRAMES: 10, // active frames of the slash (~0.17s)
    COOLDOWN_FRAMES: 0,  // the combo FSM gates cadence now, not the hitbox cooldown
    DAMAGE: 60,          // carried over from the old contactDamage value
    KNOCKBACK: 11,       // horizontal knockback dealt to whatever it hits
});

// ---------------------------------------------------------------------------
// REQUIREMENT 1 — 4-hit ground combo tuning (all times in frames @ ~60fps).
//   commit   : frames the Boss is fully committed to the swing (input locked).
//   recovery : the CHAIN WINDOW after commit. A press here advances the combo;
//              if it lapses with no buffered press, the combo resets.
//   step     : forward momentum (px/frame) injected at the hit's start.
//   box      : per-hit melee Hitbox config (hits 1 & 2 only).
// ---------------------------------------------------------------------------
const COMBO = Object.freeze({
    1: { commit: 14, recovery: 16, step: 6,
         box: { reach: 42, width: 56, height: 60, duration: 10, cooldown: 0, damage: 60, knockback: 11 } },
    2: { commit: 16, recovery: 16, step: 7,
         box: { reach: 46, width: 70, height: 64, duration: 12, cooldown: 0, damage: 72, knockback: 13 } },
    3: { commit: 20, recovery: 18 },   // Dark Flame cast — Boss stands still
    4: { commit: 10, recovery: 30 },   // Explosive dash finisher (commit == dash length)
});

// Hit 3 — Dark Flame: a moving Hitbox that rides the ground forward.
const FLAME  = Object.freeze({ width: 64, height: 56, frames: 80, speed: 9, spawnAhead: 56, damage: 80, knockback: 14 });
// Hit 4 — Explosive Finisher: a fast forward dash, then a massive circular blast.
const FINISH = Object.freeze({ dashFrames: 10, dashSpeed: 30 });
// `ahead` seats the blast CORE just past the Boss's leading edge (the strike/impact
// zone) rather than on his torso, so the detonation reads as the finisher landing in
// front of him. `drawPixel` scales the DRAWN detonation (visual-only; the AABB stays
// `size`) so the burst reads slightly taller than the ~144px Boss body.
const EXPL   = Object.freeze({ size: 210, frames: 26, ahead: 52, drawPixel: 5, damage: 160, knockback: 26 });
// REQUIREMENT 2 — Diagonal Air Dive + landing (Fear Strike) shockwave.
const DIVE   = Object.freeze({ freeze: 12, vx: 11, vy: 21 });
const SHOCK  = Object.freeze({ width: 210, height: 92, frames: 22, damage: 90, knockback: 22 });

// ---------------------------------------------------------------------------
// CHARGED ATTACKS (new). Hold the attack button (J / Left Click) to build a
// charge; release to fire. All times in frames @ ~60fps (matching everything
// above).
//   CHARGE.frames : frames of HOLD needed to be "fully charged" (1.0s == 60).
//                   Crossing this threshold mid-air (while still holding) also
//                   arms `isChargeReady` for the STEP-2 "Charge Ready" aura.
//   LASER         : the GROUND fully-charged release — a massive, stationary
//                   horizontal beam fired forward. length/thickness are the full
//                   AABB extents; the box is centred half-a-length ahead so its
//                   near edge starts on the Boss. `lock` roots the Boss while the
//                   beam is live.
// The AIR fully-charged release reuses the existing Air Dive but tags its
// landing shockwave as the Fear Strike (see _spawnShockwave / _startAirDive).
// ---------------------------------------------------------------------------
const CHARGE = Object.freeze({ frames: 60 }); // 1.0s @ ~60fps (was 120 / 2.0s)
const LASER  = Object.freeze({
    length: 520, thickness: 70, ahead: 0,
    frames: 30, lock: 30, damage: 220, knockback: 30,
});

// ---------------------------------------------------------------------------
// STAGE 7A-1 — AFK INTIMIDATION / sword-planted idle (tools/redesign/afk_spec.md).
// After 3s with NO player input the Boss forces himself into a dominance state:
// snap -> black/dark-red pressure barrier -> sword plant -> planted idle loop,
// wrapped in the intimidation aura + a screen vignette, while the Hero holds a
// wary standoff. ANY player input exits immediately.
//
// The state is purely a POSTURE + a harmless repulsion. It spawns NO Hitbox, so
// it can never deal damage: the pressure waves live in `afkWaves` (plain objects
// that main.js reads for the push) and are never surfaced by getActiveHitboxes().
// The longer planted greatsword exists only inside the afk* sprite clips, so the
// melee reach / hitbox constants above are untouched.
//
// All frame counts follow afk_spec.md §3 ("suggested hold @60"). Every value here
// is a tuning knob; none of them is read by any other system.
// ---------------------------------------------------------------------------
const AFK = Object.freeze({
    IDLE_FRAMES: 180,       // 3.0s of no input before the state triggers

    // afkSnap  — frame holds 8 / 7 / 7 (barrier fires as frame 2 begins)
    SNAP_F1: 8, SNAP_F2: 15, SNAP_FRAMES: 22,
    // afkPlant — frame holds 5 / 6 / 8 (frame 1 is the IMPACT; f2 == afkIdle f0)
    PLANT_IMPACT: 5, PLANT_F2: 11, PLANT_FRAMES: 19,
    // afkIdle  — heartbeat: 42 frames of rest, then a 6-frame ember thump
    IDLE_CYCLE: 48, IDLE_THUMP: 42, IDLE_BEAT2: 45,
    EXIT_FRAMES: 12,        // afkExit is a cosmetic tail; control returns instantly

    FORCE_DOWN_VY: 22,      // airborne: constant forced descent (no gravity accel => no jitter)
    PLANT_OFFSET_PX: 26,    // sprite plant column, ahead of the Boss centre

    // Pressure barrier: a mirrored pair of travelling walls. 0 damage, ever.
    WAVE_SPEED: 13, WAVE_FRAMES: 34, WAVE_HEIGHT: 160,
    WAVE_HALF_W: 20, WAVE_HALF_H: 80,
    WAVE_DISSOLVE_RATE: 4,  // life ticks per frame once the state ends (clean fade)

    FLARE_FRAMES: 10,       // chest-point snap flare
    AURA_PHASE_FRAMES: 9,   // 3-phase sinking-shard loop
    VIGNETTE_IN: 24,        // ~400ms fade in (from the plant impact)
    VIGNETTE_OUT: 15,       // ~250ms fade out (on exit)
    CRACK_LINGER: 120,      // ~2s of floor crack after the state ends
    CRACK_AGE_DIV: 60,      // frames -> crack `age` units (wink lasts ~7 frames)

    // STAGE 7A-2C — curse-pressure darkening + void-fracture arcs (afk2_spec.md).
    CURSE_PHASE_FRAMES: 24, // ~1.2s breathing loop over 3 phases
    ARC_MAX: 2,             // restraint rule: never more than 2 concurrent arcs
    ARC_IGNITE: 3,          // f0 ignite holds 3 frames...
    ARC_FLASH: 7,           // ...then f1 flash for 4...
    ARC_FRACTURE: 11,       // ...then f2 fracture for 4...
    ARC_LIFE: 17,           // ...then f3 ash for 6. Total 17.
    ARC_FRAC_LIFE: 10,      // ground skitter starts at f2 (fracture look): 4 + 6
    ARC_ASH: 6,             // ash tail; also the forced die-off when the state ends
    ARC_CRAWL_AT: 14,       // idle-cycle frame the blade crawl fires on
    ARC_SKITTER_AT: 24,     // idle-cycle frame the ground skitter fires on
});

// The four approved arc spawn anchors (afk2_spec §B), in BOSS MATRIX CELL coords
// on the 46x48 planted frames: chest core (19,15), guard gem (31,18), blade mid
// (31,32), plant point (31,46). Every arc stays inside the aura footprint, runs
// at most ~48% of the boss height, and can never reach the Hero.
const AFK_ARCS = Object.freeze({
    // chest core -> up-left fork; fires ON the heartbeat beat frame.
    chestFork: { x0: 18, y0: 14, x1: 7, y1: 0, seed: 21, jx: 1, jy: 2,
                 branches: [{ frac: 0.5, dx: -5, dy: -3 }] },
    // chest core -> guard gem connector.
    guardLink: { x0: 21, y0: 16, x1: 30, y1: 16, seed: 27, jx: 1, jy: 1 },
    // crawls 2-3px BESIDE the planted blade, so the void sheath separates it from
    // the blade's own red core instead of vanishing into it.
    bladeCrawl: { x0: 34, y0: 22, x1: 33, y1: 45, seed: 33, jx: 2, jy: 0 },
    // skitters along the shadow-pool rim from the plant point; fracture-mode look.
    groundSkitter: { x0: 32, y0: 48, x1: 44, y1: 48, seed: 35, jx: 0, jy: 1,
                     ground: true, fracture: true },
});

// ---------------------------------------------------------------------------
// STAGE 7B-3 / RE-1 — WALK-TRIGGERED RED ECLIPSE (walk2_handoff.md §2/§4,
// walk2_spec.md §4). While the Boss walks CONTINUOUSLY (forward walk `run` or
// backward glide `retreat`), a ~1s approved black-red eclipse periodically SPAWNS
// using the approved surgeForward / surgeBackward clips (in BOSS_REDESIGN_SPRITES).
//
// TRIGGER vs PLAYBACK are kept separate (STAGE RE-1). Walking only decides WHEN an
// eclipse begins; once begun it is an INDEPENDENT render-only overlay drawn OVER the
// Boss that plays its full DURATION regardless of later player actions (walk, stop,
// turn, jump, fall, attack, dash, charge). It NEVER locks input and is PURELY
// PRESENTATION — no hitbox, no damage, no pushback, no invulnerability, no
// movement/physics/AI change. Every value here is a render-only knob.
//   MIN_TICKS / MAX_TICKS : the trigger interval — EXACTLY 2.5s @~60fps (150).
//                           MIN == MAX, so every interval is an exact 150 ticks
//                           of continuous walking (no random spread): the
//                           Red Eclipse fires once every exactly 2.5s of walking.
//   DURATION              : the active overlay window, ~1.0s (60 ticks @~60fps) —
//                           unchanged; this is the visual duration, NOT the gap.
// The overlay advances its OWN lifetime (`_surgePhase`), cycling the eclipse clip at
// the base walk cadence (surgeForward 6 frames / hold 5, surgeBackward 4 / hold 12).
// Frame-counted to match the project's existing per-frame timing architecture
// (combo/AFK/i-frames are all frame counters too), avoiding wall-clock drift.
// ---------------------------------------------------------------------------
const SURGE = Object.freeze({
    MIN_TICKS: 150,   // 2.5s @~60fps (exact trigger interval)
    MAX_TICKS: 150,   // 2.5s @~60fps (== MIN -> exactly 2.5s, no spread)
    DURATION: 60,     // ~1.0s active flare (UNCHANGED)
});

// STAGE 7B-4 — BACKWARD-GLIDE TRAILING SILHOUETTE ECHOES (walk2_spec §3 /
// walk2_handoff §4; approved walk2_v1 "GLIDE AFTERIMAGES" band). While the Boss
// glides backward (`retreat`) he leaves a short trail of fading silhouette
// copies BEHIND him, at the REAL positions he just occupied. We sample his
// position every frame into a small ring buffer and re-draw older snapshots, so
// the echoes trail along the path he crossed (ref4 motion language) instead of a
// fixed decorative block glued to the sprite. Render-only: no velocity, no
// physics, no hitbox — these are echoes, not a dash.
//   MAX    : position-history depth (must exceed the largest lag).
//   ECHOES : the approved two stepped ghosts — farthest/oldest FIRST so the
//            older one is dimmer + less complete and the nearer one draws over
//            it; both drawn BEHIND the live sprite. Lags 6/12 ticks reproduce
//            the approved "refreshed every ~6 ticks" stepping as real recent
//            positions; alphas 0.45/0.25 and tints #1c1d28/#12121a are verbatim.
const GLIDE_TRAIL = Object.freeze({
    MAX: 13,
    ECHOES: [
        { lag: 12, alpha: 0.25, tint: '#12121a' },
        { lag: 6,  alpha: 0.45, tint: '#1c1d28' },
    ],
});

// STAGE 8A-2 — ECLIPSE BREAKER rush afterimages. While the finisher dash is live the
// Boss trails stepped ghost copies of the RUSH pose BEHIND him along the travel path
// (the approved combo sheet's "RUSH AFTERIMAGES — RUNTIME X3" panel). Fixed world-px
// offsets opposite the travel direction, farthest/dimmest first; dark umbral tints
// from the boss palette so they read as motion smear, not a second body. Render-only.
const RUSH_AFTERIMAGES = Object.freeze([
    { off: 46, alpha: 0.22, tint: '#12121a' },
    { off: 24, alpha: 0.42, tint: '#1c1d28' },
]);

// STAGE RE-3 — GROUND CHARGED RED ECLIPSE (approved Stage RE-2 handoff). Render-only
// cadence for the effect that plays during the GROUND_LASER charge. The formation
// (B0..B4) is driven directly by the REAL charge progress (`chargeRatio`); only the
// fully-charged HOLD loop (B5<->B6) and the optional release outro (R0) need their own
// render-only counters, so they can never influence gameplay/charge timing.
//   HOLD_TICKS    : frames per B5/B6 brim frame while fully charged + still held
//                   (RE-2 suggests 8 @60fps); the pingpong is seamless both ways.
//   RELEASE_TICKS : length of the R0 SNAP outro at fire (~4 ticks), drawn OVER the
//                   fireLaser pose before the existing (untouched) beam takes over.
const GROUND_ECLIPSE = Object.freeze({ HOLD_TICKS: 8, RELEASE_TICKS: 4 });

// STAGE RE-5 — AIR CHARGED RED ECLIPSE (approved Stage RE-4 handoff). Render-only
// cadence for the effect that plays during the AIR_DIVE hover-charge + release. The
// gather (C0..C2) is driven directly by the REAL charge progress (`chargeRatio`); only
// the fully-charged PEAK HOLD (C3<->C4 pingpong) and the release DISCHARGE tail (C5-C7)
// need their own render-only counters, so they can never influence gameplay/charge timing.
//   HOLD_TICKS : frames per C3/C4 peak frame while fully charged + still held (RE-4
//                suggests 5 @60fps); the pingpong is seamless both ways. The C3 ignition
//                shows once at the start of the hold — the peak never re-bursts.
//   TAIL_TICKS : length of the C5->C6->C7 outward-discharge tail at a FULLY-charged
//                release (5+6+8 = 19 ticks), drawn back+front OVER the live dive pose.
const AIR_ECLIPSE = Object.freeze({ HOLD_TICKS: 5, TAIL_TICKS: 19 });

export class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.color = '#ff3366';

        // Collision half-extents (used for AABB ground/world resolution in main.js).
        this.halfWidth = this.radius;
        this.halfHeight = this.radius;

        // --- Velocity ---
        this.velocityX = 0;
        this.velocityY = 0;

        // --- Horizontal movement tuning ---
        this.acceleration = 1.5;
        this.maxSpeed = 8;
        this.friction = 0.8;

        // --- Platformer physics ---
        this.gravity = 0.9;     // per-frame downward pull (kept high so jumps feel snappy)
        this.jumpForce = 17;    // initial upward impulse on jump
        this.isGrounded = false; // set by ground collision in main.js each frame

        // --- Double jump ---
        this.facing = 1;        // last horizontal direction faced (+1 right, -1 left)
        this.jumpCount = 0;     // jumps used since last grounded
        this.maxJumps = 2;      // ground jump + one mid-air jump

        // --- Dash (Shift): a fast horizontal burst that ignores gravity & friction ---
        this.dashSpeed = 28;         // burst horizontal velocity (massive vs. maxSpeed 8)
        this.dashDuration = 8;       // frames the dash stays locked (no gravity/friction)
        this.dashTimer = 0;          // counts down the active dash
        this.dashCooldownTime = 120; // ~2s at 60fps
        this.dashCooldown = 0;       // counts down until the dash is ready again

        // --- Combat (weapon-based) ---
        this.maxHp = 1000;
        this.hp = 1000;

        // Body-contact damage the Boss deals TO the Hero on overlap. The Boss is
        // immune to body contact itself (enforced in main.js handleCombat rule c);
        // this value is the damage the Hero soaks for bumping into the Boss.
        this.contactDamage = 50;

        // Shared directional melee hitbox (J / Left Click). The 4-hit combo reuses
        // this one object and reshapes it per hit via configure(). Damage comes
        // from THIS (and the spawned projectiles), not from body overlap.
        this.attackHitbox = new Hitbox({
            reach: SWORD.REACH_PX,
            width: SWORD.WIDTH,
            height: SWORD.HEIGHT,
            duration: SWORD.DURATION_FRAMES,
            cooldown: SWORD.COOLDOWN_FRAMES,
            damage: SWORD.DAMAGE,
            knockback: SWORD.KNOCKBACK,
        });
        // Charged-attack input. We track the attack button being HELD (not just
        // the press edge) so update() can grow a charge timer and act on the
        // RELEASE edge. _wasAttackHeld is last frame's value, for edge detection.
        this._attackHeld = false;
        this._wasAttackHeld = false;
        this._installAttackInput();

        // --- CHARGED ATTACKS runtime state (hold to charge, release to fire) ---
        this.chargeTimer = 0;        // frames the attack button has been held (0..CHARGE.frames)
        // LOCKED charge type. Decided ONCE from isGrounded the frame a fresh charge
        // begins, then held for the ENTIRE button press so the release attack never
        // flips if the Boss changes grounded-state mid-charge:
        //   'GROUND_LASER' — started on the ground → releases as the Laser Beam,
        //                    even if the Boss jumped and is airborne on release.
        //   'AIR_DIVE'     — started airborne → hover-charge → charged Air Dive.
        //   null           — not charging.
        this._chargeType = null;     // null | 'GROUND_LASER' | 'AIR_DIVE'
        this._diveCharged = false;   // was the IN-PROGRESS air dive fully charged? gates the Fear shockwave
        this._laserLockTimer = 0;    // > 0 while the Boss is committed firing the ground Laser Beam

        // STEP 1 / REQ 2 — "Charge Ready" trigger.
        // True for exactly the frames the Boss is AIRBORNE, still HOLDING the
        // attack button, AND has held long enough to be fully charged
        // (chargeTimer >= CHARGE.frames == 1s). This is the single state the
        // renderer reads in STEP 2 to flare the massive dark-red aura around the
        // Boss. It is re-derived every frame in update(): cleared at the top, then
        // re-armed inside the airborne-hold branch the instant the 1s threshold is
        // crossed. It force-clears the moment the button is released (the dive
        // fires), the charge is dropped, or the Boss is hit — so it can never get
        // stuck on. Purely a status flag; it never drives physics/combat itself.
        this.isChargeReady = false;

        // --- Spawned hitboxes that live on their own (combo overhaul) ------------
        // Dark Flame (moving), Finisher explosion, and air-dive shockwave all get
        // pushed here. update() advances + culls them; draw() renders them; main.js
        // reads them via getActiveHitboxes() for collision.
        this.projectiles = [];

        // --- REQUIREMENT 1: 4-hit ground combo FSM state ---
        this.comboStep = 0;          // 0 = idle; 1..4 = the active hit
        this.comboPhase = null;      // 'commit' | 'recovery' (the chain window)
        this.comboPhaseTimer = 0;    // frames left in the current phase
        this.comboBuffered = false;  // a press captured to chain into the next hit
        this.attackDir = 1;          // direction the CURRENT combo/dive commits toward
        this._finisherDashTimer = 0; // hit-4 locked dash countdown
        this._explosionSpawned = false;

        // --- REQUIREMENT 2: Diagonal Air Dive state ---
        this.airDiveState = 'none';  // 'none' | 'freeze' | 'dive'
        this._airDiveFreezeTimer = 0;

        // Invulnerability window: after taking a hit the Boss ignores further
        // damage for a short time so one of the Hero's swings can't drain HP every
        // frame. Counted in frames (~60fps), so ~30 frames ≈ 500ms.
        this.iFrames = 0;
        this.iFrameDuration = 30;

        // Hit-flash feedback (frames the Boss renders bright white after a hit).
        this.hitFlash = 0;
        this.hitFlashDuration = 8;

        // Knockback applied when hit (bounce away from the attacker + slight pop up).
        this.knockbackForce = 9;
        this.knockbackLift = 8;

        // --- Pixel-art rendering (visual only; never affects physics/combat) ---
        // Redesigned movement clips (idle + run/retreat/jump/fall/doubleJump/dash) are
        // merged OVER the legacy sheet, so the animator serves the new art for those
        // states and the untouched legacy frames for everything else (attacks/charges —
        // redesigned in a later step). Merge is rendering-only; clip names/timing match.
        this.anim = new SpriteAnimator({ ...BOSS_SPRITES, ...BOSS_REDESIGN_SPRITES });
        this._spriteTopY = null; // set each draw from the sprite; positions the HP bar

        // --- Dynamic aiming + dash FX (visual only; never touches physics) ---
        // Horizontal direction toward the Hero, refreshed each frame via
        // faceHero(). Drives the sprite flip (so the sword ALWAYS points at the
        // Hero) and the run-vs-retreat animation choice.
        this.aimDir = 1;
        // Recent world positions captured during a dash; used to render the
        // wind/vacuum streak trail behind the spinning 'drill'.
        this._dashTrail = [];

        // --- Fear aura: the Boss "knows" the Hero is under the 4s Fear Status ---
        // main.js refreshes this every PLAYING frame from enemy.fearStatusTimer
        // (see setFearAura). draw() reads these to flare the black/red flaming
        // "empowered" aura. A timer (not just a bool) lets that render fade out
        // smoothly as the debuff lapses. Purely cosmetic — never touches physics.
        this.fearAuraTimer = 0;       // frames the flaming aura should stay lit
        this.fearAuraActive = false;  // convenience flag: true while the Hero is feared

        // --- STAGE 7A-1: AFK Intimidation / sword-planted idle -------------------
        // `afkPhase` is the whole state: null | 'snap' | 'plant' | 'idle'. It gates
        // control (update() returns early while it runs) and the sprite clip, and it
        // is the single flag main.js/Enemy read via `isIntimidating`.
        this.afkPhase = null;
        this.afkPhaseTimer = 0;
        this.afkIdleTimer = 0;        // frames since the last player input
        this.afkIdleCycle = 0;        // 0..IDLE_CYCLE, drives the heartbeat + aura beat
        this.afkWaves = [];           // pressure walls: VFX + a 0-damage push. NOT hitboxes.
        this._afkFlip = false;        // facing LOCKED at trigger, so the planted blade can't jump sides
        this._afkForcedDown = false;  // airborne trigger -> forcing the descent
        this._afkBarrierFired = false;
        this._afkExitTimer = 0;       // cosmetic afkExit tail (never blocks input)
        this._afkFlareTimer = 0;
        this._afkVignette = 0;        // 0..1 screen darkening ramp
        this._afkCrackTimer = 0;      // world-anchored floor crack lifetime
        this._afkCrackAge = 0;
        this._afkCrackX = 0;
        this._afkCrackY = 0;
        this._afkArcs = [];           // live void-fracture arcs. RENDER-ONLY, never hitboxes.
        this._afkVfxClock = 0;        // free-running clock for the darkening's breathing

        // --- STAGE 7B-3 / RE-1: walk-triggered RED ECLIPSE (render-only overlay) --
        // TRIGGER: a presentation-only continuity clock accrues ONLY during eligible
        // continuous locomotion (forward walk `run` / backward glide `retreat`). When
        // it crosses the 2.5s interval it SPAWNS a ~1s black-red eclipse.
        // PLAYBACK: once spawned the eclipse is an INDEPENDENT overlay with its own
        // lifetime (`_surgePhase` 0..DURATION). It is drawn OVER the Boss and plays to
        // its natural end regardless of what the player does afterward — walking,
        // stopping, turning, jumping, falling, attacking, dashing or charging NEVER
        // cancel it (STAGE RE-1). It NEVER locks input and touches no velocity/HP/AI.
        this._surgeActive = false;    // is an eclipse overlay on screen right now
        this._surgePhase = 0;         // ticks elapsed in the active eclipse (0..DURATION)
        this._surgeName = null;       // 'surgeForward' | 'surgeBackward' while active
        this._surgeDir = null;        // the base clip that spawned it ('run' | 'retreat')
        this._surgeFlip = false;      // facing MIRROR captured at trigger, held for the
                                      // whole instance (the base sprite still flips live
                                      // underneath; the eclipse artwork does not).
        this._surgeTimer = 0;         // ticks of continuous eligible locomotion so far
        this._surgeInterval = this._pickSurgeInterval(); // next trigger gap (2.5s = 150 ticks)
        // Set true at the top of every update() (i.e. every PLAYING control frame)
        // and consumed+cleared in draw(). Lets the eclipse clock ignore frozen
        // cinematic / game-over frames where draw() still runs but update() does
        // not — so an eclipse can never accrue or fire outside of live play, and an
        // active one is force-cleaned when we leave live play (see _updateLocomotionSurge).
        this._locoControlActive = false;
        // STAGE 7B-4: ring buffer of the Boss's recent positions, filled only while
        // he glides backward, so the trailing silhouette echoes sit on his real
        // crossed path. Nulled the instant the glide ends (see draw / reset).
        this._glideTrail = null;
        // STAGE RE-3: GROUND CHARGED RED ECLIPSE render-only state. The formation
        // frames track `chargeRatio` directly; these two counters only drive the
        // fully-charged HOLD loop and the R0 release outro. Both are cleaned up
        // whenever the ground charge ends (see draw / _fireLaser / cancelIntimidation).
        this._groundEclipseHold = 0;         // ticks in the B5<->B6 charged-hold loop
        this._groundEclipseRelease = 0;      // remaining R0 SNAP outro ticks after fire
        this._groundEclipseReleaseFlip = false; // facing captured at fire for the outro
        // STAGE RE-5: AIR CHARGED RED ECLIPSE render-only state. The gather frames
        // track `chargeRatio` directly; these counters only drive the fully-charged
        // PEAK HOLD pingpong and the C5-C7 release discharge tail. All cleaned up
        // whenever the air charge ends (see draw / takeDamage / cancelIntimidation).
        this._airEclipseHold = 0;            // ticks in the C3<->C4 peak-hold loop
        this._airEclipseRelease = 0;         // remaining C5-C7 discharge-tail ticks after a charged release
        this._airEclipseReleaseFlip = false; // facing captured at release for the tail
    }

    // Self-contained attack input so NO changes to Input.js are required:
    // 'J' on the keyboard, or a left-click on the game canvas, counts as the
    // attack button. We track it being HELD (down → up) so the charge timer can
    // grow while held and update() can detect the RELEASE edge. Auto-repeat is
    // irrelevant: _attackHeld latches on the first down and clears only on up.
    // (If you'd rather route this through your Input class for consistency, set
    //  _attackHeld from an Input "attack held" query and drop these listeners.)
    _installAttackInput() {
        if (typeof window === 'undefined') return;
        const press = () => { this._attackHeld = true; };
        const release = () => { this._attackHeld = false; };

        window.addEventListener('keydown', (e) => { if (e.code === 'KeyJ') press(); });
        window.addEventListener('keyup',   (e) => { if (e.code === 'KeyJ') release(); });
        window.addEventListener('mousedown', (e) => {
            // Left button, and only when the click lands on the canvas (so clicking
            // the DOM Nemesis overlay doesn't start a charge).
            if (e.button === 0 && e.target && e.target.tagName === 'CANVAS') press();
        });
        // Release on ANY left mouse-up (the cursor may have left the canvas first).
        window.addEventListener('mouseup', (e) => { if (e.button === 0) release(); });
        // Safety: never get stuck mid-charge if the tab/window loses focus.
        window.addEventListener('blur', release);
    }

    // The direction an attack should commit toward: the Hero (aimDir) so swings,
    // momentum, and the sprite flip all agree; falls back to input facing.
    _aimOrFacing() {
        return this.aimDir || this.facing || 1;
    }

    /**
     * Point the Boss at the Hero. Call ONCE PER FRAME from the game loop,
     * BEFORE draw() — e.g. in main.js, right after the entity update step:
     *
     *     boss.faceHero(hero.x);   // hero = the player-controlled Knight
     *
     * Updates only `aimDir` (the horizontal direction toward the Hero). That
     * drives (a) the sprite flip so the sword ALWAYS points at the Hero and
     * (b) the run-vs-retreat ("angry standoff") animation. Purely cosmetic:
     * it never reads or writes velocity, position, HP, i-frames, or the attack
     * hitbox, so no physics or combat behaviour changes.
     *
     * @param {number} targetX  the Hero's world-space x (its centre).
     */
    faceHero(targetX) {
        if (typeof targetX === 'number' && Number.isFinite(targetX)) {
            const d = targetX - this.x;
            if (Math.abs(d) > 0.001) this.aimDir = d < 0 ? -1 : 1;
        }
    }

    /**
     * Mirror the Hero's 4s Fear Status onto the Boss so draw() can flare a flaming
     * "empowered" aura for exactly that window. Call ONCE PER FRAME from main.js,
     * passing the Hero's remaining fear-status frames (0 when the Hero isn't
     * feared). Purely cosmetic: it only sets the aura flag/timer and never reads
     * or writes velocity, position, HP, i-frames, or the attack hitbox.
     *
     * @param {number} framesRemaining frames left on the Hero's fearStatusTimer.
     */
    setFearAura(framesRemaining = 0) {
        const f = Number.isFinite(framesRemaining) ? Math.max(0, framesRemaining) : 0;
        this.fearAuraActive = f > 0;
        this.fearAuraTimer = f; // exact mirror; the fade-out tail is derived in draw()
    }

    // --- CHARGED ATTACKS: read-only views for the renderer (STEP 2) ----------
    // 0..1 how far the current charge has progressed; true once fully charged.
    // Purely informational — they never touch physics/combat. (The matching
    // "Charge Ready" flag is the `isChargeReady` field set in update(); it is the
    // one to read for the STEP-2 air "Charge Ready" aura.)
    get chargeRatio() { return Math.min(1, this.chargeTimer / CHARGE.frames); }
    get isFullyCharged() { return this.chargeTimer >= CHARGE.frames; }
    get isCharging() { return this._attackHeld && this.chargeTimer > 0; }

    // --- STAGE 7A-1: AFK Intimidation read-only surface -----------------------
    // `isIntimidating` is what main.js mirrors onto the Hero (wary standoff) and
    // what gates the screen vignette. Informational only.
    get isIntimidating() { return this.afkPhase !== null; }
    get afkVignette() { return this._afkVignette; }

    /**
     * Breathing beat (0..2) of the curse-pressure screen darkening. main.js hands it
     * to SpriteManager.drawIntimidationVignette so the edges swell on the same clock
     * that drives the aura and the arcs. Render-only.
     */
    get cursePhase() { return Math.floor(this._afkVfxClock / AFK.CURSE_PHASE_FRAMES) % 3; }

    /** Drop the inactivity clock (main.js calls this when control returns after a cinematic). */
    resetAfkTimer() { this.afkIdleTimer = 0; }

    /**
     * Hard-cancel the state and clear its presentation tails. main.js calls this when
     * control (re)enters PLAYING: update() is frozen during the cinematics, so without
     * this a state that was live when a cinematic began would strand the Boss planted
     * (and the vignette lit) across the Nemesis card.
     */
    cancelIntimidation() {
        this._endAfk();
        this.afkIdleTimer = 0;
        this.afkWaves.length = 0;
        this._afkExitTimer = 0;
        this._afkFlareTimer = 0;
        this._afkVignette = 0;
        this._afkCrackTimer = 0;
        this._afkArcs.length = 0;
        // STAGE 7B-3 — control (re)enters PLAYING after a cinematic / restart:
        // clear any surge flare and restart its continuity clock so nothing stale
        // survives the Nemesis card or a fresh round.
        this._resetLocomotionSurge();
        // STAGE RE-3 — drop any ground-eclipse hold/release render state so no brim
        // loop or release outro can survive death / restart / encounter reset / the
        // Nemesis card (the formation frames are already gated on the live charge).
        this._groundEclipseHold = 0;
        this._groundEclipseRelease = 0;
        // STAGE RE-5 — same for the air-eclipse peak-hold + discharge-tail counters,
        // so no starburst, bolt or ash survives into a fresh round / cinematic.
        this._airEclipseHold = 0;
        this._airEclipseRelease = 0;
    }

    // -----------------------------------------------------------------------
    // STAGE 7B-3 / RE-1 — walk-triggered RED ECLIPSE overlay internals (render-only)
    // -----------------------------------------------------------------------

    /** Next trigger interval: exactly 2.5s (150 ticks; MIN == MAX -> no spread). */
    _pickSurgeInterval() {
        return SURGE.MIN_TICKS + Math.floor(Math.random() * (SURGE.MAX_TICKS - SURGE.MIN_TICKS + 1));
    }

    /**
     * SPAWN a fresh eclipse. The forward/backward VARIANT and the facing MIRROR are
     * captured HERE, at the trigger moment, and held for the whole instance — the
     * eclipse is a captured visual event, so a later direction change flips the
     * Boss's base sprite live but never mirrors or re-skins this active eclipse.
     */
    _startSurge(clipName) {
        this._surgeActive = true;
        this._surgePhase = 0;
        this._surgeDir = clipName;                                       // 'run' | 'retreat'
        this._surgeName = clipName === 'retreat' ? 'surgeBackward' : 'surgeForward';
        this._surgeFlip = (this.aimDir === -1);                          // captured facing
    }

    /** Retire the active eclipse overlay (natural end, or a lifecycle boundary). */
    _clearSurge() {
        this._surgeActive = false;
        this._surgePhase = 0;
        this._surgeName = null;
        this._surgeDir = null;
        this._surgeFlip = false;
    }

    /** Hard-clear the eclipse + its continuity clock (control-return / restart / death). */
    _resetLocomotionSurge() {
        this._clearSurge();
        this._surgeTimer = 0;
        this._surgeInterval = this._pickSurgeInterval();
        this._glideTrail = null;   // drop any backward-glide echoes on restart / cinematic
    }

    /**
     * Advance the render-only RED ECLIPSE from the CURRENT locomotion clip name.
     * Called ONCE per draw (see draw()), so it ticks exactly one presentation frame.
     *
     * TWO independent concerns are kept strictly separate (STAGE RE-1):
     *
     * 1. PLAYBACK — once an eclipse is live it owns its OWN lifetime (`_surgePhase`)
     *    and advances every live-control frame, retiring ONLY when that timer reaches
     *    the visual DURATION. Ordinary gameplay state changes — stopping, turning,
     *    jumping, falling, attacking, dashing, charging, being hit — do NOT cancel it.
     *    The Boss's base sprite keeps changing normally underneath; the eclipse is
     *    drawn as a separate overlay in draw() and simply follows the Boss's position.
     *
     * 2. TRIGGER — only CONTINUOUS forward walk (`run`) or backward glide (`retreat`)
     *    under live player control accrues the 2.5s continuity clock; any break resets
     *    it, so only continuous walking can arm the NEXT eclipse. An eclipse already
     *    playing never re-triggers itself.
     *
     * A non-control frame (`_locoControlActive` false: frozen cinematic / game-over /
     * paused) is a true lifecycle boundary, so it force-cleans any active eclipse and
     * freezes the clock — an eclipse can neither accrue nor render outside live play.
     *
     * @param {string} clipName the clip `_animState()` resolved for this frame.
     */
    _updateLocomotionSurge(clipName) {
        // Lifecycle boundary: not a live control frame -> force-clean + freeze.
        if (!this._locoControlActive) {
            if (this._surgeActive) this._clearSurge();
            this._surgeTimer = 0;
            return;
        }

        // (1) PLAYBACK: advance the independent eclipse lifetime; retire only at its
        // natural end. Nothing the player does below can shorten this.
        if (this._surgeActive && ++this._surgePhase >= SURGE.DURATION) {
            this._clearSurge();
        }

        // (2) TRIGGER continuity: only CONTINUOUS run/retreat counts. Any other clip
        // (idle/jump/fall/attack/dash/charge/AFK) breaks the streak and resets it,
        // but does NOT touch a playing eclipse (handled above).
        if (clipName !== 'run' && clipName !== 'retreat') {
            this._surgeTimer = 0;
            return;
        }
        this._surgeTimer++;
        if (!this._surgeActive && this._surgeTimer >= this._surgeInterval) {
            this._startSurge(clipName);
            this._surgeTimer = 0;                             // trigger-to-trigger == interval
            this._surgeInterval = this._pickSurgeInterval();  // next gap (fixed 2.5s = 150 ticks)
        }
    }

    update(input) {
        // STAGE 7B-3 — mark this as a live control frame for the render-only surge
        // clock (draw() consumes + clears it). update() runs ONLY on PLAYING frames,
        // so this can never be set during a frozen cinematic / game-over, which is
        // what keeps the surge from accruing or firing outside of live play.
        this._locoControlActive = true;

        // --- Tick combat + ability timers (i-frames, hit flash, dash CD, weapon CD/active) ---
        if (this.iFrames > 0) this.iFrames--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        this.attackHitbox.tick();

        // --- Advance + cull free projectiles (flame travels; bursts age out) ---
        for (const p of this.projectiles) p.update();
        if (this.projectiles.length) {
            this.projectiles = this.projectiles.filter((p) => p.isActive);
        }

        // === STAGE 7A-1: AFK INTIMIDATION gate ================================
        // Runs BEFORE every early return below, so the state can force itself in
        // from any animation, mid-air, or mid-hit ("the state always wins"), and
        // so a single frame of input tears it down instantly.
        this._tickAfkVfx();
        if (this._readInputActivity(input)) {
            this.afkIdleTimer = 0;
            if (this.afkPhase) this._endAfk();   // immediate exit: control returns THIS frame
        } else {
            this.afkIdleTimer++;
            if (!this.afkPhase && this.afkIdleTimer >= AFK.IDLE_FRAMES) this._startAfk();
        }
        if (this.afkPhase) {
            this._updateAfk();
            return;                              // the intimidation state owns these frames
        }

        // NOTE (STAGE RE-1): the walk-triggered RED ECLIPSE is a render-only overlay
        // and intentionally does NOT gate control here. Once it spawns it plays to its
        // natural end independently (see _updateLocomotionSurge / draw()), while the
        // Boss keeps full normal control — walk, turn, stop, jump, attack, dash and
        // charge all work exactly as usual underneath the effect.

        // --- Track facing from horizontal input (locked while attacking/diving) ---
        const dir = input.getHorizontal();
        if (dir !== 0 && this.comboStep === 0 && this.airDiveState === 'none') {
            this.facing = dir;
        }

        // --- Attack button: HELD state + per-frame press/release edges ---------
        // Computed once here, before any early return, so the previous-frame
        // value stays correct no matter which branch below exits the function.
        const held = this._attackHeld;
        const justPressed  = held && !this._wasAttackHeld;   // rising edge (new press)
        const justReleased = !held && this._wasAttackHeld;   // falling edge (let go)
        this._wasAttackHeld = held;

        // STEP 1 / REQ 2 — re-derive "Charge Ready" from scratch each frame.
        // Clear it here first; the airborne-hold branch below is the ONLY place
        // that re-arms it (once the 1s threshold is met while held in the air).
        // Clearing first guarantees every early-return path — laser lock, an
        // in-progress dive, mid-combo, or the grounded charge — correctly reports
        // "not ready", and that the flag drops the instant the button is released.
        this.isChargeReady = false;

        // === Laser Beam commit: rooted while the ground beam is live ============
        // Firing the Laser locks the Boss in place for its duration so it can't
        // walk out of its own beam. Highest priority — it owns these frames.
        if (this._laserLockTimer > 0) {
            this._laserLockTimer--;
            this.velocityX = 0;
            this.velocityY = 0; // grounded; main.js keeps the feet pinned
            this.attackHitbox.reposition(this.x, this.y, this.facing);
            return;
        }

        // === REQUIREMENT 2: Diagonal Air Dive (in-progress handling) ============
        if (this.airDiveState !== 'none') {
            if (this.airDiveState === 'dive' && this.isGrounded) {
                // Landed: drop the shockwave. It is the FEAR STRIKE *only* if this
                // dive was fully charged (REQUIREMENT 5); a normal dive's wave just
                // deals damage + knockback.
                this._spawnShockwave(this._diveCharged);
                this.airDiveState = 'none';
                this.velocityX = 0;
                if (typeof input.consumeJump === 'function') input.consumeJump(); // no surprise hop
                // fall through to normal control this frame
            } else if (this.airDiveState === 'freeze') {
                // Hang in the air for a split second (no gravity), then launch down.
                this.velocityX = 0;
                this.velocityY = 0;
                if (--this._airDiveFreezeTimer <= 0) {
                    this.airDiveState = 'dive';
                    this.velocityX = this.attackDir * DIVE.vx;
                    this.velocityY = DIVE.vy; // positive = downward
                }
                return;
            } else { // 'dive', still airborne
                // Locked diagonal descent (skip gravity so the angle stays constant).
                this.x += this.velocityX;
                this.y += this.velocityY;
                return;
            }
        }

        // === Mid-combo: a press chains the next hit; charging is suspended ======
        // (Tap to start/continue the combo; HOLD is reserved for charging, so a
        //  press here only buffers a chain — releases are ignored by the FSM.)
        if (this.comboStep !== 0) {
            if (justPressed) this.comboBuffered = true;
            this._updateCombo();
            return; // movement is fully driven by the combo while it runs
        }

        // ----- From here comboStep === 0 (idle, free to charge) ----------------

        // === CHARGED ATTACKS: LOCK the charge TYPE once, at charge-start ========
        // Decide GROUND_LASER vs AIR_DIVE a SINGLE time — from isGrounded on the
        // first held frame of a fresh press — then keep it for the whole hold
        // (Requirements 1 & 2). This is what makes a ground-started charge stay a
        // Laser even after the Boss jumps, and an air-started charge stay a dive.
        // The dashTimer guard defers charge-start until any active dash ends
        // (matches the old branches, which were gated on dashTimer <= 0).
        if (held && this._chargeType === null && this.dashTimer <= 0) {
            this._chargeType = this.isGrounded ? 'GROUND_LASER' : 'AIR_DIVE';
        }

        // === AIR_DIVE charge: HOLD to hover + charge, RELEASE to dive ===========
        // Locked to a charge that STARTED airborne. Hover/dive feel is unchanged
        // from before — the ONLY difference is the branch is chosen by _chargeType
        // instead of the current isGrounded, so this can never hijack a ground
        // charge that jumped.
        if (this._chargeType === 'AIR_DIVE' && this.dashTimer <= 0) {
            if (held) {
                // HOVER: gravity off, vertical velocity pinned to 0 while charging.
                this.chargeTimer = Math.min(this.chargeTimer + 1, CHARGE.frames);
                // STEP 1 / REQ 2 — the instant we cross the 1s threshold while
                // still holding in the air, arm "Charge Ready" so STEP 2 can flare
                // the massive dark-red aura. Re-armed every held frame after that.
                this.isChargeReady = this.chargeTimer >= CHARGE.frames;
                this.velocityY = 0;
                // Still allow horizontal repositioning so the hover feels controllable.
                this.velocityX += dir * this.acceleration;
                this.velocityX *= this.friction;
                if (Math.abs(this.velocityX) > this.maxSpeed) {
                    this.velocityX = Math.sign(this.velocityX) * this.maxSpeed;
                }
                if (Math.abs(this.velocityX) < 0.05) this.velocityX = 0;
                this.x += this.velocityX;
                this.attackHitbox.reposition(this.x, this.y, this.facing);
                return;
            }
            if (justReleased) {
                // Release in the air → Air Dive. Fully charged ⇒ Fear-Strike dive.
                const fullyCharged = this.chargeTimer >= CHARGE.frames;
                this._startAirDive(fullyCharged);
                // STAGE RE-5: a FULLY-charged release hands the eclipse off to the dive
                // as the C5-C7 outward-discharge tail (render-only, ~19 ticks, drawn OVER
                // the existing freeze + dive). A PARTIAL charge gets NO tail — the gather
                // cuts to nothing next frame (matches the retired aura). Facing is captured
                // now (== the committed dive dir) so a mid-dive turn can't mirror the decay
                // debris. This touches only render counters, never the dive itself.
                this._airEclipseRelease = fullyCharged ? AIR_ECLIPSE.TAIL_TICKS : 0;
                this._airEclipseReleaseFlip = (this.attackDir === -1);
                this._airEclipseHold = 0;
                this.chargeTimer = 0;
                this._chargeType = null;
                return;
            }
            // not held, no release this frame → fall through to normal air movement
        }

        // === GROUND_LASER charge: HOLD (while moving/jumping!), RELEASE to fire ==
        // Locked to a charge that STARTED on the ground. Unlike the air charge this
        // does NOT root the Boss and does NOT hover: it only grows the meter, then
        // falls through to the normal movement/jump/gravity block below. That lets
        // the Boss walk, jump, and become airborne mid-charge (Requirement 5) and
        // STILL fire the Laser on release — regardless of the current isGrounded.
        if (this._chargeType === 'GROUND_LASER') {
            if (held) {
                this.chargeTimer = Math.min(this.chargeTimer + 1, CHARGE.frames);
                // NO return: let normal horizontal movement, jump, and gravity run.
            } else if (justReleased) {
                if (this.chargeTimer >= CHARGE.frames) {
                    this._fireLaser();      // fully charged → massive Laser Beam
                    this.chargeTimer = 0;
                    this._chargeType = null;
                    // STAGE RE-3: hand the compressed chest-core eclipse off to the
                    // beam with the approved R0 SNAP outro (render-only, ~4 ticks).
                    // The laser itself — origin, animation, hitbox, duration, damage —
                    // is untouched; this only draws the ring collapsing into the muzzle.
                    this._groundEclipseRelease = GROUND_ECLIPSE.RELEASE_TICKS;
                    this._groundEclipseReleaseFlip = (this.aimDir === -1);
                    this._groundEclipseHold = 0;
                    return;                 // laser commit owns the coming frames
                }
                this._startComboHit(1);     // short tap → normal 4-hit combo
                this._updateCombo();        // integrate the first frame immediately
                this.chargeTimer = 0;
                this._chargeType = null;
                return;                     // combo drives movement this frame
            }
        }

        // Not charging or attacking this frame → discard any stale charge/type.
        if (!held) { this.chargeTimer = 0; this._chargeType = null; }

        // === Normal movement (unchanged) =======================================

        // --- Dash trigger: a fast burst in the facing direction, off cooldown ---
        if (input.consumeDash() && this.dashCooldown <= 0 && this.dashTimer <= 0) {
            this.dashTimer = this.dashDuration;
            this.dashCooldown = this.dashCooldownTime;
            this.velocityX = this.facing * this.dashSpeed;
            this.velocityY = 0;
        }

        // --- Active dash: locked horizontal motion, no gravity / friction ---
        if (this.dashTimer > 0) {
            this.dashTimer--;
            this.velocityY = 0;
            this.x += this.velocityX;
            this.attackHitbox.reposition(this.x, this.y, this.facing); // keep the slash glued on
            return; // skip normal movement + gravity while dashing
        }

        // --- Reset the double-jump once back on the ground ---
        if (this.isGrounded) this.jumpCount = 0;

        // --- Horizontal movement (the only continuous player-driven axis) ---
        this.velocityX += dir * this.acceleration;
        this.velocityX *= this.friction;

        if (Math.abs(this.velocityX) > this.maxSpeed) {
            this.velocityX = Math.sign(this.velocityX) * this.maxSpeed;
        }
        if (Math.abs(this.velocityX) < 0.05) this.velocityX = 0;

        this.x += this.velocityX;

        // --- Jump: grounded jump plus extra mid-air jumps up to maxJumps ---
        if (input.consumeJump() && this.jumpCount < this.maxJumps) {
            this.velocityY = -this.jumpForce;
            this.isGrounded = false;
            this.jumpCount++;
        }

        // --- Variable jump height: releasing jump early cuts the rise (short hops) ---
        if (!input.isJumpHeld() && this.velocityY < 0) {
            this.velocityY *= 0.5;
        }

        // --- Gravity (stronger while falling => snappy, not floaty) ---
        const g = this.velocityY > 0 ? this.gravity * 1.4 : this.gravity;
        this.velocityY += g;
        this.y += this.velocityY;

        // --- Keep the slash hitbox glued in front of the Boss after moving ---
        this.attackHitbox.reposition(this.x, this.y, this.facing);
    }

    // -----------------------------------------------------------------------
    // STAGE 7A-1 — AFK Intimidation internals (afk_spec.md)
    // -----------------------------------------------------------------------

    /**
     * "Any active player control input" — movement, jump (held or freshly buffered),
     * dash (held or buffered), and attack/charge (the attack button is held for both
     * a tap and a charge). Read-only: buffers are peeked, never consumed, so the
     * normal control path below still sees a fresh press on the exit frame.
     */
    _readInputActivity(input) {
        if (!input) return false;
        if (typeof input.getHorizontal === 'function' && input.getHorizontal() !== 0) return true;
        if (typeof input.isJumpHeld === 'function' && input.isJumpHeld()) return true;
        if (input.jumpBuffer || input.dashBuffer || input.dashHeld) return true;
        return this._attackHeld === true;
    }

    /**
     * Force the Boss into the intimidation state. Whatever it was doing is dropped
     * (combo / dive / charge / laser lock / dash) and any live damage window is
     * closed, so the state can NEVER open a new one. No HP, damage, cooldown or
     * hitbox SHAPE is modified here.
     */
    _startAfk() {
        this.afkPhase = 'snap';
        this.afkPhaseTimer = 0;
        this.afkIdleCycle = 0;
        this._afkBarrierFired = false;
        this._afkForcedDown = false;
        this._afkExitTimer = 0;
        // Lock the facing for the whole state: the planted blade is welded to the
        // floor, so a mid-state sprite flip would teleport it across the body.
        this._afkFlip = this.aimDir === -1;

        this._resetCombo();
        this.airDiveState = 'none';
        this._airDiveFreezeTimer = 0;
        this._diveCharged = false;
        this.chargeTimer = 0;
        this._chargeType = null;
        this._laserLockTimer = 0;
        this.isChargeReady = false;
        // STAGE RE-5 — AFK and charging are mutually exclusive; drop any air-eclipse
        // render counters so no starburst/discharge tail can bleed into intimidation.
        this._airEclipseHold = 0;
        this._airEclipseRelease = 0;
        this.dashTimer = 0;
        this.attackHitbox.activeTimer = 0;   // never leave a live damage window open
        this.velocityX = 0;
    }

    /** Any input: leave immediately. The blade-pull clip + barrier fade are cosmetic tails. */
    _endAfk() {
        if (!this.afkPhase) return;
        const wasPlanted = this.afkPhase !== 'snap';
        this.afkPhase = null;
        this.afkPhaseTimer = 0;
        this._afkForcedDown = false;
        this._afkExitTimer = wasPlanted ? AFK.EXIT_FRAMES : 0;
        for (const w of this.afkWaves) { w.dissolving = true; w.pushedHero = true; } // inert + fading
        // Any live arc jumps straight to its ash tail, so all of them have sunk away
        // before the (12-frame) blade-pull clip ends. Nothing trails a moving Boss.
        for (const a of this._afkArcs) {
            const ash = a.life - AFK.ARC_ASH;
            if (a.frame < ash) a.frame = ash;
        }
    }

    /**
     * Advance the state. snap -> (barrier) -> plant -> idle loop. The Boss is rooted
     * throughout; the only motion is the airborne forced descent, which uses a
     * CONSTANT velocity (not gravity) so it reads as deliberate and lands clean.
     */
    _updateAfk() {
        this.velocityX = 0;

        if (this.afkPhase === 'snap') {
            if (!this.isGrounded) {
                // Airborne trigger: the Boss drives himself down through his own
                // pressure. main.js's resolveFloorCollision seats the feet.
                this._afkForcedDown = true;
                this.velocityY = AFK.FORCE_DOWN_VY;
                this.y += this.velocityY;
                if (this.afkPhaseTimer < AFK.SNAP_FRAMES - 1) this.afkPhaseTimer++;  // hold on the last snap frame
            } else if (this._afkForcedDown) {
                // Touchdown out of the forced descent: the barrier fires on ground
                // contact and the state merges straight into the plant IMPACT frame.
                this._afkForcedDown = false;
                this.velocityY = 0;
                if (!this._afkBarrierFired) this._fireIntimidationBarrier();
                this.afkPhase = 'plant';
                this.afkPhaseTimer = AFK.PLANT_IMPACT;
                this._spawnPlantCrack();
            } else {
                this.velocityY = 0;
                this.afkPhaseTimer++;
                if (!this._afkBarrierFired && this.afkPhaseTimer >= AFK.SNAP_F2) this._fireIntimidationBarrier();
                if (this.afkPhaseTimer >= AFK.SNAP_FRAMES) { this.afkPhase = 'plant'; this.afkPhaseTimer = 0; }
            }
        } else if (this.afkPhase === 'plant') {
            this.velocityY = 0;
            const prev = this.afkPhaseTimer;
            this.afkPhaseTimer++;
            if (prev < AFK.PLANT_IMPACT && this.afkPhaseTimer >= AFK.PLANT_IMPACT) this._spawnPlantCrack();
            if (this.afkPhaseTimer >= AFK.PLANT_FRAMES) {
                this.afkPhase = 'idle';
                this.afkPhaseTimer = 0;
                this.afkIdleCycle = 0;
            }
        } else { // 'idle' — the planted loop
            this.velocityY = 0;
            this.afkPhaseTimer++;
            this.afkIdleCycle = (this.afkIdleCycle + 1) % AFK.IDLE_CYCLE;
        }

        // Keep the (inactive) melee box on the body, exactly like every other branch.
        this.attackHitbox.reposition(this.x, this.y, this.facing);
    }

    /**
     * The black / dark-red pressure barrier: a MIRRORED PAIR of travelling walls.
     * These are plain objects, NOT Hitboxes — they are never returned by
     * getActiveHitboxes(), so they cannot damage, score, or kill. main.js reads
     * them to apply the harmless repulsion impulse to the Hero.
     */
    _fireIntimidationBarrier() {
        this._afkBarrierFired = true;
        this._afkFlareTimer = AFK.FLARE_FRAMES;
        const feetY = this.y + this.halfHeight;
        for (const dir of [-1, 1]) {
            this.afkWaves.push({
                x: this.x + dir * (this.halfWidth + AFK.WAVE_HALF_W),
                y: feetY - AFK.WAVE_HALF_H,
                halfWidth: AFK.WAVE_HALF_W,
                halfHeight: AFK.WAVE_HALF_H,
                dir,
                life: 0,
                maxLife: AFK.WAVE_FRAMES,
                pushedHero: false,
                dissolving: false,
            });
        }
    }

    /** World-anchored floor crack under the planted tip. Idempotent per state. */
    _spawnPlantCrack() {
        if (this._afkCrackTimer > 0) return;
        this._afkCrackX = this.x + (this._afkFlip ? -1 : 1) * AFK.PLANT_OFFSET_PX;
        this._afkCrackY = this.y + this.halfHeight;
        this._afkCrackAge = 0;
        this._afkCrackTimer = AFK.CRACK_LINGER;
    }

    /**
     * Presentation clocks for the state: barrier travel, vignette ramp, crack age,
     * and the cosmetic exit/flare tails. Ticked EVERY frame (even after the state
     * ends) so everything fades out cleanly instead of popping off.
     */
    _tickAfkVfx() {
        if (this.afkWaves.length) {
            for (const w of this.afkWaves) {
                w.x += w.dir * AFK.WAVE_SPEED;
                w.life += w.dissolving ? AFK.WAVE_DISSOLVE_RATE : 1;
            }
            this.afkWaves = this.afkWaves.filter((w) => w.life < w.maxLife);
        }

        // Vignette: rises from the plant impact, falls the moment the state ends.
        const lit = this.afkPhase === 'idle' ||
                    (this.afkPhase === 'plant' && this.afkPhaseTimer >= AFK.PLANT_IMPACT);
        if (lit) this._afkVignette = Math.min(1, this._afkVignette + 1 / AFK.VIGNETTE_IN);
        else if (this._afkVignette > 0) this._afkVignette = Math.max(0, this._afkVignette - 1 / AFK.VIGNETTE_OUT);

        if (this._afkCrackTimer > 0) {
            this._afkCrackAge++;
            if (!this.afkPhase) this._afkCrackTimer--;   // only decays once the state is over
        }
        if (this._afkExitTimer > 0) this._afkExitTimer--;
        if (this._afkFlareTimer > 0) this._afkFlareTimer--;

        // --- STAGE 7A-2C: the curse-pressure breath + the void-fracture arcs ----
        // Both are pure presentation. The clock free-runs for as long as anything
        // is on screen, so the edges keep breathing through the fade-out.
        if (this.afkPhase || this._afkVignette > 0) {
            this._afkVfxClock = (this._afkVfxClock + 1) % (AFK.CURSE_PHASE_FRAMES * 3);
        }
        this._tickAfkArcs();
    }

    /** Age the live arcs, retire the dead ones, and schedule the next spawns. */
    _tickAfkArcs() {
        if (this._afkArcs.length) {
            for (const a of this._afkArcs) a.frame++;
            this._afkArcs = this._afkArcs.filter((a) => a.frame < a.life);
        }
        if (!this.afkPhase && this._afkExitTimer <= 0 && this._afkArcs.length) {
            this._afkArcs.length = 0;                    // state fully over: nothing lingers
            return;
        }

        // Arcs only crackle once the greatsword is actually in the floor.
        if (this.afkPhase === 'plant') {
            if (this.afkPhaseTimer === AFK.PLANT_IMPACT) this._spawnAfkArc(AFK_ARCS.groundSkitter);
        } else if (this.afkPhase === 'idle') {
            if (this.afkIdleCycle === AFK.IDLE_THUMP) {  // the beat: the chest forks fire
                this._spawnAfkArc(AFK_ARCS.chestFork);
                this._spawnAfkArc(AFK_ARCS.guardLink);
            } else if (this.afkIdleCycle === AFK.ARC_CRAWL_AT) {
                this._spawnAfkArc(AFK_ARCS.bladeCrawl);
            } else if (this.afkIdleCycle === AFK.ARC_SKITTER_AT) {
                this._spawnAfkArc(AFK_ARCS.groundSkitter);
            }
        }
    }

    /** Push one arc, honouring the max-2-concurrent restraint rule. */
    _spawnAfkArc(def) {
        if (this._afkArcs.length >= AFK.ARC_MAX) return;
        this._afkArcs.push({
            ...def, frame: 0,
            life: def.fracture ? AFK.ARC_FRAC_LIFE : AFK.ARC_LIFE,
        });
    }

    /** Lifecycle mode for an arc at its current frame (ignite/flash/fracture/ash). */
    _afkArcMode(a) {
        if (a.fracture) return a.frame < a.life - AFK.ARC_ASH ? 'fracture' : 'ash';
        if (a.frame < AFK.ARC_IGNITE) return 'ignite';
        if (a.frame < AFK.ARC_FLASH) return 'flash';
        if (a.frame < AFK.ARC_FRACTURE) return 'fracture';
        return 'ash';
    }

    /** The ash tail fades out instead of popping off. */
    _afkArcFade(a) {
        const ash = a.life - AFK.ARC_ASH;
        if (a.frame < ash) return 1;
        return Math.max(0.15, 1 - (a.frame - ash) / AFK.ARC_ASH);
    }

    // -----------------------------------------------------------------------
    // Combo FSM internals
    // -----------------------------------------------------------------------

    // Begin hit `n` (1..4): set the phase timeline, lock the attack direction,
    // and fire that hit's effect (melee swing / flame / dash + blast).
    _startComboHit(n) {
        this.comboStep = n;
        this.comboPhase = 'commit';
        this.comboPhaseTimer = COMBO[n].commit;
        this.comboBuffered = false;
        this.attackDir = this._aimOrFacing();
        this.facing = this.attackDir;

        if (n === 1 || n === 2) {
            // Hit 1: Horizontal Slash. Hit 2: Spinning Slash. Both step forward.
            this.attackHitbox.configure(COMBO[n].box);
            this.attackHitbox.reposition(this.x, this.y, this.attackDir);
            this.attackHitbox.trigger(true); // force-fire; the FSM owns cadence
            this.velocityX = this.attackDir * COMBO[n].step; // organic forward step
            this.velocityY = 0;
        } else if (n === 3) {
            // Hit 3: Dark Flame Magic. Stand still; launch a moving projectile.
            this.velocityX = 0;
            this._spawnDarkFlame();
        } else if (n === 4) {
            // Hit 4: Explosive Finisher. Dash forward; the blast lands as it ends.
            this._finisherDashTimer = FINISH.dashFrames;
            this._explosionSpawned = false;
            this.velocityX = this.attackDir * FINISH.dashSpeed;
            this.velocityY = 0;
        }
    }

    // Advance the active hit one frame: motion, phase transitions, chaining/reset.
    _updateCombo() {
        const step = this.comboStep;

        // --- Per-frame motion ---
        if (step === 4 && this._finisherDashTimer > 0) {
            // Locked forward dash (no gravity/friction), catching up to the flame.
            this._finisherDashTimer--;
            this.velocityY = 0;
            this.x += this.velocityX;
            // PLANT the finisher: when the dash ends, kill the forward momentum so the
            // Boss commits in place at the impact point instead of coasting forward on
            // friction through recovery — which used to slide him PAST the stationary
            // detonation and leave the blast reading "behind" him.
            if (this._finisherDashTimer === 0) this.velocityX = 0;
        } else {
            // Grounded slide: no directional input; friction bleeds the step-forward
            // momentum to a stop; gravity keeps the Boss pinned (flat arena).
            this.velocityX *= this.friction;
            if (Math.abs(this.velocityX) < 0.05) this.velocityX = 0;
            this.x += this.velocityX;
            const g = this.velocityY > 0 ? this.gravity * 1.4 : this.gravity;
            this.velocityY += g;
            this.y += this.velocityY;
        }

        // --- Keep the melee hits' hitbox glued in front while it's live ---
        if (step === 1 || step === 2) {
            this.attackHitbox.reposition(this.x, this.y, this.attackDir);
        }

        // --- Phase timeline ---
        if (this.comboPhaseTimer > 0) this.comboPhaseTimer--;

        if (this.comboPhase === 'commit') {
            if (this.comboPhaseTimer <= 0) {
                // Finisher: the blast goes off exactly as the dash ends.
                if (step === 4 && !this._explosionSpawned) {
                    this._spawnFinisherExplosion();
                    this._explosionSpawned = true;
                }
                this.comboPhase = 'recovery';
                this.comboPhaseTimer = COMBO[step].recovery;
            }
        } else { // 'recovery' == the chain window
            if (this.comboBuffered && step < 4) {
                this._startComboHit(step + 1); // chain into the next hit
            } else if (this.comboPhaseTimer <= 0) {
                this._resetCombo();            // player stopped attacking → end combo
            }
        }
    }

    // REQUIREMENT 1: reset logic if the player stops attacking (or on interrupt).
    _resetCombo() {
        this.comboStep = 0;
        this.comboPhase = null;
        this.comboPhaseTimer = 0;
        this.comboBuffered = false;
        this._finisherDashTimer = 0;
    }

    // Hit 3 — spawn the moving Dark Flame projectile riding the ground forward.
    _spawnDarkFlame() {
        const flame = new Hitbox({
            reach: 0, width: FLAME.width, height: FLAME.height,
            duration: FLAME.frames, cooldown: 0,
            damage: FLAME.damage, knockback: FLAME.knockback,
            velocityX: this.attackDir * FLAME.speed, velocityY: 0,
            kind: 'flame',
        });
        flame.x = this.x + this.attackDir * FLAME.spawnAhead;
        flame.y = this.y + this.halfHeight - FLAME.height / 2; // ride the ground line
        flame.facing = this.attackDir;
        flame.trigger(true);
        this.projectiles.push(flame);
    }

    // Hit 4 — spawn the massive circular finisher explosion (stationary AoE).
    _spawnFinisherExplosion() {
        const blast = new Hitbox({
            reach: 0, width: EXPL.size, height: EXPL.size,
            duration: EXPL.frames, cooldown: 0,
            damage: EXPL.damage, knockback: EXPL.knockback,
            kind: 'explosion',
        });
        blast.x = this.x + this.attackDir * EXPL.ahead;
        blast.y = this.y; // centered on the Boss
        blast.facing = this.attackDir;
        blast.trigger(true);
        this.projectiles.push(blast);
    }

    // REQUIREMENT 5 — air-dive landing shockwave. It is the FEAR STRIKE *only*
    // when `isFear` is true (the fully-charged air dive). A normal (uncharged)
    // dive passes false, so its wave deals damage + knockback but no Fear.
    _spawnShockwave(isFear = false) {
        const wave = new Hitbox({
            reach: 0, width: SHOCK.width, height: SHOCK.height,
            duration: SHOCK.frames, cooldown: 0,
            damage: SHOCK.damage, knockback: SHOCK.knockback,
            kind: 'shockwave',
            isFearStrike: isFear === true, // <-- main.js routes ONLY this to enemy.triggerFear()
        });
        wave.x = this.x;
        wave.y = this.y + this.halfHeight - SHOCK.height / 2; // sit on the ground
        wave.facing = this.attackDir;
        wave.trigger(true);
        this.projectiles.push(wave);
    }

    // REQUIREMENT 4/5 — begin the diagonal Air Dive. `charged` is remembered on
    // _diveCharged so the landing (in update()) knows whether to spawn the
    // Fear-Strike shockwave. Reuses the existing freeze → dive wind-up.
    _startAirDive(charged = false) {
        this.airDiveState = 'freeze';
        this._airDiveFreezeTimer = DIVE.freeze;
        this._diveCharged = charged === true;
        this.attackDir = this._aimOrFacing();
        this.facing = this.attackDir;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    // REQUIREMENT 3 — fire the GROUND fully-charged Laser Beam: a massive,
    // stationary horizontal hitbox extending forward from the Boss. It lives in
    // `projectiles` (so main.js's getActiveHitboxes() picks it up for collision)
    // and times out after LASER.frames. The Boss is rooted for LASER.lock frames
    // so it stays at the beam's mouth. Visual is the 'laser' projectile kind.
    _fireLaser() {
        this.attackDir = this._aimOrFacing();
        this.facing = this.attackDir;

        const beam = new Hitbox({
            reach: 0, width: LASER.length, height: LASER.thickness,
            duration: LASER.frames, cooldown: 0,
            damage: LASER.damage, knockback: LASER.knockback,
            kind: 'laser',
        });
        // Centre half-a-length ahead so the near edge starts on the Boss and the
        // beam shoots out in the facing direction.
        beam.x = this.x + this.attackDir * (LASER.length / 2 + LASER.ahead);
        beam.y = this.y; // chest / body-centre height
        beam.facing = this.attackDir;
        beam.trigger(true);
        this.projectiles.push(beam);

        // Commit: root the Boss while the beam is live.
        this._laserLockTimer = LASER.lock;
        this.velocityX = 0;
        this.velocityY = 0;
    }

    // All currently-live Boss hitboxes for the collision resolver in main.js:
    // the melee swing (when active) plus every active projectile/AoE.
    getActiveHitboxes() {
        const out = [];
        if (this.attackHitbox.isActive) out.push(this.attackHitbox);
        for (const p of this.projectiles) {
            if (p.isActive) out.push(p);
        }
        return out;
    }

    /**
     * Take a hit. Honors the i-frame window: while invulnerable the hit is
     * ignored entirely (no HP loss, no re-knockback), which is what stops one of
     * the Hero's swings from draining HP every frame.
     *
     * @param {number} amount       damage to apply
     * @param {number} knockbackDir -1 / +1 horizontal push direction (away from
     *                              the attacker); 0 to skip knockback.
     * @returns {boolean} true if the hit landed, false if blocked by i-frames.
     */
    takeDamage(amount, knockbackDir = 0) {
        if (this.iFrames > 0) return false;

        // STAGE 7A-1 / afk_spec §8 — the intimidation state ALWAYS wins. The Boss
        // swallows the hit: full damage, normal i-frames, but no knockback and no
        // state break. The renderer paints the "denial tint" instead of the white
        // hit-flash. Damage values, i-frame length and flash length are unchanged.
        if (this.afkPhase) {
            this.hp = Math.max(0, this.hp - amount);
            this.iFrames = this.iFrameDuration;
            this.hitFlash = this.hitFlashDuration;
            return true;
        }

        // NOTE (STAGE RE-1): a live walk RED ECLIPSE does NOT alter how a hit is taken.
        // The overlay is render-only — knockback, combo/charge interruption and
        // i-frames all resolve normally below; the eclipse simply keeps playing over
        // whatever state the hit puts the Boss into (its own lifetime is independent).

        // A real hit interrupts any combo or air dive in progress.
        this._resetCombo();
        this.airDiveState = 'none';
        // ...and any in-progress charge / live Laser commit (incl. Charge Ready).
        this.chargeTimer = 0;
        this._chargeType = null;
        this._laserLockTimer = 0;
        this.isChargeReady = false;
        // STAGE RE-5 — clear the air-eclipse render counters so a hit mid-charge or
        // mid-dive cleanly cuts the starburst / discharge tail the same frame (the
        // formation is already gated on the now-cancelled charge state).
        this._airEclipseHold = 0;
        this._airEclipseRelease = 0;

        this.hp = Math.max(0, this.hp - amount);
        this.iFrames = this.iFrameDuration;
        this.hitFlash = this.hitFlashDuration;

        // Bounce the Boss away from the attacker with a slight upward pop.
        if (knockbackDir !== 0) {
            this.velocityX = knockbackDir * this.knockbackForce;
            this.velocityY = -this.knockbackLift;
            this.isGrounded = false;
        }
        return true;
    }

    // Pick the animation clip from the Boss's CURRENT state. Rendering-only:
    // it reads physics/combat fields but never writes them.
    _animState() {
        // STAGE 7A-1 — the AFK intimidation clips outrank everything. Their frame
        // is INDEXED off the state timer (not free-run by the animator) so the
        // barrier fires exactly on afkSnap f2 and the crack lands on afkPlant f1.
        if (this.afkPhase === 'snap') {
            const t = this.afkPhaseTimer;
            return { name: 'afkSnap', hold: 8, index: t < AFK.SNAP_F1 ? 0 : t < AFK.SNAP_F2 ? 1 : 2 };
        }
        if (this.afkPhase === 'plant') {
            const t = this.afkPhaseTimer;
            return { name: 'afkPlant', hold: 6, index: t < AFK.PLANT_IMPACT ? 0 : t < AFK.PLANT_F2 ? 1 : 2 };
        }
        if (this.afkPhase === 'idle') {
            return { name: 'afkIdle', hold: 42, index: this.afkIdleCycle < AFK.IDLE_THUMP ? 0 : 1 };
        }
        // Cosmetic exit tail: only while the Boss is actually standing still. The
        // instant the player moves / attacks / jumps, the normal clips take over.
        if (this._afkExitTimer > 0 && this.isGrounded && this.comboStep === 0 &&
            this.airDiveState === 'none' && this.dashTimer <= 0 && Math.abs(this.velocityX) < 0.6) {
            return { name: 'afkExit', hold: 6, index: this._afkExitTimer > AFK.EXIT_FRAMES / 2 ? 0 : 1 };
        }

        // NOTE (STAGE RE-1): the walk RED ECLIPSE no longer pins the base clip. The
        // Boss animates normally (idle/jump/attack/dash/...) while a live eclipse plays
        // as an independent overlay in draw(); it never forces the run/retreat pose.

        // Charged-attack poses (STEP 2). These outrank the combo / dive clips so
        // the Boss visibly winds up the wand, fires the beam, hovers, and crashes.
        if (this._laserLockTimer > 0) return { name: 'fireLaser', hold: 3 };
        if (this.airDiveState !== 'none' && this._diveCharged) return { name: 'chargedDive', hold: 4 };
        if (this.isCharging) {
            // Pick the wind-up pose from the LOCKED charge type, not the current
            // isGrounded, so a ground laser charge keeps the groundCharge pose even
            // after it jumps (and an air charge keeps airCharge).
            return this._chargeType === 'GROUND_LASER' ? { name: 'groundCharge', hold: 4 }
                                                       : { name: 'airCharge', hold: 4 };
        }

        // Air dive overrides everything (REQUIREMENT 2).
        if (this.airDiveState !== 'none') return { name: 'airDive', hold: 4 };

        // 4-hit combo clips — the APPROVED Boss basic combo redesign (Stage 8A-2):
        // H1 RISING REND / H2 ECLIPSE WHEEL / H3 UMBRAL ORB / H4 ECLIPSE BREAKER.
        // Frames are phase-INDEXED off the combo FSM (like the AFK clips) rather than
        // free-run, so each hit's "strike" frame lands during its commit window and
        // the finisher's IMPACT (f3) lands exactly when the detonation spawns, then
        // holds while the blast lives before RECOVER seams back to locomotion. The
        // combo timings / hitboxes / damage are UNCHANGED — this only reads them.
        switch (this.comboStep) {
            case 1: { // RISING REND (4f): COIL f0 / ACT-LO f1 / ACT-HI f2 (the hit) / FOLLOW f3
                if (this.comboPhase === 'commit') {
                    const t = this.comboPhaseTimer;
                    return { name: 'attack1', hold: 4, index: t > 12 ? 0 : t > 10 ? 1 : 2 };
                }
                return { name: 'attack1', hold: 4, index: 3 }; // chain / recovery pose
            }
            case 2: { // ECLIPSE WHEEL (4f): WRAP-2H f0 / AWAY f1 / SWEEP f2 (the hit) / EXIT f3
                if (this.comboPhase === 'commit') {
                    const t = this.comboPhaseTimer;
                    return { name: 'attack2', hold: 4, index: t > 13 ? 0 : t > 10 ? 1 : 2 };
                }
                return { name: 'attack2', hold: 4, index: 3 };
            }
            case 3: { // UMBRAL ORB (3f): GATHER f0 / CAST f1 (orb detaches) / RECOIL f2
                if (this.comboPhase === 'commit') {
                    const t = this.comboPhaseTimer;
                    return { name: 'attack3', hold: 7, index: t > 14 ? 0 : t > 6 ? 1 : 2 };
                }
                return { name: 'attack3', hold: 7, index: 2 };
            }
            case 4: { // ECLIPSE BREAKER (5f): LOAD f0 / RUSH-A f1 / RUSH-B f2 / IMPACT f3 / RECOVER f4
                if (this.comboPhase === 'commit') {
                    // LOAD -> RUSH-A -> RUSH-B across the 10-frame finisher dash.
                    const dp = 1 - Math.max(0, this._finisherDashTimer) / FINISH.dashFrames;
                    return { name: 'attack4', hold: 4, index: dp < 0.15 ? 0 : dp < 0.55 ? 1 : 2 };
                }
                // recovery: IMPACT (f3) pinned while the detonation lives (EXPL.frames),
                // then RECOVER (f4) fills the tail — seams back into the locomotion carry.
                return { name: 'attack4', hold: 4, index: this.comboPhaseTimer > (COMBO[4].recovery - EXPL.frames) ? 3 : 4 };
            }
        }

        if (this.dashTimer > 0)         return { name: 'dash',   hold: 3 };
        if (!this.isGrounded) {
            if (this.jumpCount >= 2)    return { name: 'doubleJump', hold: 3 };
            return { name: this.velocityY < 0 ? 'jump' : 'fall', hold: 6 };
        }
        if (Math.abs(this.velocityX) > 0.6) {
            // STAGE 7B-2 — locomotion visual selection is UNCHANGED (same physics
            // read as before): `run` = walkForward when moving TOWARD the Hero,
            // `retreat` = walkBackward (the supernatural glide) when moving AWAY
            // while still facing them. Only the frame DATA (rear-carry clips, in
            // SpriteManager) and the HOLDS were swapped (walk2_handoff §2/§7:
            // run 4->5 for the heavy advance, retreat 5->12 for the slow glide).
            const retreating = Math.sign(this.velocityX) === -this.aimDir;
            return retreating ? { name: 'retreat', hold: 12 }
                              : { name: 'run', hold: 5 };
        }
        return { name: 'idle', hold: 12 };
    }

    draw(ctx) {
        // Advance the animation from state (no physics is touched here).
        const { name, hold, index } = this._animState();
        this.anim.set(name, hold);
        // The AFK clips pick their frame by INDEX (driven by the state timer); every
        // other clip free-runs on the animator's hold as before.
        let frame;
        if (index != null) {
            const clip = this.anim.sprites[name];
            frame = (clip && clip[index]) || this.anim.current();
        } else {
            this.anim.tick();
            frame = this.anim.current();
        }
        if (!frame) return;

        // --- STAGE 7B-3 / RE-1: walk RED ECLIPSE lifecycle tick (render-only) ----
        // Advance the eclipse from the resolved base clip: spawn it on the continuous-
        // walk trigger, then run its OWN lifetime to completion. The base `frame` is
        // deliberately left UNTOUCHED here — the Boss keeps animating normally
        // (idle/jump/attack/dash/...) and the eclipse is composited as a SEPARATE
        // overlay ON TOP of the sprite further below, so it survives every state change.
        this._updateLocomotionSurge(name);
        this._locoControlActive = false;   // consume the control-frame flag (re-armed each update())

        // REDESIGN (VISUAL_REDESIGN_BIBLE.md §7 Steps 1-2): the animator merges the
        // redesigned movement clips (idle + locomotion) over the legacy sheet. Redesigned
        // frames are 48 rows tall at BOSS_IDLE_PIXEL with their own palette; legacy clips
        // (attacks/charges, not yet redesigned) are 24 rows at BOSS_PIXEL. Detect by row
        // count so each renders at the correct scale/palette and any not-yet-redesigned
        // clip falls back automatically. Visual-only: both total 144px, same feet anchor.
        let pixelSize = BOSS_PIXEL;
        let spritePalette;   // undefined => drawMatrix falls back to the global PALETTE
        if (frame.length >= 40) {
            pixelSize = BOSS_IDLE_PIXEL;
            spritePalette = BOSS_REDESIGN_PALETTE;
        }

        const feetY = this.y + this.halfHeight;            // the sprite stands here

        const attacking = this.comboStep > 0;
        const diving = this.airDiveState !== 'none';
        // The finisher dash reads as a "drill" too, so treat it like a dash for FX.
        const dashing = this.dashTimer > 0 || (this.comboStep === 4 && this._finisherDashTimer > 0);

        // CHARGED-ATTACK render states (STEP 2 wiring). Ground charge => wand glow;
        // air charge / fully-charged dive => roaring black-red fire aura. Keyed off
        // the LOCKED _chargeType (not isGrounded) so a ground laser charge keeps its
        // wand glow after jumping and never flips to the air fire aura mid-charge.
        const groundCharging = this.isCharging && this._chargeType === 'GROUND_LASER';
        // STAGE RE-5: the AIR CHARGED RED ECLIPSE plays during the AIR_DIVE hover-charge
        // (gather C0..C2 + peak hold C3<->C4); the release discharge tail (C5-C7) rides
        // its own render-only counter through the dive (see the post-sprite charge seam).
        const airCharging = this.isCharging && this._chargeType === 'AIR_DIVE';

        // FACING:
        //   - dashing (Shift dash or finisher dash): point the way we travel.
        //   - attacking / diving: face the locked attack direction (sword + momentum agree).
        //   - otherwise: face the Hero (aimDir) so the sword ALWAYS points at them.
        const intimidating = this.afkPhase !== null;
        const travelDir = Math.sign(this.velocityX) || this.facing;
        let flip;
        // The planted blade is welded to the floor, so the AFK clips keep the facing
        // captured at trigger — the sprite can never mirror out from under the crack.
        if (intimidating || (this._afkExitTimer > 0 && name === 'afkExit')) flip = this._afkFlip;
        else if (dashing) flip = (travelDir === -1);
        else if (attacking || diving) flip = (this.attackDir === -1);
        else flip = (this.aimDir === -1);

        const fxDir = (attacking || diving) ? this.attackDir : this.aimDir; // void-edge aim

        // Hit tint. Normally the white flash; while intimidating, afk_spec §8's
        // DENIAL tint instead: the figure eclipses to umbral black (the ember rim
        // pass is drawn just under the sprite below) so the hit reads as swallowed.
        const denial = intimidating && this.hitFlash > 0;
        const tint = denial ? '#14101c' : (this.hitFlash > 0 ? '#ffffff' : null);

        const hpx = frame.length * pixelSize;
        const bodyCY = feetY - hpx * 0.5;                   // figure centre (FX anchor)
        // Chest red-core anchor (a little above figure centre) — where the ground
        // laser gathers + fires from. Render-only; used by the wand glow + beam draw.
        this._chestY = bodyCY - hpx * 0.14;

        // Record a short position trail while dashing, then let it drain so the
        // streaks fade out instead of snapping off. Visual only.
        if (dashing) {
            this._dashTrail.push({ x: this.x, y: bodyCY });
            if (this._dashTrail.length > 9) this._dashTrail.shift();
        } else if (this._dashTrail.length) {
            this._dashTrail.shift();
        }

        // Soft contact shadow, only while actually on the ground.
        if (this.isGrounded) {
            SpriteManager.drawShadow(ctx, this.x, feetY, frame[0].length * pixelSize * 0.6);
        }

        // --- Ground-level projectiles BEHIND the Boss (Dark Flame, shockwave) ---
        this._drawProjectiles(ctx, 'under');

        // --- FX layer (drawn BEHIND the sprite) ---
        PerfMonitor.start('player aura / void edge');
        if (this._dashTrail.length > 1) {
            // REQUIREMENT 3: wind / vacuum streamers trailing the drill.
            SpriteManager.drawSpeedStreaks(ctx, this._dashTrail, { spread: hpx * 0.16 });
        }
        if (intimidating) {
            // The intimidation aura owns this layer (afk_spec §5). The idle void
            // aura + blade void-edge are suppressed so the state's oppressive
            // outward+downward signature can never be confused with them.
        } else if (dashing) {
            // REQUIREMENT 3: bright crimson aura wrapping the spinning drill.
            SpriteManager.drawDashAura(ctx, this.x, bodyCY, travelDir, {
                radius: hpx * 0.52,
                intensity: this.hitFlash > 0 ? 1.5 : 1,
            });
        } else if (!PerfMonitor.shouldSkip('playerAura')) {
            // REQUIREMENT 2/4: the Boss's majestic dark void aura.
            SpriteManager.drawAura(ctx, this.x, bodyCY, {
                radius: hpx * 0.66,
                seed: 1.7,
                intensity: this.hitFlash > 0 ? 1.7 : 1,
            });
            // REQUIREMENT 2: a swirling void glow riding on the blade.
            SpriteManager.drawVoidEdge(ctx, this.x + fxDir * hpx * 0.30, bodyCY - hpx * 0.16, fxDir, {
                radius: hpx * 0.20,
                intensity: this.hitFlash > 0 ? 1.6 : 1,
            });
        }

        // FEAR EMPOWERMENT: while the Hero is under the 4s Fear Status (mirrored
        // onto the Boss via setFearAura), roaring black/red flames wrap the Boss.
        // Drawn here, BEHIND the sprite (like drawAura), so the figure stands
        // inside the fire. Intensity holds at full, then fades over the last ~0.5s.
        // (Suppressed while intimidating: that state owns the aura layer, and the
        //  rising crimson fire would fight its sinking black-red pressure.)
        if (this.fearAuraActive && !intimidating) {
            SpriteManager.drawFearBossAura(ctx, this.x, bodyCY, {
                radius: hpx * 0.7,
                intensity: Math.min(1, this.fearAuraTimer / 30),
            });
        }
        PerfMonitor.end('player aura / void edge');

        // --- STAGE 7A-1: intimidation crack / barrier / aura, all BEHIND the Boss.
        // Drawn from the exact sprite-matrix origin so every ported cell lands where
        // afk_gen.js placed it. Runs past the state's end so the tails fade cleanly.
        PerfMonitor.start('player aura / void edge');
        this._drawIntimidationFX(ctx, feetY, frame, pixelSize, flip);
        PerfMonitor.end('player aura / void edge');

        // CHARGED AIR ATTACK: the old roaring black/red fire aura + "Charge Ready"
        // burst that used to flare BEHIND the sprite here are RETIRED (Stage RE-5).
        // The AIR CHARGED RED ECLIPSE replaces them, drawn OVER the sprite alongside
        // the Ground Charged Red Eclipse (the post-sprite "player charge aura" seam
        // below) so its pre-treated body re-skin lands on the live airCharge pose.

        // --- STAGE 7B-2/7B-4: backward-glide trailing silhouette echoes ---------
        // The supernatural retreat (walkBackward glide) leaves a short trail of
        // fading silhouette copies BEHIND the Boss, at the REAL positions he just
        // occupied — the approved walk2_v1 "GLIDE AFTERIMAGES" tableau / ref4
        // motion language. We sample his position each frame into a small ring
        // buffer and re-draw two older snapshots (approved count/alpha/tint,
        // walk2_spec §3 / handoff §4): a nearer brighter echo (lag 6) + a farther
        // dimmer one (lag 12), farthest FIRST so depth reads right and each older
        // echo is progressively fainter. Because the samples are the Boss's actual
        // recent positions, the echoes trail the crossed path and keep the eerie
        // glide read instead of a fixed decorative block glued to the sprite.
        // Each snapshot keeps its own frame + flip, so during a backward surge the
        // echoes inherit the eclipse skin automatically. Render-only: no velocity,
        // no physics, no hitbox — echoes, not a dash. The trail is nulled the
        // instant the glide ends (else-branch) so no echo survives idle / forward
        // walk / attacks / dash / AFK / jump / death / restart / scene transitions.
        if (name === 'retreat' && this.isGrounded && !PerfMonitor.shouldSkip('playerAura')) {
            if (!this._glideTrail) this._glideTrail = [];
            this._glideTrail.unshift({ x: this.x, y: feetY, frame, flip });
            if (this._glideTrail.length > GLIDE_TRAIL.MAX) this._glideTrail.length = GLIDE_TRAIL.MAX;
            for (const g of GLIDE_TRAIL.ECHOES) {
                const s = this._glideTrail[g.lag];
                if (!s) continue;
                SpriteManager.drawSprite(ctx, s.frame, s.x, s.y, {
                    pixelSize, flip: s.flip, alpha: g.alpha, tint: g.tint, palette: spritePalette,
                });
            }
        } else if (this._glideTrail) {
            this._glideTrail = null;
        }

        // --- STAGE 8A-2: ECLIPSE BREAKER rush afterimages -----------------------
        // While the Hit-4 finisher dash is live, trail two stepped ghost copies of the
        // live RUSH pose BEHIND the Boss (the approved "RUSH AFTERIMAGES — RUNTIME X3"
        // panel; drawDashAura already lays the ember streak underneath). Offsets run
        // opposite the travel direction (where he just was), farthest/dimmest FIRST so
        // the smear reads with depth. Render-only: no velocity / physics / hitbox.
        if (this.comboStep === 4 && this._finisherDashTimer > 0 && !PerfMonitor.shouldSkip('playerAura')) {
            const back = -this.attackDir;
            for (const g of RUSH_AFTERIMAGES) {
                SpriteManager.drawSprite(ctx, frame, this.x + back * g.off, feetY, {
                    pixelSize, flip, alpha: g.alpha, tint: g.tint, palette: spritePalette,
                });
            }
        }

        // The Boss sprite (renders at pixelSize; idle uses the redesigned sheet+palette).
        PerfMonitor.start('player sprite draw');
        // DENIAL RIM (afk_spec §8): two ember-tinted copies offset ±1px horizontally,
        // then the umbral silhouette on top. Only the outer left/right contour of the
        // rim survives — the hit reads as swallowed, never as a stagger.
        if (denial) {
            for (const off of [-pixelSize, pixelSize]) {
                SpriteManager.drawSprite(ctx, frame, this.x + off, feetY, {
                    pixelSize, flip, tint: '#e0263a', palette: spritePalette,
                });
            }
        }
        const res = SpriteManager.drawSprite(ctx, frame, this.x, feetY, {
            pixelSize, flip, tint, palette: spritePalette,
        });
        PerfMonitor.end('player sprite draw');
        this._spriteTopY = res ? res.originY : null;

        // --- STAGE RE-1: WALK RED ECLIPSE overlay (independent render-only) -------
        // Composite the eclipse ON TOP of the base sprite so the Boss keeps animating
        // normally underneath (idle/jump/attack/dash/turn). It:
        //   • follows the Boss's CURRENT position (this.x / feetY) — never stranded at
        //     the trigger spot;
        //   • advances its OWN frame from `_surgePhase` (not the base animator), so it
        //     plays even when the Boss isn't walking;
        //   • keeps the variant + facing MIRROR captured at trigger, so a later
        //     direction change flips the body below but never re-skins/mirrors this
        //     active eclipse.
        // The clips are redesigned 48-row art, so they render at their own pixel size +
        // palette regardless of what the base clip is. Render-only: no physics/hitbox.
        if (this._surgeActive && this._surgeName) {
            const surgeClip = this.anim.sprites[this._surgeName];
            if (surgeClip && surgeClip.length) {
                // Per-variant cadence matches the base walk holds (run 5 / retreat 12),
                // so the eclipse clip cycles at the exact rate it always did.
                const eclipseHold = this._surgeName === 'surgeBackward' ? 12 : 5;
                const eclipseFrame =
                    surgeClip[Math.floor(this._surgePhase / eclipseHold) % surgeClip.length];
                if (eclipseFrame) {
                    SpriteManager.drawSprite(ctx, eclipseFrame, this.x, feetY, {
                        pixelSize: BOSS_IDLE_PIXEL,
                        flip: this._surgeFlip,
                        palette: BOSS_REDESIGN_PALETTE,
                    });
                }
            }
        }

        // The Boss sheds ember shards instead of staggering.
        if (denial && !PerfMonitor.shouldSkip('playerAura')) {
            SpriteManager.drawDenialShards(ctx, this.x, bodyCY, {
                progress: 1 - this.hitFlash / this.hitFlashDuration, size: hpx,
            });
        }

        // STAGE 7A-2C — the black-red void-fracture lightning. Drawn OVER the sprite
        // (as the concept sheet composites it) so the arcs crackle across the armour
        // and down the planted blade instead of hiding behind the silhouette.
        this._drawIntimidationArcs(ctx, feetY, frame, pixelSize, flip);

        // The chest-point pressure snap that launches the barrier (afk_spec §4).
        if (this._afkFlareTimer > 0 && !PerfMonitor.shouldSkip('playerAura')) {
            SpriteManager.drawIntimidationFlare(ctx, this.x, this._chestY, {
                size: hpx, progress: 1 - this._afkFlareTimer / AFK.FLARE_FRAMES,
            });
        }

        // Landing impact dust — gives the Boss's jumps a weighty touchdown puff in the
        // hall's neutral warm-stone tones (the approved sampler R2C3 dust the Hero and
        // the air-dive slam already use). Render-only ground-transition detect: reads
        // isGrounded, never writes physics. Suppressed while an air-dive shockwave is
        // live so the big slam doesn't double up with a second small puff.
        // (Also suppressed while intimidating: the forced descent lands into the
        //  sword plant, whose crack + pressure pool ARE the impact — afk_spec §8.)
        if (this._prevGroundedVFX === undefined) this._prevGroundedVFX = this.isGrounded;
        const slamActive = this.projectiles.some((p) => p.isActive && p.kind === 'shockwave');
        if (this.isGrounded && !this._prevGroundedVFX && !slamActive && !intimidating) {
            this._landDustTimer = 9; this._landDustX = this.x; this._landDustY = feetY;
        }
        this._prevGroundedVFX = this.isGrounded;
        if (this._landDustTimer > 0 && !PerfMonitor.shouldSkip('playerAirDiveVFX')) {
            SpriteManager.drawLandingDust(ctx, this._landDustX, this._landDustY, {
                progress: 1 - this._landDustTimer / 9, px: 3,
            });
            this._landDustTimer--;
        }

        // STAGE 8A-2 — the runtime boss-slash crescent hook is RETIRED. The approved
        // combo redesign BAKES the black-red air-scar trails directly into the H1/H2
        // body frames (drawn behind the silhouette), so firing drawBossSlash here too
        // would DOUBLE the trail. The sword trail now follows the blade via the baked
        // frame data; drawBossSlash stays defined but unused (like drawWandGlow).
        this._slashVfxFrame = 0;

        // CHARGED GROUND ATTACK: the GROUND CHARGED RED ECLIPSE (Stage RE-3, approved
        // Stage RE-2 "INHALE" implosion). This REPLACES the old wand-glow gather visual
        // at this seam. Black-red eclipse energy forms OUTSIDE the Boss and is pulled
        // INWARD — OUTSIDE → INWARD → CHEST CORE — crushing into the red chest core as
        // the meter fills, then brimming in a compact loop while fully charged + held.
        // The visual PHASES are driven straight from the REAL charge lifecycle so they
        // stay in sync with early / full / held-ready / interrupted charges:
        //   • formation B0..B4 map to `chargeRatio` (0..1) — no separate gameplay clock;
        //   • the fully-charged HOLD pingpongs B5<->B6 on a render-only counter;
        //   • an interrupted/cancelled/released charge simply stops drawing next frame
        //     (`groundCharging` is derived from isCharging) — a clean same-frame cut,
        //     no stale cells (there are no persistent arrays/particles to leak).
        // Anchored exactly like drawSprite (this.x / feetY) so the chest core stays put
        // in both facings and across pose frames. Tier reductions are data-driven inside
        // drawGroundEclipse; it renders (reduced) in every tier, never a generic aura.
        PerfMonitor.start('player charge aura');
        if (groundCharging && !PerfMonitor.shouldSkip('playerChargeAura')) {
            let eclipseIndex;
            if (this.isFullyCharged) {
                // Phase 4 — CHARGED HOLD: seamless B5<->B6 brim loop, held stable for
                // as long as the charge is held. Never restarts the formation, never
                // explodes outward, never accumulates anything.
                this._groundEclipseHold++;
                eclipseIndex = 5 + (Math.floor(this._groundEclipseHold / GROUND_ECLIPSE.HOLD_TICKS) % 2);
            } else {
                // Phases 1-3 — SUMMON / CONVERGE / COMPRESS: B0..B4 tracked directly
                // off the real charge meter, so the inward pull is always in sync.
                this._groundEclipseHold = 0;
                eclipseIndex = Math.min(4, Math.floor(this.chargeRatio * 5));
            }
            SpriteManager.drawGroundEclipse(ctx, this.x, feetY, eclipseIndex, {
                flip, pixelSize,
            });
        } else if (this._groundEclipseHold) {
            this._groundEclipseHold = 0;
        }
        // Phase 5 — RELEASE handoff (R0 SNAP): a very short render-only outro after a
        // fully-charged fire, drawn OVER the live fireLaser pose so the compressed ring
        // visibly snaps into the muzzle before the EXISTING beam takes over. The beam's
        // origin, animation, hitbox, duration and damage are untouched.
        if (this._groundEclipseRelease > 0) {
            if (!PerfMonitor.shouldSkip('playerChargeAura')) {
                SpriteManager.drawGroundEclipse(ctx, this.x, feetY, 0, {
                    flip: this._groundEclipseReleaseFlip, pixelSize, release: true,
                });
            }
            this._groundEclipseRelease--;
        }

        // CHARGED AIR ATTACK: the AIR CHARGED RED ECLIPSE (Stage RE-5, approved Stage
        // RE-4 "IGNITION" detonation). REPLACES the old drawChargedAirAura +
        // drawChargeReadyAura. Black-red energy is born AT the chest core and bursts
        // OUTWARD — CHEST CORE → IGNITION → OUTWARD EXPANSION — the exact inverse of the
        // ground inhale. Drawn OVER the sprite (like the ground eclipse) so the body
        // re-skin lands on the live airCharge pose; the chest core stays anchored in
        // both facings (grid centre col 50 == body centre). The PHASES ride the REAL
        // charge lifecycle so they stay in sync with short / full / held / cancelled charges:
        //   • gather C0..C2 map to `chargeRatio` (0..1) — no separate gameplay clock;
        //   • the moment fully charged, the C3 ignition PEAK plays ONCE, then C3<->C4
        //     pingpong on a render-only counter (the peak never re-bursts / accumulates);
        //   • a cancelled/interrupted charge just stops drawing next frame (`airCharging`
        //     is derived from isCharging) — a clean same-frame cut, no stale cells.
        // Tier reductions are data-driven inside drawAirEclipse; it renders (reduced) in
        // every tier, never a generic aura.
        if (airCharging && !PerfMonitor.shouldSkip('playerChargeAura')) {
            let airIndex;
            if (this.isFullyCharged) {
                // Phase 3 PEAK + HOLD: C3 ignition first (once), then a stable C3<->C4
                // pingpong held for as long as the charge is held. Never restarts the
                // gather, never explodes past the peak, never accumulates anything.
                this._airEclipseHold++;
                airIndex = 3 + (Math.floor(this._airEclipseHold / AIR_ECLIPSE.HOLD_TICKS) % 2);
            } else {
                // Phases 1-2 SUSPENDED GATHER / PRE-IGNITION EXPANSION: C0..C2 tracked
                // directly off the real charge meter, so the outward build is in sync.
                this._airEclipseHold = 0;
                airIndex = Math.min(2, Math.floor(this.chargeRatio * 3));
            }
            SpriteManager.drawAirEclipse(ctx, this.x, feetY, airIndex, { flip, pixelSize });
        } else if (this._airEclipseHold) {
            this._airEclipseHold = 0;
        }
        // Phases 4-5 — OUTWARD DISCHARGE + DISSIPATION tail (C5-C7). A short render-only
        // outro after a FULLY-charged release, drawn back+front OVER the live freeze +
        // dive pose so the rays SHATTER outward and sink as ash while the EXISTING charged
        // dive takes over: C5 (5t) → C6 (6t) → C7 (8t) = 19 ticks. If the dive lands
        // earlier the landing slam simply draws over the last frames and the tail expires.
        // The dive's velocity, freeze, hitbox, damage and landing slam are untouched.
        if (this._airEclipseRelease > 0) {
            if (!PerfMonitor.shouldSkip('playerChargeAura')) {
                const r = this._airEclipseRelease;
                const tailIndex = r > 14 ? 5 : r > 8 ? 6 : 7;
                SpriteManager.drawAirEclipse(ctx, this.x, feetY, tailIndex, {
                    flip: this._airEclipseReleaseFlip, pixelSize, release: true,
                });
            }
            this._airEclipseRelease--;
        }
        PerfMonitor.end('player charge aura');

        // --- Finisher explosion punches OVER the Boss for maximum impact ---
        this._drawProjectiles(ctx, 'over');

        // Floating HP bar stays (now anchored above the sprite's head).
        PerfMonitor.start('health bars');
        if (!PerfMonitor.shouldSkip('healthBars')) this.drawHealthBar(ctx);
        PerfMonitor.end('health bars');
    }

    /**
     * STAGE 7A-1 — the intimidation layer, drawn BEHIND the Boss sprite:
     * world-anchored floor crack, the travelling pressure walls, and the aura.
     *
     * The aura is anchored on the sprite matrix ORIGIN (not the body centre) so the
     * ported cells land on their authored columns/rows — plant col +31, floor row
     * +47, chest core (+19,+15). Render-only: reads state, writes nothing.
     */
    _drawIntimidationFX(ctx, feetY, frame, pixelSize, flip) {
        const skip = PerfMonitor.shouldSkip('playerAura');

        // Floor crack: lives past the state, then fades over CRACK_LINGER frames.
        if (this._afkCrackTimer > 0 && !skip) {
            SpriteManager.drawPlantCrack(ctx, this._afkCrackX, this._afkCrackY, {
                age: this._afkCrackAge / AFK.CRACK_AGE_DIV,
                fade: this.afkPhase ? 1 : this._afkCrackTimer / AFK.CRACK_LINGER,
                px: pixelSize,
            });
        }

        // Pressure walls (0 damage — pure repulsion + VFX).
        if (this.afkWaves.length && !skip) {
            for (const w of this.afkWaves) {
                SpriteManager.drawPressureWave(ctx, w.x, w.y + w.halfHeight, w.dir, {
                    progress: w.life / w.maxLife,
                    height: AFK.WAVE_HEIGHT,
                });
            }
        }

        if (!this.afkPhase || skip) return;

        // Aura: full from the plant onward, ramped in with the vignette so the snap
        // frames stay clean and readable.
        const wpx = frame[0].length * pixelSize;
        const hpx = frame.length * pixelSize;
        const originX = Math.round(this.x - wpx / 2);
        const originY = Math.round(feetY - hpx);
        const intensity = this.afkPhase === 'snap' ? 0.35 : Math.max(0.45, this._afkVignette);
        // Shards sink on their own slow 3-phase clock; the heartbeat ring is synced
        // to the afkIdle ember-thump frame so the pulse and the flare are one beat.
        const shardPhase = Math.floor(this.afkPhaseTimer / AFK.AURA_PHASE_FRAMES) % 3;
        const beat = this.afkPhase !== 'idle' ? 0
            : this.afkIdleCycle < AFK.IDLE_THUMP ? 0
            : this.afkIdleCycle < AFK.IDLE_BEAT2 ? 1 : 2;
        SpriteManager.drawIntimidationAura(ctx, originX, originY, pixelSize, {
            shardPhase, beat, intensity, flip,
        });
    }

    /**
     * STAGE 7A-2C — the void-fracture arcs, drawn IN FRONT of the Boss sprite.
     * Same matrix-origin anchoring as the aura, so the chest fork leaves the core
     * at (19,15), the crawl runs beside the planted blade, and the skitter rides
     * the shadow-pool rim. SpriteManager caps the concurrent arc count per quality
     * tier and always paints the micro-sparks. Render-only: writes nothing.
     */
    _drawIntimidationArcs(ctx, feetY, frame, pixelSize, flip) {
        const live = this.afkPhase || this._afkExitTimer > 0;
        if (!live || PerfMonitor.shouldSkip('playerAura')) return;

        const planted = this.afkPhase === 'idle' ||
                        (this.afkPhase === 'plant' && this.afkPhaseTimer >= AFK.PLANT_IMPACT);
        if (!planted && !this._afkArcs.length) return;

        const wpx = frame[0].length * pixelSize;
        const hpx = frame.length * pixelSize;
        const originX = Math.round(this.x - wpx / 2);
        const originY = Math.round(feetY - hpx);
        const arcs = this._afkArcs.map((a) => ({
            ...a, mode: this._afkArcMode(a), fade: this._afkArcFade(a),
        }));
        SpriteManager.drawVoidFractureArcs(ctx, originX, originY, pixelSize, arcs, {
            flip,
            intensity: Math.max(0.45, this._afkVignette),
            sparkPhase: Math.floor(this.afkIdleCycle / 16) % 3,
            sparks: planted,
        });
    }

    // Render the spawned projectiles/AoE. `layer` controls draw order vs the Boss:
    // 'under' = ground flame + shockwave (behind), 'over' = finisher blast (front).
    _drawProjectiles(ctx, layer) {
        for (const p of this.projectiles) {
            if (!p.isActive) continue;
            const prog = p.lifeProgress;
            if (layer === 'under' && p.kind === 'flame') {
                PerfMonitor.start('player projectiles / dark flame');
                if (!PerfMonitor.shouldSkip('playerProjectiles')) {
                    // STAGE 8A-2 — the UMBRAL ORB (approved combo Hit 3, the eclipse-
                    // ball) REPLACES the old Dark Flame visual on this SAME flame
                    // projectile (position / speed / hitbox all unchanged). The O-cell
                    // rides the 80-frame flame life: O0 ignite -> O1<->O2 flight loop
                    // (toggles every ~5 frames) -> O3 burst as it expires.
                    let orbIdx;
                    if (prog < 0.10) orbIdx = 0;
                    else if (prog > 0.85) orbIdx = 3;
                    else orbIdx = 1 + (Math.floor(prog * FLAME.frames / 5) % 2);
                    SpriteManager.drawComboOrb(ctx, p.x, p.y, orbIdx, { flip: p.facing === -1 });
                }
                PerfMonitor.end('player projectiles / dark flame');
            } else if (layer === 'under' && p.kind === 'shockwave') {
                // Anchor the ring at the box's bottom (the ground line).
                PerfMonitor.start('player air dive VFX');
                if (!PerfMonitor.shouldSkip('playerAirDiveVFX')) {
                    SpriteManager.drawShockwave(ctx, p.x, p.y + p.halfHeight, {
                        progress: prog, radius: p.halfWidth,
                    });
                }
                PerfMonitor.end('player air dive VFX');
            } else if (layer === 'over' && p.kind === 'explosion') {
                PerfMonitor.start('player projectiles / dark flame');
                if (!PerfMonitor.shouldSkip('playerProjectiles')) {
                    // STAGE 8A-2 — the ECLIPSE BREAKER DETONATION (approved combo Hit 4
                    // finisher) REPLACES the old circular drawExplosion on this SAME
                    // explosion projectile (position / size / hitbox all unchanged). A
                    // GROUNDED half-dome: floor row 48 is pinned to the arena floor line
                    // (the Boss feet line), NOT the projectile centre, so it sits on the
                    // ground; the CX=38 mirror is handled inside drawComboDetonation. The
                    // D-cell maps over the 26-frame blast life: D0 flash / D1 burst / D2
                    // fracture / D3 ashfall.
                    const floorY = this.y + this.halfHeight;
                    const f = Math.floor(prog * EXPL.frames);
                    const detIdx = f < 6 ? 0 : f < 14 ? 1 : f < 20 ? 2 : 3;
                    // EXPL.drawPixel > BOSS_IDLE_PIXEL enlarges the burst so it reads a
                    // touch taller than the Boss body; drawComboDetonation keeps it
                    // floor-pinned (FLOOR_ROW) + core-centred (CX mirror) at any scale.
                    SpriteManager.drawComboDetonation(ctx, p.x, floorY, detIdx, {
                        flip: p.facing === -1, pixelSize: EXPL.drawPixel,
                    });
                }
                PerfMonitor.end('player projectiles / dark flame');
            } else if (layer === 'over' && p.kind === 'laser') {
                // The Laser box is centred half-a-length ahead, so back off
                // halfWidth along facing to seat the beam muzzle on the Boss.
                // VISUAL-ONLY: emit from the chest red core height (this._chestY),
                // not the hitbox's physics-centre y — the hitbox is unchanged.
                const beamY = this._chestY != null ? this._chestY : p.y;
                PerfMonitor.start('player laser beam');
                if (!PerfMonitor.shouldSkip('playerLaser')) {
                    SpriteManager.drawLaserBeam(ctx, p.x - p.facing * p.halfWidth, beamY, p.facing, {
                        length: p.width, thickness: p.height, progress: prog,
                    });
                }
                PerfMonitor.end('player laser beam');
            }
        }
    }

    // Floating HP bar above the Boss (drawn in world space, under the camera transform).
    drawHealthBar(ctx) {
        const barWidth = 56;
        const barHeight = 7;
        const x = this.x - barWidth / 2;
        const y = (this._spriteTopY != null ? this._spriteTopY - barHeight - 6 : this.y - this.radius - 18);
        const pct = Math.max(0, this.hp / this.maxHp);

        // Backing plate.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

        // Fill, color-coded by remaining health.
        ctx.fillStyle = pct > 0.5 ? '#33ff66' : pct > 0.25 ? '#ffcc33' : '#ff3366';
        ctx.fillRect(x, y, barWidth * pct, barHeight);
    }
}
