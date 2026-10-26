# DEC-0148 – Rettelsesdeploy og vejrhentning er separate forløb

**Status:** Aktiv
**Dato:** 2026-09-14
**Besluttet af:** Ejeren efter den første integrerede cutover
**Berører:** Releasevej, Pages-artifact, privat runtime, normal vejrhentning og kildekontrol
**Supplerer:** DEC-0045, DEC-0119 og DEC-0144

## Kontekst

RavRadars normale produktionsworkflow har hidtil koblet kodeinstallation, ekstern vejrindhentning, datagenerering og Pages-deploy tæt sammen. En langsom DMI-/Copernicus-kørsel eller en fejl efter mange minutters dataarbejde kan derfor forsinke en uafhængig kode- eller UI-rettelse og gøre det uklart, om fejlen tilhører rettelsen eller vejrhentningen.

Efter cutover findes en gemt privat integreret runtime og et offentligt, allerede publiceret datasæt. De kan genbruges eksakt ved en rettelsesrelease. En rettelse behøver derfor normalt ikke vente på nye eksterne vejropkald.

## Beslutning

1. Almindelige kode-, UI-, tekst-, workflow- og fejlrettelser leveres som udgangspunkt gennem en **kode-only rettelsesdeploy** uden DMI-, Copernicus-, Open-Meteo- eller anden ekstern vejrhentning.
2. Rettelsesdeployet skal genbruge det senest publicerede, gyldige offentlige datasæt eller den eksakt identificerede gemte private runtime. Genbrug skal være hash-/manifestbundet, privacy-sikkert og fail-closed; tomme eller ukendte data må ikke omdøbes til komplette.
3. Hvis rettelsen ændrer en modelimplementation, må den gemte private runtime kun føres frem gennem en eksplicit, afgrænset migration, som beviser de tilladte ændringer. Målinger, historik, scorestate og vejrdata må ikke omskrives som sideeffekt.
4. Kode-only deployet må ikke kontakte vejrleverandørerne og må ikke vente på en normal vejrkørsel. Det kontrollerer alene reel kode-/asset-startbarhed, model-/runtimekompatibilitet, dataintegritet for det genbrugte artifact, privacy og deployidentitet.
5. Den normale vejrhentning startes bagefter som et selvstændigt, tidsbegrænset forløb. Dens succes eller fejl kan ikke ugyldiggøre det allerede publicerede rettelsesdeploy; ved fejl bevares det senest gyldige datasæt.
6. En ændring, der af natur kræver frisk data, ny geometri, en datamigration eller et databaseskema, må udføre den nødvendige særskilte data-/databasefase. Det er en konkret undtagelse, ikke standardvejen for rettelser.
7. Den tunge fulde data- og releasevalidering hører til en kørsel, der bygger frisk produktionsdata. Kode-only deploy bruger den lille produktkritiske sourcegate plus eksakt genbrugs-, privacy-, artifact- og deploykontrol; historiske og ikke-produktkritiske tests må ikke blokere den.
8. Den persistente produktionsvej er manuelt aktiveret og kræver den præcise bekræftelse `DEPLOY-CODE-ONLY-REPAIR` på eksakt `main`. Ejeren godkendte udtrykkeligt workflowets Pages/OIDC- og Supabase-write-rettigheder 2026-09-15. Det er ikke en automatisk push-, schedule- eller watchdogvej.
9. Kode-only må genbruge en grøn sourcegate fra PR'ens eksakte head efter merge af samme commitindhold; den må ikke køre kildekontrollen igen. Manglende eller uens sourcebevis stopper deployet.
10. En allerede installeret migration er read-only. Hvis modelbindingen ændres, bruges et nyt reproducerbart append-only-led, og databaseplanen må være tom ved sikker retry eller indeholde præcis det forventede ene nye led.
11. Ved en historisk-til-aktuel bindingsvedligeholdelse må det nye databaseled acceptere præcis den forseglede offentlige forgænger og den nye binding under deployovergangen. Den centrale `activeModelBinding` forbliver den afgørende skrivekontrol; derfor mister forgængeren automatisk skriveadgang, når aktiveringen er fuldført. Dette er en overgangsbro, ikke en generel fallback.

## Tillæg 26. oktober 2026 — den aktuelle installerede familie er ikke en gammel opgraderingsrute

Bevarede udstedte historiske bindingsfiler er arkivbevis, ikke tilstrækkelig anvendelighed for en ny kode-only-kørsel. En installeret aktuel kilde må ikke afvises alene, fordi en gammel controller fortsat findes og kræver sin daværende C/I/T eller migrationsslutning.

En særskilt aktuel installed-only-udvælgelse kræver den faktisk udstedte aktuelle familie, præcis C/I/T og kildefase, normal main-kalder samt alle opgraderings- og recoveryvalg slået fra. Før privat genbrug skal den eksisterende aktuelle planlægger bevise hele den faktisk installerede historie og en tom plan. Databasekontrakter og schema2 genlæses; ruten udfører ingen SQL-apply og sætter ingen gammel upgrade-/Edge-autoritet.

Autentificeret current-runtime er obligatorisk. Afvisning må ikke åbne en historisk fallback. Alle almindelige original-, no-loss-, privacy-, artifact-, readiness- og Pages-kontroller består, og B publiceres før S. De gamle 585/586/origin-planers førskrivningskrav, migrationsgrænser og afslag udvides ikke.

Den konkrete lokale 588-kaldermålprøve består med 39 tilfælde uden fejl eller skip. Præcis ny kilde-CI og faktisk providerfri levering er fortsat åbne. SOURCE589 har en anden standardfase og skal integreres udtrykkeligt; dette tillæg giver ingen automatisk adgang til ukendte eller blot nyere familier. Aktuel kørselsevidens føres privat, ikke som fastlåste offentlige driftsidentiteter.

## Konsekvenser

- Rettelser kan komme online på minutter i stedet for at vente på en lang providerkæde.
- En ekstern vejrfejl kan ikke rulle en gyldig kodeleverance tilbage eller gøre den uigennemskuelig.
- Vejrrettelser installeres først og bevises derefter i den næste normale vejrkørsel.
- Den senest gyldige offentlige tilstand forbliver synlig, indtil en ny atomisk vejrproduktion er fuldført.
- Kode-only betyder ikke kontrolfrit: konkret dataintegritet, private data, modelbinding, artifact og deploy forbliver beskyttet.
