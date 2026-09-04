# Afgrænset fortsættelse af engangsopfyldning

## Tillæg 2026-09-05

Run `33918250039` viste en anden fejlklasse end downloadbudget: ét HARMONIE-asset hang over 52 minutter i ecCodes, til GitHub dræbte DMI-trinnet efter 55 minutter. Derfor går oneoff-wrapperens producentkald nu gennem den samme bounded supervisor som normal drift. Downloadbudgetfortsættelsens højst tre passeringer, fælles deadline, 4-GiB-grænser og øvrige adgangskrav er uændrede. Se `DMI_HARMONIE_ASSET_WATCHDOG_2026-09-05.md`.

Den nedenstående status beskriver det historiske 2026-09-04-checkpoint før denne opfølgning.

Status: lokal og måltestet oven på main `bc9c52e6`; endnu ikke pushet eller kørt i GitHub. Den igangværende engangskørsel `33899069301` bruger den mergede kode uden denne opfølgning.

## Målt årsag

Engangskørslens DMI-trin bestod 17:31:02Z efter 16m54s, og alle tre cachefamilier blev gemt. HARMONIE-læse-/vindreferencerettelsen gav nu primær vind på alle 673 kystdele. Der blev dog kun behandlet seks af 20 udvalgte vindfiler, til 5. september 06Z. Den valgte officielle 12Z-generation havde cirka 54,6 timers kataloghorisont. Den korte læste serie skyldtes altså ikke, at DMI kun tilbød 13 timer.

Downloadtælleren var 4.067.179.700 bytes mod et loft på 4.294.967.296 bytes; næste fil ville overskride loftet. Den eksisterende besked identificerer downloadbudgettet entydigt, men det fælles budgetstop mærkes fejlagtigt `RUNTIME_BUDGET_REACHED`. Fejlmærkningen er dokumenteret, ikke brugt til at bortforklare den konkrete årsag. Den eksisterende producent bevarer partial progression; 427 færdige assets blev sprunget over.

Et større downloadloft alene er ikke tilstrækkeligt sikkert: `prune_raw_cache()` kaldes først ved afslutningen. Selv med uændret cacheloft kan det derfor øge den midlertidige diskbelastning markant.

## Minimal genbrugsløsning

Kun det store manuelle `operational_118_preflight` bruger den nye `run-dmi-oneoff-fill.py`. Den kalder den uændrede DMI-producent højst tre gange. Hver passering har fortsat højst 4 GiB nyt download og højst 4 GiB afsluttende råcache. Samlet nyt download er dermed højst 12 GiB; den gemte råcache udvides ikke. Hver passering afslutter den eksisterende transaktionelle gemning og oprydning, før næste kan starte.

Alle passeringer deler én 3.000-sekunders tidsramme. Den næste producent får kun resterende sekunder; den eksisterende 180-sekunders afslutningsreserve bevares. Der startes ingen ny passering med under 300 sekunder tilbage eller under 5 GiB ledig disk, svarende til én downloadblok plus 1 GiB reserve. Workflowets 55-minutters tringrænse og 180-minutters totalgrænse ændres ikke.

Fortsættelse kræver exit 0 fra producenten, en ny afsluttende cachefil med samme låste reference, dokumenteret oprydning under 4 GiB, faktisk nye behandlede assets og udelukkende de kendte bevarede downloadbudgetstop. Andre fejl, tidsstop, manglende fremgang, ændret reference eller ugyldig slutrapport bliver ikke automatisk gentaget. Rå inputdata og fejlpayloads udskrives ikke af wrapperen. Den eksisterende producents outputs og efterfølgende gates bevares.

Dette garanterer ikke fuld dækning eller officielle timer, som endnu ikke findes. Ved udtømt tids-/passerings-/diskbudget bevares sidste producentresultat og gemt progression; fuld current-closure og runtimeaudit afgør stadig den faktiske komplethed. Ingen READY-status opfindes.

## Afgrænsning og beviser

- Almindelig vejrproduktion, scheduler, intervaller, kildeprioritet, punkt-/geometrisemantik, producent, cacheformat, scoremodel, state og SQL ændres ikke.
- Ni syntetiske tests dækker fælles nedtællende deadline, højst tre passeringer, reference-/readiness-/budgetbinding, diskreserve, stop ved andre fejl og nul fremgang, obligatorisk oprydning, privatliv, korrekt bevarelse af exitkode og den faktiske indgangs krav om en ny afsluttende cachefil.
- Den eksisterende samlede workflowkontrakttest kræver den nye one-off-indgang og udfører måltesten. Hele den berørte workflowtest er grøn lokalt. Ingen fuld lokal kildekontrol er kørt igen.
- Før ny PR/merge skal det aktuelle Copernicus-/regionalresultat indgå i det samlede review. Kontroller derefter normal prioritering og intervaller efter ejerens aftalte opfyldning-før-balance-rækkefølge.
