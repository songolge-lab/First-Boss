# Hero Combo — "DAYBREAK CHAIN" (Stage 8B-1 hand-off)

Production sheet: `hero_combo_v1.png` (generator `hero_combo_gen.js`, drop-in data
`hero_combo_literal.txt`).
**STATUS: CONCEPT (Stage 8B-1), pending approval. Nothing wired into `src/`.**

The Hero's direct sword combo, redesigned from the basic up-down `attack` swing
into an expressive 4-hit chain, built on the approved **Stage 8B-0 Hero Light
Eclipse** language and the current in-game 30×24 Dawnguard Knight. Strict pixel
art: hard cells, no blur, no gradients — and **ZERO BLUE in the effects** (the
blade keeps its own cold-blue glow: that is the character, not the effect).

Reference translation (inspired, never copied): the sword-attack sheet gave the
rhythm (anticipation glint → shear → **held** hit → follow-through) and the
hold-the-hit-frame law; the knight combat references set the energy bar for
committed, full-body strikes; the 8B-0 sheet supplies every light shape used.

---

## Identity in one line

> The Light Eclipse **rises across the combo** — steel glint → gilded smear →
> radiant lance → full SOLSTICE. The sword stays the star; the light rides it.

## The chain (4 hits, 18 frames)

| # | Name | Hands | Motion | Eclipse level | Frames |
|---|------|-------|--------|---------------|--------|
| H1 | **FIRST LIGHT** | one | descending shear, high-rear → low-front | glint only (≤6 LIGHT px, asserted) | 4 |
| H2 | **GILDED CREST** | one | rising backhand crescent, low-front → overhead | gold W/I/y smear + first rising motes | 4 |
| H3 | **SUNPIERCE** | two | lunging straight **thrust** (breaks the swing rhythm) | radiant lance speed-lines + IMPACT star at the tip | 4 |
| H4 | **SOLSTICE** | two | ground-rear rising **full moon — launcher** | full crescent + big IMPACT + HALO snap + rising motes | 6 |

**Escalation law (asserted in-generator):** LIGHT-key px on the HIT frames grows
strictly H1 < H2 < H3 < H4 (currently 2 → 69 → 71 → 194).

H4 is the deliberate mirror of the boss's H4 Eclipse Breaker: the boss **rams the
floor** (void detonation, ash sinks); the Hero **tears out of it upward** (light
launcher, motes rise). The live finisher knockback (16) reads as the launch.

## Per-hit frame groups

### H1 FIRST LIGHT (one-hand)
- `W1 GLINT` — blade raised beside the helm, body pulled back, cape drifts
  forward; two W glints on the edge + one gold spark (the S0 GLINT language).
- `A1A SHEAR` — top of the steel smear revealed (5-4-3 steel ramp, maxW 2).
- `A1B HIT` (**hold**) — full descending crescent, blade low-front, small step
  in; ONE white apex glint pair. Smear stays pure steel.
- `L1 FOLLOW` — smear breaks into one-step-dimmer broken bands.

### H2 GILDED CREST (one-hand)
- `W2 DIP` — blade dips low-front, body coils down 1; a W+y tip glint.
- `A2A SHEAR` — rising partial crescent (W/I/y, thin).
- `A2B HIT` (**hold**) — full rising crescent low→overhead, warm `o` belly rim,
  sparse G breakup, tail cooled one step; 2 motes rise off the arc top.
- `L2 FLOAT` — crescent broken + dimmed; motes risen higher (rise asserted).

### H3 SUNPIERCE (two-hand)
- `W3 COIL` — body coils back, blade level at the waist; 3 gather motes converge
  on the tip + W tip glint (the CYCLE gather grammar, micro-dose).
- `A3A DRIVE` — launch: lunge stance opens, speed-lines ignite.
- `A3B HIT` (**hold**) — full extension. Radiant lance = hot W/I upper speed-line
  + gold rims + I/y lower line, all with a 1px air gap off the blade band so they
  read as motion, not blade thickening; launch streaks trail past the back;
  compact IMPACT star (P1 language) at the tip.
- `L3 RECOIL` — lance dissolves to broken o/G/u dashes; 2 motes rise.

### H4 SOLSTICE (two-hand, finisher/launcher)
- `W4A COIL` — deep crouch, blade swept to the rear-low corner, cape pools;
  underfoot **ground-glint** (GROUND HALO hint) + gather motes at the tip.
- `W4B IGNITE` — W kernel flares on the tip, ground glint gains its W node.
- `A4A ASCENT` — the cut launches: partial crescent through the low-front,
  **ground-skim ticks** where the arc crossed the floor row.
- `A4B HIT` (**hold**) — the FULL MOON: 210° W/I/y/o crescent with sparse G
  belly, big IMPACT star at the contact zone, detached tip glint, 2 rising
  motes; body stretched tall.
- `P4 PEAK` — blade overhead (canted back over the crown); **HALO H0 SNAP** ring
  around the body (true circle + W cardinal nodes + N/S ticks); crescent remnant
  dissolving; motes risen (rise asserted).
- `S4 SETTLE` — top-arc ring fragments + last bronze mote; the blade returns to
  the idle carry (**seam asserted: tip within 3 cells of the base carry tip**).

## FSM mapping (integration contract — zero gameplay change)

Maps 1:1 onto the LIVE 4-hit melee FSM in `Enemy.js` (`COMBO.HITS`, fields
`_comboIndex` / `_comboPhase` / `_comboPhaseTimer`), phase-indexed exactly like
the approved boss 8A-2 port. Suggested mapping at 60fps:

| hit | windup | active | link |
|-----|--------|--------|------|
| H1 (w5/a4/l7) | W1 | timer>2 → A1A, else **A1B held** | L1 |
| H2 (w3/a4/l7) | W2 | timer>2 → A2A, else **A2B held** | L2 |
| H3 (w3/a4/l8) | W3 | timer>2 → A3A, else **A3B held** | L3 |
| H4 (w6/a6/l10) | timer>3 → W4A, else W4B | timer>3 → A4A, else **A4B held** | timer>5 → P4, else S4 |

The chain totals ~67 ticks ≈ 1.1s — same cadence the game already plays.

## Canvas, anchors, palette

- Frames are **44×34** (vs the 30×24 base): headroom for overhead blades and
  smears. Hero base pasted at **(7,10)**; feet/shadow rows **32/33** (last row).
  `drawSprite`'s centerX/feet-bottom anchor **self-solves** — no code change.
  On screen at the hero 2px grid: 88×68 px around the same 60×48 body.
- Body offset from the grid centre col matches the 30-wide base, so the existing
  aimDir mirror behaves identically.
- Rows ≥ 20 → Enemy.js row-count detection (`frame.length >= 20`) already routes
  these to HERO_IDLE_PIXEL 2. **Palette:** frames use HERO keys + the six LIGHT
  keys (`W #fffdf4 / I #f2e6bf / y #f2c94e / o #e0a93c / G #c9962e / u #8a6420`)
  — extend `HERO_REDESIGN_PALETTE` with the LIGHT keys at integration (no key
  collisions; `G` shares the hero gold value by design).
- Effects are **BAKED into the frames**: smears set-behind the body (body always
  wins), front accents cover ≤6 body px (asserted). Effect layers never contain
  the hero blues (asserted) — no blue can enter the eclipse.

## Integration notes (LATER stage — nothing now)

- Replace the free-running `attack` clip at the `_animState` ATTACKING /
  ATTACK_WINDUP branch with `heroCombo1..4` phase-indexed per the table above.
- **Retire the runtime melee slash hook** (`drawSlashArc`→`drawHolySlash` on
  melee ACTIVE frames) when these land — the trails are baked; firing both
  doubles them (the same lesson as the boss 8A-2 `_slashVfxFrame` retirement).
- Optional on-hit confirm: the 8B-0 `lightImpact` grids at the hitbox contact
  point on a connected strike (render-only).
- RENDER-ONLY LAW: no hitbox, timing, damage, AI, or physics change. The live
  `COMBO.HITS` shapes stay exactly as they are.
- Tiering: normal = everything; lite = drop belly breakup + halve motes;
  performance = smear core + star only. The chain silhouette survives every tier.

## Validation (all asserted in-generator, throws on violation)

Warm law R≥G≥B on every LIGHT color; 44×34 size + legal keys on all 18 frames;
fx layers restricted to LIGHT + neutral steel (never `l`/`L`/`g`); feet present
on the floor rows every frame; body mass conserved within tolerance (no
accidental erase); front-accent body cover ≤6 px; escalation strictly
H1<H2<H3<H4 with H1 ≤6 LIGHT px; motes RISE between HIT and follow frames (H2,
H4); H3 dissolve thins; S4 settle seam tip within 3 cells of the idle carry;
literal round-trip re-parse byte-compare on all four clips; deterministic
re-emit (PNG + literal byte-identical across runs).
