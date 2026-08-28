# RavRadar 4.0.301 – Om-knappen udfører rigtig historikretur

Dato: 2026-08-28

## Ændret

- RavRadar-knappen på **Om RavRadar** bruger `history.back()`, når siden faktisk blev åbnet fra den samme RavRadar-forside.
- Samme-origin root, query og `/index.html` normaliseres sikkert. Tom, ugyldig, fremmed eller anden referrer overtages ikke.
- Direkte åbnet Om-side, modificeret klik og deaktiveret JavaScript beholder det statiske `./`-link som fallback.
- Den rigtige historikretur rammer den eksisterende `pageshow.persisted`-genoptegning af kort, zonefarver, **Bedste områder**, valgt zone, femdøgnsprognose og pile.

## Uændret

- Ingen timer, reload, nonce, watchdog eller ny kold root-navigation.
- 4.0.295/296's kompakte, indholdsadresserede startup og behovsstyrede detaljelæsning.
- Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter.

## Verifikation

- Offentlig 4.0.300 beviser den krævede samme-origin root-referrer.
- Målrettede historik-, fallback-, resume-, startup-, ydelses-, modulversions- og releaseversionskontroller er grønne.
- Geodatafilerne ændrer kun topversionsfelt 4.0.300 → 4.0.301.
- Exact-head, frisk produktion, Pages, offentlig intern knap og fysisk iPhone-test afventer. Se DEC-0098.
