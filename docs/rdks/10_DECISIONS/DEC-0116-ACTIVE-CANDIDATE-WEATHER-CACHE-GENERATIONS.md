# DEC-0116 – Aktiv og kandidatbaseret vejrcache uden modelrun-nulstart

- **Status:** Bindende, lokalt implementeret; exact-head-, main- og runtimebevis afventer
- **Besluttet:** 2026-09-05
- **Ejerbeslutning:** Normal drift skal genbruge gyldige data, kontrollere hele prognosevinduet og målrettet lukke både interne huller og hale. Mindst 48 timers verificeret historik til mobilisering og transport skal bevares.

## Problem

Den hidtidige private DMI-zonecache blandede en komplet brugbar generation og en nyere ufuldstændig progression under samme restore-prefix. Den operationelle ledger er med vilje bundet til ét modelrun pr. collection. Når restore derfor valgte en nyere delvis modelkørsel, kunne allerede gemte rækker fortsat findes fysisk, men de kunne ikke tælle i den nye ledgers kildebevis. Et almindeligt modelrunskifte kunne dermed få den målte rest til at vokse voldsomt og ligne en cache, der var begyndt forfra.

Det var ikke acceptabelt at løse dette ved at lempe provenance, blande modelruns i samme ledger, genmærke gamle data eller lade en delvis cache erstatte sidste komplette grundlag.

## Beslutning

1. Den afledte DMI-zonecache har to adskilte generationer:
   - **aktiv:** seneste strict-verificerede DMI_READY-generation under .cache/dmi-active-complete.json og cachefamilien dmi-zone-active-v1;
   - **kandidat:** isoleret ikke-annulleret progression under .cache/dmi-candidate-progress.json og cachefamilien dmi-zone-candidate-v1.
2. Den aktive generation bootstrapper én gang fra den eksakte livecache `dmi-zone-cache-v1-Linux-2026-W36-33984291027-1` fra run `33984291027`. Det samlede run fejlede senere i Copernicusleddet, men DMI-producenten, den progressive DMI-cache-save og DMI-terminalkravet var alle `success`. Det gør cachen til et afgrænset DMI-donorbevis, ikke til et komplet produktionsbevis: restore skal stadig bestå strict READY og den nye eksakte registrykontrol, som stopper fail-closed ved enhver afvigelse. Et andet wildcard-hit fra den gamle progressive familie må aldrig blive aktivt grundlag. Efter første nye active-save bruges kun active-familien.
3. Både normal produktion og den store 118-timers-oneoff materialiserer først den sidste strict READY-active-generation som donor. Alt nyt DMI-arbejde læses og skrives derefter i den samme serialiserede `dmi-zone-candidate-v1`-familie. Den fælles production-concurrency tillader kun én writer ad gangen, så normal drift og oneoff kan fortsætte samme kandidat uden parallel mutation.
4. En partial kandidat må fastholde sit valgte native run hen over et normalt seks timers modelskift, men kun mens runnet stadig leverer mindst den krævede modne/komplette fremtidshorisont, normalt 96 timer, og det samlede leverandørkatalog ikke er dokumenteret stale. Mangler kandidaten, eller er den allerede READY, vælges den nyeste komplette native run. Retention må derfor aldrig pinne et run til omtrent +120 timers alder.
5. Hver normal kørsel vurderer hele target..+117-vinduet. Den må hente den rullende hale, men skal også målrette manglende, ufuldstændige, ugyldige eller udløbne trin hvor som helst i vinduet. Et eksisterende internt hul må ikke skjules af en fjern hale.
6. Normal collectionramme er tre, så `dkss_idw`, `dkss_nsbs` og `dkss_lf` kan lukke samme nye targettime i én normal kørsel, når strict current-anchor mangler. Når anchoret er lukket, fortsætter den eksisterende mangeldrevne rotation af HARMONIE, WAM og DKSS.
7. Efter ethvert ikke-annulleret producentforsøg gemmes den partial kandidat før terminalbeslutningen. Active-familien og deploykæden må først ændres eller fortsætte efter producer-success, allowlistet status, `DMI_READY`, strict current-anchor, `candidate_promoted=true` og et nyt eksakt registrybevis. Fejl, timeout, annullering eller ufuldstændig ledger må ikke overskrive active.
8. Promotion er atomisk på jobbets låste target. En allerede READY kandidat må ikke fastholdes som preferred arbejdsrun; næste producentforsøg vælger den nyeste komplette native run. Oneoffens øvrige 210/673/118-gates er uændrede, og DMI-promotion alene er ikke komplet vejr-, release- eller produktionsbevis.
9. Normal drift er den varige updater. Den store oneoff accelererer den samme kandidatmekanisme og kan fortsætte dens partial progression, men den er ikke en særskilt eller fremtidig updater.
10. Historikkontrakten ændres ikke. DMI's private replaybuffer er fortsat normalt 60 timer og aldrig under 54, rå zonehistorik mindst 72 timer, Copernicus-retention 168 timer med den eksakte target−48..target+117-matrix, og den integrerede mobiliserings-/transportmodel bruger højst 48 timers verificeret forløb. Promotion kopierer hele dokumentet; valid historik må ikke beskæres til kun prognosehalen. Manglende historik forbliver missing og må ikke syntetiseres.
11. Kildeordenen ændres ikke: DMI → Baltic → AMM15 → policybundet regional DMI → Open-Meteo. Fallback lukker kun de dokumenterede rester efter DMI-terminalen.
12. Schedulerarkitekturen ændres ikke i denne rettelse. Det eksterne cron-job 8348098 kalder den eksisterende payloadfri watchdog ved 04,19,34,49 UTC. GitHub-schedules for produktion, pilot og intern watchdog bevares som reserve. Alle tunge vejrjobs deler fortsat den eksisterende production-concurrency og må ikke startes som en burst.

## Virkning

Et nyt UTC-timeskifte eller et nyt DMI-modelrun kan ikke længere gøre en ufuldstændig kandidat til active-sandhed eller nulstille brugbar progression. Normal drift og oneoff arbejder videre i samme serialiserede kandidat, mens sidste komplette active bliver stående. Den modne-horisont- og katalogbundne retention bevarer reelt partial arbejde uden at fastholde et gammelt run til cirka +120 timers alder.

Dette er den afgrænsede stabilitetsrettelse før modelstart. Oneoffen accelererer kun den fælles kandidat; normale kørsler vedligeholder den fremover. En senere større omlægning til selvstændige parallelle leverandørpipelines, nye concurrencygrupper eller ændrede intervaller kræver eftermåling efter komplet opfyldning og en ny beslutning.

## Beviskrav

- Målrettede producent-, provenance-, retention-, active/candidate- og workflowrækkefølgetests skal være grønne.
- validate:source skal bestå én gang på PR'ens eksakte head.
- Efter merge skal første normale kørsel bootstrappe eller ramme active-familien, fortsætte den fælles kandidat og gemme ikke-annulleret delprogression før terminalen uden at gemme den som active.
- Derefter køres én stor opfyldning ad gangen. Fælles candidate-save, eventuel promotion og efterfølgende normal catch-up skal verificeres før næste store kørsel.
- Komplethed kræver fortsat frisk 210/673/118-evidens gennem DMI, Copernicus, regional fallback og Open-Meteo. Først derefter må den nye modelaktivering fortsætte.
