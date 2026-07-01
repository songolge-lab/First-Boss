// src/entities/Player.js
import { Hitbox } from '../core/Hitbox.js';
import { SpriteManager, SpriteAnimator, BOSS_SPRITES, BOSS_PIXEL } from '../core/SpriteManager.js';

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
const EXPL   = Object.freeze({ size: 210, frames: 26, ahead: 24, damage: 160, knockback: 26 });
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
        // Reusable output buffer for getActiveHitboxes() (Stage 1B perf pass):
        // main.js calls it once per frame and consumes it immediately via a
        // for-of loop, so it's safe to hand back the same array every time
        // instead of allocating a fresh one.
        this._activeHitboxesScratch = [];

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
        this.anim = new SpriteAnimator(BOSS_SPRITES);
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

    update(input) {
        // --- Tick combat + ability timers (i-frames, hit flash, dash CD, weapon CD/active) ---
        if (this.iFrames > 0) this.iFrames--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        this.attackHitbox.tick();

        // --- Advance + cull free projectiles (flame travels; bursts age out) ---
        for (const p of this.projectiles) p.update();
        if (this.projectiles.length) {
            // In-place compaction (Stage 1B perf pass): same objects, same
            // relative order, no per-frame array allocation (was .filter()).
            let write = 0;
            for (let read = 0; read < this.projectiles.length; read++) {
                const p = this.projectiles[read];
                if (p.isActive) this.projectiles[write++] = p;
            }
            this.projectiles.length = write;
        }

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
                this._startAirDive(this.chargeTimer >= CHARGE.frames);
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
        // Reused scratch array (Stage 1B perf pass): main.js consumes the
        // result synchronously via a for-of loop before this is ever called
        // again, so refilling the same array avoids a per-frame allocation.
        const out = this._activeHitboxesScratch;
        out.length = 0;
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

        // A real hit interrupts any combo or air dive in progress.
        this._resetCombo();
        this.airDiveState = 'none';
        // ...and any in-progress charge / live Laser commit (incl. Charge Ready).
        this.chargeTimer = 0;
        this._chargeType = null;
        this._laserLockTimer = 0;
        this.isChargeReady = false;

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

        // 4-hit combo clips (REQUIREMENT 1).
        switch (this.comboStep) {
            case 1: return { name: 'attack1', hold: 4 }; // horizontal slash
            case 2: return { name: 'attack2', hold: 3 }; // spinning slash
            case 3: return { name: 'attack3', hold: 5 }; // casting magic
            case 4: return { name: 'attack4', hold: 3 }; // explosive dash
        }

        if (this.dashTimer > 0)         return { name: 'dash',   hold: 3 };
        if (!this.isGrounded) {
            if (this.jumpCount >= 2)    return { name: 'doubleJump', hold: 3 };
            return { name: this.velocityY < 0 ? 'jump' : 'fall', hold: 6 };
        }
        if (Math.abs(this.velocityX) > 0.6) {
            // Moving AWAY from the Hero while still facing them => angry backpedal.
            const retreating = Math.sign(this.velocityX) === -this.aimDir;
            return retreating ? { name: 'retreat', hold: 5 }
                              : { name: 'run', hold: 4 };
        }
        return { name: 'idle', hold: 12 };
    }

    draw(ctx) {
        // Advance the animation from state (no physics is touched here).
        const { name, hold } = this._animState();
        this.anim.set(name, hold);
        this.anim.tick();
        const frame = this.anim.current();
        if (!frame) return;

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
        const chargedAir = (this.isCharging && this._chargeType === 'AIR_DIVE') ||
                           (this.airDiveState !== 'none' && this._diveCharged);

        // FACING:
        //   - dashing (Shift dash or finisher dash): point the way we travel.
        //   - attacking / diving: face the locked attack direction (sword + momentum agree).
        //   - otherwise: face the Hero (aimDir) so the sword ALWAYS points at them.
        const travelDir = Math.sign(this.velocityX) || this.facing;
        let flip;
        if (dashing) flip = (travelDir === -1);
        else if (attacking || diving) flip = (this.attackDir === -1);
        else flip = (this.aimDir === -1);

        const fxDir = (attacking || diving) ? this.attackDir : this.aimDir; // void-edge aim
        const tint = this.hitFlash > 0 ? '#ffffff' : null;  // white hit-flash

        const hpx = frame.length * BOSS_PIXEL;
        const bodyCY = feetY - hpx * 0.5;                   // figure centre (FX anchor)

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
            SpriteManager.drawShadow(ctx, this.x, feetY, frame[0].length * BOSS_PIXEL * 0.6);
        }

        // --- Ground-level projectiles BEHIND the Boss (Dark Flame, shockwave) ---
        this._drawProjectiles(ctx, 'under');

        // --- FX layer (drawn BEHIND the sprite) ---
        if (this._dashTrail.length > 1) {
            // REQUIREMENT 3: wind / vacuum streamers trailing the drill.
            SpriteManager.drawSpeedStreaks(ctx, this._dashTrail, { spread: hpx * 0.16 });
        }
        if (dashing) {
            // REQUIREMENT 3: bright crimson aura wrapping the spinning drill.
            SpriteManager.drawDashAura(ctx, this.x, bodyCY, travelDir, {
                radius: hpx * 0.52,
                intensity: this.hitFlash > 0 ? 1.5 : 1,
            });
        } else {
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
        if (this.fearAuraActive) {
            SpriteManager.drawFearBossAura(ctx, this.x, bodyCY, {
                radius: hpx * 0.7,
                intensity: Math.min(1, this.fearAuraTimer / 30),
            });
        }

        // CHARGED AIR ATTACK: roaring black/red fire wraps the Boss while it
        // hovers-and-charges aloft and through the fully-charged Fear dive. Drawn
        // BEHIND the sprite (like drawAura) so the figure stands inside the fire.
        if (chargedAir) {
            SpriteManager.drawChargedAirAura(ctx, this.x, bodyCY, {
                radius: hpx * 0.72,
                intensity: this.hitFlash > 0 ? 1.3 : 1,
            });
        }

        // STEP 3 — "CHARGE READY" aura. Once the 1-second charge completes while
        // the Boss is airborne and still holding (isChargeReady), flare the massive
        // violently-pulsing dark-red burst CONTINUOUSLY until release. Drawn BEHIND
        // the sprite (like the sibling auras) so the figure stands inside the energy.
        if (this.isCharging && this.isChargeReady) {
            SpriteManager.drawChargeReadyAura(ctx, this.x, bodyCY, performance.now(), {
                radius: hpx * 0.8,
                intensity: this.hitFlash > 0 ? 1.4 : 1,
            });
        }

        // The Boss sprite (renders 3x the Hero via BOSS_PIXEL).
        const res = SpriteManager.drawSprite(ctx, frame, this.x, feetY, {
            pixelSize: BOSS_PIXEL, flip, tint,
        });
        this._spriteTopY = res ? res.originY : null;

        // CHARGED GROUND ATTACK: the wand orb brightens as the meter fills, then
        // flares blinding red the instant it's fully charged (the laser is ready).
        // Drawn OVER the sprite, anchored at the wand-tip ahead of the Boss.
        if (groundCharging) {
            SpriteManager.drawWandGlow(
                ctx,
                this.x + fxDir * hpx * 0.22,
                bodyCY - hpx * 0.26,
                this.chargeRatio,
                { radius: hpx * 0.18 },
            );
        }

        // --- Finisher explosion punches OVER the Boss for maximum impact ---
        this._drawProjectiles(ctx, 'over');

        // Floating HP bar stays (now anchored above the sprite's head).
        this.drawHealthBar(ctx);
    }

    // Render the spawned projectiles/AoE. `layer` controls draw order vs the Boss:
    // 'under' = ground flame + shockwave (behind), 'over' = finisher blast (front).
    _drawProjectiles(ctx, layer) {
        for (const p of this.projectiles) {
            if (!p.isActive) continue;
            const prog = p.lifeProgress;
            if (layer === 'under' && p.kind === 'flame') {
                SpriteManager.drawDarkFlame(ctx, p.x, p.y, p.facing, {
                    progress: prog, width: p.width, height: p.height,
                });
            } else if (layer === 'under' && p.kind === 'shockwave') {
                // Anchor the ring at the box's bottom (the ground line).
                SpriteManager.drawShockwave(ctx, p.x, p.y + p.halfHeight, {
                    progress: prog, radius: p.halfWidth,
                });
            } else if (layer === 'over' && p.kind === 'explosion') {
                SpriteManager.drawExplosion(ctx, p.x, p.y, {
                    progress: prog, radius: p.halfWidth,
                });
            } else if (layer === 'over' && p.kind === 'laser') {
                // The Laser box is centred half-a-length ahead, so back off
                // halfWidth along facing to seat the beam muzzle on the Boss.
                SpriteManager.drawLaserBeam(ctx, p.x - p.facing * p.halfWidth, p.y, p.facing, {
                    length: p.width, thickness: p.height, progress: prog,
                });
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
