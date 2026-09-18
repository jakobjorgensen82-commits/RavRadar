# DEC-0192 – Nyeste gyldige komponent vinder i RavScore-recovery

**Status:** Aktiv og bindende; implementeret lokalt i 4.0.409, livebevis afventer
**Dato:** 2026-09-18

## Evidens

4.0.408 blev leveret gennem exact-head `35310381268`, PR #352, main
`891b5f3c8ba8778c91d41ac15f2448c4e66af655` og providerfri code-only
`35310919329`.

Normalrun `35311408813` livebeviste 4.0.408: Copernicus fortsatte uden den
tidligere `source attempt reference mismatch`, og DMI-, Copernicus- og
Open-Meteo-fremgang blev gemt. Den operationelle closure havde 79.414 par:
31.733 DMI, 4.956 Copernicus, 904 regional DMI, 41.001 Open-Meteo og 820
ærlige lokale `MISSING`. Alle 673 kystdele var scoreklare gennem direkte data
eller de allerede godkendte korte holds.

Kørslen stoppede bagefter i central weather på
`RAVSCORE_RECOVERY_REPLAY_CONFLICT` for bølger. Den gamle deployede private
historik og den nye progressive DMI-cache indeholdt begge en gyldig bølge for
samme del og time, men fra forskellige DMI-prognosekørsler. Den generiske
replay-union behandlede dem som ligeværdige peers og afviste den legitime
prognoserevision.

## Beslutning

1. Gammel deployet historik og ny progressiv DMI-cache sammenlignes pr.
   kystdel, time og komponent før den generiske replay-union.
2. Når begge komponenter er gyldige og har forskellige dokumenterede
   `modelRun`, bruges komponenten fra den nyeste DMI-prognosekørsel.
3. Strøm og bølger vælges uafhængigt. Strømmens U/V-par er atomisk;
   bølgehøjde, periode og deres kildebevis er en atomisk bølgepakke.
4. Hvis den nyere prognose mangler en komponent, bevares den ældre gyldige
   komponent for samme sted og time. Først uden ny eller stadig gyldig gammel
   komponent bliver resultatet `MISSING`.
5. Samme eller ikke-sammenlignelige `modelRun` med forskellige værdier
   forbliver en hård replaykonflikt. Den generiske fail-closed-kontrol
   svækkes ikke.
6. Rettelsen ændrer kun samlingen af gammel og ny privat vejrhistorik. Den
   ændrer ikke RavScore-formel, vægte, modelkode, kildeprioritet, geometri,
   land-/vandpunkter eller offentlige scorekontrakter.
7. Næste almindelige weather genbruger providercacherne fra `35311408813`.
   Ingen oneoff; bootstrap vurderes kun mod målt rest og normal kapacitet.

## Verifikation

Regressionen skal bevise nyere bølge over gammel bølge, nyere strøm over
gammel strøm, gammel bølge sammen med nyere strøm når den nye bølge mangler,
nyere deployet `modelRun` over en ældre progressiv cache og fortsat hårdt stop
ved to forskellige værdier fra samme `modelRun`. Produktionsadapter,
bulk-integration og den aktive modelbundle skal være uændrede/grønne. Efter
exact-head, merge og providerfri code-only skal én normal weather fortsætte på
de gemte cacher gennem central weather, runtimeaudit og deploy.
