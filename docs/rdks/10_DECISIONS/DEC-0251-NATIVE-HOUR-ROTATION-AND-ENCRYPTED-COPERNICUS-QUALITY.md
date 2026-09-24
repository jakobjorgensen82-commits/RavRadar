# DEC-0251 – Rotér kritiske DMI-timer og giv Copernicus en krypteret kvalitetstur

**Dato:** 2026-09-24  
**Status:** Merged 4.0.481; liveeffekt afventer efter 4.0.482-restore, se DEC-0252

4.0.480 på main (`38fa4c27`) gennemførte normalrun `35939353111`, genbrugte
4.0.479's seneste private pakke, gemte ny pakke/checkpoint og deployede
`rr-20260924012618-210` for 00:00 UTC. Kontrollerne var grønne, og på
77.395 fælles kystdel/time-positioner mistede ingen af de fem vejrtyper en
gyldig værdi. Det beviser Limfjordskant-rettelsen, ikke komplet vejrdata.

Det nye offentlige 118-timers vindue har 79.414 positioner pr. vejrtype.
Der mangler 5.659 vind, 5.919 bølger, 5.868 havstrøm, 66.491 vandstand
og 31.653 vandtemperatur. Tallene kan ikke trækkes direkte fra sidste runs
79.414-tal som regression, fordi de tre nye haletimer erstatter tre gamle.
Havstrømsresten ligger i 57 dele, overvejende Limfjord. Open-Meteo havde
5.713 uløste egne par, især null/ingen nærkystværdi; det er ikke det samme
som den offentlige rest efter alle kilder.

Kædens dokumenterede planlægningsbarrierer:

1. DMI's `dkss_lf` begyndte ved første officielle time i den nye modelkørsel
   og nåede 31 af 115 assets inden sit afgrænsede budget. Alle 115 havde
   fortsat kritiske lokale strøm- eller DMI-only-vandstandshuller. Den
   hidtidige ældst-først-sortering gav næste modelkørsel samme start og
   udsatte den sene prognose. Bølge-, atmosfære- og andre marinefamilier
   beholder deres eksisterende reserver. Et forsøg er ikke bevis for en
   gyldig værdi.
2. Copernicus' operationelle kø udelod de par, som den validerede
   Open-Meteo-bank allerede dækkede, for først at gå efter reelle huller.
   Den særskilte post-build-kvalitetskø i `update-and-deploy.yml` er
   permanent slået fra, fordi den brugte en gammel ukrypteret cachevej.
   Derfor kan en komplet Open-Meteo-reserve gøre Copernicus' overtagelse
   inaktiv, selv om kildeprioriteten stadig er DMI → Copernicus →
   Open-Meteo. Dette er planlægning, ikke en fejl i selve admissionreglen.

4.0.481 bevarer tre nærmeste targettimer først inden for hver kritisk
DMI-klasse, men roterer derefter de øvrige native timer fra en varigt gemt
markør for **faktisk forsøgte** assets. Også et nul-/fejlsvar flytter
markøren. Den gælder ikke DMI's bounded vedligeholdelseskø og ændrer
ikke gyldighed, modelrun, parprioritet, Limfjord-fastholdelse, kildebevis
eller vandstandens DMI-only-regel.

Efter at dagens offentlige vejrpakke er bygget, men før næste private
fremdrift krypteres, får Copernicus højst 360 sekunders valgfri
`--refresh-only`-arbejde. Det genbruger den eksisterende transaktionelle
donorbank/source-stage, validerer stage igen og lader dagens offentlige
resultat være urørt. En leverandørfejl ændrer ikke dagens deploy; ugyldig
stage efter forsøget må derimod ikke gemmes som gyldig fremdrift. Kun den
eksisterende krypterede cache lagrer næste-runs private resultat, aldrig
det pensionerede ukrypterede GitHub-cachejob.

Den brede runtime-hash ændres af producentfilen. Kun den præcist
identificerede 4.0.480-pakke (`38fa4c27`, ovenstående datasæt og target)
har en engangsovergang med eksakte tre kontrakthashes og fuld arkiv-
og payloadkontrol. Andre forgængere afvises.

**2026-09-24-tillæg:** Exact-head `35951509094` bestod, og 4.0.481 blev
merged som `64599ed4`. Normalrun `35952076841` nåede ikke
leverandørkald, fordi den efterfølgende lokale bundle-restore afviste
den cache, som beskyttet restore allerede havde godkendt. Denne
restore-kant rettes særskilt i DEC-0252; planlægningsvirkningen er
fortsat ubevist live. Næste trin er én ikke-overlappende normalrun
efter 4.0.482's exact-head og merge. Mål eksakt
cachelineage, DMI-native
timer pr. familie, Copernicus' nye bank- og offentlige andel i efterfølgende
run, hver vejrtype, 57-del-rest, Feggesund, gemning, checkpoint, Pages og
offentlig prognose. Hvis andele eller huller stagnerer, stands nye runs og
undersøg faktisk leverandørsvar/geometri. Cron forbliver pauset, og 100 %
dækning er ikke påstået.
