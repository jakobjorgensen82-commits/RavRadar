# DEC-0171 – Normal Open-Meteo bruger tiden på de reelle huller

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.389, exact-head og livebevis afventer
**Dato:** 2026-09-16

## Evidens

4.0.388 bestod exact-head, blev merged som main
`8d0a5ac5a488ff493e93e00d8260cc2feaa96f47` og blev providerfrit genbundet.
Normalrun `35064588725` beviste derefter, at DMI, Copernicus og Open-Meteo
alle gendannede og gemte fremgang. DEC-0170-filteret bestod i levende drift.

Ved target `2026-09-16T06:00:00Z` var 6.254 af 79.414 par tilbage før
Open-Meteo. Rotation slot 11 blev anvendt, men den normale ramme på 240
sekunder nåede kun fire vellykkede requests med i alt 396 par. 5.858 par
forblev uløste. Der var ingen HTTP-, netværks-, kontrakt-, null- eller
providerfejl. Flaskehalsen var den delte køretid, som også omfatter
validering og atomiske checkpoints.

Den gamle operationelle oneoff `35067958289` stoppede før alle providers på
en pensioneret Candidate G-bootstrapbinding. Den er en før-cutover-rute og
må ikke være den normale post-cutover-løsning.

## Beslutning

- Normal Open-Meteo får højst 900 sekunder i stedet for 240.
- Normal Open-Meteo kører med `--critical-only`: tiden bruges kun, mens der
  findes eksakte reelle huller. Når restlisten er tom, udføres ingen
  proaktiv Open-Meteo-opfriskning.
- Batchstørrelsen forbliver højst 50, og alle eksisterende timeout-,
  afstands-, fysik-, provenance-, checkpoint- og payloadkontroller består.
- Kildeordenen er uændret: DMI → Baltic → AMM15 → regional DMI → Open-Meteo.
  Senere valide data fra en højere prioriteret kilde erstatter automatisk
  Open-Meteo.
- Slutgaten kræver fortsat præcis 79.414/79.414 og nul manglende par. En
  tidsgrænse er ikke et fraværsbevis og giver aldrig adgang til deploy.
- Scheduler forbliver pauset under livebeviset. Fremgangen genbruges i den
  almindelige weather-rute; den forældede oneoff genstartes ikke.

## Afgrænsning

Rettelsen ændrer ikke RavScore, geometri, source-admission, cacheformat,
leverandørprioritet eller offentlig datakontrakt. Når normal closure er grøn,
får den særskilte Copernicus post-build-refresh igen mulighed for gradvist at
erstatte Open-Meteo. Den efterfølgende normale drift skal måle denne
overtagelse, før scheduleren genaktiveres.
