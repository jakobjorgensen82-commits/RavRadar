# RavRadar 4.0.449

## Rettet

- Den aktive Supabase-migrationsliste bevarer nu den allerede anvendte
  `20260919231000_public_hour_delivery_binding.sql` før den nye
  `20260920220000_public_hour_pack_capacity_binding.sql`.
- Recovery-, trip-storage- og testforventningerne er ensrettet til 25
  kronologiske migrationer uden at ændre allerede anvendt SQL.

## Livegrundlag

- Saved-weather recovery viste, at den tidligere migration var fjernet fra
  den aktive allowlist. 4.0.449 retter allowlisten; den efterfølgende
  recovery og normale vejrkørsel er dokumenteret i 4.0.450.

## Uændret

- Vejrdata, DMI-first, fallback, scoreformel, geometri og public-hour-pakkens
  indhold er uændret.
