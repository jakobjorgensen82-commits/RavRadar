# Historical candidate F comparison - first measured result

Date: 2026-08-21

## Input

The comparison reused the authenticated, coordinate-free 2024 forcing artifact from run `32494728318`. It evaluated every sample from each wave peak through the following 72 hours for beach and waders.

- 12 wave-selected events.
- Four sentinel coasts.
- 1,464 private score evaluations.
- Same candidate-E physical components and mild bottleneck in both models.
- Candidate E weights: 25/40/35.
- Candidate F weights: 15/50/35.

## Overall weight effect

| Measure | Candidate E | Candidate F | F minus E |
|---|---:|---:|---:|
| Mean score | 41.364 | 36.575 | -4.789 |
| Waders mean | 38.327 | 34.751 | -3.575 |
| Beach mean | 44.402 | 38.399 | -6.003 |

F raised 172 evaluations, left 64 unchanged and lowered 1,228. Score band changed in 335 of 1,464 evaluations.

The mean components explain the direction:

- huntability: 70.005;
- transport/delivery: 15.414;
- mobilisation: 61.071.

Moving ten percentage points from huntability to transport/delivery therefore lowers most post-peak evaluations. This is not automatically a defect: many later samples are easier to search while measured delivery is weak.

## Direction classes

| Direction class | Candidate E | Candidate F | F minus E |
|---|---:|---:|---:|
| Onshore-delivery direction | 40.840 | 34.381 | -6.459 |
| Offshore-removal direction | 31.103 | 24.158 | -6.945 |
| Conflicting wave/current | 38.096 | 32.281 | -5.815 |
| Alongshore-mixed | 44.368 | 41.208 | -3.159 |

Candidate F preserves a clear onshore-over-offshore difference of 10.223 points. The onshore class still has a low mean transport/delivery component of 13.635 because the class describes direction, not strength. Low current speed and late post-event timing can therefore remain physically weak despite an onshore direction.

## Interpretation

The first result supports the reason for testing F: easy search conditions no longer compensate as strongly for weak physical delivery. It does not establish that 15/50/35 is optimal. The low transport/delivery values must be reviewed against event timing and the missing historical wind before any activation decision.

## Remaining blocker for full old/current/F replay

The bounded artifact has no historical wind. The active RavScore requires wind and must not be replayed with invented values. This run therefore compares candidate E and F only and explicitly marks active historical replay unavailable.

No public score, state, UI, DMI source priority, geometry or land/water point changed.
