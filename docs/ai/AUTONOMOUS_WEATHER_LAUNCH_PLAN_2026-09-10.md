# Tillæg 2026-09-11 – 4.0.342 skal lukke providerresten uden whole-asset-starvation

4.0.341 er merged på `main` som `caa49c42`. Backend `34534769955` blev rapporteret grøn, men oneoff `34534764449` gav intet handoff eller cutover. Den isolerede WAM-candidate bevarede aktiv cache, men alle 91 NSB-assets mistede deres ellers gyldige søskenderækker ved enkelte partafvisninger. Copernicus kunne tilsvarende kassere returnerede exact-hour-rækker, når én anden bestilt time manglede.

4.0.342 erstatter alene de to for grove admissionsgrænser. WAM admitteres pr. komplet exact-asset-lineage part/time-tuple efter fuldt assetgennemløb; rejected slices er uændrede, og global fejl eller komplet anden native lineage stopper fortsat hele stagen. Copernicus bevarer exact returnerede U/V-par fra et strukturelt validt shard og sender kun resten videre. Candidate-isolation, promotion, qualityfase, fallbackproveniens, cold-start, DMI → Copernicus → Open-Meteo og alle slut-/launchgates består.

Den operative rækkefølge ændres ikke: samlet lokal slutmatrix → versions-/RDKS-lukning → én exact-head sourcegate → sikker merge → kontrolleret main-writer på bevarede cacher → current 79.414/79.414 og bølger 79.060 + Feggesund 354/354 → fulde post-data-gates/handoff/cutover → offentlig verifikation. Normal og watchdog forbliver deaktiveret. Samlet WAM er grøn `63/63`, WAM-historik `35/35` og checkpoint `21/21`; de tre Copernicus-tests, Python compile og code diff-check er også grønne. Privacy-/releasepakningskontrol, exact-head-CI og runtimebevis mangler fortsat.

# Autonom natteplan – ejerens godkendelse 2026-09-10

## Aktuel 4.0.341-opdatering

4.0.340 er nu på main som `b41ed5b64ac0ca3e89ab72d16afbdcbe7d474fc7`. En lokal 4.0.341-kandidat lukker den efterfølgende WAM-fejl uden cache-reset: collection/modelRun behandles i en isoleret kandidat, reelle huller og hale kan fremmes straks efter komplette assets, mens ren kvalitetsrefresh af en allerede komplet WAM kun vurderes ved fuld primærfaseafslutning. Ufuldstændige kandidater, budgetstop og interrupts må ikke flytte aktivt checkpoint eller run-identitet. En eventuel ældre fallbackfase er terminal, bounded og bevarer egen provenance.

Slutdomænet er `(670 native WAM-dele + 3 Feggesund direct/proxy-dele) × 118 = 79.414` bølgerækker. Currentkæden forbliver DMI → Copernicus → Open-Meteo, gamle valide rækker bruges til fuld ny erstatning, og op til 48 timers verificeret historik bevares rådgivende. Måltests er kun grønne lokalt; 4.0.341 er ikke committed, CI-valideret, merged eller kørt i produktion.

Normal vejrkørsel og watchdog skal forblive deaktiveret under releaseforløbet. Næste sikre sekvens er: afslut release-/RDKS-pakken; målrettet sluttest; én exact-head sourcegate; sikker merge; én kontrolleret main-writer med faktisk cache-/WAM-bevis; fulde post-data- og modellanceringsgates; offentlig verifikation. Først derefter genaktiveres vedligeholdelsen kontrolleret. Udskudte opgaver gennemgås efter launch og klassificeres som løst, delvist dækket eller fortsat nødvendige.

## Autoritet og næste handling

Ejeren har svaret ja til de forberedte lokale måltests og har samtidig givet en aktuel samlet ordre: den anden ventende rettelse skal også i luften; datahentning/cache skal fungere og vedligeholdes stabilt; derefter skal den nye scoremodel online; kontrollen fortsætter efter launch, hvorefter de udskudte opgaver tages op. Helhedsvurdering og kritisk selvkontrol skal ske ved relevante milepæle, ikke som gentagen analyse fra nul.

- Den midlertidige lokale testpause er OPHÆVET. Spørg ikke igen om samme tilladelse.
- Den allerede committede 4.0.340 WAM-/modelbindingsrettelse i PR #274 bevares og indgår i samme endelige releasepakke som den nye vejrlivscyklusrettelse. Den må hverken glemmes, nulstilles eller behandles som allerede produktionsverificeret.
- Den gamle annullerede kørsel 34398417483 må ikke genstartes. En ny præcis færdig kodehead skal have sit nødvendige nye CI-bevis; stående PR-/mergeautoritet og den nye autonome launchordre giver ramme for dette, ikke lov til at omgå rødt/ukendt bevis eller genstarte den gamle annullerede test.
- Ingen vilkårlige run-annulleringer. Afslut/vent på relevante cache-saves før main-skift. Kun én tung writer.
- Ingen cache-nulstilling, destruktiv oprydning, nye betalinger, ændring af geometri eller omgåelse af dataintegritet er autoriseret af denne ordre.
- Model bekræftet af ejeren: GPT-5.6 Sol, Indsats Ultra. Ejeren har også udtrykkeligt fastholdt launchovervågningen og gentaget autonom/ kontinuerlig fortsættelse. Lokale måltests er startet; se WEATHER_LIFECYCLE_TEST_EVIDENCE_2026-09-10.md. Ingen ny permissionrunde for de allerede godkendte handlinger.

## Arbejdsrækkefølge med observerbare resultater

1. **Samlet lokal målmatrix.** Verificér runtime/dependencies uden at gentage setup unødigt. Kør målrettet plan/builder, CP/OM-banker og recovery, DMI-prioritet/genbrug/checkpoint/cold-start, workflowforløb samt den eksisterende WAM-/bindingsrettelse. Syntetiske tests og replay bruger særskilte temp-output, aldrig den eneste cachekopi. Parallelisér kun uafhængige tests uden fælles mutable fixtures. Saml fejl pr. rodårsag; sænk ikke en vigtig test blot for grønt resultat.
2. **Afsluttet releasepakke.** Kontrollér den faktiske dependencykæde og generér kun reelt ændrede bundles/bindinger. Bevar de otte anvendte migrationer bytefast; pending suffix skal passe. Kør nødvendige korte versions-/RDKS-/integritetskontroller. Ingen private donorbanker, .cache, .tmp, forensic outputs, secrets eller inspect-scripts i commit/PR.
3. **Ny exact-head CI og sikker merge.** Brug én samlet afsluttet head. Den fulde kildegate skal bestå i GitHub én gang på denne head; ingen blind lokal gentagelse. Den gamle annullerede kørsel forbliver stoppet. Grønt topikon uden passende job/step/bevis er ikke nok.
4. **Kontrolleret faktisk cacheopfyldning.** Genbrug eksisterende data efter deres beviser. Vælg almindelig kørsel når reelt restarbejde/budget kan række; oneoff alene når nødvendig. Ingen blind kæde af lange oneoffs. Kontrollér faktiske provider-saves og restore af næste generation, ikke kun lokale flags. Supabase/GitHub/transportkvote og cachevolumen indgår før gentagen tung drift; ingen køb/planændring.
5. **Bevis stabil vedligeholdelse før scorelaunch.** Kræv komplet brugbar relevant prognoseakse og efterfølgende faktisk vedligeholdelse, ikke blot et enkelt øjeblik med fuld cache. Sammenlign overlappende par mellem generationer, legitimt udløb/ny hale, kildeskift og konkrete tilbagefald. En lille totalrest er ikke alene bevis for prioritet, og bedre DMI-egenandel er ikke det samme som mindre samlet rest. Følg også nødvendige WAM/Feggesund-/lagbroinput og 48h faktisk historik. Alder alene eller valgfri parent-strøm må ikke blive nye blokeringer.
6. **Ny scoremodel online.** Når cache og vedligeholdelse er dokumenteret tilstrækkelig og nødvendige input er komplette: korrekt same-head backendreadiness/handoff, fulde post-data-valideringer og releasegate, atomisk cutover og verificeret offentlig model/commit/datasæt. Ingen sikkerhedspåstand ud fra lokal test alene.
7. **Efter launch fortsættes kontrollen.** Følg almindelige vejropdateringer, friske offentlige prognoser, genbrug, kildeprioritet, fejlbevaring, jobkø, varighed og kvoter. Foretag relevant samlet desktop-/mobil-/score-/admin-/runtimekontrol. Først derefter gennemføres de udskudte forbedringer med shadow/reversibel overgang og uden at forstyrre fungerende drift.

## Konkret kritisk driftsvurdering

- Reelle interne huller OG hale først; derefter DMI-kvalitet, CP og OM som reserve.
- Bevarede brugbare par/proofs skal overleve timeskift, leverandørskift, normal↔oneoff og en afbrudt kørsel.
- Ved uventet tilbagefald: sammenlign faktiske generationer og record/proof-kategorier før ny hypotese. Tidsvinduesforskydning må ikke bruges som udokumenteret forklaring.
- Ved dårlig hastighed: mål net, decode/parse, provenance/ledger, codec/checkpoint, kø og save. Optimér den beviste flaskehals; øg ikke blot tidsbudget og gentag.
- Ved ny fejlklasse: gennemgå dens producer/consumer/scheduler/cache/public/gate-konsekvenser samlet. Ved samme gentagne fejl stop gentagne uændrede kørsler og undersøg den fælles årsag.
- Fuld cache betyder komplet brugbar påkrævet dækning, ikke at alle rækker kommer fra nyeste DMI-kørsel. Forbedringer må ikke slette gode reserver først.
- CP-bankens 168h-retention/versionvækst og 1GiB-loft samt faktisk peak-RAM er stadig umålt. Det samme gælder OM-transportfejlenes aktuelle leverbarhed. Et loft er ikke bevis for bæredygtig drift.
- Skeln altid skrevet, statisk reviewet, måltestet, CI-valideret og faktisk produktionsverificeret. 100% fejlfri drift må ikke loves.

## Udskudt, men ikke glemt

**Ejerens nye præcisering:** Backloggen skal revideres mod denne rettelses faktiske kode og resultat, ikke eksekveres mekanisk. Klassificér hvert punkt som løst, delvist dækket, fortsat nødvendigt eller bortfaldet med kort bevis. Lagring af kildehistorik er eksempelvis ikke automatisk fuldt replaybevis; nye donorbanker er heller ikke automatisk en løst remote-egresskontrakt.

Ved backlogrevision genverificeres: (1) tabsfri shadow-cachetransport, (2) almindelig cadence/ekstern cron inkl. WAM-proxy/Live-EDR-latens, (3)48h-OM-historik/replay, (4)bounded DB-loginretry, (5)tidligt readiness-versioninterval, (6)risikobaseret testopdeling, (7)scorekontinuitet ved providerskift, (8)immutable flerpakkehistorik/selector. Aktive kilder er ACTIVE_ROADMAP, IMPLEMENTATION_STATUS, KNOWN-ISSUES og DEC-0119. Readinessintervallet er senest nedklassificeret til mulig spildtid, ikke dokumenteret bypass af den senere ubetingede backendgate. Glatning/blending er ikke allerede godkendt.

Kontrolleret almindelig vedligeholdelse før launch måles ved afgrænsede kørsler inden for faktisk kapacitet. Det er ikke automatisk genaktivering af højfrekvent cron før transport-/budgetbevis; der må ikke skabes en cirkel, hvor enhver vedligeholdelsesprøve kræver fuld efter-launch-ombygning.

Efter stabil scorelaunch: tabsfri privat cache-/runtime-/archive-transport med egresskontrol i shadow; kildeattesteret 48h-OM-historik; measured normal cadence og ekstern cron som primær scheduler; øvrige aktive roadmapopgaver efter deres faktiske afhængigheder. Den eksisterende kapacitetsundtagelse ved første cutover er ikke generel tilladelse til ubegrænset normaldrift. Præcise udskudte kilder fastholdes i det aktive roadmap.

## Udgangspunkt ved denne autorisation

Main senest verificeret b0ca7f5d/4.0.339; PR #274 committet head c4043bf7 med betydelig efterfølgende lokal rettelse. Seneste gennemgåede oneoff havde535 currentrester og WAM MISSING_HOUR. Dette er historisk levende bevis, ikke den nye kodes resultat. Ingen test/compile/CI/providerkald/commit/push/merge/produktion er kørt i dette autorisationsafsnit.

Se WEATHER_LIFECYCLE_IMPLEMENTATION_CHECKPOINT_2026-09-10.md for præcis implementation og WEATHER_COLLECTION_SYSTEM_REVIEW_2026-09-09.md afsnit7 for fund og uafklarede bevisgrænser.
