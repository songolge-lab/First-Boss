// src/entities/Enemy.js
// ---------------------------------------------------------------------------
// The Hero (AI enemy). Pursues the Boss horizontally along the ground. Stats
// (hp / move_speed / attack_damage) and the ability list are INJECTED at spawn
// from the Hero Progression Matrix, so encounter 5's spawn automatically arrives
// dash-capable with no special-casing here.
//
// COMBAT REWORK — the Hero now fights like a skilled, agile protagonist:
//   * SPACING / HIT-AND-RUN: it closes only to its strike range, lashes out, then
//     peels back. It NEVER stands inside the Boss trading body-contact damage; if
//     the Boss crowds it (or it's mid-cooldown) it actively backpedals to a safe
//     standoff. All spacing math is EDGE-TO-EDGE, so it stays correct no matter
//     how massive the Boss's body is.
//   * LIGHTNING ATTACKS: the wind-up is a quick blink and the strike is nearly
//     instantaneous (~3x faster than before) so the Hero can hit and immediately
//     start moving away.
//   * SMART DASH: a gap-closing dash auto-cancels the instant it would enter the
//     Boss's body AABB — it stops abruptly at strike range instead of plowing in.
//     After a strike (or when crowded) the Hero can defensively dash AWAY to reset.
//
// Movement is a small finite-state machine layered on top of the existing
// frame-based pursuit + knockback:
//
//     WALKING --(ready & gap)----> ATTACK_WINDUP --(timer)--> ATTACKING --(timer)--> WALKING
//     WALKING --(big gap, ready)-> DASH_WINDUP --(timer)--> DASHING --(timer/cancel)--> WALKING
//     WALKING --(post-strike / crowded, dash up)-> DASHING (away, no i-frames) --> WALKING
//     WALKING --(Boss swings)----> DASHING (dodge: away + i-frames, no windup) --> WALKING
//
// NOTE on conventions (kept from the original Enemy so Player.js / Input.js /
// main.js collision code all stay valid):
//   - (this.x, this.y) is the CENTER of the entity (not top-left).
//   - Physics is FRAME-BASED: velocities are added once per frame; all timings
//     are expressed in frames, not seconds.
//   - update() now takes an OPTIONAL 3rd arg with the Boss's AABB so spacing and
//     the dash-cancel are exact. Pass the Player (or { halfWidth, halfHeight }):
//         enemy.update(player.x, player.y, player);
//     If omitted, a massive-boss estimate is used so the call still works.
// ---------------------------------------------------------------------------

import { Hitbox } from '../core/Hitbox.js';
import { SpriteManager, SpriteAnimator, HERO_SPRITES, HERO_PIXEL } from '../core/SpriteManager.js';

export const MoveState = Object.freeze({
    WALKING: 'WALKING',
    DASH_WINDUP: 'DASH_WINDUP', // brief telegraph so the dash is reactable / fair
    DASHING: 'DASHING',
    ATTACK_WINDUP: 'ATTACK_WINDUP', // telegraph before the Hero's own slash
    ATTACKING: 'ATTACKING',         // the Hero's weapon hitbox is live
});

// Dash tuning. Frame-based to match the existing per-frame physics (~60fps).
// COOLDOWN_FRAMES ~ the dash_roll 4s cooldown; WINDUP/DURATION are the telegraph
// and the high-speed burst. This block is the one stop for dash feel.
const DASH = Object.freeze({
    MULTIPLIER: 6.0,        // dash speed = maxSpeed * MULTIPLIER (ignores the walk cap)
    DURATION_FRAMES: 10,    // length of the high-speed burst (~0.18s @60fps)
    WINDUP_FRAMES: 8,       // telegraph before the burst (~0.12s @60fps)
    MIN_RANGE_PX: 180,      // only dash to CLOSE gaps larger than this
    COOLDOWN_FRAMES: 240,   // dash_roll cooldown (~4s @60fps)
    REPOSITION_FRAMES: 8,   // length of a defensive back-dash (reposition after a strike / contact escape)
});

// Weapon tuning for the Hero's telegraphed melee slash. Now ~3x FASTER so the
// Hero can blink-strike and immediately peel away (hit-and-run).
// Reach is unchanged (shorter than the Boss's sword on purpose).
const ATTACK = Object.freeze({
    RANGE_PX: 74,         // legacy center-distance trigger (kept for reference; superseded by GAP_PX)
    GAP_PX: 34,           // strike when the EDGE-TO-EDGE gap to the Boss is within this (boss-size aware)
    WINDUP_FRAMES: 5,     // ~3x faster telegraph (was 16): a quick blink (~0.08s @60fps)
    REACH_PX: 24,         // hitbox center offset BEYOND the Hero's radius
    WIDTH: 42,            // hitbox full width
    HEIGHT: 48,           // hitbox full height
    DURATION_FRAMES: 3,   // ~3x faster strike (was 9): near-instant (~0.05s)
    COOLDOWN_FRAMES: 27,  // ~3x faster recovery (was 80): supports rapid hit-and-run (~0.45s)
    KNOCKBACK: 10,        // horizontal knockback dealt to the Boss on a connect
});

// Dodge tuning. The dodge REUSES the dash burst (so it's gated by dash_roll +
// the shared dash cooldown — Heroes below encounter 5 can't dodge), but unlike
// the gap-closer it skips the wind-up and grants invulnerability frames.
const DODGE = Object.freeze({
    THREAT_RANGE_PX: 130, // only react to a Boss slash thrown within this distance
    IFRAMES: 16,          // i-frames granted by a dodge (outlasts the 10-frame burst)
});

// Spacing tuning — the heart of the hit-and-run behavior. All distances are
// EDGE-TO-EDGE gaps between the Hero's body and the Boss's body (so they hold up
// against an arbitrarily massive Boss). Invariant: MIN_GAP < GAP_PX < HOVER_GAP.
const SPACING = Object.freeze({
    MIN_GAP: 16,          // closer than this = contact danger -> retreat immediately
    HOVER_GAP: 44,        // resting standoff kept while the weapon is on cooldown
    DASH_STOP_GAP: 34,    // a gap-closing dash auto-cancels upon reaching this edge gap (== strike range)
    DASH_CANCEL_SKIN: 6,  // extra vertical margin for the body-AABB dash cancel
    RETREAT_SPEED_MULT: 1.0, // backpedal speed as a fraction of maxSpeed

    // Used ONLY if main.js doesn't pass the Boss's bounds to update(). These are a
    // "massive boss" estimate so spacing/dash-cancel still do something sensible;
    // pass the real Player to update() for pixel-accurate behavior.
    BOSS_HALFWIDTH_FALLBACK: 60,
    BOSS_HALFHEIGHT_FALLBACK: 90,
});

export class Enemy {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = 30;
        this.radius = this.size / 2; // used for circle-based collision tests vs. the Boss
        this.color = '#33ccff';

        // --- Encounter-driven stats (set via applyStats from the progression matrix) ---
        this.maxHp = 50;
        this.hp = this.maxHp;
        this.maxSpeed = 3.5;       // top horizontal pursuit speed for this encounter
        this.attackDamage = 8;     // damage the Hero's WEAPON deals to the Boss

        // Abilities unlocked for this encounter (e.g. "dash_roll"). Injected at spawn.
        this.abilities = new Set();

        // Collision half-extents (used for AABB ground/world resolution in main.js,
        // and now for the Hero's own spacing / dash-cancel math).
        this.halfWidth = this.size / 2;
        this.halfHeight = this.size / 2;

        // --- Velocity & platformer physics ---
        this.velocityX = 0;
        this.velocityY = 0;
        this.gravity = 0.9;
        this.isGrounded = false; // set by ground collision in main.js each frame
        this.facing = 1;         // last horizontal direction faced (+1 right, -1 left)

        // --- Movement FSM (dash_roll, unlocked at encounter 5) ---
        this.moveState = MoveState.WALKING;
        this.dashCooldown = 0; // frames; counts DOWN, <= 0 means ready
        this._dashTimer = 0;   // frames left in the current windup/burst phase
        this._dashDir = 1;
        this._dashIsDodge = false; // tags an active dash as DEFENSIVE (dodge or back-dash) for FX

        // --- Weapon: telegraphed directional slash (the Hero's own hitbox) ---
        this.attackHitbox = new Hitbox({
            reach: this.radius + ATTACK.REACH_PX,
            width: ATTACK.WIDTH,
            height: ATTACK.HEIGHT,
            duration: ATTACK.DURATION_FRAMES,
            cooldown: ATTACK.COOLDOWN_FRAMES,
            damage: this.attackDamage,
            knockback: ATTACK.KNOCKBACK,
        });
        this._attackWindup = 0;          // frames left in the attack telegraph
        this._repositionAfterAttack = false; // set when a swing ends -> try to peel away next frame

        // --- Dodge i-frames (granted when the Hero rolls away from a Boss slash) ---
        this.iFrames = 0;
        this.iFrameDuration = DODGE.IFRAMES;

        // --- Knockback ---
        // When hit the Hero is briefly stunned and flung away from the Boss so the
        // two bounce apart instead of overlapping and trading damage every frame.
        this.knockbackForce = 11;
        this.knockbackLift = 9;
        this.knockbackFriction = 0.9;
        this.knockbackTimer = 0;       // frames of stun remaining
        this.knockbackDuration = 12;

        // Hit-flash feedback (frames the Hero renders bright white after a hit).
        this.hitFlash = 0;
        this.hitFlashDuration = 8;

        // --- Pixel-art rendering (visual only; never affects physics/AI) ---
        this.anim = new SpriteAnimator(HERO_SPRITES);
        this._spriteTopY = null; // set each draw from the sprite; positions the HP bar
    }

    getCenter() {
        return { x: this.x, y: this.y };
    }

    // Apply the current encounter's stats (from hero_progression_matrix.json).
    // `stats` is a `current_encounter_stats` object: { hp, move_speed, attack_damage }.
    // `abilities` is the encounter's `active_mechanics` list (e.g. ["pathfind_melee","dash_roll"]).
    applyStats(stats, abilities = []) {
        if (stats) {
            this.maxHp = stats.hp;
            this.hp = stats.hp;              // resurrect at full HP for the new encounter
            this.maxSpeed = stats.move_speed;
            this.attackDamage = stats.attack_damage;
        }
        this.abilities = new Set(abilities);
        // Keep the weapon's damage in sync with the (now scaled) attack stat.
        if (this.attackHitbox) this.attackHitbox.damage = this.attackDamage;
    }

    // The full gate the AI checks before committing to a (gap-closing) dash.
    canDash(distToPlayer) {
        return (
            this.abilities.has('dash_roll') &&
            this.dashCooldown <= 0 &&
            this.moveState === MoveState.WALKING &&
            this.isGrounded &&
            distToPlayer > DASH.MIN_RANGE_PX
        );
    }

    _startDash(dir) {
        this._dashDir = dir;
        this.facing = dir;
        this._dashIsDodge = false; // this is the aggressive gap-closer, not a defensive dash
        if (DASH.WINDUP_FRAMES > 0) {
            this.moveState = MoveState.DASH_WINDUP;
            this._dashTimer = DASH.WINDUP_FRAMES;
            this.velocityX = 0; // plant for the telegraph
        } else {
            this._enterBurst();
        }
    }

    _enterBurst() {
        this.moveState = MoveState.DASHING;
        this._dashTimer = DASH.DURATION_FRAMES;
    }

    _endDash() {
        this.moveState = MoveState.WALKING;
        this.dashCooldown = DASH.COOLDOWN_FRAMES;
        // Intentionally do NOT zero velocityX — pursuit naturally eases it back down.
    }

    // --- Weapon attack -------------------------------------------------------

    // Is the weapon physically able to swing right now (ability + cooldown + footing)?
    // Range is checked separately so the spacing logic can reason about "ready but
    // out of range" vs "on cooldown".
    _weaponReady() {
        return (
            this.abilities.has('pathfind_melee') &&
            this.attackHitbox.isReady &&
            this.isGrounded &&
            this.knockbackTimer <= 0
        );
    }

    // Gate the AI checks before committing to a telegraphed slash. `edgeGap` is the
    // edge-to-edge distance to the Boss (boss-size aware), NOT center distance.
    _canAttack(edgeGap) {
        return this._weaponReady() && edgeGap <= ATTACK.GAP_PX;
    }

    _startAttackWindup(dir) {
        this.facing = dir;
        this.velocityX = 0;
        this.moveState = MoveState.ATTACK_WINDUP;
        this._attackWindup = ATTACK.WINDUP_FRAMES;
    }

    _releaseAttack() {
        this.moveState = MoveState.ATTACKING;
        this.attackHitbox.damage = this.attackDamage; // stay encounter-scaled
        this.attackHitbox.trigger();                  // arms the hitbox for its duration
    }

    // --- Defensive back-dash (reposition) -----------------------------------

    // Can the Hero spend its dash on a defensive reposition right now? Shares the
    // dash_roll resource + cooldown with the gap-closer and the dodge.
    _canRepositionDash() {
        return (
            this.abilities.has('dash_roll') &&
            this.dashCooldown <= 0 &&
            this.isGrounded &&
            this.knockbackTimer <= 0
        );
    }

    // A short burst AWAY from the Boss: peels off after a strike, or bails out of
    // contact range. Reuses the dash burst + cooldown but grants NO i-frames
    // (true invulnerability is reserved for tryDodge); this is pure mobility.
    _startRepositionDash(dir) {
        this._dashDir = dir;        // dir points AWAY from the Boss
        this.facing = -dir;         // keep eyes on the Boss while back-dashing
        this._dashIsDodge = true;   // render as a defensive (cyan) burst; exempt from dash-cancel
        this.moveState = MoveState.DASHING;
        this._dashTimer = DASH.REPOSITION_FRAMES;
        this.dashCooldown = DASH.COOLDOWN_FRAMES; // shares the dash cooldown
        this._attackWindup = 0;
    }

    // --- Dodge (reactive defense) -------------------------------------------

    /**
     * Defensive reaction: if the Boss is mid-swing and FACING this Hero (and the
     * dash is available), burst AWAY and gain i-frames to slip the strike. Uses
     * the SAME dash resource as the gap-closer, so it shares the 4s cooldown —
     * meaning the player can BAIT a dodge, then punish freely while it recharges.
     * Called once per frame from main.js's handleCombat (so it can react to the
     * Boss's weapon at range, not just on body overlap).
     *
     * @param {Player} player
     * @returns {boolean} true if a dodge started this frame.
     */
    tryDodge(player) {
        if (!player) return false;
        if (this.moveState !== MoveState.WALKING) return false; // committed states can't dodge
        if (!this.abilities.has('dash_roll')) return false;
        if (this.dashCooldown > 0 || !this.isGrounded || this.knockbackTimer > 0) return false;
        if (this.iFrames > 0) return false; // already dodging

        // Only react to a LIVE Boss slash that is actually aimed at us and close.
        const swing = player.attackHitbox;
        if (!swing || !swing.isActive) return false;
        const bossFacingHero = Math.sign(this.x - player.x) === player.facing;
        if (!bossFacingHero) return false;
        if (Math.abs(this.x - player.x) > DODGE.THREAT_RANGE_PX) return false;

        this._startDodge(player);
        return true;
    }

    _startDodge(player) {
        const awayDir = Math.sign(this.x - player.x) || -this.facing; // bolt away from the Boss
        this.facing = -awayDir;            // keep looking at the Boss while back-dashing
        this._dashDir = awayDir;
        this._dashIsDodge = true;
        this.moveState = MoveState.DASHING;
        this._dashTimer = DASH.DURATION_FRAMES;
        this.dashCooldown = DASH.COOLDOWN_FRAMES; // shares the dash cooldown
        this.iFrames = this.iFrameDuration;       // invulnerable through the dodge
        this._attackWindup = 0;                   // cancel any pending attack telegraph
    }

    /**
     * Per-frame AI + physics.
     *
     * @param {number} targetX  Boss center x.
     * @param {number} targetY  Boss center y.
     * @param {object} [targetBounds] Boss AABB source — the Player, or
     *        { halfWidth, halfHeight } (radius accepted too). Strongly recommended:
     *        without it, spacing + the dash-cancel fall back to a massive-boss
     *        estimate (still functional, just not pixel-accurate).
     */
    update(targetX, targetY, targetBounds = null) {
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.iFrames > 0) this.iFrames--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        this.attackHitbox.tick(); // advance the weapon's active/cooldown timers

        // Resolve the Boss's AABB half-extents (see param doc above).
        const bossHalfWidth =
            (targetBounds && Number.isFinite(targetBounds.halfWidth)) ? targetBounds.halfWidth :
            (targetBounds && Number.isFinite(targetBounds.radius)) ? targetBounds.radius :
            SPACING.BOSS_HALFWIDTH_FALLBACK;
        const bossHalfHeight =
            (targetBounds && Number.isFinite(targetBounds.halfHeight)) ? targetBounds.halfHeight :
            (targetBounds && Number.isFinite(targetBounds.radius)) ? targetBounds.radius :
            SPACING.BOSS_HALFHEIGHT_FALLBACK;

        if (this.knockbackTimer > 0) {
            // Stunned by a hit: ride out the knockback velocity (with friction)
            // instead of pursuing, so the Hero visibly bounces off the Boss. A hit
            // also interrupts any in-progress dash OR attack.
            this.knockbackTimer--;
            this.velocityX *= this.knockbackFriction;
            this.moveState = MoveState.WALKING;
            this._dashTimer = 0;
            this._attackWindup = 0;
            this._repositionAfterAttack = false;
        } else {
            // Horizontal pursuit along the ground toward the Boss, driven by the
            // movement FSM. Pursuit speed is capped at the encounter's maxSpeed;
            // the dash (encounter 5+) bursts past that cap to close large gaps.
            const dx = targetX - this.x;
            const dist = Math.abs(dx);
            const dirToPlayer = Math.sign(dx) || 1;
            const awayDir = -dirToPlayer;

            // EDGE-TO-EDGE gap between the two bodies (negative => overlapping).
            // EVERY spacing decision uses this, so the Hero keeps a true body gap
            // regardless of how massive the Boss is.
            const edgeGap = dist - this.halfWidth - bossHalfWidth;

            switch (this.moveState) {
                case MoveState.WALKING: {
                    // Just landed a strike? Try to peel away with a defensive dash
                    // to reset spacing (REQUIREMENT 3: dash away after a strike).
                    if (this._repositionAfterAttack) {
                        this._repositionAfterAttack = false;
                        if (edgeGap < SPACING.HOVER_GAP && this._canRepositionDash()) {
                            this._startRepositionDash(awayDir);
                            break;
                        }
                    }

                    if (edgeGap < SPACING.MIN_GAP) {
                        // CONTACT DANGER: the Boss is right on top of us. Bail —
                        // dash away if the roll is up, otherwise hard backpedal.
                        // Never stand here trading body-contact damage.
                        this.facing = dirToPlayer; // keep eyes on the Boss while retreating
                        if (this._canRepositionDash()) {
                            this._startRepositionDash(awayDir);
                        } else {
                            this.velocityX = awayDir * this.maxSpeed;
                        }
                    } else if (this._weaponReady()) {
                        // Off cooldown: this is the only time the Hero willingly
                        // moves INTO the Boss, and only up to strike range.
                        if (edgeGap <= ATTACK.GAP_PX) {
                            this._startAttackWindup(dirToPlayer); // in range -> blink-strike
                        } else if (this.canDash(dist)) {
                            this._startDash(dirToPlayer);         // big gap -> dash in (auto-cancels at range)
                        } else {
                            this.facing = dirToPlayer;
                            this.velocityX = dirToPlayer * this.maxSpeed; // walk in to strike range
                        }
                    } else {
                        // Weapon recovering: maintain spacing, never chase.
                        if (edgeGap < SPACING.HOVER_GAP) {
                            // Inside the comfort bubble -> back off to a safe standoff
                            // (REQUIREMENT 1: retreat while the attack is on cooldown).
                            this.facing = dirToPlayer;
                            this.velocityX = awayDir * this.maxSpeed * SPACING.RETREAT_SPEED_MULT;
                        } else {
                            // Comfortably spaced -> hold and wait out the cooldown.
                            this.facing = dirToPlayer;
                            this.velocityX = 0;
                        }
                    }
                    break;
                }

                case MoveState.DASH_WINDUP: {
                    this.velocityX = 0; // frozen telegraph
                    this._dashTimer--;
                    if (this._dashTimer <= 0) this._enterBurst();
                    break;
                }

                case MoveState.DASHING: {
                    // OVERRIDE: constant high speed, bypassing the walk cap entirely.
                    // Used for the gap-closer (_dashDir toward), the back-dash and
                    // the dodge (_dashDir away).
                    this.velocityX = this._dashDir * this.maxSpeed * DASH.MULTIPLIER;

                    // SMART DASH CANCEL (REQUIREMENT 3): a gap-CLOSING dash must
                    // never plow into the Boss's body. If the next step would enter
                    // the Boss's AABB — inflated by DASH_STOP_GAP so we halt at
                    // strike range rather than on its body — stop abruptly and end
                    // the dash. Defensive dashes (dodge / back-dash) move away and
                    // are exempt.
                    const closingOnBoss =
                        !this._dashIsDodge && Math.sign(targetX - this.x) === this._dashDir;
                    if (closingOnBoss) {
                        const towardSign = this._dashDir;
                        const stopHalfW = this.halfWidth + bossHalfWidth + SPACING.DASH_STOP_GAP;
                        const limitX = targetX - towardSign * stopHalfW; // closest center-x we allow
                        const nextX = this.x + this.velocityX;
                        const verticallyOverlapping =
                            Math.abs(this.y - targetY) <
                            (this.halfHeight + bossHalfHeight + SPACING.DASH_CANCEL_SKIN);
                        const breached = towardSign > 0 ? (nextX >= limitX) : (nextX <= limitX);

                        if (verticallyOverlapping && breached) {
                            // Clamp exactly to the boundary so the stop is crisp
                            // (no overshoot, no reversal), then cancel the dash.
                            const clamped = limitX - this.x;
                            this.velocityX = towardSign > 0 ? Math.max(0, clamped) : Math.min(0, clamped);
                            this._endDash();
                            break;
                        }
                    }

                    this._dashTimer--;
                    if (this._dashTimer <= 0) this._endDash();
                    break;
                }

                case MoveState.ATTACK_WINDUP: {
                    // Planted telegraph. Facing is LOCKED (set at wind-up start) so
                    // the strike commits to one direction — the Boss can bait it and
                    // slip behind. Releases into the live swing when the timer ends.
                    this.velocityX = 0;
                    this._attackWindup--;
                    if (this._attackWindup <= 0) this._releaseAttack();
                    break;
                }

                case MoveState.ATTACKING: {
                    this.velocityX = 0; // committed to the (very short) swing
                    if (!this.attackHitbox.isActive) {
                        this.moveState = MoveState.WALKING; // swing done -> resume pursuit
                        this._repositionAfterAttack = true; // ...and try to peel away next frame
                    }
                    break;
                }
            }
        }

        this.x += this.velocityX;

        // --- Gravity ---
        this.velocityY += this.gravity;
        this.y += this.velocityY;

        // Keep the slash hitbox glued in front of the Hero after moving.
        this.attackHitbox.reposition(this.x, this.y, this.facing);
    }

    get isDashing() { return this.moveState === MoveState.DASHING; }
    get isDodging() { return this.iFrames > 0 && this.moveState === MoveState.DASHING; }

    /**
     * Take a hit from the Boss and bounce away. Honors the dodge i-frame window:
     * while invulnerable the hit is ignored entirely (this is what makes a dodge
     * actually slip a strike). A landed hit also interrupts any dash or attack.
     *
     * @param {number} amount       damage to apply
     * @param {number} knockbackDir -1 / +1 horizontal push direction (away from
     *                              the Boss); 0 falls back to reversing current travel.
     * @returns {boolean} true if the hit landed, false if blocked by i-frames.
     */
    takeDamage(amount, knockbackDir = 0) {
        if (this.iFrames > 0) return false; // dodging / invulnerable -> ignore the hit

        this.hp = Math.max(0, this.hp - amount);
        this.hitFlash = this.hitFlashDuration;

        // A hit interrupts any dash OR attack in progress.
        this.moveState = MoveState.WALKING;
        this._dashTimer = 0;
        this._attackWindup = 0;
        this.attackHitbox.activeTimer = 0; // cancel a live swing (cooldown still applies)

        // Reverse course away from the attacker and pop slightly upward. The stun
        // timer keeps the pursuit logic from instantly cancelling this velocity.
        const dir = knockbackDir !== 0 ? knockbackDir : -Math.sign(this.velocityX || 1);
        this.velocityX = dir * this.knockbackForce;
        this.velocityY = -this.knockbackLift;
        this.isGrounded = false;
        this.knockbackTimer = this.knockbackDuration;
        return true;
    }

    // Pick the animation clip from the Hero's CURRENT state. Rendering-only:
    // it reads the movement FSM but never writes it.
    _animState() {
        const ms = this.moveState;
        if (ms === MoveState.ATTACKING || ms === MoveState.ATTACK_WINDUP) return { name: 'attack', hold: 3 };
        if (ms === MoveState.DASHING) {
            const defensive = this._dashIsDodge || this.iFrames > 0; // dodge / back-dash
            return defensive ? { name: 'roll', hold: 2 } : { name: 'dash', hold: 3 };
        }
        if (ms === MoveState.DASH_WINDUP) return { name: 'dash', hold: 3 };
        if (!this.isGrounded) return { name: this.velocityY < 0 ? 'jump' : 'fall', hold: 6 };
        if (Math.abs(this.velocityX) > 0.5) return { name: 'run', hold: 4 };
        return { name: 'idle', hold: 12 };
    }

    draw(ctx) {
        // Advance the animation from state (no physics/AI is touched here).
        const { name, hold } = this._animState();
        this.anim.set(name, hold);
        this.anim.tick();
        const frame = this.anim.current();
        if (!frame) return;

        const feetY = this.y + this.halfHeight;   // the sprite stands here
        const flip = this.facing === -1;          // art is drawn facing right
        const dodging = this.iFrames > 0;

        // Tint preserves the old telegraph cues: white hit-flash, and the
        // white/red flicker during the dash wind-up.
        let tint = null;
        if (this.hitFlash > 0) tint = '#ffffff';
        else if (this.moveState === MoveState.DASH_WINDUP) {
            tint = (Math.floor(performance.now() / 60) % 2) ? '#ffffff' : '#e23b3b';
        }

        // Soft contact shadow, only while actually on the ground.
        if (this.isGrounded) {
            SpriteManager.drawShadow(ctx, this.x, feetY, frame[0].length * HERO_PIXEL * 0.7);
        }

        // The Hero sprite. Dodge i-frames render it as a translucent ghost.
        const res = SpriteManager.drawSprite(ctx, frame, this.x, feetY, {
            pixelSize: HERO_PIXEL, flip, tint,
            alpha: dodging ? 0.55 : 1,
        });
        this._spriteTopY = res ? res.originY : null;

        // Keep the combat-readability overlays from the original design.
        if (dodging) this.drawDodgeAura(ctx);
        if (this.moveState === MoveState.ATTACK_WINDUP) this.drawTelegraph(ctx);

        this.drawHealthBar(ctx);
    }

    // A red warning arc in the strike direction that "fills" as the wind-up
    // completes — the player's cue to dodge or punish.
    drawTelegraph(ctx) {
        const progress = 1 - this._attackWindup / ATTACK.WINDUP_FRAMES; // 0..1
        const r = this.radius + 22;
        const spread = Math.PI * 0.5;
        const base = this.facing === 1 ? 0 : Math.PI;
        const a0 = base - spread / 2;
        const a1 = a0 + spread * progress;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.lineWidth = 4;
        ctx.strokeStyle = `rgba(255, 70, 50, ${0.4 + 0.5 * progress})`;
        ctx.shadowBlur = 12;
        ctx.shadowColor = 'rgba(255, 60, 40, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, r, a0, a1);
        ctx.stroke();
        ctx.restore();
    }

    // (The old red/orange crescent drawSwordSwing() was removed — the pixel-art
    //  'attack' animation frames now render the Hero's sword swing.)

    // Cyan aura signalling the Hero's dodge invulnerability window.
    drawDodgeAura(ctx) {
        const pct = this.iFrames / this.iFrameDuration; // 1 -> 0
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = `rgba(120, 240, 255, ${0.25 + 0.5 * pct})`;
        ctx.shadowBlur = 14;
        ctx.shadowColor = 'rgba(120, 240, 255, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, this.radius + 8 + (1 - pct) * 10, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    // Floating HP bar above the Hero so the fight stays readable.
    drawHealthBar(ctx) {
        const barWidth = 44;
        const barHeight = 6;
        const x = this.x - barWidth / 2;
        const y = (this._spriteTopY != null ? this._spriteTopY - barHeight - 6 : this.y - this.size / 2 - 14);
        const pct = Math.max(0, this.hp / this.maxHp);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

        ctx.fillStyle = '#33ccff';
        ctx.fillRect(x, y, barWidth * pct, barHeight);
    }
}
