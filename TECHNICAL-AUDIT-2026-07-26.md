# RavRadar teknisk audit – 26. juli 2026

## Konklusion

Den globale retningskonvention er korrekt: `currentDirectionDeg` er strømretningen **mod**, mens vindretningen er meteorologisk **fra** og vendes 180° før sammenligning med `onshoreDirectionDeg`.

Den tidligere audit var dog cirkulær: den overskrev zonedata med bearingen fra `dataPoint` til `pinPoint`, hvorefter testen blot kontrollerede, at den nye værdi matchede de samme punkter. Den kunne derfor ikke opdage forkerte eller ombyttede punkter.

## Zoneaudit

Den nye audit er ikke-destruktiv som standard. `--apply` kræves for at ændre zonedata.

Resultat:

- 222 aktive zoner
- 94 PASS
- 127 REVIEW
- 1 FAIL
- 24 zoner med mere end 8 km mellem marint datapunkt og strandpin
- 1 zone med identiske punkter: `DK-LIM-02 Limfjorden midt`

De 135 historiske korrektioner over 90° er i stor udstrækning plausible. Vestkystens havpunkt ligger vest for strandpinnen og giver derfor onshore mod øst (cirka 90°). Nordjyllands østkyst har havpunkt øst for stranden og giver onshore mod vest (cirka 270°). Det store antal skyldes primært en tidligere systematisk omvendt konvention, ikke den nye bearingformel.

Auditten kan stadig ikke alene bevise geografisk korrekthed. Odder, øer, bugter, fjorde og lange zoner markeres derfor til manuel gennemgang.

## Sikker zonefejl

`DK-LIM-02 Limfjorden midt` har samme koordinat i `dataPoint` og `pinPoint`. Bearing er derfor matematisk udefineret. Den nuværende 0° må ikke betragtes som geografisk valideret.

## Scoringsfejl fundet

Den tidligere transportscore startede på 42 point. En udgående strøm kunne derefter opvejes af:

- passende strømhastighed
- pålandsvind
- stigende vandstand
- lavt vand
- rev
- ålegræs

Dermed kunne en zone få høj transportscore, selv når strømmen tydeligt førte materiale væk fra land.

## Implementerede rettelser

- Transportgrundscore reduceret.
- Strømretningen har større vægt.
- Klar strøm væk fra land giver loft på 42 transportpoint.
- Stærkt udgående strøm giver loft på 28 transportpoint.
- Manglende strømdata giver loft på 52 transportpoint.
- Statiske zoneegenskaber giver kun bonus, når strømmen mindst delvist går mod land.
- Vind er gjort til støtteparameter og kan ikke længere overdøve strømretningen.
- Scoreresultatet indeholder nu `transportDiagnostics` med retningsforskelle og anvendte caps.
- Nye mutationstests dokumenterer, at en 180° vending af strømmen giver mindst 40 points forskel i transportkomponenten.

## Diagnostik

Den medfølgende `data/live/conditions.json` er en tom initialcache og indeholder derfor ingen aktuelle zoner at genafspille. Den tidligere eksterne diagnostik viste dog:

- 0 % DMI-dækning
- DMI HTTP 429 og åben circuit breaker
- fuld Open-Meteo fallback
- vandstandsproblemer med dublerede stationer i ældre output

Den aktuelle kode har siden fået stationsdeduplikering og kystkorridorbaseret interpolation med krav om station på begge sider. Tests viser, at samme station ikke kan bruges som begge sider, men næste rigtige vejrproduktion bør kontrolleres for at sikre, at runtime-outputtet også følger den nye kode.

## Resterende manuel opgave

Ret `DK-LIM-02` med to forskellige, geografisk kontrollerede punkter. De 24 zoner med punktafstand over 8 km og komplekse kystzoner skal gennemgås visuelt, fordi en enkelt bearing ikke altid repræsenterer hele zonen.
