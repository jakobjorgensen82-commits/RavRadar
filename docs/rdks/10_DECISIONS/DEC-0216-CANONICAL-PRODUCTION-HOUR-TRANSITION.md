# DEC-0216 – Produktionsklokkeslæt accepteres i workflowets kanoniske form

**Status:** Besluttet og implementeret lokalt i 4.0.437; produktionsbevis åbent
**Dato:** 2026-09-19

## Observeret problem

4.0.436 bestod exact-head `35462534974`, PR #381 og blev merged som
`0d72ce41`. Den efterfølgende almindelige weather `35462863128` stoppede før
DMI, Copernicus og Open-Meteo. Engangsovergangen afviste workflowets låste
produktionstime `2026-09-19T18:00:00Z`, fordi dens nye validator kun havde
været testet med JavaScripts normaliserede form `2026-09-19T18:00:00.000Z`.
Begge tekster betegner præcis samme hele UTC-time.

## Beslutning

1. Overgangskontroller accepterer kun de to eksakte former
   `YYYY-MM-DDTHH:00:00Z` og `YYYY-MM-DDTHH:00:00.000Z`.
2. Værdien skal fortsat kunne parses som en virkelig dato og være delelig med
   en hel time. Andre tidszoner, minutter, sekunder eller brøkdele afvises.
3. Accepteret input normaliseres straks til `.000Z`, før det skrives til den
   private restoreforventning.
4. Samme rettelse gælder både den aktive conditions-writer-overgang og den
   historiske bølgeovergang, fordi de delte samme fejlmønster.
5. Engangsovergangen flyttes til exact release 4.0.437. Dens faste source
   head, bundlehash, modelbinding, 210/673 og tre forgængerkontrakthashes
   ændres ikke.

## Konsekvens

Dette er en formatrettelse, ikke en lempelse af datakrav, tidsbinding eller
privacy. Kørsel `35462863128` foretog ingen providerkald og publicerede intet.
Næste almindelige kørsel skal stadig bevise genbrug af den krypterede
fremgang, fuld privat runtime, artifact, deploy og offentlig aktuel time.
