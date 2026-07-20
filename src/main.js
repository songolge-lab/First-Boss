import { Input } from './core/Input.js';
import { Camera } from './core/Camera.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { UIManager } from './ui/UIManager.js';
import { ThroneRoom } from './environment/ThroneRoom.js';
import { SpriteManager } from './core/SpriteManager.js';
import { PerfMonitor, RENDER_SCALE } from './core/PerfMonitor.js';

const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let width, height;

// --- World / level geometry (2D side-scrolling platformer) ---
const WORLD_WIDTH = 4000;
const floor = {
    x: 0,
    y: 600,            // top surface of the ground (world coordinates)
    width: WORLD_WIDTH,
    height: 800        // tall enough that no void shows beneath it
};

// --- Cinematic timing (seconds) ---
const PAN_DURATION = 1.1; // seconds per cinematic camera pan
const HITSTOP_S = 0.35;   // beat to register the kill before the camera leaves
const NEMESIS_UI_S = 3.0; // focused pause while the Nemesis card is up

// STAGE 8C-5 — DRAGON WRATH screen-treatment strengths (render-only; see draw()).
// The Hero's controller owns the 0..1 RAMPS on the approved clock — these are just
// how strong each one is allowed to get. The dip is deliberately partial so the room
// stays readable, and the flash peak stays under full white so the scene is never
// truly lost even on the whiteout beat.
const DRAGON_WRATH_DIM_MAX = 0.55;      // peak arena value dip
const DRAGON_WRATH_LETTERBOX = 0.075;   // bar height as a fraction of the viewport
const DRAGON_WRATH_FLASH_MAX = 0.88;    // peak white-flash alpha

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    // Internal drawing buffer only; CSS size (styles/style.css: 100vw/100vh)
    // is untouched, so RENDER_SCALE never changes the on-screen canvas size —
    // only its pixel fill cost. RENDER_SCALE is always 1 outside ?perf=1.
    canvas.width = Math.round(width * RENDER_SCALE);
    canvas.height = Math.round(height * RENDER_SCALE);
    if (camera) {
        camera.resize(width, height);
        camera.bounds = makeBounds(); // horizon depends on viewport height
    }
}

window.addEventListener('resize', resize);

let input, camera, player, enemy, uiManager, throneRoom;
let lastTime = 0;
let stateTimer = 0; // seconds remaining in the current timed state

// --- Cinematic state machine ---
// World logic (player input, enemy AI, collisions, combat) runs ONLY in PLAYING.
// The camera, the DOM Nemesis overlay, and rendering run every frame in every
// state — that separation lets the camera pan smoothly while gameplay is frozen.
//
//   PLAYING --(enemy.hp<=0)--> ENEMY_DEAD --(hit-stop)--> PAN_TO_ENEMY
//      --(camera arrives)--> NEMESIS_UI --(3s)--> PAN_TO_PLAYER
//      --(camera arrives)--> PLAYING
//   PLAYING --(player.hp<=0)--> GAMEOVER (terminal)
const State = Object.freeze({
    PLAYING: 'PLAYING',
    ENEMY_DEAD: 'ENEMY_DEAD',
    PAN_TO_ENEMY: 'PAN_TO_ENEMY',
    NEMESIS_UI: 'NEMESIS_UI',
    PAN_TO_PLAYER: 'PAN_TO_PLAYER',
    GAMEOVER: 'GAMEOVER',
});

let gameState = State.PLAYING;

// --- Hero progression (driven by hero_progression_matrix.json) ---
let progressionMatrix = null;   // full parsed matrix
let currentEncounterId = 1;     // 1..30; the encounter the Boss is currently fighting

// Resolve relative to this module so it works regardless of where index.html sits.
const MATRIX_URL = new URL('../hero_progression_matrix.json', import.meta.url);

async function loadProgressionMatrix() {
    const res = await fetch(MATRIX_URL);
    if (!res.ok) {
        throw new Error(`Failed to load progression matrix (${res.status} ${res.statusText})`);
    }
    return res.json();
}

// Look up an encounter by id (1-based), clamped to the last entry once maxed out.
function getEncounter(id) {
    const encounters = progressionMatrix.encounters;
    return encounters.find((e) => e.encounter_id === id) || encounters[encounters.length - 1];
}

// --- Camera helpers --------------------------------------------------------

// World Y the camera centers on so the floor stays anchored ~70% down the
// screen (a stable horizon that doesn't bob when the Boss jumps).
function horizonCenterY() {
    return floor.y - height * 0.2;
}

// Lock the camera's vertical center to the horizon (minY === maxY collapses the
// vertical clamp to a fixed point) while clamping X to the world bounds.
function makeBounds() {
    const cy = horizonCenterY();
    return { minX: 0, minY: cy, maxX: WORLD_WIDTH, maxY: cy };
}

// FOLLOW proxy: track the Boss horizontally, hold the stable horizon vertically.
const cameraFollowTarget = {
    getCenter() {
        return { x: player.x, y: horizonCenterY() };
    },
};

async function init() {
    resize();
    input = new Input();
    player = new Player(WORLD_WIDTH / 2, 0);
    player.y = floor.y - player.halfHeight; // rest feet on the floor (no fall-in at load)
    player.isGrounded = true;
    camera = new Camera(width, height, makeBounds());
    uiManager = new UIManager();

    // Procedural Throne Room backdrop. Lock its walking surface to the physics
    // floor (floor.y) and its extent to WORLD_WIDTH so the rendered floor/carpet
    // line up exactly with ground collision — entities never float or sink.
    throneRoom = new ThroneRoom({ worldWidth: WORLD_WIDTH, floorY: floor.y });

    progressionMatrix = await loadProgressionMatrix();
    currentEncounterId = 1;

    spawnEnemy();

    camera.follow(cameraFollowTarget, { snap: true });
    changeState(State.PLAYING);

    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function spawnEnemy() {
    // The Hero always resurrects at the far-left edge of the arena.
    const spawnX = 100;

    enemy = new Enemy(spawnX, 0);
    // STAGE 8C-4 V2 (C3): give the Hero the arena width so Combo A can arena-clamp its
    // forward pillar chain (a render-only world effect with no clampToWorld backstop)
    // and its diagonal-plunge landing target. Set on every (re)spawn; harmless elsewhere.
    enemy.worldWidth = WORLD_WIDTH;
    // Scale the Hero to the current encounter (stats + unlocked abilities) before
    // it enters the arena. active_mechanics carries "dash_roll" from encounter 5 on.
    const encounter = getEncounter(currentEncounterId);
    enemy.applyStats(encounter.current_encounter_stats, encounter.active_mechanics);
    enemy.y = floor.y - enemy.halfHeight; // place feet exactly on the floor

    // A freshly resurrected Hero is never feared — clear any leftover Boss aura.
    if (player && typeof player.setFearAura === 'function') player.setFearAura(0);
}

// AABB ground detection: snap an entity to the floor surface and flag it grounded.
function resolveFloorCollision(entity) {
    const feet = entity.y + entity.halfHeight;
    if (feet >= floor.y && entity.velocityY >= 0) {
        entity.y = floor.y - entity.halfHeight;
        entity.velocityY = 0;
        entity.isGrounded = true;
    } else {
        entity.isGrounded = false;
    }
}

// Keep an entity inside the horizontal world bounds (invisible side walls).
//
// STAGE 7A-1: an entity may opt into a WALL IMPACT reaction via `onWallImpact`.
// The Hero uses it to ricochet off the wall while riding the Boss's harmless
// intimidation barrier (it consumes the impact and keeps its own reflected
// velocity). Returning false — or not defining the hook at all, as the Boss
// does — keeps the original behaviour byte-for-byte: the entity simply stops.
function clampToWorld(entity) {
    const min = entity.halfWidth;
    const max = WORLD_WIDTH - entity.halfWidth;
    if (entity.x < min) {
        entity.x = min;
        if (entity.velocityX < 0) {
            const bounced = typeof entity.onWallImpact === 'function' && entity.onWallImpact(1);
            if (!bounced) entity.velocityX = 0;
        }
    } else if (entity.x > max) {
        entity.x = max;
        if (entity.velocityX > 0) {
            const bounced = typeof entity.onWallImpact === 'function' && entity.onWallImpact(-1);
            if (!bounced) entity.velocityX = 0;
        }
    }
}

// STAGE 7A-1 — the Boss's AFK intimidation barrier (tools/redesign/afk_spec.md §4).
// The pressure walls live in `player.afkWaves` as plain {x,y,halfWidth,halfHeight}
// objects, deliberately OUTSIDE player.getActiveHitboxes(), so handleCombat() can
// never see them: the shove is harmless by construction — no damage, no score, no
// combo reward, no kill credit. Each wall pushes the Hero at most once.
function resolveIntimidationBarrier() {
    if (!player.afkWaves || !player.afkWaves.length || !enemy) return;
    for (const wave of player.afkWaves) {
        if (wave.pushedHero || !entitiesIntersect(wave, enemy)) continue;
        wave.pushedHero = true;
        const away = Math.sign(enemy.x - player.x) || wave.dir;
        enemy.applyIntimidationPush(away);
    }
}

// --- state machine ---------------------------------------------------------

const states = {
    [State.PLAYING]: {
        enter() {
            camera.follow(cameraFollowTarget);
            // Drop any jump/dash buffered during the cinematic so the Boss doesn't
            // auto-act the instant control returns.
            input.consumeJump();
            input.consumeDash();
            // The AFK clock only runs while the player actually has control, so a
            // long cinematic can never bank inactivity frames toward the trigger —
            // nor strand a live intimidation state across the Nemesis card.
            player.cancelIntimidation();
            if (enemy) enemy.setIntimidated(false);
        },
        update() {
            // Player can only move/jump/dash/attack here: player.update is gated to PLAYING.
            PerfMonitor.start('player update');
            player.update(input);
            PerfMonitor.end('player update');

            // STAGE 7A-1: resolve the Boss's intimidation barrier BEFORE the Hero's
            // update, so the harmless shove is integrated (and can ricochet off a
            // wall in clampToWorld) on the very frame the barrier reaches it.
            resolveIntimidationBarrier();
            enemy.setIntimidated(player.isIntimidating);

            PerfMonitor.start('enemy update');
            enemy.update(player.x, player.y);
            PerfMonitor.end('enemy update');

            // Keep the Boss visually facing the active Hero. Cosmetic only: it
            // drives the sprite flip + void-sword aim and never touches physics
            // or combat. (Our arena has a single live Hero in `enemy`.)
            if (enemy) player.faceHero(enemy.x);

            // Mirror the Hero's 4s Fear Status onto the Boss so its render step can
            // flare a black/red flaming "empowered" aura for exactly that window.
            // Pass 0 when the Hero isn't feared. Cosmetic only.
            if (enemy && typeof player.setFearAura === 'function') {
                player.setFearAura(enemy.fearStatusTimer || 0);
            }

            // Resolve physics against the level after movement.
            resolveFloorCollision(player);
            resolveFloorCollision(enemy);
            clampToWorld(player);
            clampToWorld(enemy);

            // Weapon-based combat, resolved EVERY PLAYING frame. (Changed from the
            // old "only when bodies overlap" gate: weapon hitboxes reach BEYOND the
            // bodies, so combat must be evaluated every frame. handleCombat() does
            // the body-overlap test itself for the contact rule.)
            PerfMonitor.start('combat');
            handleCombat();
            PerfMonitor.end('combat');
        },
    },

    // Transient death beat: a short hit-stop on the corpse, then resurrect the
    // next (stronger) Hero and kick off the pan toward it.
    [State.ENEMY_DEAD]: {
        enter() {
            stateTimer = HITSTOP_S;
        },
        update(dt) {
            stateTimer -= dt;
            if (stateTimer <= 0) {
                // Advance the run (capped at the matrix length).
                const lastId = progressionMatrix.encounters.length;
                currentEncounterId = Math.min(currentEncounterId + 1, lastId);
                // The Boss heals to full at the start of every new round.
                player.hp = player.maxHp;
                spawnEnemy(); // resurrect the stronger Hero, frozen far left

                camera.panTo(
                    { x: enemy.x, y: horizonCenterY() },
                    PAN_DURATION,
                    () => changeState(State.NEMESIS_UI), // fires when the pan arrives
                );
                changeState(State.PAN_TO_ENEMY);
            }
        },
    },

    // World frozen; wait for the camera onComplete (-> NEMESIS_UI).
    [State.PAN_TO_ENEMY]: { update() {} },

    // Focused on the resurrected Hero. Show the Nemesis card (signed stat deltas)
    // from the real matrix entry, hold for NEMESIS_UI_S, then pan back to the Boss.
    [State.NEMESIS_UI]: {
        enter() {
            stateTimer = NEMESIS_UI_S;
            // Drive the overlay from the real matrix entry for the encounter the Hero
            // just resurrected into. On encounter 1 stat_delta / stat_delta_pct are
            // null (no prior diff) — the UIManager renders that case safely.
            const encounter = getEncounter(currentEncounterId);
            uiManager.showEncounterOverlay(encounter, NEMESIS_UI_S * 1000);
        },
        update(dt) {
            stateTimer -= dt;
            if (stateTimer <= 0) {
                uiManager.hideEncounterOverlay();
                camera.panTo(
                    { x: player.x, y: horizonCenterY() },
                    PAN_DURATION,
                    () => changeState(State.PLAYING), // PLAYING.enter() re-attaches follow
                );
                changeState(State.PAN_TO_PLAYER);
            }
        },
    },

    // Wait for the camera onComplete (-> PLAYING). The Boss is frozen, so the pan's
    // end point equals where FOLLOW wants the camera: a seamless handoff.
    [State.PAN_TO_PLAYER]: { update() {} },

    // Terminal: the Boss is dead. draw() renders the game-over banner.
    [State.GAMEOVER]: { update() {} },
};

function changeState(next) {
    const prev = gameState;
    if (states[prev] && states[prev].exit) states[prev].exit();
    gameState = next;
    if (states[next] && states[next].enter) states[next].enter();
}

function gameLoop(timestamp) {
    PerfMonitor.frameStart(timestamp);

    // Permanent VFX quality: in auto mode this watches the real frame cadence
    // during live gameplay (PLAYING only) and latches to lite VFX on weak
    // devices. Draw-only side effect — it never touches the simulation below.
    PerfMonitor.vfxAutoTick(timestamp, gameState === State.PLAYING);

    let dt = (timestamp - lastTime) / 1000; // seconds
    lastTime = timestamp;
    dt = Math.min(dt, 1 / 30); // clamp so a backgrounded tab can't produce a huge step

    PerfMonitor.start('update');
    states[gameState].update(dt); // world only advances in PLAYING
    camera.update(dt);            // ALWAYS — this is what animates the cinematic pans
    throneRoom.update(dt);        // ALWAYS — torch flicker / embers keep breathing
    PerfMonitor.end('update');

    PerfMonitor.start('render');
    draw();
    PerfMonitor.end('render');

    PerfMonitor.frameEnd();
    requestAnimationFrame(gameLoop);
}

// AABB overlap test using each entity's collision half-extents.
function entitiesIntersect(a, b) {
    return Math.abs(a.x - b.x) < a.halfWidth + b.halfWidth &&
           Math.abs(a.y - b.y) < a.halfHeight + b.halfHeight;
}

// Weapon-based, ASYMMETRICAL combat. Resolved every PLAYING frame.
//
//   (a) Boss weapon hitbox  vs Hero body  -> Hero takes damage.
//   (b) Hero weapon hitbox  vs Boss body  -> Boss takes damage.
//   (c) Boss body           vs Hero body  -> ONLY the Hero takes contact damage;
//                                            the Boss is IMMUNE to body contact.
//
// Each swing damages a given target at most once (Hitbox._hitSet via hasHit/
// markHit). The Hero's dodge i-frames and the Boss's post-hit i-frames gate
// their respective incoming hits, so a multi-frame swing or a sustained body
// overlap can't drain HP every frame.
function handleCombat() {
    // Let the Hero react to the Boss's swing FIRST, so a well-timed dodge (which
    // grants i-frames) can slip the strike on the same frame it would land.
    enemy.tryDodge(player);

    let enemyTookWeaponHit = false;

    // (a) ALL of the Boss's active hitboxes vs the Hero's body. This spans the
    //     4-hit combo's melee swing AND every spawned hitbox: the Dark Flame
    //     projectile (Hit 3), the Finisher explosion (Hit 4), the air-dive
    //     shockwave, and the fully-charged ground LASER BEAM. Each swing /
    //     projectile damages the Hero at most once (markHit).
    //
    //     FEAR ROUTING: the Fear Strike is now SPECIFICALLY the FULLY-CHARGED
    //     air-dive shockwave. A normal (uncharged) dive's shockwave has
    //     isFearStrike === false, so it deals damage WITHOUT fear. Because we test
    //     isFearStrike on whichever hitbox actually connects (below), fear fires
    //     ONLY on the charged version — no extra branching needed here.
    for (const hb of player.getActiveHitboxes()) {
        if (!hb.overlaps(enemy) || hb.hasHit(enemy)) continue;

        const dir = Math.sign(enemy.x - hb.x) || player.facing; // push Hero away from the strike

        // If the Hero's dodge i-frames (or a fresh parry's i-frames) block it,
        // takeDamage returns false and we DON'T mark it, so it can still connect
        // later in its active window.
        if (enemy.takeDamage(hb.damage, dir)) {
            hb.markHit(enemy);
            enemyTookWeaponHit = true;

            // A Fear Strike doesn't JUST deal damage; it ALSO kicks off the
            // Hero's fall-down stun. ONLY the fully-charged air-dive shockwave
            // carries isFearStrike === true (the normal dive does not), so this
            // is the single gate that distinguishes the charged version.
            // (triggerFear nullifies itself if the Hero just parried / is
            // i-framed, so a parried Fear Strike won't stun.)
            if (hb.isFearStrike === true && typeof enemy.triggerFear === 'function') {
                enemy.triggerFear();
            }
        }
    }

    // (b) ALL of the Hero's active hitboxes vs the Boss's body -> Boss takes
    //     damage + knockback. This now spans EVERY offensive box the Hero
    //     exposes via getActiveHitboxes():
    //         * the 4-hit melee combo  (the shared attackHitbox, reshaped per hit)
    //         * the aerial pogo down-strike (also the shared attackHitbox)
    //         * the 3-stage Light Wave PROJECTILES (enemy.projectiles)
    //         * the MASSIVE parry COUNTER burst (the shared attackHitbox, centred)
    //     Mirrors (a): each box connects at most once (markHit), and the Boss's
    //     post-hit i-frames gate its incoming hits so a multi-frame wave / counter
    //     can't drain HP every frame. (Falls back to the lone melee hitbox if an
    //     older Enemy build without getActiveHitboxes() is loaded.)
    const heroHitboxes = typeof enemy.getActiveHitboxes === 'function'
        ? enemy.getActiveHitboxes()
        : [enemy.attackHitbox];

    for (const hb of heroHitboxes) {
        if (!hb || !hb.overlaps(player) || hb.hasHit(player)) continue;
        const dir = Math.sign(player.x - hb.x) || -enemy.facing; // push Boss away from the hit
        if (player.takeDamage(hb.damage, dir)) {
            hb.markHit(player);
        }
    }

    // (c) Body-vs-body -> ONLY the Hero takes contact damage; the Boss is immune
    // (it is NEVER passed to a takeDamage call here). Gated by the Hero's knockback
    // / i-frames, and skipped if the Boss's slash already hit this frame, so a
    // sustained overlap can't stack with the weapon hit or drain HP every frame.
    //
    // STAGE 8C-4 V2 (C4): a Hero running Combo A ignores THIS body-contact path only
    // (isBodyContactImmune) — the collision deals no damage and cannot interrupt the
    // combo. This is deliberately the ONLY path gated: the weapon / projectile paths
    // (a) above are untouched, so Boss strikes, projectiles, charges, lasers and
    // explosions still damage the Hero and interrupt Combo A exactly as before.
    if (!enemyTookWeaponHit &&
        !enemy.isBodyContactImmune &&
        enemy.knockbackTimer <= 0 &&
        enemy.iFrames <= 0 &&
        entitiesIntersect(player, enemy)) {
        const dir = Math.sign(enemy.x - player.x) || player.facing;
        enemy.takeDamage(player.contactDamage, dir);
    }

    // Resolve the outcome. Landing the killing blow wins the encounter for the
    // Boss even if the same exchange would have been lethal.
    if (enemy.hp <= 0) {
        handleEnemyDefeated();
    } else if (player.hp <= 0) {
        handleGameOver();
    }
}

// The Hero died: hand off to the cinematic state machine, which plays the
// hit-stop, resurrects a stronger Hero, and rolls the Nemesis overlay.
function handleEnemyDefeated() {
    // STAGE 8C-5 — DRAGON WRATH must NOT survive the Hero's death. Force the cleanup
    // here (rather than waiting for spawnEnemy() to replace the Enemy) so the corpse
    // never holds a darkened arena, a stuck flash or a giant sword through the
    // hit-stop, the camera pan and the Nemesis card. cleanup() is idempotent.
    if (enemy && enemy._dragonWrath) enemy._dragonWrath.cleanup();
    // STAGE 8C-4 — same for Combo A: the corpse must not carry the corridor bed, the
    // pillar chain, the reform halo or a gravity override through the death cinematic.
    // Landed hits already tear it down via takeDamage(); this is the idempotent backstop.
    if (enemy && enemy._comboA) enemy._comboA.cleanup();
    changeState(State.ENEMY_DEAD);
}

// The Boss died: stop the simulation. draw() renders the game-over banner.
function handleGameOver() {
    // Same reasoning on the other outcome: the simulation stops here, so a Dragon
    // Wrath caught mid-charge would freeze its screen treatment over the game-over
    // banner forever. Tear it down before the terminal state.
    if (enemy && enemy._dragonWrath) enemy._dragonWrath.cleanup();
    // STAGE 8C-4 — and Combo A, which the Boss's death does NOT interrupt (nothing calls
    // enemy.takeDamage here). Without this the simulation stops mid-sequence and the
    // still-`active` controller freezes its pillar chain / corridor / reform residue over
    // the game-over banner for good, with the Hero's gravity still overridden to 0.
    if (enemy && enemy._comboA) enemy._comboA.cleanup();
    changeState(State.GAMEOVER);
}

function draw() {
    // RENDER_SCALE (?perf=1&renderScale=0.5) shrinks the internal buffer
    // (see resize()) without touching CSS size. This single outer transform
    // maps every subsequent draw call below — camera/world transform,
    // entities, screen-space overlays — from logical width/height pixels
    // down into the smaller buffer, so nothing downstream needs to know
    // about RENDER_SCALE. No-op (identity) when RENDER_SCALE === 1.
    ctx.save();
    if (RENDER_SCALE !== 1) ctx.scale(RENDER_SCALE, RENDER_SCALE);

    // Throne Room paints its own full-screen backdrop + world-locked scene. We
    // defer its vignette (skipVignette) so it lands AFTER the entities, letting
    // the Boss/Hero sink into the same edge shadow as the room. It times its
    // own 'render clear/background' (backdrop) and 'throneRoom render' (the
    // rest) subsections internally.
    // Dev-only (?perf=1&skip=throneRoom): skip the whole backdrop/scene draw to
    // isolate whether it's the FPS culprit. Draw-only — never touches physics.
    if (!PerfMonitor.shouldSkip('throneRoom')) {
        throneRoom.render(ctx, camera, width, height, { skipVignette: true });
    }

    // STAGE 8C-5 — DRAGON WRATH arena darkening (approved layering contract layer 1).
    // Drawn AFTER the arena and BEFORE the camera transform + entities, so it dips the
    // value of the background / panorama / masonry ONLY: the Hero, the transformed
    // blade, the radiance streamers, the flash and the giant sword are all drawn after
    // this and read BRIGHT against the darkened room. A value dip, not an opaque wash —
    // every important silhouette survives it. Fully render-only, and it lifts itself
    // (the fx object is derived from the live sequence, so it is null the moment
    // Dragon Wrath ends, is interrupted, dies or is reset).
    const wrathFx = enemy ? enemy.dragonWrathScreenFx : null;
    if (wrathFx && wrathFx.dim > 0) {
        ctx.fillStyle = `rgba(6, 5, 9, ${(wrathFx.dim * DRAGON_WRATH_DIM_MAX).toFixed(3)})`;
        ctx.fillRect(0, 0, width, height);
    }

    PerfMonitor.start('camera transform setup');
    ctx.save();
    camera.applyTransform(ctx);
    PerfMonitor.end('camera transform setup');

    PerfMonitor.start('enemy draw total');
    if (enemy) enemy.draw(ctx);
    PerfMonitor.end('enemy draw total');

    PerfMonitor.start('player draw total');
    player.draw(ctx);
    PerfMonitor.end('player draw total');

    ctx.restore();

    // Atmosphere over the top of everything, then screen-space overlays.
    // (?perf=1&skip=throneRoom) also skips the vignette, same reasoning as above.
    if (!PerfMonitor.shouldSkip('throneRoom')) {
        throneRoom.drawVignette(ctx, width, height);
    }

    // FEAR STATUS: while the Hero is under the 4s Fear Status, the Boss's dread
    // floods the LEFT/RIGHT edges with roaring black/red flames. Drawn here in
    // SCREEN space -- after the camera transform has been restored -- so the
    // fire walls cover the whole viewport, not the world. Intensity holds at full
    // and fades over the last ~0.4s as the debuff lapses.
    if (enemy && enemy.fearStatusTimer > 0) {
        // Logical width/height (not canvas.width/height): this draws inside
        // the outer RENDER_SCALE transform above, which already maps logical
        // pixels to the (possibly smaller) internal buffer. Using the raw
        // buffer size here would double-apply the scale.
        SpriteManager.drawFearScreenEffect(ctx, width, height, {
            intensity: Math.min(1, enemy.fearStatusTimer / 24),
        });
    }

    // STAGE 7A-2C — the AFK intimidation "curse-pressure" darkening (afk2_spec §A).
    // Screen space: cursed tongues, void-folds, side pressure and drifting petals
    // press in from every edge (corners deepest, where they overlap), while the
    // centre and the whole combat band stay readable. `cursePhase` breathes the
    // edges on the state's own clock; the ramp in/out rides player.afkVignette.
    if (player.afkVignette > 0) {
        SpriteManager.drawIntimidationVignette(ctx, width, height, {
            intensity: player.afkVignette,
            phase: player.cursePhase,
        });
    }

    // STAGE 8C-5 — the rest of the DRAGON WRATH screen treatment, in SCREEN space
    // after the camera transform has been restored (so it frames the viewport, not the
    // world). Two parts, both strictly bounded by the approved clock:
    //   LETTERBOX  the thin cinematic bars from the bigsword reference frame, riding
    //              the same ramp as the value dip. Deliberately NOT full-height UI
    //              chrome — they frame the shot and retract with the darken.
    //   FLASH      the strong white/white-gold beat at tick 154. The pixel-art burst
    //              grid is drawn in world space by the Hero (behind the giant sword);
    //              THIS is the screen-wide beat that gives it its punch. It is <= 6
    //              ticks with <= 2 at full, and its own ramp guarantees it CLEARS —
    //              it can never stick and white out the game.
    if (wrathFx) {
        if (wrathFx.letterbox > 0) {
            const bar = Math.round(height * DRAGON_WRATH_LETTERBOX * wrathFx.letterbox);
            ctx.fillStyle = '#060509';
            ctx.fillRect(0, 0, width, bar);
            ctx.fillRect(0, height - bar, width, bar);
        }
        if (wrathFx.flash > 0) {
            ctx.fillStyle = `rgba(255, 253, 244, ${(wrathFx.flash * DRAGON_WRATH_FLASH_MAX).toFixed(3)})`;
            ctx.fillRect(0, 0, width, height);
        }
    }

    if (gameState === State.GAMEOVER) {
        drawGameOver();
    }

    // (?perf=1&skip=perfOverlay): skip drawing the overlay itself, e.g. to check
    // whether the overlay's own draw cost is contributing to a frame drop.
    if (!PerfMonitor.shouldSkip('perfOverlay')) {
        PerfMonitor.renderOverlay(ctx, width, height);
    }

    ctx.restore();
}

// Basic game-over banner shown when the Boss's HP hits zero (polish later).
function drawGameOver() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#33ccff';
    ctx.font = 'bold 56px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER — HERO WINS', width / 2, height / 2);
}

init().catch((err) => {
    console.error('Game failed to start:', err);
    ctx.fillStyle = '#111116';
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = '#ff3366';
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Failed to load progression matrix.', width / 2, height / 2 - 12);
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('Run the local server (npm start) and open via http://localhost:3000', width / 2, height / 2 + 14);
});
