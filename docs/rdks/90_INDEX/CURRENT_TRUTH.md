# Current truth – gældende projektviden

## 4.0.234-kandidat – GitHub-plan og tabsfri Supabase-diagnostik

- Ejeren har besluttet, at GitHub Actions skal eje den normale 15-minuttersproduktion. Kandidaten kører ved UTC-minut 14/29/44/59, mens Copernicus-piloten ligger ved minut 6. Dette erstatter den tidligere aktive afhængighed af cron-job.org; ekstern cron slukkes først efter et naturligt GitHub-schedule-bevis.
- En planlagt kørsel uden eksakt aktuel Copernicus-time springer hele produktionsbygningen sikkert over. Heartbeatet dispatcher piloten, og næste kørsel prøver igen. Push/manual release og 673/673-gaten er ikke lempet.
- Gentagne Supabase `57014` blev afgrænset til den meget store `runtime-diagnostics`-upsert. Kandidaten gemmer samme komplette JSON tabsfrit i et gzip/base64-arkiv med SHA-256 og byteantal. Den lokale repræsentative payload falder fra 4.014.169 til 208.874 byte; admin-download verificerer og genskaber originalen.
- Målrettede workflow-, heartbeat-, Supabase-, archive- og adminregressioner er grønne. RDKS, version, geometri-v2, de runtimeuafhængige dele af den fulde testmatrix og lokal releasegate er også grønne. Den samlede lokale `validate` rammer kun de kendte friskdata-stop: repositoryets forældede 209/211-vejrsnapshot og manglende centralt genereret `public-condition-details.json`. Pushrun, frisk 673/673, Supabase-readback, Pages-deploy og naturlig schedule-kørsel afventer; 4.0.234 er derfor endnu ikke produktionsverificeret.
- Ingen centrale land-/vandpunkter, U/V-data, pile, score, kildeorden eller afstandsgrænser er ændret.

## Åben P1 efter systematisk Chromium-audit 2026-08-18 – lokal data vises ikke konsekvent i zonepanelet

- Audit af 210 zoner og 673 kystdele bekræfter, at ejerens land-/vandpunkter er bevaret og faktisk bruges i den lokale scorekæde. Alle 673 har gyldig strømproveniens; kildefordelingen er 622 DMI, 43 Copernicus og otte godkendte regionalproxyer. U/V-retning, pilcelle, kildeklasse og afstand er konsistente. 4.0.233's ankerrettelse er derfor fortsat gyldig.
- Den direkte browser fandt en anden systemisk fejl: den lokale vinder, RavScore, tekst og debug bygges fra vinderdelen, men det synlige aktuelle vejrkort bygges fortsat fra hovedzonens `condition.current`. Blandt 414 sammenlignelige zone-/jagtformvisninger afveg strømretningen i 371, strømstyrken i 324 og vandtemperaturen i 414. Blåvand viste lokal NV 315° i debug, men N 11° i det synlige strømkort.
- Femdøgnsfanerne bruger hovedzonens generiske dagsvalg i stedet for den nationale prognoses lokale `bestForDay`. Af 1.964 sammenlignelige faner afveg score i 1.660 og bedste tidspunkt i 897. Dette kan også give hovedzonetekster som `Nord for fyret`/`Syd for fyret`, selv om den lokale kystdel har et andet præcist navn.
- Datasættet `rr-20260818201755-210` havde samlet 673/673-proveniens, men den fælles aktuelle 20:00-række var ufuldstændig i tre Limfjordszoner (`DK-B05-12`, `DK-B05-17`, `DK-B05-18`). Samlet artifactdækning er derfor ikke i sig selv bevis for 673/673 ved præcis samme aktuelle time.
- Der er ikke lavet en produktrettelse i denne session. Ingen punkter, vejrdata, score, kildeorden, 100 %-gate eller deployment er ændret. Rettelsen afventer Sol/Ekstra høj og skal samle kort, vinder, score, tekst, debug og metrikker om samme lokale del og tidspunkt samt gøre fallback og fælles timedækning eksplicit.

## 4.0.233 live og produktionsverificeret 2026-08-18 – hver kystdel bruger kun sin egen kystretning

- Ejerens Blåvand-billeder dokumenterede en reel systemisk modsigelse: `Havsande – nordkyst` blev vist som bedste del, mens transportforklaringen og RavScore valgte moderzonens anker `Syd for fyret`. Debug viste samtidig delens korrekte pålandsretning omkring 117°, men beregnede retningsforskellen mod 29°. Historikken brugte allerede delens egen retning og kunne derfor sige udtransport, mens den aktuelle score sagde indtransport.
- Liveaudit af datasæt `rr-20260818164751-210` viser, at alle 673 strømvektorer, retninger, pilceller, kildeklasser og afstandsgrænser er indbyrdes konsistente: 622 DMI, 43 Copernicus og otte regionale proxyer, nul U/V-retning-, pil/grid-, provenance-, kildeklasse- eller afstandsfejl. Pilen peger mod vandets bevægelse og skal ikke nødvendigvis pege mod kysten.
- Rodårsagen er lokal scoreopbygning i `scripts/update-weather.mjs`: kystdelen overskrev sit eget punktpar og `onshoreDirectionDeg`, men arvede stadig moderzonens `directionAnchors`. Scoremodulet prioriterer ankrene og kunne derfor vurdere en lokal strøm mod en anden kystdel. Fejlen ramte 216/673 dele i 52/210 zoner; 49 aktuelle zonevindere brugte en anden retning end deres autoritative lokale punktpar.
- 4.0.233 erstatter de arvede ankre med præcis ét verificeret lokalt anker pr. kystdel. Ankerets navn, vandpunkt, landpunkt og hav→land-retning kommer fra samme aktive 673-delskontrakt som DMI-sampling, historik, score og forklaring. Moderzonens statiske kystegenskaber bevares, men dens retningsankre kan ikke længere overtage en lokal delscore.
- Den nye landsdækkende regression kontrollerer præcis 673/673 dele og et direkte Blåvand-modbevis. Med det viste nordgående strømfelt bliver `Havsande – nordkyst` nu vurderet mod `Havsande – nordkyst` med cirka 116° forskel og klassificeres offshore; teksten må ikke nævne `Syd for fyret` som dens scoregrundlag.
- Commit `286ea9e5` bestod den fulde friske produktionskæde i `#32165688946` og igen i `#32165969786`: central geometri, vejrbygning, 673/673, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy var grønne. Den første `#32165003851` stoppede korrekt før release på fire efterladte 4.0.232-User-Agents og deployede intet.
- Direkte liveaudit af 4.0.233-datasæt `rr-20260818173528-210` kontrollerede alle 673 dele og 43.064 prognose-/jagtformstimer. Detaljefilen matcher manifestets byteantal og SHA-256. Der er nul lokale anker-, vinder/navn/score-, hav→land-retning-, ikke-nul U/V/retning-, pil/grid-, provenance-, kildeklasse- eller afstandsfejl. De 52 nulhastighedsposter har ingen fysisk retningsbetydning og indgår ikke i retningssammenligningen.
- Havsande nordkyst vælger live kun `Havsande – nordkyst` med 117,3° som lokalt anker. Den aktuelle næsten nordgående strøm afviger cirka 115° og klassificeres `offshore`; `Syd for fyret` bruges ikke længere som dens scoregrundlag.

## Aktuel live-drift 2026-08-18 – kontrolleret live-pilot er ejer-godkendt og aktiveret

- Ejeren har præciseret, at RavRadar-siden ikke er offentlig i den aktuelle udviklingsfase. Det tidligere krav om at afslutte hele syvdøgnsbeviset som isoleret spøgelsestest før aktivering er erstattet: når kildefletning, præcis 673/673, fuld provenance, pile, score, rollback, projektvalidering og releasegate er grønne på friske centrale data, må siden køre fuldt som kontrolleret live-pilot. Gyldige Copernicus-/regionalproxydata med U/V og fuld provenance må ligge online i en separat dovent indlæst historikfil og bruges i score og nye pile; kun credentials forbliver hemmelige. En versionsstyret DMI-only-nødtilstand kan fjerne pilotkilderne igen uden falsk fulddækningspåstand, mens syvdøgnsstabiliteten eftermåles i den virkelige live-runtime.

- Denne aktiveringsgate er nu bestået. Commit `5a7780e4` og central `#32158041877`/support `#3127` gav præcis 673/673: 622 lokale DMI-dele, 43 Copernicus-dele og otte regionale `dkss_lf`-proxyer. Fuld validering, releasegate, Supabase, Pages-artifact og deploy var grønne. Det første aktiveringsdatasæt blev direkte HTTP- og hashverificeret på GitHub Pages; den credentialfri historik havde ved første release 1.915 poster, 633 unikke dele og syv tider. Efterkontrol `#32160090899`/support `#3129` gentog hele kæden, 673/673 og live artifactmatch med et nyt tidsbestemt datasæt. Den kontrollerede live-pilot er derfor produktionens aktuelle sandhed, mens den naturlige syvdøgnseftermåling fortsætter.

- Frisk central #3079 efter ejerens fulde punktgennemgang gav 198/210 hovedzoner og 622/673 lokale dele med verificeret DMI-U/V inden for 5 km. Alle 51 lokale mangler er besøgt af coverage-auditten.
- Officiel rågridtest viser et supplementpotentiale: Copernicus Baltic havde eksakt fælles U/V inden for 5 km til 39 af de 51 mangler, og AMM15 havde fire yderligere vestkystpar. To af AMM15-parrene havde kun 0 m som dybeste tilgængelige lag. Tallene er et enkelt tids-/gitterbevis og ikke en stabil produktionsgaranti.
- Begge Copernicus-secrets findes i GitHub og forbliver kun i det autentificerede indsamlingsjob. Privat run `#32129799346` brugte Toolbox 2.4.1 og friske centrale punkter og bekræftede 39 Baltic + 4 AMM15 blandt de 51 DMI-huller. 4.0.232 publicerer nu den credentialfri online syvdøgnshistorik og bruger de gyldige U/V- og provenanceposter i score og pile efter den beståede 673/673-gate.
- Ejeren har besluttet en afgrænset regional fallback for de sidste otte vestlige Limfjordsdele. `data/current-regional-proxy-policy.json` tillader kun disse, kun `dkss_lf`, kun uændret samplingpunkt og højst 15 km. Det målte spænd er 5,416–12,110 km. `#32158041877` beviser alle otte i den aktive runtime med særskilt proxyproveniens som del af 673/673.
- Den private DMI-collector bygger alle otte mål på hver kørsel fra den centralt hydrerede kystdelsregistrering. Ændret samplingpunkt, anden collection, anden zoneklasse eller mere end 15 km fejler lukket. Alle andre forskningsmål og offentlige dele bevarer den absolutte 5-km-værdigrænse. En support-only rapport viser tid, modelrun, celle, afstand og lag uden rå U/V; `.cache` og `data/diagnostics` er fortsat udelukket fra Pages.
- Central `#32134021410`/artifact `#3094` beviser collectorens faktiske resultat på de friske centrale punkter: 8/8 tilladte dele, 32 private prøver ved tiderne 12/15/18/21 UTC fra `dkss_lf`, afstande 5,416–12,110 km og både overflade- og dybere lag. Rapporten har `rawVectorsIncluded=false`, ingen `uMps`/`vMps`, og supportartifactet indeholder ingen `.cache`. Den offentlige dækning er bevidst stadig 622/673.
- Kørslens fulde validering stoppede derefter før Supabase og Pages på en forældet teststreng, der forventede User-Agent `RavRadar/4.0.229` efter versionsløftet til 4.0.232. Det var en mekanisk testfejl, ikke et data- eller fysikmodbevis. Regressionen bruger nu `package.json` som versionssandhed, og #32135079819 har efterfølgende bekræftet rettelsen centralt.
- Den aktive rækkefølge er DMI ≤5 km → Copernicus Baltic ≤5 km → AMM15 ≤5 km → regional `dkss_lf`-proxy for de otte dele ≤15 km. Se DEC-0041. Kun eksakt samme tidspunkt må udfyldes. Normaldriften er `controlled-live`; `dmi-only-rollback` er den versionsstyrede nødvej.
- Pushrun `#32129778162` stoppede korrekt før release/deploy på den uændrede strømgate: 12 hovedzoner og 51 lokale dele manglede DMI, og dækningen var 622/673. Gaten er ikke lempet.
- Run `#32131021153` på commit `406353be` bestod cachegendannelse og den rekursive lækagegate. Cachen havde 629 deduplikerede records, 625 unikke mål og én gyldig time; ingen mål/kildepar havde grid- eller lagskift.
- Første faktiske cron-event `#32134686185` bestod og hentede et nyt 12:00Z-tidspunkt: 552 Baltic- og 77 AMM15-mål, 625 unikke mål, nul `surface-only` og ingen rå U/V i supportartifactet. Den tidligere 11:00Z-råcache var dog allerede LRU-fortrængt, så 12:00Z-artifactet havde stadig kun én gyldig tid.
- Repositoryets Actions-cache var da cirka 10,2 GB og bestod især af flere 2,48–2,52 GB DMI-GRIB-cacher. Det er den målte rodårsag til fortrængningen, ikke Copernicus-deduplikeringen. Den credentialfri keepalive gendanner kun den private cache hvert tiende minut for at opdatere `last_accessed`; den uploader eller logger ingen rå poster og deler concurrency med piloten.
- Manuelt keepalive-bevis `#32136328681` ramte `copernicus-current-shadow-v1-32134686185-1`. Kontrolleret backfill `#32136391556` genhentede derefter 11:00Z og samlede 1.258 records ved 11/12 UTC i samme råcache: 625 unikke mål, 629 mål/kildepar, nul gitter-/lagskift og nul rå U/V eller credentials i supportartifactet. `#32136642330` ramte efterfølgende præcis backfill-cachen. Flertidslagring er dermed centralt bevist; første automatiske keepalive-event og et naturligt tredje tidspunkt afventer.
- Pushrun `#32135079819` bekræfter, at den versionsrobuste DMI-test nu passerer centralt. Fuld validering nåede den eksisterende rumlige audit og stoppede korrekt på 622/673; Supabase og Pages blev ikke kørt.
- Efterkontrol viste, at denne audit historisk kun krævede 95 % (`ceil(673×0,95)=640`), selv om ejerens nyere beslutning er 100 %. 4.0.232-gaten er derfor skærpet til dynamisk `requiredPartCoverage=expectedParts.length`, aktuelt 673/673, med en selvstændig regression og rapportfeltet `requiredCoastalPartCoverageRatio=1`. Frisk replay mod #3094 stopper som forventet med “622/673; alle 673 kræves”.
- Pushrun `#32139054129` på commit `9e2164b8` er det centrale bevis: den nye regression bestod, den efterfølgende rumlige audit skrev “Kun 622/673 ...; alle 673 kræves”, og releasegate, Supabase-sync samt alle Pages-trin blev sprunget over.
- GitHub havde fortsat ikke oprettet et automatisk keepalive-event, da samme DMI-run gemte en ny 2,704-GiB-cache. Den private Copernicus-cache forsvandt igen; manuel `#32139755594` fandt ingen fil, og cacheindekset viste derefter tre DMI-GRIB-cacher på 2,693–2,704 GiB blandt i alt 8,126 GiB. Kandidaten gendanner derfor Copernicus-cachen restore-only i selve produktionsjobbet umiddelbart før DMI-cachearbejdet. Det gør cachen nyere end mindst én gammel stor DMI-cache uden at logge, uploade eller aktivere rå U/V.
- Kontrolleret `#32140001424` genskabte 11:00Z, og `#32140470201` genskabte 12:00Z i samme cache. Det sidste sikre artifact viser 1.258 records, to tider, 625 unikke mål, 629 mål/kildepar samt nul gitter- og lagskift; rekursiv søgning fandt ingen rå U/V eller credentialnavne.
- Commit `b6cf0383` og central `#32140865173` beviser pre-DMI-løsningen. Produktionsjobbet ramte `copernicus-current-shadow-v1-32140470201-1` kl. 13:11:48Z, gemte derefter DMI-GRIB-cachen på 2.905.014.468 bytes kl. 13:13:44Z, og Copernicus-cachen stod fortsat i cacheindekset. Cachebeskyttelses- og fulddækningsregressionerne bestod; auditten stoppede stadig med “622/673; alle 673 kræves”, og intet blev deployet. Restore-only `#32141443152` ramte og validerede samme cache efter DMI-save uden at logge records.
- Den private Copernicus-retention er nu også en hård del af normal `npm run validate`, ikke kun af den særskilte pilot. Den nye rene regression beviser inklusiv 168-timersgrænse, beskæring af ældre/fremtidige gendannelsesposter, eksakt deduplikering og fail-closed afvisning af nye poster uden gyldigt punkt, gitter, U/V, 5-km-afstand og samme tid/celle/lag. Det naturlige fulde syvdøgnsvindue er fortsat et driftsbevis, ikke erstattet af den syntetiske test.
- Commit `7f22e8e1` og central `#32143798560` CI-verificerer retentionkontrakten. Den bestod efter frisk central adminhydrering og DMI-bygning; derefter bestod 673/673-kontrakttesten, og den faktiske audit stoppede på 622/673 før releasegate, Supabase og Pages. Den private tre-timers-cache stod fortsat i Actions-cacheindekset bagefter.
- Manuel aktuel-time-driftsprøve `#32141772134` brugte ingen backfill-time og hentede 13:00Z. Den bevarede 11/12-cache blev udvidet til 1.887 records ved tre tider, 625 unikke mål og 629 mål/kildepar med nul gitter-/lagskift. `scoreImpact=false`, `publicRuntime=false`, og artifactkontrollen fandt nul rå U/V- eller credentialnavne. GitHubs næste naturlige schedule-event afventer fortsat.
- Workflowfilerne var aktive og manuel dispatch virkede, men runhistorikken viste kun ét forsinket `schedule`-event og ingen efterfølgende timeevents. Dette matcher GitHubs dokumenterede risiko for forsinkede eller droppede schedule-kørsler og RavRadars eksisterende valg af ekstern `workflow_dispatch` til produktion. Keepalive reagerer derfor også på `requested` fra `Update weather and deploy RavRadar`, som allerede startes eksternt hvert 15. minut. Den read-only gendannelse tjekker cachemetadata og aktuel UTC-time uden rå log; kun ved manglende time får et særskilt minimalt job `actions: write` til at dispatch'e den eksisterende private pilot. Lokal regression består; centralt automatisk bevis afventer.
- Forsinket schedule-run `#32146584311` hentede 14:00Z og bevarede 2.516 records ved 11–14 UTC, 625 unikke mål og 629 mål/kildepar med nul grid-/lagskift, nul rå U/V/credentials og fortsat `scoreImpact=false`/`publicRuntime=false`. Pushens automatiske `workflow_run`-heartbeat `#32146699458` ventede på samme concurrencygruppe, gendannede den nye cache, bestod metadata-/timekontrollen og markerede dispatchjobbet `skipped`, fordi 14 UTC allerede fandtes. Den centrale dubletbeskyttelse er dermed bevist; første centrale manglende-time-dispatch afventer næste UTC-time.
- Samme commits pushrun `#32146695718` bestod den nye heartbeat-regression, Copernicus-cachebeskyttelsen, 168-timers-retentiontesten og den dynamiske fulddækningskontrakt i den normale centrale validering. Den efterfølgende faktiske strømaudit stoppede på 622/673 med “alle 673 kræves”; releasegate, Supabase-sync og Pages blev ikke kørt.
- 4.0.232 binder hver afsluttet Copernicus-time til et deterministisk SHA-256-fingeraftryk af den fulde centralt hydrerede kystdelspopulation og dens vandpunkter. Samme time springes kun over ved matchende fingeraftryk og eksakt recordantal. Et flyttet punkt, et gammelt cacheformat uden indsamlingsmanifest eller ufuldstændige poster udløser frisk privat indsamling, som erstatter hele timen; ældre historik for konkret flyttede dele fjernes selektivt.
- Central heartbeat `#32149556595` fandt den gamle cache uden manifest og gennemførte både preserve- og dispatchjob. Den automatisk startede pilot `#32149592195` hydrerede 673 punkter, genindsamlede 14 UTC og gemte cachen `copernicus-current-shadow-v1-32149592195-1`. Det sikre artifact har fingeraftryk, 2.516 records ved fire tider, 625 mål, nul grid-/lagskift og ingen rå U/V eller credentials. Pushrun `#32149552657` bestod de nye regressioner og stoppede derefter korrekt på faktiske 622/673; releasegate, Supabase og Pages blev ikke kørt.
- Efterfølgende heartbeat `#32150318931` gendannede den nye manifestcache og sprang `dispatch-pilot` over. Dermed er begge grene centralt bevist: legacy/mismatch udløser frisk indsamling, mens samme komplette time og geometri ikke downloades igen.

## 4.0.231 – lokal strømpil bindes til den faktisk viste scoretime

- Den første semantik-v3-genopbygning #31930644562/#2875 behandlede `dkss_idw` og lukkede korrekt alle endnu ikke genopbyggede strømserier ude. Den målte 114/210 hovedzoner og 414/673 lokale dele; den private cache fortsatte til cursor 285 med 1.209 prøver.
- Den næste progressive kørsel #31930976129/#2876 behandlede `dkss_nsbs`. Havknude er dermed produktionsbevist rettet: 38 native tider bruger den eksakte NSBS-U/V-kolonne 2,80363 km fra det centrale vandpunkt med semantik v3. Offentlig dækning steg til 182/210 hovedzoner og 574/673 lokale dele; `dkss_lf` afventer fortsat parser-v18-genopbygning.
- #2876 fandt én separat pil-/cellefejl ved `PART::dk-b04-12-owner-approved-01`: den viste lokale score brugte kl. 12 og den korrekte DMI-celle, men det fælles `flowPoints` var beregnet ved byggetiden kl. 06:25, hvor den lokale serie manglede strøm, og faldt derfor tilbage til administratorens vandpunkt.
- 4.0.231 vælger først den lokale scorepost, der faktisk vises, og beregner derefter strømpilens position ved præcis denne posts tid. Findes der ingen verificeret celle på den viste tid, bliver der ingen lokal DMI-pil. DMI-værdi, lag, RavScore, punkter og afstandsgrænse ændres ikke.
- Målrettede pil-, DMI-, forecast-, provenance-, runtime-, versions-, håndbogs- og RDKS-kontroller består; public-runtime-testene består mod #2876-artefaktet, og lokal releasegate er grøn. Fuld lokal `validate` stopper som forventet ved det dokumenterede forældede 31. juli-snapshot før central adminhydrering.
- Privat syvdøgnsopsamling i #2876 er fortsat `retentionHours=168`, `scoreImpact=false` og `publicRuntime=false`; den står ved cursor 300 med 1.394 prøver for 630 ankre/239 dele. Ejeroversigten indeholder fortsat ingen rå U/V-værdier.
- Limfjordsgenopbygning, nul pil/grid-mismatch, den uændrede 640/673-gate, Supabase, Pages og direkte livekontrol mangler. 4.0.231 er derfor ikke deployet eller produktionsverificeret.

## 4.0.230 – strømvalg adskilt fra skalare havfelter, afventer produktion

- #31929171918/#2872 gav et afgørende modbevis mod 4.0.229-antagelsen om, at alle 77 lokale mangler var geografiske: Havknude havde et eksakt fælles NSBS-U/V-punkt 2,804 km fra det centrale vandpunkt, men offentlig runtime havde ingen strøm.
- Rodårsagen var ét globalt `marineSelection`. Et IDW-skalarpunkt 5,131 km væk havde bedre kysttypeprioritet og blokerede derfor den nærmere NSBS-strøm. Kysttypeprioren var relevant for vandstand/temperatur, men fysisk forkert som filter for strøm.
- Den bindende semantik v3 vælger nu strøm selvstændigt for hvert native forecasttidspunkt: sammenlign nærmeste komplette U/V-vandkolonne på tværs af alle aktive DKSS-collections, og vælg derefter dybeste gyldige lag i præcis den kolonne. Skalare marinefelter beholder deres separate modelvalg og kan ikke rydde, flytte eller blokere strøm.
- Cachemigrationen invaliderer v2-strøm, men bevarer gyldige skalarfelter. Parser-signaturen er hævet, så aktuelle DKSS-assets skal genbehandles. Interpolation kræver fortsat samme collection, modelkørsel, samplingpunkt, celle og lag; et skift giver `missing`.
- Havknude-regressionen bruger de målte produktionsafstande og beviser både, at NSBS 2,804 km accepteres trods IDW-skalarvalget, og at en fjernere IDW-strøm ikke kan overtage. Eksisterende provenance-, forecast-, integritets- og kortpilregressioner består målrettet.
- #2872 fortsatte den private, score-neutrale rotation til cursor 240 med 873 prøver for 469 ankre/179 dele. Af de 77 offentlige lokale mangler var 36 besøgt: én inden-for-5-km pipelinefejl (Havknude), fire ved 5–6 km, fem ved 6–8 km, 23 over 8 km og tre uden observeret fælles U/V; 41 afventede fortsat rotation.
- Offentlig 4.0.229-dækning i #2872 var fortsat 187/210 hovedzoner og 596/673 lokale dele, fordi assetet allerede var behandlet under v2. 4.0.230 er ikke deployet eller produktionsverificeret. En frisk parser-v18/semantik-v3-kørsel skal bevise Havknude og den samlede dækning gennem de uændrede gates, Supabase, Pages og direkte kortkontrol.
- Afstandsgrænsen, administratorens punkter, RavScoreformlen, fail-closed-nullerne og den geografiske gate er uændrede. Den private 168-timers 0/5/15-km flerlagscache fortsætter, og fremtidens analyse-/scorearbejde skal stadig undersøge **ydre tilførsel → overgang mod kyst → lokal bundnær levering** uden dobbelt-tælling.

## 4.0.229 – nærmeste vandkolonne før dybde, afventer produktion

- Den tidligere DMI-parser valgte det dybeste fælles strøm-U/V-lag globalt. Dermed kunne et dybt punkt 12–24 km væk slå en nær vandkolonne og blive brugt til pil og score. Det var en systemisk fejl, ikke enkelte dårlige zoner.
- Den aktive kontrakt er nu: nærmeste gyldige DMI-vandkolonne først, derefter det dybeste gyldige fælles U/V-lag i præcis den kolonne. Et dybere lag kan aldrig begrunde større afstand. 0–3 km er foretrukket, 3–5 km accepteret reserve, og over 5 km er `missing`.
- Verificeret strøm kræver samme U/V-koordinat, forecasttid, vertikallag og aktuelt samplingpunkt. Pilen står på den eksakte DMI-vandcelle, og koordinatafstanden kontrolleres også uafhængigt af cachens afstandsmetadata. Gamle cacher uden semantik v2 invalideres. Kun verificeret DMI-GRIB-strøm må bruges aktivt; direkte ForecastEDR-strøm uden kolonne-/lagbevis, Open-Meteos overfladestrøm og anden fallbackstrøm må hverken videreføres til historik eller indgå i pil og score.
- Dybdelaget er tidsbestemt, ikke én egenskab for hele serien. Hvert native tidspunkt vælger sit eget dybeste gyldige lag i den nærmeste kolonne. Interpolation kræver samme lag, celle, samplingpunkt, collection og modelkørsel på begge sider; ellers er mellemtimen `missing`. Pilen bruger den valgte times egen celle.
- Centralt reviewede kystdelspunkter bygges før DMI-sampling. Ved ændret register genbruges dokumenteret cache pr. uændret samplingpunkt, mens kun flyttede punkter kasseres og genopbygges.
- En privat, score-neutral syvdøgnscache opsamler et roterende udsnit ved 0, 5 og 15 km søværts med flere lag fra hver valgt vandkolonne. Kun en kompakt status uden rå vektorer er offentlig diagnostik.
- Den kommende forskning og et eventuelt nyt scoremodul skal analysere hele transportkæden: ydre tilførsel, overgang ind mod kysten og lokal bundnær levering med tidsforsinkelse og persistens. Der er ikke godkendt nogen ny scoremekanisme. Se DEC-0040 og DEC-0029.
- Produktforsøg #31919296190/#2846 på commit `14ce8908bcfd219055d622ef88c2e94d6f9ad37c` gennemførte central adminhydrering, frisk DMI, privat syvdøgnscache og runtimebygning, men stoppede korrekt i fuld `validate` før Supabase/Pages. Artifactet beviste et legitimt tidsligt lagskift: eksempelvis 33 native bundlagstider og én overfladetid i samme zone. Efterkontrollen antog fejlagtigt ét fast lag for hele serien.
- Read-only artifactreplay med den korrigerede tidskontrakt bevarer 11.400 verificerede hovedzone-prognosetimer. 353 kystdele med matchende aktuelle adminpunkter fik tidsbestemt provenance og nul mismatch mellem vist pil og den viste times gridpunkt; manglende progressiv DMI-dækning og 101 flyttede kystdelspunkter blev korrekt `missing`/releaseblokerende.
- #31921457227/#2850 og #31922260059/#2853 lukkede de to efterfølgende regressionsfejl i henholdsvis tidsbestemt provenance og forecast-integritet. Den fulde kæde nåede derefter den egentlige geografiske dækningsgate.
- Tre uafhængige centrale forsøg #2853–#2855 giver samme geografiske resultat: 187/210 hovedzoner og 596/673 lokale kystdele har et verificeret fælles DMI-U/V-punkt inden for 5 km. #2855 har 20.924 verificerede og 3.856 fail-closed prognosetimer; alle 3.856 er klassificeret `non-dmi-current`. Der er ingen kendt pil/grid-fejl blandt de verificerede poster.
- De resterende 23 hovedzoner og 77 lokale dele har ikke et gyldigt fælles U/V-punkt inden for den godkendte afstand. Alternative aktive DMI-modelområder gav nul brugbare kandidater inden for 5 km. De berørte poster har `current=null` og ingen pil; ingen fjern, overflade- eller fallbackstrøm indsættes.
- Den private cache er verificeret med `retentionHours=168`, `scoreImpact=false`, `publicRuntime=false` og afstandsbånd 0/5/15 km. Efter #2854/#2855 indeholder den 491 prøver for 153 ankre/58 kystdele; #2855 tilføjede ingen nye prøver, fordi alle tre DKSS-samlinger var `unchanged-valid`.
- #2855 afdækkede et opsamlingsgab: den første rotation flyttede kun cursoren, når et nyt marineasset blev behandlet. Første replayforsøg #2859 fandt nul tidsrelevante marine råfiler og beholdt cursor 90 samt 491 prøver/58 dele. Den fælles 4 GB-LRU havde ikke bevaret en replayfil blandt de øvrige store modelassets. Direkte efterkontrol af DMI-STAC viser, at det aktuelle href allerede er en stabil objekt-URL; URL-skift var ikke den målte årsag.
- Efterrettelsen fører privat manifest og prioriterer en +0–12 timers marine fil pr. modelområde før LRU under det uændrede hårde 4 GB-loft. Cache-ID følger objektstien som fremtidssikring mod eventuelle querycredentials. #2863 bootstrap-hentede tre filer/29.783.658 byte af restkapaciteten, fuldførte tre U/V-assets og flyttede cursor 90→105, dele 58→73 og prøver 491→531. #2864 genbrugte samme tre filer med nul download og flyttede cursor 105→120, dele 73→88 og prøver 531→573. Begge var `reason=completed`, `scoreImpact=false` og `publicRuntime=false`; råcachen var 3.755.913.193 byte uden pruning i #2864. Replay/genbrug er dermed CI-bevist. Ved 15-minutters drift er en 673-dels runde 45 kørsler/cirka 11 timer og 15 minutter.
- #2866 på commit `f661913c4e51e64876dc68ef6bf8f6cbafbe1109` fortsatte uden cachepruning til cursor 150, 118 besøgte dele og 667 prøver; tre replayassets gav 38 nye prøver. Den samme uændrede produktionsgate stoppede fortsat korrekt ved 187/210 hovedzoner og 596/673 lokale dele før Supabase og Pages.
- Den private rotation registrerer nu også det nærmeste eksakte fælles U/V-punkt som dækningsmetadata, selv når det ligger over 5 km væk. Kun koordinat, afstand og lagmetadata gemmes; de fjerne U/V-værdier gemmes eller aktiveres ikke. En support-only ejeroversigt klassificerer manglende dele som endnu ikke besøgt, uden observeret U/V, gyldigt punkt inden for 5 km men pipelinehul, nær-tærskel 5–6 km til rent manuelt geometrireview, modelhul 6–8 km eller strukturelt modelhul over 8 km. Den flytter aldrig punkter, og Pages udelukker fortsat hele `data/diagnostics/`.
- #31928382898/#2869 på commit `0dc44be0a3e6618519c2a2d3e9d1ce84ae0d45d7` beviser den nye måling på rigtige DKSS-data: cursor 195, 755 prøver/157 dele, 15 nye prøver og tre cachede replayassets. De 15 besøgte dele fordeler sig på 4 med U/V inden for 5 km og 11 kun længere væk. Blandt de 77 aktuelle mangler er de 11 målte fordelt på 2 nær-tærskel 5–6 km, 4 modelhuller 6–8 km og 5 strukturelle huller 8,26–12,11 km; 66 afventer fortsat auditrotation. Ejerfilen er 64.156 byte uden `uMps` eller `vMps`. Offentlig dækning forblev 187/210 og 596/673, og den uændrede gate stoppede før Supabase/Pages.
- Den nye rettelse og cachemigration er målrettet grøn lokalt, men den uændrede produktionsgate stopper fortsat før Supabase og Pages på den dokumenterede dækning. 4.0.229 er ikke deployet eller produktionsverificeret. Ejerens punktrettelser kan øge dækningen; en eventuel politik, hvor kun verificerede pile vises ved lavere samlet tilgængelighed, kræver særskilt ejerbeslutning. Se `docs/rdks/40_KNOWN_ISSUES/CURRENT-COVERAGE-4.0.229.md`.

## 4.0.228 – flere faktiske DMI-pile ved indzoomning, produktionsverificeret

- Landsoversigten bevarer ét repræsentativt vind- og strømpunkt pr. hovedzone, så kortet fortsat er læsbart.
- Fra zoomniveau 9 kan kortet desuden vise de lokale kystdeles egne vind- og strømpile. Hver tæt pil skal stå på det faktiske DMI-gitterpunkt, som leverede den pågældende kystdels data.
- En lokal strømpil kræver strøm-U og strøm-V på præcis samme koordinat; en lokal vindpil kræver tilsvarende vind-U og vind-V. Vindpunktet kan komme fra den primære HARMONIE-serie eller den faktisk anvendte DKSS-`wind-tail`-serie, og runtime bevarer forskellen. Fallbackpunkter og ufuldstændig provenance må ikke skabe tæthed.
- Startpakken bærer de aktuelle vinderdeles pilgrundlag. Når den fulde detaljepakke ankommer, opdateres pilelaget automatisk med alle dokumenterede lokale punkter i udsnittet.
- Ændringen flytter eller kopierer ingen pile kunstigt og ændrer ingen DMI-værdi, kilde, prognose, kyst, land-/vandpunkt, RavScore eller historik. Se DEC-0039.
- Første produktionsforsøg i #31911509244/#2830 stoppede korrekt ved 629/673 verificerede lokale strømpunkter efter en delvis `dkss_lf`-hentning; kravet var 640. Uændret forsøg 2 brugte den progressive cache og bestod den faglige audit med 670/673 samt fuld `validate` og releasegate.
- Forsøg 2 stoppede derefter før Pages, fordi `runtime-diagnostics`-upserten ramte HTTP 500/PostgreSQL `57014` både oprindeligt og ved den ene tilladte genprøvning. Fail-closed-reglen virkede som besluttet.
- Efteraudit af datasæt `rr-20260815224811-210` viste korrekt 670 lokale strøm-gitterpunkter, men nul verificerede lokale vind-gitterpunkter i den offentlige detaljepakke. Årsagen var, at transporten overså DKSS-felterne `wind-tail-u-10m/v-10m`. Read-only replay af samme DMI-cache fandt eksakte vindhalepar til 670/673 dele på 507 unikke gitterpunkter. Rettelsen genkender parret som `dmi-marine-wind-grid` og bevarer HARMONIE som førstevalg.
- #31913779486/#2835 på commit `93b8c0216821d02bf913f7aab369406ba2365fe9` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync og Pages-deploy.
- Produktionsdatasæt `rr-20260815231859-210` har 210 zoner, 673 forventede og 670 verificerede/offentliggjorte kystdele mod det daværende minimum 640. Alle 670 har eksakt DMI-strømpunkt og eksakt DMI-vindpunkt; der er nul U/V-koordinatmismatch. De fordeler sig på 461 unikke strømpunkter og 544 unikke vindpunkter. Begge offentlige SHA-256-værdier matcher manifestet. Dette er historisk produktionsbevis og opfylder ikke 4.0.232's 100 %-gate for nye releases.
- Direkte livekontrol viser version 4.0.228 og samme datasæt. Browseren havde nul konsolfejl og gik fra 27 vind + 27 strøm ved oversigten til 45 vind + 42 strøm efter to zoomtrin. 4.0.228 er produktionsverificeret.
- Ejeren fortsætter samtidig den manuelle land-/vandpunktgennemgang. Fem-døgnsdækning og historikanalyse er efter ejerbeslutning midlertidigt udsat, indtil flere naturlige data er opsamlet; dataopsamlingen og de eksisterende gates fortsætter uændret.

## 4.0.227 – lokal kystvinkel er en advarsel, ikke en ejerblokering

- Ved Svansodde afviste admin et cirka 461 meter langt visuelt kontrolleret punktpar ud fra tangenten på et cirka 15 meter langt mikrostykke af den detaljerede kystlinje. Den viste afvigelse var 50 grader mod en hård grænse på 20 grader.
- På bugtede, takkede og fragmenterede kyster er mikrotangenten ikke et sikkert mål for den repræsentative hav→land-retning. Ejerens helhedsvurdering efter de tre eksplicitte zonebekræftelser er autoritativ.
- 4.0.227 bevarer vinkelmålingen som synlig advarsel, men den kan ikke længere deaktivere **Godkend og gem centralt**. Admin forklarer samtidig eventuelle reelle blokeringer og angiver, når vinkeladvarslen kun er vejledende.
- Manglende/ugyldige punkter, afstand uden for 0,05–8 km, manglende kystkryds og punkter på samme side blokerer fortsat. Central readback, DMI-gridvalidering, releasegate og rollback er uændrede.
- Ingen eksisterende kyst, punktplacering, vejrdata eller RavScore ændres automatisk. Se DEC-0038.
- #31908498204/#2824 på commit `6e920c297ef58f997ae95b3b6da16adfdf66bfe6` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- Supportartifactets beståede releasegate og datasæt `rr-20260815210805-210` dokumenterer 210 zoner og 673 kyststrækninger; begge manifesthashes matcher. Direkte Pages-kontrol viser version 4.0.227, den vejledende advarsel og ingen hård vinkelblokering. 4.0.227 er produktionsverificeret.

## 4.0.226 – én fail-closed genprøvning ved Supabase statement-timeout

- #31904109833/#2814 forsøg 1 bestod frisk DMI, fuld `validate`, releasegate, vejrcache og supportartifact, men `runtime-diagnostics`-upserten stoppede Supabase/Pages med HTTP 500/PostgreSQL `57014` efter cirka 19 sekunder.
- Payloaden er cirka 17,7 MB. Samme idempotente upsert lykkedes i #2810/#2812 på cirka 11,5 sekunder og i uændret #2814 forsøg 2 på cirka 10,3 sekunder; rerunnen gennemførte Supabase og Pages.
- 4.0.226 genprøver kun den eksakte kombination HTTP 500 + kode `57014`, højst én gang. En anden timeout og alle øvrige fejl stopper fortsat fail-closed.
- #31905211459/#2816 på commit `2dc8253a4c7f77449d6f92dcc9c996f211f033d2` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy. Den store upsert lykkedes i første forsøg på cirka 11,5 sekunder; timeout-recoveryen er derfor syntetisk regressionstestet, ikke fremprovokeret mod produktion.
- Datasæt `rr-20260815195620-210` har 22.890/22.890 komplette routede DMI-vandstandstimer og 210/210 komplette rækker ved aktuel 19:00 UTC. Begge manifesthashes matcher artifact og direkte Pages-kontrol, som viser version 4.0.226 og samme 210-zone-datasæt.
- Sundhedsstatus var `degraded` på grund af et supplerende DMI EDR-kald med HTTP 429, mens `userForecastStatus` var `ok`. Brugerfuldstændigheden var fortsat 209/210 på grund af det kendte Feggesund-bølgegab; strøm og vandstand var 210/210. Det er ikke en regression fra retryændringen.
- Ingen timeoutgrænse, payload, adminversionering, manifest, DMI, vejrdata, RavScore, historik eller geometri ændres. 4.0.226 er produktionsverificeret.

## 4.0.225 – routet provenance på den igangværende klokktime

- #31897098322/#2801 var fuldt grøn, men artifactet afslørede 210 DMI-vandstandstimer uden collection/model-run, alle ved 17:00 UTC i et datasæt genereret 17:02 UTC.
- Rodårsagen var et tidsvindue: offentlig prognose bevarede aktuel klokktime, mens vandstandskildeindekset startede ved næste hele time.
- 4.0.225 lader kun kildeindekset starte ved den aktuelle hele time. Faktisk genereringstid bruges fortsat til forecastalder og provenance.
- Værdier, punkter, routing, vægte, continuity, fallback, RavScore, historik og geometri er uændrede.
- Read-only replay af #2801 bevarer routing-auditten på 210 anvendte/0 ufuldstændige og dokumenterer alle 23.310 timer, inklusive 210/210 i aktuel time.
- #31902872631/#2810 på commit `18499eb10a45f561d4440a7944b34725049cf34d` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy.
- Produktionsdatasæt `rr-20260815190651-210` har 22.890/22.890 routede DMI-vandstandstimer med fuld collection, model-run, lead time, forecastalder, native tider, routing og source keys; 210/210 ved aktuel 19:00-time er komplette. Manifesthashes matcher, og direkte Pages-kontrol efter #2810 viste 4.0.225 og samme datasæt.
- #31903561423/#2812 gentog alle fulde gates og deploy efter evidenscommitten. Datasæt `rr-20260815192135-210` gentager 22.890/22.890 og 210/210 i aktuel time; begge manifesthashes matcher live. Sundheds-, DMI-dæknings- og API-status var `ok`.
- Det kendte bølgegab ved Feggesund holder brugerfuldstændigheden på 209/210, mens vandstand og strøm er 210/210. Det er fortsat et separat fagligt forhold og ændrer ikke, at 4.0.225-proveniensrettelsen er produktionsverificeret.

## 4.0.224 – sand kilde efter vandstandsrouting

- #2795 viser, at vandstandsroutingen overskrev værdien korrekt, men kunne efterlade zonens tidligere modelmærke; én aktuel DMI-time pr. zone stod helt uden model-run.
- Den centrale routing bruger 123 zoner med ét DKSS-modelområde og 87 zoner med en sammensætning af to områder. Et enkelt videreført collectionnavn var derfor ikke autoritativt.
- 4.0.224 fører de valgte kildepunkters faktiske collection(s), model-run, native tider, routingmetode og source keys gennem den eksisterende interpolation. Manglende gammel identitet forbliver eksplicit ufuldstændig.
- Værdier, routingvalg, vægte, continuity, fallback, RavScore, historik, UI og geometri er uændrede. Frisk produktion er næste gate.
- #31895640397 bestod hele produktionskæden på commit `82c07b54`. Artifact #2797 har 23.310 routede vandstandstimer, nul uden collection, nul uden model-run og nul med ufuldstændig provenance.
- Direkte Pages-kontrol viser 4.0.224, datasæt `rr-20260815163132-210` og 210 zoner. Strømhistorikken er 40,449 rå timer og 4,730–40,449 verificerede timer.

- Den naturlige #31894320128/#2794 er fuldt grøn. DMI's nye WAM-/DKSS-12 UTC-kandidater er synlige, men den aktive cache beholder korrekt WAM 00 UTC og DKSS 06 UTC, mens deres fremadrettede horisont på ca. 107,9/109,9 timer overstiger 96-timersfastholdelsen. Det er beskyttet progressiv rotation, ikke en fastlåst scheduler.
- #2794 har verificeret aktuel strøm i 210/210 zoner, nul `CURRENT_ANCHOR_PROTECTED`, nul valgte warning/critical-vandstandskilder og 4,27–39,99 timers verificeret historik. Alle zoner er fortsat under 72-timerskravet.

## 4.0.223 – delvise modelcyklusser tælles ikke som fulde beviser

- Den read-only P1-audit viser nu både timer og antal aktive zoner pr. DMI-modelkørsel og collection@run.
- #31891391302 bestod fulde gates og deploy. Artifact #2783 havde en ny HARMONIE 12 UTC-cyklus med 416 timer i 208 zoner; den ældre 03 UTC-cyklus leverede 9.776 timer.
- #31891984360 produktionsverificerer 4.0.223 med fulde gates, Supabase og Pages. Artifact #2785 viser indfasningsvækst til 3.744 timer fra 12 UTC og fald til 6.032 timer fra 03 UTC i 208 zoner. WAM 00 UTC og DKSS 06 UTC er fortsat uændrede.
- #31892505177 bestod også hele kæden. Artifact #2787 fortsætter samme HARMONIE-indfasning til 5.616 timer fra 12 UTC og 4.160 timer fra 03 UTC i 208 zoner; overgangsmålene er uændrede. Det er driftsbevis fra samme nye cyklus, ikke endnu en uafhængig cyklus.
- #31892947409 bestod også Supabase og deploy. Artifact #2789 fortsætter HARMONIE-indfasningen til 7.488/2.288 timer fra 12/03 UTC i 208 zoner. Overgangsmålene ændrede sig igen, hvilket understøtter stopreglen mod permanente grænser fra delvise snapshots.
- #31893406911/#2790 afslutter indfasningen: HARMONIE 12 UTC leverer 45 timer i 208 zoner; 03 UTC har kun to bevarede timer pr. zone. To fulde vindcyklusser er nu sammenlignet. DMI→fallback er identisk, mens fallback→DMI varierer; tallene er en foreløbig ramme, ikke en permanent gate.
- Vindovergangene er bedre i dette datasætpar, men én delvis indfasning er ikke grundlag for permanente tærskler.
- Strømhistorikken er vokset til 39,176 rå timer og 3,457–39,176 verificerede timer. Alle zoner er fortsat under 72 verificerede timer.
- #2787 løfter historikken videre til 39,364 rå timer og 3,644–39,364 verificerede timer; alle 210 er fortsat under 72 verificerede timer.
- #2789 løfter historikken til 39,516 rå timer og 3,797–39,516 verificerede timer; alle 210 er fortsat under 72 verificerede timer.
- #2790 løfter historikken til 39,662 rå timer og 3,943–39,662 verificerede timer; alle 210 er fortsat under 72 verificerede timer.
- En separat workflow_dispatch-kørsel #31891504819 bestod alle vejr- og releasegates, men stoppede fail-closed på et enkelt Supabase `57014 statement timeout` ved skrivning af `runtime-diagnostics`. Den umiddelbart efterfølgende #31891984360 synkroniserede samme dokument og deployede grønt. Hændelsen overvåges; der er ikke indført en bred retry på ét transient fund.
- #2785 måler den kompakte runtime-diagnostik til 9.287.456 byte; 25 rå `zoneSamples` udgør 8.690.021 byte/93,57 %. Statusdelen er cirka 0,60 MB. Zoneeksemplerne bruges ikke af adminstatusfelterne, men indgår i ejerens beskyttede rå download og må derfor ikke fjernes eller flyttes uden godkendelse og bevaret adgang.
- Vejrdata, kilder, fallback, interpolation, RavScore og geometri er uændrede.

## 4.0.222 – modelcyklusser tælles efter run-id, ikke artifact

- Artifacts #2764, #2771 og #2777 genbruger samme aktive HARMONIE-, WAM- og DKSS-modelkørsler. De beviser stabil drift og historikvækst, men er ikke tre uafhængige forecastcyklusser.
- Den read-only P1-audit rapporterer nu DMI-collection, model-run, tidsopløsning og manglende provenance pr. komponent uden at skrive data.
- #2777 havde fuld collection-/modelrun-identitet for vind, bølger, strøm og vandtemperatur, men 210 routede vandstandstimer uden felterne. Den friske 4.0.222-kæde #31890898143 bestod alle gates og deploy; artifact #2782 har fuld collection/modelrun på samtlige DMI-timer i alle fem komponenter. Det ældre fund var dermed ikke vedvarende.
- #2782 bruger fortsat samme aktive HARMONIE 03 UTC-, WAM 00 UTC- og DKSS 06 UTC-cyklus. Det er nyt driftsbevis, men endnu ikke en uafhængig forecastcyklus.
- Strømhistorikken er vokset til 158 rå prøver/38,760 timer i alle 210 zoner. Verificeret spænd er 3,040–38,760 timer; ingen zone har endnu 72 verificerede timer.
- Vejrdata, kilder, fallback, interpolation, RavScore og geometri er uændrede.

## 4.0.221 – sand alarm for effektiv vandstandsrouting

- Artifact #2771 viser 373 kendte vandstandskilder og 240 med gyldig forecastcache. Hals Barre og Hals Havn har hver 113 timers DMI-prognose. De gamle registerfelter sagde 15/21 zoner, men før/efter-kontrol af den producerede serie viser uændret faktisk brug i 5/6 zoner.
- Observation, DMI-kildeprognose, routet forecastcache og samlet brugbarhed er allerede adskilt. Adminoverride, automatik, forecaststore, femdøgnstabel og score-/visningskæde bruger samme producerede vandstandsserie.
- Alarmen fra 4.0.98 blev fjernet under 4.0.99-ombygningen, mens kravet og en teksttest blev stående. Gamle alarmfelter kunne derfor videreføres uden genberegning og vise `critical` samtidig med gyldig forecast.
- 4.0.221 genberegner kun alarmstatus for faktisk valgte aktive kilder og bruger seneste gyldige tidspunkt fra både kildens prognose og routet cache. Leverende observationer og historiske/inaktive kilder alarmerer ikke; stale mærker ryddes.
- Kildevalg, vandstandstal, interpolation, fallback og RavScore er uændrede.
- #31889559758 bestod frisk DMI, fuld `validate`, releasegate, Supabase og Pages på commit `3f6c7661`. Artifact #2777 har nul valgte warning/critical-kilder og nul nye notifikationer; begge Hals-kilder har 116,6 timers resttid og ingen alarm. Datasættet er `rr-20260815142117-210` med 210 zoner.

## 4.0.220 – rå og verificeret strømhistorik måles hver for sig

- Den read-only P1-audit viser nu aktuel verifikationsstatus, fordeling af verificerede prøver, verificeret tidsspænd og zoner under 72 verificerede timer.
- Artifact #2764 har aktuel verificeret strøm i 210/210 zoner og 149 rå prøver over 37,149 timer i alle zoner. Verificeret historie er fortsat ujævn: 27×4, 75×5, 98×6 og 10×106 prøver; tidsspændet er 1,43 timer i 75 zoner, 18,97 timer i 125 og 37,149 timer i 10.
- Ingen zone har endnu 72 verificerede timer. Rå historik er ikke i sig selv scoreklar, fallback tæller ikke som verificeret strøm, og fortid udfyldes ikke bagudrettet.
- Samme artifact beviser en fuld ny `dkss_lf`-cyklus med 41/41 trin og vækst i de otte Limfjordszoners marine hale fra 98 til 115 viste timer. Ingen kilde, fallback eller RavScore er ændret.
- GitHub Actions #31888082124 bestod den fulde produktionskæde på commit `50f2aa491483d584e1aaa922160e6253777a8fff`. Offentlig 4.0.220 bruger datasæt `rr-20260815134755-210` med 210 zoner og 673 kyststrækninger.
- Artifact #2771 viser fortsat vækst uden rekonstruktion: 152 rå prøver/37,722 timer i alle zoner og verificerede prøveantal 27×7, 75×8, 98×9 og 10×109. Verificeret tidsspænd er 2,003 timer i 75 zoner, 19,54 timer i 125 og 37,722 timer i 10; ingen zone mangler verificerede prøver, men alle 210 er stadig under 72 timer.
- Artifact #2777 fortsætter samme naturlige mønster: 155 rå prøver/38,278 timer, verificerede prøveantal 27×10, 75×11, 98×12 og 10×112 samt verificeret spænd på 2,559–38,278 timer. Alle 210 har aktuel verificeret strøm og mindst én verificeret historikprøve; alle er fortsat under 72-timerskravet.

## 4.0.219 – reduceret Supabase-readback

- Produktionsartifact #2757 viser, at routingauditten fylder cirka 0,53 MB som kompakt JSON og hidtil blev hentet centralt før hver 15-minutterskørsel, selv om den genbygges i samme kørsel.
- 4.0.219 stopper kun denne overflødige readback. Frisk generering, beskyttet upload, central adminvisning, stationsregister og redigerbar admin-konfiguration bevares.
- Read-only estimatoren sænker den beregnede nedre pipelinegrænse fra cirka 4,44 til 3,03 GiB pr. 30 dage ved 96 kørsler dagligt. Det er ikke billingbevis; næste Supabase-periode skal fortsat måles.
- GitHub Actions #31885856568 bestod den fulde produktionskæde på commit `5c823947c9275e5234e996b3a86078613b6eee5a`: central adminhydrering/tombstones, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy.
- Startloggen viser seks nødvendige centrale dokumenter og ingen `water-station-routing-audit`; slutloggen viser fortsat frisk beskyttet upload af routingauditten. Estimatoren på artifact #2764 giver 3,028 GiB/30 dage og 1,416 GiB/30 dage undgået readback. Faktisk billing-egress afventer fortsat næste Supabase-periode.
- Offentlig version er 4.0.219 med datasæt `rr-20260815131334-210`, 210 zoner og 673 kyststrækninger.
- Samme artifact har 149 rå `samples72h`-prøver i hver zone over 37,149 virkelige timer. Historikken vokser korrekt, men 72-timers-exitkriteriet er ikke nået, og der udfyldes ikke bagudrettet.

## 4.0.218 – et halepar må ikke rydde aktuel strøm

- Artifact #2750 viste en særskilt modelvalgsregression i 27 zoner: `dkss_idw` havde et marginalt bedre geografisk scoret U/V-par, men kun 19. august, og kunne derfor rydde en eksisterende `dkss_nsbs`-serie omkring nu.
- 4.0.218 beskytter et eksisterende strømanker inden for seks timer af datasættets genereringstid. Et andet modelvalg accepteres kun, hvis kandidatens eget fælles U/V-par også ligger i ankervinduet.
- Mangler den eksisterende model selv et aktuelt anker, er recovery fortsat tilladt. DMI-kilder, fallback, RavScore og punkter er uændrede.
- Målrettede regressioner, versions-/håndbogs-/RDKS-kontrol og lokal releasegate består. Fuld lokal `validate` når forventet den historiske 211-mod-210-zonegrænse efter en grøn geometri-v2-kæde.
- GitHub Actions #31883707138 bestod en fuld 21-minutters produktionskæde med central adminhydrering/tombstones, DMI-bulk, `validate`, releasegate, Supabase, Pages-artifact og deploy på commit `02fefbcffdeecce02aa8ac48218e45d9458d5ed4`.
- Datasæt `rr-20260815122446-210` har verificeret aktuel strøm i 210/210 zoner. De 27 tidligere berørte zoner valgte `dkss_nsbs`, havde aktuelt tidsanker og 41 strømtrin hver. Denne rotation frembød ikke et konkurrerende sent IDW-par, så den eksplicitte `CURRENT_ANCHOR_PROTECTED`-gren skal fortsat eftermåles over kommende modelrotationer.

## 4.0.217 – verificeret strømhistorik bevares i begge vinduer

- Produktionsartifact #2750, datasæt `rr-20260815111030-210`, har 142 rå prøver og 35,1 timers faktisk `samples72h` i alle 210 zoner. Ét fælles historisk hul er 67,6 minutter; 24-timersvinduet har ingen huller over én time.
- I #2750 havde 183/210 zoner et aktuelt tidsmatchende DMI-U/V-par. De øvrige 27 havde kun en fjern `dkss_idw`-hale 19. august og forblev korrekt `unverified/no-time-match`. Efterberigelsen skrev hidtil kun resultatet tilbage til `samples24h`; næste merge bruger `samples72h` som autoritativ historik, så mærket blev tabt igen.
- Før rettelsen havde 75 zoner nul verificerede 72-timersprøver, 125 havde én og 10 havde 101. Rå sampleantal var derfor ikke bevis for verificeret transporthistorik.
- 4.0.217 synkroniserer kun den aktuelle prøves allerede kontrollerede DMI-U/V-resultat til begge vinduer. 210-zonesimuleringen markerede kun de 183 tidsmatchende zoner; de 27 forblev uverificerede. Ældre uverificeret fortid rekonstrueres ikke; RavScore bruger fortsat kun 24 timer og er uændret.
- GitHub Actions #31882866344 bestod central adminhydrering/tombstones, frisk vejrbygning, fuld validering, releasegate, Supabase, Pages-artifact og deploy på commit `abb92d438820270661b64ffac0176554d54cdd75`.
- Første produktionsdatasæt med rettelsen er `rr-20260815114746-210`: alle 210 zoner har 145 rå prøver over 35,719 timer. Verificeret 72-timershistorik voksede som forventet til 102 zoner med én prøve, 98 med to og 10 med 102; den aktuelle prøve var verificeret i de samme 183 tidsmatchende zoner, mens de 27 uden tidsmatch forblev uverificerede.
- Eftermålingen fortsætter til mindst 72 faktiske timer. Fortid udfyldes ikke bagudrettet.

## 4.0.216 – progressiv offentlig vejrindlæsning

- Den offentlige runtime er delt i en lille startpakke og en integritetsbundet detaljepakke med samme dataset-id.
- Startpakken indeholder aktuelle hovedzoneforhold, kompakt historisk tilstand, flowpunkter, én aktuel lokal scorerække pr. zone og de kystdele, der vinder aktuelt for waders eller strand.
- Hele femdøgnsprognosen og alle lokale kystdelsdetaljer bevares i `public-condition-details.json` og hentes straks efter første kort/rangliste.
- Hvis detaljepakken fejler eller tilhører et andet datasæt, bevares aktuelle forhold, mens femdøgnsvisningen melder manglen. Stale data, konstruerede nuller og blandede datasæt er fortsat forbudt.
- Direkte lokal browsertest med frisk 210-zonedata viste første klare kort/rangliste på cirka 0,7 sekund, efterfølgende komplet femdøgnsvisning og fungerende lokalt zonepanel uden browserfejl.
- RavScore, historik, kilder, fallback og missing-regler er uændrede.
- GitHub Actions #31880984004 bestod den fulde 210-zonekæde med `validate`, releasegate, Supabase/artifact og Pages-deploy. Direkte efterkontrol viste offentlig 4.0.216 og datasæt `rr-20260815110313-210`; startpakken er 2.534.969 bytes og den efterfølgende komplette detaljepakke 24.748.808 bytes.

## 4.0.215 – privat og dataminimeret besøgsstatistik

- Den offentlige side registrerer efter normal opstart én sidevisning og højst ét browserbesøg pr. browserfane og dansk kalenderdag. Statistikfejl blokerer aldrig appen.
- Supabase gemmer kun daglige totaler. Ingen rå besøg, IP-adresser, præcis lokalitet, fingerprint eller stabil besøgsidentitet gemmes.
- Ejer/full_admin kan vælge en periode i admin og se sidevisninger, browserbesøg samt oprettede og aktive login-konti. Browserbesøg er ikke unikke personer.
- Migrationen er installeret i Supabase og efterkontrolleret: anonym rolle kan skrive, men ikke læse rapporten; authenticated kan kalde den ejerbeskyttede rapportfunktion.
- #31876816700 bestod frisk DMI, fuld `validate`, releasegate, Supabase-synkronisering, Pages-artifact og deploy. Direkte Pages-kontrol viste 4.0.215; én rigtig åbning gav 1 sidevisning/1 browserbesøg, og ejerens rapport viste disse tal samt 2 oprettede og 2 aktive login-konti.

## 4.0.214 – gammel umærket temperatur må ikke overleve

- #31873118298 afviste 756 nye dybdelagsmeddelelser, men artifactet viste 29.459 ældre temperaturpunkter uden vertikal provenance mod 3.852 beviste `surface:0`-punkter.
- 4.0.214 fjerner de umærkede punkter før genbrug. Manglende overfladetemperatur forbliver `missing`, indtil den relevante DKSS-model leverer nye `surface:0`-data.
- Schedulerens DKSS-rotation medregner nu manglende overfladetemperatur. Alle 210 zoner havde fortsat 102 rå `samples24h` og 132 rå `samples72h`; øvrig vejrhistorik bevares.
- P1-analysen af Limfjorden er afgrænset: `DK-B05-11` mangler bølger, fordi hverken et gyldigt DMI-bølgepunkt inden for den tilladte afstand eller den eksisterende fallback findes. De øvrige undersøgte Limfjordszoner får bølger fra `wam_dw`. Den fælles sene vandstands-/temperaturhale er et horisont-/overgangsproblem, ikke samme bølgeproblem.
- 4.0.214-datasæt `rr-20260815083802-210` giver den første fælles komponentmatrix: vind 210×118 timer; bølger 194 zoner med 118 timer, 15 med 117 og `DK-B05-11` med 0; strøm, vandstand og temperatur 202 zoner med 118 timer og otte zoner med 101. De otte deler dermed en aktuel 17-timers marinehale.
- Alle zoner har 100 rå `samples24h` og 133 rå `samples72h`. Det er bevaret samplehistorik, ikke endnu 72 forløbne timer.
- Overgangsauditten på samme datasæt viser, at vandstandsskiftets gennemsnit/p95 på 4,6/17 cm ikke er værre end almindelige timer på 5,0/22 cm. Vind-, bølge-, strøm- og temperaturgrænserne er derimod markant større end deres egne baselines.
- Fallbackstrøm afviger cirka 92° i gennemsnit ved kildeskift og forbliver `unverified`. Vandtemperaturens sene DMI→fallback-skift er 3,59 °C i gennemsnit og 10,5 °C ved p95; temperatur forbliver score-neutral.
- Artifact #2777 lukker den særskilte lagopfølgning: alle 210 hovedzoner har `surface:0`-temperaturgitter, fordelt 116 IDW/71 NSBS/23 LF, og alle 9.159 native DMI-temperaturtrin har samme eksplicitte overfladelag. Nul umærkede eller dybe temperaturtrin overlever. Otte Limfjordszoners nuværende 114 mod 118 viste timer er fortsat et separat horisontproblem.

## 4.0.213 – vandtemperatur betyder havoverfladetemperatur

- 4.0.212-supportartifactet viser, at lokal DMI-parameter 80 findes ved `surface:0` og ved mange `depthBelowSea`-niveauer. Den tidligere skalarparser skelnede ikke lagene og kunne derfor lade et senere dybdelag overskrive overfladetemperaturen.
- 4.0.213 accepterer kun parameter 80 ved eksplicit `surface`, niveau 0, og gemmer `verticalLayer: surface:0` i grid- og timeproveniens. Dybere lag afvises; de interpoleres ikke til overfladen.
- Parsergeneration 15 genbehandler den aktuelle cache. Datakilde, fallbackprioritet, RavScore, state og 72-timersvinduer er uændrede.
- Lokal målrettet validering er grøn. CI- og produktionsbevis afventer en frisk fuld kørsel.

## P1-bølge-/vandstandsaudit – 2026-08-15

- Deployet dataset `rr-20260815071241-210` har 118 timer i 210 zoner. Bølgehøjde, -retning og -periode er samlet komplette i 209 zoner; `DK-B05-11` Mors nord/Feggesund mangler alle 118 bølgetimer.
- Vandstand er komplet i 202 zoner. Otte Limfjordszoner har 103 timer og mangler samme hale fra 19. august kl. 14 UTC til 20. august kl. 04 UTC.
- Mønsteret afgrænser næste analyse til Limfjordens WAM-fravalg/fallback og den fælles `dkss_lf`-hale. Den offentlige fil har ikke timeproveniens, så et beskyttet frisk supportartifact kræves før rodårsag eller design kan godkendes.
- Lufttemperatur findes i den offentlige timefil, men vises ikke i det aktive informationspanel og bruges ikke af den aktive RavScore. Den er ikke automatisk en ny bindende P1-komponent.
- Vandtemperatur er komplet i 202/210 zoner i samme datasæt. De samme otte Limfjordszoner mangler samme sidste 15 timer som vandstanden, hvilket peger på en fælles `dkss_lf`-grænse.
- Vandtemperatur vises, gemmes med observationer og bevares i 24-/72-timershistorikken, men bruges ikke numerisk i aktiv RavScore eller nuværende state. 4.0.213 afgrænser DMI-feltet til det eksplicitte overfladelag, så DMI og den eksisterende havoverfladefallback har samme tilsigtede vertikale betydning; overgangskvaliteten skal fortsat måles.

## 4.0.212 – skalarfelter må ikke rydde strømserien

- Fire successive produktionsartifacts afgrænser regressionen. #31856697202 havde 210/210 zoner med brugbar strøm fra nutiden. #31857361460 faldt til 183/210, og de 27 berørte NSBS-zoner gik fra 38 sammenhængende strømtrin til kun `2026-08-19T12:00:00Z`.
- Årsagen er verificeret i den faktiske modeludvælgelse: et IDW-vandstands-/temperaturpunkt kunne med modelstraf blive marginalt bedre end NSBS-strømparrets afstand og dermed midlertidigt skifte hele havmodellen. Skiftet ryddede alle marinefelter, selv om kandidaten ikke leverede et fælles strøm-U/V-par ved de manglende tider.
- 4.0.212 lader skalare felter følge et eksisterende modelvalg uden at ændre valget eller dets score. Et fælles strøm-U/V-par kan fortsat skifte til en reelt bedre model. Behandlingssignaturen hæves én gang for genopbygning.
- #31870747677 bestod central adminhydrering/tombstones, DMI-genindlæsning, fuld validering, releasegate, Supabase, artifact og Pages-deploy. Datasæt `rr-20260815071241-210` har verificeret strøm fra nutiden i 210/210 zoner; de 27 berørte zoner har 37 strømtrin og de øvrige 183 har 38.
- Alle 210 zoner når mindst 100,8 timers sammenhængende marinehorisont. Ingen når endnu 118 timer ved denne byggetid, så de sidste cirka 17–19 timer forbliver en DEC-0030-haleanalyse, ikke et lukket femdøgnsmål.
- Alle 210 zoner bevarer 131 rå `samples72h`-prøver. Det fulde 72-timers historikvindue er fortsat under naturlig opbygning.
- Ingen kilde, fallback, interpolation eller score ændres.

## 4.0.211 – bevaret havmodel og reel genbehandling

- 4.0.210 blev produktionsverificeret i #31853585142 og diagnosticerede hullerne korrekt, men efterkontrollen viste uændrede strømserier: de relevante DMI-timer blev sprunget over som tidligere behandlet.
- Den dybere årsag var, at `merge_previous` bevarede marinefelter og collectionnavne, men tabte `marineSelection`. En senere model kunne derfor rydde den tidligere autoritative serie, mens `processedSteps` stadig kaldte de oprindelige filer komplette.
- 4.0.211 bevarer `marineSelection`, rekonstruerer den for legacy-cache fra faktisk collection, gitterafstand og kysttype og hæver behandlingssignaturen én gang, så den aktuelle DMI-kørsel genlæses.
- Test mod produktionsartifactet rekonstruerer 1.138 hovedzone-/kystdelvalg og beviser, at en dårligere IDW-model ikke kan rydde en eksisterende Limfjordsserie.
- Pushkørsel #31854174281 bestod hele releasekæden. Den efterfølgende fulde genopbygning #31855164652 bestod DMI, fuld validering, releasegate, Supabase og Pages-deploy og udgav datasæt `rr-20260815011320-210`.
- Direkte artifactkontrol viser verificeret aktuel strøm i 210/210 zoner, bevaret `marineSelection` i 210/210 og 107 `samples72h`-prøver i hver zone. De 75 sidst genopbyggede zoner kan kun opsamle verificeret historik fremadrettet; manglende fortid rekonstrueres ikke.
- Alle 210 zoner har sammenhængende marinegrundlag mindst cirka 70,8 timer frem, mens 121/210 når mindst 96 timer. De resterende 89 zoners hale er nu en eksplicit DEC-0030-opfølgning; cirka 120 timer er fortsat produktmålet.
- Ingen ny kilde, fallback eller scoreændring indføres.

## 4.0.210-kandidat – sammenhængende DMI-strøm fra nutiden

- Produktionsbeviset fra 4.0.209 viste den konkrete fejl: 125 hovedzoner havde kun to native strømtrin 19. august, 75 havde syv sene trin, mens kun 10 havde en sammenhængende serie fra 14. august. Den gamle scheduler kaldte alligevel alle tre grupper dækket, fordi den kun målte sidste gyldige tidspunkt.
- Dækning kræver nu, at alle nødvendige komponenter begynder højst én native cadence plus tolerance fra byggetiden og fortsætter uden større huller. En fjern hale giver derfor nul aktuel dækning.
- På det faktiske 4.0.209-artifact ændrer den korrigerede diagnose resultatet fra tilsyneladende fuld marinedækning til 10 komplette og 200 genhentningskrævende hovedzoner. Schedulerens førstevalg bliver `dkss_idw` og `dkss_nsbs`, som svarer til de to dokumenterede hulgrupper.
- Rettelsen ændrer ingen værdier, datakilder, fallback eller score. Manglende strøm forbliver missing, indtil DMI-serien faktisk er hentet.

## 4.0.209 – tre døgns score-neutral vejrhukommelse

- Den målte 4.0.208-produktion bevarer præcis 24 timers rå historik pr. zone: 101 prøver over cirka 24 timer ved den aktuelle 15-minutterskørsel.
- Det er nok til den aktive `maxWind24hMps`/`maxWave24hM`-score, men ikke til analyse af hændelser 24–72 timer tilbage.
- Fra 4.0.209 bevarer pipelinen separat `samples72h`. `samples24h` er fortsat eneste rå vindue for nuværende RavScore og `shadow-v2`; ældre prøver ændrer derfor ingen aktiv score.
- Begge rå vinduer udelades fortsat fra `public-conditions.json`. `conditions.json` synkroniseres ikke til Supabase, så ændringen øger ikke Supabase-egress.
- Providerskiftene har flere årsager: forecastets første timekant, HARMONIE→DKSS/progressive run-overgange og komponentvis ufuldstændig DKSS-cache. Ingen merge- eller kildeændring er godkendt endnu.
- Vandstands-continuity bevarer i kandidaten den oprindelige DMI-timeidentitet fra `dmiByTime`.

## 4.0.208 – stale lokale vejrsnapshots er ikke zonefejl

- Den centralt anvendte og deployede runtime har 210 aktive hovedzoner. En skrivebeskyttet kontrol 15. august 2026 af det deployede zoneregister og `public-conditions.json` gav 210/210 identiske zone-ID'er; `DK-B04-12`, `DK-B04-13` og `DK-B04-14` findes med vejrdata.
- Repositoryets medfølgende lokale vejrsnapshot er historisk: `conditions.json` er bygget 31. juli 2026 før de tre Vadehavszoner og før de seneste centrale tombstones. Repositoryets rå zoneregister og den centralt effektive bestand må derfor ikke sammenlignes uden central adminhydrering.
- `validate:data` stopper fortsat fail-closed ved enhver dækningsforskel. Når snapshotet samtidig er udløbet, kaldes fejlen nu **FORÆLDET LOKALT VEJRSNAPSHOT** og henviser til en skrivebeskyttet produktionsaudit i stedet for at fremstille de manglende ID'er som dokumenterede zonefejl.
- `npm run audit:deployed-zone-weather` kontrollerer uden skrivning, at deployet zoneregister og offentligt vejr har identisk bestand, og rapporterer særskilt de tre Vadehavs-ID'er. `npm run hydrate:deployed-weather` hydrerer kun mutable vejrfiler; en fuld frisk lokal/CI-validering skal stadig anvende central adminhydrering og tombstones før vejr, præcis som produktionsworkflowet.
- Ingen zone, geometri, DMI-kilde, score eller offentlig runtimeadfærd ændres af 4.0.208. Release 4.0.208 er produktionsverificeret i GitHub Actions #31848912461 på commit `7a3382f200a72b702d814ba4d8ca205dc4523369`: central adminhydrering/tombstones, frisk vejrbygning, fuld `validate`, releasegate, Supabase-synkronisering, Pages-artifact og deploy bestod. Direkte efterkontrol viste version 4.0.208, datasæt `rr-20260814230422-210`, 210/210 zone-/vejr-ID'er og vejrdata til alle tre Vadehavszoner.

## 4.0.207 – ét flytbart punktpar pr. kyststrækning

- Ejeren har valgt den pragmatiske model i DEC-0037: hver af de 673 aktive kyststrækninger beholder ét autoritativt blåt havpunkt og ét grønt landpunkt. Bugtede strækninger får ikke automatisk flere punktpar eller en ny landsdækkende opdeling.
- Admin retter placeringen ved at trække det eksisterende punktpar. De uvirksomme knapper **Sæt nyt havpunkt** og **Sæt nyt landpunkt** er fjernet; træk, rød hav→land-pil, vinkelret kystkontrol, central readback, DMI-validering og rollback er bevaret.
- Når ejeren vælger **Godkend og gem centralt**, er ændringen først aktiv efter verificeret central genlæsning og en grøn efterfølgende DMI-/releasekørsel. Indtil da forbliver den seneste produktionsverificerede placering aktiv.
- En skrivebeskyttet orienteringsaudit fandt 199 kontrolkandidater i 122 hovedzoner ved mindst 35 graders vedvarende variation. 171 er fragmenterede `MultiLineString`-dele, så tallet er en triageliste og ikke 199 beviste fejl. Auditten giver ingen automatisk ændringstilladelse.
- Den manuelle ejerreview af alle zoner kan udføres gradvist og er ikke en blokering for uafhængige roadmapopgaver. Den skal være afsluttet før endelig faglig godkendelse af alle lokale RavScores, større scorekalibrering og domæne-/brugerrelease.
- 4.0.207 er produktionsverificeret i GitHub Actions #31845836107 på commit `5176d2e14b2c5cff745caa428e6f1b43f45eb824`: frisk vejrdata, fuld projektvalidering, releasegate, Supabase-synkronisering, Pages-artifact og deploy bestod.

## 4.0.206 – ren og idempotent fallbackslutkontrol

- 4.0.206 er produktionsverificeret i #31831068809 på commit `4dc464a`: kompatibel progressiv DMI-cache blev genbrugt, to modelsamlinger blev færdiggjort, og frisk central vejrbygning, fuld validering, releasegate, Supabase-synkronisering, Pages-artifact og deploy bestod. Direkte Pages-kontrol viser version 4.0.206, 210 hovedzoner og `DK-B04-12`, `DK-B04-13` og `DK-B04-14` i den offentlige runtime.
- 4.0.205 blev forinden produktionsverificeret i #31822335540. Den målrettede centrale roundtrip/rollback bestod i #31822371489.
- Privat #31822748625 bestod officiel kilde, topologi, 835 foreløbige dele, navne, alle kandidatbundne land-/vandbeviser, begge nationale DMI-/state-/vind-/shadowkæder, ejerreview, slutaudit samt central create/read/update/delete/rollback. Den stoppede først bagefter, fordi fallbackbyggeren ikke selv oprettede `.owner-review/fallback-zone-recovery` på en ren runner.
- Fallbackbyggeren opretter nu alle outputmapper og er idempotent efter en tidligere aktivering. Hvis et oprindeligt nabo-ID ikke længere findes, genbruger den de centralt aktive `remainder-*`-dele med samme ID, geometri, punktpar og afledte retning.
- Punktbyggeren medtager eksisterende validerede punktpar i den samlede kandidat og stopper, hvis et sådant par mangler retning. Den kan derfor ikke stiltiende tabe centralt validerede land-/vanddata.
- ESA WorldCover 10 m er genkørt på den aktuelle 17-dels kandidat. Resultatet er fortsat 11 verificerede, fire sikkert vendte og to blokerede dele. De blokerede dele er `dk-b10-14-fallback-recovery-02` og `dk-b10-14-fallback-recovery-05`, begge ved Albuen i `Lolland vest og Albuen`. Den første følger et længere forløb med skiftende lokal retning, mens den anden er en meget lille lukket kystfigur; systemet må derfor ikke vælge ét land-/vandpar eller aktivere dem automatisk. Kun kandidatfingeraftrykket ændres som følge af den aktuelle centralhydrerede serialisering.
- En ren lokal fallbackslutkæde består med 17 dele, fire rettelser, to fail-closed dele, 2/2 ejerskabsflytninger, 9/9 erstatninger samt nul interne og eksterne overlap.
- Privat national #31829349458 bestod derefter hele den friske kæde: officiel kilde/topologi, 835 foreløbige dele, navne, alle kandidatbundne land-/vandbeviser, native DMI og flertrinsvejr, state/historik, vind, score-neutral shadow-score, indre farvande, dubletter, ejerrettelser, endelig kyst/punkter, central create/read/update/delete/rollback, fallbackejerskab, nul overlap, fallback-DMI og begge artifacts. Ingen privat geometri blev aktiveret; aktivering kræver fortsat særskilt ejerafgørelse.

## 4.0.205 – snæver Supabase-genprøvning og fail-closed adminsynkronisering

- Offentlig 4.0.204 er produktionsverificeret i #31815039302 med frisk DMI, fuld validering, releasegate, central Supabase-synkronisering og Pages-deploy. Den offentlige geometri og RavScore er den fortsat urørte baseline.
- Privat national #31815423082 bestod officiel kilde, topologi, 835 kandidatdele, navne, alle tre eksakte land-/vandbeviser, DMI-grid, flertrinsserier, state, vind, shadow-score, ejerreview og slutaudit. Reviewbestanden var 667 komplette, to deldækkede og 166 blokerede dele.
- Kørslens første beskyttede læsning af `direction-reviews` fejlede alene med HTTP 401 / `PGRST303`. Supabase-loggen dokumenterer korrekt `sb_secret_`-nøgletype og samme nøglefingeraftryk som senere vellykkede læsninger og skrivninger. Det dokumenterer en enkelt fejl i Supabases interne omsætning af den uigennemsigtige nøgle, ikke en forkert Bearer-header, forkert nøgle eller for stor roundtripkladde.
- Node- og Python-serverkaldene genprøver kun kombinationen `sb_secret_` + HTTP 401 + `PGRST303`, præcis én gang efter ét sekund. Alle andre fejl og en gentaget fejl stopper fail-closed. Python-hydreringen må ikke fortsætte med repositoryfallback i GitHub Actions efter en central læsefejl, og beskyttet manifestsync må ikke længere maskere en læsefejl som et manglende manifest.
- En målrettet manuel workflow kan genbruge det kompakte private artifact fra #31815423082 og bevise central create/read/update/delete/rollback uden ny DMI-kørsel og uden deployrettigheder. Denne målrettede CI-kontrol og derefter en ny fuld privat national slutkørsel mangler endnu.
- Intet i 4.0.205 giver automatisk tilladelse til at aktivere privat geometri, ændre offentlig score eller overskrive centrale ejerdata.

## 4.0.204 – rå kandidatbundet land-/vandevidens

- Privat #31804967576 bestod det udvidede DMI-tidsbudget, vejridentiteter, flertrinsserier, state, vind, shadow-score, bestandsafledt ejerreview og dubletaudit. Den stoppede derefter korrekt, fordi det gamle 121-rettelsesbevis var lavet til den aktive offentlige 673-dels bestand og ikke til den private 835-/652-dels kandidat.
- Land-/vandevidens har nu et kryptografisk fingeraftryk af præcis den ukorrigerede punktbestand og et eksakt delantal. Workflowet afviser bevis fra en anden kandidat før DMI, score, artifact eller aktivering.
- Offentlig 4.0.203 er produktionsverificeret i #31811492510 med frisk DMI, fuld projektvalidering, releasegate, Supabase og Pages. Privat #31812035188 stoppede korrekt ved første eksakte bevis: 4.0.203-beviset var ved en fejl afledt af en fil, hvor 107 historiske korrektioner allerede var anvendt, og var derfor ikke råt.
- Den rå foreløbige kandidat på 835 dele har 520 verificerede, 149 sikkert vendte og 166 blokerede punktpar. Slutkandidatens allerede rå GitHub-bevis matcher fortsat 652 dele med 427 verificerede, 111 sikkert vendte og 114 blokerede punktpar. Tvetydige dele mister aktive punkter og beholder to neutrale alternativer; vejr, state, score og automatisk aktivering forbliver falsk.
- Fallbackkandidaten har 17 dele: 11 verificerede, fire sikkert vendte og to blokerede. Fejø/Femø samt Havnø/Mariager Fjord øst er eksplicit bevaret som slettede, og de historiske Fejø/Femø-vinduer er fjernet fra fallbackbyggeren.
- 4.0.203 er den offentligt produktionsverificerede baseline. 4.0.204 ændrer kun privat evidens og må ikke aktivere ny offentlig geometri uden fuld privat slutkørsel og særskilt ejerafgørelse.

## 4.0.198 – sidste kendte 208-port fjernet

- Den private kørsel #31792615992 bestod plan, officiel kilde, topologi, kystdele og officiel navneaudit med 210 zoner, men lokalitetsopdelingen havde stadig en historisk hardcodet 208-kontrol.
- Lokalitetsopdelingen bruger nu samme eksplicitte 210-zonekontrakt som resten af kæden, og en regressionstest fastholder værdien.
- Rettelsen ændrer ingen geometri, navne, DMI-data, punkter eller score.

## 4.0.197 – national pipeline følger 210 effektive zoner

- Fejø/Femø er efter ejerbeslutning slettet centralt. Den effektive bestand er derfor 210 aktive hovedzoner, selv om det historiske forældreregister fortsat kan indeholde 211 poster.
- Den private nationale kørsel #31790559558 stoppede korrekt før kildehentning, fordi dens planport stadig forventede 211. Plan, topologi, kystdele, stednavne og alle tilsvarende fail-closed validatorer/tests forventer nu konsekvent 210.
- Rettelsen ændrer ikke offentlig geometri, score eller centrale data. Den fjerner kun den forældede tælleblokering, så den private land-/vandkandidat kan gennemføre de allerede krævede gates.

## 4.0.196 – land/hav er én fysisk kontrakt

- Hver lokal kystdel har ét blåt havpunkt i vandet og ét grønt landpunkt på land. Linjen fra hav til land skal krydse den tilhørende kyst og være vinkelret på dens lokale retning; den røde pil i admin viser netop denne beregningsretning.
- Pålandsretningen kan ikke længere redigeres som et løsrevet tal. Den beregnes geodætisk fra havpunkt til landpunkt og er samme retningskilde for admin, DMI-sampling, lokal score og offentlig forklaring.
- En uafhængig landsaudit med ESA WorldCover 2021 ved fire afstande på hver side af den præcise kyst fandt 434 verificerede punktpar, 121 dokumenteret omvendte punktpar og 118 tvetydige. Stednavne må ikke bruges som bevis for land- eller vandside.
- De 121 dokumenterede rettelser genbygges som nye vinkelrette punktpar og skal bestå den private nationale punkt-, DMI-grid-, shadow-score-, runtime- og rollbackkæde før aktivering. De 118 tvetydige ændres ikke automatisk og kræver senere ejer-/kortkontrol.
- Rejsby og Ribe Vesterå er verificeret korrekt i sideauditen og bevares. En administrator kan fortsat flytte vandpunktet længere ud, men en godkendelse kan kun gemmes, når hele zonens punktpar krydser egen kyst vinkelret og med punkterne på hver sin side.

## 4.0.195 – Leaflet får position før vektorlag

- 4.0.194 ændrede kortets timing, men løste ikke rodårsagen. En isoleret browsertest med de rigtige 673 kystdele reproducerede Leaflet-fejlen `Cannot read properties of undefined (reading 'min')`.
- Fejlen opstod, fordi editoren tilføjede zonepolygon og kystlinjer til et nyt Leaflet-kort, før kortet havde fået sin første geografiske position. Kaldet stoppede derfor før både linjer, markører og `fitBounds`.
- 4.0.195 beregner først grænserne fra den valgte zones kystdele og punktpar, positionerer kortet og tegner derefter zone, kystlinjer og markører. Den isolerede browserkontrol af Rejsby/Ribe Vesterå viser korrekt område, 121 SVG-stier, to punktmarkører og ingen kortfejl.

## 4.0.194 – utilstrækkelig timingrettelse (erstattet af 4.0.195)

- Zonevalg blev gjort mere deterministisk, men ændringen løste ikke den manglende første Leaflet-position og er derfor erstattet af 4.0.195.
- Alle zonens kystdele og eksisterende land-/havpunkter tegnes på ny; den valgte kystdel fremhæves og er den eneste med flytbare markører.
- Den overflødige knap **Vis på hovedkortet** er fjernet fra arbejdsfladen. DMI, score, central lagring og det offentlige hovedkort er uændrede.

## 4.0.193 – lokal DMI-kæde gøres reel og fail-closed

- En systemaudit af 4.0.192 dokumenterede, at DMI-schedulerens dækningsnævner kun omfattede 210 hovedzoner. De 651 aktive lokale kystdele fandtes som samplingposter, men kunne ikke holde schedulerens recovery i gang. Det offentlige snapshot havde derfor 0/651 kystdele med dokumenteret lokal U/V-cache, selv om lokale scorer blev vist.
- Dækningsnævneren omfatter nu både aktive hovedzoner og aktive kystdele. 4.0.193 indførte historisk mindst 95 % verificerede lokale U/V-punkter og afvisning af overpublicering; procentgrænsen er erstattet af REQ-CURRENT-COVERAGE-100-001 i 4.0.232.
- En lokal del beregnes ikke uden både strømretning og -hastighed. Indtil en komplet lokal sammenligning findes, bruger brugersiden den fortsat valide hovedzonescore og viser ingen falsk påstand om forskelle mellem kystdele.
- Den fulde vinderforklaring, lokale rå vejrdata, lokale punktpar og lokale pålandsretning bevares nu i runtime. Debugvisningen må ikke blande hovedzonens retning med den vindende kystdels strøm.
- En enkelt beregnet kystdel må ikke beskrives som “forholdene gælder hele zonen”. Syvpointsreglen gælder kun en reel sammenligning mellem mindst to beregnede dele.
- Den aktuelle ejerbestilling autoriserer en landsdækkende, systemisk revision af lokale land-/havpunkter og meningsfuld kystdelsopdeling. Fungerende geometri ændres ikke uden dokumenteret behov; offentlig aktivering kræver gates og efterkontrol.
- Den godkendte kandidat er lokalt aktiveret som næste produktionspakke med 673 dele. Punktgeometriaudit, overlapgate og assembly-gate består med 0 fund; den hidtidige 651-dels pakke er bevaret som versionsstyret rollback.
- Den konservative orienteringskandidat opdeler kun en hovedzone automatisk, når den hidtil har én del og et vedvarende retningsskift på mindst 45 grader. Det giver 673 dele og 10 opdelte zoner, ikke en ny blind national masseopdeling.
- Helgenæs øst har tre lokale sider med selvstændige punktpar. Rejsby/Ribe Vesterå forbliver uændret, fordi land-siden er tvetydig. Privat GitHub Actions #31764242827 validerede alle 45 ændrede eller nye vandpunkter mod native DMI-grid med fuld dækning og 0 ugyldige punkter. Den daværende 95 %-indfasningsgate er historisk og nu erstattet af kravet om alle aktive dele.
- GitHub Actions #31764453987 produktionsverificerede selve 4.0.193-kodekæden med frisk data, fuld `npm run validate`, releasegate og deploy, før geometriaktiveringen blev committed.

## 4.0.192 – samlet land-/vandeditor pr. hovedzone

- Admin søger på hovedzonens aktuelle navn og viser hele hovedzonen sammen med alle dens aktive præcise kyststrækninger.
- Hver kyststrækning viser sit eget blå havpunkt og grønne landpunkt. Ejeren kan trække de eksisterende markører; pålandsretningen beregnes fra det autoritative punktpar.
- Godkendte ændringer gemmes centralt i `direction-reviews` med kystdel-ID, læses tilbage og anvendes af den offentlige kystdelsbygger. Kladder påvirker ikke runtime.
- DMI-sampleren læser nu den byggede aktive `data/live/coastal-parts-v2.json`, så adminrettet havpunkt, DMI-signatur, sampling, lokal score og offentlig visning ikke kan skilles ad. Næste fulde DMI-/releasegate er fortsat nødvendig før produktionsverifikation.

## 4.0.191 – DMI-cache signeres efter sampling, ikke driftstid

- #2437 beviste, at den private GitHub-cache blev restore-/save-behandlet, men `dkss_idw` startede igen og state indeholdt kun den aktuelle kørsels tidspunkt.
- Supportpakkerne fra #2435 og #2437 havde forskellige `zoneRegistrySignature`, selv om samplinggeografien var uændret. Den løbende vandkilderegistrering ændrede blandt andet `lastSeenAt`, observations- og forecasttider ved hver kørsel; rå filbytes gjorde derfor enhver checkpoint-cache kunstigt inkompatibel. Også almindelige releaseversionsfelter i zoneregisteret kunne give samme falske nulstilling.
- Signaturen bygges nu kanonisk kun af de felter, der bestemmer DMI-gridopslag: zone-ID, datapunkt/fallbackgeometri og kysttype; kystdel-ID, vandpunkt, status, kysttype og hovedzone; samt vandkildens stabile nøgle og punkt.
- Ændres et faktisk samplingpunkt, ejerskab, status eller geometri, skifter signaturen fortsat fail-closed. Løbende helbred, observationer, forecasttider og appversion nulstiller ikke længere recovery.

## 4.0.190 – progressiv DMI-cache vælges efter fremdrift

- Produktionskørslerne #2429–#2431 bekræftede det samme 125/210-mønster trods 4.0.189-rotationen. Det var et gentaget systemmønster, ikke tilfældige DMI-fejl.
- Den private checkpoint-cache blev gendannet korrekt, men builderen valgte derefter cache efter flest bevarede vejrkomponenter. En ældre offentlig cache kunne derfor vinde over den nyere private checkpoint-cache og slette `collectionState`, budgetrotation og behandlede forecast-trin fra arbejdsgrundlaget.
- Kompatible caches vælges nu først efter nyeste `checkpointedAt`/buildertid. Kvalitetsmålet bruges kun som tie-breaker. Den private checkpoint indeholder allerede den offentlige cache, som blev flettet ind ved kørslens start; gyldige data smides derfor ikke væk.
- DMI-audit, RavScore, fallback, kystdata og offentlig deploygate er uændret. Frisk CI skal stadig bevise rotation, voksende dækning og mindst 90 % verificeret aktuel U/V-dækning.

## 4.0.189 – budgetrotation mellem DMI-havmodeller

- Produktionskørslerne #2423–#2426 bevarede den progressive cache, men den videnskabelige strømaudit stod fast på 125/210 zoner.
- Loggene dokumenterede, at `dkss_idw` gentagne gange brugte hele arbejdsbudgettet, hvorefter schedulerens geografiske prioritet valgte samme model igen. `dkss_nsbs` og `dkss_lf` nåede derfor ikke frem til de resterende geografiske områder.
- En tidsafbrudt marinemodel registreres nu i den private collection-state og roterer bag ikke-forsøgte eller ældre afbrudte marinemodeller ved næste recoverykørsel. Markeringen nulstilles kun efter fuld eller dokumenteret uændret gyldig behandling.
- Kravet om mindst 90 % verificerede hovedzoner, U/V-fællespunkt, proveniens, fallback, RavScore, kyst og offentlig deploygate er uændret. Løsningen afventer CI-/produktionsbevis.

## 4.0.188 – progressiv privat DMI-zonecache

- Gentagne produktionskørsler stoppede korrekt ved den strenge strømaudit, fordi kun 85/210 hovedzoner havde verificerede aktuelle marine U/V-gitterpunkter.
- Fejlen fandtes før 4.0.187-kystændringen. De downloadede GRIB-filer blev bevaret, men den afledte `dmi-bulk-cache.json` gik tabt, når releasegaten stoppede deployment; næste kørsel begyndte derfor igen fra den samme utilstrækkelige offentlige cache.
- Workflowet gendanner og gemmer nu kun en vellykket afledt zonecache i GitHub Actions' private cache før releasegaten. Builderen sammenligner den med den senest deployede cache og accepterer kun kandidater med signatur for præcis det aktuelle zone-, kystdels- og punktregister. Offentligt artifact og deploy er fortsat låst bag uændret fuld validering og releasegate.
- Ingen DMI-audit, dækningsgrænse, fallback, RavScore eller kystgeometri er ændret.

## Bindende regressionsregel

- Eksisterende funktioner må ikke forsvinde eller blive afkoblet som utilsigtet bivirkning af nyt arbejde. Bevidst fjernelse kræver en udtrykkelig aktuel ejerbeslutning og skal afgrænses til det bestilte.
- Releasekontrol skal sammenligne den berørte funktionsflade før og efter på tværs af offentlig UI, admin, data/runtime og deployment. Tavst funktionstab er en releaseblokker.

## 4.0.187 – fem godkendte zoner og permanent sletning

- Ejeren godkendte slutkortet for Langeland syd/Bagenkop, Nykøbing Sjælland/Rørvig, Dronningmølle/Hornbæk, Ålsgårde/Helsingør og Lolland vest/Albuen.
- `DK-B10-16` Fejø/Femø er slettet helt efter udtrykkelig ejerbeslutning. Sletningen findes i repositoryets zoneregister, den aktive præcise kystpakke og centralt i Supabase `direction-reviews` version 315.
- Den aktive pakke har 651 kystdele i 210 effektive hovedzoner, 651 punktpar, nul ugyldige punktpar og nul tværzoneoverlap. Den private native DMI-/runtimegate #31609637964 var grøn før ejerens slutgodkendelse.
- Den tidligere 4.0.182-pakke og zoneregisteret ligger som rollback under `data/geometry-v2/rollback-4.0.186-before-five-zone-coast/`.
- Offentlig produktion er først produktionsverificeret, når 4.0.187 har bestået frisk central hydration, fulde releasegates og deploy.

## Historisk arbejdsafgrænsning – DEC-0036, senere udvidet af ejeren

- DEC-0036 afgrænsede den daværende rettelse til fem godkendte zoner og den senere slettede Fejø/Femø-zone. Ejeren gav efterfølgende udtrykkeligt mandat til en landsdækkende, privat og score-neutral revision af kystdele og land-/vandpunkter. Den nyere aktuelle ejerbeslutning erstatter kun den gamle scope-stopregel, ikke sikkerhedsgates eller krav om særskilt aktivering.
- Havnø og Mariager Fjord øst samt Fejø/Femø forbliver slettet. Den produktionsverificerede offentlige kyst er baseline, mens den brede kandidat auditeres privat.
- Den nationale pipeline må fortsætte read-only gennem geometri, punktpar, DMI, state, shadow-score, admin-roundtrip og artifacts. Den må ikke aktivere offentlig geometri, score eller admin-sandhed automatisk.
- Den aktive private valideringsvej er `.github/workflows/validate-six-zone-recovery.yml`. Den kan hverken deploye eller ændre offentlig geometri og afviser andet end den fastlåste seks-zoneplan.
- #31609637964 bestod den korrigerede 22-dels kandidats geometri, punktpar, native DMI-grid, deaktiverede runtime og rollback-isolation. Kandidaten har 656 dele i 211 zoner; alle zoner uden for de seks mål og deres nødvendige grænsenaboer matcher den aktive runtime uændret. Visuel ejergodkendelse mangler.

## 4.0.186-kandidat – trækbar kystgrænse og privat fallbackrecovery

- Admin kan trække hovedzonens kystende til en eksisterende valideret nabokystdel. Ejerskab, geometri, land-/vandpunkt, DMI- og scoreidentitet flyttes samlet, og zoneafgrænsningen følger automatisk.
- Et reversibelt viskelæder kan deaktivere en hel valideret del. Central schema-4-readback og produktionsbyggeren behandler geometri og datakontrakt samlet.
- Fri ny kysttegning bliver ikke behandlet som valideret DMI-data. Helt ny geometri skal fortsat gennem private punkt-, grid-, shadow-score-, runtime- og rollbackgates.
- Havnø/Mariager Fjord forbliver slettet. Hele del-flytninger til Nykøbing/Rørvig og Dronningmølle/Hornbæk blev forkastet, fordi de ville tømme nabozoner. Den korrigerede officielle kandidat opdeler ved de faktiske grænser og består af 22 mål-/naborester med 22/22 punktpar og nul overlap. Nyt DMI-bevis mangler.
- Den eksisterende private nationale Linux-kæde er koblet til fallbackrecoveryen: kandidaten genbygges fra samme friske GeoDanmark-kyst, ejerskab/punktpar/overlap kontrolleres fail-closed, og vandpunkterne prøves på native DMI-grid. Ingen af disse trin kan aktivere offentlig geometri.
- Første Linux-forsøg #31589561794 stoppede korrekt før kildehentning, fordi nationalpolitikken stadig krævede den historiske centrale bestand på 208 zoner, mens de tre nye Vadehavszoner giver 211. Politikken kræver nu udtrykkeligt 211 ved planporten; efterfølgende gater kræver samme positive bestand gennem plan, fliser, manifest, hydreret register og analyse.
- Andet Linux-forsøg #31589831140 hentede og validerede den officielle nationale kilde samt fjord-/normasker, men stoppede ved en separat historisk 208-konstant i topologiauditen. Topologiaudit, delgenerator og deres fail-closed validatorer/tests er afstemt til den samme eksplicitte 211-zonepolitik; dette er en privat pipelinekorrektion og ændrer ikke den offentlige kyst.
- Tredje Linux-forsøg #31590992368 bestod hele den rettede kæde gennem 211 zoner, 131 fliser, topologi, offentlig-kystdækning og private dele. Det stoppede før netværkskald på stednavneaudittens historiske krav om præcis 100 fliser. Gaten kræver nu i stedet præcis overensstemmelse med den aktuelle ikke-tomme plan og et komplet minimumsspor for alle fem stedtyper pr. flise.

## 4.0.185-kandidat – lokalt delkort og ryddet zonepanel

- Zoneforklaringen har en behovsstyret “Hvor er det?”-knap, som viser de allerede indlæste præcise kystdele med navne på hovedkortet og zoomer til zonen. Der tilføjes ingen billedfiler eller ekstra normal datahentning.
- Aktuelt bedste dele fremhæves efter den eksisterende syvpunktsregel. Ved status hele zonen udpeges ingen enkelt del som bedre.
- Den offentlige “Hvad fandt du?”-formular er fjernet fra zonepanelet. Turregistrering, observationstjeneste og adminanalyse er bevaret.
- Funktionen er produktionsverificeret i GitHub Actions #31578272122: frisk datakæde, fuld projektvalidering, releasegate og Pages-deploy bestod. Offentlig filkontrol viste version 4.0.185, “Hvor er det?”-knappen, kortlaget og zonezoom; “Hvad fandt du?”/observationsformularen findes ikke længere i zonepanelet.

## 4.0.184-kandidat – lokal scoreforklaring

- Når en hovedzone bruger de præcise kystdeles score, følger den vindende dels delscorer og forklaringer nu med til zonepanelet, debug, assistent og observationssnapshot.
- Syvpunktsreglen er uændret: højst 7 points forskel betyder hele zonen; først ved mere end 7 point fremhæves den bedste del eller flere dele inden for 7 point af maksimum.
- Zonepanelet viser tydeligt navn og score for den bedste kystdel og advarer om, at den viste hovedzonescore ikke nødvendigvis gælder resten af zonen.
- En audit af den offentlige 4.0.183-runtime fandt 412/412 aktuelle zone-/jagtformsvisninger med gyldig lokal score, vinder, delscorer og klassifikation. Fejlen var tab af præsentationsfelter, ikke DMI- eller scorefejl.
- Funktionen er produktionsverificeret i GitHub Actions #31575562432: frisk DMI-/scoreruntime, fuld projektvalidering, releasegate og Pages-deploy bestod. Offentlig kontrol viste version 4.0.184 og bekræftede for `DK-B09-19` score 78, vinderen `Mullerup Klint`, spredning 30 samt alle tre delscorer og forklaringsgrupper.

## 4.0.183 – entydige hovedzoneskel og redigerbart delejerskab

- Det offentlige kort tegner kun ét sort skel ved et dokumenteret møde mellem to forskellige hovedzoner. Interne kystdele og frie ender får ingen sort markering; markeringen er lille på landsniveau.
- “Tilbage til oversigten” gendanner Danmarksoverblikket.
- Admin kan ændre en hovedzones længde ved at flytte eksisterende præcise kystdele mellem hovedzoner. Geometri, land-/vandpunkt, DMI-gridbevis og lokal scoreidentitet følger samlet med.
- Produktionsbygningen afviser ejerskab til en ukendt/slettet zone og publicerer hver del højst én gang. En slettet zones ikke-flyttede dele fjernes fra runtime.
- Funktionen er produktionsverificeret. GitHub Actions #31572312647 bestod den fulde bygge-, data-, release- og Pages-kæde, og den offentlige side leverer 4.0.183 med de nye kort- og adminfunktioner.

## Aktiv national kystgeometri – 4.0.182 produktionsverificeret

- Ejeren har godkendt den samlede slutkontrol og de efterfølgende seks rettelser. 4.0.182 er lokalt samlet med 212 hovedzoner: 206 bruger præcise kystforløb og seks beholder den gamle hovedzonelinje som sikker fallback.
- De 212 er repositoryets samlede register før central adminhydrering. Den eksisterende, centralt godkendte tombstone for `DK-B02-14` bevares, så effektiv offentlig produktion har 211 hovedzoner. De tre nye Vadehavszoner er blandt de 211 og blev alle bygget med friske data i #31539597870.
- De 643 interne beregningsdele bliver fortsat ikke vist som selvstændige zoner. Kortet viser én klikbar hovedzone, én scorefarve og kun hovedzonens to endemarkeringer, mens dens synlige streg samles af de præcise dele.
- Kandidaten har nul tværzoneoverlap og nul uafklarede relevante kysthuller. Vadehavets fastlandskyst fra Emmerlev mod Esbjerg er med. 632 dele har fuldt og 11 delvist marint gridbevis; alle 643 har land-/vandpunkter.
- Privat kørsel #31532688885 beviste DMI for alle 39 nye eller ændrede punktpar. Privat #31533385967 beviste den komplette deaktiverede runtime, offentlig kontrakt samt central create/read/update/delete/rollback uden at ændre beskyttede adminposter.
- Offentlig produktion er 4.0.182. #31541126136 bestod frisk DMI, fuld `npm run validate`, release-gate, central Supabase-readback, Pages-artifact og deploy. Efterfølgende onlinekontrol bekræftede HTTP 200, version 4.0.182, 211 effektive hovedzoner, 643 aktiverede kystdele under 206 præcise zoner, alle tre Vadehavszoner med offentlige vejrdata samt et synligt Leaflet-kort uden browserfejl.
- De to første produktionsforsøg deployede intet. #31536061680 fandt, at legacy-kystgeneratoren fjernede de tre godkendte Vadehavszoner; #31537882402 fandt derefter, at Supabases ældre aktiveringsmanifest overskrev den nyere godkendte repositorymanifest. Begge dokumenterede årsager er rettet uden at svække central admin-sandhed: kun en strengt nyere, eksplicit ejer-godkendt aktivering kan krydse den centrale grænse én gang, mens samme version igen gør Supabase autoritativ for rollback.
- #31539597870 beviste derefter engangspromotionen, frisk DMI, alle tre Vadehavszoner og central vejrskrivning. Den stoppede uden deploy på en ældre test, der matchede Python-filens tidligere komprimerede tekstformatering; testen kontrollerer nu den semantiske nøgle-/stikontrakt.

### Historisk kandidatforløb – erstattet af den produktionsverificerede status ovenfor

Punkterne nedenfor bevarer beslutnings- og fejlsøgningshistorikken frem mod 4.0.182. Formuleringer som “privat”, “kommende” og “ikke aktiveret” er historiske og må ikke læses som aktuel produktionsstatus.

- De seks ejer-godkendte rettelser er nu samlet med den additive kandidat i en ny privat slutkandidat: 206 hovedzoner med præcis kyst og 643 lokale kystdele. En korrigeret, symmetrisk overlapgate fandt 11 additive dubletdele, som den tidligere ensidige kontrol overså; de er fjernet med eksisterende ejer-godkendt linje som autoritet. Tre præcisionszoner blev derved helt tomme og bruger derfor deres bevarede hovedzonefallback. Én 120,7 meter lukket, irrelevant småø-del er også fjernet, og ejerskabet ved Pøl Huk er overført til `Mommark & Pøl Huk`. Den samlede kandidat har nul tværzoneoverlap.
- Den nye nationale hulaudit beskriver 161 kildeforskelle: 74 tidligere ejer-godkendte udeladelser, 73 forskelle løst af de aktuelle ejerafgørelser og 14 teknisk irrelevante små lukkede øformer. Der er nul uafklarede relevante huller.
- Alle 643 dele har nu land- og vandpunkt. De 604 genbrugte dele bevarer deres eksisterende punktpar; alle 39 reelt nye eller ændrede dele har nye punktpar uden blokering. Privat Linux-kørsel #31532688885 godkendte den endelige bestand: 39/39 har fuld WAM+DKSS-dækning, nul er delvise eller blokerede. Det samlede kommende hovedzoneregister er 212: 206 zoner med præcis kyst og seks zoner med bevaret fallbacklinje. Intet er aktiveret offentligt endnu.
- Ejeren godkendte 11. august 2026 det private seks-zoners korrektionskort. Godkendelsen omfatter Nibe-reduktionen, navnene `Bredfjed` og `Mommark & Pøl Huk`, de tre Vadehavszoner inklusive de to dokumenterede broer samt forkastelsen af de to fejlagtige præcisionsforslag. Den er ikke i sig selv en produktions- eller scoreaktivering.
- Ejerens seneste og autoritative slutkontrol er eksport `(4)` kl. 21.19 med otte afgørelser. Rejsby–Ribe er godkendt. Ålsgårde/Helsingør-kandidaten (svensk geometri) og Fejø/Femø-kandidaten (irrelevante småøer) er forkastet, ikke de eksisterende hovedzoner. Nibe beholder kun den sydlige relevante linje; DK-B10-13 foreslås som `Bredfjed`; DK-B12-07 som `Mommark & Pøl Huk`; Emmerlev–Ballum er samlet; Ribe Å springes over ved mundingen. Rettelserne er fortsat private og ikke aktiveret.
- Fastlandskysten langs Vadehavet fra Emmerlev mod Esbjerg er bindende relevant ravkyst, selv om Rømø, Mandø og Fanø ligger udenfor. Det rettede private forslag har tre forståelige hovedzoner (`Emmerlev og Ballum`, `Rejsby og Ribe Vesterå`, `Ribe Kammersluse og Esbjerg`), samlet 81,883 km efter deduplikering mod den eksisterende Emmerlev-kyst. Økyster og Rømødæmningen er filtreret fra, og runtime-overlap er nul. To ejerbestemte forbindelser på samlet 4.671,4 meter er dokumenterede manuelle broer uden for den direkte GeoDanmark-linje: den fragmenterede Vadehavsdige-strækning og springet over Ribe Å. Forslaget er ikke offentligt aktiveret.
- 4.0.181 er kun den akutte overskuelighedsrettelse, ikke det endelige kystprodukt. Ejerens bindende mål er de forståelige hovedzoner kombineret med de præcise officielle kystforløb, uden offentlige interne delmarkeringer og uden uforklarede huller på relevante almindelige kyster.
- En national audit har fundet en systemisk inputfejl: officielle fliser blev valgt fra den gamle kystlinje, så en fejlplaceret gammel linje kunne udelukke den rigtige strand fra kildedata. En lokal privat rettelse planlægger nu fra hele zonens ejerskabsområde og anvender bred recovery kun for aktive hovedzoner uden præcise dele. Ny privat CI og samlet hul-/overlapaudit kræves før offentlig ændring.
- Privat #31520862947 beviste den afgrænsede recoveryregel frem til den kendt ustabile stednavnetjeneste og uploadede kompakt QA. Den gav 815 rå forslag og fandt 18,236 km officiel kandidat ved Nibe uden det forkastede evidensrektangels eksplosion. Ålsgårde/Helsingør forbliver uden sikker kilde. Den offentlige side er fortsat 4.0.181 og uændret.
- Den additive private kandidat bevarer de 605 allerede ejer-godkendte dele byte-for-byte og supplerer kun tidligere manglende hovedzoner. Lokal once-only-sammenlægning giver 650 dele i 203 af 208 effektive hovedzoner, nul officielle kildeafvigelser og nul tværzoneoverlap. De fem resterende zoner er Nibe Bredning vest, Ålsgårde/Helsingør, Lolland sydvest/Kramnitse, Fejø/Femø og Als syd/Kegnæs; de kræver en lille særskilt ejerafgørelse og må ikke aktiveres blindt.
- Den nationale hulaudit fandt 166 kildeforskelle. Præcis sammenligning med det tidligere ejer-godkendte rågrundlag klassificerer 84 som bevidst fjernede havne, indre kyster, irrelevante øer eller tilsvarende. De resterende 82 ligger udelukkende i fire af de fem blokerede hovedzoner; der er dermed ingen nye uforklarede huller i de 203 sikre zoner.
- Den ejer-godkendte kandidat fra privat #31480089490 er nu aktiveret i koden: 605 lokale dele i 190 hovedzoner, nul overlap, 605 gyldige land-/vandpunktpar, 594 fulde og 11 delvise marine gridbeviser.
- DMI-bulk sampler alle lokale vandpunkter i de samme downloadede GRIB-felter. Det giver ikke 605 særskilte DMI-kald og ændrer ikke den eksisterende hovedzonescheduler.
- RavScore beregnes pr. lokal del. Højeste gyldige score bliver hovedzonens score, mens 7 point afgør, om visningen gælder hele zonen, én del eller flere dele. Manglende lokale data forbliver manglende; hovedzonescoren må ikke bruges som skjult fallback.
- Kortet læser den versionerede kystdelsfil. Den kompakte centrale adminpost `coastal-parts-v2-activation` er aktiverings- og rollback-sandhed.
- #31498481482 beviste 4.0.180 med fulde gates, central readback, artifact og deploy. Det offentlige datasæt gav lokal score til 605/605 dele i alle 190 hovedzoner. Den målrettede 32-cellegrænse vælger fortsat kun nærmeste fælles gyldige U/V; marine krav er uændrede.
- Ejerens første offentlige kortkontrol fandt en alvorlig præsentationsfejl: appen omdannede alle lokale beregningsdele til selvstændige synlige linjer. Hver del fik to sorte endemarkeringer og egne tunge Leaflet-lag; ved Sibirien blev samme hovedzone blandt andet vist med gentaget navn, mange interne markeringer og huller.
- 4.0.181 bevarer alle lokale dele, punkter, vejrserier og scorer, men tegner igen kun hovedzonernes autoritative kystlinjer. Dermed er de indre delgrænser usynlige, og kun hovedzonens start og slutning markeres. #2279 (`31505747519`) bestod frisk DMI-kæde, fuld Linux-validering, release-gate, Pages-artifact og deploy. Offentlig browserkontrol viste version 4.0.181, 208 centralt aktive hovedzoner og præcis 416 endemarkeringer.

## Planlagt privat besøgsrapport
- Ejeren har besluttet, at RavRadar senere skal have en besøgtæller, som ikke vises offentligt. En enkel rapport skal være tilgængelig i den adgangsbeskyttede admin-del.
- Funktionen er endnu ikke implementeret. Designet skal være dataminimeret, skelne sidevisninger fra besøg/anslået unikhed, være kvotesikkert og aldrig blokere siden eller påvirke RavScore.

## Næste aktive roadmaptrin
- P0-ejeropgaven er en gradvis manuel gennemgang af de eksisterende land-/havpunktpar. Den kan udskydes og må ikke blokere uafhængigt udviklingsarbejde, men skal være afsluttet før endelig faglig score- og brugerreleasegodkendelse.
- Næste aktive udviklertrin er P1-audit og design af komplette DMI-first femdøgnskæder pr. komponent under DEC-0030. Ingen ny produktionskilde eller fallback må indføres, før aktuel dækning, proveniens, overgange og regressioner er dokumenteret.
- Supabase-egress følges gennem næste billingperiode. Den private, dataminimerede besøgstæller med enkel adminrapport er fortsat en senere P2-opgave.

Denne fil er første opslag ved en ny chat. Den indeholder kun gældende sandhed og udtrykkeligt planlagte næste skridt. Historik findes andre steder i RDKS.

## Historik – kystgeometri-v2-pilot før aktivering
Følgende punkter dokumenterer de tidligere private gates. Deres formuleringer om manglende aktivering er historiske og er erstattet af den aktive status ovenfor.
- 4.0.174 tilføjer den manglende slutgate efter ejerrettelserne. De 753 tilbageværende tekniske dele havde 311 overlappar, alle mellem forskellige zoner. En deterministisk once-only-samling bruger den centralt gemte zonekyst og datapunkt som ejerskabsbevis samt en eksplicit Hammer Odde-grænse mellem Bornholms nordvest- og nordzone. Lokalt resultat er 603 fysiske dele, nul overlap og nul tætte uafgjorte ejerskaber. Land-/vandpunkter er genberegnet på slutgeometrien: 603/603 har punktpar efter seks dokumenterede kartografiske sideafgørelser. Ny privat CI skal nu bevise native DMI-grid, flertrinsserier, state, vind og shadow-score for netop slutbestanden. Intet er aktiveret.
- 4.0.173 bevarer ejerens anden gennemgang af 23 dele: 15 sletninger, tre godkendelser og fem præcise rettelser ved Thyborøn, Bremdal, Bjerget, Bouet og Flyvesandet. En metrisk dubletaudit fandt 12 yderligere tekniske ID'er for allerede bedømte fysiske linjer og fører afgørelsen videre til den rettede geometri. Dermed er restlisten nul, og ingen tidligere afgørelse sendes tilbage under et nyt ID. Forslaget omfatter nu 60 tekniske dele med nul uafklarede rettelser. Det er fortsat privat, score-neutralt og ikke aktiveret.
- 4.0.172 bevarer ejerens 31 eksporterede afgørelser som versionsstyret, privat input. De giver 11 uændrede godkendelser, 10 hele sletninger, tre sikre komponentrensninger, én navnerettelse og seks målrettede beskæringer. En supplerende audit af alle 783 dele bruger alle officielle Farvand-typer, havne, afstand til officielt åbent hav og små lukkede former, men kræver mindst fire uafhængige tegn før ny ejerreview. Dubletter samles, så den foreløbige restliste er 23 unikke dele. Ingen geometri, admin-data, sampling, state, score eller offentlig runtime er aktiveret.
- 4.0.171 erstatter det ubrugelige sammenpressede Danmarkskort med en praktisk privat ejerreviewside: én stor del ad gangen, almindeligt kort/luftfoto, stednavne, kraftig kystlinje, 31 opmærksomhedsdele først, lokale Godkend/Skal rettes-beslutninger og JSON-eksport. Beslutningerne er lokale og aktiverer intet.
- 4.0.170 dokumenterer den fuldt beståede private nationalkørsel #31448258035. Alle 774 gridgodkendte dele fik to native vindtrin, 752 komplette dele blev shadow-scoret, 22 deldækkede og ni blokerede forblev fail-closed, ejer-reviewet indeholder præcis 783 dele, og den centrale tempkladde blev oprettet, læst, opdateret og slettet uden ændring af beskyttede dokumenter. Manuel ejerreview er nu næste gate; intet er aktiveret i offentlig runtime.
- Privat 4.0.168-run #31445033036 bestod fire native havtrin og tretimerskravet, men stoppede vindgaten ved DMI-downloadgrænsen, fordi for mange scoretider blev hentet som store vindfiler. 4.0.169 vælger præcis to vindassets, inklusive et tidsmatch til et ægte marint `t`/`t+3h`-par. Offentlig 4.0.168-produktion #31445032901 er grøn og upåvirket.
- Privat 4.0.167-run #31440337378 viste, at to marine assets omkring midnat ikke garanterer den native `t+3h`-vandstand, som shadow-score kræver; 0/752 blev derfor korrekt afvist, og review/admin-trin blev ikke kørt. 4.0.168 henter fire assets og kræver et ægte tretimerspar. Offentlig 4.0.167-produktion #31440312424 er fortsat grøn og upåvirket.
- Produktion #31425309838 verificerede 4.0.166 med frisk DMI, fulde Linux-gates, Supabase-sync og Pages-deploy. Privat #31425327202 verificerede 774/774 native vindserier og DEC-0033-shadow-score for 752 fuldt dækkede dele; 22 deldækkede og ni blokerede forblev fail-closed.
- 4.0.167 bygger den samlede private, score-neutrale ejer-reviewside for 783 dele samt en central tempkladde-roundtrip/rollback. Ingen geometri, sampling, state, score, admin eller offentlig runtime er aktiveret.
- 4.0.145 er produktionsverificeret i #2032 med fuld Linux-validate, releasegate, artifacts og Pages-deploy. Privat #2033 gentog den central-hydrerede 208-zonekæde, bestod kildevalidator og `STRtree`-QA og uploadede både det fulde råartifact på 413 MB og et kompakt QA-artifact på 6,8 MB; build og Pages var skipped. Den aktuelle centrale geometri gav 100 fliser/700 lagforespørgsler; 101/707 var den tidligere repositorybaserede måling.
- Artifactauditen viser 12.094 deduplikerede kystfeatures og 9.929 rumligt relevante kyststykker. Kun 20 zoner er direkte source-reference-ready; 188 er flagget, heraf 46 med central-admin-konflikt. 4.0.146 bygger derfor en read-only national topologiaudit med officielle fjord-/normasker, havne, reelle åmundinger, klit/skrænt-evidens og score-neutrale høfter. Ingen blind snapping eller aktivering.
- 4.0.146 er produktionsverificeret i #2036; privat #2037 bestod 208-zone topologiaudit og gate. Artifactet målte 90 officielle fjord-/norpolygoner, 1.225 havneobjekter, 3.347 høfter og klit-/skræntevidens i henholdsvis 183/168 zoner. Første åmundingsregel gav derimod 2.868 klynger, op til 189 i én zone, og er fagligt no-go trods grøn teknisk gate. 4.0.147 tilbageholder åmasker i overdense zoner og eksporterer aggregeret egenskabsprofil/diagnostiske samples til regelkorrektion.
- 4.0.147 er produktionsverificeret i #2039; privat #2040 tilbageholdt åmasker i alle 45 overdense zoner. Profilen viser 2.551 rå kandidater på 0–2,5 m, 806 på 2,5–12 m og 37 på mindst 12 m. 4.0.148 tester derfor et kildebaseret filter på mindst 2,5 m officiel midtebredde og 100 m fysisk linjelængde; smalle/korte fravalg tælles, og >20 resterende klynger er fortsat no-go.
- #2054 produktionsverificerede 4.0.151. Privat #2055 bekræftede 755 fysiske multipart-reviewdele og balancerede officielle stednavnekandidater til 755/755 dele. 4.0.152 opdeler de 28 grove dele i 56 private lokale forslag, højst 19,882 km, med fuld kildebevarelse og nul opdigtede forbindelser, navne, punkter eller runtimeaktivering.
- Privat #2107 CI-verificerede den friske 4.0.152-kæde. 4.0.154 foreslår derefter private, revisionsbare og zoneunikke navne til alle 783 endelige lokale dele. Forslagene bygger på officielle kandidat-ID'er og afstande; de ændrer ikke admin, runtime eller score. Den ene del uden direkte kystanker får lokal bebyggelsesevidens (`Hou Syd`, 508,7 m) i stedet for et opdigtet navn.
- #2114/#2115 verificerede præcis 783 dele, 774 punktpar og ni fail-closed dele. #2127 bestod den samlede 4.0.158-gridgate: 774/774 valgte vandpunkter har native havgridbevis, 752 har fuld WAM+DKSS og 22 har eksplicit deldækning. Alle ni normalsidetvivl forbliver blokerede, fordi DMI ikke giver præcis én entydig side. Ingen sampling er aktiveret.
- 4.0.159 generaliserer Blåvands serieisolation til en privat national kontrakt. 774 dele får hver sin serie- og historikidentitet; 22 komponentgab bevares som missing, ni blokerede dele udelukkes, og alle 208 parent-zoner forbliver autoritativ runtime. #2132 bestod Linux-gates; tre private rebuilds blev stoppet før kontrakten af ikke-JSON fra den officielle stednavnetjeneste.
- 4.0.160 tilføjer den private nationale flertrinsgate: mindst to komplette native trin pr. faktisk tilgængelig WAM-/DKSS-familie, samme current-U/V-celle og vertikallag samt kun digests/provenance i artifactet. Den aktiverer ikke sampling, state, score, UI, admin eller public runtime.
- #2142 beviste hele upstreamkæden og 4.0.159-kontrakten, men fandt ved start af 4.0.160-gaten et lokalt scopeproblem for `parts_by_id`. 4.0.161 flytter opslaget til live-`run()` og regressionstester WAM-/DKSS-routing; privat CI afventer genkørsel.
- #2146 CI-verificerede den korrigerede flertrinsgate: 774 unikke serier, 1.526 faktiske model-familier, to native trin pr. familie og 9.156 komponentbeviser med komplet DMI-provenance. Alle sikkerhedsflag er falske, og artifactet indeholder ingen rå værdier.
- 4.0.162 bygger separat `shadow-v2`-state/historik for de 770 dele med DKSS-current. De fire WAM-only dele markeres missing og må ikke låne parent-state. Replayinput er transient, score-neutralitet kontrolleres for begge jagtformer, og state forbliver deaktiveret.
- #2152 CI-verificerede 770 unikke `shadow-v2`-historikker, fire eksplicitte state-gab, slettet transient replay, nul parent-/krydslæsning og uændret RavScore for begge jagtformer.
- En gyldig lokal score kræver også egen vind. #2157 nåede 4.0.163-vindgaten efter grøn upstreamkæde, men stoppede fail-closed på parserens standardtidsbudget efter 16 minutter. 4.0.164 giver kun dette private trin 3.000 sekunder; datakravene er uændrede.
- 4.0.164 tilføjer en privat DEC-0033-shadow-scoregate. Kun eksakt tidsfælles native lokal vind, bølge, strøm, vandstand og isoleret state må bruges; resultatet klassificeres med 7-pointmarginen og kan ikke ændre aktiv score, UI, admin eller public runtime. Privat CI afventer.
- #2163 produktionsverificerede 4.0.164 med fuld frisk kæde og deploy. Privat #2164 nåede vindresultatet inden for det rettede budget, men fire nærmeste HARMONIE-celler gav intet fælles U/V ved Harbo Odde. 4.0.165 søger derfor 32 native kandidater kun i privat gate og bevarer samme-celle-/afstandsgaten.
- #2167 viste, at 4.0.165 i praksis anvendte 32-kandidatsøgningen på alle 774 dele og stadig arbejdede efter 54 minutter. 4.0.166 retter skalaen: fire celler for alle, derefter målrettet 32-celle-retry kun for manglende dele.
- 4.0.144-kandidaten retter den målte nationale skaleringssvaghed i 4.0.143: 101 fliser gav 707 sekventielle lagrequests uden afslutning efter mere end ti minutter. Hentningen bruger nu højst fire samtidige fliser med fremdriftslog, efterfølges af fail-closed kontrol af 208-zoners dækning, alle fliser/lags komplethed, filhash, deduplikering og credentialfravær og danner derefter rumligt indekseret read-only source-QA for alle zoner. Ingen aktivering eller mutation.
- 4.0.143-kandidaten etablerer den første nationale, central-hydrerede arbejds- og kildekæde. Den kræver 208 effektive zoner, opdeler kysten i deterministiske fliser, klassificerer kendte semantik-/partitionsfejl og alle centrale ændringer som eksplicitte konflikter, henter gratis officielle GeoDanmark-lag privat og deduplikerer fliseoverlap. Jobbet har ingen Pages-rettigheder og kan ikke ændre geometri, admin, vejr eller score. Nationalt CI-artifact og efterfølgende topologigenerering mangler.
- DEC-0033 fastlægger den ønskede fremtidige scoremodel: den højeste gyldige lokale delscore bestemmer zonescoren pr. tidspunkt/jagtform. UI skal samtidig sige tydeligt “hele zonen”, navngive den eller de dele vurderingen gælder, eller vise usikker dækning og forklare de lokale vind-, strøm-, bølge-, vandstands- og statebidrag. Beslutningen er ikke aktiveret; ejerens visuelle review og shadow-scorevalidering kommer først.
- DEC-0034 fastlægger, at den nuværende GitHub Pages-side er et pre-domain testmiljø uden aktive brugere. Hele Danmark skal bygges, kendte geografiske fejl skal rettes, og den samlede løsning må aktiveres dér efter grøn national integritets-/releasegate. Blåvand er referenceimplementering, ikke eneste aktiveringszone. Før et senere købt domæne kræves en ny modenheds-/produktionsgate.
- 4.0.142 består den private Blåvand-specifikke admin-roundtrip/rollback i #2014. Tempkladden blev oprettet, læst, opdateret, slettet og verificeret fraværende. `coastline-overrides` var uændret på version 55 og `direction-reviews` på version 314 med identiske før/efter-digests. #2013 bestod fuld produktion. Næste trin er eksplicit ejer-go/no-go; ingen implicit aktivering.
- 4.0.141 består den private score-neutrale UI-gate i #2009. Parent-kystlinjen forbliver den aktive RavScore-farvede linje med uændret klikmål, tooltip, score og rangering; begge delkonturer er kontraktlåst uden scorefarve, rangering, “bedste del” eller interaktion. Artifactet er auditeret uden rå-/credentiallæk og med alle mutationsflag falske. #2008 bestod fuld produktion og deploy.
- 4.0.140 består separat state-/historikisolation som privat replay i #2004. Hver del bruger egen `historyKey` gennem den eksisterende score-neutrale `shadow-v2`-funktion; artifactet beviser nul parent-genbrug/krydslæsning og scorepåvirkning samt slettet transient råinput. #2003 bestod den fulde produktion.
- 4.0.139 består den private flertidsseriegate: #1997 gav begge Blåvand-dele fire fælles komplette native WAM-/DKSS-tidstrin og 48 komponentposter med del-ID, fuld provenance, gridpunkt og korrekt current-lag. Artifactet har kun tilstedeværelse og kontekstbundne værdihash, ingen rå værdifelter eller credentialbærende URL. #1996 bestod den fulde produktion. Krydsmerge og alle runtime-/score-/adminændringer forbliver forbudt.
- 4.0.138 fastlægger en privat weather-shadow-kontrakt for de to validerede Blåvand-kystdele. Hver del får stabil `zoneId::partId`-serieidentitet, eget punkt/grid/provenienskrav og separat fremtidig historiknøgle. Krydsmerge, fallback, public projection, admin-write, part-score, state og automatisk aktivering er eksplicit forbudt. Privat pilot #1992 verificerede artifactet; normal produktion #1991 bestod de fulde gates og deploy. Den eksisterende `DK-B03-13`-serie, historik og RavScore forbliver runtime-sandhed.
- 4.0.137 genbruger produktionens faktiske DMI STAC/GRIB-parser, nearest-valid-cell-søgning, afstandsgrænser og fælles fysiske U/V-gridregel. Privat pilot #1987 bestod: begge Blåvand-vandpunkter har gyldige `wam_nsb`- og `dkss_nsbs`-celler, current-U/V deler fysisk celle og 17 m-lag, og alle seks komponentfelter rammer forskellige celler mellem nord og sydøst. Rapporten gemmer kun gridkoordinater, afstande og provenance; alle mutations-/aktiveringsflag er falske. DMI-gridgaten er bestået privat, men sampling er ikke aktiveret.
- 4.0.136 retter den ortofotoafviste huk-hårnål. Den målte rå rute var 430,0 m over en 144,3 m chord (ratio 2,98). En eksplicit policy bevarer det søværts apex, genforener med den sydøstlige åbne strand og fjerner 242,0 m indadgående detur. Privat pilot #1982 bekræftede det nye officielle ortofoto: den grønne relevante strandlinje springer den indre lagune-/sandspidsomvej over og ligger på sand/landsiden; tre overlays, nul credentialmatch og alle aktiveringsflag falske. Ortofotogaten er bestået for den private linje.
- 4.0.135 genbruger den eksisterende moderniserede `DATAFORDELER_API_KEY` til den gratis officielle `GeoDanmark Ortofoto forår Web Mercator WMTS`. Privat pilot #1974 dannede tre zoom-17-overlays af 108 tiles uden credentialmatch og uden build/Pages. Nord- og sydøstlinjen passer overordnet, men hukudsnittet afslørede en indadgående sandtange-/laguneløkke; ortofotogaten er derfor no-go, indtil løkken er rettet og genkontrolleret.
- DEC-0032 er den aktive kontrakt for en parallel geometri-v2-pilot. Den nuværende produktionsgeometri og centralt gemte adminrettelser ændres ikke af pilotens analyse/generering.
- Den viste kystlinje skal følge relevante ravstrande og må springe over havne, åudløb og irrelevante strækninger. Indre fjorde udelukkes; Limfjorden er eneste fjordområde.
- Zoner, navne og placeringer må korrigeres, mens tekniske ID'er bevares som udgangspunkt. Væsentlig ændring af et IDs geografiske betydning kræver eksplicit historik-/regel-/observationsmigration.
- Flere navngivne lokale kystdele kan være nødvendige, men de nuværende retningsankre er endnu ikke selvstændige vejrmålepunkter. V2 må først bruge dem sådan efter fuld DMI-/proveniens-/score-/UI-implementering og validering.
- Høfder og andre mulige ravfælder registreres foreløbig som score-neutrale featurehypoteser. Eventuel scorepåvirkning tilhører den senere DEC-0029-forskning.
- Landsdækkende aktivering kræver et særskilt go/no-go efter pilot på mindst tre forskellige kystmiljøer og systemisk validering.
- Read-only sammenligning viser 209 aktive repositoryzoner mod 208 offentligt effektive zoner. `DK-B02-14` er centralt slettet, `DK-B10-05` er centralt omdøbt, og 18 offentlige zoner har i alt flere lokale retningsankre, som ikke findes i repositorygrundfilen. V2-generatoren skal derfor altid starte efter central hydrering.
- `DATAFORDELER_API_KEY` er oprettet som GitHub repository secret. Det særskilte manuelle `geometry-v2-pilot`-job er score-neutralt, hydrerer central admin-sandhed, har ingen Pages-rettigheder og skriver ingen secretværdi. #1931 bekræftede faktiske udtræk fra syv `_current`-lag i tre områder. Flere maskelag ramte 10.000-featureloftet; 4.0.128 paginerer og uploader den skjulte rå arbejdsmappe privat. Komplethed afventer genkørsel.
- #1936 produktionsverificerede 4.0.129: 21/21 udtræk er komplette, seks blev pagineret, 21 rå GeoJSON-filer på ca. 341 MB ligger i det private artifact, og pilot-/vejrgrupperne kørte uafhængigt.
- #1941 produktionsverificerede 4.0.130: centralt effektive pilotzoner blev sammenholdt med GeoDanmark, source-QA og tre kort blev gemt privat, og build/Pages blev sprunget over. Alle ni zoner kræver review; blind snapping er forkastet.
- #1948 produktionsverificerede 4.0.131: 702 fysiske kildestykker og den nøglefri officielle navneaudit blev genereret privat; #1947 bestod samtidig den fulde produktionskæde og begge gates.
- #1952 CI-verificerede 4.0.132 med 84 private reviewforslag, tre kort og alle mutationsflag falske; #1951 bestod fuld frisk produktion, validate, release-gate og Pages-deploy på samme commit.
- #1959 CI-verificerede 4.0.133 med seks officielle fjord/nor-polygoner, 72 private reviewdele, ni zonekort og kun Blåvand frigivet til detailanalyse. #1958 bestod samtidig fuld validate, release-gate og Pages-deploy på samme commit.
- #1964 produktionsverificerede 4.0.134 på commit `3843d20`: den fulde validate-gate, release-gate, Pages-artifact og deploy var success. Privat pilot #1967 brugte 208 centralt effektive zoner og verificerede to Blåvand-ankre, 72 private reviewdele, to detaildele, 15 detailfeatures, ni score-neutrale høfter og detailkortet; build og Pages var skipped.
- #1976 produktionsverificerede 4.0.135 på commit `47f88a3`: frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy var success. Den offentlige `version.json` viser 4.0.135. #1973 havde forinden stoppet sikkert på et privat Pillow-importlæk; hotfixet flyttede importen bag self-testen.
- #1981 produktionsverificerede 4.0.136 på commit `b82e311`: frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy var success. Offentlig `version.json` viser 4.0.136.
- #1986 produktionsverificerede 4.0.137 på commit `ab42e99`: central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy var success. Offentlig GitHub Pages `version.json` viser 4.0.137.
- #1992 verificerede 4.0.138's private weather-shadow-artifact med præcis to isolerede delserier, unikke serie-/historik-ID'er, korrekte gridreferencer, ingen credentialbærende URL og alle sampling-/state-/score-/UI-/admin-/aktiveringsflag falske. #1991 produktionsverificerede commit `2d6127b` med central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig `version.json` viser 4.0.138.
- Den første pilot #1965 stoppede sikkert, da central Supabase-sync timed out og faldt tilbage til repositoryets 209 zoner uden Blåvands to centrale retningsankre. Ingen historiske ankre blev brugt; den efterfølgende friske central-sync i #1967 lykkedes.
- Blåvands fysiske kyst splittes ved det officielle Blåvands Huk og forskydes 15 meter mod landsiden, som kontrolleres mod de to centralt verificerede adminankre. Forslaget har to navngivne lokale kystdele, to land-/vandpunktpar og ni score-neutrale høftehypoteser.
- Ingen Blåvand-geometri eller punkter er produktionsgodkendt. Gaterne frem til score-neutral UI er bestået privat i #2009. Næste gate er privat central admin-roundtrip/rollback; derefter følger eksplicit ejer-go/no-go. De øvrige otte zoner forbliver ved redesigngaten.

## 4.0.125 – DMI-identitet følger hver komponenttime
- STAC/GRIB-indlæsningen gemmer nu `collection`, `modelRun` og `nativeValidTime`, mens disse oplysninger stadig er autoritative. Parsergeneration 14 genbehandler rå assets efter den nye kontrakt.
- Timebyggeren fører proveniensen videre separat for vind, bølger, strøm, vandstand og vandtemperatur og beregner `leadTimeHours`, `forecastAgeHours`, `temporalResolution` og `nativeValidTimes`.
- Interpolation mellem native trin fra forskellige collections eller modelkørsler afvises. Manglende kompatibel serie forbliver `missing`; ingen værdi kopieres eller konstrueres.
- Under cachemigrationen må to pre-v14-trin, som begge mangler identitet, bevare tidligere værdiinterpolation, men de får ikke opdigtet proveniens og forbliver audit-advarsler. Et identificeret trin må aldrig blandes med et uidentificeret trin.
- Den endelige DMI/fallback-merge og vandstandskontinuiteten bevarer DMI-proveniensen. Audit schema 4 kontrollerer alle identitets- og tidsfelter.
- Ændringen er lokalt valideret, men afventer frisk produktion. RavScore, fallbackprioritet og public runtime-felter er uændrede.

## 4.0.124 – faktisk femdøgnsdækning måles pr. komponent
- De tidligere fem direkte DKSS-vindhalehuller er produktionsverificeret lukket. Efter de sidste centrale adminrettelser fik både Nibe/Sebbersund og Falster/Nysted 36 DKSS-haletidspunkter, og alle 208 zoner bevarede 118 offentlige vindtimer.
- Et produktionssnapshot fra datasættet `rr-20260808145245-208` viste, at vind ikke er lig med komplet komponentdækning: bølger var komplette i 192 zoner, 13 zoner havde 117 timer og 3 Limfjordszoner manglede bølger helt. Strøm, vandstand og vandtemperatur havde 118 timer i 200 zoner og 101 timer i 8 Limfjordszoner.
- Timekæden skelner værdimæssigt korrekt mellem DMI, fallback og `missing`, men fuld DMI-identitet går tabt: collection er kun delvist bevaret, og model-run, lead time og prognosealder findes ikke pr. time.
- 4.0.124 udvider kun beskyttet diagnostik. Ingen data-, fallback-, score- eller UI-adfærd ændres.

## 4.0.123 – marine landmasker undersøges bredere
- #1851 og #1852 havde fortsat præcis fem zoner uden direkte DKSS-vindhale: Fur syd, Nibe og Sebbersund, Gjøl og Attrup, Aalborg vest og Egholm samt Falster vest/Nysted Nor munding.
- De centralt gemte adminpunkter blev anvendt i produktionen. Flere af dem afviger fra repositoryets historiske geometri; manuelle rettelser er derfor ikke tabt eller overskrevet.
- Den tidligere søgning kunne stoppe efter 16/48 geometrisk nære celler, før en gyldig havcelle i DMI-landmasken blev undersøgt. 4.0.123 undersøger 64/128 celler, men fastholder afstandsgrænserne 24/32/40 km og kravet om samme fysiske U/V-punkt.
- Produktion skal afgøre den faktiske gevinst. Manglende direkte DKSS forbliver `missing`; den komplette offentlige fallbackkæde må ikke fremstilles som direkte DMI.
- `conditions.json` og DMI-cacher er build/admin- og hydreringstilstand. Den almindelige klient henter kun `public-conditions.json`; cachefilerne kan ikke fjernes fra Pages uden først at etablere et andet persistent lager.

## 4.0.122 – produktionsverificeret offentlig vindhale
- GitHub Actions #1845 på commit `76c7c23` kørte frisk DMI, fuld validering, release-gate og Pages-deploy som `success`.
- Det offentlige datasæt `rr-20260808124116-208` har 208/208 aktive zoner med sammenhængende 118 timers vind; den offentlige femdøgnskæde har derfor ingen vinddækningshuller.
- De fem tidligere zoner uden fælles DKSS U/V-gridpunkt må fortsat ikke omtales som direkte verificeret DMI-havdata. Deres offentlige vindhale er dækket, men direkte grid-/fallback-proveniens kræver særskilt audit.

## 4.0.121 – aktivt workflowinventar
- Repositoryet ejer kun `.github/workflows/update-and-deploy.yml`; det er produktionsworkflowet for data, gates, artifact og Pages-deploy.
- `schedule-test.yml` og `pages-microtest.yml` var historiske diagnostiske workflows uden rolle i aktiv test, release eller recovery og er fjernet. Pages-microtesten kunne desuden publicere til samme `github-pages`-miljø som produktionen.
- `pages-build-deployment` er GitHubs egen Pages-mekanisme og er ikke en workflowfil i RavRadar. Den eksterne cron-job.org-plan udløser fortsat produktionsworkflowet via `workflow_dispatch`.

## 4.0.120 – offentlig fallbackhale
- #1833/#1835 roterede NSBS/LF ind. Offentlig vind nåede 208/208 med data og 203/208 mindst 96 timer; maksimum var cirka 110 timer. De fem resterende zoner havde ingen fælles gyldigt DKSS U/V-gitterpunkt.
- 4.0.120 retter de to dokumenterede efterfølgende tab: vandstandsrouting bevarer den blandede offentlige serie, og Open-Meteo forespørges om 120 fremtidige timer frem for fem kalenderdage fra midnat.
- RavScore og DMI-gridkrav er uændrede. Frisk produktion skal bevise 118–119 timer.

## Projekt og evidens
- RavRadar er beslutningsstøtte til ravjagt og lover ikke fund.
- Faglige udsagn mærkes som dokumenterede, observerede, hypoteser eller validerede i RavRadar.
- Nye idéer må ikke blive produktionslogik uden test, forklaring og versionsspor.
- Modelvalg følger DEC-0031: kvalitet kommer først, men Sol bruges ikke til rutinearbejde, hvis en billigere aktuel model kan levere samme kvalitet. Codex skal selv anbefale både nedskiftning og senere skift tilbage til Sol; kvotepause kræver et permanent checkpoint.

## Data
- DMI er autoritativ dansk kilde. Open-Meteo er fallback.
- Forecastkomponenter behandles separat og merges på canonical UTC-timer.
- Timevis pendlen mellem udbydere er uacceptabel.
- 118–119 timer er en gyldig femdøgnshorisont.
- Produktmålet er fortsat en bedst tilgængelig cirka 120-timers kæde pr. forecast-/scorekomponent. DMI bruges til sidste valide DMI-time; anden DMI-kilde undersøges før ekstern fallback, som kun må udfylde den manglende hale. DMI dokumenterer aktuelt HARMONIE NEA til 54 timer; dette er en native kildehorisont, ikke et reduceret produktmål.
- Vindkæden er lokalt implementeret som HARMONIE først og DKSS 10-meter U/V som separat DMI-hale. HARMONIE vinder i overlap, og interpolation krydser ikke modelgrænsen. Produktionsdækning er endnu ikke bevist.
- RavRadar er gratis og ikke-kommerciel. Gratis fallback kan derfor anvendes inden for den aktuelle tjenestes vilkår, men fair use, caching, kreditering og teknisk kildeuafhængighed er stadig bindende.
- Kildeskift kan ligge forskelligt for vind, bølger, strøm, vandstand og temperatur. Hver time skal bevare model/run, lead time, alder og native/interpoleret/fallback-proveniens. Hvis resten ikke kan leveres forsvarligt, forbliver den missing.
- Store Vadehavssvingninger kan være tidevand og må ikke automatisk udglattes.

## Retninger og geometri
- Vindretning er hvor vinden kommer fra.
- Strømretning er hvor vandet bevæger sig hen.
- Pålandsretning går fra hav mod land.
- Hver zones geometri kan stadig være lokalt forkert, selv om konventionen er korrekt.
- Hav-/landpunktsfunktionen må ikke ændres på baggrund af en forklarende diskussion alene.

## Zoner og kyst
- Ét officielt detaljeret zoneregister bruges overalt.
- Brede førstegenerationszoner er udfaset.
- Als Odde og Helberskov ligger nord for Mariager Fjord mod Øster Hurup.
- Kysteditoren skal bevare præcisionsredigering, lokale krumninger, historik og rollback.

## Stationer
- Alle kendte DMI-stationer bevares med status; midlertidigt tavse stationer skjules ikke.
- DMI-registerstatus, observationsstatus og prognose-/cachestatus er forskellige.
- Automatisk routing kræver dokumenteret brugbarhed og må ikke uden videre bruge historiske/inaktive stationer.
- Automatisk routing genberegnes fra de aktuelt indlæste, brugbare vandstandskilder med samme kernefunktion som produktionen. Et ældre eller tomt routing-auditdokument må ikke overstyre nyere kildestatus. Systemet vælger normalt to kilder på modsatte sider langs kysten og afstandsvægter dem; hvis kun én brugbar kilde findes, anvendes den med 100 % vægt frem for et tomt valg.
- Kysttopologien bestemmer fortsat hvilke kilder der udgør et fagligt bracket, men både automatisk routing og administratoroverride beregner interpolationsvægte ud fra samme reelle geografiske afstand (haversine) fra zonens datapunkt.
- DMI-prognosepunkter opdages gennem OceanObs-collectionen `tidewaterstation` (ental). Hver vejrproduktion skriver en beskyttet `data/diagnostics/water-source-audit.json` med type, prognosehorisont, gyldighed og routingberettigelse for alle vandstandskilder.
- Adminoverride erstatter automatik, når override opfylder de valgte leveringskrav. Ved to administratorvalgte stationer beregnes inverse afstandsvægte ud fra zonens datapunkt; admin viser samme vægtprincip før lagring.
- Første klik på en vandstandskilde opretter altid zonens routingpost direkte i det persistente dokument. Manglende prognoseværdier (`null`, `undefined` eller tom streng) er ukendt data og må aldrig normaliseres til 0 cm eller gøre kilden routingberettiget.
- Stationskortet viser kun den routing, der faktisk er aktiv for zonen: grøn ved automatisk routing og rød ved aktivt administratoroverride. Når override er aktivt, skjules automatiske grønne markører; lilla “begge valg” bruges ikke. Samme kilde må ikke stå både som primær og sekundær; dubletter samles til én kilde med 100 % vægt.
- Nye stationer, udfald, genoptagelse og potentielt bedre routing skal skabe meningsfulde tilstandsnotifikationer.
- En station kan fortsat være prognosebrugbar, så længe dens cachedata er gyldige, selv om en ny observation mangler. Admin viser observationsstatus, cacheudløb og samlet anvendelighed.
- Manglende stationslivscyklus er ukendt status og må ikke omsættes til “utilgængelig” eller “aldrig leveret”. Beskyttet stationshistorik hydreres fra Supabase og må ikke forringes ved en nyere kørsel.
- OceanObs-stationsstatus må kun kaldes opdateret, når mindst én gyldig måling er modtaget. Vandstand hentes for `sealev_ln`, `sealev_dvr` og `sea_reg`; antal stationer i registret er aldrig bevis på observationssucces.
- En mislykket OceanObs-kørsel må ikke øge alle stationers manglende-leveringsrækkefølge.

## RavScore
- Scoren skal kunne forklares fra rådata til slutscore.
- Transport, frigivelse, koncentration/aflejring og jagtbarhed skal holdes begrebsligt adskilt.
- Statiske kystforhold må ikke skabe en høj score uden dynamisk transportgrundlag.
- Mistænkelige høje scorer og naboforskelle auditeres.

## Admin
- Admin er menneskeførst og skal kunne bruges uden intern systemviden.
- Regelbyggeren skal forklare felt, effekt, eksempel, geografi, prioritet og konflikt.
- Dialoger skal kunne lukkes via kryds, Annuller, Escape og klik udenfor.
- Centrale ændringer skal have versionshistorik og rollback.

## Projektarbejdsgang
- Læs RDKS og håndbog før analyse og kodeændringer.
- Ved hver ny version importeres samtaledeltaet automatisk til RDKS, changelog og relevante håndbogsafsnit.
- Gamle chats er historiske kilder; forældede løsninger må ikke genindføres.
- Ved konflikt gælder: brugerens aktuelle instruktion > aktiv RDKS > verificeret aktuel kode > håndbog > changelog > historiske chats.
## Release Governance
- En version må ikke erklæres færdig eller leveres som ZIP, før `npm run validate` og `npm run release:gate` er grønne.
- Enhver positiv produktions-preflight kører begge fulde gates før Pages-artifactet bygges. Kun en negativ preflight må springe gates, artifact og deploy over.
- Streng baseline er produktionsverificeret i #1772 på `292b402487efaf74e2a102773a3a8fbfbd39f5af`: central sync, frisk data/proveniens/runtime, begge gates, artifact og Pages-deploy var `success`.
- GitHub-secrets bevares i repository-indstillinger og må aldrig medtages i kode eller ZIP.
- CI-fejl skal føre til samlet audit af hele releasekæden.
- Leverancepakker må aldrig indeholde `.git`.
- GitHub Pages-artifactet må aldrig indeholde `_support/` eller `RavRadar-support-*.zip`; supportpakken er kun et privat GitHub Actions-artifact.

## Eget domæne
- Den planlagte offentlige adresse er `https://ravradar.dk`.
- GitHub Pages kan fortsat hoste siden; koden skal være domæneagnostisk.
- CNAME og DNS aktiveres først efter Supabase redirect- og domænetest.

## Accepttest og håndbogssprog
- Admin har en samlet funktionstest, som kontrollerer deploy, aktuelle data og central Supabase-readback med oprydning.
- Håndbogen skal skrives i almindeligt dansk. Fagord forklares, og ekspertens opgave skal altid være konkret.

- Diagnostik skal navngive konkrete fejl og må ikke kalde browsercache eller en bevidst sprunget observationskørsel for datatab.

## Strømpile og modelproveniens
- En strømretning er en oceanografisk mod-retning: 0° nord, 90° øst.
- DMI-strømpile må kun stå ved det marine gitterpunkt, som leverede både current-u og current-v.
- Kunstige pilekopier omkring zoner er forbudt, fordi de antyder målinger, som ikke findes, og kan placere pile på land.
- DMI-pile uden dokumenteret gitterpunkt skjules. Fallback må kun vises ved det punkt, fallbackudbyderen faktisk blev forespurgt på.
- Rå u/v-komponenter skal bevares i den fulde diagnosekæde, så hastighed og retning kan efterprøves.

## Admininitialisering og sitetest
- Oversigt skal renderes straks efter godkendt adgang og opdateres efter fuld dataindlæsning.
- Sitetesten må først skifte faner efter eksplicit admin-ready-markør.
- Browserdialoger fra den isolerede test må ikke vises på den synlige adminside.

## Strømproveniens og manglende værdier
- Manglende `current-u` eller `current-v` er ukendt data, ikke fysisk nulstrøm.
- En time kaldes kun verificeret, når begge DMI-komponenter kan knyttes til samme gitterpunkt og gyldigt tidspunkt.
- Ikke-verificerbare timer bevarer deres eksisterende viste strøm, men må ikke bære rå u/v-felter eller fremstilles som videnskabeligt verificerede.

## Strømvektor og scorekonsistens – 4.0.85
- DMI `current-u/current-v` er den autoritative fysiske strømvektor, når proveniensen er `verified`.
- Der findes kun én kanonisk lagret vektor pr. time: `currentUMps/currentVMps` afrundet til den aftalte præcision.
- `currentSpeedMps` og `currentDirectionDeg` skal altid afledes fra præcis de lagrede komponenter, ikke fra en skjult højere præcision.
- RavScore, kortpil, debug og audit skal derfor kunne genskabe samme hastighed og retning fra de samme felter.
- Strømretning ved næsten nul hastighed er fysisk og numerisk svagt bestemt; den må ikke få særskilt autoritet frem for komponenterne.

## Komplette adminarbejdsgange – 4.0.86
- Håndbogsreview findes i den aktive Håndbog-fane med synlig reviewkø og direkte genvej efter indsendelse.
- Lokale nødkladder kan findes, gensendes, eksporteres og slettes.
- Ejerens implementering af et review gemmer den centrale håndbog og verificerer readback, før reviewet markeres implementeret.
- Dokumentationscenteret giver adgang til RDKS-kernedokumenterne.
- Model-forslag er lokale browsermodeller, indtil de særskilt indarbejdes i en versioneret produktionsrelease.
- En funktion regnes ikke som implementeret alene fordi kode eller database findes; den synlige brugerrejse skal bestå.

## Kortpile, admin-kort og modulversionering – 4.0.87
- Vind- og strømpile installeres efter rangliste og 5-dagesprognose, men må ikke afhænge af `requestIdleCallback`.
- Pilelaget skal afslutte med en entydig ready- eller failed-status, og sitetesten skal finde faktiske vind- og strømpile.
- Forsinkede Leaflet-initialiseringer skal kontrollere, at fanen og kortcontaineren stadig eksisterer; kort skal fjernes ved faneskift.
- Alle aktive browserimports skal bruge den aktuelle releaseversion. En grøn topniveauversion er ikke tilstrækkelig, hvis importgrafen stadig peger på ældre `?v=`-identiteter.

## Kortpile og zonestreg ved zoom – 4.0.88
- Flowpunkter normaliseres altid til `L.LatLng`; koordinat-array og Leaflet-objekt må ikke blandes i samme returtype.
- En ugyldig zones piledata må ikke afbryde pilelaget for alle andre zoner.
- Zonestregens bredde, kant, klikflade og grænsetikker skal opdateres ved zoom uden efterfølgende panorering.
- Zoomopdateringen udfører et offentligt Leaflet `redraw()` efter zoomanimationen; private Leaflet-internals anvendes ikke.

## Centrale zoneændringer – 4.0.89
- Retning hav-land skelner mellem at slette én valgt kystdel og at slette hele zonen.
- Destruktive ændringer kræver tydelig bekræftelse og verificeret central readback.
- `direction-reviews` anvendes i GitHub-workflowet på det autoritative `data/zones.geojson` før vejrhyrering; dermed bruger kort, RavScore, rangliste, forecast, debug og routing samme godkendte geometri og status.
- En hel zonesletning er en central tombstone i reviewdokumentet og bliver fysisk udeladt af den aktive zonefil ved deployment. Historikken bevares i Supabase og versionshistorikken.
- Reviewposter slettes som udgangspunkt med soft-delete (`archived`), så de skjules fra arbejdslisten uden at auditsporet forsvinder.

## Kystlinjeeditor og enkel central gemning – 4.0.90
- Fanen Rediger kystlinjer ændrer kun zonens navn og geografiske kystforløb; den må ikke blandes sammen med Retning: hav → land.
- Knapperne Flyt kort og Præcis redigering samt deres funktion bevares uændret.
- Søgning skal skifte den aktive zone og kortvisningen, ikke kun filtrere en dropdown.
- Gem ændringer skriver centralt, verificerer readback og markeres eksplicit som publiceret til næste deployment.
- Historiske kystlinjekladder fra tidligere versioner må ikke automatisk blive aktive.
- Produktionsbygningen anvender kun eksplicit publicerede navn- og geometriændringer på det autoritative zoneregister.

## Administratorredigerbare zoner og dynamiske tests – 4.0.93
- Ejer/admin kan omdøbe zoner, ændre kystlinjer, ændre land-/havpunkter og retningsankre samt slette zoner uden kodeændringer.
- En godkendt ændring kan lovligt vende pålandsretningen 180°, når de nye hav-/landpunkter og `onshoreDirectionDeg` er indbyrdes konsistente.
- Produktionszoners antal, navn, kystlinje, koordinater og retning må ikke låses til historiske værdier i regressionstests.
- Tests beskytter i stedet zone-ID-integritet, eksplicitte sletningstombstones, gyldig geometri, hav→land-konsistens, datadækning og fuld forplantning til score, kort, forecast og debug.
- Historiske rollback-snapshots må ikke genoplive slettede zoner eller overskrive administratorens aktuelle navn, kystlinje, land-/havpunkter, ankre eller retning.

## Centrale administratorregler – 4.0.94
- Godkendte aktive administratorregler publiceres ved deployment som en sanitiseret offentlig regelfil.
- Offentlig RavScore må aldrig læse administratorregler fra browserens lokale lager; alle brugere skal bruge samme centrale, versionerede regelsæt.
- Regelkladder og inaktive regler forbliver centrale adminposter og påvirker ikke produktionen.
- Rå synkroniserede adminfiler under `data/admin/` er beskyttede mellemprodukter og må ikke indgå i GitHub Pages-artifactet.

## Vandstandskilder – 4.0.100
- Fællesbetegnelsen er vandstandskilder. En kilde kan være en OceanObs-målestation eller et DMI-prognosepunkt fra tidewaterstations-registeret.
- Kildetypen styrer statusvisningen: målestationer viser observationsstatus; prognosepunkter viser “Modtager prognose” eller “Modtager ikke prognose”.
- Begge typer får deres femdøgns totalvandstandsserie fra samme DKSS STAC/GRIB-kæde samplet ved kildens koordinat. Astronomisk tidevand alene bruges ikke som totalvandstand i RavScore.
- Aktiv administratorrouting bruges før automatik. De faktisk valgte kilder og vægte skal være identiske i prognoseproduktion, RavScore, ranglister og “Næste fem dage – Vandstand time for time”.

## Prioriteret indlæsning af vandstandskilder – 4.0.105
- Vandstandskildefanen må ikke vise en halvfærdig, klikbar routing.
- Zoneregister, DMI-vandstandskilder og det centrale Supabase-dokument `water-level-station-routing` indlæses i en selvstændig prioriteret kæde umiddelbart efter adgangskontrollen.
- Diagnostik, regler, historik, reviews og øvrige adminmoduler må ikke forsinke eller senere overskrive den aktive vandstandsrouting.
- Før fanen er klar, vises kun en tydelig indlæsningsstatus. Når den bliver klikbar, skal røde administratorvalg, Fjern-knapper og aktiv routing allerede være endeligt hydreret.

- Browserens `localStorage` er aldrig autoritativ for vandstandsrouting. Kun små redigerbare admin-dokumenter må caches lokalt; store stations- og diagnosedokumenter holdes i hukommelsen. En kvotefejl må ikke blokere UI eller central Supabase-gemning.

## Historisk tilstandsmodel i skyggetilstand – 4.0.107
- RavRadar beregner nu en kompakt, zonebaseret historisk tilstand ud fra faktiske vind-, bølge-, vandstands- og DMI-strømdata.
- Tilstanden indeholder varighed/momentum for indadgående strøm, varighed/tryk for udadgående strøm, stærk energihændelses varighed/alder, retningsstabilitet, mobiliseringspotentiale, nærkystpotentiale og procesfase.
- `shadow-v2` må ikke ændre den numeriske RavScore. Den bruger kun verificerede marine DMI-strømprøver og skelner mellem akkumuleret 24-timers transport og det aktuelle sammenhængende strømforløb.
- Generelle strømbånd må hverken bruges til score eller fallback. Faktiske DMI-u/v-vektorer er autoritative.
- Retningsberegningen bruger zonens aktuelle, administratorredigerbare retningsankre eller `onshoreDirectionDeg`; derfor skal manuel validering udføres på zoner med kendte, korrekte land-/hav-overrides.
- Rå historik holdes i produktionsdata/pipeline. Den offentlige browser modtager kun kompakte, færdigberegnede felter for at beskytte opstartshastigheden.
- Eksisterende dokumenteret morfologi bevares i scoren; manglende morfologidata er neutralt og udløser ikke krav om manuel landsdækkende kortlægning.
- 4.0.106 vandstationsrettelsen er produktionsbekræftet: røde markører, override og Fjern fungerer.

## DMI bulk-prioritering – 4.0.110
- Marine u/v og vandstand er release-kritiske og prioriteres før HARMONIE, når marinehorisonten mangler.
- Et stort atmosfærisk asset må ikke bruge hele kørselsbudgettet og sulte DKSS.
- Der anvendes fortsat ingen generelle strømbånd eller strømbåndsfallback.

## Historisk tilstandsmodel og kildeneutralitet – 4.0.111
- Den historiske model kører fortsat i skyggetilstand og må ikke ændre RavScore, før forklaringer og tilstande er valideret.
- Zonepanelet, debug og Spørg RavRadar bruger samme neutrale forklaring af højenergi, indtransport, nærkystpotentiale og udtransport.
- Almindelig indtransport har ingen fast 3–5 timers forsinkelse; potentialet vokser gradvist med varighed, retning og styrke.
- Generelle strømbånd bruges ikke i score eller fallback. Faktiske DMI-strømdata er autoritative.
- Eksisterende dokumenterede morfologidata må fortsat påvirke score; manglende morfologidata er neutralt og giver ingen straf.
- Ingen del af projektet må navngive de eksterne hjemmesider, som blev brugt som analysemateriale. Dette gælder UI, kode, kommentarer, tests, RDKS, håndbog, debug, AI og artefakter.
- Brugerfund skal knyttes til en aktivt valgt zone. GPS er kun plausibilitetskontrol og må ikke automatisk antages at være jagtstedet.


## Aktuel overgangsstatus – 4.0.112
- Den obligatoriske næste-chat-overlevering findes i `docs/rdks/05_NEXT_CHAT_HANDOFF.md` og skal læses i starten af en ny projektchat.
- Tilstandsmodellen er fortsat score-neutral. Næste faglige scoretrin må først aktiveres efter automatisk referencezonevalidering.
- Fire referencezoner genereres automatisk i `data/diagnostics/state-reference-zones.json`; nye manuelle billedserier kræves kun i yderste nødstilfælde.
- Als Odde og Helberskov er åben kyst nord for Mariager Fjord, ikke fjordzone.
- Den offentlige side skal fortsat ligge omkring den senest verificerede baseline på ca. 3,45 sekunder; tunge historikdata må ikke flyttes til browseren.
- Deploy/Update-jobbets ca. 14 minutters køretid er en åben driftsrisiko. Det eksterne croninterval er nu 15 minutter. Optimering kræver måling og må ikke svække marine audits.

## Workflow og skyggevalidering – 4.0.113
- GitHub Actions-cache er uforanderlig pr. nøgle. En fast ugentlig primærnøgle må derfor ikke bruges til en cache, som skal akkumulere GRIB-fremdrift mellem kørsler.
- DMI GRIB-cachen gendannes fra seneste kompatible nøgle og gemmes under en unik nøgle pr. kørsel.
- Referencezonerapporten skal knyttes til et konkret datasæt og logges kompakt i hver frisk produktion.
- Streng produktionsvalidering kræver en score-neutral `shadow-v1` eller `shadow-v2` for alle fire referencezoner; nye produktioner skal skrive `shadow-v2`. Verificeret DMI-strøm tælles og logges; mangler registreres uden kunstig transportfallback.
- Det eksterne croninterval blev ændret til 15 minutter 6. august 2026; yderligere ændring kræver nye køretidsmålinger.

## Releasekæde fra 4.0.114
- Data/build og GitHub Pages-deploy er separate jobs.
- Kun deployjobbet bruger `github-pages`-miljøet og Pages-skriverettigheder.
- Et fejlet deployjob kan genkøres uden at gentage DMI-pipelinen eller uploade endnu et Pages-artifact.
- Push og tvungne releasekørsler kan afbryde en ældre almindelig vejropdatering; almindelige vejrkald afbryder ikke en aktiv tung kørsel.
- 4.0.114 er produktionsbekræftet med grøn deploy og sitetest 19/19. Offentlig startup blev målt til 3,663 sekunder, 208 zoner havde data, og 29 verificerede strømpile blev vist.


## Verificeret historisk strømtilstand – 4.0.115
- Historiske transportfelter må kun bygges af strømprøver, som efter provenanceberigelsen er markeret som verificeret DMI-u/v.
- Ikke-verificerede eller manglende prøver er `unavailable`; de må ikke blive til nulstrøm og må ikke tælle som ind- eller udtransport.
- `inboundCurrentDurationHours` og `outboundCurrentDurationHours` er fortsat akkumulerede mål i det glidende 24-timers vindue.
- `activeCurrentRegime` og tilhørende varighed, momentum og stabilitet beskriver kun det aktuelle sammenhængende forløb og nulstilles ved retningsskift, neutral strøm, datamangler eller tidsafstand over to timer.
- Tilstanden hedder `shadow-v2`, er fortsat score-neutral og sendes kun som kompakte afledte felter til browseren.


## DMI-vektorintegritet og manglende femdøgnsfelter – 4.0.116
- En U/V-vektor er kun fysisk gyldig, når begge komponenter kommer fra samme DMI-gitterpunkt og samme forecasttid. Nærmeste U og nærmeste V må aldrig vælges uafhængigt og kombineres.
- For DMI-strøm skal U og V desuden komme fra samme vertikallag (`surface`/`depthBelowSea`). Kandidater fra forskellige dybdelag må aldrig kombineres. Hvis flere fælles lag er gyldige, vælges deterministisk det dybeste tilgængelige fælles lag.
- Hvis intet fælles gyldigt gitterpunkt findes inden for zonens tilladte havafstand, er vektoren manglende/ikke-verificeret. Auditkravet må ikke sænkes.
- Cachede vektorer fra ældre grid-logik invalideres, hvis deres dokumenterede U/V-punkter ikke er identiske.
- Vandstandskilder (`SOURCE::`) er hjælpepunkter til DKSS-vandstand, ikke forecastzoner. De samples ikke for strøm, vind, bølger eller vandtemperatur og tæller ikke i forecastzonernes dækningsmål.
- JavaScript må skelne `null`/manglende data fra tallet 0. Manglende vind eller bølger vises som `Mangler`; en ægte 0-værdi er stadig gyldig. Regler og scorevalg må ikke behandle manglende vind som vindstille.
- Den observerede 5-dages visning med `0,0 m/s · N 0°` og `0,0 m` havde mindst én separat præsentations-/null-årsag. Den oppustede sampling af vandstandskilder kunne samtidig forsinke reelle DMI-vind/bølgeopdateringer. Produktionsverifikation skal skelne reelle datagab fra visningsfejl.

## 4.0.117 – korrigeret sandhed ved Codex-overgangen
- Appversionen er 4.0.117. Aktuel `main` ved denne handoff er `a164b6e52fa18efc7209d90779048bb86bcf870a` (`RavRadar 4.0.117 codex handoff v2`).
- Denne commit er deployet via efterfølgende automatiske runs. #1760 bekræfter succes for DMI/weather/provenance/public runtime/referencezoner/`validate:data` og GitHub Pages-deploy efter de seneste admin-geometriændringer.
- **Men #1760 er ikke fuldt releasebevis:** `npm run validate` og `npm run release:gate` stod som `skipped`, fordi workflowet kun kører dem ved `push` eller `force=true`.
- Brugerens observerede mønster de seneste to dage er, at strenge push-runs er blevet røde, hvorefter almindelige automatiske runs blev grønne og deployede. Den verificerede workflowlogik forklarer, hvordan dette kan ske. Indtil en historisk audit eventuelt viser andet, må ingen af disse efterfølgende auto-grønne runs anvendes som fuld releasegodkendelse.
- Derfor er status: **kode på main: ja; deployet: ja; fuldt strengt produktionsverificeret baseline: nej endnu**.
- Handoff-ZIP'en ændrer bevidst ikke workflow-gatebetingelserne. Første Codex-kodeopgave er at lukke bypasset direkte i repositoryet og derefter skabe en ny frisk kørsel, hvor begge fulde gates faktisk står `success`.
- Ingen større videreudvikling må begynde, før denne strenge baseline er etableret eller den konkrete røde fejl er systemisk analyseret og løst.

## Codex-overgang – autoritativ arbejdsmodel
- Codex starter i `docs/ai/CODEX_START_HERE.md` og arbejder derefter efter AGENTS/RDKS.
- RavRadar skal analyseres som et helt system: central konfiguration, dataindsamling, scheduler, cache, parser, provenance, score/state, public runtime, UI/admin, tests, artifact og deployment hænger sammen.
- Stabilitetsudsagn skal matche evidensen: lokal validering, CI-validering og produktionsverifikation er tre forskellige niveauer.
- Historiske chats bevares som beslutnings- og regressionskontekst; de er aldrig automatisk mere autoritative end aktiv RDKS og faktisk verificeret kode.

## National land-/vandpipeline – 4.0.199
- Den første punktbygning ligger før ejerrettelser og kan derfor lovligt mangle evidens-id'er, som først introduceres senere i samme private workflow. Disse registreres eksplicit som udskudte; de tælles ikke som anvendte.
- Den afsluttende punktbygning efter ejerrettelser er fortsat fail-closed: samtlige dokumenterede rettelser skal findes og anvendes, ellers stopper kørslen før DMI, artifact og aktivering.

## Korrigerede punktpars status – 4.0.200
- Når uafhængig 10-meter-evidens leverer et sikkert korrigeret land-/vandpunktpar, normaliseres hele rækken til et isoleret forslag: gamle blokeringer fjernes, men vejr, state, score og automatisk aktivering forbliver deaktiveret.
- Rapportens foreslået/blokeret-summer genberegnes efter rettelserne. En række må aldrig have komplette punkter og samtidig stå som blokeret.

## National ejer-review følger den validerede delbestand – 4.0.201
- Privat #31798588868 bestod den foreløbige punktkontrakt med 832 foreslåede og tre blokerede dele, native DMI-gridkontrol, flertrinsserier, state-/historikisolation, vind og score-neutral shadow-score.
- Samme kæde dokumenterede 835 finaliserede kystdele: 828 komplette, fire med deldækning og tre blokerede. Reviewbyggeren stoppede derefter alene på den historiske faste forventning 783/758/22/3.
- Review og central admin-roundtrip er nu bestandsafledte og fail-closed: geometri, navne, punkter, shadow-ID'er, statusoptællinger og readback skal være 1:1. Et nyt legitimt delantal accepteres kun, når alle disse tidligere gates er indbyrdes konsistente.
- Den offentlige 4.0.200-produktion bestod fuld validering, releasegate, DMI, Supabase og Pages i #31798575274. Den private kandidat ændrer fortsat ikke offentlig geometri, score eller admin-sandhed.

## National privat DMI-gate har eksplicit fuldt tidsbudget – 4.0.202
- Offentlig 4.0.201 er produktionsverificeret i #31801993662 med frisk DMI, fuld projektvalidering, releasegate, Supabase og Pages.
- Privat #31802022918 bestod de første 27 nationale kyst-, navn- og punkttrin, men den native DMI-gitterkontrol nåede sit historiske standardloft under `dkss_lf` efter 11,1 minutter. #31798588868 havde bestået samme 835-dels input og datakrav på 8,5 minutter.
- Rodårsagen er dermed et marginalt privat tidsbudget, ikke et ugyldigt land-/vandpunkt. Alle tre nationale native DMI-gates bruger nu det allerede etablerede kvalitetsbudget på 3.000 sekunder; modeller, komponentkrav, afstandsgrænser, fail-closed-adfærd og offentlig runtime er uændrede.

## DMI-schedulerbalance – 2026-08-08
- Marine recovery er ikke længere rent binær efter etableret grunddækning. Under 95 % marinegrundlag er begge produktive pladser fortsat marine-first.
- Ved mindst 95 % marinegrundlag beholder den mest relevante DKSS-model første plads, mens anden plads går til den mest underdækkede vind-/bølgefamilie.
- Dette svækker ingen marineaudit og udfylder ingen mangler. Manglende DMI-data forbliver `missing`.
- Politikken er lokalt implementeret; produktionssandhed om forbedret vind-/bølgedækning kræver et nyt strengt grønt run.
- #1778 og #1779 har siden produktionsbekræftet schedulerpolitikken, fulde gates og deploy. #1779 havde vind i 199/208 zoner, men kun 14/208 nåede mindst 96 timer; femdøgnsvind er derfor stadig under progressiv opbygning.
- HARMONIE-assets er meget store. Forecasttrin ældre end én time må ikke bruge det begrænsede downloadbudget; aktuelle og fremtidige modeltrin behandles fortsat kronologisk og caches mellem runs.
- En ny HARMONIE-generation kan være publiceret med kun en kort forkant. HARMONIE-samlingens native horisont er cirka 60 timer, ikke 120; run-valget fastholder derfor den foretrukne generation ved mindst 48 resterende timer. Marine samlinger bruger fortsat 96 timer.
- #1785 valgte 18Z frem for en kortere 21Z-publikation. #1788 produktionsverificerede den korrigerede 48-timersregel: valgt run forblev 18Z, `preferredProgressiveRunRetained=true`, fire assets blev genbrugt, og serien voksede fra fire til syv behandlede tider frem til 15 UTC. Fulde gates og deploy bestod.
- DEC-0030 gør nu P1-kortlægningen af komplette DMI-first femdøgnskæder til næste prioriterede analyse før P3 RavScore-forskningen. Den giver endnu ikke mandat til produktionsændring.
- Første officielle kortlægning viser WAM med 5½ døgn og DKSS med 5 døgn. Begge DMI-produkter indeholder 10 m vind og bruger HARMONIE-forcing først og ECMWF-forcing i halen. WAM-/DKSS-vind skal derfor undersøges som DMI-hale før MET Norway/Open-Meteo. Ingen af dem er endnu godkendt som RavRadar-vindkilde.
- #1828 viste, at 4.0.118-vindhalen reelt havde 0 zoner: DKSS-id 34 blev kaldt `sst` af generisk ecCodes-metadata og forkastet. Dette erstatter antagelsen om ren progressiv opbygning.
- 4.0.119 gør lokale DKSS-id'er autoritative, løfter parser/parameterkort til 13/4 og roterer DKSS efter manglende U/V-vindhale; parserrettelsen er produktionsverificeret i #1831.
- #1831 produktionsverificerede rettelsen: `dkss_idw` genkendte både `wind-tail-u-10m` og `wind-tail-v-10m`; bulk havde 107 vindhalezoner ≥96 timer. Begge fulde gates og Pages-deploy var `success`.
- Det deployede datasæt `rr-20260808092815-208` havde vind i 200/208 zoner, 108/208 ≥96 timer, 107/208 ≥108 timer og maksimum 111,5 timer. Løsningen virker teknisk, men fuldt 118–119-timers landdækkende produktmål kræver fortsat LF/NSBS-rotation og måling.

## Planlagt RavScore-forskning – ikke aktiv udførelse
- En større videnskabelig forsknings- og modelvalideringsrunde er registreret som P3 i DEC-0029. Den starter først efter den aktuelle forecast-/schedulerstabilisering og højere P0/P1-opgaver.
- Første leverance er forskning, systemmodel, kodeaudit, evidensmatrix og valideringsdesign uden ændring af produktionskode eller RavScore.
- Det aktuelle forbud mod generelle strømbånd som scoreinput/fallback er fortsat bindende. Forskningen skal senere teste, om rumlige strømstrukturer tilfører selvstændig, validerbar information; det er ikke et forhåndstilsagn om genindførelse.
- Den senere analyse må ikke begrænse vindgrundlaget til de zoner eller punkter, hvor kortet viser pile. Pile er selektive UI-markører, ikke grænsen for det fysiske vindfelt. Rumlig/opstrøms vind over hav og kyst, historik, bølge-/strømkobling, tidsforsinkelse og mulig dobbelt-tælling skal undersøges som del af den samlede ravkæde.
- Ingen ny mekanisme må aktiveres uden separat godkendelse efter evidens, overlap/dobbelt-tælling, datakrav, performance og virkelighedsvalidering er fremlagt.
## Supabase-kvotekontrol – 4.0.153
- Free-planmålingen viste 8,233/5 GB egress og 0,695/0,5 GB database ved kun tre MAU. Rodårsagen er pipelineforbrug, ikke brugertrafik: `sync-admin-config.py` hentede alle payloads hvert 15. minut, mens store maskindiagnostikker blev versionskopieret uden retention.
- 4.0.153 filtrerer readback til nødvendige adminnøgler og gør beskyttede uploads hash-idempotente. Lokal payloadækvivalent falder fra mindst 8,4 MB til cirka 144 KB pr. readback.
- Central audit 2026-08-10 fandt 8.647 overflødige historikrækker med cirka 600 MB payload. Migration og efterfølgende `VACUUM FULL` blev udført; databasen faldt fra 699 MB til 24 MB. Alle 14 aktuelle `admin_documents` er bevaret, maskinhistorik er 0, og øvrige dokumenter har højst 100 rollbackpunkter.
