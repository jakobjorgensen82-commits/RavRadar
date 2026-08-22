## Intern RavScore-forskning efter 4.0.258 – strømstyret hukommelse (2026-08-22)

- Candidate G har fået en score-neutral variant, hvor verificeret kystnormal strøm bygger eller nedbryder transportpotentialet.
- Fuld indgående strøm bygger 10 point pr. effektiv time. Den ejerbesluttede udtransportkurve trækker straks 8 point pr. effektiv time og når 0 fra 13 timer.
- Bølger kan ikke skabe transport; de kan kun påvirke en allerede eksisterende levering med højst 15 procent.
- Privat replay og målrettede self-tests består. Følsomheden viser, at strømgrænse og start-/24–48-timers forældelsesregel skal afklares før aktivering.
- Offentlig RavScore `25/40/35`, UI, data, geometri og land-/vandpunkter er uændret. Candidate G forbliver privat og diagnostic-only.
- PR #75 bestod exact-head-kildegate `32598284279` på `d37d15fe` og blev merged som `4379606e`. Der blev ikke startet et nyt produktionsartifact.
- En efterfølgende score-neutral randkontrol understøtter valgfri neutral halvering på 24/48 timer. Start-0-scoren flytter -1,182/-0,697 point, men alle 12 replayvinduer har kun 24 timers forhistorie, så ingen fysisk levetid vælges.
- Referencegrænsen 0,05→0,20 m/s har ingen fuldstyrkeevalueringer i replayet; lavere profiler har kun sparsom fuldstyrkedækning uden fundlabels. Strømgrænsen er fortsat åben.
- Efterkontrollen bestod exact-head `32599255165`, PR #77/merge `75ed93d6` og fuld produktion `32599309735`. Live `rr-20260822212612-210` har 210 zoner og 673/673 dele; offentlig Candidate G er ikke aktiveret.

## 4.0.258 - vindstyret waders-jagtbarhed i Candidate G (2026-08-22)

- Den private foretrukne forskningsvariant er nu `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED` med den ejerbesluttede analyseprior `20/50/30`; offentlig RavScore er fortsat `25/40/35`.
- Waders-vindkurven er 100 til og med 6 m/s og falder gennem 7/80, 8/60, 10/35, 13/10 og 15/0. WAM-bølgehøjde kan kun give et blødt fradrag på højst 20 point og kan ikke alene lukke jagtbarheden.
- Replayet på 1.460 evalueringer bevarer alle 730 strandscorer, holder alle waders-scorer under jagtbarheden og giver gennemsnitligt fire points bølgefradrag. Alle replaytilfælde ved mindst 15 m/s ender på 0.
- Den nationale score-neutrale shadowkontrol følger nu også den nye variant gennem central regelkæde og waders-loft. Automatisk aktivering forbliver deaktiveret.
- DEC-0054 erstatter DEC-0053's tidligere `20/45/35`, 18 m/s-stop og mere selvstændige bølgekobling. Ældre modeller bevares som revisions- og følsomhedsspor.
- Ingen offentlig score, UI, data, DMI/fallback, geometri eller land-/vandpunkter er ændret. Private cachepayloads er ikke en del af Git.
- PR #73 bestod exact-head-kildegate `32586707063`, blev merged som `9bdb8de8` og bestod fuld produktion `32586958989`. Live 4.0.258/datasæt `rr-20260822171406-210` er verificeret med 210 zoner, 673 dele og 2.100 femdøgnsvisninger; offentlig `25/40/35` er fortsat aktiv.

## 4.0.257 - Candidate G-coverage uden skjult stedmodel (2026-08-22)

- Frisk central shadow på den produktionsverificerede 4.0.256-merge fandt 243/673 scorede dele; 430 mangler komplet lokal DKSS-familie.
- Den private coveragegate måler nu kun komplette dynamiske scoreinput. Statiske lokale rev-/lavtvands-/ålegræsfelter er diagnostic-only, har nul Candidate G-scorepåvirkning og kræves ikke for aktivering.
- Parentzonens morfologi må fortsat ikke arves som lokal evidens, og automatisk aktivering forbliver deaktiveret.
- Offentlig 25/40/35, Candidate G-beregningen, UI, geometri og land-/vandpunkter er uændrede.
- Efter produktionsverificering og exact-merge-shadow samler DEC-0053 ét ejerreviewspor: `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`. `20/45/35` er fortsat analysecentrum, mens endelig vægtning afventer komplette ture; ingen ekstra rådata hentes til den aktuelle mekaniske analyse.

## 4.0.256 - Candidate G-vægt og forklaring (2026-08-22)

- Den score-neutrale waders-variant er genafspillet med `15/50/35`, `20/45/35` og `25/40/35`; `20/45/35` bevares som gennemsigtigt analysecentrum.
- Candidate G udstiller nu eksakte komponentbidrag, pil nu, historik før nu, fysisk gate og synligt waders-loft i én maskinlæsbar diagnostic-only forklaring.
- Replay og kanoniske scenarier er grønne uden offentlig score-, UI-, data-, geometri- eller punktændring. Offentlig 25/40/35 er fortsat aktiv.
- Komplet dynamisk scoreinputcoverage og ejerens samlede go/no-go er fortsat nødvendige før aktivering. DEC-0052 erstatter den ældre kombinerede retention-coverageformulering.

## 4.0.255 - national waders-kontrakt i kildegaten (2026-08-22)

- PR #66's fulde post-data-validering stoppede korrekt på den gamle interne markør `candidate-waders-product-decision`; release, Supabase og Pages blev ikke kørt.
- Kontrakttesten følger nu den aktuelle åbne gate `candidate-waders-rule-order-public-product-review` og kører også i `validate:source`, så samme forskel stoppes før merge.
- Waders-kandidat, vindkurve, replayresultater, aktiv 25/40/35-score, geometri og land-/vandpunkter er uændrede.
- PR #67 exact-head-gate `32575697204`, merge `af8f30cf` og produktion `32575740539` er grønne. Live `rr-20260822133041-210` viser 210 zoner/673 dele, komplet `controlled-live`-manifest og byte-/SHA-match for begge offentlige datafiler.


## 4.0.253 - score-neutral Candidate G-produktkontrakt (2026-08-22)

- Kandidatens eksakte komponenter, vægtede bidrag og fysiske gate rekonstruerer nu 1.460/1.460 private scorer uden at ændre nogen scoreværdi.
- Den foretrukne no-direct-wind-variant dokumenterer waders-konflikten: 219 lave jagtbarheder, heraf 7 med mindst 55 point, samt det kanoniske 0/79-forløb.
- Pilen fastholdes som aktuel lokal strøm; historik får en separat forklaringskontrakt, når den modvirker den aktuelle retning.
- Den nationale shadow klassificerer coverage samlet og afviser parentzonens morfologi som lokal kystdelsevidens.
- Aktiv RavScore 25/40/35, offentlig UI, geometri, land-/vandpunkter, DMI/fallback og central admin er uændrede. Kandidat G er fortsat ikke aktiveret.
- PR #62 leverede kode-/analysebaselinen som `b2951d90`; dokumentationscheckpointene PR #63/#64 bestod exact-head-gates. Fuld produktionsverifikation `32570223437`, support `RavRadar-support-3382`, Supabase og Pages-deployment `6036286717` er grønne; det verificerede live-snapshot `rr-20260822112859-210` havde 210 zoner og 673/673 scorede dele.

## 4.0.243 - releasekandidat: komplette ture (2026-08-21)

- Nye læringsdata er komplette søgeture med start, slut, varighed, metode, faktisk zone/kystdel, grundighed og fund/ikke-fund.
- Prognosen ved turstart fastholdes med et dataminimeret kalibreringssnapshot; individuelle fund er ikke fit-enheden.
- GPS, rute, spor og præcis position fjernes fra fjernpayloaden.
- Eksisterende observationer bevares som v1-dækningsdata; RavScore 25/40/35 er uændret.
- Kandidaten er ikke produktion før Supabase-migration, fulde gates, deploy og 210/673-browserkontrol.

## 4.0.252 - fair landsrangering (2026-08-21)

- Begge nationale top-5-lister korrigerer nu for mange forskelligt vendte kystdele med den godkendte `direction-broad-19-v1`-model.
- Bred støtte i zonen beskytter reelt stærke placeringer; ved mindst 50 procent støtte er korrektionen nul.
- Den viste RavScore, lokale resultater, pile, forklaringer, geometri og land-/vandpunkter er uændrede.

## Intern RavScore-forskning efter 4.0.252 (2026-08-21)

- En parret historisk kontrol isolerer nu retning fra styrke og tidspunkt paa 1.460 modelpar.
- Analysen viser, at den aktive score reagerer for ens paa retning ved svag og kraftig flytteevne.
- Kandidat G er registreret som privat arbejdshypotese med historisk stroem-/vindhukommelse og foreloebigt vaegtcentrum 20/45/35.
- Den offentlige RavScore, UI, DMI-first, geometri og alle land-/vandpunkter er uændrede.

## Privat RavScore-regimehukommelse (2026-08-21)

- Nyt score-neutralt analysevaerktoej tester styrke-, varigheds- og historikstyrede vendinger for stroem, boelger og vind.
- 12 historiske 96-timersforloeb peger foreloebigt paa 24 timers aktivt regimespor og 48 timers baggrundsspor som naeste foelsomhedstest.
- Ingen point, produktionsscore, UI, datafelter, geometri eller land-/vandpunkter er ændret.

## Privat RavScore 24/48-matrix og ablation (2026-08-22)

- Et nyt kausalt analysevaerktoej sammenligner 24 timer, 48 timer og tre dobbeltsportsblandinger uden fremtidslaek.
- Separate ablationer maaler stroem, boelgeenergi og alternative vindspor uden at gemme raa vejrdata eller aendre score.
- Naeste replay afgraenses til 24 alene, 50/50 og 48 alene; lineaer vind er hovedanalyse, og vindstress er foelsomhedsgrænse.
- Aktiv RavScore, offentlig runtime, DMI-first, geometri og alle land-/vandpunkter er uændrede.

## Privat RavScore kandidat G replay (2026-08-22)

- Ny diagnostic-only kandidat G bevarer kandidat E's fysiske procesvej og tilføjer kapacitetsbevarende 24/48-timers historik.
- Privat replay dækker 1.460 evalueringer; separate strøm-, bølge-, direkte vind- og totalvindablationer er dokumenteret.
- 24 timer, 50/50 og 48 timer er næsten scoreidentiske. Varianten uden direkte vind er foretrukken til næste shadow, fordi direkte vind kun flytter 0,086 point absolut i gennemsnit.
- Centralt hydreret national shadow kontrollerede 673 aktive dele/210 zoner: 243 dele blev scoret, 430 var eksplicit u-scorede, og ingen offentlig score eller runtime blev ændret.
- G 50/50 lå nationalt i gennemsnit 5,50 point under aktiv model for strand og 3,74 for waders; 24/48 og no-direct-wind var praktisk identiske.
- Waders-jagtbarhed 0 kan sameksistere med høj kandidatscore og er registreret som aktiveringsstopklods før ejer-go/no-go.

## Intern shadowgate-rettelse efter PR #59 (2026-08-22)

- Den private RavScore-shadow må fortsat læse centralt gemte ekspertregler, men må ikke skrive dem tilbage, deploye eller aktivere en score.
- Kildegaten kontrollerer nu denne kontrakt direkte og forbyder konkrete centrale skrive- og Pages-veje.
- Rettelsen ændrer ikke Candidate G, offentlig RavScore 25/40/35, data, geometri eller land-/vandpunkter.

## 4.0.254 - score-neutral waders-vind- og jagtbarhedsvariant (2026-08-22)

- Ny diagnostic-only `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` bevarer alle strandscorer og begrænser waders-scoren synligt til waders-jagtbarheden.
- Waders-vinddelen er 100 til og med 6 m/s og falder glidende gennem 7/80, 8/60, 10/35, 13/10 og 18/0; bølger indgår fortsat separat.
- 1.460 private replayevalueringer og 132 syntetiske vind-/bølgekombinationer er kontrolleret uden rå vejrdata, U/V, koordinater eller beskyttede payloads i Git.
- Ingen sikkerhedsadvarsel eller automatisk bund-/dybde-/adgangsvurdering er tilføjet. Offentlig RavScore 25/40/35, UI, DMI/fallback, geometri og land-/vandpunkter er uændrede.
