# Implementation Plan — Reverse Boss Game

## Genre: 2D Side-Scrolling Platformer (with gravity)

> **Design pivot:** The game was originally top-down. It is now a **2D side-scrolling
> platformer with gravity**, in the style of *Hollow Knight*. The Boss (player) and the
> Hero (AI) live on a solid floor, are pulled down by gravity, and the Boss jumps to
> dodge and reposition. Vertical position is physics-driven, not directly controlled.

---

## 1. Controls (`src/core/Input.js`)

- **Move left:** `A` / `←`
- **Move right:** `D` / `→`
- **Jump:** `Space` / `W` / `↑`
- Jump is **edge-detected** (one jump per press; holding does not auto-bounce).
- `isJumpHeld()` is exposed so the Player can support variable jump height.

## 2. Player physics (`src/entities/Player.js`)

- New state: `velocityX`, `velocityY`, `gravity`, `jumpForce`, `isGrounded`.
- Horizontal: acceleration + friction + max-speed cap (player-controlled).
- Vertical: gravity applied every frame; **jump only allowed when `isGrounded`**.
- **Snappy feel (not floaty):**
  - High base `gravity` (`0.9`) and a strong `jumpForce` (`17`).
  - Falling gravity is amplified (`gravity * 1.4`).
  - Variable jump height: releasing jump mid-rise halves upward velocity.

## 3. Enemy physics & AI (`src/entities/Enemy.js`)

- New state: `velocityX`, `velocityY`, `gravity`, `isGrounded`.
- Affected by gravity like the Boss (no more floating diagonally).
- AI: walk **horizontally** along the ground toward the Boss's X position.
- `targetY` is accepted but reserved for future vertical pursuit (jumping).

## 4. World & collision (`src/main.js`)

- `WORLD_WIDTH` defines a wide arena; `floor` is a solid rectangle across the bottom.
- `resolveFloorCollision(entity)` — basic **AABB ground detection**: when an entity's
  feet reach the floor surface, snap to it, zero `velocityY`, set `isGrounded = true`.
- `clampToWorld(entity)` — invisible side walls keep entities within the arena.
- Player spawns mid-air and falls onto the floor; the Hero spawns on the floor to one
  side of the Boss.

## 5. Camera (`src/core/Camera.js`)

- Follows the Boss **horizontally** (lerp), clamped to the world width.
- Anchors the floor low on screen (stable horizon) so jumps don't bob the view.

---

## Out of scope for this pivot (existing backlog)

- Wire `handleCollision()` to the real `hero_progression_matrix.json` (still mock data).
- Hero stat scaling across the 30 encounters.
- Mechanic system (dash, projectiles, etc.).
- Hero jumping / vertical pursuit.
- Multiple platforms (only a single floor exists today).
