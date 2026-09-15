# DEC-0161 – Pages indeholder kun nødvendig offentlig geodata

**Status:** Delvist erstattet af DEC-0164. Geodataafgrænsningen består; decoderkonklusionen var forkert.
**Dato:** 2026-09-15

## Evidens

4.0.378 bestod exact-head sourcegate `34956693177`, blev merged gennem PR #320
som main `348d4a28`, og providerfri code-only `34957362872` kom gennem central
binding, privat restore/migration/installation, offentlig genopbygning,
210/673-audit, privat spec/bundle og Pages-pakken. Den samlede prewrite-
beslutning stoppede før de efterfølgende private, Edge- og Pages-writes, fordi
privacy-auditen fandt fire udslag med én årsag.

Pages-pakken kopierede tre repositoryfiler, som privacykontrollen afviste:
`data/kystdata.json`, `data/zone-plan.json` og
`js/services/runtime-diagnostics-archive.js`. De to JSON-filer indeholder
interne/ældre koordinatfelter. Den daværende konklusion om decoderfilen var
forkert: admin-dashboardet er et offentligt entrypoint og importerede filen.
4.0.381's live-404 og DEC-0164 retter denne del uden at gøre private payloads
offentlige.

## Beslutning

- De tre filer udelades eksplicit fra både code-only- og normal-weather-
  pakkebygningen.
- Den aktive offentlige zoneautoritet `data/zones.geojson`, alle nødvendige
  browserfiler og de fire eksakt manifestbundne `data/live`-filer bevares.
- Privacy-auditens koordinat-, diagnostik-, private fingerprint- og
  runtimekontroller lempes ikke.
- Kildegaten kræver de tre eksklusioner på begge produktionsveje, og den
  målrettede code-only-test kræver dem på den direkte leveringsvej.
- Ingen geometri, koordinat, land-/vandpunkt, vejrdata, score eller modelstate
  ændres. Geodatafilerne får alene topversionsløft til 4.0.379.

## Drift

Exact-head `34959283992`, PR #321 og providerfri `34959875107` beviste begge
eksklusioner i det færdige production-shaped artifact og bestod hele
Pages-privacy-auditen. Kørselen stoppede senere før Pages-begin på en anden
auditconsumerfejl. Næste code-only følger DEC-0162. Ingen provider, normal
weather eller oneoff må starte før offentlig 4.0.380-verifikation.
