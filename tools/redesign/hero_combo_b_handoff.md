# HERO COMBO B — the two empowered swings — HANDOFF (Stage 8C-3)

Extraction / technical handoff only. **Nothing is wired into `src/`.** This
packages the **two empowered sword swings** of the approved revised Stage 8C-1
"v2" **DRAGON WRATH** package. The STATE half (activation, transformed sword,
charge, finisher, anchors, layering, tiers, cleanup) is in
[`dragon_wrath_handoff.md`](dragon_wrath_handoff.md); the package map is
[`dragon_wrath_package_index.md`](dragon_wrath_package_index.md).

- Family: **HERO LIGHT ECLIPSE** ([`hero_eclipse_handoff.md`](hero_eclipse_handoff.md))
- Source of truth: `dragon_wrath_combo_b_v2_*` (approved v2). **The v1 package is
  superseded and NOT used.**
- Shipping literal: `hero_combo_b_literal.txt` (extracted verbatim; byte-identical
  to the approved source).

## Combo B is EXACTLY TWO swings

> **Swing 1 — THE CRASH**, then **Swing 2 — THE SWEEP into the LUNGE.**
> There is **no third swing.** Any older doc describing a 3-hit Combo B is
> superseded for this package. The validator fails on any third swing group.

Both swings were designed from **bswordcombo** (Insignia, @adamcyounis, 31f GIF),
decoded frame by frame: f0–f8 → Swing 1, f9–f30 → Swing 2. The chain into the
charge is the reference's own — bswordcombo literally ends with the blade coming
to rest on the shoulder, which *is* bswordcombo2's charge carry.

| # | clip | name | reference frames | motion | hands |
|---|------|------|---|---|---|
| S1 | `heroComboB2Swing1` | **THE CRASH** | f0–f8 | high back-carry → forward pitch (back leg kicks up) → one huge overhead→low-front crescent → deep long crouch | two |
| S2 | `heroComboB2Swing2` | **THE SWEEP / LUNGE** | f9–f30 | low drag past the hip → floor-skimming cleave into the longest lunge → rise to full vertical (fan) → settle onto the shoulder | two |

Both swings wield the **transformed WRATH BLADE** (gold energy, reach 16, W core
+ solid gold body) — see [`dragon_wrath_handoff.md` §2](dragon_wrath_handoff.md).
Never the steel blade during the active swings.

---

## Swing 1 — THE CRASH (`heroComboB2Swing1`, 5f / 18t)

| frame | tag | phase | hold | choreography |
|---|---|---|---|---|
| 0 | S1A CARRY | WINDUP | 3 | entry from the Dragon Wrath powered idle; blade carried high to the rear; weight loading back |
| 1 | S1B PITCH | WINDUP | 2 | forward pitch — the **back leg kicks up** (floor-cell window asserted), torso rotates over the front foot, hand (33,15) angle −95° (blade high-back) |
| 2 | **S1C CRASH** | ACTIVE | **6 (hold)** | the giant crescent: hand (38,27) angle 52°, radius-20 arc **−125°→55°** (overhead-back → low-front), W/I/y trail with an `o` belly + floor-skim ticks + a floor star; body stretched into the blow |
| 3 | S1D CROUCH | RECOVER | 4 | weight drops into a deep long crouch (≤ 0.85× standing height asserted); the reference's held recovery |
| 4 | S1E SETTLE | RECOVER | 3 | recover toward the drag that opens Swing 2 |

- **Grip:** two-handed active swing (the far arm is baked into the frames).
- **Contact anchor:** the S1C low-front crescent + floor star.
- **Motion quality (from the reference, preserved):** the whole smear appears in
  ONE frame (S1C) and the body **HOLDS** — the bswordcombo smear-frame idiom. The
  weight transfer (back-load → pitch → crash → deep crouch) is the point; do not
  reduce it to "a downward slash."
- **Facing:** authored RIGHT; runtime flip mirrors.

---

## Swing 2 — THE SWEEP into the LUNGE (`heroComboB2Swing2`, 5f / 18t)

| frame | tag | phase | hold | choreography |
|---|---|---|---|---|
| 0 | S2A DRAG | WINDUP | 3 | entry momentum from S1's crouch; the blade **drags back low past the hip**; hand (26,30) angle 155° |
| 1 | **S2B SWEEP** | ACTIVE | **6 (hold)** | floor-skimming cleave: hand (40,30) angle 8°, centre (29,16) radius-19 arc **150°→28°**, low W/I/y band **skimming the floor rows** (asserted), driving into the lunge |
| 2 | S2C LUNGE | FOLLOW | 4 (hold) | **full stretch** — hand (41,31) angle 4°, the longest lunge in the clip (≥ 1.18× standing width asserted), held |
| 3 | S2D RISE | FOLLOW | 3 | follow-through carries the blade to **full vertical** (angle −85°, ±8° asserted) with a rising fan |
| 4 | S2E SHOULDER | LINK | 2 | the blade settles **onto the shoulder** (angle −128°) — **the charge entry** (bswordcombo2 carry) |

- **Grip:** two-handed active swing.
- **Contact anchor:** the S2B low sweep band + the lunge extension.
- **Distinct from Swing 1:** S1 is a vertical overhead CRASH pivoting tight at
  the shoulder; S2 is a horizontal low SWEEP that stretches across the floor into
  a lunge, then rises. S2 carries greater reach + authority (longest lunge, full
  vertical follow-through). The validator asserts the two swings have distinct
  light footprints.
- **Transition out:** S2E SHOULDER is literally the charge pose — Combo B chains
  into `wrathCharge2` C0 with no invented transition.

---

## FSM-mapping guidance (for Stage 8C-5 — do NOT wire now)

Combo B is a **2-hit chain**, unlike the live 4-hit `COMBO.HITS`. Integration
options (a decision for 8C-5, documented here so it isn't guessed):

- a **trimmed 2-entry combo table** (or a dedicated Dragon Wrath channel state),
  phase-indexed like the approved 8B-3 Daybreak wiring: WINDUP → ACTIVE(held) →
  RECOVER/LINK, with the **ACTIVE frame HELD** (S1C, S2B) for the impact weight;
- the trails are **baked into the frames** — any runtime melee slash hook
  (`drawSlashArc` → `drawHolySlash`) must be **gated off** during Combo B or every
  swing shows two trails (the same lesson as 8B-3, kept as standing law);
- **do not** reuse the 4-hit windows verbatim; Combo B has its own 18+18 tick
  budget and its own hold structure.

No damage / hitbox / knockback / timing values are assigned here — this is a
visual handoff. `COMBO.HITS`, hitboxes, damage, AI and the Red Eclipse overlays
stay untouched.

---

## Anchors (60×40 canvas)

Full anchor tables (origin, feet, shoulder, hip, per-frame hand+angle, crescent
centres, world-space grids) are in [`dragon_wrath_handoff.md` §5](dragon_wrath_handoff.md).
Combo-relevant summary:

- hero origin (15,16); feet row 39; shoulder (29,28); hip row 30.
- WRATH BLADE reach 16 (vs steel 11); two-handed actives.
- S1 crescent: radius 20, arc −125°→55°.
- S2 crescent: centre (29,16), radius 19, arc 150°→28°; rise 28°→−85°; shoulder −128°.

## Quality tiers

Per [`dragon_wrath_handoff.md` §7](dragon_wrath_handoff.md): every tier
**preserves both swings**, the body choreography, and the transformed-sword
shape. Lite/performance drop only secondary trail sparks/motes — never a swing,
never the silhouette.

## Validation

```bash
node dragon_wrath_combo_b_validate.js   # 85 checks — includes: exactly 2 swings, no third, distinct footprints, ordering, two-handed, byte-identity
```
