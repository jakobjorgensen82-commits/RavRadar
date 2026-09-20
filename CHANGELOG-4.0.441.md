# RavRadar 4.0.441

## Forgængerbroen lukker først, når forgængeren faktisk er afløst

4.0.440 bestod exact-head-kildegaten `35485303951`, blev merged gennem PR
#385 som `c00e6c5a` og startede almindelig weather `35485561037`.
Kørslen stoppede før DMI eller andre leverandører. Den beskyttede private
runtime blev afvist som forventeligt kontraktinkompatibel, og den tidligere
bounded-conditions-bro blev derefter ikke brugt, fordi den var låst til
releaseversion 4.0.439.

Det var for tidlig pensionering. 4.0.439 havde bevist restore, rebind og
installation, men det samme run stoppede senere ved Copernicus og nåede
derfor aldrig at publicere den kompatible efterfølgerruntime. 4.0.440 fandt
den rå DMI-downloadcache fra `35482138050`, men uden den tilladte private
restore blev hverken den strukturerede DMI-kandidat eller den krypterede
providerfremgang installeret. Forberedelsestrinnet stoppede derfor før
providerarbejde, score, writes og deploy.

4.0.441 fjerner versionsnummeret som pensionssignal. Broen er stadig lige
snæver: beskyttet source-head, bundlehash, tre sourcekontrakthashes,
source-/targetmodelbinding, 210/673, payloadfri descriptor og nyere mål-time
skal matche præcist. Den gamle pakke læses fortsat med sin egen reader og
føres gennem den hærdede rebind før installation. Ukendt afvigelse stopper.

Broen lukker automatisk, når den beskyttede pointer ikke længere peger på den
eksakte forseglede forgænger. Det er det faktiske bevis for, at efterfølgeren
er gemt; et versionsløft alene er ikke. Regressionen beviser både fortsat
adgang ved uændret exact source og automatisk afvisning efter ændret source.

Copernicus-timeoutrettelsen fra 4.0.440, tidsbudgetter, DMI-first,
Copernicus/Open-Meteo-huludfyldning, DMI-only-vandstand, RavScore, data,
geometri og gyldighedsregler er uændrede. Udsagnet i 4.0.440 om, at broen
korrekt skulle være inaktiv, er supersederet af produktionsbeviset.
