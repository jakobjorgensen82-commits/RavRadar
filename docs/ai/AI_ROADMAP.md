# AI Roadmap – RavRadar 4.0.287+

## P0 afsluttet – færdigt hybridt konto- og turlager

- [x] Bevar Supabase til Auth, profiler, rettigheder, rate limit og Edge; flyt normal turvækst til ti EU-låste Cloudflare D1-shards.
- [x] Send kun HMAC-pseudonymiseret ejerskab og allowlistede turdata til Cloudflare; forbyd rå ID, mail, navn, JWT, GPS og rute.
- [x] Signér hele servicekaldet, håndhæv tidsgrænse, kanonisk hash og idempotens.
- [x] Migrér før/efter cutover uden kildesletning; behold eksplicit Supabase-rollback og idempotent vej tilbage.
- [x] Overvåg lager uden payloads ved 70/85 % og understøt eksplicit ejersletning på tværs af begge lagre.
- [x] Opret live Cloudflare-konto, mindst-mulige credentials og krypterede GitHub-secrets efter godkendelse; bestå infrastrukturens exact-head/merge og rollback-Edge-deploy.
- [x] Bestå kandidatens exact-head/merge, opret/skema-verificér ti live EU-shards og deploy Worker; stop første cutover sikkert før migration/Edge på health-udbredelsesforsinkelsen.
- [x] Bestå bounded-retry-opfølgningens exact-head `33019805663`, merge PR #166 som `2d12c085`, privat Worker-grænse, idempotent 4/4-migration og normal D1-drift på eksakt `main` gennem `33019868542`.
- [x] Bestå fuld produktion `33019856228`, Pages-job `98351206091`, offentlig `rr-20260826224651-210`-verifikation og payloadfri kapacitetsmonitor `33021364240`.
- [x] Sæt begge mindst-mulige Cloudflare-tokens til **No expiration**, udskift Supabase-PAT'et til udløb 25. august 2027 og bestå ende-til-ende-D1-verifikation `33024408547` før tilbagekaldelse af gamle PAT'er.
- [x] Genbekræft audit-tokenet gennem payloadfri `33024621109` med ti shards og 0 % forbrug.
- [x] Tilføj og verificér det daværende secret-frie GitHub-issue/mailvarsel fra 60 dage før PAT-udløb.
- [x] Bestå PR #169/exact-head `33025102301`, merge `1e402834`, manuel main-prøve `33025289153`, frisk produktion `33025210517`/Pages `98367528389` og offentlig 210/673/420/2.100-kontrol.
- [x] Erstat efter ejerbeslutningen kalenderrotation og -varsel med et behovsstyret management-PAT, som normal drift ikke afhænger af, og som kun oprettes kortvarigt til en konkret verificeret Supabase-deploy/migration/rollback.

Se DEC-0082. Supabase-varselet 9. september 2026 følges fortsat.

## P1 aktiv – intern, score-neutral Ravudsigten-sammenligning

- [x] Opret intern analysejournal og registrér første tidsstemplede snapshot af aktuelle top-fem, femdøgnssignaler, RavRadar-match og komponentforklaringer.
- [ ] Luk det sikre produktionsstop `33029447510` med en eksakt enkeltfil-undtagelse, som kræver analysens interne/score-neutrale/ikke-offentlige markører, og bestå ny exact-head/produktion.
- [ ] Fortsæt skånsom indsamling af tidsstemplede, offentligt synlige resultater fra Ravudsigten og RavRadar for sammenlignelige kystområder over flere reelle vejrsituationer.
- [ ] Sammenlign enighed og forskydning i sted, starttid, varighed og styrke samt observerbare hypoteser om vind, strøm i flere lag, vandstand og historik.
- [ ] Brug uafhængige tur-/fundobservationer som fasit, hvor datakvalitet og samtykke tillader det; et enkelt snapshot eller modellernes indbyrdes enighed er ikke validering.
- [ ] Omgå ingen adgangskontrol, hent ingen privat kode, og beskriv sandsynlige regler som hypoteser frem for fakta.
- [ ] Bevar `scoreImpact=false` og `publicRuntime=false`. Opgaven må kun være synlig i RDKS/roadmap/changelog og må ikke nå app, offentlig håndbog, ekspert-/adminflader eller offentlige prognosedata.

Første snapshot og metodejournal: `docs/rdks/30_FEATURES/INTERNAL-RAVRADAR-RAVUDSIGTEN-ANALYSE.md`.

## P0 afsluttet – 4.0.286 rullende cadencefase

- [x] Bevis offentlig 4.0.285-masseregression efter grøn produktion.
- [x] Bevar det kompakte grænsebevis til næste rullende reference uden replay eller ekstra dækning.
- [x] Lås to efterfølgende faseskudte referencer.
- [x] Auditér den faktiske public runtime før deploy og afvis 4.0.285-artifactet med den nye gate.
- [x] Simulér recovery til 672/673 `READY` mod de offentlige artifacts.
- [x] Afgræns #3620's 1.328/1.344 modes til otte gyldige native holds og ret kun den hukommelsesbaserede Candidate G-vej.
- [x] Bevis begge modes og fail-closed-modtilfælde samt 16/16 faktisk offentligt fejlpunktsreplay uden rådata.
- [x] Bestå PR #159/exact-head `33001615758`, merge `c0f42b33`, fuld produktion `33001743118` og positiv offentlig kontrol med 210/210 aktive zoner og befolket **Bedste områder**.

## Afsluttet men funktionelt afvist – 4.0.285 cadencefase-recovery

- [x] Sammenlign kun offentlige Pages-artifacts og lokaliser 672→8 `READY`-faldet til første 4.0.284-build.
- [x] Ret vinduesgrænsen med dokumenteret forgænger og højst tre timers kadence uden interpolation.
- [x] Lås et ægte 47-timersdatasæt og større huller fail-closed.
- [x] Hash-lås og simuler compact-only recovery til 672/673 `READY`.
- [x] Bevar geodataenes versionsfelter og alle punkter urørte.
- [x] Bestå exact-head `32993055324`, merge `de6b7844` og produktion `32993270783`.
- [x] Kør positiv offentlig kontrol; 4.0.285 blev afvist med 0/210 aktive zoner og erstattes af 4.0.286.

Se DEC-0081.

## Udgivet – 4.0.284 sikkerhedsrelease

- [x] Hærd HTML/CSP, ekspert-RLS/RPC/UI, observation-Edge og assistent-Edge.
- [x] Saml fælles Edge-gateway og deploy/verificér funktionerne uden Windows-sikkerhedsomgåelse.
- [x] Vælg og test lokal assistent som standard uden fjernkald.
- [x] Anvend og dataminimeret kontrollér smallere live-RLS uden private rækker.
- [x] Synkronisér version, RDKS, håndbøger og changelog; bevis ren geodataversiondiff.
- [x] Bestå lokal source-/releasegate og målrettet browserkontrol uden fjernassistentskald.
- [x] Bestå exact-head `32986025916`, merge `a92e2704`, produktion `32987875007` og offentlig sikkerheds-/strukturkontrol.
- [x] Luk den særskilte rullende Candidate G-cadencefase gennem den produktionsverificerede 4.0.286 ovenfor.
- [ ] Overvåg Supabase-egress og varslet om mulig begrænsning 9. september 2026.

Se DEC-0080. Candidate G, score, vejr, zoner, geometri og land-/vandpunkter er uændrede.

## Produktionsverificeret – bevar moderzone i Candidate G-slutkontrollen

- [x] Bevis i produktion, at livepiloten og Candidate G-state havde 673/673 scoreklare kyststrækninger.
- [x] Afgræns 665/673-fejlen til slutkontrollens tab af moderzone under udfladning.
- [x] Indfør én fælles udfladning, hvor den autoritative zone-nøgle bevares.
- [x] Lås med regression, at native-kadencereferencen matches uden et indlejret `zoneId`.
- [x] Dokumentér DEC-0079 og versionér til 4.0.283 uden anden geodataændring end topversionsfelterne.
- [x] Bestå PR #153/exact-head `32914734446`, merge `1caad399`, fuld produktion `32914887586` og offentlig 673-kystdelskontrol.

## Produktionsverificeret – eksakt native reference ved Candidate G-vinduesskift

- [x] Afgræns 665/673 til de otte godkendte tretimers-regionalproxyer og bevis, at kildehistorikken ikke var tabt.
- [x] Før kun den eksakte foregående verificerede prøve ind i state-pipelinen i højst tre timer.
- [x] Dataminimér til tid og kystrelativ styrke uden rå U/V, koordinater eller punkt-id.
- [x] Lås ingen-interpolation, ingen ny måling/pil og ingen mobilisering med målrettede tests.
- [x] Dokumentér DEC-0078 og versionér til 4.0.282 med kun topversionsændring i beskyttet geodata.
- [x] Bestå exact-head, merge og den efterfølgende 4.0.283-produktion `32914887586`, som verificerede alle 673 kystdele.

## Produktionsverificeret – Candidate G-native tekniske forklaringer i 4.0.281

- [x] Afgræns falske Mangler/Ukendt til forklaringsprojektionen og UI'et, ikke scoremotoren.
- [x] Bevar Candidate G's aktuelle status, 48-timershistorik, fase og transportforklaring gennem zone- og kystdelsvisning.
- [x] Fjern den tekniske visnings afhængighed af den pensionerede scoremotors felter.
- [x] Forklar native tretimers-mellemtimer uden at opfinde en ny rå måling eller retning.
- [x] Lås kontrakten med målrettede tests og DEC-0077.
- [x] Bestå PR #150/exact-head, merge `1308a07d`, fuld produktion `32899040618` og offentlig landskontrol.
- [x] Bestå 420 aktuelle visninger, 2.100 prognosevisninger og 673 kystdelsreferencer uden fejl og uden falsk **Mangler/Ukendt** på aktive dele.

Candidate G 20/50/30, scorekurver, vejrdata, zoner, geometri og land-/vandpunkter ændres ikke.

## Produktionsverificeret – korrekt orienteret Om RavRadar-billede i 4.0.280

- [x] Afgræns fejlen til EXIF-orientering i den tidligere billedkonvertering.
- [x] Bevar originalen urørt og indarbejd portrætretningen i tre komprimerede billedvarianter.
- [x] Tilpas pc- og mobillayout uden vandret rulning.
- [x] Opdatér appskal, målrettet test og RDKS.
- [x] Bestå exact-head og merge PR #149 som `42b7058f`; ejeren verificerede efter udgivelsen både pc- og mobilvisningen.

Ingen Candidate G-, score-, vejr-, zone-, geometri-, punkt- eller adminadfærd ændres.

## P0 nu – årsagstro native mellemtimer i 4.0.277

- [x] Afgræns 666/673-stoppet til fremtidstælling i readiness og falske null-mellemtimer for de otte godkendte `dkss_lf`-proxyer.
- [x] Fasthold kun afledt transporttilstand i højst tre timer uden ny bevægelse, evidens, måling eller pil.
- [x] Bevar Candidate G-only 20/50/30, punktvis historik og lokalt fail-closed stop efter tre timer.
- [x] Bestå målrettede lokale regressioner og dokumentér DEC-0074.
- [x] Bestå PR #140 exact-head og merge som `d3b4542f`.
- [x] Ret den forældede statiske dæknings-test, som stoppede første produktion efter grøn historik- og runtimebygning.
- [x] Bestå PR #141 exact-head `32817501003`, merge `81e9b891`, frisk produktion `32817626537` og offentlig dataminimeret efterkontrol.

Produktionslukningen viser 673/673 accepterede Candidate G-states, nul resets og 12–45 timers naturlig historik. Der kræves ikke en ny 48-timers realtidstest. Den eksisterende overvågning følger kun, at zonerne åbner ved ægte 48 timer; der opbygges ingen kunstig historik, og ingen zone, geometri eller land-/vandpunkt ændres.

## Historisk og erstattet – Candidate G alene og lokal utilgængelighed i 4.0.273

- Candidate G `20/50/30` er eneste offentlige scoremodel. Offentlig `25/40/35`-fallback er fjernet.
- Hvis en konkret zone, søgemåde eller time ikke har et gyldigt Candidate G-grundlag, vises ingen score dér, og posten udelades fra aktuelle og femdøgns-ranglister. Resten af landet fortsætter på Candidate G.
- Adminforsiden skal gøre det tydeligt, om alle zone-/søgemådekombinationer er aktive, og ellers vise hvilke der mangler og hvorfor.
- Ingen legacy-, moderzone-, nabozone- eller anden-timescore må udfylde et hul. Produktionens state-, provenance- og releasegates forbliver strenge.
- 4.0.273 blev ikke deployet. Den korrigerede Candidate G-only-kontrakt blev produktionsverificeret i 4.0.275 via PR #136/exact-head `32778118765`, merge `59ea4546` og produktion `32778269487`. Se DEC-0072.
- Ældre roadmap-punkter om global rollback eller automatisk skift til `25/40/35` er historiske og erstattet af dette punkt.

## 4.0.269 – aktuelle scoreforklaringer

- [x] Bind alle tre offentlige delscoreforklaringer til den valgte rækkes faktiske offentlige forhold og state.
- [x] Skeln tydeligt mellem bølgemobilisering, strømtransport og vindens indirekte virkning.
- [x] Fjern misvisende lavvandsforklaring samt umoden Fundprognose og tekniske offentlige scorefelter.
- [x] Bevar observationsdata og intern læring uden dobbeltlagring.
- [x] Opdatér tomtilstand, kilder, licenser, tests, RDKS og håndbøger uden score- eller geodataændring.
- [x] Bestå PR #120 exact-head `32703138969`, merge `d745e0ba`, produktion `32703271897` og live `rr-20260824080543-210` på 210/673.
- [x] Bestå 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl.

## 4.0.268 – produktionsverificeret grundbog og almindeligt dansk

- [x] Gør læringsmodulet til en grundbog i ravjagt, hvor ravets egenskaber, havets processer, kysten, felttegn og jagtmetoder kommer før RavRadar.
- [x] Dæk mobilisering, transport, strøm, vind, bølger, vandstand, revler, render, strand, vandkant, waders, UV og hændelsesforløb med synlige kilder og evidensniveauer.
- [x] Gennemgå offentligt sprog i score, opdatering, assistent, login, konto, tur og fejl uden at ændre tekniske adminværktøjer.
- [x] Lås faglig rækkefølge, almindeligt dansk, aktiv `20/50/30`, waders-kurve og udtransportregel i målrettede tests og releasegate.
- [x] Bestå PR #118 exact-head `32672522334`, merge `3c22e40b`, produktion `32672578127` og live `rr-20260823230848-210` på 210/673.
- [x] Bestå 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl.
- [x] Bevar score, Candidate G, vejrkontrakt, Supabase-kontrakt, geometri, land-/vandpunkter og private data uændret.

## 4.0.265 – produktionsverificeret kontoindberetning og frivilligt fravalg

- [x] En indlogget bruger kan indberette en tur eller et fund fra kontosiden uden først at starte en tur.
- [x] Kontoindberetningen genbruger de aktive, forståelige rapportspørgsmål og samme `observations`-række. Der opstår ingen ekstra Supabase-tabel eller dubletpost.
- [x] Brugeren vælger korrekt startdato, starttid og varighed. Aktuelle forhold ved den senere indberetning må aldrig gemmes som historisk vejr eller score.
- [x] Uden et sikkert historisk vejr-/scoregrundlag gemmes rapporten med tomme snapshotfelter og `calibration_eligible=false` frem for konstruerede data.
- [x] En startet tur har **Afslut uden at indberette**, som efter bekræftelse rydder den lokale tur uden observations- eller serverpost. **Svar senere** bevarer fortsat turen lokalt.
- [x] Begge rapportveje bruger samme afhængige zone→kyststrækning-menu og validering.
- [x] Målrettede tests for kontrakt, lagring, fravalg, kontooversigt og almindeligt dansk er grønne.
- [x] Versionsluk og bestå PR #111/exact-head `32658661075`, merge `cb7d2232` og fuld produktion `32658724861`. Live `rr-20260823184330-210` er 4.0.265 på 210/673; den udgivne, ikke-dataskrivende kontrol bekræfter selvvalgt dato/tid uden forudfyldning samt fravalg.

## 4.0.264 – brugerflow, login og privat turlog

- [x] Brug én direkte komplet v2-tur og fjern den gamle GPS-baserede parallelrejse fra den aktive UI.
- [x] Vis **Mine ture og fund** fra den eksisterende `observations`-tabel gennem ejer-RLS uden ekstra Supabase-tabel, række eller kopi.
- [x] Begræns kontolæsningen til brugerens klik, nødvendige felter og højst 100 ture; deduplikér lokal outbox mod serverposten.
- [x] Hydrér bruger-id efter magic-link-callback, og blokér afsendelse af en kontoejet outbox-tur som en anden bruger.
- [x] Forenkle centrale offentlige forklaringer og lås kontrakterne i målrettede tests.
- [x] Bestå samlet lokal kilde-/RDKS-/releasegate og eksakt geodatadiff.
- [x] Bestå PR #104 exact-head `32651048627` og merge som `579bd167`.
- [x] Fang den forældede GPS-feedbacktest i produktion `32651106811`, ret den til direkte v2 og føj den til `validate:source`.
- [x] Bestå PR #105 exact-head `32651724416` og merge som `7c43146f`; lad produktion `32651786366` stoppe før deploy på den næste forældede ordrette teksttest.
- [x] Ret stjerneforklaringens test og den lokalt fundne gamle mobil-turtest, og føj begge til `validate:source`.
- [x] Bestå PR #106 exact-head `32652894729`, merge `23fa89ed` og frisk fuld produktion `32652970105` med live 4.0.264 på 210/673.
- [x] Browserkontrollér konto-/loginforklaring og direkte tur uden GPS/rute; ret den fulde audits gamle vandstandsetiket og bestå 420/2.100/673 uden fejl.
- [x] Før auditrettelsen gennem PR #107/exact-head `32654048944`, merge `8b758337` og fuld grøn produktion `32654119745`.
- [ ] Ejerens senere interaktive loginprøve kan kontrollere en rigtig magic-link-mail, den autentificerede **Mine ture og fund**-liste og en kontoejet tur; ingen mail sendes automatisk.
- [x] Bevis workflowets rodhåndbogsskip med PR #108/exact-head `32654780774`, merge `98621bf9` og 0 oprettede push-produktionskørsler.

## Candidate G – 4.0.263 aktuel referencegate

- [x] Produktionsverificér 4.0.262's cadence i `32642532892`: 673/673 accepterede states, nul replaymismatch, 110 positive og 563 fysisk fortsat nul.
- [x] Opdag før godkendelse, at et senere prognosegap slog den sunde aktuelle warmup fra og valgte legacy globalt.
- [x] Implementér DEC-0062's fælles aktuelle zonereference for memory-/warmup-gaten uden at lempe femdøgnets scorecoverage.
- [x] Bevar global rollback ved aktuel missing/gap og lokal fail-closed state ved fremtidige gaps.
- [x] Lås regressionen og `CURRENT_COMMON_ZONE_REFERENCE` i målrettede tests/shadowkontrakten.
- [x] Bestå samlet lokal source-/RDKS-/releasegate og eksakt geodatadiff.
- [x] Bestå PR #101/exact-head `32644701811`, merge `9f5953f6`, frisk produktion `32644772373`, aktiv shadow `32645569741` og fuld browserkontrol på live `rr-20260823142247-210`.

## Candidate G – 4.0.262 native cadence og sikker warmup

- [x] Reproducér den aktive P0 systemisk: 658/673 states havde tre timers bevisafstand, én-times-gaten efterlod én prøve med nul forløbstid, og alle 673 transportresultater stod på 0.
- [x] Vælg produktionens dokumenterede tre-timers native stride som maksimal kontinuerlig afstand; integrér faktisk forløbstid uden at opfinde mellemtimer.
- [x] Bevar fail-closed ved mere end tre timer og missing; tillad kun `WINDOW_INCOMPLETE` under ejerens pre-public opvarmning.
- [x] Tilføj global `candidateWarmupEligible`-gate og genafspil kompakt public state i shadowen med eksakt resultatkontrol.
- [x] Lås 3-timers fortsættelse, 17-punkts/48-timers readiness, split/ubrudt identitet og 4-timers gap i målrettede tests.
- [x] Genafspil gammel live state dataminimeret: 110 positive, 563 fortsat nul og 658 forventede mismatch mod det fejlberegnede artifact.
- [x] Bestå samlet lokal source-/RDKS-/releasekontrol og diffkontrol.
- [x] Bestå GitHub exact-head `32642456123`, PR #100/merge `586fbd18` og frisk fuld produktion `32642532892` med central readback.
- [x] Efteraudit beviste nul replaymismatch og cadencekorrekt transport, men fandt DEC-0062's referencescopefejl; aktiv shadow og browserlukning flyttes derfor til 4.0.263.

## Candidate G – aktiv 4.0.261-leverance efter DEC-0060

- [x] Registrér ejerens pre-public aktiveringsbeslutning og accept af foreløbig score under det første ufuldstændige 48-timersvindue.
- [x] Vælg Candidate G `RESEARCH-3` med `20/50/30` globalt og bevar eksakt legacyrollback.
- [x] Implementér central `ravscore-profile-selection`, sikker engangspromotion, central autoritet og readbackkontrakt.
- [x] Lås komplet scoreprojektion, ærlig memory-status, automatisk aktiveringsforbud og global fail-closed i målrettede tests.
- [x] Bestå samlet lokal kildegate.
- [x] Bestå exact-head `32636378576`, fuld produktion `32636433944`, auditrettelse og produktion `32637387600`, aktiv shadow `32637833674` samt fuld 210/673/420/2.100-browserkontrol; lukket i PR #97–99.

## Historisk score-neutral omskifter efter DEC-0058

- [x] Accepter nattens 6/6 timers naturlige 673/673-state som praktisk ejerbesluttet evidens uden at kalde det et 48-timersbevis.
- [x] Implementér en global, versionsbundet profilomskifter med aktiv `RRS-CURRENT-B0-4.0.247`, Candidate G-id og eksakt rollback.
- [x] Lås fail-closed krav om komplet dækning, frisk slutshadow og særskilt ejerbeslutning; automatisk aktivering forbliver falsk.
- [x] Før profilkontrakten gennem offentlig startpakke, detaljepakke og manifest uden offentlig scoreændring.
- [x] Bestå 4.0.260 exact-head `32628441062`, PR #92/merge `c5898ce8`, produktion `32628516066`, frisk 210/673/1.346-shadow og 420/2.100-browserkontrol.
- [x] Gennemgå Candidate G's unge scorefordeling med ejeren. DEC-0059 fjernede maskinstarten, og DEC-0060 accepterer den nye models første ikke-offentlige opvarmningsfordeling som foreløbig.
- [x] Bevis dataminimeret, at eksisterende 65–117 timers offentlige strømhistorik ikke kan identificere startreserven, når neutral strøm ikke nedskriver state; 607/633 dele bevarer mindst 50 points priorforskel.
- [x] Forkast neutral startprior 50 efter ejerbeslutning og implementér DEC-0059's faste 48-timers evidensvindue i en ny versionsbundet state-/profilkontrakt.
- [x] Bevis uden en ny realtidsventeperiode, at 582 komplette historiske vinduer giver samme resultat for tænkte starter 0, 50 og 100.
- [x] Erstattet af DEC-0060: ejeren har godkendt pre-public aktivering; central roundtrip implementeres i 4.0.261 og skal produktionsverificeres.

## Candidate G – mobiliserings-/helhedsreview efter DEC-0056

- [x] Udskift additiv bølge/vind/strøm/varighedsmobilisering med én kausal bølgeenergitilstand.
- [x] Lås 4/48-profil, missing-hold og kompakt fortsættelse i syntetiske tests og privat 1.460-evalueringsreplay.
- [x] Bevar stedegnethed, bund/dybde/render/revler og sikkerhedsrådgivning uden for modellen.
- [x] Saml `RESEARCH-3` som foretrukken score-neutral helhedskandidat med `20/50/30`, DEC-0054 og DEC-0055.
- [x] Før checkpointet gennem exact-head `32609888406`, PR #89/merge `31e50acb` og fuld produktion `32609952992` uden offentlig scoreændring.
- [x] Lever den samlede score-neutrale pipeline-/rollbackpakke og fallback-kompatible 673-deles shadow i 4.0.259.
- [x] Opbyg 6/6 timers naturlig state-alder uden nulstilling. Dette var praktisk evidens til omskifterforberedelsen; den daværende lukkede aktiveringsstatus blev senere erstattet af DEC-0060.

## Candidate G – strømstyret rand- og tærskelkontrol efter DEC-0055

- [x] Implementér valgfri neutral halvering på 24/48 timer uden at ændre den godkendte ind-/udtransport eller missing-pause.
- [x] Genafspil den eksisterende private cache score-neutralt og auditér startgrænsen uden nye rådata.
- [x] Fastslå, at 12/12 vinduer kun har 24 timers forhistorie, og at hverken fysisk levetid eller starttilstand kan vælges herfra.
- [x] Fastslå, at referencegrænsen har nul fuldstyrkeevalueringer, mens lavere grænser kun har sparsom dækning uden fundlabels.
- [x] Før checkpointet gennem samlet kildegate, exact-head `32599255165`, PR #77/merge `75ed93d6` og fuld produktion `32599309735`; offentlig score og Candidate G-aktivering forbliver uændret.
- [x] Anbefal efter ejerreview 0,03→0,15 m/s, intet passivt neutralt tab og kompakt tilstandsfortsættelse som praktisk privat produktprior uden at kalde den fundkalibreret.
- [x] Lås score-neutralt, at en opdelt kørsel reproducerer den ubrudte 13-timerskurve eksakt.
- [x] Gennemfør mobiliserings-/helhedsreview efter DEC-0056; offentlig pipeline-/rollbackkobling er næste særskilte fase.

## Candidate G – samlet beslutningsgrundlag efter 4.0.257

- [x] Produktionsverificér PR #70/merge `bb16ffe9` i `32580314866` og kontrollér live 210/673.
- [x] Kør exact-merge-shadow `32580774128` og brug de 243 komplette dele som mekanisk snapshot uden nye rådata.
- [x] Genafspil 1.460 private evalueringer og bekræft 730 uændrede strandscorer, nul waders-score over jagtbarheden og nul middel/høj score ved waders-jagtbarhed under 35.
- [x] Saml én ejerreviewvariant: `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`; behold de øvrige kandidater som revisions- og følsomhedsevidens.
- [x] Fastslå, at `20/45/35` er analysecentrum, ikke slutvægt. Endelig vægtning afventer komplette ture med fund/nul-fund og hold-out.
- [x] Merge den samlede beslutningspakke via PR #71 efter grøn exact-head-kildegate `32583123375`.
- [x] Gennemgå det samlede faglige forslag med ejeren; den efterfølgende særskilte beslutning er truffet i DEC-0060 og produktionsverificeret i 4.0.261.

## 4.0.257 Candidate G-coveragepræcisering

- [x] Færdiggør PR #69, exact-head `32577977245`, merge `d629177a` og fuld produktion `32578049137` for vægt-/forklaringsgrundlaget.
- [x] Kør frisk central score-neutral shadow `32578554928`: 243/673 dele kan scores, 430 mangler komplet lokal DKSS-familie.
- [x] Adskil komplet dynamisk scoreinputcoverage fra statiske lokale retention-/stedfeatures, som Candidate G bevidst ikke bruger.
- [x] Bevar parentmorfologi-afvisning, nul statisk scorepåvirkning og alle mutations-/aktiveringslåse.
- [x] Produktionsverificér 4.0.257-kontrakten og gentag shadowen på eksakt mergecommit.
- [x] Erstattet af den fallback-kompatible 210/673-kontrakt i DEC-0057 og den globale, produktionsverificerede 4.0.261-aktivering uden nabodeling eller punktflytning.
- [x] Produkt-/ekstrem-/UI-/rollbackreview og ejerens go/no-go er lukket gennem DEC-0054–0060 og PR #97–99.

## 4.0.255 reparationspunkt efter PR #66

- [x] Afgræns fuld-produktionsfejlen til en forældet intern waders-gatemarkør; frisk data, kandidatkode og scoreberegning var ikke rodårsagen.
- [x] Opdatér kontrakttesten til den aktuelle regelrækkefølge-/produktreviewgate og tilføj testen til `validate:source`.
- [x] PR #67 exact-head-gate `32575697204`, merge `af8f30cf` og fuld post-data-produktion `32575740539` er grønne; Candidate G-roadmapet kan fortsætte.

## Aktiv samlet retning efter v4.0.243 – 2026-08-21

- [x] v4.0.243 er merged som `2ded7943`, og produktion `32455335962` bestod frisk data, fuld validering, releasegate, Supabase og Pages.
- [x] Browser-plugin bekræftede liveversionen. Godkendt Playwright-fallback kontrollerede datasæt `rr-20260821071436-210`: 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger uden fejl.
- [ ] Begræns den normale Copernicus-pilot til de få godkendte DMI-huller. Bevar DMI-først og score-neutralitet; 673-delskontrol bliver sjælden/manual forskning.
- [x] Gennemfør den store RavScore-/ravtransportanalyse og opret det interne forsknings- og regelregister efter DEC-0044.
- [x] Udled, gennemgå og godkend Candidate G med `20/50/30`; 25/40/35 er nu eksakt rollback.
- [x] Automatisér gammel-mod-ny-sammenligning lokalt og brug den i det dataminimerede beslutningsgrundlag; ingen OpenAI API i offentlig runtime.
- [x] Implementér og produktionsverificér Candidate G's strøm-, mobiliserings-, jagtbarheds-, memory-, forklarings- og rollbackkontrakt. Et bredere offentligt læringsmodul er fortsat et senere roadmapspunkt.
- [x] Byg og produktionsverificér et omfattende offentligt læringsmodul på den kvalitetssikrede forskning. **Grundbog i ravjagt** er udgivet i 4.0.268 via PR #118, produktion `32672578127` og grøn 210/673-browseraudit.
- [ ] Udskyd gemte områder/varsler mindst cirka et halvt år eller til en senere brugerdata-sektion.
- Fravalgt nu: særskilt offentlig scoresikkerhed og forklaring af forskel fra gårsdagen.
- Se `docs/rdks/10_DECISIONS/DEC-0044-SCORE-RESEARCH-PRODUCT-PLAN.md` og `docs/research/RAVSCORE_RESEARCH_PRODUCT_PLAN_2026-08-21.md`.

## Afsluttet P1 - systematisk online browserkontrol 2026-08-20

- [x] Browser-plugin forsøgt først og diagnosticeret til trusted-code-path-fejl; ejer-godkendt Chromium-fallback anvendt.
- [x] Live 4.0.237 er senest gentaget grønt med Playwright/system-Chrome efter naturligt fuldt deploy `#3245` paa datasæt `rr-20260820031545-210`: 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger.
- [x] Score, label, farveniveau, vind-/strømpile, komponent- og kystforklaringer, lokal vinderkontekst og debug-ID havde 0 mismatch.
- [x] Ingen land-/vandpunkter, geometri, U/V, score, kilder eller live-data blev ændret.
- Næste aktive driftspunkt er fortsat højst daglig eftermåling af den naturlige syvdøgnscache. DEC-0030 fortsætter først, når en ny relevant modelcyklus giver selvstændig evidens.

## Daglig syvdøgnseftermåling 2026-08-20

- Naturlig pilot `#63` udvidede den private cache til 41 gyldige timer, 25.789 poster, 625 mål og 629 mål/kilde-par; nul gitter-/lagustabilitet. De mellemliggende naturlige pilot- og preserve-kørsler var grønne.
- Gitter- og lagustabilitet er fortsat 0; `scoreImpact=false`, `publicRuntime=false`, 168 timers retention og ingen interpolation er bevaret.
- Næste måling udføres tidligst næste kalenderdag. 168-timers exitkriteriet er ikke nået.

## Afsluttet P1 - ikke-deployerende PR-kildegate 2026-08-20

- [x] Kladde-PR `#1` udløser nu en separat read-only kildegate uden secrets, Pages-rettigheder eller deploymulighed.
- [x] RDKS, current-historik/reference-time, production-hour-lock, workflowisolering og releasegate bestod i `#32324379165` og efterfølgende runs.
- [x] Workflowinventartesten afviser nye triggere, secrets og deployrettigheder i PR-gaten.
- Fuld produktionsvalidering kræver fortsat central adminhydrering, frisk vejr/current-proveniens og den normale produktionsgate. PR `#1` er fortsat kladde og ikke deployet.

## Afsluttet P1 - klassifikation af parent-current-huller 2026-08-20

- [x] De 12 parent-zoner uden verificeret current er samlet klassificeret som `no-marine-grid-point`, `flowPoints.current=null` og eksplicit missing uden fallback.
- [x] Deres 47 lokale kystdele har egne marine flowpunkter; den lokale runtime forbliver 673/673.
- [x] Reference-time-replay bevarer hullerne fail-closed og backfiller dem ikke.
- Ingen land-/vandpunkter, kilder, fallback eller score er ændret. Parent- og lokal identitet må ikke blandes for at lukke tallet kosmetisk.

## P2 produktionsovervågning - mobil og desktop 2026-08-20

- [x] Live 4.0.237 åbner uden horisontal overflow ved 390 × 844 og 1440 × 900.
- [x] Kort, zonepanel, score, lokal kontekst, tre komponenter, to pile og fem prognosedage er synlige i begge viewports.
- [x] Ingen page errors eller funktionelle HTTP-fejl.

## Aktiv P1 - naturlig 72-timers vejrhistorik

- `#3237` havde ensartet 62 samples og 28,903 timers `samples72h` i alle 210 zoner; naturlig fuld produktion `#3245` er vokset til 65 samples og 34,903 timer.
- Forloebet starter ved den kontrollerede 4.0.232-liveaktivering og viser ikke tilfaeldigt zonevist tab.
- Naeste gyldige exitmaaling er en naturlig produktion efter `2026-08-21T16:05:48Z`. Ingen backfill, scoreaendring eller punktflytning er godkendt.

## Aktiv P2 - produktionsworkflowets varighed

- De fire seneste fulde builds `#3237`, `#3238`, `#3240` og `#3242` varede 14,70, 7,30, 18,45 og 11,48 minutter; gennemsnit 12,98 minutter.
- Preflight-runs `#3239`, `#3241`, `#3243` og `#3244` sprang korrekt build/deploy over. Der er ikke observeret samtidig tung produktion eller Pages-koe i dette udsnit.
- `#3240` er profileret pr. trin: DMI bulk brugte 797 sekunder, cirka 72 % af hele buildet; naeste trin var weather update 72 sekunder, validering 50 og hydrering 40.
- DMI-loggen viser hele `wam_dw` 47/47 paa 559 sekunder og progressiv `wam_nsb` 21/46; de viste assets var downloads, og et trin efter 780-sekunders arbejdsbudget blev korrekt ikke talt som gemt.
- `#3242` faldt til 386 sekunders DMI bulk, 51,6 % under `#3240`: faerdig `wam_dw` blev ikke gentaget, tre HARMONIE-trin blev hentet, og `wam_nsb` fortsatte fra 22 til 46/46.
- Naturlig fuld `#3245` faldt videre til 168 sekunders DMI bulk og 7,88 minutters samlet build. Issuet er nu overvågning af nye modelcyklusser, ikke grund til at svaekke DMI-, marine-, 673/673-, validerings- eller releasekrav.

## Aktiv P1 - state-shadow over flere produktionstimer

- `#3240` har 4/4 verificerede referencezoner, 4/4 shadow-states og nul numerisk scorepaavirkning.
- Alle fire har 15 verificerede current-timer og 8 uverificerede samples; `activeCurrentRegime=unavailable` er derfor korrekt fail-closed.
- Potentialerne varierer mellem zonerne, men checkpointet er ikke kalibrerings- eller scorebevis. Fortsat naturlig drift og fysisk forklarlige overgange afventes.
- `#3245` har fortsat 4/4 verificerede referencezoner og nul scorepaavirkning, men verificeret dækning faldt fra 15,0 til 10,1 timer, mens uverificerede samples steg 8 til 10. Det er nyt foer-fix-bevis for reference-time-fejlen paa gammel `main`, ikke retentiontab.

## Aktiv P1 - DEC-0030 komponentovergange efter #3245

- Vind er 118/118 timer i 210 zoner; ny HARMONIE 00Z er kun delvist indfaset med 624 zonetimer, og halen har eet `dmi -> fallback`-skift pr. zone.
- Boelger er 194 zoner med 118 timer, 15 Limfjordszoner med 115 og Feggesund korrekt missing. WAM 19/18Z dominerer den nye cyklus.
- Current er 198 zoner med 107 timer og de samme 12 reelle parent-huller. Ingen kilde-, merge-, fallback- eller punktændring er godkendt ud fra checkpointet.

## Aktiv P2 - GitHub Actions Node-runtime

- Naturlig pilot `#63` bestod, men GitHub runneren tvinger flere officielle Node 20-baserede actions til Node 24 og viser en deprecation-advarsel.
- Ingen aktuel funktionel fejl er observeret. Opgrader først, naar officielle nyere action-majorer findes og er valideret; versionsnumre maa ikke gaettes.

## Produktionsverificeret P1 – én komplet aktuel time inden for hver zone

1. **Rodårsag afgrænset:** 673/673-kildegaten var gyldig, men den hidtidige runtime valgte hver dels nærmeste gyldige række uafhængigt. Den offentlige selector kunne samtidig foretrække en nærmere, ufuldstændig zonerække.
2. **Landsdækkende metadataaudit:** alle 210 zoner har mindst én komplet fælles række for begge jagtformer og alle forventede dele. 642 af 673 dele stod allerede på deres zones nærmeste komplette time; 31 dele brugte en anden nær-time.
3. **Implementeret i 4.0.237:** hver zone får `currentReferenceAt`; delscore, tekst, debug, vejr og pil bygges på præcis denne række. En pil må ikke låne en nabotimes celle. Forskellige zoner må vælge forskellige nærmeste komplette timer; der kræves ikke én national klokktime.
4. **Uændret sikkerhed:** 673/673, DMI → Baltic → AMM15 → otte allowlistede Limfjordsproxyer, afstandsgrænser, centrale land-/vandpunkter og scoreformel er urørte. En zone uden komplet række falder samlet og tydeligt tilbage til hovedzonen.
5. **Slutgate bestået:** commit `9c971bc1` er på `main`, og `#32264833170` bestod frisk 673/673, fuld `validate`, releasegate, Supabase og Pages. Direkte liveaudit af `rr-20260819143933-210` fandt 210/210 komplette zoner og 673/673 dele på deres respektive `currentReferenceAt`; 196 zoner bruger 15:00Z og 14 bruger 14:00Z. Manifesthashes, `controlled-live`, credentialfri historik og 168 timers retention er verificeret.

## Produktionsverificeret P0 – planlagt produktion beholder den godkendte UTC-time

1. **Rodårsag bevist:** `#32249924919`/`#3217` godkendte 11:00 ved readiness, krydsede kl. 12 under bygningen og valgte derefter 12:00. Den uændrede gate stoppede på 630/673 før release/deploy.
2. **Implementeret lokalt:** readiness eksporterer sin eksakte time, og hele det planlagte `build-and-prepare` bruger samme `RAVRADAR_PRODUCTION_TARGET_HOUR` i Copernicus-fletning og vejrscoring.
3. **Uændret sikkerhed:** push/manual uden readiness-lås bruger nutiden; alle friskheds-, 673/673-, release-, Supabase- og Pages-gates forbliver fail-closed.
4. **Central gate bestået:** commit `668a1cdd` og normal ikke-tvungen `#32253251841`/`#3219` bestod låst 12:00-time, frisk 673/673, fuld validering, releasegate, Supabase og Pages. Manuel pilot `#32257195240` og normal produktion `#32257480030` gentog beviset ved 13:00; live `rr-20260819132304-210` har 210 zoner og 673 verificerede dele ved samme `productionReferenceAt`.
5. **Scheduler overdraget:** ejeren har slettet RavRadar-jobbene i cron-job.org. Efterfølgende naturlig produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og pilot `#32273634626` er grønne. GitHub er eneste normale scheduler; syvdøgnseftermålingen kontrolleres højst dagligt, ikke hver time.

## Produktionsverificeret – én lokal sandhed i hele zonepanelet

1. **Implementeret lokalt:** nuvisningens score, tekst, debug og vejr kommer fra samme lokale vinder og tidspunkt; lokal mangel låner ikke hovedzonedata.
2. **Implementeret lokalt:** zonepanelets femdøgnsfaner og den nationale prognose bruger samme lokale `selectLocalBestForDay`.
3. **Implementeret lokalt:** runtime bærer kompakt vinderforklaring og viste vejrmetrikker pr. fælles time, og regressionen dækker 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger.
4. **Central gate bestået:** `#32249770288`/`#3216` bestod frisk 673/673, fuld validering, releasegate, Supabase og Pages; live datasæt `rr-20260819115558-210` matcher artifactet.
5. **Runtimeaudit bestået:** 420 aktuelle og 2.100 femdøgnsvisninger bruger kun én komplet lokal kontekst eller en eksplicit samlet hovedzonefallback.
6. **Visuel slutkontrol afsluttet:** faktisk DOM-/kliktest af pile, vinderområde, tekst, score og debug er gennemfoert for alle 210 zoner/673 dele, begge jagtformer og fem doegn. Seneste Playwright-gentagelse efter `#3245` paa `rr-20260820031545-210` havde nul mismatch og nul browser-/HTTP-fejl.

## Afsluttet driftsrelease – GitHub-plan og Supabase-timeout

1. GitHub Actions overtager 15-minuttersproduktionen ved minut 14/29/44/59; Copernicus-piloten kører ved minut 6.
2. En manglende eksakt aktuel Copernicus-time skal udsætte den planlagte produktion uden artifact/deploy og lade heartbeatet bestille timen. 673/673 sænkes ikke.
3. Den fulde runtime-diagnostik gemmes tabsfrit komprimeret med SHA-256 og begge byteantal. Admin-download skal verificere og genskabe originalen; legacy-format bevares.
4. Afslut fuld lokal validering/releasegate, pushrun med Supabase/Pages og mindst én naturlig GitHub-schedule-kørsel.
5. Gaten er opfyldt, cron-job.org-jobbene er slettet, og efterfølgende native produktion, pilot og cachebevaring er grønne i `#32272470720`, `#32273634626`, `#32272473716` og `#32272598725`. Den åbne visuelle browserkontrol fortsætter som særskilt opgave.

## Næste P1 efter browseraudit 2026-08-18 – én lokal sandhed i hele zonepanelet

1. Reproducer det aktuelle live-datasæt og fastlås Blåvand-modbeviset: lokal vinder/debug NV 315° må ikke ledsages af hovedzonens synlige N 11°.
2. Før den aktuelle lokale vinderdels eksakte vejrpost og tidspunkt gennem kort, navn, RavScore, forklaring, debug og alle synlige metrikker. Fallback må kun ske ved reel mangel og skal mærkes.
3. Genbrug den nationale prognoses lokale `bestForDay`-beslutning i zonepanelets femdøgnsfaner, så score, tid, kystdel, tekst og vejr ikke kan komme fra forskellige poster.
4. Tilføj landsdækkende maskinel browser-/regressionstest for 210 zoner, 673 dele, begge jagtformer og alle fem døgn. Testen skal sammenligne identitet, tidspunkt, score, retninger og de viste metrikker – ikke kun DOM-tilstedeværelse.
5. Indfør særskilt bevis for én komplet valgt aktuel række inden for hver zone. Den eksisterende samlede 100 %-gate bevares, men forskellige zoner må vælge forskellige nærmeste komplette timer; der kræves ikke én national fælles time.
6. Afslut med fuld RDKS-, release-, central produktions- og direkte browservalidering. Den bestående 4.0.233-retningsisolation, kildeorden, afstandsgrænser, rollback og ejerpunkter må ikke ændres utilsigtet.

Status: både den sammenhængende lokale præsentation og den særskilte zonevise current-reference er produktions- og runtimeverificeret. Den faktiske visuelle onlinekontrol er afsluttet og gentaget efter `#3245` med Playwright paa `rr-20260820031545-210`: 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdoegnsvisninger og nul mismatch. Krævet model/indsats: GPT-5.6 Sol, Ekstra høj.

## Aktuelt P1-fix 2026-08-18 – lokal scoreretning må ikke komme fra en anden kystdel

- Liveaudit beviser, at de nye strømpile fysisk følger deres U/V-vektor og faktiske modelcelle i alle 673 dele. De skal vise vandets bevægelse og peger derfor ikke nødvendigvis mod land.
- Den fundne systemiske fejl lå i fortolkningen: 216 dele i 52 zoner arvede moderzonens retningsankre, og 49 aktuelle zonevindere brugte dermed ikke deres eget godkendte land-/havpunkt som scoregrundlag.
- 4.0.233 isolerer hver del til ét lokalt anker med samme navn, vandpunkt, landpunkt og retning som vejr-, historik- og scoreidentiteten. Havsande nordkyst kan ikke længere vælge `Syd for fyret`.
- Fuld central 673/673, `validate`, releasegate, Supabase og Pages er grønne i `#32165688946` og `#32165969786`. Direkte liveaudit af 673 dele og 43.064 prognose-/jagtformstimer er uden lokale anker-, vinder-, retning-, pil/grid-, provenance- eller afstandsfejl. Kildeordenen, 100 %-kravet, Copernicus-piloten og syvdøgnsovervågningen er uændrede.

## Aktuelt P1-spor 2026-08-18 – kontrolleret live-strøm med sikker rollback

- Ejeren har godkendt, at gyldige Copernicus-/regionalproxydata inklusive U/V, provenance og nye pile går online på den nuværende ikke-offentlige side. Kun credentials skal forblive hemmelige. Det naturlige syvdøgnsvindue observeres live og er ikke et krav om syv dages spøgelsestest før første aktivering.
- Den aktive livekæde implementerer DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → præcis otte ejerallowlistede `dkss_lf`-proxyer ≤15 km. Supplementet må kun udfylde en manglende strøm ved eksakt samme time, celle og lag; ingen skjult tidslig eller rumlig interpolation.
- Den credentialfri `data/live/current-pilot-history.json` ligger online som en separat fil og er derfor ikke en del af den hurtige startpayload. Den aktuelt valgte U/V-post og fuld provenance følger ind i score/detaljepakke, og pilen står på postens faktiske modelcelle.
- Normal `controlled-live` kræver fortsat alle 673 kystdele. Den versionsstyrede `dmi-only-rollback` kan fjerne Copernicus/proxy fra score og pile, bevare friske øvrige prognoser og mærke de berørte strømme `missing`; den må aldrig foregive 673/673.
- Aktiveringsgaten er bestået i `#32158041877`/support `#3127`: 622 DMI + 43 Copernicus + 8 regionalproxy = 673/673, fuld validering, releasegate, Supabase, Pages og deploy. Det første aktiveringsdatasæt blev direkte HTTP-/hashverificeret live, og `#32160090899`/support `#3129` gentog hele beviset med et nyt tidsbestemt datasæt. Næste P1-gate er syv døgns naturlig drift, kilde-/celle-/lagstabilitet og rollbackberedskab uden at tage siden offline.

- Bevar DMI som førstevalg, mens den autentificerede collector fortsat validerer Baltic NEMO og AMM15 på de friske centralt hydrerede 673 kystdele.
- Første pilottrin er ét aktuelt 3D-tidssnit med eksakt U/V i samme celle og lag, højst 5 km og nul interpolation. Derefter udvides kun de valgte celler til flere forecasttider/modelruns, så datamængde og workflowtid holdes målbar.
- Gem højst 168 timers kilderåcache privat. Den validerede liveprojektion må indeholde U/V, produkt, tidspunkt, grid, lag, afstand og kvalitetsklasse; credentials må aldrig nå fil, artifact eller Pages.
- Efter stabil pilot er kilderækkefølgen DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km. AMM15-punkter med kun 0 m lag forbliver særskilt `surface-only` og må ikke fremstilles som bundnære.
- De otte sidste vestlige Limfjordsdele har en separat ejerallowlist: kun `dkss_lf`, uændret samplingpunkt, samme Limfjord og højst 15 km. Ingen global distanceoverride eller automatisk tilføjelse er tilladt. Se DEC-0041.
- 4.0.232 opsamler de otte deles faktiske `dkss_lf`-vektorer privat ved hver kørsel. Den friske centrale registrering valideres før opsamling; råcachen er privat, mens den validerede credentialfri projektion må publicere U/V og fuld provenance. Supportbeviset forbliver uden rå U/V.
- Aktiv pile-/scoreintegration er live efter autentificeret 673/673-CI, fuld validering og releasegate. Flerruns-/syvdøgnsstabilitet eftermåles nu live. Den senere DEC-0029-analyse skal kunne skelne lokale data fra regionalproxy og hele det ydre strømfelt.
- Første autentificerede timeprøve `#32129799346` var grøn og bekræftede præcis 39 Baltic + 4 AMM15 af de 51 DMI-huller, svarende til 665/673 kombineret. En privat timeplan ved minut 17 samler nu højst syv døgn; næste gate er stabilitet på tværs af tider og modelruns, ikke øjeblikkelig aktivering.
- `#32134021410`/artifact `#3094` har nu leveret det friske centrale 8/8-bevis: 32 private `dkss_lf`-prøver ved fire forecasttider, ingen rå U/V i supportoutput og ingen cache i artifactet. Kørslens senere stop var en fastkodet versionsstreng i en test og ændrede ingen data eller offentlig runtime.
- `#32135079819` passerede den versionsrobuste test og stoppede korrekt ved 622/673. Første Copernicus-cron `#32134686185` hentede et nyt 12:00Z-tidspunkt, men Actions-cachekvoten havde allerede fortrængt 11:00Z-råhistorikken.
- Restore-only keepalive #32136328681, kontrolleret 11:00Z-backfill #32136391556 og efterkontrol #32136642330 beviste 1.258 records ved to tider i samme råcache uden gitter-/lagskift eller supportlæk. Den aktive kildefletning er siden implementeret og produktionsverificeret; det resterende bevis er naturlig udvidelse og pruning gennem hele syvdøgnsvinduet.
- Aktiv kildefletning skal ende på alle aktuelle kystdele, ikke blot den historiske 95 %-grænse. Produktionsgaten er nu 100 % dynamisk (aktuelt 673/673) og skal ved integration verificere kildeklassens egne afstande, celle, lag og tid for hver eneste del.
- #32139054129 har centralt bevist 100 %-gaten. #32140865173 har derefter bevist den nye pre-DMI-refresh: to-timers-cachen blev ramt før en ny 2,905-GB DMI-save og fandtes stadig bagefter; #32141443152 validerede den uafhængigt. Næste naturlige pilot skal nu bevare og udvide de flere tider. Automatisk GitHub-schedule alene regnes ikke som driftssikkert, fordi ingen event ankom før den anden målte eviction.
- Manuel aktuel-time-pilot #32141772134 beviste den tidlige udvidelse efter DMI, og `#32257195240` nåede 27 timer. Naturlig pilot `#32273634626` har siden nået 30 gyldige timer og 18.870 poster med 625 mål, 629 mål/kilde-par og nul grid-/lagskift; efterfølgende cachebevaring er grøn. Det fulde naturlige 168-timersvindue afventer fortsat den højst daglige kontrol.
- Syvdøgnsgrænsen er samtidig gjort til en normal releasekontrakt: en ren regression bevarer præcis 168 timer, beskærer ældre/fremtidige eller beskadigede restoreposter, deduplikerer og afviser nye ugyldige poster fail-closed. Det reducerer risikoen, mens den naturlige syvdøgnsdrift fortsat opsamles; testen er ikke i sig selv et flerruns- eller aktiveringsbevis.
- `7f22e8e1`/`#32143798560` har CI-verificeret denne kontrakt i den centrale kæde. Retention og 100 %-kontrakten bestod, den faktiske 622/673-dækning stoppede fortsat release/deploy, og den private cache overlevede DMI-cachearbejdet. Næste selvstændige bevis er fortsat naturlig schedule-/syvdøgnsdrift, ikke mere kode til samme fixture.
- Historisk leverede GitHubs aktive timeplan kun ét forsinket `schedule`-event. 4.0.232 brugte derfor det eksternt udløste produktionsworkflow som privat heartbeat. Ejerens nyere DEC-0042 erstatter selve produktionsstarteren med GitHubs forskudte 15-minuttersplan og en eksplicit current-hour-gate; heartbeatets minimale dispatchrolle bevares.
- `#32146584311` gav 2.516 records ved fire tider 11–14 UTC uden stabilitets- eller lækagefejl. Det første automatiske heartbeat `#32146699458` ventede korrekt på piloten, ramte den nye cache og sprang dispatch over, fordi timen allerede fandtes. Næste selvstændige bevis er manglende-time-grenen ved en ny UTC-time, hvor heartbeatet skal dispatch'e piloten og udvide samme cache.
- `#32146695718` har samtidig CI-verificeret den nye heartbeat-regression i normal fuld validering før det forventede 622/673-stop. Supabase og Pages forblev lukkede. Schedulerbeviset kan derfor fortsætte uafhængigt uden at lempe den geografiske gate.
- Det private dataintegritetstrin er nu CI-bevist: hver fuldført time får et deterministisk fingeraftryk af alle 673 centralt hydrerede vandpunkter. Dubletskip kræver både samme time, samme fingeraftryk og samme recordantal. `#32149556595` fandt legacycachen og dispatch'ede automatisk `#32149592195`, som genindsamlede 14 UTC og gemte et manifestbundet fire-timersvindue uden læk. Næste åbne driftsmål er naturlig udvidelse ved en ny UTC-time og senere hele 168-timersvinduet.

## 4.0.231 – samme tidspunkt styrer lokal score og strømpil

- Semantik-v3-genopbygningen er progressiv: #2875 behandlede IDW, og #2876 behandlede NSBS. Havknude har nu 38 native strømtrin fra cellen 2,80363 km væk. Den samlede dækning er foreløbig 182/210 hovedzoner og 574/673 kystdele; Limfjord skal stadig genopbygges.
- Den strenge #2876-audit fandt én anden tidskoblingsfejl. En lokal score kunne vise den nærmeste senere gyldige time, mens pilens flowpunkt var beregnet ved byggetiden uden strøm og derfor faldt tilbage til vandpunktet.
- 4.0.231 vælger først den lokale scorepost, som vises, og beregner derefter pilens placering ved præcis samme tid. Manglende strøm på den viste time giver ingen DMI-pil; en anden times celle må ikke lånes.
- Næste driftsmål er parser-v18-Limfjord, nul pil/grid-mismatch og den nu bindende fulddækningsgate på 673/673. Først derefter må Supabase, Pages og direkte livekort indgå som releasebevis.
- Forskningssporet er uændret: den private syvdøgnscache skal fortsat belyse **ydre tilførsel → overgang mod kyst → lokal bundnær levering**, flere lag, tidsforsinkelse, persistens og ikke-redundans. Den må ikke påvirke den aktive score.

## 4.0.230 – komponentvist strømvalg og korrekt grundlag for helhedsanalysen

- #2872 viste, at et korrekt lokalt strømpar kan være skjult, selv når den private geometri-audit finder det inden for 5 km. Havknudes NSBS-U/V-celle lå 2,804 km væk, men et IDW-skalarpunkt 5,131 km væk havde vundet det gamle fælles modelvalg.
- Strøm vælges derfor pr. native tid på tværs af alle aktive DKSS-collections: nærmeste komplette U/V-vandkolonne først, derefter dybeste gyldige lag i samme kolonne. Vandstand og temperatur har særskilte modelvalg og kan ikke blokere eller rydde strøm.
- Semantik v3 og parser v18 genopbygger gammel strøm uden at kassere gyldige skalare havfelter. Collection-/celle-/lag-/runskift interpoleres ikke.
- Den private syvdøgnsrotation fortsætter score-neutralt. #2872 nåede cursor 240, 873 prøver, 469 ankre og 179 dele. Blandt 36 besøgte offentlige mangler er én nu bevist pipelinefejl inden for 5 km, mens resten fordeler sig på 4/5/23 i afstandsklasserne 5–6/6–8/>8 km og tre uden observeret U/V; 41 afventer rotation.
- Den store analyse og det senere scoremodul skal bruge et fysisk samlet felt: **ydre tilførsel → overgang mod kyst → lokal bundnær levering**, med flere lag, tidsforsinkelse, persistens og kontrol mod dobbelt-tælling. De nye data er forskningsgrundlag, ikke point.
- Næste gate er frisk parser-v18/semantik-v3-produktion med Havknude-, provenance-, pil/grid- og dækningsbevis. Den geografiske gate sænkes ikke, og 4.0.230 må ikke kaldes produktionsverificeret før Supabase, Pages og direkte livekontrol består.

## 4.0.229 – lokal bundnær strøm og syv døgns privat strømfeltsgrundlag

- Aktiv strøm vælges rumligt først: nærmeste gyldige DMI-vandkolonne ved det aktuelle administratorpunkt, derefter det dybeste fælles U/V-lag i netop den kolonne. 0–3 km foretrækkes; 3–5 km accepteres kun, når nærmere gyldige data mangler; over 5 km er `missing`.
- Pil, prognose, historie og score må kun bruge samme dokumenterede U/V-koordinat, tid, lag og samplingpunkt. Gamle strømdata med den tidligere semantik kasseres og genopbygges.
- Dybdelaget vælges pr. native forecasttid. Der interpoleres kun ved samme lag, celle og modelkørsel; et skift bliver `missing`, og pilen bruger altid den viste times egen provenienscelle.
- Centrale kystdelspunkter bygges før DMI-sampling. Den progressive cache genbruges pr. uændret samplingpunkt, så en adminflytning ikke nulstiller hele landet eller genbruger den gamle koordinat.
- Et roterende privat forskningslag bruger DKSS-GRIB ved 0, 5 og 15 km søværts og bevarer flere lag i højst 168 timer. Rotationens næste 15 kystdele behandles også på almindelige kørsler med uændret model. Stabile cache-ID'er og prioriteret retention gør genbrug til normalen; mangler en tidsrelevant marine fil, må højst én pr. modelområde/tre pr. kørsel bootstrap-hentes inden for de eksisterende DMI-budgetter og kun behandles i privat scratch-output. Ved 15-minutters cadence besøges alle 673 dele på 45 kørsler, cirka 11 timer og 15 minutter. Det påvirker hverken RavScore eller offentlig runtime.
- Samme private rotation måler nu afstanden til nærmeste eksakte fælles U/V-kolonne, også uden for den aktive 5 km-grænse, men gemmer ingen fjerne strømværdier. Den beskyttede ejeroversigt skelner en 5–6 km nær-tærskel til rent manuelt geometrireview fra modelhuller på 6–8 km og over 8 km samt fra en pipelinefejl inden for 5 km. Punkter flyttes aldrig automatisk, og modelhuller må ikke “løses” ved at flytte et fysisk korrekt kystpunkt flere kilometer.
- Den store analyse og et eventuelt nyt scoremodul skal behandle hele kæden **ydre tilførsel → overgang mod kyst → lokal bundnær levering** med rumlighed, dybde, persistens og tidsforsinkelse. Undgå dobbelt-tælling med vind, bølger og lokal strøm. Se DEC-0040.
- #2853–#2855 beviser semantik v2 med 187/210 verificerede hovedzoner, 596/673 lokale dele og nul kendt pil/grid-mismatch blandt verificerede poster. De resterende poster er `null` uden pil. #2869 beviser den udvidede private audit på rigtige DKSS-filer: cursor 195, 755 prøver/157 dele, 15 nye prøver, tre cachede replayassets og nul `uMps`/`vMps` i ejeroversigten. Blandt de første 11 målte mangler er 2 nær-tærskel ved 5–6 km, 4 modelhuller ved 6–8 km og 5 strukturelle huller over 8 km; 66 af de 77 mangler afventer fortsat rotation. Den uændrede geografiske gate stoppede deploy, så 4.0.229 må ikke kaldes produktionsverificeret.

## 4.0.228 – flere ægte pile, når kortet zoomes ind

- Kortet kan fra zoomniveau 9 vise kystdelenes egne dokumenterede DMI-vind- og strømpunkter ud over hovedzonens oversigtspil.
- Tæthed må kun komme fra selvstændige faktiske gitterpunkter med eksakt U/V-par. Ingen pil flyttes eller kopieres for at fylde kortet.
- Detaljepakken udløser automatisk en ny tegning af pilelaget. DMI-data, RavScore, historik og geometri ændres ikke.
- #31913779486/#2835 bestod hele produktionskæden. Artifact og livefiler har 670 eksakte lokale strøm- og vindpunkter uden mismatch, og browserkontrollen viste 54 pile ved oversigten mod 87 efter to zoomtrin. 4.0.228 er produktionsverificeret.
- Ejeren gennemgår land-/vandpunkter sideløbende. Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet; de er ikke annulleret.

## 4.0.227 – ejerens repræsentative kystretning må ikke låses af en mikrotangent

- Admin viste en 50-graders vinkelafvigelse ved Svansodde og deaktiverede godkendelsen, fordi et cirka 461 meter langt punktpar blev sammenlignet med ét cirka 15 meter langt segment i en bugtet kyst.
- DEC-0038 gør den lokale vinkelmåling vejledende. Ejerens helhedsvurdering efter de tre zonebekræftelser kan gemmes centralt.
- Reelle integritetsfejl, Supabase-readback, DMI-gridvalidering, releasegate og rollback bevares.
- #31908498204/#2824 bestod hele produktionskæden. Artifact og direkte Pages-kontrol viser 4.0.227, 210 zoner, 673 kyststrækninger, matchende manifesthashes og den ikke-blokerende vinkeladvarsel live.
- P1-modelrotationen og 72-timershistorikken fortsætter uden faglig ændring.

## 4.0.226 – Supabase må tåle én annulleret idempotent skrivning

- #2814 forsøg 1 viste en transient HTTP 500/PostgreSQL `57014` på den store beskyttede runtime-diagnostik efter alle faglige gates. Den uændrede rerun gennemførte samme skrivning og deploy.
- Den fælles requester genprøver nu kun eksakt statement-timeout én gang og fejler fortsat hårdt ved gentagelse eller andre fejl.
- #31905211459/#2816 gennemførte fuld 4.0.226-produktion med frisk DMI, alle gates, Supabase og Pages. Normalvejen skrev `runtime-diagnostics` i første forsøg; timeoutgrenen er dækket af regressionen.
- P1-modelrotationen og 72-timershistorikken fortsætter uden ændring.

## 4.0.225 – aktuel vandstandstime bevarer modelidentitet

- #2801 viste et tidsafhængigt provenancehul på præcis én time i alle 210 zoner efter timegrænsen.
- Den afgrænsede rettelse holder vandstandskildeindeksets start på samme aktuelle klokktime som den offentlige serie uden at ændre forecastalder eller faglige værdier.
- #31902872631/#2810 bestod hele produktionskæden. #31903561423/#2812 gentog alle fulde gates og deploy efter evidenscommitten; begge supportartifacts har 22.890/22.890 fuldt dokumenterede routede DMI-vandstandstimer og 210/210 komplette rækker i aktuel time. Direkte Pages-kontrol efter #2812 viste 4.0.225 og datasæt `rr-20260815192135-210`.
- P1-modelrotationen, det virkelige 72-timershistorikvindue, Feggesund-bølgegabet og DMI-rate limiting fortsætter uændret som separate måle-/analyseforhold.

Roadmappet prioriterer stabilitet og verificerbarhed før nye features. Status skal løbende flyttes til RDKS, når noget implementeres.

## Afsluttet P0 – lokal snapshotdiagnose

- Lokal validering kan nu skelne et udløbet repositorysnapshot fra en aktuel produktionsfejl uden at acceptere manglende zoner.
- Den skrivebeskyttede deployaudit har bekræftet 210/210 aktive zoner og vejrdata til alle tre Vadehavszoner.
- En fuld frisk validering følger fortsat den bindende rækkefølge: central adminhydrering og tombstones, nyt/hydreret vejr, fuld `validate`, releasegate og først derefter artifact/deploy.
- 4.0.208 er produktionsverificeret i #31848912461 på commit `7a3382f`; direkte efterkontrol viste version 4.0.208 og datasæt `rr-20260814230422-210`.
- 4.0.209 indførte separat 72 timers rå pipelinehistorik score-neutralt og rettede tabet af DMI-vandstandsidentitet. 4.0.211-produktionen beviser, at historikken bevares mellem kørsler; det fulde 72-timers målevindue er endnu ikke gået.
- DMI-first femdøgnskæderne under DEC-0030 forbliver åbne, men næste analyse er efter ejerbeslutning midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet.

## P0-ejerreview – ét land-/havpunktpar pr. kyststrækning

- Hver af de 673 aktive kyststrækninger har præcis ét autoritativt hav-/landpunktpar. Admin må kun flytte det eksisterende par; ekstra aktive par og automatisk national genopdeling er fravalgt i DEC-0037.
- En skrivebeskyttet retningsaudit har flagget 199 kontrolkandidater i 122 hovedzoner. Det er en prioriteringsliste, ikke 199 beviste fejl, fordi 171 kandidater er fragmenterede `MultiLineString`-dele.
- Ejeren gennemgår nu zonerne gradvist og placerer parret repræsentativt på bugtede dele. Arbejdet blokerer ikke uafhængige roadmapopgaver, men skal være afsluttet før endelig faglig godkendelse af alle lokale scorer, større scorekalibrering og domæne-/brugerrelease.
- En flytning bliver først aktiv efter central readback og grøn efterfølgende DMI-/releasekørsel. Afvist validering må ikke aktivere kladden.

## Midlertidigt udskudt P1 – DMI-first femdøgnskæder og historik

- **Aktiv P1-rettelse 2026-08-20:** Naturlig `#3242` voksede til 64 raa proever/30,903 timer, men 22:00/23:00-proeverne blev ikke verificeret, fordi de gemmes paa `productionReferenceAt`, mens efterberigelsen matchede `generatedAt`. Kandidaten bruger nu den timeskarpe reference med bagudkompatibel fallback; maalrettede tests er groenne. Frisk central produktion skal bevise voksende verificeret spaend. Se `docs/research/P1_HISTORY_REFERENCE_FIX_4.0.237.md`.
- Isoleret replay paa hele `#3242`-artifactet loefter verificeret spaend fra 22,563 til 30,903 timer i praecis de 198 verificerede zoner og bevarer de samme 12 reelle huller. Replayet aendrer ingen score eller fortid; frisk central produktion er sidste gate.
- **Ny read-only DEC-0030-maaling 2026-08-20:** Produktionskoersel `#3237`/datasæt `rr-20260819213342-210` giver nye WAM 18Z- og DKSS 12Z-beviser; HARMONIE 12Z er kun delvist indfaset. Overgangene varierer fortsat kraftigt efter komponent og retning, saa ingen permanent graense laases. Det kompatible 4.0.232-`controlled-live`-historikvindue er 28,903 timer og dermed under 72-timerskravet. Se `docs/research/P1_COMPONENT_TRANSITIONS_4.0.237_RUN3237.md`.
- Naturlig `#3242` giver derefter en ny WAM 2026-08-19 18Z-cyklus: 15 Limfjordszoner vokser fra 97 til 115 boelgetimer, og overgangene flytter sig til hoejde 0,109/0,44, retning 20,07/100 og periode 0,353/1,3 (middel/P95). Variationen bekraefter fortsat, at permanente graenser ikke maa laases endnu.

- Ejeren besluttede 2026-08-16 at vente med den næste fem-døgns- og historikanalyse, indtil flere naturlige data og modelkørsler er opsamlet. Arbejdet fortsætter senere under DEC-0030 uden ændring af kilder, fallback eller score i pausen.

- 4.0.224 retter et P1-provenienshul uden at ændre værdier: vandstand fra valgte DMI-kildepunkter mærkes nu med de faktiske enkelt- eller sammensatte DKSS-modelområder. #31895640397/#2797 og direkte deploykontrol beviser 23.310/23.310 dokumenterede routede timer, 210 zoner og offentlig 4.0.224.

- Den naturlige #31894320128/#2794 ser nye 12 UTC-kandidater for WAM og DKSS, men beholder korrekt de komplette 00/06 UTC-runs, mens de stadig har ca. 107,9/109,9 timers hale over 96-timerskravet. Næste opfølgning er det faktiske beskyttede skift, når den gamle serie falder under kravet; kørslen gav samtidig 4,27–39,99 verificerede historiktimer og nul aktive vandstandscachealarmer.

- Fortsæt P1-audit og design under DEC-0030 for vind, bølger, strøm, vandstand og øvrige viste/scorede komponenter.
- Produktionsbevis #31855164652 og datasæt `rr-20260815011320-210` giver verificeret strøm ved nutiden i 210/210 zoner. Strømkæden når mindst cirka 70,8 timer i alle zoner, men kun 121/210 når mindst 96 timer. Den konkrete P1-opfølgning er derfor at klassificere og forklare halen i de resterende 89 zoner og designe vejen til cirka 120 timer uden at skjule `missing`.
- Følg den verificerede strøm gennem et fuldt 72-timers vindue. Artifact #2777 viser 155 rå prøver og 38,278 timers rå historie i alle 210 zoner, men den verificerede historie spænder kun 2,559–38,278 timer afhængigt af zone. 4.0.220 gør denne forskel til et fast read-only mål. Baseline må ikke udfyldes bagudrettet.
- Exitkriteriet for historikopfølgningen er mindst 72 timers faktisk bevaret pipelinehistorik i alle 210 zoner samt en særskilt liste over reelle DMI-huller. Det er analysegrundlag for senere mobiliserings-/scorearbejde og ændrer ikke den aktive 24-timersscore.
- 4.0.212 lukker en dokumenteret overgangsregression før den videre haleanalyse: kørsel #31857361460 reducerede 27 komplette NSBS-strømserier til ét sent tidspunkt, fordi et marginalt nærmere skalarfelt kunne genvælge hele havmodellen. Kun et gyldigt fælles strøm-U/V-par må nu ændre det autoritative valg. #31870747677 genoprettede 210/210 ved nutiden og mindst 100,8 timers sammenhængende marineprognose i alle zoner.
- 4.0.214-opfølgningen er lukket af artifact #2777: 210/210 temperaturgitre og 9.159/9.159 native DMI-temperaturtrin har eksplicit `surface:0`, fordelt på IDW, NSBS og LF. Gamle umærkede/dybe temperaturer er ikke vendt tilbage.
- Limfjordens bølge-/haleanalyse er nu afsluttet på 4.0.213-artifactet: `DK-B05-11` har ingen gyldig bølgekilde, og otte zoners vandstands-/temperaturhale skyldes en kortere DMI-havhorisont. `missing` bevares. Næste P1-trin er en samlet komponentmatrix og regressionsplan; ingen ny kilde eller scoreændring er godkendt.
- Ny WAM 18Z-eftermaaling i 4.0.237/`#3237` bekraefter samme graense: `DK-B05-11` har 53 `dkss_lf`-marinerækker, men ingen boelgecollection og nul boelgetimer; naboerne har `wam_dw`. `missing` er fortsat korrekt, og hverken punkt, kilde eller fallback aendres.
- Samme artifact afgraenser halen: WAM 18Z slutter native 23. august 22 UTC og giver 97 viste timer i 15 Limfjordszoner; DKSS slutter 24. august 12 UTC og giver 113 timer. Eksisterende fallback fylder til 118 i henholdsvis 194 boelgezoner og 202 vandstands-/temperaturzoner; de resterende kendte gab bevares eksplicit.
- Den samlede komponentmatrix er nu målt på 4.0.214-datasæt `rr-20260815083802-210`. Vind er komplet; bølger har ét fuldt hul og 15 enkelttimehuller; strøm, vandstand og temperatur deler samme 17-timers hale i otte zoner. Næste P1-trin er numerisk overgangsmåling pr. komponent, mens 72-timershistorikken fortsat bygges.
- Kildeskiftene er nu målt i fire produktionsdatasæt til og med 4.0.219. Vandstand er fortsat stabil; vind, bølger, strøm og temperatur har fortsat større grænsespring end almindelige timer, men størrelsen varierer. Næste P1-trin er stadig uafhængige nye modelcyklusser pr. komponent før valg af regressionsintervaller – fortsat uden scoreændring.
- 4.0.222 gør uafhængighed maskinlæsbar: komponentauditen viser collection/model-run og udokumenterede DMI-timer. #2764, #2771 og #2777 bruger samme aktive HARMONIE-, WAM- og DKSS-run-id'er og tæller derfor kun som én forecastcyklus pr. model, selv om de fortsat er gyldige drifts- og historikbeviser.
- Produktionsartifact #2782 bekræfter fuld collection/model-run-proveniens i alle fem komponenter og fortsat samme aktive modelcyklus. Historikken er vokset til 38,760 rå timer og 3,040–38,760 verificerede timer; næste automatiske opfølgning er den første naturlige kørsel med et nyt relevant run-id samt fortsat vækst mod 72 verificerede timer.
- Artifact #2783 gav den første nye HARMONIE-cyklus med 416 timer i 208 zoner. I 4.0.223-artifact #2785 er 12 UTC vokset til 3.744 timer, mens 03 UTC er faldet til 6.032 timer i de samme 208 zoner. Zonedækningen pr. run er nu produktionsverificeret. Næste opfølgning er den videre 12 UTC-indfasning samt nye WAM-/DKSS-run-id'er; en delvis cyklus fastsætter ingen tærskel.
- Artifact #2787 fortsætter samme indfasning til 5.616 timer fra 12 UTC og 4.160 timer fra 03 UTC i 208 zoner med uændrede overgangsmål. Gentagne indfasningsartifacts er driftsbevis; næste selvstændige P1-evidens er en fuldt indfaset vindcyklus eller et nyt WAM-/DKSS-run-id.
- Artifact #2789 fortsætter til 7.488/2.288 timer fra 12/03 UTC i 208 zoner. Overgangsmålene flyttede sig igen under indfasningen, så ingen delmåling låses som permanent interval. WAM/DKSS er fortsat uændrede, og historikken er 39,516 rå timer.
- Artifact #2790 afslutter HARMONIE 12 UTC-indfasningen med 45 timer i 208 zoner og kun to bevarede 03 UTC-timer pr. zone. To fulde vindcyklusser er nu sammenlignet: fallback→DMI varierer, mens DMI→fallback-halen er identisk. Vindrammen er foreløbig; næste uafhængige vindbevis er en ny hale eller tredje fuld cyklus, mens hovedfokus flyttes til nye WAM-/DKSS-run-id'er og 72 verificerede historiktimer.
- Den nye fulde `dkss_lf`-cyklus i artifact #2764 har 41/41 trin og løfter de otte Limfjordszoner fra 98 til 115 viste timer. Næste haleopgave er at følge dette over nye LF-cyklusser og forklare de sidste tre timer samt de øvrige modelgrænser; ingen fallback eller scoreændring før kilde/run/lead-time og overgang er forklaret.
- Dokumentér først faktisk dækning, provenance, overgangskvalitet og regressionsplan. Indfør ikke ny produktionskilde, fallback eller scoreændring før denne analyse er afsluttet og godkendt.
- 4.0.219 fjerner overflødig central readback af den genbyggede routingaudit og tilføjer en read-only pipelineestimator. Den beregnede nedre 30-dagesgrænse falder fra cirka 4,44 til 3,03 GiB; faktisk Supabase-egress overvåges fortsat gennem næste billingperiode.

## Afsluttet P0 – privat land-/vand- og fallbackkandidat teknisk verificeret

- 4.0.206 er produktionsverificeret i #31831068809. Målrettet roundtrip #31822371489 og fuld privat #31829349458 beviser den centrale retry-/rollbackkontrakt og hele den friske nationale slutkæde.
- Den aktuelle 17-dels fallback har et frisk eksternt 10-meterbevis med 11 verificerede, fire sikre vendinger og to blokerede dele. #31829349458 beviser nul overlap, 2/2 ejerskabsflytninger, 9/9 erstatninger, fallback-DMI og artifacts på en ren runner efter tidligere aktivering.
- Det tekniske P0 er afsluttet. Næste geometrihandling er ikke mere automatisk bygning, men en særskilt ejerafgørelse om den private kandidat. Ingen aktivering må ske uden den beslutning.

- Offentlig 4.0.204 er produktionsverificeret i #31815039302. Privat #31815423082 bestod hele den tunge 835-dels geometri-, DMI-, state-, vind-, shadow- og reviewkæde og stoppede kun ved en enkelt central `PGRST303`-læsning.
- 4.0.205 indfører en snæver én-gangs genprøvning for netop Supabases dokumenterede interne `sb_secret_`-oversættelsesfejl og gør beskyttet manifestsync fail-closed.
- Først køres den målrettede artifactbaserede roundtrip uden ny DMI og uden deploy. Derefter kræves normal produktionsverifikation og en ny fuld privat national kørsel inklusive fallback, central rollback og artifacts.
- Ingen privat kandidat må aktiveres offentligt uden de resterende gates og en særskilt ejerafgørelse.

- 4.0.200 er offentligt produktionsverificeret i #31798575274 med fuld validering, releasegate, DMI, Supabase og Pages.
- Privat #31798588868 beviste foreløbige punkter, native DMI-grid, vejrserier, state, vind og score-neutral shadow-score for en konsistent 835-dels kandidat. Den stoppede alene på reviewbyggerens historiske 783-tæller.
- 4.0.201 gør review og admin-roundtrip bestandsafledte under streng 1:1-validering. Næste trin er en fuld ny privat kørsel gennem endelige 121 rettelser, slut-DMI, slut-shadow-score, roundtrip/rollback og artifacts.
- #31802022918 bekræftede 27 grønne nationale trin, men den første native DMI-gate ramte sit marginale standardbudget. 4.0.202 ændrer kun de tre private nationale DMI-gates til det etablerede 3.000-sekunders kvalitetsbudget og afventer ny fuld kørsel.
- #31804967576 bekræftede tidsbudgettet og nåede gennem review/dubletaudit. Det efterfølgende stop viste, at det gamle 121-rettelsesbevis var lavet til den aktive 673-dels bestand, ikke til de private 835-/652-dels kandidater.
- 4.0.203 bandt beviser til fingeraftryk, men #31812035188 afslørede, at det første bevis var lavet efter 107 historiske korrektioner og derfor ikke var råt. Slut- og fallbackbeviset var allerede korrekte.
- 4.0.204 erstatter kun det første bevis med en audit direkte af GitHubs rå 835-dels kandidat: 520 verificerede, 149 sikkert vendte og 166 blokerede.
- Næste trin er normal 4.0.204-releasekørsel og derefter en ny fuld privat national kørsel gennem alle tre eksakte beviser, DMI, shadow-score, central roundtrip/rollback og artifacts.
- Ingen privat kandidat må aktiveres offentligt uden de resterende gates og en særskilt ejerafgørelse.

## Aktivt scope – nyere ejerbeslutning erstatter DEC-0036-stopreglen

Ejeren har udtrykkeligt godkendt en landsdækkende privat revision af kystdele og land-/vandpunkter. Det giver mandat til read-only/private geometri-, DMI-, state-, score-neutral shadow-, admin- og rollbackgates. Det giver ikke automatisk mandat til offentlig aktivering. DEC-0036's fem godkendte zoner er historik; Fejø/Femø og Havnø/Mariager forbliver slettet.

## Afsluttet P0 – hovedzoner med præcis kyst
- **Aktuel status efter 4.0.185:** 4.0.182–4.0.185 har afsluttet offentlig aktivering, entydige hovedzoneskel, redigerbart delejerskab, lokal scoreforklaring og behovsstyret “Hvor er det?”-visning. Historiske punkter nedenfor om kommende kandidat, manglende aktivering og ventende adminudvidelse er bevaret som forløb og er ikke aktuelle opgaver.
- **Resterende kystarbejde:** Havnø/Mariager Fjord forbliver bevidst slettet. De fem øvrige fallbackzoner samt den fejlplacerede Lolland vest/Albuen analyseres i en privat officiel-kystkandidat. Admin kan trække en zoneende til en eksisterende verificeret nabodel, bruge et reversibelt viskelæder og slette en hel zone. Helt ny geometri kræver fortsat geometri-, overlap-, land-/vandpunkt-, DMI- og offentlig runtimekontrol.
- **Aktuelt næste trin:** Kør den særskilte seks-zonekontrol for kandidatens 22 mål- og naborester. Ved grønt native DMI-bevis bygges en privat score-neutral runtime-/rollbackkandidat til ejerreview. Ingen af trinene må deploye eller genstarte den nationale geometriopbygning.
- **Ved enhver ny adminændring:** kontrollér at delen publiceres én gang, at der ikke opstår overlap eller relevante huller, at land-/vandpunkt og DMI-identitet følger med, og at hovedkort, lokal scoreforklaring og “Hvor er det?” viser samme ejerskab.
- 4.0.180 beviste lokal score til 605/605 dele, men den offentlige præsentation var forkert: hver intern beregningsdel blev tegnet som en synlig kortzone med egne to sorte endemarkeringer, tooltip og tre Leaflet-linjer. Det gjorde kortet uoverskueligt og tungt.
- 4.0.181 genopretter den bindende produktmodel: de 605 lokale dele bevares til punkter, vejr og RavScore bag kulissen, mens kortet igen viser én autoritativ kystlinje, ét navn, én klikflade og kun to endemarkeringer pr. hovedzone.
- Den næste private kandidat genbruger 605 godkendte dele og supplerer til 650 dele/203 hovedzoner med nul overlap og nul kildeafvigelser. 84 øvrige kildeforskelle er tidligere ejer-godkendte udeladelser. Kun fem geografisk modstridende hovedzoner afventer nu slutkontrol, før offentlig projektion og releasegate.
- Efter den akutte visningsrettelse auditeres alle områder, hvor beregningsdelene ikke dækker en kendt relevant ravstrand. Der må ikke gættes nye kystforløb eller slettes deldata som genvej.
- Ejerens efterkontrol har præciseret slutproduktet: hovedzonernes oprindelige struktur og forståelige navne kombineres med GeoDanmarks præcise strandforløb. Lokale dele forbliver tekniske data bag hovedzonen. Nye hovedzoner oprettes kun ved en konkret geografisk/navnemæssig fordel, aldrig automatisk ud fra et lokalt delnavn.
- Den dokumenterede kildefejl rettes først privat: fliseplanen skal dække zonens ejerskabsområde og ikke kun den gamle, potentielt fejlplacerede linje. Derefter genopbygges de manglende hovedzoner og alle uforklarede nationale huller auditeres samlet for officiel kyst, overlap, havn/å/indre farvand og udenlandsk/outlier-geometri. Først et grønt privat kort kan gå videre til offentlig aktivering; adminudvidelsen venter.
- 4.0.182 har gennemført dette forløb og er produktionsverificeret. Fortsat geometriarbejde foregår nu som read-only nataudit mod den aktive, hash-låste bestand. Det private kontrolkort viser både hele Danmark og hver enkelt del; dokumenterede problemer kan foreslås, men produktionen ændres ikke uden ny ejerafgørelse og fulde gates.

## Afsluttet datakæde – national kystgeometri v2
- Datakæden er produktionsverificeret i 4.0.180. Push-kørsel #31498481482 bestod fulde gates, central readback, artifact og deploy; det offentlige datasæt gav lokal score til 605/605 dele i alle 190 hovedzoner. Den efterfølgende visningsfejl betyder, at milepælen først er produktmæssigt lukket, når 4.0.181 er visuelt produktionsverificeret.
- Afsnittet nedenfor bevares som udviklingshistorik. Formuleringer om privat pilot, manglende aktivering og næste gate er historiske og må ikke læses som aktuel status.
- DEC-0033 er valgt som fremtidig produktretning: bedste gyldige lokale kystdel leverer zonescoren, men UI skal eksplicit skelne hele zonen fra navngivne delstrækninger og forklare den ravtekniske årsag. Før kodeaktivering bygges den forståelige ejer-reviewvisning og en score-shadow med dæknings-/usikkerhedskriterier.
- DEC-0034 autoriserer landsdækkende aktivering på den nuværende pre-domain testside efter national gate. Arbejdsrækkefølgen går fra valideret Blåvand-reference til national central-hydreret generering, rettelse af alle kendte semantiske/topologiske fejl, automatisk navn-/kilde-QA, lokale DMI/proveniens/state/UI/admin-forløb og samlet aktivering. En fast 7-points dækningsmargin bruges midlertidigt og revideres i den store analyse. Senere domæne-/brugerrelease har sin egen nye gate.
- Arbejdet følger DEC-0032 og udføres parallelt uden at ændre produktionszoner eller centrale adminoverrides.
- Første leverance er en permanent kilde-/licenskontrakt, v2-skema, national topologi-/navneaudit og tre repræsentative pilotområder.
- Flere lokale kystdele skal vurderes med selvstændig DMI-sampling og provenance; eksisterende multi-ankerretninger er ikke alene et dataprodukt.
- Høfder og andre ravfælder registreres score-neutralt. RavScore ændres ikke som del af geometri-piloten.
- National udrulning kræver særskilt go/no-go efter dokumenteret geometri-, admin-, DMI-, score/state-, runtime- og migrationskontrol.
- GeoDanmark-adgangen køres kun via et manuelt privat pilotjob med `geometry_v2_pilot=true`. #1931 beviste faktiske udtræk fra syv aktuelle lag i tre områder. 4.0.128 lukker den resterende afkortningsrisiko med pagination og privat upload af råfiler; næste trin er komplethedsverifikation og derefter parallel generering.
- Fra 4.0.129 har pilotjobbet sin egen concurrency-gruppe, så 15-minutters vejropdateringer ikke kan erstatte en ventende pilot.
- #1936 har produktionsverificeret komplet adgang: 21/21 lag/område-udtræk er komplette.
- 4.0.130 bygger den første private source-QA med afstande, fragmentering, konfliktflag og kort på den centralt effektive pilotbestand. Lokal kørsel viser, at alle ni zoner kræver review; næste trin er klassificerede delstrækninger og stednavneaudit, ikke blind snapping.
- #1959 verificerede 4.0.133 med 72 private forslag, officielle fjord-/norpolygoner, ni zonekort og reviewgate; #1958 verificerede den fulde produktionskæde. #1964 produktionsverificerede 4.0.134, og privat pilot #1967 verificerede Blåvand som to dele omkring det officielle hukpunkt med 15-meters landsideforskydning, punktpar og score-neutrale høfter. #1974 leverede tre private officielle ortofoto-overlays; reviewet gav no-go på en indadgående hukløkke. #1976 produktionsverificerede 4.0.135. Næste gate er privat rettelse og nyt ortofotogo, derefter DMI-grid, ikke aktivering.
- #1982 ortofotoverificerede 4.0.136-hårnålsrettelsen. #1987 verificerede 4.0.137's private native WAM-/DKSS-gridgate med gyldige og indbyrdes forskellige celler, og #1986 produktionsverificerede hele releasekæden. Næste Blåvand-gate er systemisk provenance-/merge-/score-/UI-/admin-design, ikke aktivering.
- 4.0.138 implementerer dette design som en maskinlæsbar privat shadow-kontrakt: stabile partserie-ID'er, egne provenancekrav, separate historiknøgler og eksplicit isolation fra parent-score, public runtime og admin-write. Privat pilot #1992 verificerede artifactet, og #1991 bestod den fulde produktionskæde. Næste gate er private flertidsserier med timeproveniens og komponentmerge; ingen aktivering.
- 4.0.139 implementerer flertidsseriegaten som privat metadata-/hashbevis over produktionens native WAM-/DKSS-parser. #1997 verificerede fire fælles komplette tider pr. del, og #1996 bestod den fulde produktionskæde. Næste gate er separat state-/historikvalidering; score, UI, admin og produktion forbliver uændrede.
- 4.0.140 replay-validerer separat delhistorik med unikke `historyKey`-nøgler gennem den faktiske score-neutrale `shadow-v2`-funktion. #2004 verificerede isolation og slettet transient input; #2003 bestod den fulde produktionskæde. Næste gate er score-neutral UI-review; admin-roundtrip, rollback og ejer-go/no-go ligger stadig senere.
- 4.0.141 gør UI-gaten maskinlæsbar og privat. #2009 verificerede én aktiv parent med bevaret RavScore-præsentation og to neutrale, ikke-interaktive dele uden score eller “bedste del”; #2008 bestod den fulde produktionskæde. Næste gate er privat central admin-roundtrip/rollback.
- 4.0.142 implementerer admin-gaten som et isoleret midlertidigt kladdedokument. #2014 verificerede create/read/update/delete, fravær og urørte runtime-dokumenter; #2013 bestod fuld produktion. Næste trin er eksplicit ejer-go/no-go, ikke automatisk aktivering.
- 4.0.143 starter den godkendte nationale skalering: central 208-zoners plan, deterministiske kildefliser, maskinlæsbare konfliktklasser og et isoleret privat nationalt GeoDanmark-job med deduplikering. Første private CI-artifact er næste evidensgate; derefter følger national topologi og de lokale DMI/state/UI/admin-led.
- 4.0.144 korrigerer den målte sekventielle flaskehals med begrænset firefliseparallelitet og fremdrift, tilføjer en streng national kilde-/secretgate og en `STRtree`-baseret source-QA for alle 208 zoner. Privat national CI er næste gate før topologi-/ravstrandsgenerering.
- #2029 verificerede 4.0.144 nationalt på den autoritative central-hydrerede plan: 208 zoner, 100 fliser/700 requests, ca. 5:15 hentning, grøn validator og source-QA. #2033 verificerede 4.0.145's kompakte 6,8 MB QA-artifact ved siden af råpakken på 413 MB; #2032 bestod normal produktion. 4.0.146 måler nu national havn-/å-/fjord-/norudskæring samt klit-, skrænt- og høfdeevidens read-only før delgenerering.
- #2037 verificerede 4.0.146's topologikæde, men artifactauditen afviste åmundingsreglen: 2.868 klynger er rå oversegmentering. 4.0.147 tilbageholder masker i zoner over 20 klynger og profilerer de accepterede råobjekters scalar-egenskaber, så næste regelrevision kan baseres på faktisk subtype/synlighed/navn/forløb frem for gæt.
- #2040 verificerede tilbageholdelsen i alle 45 overdense zoner. Profilen peger entydigt på bredde som næste kildefilter: 2.551 kandidater er kun 0–2,5 m brede mod 843 på mindst 2,5 m. 4.0.148 måler ≥2,5 m og ≥100 m linjelængde uden at lempe overdense-gaten.
- #2043 reducerede med dette filter åklynger til 489 og overdense zoner til én kendt partitionskonflikt. #2055 verificerede officielle stednavnekandidater til alle 755 dele. 4.0.152 danner 56 read-only lokale forslag fra de 28 grove dele uden forbindelsesgeometri; næste trin er revisionsbar navnebeslutning, ikke automatisk omdøbning.

## P0 – ægte Codex-baseline etableret i #1772
- **Første opgave – implementeret lokalt:** workflowets gate-bypass er lukket. En positiv preflight kræver nu `npm run validate` og `npm run release:gate` før artifact; negativ preflight kan fortsat stoppe billigt.
- Auditér de seneste to dages røde push-runs og grønne auto-runs som historik. Grøn topstatus på runs med `skipped` fulde gates er ikke releasebevis.
- **Gennemført:** #1772 på `292b4024…` brugte central admin-geometri og gennemførte frisk data, begge fulde gates, artifact og Pages-deploy med `success`.
- Hvis den strenge kørsel fejler, ret rodårsagen systemisk uden stale data, nulkonvertering, hardcodede zoner eller svækkede audits.
- Femdøgnsdiagnosen fra #1774 er gennemført: public runtime manglede vind i 187/208 zoner og bølger i 33/208, mens 203/208 havde mindst 96 timers marinegrundlag. Balanceret recovery er produktionsbekræftet i #1778/#1779; vind steg til 199/208 zoner med mindst noget data. HARMONIE-kildens native horisont er cirka 60 timer; det er et kilde-/retentionmål, ikke en reduktion af produktets cirka 120-timers mål.
- #1785 bekræftede valg af 18Z frem for et kortere 21Z-run. #1788 produktionsverificerede 48-timersfastholdelsen: 18Z blev bevaret, fire assets blev genbrugt, og den progressive serie voksede fra 4 til 7 behandlede tidspunkter. Fulde gates og deploy bestod.
- Fortsæt måling af workflowtid/schedulerbudget og DMI-coverage uden at svække marine audits.

## Næste P1 efter kortrettelsen – komplette DMI-first femdøgnskæder pr. komponent
- **Status: åben, midlertidigt udsat 2026-08-16.** Timeproveniens og en 118-timers offentlig vindkæde er produktionsbevist. Den næste kortlægning af dækning og overgangskvalitet afventer mere naturligt datagrundlag; ingen nye kilder eller fallback er godkendt i pausen.
- **Model efter DEC-0031:** Rutinemæssig overvågning og registrering af allerede definerede LF/NSBS-coverage-målinger kan udføres med GPT-5.6 Terra. Skift til GPT-5.6 Sol før ny faglig kildesyntese, provenance-/fallbackdesign, ændring af datakæden eller endelig kritisk validering.
- **Fase A startet:** `docs/research/DMI_FIRST_FIVE_DAY_SOURCE_AUDIT.md` kortlægger aktuel kode og officielle modelrammer. DMI dokumenterer HARMONIE til 54 timer, WAM til 5½ døgn og DKSS til 5 døgn. WAM/DKSS-vind er derfor første DMI-halekandidater, før ekstern fallback vurderes.
- Kortlæg for vind, bølger, strøm, vandstand, vandtemperatur og alle øvrige aktive score-/forecastkomponenter: nuværende DMI-kilde, native og typisk resterende horisont, runfrekvens, alternative DMI-produkter, lovlig/teknisk anvendelighed, opløsning og kvalitet.
- **Aktuel arbejdsrækkefølge 2026-08-15:** Lad de normale GitHub-kørsler opbygge og bevise 72 timers strømhistorik uden ekstra tvungne kørsler. Gennemfør imens den skrivebeskyttede P1-måling af bølger og vandstand, derefter vandtemperatur og til sidst en samlet vindopfølgning. Bølger godkendes kun som komplette, når højde, retning og periode findes sammen; vandstand følges gennem DKSS, continuity og aktiv kildepunktrouting med bevaret identitet.
- Lufttemperatur hentes og findes i den offentlige timefil, men vises ikke i det aktive informationspanel og bruges ikke af den aktive RavScore. Nedbør, skydække, lufttryk og sigtbarhed er heller ikke aktive P1-komponenter. De må ikke udvide den bindende P1-kæde uden et konkret produktbehov og en ny beslutning.
- Direkte måling af dataset `rr-20260815071241-210` viser komplette bølger i 209/210 zoner; Mors nord/Feggesund mangler alle 118 timer. Vandstand er komplet i 202/210 zoner; otte Limfjordszoner mangler den samme 15-timershale. Næste evidens er beskyttet timeproveniens fra friske normale runs, ikke en ny fallback.
- Vandtemperaturens lagproblem er produktionslukket: #2777 har eksplicit `surface:0` i alle 210 zoner og alle tre DKSS-modeller. 202 zoner har 118 viste timer og otte Limfjordszoner 114; de sidste fire timer er et separat horisont-/overgangsproblem. Temperatur er fortsat score-neutral.
- Design derefter den bedste kæde individuelt: primær DMI så langt den er valid, eventuel anden relevant DMI-kilde som forlængelse og kun ekstern fallback for den resterende hale mod cirka 120 timer.
- Revurdér eksisterende Open-Meteo-fallback fagligt og teknisk; historisk brug er ikke i sig selv et valg.
- Auditér overgangene for spring, tidsforskydning, dubletter, huller, enheder, retninger, stale data og interpolation. UTC og fuld timeproveniens er bindende.
- [x] Udvid diagnostik og pipeline med faktisk intervaldækning pr. komponent/zone samt collection, model-run, lead time, prognosealder, native/interpoleret/fallback-status og native kildetider. Frisk 4.0.125-produktion mangler som endeligt bevis.
- Vurder separat konsekvensen for RavScore, state og UI. Dag 5 må ikke fremstå lige så sikker som dag 1 uden evidens, og missing må aldrig opfindes som nul eller kopieret sidste værdi.
- **Stopregel:** Ingen ny produktionskilde, sammensyning eller scoreændring implementeres før kortlægning, design og regressionplan er dokumenteret og godkendt.

## P1 – vandstandskilder
- [x] Forecast/cache-brugbarhed er uafhængig af midlertidigt observationsstop.
- [x] Observationsstatus, forecaststatus, cache gyldig til og samlet brugbarhed vises separat.
- [x] Opdagede kilder bevares i registeret med status frem for at forsvinde.
- [x] Admin viser automatisk primær/sekundær, reel geodistance, vægte, metode og tydelig override.
- [x] Hals/prognosepunkter og end-to-end routing er auditeret i artifact #2771: begge Hals-kilder har 113 timer, og samme producerede serie går til forecaststore, zone, femdøgnsvisning og score-/ranglistekæde.
- [x] 4.0.221 genopretter alarmtærsklen for faktisk valgte aktive kilder mod både kildeprognose og forecastcache. #31889559758 og artifact #2777 rydder de falske Hals-mærker, viser 116,6 timers resttid og bevarer faktisk routing i 5/6 zoner; de gamle 15/21-tal var stale diagnosefelter.
- [ ] Eftermål den første naturlige warning/critical i drift; fremkald ikke kunstigt cacheudløb og svæk ingen gate.
- [x] 4.0.237/`#3237` registrerede de foerste naturlige `forecast-cache-expired`-haendelser efter rettelsen. Alle fire udloebne observationscacher var ikke-valgte (`effectiveRoutingSources=[]`, `routingCacheAlertLevel=null`), mens frisk kildeprognose og 210/210 aktiv vandstand var intakt. Det aabne delkriterium er fortsat en naturlig warning/critical paa en faktisk valgt kilde.

## Afsluttet P1 – Supabase/admin drift
- [x] **Kontroller nu** genlæser forbindelses- og lagringsstatus og viser fejl fail-closed i admin.
- [x] Den fulde persistensprøve tester midlertidig write, readback og gendannelse; håndbogsreviewets centrale kø og lokale nødkladder er synlige i ejerens admin.
- [x] Reviewkøen kan soft-delete enkelte poster og rydde mærkede systemtestposter, mens auditsporet bevares.
- [x] Central autoritet for zonegeometri, regler og routing er bevaret og dækket af admin-, propagation- og releasegates.
- Den særskilte måling af Supabase-egress gennem næste billingperiode er fortsat åben; en grøn funktionstest er ikke et forbrugsmål.
- Read-only estimator paa 4.0.237-supportartifact `#3238` giver nu 1.358.425 bytes pr. koersel og 3,644 GiB pr. 30 dage mod cirka 3,03 GiB i 4.0.219. Stigningen er afgraenset til det voksede stations-/notifikationsdokument; routingauditbesparelsen er fortsat cirka 1,416 GiB. Dette er ikke billing-egress, og ingen ejerdiagnostik splittes uden separat design. Se `docs/research/SUPABASE_PIPELINE_EGRESS_4.0.237.md`.
- #31891504819 ramte ét `57014 statement timeout` ved skrivning af `runtime-diagnostics` og stoppede korrekt før deploy. #31891984360 synkroniserede umiddelbart efter samme dokument og deployede grønt. Gentagelser overvåges, før en snæver retry eventuelt designes; en bred retry indføres ikke på ét transient fund.
- Artifact #2785 måler den kompakte runtime-diagnostik til 9,287 MB. De 25 rå zoneeksempler udgør 8,690 MB/93,57 % og cirka 23,308 GiB JSON-skrivninger over 30 dage ved 96 kørsler dagligt. En senere opdeling kan mindske timeout-risikoen, men må bevare ejerens rå download og kræver særskilt godkendelse; tallet er skrivevolumen, ikke billing-egress.

## Afsluttet P2 – håndbog og ekspertarbejde
- [x] Alle 111 webhåndbogskapitler har fast læsehjælp og er gennemarbejdet i almindeligt dansk; den permanente regression afviser kapitler uden læsehjælp.
- [x] Ekspertens 22-punkts valideringsmatrix er omskrevet til en arbejdsplan. Hvert punkt forklarer hvad RavRadar gør, hvorfor det kan være for simpelt, hvad eksperten konkret skal vurdere, og hvad svaret eventuelt kan bruges til. Intet ekspertinput ændrer regler eller score automatisk.

## P2 – historisk state og faglig validering
- Bevar skyggetilstanden score-neutral, indtil faktiske produktionsdata og ekspertvalidering viser, at den er robust.
- Når et numerisk transportbidrag senere introduceres, gør det gradvist, versioneret, forklarligt og med regressionssammenligning.
- Bevar eksisterende pålidelige morfologidata; kræv ikke manuel landsdækkende morfologikortlægning.

## Afsluttet P2 – performancebaseline, fortsat overvågning
- [x] Startupmålinger og en gentagelig byteaudit dokumenterer payloadens vigtigste dele.
- [x] Tunge state-/historikberegninger ligger fortsat i pipeline, mens klienten modtager kompakte præberegnede startdata.
- **Analyse startet 2026-08-15:** `npm run audit:public-startup-payload` gør bytefordelingen gentagelig uden at skrive. Direkte deploymåling af `rr-20260815094833-210` viser 27,11 MB: lokale kystdele udgør 19,99 MB, og hovedzonernes prognoser 6,88 MB. Det gamle lokale 209-zonesnapshot på 6,91 MB er kun historisk baseline uden aktive kystdelsdata.
- **Produktionsverificeret i 4.0.216:** Et lille aktuelt startdatasæt efterfølges af ikke-blokerende femdøgnstimer og detaljerede lokale kystdelsdata. Datasetintegritet, missing, prognose, assistent, lokal score og historik bevares; lokal frisk 210-zonebrowsertest viste cirka 0,7 sekund til kort/rangliste og efterfølgende komplet prognose uden browserfejl. #31880984004 bestod fuld gate og deploy.
- [ ] Fortsæt almindelig produktionsovervågning på mobil og desktop; det er drift, ikke en blokering for næste roadmapopgave.

## P2 – privat besøgsstatistik i admin
- [x] 4.0.215 implementerer en usynlig, ikke-blokerende offentlig tæller og en ejerbeskyttet adminrapport.
- [x] Rapporten viser sidevisninger og browserbesøg pr. dag og valgt periode samt oprettede og aktive login-konti som særskilte tal.
- [x] Browserbesøg tælles højst én gang pr. browserfane og dag og kaldes ikke unikke personer.
- [x] Supabase gemmer kun kompakte dagstotaler uden rå hændelseslog, IP, præcis lokalitet, fingerprint eller stabil besøgsidentitet.
- [x] Migrationen og dens roller er efterkontrolleret: offentligheden kan kun tælle, mens rapportlæsning kræver authenticated plus ejer/full_admin-kontrol.
- [x] #31876816700 og direkte efterkontrol beviser deploy, første rigtige 1/1-optælling og adminrapport med 2 oprettede/2 aktive login-konti.
- [ ] Følg fortsat dagstal, anonym støj/misbrug og Supabase-egress gennem næste billingperiode; en helt anonym offentlig tæller kan ikke bevise mennesker.

## P3 – planlagt videnskabelig forskningsrunde og RavScore-modelvalidering
- **Status: registreret, må ikke startes endnu.** Afhænger af afsluttet/klart afgrænset forecast- og schedulerstabilisering samt de højere P0/P1-opgaver.
- **Model efter DEC-0031:** Centrale forskningsfaser, synteser, evidenskonflikter, hypoteser, RavScore-vurdering og slutkonklusion udføres med GPT-5.6 Sol. Terra må kun bruges til klart afgrænsede mekaniske støtteopgaver uden tab af faglig kvalitet.
- Opbyg et permanent forskningsgrundlag i `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md` baseret primært på peer-reviewed forskning, universiteter, myndigheder, oceanografi, hydrodynamik, kystteknik og sedimenttransport.
- Hold frigivelse, transport, koncentration/aflejring og jagtbarhed analytisk adskilt; kortlæg derefter deres samspil og tidsrækkefølge som en samlet fysisk systemmodel før score og vægte vurderes.
- Det samlede forskningsgrundlag, den fysiske systemmodel og kodeauditen skal danne grundlag for et konkret forslag til næste generation af RavScore-/scoremodulet. Det nye modul bygges ikke som en skjult fortsættelse af analysen: arkitektur, signaler, vægte, regressioner og overgang fra den nuværende score kræver ejerens særskilte godkendelse før implementering.
- Auditér den faktiske RavScore-kode regel for regel for korrekt mekanisme, input, tids-/geografiafhængighed, evidensstyrke, overlap og risiko for dobbelt-tælling.
- Udarbejd evidensmatrix og klassificér anbefalinger som `BEVAR`, `FORBEDR`, `TEST`, `NY MEKANISME`, `FJERN/NEDVÆGT` eller `UTILSTRÆKKELIG EVIDENS`, samt forslag i evidensklasse A–D.
- Gennemfør en særskilt analyse af punktstrøm kontra opstrøms transporthistorik, rumlige strømfelter, konvergens/divergens, persistente transportkorridorer og det historiske begreb “strømbånd”. Det aktuelle produktionsforbud består, indtil stærk evidens, ikke-redundans, validering og særskilt godkendelse eventuelt begrunder noget andet.
- Analysér det fulde relevante vindfelt over hav og kyst gennem tid, også hvor kortet ikke viser vindpile. UI-pilene er udvalgte visualiseringer og må ikke afgrænse meteorologisk evidens. Undersøg opstrøms/regional vind, kobling til bølger og strøm, forsinkelser, persistens og selvstændig informationsværdi uden at dobbelt-tælle eksisterende input.
- Design senere validering mod strukturerede fundrapporter, ekspertvurderinger, historiske DMI-forløb, referenceperioder og kontrollerede backtests med selection bias eksplicit behandlet.
- **Stopregel:** Fase A–D er analyse uden produktionskode. Ingen scoremekanisme, vægt eller nyt datalag må aktiveres automatisk; fremlæg først samlet model, usikkerheder, eksperimenter og prioriterede forslag til særskilt godkendelse.
- Hvis senere godkendte mekanismer kræver tunge rumlige/historiske beregninger, udføres de i pipeline og sendes kompakt til klienten. Der konstrueres aldrig manglende data.

## Ikke-roadmap / forbudte genveje
Roadmappet må aldrig opfyldes ved at genindføre stale data, regionale strømbånd, falske nulværdier, hardcodede administratorzoner eller ved at gøre audits svagere.

Den planlagte P3-forskning må undersøge, om rumlige strømstrukturer har selvstændig fysisk informationsværdi. Det er ikke tilladelse til at genindføre regionale strømbånd i produktionen; den nuværende bindende regel gælder, indtil en senere eksplicit beslutning eventuelt erstatter den.
# Aktuel P1-status – 4.0.210

- DMI-first-komponentanalysen har lokaliseret en konkret strømschedulerfejl: en fjern DKSS-hale blev fejlagtigt regnet som sammenhængende dækning fra nutiden.
- 4.0.210 retter kun dækning/genhentning. Næste trin er produktion og 72 timers måling, derefter klassifikation af resterende geografiske DMI-huller før enhver kilde-, fallback- eller scorebeslutning.
# Aktuel P1-status – 4.0.211

- 4.0.210 beviste den korrigerede huldiagnose, men produktionsartifactet afslørede et yderligere cacheproblem: modelvalget gik tabt, mens behandlingsstatus overlevede.
- 4.0.211 bevarer/gendanner modelvalget og tvinger én genbehandling. Næste beslutningspunkt er den direkte produktionsoptælling og derefter 72 timers verificeret historik; kilde- og scoreanalyse forbliver efterfølgende trin.

## P1-driftcheckpoint #3261
- 72 rå prøver spænder 42,866 timer i alle 210 zoner; 198 zoner har samme verificerede spænd, og de 12 kendte parenthuller forbliver nul.
- Shadow-cachen spænder cirka 105,3 timer, og livepiloten dækker fortsat 673/673 dele. 72- og 168-timerskravene er åbne.
- Der er ingen ny uafhængig modelstart. Afvent naturlig evidens uden backfill og fortsæt imens næste ikke-blokerede roadmappunkt. Se `docs/research/P1_DRIFT_CHECKPOINT_4.0.238_RUN3261.md`.
## Produktion #3263 og næste arbejde
+- PR #8/`6d63ac3a` er fuldt produktions- og browserverificeret på `rr-20260820112436-210` med nul fejl i 210 zoner og 673 dele.
+- P1 er vokset til 43,31 verificerede timer i 198 zoner og cirka 105,75 timers shadow-capture. De 12 parenthuller forbliver korrekt missing.
+- Ingen ny modelcollection blev hentet. Mens 72/168 timer opbygges naturligt, fortsættes næste ikke-blokerede P2-analyse uden produktionskode eller scoreændring.
## RavScore-forskning fase A-B aktiv
+- Den permanente evidensbase er oprettet med verificeret aktiv kodevej, fysisk systemmodel, første primærkilder, evidensklasser og valideringsdesign.
+- Aktive tærskler og vægte er arbejdshypoteser. Vind, bølger, strøm og kysttags kan være dobbelt-talt; dette skal måles før forslag.
+- Fase C-D fortsætter score-neutralt med materialefysik, overførbarhed, kodefølsomhed, ablation og bias-kontrolleret fund-/nulvalidering.
## RavScore-forskning fase C
+- Den aktive score har nu en gentagelig, score-neutral følsomheds- og overlapaudit med self-test.
+- Resultatet prioriterer store diskrete tærskler, missing-asymmetri og delt inputpåvirkning til fase D-validering.
+- Ingen scoreændring er godkendt; næste trin er ablation og bias-kontrolleret virkelighedsdesign.
## RavScore fase C produktionsbevis
+- Den permanente følsomhedsaudit er merged og produktionsverificeret uden aktiv scoreændring.
+- Fuld 210/673-browseraudit er grøn på det eksakte fase C-deploy.
+- Fase D er afsluttet med evidensmatrix, syntetisk afprøvning og national audit; den offentlige score er endnu uændret.
+- Jagtbarhed og sikkerhed er adskilt og produktionsverificeret i 4.0.240 uden scoreændring.
- Kontrolleret bølgeinput er implementeret i 4.0.241 source med nul-fallback og et loft på plus/minus 12 transportpoint.
- Syntetisk audit af 55.296 scenarier, national public-audit, PR #25, frisk fuld produktion og systematisk onlineaudit af 210 zoner/673 kystdele er grøn på `eb66b280`. Vægtene ændres fortsat først i næste særskilte delmål.
## RavScore phase D - candidate and calibration gate
- Candidate design is documented and score-neutral.
- Use B0 as exact production control; keep C1-C3 shadow-only.
- Build the observation/snapshot evidence path before coefficient fitting.
- Run the full 210/673 browser audit only weekly, for a relevant score/UI/data-contract change, before launch, or after a concrete regression signal.

## 4.0.239 observation safety
- Verify and release remote GPS redaction plus the phase D score-suggestion lock.
- After release, implement immutable forecast-snapshot linkage and search-effort capture as the next non-blocked phase D step.
- Keep historical central GPS cleanup separate because it is an irreversible production-data operation.

## Effektiv valideringsstrategi - 2026-08-20
- PR og pre-DMI: kør `validate:source`, inklusive observation-, admin-, RavScore-, workflow- og releasekontrakter.
- Produktion: behold fuld `npm run validate`, `release:gate` og datavalidering efter friske vejr- og proveniensdata.
- Browser: kør den fulde 210/673-audit ugentligt eller ved ændringer i score, forklaring, pile, UI eller offentlig datakontrakt. Brug målrettet browser-/HTTP-kontrol ved afgrænsede workflow- og dokumentationsændringer.
- En grøn statisk gate erstatter aldrig produktionsbevis for DMI, Supabase, cache, fallback eller deployment.
- En rød datagate må aldrig omgås. Diagnose skal skelne mellem manglende kilde, cache-race, tidsmatch og reel geometri-/scorefejl.

## Timesikker produktionsregel - 2026-08-20
- Enhver produktion skal bruge readiness-jobbets eksakte `target_hour` i livehistorik, vejrbyg, fallback og proveniens, også når et push/force-job krydser en UTC-time.
- En historikpost tæller ikke som scoreklar dækning, medmindre dens gyldige tidspunkt findes i kystdelens faktiske runtime-tidslinje fra target hour og frem.
- En scoreklar rapport på under 673/673 er et reelt stop-signal. Vent på korrekt cache/time eller ret årsagen; omgå aldrig den fulde strømaudit.

## Observationsdatabase-regel - 2026-08-20
- Klientredaktion er ikke tilstrækkelig alene; Supabase skal også afvise nye præcise lokationsfelter via RLS og databaseconstraint.
- Brug `NOT VALID` til at beskytte nye/ændrede rækker uden automatisk at ændre historiske data.
- Udfør aldrig historisk GPS-oprydning uden udtrykkelig ejergodkendelse.
- En migration er kun source-verificeret, indtil den centrale database har bestået målrettede positive og negative insert-tests.

## Næste RavScore-del: 4.0.242 vægte

- Vægtene ændres isoleret til 25 % jagtbarhed, 40 % transport og 35 % mobilisering efter DEC-0041.
- Bølgeprioren er fortsat uændret og har fået det entydige ID DEC-0040.
- Kandidaten kræver konsekvensaudit, source-/release-gate, browserkontrol og frisk produktion før aktivering.

- National vægtaudit på rr-20260820204808-210 dækker 673 dele og 42.846 scoreposter. De 420 viste zoner falder i gennemsnit 6,314 point; 7 skifter vindende del. Effekten accepteres som foreløbig reduktion af jagtbarhedsdominans, ikke som fundkalibrering.
## Aktiv fase D efter 4.0.242

- Observerede produktionsfordelinger og komponentablation er gennemført score-neutralt.
- En tur, ikke et enkeltfund, er kalibreringsenheden efter DEC-0042.
- Næste kodeopgave er dataminimeret tripkontrakt og coverage-only rapport. Bevar GPS-redaktion, tomme scoreforslag, 25/40/35, geometri og alle land-/vandpunkter.
- Ingen kandidat må fittes eller aktiveres, før tripdækning, event-/geografihold-out og ejerbeslutning er dokumenteret.

## Aktivt P1-deltrin: turdata v2 i 4.0.243

Koden er lokalt implementeret og browserkontrolleret. Næste bindende trin er Supabase-migrationen, derefter fulde releasegates, PR/deploy og 210/673-kontrol. Vægtene og scorereglerne må ikke ændres i dette deltrin. Når turdata er i drift, fortsætter roadmapet med repræsentativ turkalibrering og ikke med enkeltfund.

## Næste rækkefølge fra 4.0.244
1. Verificér og frigiv målrettet Copernicus uden punktændringer.
2. Fortsæt den allerede igangsatte brede videnskabelige evidensanalyse.
3. Byg score-neutrale kandidatregler og forskningsbaserede vægte.
4. Sammenlign gammel og ny model automatisk lokalt, før en produktionsbeslutning.
5. Implementér Rav-vinduer, hændelsesmodel, enklere forklaringer og læringsmodul i sikre delmål.

## Cost/benefit-testmatrix 4.0.247

- [x] DEC-0045 afgrænser målrettede udviklingstests, exact-head PR-kildegate, obligatorisk fuld post-data produktionsgate og hændelsesstyret browserkontrol.
- [x] PR #37, merge 3dc331ca og produktion 32468752244 er grønne; live viser 4.0.247.
- [ ] Derefter fortsættes den store RavScore-analyse og automatisk gammel-mod-ny-sammenligning uden ny offentlig AI/API.

## Aktiv RavScore-sammenligning 4.0.248

- Gammel 40/35/25, aktiv 25/40/35 og Kandidat A-C har stabile ID'er efter DEC-0046.
- Den lokale rapport genbruger de to eksisterende audits og viser kun aggregater, niveauændringer og automatisk udvalgte paradokser.
- Næste trin er rapport på live-data, målrettede tests, PR/produktion og derefter ejer/Codex-beslutning om kandidatreglerne.
- Ingen offentlig AI/API og ingen automatisk scoreaktivering.

## v4.0.249: privat RavScore-kandidat-shadow

Den eksisterende private nationale shadow-validator beregner nu A, B og C på samme lokale context som den aktive score. Den bruger 24 timers hændelseshistorik og 72 timers strømforløb, opdeler kandidat B i strøm mod, langs og væk fra kysten og gemmer kun dataminimerede forskelle. Den aktive vægtning 25/40/35, offentlig score, UI, vejrsampling, admin-data og geometri ændres ikke. Koden er målrettet selftestet; næste evidens er én virkelig privat national shadow-kørsel efter merge. Se DEC-0047 og `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`.

## Naeste AI-trin efter 4.0.250

1. Merge kun efter exact-head source gate og relevante releasechecks.
2. Foelg produktionen for den eksakte mergecommit uden fuld browserkontrol, fordi offentlig UI og score er uændret.
3. Koer `ravscore_active_shadow=true` manuelt paa `main` og laes kun den kompakte rapport.
4. Brug rapporten som ét input i den store videnskabelige analyse; aktivér ikke A/B/C ud fra én koersel.
5. Fortsaet derefter forskning, regelgennemgang og begrundet forslag til vaegte for jagtbarhed, transport og mobilisering.

## Naeste AI-trin efter 4.0.251

1. Verificer 4.0.251 paa exact-head PR-gaten og i produktion.
2. Genkoer den private aktive 210/673-shadow paa præcis main-commit.
3. Hvis den stopper paa reelt manglende sammenhaengende DMI-dækning, behold blokeringen og opgoer dækningen; bland ikke collections og brug ikke fallback.
4. Hvis hele kaeden er grøn, analyser kun den kompakte A/B/C-rapport som del af den videnskabelige RavScore-analyse.

## Aktivt roadmap-punkt: fair national zonerangering (2026-08-21)

**Problem:** Nationale top-5-lister bruger i dag zonens hoejeste kystdel. Zoner med mange forskelligt vendte dele kan derfor faa flere muligheder for at ramme en gunstig retning.

**Evidens nu:** Et komplet produktionssnapshot med 210 zoner og 673 kystdele viste, at zoner med mindst seks dele var tydeligt overrepraesenterede i de 12 undersoegte top-5-lister. Gruppen med 3-5 dele var samlet omtrent proportional. Falster nord/Orehoved og Falster vest/Nysted Nor munding var blandt de tydelige eksempler.

**Bindende afgraensning:**

- Den lokale RavScore og den vindende kystdel aendres ikke alene paa grund af zonens stoerrelse.
- Der indfoeres ikke en vilkaarlig regel om straf ved mere end to kystdele.
- Naeste analyse isolerer den vejruafhaengige fordel ved forskellige kystretninger.
- Derefter sammenlignes faa, begraensede kandidater til en intern korrektion, som kun bruges i "Bedste omraader" og "5 dages RavRadar".
- En kandidat skal tage hoejde for baade effektiv retningsdaekning og hvor mange af zonens dele der faktisk stoetter vinderen.
- Ingen korrektion aktiveres uden landsdaekkende regression, forklarlig brugerlogik og kontrol af sammenhaengen mellem score, pil og forklaring.

**Status:** Analyse aktiv. Ingen produktions- eller scoreaendring er besluttet.

### Foerste kandidatsammenligning

Den eksakte rekonstruktion af 12 aktuelle top-5-lister sammenlignede ingen korrektion, en raa antal-straf, en ren retningsstraf og tre stoettebaserede varianter.

- Baseline for zoner med mindst seks dele var `3,50x` overrepraesentation.
- Raa antal-straf reducerede tallet, men afvises som fagligt for grov.
- Ren retningsstraf reducerede naesten ikke skaevheden og kan ramme reelt gode zoner.
- Stoettebaseret maks. 2 point var for svag i dette forloeb.
- Stoettebaseret maks. 4 point reducerede overrepraesentationen til `2,94x` og er foreloebig midterkandidat.
- Stoettebaseret maks. 6 point reducerede den til `2,66x`, men flyttede flere top-5-medlemmer og skal behandles som oevre graense, ikke anbefaling.

**Haardt krav:** En stor zone skal stadig kunne ligge nummer et, naar det er reelt. En stoettebaseret kandidat giver derfor nul justering, hvis hele zonen har gode forhold, og gradvist mindre justering naar flere dele stoetter vinderen.

**Naeste trin:** Koer 2/4/6-pointsintervallet paa de allerede indsamlede historiske vejrsituationer. Vaelg ikke produktionsregel paa baggrund af et enkelt produktionsforloeb.

### Timed foelsomhed uden ventetid

Det historiske RavScore-artifact viste sig at omfatte fire sentinelzoner og kan derfor ikke bruges som landsdaekkende rangeringstest. I stedet er kandidatintervallet koert paa alle 107 allerede tilgaengelige prognosetimer i begge tilstande, i alt 214 nationale rangeringer.

- Baseline for zoner med mindst seks dele: `3,68x` overrepraesentation.
- Stoettebaseret maks. 2 point: `3,55x`; 10 af 214 foerstepladser blev aendret.
- Stoettebaseret maks. 4 point: `3,23x`; 17 af 214 foerstepladser blev aendret.
- Stoettebaseret maks. 6 point: `2,94x`; 34 af 214 foerstepladser blev aendret.

Maks. 4 point fastholdes som foreloebig midterkandidat. Justeringen er lille nok til, at en markant og reel hoej delscore stadig kan vinde; den kan kun flytte en placering, naar forskellen til konkurrenterne er inden for den begraensede justering. Dette er fortsat privat analyse og ikke en aktiveret regel.

**Revideret naeste trin:** Afklar en historisk eller syntetisk landsdaekkende replaykontrakt. De fire sentinelzoner maa ikke fejlagtigt fremstilles som national evidens.

### Stabilitetstest af de 107 prognosetimer

En deterministisk blok-bootstrap med 1.000 gentagelser og sammenhaengende 12-timers blokke tester, om enkelte vejrfaser driver resultatet. Begge brugertilstande holdes sammen som par.

- Baseline: median `3,69x` overrepraesentation; 5-95%-interval `3,20-4,21x`.
- Stoettebaseret maks. 2 point: median `3,54x`; cirka `4,67%` aendrede foerstepladser.
- Stoettebaseret maks. 4 point: median `3,23x`; interval `2,83-3,69x`; cirka `7,94%` aendrede foerstepladser.
- Stoettebaseret maks. 6 point: median `2,95x`; interval `2,61-3,31x`; cirka `15,89%` aendrede foerstepladser.

Maks. 4 point er fortsat den bedste balance i dette materiale. Seks point flytter for mange foerstepladser. To point reducerer for lidt. Resultatet viser samtidig, at loftet alene ikke kan loese hele problemet; kriteriet for en isoleret vinder skal vaere fagligt staerkt.

**Permanent produktkrav:** Zoner med mange dele maa stadig kunne opnaa en hoej national placering, naar den er reel. En hel-zone-vinder faar nul korrektion, flere stoettende dele reducerer korrektionen, og en markant enkeltvinder kan fortsat beholde placeringen, hvis dens scoreforspring er stoerre end det begraensede loft.

Den direkte foerstepladskontrol understoetter kravet for 4-pointsvarianten:

- 113 af 127 foerstepladser for zoner med mindst seks dele blev bevaret.
- Ingen hel-zone-vinder blev flyttet.
- Kun oprindelige vindere med hoejst 2 points forspring blev flyttet i dette materiale.

Det betyder, at en klart bedre stor zone fortsat ligger oeverst. Kandidaten paavirker kun taette nationale sammenligninger, hvor den hoejeste score samtidig kommer fra en relativt isoleret kystdel.

**Begraensning:** Blok-bootstrap viser intern stabilitet i det samme prognoseforloeb. Den erstatter ikke landsdaekkende historiske vejrbegivenheder.

### Naer-lighedsvariant for tydelig brugerlogik

En ekstra kandidat bruger samme stoettebaserede maks. 4 point, men tillader kun omrokering inden for en gruppe, hvor raascorerne ligger hoejst 2 point fra gruppens bedste.

- 214 timerangeringer: `3,41x` overrepraesentation mod `3,68x` uden korrektion og `3,23x` med den frie 4-pointsvariant.
- 72 nye top-5-medlemmer mod 95 med den frie variant.
- 17 aendrede foerstepladser, 113 af 127 store zonevindere bevaret og ingen hel-zone-vinder flyttet.
- En raascore mere end 2 point under gruppevinderen kan aldrig placeres over den via korrektionen.

**Foreloebig vurdering:** Naer-lighedsvarianten er mindre effektiv, men sikrere og lettere at forklare. Den boer sammenlignes direkte med den frie 4-pointsvariant i den senere landsdaekkende replaykontrakt. Ingen af dem er endnu aktiveret.

## National rangering: stærkere mulighedsnormalisering (igangværende 2026-08-21)

- Den tidligere kandidat med højst 4 points støttekorrektion og 2-points nærhedsgrænse er forkastet som utilstrækkelig. Den reducerede kun 6+-zonernes målte overrepræsentation fra cirka 3,68x til 3,41x.
- Næste analyse bruger den aktive RavScore på en neutral, global scenariomatrix og adskilte trænings-/holdoutretninger.
- Kandidaten skal normalisere zonens `bedst-af-mange`-fordel, sammenlægge næsten ens retninger og samtidig belønne støtte fra flere stærke retninger.
- Intet må aktiveres offentligt, før en markant effekt er dokumenteret, ejerbeslutningen er taget, og de relevante release- og browserkontroller er bestået.

### Foreløbig forskningsanbefaling: `direction-broad-19`

- 107-timers analyse: 1-2 dele 0,90x, 3-5 dele 1,12x og 6+ dele 1,11x mod 6+-baseline 3,68x.
- Tidsopdelt 12-timers holdout: 6+-gruppen 1,30x mod 0,97x i kalibreringsblokkene.
- 1.000 blok-bootstrap: 6+-median 1,11x, 5-95 % 0,94-1,30x.
- Ingen hel-zone-vinder og ingen vinder med mindst 50 % støtte blev flyttet.
- Kandidaten er kun analyseret og må ikke aktiveres uden ejerbeslutning, separat implementering og fuld relevant produktionskontrol.

## 2026-08-21 - ejerbeslutning om national rangering

- Ejeren godkendte `direction-broad-19-v1` efter den forståelige gennemgang.
- Modellen gælder alle 210 zoner i både Bedste områder og 5-dages RavRadar; Falster Nord og Falster Vest var kun eksempler.
- Den ændrer kun intern sortering. Vist RavScore, lokale scoredele, pile og forklaringer bevares.
- Efter implementering kræves målrettet regression, exact-head-gate, produktion og fuld 210/673-browserkontrol.
- Afsluttet: PR #52, merge `ad70fbca`, produktion `32515757957` og den fulde 210/673-kontrol er grønne. Næste arbejde er den store faglige RavScore-analyse, ikke flere ændringer i landsrangeringen.
## Candidate G-produktkontrakt, 2026-08-22

- [x] Genafspil den Git-ignorerede 12-vinduescache og verificér den foretrukne `G-50-50-NO-DIRECT-WIND` uden at skrive private payloads til Git.
- [x] Gør komponent-/score-/gatekontrakten eksakt; 1.460/1.460 evalueringer rekonstruerer samme score.
- [x] Mål waders-produktkonflikten: 219/730 under jagtbarhed 35, 7 med mindst 55 point, og kanonisk 0/79.
- [x] Fastlæg waders-forskningskontrakten: strand uden loft; waders med synligt loft ved jagtbarheden; ingen sikkerheds- eller grundegnethedsmodel.
- [x] Implementér og genafspil `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`: vinddel 100 til 6 m/s, monotont fald over 6, 730/730 uændrede strandscorer og nul waders-scorer over jagtbarheden.
- [x] Fastlæg pil/historik: pilen viser aktuel lokal strøm; historik forklares særskilt på samme context. 332/872 tydelige contexts er modrettede, 100 med scoreeffekt.
- [x] Udvid den nationale shadowrapport med en fail-closed coveragegate og afvis parentzonemorfologi som lokal del-evidens.
- [x] Før kode-/analysebaseline 4.0.253 gennem PR #62 og dokumentationscheckpointene gennem PR #64; fuld produktionsverifikation `32570223437` og live 210/673 er grønne.
- [x] Ejerreview af den score-neutrale waders-/vindkontrakt; den er valgt som næste analysecentrum, ikke som offentlig aktivering.
- [x] Saml pil, komponenter, vægte og forklaring i det endelige score-neutrale beslutningsgrundlag. `20/45/35` bevares som analysecentrum efter intervaltest; offentlig aktivering og ejerens samlede go/no-go er fortsat åbne.
- [ ] Kun ved en senere aktiveringsbeslutning: etablér en særskilt landsdækkende inputkontrakt. Den aktuelle mekaniske analyse bruger de 243 komplette dele og henter ikke ekstra rådata; statiske lokale retentionfeatures er udeladt.

### Candidate G-vægt og forklaring

- De faste priorer `15/50/35`, `20/45/35` og `25/40/35` er genafspillet på den ejer-godkendte waders-variant uden direkte vindhistorik.
- Yderpunkterne adskiller sig 4,947 point i gennemsnit og 282 referencebånd; `20/45/35` er den gennemsigtige midte og forbliver beslutningscentrum, ikke fundkalibreret facit.
- Den maskinlæsbare diagnostic-only forklaring binder eksakte komponenter og bidrag sammen med pil nu, historik før nu, fysisk gate og synligt waders-loft. Replay gav nul forklaringsafvigelser i 1.460 evalueringer.
- Frisk central shadow `32578554928` er gennemført på merge `d629177a`: 243/673 scorede dele og 430 uden komplet lokal DKSS-familie. Næste datatrin er at udvide dette reelle dynamiske inputgrundlag uden at opfinde lokale stedfeatures fra parentzoner.

Aktiv RavScore 25/40/35, offentlig UI, DMI/fallback, geometri, land-/vandpunkter og central admin forbliver uændrede.
