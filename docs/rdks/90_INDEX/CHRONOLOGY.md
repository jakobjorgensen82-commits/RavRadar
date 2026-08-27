# Rekonstrueret chatkronologi

## 2026-08-28 – sikker fremtidig flytning af Sibirien-punkter

1. Ejeren spurgte, hvad der sker, når land-/vandpunktet ved Sibirien senere flyttes, og krævede som minimum intet nedbrud eller fejlscore under en mulig 48-timers genopbygning.
2. Kodeaudit viste, at punktændringen korrekt nulstiller Candidate G-kontekst lokalt, men at et centralt verificeret override blev anvendt før ny gridvalidering. Én manglende kystdel kunne derefter gøre hele moderzonen utilgængelig. Den historiske Sibirien-proof viste 5,045 km mod den aktive 5,0 km-strømgrænse og kunne ikke genbruges til en ny koordinat.
3. Ejeren godkendte implementering sammen med 4.0.292. Ingen konkret markør blev flyttet.
4. Kandidat/aktiv er nu adskilt. Kandidaten samples privat, kræver U/V ≤5 km, 96 timers fuld horisont og 48 timers Candidate G-memory; READY kræver særskilt ejeraktivering.
5. Aktiveringen bruger varm DMI/state, fulde gates og central compare-and-swap. Gammel active override og kandidatcache bevares til rollback/recovery. Hel fallback dækker desuden højst seks lokale warmups uden datasætblanding. Se DEC-0090.

## 2026-08-27 – mobil returfejl og krav om klogere lokal assistent

1. Ejeren observerede på iPhone, at retur fra **Om RavRadar** kunne efterlade kort, **Bedste områder** og **5-dages RavRadar** tomme, og præciserede senere, at den lokale Spørg RavRadar var alt for begrænset.
2. Mobilfejlen tages først som kritisk særskilt release. Den offentlige forside havde ingen `pageshow`-recovery, selv om Safari/WebKit kan gendanne en halvfærdig side fra back/forward-cache og afbryde en aktiv fetch ved navigation.
3. 4.0.292-kandidaten installerer et værn før første bootstrap-await, genindlæser ufuldstændig/afbrudt opstart og genoptegner ellers kort, rangliste, valgt zone og femdøgnsvisning fra eksisterende state.
4. En testbar controller dækker normal load, tidlig ufuldstændighed, færdig resume, ventende detaljer, timeout/fejl og dublerede hændelser. Lokal 390 px-retur udløser korrekt ren genstart i den ikke-hydrerede kildeworktree.
5. Det næste spor er en markant bredere, versionsbundet DA/DE/EN-ravvidensbase med evals før implementering. Den lokale og den eksterne assistent er begge read-only og kan aldrig påvirke prognoser, RavScore eller andre data.

## 2026-08-27 – ejer-go til offentlig GPT-OSS-assistent

1. Ejeren bad om at få AI-delen af **Spørg RavRadar** offentliggjort nu og ønskede en ordentlig tekst i feltet om den begrænsede kvote, som holder siden gratis.
2. Cloudflare-dashboardet blev genkontrolleret: Workers Free er den aktuelle $0-plan, grænsen er 10.000 neuroner pr. døgn, og Free stopper med fejl efter loftet. Cirka 4.930 neuroner var brugt efter modeltestene.
3. 4.0.291-kandidaten tilføjer DA/DE/EN-kvotetekst, aktiverer det offentlige remote-flag og låser remote-succes, `429`-fallback og fravær af browsercredential.
4. Den versionsstyrede GPT-OSS Edge og begge Cloudflare-secrets blev installeret før merge. En fail-closed `503 BOOT_ERROR` afslørede en sammenflettet Monaco-redigering; atomisk filudskiftning rettede den, hvorefter CORS, origin-afvisning, ugyldigt sprog, rouladeafvisning, DA/DE/EN-providerkald og 6/minut med `429` på syvende kald bestod live. Danske hybridord udløste derefter en snæver deterministisk fagordsnormalisering før den endelige smoke.
5. DEC-0088 bevarer alle tidligere domæne-, Candidate G-, privatlivs-, CORS-, rate-limit-, timeout- og rollbackkrav.
6. Ejeren præciserede, at AI-kvoten kun må gælde svarfunktionen og aldrig påvirke kort, prognoser, RavScore eller andre funktioner. DA/DE/EN-teksten og regressionen blev gjort entydig.
7. PR #187 bestod exact-head `33114501539`, blev merged som `c6c9998c` og bestod produktion `33114598957`, build `98665953481` og Pages `98668455689`.
8. Offentlig browserkontrol viste version 4.0.291, farvet kort, fem aktuelle områder, fem dagsfaner, DA/DE/EN-kvotetekst, evidensbundet Edge-svar, lokal rouladeafvisning og grøn 390 px-dialog. Vejrvisningen er fortsat tydeligt i bounded nøddrift, mens frisk Candidate G modnes.

## 2026-08-27 – DA/DE/EN-kandidat og Cloudflare mod Gemini

1. Ejeren genoptog AI-/oversættelsessporene og bad udtrykkeligt om, at Cloudflare sammenlignes med Gemini under nulbetalingskravet.
2. Første offentlige sprogscope blev implementeret centralt med dansk standard/fallback, flag+sprognavne og lokalt valg for hovedside, prognoser, områdepanel, konto/login, ture og lokal assistent. Ejeren godkendte derefter den brede fase, så **Om RavRadar** og hele grundbogen også blev oversat; admin/ekspert/internt forbliver dansk.
3. Assistentens klientrouter afviser kendte uvedkommende/sikkerhedsfølsomme spørgsmål før provider, holder bedste sted/tid/score deterministisk og sender kun dataminimeret offentlig kontekst. Ekstern AI er fortsat slukket.
4. Googles aktuelle vilkår blev genlæst: API Client omfatter en hjemmeside, og offentlig brug i EØS kræver Paid Service. Gemini Flash-Lite 27/27 kan derfor kun være intern reference under nulbetalingskravet.
5. Cloudflare Workers Free giver 10.000 neuroner/dag og fejler efter loftet. GLM-4.7-Flash og Gemma 4 26B gav ikke-evaluerbare smoke-svar og blev stoppet tidligt. GPT-OSS 20B bestod smoke 1/1, mål-gate 4/4 og 25/26 evaluerbare fuldtests; ejeren valgte den som kommende gratis model.
6. Brugbare GPT-OSS-svar krævede Cloudflare `json_object`, kontrolleret rekursiv payloadudtrækning, fem faste felter, 800 completion-tokens/low reasoning, eksplicit disposition/evidens med konkrete eksempler og smoke → mål-gate → fuld eval. Én længdeafvigelse og én irrelevant timeout er bevaret som fail-closed Edge-cases.
7. Den valgte model blev implementeret bag den eksisterende, fortsat slukkede server-side Edge med dobbelte domænegates, server-only credentials, CORS, tre rate limits, syv sekunders timeout, eksakt output-/evidensvalidering og lokal fallback.
8. Lokal desktop-/390 px-browserkontrol bestod alle tre offentlige sider og sprog, lokalt valg på tværs af sider, QR, syv kilder og sidebredde. Fuld lokal `validate:source` inklusive releasegate bestod derefter på den færdige kandidat. DEC-0086/0087 låser scope og modelvalg; ingen score, vejr, sortering, konto-/turdata, privatliv, geometri, land-/vandpunkter eller private data er ændret.

## 2026-08-27 – sorte zoner og automatisk Candidate G-genopretning

1. Ejeren bad om at stoppe AI-/oversættelsessporet og først forklare, hvorfor zonerne blev sorte, og **Bedste områder** samt **5-dages RavRadar** ikke virkede.
2. Den sidste sunde produktion var `rr-20260827013448-210` ved 00 UTC med 210 zoner og 673/673 `READY`. Browserens otte-timersgrænse kasserede hele datasættet.
3. Run `33059522170` byggede 09 UTC efter et nitimers hul og stoppede korrekt med 673 `WINDOW_HAS_TIME_GAP`; intet fejlet datasæt blev deployet.
4. Ejeren krævede både størst mulig akut gendannelse og en permanent løsning, hvor én fejlhentning ikke vælter systemet.
5. DEC-0084 låser et helt auditeret fallbackdataset i højst 48 timer med klar aktualitetsadvarsel, ingen blanding og atomisk skift ved 673/673 `READY`.
6. Huller over tre timer genstarter fra reelle suffixprøver uden interpolation/backfill. Et eksakt hash- og tidslåst 09-checkpoint kan redde op til tre timers modning uden at kopiere vejr, scores, rå vektorer eller private data.
7. Målrettede tests og dataminimerede virkelige artifactsimulationer er grønne.
8. PR #176 bestod exact-head `33066322196` og blev merged som `16ad8300`. Produktion `33066416034` gendannede 09-state, men stoppede sikkert før DMI/deploy, fordi fallbackstage lå efter checkpointændringen; opfølgningen vender kun disse to sikre trin.
9. PR #178 bestod exact-head `33066897710` og blev merged som `5f9ee093`. Produktion `33066980965` beviste den korrigerede rækkefølge og frisk runtime, men stoppede før deploy, fordi auditten krævede rå score samtidig med lovlig 0/673 `READY` fail-closed warmup.
10. Den snævre auditrettelse kræver stadig score/bidrag/fysisk gate ved `READY`, men kræver under warmup en entydigt utilgængelig rå mode uden score samt lukket offentlig mode. Det eksakte artifact består 210/673 uden replaymismatch, og fallbackpubliceringen vælger det komplette 00-datasæt.
11. PR #179 bestod exact-head `33069307854`, blev merged som `653a9811`, og produktion `33069384084`/Pages `98512392768` gennemførte hele kæden.
12. Live fallback `rr-20260827013448-210` er hashverificeret 210/673/1.346 mod separat primær `rr-20260827121030-210`. Browseren viser 210 farvede zoner, fem **Bedste områder**, fem prognosedage, fungerende detaljer, tydelig nødtekst og nul konsolfejl/advarsler. 4.0.288 er produktionsverificeret.

## 2026-08-27 – gratis Spørg RavRadar-forundersøgelse

1. Ejeren bad om en grundig analyse før bred implementering og præciserede derefter, at en eventuel AI skal være gratis og ikke kunne bruges til uvedkommende spørgsmål som en rouladeopskrift.
2. Aktuelle officielle kilder gjorde Gemini Free Tier til første kandidatspor. `gemini-3.7-flash` er kvalitetskandidat, og `gemini-3.5-flash-lite` er kapacitetskandidat; OpenAI GPT-5.6 Sol opfylder ikke nulbetalingskravet.
3. Den eksisterende 4.0.287-assistent blev auditeret. Lokal Candidate G-rangering/fallback bevares, men Edge mangler almindelig domænegate, DA/DE/EN, struktureret output og sikker routing før modelkald.
4. DEC-0083 låser Free Tier uden billing eller betalt overflow, fast afvisning, deterministiske bedste sted/tid/score-svar og forbud mod private/interne kontekster.
5. `rav-assistant-public-v1` binder ti offentlige fakta til 4.0.287/Candidate G, og evalpakken blev udvidet til 45 cases fordelt ligeligt på dansk, tysk og engelsk, herunder åbne uvedkommende emner uden fast ordlistematch.
6. Offline self-test er grøn. Live-eval kræver både lokal `GEMINI_API_KEY` og `GEMINI_FREE_TIER_CONFIRMED=1`; credentialværdien blev installeret lokalt og aldrig skrevet i Git, rapport eller output.
7. `gemini-3.7-flash` leverede ingen evaluerbar respons i fem forsøg ved 12/30 sekunder, også med low thinking. `gemini-3.5-flash-lite`/low bestod den endelige remote-kandidatsuite 27/27, DA/DE/EN 9/9, median/p95/max 1.329/1.896/1.968 ms og 27.314 tokens.
8. DEC-0083 vælger Flash-Lite til den næste, fortsat deaktiverede Edge-implementeringskandidat. Provider-neutral gateway, fallback, rollback og offentlig aktivering er ikke udført.
9. Offentlig baseline forbliver local-only 4.0.287. RavScore, vejr, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## 2026-08-26–27 – 4.0.287 endeligt hybridt turlager, produktionsverificeret

1. Ejeren afviste en senere halv implementering og krævede den endelige løsning fra dag ét plus Supabase-rollback.
2. Turso Free blev forkastet, fordi en DPA ikke fremgår tydeligt. Cloudflare D1 blev valgt med ti EU-låste shards og self-serve-DPA.
3. Supabase Edge verificerer login og HMAC-pseudonymiserer ejerskab; Cloudflare modtager ingen rå identitet, JWT, GPS eller rute.
4. Worker-kontrakten er HMAC-signeret, tidsafgrænset og idempotent. Migration kører før/efter cutover, og rollback er eksplicit uden normal dual-write.
5. Lokal målrettet kontrakt og fuld sourcegate er grøn. Infrastruktur-PR #162/#163 bestod exact-head `33014102652`/`33014672254` og blev merged som `27cebfd0`/`94b58e41`.
6. Dedikeret Cloudflare-konto, mindst-mulige deploy-/audit-tokens og krypterede GitHub-secrets blev oprettet gennem den godkendte kanal uden at vise værdier. Rollback-Edge-deploy `33014772035` bestod; live EU-shards/Worker, migration, kandidatens endelige exact-head/merge og offentlig verifikation afventede på dette trin. Se DEC-0082.
7. PR #164 bestod exact-head `33019055639` og blev merged som `e9cd20ee`. Første D1-run `33019198166` oprettede ti EU-shards og deployede Workeren, men stoppede sikkert før migration/Edge på den umiddelbare health-udbredelsesforsinkelse. Efterfølgende payloadfri health var grøn; bounded retry blev tilføjet før ny exact-head og cutover.
8. Bounded retry bestod PR #166 exact-head `33019805663` og blev merged som `2d12c085`. Cutover `33019868542` migrerede fire Supabase-rækker, genkendte fire idempotente dubletter i andet gennemløb og satte Edge i D1-normaldrift gennem grøn privat og offentlig grænsekontrol.
9. Fuld produktion `33019856228` og Pages-job `98351206091` udgav `rr-20260826224651-210` som 4.0.287. Offentlig audit viste 210/210 aktive zoner, befolket **Bedste områder**, 673 dele, 420 aktuelle og 2.100 prognosevisninger uden fejl.
10. Read-only monitor `33021364240`/`98352259752` verificerede ti shards, 0 MB afrundet og 0 % forbrug uden at læse ture.
11. Begge mindst-mulige Cloudflare-tokens blev sat til **No expiration** uden værdiskift. Supabase-PAT'et blev sikkert udskiftet til udløb 25. august 2027; `33024408547` bestod hele D1-kæden, før det gamle og et ubrugt mellem-token blev tilbagekaldt.
12. Første rotationsprøve `33023652174` stoppede sikkert ved formatkontrollen på grund af adskilte browser-/Windows-udklipsholdere. Ingen værdi blev logget; korrigeret overførsel brugte en lokal engangskanal uden fil eller kommandolinjeværdi. Audit `33024621109`/`98362935528` genbekræftede ti shards og 0 % uden turlæsning.
13. Ejeren afviste Codex-kalenderpåmindelse og valgte GitHub-mail. Et secret-frit workflow med kun `issues: write` opretter/tildeler en issue fra 60 dage før udløb og følger op ved 30/14/7/3/1/0 dage. GitHub-kontoens levering for deltagelse/tildeling er verificeret som GitHub + mail.
14. En senere Ravudsigten-sammenligning er godkendt som intern roadmapopgave baseret på offentligt synlige resultater og uafhængige fund. Den har `scoreImpact=false`/`publicRuntime=false` og må kun omtales i RDKS, roadmap og changelog, ikke i bruger-/ekspertrettede flader.
15. Credential-workflowet bestod PR #169/exact-head `33025102301` på `ba8e8f03` og blev merged som `1e402834`. Manuel main-prøve `33025289153` bestod uden at oprette en for tidlig issue.
16. Frisk produktion `33025210517` og Pages-job `98367528389` bestod. Offentlig `rr-20260827000855-210` viste 4.0.287, 210/210 aktive zoner, fem **Bedste områder**, 673 dele, 420 aktuelle visninger, 2.100 prognosevisninger og nul auditfejl.
17. Ejeren præciserede derefter, at Supabase-PAT'et ikke skal kalenderfornyes: normal Auth/Edge-/D1-drift bruger det ikke. Det verificerede udløbsworkflow pensioneres, og et kortlivet PAT oprettes kun til en konkret deploy/migration/rollback og tilbagekaldes efter grøn verifikation.
18. Den interne Ravudsigten-sammenligning blev aktiveret. Første tidsstemplede snapshot registrerede begge tjenesters top-fem, Ravudsigtens ikke-røde femdøgnssignaler, de nærmeste logiske RavRadar-zoner og komponentforklaringer. Ét vejrvindue er observationsgrundlag, ikke modelvalidering.
19. PR #171 bestod exact-head `33029393300` og blev merged som `f15f5892`. Produktion `33029447510` stoppede før Supabase-sync/artifact/Pages, fordi den globale kildeneutralitetstest ikke skelnede den udtrykkeligt godkendte interne RDKS-kildeangivelse fra offentlig kildeomtale. Opfølgningen tillader kun den eksakte interne analysefil og kræver dens sikkerhedsmarkører.
20. PR #172 bestod exact-head `33030112665` og blev merged som `7a234653`. Produktion `33030166104`/Pages `98382359708` bestod fuldt, og offentlig `rr-20260827013448-210` blev målrettet kontrolleret med 210/210 aktive zoner, 673/673 scoreklare kystdele samt fem rangliste- og prognoserækker i begge søgemåder uden synlig runtimefejl.

## 2026-08-26 – 4.0.286 fra kandidat til produktionsverificeret efter offentlig 4.0.285-afvisning

1. PR #156 bestod exact-head `32993055324`, blev merged som `de6b7844`, og produktion `32993270783` bestod recovery, frisk runtime, fuld validering, releasegate, Supabase-sync, artifact og Pages.
2. Den skærpede offentlige kontrol bestod struktur og browser-/HTTP-kontrakt, men afviste korrekt 0/210 aktive zoner. 665/673 dele var igen `WINDOW_INCOMPLETE`; 4.0.285 blev ikke erklæret stabil.
3. Rodårsagen var, at grænsebeviset før det faseskudte 48-timersvindue blev brugt i samme beregning, men ikke bevaret i den kompakte state til næste rullende reference.
4. 4.0.286 gemmer dette virkelige kompakte kontinuitetsbevis, men holder det ude af replay og dækningssum. Det skaber ingen måling, interpolation, rå U/V eller koordinat.
5. To-trins regime- og statepipeline-tests beviser, at næste reference fortsat er `READY` med 48 timers dækning, mens ægte korte vinduer og huller fortsat stopper.
6. Den faktiske public runtime auditeres nu i produktionsworkflowet før Supabase-sync, artifact og Pages. Gaten afviser det offentlige 4.0.285-artifact med 665/673-signaturen.
7. Recoverysimulation mod de virkelige offentlige artifacts gav 672/673 `READY` og efterfølgende inaktiv recovery. På dette deltrin afventede exact-head og offentlig produktionslukning.
8. PR #157/exact-head `32995801418` og produktion `32995888183` beviste et sikkert stop i den faktiske runtimegate. PR #158/exact-head `32997043974`, merge `ca784210` og produktion `32997118162` gav dataminimeret 672 `READY`, én warmup, nul replaymismatch og 1.328/1.344 modes.
9. De manglende 16 modes var de otte godkendte `dkss_lf`-dele i gyldig `NATIVE_CADENCE_HOLD`. Den ældre Phase D-base afviste manglende aktuel strøm før Candidate G-memory. Den snævre rettelse kræver allowlist-afledt tre-timers tilladelse, `READY`, alder højst tre timer og tomme aktuelle vektorfelter; øvrige mangler forbliver fail-closed. Offentligt fejlpunktsreplay gav 16/16.
10. PR #159/exact-head `33001615758`, merge `c0f42b33` og produktion `33001743118` lukkede forløbet. Offentlig `rr-20260826185603-210` viste 210/210 aktive zoner, befolket **Bedste områder** og nul browser-/HTTP-fejl. Se DEC-0081.

## 2026-08-26 – kandidat 4.0.285 efter offentlig 4.0.284-kontrol

1. PR #155 bestod exact-head `32986025916` og blev merged som `a92e2704`. GitHub Actions/Pages havde en driftsforstyrrelse, så den manuelt startede fulde produktion blev afløst af den forsinkede pushkørsel `32987875007`, som bestod hele kæden og deployede 4.0.284.
2. Den fulde offentlige browseraudit bestod 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden browserfejl, men den synlige aktuelle rangliste forblev fail-closed.
3. Dataminimeret artifact-sammenligning viste 672/673 `READY` og 209/210 aktive zoner i sidste 4.0.283-build, men 8/673 og 0/210 allerede i første 4.0.284-build. Deploy-kapløbet var derfor ikke årsagen.
4. Rodårsagen var det eksakte krav til første tidspunkt i 48-timersvinduet. En én-times faseændring fjernede beviset lige før grænsen og reducerede 665 forløb kunstigt til 46 timer.
5. Første kodeforslag blev korrekt stoppet af en eksisterende selftest, fordi det også kunne godkende et ægte 47-timersdatasæt. Den endelige regel kræver derfor både et verificeret kompakt bevis før grænsen og højst tre timers ubrudt kadence over den.
6. Det deployede datasæt har allerede mistet grænsebeviset. Engangsrecoveryen bruger kun det hash-låste offentlige artifact fra workflow `32978542594`, fletter kun kompakte transportbeviser og kræver mindst 99 % `READY`.
7. En lokal simulation med de virkelige offentlige source-/target-artifacts genskabte 672/673 `READY`; den ene kendte umodne del forblev lukket, og recoveryen blev straks inaktiv.
8. Version 4.0.285 ændrer kun de to beskyttede geodatafilers topversionsfelt 4.0.284 → 4.0.285 under DEC-0076 og ændrer ingen geometri, land-/vandpunkter, scorekurver eller private data. Exact-head og offentlig produktionslukning udestår. Se DEC-0081.

## 2026-08-26 – kandidat 4.0.284 drifts- og sikkerhedshærdning

1. Ejeren bestilte en samlet hærdning før domæneflytning: HTML, ekspertadgange, observationer, assistentgateway, CORS, RLS og sikkerhedstests.
2. Efter en tvungen Windows-genstart blev den isolerede worktree, hele diffen og fraværet af Git-lås/halv operation verificeret. Rod-worktree, recoveryfiler, geometri, punkter og private data forblev urørte.
3. Den første live-migration havde en for bred `experts_manage`-læsning. RLS, skrive-RPC og UI blev indsnævret til ekspertprofiler og tre sikre ekspertadgange; live katalogkontrol blev udført uden private rækker.
4. Tre ens Edge-gatewayfiler blev samlet til én delt kilde. Begge funktioner blev deployet gennem Supabase-browsereditoren, fordi Windows Application Control blokerede CLI'en. Windows-sikkerheden blev ikke omgået.
5. CORS-, payload-, rate-limit- og gammel-anonym-rapportkontrollerne bestod uden databaseinsert. Legacy-JWT blev slået fra på begge funktioner.
6. Fjernassistenten manglede en godkendt OpenAI-secret. Ejeren bad Codex vælge den bedste vej; 4.0.284 vælger lokal Candidate G-assistent som standard og forbyder skjulte fjernkald via et eksplicit `false`-flag.
7. Supabases mulige begrænsning fra 9. september 2026 forbliver en åben driftsrisiko.
8. PR #155 bestod exact-head `32986025916`, blev merged som `a92e2704`, og pushproduktionen `32987875007` bestod fulde gates og Pages. Sikkerhedskæden blev offentlig verificeret; den efterfølgende Candidate G-cadencefase følges i 4.0.285. Se DEC-0080 og DEC-0081.

## 2026-08-26 – 4.0.283 moderzonekobling produktionsverificeret

1. Ejeren bad om at få **Mangler/Ukendt** skubbet helt videre og derefter få en særskilt drifts- og sikkerhedsanalyse.
2. Produktion `32912103679` nåede 673/673 scoreklare kyststrækninger, men den afsluttende kontrol stoppede ved 665/673.
3. De otte afvigelser var ikke datahuller. Kontrollen havde mistet moderzonen, da zonegrupperne blev foldet ud til en flad kystdelsliste.
4. 4.0.283 bevarer moderzonen fra den autoritative JSON-nøgle og låser adfærden med en regression.
5. Datakrav, Candidate G 20/50/30, vejr, geometri og land-/vandpunkter er uændrede. Se DEC-0079.
6. PR #153 bestod exact-head `32914734446`, blev merged som `1caad399`, og produktion `32914887586` bestod hele kæden og udgav 4.0.283.
7. Offentlig kontrol beviste 673/673 kyststrækninger. 657 havde komplet hukommelse; 16 havde 30–48 timers naturlig historik uden reset og gjorde kun fem moderzoner ærligt utilgængelige.

## 2026-08-26 – kandidat 4.0.282 native reference ved vinduesskift

1. Ejeren bad om at få de resterende tekniske **Mangler/Ukendt** skubbet helt videre på tværs af zoner og kyststrækninger.
2. Den strenge produktion stoppede ved 665/673 og viste, at alle otte afvigelser var de godkendte regionalproxyer med ægte tretimerskadence.
3. Rodårsagen var et beregningsvindue, som begyndte efter den seneste ægte kildeprøve, før prøven var indlejret i den kompakte Candidate G-state. Historikken var ikke tabt.
4. 4.0.282 giver state-pipelinen den eksakte foregående prøve i højst tre timer og reducerer den straks til tid og kystrelativ styrke.
5. Der opfindes ingen time, måling, pil eller mobilisering. Rå strømvektorer, koordinater og punkt-id'er føres ikke videre.
6. Candidate G 20/50/30, 48-timersregler, scorekurver, zoner, geometri og land-/vandpunkter er uændrede. Se DEC-0078.

## 2026-08-26 – 4.0.281 Candidate G-native teknisk visning produktionsverificeret

1. Ejeren så **Mangler**, **Ukendt**, tankestreger og **Ikke beregnet** i den tekniske zonevisning og bad om at få forholdet rettet på tværs af alle zoner og kyststrækninger.
2. Gennemgangen viste, at Candidate G allerede beregnede grundlaget, men UI'et læste pensionerede felter fra den gamle scoremotor, og zoneaggregationen fjernede dele af den nye forklaring.
3. Candidate G's offentlige projektion bevarer nu målingsstatus, transportreference, 48-timersdækning, fase, udgående forløb/tab, transportpotentiale, levering og rav i bevægelse.
4. Native tretimers-mellemtimer forklares uden opdigtet ny måling, retning, forskel eller klassifikation.
5. Rettelsen ændrer ikke scoremodellen, scoretal, vejr, zoner, geometri, land-/vandpunkter, admin-data eller brugerdata. Se DEC-0077.
6. PR #150 blev merged som `1308a07d`, og produktion `32899040618` udgav 4.0.281 gennem de fulde gates.
7. Offentlig audit beviste 1.314 komplette diagnostiske modevisninger for 657 hukommelsesklare dele, 673 accepterede statefortsættelser og nul reset; 16 umodne dele forblev korrekt lokalt utilgængelige.
8. Browserauditten blev rettet til Candidate G-only-kontrakten og bestod 420 aktuelle, 2.100 prognose- og 673 kystdelsvisninger uden fejl.

## 2026-08-25 – kandidat 4.0.280 korrekt orienteret Om RavRadar-billede

1. Den offentlige kontrol viste, at familiebilledet stod 90 grader forkert.
2. Kilden var portræt med EXIF-orientering; den tidligere konvertering havde ikke indarbejdet retningen i pixels.
3. Originalen blev bevaret urørt. Tre nye JPEG-varianter blev fysisk vendt korrekt og komprimeret.
4. Pc viser nu portrættet ved siden af teksten, mobil viser det over teksten uden vandret rulning.
5. Appskal og målrettet test bruger kun de nye varianter og kontrollerer deres dimensioner.
6. Versionen er 4.0.280 med kun topversionsfeltet ændret i de to beskyttede geodatafiler. Score, vejr og geografi er urørt.

## 2026-08-25 – 4.0.279 offentlig Om RavRadar-side produktionsverificeret

1. Ejeren bad om en Om RavRadar-side med præsentation af Jakob Jørgensen, projektets idé, frivillig drift, kontakt, to ejerbilleder og valgfri MobilePay-støtte.
2. Det blev præciseret, at højeste RavScore ikke betyder størst grundlæggende ravmængde, og at Limfjorden 95 derfor godt kan være et dårligere fundvalg end Sæby 75.
3. Siden forklarer også, at landsdækkende regler må rumme kompromiser, så noget tilsyneladende forkert kan være en fejl eller en bevidst helhedsforenkling.
4. MobilePay Box `4214MX`, den godkendte adresse og en klikbar QR-kode vises samlet med den frivillige arbejdsindsats. Støtte giver ingen særlige funktioner eller scorer.
5. Linket er placeret i topmenuen ved konto, **Start ravtur** og **Spørg RavRadar**.
6. Ejerens billeder er optimeret til responsive WebP-varianter. Layoutet er tospaltet på pc og enspaltet på mobil uden vandret rulning.
7. Siden er føjet til appskallen, og målrettet kontrakttest er grøn.
8. Versionen er sat til 4.0.279; de to beskyttede geodatafiler ændrer kun topversionsfeltet fra 4.0.278.
9. Ejeren har stående godkendt fremtidige rene versionsfeltsynkroniseringer uden et nyt spørgsmål, når særskilt diffkontrol beviser, at intet andet geodata ændres.
10. PR #148 blev merged som `12db45a8`; produktion `32881278351` var grøn. Offentlig efterkontrol fandt derefter familiebilledets orienteringsfejl, som følges op i 4.0.280.

## 2026-08-25 – kandidat 4.0.278 pensionerer Regelværkstedet og retter hele ekspert-håndbogen

1. Ejeren bad om at få hele ekspert-håndbogen sammenholdt med hele RavRadar og stillede spørgsmål ved, om Regelværkstedet realistisk kunne ændre scoren sikkert.
2. Kodegennemgangen viste, at værkstedet testede enkle øjebliksbilleder, mens den aktive Candidate G-motor kræver 48-timers state, lokale datagater og flere bindende invariants. Den offentlige Candidate G-kæde indlæste heller ikke værkstedets regelfil.
3. Regelværksted og Vidensbase udgår derfor af aktiv admin sammen med regelrettigheder og offentlig regelpublicering. Eksisterende kladder slettes ikke.
4. Ekspertens review forbliver den faglige indgang. Scoreændringer gennemføres versionsstyret i Candidate G-kode, RDKS, tests, exact-head og produktion.
5. Markdown-håndbog, webhåndbog, systemspecifikation og regelmotordokumentation er gennemgået samlet mod den aktive 20/50/30-model. Se DEC-0075.
6. Ejeren godkendte versionsløftet 4.0.277 → 4.0.278 med kun versionsfeltet ændret i `data/kystdata.json` og `data/zones.geojson`.
7. Den naturlige kontrol nåede 657/673 kyststrækninger med 48 timer og 205/210 zoner med gyldige beregnede aktuelle scorer uden nye resets ved kørselsskift.
8. PR #145 blev merged som `11478de3`, og produktion `32840785390` udgav 4.0.278 gennem fuld grøn kæde.
9. Den offentlige efterkontrol viste falsk 0/210 aktive, fordi vellykkede zone-/søgemåderesultater manglede `available: true`; fem zoner havde samtidig reelt ufuldstændig lokal historik.
10. Dækningsgaten blev desuden afgrænset til den fælles aktuelle reference, så senere lokale prognosehuller ikke kan lukke current-status globalt.
11. Aktuel liste og alle fem prognosedage blev kontrolleret for strand og waders. De bruger særskilte værdier og kan både afvige i score og rækkefølge; en regressionstest låser begge veje.
12. PR #146 bestod exact-head `32844951668` på `432de975` og blev merged som `8facd2d8`.
13. Produktion `32845130587` bestod hele kæden og udgav `rr-20260825120459-210`.
14. Offentlig efterkontrol viste 205/210 aktive zoner, fem lokale utilgængelige zoner, 657/673 READY-kyststrækninger, 16 `WINDOW_INCOMPLETE`-forløb og 673 accepterede statefortsættelser uden reset.
15. Aktuel liste og alle fem prognosedage brugte særskilte strand-/wadersscorer; tre prognosedage havde også forskellig top-5-rækkefølge. Begge offentlige topversionsfelter forblev 4.0.278 uden geodataændring.

## 2026-08-25 – kandidat 4.0.277 årsagstro native tretimerskadence

1. Den naturlige produktion stoppede sikkert på 666/673 ved en mellemtime for de otte godkendte `dkss_lf`-regionalproxyer.
2. Historikken var bevaret. Rodårsagen var, at byggerens readiness kunne tælle en fremtidig prøve, mens Candidate G skrev mellemtimen som manglende evidens.
3. Ejeren bad om en grundig rettelse uden ny 48-timers realtidstest og uden ændring af score, zoner eller punkter.
4. 4.0.277 vælger kun årsagstro referencer og fastholder højst tre timer kun den afledte transporttilstand. Der opfindes ingen måling, bevægelse, U/V eller pil.
5. PR #140 bestod exact-head `32816129342` og blev merged som `d3b4542f`.
6. Produktion `32816237198` byggede historik og runtime grønt, men den fulde validering stoppede før deploy på en forældet statisk test.
7. PR #141 rettede kun testkontrakten, bestod exact-head `32817501003` på `128c71ce` og blev merged som `81e9b891`.
8. Produktion `32817626537` bestod hele produktionskæden og Pages. Offentlig kontrol viste 673/673 accepterede Candidate G-states, nul resets og 12–45 timers historik. 0/210 zoner var endnu aktive, fordi 48 timer ikke var nået. Se DEC-0074.

## 2026-08-24 – Candidate G-only bestod central hydrering, håndbogsdrift blev flyttet frem i kildegaten

PR #135 bestod exact-head og blev merged. Den efterfølgende produktion beviste, at den centrale legacyprofil ikke længere kan genindføre 25/40/35. Produktionen stoppede senere før deploy, fordi repositoryets webhåndbog og Supabase-installationskopi reelt var forskellige; central ekspertdata var ikke indlæst i det trin. 4.0.275 synkroniserer kopien og kører samme strenge kontrol både i exact-head-kildegaten og i den fulde produktionsvalidering. Ingen score- eller geodataadfærd ændres.

## 2026-08-24 – kandidat 4.0.271 samlet feltrettelse

Grundbogen blev samlet rettet efter ejerens feltgennemgang: kystpil, opdrift i koldt saltvand, bundnær strøm, lokale retningseksempler, revlehuller, tanglinje, grus, fralandsvind og speciallygter. DEC-0070 skelner mellem dokumenteret fysik, aktiv modelkontrakt og praktisk erfaring. Ingen score- eller geometriadfærd blev ændret.

## 2026-08-24 – før-lancering af data, admin, ekspert og rangering

**Produktionsbevis:** PR #126 blev merged som `fda934ae`. Den eksakte mergeproduktion `32730674577` (#3522) bestod hele kæden og udgav Pages-artifact `9521472172` samt supportartifact `RavRadar-support-3522` (`9521463897`).

1. Ejeren bad om roadmapets naturlige datakontrol, Supabase-forbrug og tekniske vedligehold samt en gennemgang af eksperthåndbogen og administratorens funktioner før lancering.
2. Den naturlige produktionskørsel dokumenterede fuld kendt 210/673-runtime, reelle tretimerspunkter og ærlig markering af de tolv kendte marine huller. Supabase er sund i den aktuelle periode, mens forrige egress-overskridelse fortsat overvåges.
3. Admin- og eksperthåndbogen viste sig funktionelle og rettighedsbeskyttede. En manglende femte nøgle i første lagertjek forklarede en falsk rød adminstatus.
4. Ejerens billeder viste, at begge offentlige toplister kunne vise højere RavScore under lavere. Rodårsagen var ikke DEC-0049's lotterikorrektion, men at listen skjulte områdescoren og viste bedste enkeltstræknings RavScore. 4.0.270 bevarer korrektionen og viser den afrundede områdescore, så højeste viste tal står øverst.
5. Håndbogsgennemgangen fandt historiske modelkandidater, der kunne læses som aktuelle, en forældet Supabase-installationskopi og en deploysynkronisering, som kunne overskrive centralt godkendte ekspertændringer. Tekster, kodekapitel, scenarier, hypoteser og releasegate er rettet; installationskopien synkroniseres fuldt, og livehåndbogen trevejsflettes mod en beskyttet kildebaseline.
6. PR #122 bestod exact-head `32721778498` på `a885bc5b` og blev merged som `abe10127`. Produktion `32721891349` bestod frem til den beskyttede synkronisering og stoppede før deploy, fordi den centralt ændrede håndbog endnu ikke havde en lagret første kildebaseline.
7. PR #123 bestod exact-head `32724526697`, blev merged som `00f59456`, og produktion `32724616331` bestod alle kode-, data- og releasegates. Den stoppede før deploy, fordi den slanke Pages-pakke ikke udgiver håndbogens kildefil.
8. PR #124 bestod exact-head `32726897134`, blev merged som `fd7bc868`, og produktion `32727025187` bestod alle øvrige gates, men stoppede ved hashkontrollen. Dermed blev det bevist, at manifestet stammer fra den senere produktionsgrønne 4.0.269-dokumentationsmerge.
9. Første migrering må derfor hente den sidste centralt synkroniserede 4.0.269-kilde på uforanderlig commit `fc13fb5ab326d8824ca55235ac454ac230e3db3e` fra grøn produktion `32706573863`, men accepterer den kun ved SHA-256-match mod det tidligere beskyttede manifest.
10. Score, farvegrænser, fysik, vejrdata, geometri og land-/vandpunkter er urørte. Se DEC-0069.
11. PR #125 bestod exact-head `32728525467` på `3fe579ab`, blev merged som `7861079b`, og produktion `32728654553` bestod den beskyttede håndbogsmigrering, fulde gates, artifact og Pages.
12. Den første liveaudit fandt kun en gammel auditlabel, ikke en brugerfejl. PR #126/exact-head `32730584569` rettede kontrollen, og gentaget 4.0.270-audit bestod 210/673/420/2.100 uden browser-, konsol-, side- eller HTTP-fejl.

## 2026-08-24 – ejerens visuelle scoregennemgang

1. Ejeren bad først om, at ændringerne ventede, mens flere billeder og observationer blev samlet.
2. Gennemgangen viste, at *Rav sat i bevægelse* ikke forklarede bølgernes rolle tydeligt, og at *Hvorfor denne score?* skulle beskrive de aktuelle forhold i alle tre komponenter.
3. Et billede viste både lavt og stigende vand. Ejeren afviste med rette formuleringen om, at lavt vand i sig selv hjælper materiale ind; 4.0.269 tillægger kun stigningen denne mulige virkning.
4. Fundprognosen byggede på to ture. Ejeren besluttede, at feltet skal skjules nu og eventuelt genindføres senere, når et reelt historisk fundgrundlag findes.
5. Ejeren bad også om at fjerne anvendte scorelofter, rå samlet score-JSON og det tomme *Vælg et område på kortet*-felt samt opdatere kilder, kort og licenser.
6. Den systemiske kontrol bekræftede, at Candidate G 20/50/30 igen var aktiv på 210/673 efter en kort global 25/40/35-reservevisning. Den bindende globale reserve bevares; blandede profiler er fortsat forbudt.
7. 4.0.269 implementerer aktuelle forklaringer i både Candidate G og reserveprofilen, skjuler de besluttede felter uden at slette bagvedliggende data/logik og ændrer ingen scoretal, geometri eller land-/vandpunkter. Se DEC-0068.
8. PR #120 bestod exact-head `32703138969` på `37de330c`, blev merged som `d745e0ba`, og produktion `32703271897` udgav `rr-20260824080543-210` som 4.0.269 med Candidate G 20/50/30 på 210/673.
9. Den fulde offentlige browseraudit bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. Leverancen er produktionslukket.

## 2026-08-24 – læringsmodulet bliver en grundbog i ravjagt

1. Ejeren gjorde det klart, at læringsmodulet ikke skal lære brugeren at anvende RavRadar, men lære alt det, projektet aktuelt ved om ravjagt.
2. Den eksisterende forskning og supplerende primære kilder blev omsat til en offentlig rækkefølge fra ravets egenskaber over hav, kyst og felttegn til strand-, vandkant-, waders- og UV-jagt.
3. Grundbogen skelner mellem bølgernes mobilisering, strømmens transport, vindens indirekte virkning og kystens sortering/opsamling. Der gives ingen universel dansk vind- eller strømretning.
4. RavRadar og den aktive Candidate G-model forklares først til sidst. Score, vejrdata, privat datakontrakt, geometri og land-/vandpunkter ændres ikke.
5. Den samtidige sproggennemgang fjernede interne standardsystemord fra normal offentlig tekst og samlede sikkerhedsafgrænsningen ét sted uden en særskilt offentlig sikkerhedsscore.
6. Lokal målrettet test samt desktop- og mobilkontrol blev grøn. PR #116 bestod exact-head `32670857438` og blev merged som `5a2f7796`.
7. Første produktion `32670920742` stoppede korrekt før deploy: en ældre fuld rangeringstest krævede fortsat den tidligere tekniske hjælpetekst ordret. Den nye almindelige forklaring blev bevaret, PR #117/exact-head `32671863965` rettede testkontrakten og blev merged som `21acb0a2`.
8. Anden produktion `32671924885` kom forbi rangeringen, men stoppede fortsat før deploy på stateforklaringstestens gamle overskrift **Hvad skete før nu?**. Den gældende **De seneste timers betydning** låses nu i testen, som flyttes til `validate:source`; alle direkte læsere af de ændrede brugerfiler målrettes før næste PR.
9. Den målrettede gruppe på 29 UI-/auth-/konto-/assistent-/startup-tests blev grøn. Den fandt desuden en historisk 4.0.240-sikkerhedstest, som krævede gentagne advarsler i strid med ejerbeslutningen; den historiske indgang følger nu 4.0.268-kontrakten.
10. PR #118 bestod den samlede exact-head `32672522334` på `8faccce3` og blev merged som `3c22e40b`. Produktion `32672578127` gennemførte hele kæden og udgav `rr-20260823230848-210` som 4.0.268 på 210/673.
11. Den afsluttende offentlige browseraudit bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. RDKS, roadmap og håndbøger blev derefter lukket i en docs-only-opfølgning.

## 2026-08-23 – den virkelige login- og turlogprøve lukker et produktionsgab

1. Ejeren prøvede et rigtigt magic link. Browseren blev sendt til `localhost:3000` med forbindelsesfejl, mens **Mine ture og fund** ikke kunne hente Supabase og viste nul ture.
2. Supabase-dashboardet bekræftede Site URL `http://localhost:3000` og ingen tilladte redirects. Begge blev rettet til den aktuelle RavRadar-origin.
3. En read-only `limit=0`-audit bekræftede, at forbindelsen og nøglen virkede, men at `data_quality_flags` manglede. Policyoversigten viste kun INSERT-regler og ingen SELECT-regel for egne ture.
4. En databevarende migration tilføjede feltet og den private læsepolicy. Efterfølgende svarede hele feltkontrakten HTTP 200 uden hentede rækker, og policyen blev synlig for `authenticated`.
5. Ejeren mindede om det købte domæne `ravradar.dk`. DEC-0065 gør det bindende, at Site URL og redirect-liste ændres samtidig med domæneskiftet og prøves med et nyt link.
6. 4.0.266 versionsstyrer den centrale kontrakt, en almindelig brugerfejl og regressionstesten. Ingen score, vejr, geometri eller land-/vandpunkter ændres.

## 2026-08-23 – fleksibel efterregistrering og frivilligt fravalg

1. Ejeren besluttede, at en indlogget bruger skal kunne indberette en tidligere tur eller et fund direkte fra kontoen og selv vælge korrekt dato og klokkeslæt.
2. Kontoindberetningen genbruger samme spørgsmål, zone→kyststrækningsvalg og eksisterende `observations`-tabel. Ingen ny tabel, ekstra række eller databasekolonne indføres.
3. Den offentlige klient kan ikke sikkert genskabe et vilkårligt historisk vejr-/scoresnapshot. Nutidens vejr må ikke bruges som erstatning; rapporten gemmes derfor med tomme snapshotfelter og `calibration_eligible=false`.
4. En startet tur får tre valg: indsend, svar senere eller afslut uden at indberette. Det sidste valg kræver bekræftelse og rydder kun den lokale aktive tur.
5. Ejeren fjernede den tekniske sætning om databasekopier fra brugerens **Mine ture og fund** og præciserede igen, at efterregistreringen skal have et tydeligt valg af både dato og klokkeslæt.
6. DEC-0064 og målrettede kontrakt-, observation-, turlog- og syntakstests dokumenterede 4.0.265-kandidaten. Tre sikre PR-stop lukkede et gammelt profilversionsmærke og to dokumentationsmangler uden produkt- eller scoreændring.
7. PR #111 bestod exact-head `32658661075`, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er 4.0.265 på 210/673; dato-/tidsfeltet er påkrævet og ikke forudfyldt.

## 2026-08-23 – ejeren vælger en privat turlog uden dobbeltlagring

1. Ejeren bad om et let forståeligt konto-link til brugerens egne ture og fund og gjorde det bindende, at eksisterende Supabase-data skal genbruges for at beskytte free-planen.
2. Kodegennemgangen viste, at `observations` allerede rummer turdata og har RLS for egne rækker. Løsningen læser samme række i stedet for at bygge en ny tabel eller gemme en kopi.
3. Den aktive turknap havde stadig en gammel GPS-baseret parallelrejse foran v2-dialogen. Den fjernes fra brugerrejsen, så Start/Afslut/Færdiggør bruger én komplet v2-tur uden GPS eller rute.
4. Kontologgen er doven og begrænset til de seneste 100 ture og et lille feltudvalg. Lokale afventende ture deduplikeres mod serveren via eksisterende klient-/tur-id.
5. `user_id` tillades som en snæver teknisk RLS-kobling til den samme række. Mail/navn gemmes ikke i turposten, og identiteten må ikke bruges i analyse eller modeltræning. Anonyme ture forbliver anonyme.
6. Magic link forklares i almindeligt dansk, callbacken hydreres med den faktiske Supabase-bruger, og centrale offentlige RavScore-ord forenkles uden scoreændring.
7. Den lokale 4.0.264-kandidat og kildegaten blev grønne; PR #104 bestod exact-head `32651048627` og blev merged som `579bd167`.
8. Produktion `32651106811` stoppede før release, fordi en gammel fuldtest stadig krævede den fjernede GPS-parallelrejse. PR #105 rettede kontrakten, bestod exact-head `32651724416` og blev merged som `7c43146f`.
9. Produktion `32651786366` stoppede derefter før deploy på en anden gammel ordret test af stjerneforklaringen; den rettede feedbacktest var grøn. Den aktuelle opfølgning retter denne test og en lokalt fundet gammel mobil-turtest og flytter begge ind i `validate:source`. Frisk fuld produktion og live kontrol mangler.
10. PR #106 bestod exact-head `32652894729`, blev merged som `23fa89ed`, og produktion `32652970105` udgav `rr-20260823165645-210` som 4.0.264 på 210/673 efter grøn fuld validering og releasegate.
11. Live konto/login og direkte tur uden GPS/rute blev kontrolleret. Den fulde audit afslørede kun en gammel testetiket: `3-timers trend` mod UI'ets `Vandstandsændring på 3 timer`. Med etiketten rettet bestod 420/2.100/673 uden browser-, konsol-, side- eller HTTP-fejl.
12. PR #107 bestod exact-head `32654048944`, blev merged som `8b758337`, og produktion `32654119745` bestod hele kæden igen og udgav `rr-20260823171804-210`. Den afsluttende rene dokumentationsmerge bruges som bevis for 0 push-produktionskørsler.
13. PR #108 bestod exact-head `32654780774` og blev merged som `98621bf9` med kun håndbog, RDKS, changelog og release-rapport. GitHub oprettede 0 push-produktionskørsler for mergecommitten; rodhåndbogens docs-only-skip er bevist.


## 2026-08-23 – den aktuelle Candidate G-gate afgrænses fra senere prognosehuller

1. 4.0.262 blev exact-head- og produktionsverificeret. Cadencerettelsen fortsatte alle 673 states uden nulstilling og gav 110 positive transportpotentialer mod 0 før rettelsen; 563 var fortsat fysisk nul efter de aktuelle strømforhold.
2. Den offentlige profil stod alligevel på legacy, fordi `candidateWarmupEligible` blev beregnet over hele femdøgnsprognosen. Et senere prognosehul blev derfor fejlagtigt brugt som bevis mod den faktisk viste aktuelle opvarmning.
3. Ejeren bad om en grundig permanent rettelse og en almindeligt forståelig forklaring af både tre-timersfejlen og rollbackrollen efter leverancen.
4. DEC-0062 lader den globale profilgate bedømme memory ved den nærmeste fælles aktuelle scoretid for alle dele i hver zone. Senere huller påvirker fortsat deres egne fremtidige states fail-closed, men slår ikke den aktuelle profil fra.
5. Komplet beregnelig Candidate G-scorecoverage kræves stadig for alle publicerede rækker, og missing eller tidsgab ved den faktisk valgte aktuelle reference vælger fortsat legacy globalt.
6. PR #101 bestod exact-head `32644701811`, blev merged som `9f5953f6`, og fuld produktion `32644772373` udgav live `rr-20260823142247-210` med Candidate G aktiv på 210/673.
7. Den dataminimerede audit bestod 673 fortsatte states, nul reset/replaymismatch og 139 positive mod 534 aktuelt fysiske nultransporter. Aktiv shadow `32645569741` og browser 420/2.100/673 er grønne uden fejl; P0 er lukket.

## 2026-08-23 – ejeren bestiller den systemiske cadence-rettelse

1. Efter bekræftelsen af 673/673 nultransporter bad ejeren om en grundig analyse og implementation af den rette rettelse.
2. Analysen valgte produktionens dokumenterede native marine stride på tre timer som maksimal sammenhængende bevisafstand. Faktisk tid integreres; der opfindes ingen mellemtimer.
3. Et fire-timers eller manglende gab forbliver fail-closed. Ejerens pre-public undtagelse gælder kun et kort, sammenhængende `WINDOW_INCOMPLETE`-vindue.
4. Profilomskifteren får `candidateWarmupEligible`, og shadowen genafspiller kompakt state med aktuel kode.
5. Deterministiske tests er grønne, og dataminimeret replay af den gamle live state giver 110 positive transporter mod 0 før rettelsen. Eksterne leverancegates afventer.

## 2026-08-23 – nultransport afslører cadencefejl efter aktiveringen

1. Ejeren spurgte, om alle transportværdier kunne være startet på 0 efter Candidate G-aktiveringen.
2. En dataminimeret livekontrol af `rr-20260823121818-210` bekræftede 673/673 transportpotentialer og transportkomponenter på 0.
3. 658 dele havde to afledte beviser med tre timers afstand og 15 kun ét. Candidate G accepterer højst én time mellem sammenhængende beviser, så genafspilningen bruger kun den seneste prøve.
4. Den første prøve har nul forløbstid; derfor kan selv en indgående seneste styrke ikke bygge transport. Ved uændret cadence bliver memory aldrig komplet, og scoren retter sig ikke ind over tid.
5. PR #97–99's grønne gates fangede ikke den semantiske cadencefejl. Ingen kode eller rollback blev udført under den read-only kontrol; P0 kræver nu global rollback eller en særskilt testet rettelse.

## 2026-08-23 – Candidate G-aktiveringen produktionsverificeret og lukket

1. PR #97 bestod exact-head `32636378576`, blev merged som `0f7a9d5f`, og fuld produktion `32636433944` gennemførte central hydrering, frisk data, fuld validering, releasegate, central profil-readback og Pages.
2. Live `rr-20260823112726-210` viste Candidate G som aktiv global profil på 210 zoner og 673 kystdele med identisk manifestbinding og nul offentlige kandidat-scoreafvigelser.
3. Den første aktive shadow fandt en for snæver auditantagelse om lovlige non-ready-memory-statusser. Fejlen var i kontrollen, ikke i runtime eller score, og blev ikke omgået.
4. PR #98/merge `fd69f8a0`, produktion `32637387600` og shadow `32637833674` lukkede auditkontrakten grønt på 210/673.
5. Den fulde livebrowseraudit bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og begge jagtformer uden kontrol-, konsol-, side- eller HTTP-fejl. PR #99/merge `328b4d7c` registrerede lukningen.
6. Candidate G er dermed den produktionsverificerede 4.0.261-scoremotor. Naturlig memoryopbygning er driftsevidens, ikke en ny aktiveringsgate; 25/40/35 er eksakt global rollback.

## 2026-08-23 – Candidate G godkendt som gældende under pre-public opvarmning

1. Ejeren afklarede, at RavRadar-siden endnu ikke er offentlig, og at foreløbige scoreværdier i de første 48 timer derfor er acceptable.
2. Ejeren bad Candidate G blive implementeret som den gældende scoremotor nu, ikke først efter 48 timers ventetid.
3. DEC-0060 vælger `RESEARCH-3` med `20/50/30`, mens legacy `25/40/35` bevares som global rollback.
4. Ufuldstændig transporthukommelse må kun passere med den konkrete ejer-godkendte pre-public-konfiguration og skal vises som `candidate-active-pre-public-warmup`; scoreprojektionen skal stadig være komplet i hele datasættet.
5. Profilvalget versionsbindes centralt i `ravscore-profile-selection`, automatisk aktivering forbliver falsk, og én manglende kandidatscore giver global legacyfallback.
6. Modelregler, geometri, land-/vandpunkter og private data ændres ikke. Exact-head, produktion, central readback, aktiv shadow og browserkontrol er leverancegates.

## 2026-08-23 – startværdien erstattet af afgrænset evidens

1. Ejeren afviste, at Candidate G skulle kunne være permanent skæv på grund af den værdi, modellen startede med på en bestemt computer eller produktionskørsel.
2. Neutral startprior 50 blev derfor forkastet. DEC-0059 vælger i stedet et fast, rullende 48-timers vindue, som genafspilles fra samme eksplicitte rand for alle kystdele.
3. Randen 0 betyder “ingen dokumenteret indtransport før vinduet”, ikke udtransport. Kun dokumenteret strøm kan bygge eller nedbryde transporten og udløse 13-timersgaten.
4. Missing og tidsgab behandles ikke som roligt vejr. Candidate G forbliver fail-closed på legacy, indtil hele vinduet igen er sammenhængende.
5. Historisk genafspilning giver nul forskel mellem tænkte starter 0, 50 og 100 for alle 582 komplette vinduer. Ejeren kræver derfor ikke en ny 48-timers realtidsudviklingstest.
6. Candidate G er ikke aktiveret. Offentlig `25/40/35`, geometri, land-/vandpunkter og beskyttede data er uændrede.
7. Exact-head `32633533257`, PR #95/merge `1d848724` og fuld produktion `32633607166` er grønne. Live `rr-20260823102619-210` starter schema 2 fail-closed på alle 673 dele med ét timebevis, 0 ready og legacy aktiv.

## 2026-08-23 – start-0-skævhed fundet efter produktionsshadow

1. Den grønne live-shadow viste 493/673 transporttilstande på 0, men ingen udløst 13-timers udtransportgate.
2. RavRadars eksisterende offentlige historik blev genafspillet uden nye kildedata: 42.551 poster, 633 dækkede dele og 65–117 timers tidsdybde.
3. Start 0 gav fortsat median 0. Kun 6/633 dele blev uafhængige af start 0 kontra 100, og 607/633 bevarede mindst 50 points forskel.
4. Historikken kunne dermed ikke vælge startreserven under den daværende ubundne regel uden passivt neutralt tab. Den efterfølgende anbefaling om neutral prior 50 er erstattet af DEC-0059's faste 48-timers evidensvindue.

## 2026-08-23 – 4.0.260 produktionsverificeret uden Candidate G-aktivering

1. PR #92 bestod exact-head `32628441062` på `eabf7e8b` og blev merged som `c5898ce8`.
2. Produktion `32628516066` bestod central hydrering, frisk DMI/fallback, fuld validering, releasegate, Supabase, artifact og Pages og udgav `rr-20260823083627-210`.
3. Den dataminimerede liveaudit bestod 210/673/1.346 med 673 accepterede tilstande, nul nulstillinger og nul rekonstruktionsfejl. Reference 09:00Z dokumenterer 9/9 timers alder fra bootstrap 00:00Z; det er ikke et 48-timersbevis.
4. Browserauditten bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden fejl.
5. Candidate G var score-neutral og automatisk aktivering falsk. Shadowen lå væsentligt lavere end aktiv score og skal derfor gennemgås særskilt med ejeren før en eventuel senere aktiveringsversion.

## 2026-08-23 – nattens state accepteret og scoreomskifter forberedt

1. Den naturlige Candidate G-state fortsatte til fælles reference 06:00Z i den offentliggjorte runtime `rr-20260823075018-210`.
2. Den dataminimerede kontrol bestod 210/673/1.346, accepterede alle 673 tidligere tilstande og nulstillede ingen. Yngste og ældste dokumenterede alder er seks timer.
3. Ejeren besluttede, at nattens forløb er nok praktisk evidens til at fortsætte. Perioden må ikke beskrives som et 48-timersbevis.
4. DEC-0058 forbereder en særskilt versionsbundet omskifter med offentlig `25/40/35` som fortsat aktiv profil og eksakt rollback.
5. Candidate G kan ikke aktiveres automatisk eller delvist. Komplet dækning, frisk slutshadow og særskilt ejer-gennemgang kræves stadig.


## 2026-08-19 – scheduler overdraget og næste browservej fastlagt

1. Ejeren bekræftede, at RavRadar-jobbene i cron-job.org er slettet.
2. Naturlig GitHub-produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og Copernicus-pilot `#32273634626` bestod efter sletningen. GitHub er dermed eneste normale scheduler.
3. Live `rr-20260819155614-210` blev sikkert auditeret for 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdøgnsvalg og 673 pile ved præcis 673/673.
4. Den private cache nåede 30 gyldige timer og 18.870 poster med 625 mål, 629 mål/kilde-par og nul gitter-/lagustabilitet. Det fulde naturlige 168-timersvindue forbliver åbent og kontrolleres højst dagligt.
5. Ejeren besluttede, at næste systematiske online DOM-/kliktest først forsøger Browser-plugin og målrettet diagnostik. Hvis der ikke findes en konkret reparationsvej, må Chromium/Playwright bruges som fallback for alle 210 zoner og 673 dele. Ingen land-/vandpunkter må ændres i kontrollen.

## 2026-08-19 – én lokal visningskontekst

1. Den systematiske Chromium-audit viste, at lokale scoredata var korrekte, men zonepanelet blandede dem med hovedzonens synlige vejr og et andet femdøgnstidsvalg.
2. Ejeren krævede en systemisk rettelse for alle 210 zoner og 673 kystdele uden ændring af de centralt godkendte land-/vandpunkter.
3. DEC-0044 fastlægger én fælles lokal visningskontekst for del, tid, score, forklaring, debug og vejr samt eksplicit samlet hovedzonefallback ved reel lokal mangel.
4. 4.0.235 implementerer samme lokale `selectLocalBestForDay` i national prognose og zonepanel og bærer vinderdelens kompakte præsentationsgrundlag pr. fælles time.
5. Den syntetiske landsregression består for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger. 4.0.235 blev centralt/runtimeverificeret, og den efterfølgende zonevise tidslås i 4.0.237 blev produktionsverificeret i `#32264833170` og live `rr-20260819143933-210`. Kun den faktiske visuelle online DOM-/kliktest afventer; Browser-plugin forsøges først, og Chromium/Playwright er godkendt fallback.

## 2026-08-19 – GitHub-ejet produktion og Supabase-timeout

1. Ejeren konstaterede gentagne røde 15-minutterskørsler og bad om både timeoutrettelsen og Supabase-rettelsen samt om at flytte startansvaret fra cron-job.org til GitHub.
2. Actions-evidensen delte fejlene i to: ved timeskift manglede den nye eksakte Copernicus-time og produktionen stoppede på 630/673; senere fulddækkede runs kunne stoppe på Supabase/PostgreSQL `57014` ved den store runtime-diagnostik.
3. DEC-0042 forskyder GitHub-produktionen til minut 14/29/44/59, piloten til minut 6 og kræver en readiness-gate uden artifact/deploy ved manglende time. cron-job.org slukkes først efter naturligt schedule-bevis.
4. DEC-0043 bevarer den komplette diagnostik tabsfrit som gzip/base64 med SHA-256 og byteantal under samme beskyttede nøgle. Den repræsentative payload falder fra 4.014.169 til 208.874 byte.
5. Commit `7409d461` og pushrun `#32237507059`/`#3202` bestod fuld validering, releasegate, 673/673, Supabase og Pages. Naturligt schedule `#32244914347`/`#3210` bestod også; senere naturlige events er grønne for produktion `#32262008874`, pilot `#32262250342` og cachebevaring `#32262276171`. Kun ejerens faktiske deaktivering af cron-job.org mangler.

## 2026-08-18 – supplerende strøm og afgrænset Limfjordsproxy

1. Ejeren afsluttede den manuelle rettelse af land-/vandpunkter og vandstandsrouting. Frisk central #3079 gav 622/673 lokale DMI-strømpunkter; alle 51 mangler blev auditeret.
2. Direkte officielle gittertests fandt fælles bundnære Baltic U/V-par inden for 5 km til 39 mangler og AMM15-par til yderligere fire vestkystpunkter. To AMM15-celler havde kun 0 m som dybeste tilgængelige lag.
3. Otte resterende modelhuller lå i den vestlige Limfjord. Nærmeste observerede `dkss_lf`-par lå 5,416–12,110 km væk.
4. Ejeren besluttede, at disse otte hellere skal bruge nærmeste tilgængelige strøm end stå uden strøm, og oprettede en gratis Copernicus-konto samt de to påkrævede GitHub Actions-secrets.
5. DEC-0041 fortolker beslutningen fail-safe som en eksplicit allowlist og et 15-km-loft, som dækker alle otte uden at skabe en global ubegrænset regel. Alle øvrige dele og alle Copernicus-kilder beholder 5-km-grænsen.
6. En separat privat pilotkandidat bruger den officielle Toolbox, friske centrale punkter, samme-celle/-tid/-lag U/V, nul interpolation, 168 timers retention og sikre reports uden credentials eller rå vektorer. Lokal test består; autentificeret CI og aktiv integration afventer.
7. Commit `0c010090` blev fast-forwardet til `main`. Autentificeret run `#32129799346` bestod og bekræftede 39 Baltic + 4 AMM15 af de 51 DMI-huller. De sidste otte var præcis Limfjordsallowlisten. Pushrun `#32129778162` stoppede ved den daværende dækningsgate på DMI's 622/673 uden deploy. Piloten blev derefter sat til privat timeopsamling med syv døgns retention.
8. Første cron `#32134686185` hentede 12:00Z, men cirka 10,2 GB DMI-domineret Actions-cache havde LRU-fortrængt 11:00Z. En restore-only keepalive blev valgt frem for artifact i det offentlige repository. #32136328681/#32136391556/#32136642330 beviser keepalive, kontrolleret backfill og en samlet 11/12 UTC-cache med 1.258 records uden supportlæk.
9. En efterkontrol viste, at “100 %-gaten” endnu kun stod i beslutningshukommelsen; koden brugte fortsat historiske 95 %/640. 4.0.232 gør kravet reelt og dynamisk: alle aktive kystdele, aktuelt 673/673, skal have verificeret strøm før release.
10. Commit `406353be` tilføjede en renset historikaggregation. Run `#32131021153` gendannede og deduplikerede første times 629 records, rapporterede 625 unikke mål samt nul grid-/lagskift og bestod rekursiv rå-U/V-afvisning. Fordi begge runs brugte 11:00Z, var der fortsat kun ét selvstændigt tidspunkt; første cron-event afventede.
11. Commit `9e2164b8` gjorde 100 %-kravet reelt. Central #32139054129 bestod regressionen, stoppede med “622/673; alle 673 kræves” og sprang releasegate, Supabase og Pages over.
12. GitHubs keepalive-cron leverede stadig intet event før #32139054129 gemte endnu en stor DMI-cache. #32139755594 fandt Copernicus-cachen væk. Produktionsjobbet fik derfor en restore-only pre-DMI-refresh, så den lille private cache røres umiddelbart før den cacheaktivitet, der kan udløse LRU-fortrængning.
13. #32140001424/#32140470201 genopbyggede 11/12 UTC kontrolleret. Det rensede slutartifact bekræfter igen 1.258 records ved to tider, 625 unikke mål og nul grid-/lagskift uden rå U/V- eller credentiallæk.
14. `b6cf0383`/#32140865173 ramte to-timers-cachen før DMI og bevarede den gennem en ny 2,905-GB DMI-save. Regressionerne bestod, 622/673 blev fortsat afvist, og #32141443152 ramte samme cache efterfølgende. LRU-beskyttelsen er dermed centralt bevist; næste naturlige pilot skal udvide tidsserien.
15. Manuel aktuel-time-pilot #32141772134 tilføjede 13:00Z uden backfill og gav 1.887 records ved tre tider med nul grid-/lagskift og nul supportlæk. Senere naturlige pilot- og cachebevaringsruns `#32262250342` og `#32262276171` er grønne; det fulde naturlige 168-timersvindue afventer fortsat.
16. Mens naturlig drift opsamles, blev syvdøgnsgrænsen gjort til en normal release-regression: præcis 168 timer bevares, beskadigede/ældre/fremtidige restoreposter fjernes, dubletter samles, og nye ugyldige poster stopper lukket. Det naturlige fulde syvdøgnsvindue afventer stadig.
17. `7f22e8e1`/`#32143798560` beviste retentionregressionen centralt. Den bestod sammen med 100 %-kontrakttesten; den faktiske 622/673-audit forhindrede Supabase/Pages, og tre-timers-Copernicus-cachen overlevede igen DMI-cachearbejdet.
18. GitHub leverede fortsat ingen nye native timeevents. Keepalive blev derfor koblet til `requested` fra den allerede eksternt startede produktionskørsel. Den gendanner read-only, kontrollerer aktuel UTC-time uden rå log og dispatcher kun den private pilot ved en manglende time. Lokal fail-closed regression består; central automatisk hændelseskæde afventer første pushbevis.
19. Forsinket native `#32146584311` tilføjede 14 UTC og gav fire tider/2.516 records uden stabilitets- eller lækagefejl. Automatisk heartbeat `#32146699458` ventede på samme concurrencygruppe, ramte cachen og sprang dubletdispatch over. Manglende-time-grenen afventer næste UTC-time.
20. Pushrun `#32146695718` bestod heartbeat-, cache-, retention- og fulddækningsregressionerne centralt. Faktiske 622/673 stoppede fortsat releasegate, Supabase og Pages.
21. Efteraudit af dubletreglen viste, at “timen findes” ikke beviser, at den blev hentet til de nuværende centrale vandpunkter. 4.0.232 binder derfor hver afsluttet time til SHA-256 af alle del-ID'er/parentzoner/vandpunkter og et eksakt recordantal. Flyttet punkt, legacycache eller ufuldstændig time genindsamles samlet; lokal regression består, central migration afventer.
22. `#32149556595` fandt automatisk legacycachen og kørte dispatchjobbet. Den startede pilot `#32149592195` hydrerede 673 punkter, genindsamlede 14 UTC og gemte ny manifestcache med fire tider/2.516 records uden læk. `#32149552657` bestod de nye normale regressioner og stoppede igen på 622/673 før release/Supabase/Pages.

## 2026-08-16 – 4.0.229 strømsted, bundlag og privat feltgrundlag

1. Ejerens kortkontrol viste blå strømpile over land og krævede bevis for både placering og den anvendte strøm.
2. Kodeauditen fandt en systemisk fejl: dybeste U/V-lag blev foretrukket på tværs af forskellige koordinater, så et dybt punkt 12–24 km væk kunne vinde.
3. Ejeren besluttede rækkefølgen nærmeste gyldige vandkolonne → dybeste gyldige lag i samme kolonne, med 3 km foretrukket og højst cirka 5 km.
4. Ejeren besluttede samtidig, at senere scoreforskning skal omfatte strøm længere ude og hele transportkæden, og at et privat syvdøgnsgrundlag må startes nu uden scorepåvirkning.
5. 4.0.229 implementerer semantik v2, cacheinvalidering, eksakt provenance, en privat roterende 0/5/15-km flerlagscache og fail-closed afvisning af ForecastEDR-, Open-Meteo- og anden fallbackstrøm uden kolonne-/lagbevis. Lokal releasegate består; produktionsbevis afventer.
6. Første produktionsforsøg #31919296190/#2846 gennemførte den friske DMI- og forskningsopsamling, men stoppede i fuld audit før Supabase/Pages. Artifactet viste, at DMI legitimt kan skifte dybeste tilgængelige lag mellem native tider; auditten havde fejlagtigt krævet ét lag for hele serien.
7. Kontrakten blev præciseret til lagvalg pr. native tid og nul interpolation på tværs af lag, celle eller modelkørsel. Replay bevarer 11.400 verificerede hovedzone-prognosetimer og placerer alle 353 viste lokale pile på den viste times provenienspunkt.
8. Samme replay afdækkede, at centralt flyttede kystdelspunkter først blev bygget efter DMI-sampling. Workflowrækkefølgen og cachemigrationen blev rettet, så aktuelle centrale punkter samples først, og kun faktisk flyttede punkter nulstilles.
9. Den private rotation fortsatte gennem #2863–#2872 med stabil råcache, 168-timers retention og afstandsklassifikation uden rå U/V-værdier i ejeroversigten.
10. #2872 fandt Havknude som den første offentlige mangel med et faktisk fælles U/V-punkt inden for 5 km: NSBS 2,804 km fra vandpunktet. Offentlig v2-runtime var stadig `missing`.
11. Rodårsagen var et fælles `marineSelection`, hvor et IDW-skalarpunkt 5,131 km væk med bedre kysttypeprioritet blokerede den nærmere NSBS-strøm.
12. 4.0.230 indfører semantik v3: strøm vælges pr. native tid på tværs af DKSS-collections og uafhængigt af skalare marinefelter. Parser v18 tvinger selektiv strømgenopbygning; RavScore, punkter og gate er uændrede. Produktionsbevis afventer.

## 2026-08-15 – 4.0.208
1. Tre Vadehavszoner blev gentagne gange vist som manglende i lokal validering.
2. Direkte read-only produktionskontrol viste 210/210 matchende zoner og komplette vejrposter til alle tre; symptomet var ikke en produktionszonefejl.
3. Rodårsagen blev afgrænset til et indchecket 31. juli-snapshot og forskellen mellem råt repositoryregister og central admin-/tombstonesandhed.
4. Valideringen forbliver fail-closed, men beskriver stale lokaldata korrekt og tilbyder en read-only deployaudit.
5. RDKS, roadmap, kendte issues, changelog og begge håndbøger blev opdateret.
6. #31848912461 produktionsverificerede commit `7a3382f`: central adminhydrering/tombstones, frisk vejr, fuld validering, releasegate, Supabase, artifact og deploy bestod. Direkte efterkontrol viste 4.0.208 og 210/210 med alle tre Vadehavszoner.

## 2026-08-12 – 4.0.183
1. Ejerens kortkontrol dokumenterede fortsatte sorte markeringer inde i hovedzoner, for store skel ved landszoom og manglende Danmarksoverblik efter lukning af en zone.
2. Kortet blev ændret til ét delt skel mellem forskellige hovedzoner og zoomafhængig størrelse.
3. Admin-redigering af hovedzonelængde blev koblet til flytning af eksisterende, verificerede kystdele, så geometri og lokale data følger samlet med uden nye overlap.

Rækkefølgen er udledt af tekstens indhold, versionsnumre, funktionsudvikling, henvisninger til tidligere arbejde og eksplicitte datoer. Filnavne og redigeringshistorik er ikke brugt som kronologisk bevis.

## 2026-08-08 – 4.0.122 produktionsverifikation
1. #1845 gennemførte frisk DMI, fuld validering, release-gate, artifact og Pages-deploy som `success`.
2. Det offentlige datasæt `rr-20260808124116-208` viste 208/208 zoner med 118 sammenhængende vindtimer.
3. De fem tidligere zoner uden fælles DKSS U/V-gridpunkt er fortsat et provenanceaudit, ikke en offentlig vinddækningsfejl.

## 2026-08-08 – 4.0.121 workflowoprydning
1. Det aktive workflowinventar blev sammenholdt med kode, regressionstests, release- og recoveryprocedurer.
2. `schedule-test.yml` og `pages-microtest.yml` blev bekræftet som historisk diagnostik og fjernet.
3. `update-and-deploy.yml` blev bevaret som produktionsworkflow, mens GitHubs `pages-build-deployment` udtrykkeligt blev afgrænset som platformsmekanisme.

## 2026-08-08 – 4.0.120 komplet offentlig vindhale
1. #1833/#1835 roterede NSBS og LF og gav vind i alle 208 zoner; fem zoner manglede fortsat DKSS-hale.
2. Supportdata afgrænsede de fem som reelle `NO_SHARED_UV_GRID_POINT`, ikke schedulerudsultning.
3. Vandstandsrouting overskrev den blandede offentlige serie med DMI-cachen og slettede fallback.
4. Open-Meteos fem kalenderdage mistede dagens allerede forløbne timer; forespørgslen er ændret til 120 fremtidige timer.
5. Rettelsen er score-neutral og blev produktionsverificeret i GitHub Actions #31572312647.

## CHAT-0001
- **Kilde:** chat 1.txt
- **Forløb:** 2026-07-20 til projektets version 28
- **Funktion i historien:** Projektets opstart: gratis vandstandsprognose, første kort, zoner, scoring og den første retnings-/diagnostikfase.

## CHAT-0002
- **Kilde:** chat 7.txt
- **Forløb:** Efter version 28 til version 53 / 4.0.5
- **Funktion i historien:** Retningsaudit, DMI-cacheopbygning, zoner, scorer, diagnostik, administration og overgang til 4.0-serien.

## CHAT-0003
- **Kilde:** chat 2.txt
- **Forløb:** Version 54 til 66 / omkring 4.0.12
- **Funktion i historien:** Datakvalitet, kildegennemsigtighed, DMI-prioritet, forecastfiler, runtime-diagnostik og filarbejdsgang.

## CHAT-0004
- **Kilde:** chat 5.txt
- **Forløb:** Version 68 til 82 / 4.0.13–4.0.21
- **Funktion i historien:** DMI-bulkmodeller, marine dækning, observationer, stationer, Frederikshavn-mismatch og cachearbejde.

## CHAT-0005
- **Kilde:** chat 3.txt
- **Forløb:** Version 83 til 95 / 4.0.22–4.0.35
- **Funktion i historien:** Weather engine, GitHub-kørsler, stationsregister, zoneregister, Supabase og oprydning af gamle zoner.

## CHAT-0006
- **Kilde:** chat 6.txt
- **Forløb:** Version 96 til 111 / 4.0.35–4.0.49
- **Funktion i historien:** Langtidssundhed, kysteditor, admin, regler, scorepræsentation, stationsrouting og brugervenlighed.

## CHAT-0007
- **Kilde:** chat 4.txt
- **Forløb:** Version 112 til 4.0.52
- **Funktion i historien:** Havmarkør-afklaring, korrekt afgrænsning af ændringer, regelbygger, RDKS og stationers livscyklus.

## Sikkerhed ved fortolkning
Kronologien er stærk, fordi versionsforløbene overlapper sammenhængende: 1–28, 28–53, 54–66, 68–82, 83–95, 96–111 og 112–4.0.52. Et mindre hul omkring version 67 ændrer ikke rækkefølgen. Historiske forslag er bevaret i kildeteksterne, men kun aktive RDKS-poster styrer fremtidigt arbejde.

## 2026-08-06 – 4.0.113
Fem sammenhængende produktionskørsler afslørede, at samme ugentlige GitHub-cache blev gendannet og aldrig opdateret efter primary-key hit. Progressiv cache og streng referencezonevalidering blev implementeret uden scoreændring.

## 2026-08-06 – 4.0.114 til 4.0.115
- 4.0.114 blev efter gentagne Pages-timeouts til sidst publiceret og bestod sitetest 19/19.
- Releasekædens build/deploy-opdeling blev dermed produktionsbekræftet.
- Den efterfølgende faglige analyse viste, at transporthistorikken skulle bindes til den endelige DMI-proveniens og at akkumuleret varighed ikke måtte forveksles med et ubrudt forløb.
- 4.0.115 indfører score-neutral `shadow-v2` med verificerede strømprøver og særskilt aktivt regime.

## 2026-08-07 – 4.0.116
- 4.0.115 nåede ikke produktion, fordi den strenge DMI spatial-audit afslørede en ældre latent U/V-gridfejl.
- 4.0.116 parrer strøm og vind på samme fysiske DMI-gitterpunkt, invaliderer gamle mismatch-par og reducerer unødige opslag på vandstandskilder.
- Manglende vind/bølger forbliver `null`/`Mangler` i stedet for at kunne fremstå som 0,0; ægte nulværdier bevares.
- `shadow-v2` er fortsat score-neutral.

## 2026-08-07 – 4.0.117 stabilisering og Codex-overgang
1. Schedulerens aktive-zone- og DMI-vindlogik blev korrigeret i 4.0.117.
2. Fejlede produktioner afdækkede DKSS-geografisk recovery og derefter en dybere U/V-vertikallagsfejl; tidligere søge-radiusdiagnose blev markeret utilstrækkelig.
3. Parsergeneration 11 isolerede current-U/V efter vertikallag og krævede fælles lag/gridpunkt.
4. Administratoren konstaterede forkert geometri i tre Limfjordszoner og korrigerede kystlinje samt land-/havpunkter centralt.
5. Efterfølgende #1749 og især frisk #1750 kørte succesfuldt på commit `6c1dece…`; #1750 bekræftede central geometri-propagation.
6. Forecast-edge `missing` blev bevaret som separat aktivt dækningsissue.
7. CHAT-0014 og en samlet AI/Codex-dokumentationspakke blev oprettet før videre udvikling.

## 2026-08-07 – korrigeret Codex-overgang efter #1760
1. Efter #1758 blev fire yderligere zoner manuelt rettet i admin, fordi deres kystlinje/land-/havpunkter var geografisk forkerte: Fur syd, Gjøl og Attrup, Aalborg vest og Egholm samt Aalborg øst og Nørresundby.
2. #1760 kørte efter de endelige adminrettelser på `a164b6e…` og deployede succesfuldt.
3. Gennemgang af step-status viste, at de to fulde releasegates var `skipped` i #1760. Dermed blev det bevist, at en almindelig automatisk `workflow_dispatch` kan være grøn og deploye uden fuld releasevalidering.
4. Tidligere formulering om #1749/#1750 som aktuel stabil Codex-baseline blev derfor trukket tilbage. De er historisk evidens, men ikke bevis for den nuværende handoff-kode og endelige adminstate.
5. Den sidste pre-Codex ZIP bruges kun til at få den komplette projektviden ind i det lokale/repository-baserede arbejdsmiljø. Workflowbypasset bevares midlertidigt i denne bootstrap og skal lukkes af Codex som første kodeopgave.

## 2026-08-08 – 4.0.118 DMI-first vindhale
1. Den officielle kildeaudit fastslog HARMONIE som primær korttidsvind og DKSS 10-meter U/V som egnet DMI-hale mod fem døgn.
2. Parsergeneration 12 udtrækker DKSS-vinden i separate felter og kræver et fælles fysisk U/V-gitterpunkt.
3. HARMONIE vinder i overlap; interpolation sker aldrig på tværs af HARMONIE/DKSS-grænsen.
4. Open-Meteo fallback bruger nu entydige GMT/UTC-tider.
5. Implementeringen og målrettede regressionstests er lokale; frisk produktionsdækning og releasekæde skal stadig bevises.

## 2026-08-08 – 4.0.119 DKSS-vindhale repareret
1. #1828 bestod releasekæden, men havde ingen dokumenteret DKSS-vindhale.
2. Parameter 34 blev fejlmærket `sst` og forkastet som tvetydig.
3. DMI's lokale id er gjort autoritativt; parser/parameterkort er 13/4.
4. Schedulerens DKSS-plads roterer efter manglende U/V-vindhale pr. valgt marinecollection.
5. #1831 genkendte begge DKSS U/V-felter, gav 107 vindhalezoner ≥96 timer og gennemførte validate, release gate og deploy.
6. Det offentlige datasæt havde 200/208 zoner med vind, 108/208 ≥96 timer og maksimum 111,5 timer; videre automatiske runs skal rotere LF/NSBS og lukke de resterende huller.

## 2026-08-23 – 4.0.259 central Candidate G-kandidat

1. DEC-0055/0056's afledte transport- og mobiliseringstilstand blev koblet til den centrale kystdelspipeline ved den fælles aktuelle referencetime.
2. En versions- og konteksthash forhindrer, at tilstand bæres over ændret model, profil, vandpunkt eller kystretning; kun kompakte afledte værdier persistéres.
3. Same-time-rekørsel blev gjort til eksplicit hold, så en ændret prognose i samme time hverken tæller dobbelt eller nulstiller et udtransportforløb.
4. Candidate G offentliggøres diagnostisk med rekonstruerbare 20/50/30-bidrag, men aktiv `25/40/35` og UI er uændrede.
5. Den manuelle shadow blev omlagt fra native-only genhentning til fallback-kompatibel audit af den faktiske 210/673-runtime. Første produktion er bootstrap fra 0 og kan ikke i sig selv bevise en modnet 48-timersfordeling.
6. Exact-head `32609888406` bestod på `337466b5`; PR #89 blev merged som `31e50acb`.
7. Produktion `32609952992` bestod central hydrering, frisk data/proveniens, fuld validering, releasegate, Supabase, artifact og Pages. Live er 4.0.259/`rr-20260823011924-210` med 210 zoner og 673 dele.
8. Read-only shadow `32610281620` bestod 1.346 modeevalueringer uden rekonstruktionsfejl. Alle 673 tilstande var forventet bootstrap; næste trin er naturlig state-alder, ikke offentlig aktivering.

## 2026-08-08 – DEC-0031 model- og kvotestyring
1. Jakob fastlagde, at kvalitet går foran kvotebesparelse, men at Sol ikke skal bruges til rutinearbejde af bekvemmelighed.
2. Codex fik ansvar for både at anbefale billigere model og senere kræve skift tilbage til Sol før kritiske opgaver.
3. Kvoteudløb kræver dokumenteret checkpoint frem for reduceret analyse eller validering.
4. Den planlagte videnskabelige RavRadar-/RavScore-analyse er som udgangspunkt Sol-arbejde; afgrænsede mekaniske støtteopgaver kan udføres billigere.
## 2026-08-11 – 4.0.182 frigivelseskandidat
- Godkendt slutgeometri aktiveret lokalt: 212 hovedzoner, 206 præcise, 6 fallback og 643 interne dele.
- Nul tværzoneoverlap og nul uafklarede relevante huller; Vadehavets fastlandskyst er med.
- Private DMI- og central-admin-gates er grønne. Fuld release og onlinekontrol udestår.
## 2026-08-12 – 4.0.184-kandidat

1. Ejeren dokumenterede Reersø og Mullerup som grøn med RavScore 78, mens zonepanelet viste `–/100` og “ikke nok data”.
2. Produktionsruntime viste korrekt vinder `Mullerup Klint`, score 78 og komplette delscorer; UI havde bevidst erstattet disse med tomme objekter.
3. Hele runtime blev auditeret: 643 dele, 206 hovedzoner og 412 aktuelle zone-/jagtformsresultater havde konsistent score, vinder og delscoredata.
4. En fælles lokal resultatbygger og tydelig geografisk forklaring genopretter den tidligere funktion med uændret grænse på mere end 7 point.
# 4.0.185 – lokalt delkort og fjernet offentlig fundformular
- “Hvor er det?” blev bygget som et behovsstyret lag på det eksisterende hovedkort med navngivne kystdele og automatisk zonezoom.
- Den offentlige “Hvad fandt du?”-formular blev fjernet; turbaseret observation og bagvedliggende adminanalyse blev bevaret.
## 2026-08-22 – 4.0.258 Candidate G vindstyret waders-jagtbarhed

- Ejerbeslutning: privat analyseprior `20/50/30`, vindkurve med nul ved 15 m/s og WAM-bølger kun som blødt fradrag på højst 20 point.
- DEC-0054 og `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED` erstatter den tidligere reviewvariant, men ændrer ingen offentlig score.
- 1.460-evalueringsreplay og kanoniske/nationale self-tests består uden nye rådata, geometri eller punktændringer.

## 2026-08-22 – Candidate G strømstyret transportpotentiale

1. Ejeren præciserede, at strømmen transporterer ravet, mens bølger højst hjælper det sidste stykke over revle eller op på strand.
2. Fuld udgående strøm skal reducere potentialet fra første time med 8 point pr. effektiv time og nå 0 ved 13 timer; fuld indgående strøm bygger mod 100 over cirka 10 timer.
3. Den nye private variant og nationale shadowkontrakt implementerer retningen uden at ændre offentlig `25/40/35`.
4. Replayet viser korrekt mekanik, men også stor følsomhed over for strømgrænsen og reservoirværdien ved start. DEC-0055 holder derfor aktiveringen lukket.
5. Ingen nye rådata, geometri, land-/vandpunkter, artifact eller protected-dirty-data er ændret.

## 2026-08-22 – Candidate G 24/48-randkontrol

1. Neutral passiv halvering på 24 og 48 timer blev implementeret som valgfri diagnostic-only følsomhed; den godkendte ind-/udtransportkurve og missing-pause er uændret.
2. Start-0-scoren flytter -1,182/-0,697 point, men warm-start-kontroller viser fortsat væsentlig randfølsomhed.
3. Alle 12 eventvinduer har præcis 24 timers forhistorie og nul har 48/72 timer; de kan derfor ikke vælge fysisk levetid.
4. Referencegrænsen har ingen fuldstyrkeevalueringer, og lavere profiler har kun sparsom fuldstyrkedækning uden fundlabels; strømgrænsen forbliver ukalibreret.
5. Ingen offentlig score, nye rådata, geometri, punkter eller artifacts er ændret.
6. Exact-head `32599255165` bestod på `ed1f0297`, PR #77 blev merged som `75ed93d6`, og produktion `32599309735` leverede `rr-20260822212612-210` med 210 zoner og 673/673 dele uden Candidate G-aktivering.

## 2026-08-23 – Candidate G udtransportgate afgjort score-neutralt

1. Ejeren har afgjort, at dokumenteret faktisk kraftig udtransport med udtømt transportpotentiale skal sætte den interne Candidate G-slutscore til 0.
2. Mobilisering og jagtbarhed beregnes og bevares som synlige komponenter; reglen er derfor ikke en påstand om, at disse forhold også er nul.
3. Startpotentiale 0 uden faktisk udtransport, missing, neutral strøm og svag modstrøm må ikke udløse gaten.
4. Den bindende forklaring er: `På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`.
5. Adfærden versionsbindes som `RRS-CANDIDATE-G-CURRENT-LED-OUTFLOW-8-RESEARCH-2`; `RESEARCH-1` bevares som revisionsspor. Offentlig RavScore og automatisk aktivering er uændret.
6. Exact-head `32604792201` bestod på `f6458f09`, PR #84 blev merged som `800a93cb`, og fuld produktion `32604850884` leverede live `rr-20260822232159-210` med 210 zoner, 673 dele og samme datasæt-id i manifest/start/detaljer.

## 2026-08-23 – første naturlige Candidate G-statefortsættelse

1. Schedule `32613284735` kørte naturligt på `main`/`600e8a45` og bestod frisk data, fuld validering, releasegate, artifact og Pages.
2. Live `rr-20260823023951-210` består den dataminimerede 210/673-shadow med 1.346 modeevalueringer og nul rekonstruktionsfejl.
3. Alle 673 tidligere tilstande blev accepteret, og ingen blev nulstillet. Referencetiden gik fra 00:00Z til 03:00Z, så dokumenteret yngste og ældste naturlige state-alder er 3/3 timer.
4. Candidate G er fortsat diagnostic-only; offentlig `25/40/35` og aktiveringsforbuddet er uændret. 48-timersslutshadow udestår.

