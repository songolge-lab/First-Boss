# DRAGON WRATH — FUTURE SCALING PLAN (intent capture only)

> **STATUS: `TBD — FUTURE STAGE, NOT IMPLEMENTED`.**
>
> This file is **documentation only**. Nothing described here exists in `src/`,
> in any sheet, generator, literal or spec. No progression logic, no gameplay
> flag, no code hook, no asset and no unused parameter was added for it. The
> current DRAGON WRATH — its transformed wrath blade, the two empowered swings,
> the ~1.5 s shouldered crown charge, the arena darkening, the white flash, the
> giant Light Eclipse sword, its descent, the floor impact, the base-up
> dissolution, its damage, hitboxes, camera treatment and VFX quality tiers —
> is **unchanged and remains the approved shipped behaviour.**
>
> The sole purpose of this file is to preserve the user's stated intent so a
> later stage can design and implement it **after the user supplies direction.**

- Family: **HERO LIGHT ECLIPSE** → **DRAGON WRATH**
  (see [`dragon_wrath_handoff.md`](dragon_wrath_handoff.md),
  [`dragon_wrath_package_index.md`](dragon_wrath_package_index.md))
- Current availability rule: **once per Hero life**, at one randomized point in
  that life (Stage 8C-5 follow-up). See "Relationship to the current rule" below.

---

## 1. Recorded intent

After the Hero has **died and progressed several times**, a later progression
upgrade **may** transform DRAGON WRATH into a **much larger-scale version** of
itself — the same attack and the same identity, escalated in presentation.

The upgrade may increase the **visual scale** of:

- the transformed DRAGON WRATH presentation (the wrath blade / power state)
- the **gigantic Light Eclipse sword**
- the descent and impact presentation
- the associated Light Eclipse effects

That is the entire recorded intent. Everything needed to actually build it —
values, thresholds, bounds, curves, art — is deliberately **not chosen here.**

**Explicit non-goals of this document:** it does not pre-design the upgraded
attack, does not pick numbers, does not commit to a second sprite sheet, and
does not imply the upgrade will ship. A future stage may also decide the
escalation is purely a re-scale of existing assets rather than new art — that
decision is itself `TBD — FUTURE STAGE, NOT IMPLEMENTED`.

---

## 2. Planning schema — all fields `TBD — FUTURE STAGE, NOT IMPLEMENTED`

| # | field | what the future stage must decide | status |
|---|-------|-----------------------------------|--------|
| 1 | **Progression / death-count unlock condition** | What "died and progressed several times" resolves to — a death count, an encounter number, a matrix milestone, or a legendary-drop tie-in. Whether it is a hard threshold or a ramp across several tiers. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 2 | **Visual scale multiplier** | The scale factor(s) applied to the power state and to the giant sword. Whether one multiplier covers both or they scale independently, and whether it is a single step or a curve. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 3 | **Giant-sword arena bounds** | How the enlarged sword stays inside `WORLD_WIDTH` and inside the visible arena, and what happens near the world edges. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 4 | **Floor-contact anchoring** | How the sword TIP stays pinned to the captured floor line at the larger scale, so the impact still reads as landing ON the floor rather than through or above it. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 5 | **Screen readability** | Whether the Boss, the Hero and incoming hitboxes remain readable under a larger darkening/flash/sword, and what the legibility floor is. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 6 | **Camera considerations** | Whether the camera pulls back, letterboxes differently, or stays untouched; and how that interacts with the stable floor horizon. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 7 | **VFX-quality-tier behavior** | How the scaled version degrades across `normal` / `lite` / `performance` / `auto`, and which layers drop first. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 8 | **Performance budget** | The frame-cost ceiling for the enlarged effects and the fill-rate limit on the lowest supported tier. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 9 | **Damage and hitbox review** | Whether damage and hitboxes scale with the visuals, stay fixed, or scale on a separate curve — and the balance review that decision requires. **Current values must not be presumed to change.** | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 10 | **Interruption and cleanup review** | Confirming the idempotent `cleanup()` still purges every enlarged layer on interrupt, fear, intimidation, Hero death, Boss death and encounter reset, leaving nothing stale. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |
| 11 | **Validation requirements** | The harness coverage the upgrade must pass before approval (an extension of `dragon_wrath_harness.mjs` and `dragon_wrath_once_per_life_harness.mjs`), plus visual approval of any new or re-scaled frames. | `TBD — FUTURE STAGE, NOT IMPLEMENTED` |

---

## 3. Relationship to the current once-per-life rule

The shipped availability rule (Stage 8C-5 follow-up) is:

- exactly **one** DRAGON WRATH per Hero life;
- the activation point is randomized per life within
  `DRAGON_WRATH_LIFE_DELAY_MIN` / `DRAGON_WRATH_LIFE_DELAY_MAX`
  (`src/entities/HeroDragonWrath.js`);
- the use is consumed on entry and is **never** refunded by interruption;
- only a real Hero death-and-respawn restores it.

A future scaling upgrade would change **what DRAGON WRATH looks like when it
fires**, not how often it may fire. Whether the upgraded version keeps the
once-per-life budget, or whether the progression tier alters it, is itself
`TBD — FUTURE STAGE, NOT IMPLEMENTED` and must be decided with the user.

---

## 4. Guardrails for whoever picks this up

- Do **not** treat any value in this file as approved — there are none.
- Do **not** modify the current giant sword, its descent, its impact, its
  dissolution, its timing, its damage, its hitboxes or its camera treatment
  while this document is the only authority.
- Do **not** add speculative flags, hooks, config keys or dead parameters "for
  later". This plan intentionally leaves **zero** footprint in `src/`.
- Start by getting the user's direction on schema rows **1, 2 and 9** — the
  unlock condition, the scale multiplier and the damage/hitbox question — since
  every other row depends on them.
