# DRAGON WRATH + COMBO B — PACKAGE INDEX (Stage 8C-3)

What exists, where it lives, what maps to what. **Stage 8C-3 is extraction /
technical handoff only — nothing is wired into `src/`.**

Reusable family name (locked, record verbatim): **`DRAGON WRATH`**, inside the
**HERO LIGHT ECLIPSE** family.

---

## Source of truth — approved revised Stage 8C-1 "v2"

| file | role | status |
|------|------|--------|
| `dragon_wrath_combo_b_v2.png` | production sheet | **approved (visual source of truth)** — do not modify |
| `dragon_wrath_combo_b_v2_gen.js` | deterministic generator (laws asserted in-file) | approved — do not modify |
| `dragon_wrath_combo_b_v2_literal.txt` | approved literal / matrix data | approved — do not modify |
| `dragon_wrath_combo_b_v2_spec.md` | design specification | approved — do not modify |

**Obsolete / rejected (NOT used):** `dragon_wrath_combo_b_v1.png` +
`dragon_wrath_combo_b_gen.js` + `dragon_wrath_combo_b_literal.txt` +
`dragon_wrath_combo_b_spec.md` — the pre-reference v1 attempt, superseded for
reference drift. Kept on disk for history only. The extractor and validator
refuse it.

---

## Stage 8C-3 handoff artifacts (new this stage)

| file | role |
|------|------|
| [`dragon_wrath_handoff.md`](dragon_wrath_handoff.md) | the **STATE** contract: activation, transformed sword, charge + 1.5 s presentation, darken, flash, giant sword, anchors, layering, tiers, cleanup, integration risks, validation |
| [`hero_combo_b_handoff.md`](hero_combo_b_handoff.md) | the **two-swing** contract: per-frame choreography, ordering, FSM-mapping guidance |
| `dragon_wrath_literal.txt` | shipping literal — state + finisher grids + `META` (palette, anchors, holds, clock, frame order, tiers, cleanup) |
| `hero_combo_b_literal.txt` | shipping literal — the two swings + `META` |
| `dragon_wrath_combo_b_extract.js` | extractor — slices the approved v2 clips verbatim into the two shipping literals (never re-authors) |
| `dragon_wrath_combo_b_validate.js` | 85-check validator over the shipping literals + byte-compare vs the approved source |
| `dragon_wrath_package_index.md` | this file |

Follows the 8B-2 handoff convention (`hero_*_handoff.md` + index + extractor +
validator, validators read the ARTIFACTS not the generator).

---

## Clip → concern → shipping-literal map

| clip | frames × grid | concern | shipping literal |
|------|---|---|---|
| `dragonWrathRise2` | 8 × 60×40 | activation → WRATH IDLE | `dragon_wrath_literal.txt` |
| `heroComboB2Swing1` | 5 × 60×40 | Swing 1 — THE CRASH | `hero_combo_b_literal.txt` |
| `heroComboB2Swing2` | 5 × 60×40 | Swing 2 — THE SWEEP/LUNGE | `hero_combo_b_literal.txt` |
| `wrathCharge2` | 5 × 60×40 | the 1.5 s CROWN CHARGE | `dragon_wrath_literal.txt` |
| `wrathRelease2` | 2 × 60×40 | guard + settle | `dragon_wrath_literal.txt` |
| `wrathBurst2` | 3 × 41×41 | the white flash (screen-space) | `dragon_wrath_literal.txt` |
| `lightGreatsword2` | 6 × 41×88 | the giant sword (world-space) | `dragon_wrath_literal.txt` |
| `wrathBladeStudy2` | 5 × 25×13 | weapon-state documentation | `dragon_wrath_literal.txt` |

Total: **39 body frames + world grids**, master clock **201 ticks**.

## Master clock (presentation intent, not an FSM contract)

```
activation  0 – 31      rise → wrath idle
swing 1     31 – 49     THE CRASH
swing 2     49 – 67     THE SWEEP → LUNGE → shoulder
charge      67 – 157    90 ticks = ~1.5 s   (darken starts 117)
finisher    157 – 201   flash 154 (+6, 2-tick whiteout) · giant sword FORM 157 /
                        REVEAL 163 / DESCENT 169 / CONTACT 177 / PEAK 181 /
                        FADE 191 · darken lifts 191 · state settles 201
```

---

## Reproduce / verify

```bash
cd tools/redesign
node dragon_wrath_combo_b_v2_gen.js       # (approved) re-emits the sheet + literal, byte-identical
node dragon_wrath_combo_b_extract.js      # re-emit the two shipping literals from the approved v2 source
node dragon_wrath_combo_b_validate.js     # 85 checks — exit 0 = ALL PASSED
```

The validator reads the **shipping literals** and byte-compares them against the
approved v2 source (88,316 cells, 0 diffs), then re-proves the shipping
contract: 8 frame groups, correct dims / row widths, legal palette + warm law,
**exactly 2 swings / no third**, all anchors, giant-sword dimensions / centre /
floor-contact row / taper / descent identity, charge = 90 ticks, darken / flash
timing, flash-that-clears, base-up dissolution, facing + tiers + cleanup
metadata, and refusal of the v1 package.

---

## Hard rules honoured (Stage 8C-3)

`src/` untouched (read-only lookup of the pipeline conventions only). No
gameplay / hitbox / timing / balance / AI / camera / Boss / Combo A / throne
room / package-config change. No redesign: every shipping cell is the approved
v2 art, proven by the byte-compare. The obsolete v1 package was not used. No
third swing, no steel-blade substitution, no weakened finisher. Approved
visual-production files were not overwritten (the handoff only ADDS artifacts).
