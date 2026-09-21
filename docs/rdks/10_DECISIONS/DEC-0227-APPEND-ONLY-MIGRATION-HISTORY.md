# DEC-0227 – Append-only migrationshistorik

**Status:** Bindende fra 4.0.449.

Allerede anvendte Supabase-migrationer må ikke fjernes fra den aktive lokale
liste, selv om en nyere successor erstatter deres funktion. Recovery, gates og
tests skal kende hele den kronologiske historik og må kun tilføje nye
migrationer. Remote historik må ikke normaliseres eller omskrives.

Den konkrete årsag var saved-weather recovery `35543214442`, hvor
`20260919231000_public_hour_delivery_binding.sql` allerede var anvendt i
Supabase, men var blevet erstattet af `20260920220000` i den lokale allowlist.
