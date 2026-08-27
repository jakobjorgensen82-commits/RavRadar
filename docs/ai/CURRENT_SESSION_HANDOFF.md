# RavRadar - aktuelt Codex-handoff

## AKTUELT P1-CHECKPOINT – 2026-08-27 – offentlig GPT-OSS-aktivering i 4.0.291

- Ejeren har udtrykkeligt godkendt, at **Spørg RavRadar** sættes i offentlig drift nu.
- Cloudflare-dashboardet viser Workers **Free** som aktuel plan, $0, 10.000 neuroner/dag og cirka 4.930/10.000 brugt efter evals. Officiel Free-adfærd er fejl efter loftet; Paid/upgrade/prepaid overflow er forbudt.
- 4.0.291 viser en DA/DE/EN-kvotebesked inde i assistentdialogen og forklarer, at prognoser og lokale RavRadar-svar fortsætter, når dagens AI-kvote er brugt.
- Det offentlige flag er klargjort som `ravAssistantRemoteEnabled=true`, mens `false` forbliver rollback. Regressioner dækker remote-succes, `429`-fallback, ingen providercredential i browseren og fortsat lokal afvisning/routing.
- Den versionsstyrede GPT-OSS Edge og begge server-secrets er nu installeret. En første fail-closed `503 BOOT_ERROR` skyldtes, at browsereditoren havde lagt ny Monaco-tekst foran gammel kilde; atomisk erstatning af de tre filer rettede startfejlen. Live-smoke består nu CORS/OPTIONS, fremmed Origin, ugyldigt sprog, lokal rouladeafvisning, DA/DE/EN-providerkald og den reelle 6/minut-grænse med `429` på syvende kald. Promptordlisten alene stoppede ikke danske eller tyske hybridord, så en snæver deterministisk fagordsnormalisering er tilføjet og skal gennem ny exact-head/Edge-smoke. Ét samtidigt engelsk kald fik fail-safe `503 RATE_LIMIT_UNAVAILABLE` og skal gentestes sekventielt. Browserfallback og produktion mangler fortsat før lukning.
- Arbejdet foregår på `codex/activate-assistant-4.0.291` fra eksakt `origin/main` i den isolerede Codex-worktree. Rod-worktree, `.recovery-*`, private data, geometri og land-/vandpunkter er urørte. Se DEC-0088.

## AKTUELT P1-CHECKPOINT – 2026-08-27 – produktionsverificeret 4.0.290 DA/DE/EN og deaktiveret GPT-OSS Edge

- Den komplette offentlige oversættelse er implementeret i den isolerede worktree: ét centralt katalog, dansk standard/fallback, stabile nøgler/parametre, localeformatering og lokalt husket valg med CSS-tegnede flag plus Dansk/Deutsch/English.
- Hovedside, aktuelle/femdøgnsstatusser, kort-/områdepanel, konto/login, turformularer, lokal assistent, hele **Om RavRadar** og alle 12 sektioner i **Grundbog i ravjagt** følger locale. Admin-, ekspert-, PIN-, debug- og interne flader er fortsat danske.
- Spørg RavRadar afviser roulade, opskrift, fodbold og sikkerheds-/credentialforsøg før fjernkald; bedste sted/tid/score forbliver lokale Candidate G-funktioner. Kun ravrelevant ukendt fri tekst kan blive remote-kandidat. Offentlig `ravAssistantRemoteEnabled=false` er uændret.
- Ejeren har valgt Cloudflare `@cf/openai/gpt-oss-20b` til den kommende gratis fjernfunktion. Gemini 3.5 Flash-Lite 27/27 bevares kun som kvalitetsreference, fordi gratis offentlig EØS-brug ikke er tilladt under aktuelle vilkår. GLM og Gemma blev stoppet efter ikke-evaluerbare smoke-svar.
- GPT-OSS bestod smoke 1/1, den målrettede tidligere-fejl-gate 4/4 og 25/26 evaluerbare svar i den fulde 27-case-suite. Median/p95 var 1.406/2.933 ms; 26 rapporterede svar brugte 32.835 tokens og estimeret mindst 623,63 neuroner. `de-waders` overskred kun længdegrænsen, og `en-open-travel` timeoutede; begge skal fejle lukket i Edge, og rejseemnet skal afvises før provider.
- Brugbare svar krævede Cloudflare `json_object`, rekursiv kontrolleret payloadudtrækning, fem faste outputfelter, 800 completion-tokens/low reasoning, eksplicit disposition- og evidenssemantik med konkrete Candidate G-eksempler samt smoke → 4-case mål-gate → fuld eval. Fri tekst, ukendt schema og det fejlede direkte `json_schema`-spor må ikke genindføres.
- Den fortsat deaktiverede server-side GPT-OSS-adapter er implementeret med Cloudflare-secrets kun på serveren, lokal og server-side domænegate, allowlistet kontekst, CORS, 6/minut, 40/time og 300/dag, syv sekunders timeout, `json_object`, rekursiv udtrækning, eksakt femfeltsvalidering, evidens-/locale-/længdekontrol samt lokal fallback/rollback.
- Målrettet offlineeval, i18n-/assistent-/Edge-/sikkerhedstest, konto-/turkontrakter, 210/673/2.100-præsentation og lokal browserkontrol er grøn. Den lokale browser beviser DA/DE/EN på forsiden, Om-siden og Grundbogen ved desktop og 390 px, lokalt valg på tværs af sider, QR, syv kilder og intet sidebreddebrud. Den manglende `data/live/public-condition-details.json` i en ikke-hydreret kildeworktree er fortsat forventet og må ikke fabrikeres.
- PR #183 bestod exact-head `33104575862` på `ad922992` og blev merged som `4d6e0f6`. Produktion `33104888405` stoppede korrekt før deploy, fordi den gamle fresh-startup-test søgte dansk fejltekst direkte i `app.js` efter flytningen til i18n. PR #184/exact-head `33105943700` rettede testen og blev merged som `1f4089d`; produktion `33106063695` fandt og stoppede på de to tilsvarende gamle prognosestatus-tests. Ingen af de to fejlede runs deployede et artifact.
- Den samlede gateopfølgning kontrollerer nu stabile runtime-nøgler og dansk fallback separat. PR #185 bestod exact-head `33107136733` på `67fc0d4` og blev merged som `50c1fc5`. Produktion `33107232593`, build `98640417925` og Pages `98643230518` bestod frisk DMI/Copernicus, central vejrskrivning, faktisk runtimeaudit, fuld `npm run validate`, releasegate, artifact og deploy.
- Offentlig browserkontrol på 4.0.290 består dansk, tysk og engelsk på forside, Om-side og hele Grundbogen med husket valg. **Bedste områder** viser fem rækker, femdøgnsvisningen viser fem færdigberegnede rækker, og versionen er 4.0.290. Den tydelige Candidate G-nødstatus er fortsat aktiv, mens den friske primærserie modnes; funktionerne leverer fra det afgrænsede verificerede fallbackdataset og må ikke kaldes fuldt ude af nødberedskab endnu.
- Offentlig AI-aktivering og Edge-deploy kræver fortsat særskilt ejer-go; `ravAssistantRemoteEnabled=false` er derfor stadig uændret.
- Beskyttet rod-worktree, `.recovery-*`, private data, geometri og land-/vandpunkter er urørte. Se DEC-0086/0087.

## AFSLUTTET P0-CHECKPOINT – 2026-08-27 – produktionsverificeret 4.0.289

- Efter 4.0.288-lukningen blev run `33051959643` læst i dybden. DMI-bulk lykkedes med 622/673; den gamle timeopløser bandt en 07:58 UTC-run til fremtidig 09 UTC, hvorefter Copernicus timeoutede. Samme providersti lykkedes senere, så DMI var ikke rodårsagen.
- 4.0.289 tillader kun en DMI-time på eller før den workflowlåste reference, giver Copernicus to procesisolerede seksminutters forsøg og stopper fortsat før deploy ved dobbelt fejl.
- Et generisk privat checkpoint gemmer præcis 673 kompakte Candidate G-states umiddelbart efter runtimegenerering og før de sidste gates. Hash, partantal, tidsretning og alle modelbindinger kontrolleres; vejr, scoreoutput, rå U/V, koordinater og private data er fraværende.
- Komplet offentlig fallback er højst 72 timer og aldrig længere end egen prognosehorisont. Det konkrete cirka ti timers overlapshul i 4.0.288 er dermed lukket uden ubegrænset gammel prognose.
- En fejlet, timeoutet eller før-start-fejlet planlagt produktion får ét retry. Watchdoget bruger kun workflowmetadata og offentligt manifest og dispatch'er efter 45 minutters stilhed uden aktiv produktion; alle tunge builds deler fortsat concurrency. Total stilhed i hele GitHubs scheduler kræver fortsat ekstern overvågning.
- PR #181 bestod exact-head `33076656266` og blev merged som `6c8acf08`. Produktion `33076772432`, build `98532962269` og Pages `98538133039` beviser central hydrering, DMI/Copernicus, checkpoint-save, faktisk runtimeaudit, fulde gates, Supabase og deploy.
- Live primær `rr-20260827133918-210` er ærligt 0/673 i warmup, mens komplet fallback `rr-20260827013448-210` fortsat leverer. Browserauditten består 4.0.289, 210 aktive zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden funktions-, konsol-, side- eller HTTP-fejl.
- Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data blev ikke berørt.

Næste arbejde er det allerede planlagte P1-scope: lås først den centrale DA/DE/EN-kontrakt, derefter den afgrænsede deaktiverede Spørg RavRadar Edge-kandidat. En bred fase kræver fortsat ejerbekræftet scope.

## TIDLIGERE AFSLUTTET P0-CHECKPOINT – 2026-08-27 – produktionsverificeret automatisk Candidate G-genopretning

- Seneste komplette offentlige baseline er fortsat `rr-20260827013448-210` ved 00 UTC med 210 zoner og 673/673 `READY`. En senere kørsel `33059522170` byggede 09 UTC efter et nitimers hul og stoppede korrekt med 673 `WINDOW_HAS_TIME_GAP`; den blev ikke deployet.
- Den sorte zonevisning samt tomme **Bedste områder** og **5-dages RavRadar** skyldes, at den offentlige datalæser kasserer hele den komplette 00-runtime efter otte timer. Det efterfølgende forkastede dataset-id gav desuden en misvisende blandingsfejl i detaljelaget.
- 4.0.288-kandidaten bevarer ét komplet, auditeret fallbackdataset i højst 48 timer med tydelig **ikke aktuelle data**-advarsel. Startup, detaljer, rangliste og femdøgnsvisning bruger samme dataset; der blandes aldrig gammelt og nyt.
- Candidate G genstarter efter et verificeret hul over tre timer fra den reelle sammenhængende suffix og modner i baggrunden uden interpolation eller backfill. Først ved 673/673 `READY` og grøn faktisk runtimeaudit fjernes fallbacken atomisk.
- En engangsrecovery er låst til workflow `33059522170`, artifact `RavRadar-support-3633`, 09 UTC, 673 dele, eksakt statehash og højst tre timers genoptagelse. Den kopierer kun kompakt state, aldrig vejr, scores, rå vektorer, koordinater eller private data.
- Målrettede tests, dataminimerede prøver mod de virkelige 00/09-artifacts, lokal releasegate og GitHubs fulde exact-head-/produktionskæde er grønne. Versionssynkroniseringen ændrer kun topversionen i de to beskyttede geodatafiler.
- PR #176 bestod exact-head `33066322196` og blev merged som `16ad8300`. Første produktion `33066416034` gendannede den kompakte 09-suffix korrekt, men stoppede sikkert før DMI/deploy, fordi fallbackgrundlaget først blev auditeret bagefter og derfor så warmup-staten. Opfølgningen låser rækkefølgen: auditér/kopiér komplet 00-fallback før 09-state indlæses.
- PR #178 bestod exact-head `33066897710` og blev merged som `5f9ee093`. Produktion `33066980965` beviste den korrigerede rækkefølge, 673/673 checkpointrecovery og frisk DMI/Copernicus/runtime, men stoppede før deploy, fordi public-shadow-auditten stadig krævede en rå kandidatscore i en lovlig `0 READY / 673 WARMUP` fail-closed runtime. Den snævre auditrettelse kræver fortsat score, bidrag og fysisk gate ved `READY`; ved warmup tillades kun en entydigt utilgængelig rå mode uden score, og den offentlige mode skal fortsat være lukket.
- Det eksakte supportartifact `RavRadar-support-3635` består den rettede audit med 210/210 zoner, 673/673 dele, 673 accepterede states, nul replaymismatch og 0/673 `READY`; en lokal publiceringsprøve aktiverede derefter den verificerede fallback `rr-20260827013448-210` mod primær `rr-20260827113739-210`.
- PR #179 bestod exact-head `33069307854` og blev merged som `653a9811`. Produktion `33069384084`/build `98507461295`/Pages `98512392768` bestod frisk DMI/Copernicus, faktisk 210/673-audit, fallbackpublicering, fuld `validate`, releasegate, Supabase-sync, artifact og deploy.
- Live manifest `rr-20260827121030-210` holder primær 0/673 `READY` separat og vælger fallback `rr-20260827013448-210` med 210 zoner, 673 dele, 673 `READY`, 1.346 modeevalueringer, 48-timersgrænse og to matchende SHA-256-hashes. Browseren viser 210 farvede zoner uden sorte zoner, fem **Bedste områder**, fem udfyldte prognosedage, fungerende zonedetaljer, den tydelige nødtekst og nul konsolfejl/advarsler. 4.0.288 er produktionsverificeret.
- Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte. Candidate G 20/50/30, fysik, vejrværdier, normal sortering og konto-/turdata ændres ikke. Se DEC-0084.

P0-sporet er lukket. De planlagte P1-spor om oversættelse og Spørg RavRadar kan genoptages i den ejerbekræftede rækkefølge; bred implementering kræver fortsat konkret scopebekræftelse.

## AKTUELT P1-CHECKPOINT – 2026-08-27 – gratis Spørg RavRadar-modelvalg

- Ejeren har fastlagt, at en eventuel fjern-AI skal være gratis og kun svare på ravrelevante spørgsmål. DEC-0083 kræver Free Tier uden billing eller betalt overflow; kvoteudløb giver lokal fallback.
- Den eksisterende 4.0.287-assistent er auditeret. Lokal Candidate G-rangering og fallback er værdifuld, men Edge er historisk OpenAI-/danskbundet, returnerer fri tekst, mangler almindelig emneafvisning og er remote-first også for deterministiske bedste sted/tid/score-spørgsmål.
- `knowledge/rav-assistant-public-v1.json` binder ti offentlige fakta til 4.0.287/Candidate G. Private data, konto/ture, position, credentials, interne regler/diagnoser, rå vektorer, koordinater og komplette datasæt er forbudt.
- `scripts/fixtures/rav-assistant-evals-v1.json` indeholder 45 balancerede cases: 15 danske, 15 tyske og 15 engelske. Roulade/kage, fodbold, åbne cykel-/matematik-/rejseemner, prompt injection og credential-/adminforsøg er dækket.
- `scripts/run-rav-assistant-model-evals.mjs --self-test` er offline og grøn. Live-tilstand kræver både `GEMINI_API_KEY` og `GEMINI_FREE_TIER_CONFIRMED=1`, bruger ingen Search-grounding, kalder som standard kun remote-kandidatcases og gemmer kun dataminimerede resultater.
- `gemini-3.7-flash` er afvist til denne chatgateway efter fem timeouts ved 12/30 sekunder, også med low thinking. `gemini-3.5-flash-lite` med low thinking er valgt som næste implementeringskandidat efter 27/27: DA/DE/EN 9/9, median 1.329 ms, p95 1.896 ms, max 1.968 ms og 27.314 tokens.
- Målrettet validering er grøn: ny evalkontrakt, eksisterende lokal Candidate G-assistent, Edge-sikkerhed, RDKS, knowledge, kildeneutralitet og releasegate. Den fulde `validate:source` køres efter projektets testmatrix én gang på PR'ens eksakte head.
- Gemini-nøglen er kun installeret som lokal Windows-brugervariabel og er ikke skrevet i repository, rapporter eller output. Free Tier-kvote og aktuelle vilkår skal genkontrolleres før release.
- Offentlig 4.0.287 er uændret local-only med `ravAssistantRemoteEnabled=false`. Ingen score, vejr, sortering, konto-/turdata, privatliv, geometri, land-/vandpunkter eller private data er ændret.
- Næste afgrænsede trin, efter ejerens konkrete scopebekræftelse, er provider-neutral Flash-Lite-integration i den eksisterende Edge bag fortsat deaktiveret flag: server-side secret, treleddet routing, struktureret validering, CORS/rate limit/timeout, lokal fallback og rollback. Brug Sol/Høj; senere tværgående slutvalidering kræver Sol/Ekstra høj.

## AKTUELT PLANLÆGNINGSCHECKPOINT – 2026-08-27 – flersproget offentlig UI og Spørg RavRadar

- Ejeren har godkendt, at to nye P1-spor registreres i roadmapet. Dette checkpoint planlægger arbejdet; det implementerer ingen ny offentlig funktion, ændrer ingen produktionsdata og ændrer ikke den produktionsverificerede 4.0.287-baseline nedenfor.
- Det første spor er én central oversættelsesarkitektur til dansk, tysk og engelsk. Dansk er standard ved første besøg; et tilgængeligt sprogvalg øverst viser flag og tydelige sprognavne, og valget huskes lokalt. Der må ikke bygges tre kopier af hjemmesiden.
- Første leverance omfatter hovedside, aktuelle prognoser, femdøgnsprognoser, områdevindue, konto, login og turformularer. Ejerens godkendte størrelsesorden er cirka 4–8 aktive timer.
- Den komplette offentlige leverance omfatter desuden **Om RavRadar**, hele den offentlige **Grundbog i ravjagt** og **Spørg RavRadar**. Ejerens godkendte samlede størrelsesorden er cirka 8–16 aktive timer.
- Datoer, klokkeslæt, statusser, fejl- og tilgængelighedstekster samt dynamiske RavScore-forklaringer skal følge sproget. Dynamisk tekst skal bruge stabile betydningsnøgler og parametre med sikker dansk fallback; stednavne og egennavne bevares. Admin-, ekspert- og interne udviklerflader forbliver danske, medmindre ejeren senere udvider scopet.
- Oversættelsesarbejdet må ikke ændre RavScore, vejrdata, sortering, konto-/turdata, privatliv, geometri eller land-/vandpunkter. Det kræver målrettede sprog-, fallback-, HTML-sikkerheds-, konto-/tur-, responsiv header- og browserregressioner på alle tre sprog.
- Det andet spor er en faglig og teknisk modernisering af **Spørg RavRadar**. Den nuværende viden skal kontrolleres mod Candidate G, de aktuelle offentlige scoreforklaringer, grundbogen og konto-/turflowet; historisk hardcodet viden må ikke antages at være aktuel.
- Modelvalget skal afgøres med en reproducerbar dansk/tysk/engelsk evalpakke for korrekthed, offentlig zonekontekst, usikkerhed, sikker afvisning, svartid, pris, databehandling, rate limits og drift. Den nuværende model må ikke fortsætte alene af historiske grunde.
- Den valgte model skal ligge bag den hærdede server-side Edge-gateway uden browsercredential. Lokal fallback, rate limiting, input-/outputgrænser, CORS, samme-sprog-svar, rollback og fail-safe adfærd skal bevares; en assistentfejl må aldrig blokere prognosen eller turflowet.
- Arbejdet ligger på `codex/plan-i18n-assistant-roadmap` i den eksisterende isolerede worktree. Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte.
- RDKS-valideringen er grøn for 4.0.287. Diffen er afgrænset til roadmap og de to interne handoff-filer; changelog og offentlige håndbøger ændres ikke, fordi der ikke leveres en ny version eller offentlig produktadfærd.
- Næste opgave skal starte fra ren `main` efter denne dokumentationsmerge, læse hele den obligatoriske RDKS-startkæde og tage stilling til rækkefølgen mellem de to P1-spor. Brug Sol/Høj til assistentarkitektur, evaldesign og modelvalg samt Sol/Ekstra høj til tværgående slutvalidering; afgrænset mekanisk oversættelsesarbejde kan udføres billigere, når kontrakten er låst.

Det produktionslukkede checkpoint nedenfor er fortsat den aktuelle offentlige sandhed. Alle yderligere checkpoints er historik, medmindre et nyere punkt udtrykkeligt genbruger dem.

## AKTUELT PRODUKTIONSLUKKET CHECKPOINT – 2026-08-27 – intern sammenligning og behovsstyret Supabase-PAT

- Arbejd fortsat kun i `C:\Users\Lenovo T14\Documents\GitHub\RavRadar\.codex-worktrees\stability-security-4.0.284` på `codex/close-internal-analysis-evidence-4.0.287`. Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte.
- Offentlig 4.0.287 `rr-20260827013448-210` er den senest verificerede baseline: manifestet er komplet med 210 zoner, 210/210 aktive og 673/673 scoreklare kystdele. Målrettet browserkontrol viste fem **Bedste områder** og fem prognoserækker i både strand og waders uden synlig runtimefejl.
- En intern, forståelig og tidsstemplet RavRadar-/Ravudsigten-journal er oprettet i `docs/rdks/30_FEATURES/INTERNAL-RAVRADAR-RAVUDSIGTEN-ANALYSE.md`. Første snapshot sammenholder begge top-fem, Ravudsigtens synlige ikke-røde femdøgnssignaler og nærmeste logiske RavRadar-zoner med H/T/R-komponenter.
- Første snapshot viser både semantiske og fysiske forskelle, men er ikke en nøjagtighedsdom. Analysen beskriver ti årsagsfamilier og åbne hypoteser, herunder Hirtshals, Bakkebølle, missing ved Egholm/Vallensbæk og den foreløbige 31. august-divergens. Der ændres ingen score, Candidate G, vejr, geometri eller public runtime.
- Sammenligningen er kun intern RDKS/roadmap/changelog, `scoreImpact=false` og `publicRuntime=false`. Ingen adgang er omgået, ingen privat kode er hentet, og emnet må ikke nå app, offentlig håndbog, ekspert-/adminflader eller offentlige prognosedata.
- Ejeren har endeligt besluttet, at `SUPABASE_ACCESS_TOKEN` ikke skal kalenderfornyes. Normal Supabase Auth/Edge-runtime, login, turindsendelse, D1-lagring og daglig D1-monitor bruger ikke PAT'et; det installerede token må udløbe uden driftsafbrydelse eller varsel.
- Det tidligere PAT-udløbsworkflow pensioneres. Workflowkontrakten låser, at kun det manuelle **Deploy RavRadar trip storage** må referere PAT'et. Ved en konkret Edge-deploy, migration eller rollback-deploy oprettes et kortlivet PAT gennem godkendt kanal, exact-main-kæden verificeres grønt, og tokenet tilbagekaldes derefter.
- Supabase-banneret om mulig begrænsning fra 9. september 2026 forbliver åbent, fordi Auth, Edge og egress stadig bruger Supabase. Cloudflare-tokenpolitikken og pseudonym-secret-kontrakten ændres ikke.
- Den første kandidat bestod lokal `validate:source`, PR #171 exact-head `33029393300` og blev merged som `f15f5892`. Produktion `33029447510` bestod frisk vejr, målrettet Copernicus, runtimeaudit og referencezoner, men stoppede fail-closed før Supabase-sync/artifact/Pages i fuld validering: den gamle globale kildeneutralitetstest tillod ikke den nu ejer-godkendte interne RDKS-kildeangivelse.
- Opfølgningen undtager kun den eksakte interne analysefil og kræver samtidig dens interne, score-neutrale og ikke-offentlige sikkerhedsmarkører. Alle andre projektfiler, app-, håndbogs-, ekspert-, admin- og public-runtime-flader er fortsat omfattet af det globale forbud. Dette er en kontraktpræcisering, ikke en omgåelse eller offentliggørelse.
- Opfølgningen bestod målrettet test, RDKS og fuld lokal `validate:source`, PR #172 exact-head `33030112665` og merge `7a234653`. Produktion `33030166104`/Pages `98382359708` bestod frisk DMI/Copernicus, faktisk runtimeaudit, fuld validering, releasegate, beskyttet Supabase-sync, artifact og Pages. Ingen Supabase-management-PAT-fornyelse var nødvendig for normalproduktionen.

Alle checkpoints nedenfor er historik, medmindre et nyere punkt udtrykkeligt genbruger dem.

## HISTORISK PRODUKTIONSLUKKET CHECKPOINT – 2026-08-27 – 4.0.287 EU-turlager

- Arbejd fortsat kun i `C:\Users\Lenovo T14\Documents\GitHub\RavRadar\.codex-worktrees\stability-security-4.0.284` på `codex/credential-expiry-guard-4.0.287`. Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte.
- Ejeren kræver en færdig normalarkitektur fra første dag og en eksplicit Supabase-rollback. DEC-0082 vælger Supabase Auth/Edge plus ti EU-låste Cloudflare D1-shards.
- Kode, målrettede tests og fuld lokal `validate:source` inklusive releasegate er grønne for HMAC-pseudonym, identitets-/GPS-fravær, service-HMAC, idempotens, privat turlog, ti shards, migrations-cutover før/efter, ejersletning, kapacitetskontrol og `TRIP_STORAGE_MODE=supabase`.
- Turso Free er forkastet, fordi gratisplanens DPA-status ikke er tydelig. Cloudflares DPA omfatter self-serve-aftalen, og D1 understøtter uforanderlig EU-jurisdiktion.
- Infrastruktur-PR #162/#163 bestod exact-head `33014102652`/`33014672254` og er merged som `27cebfd0`/`94b58e41`. Dedikeret Cloudflare-konto, præcis to mindst-mulige API-tokens og nødvendige krypterede GitHub-secrets er oprettet og verificeret uden at vise værdier. Begge Cloudflare-tokens er efterfølgende sat til **No expiration** uden værdiskift eller bredere rettigheder. Supabase-PAT'et er udskiftet og udløber 25. august 2027.
- Rollback-deploy `33014772035` satte `TRIP_STORAGE_MODE=supabase`, deployede alle versionsstyrede Edge-funktioner gennem CI og bestod ikke-skrivende CORS-, login- og feltkontrol. På dette deltrin fandtes endnu ingen D1-shards, deployet Worker eller migrerede liveposter.
- PR #164 bestod exact-head `33019055639` på `eb6e165d` og blev merged som `e9cd20ee`. D1-run `33019198166` oprettede/skema-verificerede ti tomme EU-shards og deployede Workeren, men stoppede sikkert før migration/Edge, da det øjeblikkelige health-kald ramte Cloudflare-udbredelsesforsinkelsen.
- Bounded retry bestod PR #166 exact-head `33019805663` og blev merged som `2d12c085c8178c4b89e8b00bf00ca43abe15129f`. D1-run `33019868542` bestod eksakt-main sourcegate, ti EU-shards/skema, headroom, Worker-secret/deploy/boundary, pre-/post-migration, D1-Edge-deploy og ikke-skrivende CORS/login/feltkontrol. Fire kilderækker blev migreret; andet gennemløb fandt fire idempotente dubletter og fortsat fire målposter uden kildesletning eller payloadlog.
- Pushproduktion `33019856228` og Pages-job `98351206091` bestod timeskarp readiness, central hydrering, frisk DMI/Copernicus, runtimeaudit, fuld validering, releasegate, beskyttet Supabase-sync, artifact og Pages.
- Offentlig Playwright-audit af `rr-20260826224651-210` viste 4.0.287, 210/210 aktive zoner, 673 kystdele, 420 aktuelle visninger, 2.100 prognosevisninger og nul kontrol-, konsol-, side- eller HTTP-fejl. **Bedste områder** var befolket; top-5 var Lønstrup og Nørlev 76, Langeland vest og Ristinge 72, Fanø nord og Nordby 63, Hals og Nordmandshage 62 samt Lyngby og Lodbjerg 61.
- Read-only monitor `33021364240`/`98352259752` bestod på eksakt `main` med ti shards, 0 MB afrundet samlet/største shard og 0 % forbrug uden at læse ture.
- Credential-rotationen stoppede første prøve `33023652174` sikkert ved tokenformatkontrollen, fordi browser- og Windows-udklipsholder var adskilte. Det korrekte token blev derefter overført gennem en lokal engangskanal uden fil, kommandolinjeværdi eller output. D1-verifikation `33024408547` bestod hele kæden, hvorefter det gamle 30-dages-PAT og et ubrugt mellem-token blev tilbagekaldt. Kun det aktive `2027`-PAT står tilbage.
- Cloudflare-audit `33024621109`/`98362935528` beviste efter udløbsændringen fortsat ti EU-shards, 0 MB afrundet og 0 % forbrug uden turlæsning. Det nye **Warn before RavRadar credential expiry**-workflow har kun `issues: write`, ingen secrets og opretter/tildeler en GitHub-issue fra 60 dage før 25. august 2027. GitHub-maillevering for tildelte/omtalte issues er verificeret aktiveret.
- PR #169 bestod exact-head `33025102301` på `ba8e8f03` og blev merged som `1e402834`. Manuel workflowprøve `33025289153` bestod på `main` og oprettede korrekt ingen issue endnu. Frisk produktion `33025210517` og Pages `98367528389` er grønne; offentlig `rr-20260827000855-210` bestod 4.0.287, 210/210 aktive zoner, fem **Bedste områder**, 673 dele, 420 aktuelle og 2.100 prognosevisninger med nul auditfejl.
- Supabase-banneret om mulig begrænsning fra 9. september 2026 er stadig åbent. Turlagerflytningen stopper fremtidig turvækst i Postgres, men ikke Auth-/Edge-egress.
- Daværende plan var at reagere på GitHub-mailvarslet før PAT-udløb. Den er erstattet af det øverste checkpoint: behold daglig D1-monitor, men opret kun et kortlivet Supabase-PAT ved en konkret managementændring. Brug kun den eksplicitte Supabase-rollback ved en verificeret D1-hændelse. Cloudflare-token roteres kun ved kompromittering eller rettighedsændring; pseudonym-secret må aldrig roteres blindt.
- Ejeren ønsker en senere intern sammenligning af offentligt synlige Ravudsigten-resultater mod RavRadar. Den må dokumenteres i RDKS/roadmap/changelog, men har `scoreImpact=false`/`publicRuntime=false` og må ikke vises i app, offentlig håndbog, ekspert-/adminflader eller public runtime.

Se DEC-0082. Alle checkpoints nedenfor er historik, medmindre et nyere punkt udtrykkeligt genbruger dem.

## AKTUELT PRODUKTIONSLUKKET CHECKPOINT – 2026-08-26 – 4.0.286

Dette er den aktuelle overdragelse. Alle efterfølgende checkpoints i filen er historik.

### Placering og beskyttelse

- Arbejd kun i `C:\Users\Lenovo T14\Documents\GitHub\RavRadar\.codex-worktrees\stability-security-4.0.284` på `codex/stability-security-4.0.284`.
- Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte. En versionsløftning må kun ændre topversionsfeltet 4.0.285 → 4.0.286 i de to beskyttede geodatafiler under DEC-0076.

### 4.0.285 blev deployet, men er funktionelt afvist

- Commit `20ad0ce1` og triggercommit `f041b843` blev pushet i PR #156. Exact-head `32993055324` bestod, PR'en blev merged som `de6b78444bf1d9bd19beb6100ceb193fe40a8d85`, og produktion `32993270783` bestod recovery, frisk vejr/runtime, fuld validering, releasegate, Supabase-sync, artifact og Pages.
- Den skærpede offentlige Playwright-kontrol fandt nul browser-, side- og HTTP-fejl og komplet 210/673/420/2.100-struktur, men afviste korrekt 0/210 aktive zoner. Den publicerede state havde 665 `WINDOW_INCOMPLETE` og 8 `READY`.
- Den nye dataminimerede shadowaudit af det offentlige 4.0.285-artifact afviser samme signatur med `AcceptedNearBoundaryIncomplete=665`. 4.0.285 må ikke kaldes stabil baseline.

### Rodårsag og endelig rettelse i 4.0.286

- 4.0.285 brugte den virkelige kompakte forgænger før den faseskudte 48-timersgrænse til at gøre samme beregning `READY`, men `buildBoundedCurrentTransportMemory` publicerede kun evidensen inde i vinduet.
- Ved næste rullende reference var forgængeren derfor væk, og 665 dele faldt tilbage til cirka 47 timers dækning.
- 4.0.286 bevarer forgængeren kompakt, når den var nødvendig for faseskiftet. Replay og dækningssum bruger stadig kun evidensen inde i vinduet; den faste rand 0 er uændret, og der opfindes ingen måling eller interpolation.
- Regime- og statepipeline-tests følger nu en anden efterfølgende reference og kræver fortsat `READY` med 48 timers dækning.
- `.github/workflows/update-and-deploy.yml` auditerer den faktisk genererede `data/live/conditions.json` umiddelbart efter runtimegenerering og før fuld validering, Supabase-sync, artifact og Pages. Den tidligere fulde validering kørte kun shadowauditens `--self-test`.
- En ny lokal recoverysimulation mod offentligt 4.0.285-mål `rr-20260826172504-210` og hash-låst offentlig kilde fra workflow `32978542594` genskabte 672/673 `READY`; efterkontrollen viste recoveryen inaktiv.

### Kontroller og næste trin

- De målrettede regime-, statepipeline-, recovery-, shadow- og workflowtests er grønne. Den nye faktiske gate afviser det offentlige 4.0.285-artifact som forventet.
- 4.0.286-version, RDKS, håndbøger, changelog, særskilt geodatadiff og lokal source gate blev færdiggjort. PR #157 bestod exact-head `32995801418` og blev merged som `2f2fd14883fbb974b331774858a61473ca06acc4`.
- Produktion `32995888183` anvendte recovery, frisk DMI/Copernicus og byggede runtime, men den nye faktiske shadowaudit stoppede korrekt før fuld validering, Supabase-sync, artifact og Pages. Offentlig 4.0.285 forblev urørt og sort.
- Den første gateversion skrev kun exitkode i loggen. PR #158 tilføjede kun fejlkoder og summerede ready/warmup/replay-/diagnostikoptællinger, aldrig del-ID'er, rå U/V, koordinater eller private felter. Exact-head `32997043974` bestod, og PR'en blev merged som `ca784210eabd1f26a615116c6da00684fcf24a01`.
- Produktion `32997118162` stoppede korrekt før deploy og viste 672 `READY`, én warmup, nul replaymismatch og 1.328 af forventede 1.344 modeevalueringer/diagnostikker. De manglende 16 var præcis de otte godkendte `dkss_lf`-dele i en to timer gammel `NATIVE_CADENCE_HOLD`.
- Rodårsagen var Candidate G-evaluatorens ældre Phase D-fortrin: det krævede et aktuelt strømfelt og returnerede `MISSING_REQUIRED_PHASE_D_COMPONENT`, før den komplette Candidate G-memory blev brugt. Kandidaten går nu kun uden om dette fortrin ved allowlist-afledt eksakt tre-timers hold, `READY`, alder over 0/højst 3 timer og tomme aktuelle U/V-, fart-, retning- og alignmentfelter.
- Almindelig unverified, for gammel, ikke-allowlisted og ikke-READY forbliver fail-closed. Begge modes, state/livepilot/forklaringskontrakter og et dataminimeret replay af de otte faktiske offentlige fejlpunkter er grønne med 16/16 modes, uden rå vektorer eller udskrevne identifikatorer.
- PR #159 bestod exact-head-kildegaten `33001615758` på `bae90f4311c9a3655234a9010c8770abe8ac6a30` og blev merged som `c0f42b33956e3d2af361da1366ab552b9e2a33ef`.
- Pushproduktion `33001743118` bestod den faktiske Candidate G-runtimegate på 210/210 zoner og 673/673 kystdele, fuld validering, releasegate, Supabase-sync, artifact og Pages-deploy. Buildjobbet var `98285159773`, og deployjobbet `98288517204`.
- Offentlig Playwright-kontrol af datasæt `rr-20260826185603-210` viste version 4.0.286, 210/210 aktive zoner, 673 kystdele, 420 aktuelle visninger, 2.100 prognosevisninger og nul kontrol-, browser-, side- eller HTTP-fejl.
- En særskilt genindlæst DOM-kontrol viste en befolket **Bedste områder**-top-5; første område var **Lønstrup og Nørlev** med områdescore 77. Den sorte 4.0.285-tilstand er dermed erstattet af offentligt verificeret 4.0.286.
- Supabases mulige begrænsning fra 9. september 2026 forbliver en separat driftsrisiko; sikkerhed eller releasegates må ikke lempes. GitHub Pages er fortsat kanonisk, mens `ravradar.dk` ikke er løst.

Se DEC-0080 og DEC-0081. 4.0.286 er produktionsverificeret og er den aktuelle grønne offentlige baseline.

## AKTUELT CHECKPOINT – 2026-08-26 – KANDIDAT 4.0.285

Dette checkpoint er historik og er erstattet af 4.0.286-checkpointet ovenfor.

### Placering og beskyttelse

- Arbejd fortsat kun i `C:\Users\Lenovo T14\Documents\GitHub\RavRadar\.codex-worktrees\stability-security-4.0.284` på `codex/stability-security-4.0.284`.
- Rod-worktree, `.recovery-*`, geometri, land-/vandpunkter og private data er urørte. De to beskyttede geodatafiler ændrer kun deres topversionsfelt 4.0.284 → 4.0.285 under den stående metadata-godkendelse i DEC-0076.

### 4.0.284 er udgivet, men baseline er ikke erklæret stabil

- Sikkerhedscommitten `064e5168` og triggercommitten `a1b9c44f` blev pushet i PR #155. Exact-head `32986025916` bestod, PR'en blev merged som `a92e270419404f249c526ed06d821cc2c2cf5cb2`, og pushproduktionen `32987875007` bestod fuld validering, releasegate, artifact og Pages.
- GitHub Actions/Pages havde en driftsforstyrrelse. Den manuelt startede produktion `32986561787` byggede grønt, men dens deploy blev afløst af den forsinkede pushkørsel. Det viste sig ikke at være årsagen til Candidate G-fejlen.
- Offentlig 4.0.284 bestod CSP, normal appstart, version, 210 zoner, 673 kystdele, 420 aktuelle visninger, 2.100 prognosevisninger og nul browserfejl. Den aktuelle rangliste forblev dog tom.

### Rodårsag og implementeret kandidat

- Kun offentlige `github-pages`-artifacts fra workflow `32978542594` (sidste 4.0.283), `32986561787` (første 4.0.284-build) og `32987875007` (deployet 4.0.284) blev sammenlignet. Supportpakker og private data blev ikke åbnet.
- Sidste 4.0.283 havde 672/673 `READY` og 209/210 aktive zoner. Første og deployede 4.0.284 havde 8/673 `READY` og 0/210 aktive zoner.
- Referencefasen flyttede fra 15:00 til 16:00. Det eksakte randkrav fjernede målingen umiddelbart før `reference - 48h`; 665 forløb blev falsk 46 timer, selv om `initialStateAccepted=true` og ingen reset var registreret.
- `ravscore-regime-memory.js` accepterer nu kun fasekrydsningen, når et verificeret compact bevis før grænsen og første bevis efter grænsen ligger inden for den eksisterende tretimerskadence. Der indsættes intet kunstigt evidencepunkt.
- En eksisterende selftest stoppede den første for brede variant, som kunne godkende et ægte 47-timersdatasæt. Den endelige variant består både gammel fail-closed og ny faseregression.
- Den deployede lineage gendannes én gang fra workflow `32978542594`, datasæt `rr-20260826142942-210`, 673 dele og SHA-256 `d5877f8a0945619b700efa3a97807ac9552033d244ab117e92d8fea87f1877d5`. Kun kompakte transportbeviser flettes, og mindst 99 % skal blive `READY`.
- En lokal prøve mod de virkelige source-/target-artifacts genskabte 672/673 `READY` og gjorde recoveryen inaktiv. Den kendte ene umodne del forblev korrekt fail-closed.

### Kontroller og næste trin

- Målrettede regime-, statepipeline-, recovery-, public-shadow- og ablationstests er grønne.
- DEC-0081, aktive krav, RDKS-indekser, issues, roadmap, AI-hukommelse, changelog og begge håndbøger skal være synkroniserede før source gate.
- Kør exact-head source gate, PR/merge og den fulde friske produktion. Offentlig slutkontrol skal kræve en faktisk befolket aktuel rangliste/readiness og må ikke nøjes med at acceptere korrekt fail-closed UI.
- Supabases mulige begrænsning fra 9. september 2026 forbliver en separat åben driftsrisiko. Sikkerhedsgates må ikke lempes.

Se DEC-0080 og DEC-0081. 4.0.285 er ikke færdig eller produktionsverificeret ved dette checkpoint.

## AKTUELT CHECKPOINT EFTER TVUNGEN WINDOWS-GENSTART - 2026-08-26 - 4.0.284

Dette afsnit er den aktuelle overdragelse. De senere afsnit i filen er historiske checkpoints.

### Sikker arbejdsplacering

- Arbejd kun i `C:\Users\Lenovo T14\Documents\GitHub\RavRadar\.codex-worktrees\stability-security-4.0.284`.
- Aktiv gren er `codex/stability-security-4.0.284` med base `a6c42c7d13a125233a7c2cf5084dd217c613a89b`.
- Rod-worktree'et `C:\Users\Lenovo T14\Documents\GitHub\RavRadar` indeholder beskyttede, eksisterende ændringer. Det må ikke ryddes, stages eller blandes ind i sikkerhedsarbejdet.
- Recovery-worktree'ets `.recovery-*`-filer er ligeledes urørte og skal forblive urørte.

### Integritet efter genstarten

- Den tvungne genstart efterlod ingen Git-lock, halv merge, rebase eller cherry-pick.
- Før dette checkpoint havde sikkerheds-worktree'et fortsat 20 ændrede, sporede filer og 9 nye filer; checkpointfilen er nu den 21. ændrede fil. Der er ikke fundet tomme ændringsfiler eller tegn på delvis skrivning.
- Intet af dette arbejde er endnu committet, pushet eller merget. Det må derfor først afsluttes efter fornyet diff-gennemgang og de relevante kontroller.

### Aktuelt arbejdsafsnit

- Ejeren har forkastet den risikable ide om at fjerne beskyttede filer og omskrive offentlig Git-historik. Den opgave skal ikke genoptages.
- Det aktive arbejde er den godkendte drifts- og sikkerhedshærdning i 4.0.284: sikker HTML-visning, smallere profil-/rettighedslæsning, sikrere indsendelse af observationer, hærdning af RavRadar-assistentens Edge-gateway, CORS/gateway-kontrakt, Supabase-RLS og målrettede sikkerhedstests.
- Den brede sikkerhedsmigration blev anvendt i live Supabase før genstarten. Den efterfølgende smallere `experts_manage`-policy er nu også anvendt og dataminimeret verificeret uden private payloads.
- Supabase Edge-funktionerne er nu deployet gennem browsereditoren, efter at Windows Application Control/Windows Sikkerhed blokerede den officielle Supabase CLI. Windows-sikkerheden blev ikke og må ikke svækkes eller omgås.
- Supabase-projektet viste desuden en kvoteadvarsel med mulig begrænsning fra 9. september 2026. Det skal indgå i driftsvurderingen.

### Næste sikre trin

1. Læs `AGENTS.md` og hele den obligatoriske RDKS-startkæde på ny samt dette checkpoint og den oprindelige sikkerhedsvurdering i `C:\Users\Lenovo T14\.codex\attachments\54e3874e-3c74-4b8a-b52e-75f481141b08\pasted-text.txt`.
2. Start med read-only `git status`, worktree-kontrol og en fuld gennemgang af alle sikkerhedsdiffs. Bekræft især om de flere `public-gateway.ts`-kopier er bevidste eller bør samles; antag ikke svaret.
3. Bevar den allerede grønne, smallere live-RLS og Edge-kontrakt; vis ingen private rækker eller payloads, og opret ingen unødvendig testobservation.
4. Udgiv assistenten local-only med `ravAssistantRemoteEnabled=false`. Fjernaktivering er en senere separat secret-/omkostningsbeslutning.
5. Kør kun målrettede tests under arbejdet. Færdiggør RDKS, implementeringsstatus, åbne issues, changelog og relevante håndbøger. Kør derefter exact-head source gate i GitHub og de fulde produktionsgates efter central hydrering og friske data.
6. Først når alle konkrete usikkerheder er lukket, må Codex committe, pushe, oprette PR, merge og følge deployet til grøn offentlig verifikation under den permanente PR-/mergeautoritet.

Ingen del af 4.0.284 er ved dette checkpoint erklæret færdig, stabil eller produktionsverificeret.

### Fortsættelse efter genstarten - 2026-08-26

- Ejeren skiftede fra Sol/Let til den krævede **GPT-5.6 Sol / Ekstra høj** før det kritiske integrationsarbejde.
- Worktree, branch og base er igen verificeret. Der er fortsat ingen Git-lock, merge, rebase eller cherry-pick, og rod-worktree'et samt recovery-, geometri-, punkt- og privatdata er urørte.
- Hele sikkerhedsdiffen er genoptaget og de målrettede kontrakter for sikkerhed, turbevis, fleksibel kontoindberetning, assistent og Pages-modullukning er grønne.
- De tre byte-identiske `public-gateway.ts`-filer var ikke en dokumenteret nødvendig deploykontrakt. Kilden bruger nu kun `supabase/functions/_shared/public-gateway.ts`; begge Edge-entrypoints importerer den, de to lokale kopier er fjernet, og sikkerhedstesten forbyder ny duplikation.
- Den smallere live-RLS er anvendt gennem den indloggede Supabase SQL-editor. En dataminimeret katalogkontrol viste præcis én policy på hver af `profiles` og `user_permissions`, begge smallere ekspert-scope, ingen legacy-policy og ingen `anon`-SELECT. Ingen private rækker eller payloads blev åbnet.
- Supabase viser aktuelt cirka 455 MB/5 GB egress og 86 MB/500 MB database, men organisationens banner varsler fortsat mulig projektbegrænsning fra **9. september 2026** på grund af forrige billingcyklus. Dette er fortsat en driftsrisiko, selv om den aktuelle periode ligger under grænserne.
- Supabases browsereditor er en godkendt kanal uden lokal CLI eller ændring af Windows-sikkerhed. Ejeren aktiverede den første deployknap manuelt; derefter kunne Codex se og styre resultatet. Både `submit-observation` og `ravradar-assistant` er nu deployet. **Verify JWT with legacy secret** er slået fra på begge, fordi RavRadar bruger en moderne `sb_publishable_`-nøgle og gateways selv håndhæver CORS, payload, rate limit og brugerbinding.
- De første browserdeploys indeholdt en dubleret editorblok og gav `503 BOOT_ERROR`. Bootloggen viste den præcise dobbelte `ALLOWED_FIELDS`-deklaration. Begge funktioner er derefter erstattet med én eksakt samlet kildeblok og deploybekræftelsen er eksplicit accepteret. Det efterfølgende livebevis er grønt for boot og CORS: tilladt `https://ravradar.dk` giver `204` og eksakt allow-origin; fremmed origin giver `403 ORIGIN_NOT_ALLOWED` uden allow-origin; tom observation giver `400 INVALID_ZONE`; tomt assistentspørgsmål giver `400 QUESTION_REQUIRED`.
- En syntaktisk gyldig, men gammel anonym kontraktrapport gav `403 LOGIN_REQUIRED_FOR_HISTORICAL_REPORT` før insert. Det beviser samtidig, at rate-limit-RPC'en er tilgængelig. Ingen observationsrække blev oprettet.
- Et almindeligt assistentspørgsmål nåede gennem CORS og rate limit, men gav `503 {"answer":null}`. Det beviste, at `OPENAI_API_KEY` ikke er installeret i Edge-miljøet.
- Ejeren bad Codex vælge den bedste løsning. Beslutningen er local-only i 4.0.284: `ravAssistantRemoteEnabled=false`, og en målrettet test beviser nul fjernkald. Opret ikke Supabase access token, GitHub secret eller OpenAI-secret som del af denne release.
- DEC-0080, RDKS, issues, changelog og begge håndbøger beskriver nu kontrakten.
- Versionen er synkroniseret til 4.0.284. Særskilt diff viser kun topversionsfeltet `4.0.283 → 4.0.284` i `data/kystdata.json` og `data/zones.geojson`; ingen geometri eller land-/vandpunkter er ændret.
- Lokal `scripts/validate-source.ps1` er grøn inklusive releasegate. Den målrettede browserkontrol viste 4.0.284, fungerende kort/appstart, håndbogens sikkerhedsafsnit, Om-sidens QR-kode, dokumenthentning, nul inline scripts/overflow og nul Edge-kald fra den lokale assistent.
- Næste sikre trin er sidste diff/secret-kontrol, commit/push, GitHub exact-head-gate, PR/merge og fuld produktion/offentlig kontrol.

## Produktionslukket arbejdscheckpoint - 2026-08-26 4.0.283

- Den afsluttende audit mistede moderzonens nøgle ved udfladning og genkendte derfor kun 665/673, selv om produktionskæden havde 673/673 scoreklare Candidate G-kyststrækninger.
- 4.0.283 bevarer den autoritative moderzone i den flade kontrolvisning. Datakrav, score, vejr, zoner, geometri og land-/vandpunkter er uændrede.
- PR #153 bestod exact-head `32914734446`, blev merged som `1caad399`, og produktion `32914887586` bestod fuld validering, releasegate, artifact og Pages.
- Offentlig 4.0.283 er komplet på 210 zoner og 673 kyststrækninger med Candidate G 20/50/30 som eneste profil, tom rollbackprofil og forbudt legacyfallback.
- 657 kyststrækninger har komplet transporthukommelse. 16 har 30–48 timers naturlig historik uden reset; de fem berørte moderzoner er ærligt lokalt utilgængelige. Den falske **Mangler/Ukendt**-fejl er lukket.
- Næste aktive arbejdsafsnit er den aftalte dybe drifts- og sikkerhedsrevision før flytning til ravradar.dk. Se DEC-0079. Senere arbejdscheckpoints i denne fil er historik.

## Produktionslukket arbejdscheckpoint – 2026-08-25 4.0.277

- Rodårsag: Ved mellemtimer for de otte ejerallowlistede `dkss_lf`-regionalproxyer kunne en fremtidig prøve tælles som aktuel readiness, mens den timeskarpe audit korrekt afviste den. Candidate G skrev samtidig den naturlige mellemtime som manglende evidens. Historikken var ikke tabt.
- Kandidaten vælger kun strøm på eller før målreferencen. DMI/Copernicus kræver eksakt tid; kun de otte regionalproxyer må fastholde den seneste afledte transporttilstand i højst tre timer.
- Fastholdelsen tilfører ingen bevægelse, evidens eller måling og viser ingen U/V, hastighed, retning eller pil. Næste ægte prøve integrerer faktisk tidsafstand; over tre timer stoppes lokalt.
- Candidate G 20/50/30 er fortsat eneste offentlige profil uden legacyfallback eller rollback. Scorekurver, zoner, geometri, land-/vandpunkter og central admin er urørte.
- PR #140 bestod exact-head `32816129342` og blev merged som `d3b4542f`. Produktion `32816237198` byggede historik og runtime grønt, men en forældet statisk test stoppede før deploy.
- PR #141 rettede kun testkontrakten, bestod exact-head `32817501003` på `128c71ce` og blev merged som `81e9b891`. Produktion `32817626537` bestod frisk vejr, fuld validering, releasegate, artifact og Pages.
- Offentlig kontrol viser 673/673 accepterede Candidate G-states, nul resets og 12–45 timers naturlig historik. 0/210 zoner var endnu aktive, fordi den længste kæde var 45 timer. Overvågningen følger kun den naturlige passage af 48 timer; der skal ikke bygges kunstig historik eller ændres score, geometri eller punkter. Se DEC-0074. Senere ældre arbejdscheckpoints i denne fil er historik.

## Aktuelt arbejdscheckpoint – 2026-08-24 4.0.273

- Ejerbeslutning: Candidate G med `20/50/30` er eneste offentlige scoremodel. Den historiske `25/40/35`-model må ikke længere bruges som offentlig fallback eller rollback.
- Et manglende Candidate G-grundlag gør kun den konkrete zone, søgemåde og time utilgængelig. Aktuelle og femdøgns-ranglister udelader den; øvrige zoner fortsætter på Candidate G. Ingen score må lånes fra legacy, moderzone, nabo eller en anden time.
- Adminforsiden har en samlet status for aktive Candidate G-scorer og viser zone, søgemåde og almindelig forklaring ved lokale huller.
- Kode, målrettede kontrakttests, Candidate G-audits og RDKS-validering er lokale grønne. Exact-head CI, frisk produktion, releasegate og offentlig browserkontrol mangler endnu.
- Beskyttet: Ingen geometri, zoneform, land-/vandpunkt, scoretærskel eller fysisk Candidate G-regel er ændret. Geodata har kun versionsfelt 4.0.273.
- Se DEC-0072. Senere afsnit i denne fil er historiske checkpoints; deres globale rollbackbeskrivelser er ikke længere gældende produktkrav.

## Afsluttet checkpoint – 2026-08-24 4.0.269

- Leverance: alle tre offentlige RavScore-komponenter forklarer den valgte kystdels aktuelle vind, bølger, strøm og relevante forløb; mobilisering forklares som bølgevirkning, og lavt vand beskrives ikke som indtransporthjælp.
- Offentlig forenkling: Fundprognosen, scorelofterne, rå samlet score og det tomme kortvalgsfelt er skjult uden at slette bagvedliggende data eller logik. Kilder og licenser er opdateret.
- PR #120 bestod exact-head `32703138969` på `37de330c`, blev merged som `d745e0ba`, og produktion `32703271897` udgav `rr-20260824080543-210` som 4.0.269 på 210/673.
- Live viser Candidate G globalt med 20/50/30. Browserauditen bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl.
- Beskyttet: ingen scoretal, modelregel, Supabase-kontrakt, geometri, land-/vandpunkt eller privat data blev ændret; geodatafilerne ændrede kun versionsfeltet.
- Denne branch er docs-only og lukker produktionsbeviset. Efter merge skal næste session starte på ren `main`; 4.0.269 kræver ikke mere produktarbejde uden ny modstridende evidens. Se DEC-0068.

## Afsluttet checkpoint – 2026-08-24 4.0.268

- Leverance: offentlig **Grundbog i ravjagt** fra havbund til fund samt målrettet gennemgang af almindeligt offentligt dansk.
- Faglig kontrakt: bølger kan mobilisere, strøm transporterer, kysten sorterer/samler; ingen universel gunstig dansk retning; jagtmetoder før appforklaring; kilder og evidensniveauer synlige.
- PR #116 og #117 lod de fulde gates stoppe to forældede ordrette UI-testkontrakter før deploy. PR #118 bestod den samlede exact-head `32672522334` på `8faccce3` og blev merged som `3c22e40b`.
- Produktion `32672578127` bestod central hydrering, DMI/Copernicus, frisk vejr, fuld validering, releasegate, artifacts og Pages. Live `rr-20260823230848-210` er 4.0.268 på 210/673.
- Offentlig browseraudit bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. Lokal desktop og 390×844-mobilvisning bestod uden vandret overløb.
- Beskyttet: ingen ændring af score, Candidate G, `20/50/30`, vejrdata, Supabase-kontrakt, geometri, land-/vandpunkter eller private data. Geodata har kun versionsfelt 4.0.268.
- Den sidste branch er docs-only og må kun lukke RDKS, roadmap, håndbøger og handoff. Efter merge skal næste session starte på ren `main`; 4.0.268 kræver ikke mere produktarbejde uden ny modstridende evidens.

## Produktionsverificeret 4.0.265 – kontoindberetning uden startet tur

- En indlogget bruger kan vælge **Indberet tur eller fund** fra kontoen uden først at starte en tur. Formularen kræver, at brugeren selv vælger dato og klokkeslæt for turens start samt turens varighed.
- Kontoindberetningen genbruger den almindelige rapports spørgsmål og den eksisterende `observations`-tabel. Der oprettes ingen ny Supabase-tabel, ekstra række eller fundkopi.
- Aktuelle forhold ved indberetningen bruges aldrig som historisk vejr. Da klienten ikke sikkert kan genskabe et vilkårligt historisk snapshot, gemmes efterregistreringen med tomme forecast-/snapshotfelter og `calibration_eligible=false`.
- En startet tur kan efter bekræftelse **Afsluttes uden at indberette**. Det rydder kun den lokale aktive tur og opretter ingen observations-, outbox- eller Supabase-post. **Svar senere** bevarer turen.
- Begge rapportveje bruger samme zoneafhængige kyststrækningsvalg og afviser en kyststrækning fra en anden zone.
- PR #111 bestod exact-head `32658661075` efter tre sikre, afgrænsede dokumentations-/versionsstop, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er 4.0.265 på 210/673; den udgivne formular kræver selvvalgt dato og tid uden forudfyldning og indeholder fravalget. En rigtig autentificeret indsendelse skal senere udføres bevidst af ejeren, fordi den opretter en virkelig række.
- Candidate G, `20/50/30`, vejrdata, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er urørte. Se DEC-0064.

## Aktuel arbejdsleverance 2026-08-23 – forståeligt brugerflow og privat turlog i 4.0.264

- Aktuel afslutningsbranch `codex/record-docs-only-proof` registrerer kun det observerede 0-kørselsbevis fra PR #108; den oprindelige leverance var `codex/plain-user-flow-and-trip-log`.
- **Mine ture og fund** læser den eksisterende Supabase-`observations`-tabel gennem ejer-RLS. Ingen ekstra tabel, serverrække eller kopi må oprettes; læsningen sker først ved klik, har et lille feltudvalg og højst 100 ture.
- Den aktive turknap bruger nu v2 direkte og starter ikke længere den gamle GPS-baserede parallelrejse. Historiske lokale og centrale data er urørte.
- Magic-link-callbacken hydreres med Supabase-brugeren. En kontoejet outbox-tur kan kun sendes som samme bruger. Adgangskode, magic link, udlogning, anonym/indlogget tur og turlog skal kontrolleres live.
- Centrale offentlige RavScore- og turord er forenklet. DEC-0063, RDKS, håndbog og changelog beskriver datagenbrug, anonymitet og den snævre `user_id`-RLS-kobling.
- Den eksakte rodhåndbog er tilføjet docs-only-skip. PR #108/exact-head `32654780774`, merge `98621bf9` ændrede kun ignorerede dokumentationsfiler og oprettede 0 push-produktionskørsler; workflowrettelsen er dermed praktisk bevist.
- PR #104 og #105 stoppede sikkert på to forældede tests uden deploy. PR #106/exact-head `32652894729`, merge `23fa89ed` og produktion `32652970105` udgav 4.0.264. PR #107/exact-head `32654048944`, merge `8b758337` og produktion `32654119745` førte auditrettelsen sikkert igennem og udgav `rr-20260823171804-210` på 210/673. Live konto-/logintekst og direkte tur uden GPS/rute er kontrolleret; 420/2.100/673 består uden browser-, konsol-, side- eller HTTP-fejl. PR #108 beviste 0 push-produktionskørsler for rodhåndbog/RDKS. En rigtig loginmail eller kontoejet tur må ikke sendes uden særskilt bevidst ejerhandling. Candidate G, `20/50/30`, artifact, protected-dirty-data, private cachedata, geometri og land-/vandpunkter må ikke røres.

## Aktuel arbejdsleverance 2026-08-23 – Candidate G aktuel referencegate i 4.0.263

- PR #100 bestod exact-head `32642456123`, blev merged som `586fbd18`, og produktion `32642532892` bestod alle fulde gates og Pages.
- Live `rr-20260823134605-210` beviser cadence-rettelsen: 673/673 accepterede states, nul reset/replaymismatch, 110 positive og 563 fysisk fortsat nul. Den offentlige profil rullede dog sikkert tilbage til legacy.
- Rodårsagen til rollbacken er en for bred gate: alle 673 aktuelle referencer var `WINDOW_INCOMPLETE`, men senere femdøgnsgaps gjorde `candidateWarmupEligible=false`.
- DEC-0062/4.0.263 vurderer memory/warmup ved nærmeste fælles aktuelle scoretid pr. zone. Hele prognosens kandidatscorecoverage består, og et gap ved den aktuelle reference giver fortsat global rollback.
- PR #101/exact-head `32644701811`, merge `9f5953f6`, produktion `32644772373`, live `rr-20260823142247-210`, aktiv shadow `32645569741` og browserkontrol er grønne. Candidate G er aktiv på 210/673; 673 states fortsatte uden reset eller replaymismatch, og browseren bestod 420/2.100/673 uden fejl.
- Branch er `codex/candidate-g-reference-gate-fix`. Artifact, protected-dirty-data, private cachedata, geometri og land-/vandpunkter må ikke røres; geodata må kun få versionsfeltet 4.0.263.

## Historisk arbejdsleverance – Candidate G native cadence-rettelse i 4.0.262

- 4.0.261-P0 er reproduceret: native tre-timers beviser blev afvist af en én-times-gate, så transporten stod på 0 i 673/673 dele og kunne ikke modne ved at vente.
- Arbejdsbranch er `codex/candidate-g-transport-cadence-fix` fra `main`/merge `328b4d7c`. DEC-0061 implementerer maksimum tre timers verificeret bevisafstand, faktisk tidsintegration uden kunstige mellemtimer og fail-closed ved større eller manglende gab.
- Ejeraccepteret pre-public opvarmning tillader nu kun `WINDOW_INCOMPLETE`. De tre egentlige fejlstatusser giver global legacyrollback via `candidateWarmupEligible=false`.
- Målrettede tests er grønne. Dataminimeret replay af gammel live state giver 110 positive og 563 fortsat nul, og afviser det gamle artifact med 658 state-replaymismatch. Exact-head, frisk produktion, aktiv shadow og fuld browserkontrol afventer.
- Ejeren har i DEC-0060 godkendt Candidate G som gældende scoremotor og accepteret, at det første ikke-offentlige 48-timersvindue er ufuldstændigt. Runtime mærker det `candidate-active-pre-public-warmup`; der foregives ikke fuld historik.
- Den globale scoreprofil er `RESEARCH-3` med `20/50/30`. Én manglende nødvendig Candidate G-projektion giver samlet rollback til `RRS-CURRENT-B0-4.0.247`; automatisk aktivering og profilblanding er fortsat forbudt.
- Det nye private centrale dokument er `data/admin/ravscore-profile-selection.json`. Central hydrering tillader kun nyere ejer-godkendt engangspromotion; efter write/readback er central samme/nyere værdi autoritativ.
- PR #97/exact-head `32636378576` aktiverede modellen og fuld produktion `32636433944` beviste central readback og live 210/673. PR #98 lukkede den legitime non-ready-shadowstatus, produktion `32637387600` var grøn, og shadow `32637833674` bestod. PR #99 registrerede den fulde browserlukning med 420 aktuelle og 2.100 femdøgnsvisninger uden fejl.
- Artifact, protected-dirty-data, private cachedata, geometri og land-/vandpunkter må ikke røres. Geodata må kun få versionsfeltet 4.0.262.

Denne cadenceleverance bestod exact-head og fuld produktion. DEC-0062 beskriver den særskilte referencescopeopfølgning; der kræves fortsat ikke endnu en 48-timers realtidsudviklingstest.

## Checkpoint 2026-08-23 – Candidate G bounded transport-memory efter ejerbeslutning

- Ejeren har erstattet både den varige start 0 og anbefalingen om neutral startprior 50 med DEC-0059's faste 48-timers evidensvindue. Der skal ikke køres eller afventes endnu en 48-timers realtidsudviklingstest.
- Branch `codex/candidate-g-bounded-transport-memory` ændrer kun den inaktive Candidate G-state og dens tests/dokumentation. Offentlig `25/40/35`, profile switch, geodataversion 4.0.260, geometri og land-/vandpunkter er uændrede.
- State schema er `2.0.0`; profilen er `current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48`. Højst 49 afledte `time`/`strength`-beviser persistéres. Rå U/V, fart, retning, koordinater, del-id'er og private payloads er forbudt.
- Et komplet vindue genafspilles fra rand 0, som betyder ingen dokumenteret indtransport før vinduet og aldrig dokumenteret udtransport. Persistéret transportoutput ignoreres som startinput. Missing/tidsgab holder `transportMemoryReady=false`, så hele omskifteren forbliver på legacy.
- Målrettede tests er grønne for 47/48 timer, startuafhængighed 0/50/100, 0,15-loftet, 12/13-timers udtransport, kort modstrøm, genopbygning, same-time, split/ubrudt, changed-context, missing og datasikker state.
- Read-only audit af 42.551 offentlige supplementposter fandt 582 eksakte, ubrudte 48-timersvinduer og nul startmismatch. Filens øvrige 91 dele må ikke kaldes almindelige vejrholes; supplementet omfatter kun 633 af 673 og har desuden tidsmæssige huller.
- RDKS, håndbog, målrettede kontroller og samlet lokal `scripts/validate-source.ps1` inklusive releasegate er grønne. Exact-head `32633533257` bestod på `56824ab0`; PR #95 blev merged som `1d848724`, og fuld produktion `32633607166` er grøn.
- Live `rr-20260823102619-210` består manifestets byte-/SHA-256-integritet med 210 zoner og 673 dele. Alle 673 Candidate G-states er schema 2 med ét første timebevis, `WINDOW_INCOMPLETE`, 0 ready, 0 offentlig aktivering og ingen rå inputfelter. Aktiv, ønsket og rollback er fortsat legacy `RRS-CURRENT-B0-4.0.247`.
- Efter kontraktskiftet opbygges den nye state naturligt i højst 48 timer. Den periode er ikke en blokering for den nu afsluttede mekaniske accept, men Candidate G må ikke aktiveres på en ufuldstændig state. Næste modeltrin er først en frisk 673/673 aktiveringsshadow og særskilt ejerreview, når den naturlige state er komplet.

## Checkpoint 2026-08-23 – 4.0.260 produktionsverificeret score-neutral omskifter

- PR #92 bestod exact-head `32628441062` på `eabf7e8b` og blev merged som `c5898ce8`. Produktion `32628516066` bestod hele kæden og udgav `rr-20260823083627-210`.
- Manifest, startdata og detaljer er komplet 210/673; begge runtimefiler matcher manifestets byteantal og SHA-256. Den dataminimerede audit består 1.346 modeevalueringer, accepterer 673/673 tilstande, nulstiller 0 og finder 0 rekonstruktionsfejl.
- Fælles reference er 09:00Z mod bootstrap 00:00Z, altså 9/9 timers dokumenteret naturlig state-alder. Det er praktisk evidens, ikke et 48-timersbevis.
- Browserauditten består 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden browser-, side- eller HTTP-fejl.
- Standard, aktiv og rollback er fortsat `RRS-CURRENT-B0-4.0.247` med 25/40/35. Candidate G er ikke aktiveret, `publicScoreChanged=false`, og automatisk aktivering er falsk.
- Candidate G-shadowens gennemsnit er waders 19,187 og strand 21,276 mod aktiv 35,770/43,655; 1.127 af 1.346 evalueringer skifter scorebånd. Gennemsnitlig transport er 4,242 og mobilisering 13,747 i den unge tilstand. Næste opgave er ejerreview af betydningen, ikke aktivering.
- Rodårsagen er nu afgrænset: 493/673 transporttilstande er 0, men ingen udtransportgate er aktiv. Eksisterende offentlig historie har 42.551 poster, dækker 633 dele i 65–117 timer og giver ved start 0 stadig transportmedian 0.
- Startreserven kunne ikke udledes under den daværende ubundne regel. Den historiske anbefaling om neutral prior 50 er nu erstattet af DEC-0059's faste, afgrænsede evidensvindue.
- En fremtidig aktivering kræver central admin-roundtrip, ny versionsbundet aktiveringsændring, frisk grøn aktiveringsshadow og særskilt ejerbeslutning.
- Ingen artifact- eller protected-dirty-datafiler er lagt i Git. Privat cache, geometri og land-/vandpunkter er urørte; kun de to godkendte geodataversionsfelter blev ændret.


## Checkpoint 2026-08-23 – første naturlige Candidate G-statefortsættelse

- Naturlig schedule `32613284735` på docs-only `main`/`600e8a45` bestod frisk data, fuld validering, releasegate, artifact og Pages. Den offentliggjorte runtime er `rr-20260823023951-210` med 210 zoner og 673 kystdele.
- Den dataminimerede public audit består 1.346 modeevalueringer uden score-rekonstruktionsfejl. 673/673 tidligere tilstande blev accepteret, og 0 blev nulstillet.
- Bootstrapreferencen var 00:00Z og den nye fælles reference 03:00Z. Yngste og ældste dokumenterede naturlige state-alder er derfor begge 3 timer; 48-timerskravet er ikke opfyldt.
- Candidate G er fortsat `diagnostic-only`; offentlig `25/40/35`, aktiveringsflag, geometri, land-/vandpunkter, artifact, protected-dirty-data og private cachedata er urørte.

## Checkpoint 2026-08-23 – 4.0.259 central Candidate G produktionsverificeret

- PR #89 bestod exact-head `32609888406` på `337466b5` og blev merged som `31e50acb`. Aktiv offentlig RavScore er fortsat `25/40/35`; Candidate G er kun et adskilt diagnostisk runtimefelt.
- DEC-0057 binder den centrale tilstand til model, profil, kystdel, vandpunkt og kystretning via hash. DEC-0059's schema 2 persistérer kun tidspunkt og afledt kystnormal strømstyrke i transportvinduet samt mobiliseringspotentialet; rå U/V, øvrige vejrinput, koordinater og private payloads indgår ikke.
- Tilstanden vælges ved zonens fælles `currentReferenceAt`. Same-time-rekørsel og missing holder tilstanden, og ændret kontekst nulstiller fail-closed.
- Den manuelle shadow er ændret fra ny native-only DMI-hentning til read-only audit af den faktiske fallback-kompatible public detaljefil. Self-test kræver 210 zoner, 673 dele, 1.346 modeevalueringer og nul score-rekonstruktionsafvigelser.
- Rollback er score-neutral: aktiv scorekode ignorerer Candidate G-navnerummet. En senere aktivering kræver en særskilt omskifter og testet tilbagekobling til `25/40/35`.
- Fuld produktion `32609952992` bestod central adminhydrering, frisk kontrolleret data, fuld validering, releasegate, Supabase, artifact og Pages. Live 4.0.259/datasæt `rr-20260823011924-210` har 210 zoner og 673 kystdele.
- Read-only shadow `32610281620` bestod 210/673 og 1.346 modeevalueringer med nul score-rekonstruktionsfejl. Det dataminimerede artifact er `9485298931`.
- Alle 673 tilstande er korrekt første bootstrap fra 0. De må ikke beskrives som modnet 48-timershistorik; næste aktive opgave er naturlig state-alder, ikke ny model eller offentlig aktivering.
- Samlet lokal `scripts/validate-source.ps1`, exact-head, post-data releasegate, deploy og frisk offentlig shadow er grønne for 4.0.259.
- Geometri, land-/vandpunkter, artifact, protected-dirty-data og den private cache er urørte.

## Checkpoint 2026-08-23 – Candidate G mobilisering leveret

- Branch `codex/candidate-g-mobilisation-policy` bygger `RESEARCH-3`, som kun erstatter Candidate G's mobiliseringsled. Offentlig `25/40/35` er uændret.
- Én kausal bølgeenergitilstand bruger højde² × periode, fire timers opbygning og 48 timers aftrapning. Missing holder tilstanden, og kompakt fortsættelse reproducerer en ubrudt kørsel eksakt.
- Direkte vind, aktuel strøm, separat varighed og statisk stedegnethed giver ingen mobiliseringspoint. Vind hører til waders-jagtbarhed, strøm til transport og bølgeretning til den afhængige levering.
- Syntetisk audit: 15,910 efter én høj time, 27,625 efter fire moderate, 87,500 efter tolv høje og 43,750 efter yderligere 48 rolige timer.
- Privat Git-ignoreret replay: 1.460 evalueringer, ny mobilisering 73,348 mod 57,651, samlet score 31,775 og +3,484 mod transportrevisionen. Ingen nye downloads, koordinater eller private payloads i Git.
- DEC-0056 og forskningsrapporten er beslutningsgrundlaget. Målrettede tests og samlet lokal `scripts/validate-source.ps1`, inklusive releasegate, er grønne.
- Exact-head `32607989444` bestod på `03083f92`; PR #87 blev merged som `48240d73`, og produktion `32608050112` bestod central hydrering, frisk kontrolleret data, fuld validering, releasegate, Supabase, artifact og Pages. Den offentlige kontrakt er 210 zoner/673 dele, og `controlled-live` er 673/673.
- PR #86/merge `5d7d4c2b` og produktion `32606559443` er den grønne transportbaseline. Produktionen håndterede et midlertidigt DMI 429/uforandrede collections via den godkendte fallback og sluttede med fulde gates og 210/673.
- Næste fase efter sikker levering er samlet offentlig persistens, fallback-kompatibel national shadow, forklaring og rollback; ikke en ny parallel model.

## Checkpoint 2026-08-23 – Candidate G frigivelsesrevision

- PR #82 bestod exact-head-kildegate `32602287607` på `74624ac3` og blev merged som `189644a0`.
- Produktion `32602328912` bestod frisk vejr/proveniens, fuld validering, releasegate, supportpakke, Supabase og Pages. Live `rr-20260822223539-210` er komplet med 210 zoner og 673 dele; manifest, offentlig startfil og offentlig detaljefil har samme datasæt-id.
- `scripts/audit-ravscore-candidate-g-release-readiness.mjs` giver et syntetisk, score-neutralt og reproducerbart bevis for de godkendte grænser uden private rådata.
- Den godkendte udgående 8-pointskurve er låst time for time fra 100 til 0 ved 13 effektive fuldstyrketimer. Halv styrke, deadband, neutral strøm, 24/48-timers følsomhed, missing-pause, bølge-only, landingsgrænse og waders-vindstop indgår i samme audit.
- Ejeren har nu lukket totalscore-spørgsmålet. Den versionsbundne interne `RESEARCH-2`-regel sætter slutscoren til 0, når faktisk kraftig udtransport har udtømt transportpotentialet; mobilisering og jagtbarhed bevares som synlige delscorer. Startpotentiale 0 uden faktisk udtransport, missing, neutral strøm og svag modstrøm udløser ikke reglen.
- Den bindende forklaring er: `På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`.
- Nationale aktiveringsmarkører er ajourført: komplet dynamisk inputcoverage, strømgrænse, starttilstand/passivt tab, repræsentativ tur- eller tilsvarende validering, UI/forklaring, central admin/rollback og eksplicit ejer-go/no-go. Den afsluttede transportnul-kontra-totalscorenul-beslutning er fjernet fra listen.
- `RESEARCH-2` bestod lokal fuld kildegate og exact-head `32604792201` på `f6458f09`, blev merged via PR #84 som `800a93cb` og bestod hele post-merge-kæden i `32604850884`: frisk vejr/proveniens, fuld validering, releasegate, support, Supabase, Pages-artifact og deploy.
- Direkte livekontrol viser `rr-20260822232159-210`, 210 zoner, 673 dele, `controlled-live` og samme datasæt-id i manifest/start/detaljer. Den 116.494.109-byte store offentlige detaljefil blev kun læst med et 8 KB HTTP-range for id-kontrollen.
- Offentlig `25/40/35`, UI, produktion, geometri, land-/vandpunkter, artifact, protected-dirty-data og private cachepayloads er urørte. Automatisk aktivering er fortsat falsk.

## Checkpoint 2026-08-23 – docs-only produktionsskip afsluttet

- PR #80 var et rent dokumentationscheckpoint inklusive rodens `CHANGELOG.md` og blev merged som `1565e073`.
- GitHubs Actions-forespørgsel på den eksakte mergecommit viste 0 workflowkørsler. `Update weather and deploy RavRadar` blev ikke oprettet, så den manglende rod-CHANGELOG-regel er praktisk bevist rettet.
- ISSUE-ROOT-CHANGELOG-DOCS-SKIP er lukket. Den selektive regel er fortsat snæver: øvrige Markdownfiler, kode, data, scripts, workflows og HTML er ikke bredt undtaget.
- Seneste fuldt produktionsverificerede dataset er fortsat `rr-20260822215524-210` fra run `32600714319`, 210 zoner og 673 kystdele.

## Checkpoint 2026-08-23 – PR #79 produktionsverificeret, docs-skip til slutbevis

- PR #79 bestod exact-head `32600654326` på `24d944c0` og blev sikkert merged som `41f71900`.
- Push-produktion `32600714319` gennemførte den fulde kæde: frisk vejr/provenance, fuld projektvalidering, release-gate, supportpakke, Supabase-synkronisering og Pages-deploy.
- Det offentlige manifest er komplet som `rr-20260822215524-210` med 210 zoner og 673 kystdele; manifest, conditions og details bruger samme dataset-id.
- Denne branch ændrer kun intern dokumentation inklusive rodens `CHANGELOG.md`. Efter merge skal GitHub vise, at ingen ny `Update weather and deploy RavRadar`-pushkørsel blev oprettet; derefter kan ISSUE-ROOT-CHANGELOG-DOCS-SKIP lukkes.

## Checkpoint 2026-08-22 – bevidst snæver docs-skip-rettelse

- PR #78 var ren intern dokumentation, men merge `7133b33b` startede alligevel fuld produktion `32599980640`; live blev fortsat sundt som `rr-20260822213959-210` med 210 zoner og 673/673 dele.
- Rodårsagen er eksakt: workflowet ignorerer `CHANGELOG-*.md`, men den løbende samlede fil hedder `CHANGELOG.md`.
- Branch `codex/fix-root-changelog-docs-skip` tilføjer kun `CHANGELOG.md` ved siden af det eksisterende versionsmønster og udvider den snævre regressionstest. Ingen bred `*.md`-, `docs/**`-, data-, script-, workflow- eller HTML-undtagelse er tilladt.
- Næste bevis er målrettet/full source-gate, exact-head, merge, én forventet fuld produktion for workflowændringen og derefter en ren docs-only merge uden ny push-produktion.

## Checkpoint 2026-08-22 – strømstyret Candidate G efter 4.0.258

- Candidate G-checkpointet blev leveret fra `codex/ravscore-current-led-memory` på `d37d15fe` og merged til `main` som `4379606e` i PR #75.
- Ejeren har godkendt den eksakte udtransportkurve på det interne 0–100-potentiale: straks-tab på 8 point pr. effektiv fuldstyrketime og 0 fra 13 timer. Indtransport bygger 10 point pr. effektiv fuldstyrketime mod 100.
- `G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED` gør verificeret kystnormal strøm til transportleddet. Bølger kan ikke skabe transport og må kun påvirke leveringen inden for 0,85–1,00, når strømmen allerede har skabt potentiale.
- Candidate G beholder `20/50/30`, DEC-0054's vindstyrede waders-jagtbarhed og waders-loft. Offentlig RavScore `25/40/35` er uændret.
- Privat replay på 1.460 evalueringer og målrettede self-tests er grønne. Følsomheden viser, at kystnormal strømgrænse samt start-/forældelsesregel skal afgøres før enhver aktivering; warm-start 50 flyttede kandidatens gennemsnitsscore +21,136 mod fail-closed start 0.
- DEC-0055 og forskningsrapporten samler mekanik, evidens og aktiveringsblokeringer. G 24/48 bevares som historisk følsomhedsspor.
- Samlet RDKS-/håndbogsvalidering og fuld lokal `scripts/validate-source.ps1`, inklusive releasegate, er grønne. PR #75's exact-head-kørsel `32598284279` bestod på `d37d15fe`, og merge `4379606e` er verificeret. Der blev som forventet ikke startet et nyt produktionsartifact; merge er score-neutral og må ikke fremstilles som offentlig aktivering.
- Ingen nye rådata er hentet. Private cachepayloads, artifact, protected-dirty-data, DMI/fallback, geometri og land-/vandpunkter må ikke stages eller ændres.
- Branch `codex/ravscore-current-decay-sensitivity` udvider efterfølgende kun analyseværktøjet med valgfri neutral halvering på 24/48 timer. Referenceprofilen har fortsat `neutralPassiveHalfLifeHours=null`.
- Den private randkontrol viser 24 timers forhistorie i alle 12 eventvinduer og nul vinduer med 48/72 timer. Start-0-scoren flytter -1,182/-0,697 point, men warm-start-forskellen forbliver væsentlig; ingen fysisk levetid er valgt.
- Referencegrænsen 0,05→0,20 m/s har nul fuldstyrkeevalueringer. De lavere følsomheder giver mere modelaktivitet, men uden fundlabels ingen kalibrering.
- Checkpointet bestod exact-head `32599255165` på `ed1f0297`, blev merged via PR #77 som `75ed93d6` og produktionsverificeret i `32599309735`. Live `rr-20260822212612-210` har 210 zoner, 673/673 dele og identisk dataset-id i manifest/start/detaljer. Offentlig Candidate G er ikke aktiveret.

## Checkpoint 2026-08-22 – Candidate G 4.0.258 vindstyret waders-jagtbarhed

- Kandidaten blev leveret i PR #73. Exact-head-kildegate `32586707063` bestod på `2abc5a4c96945247679341f8e9b47c43844af7a3`, og PR'en blev merged som `9bdb8de8d73ab5b62622600e207646e98a4efe8c`.
- Ejeren valgte `20/50/30` som Candidate G's private faglige analyseprior; offentlig RavScore `25/40/35` forbliver uændret.
- Foretrukken variant er `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED`. Vind giver 100 til og med 6 m/s og falder gennem 7/80, 8/60, 10/35, 13/10 og 15/0.
- WAM-bølgehøjde kan kun reducere vindscoren med 20 procent af et negativt gab, højst 20 point; den kan ikke hæve jagtbarheden eller alene give hard stop.
- Privat replay er genkørt på 1.460 evalueringer: 730 uændrede strandscorer, ingen waders-score over jagtbarheden, gennemsnitligt bølgefradrag 4,002 og alle seks tilfælde ved mindst 15 m/s på 0.
- Candidate G-, mode-, scenarie- og nationale shadow-self-tests samt fuld lokal `scripts/validate-source.ps1` og releasegate er grønne.
- Produktion `32586958989` bestod frisk vejr/proveniens, fuld validering, releasegate, coverageaudit, support `RavRadar-support-3405`, Supabase, Pages-artifact og deploy. Live 4.0.258/datasæt `rr-20260822171406-210` er verificeret med 210 zoner, 673 dele og 2.100 femdøgnsvisninger.
- Beslutningsgrundlaget for den private kandidat er dermed færdigt. Næste faglige trin er ikke en automatisk aktivering, men et senere særskilt ejer-go/no-go efter repræsentative ture/hold-out og komplet dynamisk inputcoverage.
- DEC-0054 erstatter DEC-0053's foretrukne variant, `20/45/35`, 18 m/s-stop og mere selvstændige bølgekobling. Tidligere modeller bevares som evidensspor.
- Der er ikke hentet nye rådata. Private cachepayloads, artifact, protected-dirty-data, DMI/fallback, geometri og land-/vandpunkter må ikke stages eller ændres.

## Historisk checkpoint 2026-08-22 – Candidate G-ejerreview samlet før DEC-0054

Dette afsnits variant og vægt er erstattet af det aktuelle 4.0.258-checkpoint ovenfor.

- Beslutningspakken blev ført gennem PR #71: exact-head-kildegate `32583123375` bestod, og PR'en blev merged som `52f66808204b1de4b643e05192a5bd7e92797244`.
- PR #70, produktion `32580314866`, live `rr-20260822150210-210` og exact-merge-shadow `32580774128` er grønne.
- Ingen yderligere rådata skal hentes til de 430 dele, som ikke indgik i den strenge private scorekørsel. De 243 komplette dele bruges kun som mekanisk aktuelt snapshot.
- Privat replay er genkørt: 1.460 evalueringer, 730 uændrede strandscorer, nul waders-score over jagtbarheden og nul af 216 lave waders-jagtbarheder med mindst 55 point.
- DEC-0053 og `docs/research/RAVSCORE_CANDIDATE_G_OWNER_REVIEW_2026-08-22.md` samler ét forslag til review: `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`.
- `20/45/35` er fortsat analysecentrum. Offentlig `25/40/35` ændres ikke, og endelig vægtning afventer komplette ture med fund/nul-fund og hold-out.
- Næste faglige trin er ejerens samlede review. En eventuel offentlig score-/UI-ændring er en senere særskilt opgave med fulde gates.
- Artifact, protected-dirty-data, geometri, land-/vandpunkter og offentlig runtime er urørte.

## Checkpoint 2026-08-22 - Candidate G-coveragekontrakt 4.0.257

- Aktiv branch er `codex/ravscore-candidate-g-coverage-checkpoint` fra 4.0.256-merge `d629177a`.
- PR #69/exact-head `32577977245`, produktion `32578049137` og live 4.0.256/datasæt `rr-20260822141748-210` er grønne.
- Frisk score-neutral central shadow `32578554928` bestod for 210 zoner/673 dele, men kunne kun score 243 dele. De øvrige 430 mangler komplet lokal DKSS-familie; dette er den reelle coverageblokering.
- DEC-0052 retter den ældre sammenblanding med statiske lokale retention-features. Candidate G bruger dem ikke, giver dem nul point og kræver dem ikke for coverage. Parentzonens morfologi må fortsat ikke arves.
- Shadowvalidatorens schema 1.4.0 har nu `scoreInputCoverageReady`, eksplicit udeladt statisk stedmodel og den åbne gate `candidate-national-score-input-coverage`. `automaticActivationAllowed` er fortsat falsk.
- Målrettede tests, fuld lokal `scripts/validate-source.ps1` og releasegate er grønne. Exact-head PR, produktion og ny central shadow mangler ved dette checkpoint.
- Offentlig score, UI, DMI/fallback, central admin, geometri, land-/vandpunkter, artifact og protected-dirty-data er urørte.

## Checkpoint 2026-08-22 - Candidate G-vægt og forklaring 4.0.256

- Historisk branch var `codex/ravscore-candidate-g-weight-decision` fra `main`/merge `8cffdd54`.
- PR #68's dokumentationscheckpoint er afsluttet: exact-head-gate `32576541706`, merge `8cffdd54`, fuld produktion `32576619969` og live 4.0.255/datasæt `rr-20260822135100-210` med 210 zoner og 673 dele er grønne.
- Den ejer-godkendte waders-variant er genafspillet med `15/50/35`, `20/45/35` og `25/40/35`. Yderpunkterne adskiller sig 4,947 point og 282 referencebånd; `20/45/35` bevares som Candidate G's analysecentrum.
- Den nye diagnostic-only forklaringskontrakt binder eksakte komponenter og bidrag sammen med pil nu, historik før nu, fysisk gate og synligt waders-loft. Lokal replay gav nul afvigelser i 1.460 evalueringer.
- PR #69 exact-head-gate `32577977245`, merge `d629177a`, produktion `32578049137` og efterfølgende central shadow `32578554928` afsluttede dette checkpoint.
- Offentlig 25/40/35, UI, DMI/fallback, central admin, geometri og land-/vandpunkter er uændrede. Artifact, protected-dirty-data og private cachepayloads må ikke stages eller eksponeres.

## Checkpoint 2026-08-22 - 4.0.255 reparerer national shadowkontrakt

- PR #66 bestod exact-head-kildegaten `32575000140`, blev merged som `95e3064d` og udløste produktion `32575055644`.
- Frisk vejr og proveniens blev bygget, men fuld validering stoppede fail-closed på den forældede forventning `candidate-waders-product-decision`. Releasegate, Supabase og Pages blev ikke kørt.
- Reparationsbranchen `codex/ravscore-waders-contract-fix` opdaterede testen til `candidate-waders-rule-order-public-product-review` og tilføjede den `validate:source`; målrettede tests og fuld lokal gate blev grønne.
- PR #67 exact-head-gate `32575697204` bestod på `b011f915`, og merge `af8f30cf` blev fuldt produktionsverificeret i `32575740539` med support `RavRadar-support-3389`, Supabase og Pages.
- Live 4.0.255/datasæt `rr-20260822133041-210` har 210 zoner og 673 dele. Manifestet er komplet/`controlled-live`, og begge offentlige datafiler matcher byteantal og SHA-256.
- Kandidatberegning, aktiv score, geometri, land-/vandpunkter og beskyttede data er uændrede. Næste trin er at fortsætte det samlede Candidate G-beslutningsgrundlag; ingen offentlig aktivering er godkendt.

## Checkpoint 2026-08-22 - 4.0.254 waders-kandidat lokalt valideret

- Dette checkpoint erstatter den ældre anbefaling om kun at vise waders som separat metodestatus. Ejeren har valgt et synligt waders-scoreloft ved jagtbarheden og en ny vinddel med 100 point til og med 6 m/s og monotont fald derover.
- Arbejdsbranch er `codex/ravscore-mode-huntability-analysis`. Ny stabil diagnostic-only variant er `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`; den tidligere no-direct-variant bevares som reference.
- Replayet dækker 1.460 evalueringer. Alle 730 strandscorer er identiske; waders-gennemsnittet er 27,351 mod 35,465 før, og ingen waders-score overstiger jagtbarheden. Den nye vindkurve ændrer kun +0,449 point i gennemsnit mod samme loft på den gamle kurve.
- Ingen sikkerhedsmodel eller bund-/dybde-/rende-/adgangsegnethed indgår. Beskyttede data, private cachepayloads, geometri og land-/vandpunkter er urørte.
- Offentlig 25/40/35 og runtime er uændret. Målrettede tests, RDKS, `scripts/validate-source.ps1`, releasegate og versionslukning er grønne. Exact-head PR-gate, merge og det samlede Candidate G-beslutningsgrundlag mangler ved dette checkpoint.

## Checkpoint 2026-08-22 - Candidate G 4.0.253 produktionsverificeret

- Dette checkpoint erstatter alle ældre branch-, baseline- og næste-trin-angivelser nedenfor.
- Autoritativt repository er `C:\Users\Lenovo T14\Documents\GitHub\RavRadar`, og arbejdet skal altid begynde fra den aktuelle `main`. Kontrollér aktuel head med `git status`, `git log -1` og remote; et fast commit-id i et handoff må ikke bruges som erstatning for den kontrol.
- Candidate G's faglige kode-/analysebaseline er PR #62, merge `b2951d90`; dokumentationscheckpointene PR #63 og #64 ændrede kun RDKS/changelog. PR #62's exact-head-kildegate `32568914124` bestod på `d272c6ca`.
- Et fuldt produktionsbevis for samme 4.0.253-baseline er `32570223437`: central hydrering, frisk DMI, fuld `validate`, releasegate, support `RavRadar-support-3382`, Supabase og Pages bestod på PR #64-merget `01904b92`; deployment `6036286717` er `success`.
- Det verificerede live-snapshot `rr-20260822112859-210` viste version 4.0.253, 210 zoner og 673/673 scorede kystdele. Vejrdatasættet er rullende, så den aktuelle dataset-identitet skal kontrolleres live og ikke udledes af dette historiske checkpoint.
- Candidate G er fortsat privat og score-neutral. Eksakte komponenter/gate rekonstruerer 1.460/1.460 private scorer; den foretrukne no-direct-wind-variant har 219 lave waders-jagtbarheder, heraf 7 med mindst 55 point, og det kanoniske 0/79-forløb.
- Pilen betyder fortsat aktuel lokal strøm. Historik forklares separat; 332/872 tydelige contexts er modrettede, og 100 ændrer den afrundede score.
- Dette historiske checkpoint er erstattet af DEC-0051/0052: waders-/forklaringskontrakten er valgt score-neutralt, og det åbne dataarbejde er komplet dynamisk scoreinputcoverage ud over 243/673. Statiske lokale retentionfeatures indgår ikke i Candidate G.
- Aktiv RavScore 25/40/35, offentlig score/UI, DMI/fallback, central admin, geometri og land-/vandpunkter er uændrede. Den Git-ignorerede cache og de fire beskyttede dirty-datafiler må fortsat aldrig stages.

## Checkpoint 2026-08-22 - efter PR #57

- Dette checkpoint erstatter de ældre arbejdssteds- og branchangivelser nedenfor.
- Autoritativt repository er `C:\Users\Lenovo T14\Documents\GitHub\RavRadar`; baseline var `main`/merge `ca7c8caa` fra PR #57.
- Aktiv arbejdsbranch er `codex/ravscore-history-track-ablation`.
- Den private cache ligger lokalt i `.cache/ravscore-historical-wave-pilot-12` og ignoreres snævert gennem `.git/info/exclude`; cachefiler må aldrig stages.
- 24/48-matrixen og separate ablationer er gennemført score-neutralt. Næste forskningsdel er kandidat-G-replay med 24 alene, 50/50 og 48 alene, lineær vind som hovedanalyse og obligatorisk no-direct-wind.
- Målrettede tests, RDKS, lokal `validate:source` og releasegate er grønne; exact-head PR-gate og merge mangler.
- `private-research-artifact`, `protected-dirty-data`, de fire historisk beskyttede datafiler og alle land-/vandpunkter må fortsat ikke ændres eller stages.
- Aktiv RavScore 25/40/35 og offentlig runtime er uændrede.

## Arbejdssted og branch

- Brug kun `C:\Users\jakob\AppData\Local\Temp\ravradar-40232-current`.
- Aktiv branch er `codex/verify-4.0.238` fra merge-commit `b8844841` på `main`.
- Desktop-klonen er gammel og dirty og må ikke bruges til dette spor.

## Beskyttet lokalt arbejde

Disse fire eksisterende dirty filer må aldrig ændres, stages eller committes:

- `data/diagnostics/current-spatial-audit-4.0.76.json`
- `data/diagnostics/state-reference-zones.json`
- `data/diagnostics/zone-geometry-audit.json`
- `data/live/coastal-parts-v2.json`

Der må ikke flyttes land-/vandpunkter.

## 4.0.238 produktion

- Kandidaten blev afsluttet i `2db2cd2b`, `e197a196`, `3dcd93c6` og `e89778f9`; PR #1 er merged som `b8844841` efter ejerens udtrykkelige godkendelse.
- `release/RavRadar-4.0.238.zip` bygges reproducerbart med 972 filer og er et lokalt, ikke-committet artifact. Kør pakkeren efter enhver ny slutcommit; dens output er den autoritative bytekontrol.
- Push-kørsel `#32344813967` bestod central adminhydrering, frisk DMI, fuld validering, releasegate, Supabase og Pages.
- Support `RavRadar-support-3252`/datasæt `rr-20260820074127-210` viser 210 zoner, de seks tidligere bølgehuller lukket til 118 timer og verificeret historik vokset til 39,594 timer.
- Live 4.0.238 er browserkontrolleret med nul fejl i 210 zoner, 673 dele, 420 aktuelle paneler og 2.100 femdøgnsvalg samt mobil og desktop.

## Seneste naturlige evidens

- Readiness-run `#32347036227` sprang korrekt produktionen over uden artifact, fordi UTC-time 08 endnu ikke var komplet.
- Automatisk Copernicus-pilot `#32347060320`/artifact #72 gjorde time 08 klar og har nu 46 eksakte timer, 28.934 private poster, 625 unikke mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- Piloten er fortsat score-neutral, privat og uden interpolation. Det fulde 168-timersvindue er endnu ikke nået.
- De 12 reelle hovedzonehuller for verificeret strøm og Feggesunds reelle bølgemangel skal fortsat være `missing`.

## Næste bindende trin

1. Følg næste kvalificerede naturlige produktion, som starter før og slutter efter et UTC-timeskift; ingen manuel omgåelse af readiness-gaten.
2. Fortsæt naturlig Copernicus-overvågning fra 46 mod 168 timer og Supabase-forbrugsovervågning.
3. Fortsæt DEC-0030 med nye uafhængige HARMONIE-, WAM- og DKSS-cyklusser samt de kendte strøm-, bølge- og Limfjordshuller uden kunstig udfyldning.
4. Commit og push kun den afsluttede dokumentationsopfølgning; stage aldrig de fire beskyttede lokale datafiler eller verifikationsmapperne.

## 2026-08-20 - P0.3 afsluttet og permanent mergeautoritet
- Naturlig schedule `#32351140886` byggede og deployede datasæt `rr-20260820085852-210` med frisk data, fuld `validate`, releasegate, Supabase og Pages.
- Browser-pluginet blev forsøgt først og diagnosticeret til DNS-fejl. Den godkendte Chromium/Playwright-fallback gennemgik derefter 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger med nul fejl i score, label, farveniveau, pile, forklaringer, vejrtal, komponenter, kontekst, konsol, side eller HTTP.
- P0.3 og `ISSUE-OPEN-METEO-LOCKED-HOUR-WINDOW` er dermed lukket. Ingen land-/vandpunkter, geometri, U/V, kildeorden, afstandsgrænser eller RavScore er ændret.
- Codex har permanent betinget autoritet til at oprette, opdatere og merge egne datasikre PR'er efter fuld systemisk verifikation. Usædvanligt risikable, destruktive, irreversible eller ikke-godkendte beslutninger kræver fortsat ejeraccept.
- Næste ikke-blokerede arbejde er P1: naturlige 72/168-timersvinduer, nye uafhængige modelcyklusser, de 12 eksplicitte parent-currenthuller, Feggesund wave-missing og produktionsvarighed.

## 2026-08-20 - post-merge P1-checkpoint #3256
- PR #2 er sikkert merged som `e1f835a3`. Produktion `#32354210495`, support `RavRadar-support-3256` og datasæt `rr-20260820093508-210` bestod fuld validering, releasegate, Supabase, Pages og efterfølgende 210/673-browserkontrol.
- Rå `samples72h` er 70 prøver over 41,489 timer i alle 210 zoner. 198 zoner har verificeret spænd 41,489 timer; 12 kendte geografiske parenthuller står fortsat ved nul. Næste mulige 72-timersbevis er efter 2026-08-21T16:05:48Z.
- Supplementhistorikken har 45 unikke validtider over 45 timer for 625 Copernicus-dele og 8 regionalproxydele. Shadow-cachen spænder cirka 104 timer og har besøgt 673/673 dele, men 168 timer er ikke nået.
- Ingen ny HARMONIE-, WAM- eller DKSS-modelstart er observeret. Feggesund er fortsat den ene bølge-missing, og de 12 parent-currenthuller er uændrede.
- Den naturlige pilot `#32355447654` blev korrekt duplicate-suppressed og tæller ikke som ny time.
- Push-buildet tog 410 sekunder; medianen for syv fulde builds er nu 473 sekunder uden reducerede gates.
- De ni berørte workflowfiler er opgraderet mekanisk til de officielle Node 24-majorer uden ændrede gates eller betingelser. Kandidaten afventer PR-CI og frisk produktion.

## Aktiv reparation og workflowforbedring, 2026-08-20
- PR #3 er merged som 4c6b7e3a, men push-produktion 32358538559 blev fail-closed stoppet i fuld validering før release-gate og deploy.
- Årsagen er fem resterende testforventninger til gamle GitHub Action-majors; live-produktionen blev ikke erstattet.
- Branchen codex/workflow-bootstrap-and-gate retter alle fem, tilføjer central versionskontrol, samler PR-gaten i validate:source og tilføjer reproducerbar Codex-klargøring.
- Lokal scripts/validate-source.ps1 er grøn. Næste trin er PR-gate, merge, fuld produktion og browserkontrol af den nye produktionsdataset.
## Workflowoptimering produktionsverificeret, 2026-08-20
- PR #4 blev merged som 8e4c11c3 efter grøn 17-sekunders kildegate.
- Push-produktion 32359944007 bestod fuld validering, release-gate, supportupload, Supabase, Pages-build og Pages-deploy.
- Supportartifactet er RavRadar-support-3259. Den offentlige dataset er rr-20260820104155-210 med 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- De tidligere Node 20-advarsler er væk. Den officielle Pages-action skriver fortsat en ikke-blokerende punycode-deprecation fra sin egen afhængighed.
- Arbejdsgangsopgaven er afsluttet; næste aktive arbejde er igen P1-historik og modelcyklusser.
## Selektiv skip af ren intern dokumentation, 2026-08-20
- Push til main springer nu kun produktionsworkflowet over, når alle ændringer er afgrænset til interne AI-, RDKS- eller forskningsdokumenter, versionschangelog, AGENTS.md eller de to genererede release-rapporter.
- Kode, data, scripts, workflows, HTML og øvrige offentlige filer udløser fortsat fuld produktion.
- En regressionstest kræver den præcise allowlist og afviser brede docs-, markdown-, data-, script-, workflow- og HTML-undtagelser.
- Formålet er at spare cirka seks minutters produktion og efterfølgende browserkontrol ved rene interne checkpoints uden at svække releasekæden.
## Endelig workflowproduktion 3261, 2026-08-20
- PR #5 blev merged som 0d29a512 og udløste den forventede sidste fulde produktion, fordi selve workflowfilen var ændret.
- Produktion 32361218606 bestod fuld validering, release-gate, supportupload, Supabase og Pages-deploy. Supportartifactet er RavRadar-support-3261.
- Den offentlige dataset rr-20260820105744-210 indeholder 210 zoner og 673 kystdele.
- Fuld Playwright-kontrol bestod 420 aktuelle visninger og 2.100 prognosevisninger uden score-, pile-, farve-, forklarings-, konsol-, side- eller HTTP-fejl.
- Merge af dette rene interne dokumentationscheckpoint er den praktiske kontrol af paths-ignore-reglen og skal ikke starte produktionsworkflowet.

## Docs-skip bekræftet, 2026-08-20
- Den rene dokumentationsmerge 2ebd601e oprettede ingen push-produktionskørsel. Seneste push-produktion er fortsat den fuldt verificerede 0d29a512.
- Paths-ignore-optimeringen er dermed produktionsbevist og workflowopgaven er afsluttet.

## P1-checkpoint #3261
- `rr-20260820105744-210` har 72 rå prøver/42,866 timer i 210 zoner; 198 har samme verificerede spænd, og 12 kendte parenthuller står ved nul.
- Shadow-cachen spænder cirka 105,3 timer. Livepiloten dækker 673/673 med 622 lokal DMI, 43 lokal Copernicus og otte regionale proxyer.
- 72/168 timer er ikke nået, og der er ingen ny uafhængig modelstart. Fortsæt næste ikke-blokerede roadmaparbejde uden at ændre score, fallback eller geometri.
- Det fulde checkpoint ligger i `docs/research/P1_DRIFT_CHECKPOINT_4.0.238_RUN3261.md`.
## Lokal valideringsrettelse
+- `scripts/validate-source.ps1` er gjort kompatibel med både Windows PowerShell og PowerShell 7; en kontrakttest forhindrer den tidligere citatfejl i at vende tilbage.
## PR #8 produktionsverificeret
+- Merge `6d63ac3a`, produktion `#32363403425`, support `RavRadar-support-3263` og datasæt `rr-20260820112436-210` er fuldt grønne og byte-for-byte/live-browserverificerede.
+- Browseraudit: 210 zoner, 673 dele, 420 aktuelle og 2.100 prognosevisninger, nul fejl.
+- P1: 73 rå prøver/43,31 timer, 198 verificerede zoner, 12 uændrede parenthuller og cirka 105,75 timers shadow-capture. Fortsæt næste ikke-blokerede roadmaparbejde; 72/168 timer afventer naturlig tid.
## RavScore fase A-B igangsat score-neutralt
+- `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md` er nu hovedgrundlaget: aktiv kode, tærskler, overlap, systemmodel, evidensklasser, første primærkilder og valideringsforsøg.
+- Vigtigste fund er risiko for dobbelt-tælling og manglende direkte kalibrering af numeriske tærskler/40-35-25-vægte. Bølgeretning, periode og historisk/spatial transport er kun testkandidater.
+- Næste sikre trin er fase C: materialefysik, dansk overførbarhed og deterministisk følsomheds-/overlapmatrix. Ingen produktionsscore må ændres.
## RavScore fase C
+- `scripts/audit-ravscore-sensitivity.mjs` og `docs/research/RAVSCORE_SENSITIVITY_AUDIT_4.0.238.md` dokumenterer 54 tærskelrækker, 18 missing-scenarier, otte overlap og 86.400 syntetiske scenarier.
+- Største spring er -18 ved waders-vind over 6 m/s, -12 ved strandvind over 13 m/s og +10-11 ved strøm 0,15 m/s. Det er kodeadfærd, ikke faglig ændringsgodkendelse.
+- Næste sikre forskning er observerede inputfordelinger, ablation samt fund-/nul- og hold-out-design.
## RavScore fase C produktionsverificeret
+- PR #11/`e85de36d`, produktion `#32366326503`, support `RavRadar-support-3265` og live `rr-20260820115954-210` er fuldt grønne og hash-/browserverificerede.
+- Browseraudit: 210 zoner, 673 dele, 420 aktuelle, 2.100 prognosevisninger og nul fejl. Aktiv scorekode er uændret.
+- P1 er nu 43,90 verificerede timer i 198 zoner og cirka 106,34 timers shadow-capture. Næste ikke-blokerede forskning er fase D-design, mens 72/168 timer vokser naturligt.
## Continuation checkpoint - RavScore phase D
- Branch: `codex/ravscore-phase-d` from merged main `0739a45e`.
- Added `docs/research/RAVSCORE_PHASE_D_CANDIDATE_MODELS.md` and `docs/research/ravscore-observation.schema.json`.
- Active score is unchanged; all candidates are shadow-only.
- Next executable roadmap step is internal observation intake plus immutable forecast-snapshot linkage, followed by a coverage-only report. Do not fit coefficients before that gate.
- Continue to avoid the four protected dirty data files and do not move land/water points.

## 4.0.239 observation safety handoff
- Branch: `codex/observation-safety-40239` from main `866a8a20`.
- Runtime code now redacts trip GPS from all remote observation payloads and locks new observation-driven model suggestions.
- Active score and existing local adaptive-model versions are unchanged.
- Run targeted tests, full source/release validation, PR gates and targeted production UI/runtime verification. Do not run the full 210/673 browser audit for this unrelated change.
- Do not inspect or delete historical central GPS without a separately approved migration.

## Checkpoint 2026-08-20 - main `b1d0e422`
- Live version: 4.0.239. Grøn produktionsrun: `32374202688`.
- Observationer sendes uden tur-GPS; lokal GPS forbliver lokal. Observationsanalyse er dæknings-only og kan ikke ændre RavScore.
- PR #16 er merged og verificeret: `validate:source` kører før DMI, og Copernicus-cachen gendannes igen efter DMI før livehistorikken.
- Seneste fulde produktionsbevis: 673/673 kystdele med verificeret strøm samt konsistente pile, score og forklaringer. Genkør ikke fuld browseraudit uden ugentlig termin eller relevant score/UI/datakontraktændring.
- Næste opgave: gør `build-live-current-pilot.py`-rapportens dækningsbegreb tidskorrekt. Bevar historikken, alle kilder, score, DMI-først og koordinater uændret. Tilføj selvtest for frisk historik uden aktuel/fremtidig scorepost.
- Fire beskyttede dirty datafiler må fortsat ikke røres eller stages.

## Checkpoint 2026-08-20 - main `c73a10d3`
- Grøn produktion: run `32379229853`; liveversion 4.0.239; Pages deployede commit `c73a10d32f2aab15c63787ecb71893fd9275bbf6`.
- Live-current-rapporten skelner nu bevaret historie fra scoreklar dækning og er dækket af den hurtige pre-DMI-gate.
- Alle normale produktionsbyg er låst til readiness-jobbets UTC-time, også push/force. Timed schedule/ikke-forceret dispatch er fortsat de eneste triggere, der kan udsættes ved cachemangel.
- Seneste bevis: 673/673 scoreklare dele fra låst time og 673/673 i den fulde audit. Ingen land-/vandpunkter blev flyttet.
- Næste opgave: RavScore fase D-observationsdækning/evidensgate. Bevar GPS-redaktion, kalibreringslås og produktionsmodel B0.

## Fase D privacy-checkpoint - source
- Aktiv branchdel ændrer kun Supabase-schema/migration og tests; ingen historiske observationsrækker eller land-/vandpunkter ændres.
- Migration: `supabase/migrations/20260820_observation_remote_privacy.sql`.
- Source-gate: `npm run validate:source` inkluderer `test:observation-db-privacy` og er grøn.
- Efter merge må SQL ikke beskrives som produktionsaktiv, før den centrale migration og en sikker positiv/negativ insert-verifikation er bestået.
- Rå observationspayloads, direkte identiteter og GPS må ikke skrives i PR, log eller supportartifact.

## 4.0.240 jagtbarhed og sikkerhed

- Arbejdsbranch: codex/ravscore-safety-language.
- Formål: adskil praktisk jagtbarhed fra sikkerhed uden score- eller geometriændring.
- PR #23 er merged som 961beab1 og produktionsverificeret med frisk fuld gate, direkte kildekontrol og fejlfri onlineaudit af 210 zoner/673 kystdele.
- Beskyt fortsat de fire dirty datafiler i hovedarbejdstræet, og flyt ingen land-/vandpunkter.

## 4.0.241 aktiv bølgeprior

- Arbejdsbranch: codex/ravscore-active-wave-approach.
- Kernen, forklaringen, fallbacken og testværktøjerne er implementeret.
- Featurecommit `ae4c86c6` er merged via PR #25 som `eb66b280`. Produktion `#32405699346` bestod frisk data, fuld validering, release-gate, Supabase, Pages-build og deploy; direkte Pages-kontrol viser 4.0.241 og den aktive bølgejustering. Onlineaudit på datasæt `rr-20260820185733-210` bestod 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden fejl. Næste trin er den særskilte, foreløbige vægtændring til 25/40/35.
- Næste delmål efter stabil produktion er den særskilte vægtændring 25/40/35.
- Flyt ingen land-/vandpunkter, og beskyt fortsat de fire dirty datafiler.

## 4.0.242 foreløbige vægte

- Branchen codex/ravscore-provisional-weights er oprettet fra main efter fuldt verificeret 4.0.241.
- Aktiv kandidat ændrer kun vægtene til 25/40/35 og retter bølgebeslutningens ID til DEC-0040.
- DEC-0041, målrettet test, syntetisk audit og national audit af 673 dele/42.846 scoreposter er grøn. De 420 viste zoner falder i gennemsnit 6,314 point, 7 skifter vindende del, og 110 krydser referencegrænser. Source-gate, browser, PR og produktion mangler.
- Ingen land-/vandpunkter, zoner, kystdele, komponentregler, tærskler eller pile må ændres.
## Lokal validering af 4.0.242 (2026-08-20)

- `pnpm run validate:source` er groen, inklusive den fulde lokale release-gate og de nye vaegt-/auditchecks.
- Browser-pluginet har indlaest 4.0.242 korrekt paa desktop og ved 390 x 844 med zoner, pile, femdoegnsvisning, score og alle tre forklaringsafsnit.
- Den lokale browsertest brugte det seneste offentlige 4.0.241-datasnapshot. Dets indlejrede forklaringstekster viser derfor fortsat 40/35/25 og er ikke produktionsbevis for den nye vaegtning.
- Efter merge skal workflowet bygge friske data med 4.0.242. Deployment maa kun godkendes, hvis score, delscorer, bidrag og forklaring stemmer med 25/40/35; derefter koeres den fulde onlinekontrol af 210 zoner og 673 kystdele.
## Checkpoint efter 4.0.242-produktionsverificering

- PR #28 er merged og produktionsworkflow `32421188352` er grønt på mergecommit `4f3481f272de11554fb64ad602555804f362b715`.
- 4.0.242 viser og beregner 25/40/35 korrekt.
- Fuld kontrol: 210 zoner, 673 kystdele, 420 aktuelle visninger, 2.100 prognosevisninger og 7.560 delscoreforklaringer uden fejl.
- Mobilkontrol ved 390 x 844 er grøn.
- Browser-pluginet fejlede kun på DNS-opløsning; system-Chromium/Playwright-fallbacken bestod.
- Ingen geometri eller land-/vandpunkter er flyttet.
- Fortsæt med næste ikke-blokerede roadmap-punkt. Den foreløbige vægtning skal først genkalibreres, når der findes et repræsentativt grundlag af fund- og nul-fundsture.
## Fase D handoff efter observeret ablation

- Branch: `codex/ravscore-phase-d-observed-ablation` fra main `2226bef5`.
- Nyt værktøj: `scripts/audit-ravscore-observed-ablation.mjs`; real audit på `rr-20260820220004-210` er grøn med 0 kontraktfejl.
- Hovedfund: 6,67 points zonevinderbias, aktuel strandjagtbarhed fast 75, transport-/mobiliseringskorrelation 0,69-0,74 og nul aktiv bølgejustering i snapshotet.
- DEC-0042 og tripprotokollen afviser enkeltfund som fit-enhed.
- Næste kodeopgave er tripkontrakten: faktisk start/slut, søgetid, jagtform, lokal del, dækningsgrad og immutable forecast-link; præcis GPS forbliver lokal.
- Aktiv score, 25/40/35, regler, geometri og punkter er uændrede.

## Handoff 2026-08-21 - 4.0.243 turdata

Aktiv branch: codex/trip-evidence-contract-4.0.243. Seneste browserverificerede funktionscommit før versions-/dokumentationscommit: 8a7016c7; databaseskema-korrektion: 85b6385d; legacy-bro: 00dcd50b. Lokal kontrakt-, privatlivs-, syntaks- og Browser-plugin-kontrol er grøn. Browserflowet viste 210 zoner, korrekt start/stop og samme kystdel; intet testsvar blev indsendt.

Næste trin: anvend/verificer Supabase-migration, kør validate:source og release:gate, commit/push dokumentations- og versionsdelta, opret kort PR, følg gates og merge/deploy kun ved fuld grøn evidens. Efter produktion kræves fuld 210/673-kontrol. De fire beskyttede dirty datafiler i Desktop-worktreeet må ikke røres. Ingen punkter er flyttet.

### Gatecheckpoint 2026-08-21 01:40 CEST

validate:source og release:gate er grønne for 4.0.243, inklusive den nye turkontrakt og observationsprivatliv. Supabase-migrationen er næste og eneste eksterne gate før PR/merge. Kør ikke den fulde 210/673-browserkontrol før exact-commit deploy; lokal integreret Browser-plugin-kontrol er allerede grøn.
## 2026-08-21 - Trip evidence v2: ekstern databasegate

- PR #31 er oprettet som kladde fra den allerede push'ede commit `8a7016c7`; GitHub-run `32430076625` bestod den fulde PR-kilde- og releasegate paa praecis dette head.
- En laesebaseret nul-raekkers PostgREST-kontrol bekraeftede, at `trip_id` findes (`HTTP 200`), mens v2-kolonnerne endnu ikke findes (`HTTP 400`, PostgreSQL `42703`).
- Repositoryet har ingen automatisk migrationsworkflow, og maskinen har hverken Supabase CLI, `psql` eller databaseforbindelsesmiljoevariabler. Migrationen maa derfor anvendes via en eksisterende godkendt databasekanal, foer PR'en kan goeres klar til merge.
- Det lokale releasecommit `95022593` indeholder fire utilsigtede byggeartefakter. De er ikke pushet. En sikker oprydning er forberedt, men sletningen kraever ejerens udtrykkelige godkendelse efter vaerktoejsafvisning.
## 2026-08-21 - Databasegaten er lukket

- Browser-pluginet fandt en aktiv Supabase-session og det korrekte RavRadar-projekt. Ingen tabeller med private rækker blev åbnet.
- Produktionstabellen var tom, men havde historisk `bigint` identity for `id` og `bigint` for `zone_id`. Den første v2-migration ramte derfor en typefejl og blev fuldt rullet tilbage; den næste ramte identity-detektion og blev også fuldt rullet tilbage.
- Kode og migration blev afstemt til den virkelige tabel. Den endelige v2-migration og den eksisterende, korrigerede privacy-migration blev derefter anvendt grønt i transaktioner.
- PostgREST, metadata og anonym rollback-insert er grønne; tabellen har fortsat nul rækker.
- Supabase varsler mulig projektbegrænsning fra 9. september 2026 på grund af egress over gratisgrænsen. Dette er registreret som kendt issue.
- Lokal commitkæde indeholder fortsat de fire ikke-push'ede byggeartefakter fra commit `95022593`. De må først fjernes efter ejerens udtrykkelige godkendelse; PR #31 og remote branch indeholder dem ikke.
- Efter den endelige kode- og migrationsrettelse bestod hele `validate:source`, inklusive `release:gate`, for 4.0.243.
- Egress blev undersøgt i Usage, Unified Logs, dokumentstørrelser og `pg_stat_statements`. Den seneste fulde dag var 64 MB (100% PostgREST) efter tidligere 700-1.500 MB-dage. Den eksisterende diagnostikpakning ser ud til at have løst problemet; overvågning er bedre cost/benefit end ny cachekode nu.

## Handoff 2026-08-21 - v4.0.243 afsluttet og næste hovedfase

- PR #31 er merged som `2ded7943`; exact-commit produktion `32455335962` er grøn og live viser 4.0.243.
- Browser-plugin bekræftede den nye side. Fallback-audit gennemgik 210 zoner, 673 kystdele, begge jagtformer, 420 aktuelle og 2.100 prognosevisninger med nul fejl.
- De fire utilsigtede byggeartefakter blev fjernet i korrektionscommit `f6a268bb`; de fire beskyttede dirty Desktop-datafiler blev ikke rørt.
- Næste P1 er en lille separat ændring, der begrænser normal Copernicus-pilot til godkendte DMI-huller. DMI-først, score og punkter må ikke ændres.
- Derefter gennemføres den store analyse og DEC-0044-planen: evidensregister, kandidatregler/vægte, lokal gammel-mod-ny-automatik, ejer/Codex-gennemgang, hændelsesmodel, ravvinduer, forklaringer og læringsmodul.
- Brug `docs/research/RAVSCORE_RESEARCH_PRODUCT_PLAN_2026-08-21.md` som den forståelige oversigt og DEC-0044 som bindende krav.

## Checkpoint: 4.0.244-kandidat
Normal Copernicus er ændret fra alle 673 kystdele til en automatisk liste over aktuelle lokale DMI-huller. En bred landskørsel kræver det manuelle full_coast-valg. Ingen koordinater er ændret. Næste skridt er målrettede tests, release-gate, PR, præcis produktionsverifikation og derefter fortsættelse af den allerede igangsatte store RavScore-evidensanalyse.

## Checkpoint: 4.0.245 Copernicus-target hotfix
- 4.0.244 blev merged, men den præcise produktion stoppede sikkert ved 630/673 før release og deploy. Den selvstændige pilot kunne ikke danne en eksakt-times DMI-hulliste fra ældre deployet dækning.
- 4.0.245 danner den autoritative hulliste efter frisk DMI i produktionen, kontrollerer den private shadow mod netop listen og henter kun manglende mål før livefletning og den uændrede 673/673-gate.
- Den selvstændige pilot gendanner seneste private DMI-cache, og preserve-workflowet sender den eksakte time videre.
- DMI er fortsat førstevalg. Score, regionale proxyer, geometri og alle land-/vandpunkter er uændrede.
- Næste trin: målrettede regressioner, kildekodegate, version, commit/push/PR, exact-head gates og kun derefter eventuel merge og præcis produktionsverifikation.

## Checkpoint: 4.0.246 DMI-strømtime
- PR #35/4.0.245 blev merged som `b461e7a5`. Exact-head-gaten var grøn, men produktion `32465245055` stoppede sikkert i det nye målregistertrin; livefletning, fuld validering, release og deploy blev ikke kørt.
- Artifactet beviser, at 08:00 fandtes for andre DMI-felter, men gav 0/673 gyldige lokale strømme. 09:00 gav 622/673 og 51 reelle huller. Fejlen var derfor timeresolution, ikke manglende frisk DMI-cache.
- 4.0.246 vælger kun ved nul eksakt dækning den højest dækkede og derefter nærmeste DMI-strømtime inden for tre timer og binder hele den efterfølgende produktionskæde til den valgte time.
- Hvis ingen nærliggende verificeret DMI-strømtime findes, stopper målbyggeren fortsat. DMI-først, 673/673, score, proxyer, geometri og punkter er uændrede.
- Næste trin: tests, versionslukning, commit/push/PR, exact-head-gates og præcis produktion. Først derefter fortsættes RavScore-analysen.

## Checkpoint: 4.0.246 produktion og 4.0.247 testmatrix
- PR #36 blev merged som c2e0d024; produktion 32467031990 bestod hele kæden og live viser 4.0.246, 210 zoner, 673 dele og reference 09:00Z.
- DMI leverer 622 lokale dele; målrettet Copernicus udfylder 43 reelle huller, og de otte godkendte regionale proxyer er uændrede. Ingen punkter er flyttet.
- 4.0.247-kandidaten fjerner kun gentaget validate:source fra planlagte same-source vejropdateringer. Push/manuelle builds, exact-head PR-gate og fuld post-data validate/releasegate bevares.
- Den fulde browseraudit køres ikke for denne workflow-/dokumentationsændring. Næste roadmappunkt efter produktionsbevis er den allerede CI-grønne forskningssyntese og automatisk gammel-mod-ny-scoreanalyse.

## Checkpoint: 4.0.247 produktionsverificeret
- PR #37 er merged som 3dc331ca, og produktion 32468752244 er grøn på den eksakte mergecommit.
- Live viser 4.0.247, datasæt rr-20260821094303-210, 210 zoner, 673 kystdele og reference 09:00Z.
- Fuld post-data validering, releasegate, Supabase, artifact og Pages bestod. Ingen browseraudit var relevant for workflowændringen.
- PR #34 er opdateret til den aktuelle main og indeholder den samlede RavScore-evidenssyntese. Næste trin er ny exact-head-gate, merge og derefter automatisk gammel-mod-ny-scoreanalyse.

## Checkpoint: 4.0.248 RavScore-sammenligning

- Branchen codex/ravscore-candidate-comparison implementerer stabile model-ID'er og Kandidat A-C som score-neutrale forskningsresultater.
- Observeret audit sammenligner gammel 40/35/25 med aktiv 25/40/35 på samme offentlige poster.
- En ny tynd rapportgenerator genbruger syntetisk og observeret audit og skriver kun en kort dansk ejer-rapport.
- Næste trin: generér rapport på live public-condition-details, kør målrettede self-tests/RDKS/release, commit/push/PR og præcis produktion.
- Ingen produktionsscore, forklaring, pil, datakilde, geometri eller punkt er ændret.

## v4.0.248-kandidatgennemgang (2026-08-21)

Den automatiske ejeroversigt og den faglige gennemgang er nu genereret. Dette afsnit erstatter tidligere status om, at rapporten manglede. Konklusionen er at beholde den aktive vaegtning 25/40/35 og ikke aktivere A, B eller C samlet. A er for volatil, B skal skelne levering fra passage, og C er en mulig mild fysisk gate, men der er kun 3 af 1.346 aktuelle kystdele med mindst middel score og et tydeligt svagt fysisk led. Naeste trin er derfor score-neutral intern skyggekoersel og maalrettet retningskontrol, ikke en offentlig scoreaendring. Se `docs/research/RAVSCORE_CANDIDATE_REVIEW_2026-08-21.md`.

## v4.0.249: privat RavScore-kandidat-shadow

Den eksisterende private nationale shadow-validator beregner nu A, B og C på samme lokale context som den aktive score. Den bruger 24 timers hændelseshistorik og 72 timers strømforløb, opdeler kandidat B i strøm mod, langs og væk fra kysten og gemmer kun dataminimerede forskelle. Den aktive vægtning 25/40/35, offentlig score, UI, vejrsampling, admin-data og geometri ændres ikke. Koden er målrettet selftestet; næste evidens er én virkelig privat national shadow-kørsel efter merge. Se DEC-0047 og `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`.

## Checkpoint 4.0.250 - aktiv RavScore-shadow

Den tidligere nationale geometrikoersel `32474884163` fejlede korrekt paa det uafhaengige punktbevis. Ingen punkter er flyttet, og gaten er ikke omgaaet. Branchens nye manuelle job bygger i stedet et midlertidigt read-only input fra den aktive public-details-bestand og repoets zoneopslag. Den realistiske lokale prøve gav dataset `rr-20260821105135-210`, 210 zoner og 673 dele; score/public runtime/automatisk aktivering var alle falsk. Efter merge skal exact-commit produktion foelges, derefter koeres `ravscore_active_shadow=true`, og kun den kompakte rapport analyseres. Aktiv score er fortsat 25/40/35.

## Checkpoint 4.0.251 - foerste aktive shadowrun fandt collection-mismatch

Run `32479158213` paa merge `34ed1dbc39c18aaefcb77aac89028ebb29c45468` sprang produktion/deploy over, byggede aktivt 210/673-input og verificerede 673 native DMI-punkter. Kontrakten rapporterede foreloebigt 622 fuld og 51 delvis dækning, men flertrinsgaten stoppede foer state/score ved `dk-b01-02-national-part-01`, fordi DKSS-komponenter var fordelt over collections. 4.0.251 klassificerer nu kun en familie som komplet inden for samme collection og kræver U/V i samme punkt og collection. Koer ny PR, produktion og shadow; brug ikke den fejlede rapports 622/51 som scoreevidens.

## Checkpoint 2026-08-22 - Candidate G-beslutningsgrundlag og shadowgate lukket

- PR #59 er merged som `6b1511e0`. Centralt hydreret shadow `32554012542` kontrollerede 210 zoner/673 dele score-neutralt; kun 243 dele havde komplette scoreinput, og retention-featurecoverage var nul.
- Kandidat G må ikke aktiveres. 50/50 uden direkte vind er næste foretrukne beslutningsvariant; coverage, waders-betydning, pile/forklaring og ejer-go/no-go er åbne.
- Første main-produktion `32565885534` stoppede korrekt før release/deploy på en for bred shadowtest. PR #60 låste GET-only regelhydrering, konkrete skrive-/deployforbud og kørsel af testen i `validate:source`.
- PR #60 er merged som `41e01e2d`; exact-head-gate `32566573875`, fuld produktion `32566631701` og Pages deployment `6035679906` er grønne. Live 4.0.252/datasæt `rr-20260822100745-210` har 210 zoner og 673 dele.
- Aktiv RavScore er fortsat 25/40/35. Beskyttede data, artifactkilder, geometri og land-/vandpunkter er ikke ændret.

## Lokal Codex/GitHub-login på den nye Windows-computer

- Git Credential Manager er sat til den Windows-DPAPI-krypterede filstore med global `credential.credentialStore=dpapi`; et frisk noninteraktivt `git ls-remote` og PR #60-flowet bekræftede vedvarende adgang uden nyt browserlogin.
- Brug den bundne Codex-Git under `.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe`, hvis appens PATH mister Git efter sleep eller genstart.
- Start lange autonome forløb med en read-only `git ls-remote`- og GitHub-connectorpreflight. Ingen credentials, tokens eller storeindhold må logges eller committes.
