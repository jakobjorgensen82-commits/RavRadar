# RavRadar 4.0.239

Dato: 2026-08-20

## Observation privacy and calibration safety

- Precise trip GPS remains in local browser storage and is replaced with `null` in every remote observation payload.
- The redaction also applies when an observation created by an older client is retried from the local outbox.
- Local sync metadata is no longer included in the Supabase payload.
- Observation analysis is coverage-only and cannot produce actionable score patches while the RavScore phase D calibration gate is locked.
- Admin explains the required effort, immutable snapshot, temporal and geographic validation before model proposals can resume.

## Unchanged contracts

- Active RavScore calculation and existing local adaptive-model versions are unchanged.
- No land/water point, coastline, zone or weather-data contract changed.
- The public per-zone “Hvad fandt du?” form remains removed; trip and observation infrastructure remains available.

## Follow-up

- Existing central observation rows may contain GPS written by older versions. They are not inspected or deleted by this release; any irreversible production-data cleanup requires a separately approved and audited migration.
