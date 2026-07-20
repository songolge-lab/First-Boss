# Stage 8C-2 — MERIDIAN LOOP (Hero Combo A) — PACKAGE INDEX

One page: what exists, where it lives, and how the pieces map. **Status: PACKAGED —
NOT integrated.** `src/` untouched; this is the technical handoff for later gameplay
stages (8C-3 / 8C-4).

> MERIDIAN LOOP is the **second** Hero sword combo, built from the approved
> **[HERO LIGHT ECLIPSE](hero_eclipse_handoff.md)** family (white disc + gold corona,
> zero blue in the effects). Daybreak Chain is a combo of ARCS; Meridian is a combo of
> LINES that crosses the arena and loops back to where it started.

---

## Read these first
| file | what it is |
|------|-----------|
| [`hero_combo_a_handoff.md`](hero_combo_a_handoff.md) | the **contract**: 5-step frame groups, anchors, frame/phase table, rotating dive, projectile, forward-travel, pillar + teleport return, quality tiers, gameplay-handoff notes, risks |
| `hero_combo_a_index.md` | this file |

## Approved source of truth (8C-0 REV 2 — do not modify / overwrite)
| file | what it is |
|------|-----------|
| `hero_combo_a_v1.png` | the approved production sheet — **the visual source of truth** |
| `hero_combo_a_spec.md` | the 8C-0 REV 2 design spec (choreography, escalation, loop clock) |
| `hero_combo_a_gen.js` | deterministic generator (baked asserts; verified byte-identical re-emit) |
| `hero_combo_a_literal.txt` | the approved **shipping matrix data** — the one artifact integration pastes / reads |

## 8C-2 additions (new this stage)
| file | what it is |
|------|-----------|
| `hero_combo_a_handoff.md` | the integration contract (above) |
| `hero_combo_a_validate.js` | standalone validator — reads the shipping literal + the generator's declared constants; **36 checks** |
| `hero_combo_a_index.md` | this index |

No `*_dropin.mjs` this stage: the literal is the single shipping artifact and the
validator reads it directly (nothing to keep in sync). This mirrors the 8B-2
convention but omits the extra module because there is no second copy to certify.

---

## Reproduce / verify
```bash
cd tools/redesign
node hero_combo_a_gen.js        # (optional) re-emit sheet + literal, byte-identical
node hero_combo_a_validate.js   # 36 checks — exit 0 = ALL PASSED
```
The validator reads the **ARTIFACT** (`hero_combo_a_literal.txt`) and cross-checks the
generator's **declared** geometry as text (never executing it), so it certifies the
matrix data downstream would use.

---

## The map at a glance

### Body clips → steps (44×34, effects baked)
| clip | step | frames | HELD frame(s) | owns detached grid |
|------|------|--------|---------------|--------------------|
| `heroComboA1` | S1 SUNSTEP (bow opener) | 4 | A1B | — |
| `heroComboA2` | S2 ZENITH DIVE (turn) | 6 | T2, D2B | — |
| `heroComboA3` | S3 SUNGLAIVE (throw) | 4 | A3B | `lightGlaive` |
| `heroComboA4` | S4 CHASECUT (mark + advance) | 4 | A4B | `lightCorridor` |
| `heroComboA5` | S5 NOON PILLAR + ECHO RETURN | 6 | P5B | `lightPillar`, `lightReform` |

### Detached world-space grids (pure LIGHT, not sprite-parented)
| grid | dims | @2px | frames | local origin | owner |
|------|------|------|--------|--------------|-------|
| `lightGlaive`   | 25×25 | 50×50  | 3 | centre (11,12), core (8,12) | S3 |
| `lightCorridor` | 72×17 | 144×34 | 3 | mark col 5, row 8 | S4 (bed for S5) |
| `lightPillar`   | 41×72 | 82×144 | 5 | col 20, floor row 68 | S5 |
| `lightReform`   | 33×33 | 66×66  | 3 | centre (16,16) | S5 |

### The three numbers integration must not break
| fact | value | asserted by |
|------|-------|-------------|
| forward advance (mark → far end) | **5.0 hero lengths** (150 sheet-px) | `[ADVANCE]` |
| loop clock | return **tick 73** < pillar dies **tick 82** = margin **9** | `[LOOP]` |
| return destination | **THE MARK** (stored step-4 pos), not the pillar | handoff §9 |

---

## Hard rules honoured
`src/` read-only; no gameplay / hitbox / timing / damage / movement / balance / AI /
Boss / Combo B / Dragon Wrath / Light-Eclipse-family / throne-room / camera /
package-config change; no approved visual-production file modified or overwritten;
every matrix cell-for-cell the approved 8C-0 REV 2 art (validator + byte-identical
generator re-emit). One technical-handoff concern only — does not start 8C-3.
