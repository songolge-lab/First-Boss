# Reverse Boss Game — General Codebase Audit

## Executive Summary

The repository boots successfully and contains a substantial, coherent Canvas game implementation: progression stats load from the matrix, the Boss/Hero sprite sets are structurally valid, AFK intimidation is carefully isolated from damage, VFX quality selection is monotonic, and Electron uses a narrow preload bridge with sandboxing and context isolation enabled.

The main risk is not rendering stability; it is gameplay integration. Core simulation advances once per `requestAnimationFrame` rather than at a fixed or delta-scaled rate, so gameplay speed changes with display refresh rate. The Hero is also updated without the Boss bounds that its AI explicitly requires, making early melee hits stop outside their real reach. In addition, the progression schedule is bypassed by default-on Hero abilities, Boss combat still includes prohibited body-contact damage and legacy post-hit i-frames, and encounter transitions preserve live Boss attacks/projectiles.

Finding counts:

- **CRITICAL:** 0
- **HIGH:** 8
- **MEDIUM:** 3
- **LOW:** 2
- **NIT:** 2

The game is safe to continue developing after a focused gameplay-integrity pass. Pure asset authoring can continue, but additional state-bound animation/VFX integration should be validated only after the refresh-rate, stale-action, Hero-bounds, and laser-alignment defects are corrected; otherwise visual timing and hit alignment will be judged against unstable mechanics.

## Scope and Validation Performed

Inspected:

- Project contracts and design references: `AGENTS.md`, `claude.md`, `VISUAL_REDESIGN_BIBLE.md`, `implementation_plan.md`, `Hero_Progression_GDD.md`, `AUTO_UPDATE.md`, AFK specifications, locomotion specification, progression matrix, package scripts, and Capacitor configuration.
- Runtime entry and state machine: `src/main.js`.
- Boss input, physics, combat, charge, laser, dash, AFK, animation, VFX, and cleanup: `src/entities/Player.js`.
- Hero progression injection, AI FSM, melee, dash, dodge, magic, parry, pogo, fear, intimidation, animation, and projectiles: `src/entities/Enemy.js`.
- Input, hitboxes, camera, performance/quality selection, sprite rendering, throne-room rendering, UI, and updater UI.
- Electron main process, custom protocol, preload, updater IPC, developer menu, packaging configuration, Capacitor build copy script, and mobile-facing HTML.

Validation performed:

- Parsed all 30 progression entries and verified ordered encounter IDs and the expected unlock schedule.
- Validated all exported Boss/Hero legacy and redesigned sprite frames for uniform row width and palette-valid keys: 46 redesigned Boss frames, 29 redesigned Hero frames, 48 legacy Boss frames, and 34 legacy Hero frames; no structural errors found.
- Syntax-checked 13 browser ES modules and 4 Electron CommonJS modules; all passed.
- Started the game through a local HTTP server and performed a browser smoke test. The title, Canvas, modules, and progression fetch initialized successfully at 1280×720 with no captured console warnings or errors.
- Ran `npm.cmd test`; the command exits with status 1 because the package intentionally defines no test suite (`Error: no test specified`).
- Did not run `build:www` or Electron packaging because both write generated artifacts and this audit was constrained to leave existing project files unchanged.

Limitations:

- No automated gameplay test suite exists, so combat/state findings were established by control-flow and geometry tracing rather than regression tests.
- Electron installer/update behavior and native Capacitor shells were not launched. Their source/configuration was inspected independently.
- Existing user changes were left untouched. At audit time, `src/core/SpriteManager.js`, `src/entities/Enemy.js`, `src/entities/Player.js`, and `src/main.js` were already modified, and the AFK/locomotion design assets were untracked.

## Priority Findings

### [HIGH] Simulation and combat run at display refresh rate

- **Confidence:** High
- **File:** `src/main.js`; `src/entities/Player.js`; `src/entities/Enemy.js`; `src/core/Hitbox.js`
- **Location:** `gameLoop()` around lines 334–357; `Player.update()` around lines 424–653; `Enemy.update()` around lines 884–1205; `Hitbox.tick()` around lines 133–137
- **System:** Frame-rate/update-order dependence
- **Failure scenario:** Run the game on 30 Hz, 60 Hz, and 120/144 Hz displays. At 120 Hz, movement, gravity, attack windows, cooldowns, AFK activation, fear, dash duration, AI decision probability, and projectile travel advance about twice as fast in wall-clock time as at 60 Hz; at 30 Hz they run about half as fast.
- **Technical cause:** `gameLoop()` computes and clamps `dt`, but the live `PLAYING` state calls `player.update(input)` and `enemy.update(...)` without passing it. Both entities integrate pixels-per-frame and decrement frame counters once per animation frame. Hitboxes do the same. There is no fixed-step accumulator.
- **Impact:** Combat balance, AI aggression, jump arcs, 3-second AFK timing, dodge windows, cooldowns, and the stated 30-encounter curves materially change by hardware/display. Per-frame random AI checks also become more likely per second at high refresh rates.
- **Evidence:** `main.js:342–348` computes `dt` but uses it only for the outer state/camera/room; `Player.js:424–653` and `Enemy.js:884–1205` contain per-call increments/integration; `Hitbox.js:133–137` decrements by one per call.
- **Minimal safe fix direction:** Introduce a fixed 60 Hz simulation accumulator (with a bounded catch-up count), or convert all simulation velocities, timers, probabilities, and animation/gameplay clocks to elapsed-time units consistently. Do not mix the two approaches within combat.
- **Reachability:** Current

### [HIGH] Hero AI uses a fake 60px Boss half-width, putting melee outside real reach

- **Confidence:** High
- **File:** `src/main.js`; `src/entities/Enemy.js`
- **Location:** `PLAYING.update()` around `main.js:233–235`; `Enemy.update()` around lines 879–920 and combo movement around lines 1061–1070
- **System:** Hero AI, combat spacing, pogo collision
- **Failure scenario:** In every encounter, the Hero approaches and begins its combo using a 60px Boss half-width even though the actual Boss collision half-width is 20px. The first three melee hits stop at a center distance of at least 79px, while their actual hitboxes require roughly 77px, 79px, and 82px respectively to overlap the real Boss; at minimum, early hits are systematically at/beyond a strict-overlap boundary and commonly whiff. Pogo bounce testing can also succeed against the fake large Boss box before its damaging hitbox touches the real Boss.
- **Technical cause:** `Enemy.update()` explicitly accepts `targetBounds` and documents it as strongly recommended. `main.js` passes only `player.x, player.y`, so `Enemy` falls back to `BOSS_HALFWIDTH_FALLBACK = 60` and `BOSS_HALFHEIGHT_FALLBACK = 90`, while `Player` uses `halfWidth = halfHeight = 20`.
- **Impact:** Hero melee threat, dash stopping, spacing, and pogo behavior disagree with actual collision. This undermines encounter balance and can make animations look mistimed even when their frames are correct.
- **Evidence:** `main.js:234`; `Enemy.js:127–137`, `879–920`, `1061–1070`; `Player.js:148–153`.
- **Minimal safe fix direction:** Pass the live Player (or an exact `{halfWidth, halfHeight}` object) as the third `Enemy.update()` argument, then retune only if playtesting shows the corrected geometry changes intended difficulty.
- **Reachability:** Current

### [HIGH] Progression mechanics are bypassed or not mapped to the matrix

- **Confidence:** High
- **File:** `src/entities/Enemy.js`; `hero_progression_matrix.json`
- **Location:** `FEATURES` around lines 84–94; `applyStats()` around lines 485–505
- **System:** Hero progression and AI capability gating
- **Failure scenario:** Encounter 1 already permits light-wave magic, parry, jump, and pogo even though the matrix schedules ranged projectiles at encounter 20 and does not unlock those default-on IDs at encounter 1. Conversely, matrix mechanics such as telegraph awareness, feint, shield, adaptive pathing, multishot, enrage, and apex predator are stored in `abilities` but have no corresponding implementation/gate in the AI.
- **Technical cause:** `WAVES_DEFAULT`, `PARRY_DEFAULT`, and `JUMP_DEFAULT` are all `true`. `applyStats()` ORs those defaults into its capability flags and checks aliases (`light_wave`, `wave_magic`, etc.) that the supplied matrix never emits. Only `pathfind_melee` and `dash_roll` are directly aligned with current matrix IDs.
- **Impact:** The advertised 30-encounter learning curve does not exist as designed. Early encounters expose advanced attacks, while later milestone banners can announce abilities that do not change behavior.
- **Evidence:** `Enemy.js:84–94`, `485–505`; matrix unlock IDs are `pathfind_melee`, `telegraph_awareness`, `dash_roll`, `feint`, `invuln_shield`, `adaptive_pathing`, `ranged_projectile`, `multishot`, `enrage`, and `apex_predator`.
- **Minimal safe fix direction:** Define a single mapping from matrix mechanic IDs to implemented AI capabilities. Default advanced pillars off, gate ranged/multishot/etc. using the actual matrix names, and explicitly mark unimplemented mechanics rather than silently substituting unrelated abilities.
- **Reachability:** Current

### [HIGH] Boss attacks and projectiles survive Hero death and can enter the next encounter

- **Confidence:** High
- **File:** `src/main.js`; `src/entities/Player.js`
- **Location:** state entries around `main.js:207–321`; `ENEMY_DEAD.enter/update()` around lines 267–288; Player projectile ticking around `Player.js:424–435`
- **System:** Encounter lifecycle and cleanup
- **Failure scenario:** A flame, explosion, shockwave, laser, active sword box, combo phase, dash, charge, or i-frame state is live when it kills the Hero. Gameplay freezes for hit-stop, camera pans, and the Nemesis card, but none of that Boss combat state is cleared. When `PLAYING` resumes several seconds later, the old action continues and its hitbox can damage the freshly spawned Hero. The frozen projectile/VFX also remains visible during the cinematic.
- **Technical cause:** Player timers/projectiles advance only inside `Player.update()`, which is gated to `PLAYING`. `ENEMY_DEAD` heals the Boss and replaces the Hero but does not reset Boss combat state. `PLAYING.enter()` consumes jump/dash buffers and cancels intimidation only.
- **Impact:** A new Hero life can be hit by an attack from the previous life, encounter cinematics can show frozen damaging VFX, and combo/charge state can resume after control returns.
- **Evidence:** `main.js:207–220`, `267–288`, `327–348`; `Player.js:424–435`, `1074–1082`.
- **Minimal safe fix direction:** Add one explicit encounter-boundary reset that cancels active Boss hitboxes/actions and clears or retires projectiles/VFX before spawning the next Hero. Keep persistent stats/cooldowns only if the design explicitly requires them.
- **Reachability:** Current

### [HIGH] Prohibited Boss body-contact damage is still active

- **Confidence:** High
- **File:** `src/main.js`; `src/entities/Player.js`; `AGENTS.md`
- **Location:** `handleCombat()` around `main.js:366–452`; Player constructor around lines 181–201
- **System:** Combat/collision contract
- **Failure scenario:** The Boss touches the Hero without swinging. Once the Hero is not in knockback/i-frames, the Hero takes 50 damage from body overlap. This can kill the Hero and progress the encounter without a weapon strike.
- **Technical cause:** `Player.contactDamage = 50` remains, and `handleCombat()` rule (c) calls `enemy.takeDamage(player.contactDamage, dir)` on body overlap. The current project contract explicitly states mutual/body-contact damage was removed and all damage must come from directional attacks.
- **Impact:** Positioning and weapon timing can be bypassed, the harmless-contact rule is broken, and progression remains partly balanced around an obsolete combat model.
- **Evidence:** `Player.js:185–188`; `main.js:366–376`, `442–452`; current `AGENTS.md` Combat Model.
- **Minimal safe fix direction:** Remove the body-overlap damage branch and the obsolete Boss contact-damage field; keep body overlap non-damaging unless a separately specified displacement rule is added.
- **Reachability:** Current

### [HIGH] Boss dash is not the specified dodge roll and grants no i-frames

- **Confidence:** High
- **File:** `src/entities/Player.js`
- **Location:** constructor around lines 174–180 and 253–261; dash branch around lines 603–617; `takeDamage()` around lines 1095–1128
- **System:** Player defense/combat migration
- **Failure scenario:** The player presses Shift reactively through a Hero sword, wave, pogo, or counter. The Boss moves quickly but remains fully damageable. After being hit, it instead receives the old 30-frame post-hit invulnerability and white flash. A hit during the dash also leaves `dashTimer` running, so remaining dash frames integrate the newly assigned knockback velocity with gravity suppressed.
- **Technical cause:** Starting/maintaining `dashTimer` never assigns i-frames. `takeDamage()` still owns the legacy post-hit i-frame window and does not clear `dashTimer`.
- **Impact:** The primary defensive mechanic described by the current combat contract is absent, player feedback is misleading, and dash-hit interruption produces inconsistent motion.
- **Evidence:** `Player.js:174–180`, `253–261`, `603–617`, `1095–1128`; current `AGENTS.md` Dodge Rolls section.
- **Minimal safe fix direction:** Implement a distinct roll state with a defined i-frame interval and interruption rules, move invulnerability ownership to that state, and deliberately decide whether any short post-hit grace remains. Clear or transition dash/roll state on damage according to that design.
- **Reachability:** Current

### [HIGH] Chest laser visuals and damaging hitbox occupy different vertical bands

- **Confidence:** High
- **File:** `src/entities/Player.js`
- **Location:** `_fireLaser()` around lines 1050–1071; draw anchor calculation around lines 1250–1263; `_drawProjectiles()` around lines 1563–1574
- **System:** Combat hitbox/render alignment
- **Failure scenario:** Fire a fully charged ground laser at a grounded Hero. The 70px-tall damaging AABB is centered at `this.y` (about y=580 when standing on the y=600 floor), spanning roughly y=545–615. The beam is rendered at `_chestY` (roughly y=508 for the 144px Boss), spanning about y=473–543. The visible beam passes above the Hero while an almost non-overlapping lower invisible band deals damage.
- **Technical cause:** The attack creates `beam.y = this.y`, but rendering intentionally substitutes `this._chestY` without moving the hitbox.
- **Impact:** A flagship charged attack can damage where it is not drawn and fail visual collision expectations. This is especially misleading during animation/VFX review.
- **Evidence:** `Player.js:1060–1065`, chest anchor around `1250–1263`, and `1563–1574`.
- **Minimal safe fix direction:** Use one shared chest-origin Y for both hitbox and renderer, then verify the resulting beam thickness against the grounded Hero body and sprite.
- **Reachability:** Current

### [HIGH] Capacitor build has no usable touch controls

- **Confidence:** High
- **File:** `src/core/Input.js`; `src/entities/Player.js`; `index.html`; `capacitor.config.json`
- **Location:** `Input` constructor and `onKey()` around lines 1–46; `_installAttackInput()` around `Player.js:315–338`; `index.html:9–24`
- **System:** Capacitor/mobile platform support
- **Failure scenario:** Package the existing web bundle through Capacitor and launch it on a touch-only phone/tablet. The Canvas renders, but movement, jump, dash, and attack cannot be performed because there are no touch/pointer controls or on-screen control elements.
- **Technical cause:** Movement/jump/dash listen only to keyboard events. Attack listens to keyboard J and mouse down/up. The HTML contains only the Canvas and encounter overlay.
- **Impact:** The advertised mobile target is functionally unplayable without a hardware keyboard/mouse.
- **Evidence:** `Input.js:11–45`; `Player.js:315–338`; `index.html:9–24`; `capacitor.config.json` points at the same web bundle.
- **Minimal safe fix direction:** Add a touch/pointer input layer that feeds the same held/pressed/buffered semantics as keyboard input, including multi-touch combinations, cancellation, and app pause/resume cleanup.
- **Reachability:** Current on mobile

### [MEDIUM] Damage interruption leaves the Boss melee hitbox active after its visual state ends

- **Confidence:** High
- **File:** `src/entities/Player.js`; `src/main.js`
- **Location:** `_resetCombo()` around `Player.js:974–981`; `takeDamage()` around lines 1095–1128; `getActiveHitboxes()` around lines 1074–1082
- **System:** Combat interruption and hitbox cleanup
- **Failure scenario:** The Hero hits the Boss during active combo hit 1 or 2. `takeDamage()` resets the combo, so the attack animation/VFX ends, but the shared `attackHitbox.activeTimer` continues for its remaining frames and remains returned by `getActiveHitboxes()`. It can still damage the Hero while the Boss appears interrupted/idle/hit-flashed.
- **Technical cause:** `_resetCombo()` resets FSM fields but not `attackHitbox.activeTimer`. `takeDamage()` does not clear it either. AFK start explicitly clears the timer, showing that interruption cleanup is expected elsewhere.
- **Impact:** Short-lived invisible/stale melee damage after interruption; inconsistent attack commitment and parry/hit reactions.
- **Evidence:** `Player.js:974–981`, `1074–1082`, `1095–1128`, contrasted with `_startAfk()` at line 699.
- **Minimal safe fix direction:** Centralize attack cancellation and close the melee active window whenever damage interrupts the combo. Do not clear independent already-fired projectiles unless that is separately intended.
- **Reachability:** Current

### [MEDIUM] Focus loss can leave movement, jump, or dash held indefinitely

- **Confidence:** High
- **File:** `src/core/Input.js`; `src/entities/Player.js`; `src/main.js`
- **Location:** Input constructor around lines 2–13; attack blur handler at `Player.js:322–338`; game loop around `main.js:334–357`
- **System:** Input and lifecycle
- **Failure scenario:** Hold A/D, jump, or Shift, then alt-tab, switch apps, or background the mobile WebView before key-up is delivered. Return to the game. The corresponding booleans remain true, causing continuous movement/held jump/dash activity and preventing AFK until the key is pressed/released again.
- **Technical cause:** Only the separately installed attack listeners clear state on `window.blur`. `Input` has no `blur`, `visibilitychange`, pause, or reset handler for `left`, `right`, `jumpHeld`, `jumpBuffer`, `dashHeld`, and `dashBuffer`.
- **Impact:** Stuck controls and stale inactivity state after routine desktop/mobile lifecycle events.
- **Evidence:** `Input.js:2–13`; `Player.js:336–337`; no visibility/pause handler in `main.js`.
- **Minimal safe fix direction:** Add one idempotent `Input.reset()` and invoke it on blur/visibility loss and native app pause. Decide explicitly whether buffers are discarded or restored on resume.
- **Reachability:** Edge case, common lifecycle event

### [MEDIUM] Encounter 30 loops forever while re-reporting encounter-29 deltas

- **Confidence:** Medium
- **File:** `src/main.js`; `hero_progression_matrix.json`
- **Location:** `ENEMY_DEAD.update()` around `main.js:271–287`; `NEMESIS_UI.enter()` around lines 296–304
- **System:** Run completion and UI correctness
- **Failure scenario:** Kill the encounter-30 Hero. `currentEncounterId` clamps to 30, spawns another encounter-30 Hero, and displays encounter 30's stored delta from encounter 29 again, even though stats did not change on this resurrection. Repeating the kill repeats the same false increase indefinitely.
- **Technical cause:** The state machine has no completion state or special max-encounter handling. It always uses the matrix row's precomputed prior-encounter delta, even when the encounter ID did not advance.
- **Impact:** The nominal 30-encounter run has no terminal success path and the Nemesis overlay becomes factually wrong after the cap.
- **Evidence:** `main.js:274–280`, `296–304`; encounter 30's `stat_delta` is defined relative to encounter 29.
- **Minimal safe fix direction:** Define the intended post-30 outcome. If the run ends, transition to a completion state. If apex repeats are intentional, suppress deltas/unlock banners when the ID did not advance and label the repeat explicitly.
- **Reachability:** Edge case, reachable by completing encounter 30

### [LOW] Nemesis UI rounds two-decimal matrix values to one decimal

- **Confidence:** High
- **File:** `src/ui/UIManager.js`; `hero_progression_matrix.json`
- **Location:** `_fmt()` around `UIManager.js:108–112`
- **System:** Progression overlay
- **Failure scenario:** Encounter 5 contains speed 6.32, delta +0.39, and +6.6%. The UI renders speed 6.3 and delta +0.4, obscuring the exact precomputed matrix values.
- **Technical cause:** `_fmt()` rounds every fractional number with `Math.round(n * 10) / 10`, regardless of the matrix field's precision.
- **Impact:** Minor visible mismatch with the stated UI/data contract; speed deltas can appear less precise than the data driving gameplay.
- **Evidence:** `UIManager.js:108–112`; matrix encounters 2–10 use two-decimal move speeds/deltas.
- **Minimal safe fix direction:** Format by field or preserve the supplied decimal precision (speed/delta two decimals, percentages and attack as designed) without recomputing values.
- **Reachability:** Current

### [LOW] Performance VFX tier leaves throne-room flame/ember cost unchanged

- **Confidence:** High
- **File:** `src/environment/ThroneRoom.js`; `src/core/PerfMonitor.js`
- **Location:** `ThroneRoom.update/render()` around lines 182–220; `_flame()` around lines 1045–1057; ember update/draw around lines 1069–1105
- **System:** VFX quality and performance
- **Failure scenario:** Select `?vfxQuality=performance` on a weak device. Fighter VFX shed work, but every visible throne-room flame still creates two radial gradients and uses additive shadow blur every frame, and the full 60-object ember pool continues updating/drawing.
- **Technical cause:** ThroneRoom never reads `isLiteVfx()`/`isPerfVfx()`; quality branching exists only in SpriteManager effects.
- **Impact:** Performance mode may fail to remove a persistent source of Canvas blur/gradient/particle work, limiting the tier's benefit in the same scene it is intended to stabilize.
- **Evidence:** `ThroneRoom.js:182–220`, `1045–1105`; `PerfMonitor.js:40–76` describes quality tiers as shedding expensive Canvas/VFX work.
- **Minimal safe fix direction:** Apply conservative tier gates to environmental flame halo passes and ember count while preserving torch/flame silhouettes. Measure before/after with `?perf=1` to confirm material benefit.
- **Reachability:** Current on lite/performance modes

### [NIT] No automated test command exists

- **Confidence:** High
- **File:** `package.json`
- **Location:** scripts section around lines 6–17
- **System:** Regression safety
- **Failure scenario:** `npm test` always fails with the placeholder message, so timing/state/collision regressions have no repeatable project-level check.
- **Technical cause:** The test script is `echo "Error: no test specified" && exit 1`.
- **Impact:** No current gameplay failure by itself, but high-risk FSM and hitbox changes rely entirely on manual testing.
- **Evidence:** `package.json` test script; audit execution of `npm.cmd test`.
- **Minimal safe fix direction:** Add focused deterministic tests first for hitbox one-hit semantics, encounter resets, matrix ability gates, AFK input peeking, and fixed-step invariance.
- **Reachability:** Development-process risk

### [NIT] Design documents describe contradictory combat/progression states

- **Confidence:** High
- **File:** `Hero_Progression_GDD.md`; `implementation_plan.md`; `AGENTS.md`; comments in `src/main.js` and `src/entities/Player.js`
- **Location:** GDD mechanic table and worked encounter-1 example; implementation-plan backlog; current combat comments near `main.js:366–376`
- **System:** Maintainability/regression risk
- **Failure scenario:** A future change follows the GDD's “Pursuit & Contact Strike”/mutual-contact language while the current project contract requires weapon-only damage, or follows the implementation plan's statement that progression is not integrated even though stats now are.
- **Technical cause:** Older documents and comments were retained after the combat and progression migrations without a clear superseded marker.
- **Impact:** Credible recurrence of contact-damage and progression wiring defects; audit intent is harder to establish.
- **Evidence:** Current `AGENTS.md` prohibits body-contact damage; `Hero_Progression_GDD.md` still specifies it; `implementation_plan.md` calls matrix integration out of scope even though `main.js` loads it.
- **Minimal safe fix direction:** Mark old sections explicitly superseded and identify the current source of truth. Preserve historical rationale, but do not leave contradictory live instructions unqualified.
- **Reachability:** Development-process risk

## Findings by Area

### Gameplay/state machines

- HIGH: Simulation runs at display refresh rate.
- HIGH: Boss actions survive encounter transitions.
- MEDIUM: Encounter 30 has no terminal/repeat-safe handling.
- Boss/AFK phase transitions themselves were traced and appear to exit cleanly on active input.

### Input/AFK

- HIGH: No touch-control path exists for Capacitor.
- MEDIUM: Non-attack input can remain stuck after focus loss.
- AFK activity checks peek at jump/dash buffers rather than consuming them, and `PLAYING.enter()` cancels intimidation after cinematics as intended.

### Combat/collision

- HIGH: Body-contact damage remains active.
- HIGH: Boss dodge-roll i-frames are not implemented; legacy post-hit i-frames remain.
- HIGH: Laser visual and hitbox Y bands disagree.
- MEDIUM: Damage interruption leaves the Boss melee box active.
- Hitbox `_hitSet` correctly limits each attack object to one successful hit per target.

### Hero AI

- HIGH: Missing target bounds corrupt spacing, dash-cancel, melee, and pogo geometry.
- HIGH: Matrix mechanics are bypassed/unimplemented through default-on capability gates.
- Intimidation correctly interrupts active Hero actions, exposes no damaging hitbox, and limits wall ricochet to one bounce per shove.

### Animation/VFX

- HIGH: Laser anchor mismatch is the main gameplay/visual integration defect.
- Sprite frame dimensions, palette keys, clip fallback, save/restore patterns, and AFK matrix-origin anchoring validated successfully.
- The periodic locomotion surge in `walk_spec.md` is not present in the live sprite/runtime code. The spec describes it as a hand-off/in-progress stage, so this audit does not classify its absence as a bug.

### Performance/memory

- LOW: Throne-room torch/ember work ignores lite/performance tiers.
- No unbounded particle arrays were found in live gameplay. Throne embers use a fixed 60-object pool; AFK wave/arc arrays are lifetime-cull bounded; projectile arrays cull inactive objects.
- The AFK screen darkening caches only three phase canvases for the current viewport/tier and replaces the cache on resize/tier change.

### Lifecycle/restart

- HIGH: Encounter transitions retain active Boss combat state.
- MEDIUM: Input is not reset on focus/visibility loss.
- No restart/new-game implementation exists; GAMEOVER is intentionally terminal in the current state machine, so absence of restart cleanup is not separately reported as a live leak.

### Electron/Capacitor/security

- HIGH: Capacitor output is unplayable on touch-only devices.
- Electron keeps `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`; the preload exposes only update status/install/check operations.
- The `app://` handler decodes and resolves request paths, then enforces that the result remains under `APP_ROOT`. No supported path traversal was found.
- Auto-update IPC is narrow and only initialized in packaged builds. No renderer secret/token was found.

### Maintainability

- NIT: No automated tests exist.
- NIT: Old GDD/implementation text conflicts with the current combat contract.

## Should Fix Before More Feature Work

Fix these before adding more combat mechanics or AI/VFX states:

1. Establish refresh-rate-independent simulation.
2. Pass exact Boss bounds into Hero AI and revalidate melee/pogo spacing.
3. Add a real encounter-boundary reset for Boss actions/hitboxes/projectiles.
4. Align the progression gates with actual matrix mechanic IDs.
5. Complete the weapon-only/dodge-roll combat migration.
6. Align the laser hitbox with its chest-origin visual.

Touch controls should block any claim that the Capacitor/mobile build is playable, but they do not block desktop-only visual asset work.

## Safe to Defer

- Exact overlay number formatting.
- Throne-room environmental VFX tier reductions, pending profiler evidence on target hardware.
- Encounter-30 completion/repeat behavior until the desired post-apex design is decided, provided it is resolved before shipping a complete run.
- Documentation/test infrastructure improvements can follow the immediate gameplay-integrity fixes, though both will reduce regression risk substantially.

## NIT / Polish Notes

- `Hero_Progression_GDD.md` and `implementation_plan.md` should be marked historical/superseded where they conflict with the live contract.
- A minimal automated test harness would materially improve confidence in future state-machine changes.

## Positive Findings

- Browser smoke test initialized the Canvas, ES modules, and matrix fetch without console errors.
- Progression contains 30 ordered entries and the expected milestone IDs; live stats and Nemesis data come from the matrix rather than hardcoded mock data.
- All inspected sprite matrices have uniform rows and valid palette keys. Redesigned Boss clips are consistently 46×48; redesigned Hero clips are consistently 30×24.
- AFK intimidation input checks do not consume jump/dash buffers, interruption clears its melee damage window, the pressure barrier is kept outside `getActiveHitboxes()`, and wall ricochet is explicitly single-use.
- Hitboxes maintain per-attack target sets, preventing ordinary multi-frame duplicate damage.
- Player/Hero projectile and AFK arrays are actively culled; throne embers use a fixed pool.
- Canvas helper paths inspected in SpriteManager and ThroneRoom use balanced local save/restore scopes; no concrete global-alpha/composite/transform leak was found.
- Auto VFX quality only downgrades, requires a fresh sustained window for each step, and therefore avoids tier oscillation.
- Electron security defaults are sound: sandbox on, context isolation on, Node integration off, narrow preload bridge, guarded custom-scheme paths, and packaged-only updater initialization.

## Final Recommendation

Pause new combat/AI feature integration for one targeted correctness pass covering fixed-step timing, exact Hero target bounds, encounter reset, matrix ability gating, weapon-only contact rules, dodge-roll ownership, and laser alignment. Pure sprite/environment asset work can continue in parallel, but do not use current gameplay timing or hit feedback as the acceptance baseline until those blockers are resolved.

After that pass, perform a focused follow-up audit at 30/60/120 Hz and add deterministic tests for encounter cleanup, hitbox interruption, AFK buffer handling, and progression gates. Mobile work should be considered incomplete until touch input and app lifecycle reset behavior are implemented.
