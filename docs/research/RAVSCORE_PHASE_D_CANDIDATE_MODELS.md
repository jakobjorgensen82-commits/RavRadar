# RavScore phase D: candidate models and calibration gate

Status: design complete, score-neutral, 2026-08-20.

This document converts the phase A-C evidence and sensitivity findings into a safe comparison plan. It does not authorize or implement a production score change.

## Decision

RavRadar must not select new production weights from synthetic sensitivity results alone. The available research supports the physical processes and the need to combine waves, current, wind and coast orientation, but it does not provide calibrated Danish amber-find probabilities. Production calibration therefore requires timestamped observations with both finds and genuine no-find searches.

Until that evidence exists:

- the current score remains the production baseline;
- every candidate remains shadow-only;
- candidates may consume only fields already present in the internal forecast/state contract;
- no land or water point may move;
- a candidate cannot be activated merely because it looks smoother or gives intuitively attractive maps.

## What phase C established

- The current model contains large boundary jumps. The strongest tested single crossing changed the final score by 18 points.
- Current availability and direction can dominate the result, while some event-age and history inputs can be masked by another active pathway.
- Current speed and direction, and shallow/reef coast tags, show material interaction. Treating every contribution as independent risks double counting.
- Synthetic grids are useful for continuity, monotonicity and interaction tests, but cannot establish predictive accuracy.

## Candidate B0: production baseline

The active 40/35/25 model is retained unchanged as the control. All comparisons must use the exact production implementation, not a copied approximation.

Purpose:

- establish whether a candidate improves prediction rather than merely changing score distribution;
- preserve current labels, reasons and missing-data safety behavior as the reference contract;
- detect regressions caused by future refactoring.

## Candidate C1: smoothed baseline

C1 keeps the same three components and broad product meaning as B0, but replaces hard numeric buckets with bounded continuous response curves.

Design constraints:

- wind, wave height and current speed responses are monotonic only where the underlying physical hypothesis is monotonic;
- directional effects use continuous angular projection instead of abrupt sector boundaries;
- existing safety caps for unavailable transport evidence remain fail-closed;
- component weights remain unchanged during the first comparison, so smoothing and reweighting are not tested simultaneously.

Purpose: isolate the value of removing artificial jumps without claiming a new physical model.

## Candidate C2: process-separated model

C2 separates the causal stages so one weather signal is not rewarded several times for the same physical effect:

1. `source/mobilization`: whether material is plausibly released or resuspended;
2. `transport/delivery`: whether the combined Lagrangian transport points toward the local coast;
3. `retention/access`: whether material is likely to remain accessible and huntable.

Design constraints:

- wave-driven drift and Eulerian current are combined before projection onto the coast normal;
- wave period, direction and event duration may contribute only through an explicit process hypothesis;
- coast tags modify retention or uncertainty, not several independent components by default;
- the final composition must prevent a maximum in one stage from fully hiding absent evidence in another;
- no coefficient is fitted until the observation gate below has enough coverage.

Purpose: test whether a causal composition reduces double counting and improves spatial transfer to coast sections not used for fitting.

## Candidate C3: uncertainty-aware process model

C3 uses the same physical stages as C2 but separates predicted opportunity from data confidence.

Output concept:

- an opportunity estimate;
- a confidence class derived from source provenance, freshness, completeness and spatial representativeness;
- a user-facing score that cannot present weak fallback evidence as high certainty.

Purpose: determine whether explicit uncertainty is more honest and useful than forcing every missing or fallback condition into the opportunity score itself.

## Mandatory candidate tests

### Structural gates

- Deterministic output for identical input.
- No NaN, infinity or out-of-range component.
- No score increase caused solely by removal of evidence.
- No hidden dependence on private diagnostics in the public runtime.
- One physical driver has one declared primary causal role; every secondary role must be justified and interaction-tested.

### Sensitivity gates

- Infinitesimal input changes must not create large score jumps except at an explicit safety/availability transition.
- Direction must behave continuously around 0/360 degrees.
- Symmetric coast-relative directions must be symmetric unless a documented local process breaks the symmetry.
- Missing wind, wave, current, direction, age and history are tested separately and in realistic combinations.
- Every candidate is tested for both waders and beach modes and across coast-type combinations.

### Calibration gates

- Training and evaluation observations are separated by time.
- At least one evaluation also holds out complete coast groups to test geographic transfer.
- Search effort is included, so a ten-minute no-find is not treated like a thorough no-find search.
- Both positive and negative observations are required; finds alone cannot calibrate probability.
- B0, C1, C2 and C3 are evaluated on identical frozen observations and forecast snapshots.
- Calibration, ranking, false reassurance and stability are reported separately; no single metric decides activation.
- Uncertainty intervals are reported for model differences. A negligible or unstable improvement is not sufficient.

### Product and release gates

- Score, color, label, arrow and explanation must describe the same state.
- Existing 210-zone and 673-coastal-part contracts must remain complete.
- Full browser coverage is required only for an activation candidate, a relevant UI/data-contract change, the weekly build audit, or a concrete regression signal.
- Activation requires a new explicit RDKS decision, regression coverage, PR gates and production verification.

## Minimum observation coverage before fitting

The first calibration checkpoint is a coverage gate, not a promise that the data are already sufficient. Before coefficient fitting, the observation set must contain:

- finds and no-finds in both hunt modes;
- multiple independent weather events;
- representation from west-facing, east-facing and sheltered coast groups;
- observations outside the strongest storm conditions;
- enough repeated zones to estimate within-zone variation without letting a few active users dominate.

Exact numeric sufficiency thresholds must be chosen after the first anonymized coverage report. Selecting them now would be arbitrary because the event rate and reporting balance are unknown.

## Observation contract

The machine-readable draft is `docs/research/ravscore-observation.schema.json`.

Privacy and integrity rules:

- store zone/coastal-part identity, not precise search coordinates;
- store no name, email, free-text note, image or device identifier in the calibration dataset;
- join weather through an immutable forecast snapshot identifier rather than copying full diagnostics;
- retain the forecast issue time to prevent future information leaking into historical evaluation;
- keep raw submissions outside the public artifact;
- reject observations that cannot be linked to the forecast that was available at search time.

## Evidence implications

- Baltic beach-cast observations indicate that conditions in the preceding days, wave height and wave approach direction matter, supporting an event window rather than a current-hour-only interpretation.
- Wave-induced drift is not independent of wave period, steepness, object properties and the Eulerian current field; this argues against treating a generic wave score as a separate additive truth.
- Coast orientation materially affects deposition and transport, supporting coast-relative projections rather than absolute compass buckets.
- Recent field experiments on buoyant objects show that combined wind, waves and nearshore surfing outperform simpler forcing combinations, but amber-specific transfer must be tested rather than assumed.

Primary references:

- Eroshenko et al. (2017), Baltic amber as a coastal transport analogue: https://pubmed.ncbi.nlm.nih.gov/28215582/
- Kharin et al. (2023), beach-cast appearance and three-day wave conditions: https://doi.org/10.1016/j.ecss.2023.108219
- Eelsalu et al. (2025), Baltic wave direction, coast orientation and alongshore transport: https://doi.org/10.5194/os-21-619-2025
- Monismith (2020), Stokes drift and Lagrangian transport: https://doi.org/10.1017/jfm.2019.891
- Xiao et al. (2024), object-dependent wave-induced drift: https://doi.org/10.1017/jfm.2024.31
- Rainville et al. (2026), field-observed nearshore surfing and beaching: https://doi.org/10.1029/2025JC022422

## Next executable step

Implement an internal, non-public observation intake and immutable forecast-snapshot link. Then generate a coverage-only report. Do not implement candidate coefficients until that report demonstrates adequate positive/negative, temporal and geographic coverage.

## 4.0.239 implementation guard
The existing browser-side learning analysis previously produced actionable metric patches from a minimum of 12 rows with four outcomes in each class. Version 4.0.239 replaces that behavior with a coverage-only report and an explicit calibration lock. Existing active/local model versions remain untouched; new observation-driven patches require the full phase D gate.
# Observeret fase D-checkpoint, 2026-08-21

Den score-neutrale produktionsaudit af 4.0.242 dækker 41.116 zonevinderposter og 1.346 aktuelle kystdel-/jagtformposter. Den viser blandt andet 6,67 points zonevinderbias, næsten konstant aktuel strandjagtbarhed og 0,69-0,74 korrelation mellem transport og mobilisering. Se `RAVSCORE_PHASE_D_OBSERVED_ABLATION_4.0.242.md`.

DEC-0042 fastslår, at næste kalibreringsenhed er en komplet tur med indsats, faktisk kystdel og uforanderligt prognosesnapshot. Enkeltfund og ufuldstændige historiske observationer må ikke bruges til koefficientfit.
