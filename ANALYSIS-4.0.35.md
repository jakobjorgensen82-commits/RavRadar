# Analyse 4.0.35 – fjernelse af første generations zoner

Git-historikken viser, at commit `41c2872` (RavRadar 2.2) introducerede præcis de 21 brede zoner, som senere stod som legacy eller uden status. De blev erstattet af de nuværende detaljerede `DK-B...`-zoner.

## Afhængighedsaudit

De gamle id'er fandtes i runtime-registret, genererede vejr-cachefiler og historiske auditfiler. De fandtes ikke som nødvendige nøgler i aktiv routingkonfiguration, regelmotoren eller et lokalt produktionsdatasæt med brugerobservationer. Supabase-skemaet bruger fritekst-zone-id uden fremmednøgle til zonefilen, så eksisterende eksterne observationer slettes ikke ved denne ændring.

## Beslutning

De 21 zoner fjernes fra runtime-registret og arkiveres i `docs/archive/legacy-zones-v2.2.geojson`. Arkivet er dokumentation og må ikke bruges af appen. Alle vejr- og DMI-pipelines filtrerer desuden defensivt på `zoneStatus === active`.

Det officielle zonesystem er herefter entydigt: 210 aktive detaljerede zoner, ingen runtime-legacyzoner.
