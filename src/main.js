import { Input } from './core/Input.js';
import { Camera } from './core/Camera.js';
import { Player } from './entities/Player.js';
import { Enemy } from './entities/Enemy.js';
import { UIManager } from './ui/UIManager.js';
import { ThroneRoom } from './environment/ThroneRoom.js';
import { SpriteManager } from './core/SpriteManager.js';

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

function resize() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;
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
function clampToWorld(entity) {
    const min = entity.halfWidth;
    const max = WORLD_WIDTH - entity.halfWidth;
    if (entity.x < min) {
        entity.x = min;
        if (entity.velocityX < 0) entity.velocityX = 0;
    } else if (entity.x > max) {
        entity.x = max;
        if (entity.velocityX > 0) entity.velocityX = 0;
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
        },
        update() {
            // Player can only move/jump/dash/attack here: player.update is gated to PLAYING.
            player.update(input);
            enemy.update(player.x, player.y);

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
            handleCombat();
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
    let dt = (timestamp - lastTime) / 1000; // seconds
    lastTime = timestamp;
    dt = Math.min(dt, 1 / 30); // clamp so a backgrounded tab can't produce a huge step

    states[gameState].update(dt); // world only advances in PLAYING
    camera.update(dt);            // ALWAYS — this is what animates the cinematic pans
    throneRoom.update(dt);        // ALWAYS — torch flicker / embers keep breathing
    draw();

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
    //     projectile (Hit 3), the Finisher explosion (Hit 4), and the air-dive
    //     shockwave. Each swing / projectile damages the Hero at most once
    //     (markHit).
    //
    //     The Fear Strike is the air-dive SHOCKWAVE (it lives in
    //     player.projectiles, NOT player.attackHitbox), so isFearStrike is tested
    //     on whichever hitbox actually connects via getActiveHitboxes().
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
            // Hero's fall-down stun. (triggerFear nullifies itself if the Hero
            // just parried / is i-framed, so a parried Fear Strike won't stun.)
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
    if (!enemyTookWeaponHit &&
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
    changeState(State.ENEMY_DEAD);
}

// The Boss died: stop the simulation. draw() renders the game-over banner.
function handleGameOver() {
    changeState(State.GAMEOVER);
}

function draw() {
    // Throne Room paints its own full-screen backdrop + world-locked scene. We
    // defer its vignette (skipVignette) so it lands AFTER the entities, letting
    // the Boss/Hero sink into the same edge shadow as the room.
    throneRoom.render(ctx, camera, width, height, { skipVignette: true });

    ctx.save();
    camera.applyTransform(ctx);

    if (enemy) enemy.draw(ctx);
    player.draw(ctx);

    ctx.restore();

    // Atmosphere over the top of everything, then screen-space overlays.
    throneRoom.drawVignette(ctx, width, height);

    // FEAR STATUS: while the Hero is under the 4s Fear Status, the Boss's dread
    // floods the LEFT/RIGHT edges with roaring black/red flames. Drawn here in
    // SCREEN space -- after the camera transform has been restored -- so the
    // fire walls cover the whole viewport, not the world. Intensity holds at full
    // and fades over the last ~0.4s as the debuff lapses.
    if (enemy && enemy.fearStatusTimer > 0) {
        SpriteManager.drawFearScreenEffect(ctx, canvas.width, canvas.height, {
            intensity: Math.min(1, enemy.fearStatusTimer / 24),
        });
    }

    if (gameState === State.GAMEOVER) {
        drawGameOver();
    }
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
