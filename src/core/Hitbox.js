// src/core/Hitbox.js
// ---------------------------------------------------------------------------
// A directional, temporary weapon hitbox — the core primitive of the weapon-
// based combat model. It is OWNED and driven by an entity (the Boss or the
// Hero): the owner ticks it every frame, repositions it in front of itself
// (in the facing direction), and `trigger()`s it to start a swing.
//
// As of the combo overhaul a Hitbox can ALSO act as a free MOVING PROJECTILE
// (the Boss's Dark Flame) or a stationary AoE burst (the Finisher explosion /
// the air-dive shockwave). Those set velocityX / velocityY and/or a `kind` tag
// and are driven with update() instead of being glued to an owner — see Player.
//
// Conventions match the rest of the game:
//   - Frame-based timing: durations / cooldowns are counted in frames (~60fps),
//     NOT seconds — exactly like Enemy's dash tuning.
//   - (x, y) is the CENTER of the hitbox.
//   - Overlap tests are AABB against entities exposing {x, y, halfWidth, halfHeight}
//     (the same shape main.js's entitiesIntersect() already relies on).
//
// One swing damages a given target at most once: `_hitSet` is cleared on every
// trigger() and the collision resolver in main.js marks targets via
// hasHit()/markHit(), so a multi-frame active window can't re-hit each frame.
// ---------------------------------------------------------------------------

export class Hitbox {
    /**
     * @param {object}  cfg
     * @param {number}  cfg.reach        distance from the owner's center to the hitbox center
     * @param {number}  cfg.width        hitbox width  (full extent)
     * @param {number}  cfg.height       hitbox height (full extent)
     * @param {number}  cfg.duration     active frames per swing (also the projectile lifetime)
     * @param {number}  cfg.cooldown     frames before it can fire again
     * @param {number}  cfg.damage       damage dealt on a connect (can be overwritten per-swing)
     * @param {number} [cfg.knockback]   horizontal knockback applied on a connect
     * @param {number} [cfg.velocityX]   per-frame X velocity for a free projectile (0 = glued)
     * @param {number} [cfg.velocityY]   per-frame Y velocity for a free projectile (0 = glued)
     * @param {boolean}[cfg.isFearStrike] tag a heavy strike so combat routes it to the
     *                                    Hero's fear reaction instead of plain damage
     * @param {string} [cfg.kind]        renderer tag: 'flame' | 'explosion' | 'shockwave' | null
     */
    constructor({
        reach, width, height, duration, cooldown, damage,
        knockback = 0, velocityX = 0, velocityY = 0, isFearStrike = false, kind = null,
    }) {
        this.reach = reach;
        this.width = width;
        this.height = height;
        this.halfWidth = width / 2;
        this.halfHeight = height / 2;

        this.duration = duration;
        this.cooldown = cooldown;
        this.damage = damage;
        this.knockback = knockback;

        // Runtime timers (frames).
        this.activeTimer = 0;   // > 0 while the swing is live
        this.cooldownTimer = 0; // > 0 while recharging

        // Current world placement (center). Refreshed each frame by reposition()
        // for glued hitboxes, or integrated by update() for free projectiles.
        this.x = 0;
        this.y = 0;
        this.facing = 1;

        // --- Moving-projectile / AoE support (combo overhaul) -------------------
        // Non-zero velocity makes this a FREE projectile: update() integrates it
        // every frame instead of it sticking to an owner. A glued melee hitbox
        // leaves these at 0 and is re-placed via reposition().
        this.velocityX = velocityX;
        this.velocityY = velocityY;
        // Renderer dispatch tag (the entity draws plain melee hitboxes via its own
        // sprite frames, so those stay null).
        this.kind = kind;
        // REQUIREMENT: when true, a connect is routed to the Hero's fear reaction
        // (enemy.triggerFear) by main.js instead of dealing ordinary damage.
        this.isFearStrike = isFearStrike;

        // Targets already damaged by the CURRENT swing (cleared on trigger()).
        this._hitSet = new Set();
    }

    get isActive() { return this.activeTimer > 0; }
    get isReady() { return this.cooldownTimer <= 0 && this.activeTimer <= 0; }

    /** True once a velocity has been set — i.e. this is a free-moving projectile. */
    get hasVelocity() { return this.velocityX !== 0 || this.velocityY !== 0; }

    /** 0..1 — how far through the active swing we are (0 at start, 1 at end). */
    get swingProgress() {
        return this.duration > 0 ? 1 - this.activeTimer / this.duration : 1;
    }

    /** Alias of swingProgress; reads better when driving projectile expand/fade FX. */
    get lifeProgress() { return this.swingProgress; }

    /**
     * Re-tune this hitbox in place. The 4-hit combo reuses one melee Hitbox and
     * reshapes it per hit (different reach / size / damage), so this keeps the
     * half-extents in sync without allocating a new object. Only provided fields
     * change.
     */
    configure(cfg = {}) {
        if (cfg.reach != null) this.reach = cfg.reach;
        if (cfg.width != null) { this.width = cfg.width; this.halfWidth = cfg.width / 2; }
        if (cfg.height != null) { this.height = cfg.height; this.halfHeight = cfg.height / 2; }
        if (cfg.duration != null) this.duration = cfg.duration;
        if (cfg.cooldown != null) this.cooldown = cfg.cooldown;
        if (cfg.damage != null) this.damage = cfg.damage;
        if (cfg.knockback != null) this.knockback = cfg.knockback;
        if (cfg.velocityX != null) this.velocityX = cfg.velocityX;
        if (cfg.velocityY != null) this.velocityY = cfg.velocityY;
        return this;
    }

    /**
     * Start a swing. Returns success.
     * @param {boolean} [force] ignore the cooldown/active gate. The Boss combo FSM
     *        controls its own cadence, so each chained hit force-fires regardless
     *        of the per-hitbox cooldown. The default (false) keeps the old
     *        cooldown-gated behaviour for anything that still relies on it.
     */
    trigger(force = false) {
        if (!force && !this.isReady) return false;
        this.activeTimer = this.duration;
        this.cooldownTimer = this.cooldown;
        this._hitSet.clear();
        return true;
    }

    /** Advance timers one frame (position-independent). Used by glued melee hitboxes. */
    tick() {
        if (this.cooldownTimer > 0) this.cooldownTimer--;
        if (this.activeTimer > 0) this.activeTimer--;
    }

    /**
     * Per-frame driver for a FREE projectile / AoE: if it has a velocity it MOVES
     * INDEPENDENTLY (integrating velocityX / velocityY) rather than sticking to an
     * owner, then ages its timers. A velocity-less burst (explosion / shockwave)
     * simply sits still and times out. Glued melee hitboxes don't call this —
     * their owner calls tick() + reposition() instead, so timers are never
     * double-counted.
     */
    update() {
        if (this.hasVelocity) {
            this.x += this.velocityX;
            this.y += this.velocityY;
        }
        this.tick();
    }

    /** Glue the hitbox to the owner, in front of it along `facing`. */
    reposition(ownerX, ownerY, facing) {
        this.facing = facing;
        this.x = ownerX + facing * this.reach;
        this.y = ownerY;
    }

    /** AABB overlap vs an entity {x, y, halfWidth, halfHeight}. False when inactive. */
    overlaps(entity) {
        if (this.activeTimer <= 0) return false;
        return (
            Math.abs(this.x - entity.x) < this.halfWidth + entity.halfWidth &&
            Math.abs(this.y - entity.y) < this.halfHeight + entity.halfHeight
        );
    }

    hasHit(target) { return this._hitSet.has(target); }
    markHit(target) { this._hitSet.add(target); }

    /** Optional: translucent box showing the active hitbox region (debugging). */
    drawDebug(ctx) {
        if (this.activeTimer <= 0) return;
        ctx.save();
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = this.isFearStrike ? '#7e3fd6' : '#ffffff'; // violet = fear strike
        ctx.fillRect(this.x - this.halfWidth, this.y - this.halfHeight, this.width, this.height);
        ctx.restore();
    }
}
