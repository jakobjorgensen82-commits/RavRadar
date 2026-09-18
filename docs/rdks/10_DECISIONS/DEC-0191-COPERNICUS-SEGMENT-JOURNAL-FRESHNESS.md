# DEC-0191 – Copernicus-segmentjournal følger firetimersgrænsen

**Status:** Aktiv, bindende og livebevist i 4.0.408
**Dato:** 2026-09-18

## Evidens

4.0.407 blev leveret gennem exact-head `35305418536`, PR #351, main
`74ce8c38541e425150905f51c91d2a7dd434687b` og providerfri code-only
`35306056877`.

Normalrun `35306467385` gennemførte DMI, gemte DMI-fremgangen og gendannede en
gyldig Copernicus `IN_PROGRESS`-tilstand. Før Copernicus var 30.911 af 79.414
par direkte DMI-dækket; 48.503 var den aktuelle DMI-rest. Den gendannede
Copernicus-tilstand valgte 3.181 par og efterlod 45.322 til fortsættelse.

Source-stage-rebasen anvendte korrekt den eksisterende firetimersgrænse. Den
varige segmentjournal blev bagefter afspillet og genindsatte imidlertid et
ældre forsøg uden samme friskhedsfilter. Producenten stoppede derfor på
`source attempt reference mismatch`; den senere gate rapporterede stale
source-stage. Positive records og providerfremgang var gemt før stoppet.

## Beslutning

1. Et journalforsøg må kun genindgå, hvis både dets oprindelige
   produktionstime og acquisitiontid ligger inden for den eksisterende
   firetimersgrænse mod den aktuelle produktionstime.
2. Forsøget skal fortsat overlappe den aktuelle DMI-rest, være tilladt af den
   valgte donorbank og overholde masker og Baltic-før-AMM15-rækkefølgen.
3. Positive, integritetsgyldige målinger bevares uafhængigt i donorbanken.
   En udløbet forsøgs-/udmattelseskvittering må derfor fjernes uden at slette
   valide målinger.
4. Rettelsen ændrer ikke vejrværdier, providerprioritet, score, geometri,
   land-/vandpunkter eller den kanoniske firetimersgrænse.
5. Næste kørsel er én almindelig weather på de gemte cacher. Oneoff og
   bootstrap bruges ikke uden efterfølgende målt behov.

## Verifikation

Direkte regression skal bevise, at et aktuelt overlappende forsøg bevares,
mens samme forsøg kasseres efter fem timer, og at positive data stadig kan
projekteres fra donorbanken. Source-stage-, pilot- og segmentjournaltests skal
være grønne. Efter exact-head og merge skal én normalrun fortsætte gennem
Copernicus, Open-Meteo, runtimeaudit og deploy eller levere en ny konkret
fejl uden at miste cachefremgangen.

Normalrun `35311408813` fortsatte gennem Copernicus uden referencefejlen,
gemte 4.956 Copernicus-par og nåede Open-Meteo. DEC-0191 er dermed
livebevist. Det senere stop i central weather var den særskilte prognose-
revisionskant, som håndteres i DEC-0192; providerfremskridtet gik ikke tabt.
