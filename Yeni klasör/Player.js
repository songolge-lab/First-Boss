// src/entities/Player.js
import { Hitbox } from '../combat/Hitbox.js';

// Sword tuning. Frame-based to match the existing per-frame physics (~60fps).
// Heavy + committed: a real cooldown between slashes so positioning matters
// (in the spirit of the Hollow-Knight-ish "weighty" combat in CLAUDE.md).
const SWORD = Object.freeze({
    REACH_PX: 40,        // hitbox center distance from the Boss center (in facing dir)
    WIDTH: 48,           // hitbox full width
    HEIGHT: 56,          // hitbox full height (a touch taller than the body)
    DURATION_FRAMES: 12, // active frames of the slash (~0.20s)
    COOLDOWN_FRAMES: 38, // ~0.63s between slashes
    DAMAGE: 50,          // carried over from the old contactDamage value
    KNOCKBACK: 10,       // horizontal knockback dealt to whatever it hits
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

        // Directional sword slash (J / Left Click): a transient hitbox spawned in
        // the facing direction. Damage comes from THIS, not from body overlap.
        this.attackHitbox = new Hitbox({
            reach: SWORD.REACH_PX,
            width: SWORD.WIDTH,
            height: SWORD.HEIGHT,
            duration: SWORD.DURATION_FRAMES,
            cooldown: SWORD.COOLDOWN_FRAMES,
            damage: SWORD.DAMAGE,
            knockback: SWORD.KNOCKBACK,
        });
        this._attackQueued = false; // edge-detected attack press, consumed in update()
        this._installAttackInput();

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
    }

    // Self-contained attack input so NO changes to Input.js are required:
    // 'J' on the keyboard, or a left-click on the game canvas, queues one slash.
    // (If you'd rather route this through your Input class for consistency, add an
    //  `consumeAttack()` there and swap _consumeAttack() below to call it.)
    _installAttackInput() {
        if (typeof window === 'undefined') return;
        window.addEventListener('keydown', (e) => {
            if (e.code === 'KeyJ') this._attackQueued = true;
        });
        window.addEventListener('mousedown', (e) => {
            // Left button, and only when the click lands on the canvas (so clicking
            // the DOM Nemesis overlay doesn't trigger a swing).
            if (e.button === 0 && e.target && e.target.tagName === 'CANVAS') {
                this._attackQueued = true;
            }
        });
    }

    _consumeAttack() {
        if (this._attackQueued) { this._attackQueued = false; return true; }
        return false;
    }

    update(input) {
        // --- Tick combat + ability timers (i-frames, hit flash, dash CD, weapon CD/active) ---
        if (this.iFrames > 0) this.iFrames--;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.dashCooldown > 0) this.dashCooldown--;
        this.attackHitbox.tick();

        // --- Track facing from horizontal input (drives the dash AND slash direction) ---
        const dir = input.getHorizontal();
        if (dir !== 0) this.facing = dir;

        // --- Melee slash: spawn a hitbox in the facing direction (off cooldown) ---
        // Allowed in every movement state (including mid-dash) so a dash-slash works.
        if (this._consumeAttack()) {
            this.attackHitbox.trigger();
        }

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

    draw(ctx) {
        // Flash bright white for a few frames right after being hit.
        const flashing = this.hitFlash > 0;
        const fill = flashing ? '#ffffff' : this.color;

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = fill;
        ctx.shadowBlur = 15;
        ctx.shadowColor = fill;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.closePath();

        this.drawSwordSwing(ctx); // golden crescent during an active slash
        this.drawHealthBar(ctx);
    }

    // Golden crescent sword swing, shown while the slash hitbox is active. The
    // crescent sweeps downward through the swing and mirrors with `facing`.
    drawSwordSwing(ctx) {
        const hb = this.attackHitbox;
        if (!hb.isActive) return;

        const t = hb.swingProgress;                   // 0..1 across the active frames
        const swing = -Math.PI * 0.55 + Math.PI * t;  // sweep ~100°, top -> bottom
        const pop = Math.sin(Math.PI * t);            // fade in/out at the extremes

        const outerR = this.radius + 38;
        const innerR = this.radius + 14;
        const halfArc = Math.PI * 0.30;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(this.facing, 1); // mirror to the facing direction
        ctx.rotate(swing);
        ctx.globalAlpha = 0.35 + 0.65 * pop;

        const grad = ctx.createRadialGradient(0, 0, innerR, 0, 0, outerR);
        grad.addColorStop(0, 'rgba(255, 210, 40, 0.10)');
        grad.addColorStop(1, 'rgba(255, 232, 120, 0.95)');

        // Crescent body (annular sector).
        ctx.beginPath();
        ctx.arc(0, 0, outerR, -halfArc, halfArc);
        ctx.arc(0, 0, innerR, halfArc, -halfArc, true);
        ctx.closePath();
        ctx.shadowBlur = 20;
        ctx.shadowColor = 'rgba(255, 200, 50, 0.9)';
        ctx.fillStyle = grad;
        ctx.fill();

        // Bright leading edge of the blade.
        ctx.shadowBlur = 0;
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = 'rgba(255, 255, 230, 0.9)';
        ctx.beginPath();
        ctx.arc(0, 0, outerR, -halfArc, halfArc);
        ctx.stroke();

        ctx.restore(); // restores alpha / shadow / transform
    }

    // Floating HP bar above the Boss (drawn in world space, under the camera transform).
    drawHealthBar(ctx) {
        const barWidth = 56;
        const barHeight = 7;
        const x = this.x - barWidth / 2;
        const y = this.y - this.radius - 18;
        const pct = Math.max(0, this.hp / this.maxHp);

        // Backing plate.
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);

        // Fill, color-coded by remaining health.
        ctx.fillStyle = pct > 0.5 ? '#33ff66' : pct > 0.25 ? '#ffcc33' : '#ff3366';
        ctx.fillRect(x, y, barWidth * pct, barHeight);
    }
}
