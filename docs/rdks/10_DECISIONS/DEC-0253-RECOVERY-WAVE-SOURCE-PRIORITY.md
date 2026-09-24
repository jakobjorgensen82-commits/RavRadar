# DEC-0253 – Samme bølgeprioritet i historik og normal vejrhentning

**Status:** Aktiv lokal beslutning; produktionsbevis afventer
**Dato:** 2026-09-24

## Fund

Normalrun `36009816840` på uændret 4.0.485-main gennemførte DMI,
Copernicus, Open-Meteo, strøm-lukning og offentlig strømhistorik.
Den centrale cachebygning stoppede ved
`RAVSCORE_RECOVERY_REPLAY_CONFLICT` for bølge. Derfor blev intet nyt
produktionsartifact deployet. Krypteret privat vejrfremskridt blev
gemt efter fejlen; den senest offentligt beviste 11:00 UTC-pakke
forbliver gældende. Den præcise konfliktende kystdel/time og
providerpar var ikke tilgængelige i den sikre log. Påstanden om, at
det konkret var DMI mod en reserve, er derfor en kodebaseret hypotese,
ikke et målt livefaktum.

Samlingen af to allerede sanitiserede historikkilder brugte kun
`modelRun` som fælles bølgesammenligning. En kvalificeret reserve kan
have intet sammenligneligt modeltidspunkt og kan derfor skabe hårdt
stop, når ny DMI overtager den på samme sted/time. Tilsvarende kan en
ny reserve møde en allerede valgt gyldig reserve.

## Beslutning

1. Både gammel og ny bølge skal bestå replayets præcise kilde-, sted-,
   tids- og bølgebevis, før den ene må fjerne den anden.
2. Brug den allerede aktive komponentpolitik ved tværleverandør- og
   reservekonflikter: kvalificeret DMI først; kun ved mindst 96 timer
   fra DMI-modelrun kan en nyere dokumenteret reserve overtage.
   Uden revisionsbevis bevares den tidligere valgte gyldige reserve.
3. Den godkendte Feggesund-nabobølge bevares foran ukendt-age reserve;
   direkte verificeret DMI kan overtage. To modstridende proxyer med
   samme/ukendt modelrun er fortsat en hård konflikt.
4. Strøm og bølger vælges uafhængigt. En ny gyldig bølge må ikke
   fjerne gammel gyldig strøm eller omvendt.
5. Den generiske replaykonflikt og afvisning af ugyldigt kildebevis
   forbliver strenge. Vi hverken tvinger deploy gennem ukendte data
   eller ændrer scoreformel, modelbundle, geometri eller vejrproducenter.
6. Næste normale kørsel må først startes efter exact-head releasegate
   og sikker merge. Den skal genbruge den nyeste kvalificerede private
   vejrprogress, gennemføre cache, score, artifact og Pages og måles
   på præcis fælles vejrgrid. Cron forbliver pauset, indtil gentagen
   selvkørende normaldrift er bevist.

Målrettede regressioner dækker DMI overtager reserve, frisk DMI
beskyttes, 96-timersundtagelsen, ubundet modeltid, gammel reserves
fastholdelse, ugyldig reserve og uafhængig strøm. Den faktiske
produktionsårsag og fuld varig stabilitet kan først afklares med
den næste livekørsel; de er ikke erklæret løst af lokal test alene.
