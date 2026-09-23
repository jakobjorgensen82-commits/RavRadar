# Åbent: DMI/Copernicus fylder for lidt i havstrømsprognosen

**Helkæde-opfølgning 2026-09-23 / 4.0.471:** Den sikre plan før DMI
for `35823773587` viste ingen installeret DMI-, CP- eller OM-bank
for netop dette target. Grænsen på to DMI-vedligeholdelsesassets ved
allerede dækket fallback kan derfor ikke forklare dette runs lave
DMI-tal; den er en mulig barriere i senere runs, som måles særskilt.
Copernicus' `IN_PROGRESS`-stage kan ifølge kildekontrollen være
genbrugelig med nul valgte poster. En grøn stagegate beviser altså
ikke Copernicus-dækning. 4.0.471 gemmer derfor stage-status samt
valgte og resterende par i den payloadfri normalrun-diagnose. Det
ændrer ikke kildevalg eller adgang til rå data. Open-Meteo-rapporten
sluttede med 5.201
restpar, 8.284 null i hastighed/retning, 24 gitterafvisninger og syv
transporttimeouter uden udløbet totalbudget. Nyeste cachelineage,
target, faktisk valgte kilde og hver vejrtype skal følges ved næste
normale run. Der ændres ikke prioritet eller gyldighed på gæt.

**Status 2026-09-23:** Observeret i normalrun `35823773587`; årsager og
rettelsens effekt er endnu ikke fuldt livebevist. Dette handler om de
79.414 kystdel×time-par for havstrøm, ikke om lokal vind, bølger eller
vandstand. De vejrtyper skal opgøres særskilt.

Den dataminimerede plan umiddelbart før Copernicus viste 25.793 DMI-par,
424 fra regional DMI og 53.197 rester. Slutresultatet havde 0 par fra
Copernicus, 47.996 fra Open-Meteo og 5.201 ærlige huller. Planen før
Copernicus kaldte selv DMI `ready=false`; en grøn samlet GitHub-kørsel
er derfor ikke bevis for ønsket DMI-first-dækning. Copernicus' nul er
heller ikke ensbetydende med nul hentning: segmentkvitteringer for cirka
1.800 par blev gemt, men ikke konsolideret til den udgivne source-stage
før tidsgrænsen. Den nuværende genindgang skal konkret bevise, at de
kvitteringer kan afspilles og blive til anvendt cache, også når target
flyttes. Ingen kildeandel kan kaldes repareret på grundlag af kode alene.

DMI-loggen tæller faktisk behandlede prognosetrin pr. samling: DKSS IDW
1, DKSS NSBS 43, DKSS Limfjord 51; bølger WAM DW 92 og WAM NSB 44;
HARMONIE 1. Det er en skæv arbejdsfordeling, som kan begrænse DMI's
fremgang. DEC-0241's nye vindtur er afgrænset til slack efter de
eksisterende havreserver; den retter ikke automatisk IDW/NSBS/Limfjords
havstrømsfordeling. Den skal måles og ændres, hvis næste normalrun igen
efterlader en DMI-samling næsten ubehandlet.

Som sammenligning havde plan før Copernicus i `35506992220` ved et
*andet target* 39.441 DMI-, 10.722 Copernicus-, 784 regional- og 23.097
Open-Meteo-par. `35513058150` havde 28.135 DMI- og 6.162
Copernicus-par. De forskellige targettimer gør dette til en bekymrende
trend, ikke i sig selv bevis for at én bestemt cache blev overskrevet.
Kontrollér den eksakte cachelineage, valgt modelrun, gyldighed og
behandlede DKSS-assets før en årsag fastslås.

Open-Meteo-rapporten for `35823773587` angiver 57 kystdele og 5.201
restpar, 8.284 null-værdier, 24 afviste gitterafstande, syv
transporttimeouter og fire uafsluttede batches. `runtimeBudgetReached`
var `false`. En generel tidsforøgelse er derfor ikke en tilstrækkelig
forklaring eller rettelse. Resten skal opdeles efter sted, time,
leverandørrespons og afvisningsgrund, uden at slække på gyldighed.

Næste kontrollerede normalrun skal vise før-/eftertælling pr. leverandør,
de tre DKSS-samlingers faktiske trin, Copernicus-kvittering → stage →
slutresultat, Open-Meteo's eksakte rest og bevaret privat cache.
Forbedring af kildeandel må ikke ske ved at overskrive gyldig DMI med
fallback eller acceptere tomme værdier som data.
