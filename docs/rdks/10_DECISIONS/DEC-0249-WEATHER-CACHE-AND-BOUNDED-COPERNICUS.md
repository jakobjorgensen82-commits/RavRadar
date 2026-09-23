# DEC-0249 – fortsæt fra rigtig vejrpakke og gem kortere Copernicus-kald

**Dato:** 2026-09-23
**Status:** Lokal 4.0.479; livebevis afventer

Normalrun `35903476784` på 4.0.478/`693f4789` byggede vejr og bestod
artifactkontrollerne, men stoppede før beskyttet cache og Pages:
checkpointets databasekald ramte `57014`-tidsgrænsen to gange. Kun et
kompakt score-rollback-checkpoint og DMI's GRIB-cache blev gemt; den nye
private vejrpakkes fulde fremgang blev **ikke** varigt publiceret.
Den offentlige pakke fra `35887652848` forblev den nyeste deployede.

Kørslen havde heller ikke installeret den nyeste beskyttede private
vejrpakke. Den seneste godkendte pakke fra 4.0.477 blev afvist, fordi
4.0.478 ændrede DMI's tidsfordeling i en fil, der tæller med i et bredt
kildeaftryk. Fortsættelsestilstand, offentlig projektion og modelbinding
var uændrede. En **engangsundtagelse** tillader kun den eksakte
4.0.477-kilde, datasæt, referencetime og tre kendte aftryk. Arkivets
indhold, filinventar, SHA-256, tid, model og data kontrolleres stadig.
Ingen generel kontraktomgåelse eller erstatning af gamle gyldige data.
Når pakken installeres, aktiveres den eksisterende krypterede
fremdriftsgemning før senere sluttrin. Virkningen skal bevises live.

Kun checkpointets konkrete databasefunktion får 30 sekunders
statement-timeout via append-only `20260923210000`; andre funktioner
og databasen som helhed ændres ikke. Migrationen skal anvendes og
læses tilbage før næste normalrun.

Copernicus' nul nye par var et **andet** problem: første leverandørkald
i `35903476784` brugte hele 286-sekunders arbejdsbudget uden en
durabel segmentkvittering. Forrige normalrun gennemførte fire kald og
fik 2.141 par. Operationelle Copernicus-kald opdeles nu i højst 24
prognosetimer, og loggen viser før hvert kald kun kilde, shardnummer,
antal par og tidsvindue. Alle præcise kystdel×time-par, kildekrav,
prioritet og datavalidering er uændrede. Dette er en begrundet
afbødning, ikke bevis for at leverandøren svarer; næste run afgør det.

Den seneste Open-Meteo-rest var 5.501 havstrømspar i 57 kystdele.
8.744 tomme hastigheds-/retningsfelter, 24 gitterafvisninger og syv
transporttimeouter er målt; totalbudgettet blev ikke nået. Dette
løses ikke af en vilkårlig tidsforøgelse. DMI stod på 19.893 af
79.414 direkte havstrømspar; dens lave andel og alle andre vejrtype-
rester er fortsat åbne. Næste ikke-overlappende normalrun måler hver
vejrtype og leverandør mod den eksakte forrige gyldige pakke. Ved
stagnation standses nye runs og den konkrete kilde undersøges.

Supabases varslede ændring 2026-10-30 ændrer ikke eksisterende
tabellers grants. Nye `public`-tabeller, også i migrationer, skal få
eksplicitte og mindst mulige rolle-grants i samme migration, hvis de
skal bruges via Data API. Denne version opretter ingen tabel og
ændrer ingen eksisterende tabeladgang.
