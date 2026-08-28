## 4.0.306 – ejerrettelser til læring, assistent og betjening (2026-08-28)

- Genopretter Candidate G som eneste offentlige model efter et for tidligt modelmerge og lukker den præcise schema-3→Candidate G-checkpointovergang uden private eller rå data. Se DEC-0104.
- Retter vejrforløb, 395 nm, koldt vands mobiliseringsforklaring, Kyst B og mobilknappen; tilføjer Rav Jagt-video og krediteret kysttværsnit.
- Udvider lokal assistentviden, tilføjer delstrengssøgning med bevaret zonerullemenu, pilesignatur og mørkere strømpil.
- Viser BernsteinScore/AmberScore uden at ændre interne RavScore-/Candidate G-kontrakter.
- Candidate G, DMI/Copernicus, offentlig score/state, geometri og land-/vandpunkter er uændrede. Se DEC-0103/0104.

## 4.0.305 – kort uden flisegitter (2026-08-28)

- Fjerner hårfine sømme mellem Leaflets rasterkortfliser med et målrettet 0,5 px overlap og normal fliseblanding.
- Standard- og satellitkort samt zoom er visuelt kontrolleret; zoner, pile, klikflader, Candidate G og alle data er urørte.
- 4.0.304's fælles RavRadar-kontakt er produktionsverificeret gennem PR #211 og bevaret. Se DEC-0100/0101 og `CHANGELOG-4.0.305.md`.
- PR #212/exact-head `33188425818`, merge `06ca96e9`, produktion `33190412990`, build `98914205954` og Pages `98916104285` er grønne. Offentlig 4.0.305, standard-/satellitkort, zoom og Om-retur er verificeret uden flisesømme.

## 4.0.304 – fælles RavRadar-kontakt (2026-08-28)

- Kontaktknappen på **Om RavRadar** hedder nu **Skriv til RavRadar** og åbner `RavRadar@outlook.dk`.
- Dansk, tysk og engelsk bruger samme RavRadar-identitet og mailadresse; kontrakttesten afviser de tidligere kontaktværdier.
- Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0100 og `CHANGELOG-4.0.304.md`.
- PR #211/exact-head `33183709302`, merge `e5eed868`, produktion `33183809909`, build `98891543382` og Pages `98893788414` er grønne. Offentlig 4.0.304 og DA/DE/EN-kontaktlink er verificeret.

## 4.0.303 – prioriteret mobilopstart uden første installationsreload (2026-08-28)

- Ruller 4.0.302's fysisk afviste parallelle opstart tilbage: ejerens iPhone viste cirka 30 sekunder koldt og 7–8 sekunder varmt trods grøn desktop-CI.
- Første service-worker-overtagelse genindlæser ikke længere siden, og installationen forhåndshenter ikke kortfilen eller de store Om-billeder.
- DEC-0098's fungerende historikretur bevares. Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0099 og `CHANGELOG-4.0.303.md`.
- PR #209/exact-head, produktion og Pages er grønne; offentlig 210 + 5 × 5 og Om-retur består. Ejeren bekræfter fysisk iPhone Safari med 4–5 sekunders både kold og varm start, fungerende retur og korrekt 4.0.303-version.

## 4.0.302 – parallel opstart, fysisk afvist (2026-08-28)

- Paralleliserede kort-/kystprojektion med manifest/conditions og bestod PR #207/exact-head samt produktion på desktop.
- Fysisk iPhone Safari viste cirka 30 sekunder koldt, 7–8 sekunder varmt og langsom første Om-navigation. Versionen er afvist og erstattet af 4.0.303/DEC-0099.
- PR #208's rollback var exact-head-grøn, men produktion stoppede fail-closed før deploy på `INVALID_SWITCH_VERSION`; offentlig side forblev 4.0.302. Se `CHANGELOG-4.0.302.md`.

## 4.0.301 – Om-knappen udfører rigtig historikretur (2026-08-28)

- Retter den afgørende forskel, som 4.0.300 overså: 4.0.292's tidligere bevis brugte browsertilbage, mens det interne `./`-link lavede en ny navigation.
- Den interne knap bruger nu `history.back()` ved verificeret samme-origin root-referrer og bevarer `./` som sikker fallback ved direkte/fremmed åbning.
- Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0098 og `CHANGELOG-4.0.301.md`.

## 4.0.300 – gendannet mobil sidecache-retur (2026-08-28)

- Fysisk iPhone viste fortsat ingen kort/prognoser efter den interne Om-knap i produktionsgrøn 4.0.299; lås/oplåsning fik visningen frem.
- Gendanner 4.0.292's statiske `./`-link og eksisterende state-redraw. Fjerner nonce-navigation, mobil hard reload, watchdog og DOM-sundhedsreload uden at rulle 4.0.295/296's startupforbedringer tilbage.
- Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0097 og `CHANGELOG-4.0.300.md`.

## 4.0.299 – én hurtig Om-retur uden tvungen reload (2026-08-28)

- Bevarer den unikke versions-/noncebaserede Om-navigation, men fjerner 4.0.298's ekstra synkrone head-script, timer og automatiske reload.
- Offentlig 4.0.298 var komplet efter cirka ét sekund med 210 zonelinjer og 5 + 5 + 5, hvorefter det fejlbehæftede værn genstartede den allerede færdige side. 4.0.299 lader den hurtige appopstart fuldføre præcis én gang.
- Ændringen følger direkte offentlig evidens og ejerens røde fysiske iPhone-test. Ingen Candidate G-, score-, vejr-, bruger- eller geodata ændres. Se DEC-0096 og `CHANGELOG-4.0.299.md`.

## 4.0.298 – sikker direkte retur fra Om RavRadar (2026-08-28)

- RavRadar-linket på **Om RavRadar** laver en entydig ny root-navigation med versionsmarkør og nonce i både Safari og Hjemmeskærm-app.
- Et lille værn i sidens `<head>` kræver synligt kort, fem **Bedste områder**, fem dagsfaner og fem viste prognoserækker og må højst udføre én frisk retry efter seks sekunder.
- Ændringen følger ejerens præcisering: den fejlede fysiske iPhone-rejse brugte den interne knap, ikke browserens tilbageknap. Den eksisterende bfcache-recovery bevares.
- Candidate G, RavScore, vejr, scorer, sortering, konto-/turdata, privatliv, assistent, geometri og land-/vandpunkter er uændrede. Se DEC-0095 og `CHANGELOG-4.0.298.md`.
- PR #203/exact-head `33164570642`, merge `077b6fb9`, produktion `33164639052`, build `98827073610` og Pages `98829261896` var grønne, men den offentlige vagt genkendte ikke de 210 zonelinjer i custom panes og genindlæste derfor fejlagtigt. Fysisk iPhone-test var rød; følg DEC-0096/4.0.299.

## 4.0.297 – mobil bfcache-retur med fail-safe genindlæsning (2026-08-28)

- Reagerer på ejerens fysiske mobilobservation: efter retur fra eksempelvis **Om RavRadar** kunne den genoptagne forside igen mangle kort og prognoser, selv om desktopretur var grøn.
- Installerer et tidligt returværn og genindlæser en persisted mobilside rent. Desktop beholder genoptegning med et tresekunders watchdog og konkret sundhedskontrol af kort, **Bedste områder** og **5-dages RavRadar**.
- PR #201/exact-head `33162270459`, merge `f1adf9b1`, produktion `33162334072`, build `98819572518` og Pages `98821497503` er grønne; offentlig funktion og ydelse bestod.
- Ejerens efterfølgende fysiske iPhone-test af RavRadars eget Om-link var fortsat rød. 4.0.297 ændrer derfor ingen faglig model eller data, men må heller ikke kaldes løsningen på den konkrete rejse. Se DEC-0094/0095 og `CHANGELOG-4.0.297.md`.

## 4.0.296 – minimal Candidate G-startpakke (2026-08-28)

- Lukker restflaskehalsen efter 4.0.295: aktiv READY-nødvisning havde stadig 3.562.253 byte/23,36 sekunders startup trods behovsstyrede detaljer og cirka 3,67 sekunders varm cache.
- Beholder kun aktuel score/status, dækningsfelter, tre komponenttal, kompakt vejr, minimale labels og vinderdelens lille DMI-`flowPoints`-bevis i startup; fulde forklaringer, timeforløb og state forbliver i detaljepakken.
- Bevarer detaljepakke/hash, dataset, tider, scorer, bestetid og national rangering. Den opdaterede READY-lignende test falder 591.295 → 29.670 byte uden scoreafvigelse.
- PR #199's exact-head var grøn og blev merged som `bdd23cc0`; første produktion `33157055276` stoppede fail-closed før deploy på manglende pilproveniens. Den afgrænsede korrektion bevarer kun de tre nødvendige `flowPoints`-felter.
- PR #200/exact-head `33158782786`, merge `f1cd5868`, produktion `33158840203`, build `98808126976` og Pages `98814032394` er grønne. Offentlig startup er 399.801 byte/1,37 sekunder no-cache og cirka 1,31 sekunder varm til komplet visning; farvet kort, fem aktuelle områder og fem resultater på alle fem prognosedage er verificeret. Se DEC-0093 og `CHANGELOG-4.0.296.md`.

## 4.0.295 – hurtig offentlig start og behovsstyrede detaljer (2026-08-28)

- Lader kort, **Bedste områder** og **5-dages RavRadar** bruge en kompakt startpakke med samme Candidate G-bestetid og nationale rangering som før.
- Henter den fulde 90–132 MB detaljepakke først, når område, konto, tur, assistent eller dybt zoom kræver den.
- Genbruger kun liveprognoser, når URL'en er bundet til både dataset-id og manifest-SHA; manifest, geometri og ikke-adresserede livefiler forbliver friske.
- Bevarer fuld detaljepakke, nødvisning, dataset-/tids-/hashgates, scorer og sortering. Ingen geometri eller punkt aktiveres; den nye Sibirien-revision forbliver privat staged. Se DEC-0092 og `CHANGELOG-4.0.295.md`.
- PR #198/exact-head `33153155088`, merge `6c0602d7`, produktion `33153271907`, build `98790063641` og Pages `98794513908` er grønne. Offentlig funktion og varm cache er verificeret; den resterende READY-startpayload følges op i 4.0.296.

## 4.0.294 – driftslukning af Cloudflare-credentialrotation (2026-08-28)

- Roterer Workers AI-credentialen med mindst-mulig kontoafgrænset Read + Edit og erstatter kun den eksisterende Supabase Edge-secret; ingen credentialværdi er vist eller gemt i repositoryet.
- Beviser den nye vej på DA/DE/EN, fast emneafvisning, tilladt CORS, fremmed-origin-afvisning, seks minutkald + `429` på det syvende og offentlig lokal fallback.
- Tilbagekalder efter særskilt ejerbekræftelse fire gamle generisk navngivne tokens. Et post-revoke-retry består `200` efter én fail-closed transient i Supabase-rate-limitlaget.
- Ændrer ingen kode, version, Edge-deploy, produktionsartifact, RavScore, vejr, prognose, brugerdata, privatliv, geometri eller land-/vandpunkter. Se `CHANGELOG-4.0.294.md`.

## 4.0.294 – naturlige oprindelsesspørgsmål i Spørg RavRadar (2026-08-28)

- Den offentlige 4.0.293-kontrol fandt, at den naturlige formulering **Hvordan opstod rav?** faldt uden for den ellers korrekte oprindelses-intent og derfor blev afvist.
- Dansk, tysk og engelsk genkender nu almindelige dannelsesformuleringer som **Hvordan opstod/dannes rav?**, **Wie entsteht Bernstein?** og **How is amber formed?** lokalt uden netværk eller AI-kvote.
- De oprindelige 51 balancerede emnecases er bevaret og suppleres af tre særskilte formuleringregressioner. Assistentens read-only-, privacy-, kvote-, gateway- og Candidate G-grænser er uændrede. Se DEC-0091 og `CHANGELOG-4.0.294.md`.
- PR #195/exact-head `33131976433`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102` og Pages `98725082313` er grønne. Offentlig DA/DE/EN-kontrol består de tre naturlige oprindelsesspørgsmål sammen med farvet kort, fem aktuelle områder og fem prognosedage; 4.0.294 er produktionsverificeret.

## 4.0.293 – bred read-only Spørg RavRadar-viden (2026-08-28)

- Udvider lokale DA/DE/EN-svar fra ni grove intents til 17 grundbogsbaserede emner, som virker uden netværk og AI-kvote.
- Udvider den offentlige GPT-OSS-viden fra 10 til 23 evidens-ID'er samt evalpakken til 51 lokale og 66 samlede, balancerede cases.
- Bevarer Candidate G for bedste sted/tid/score og alle eksisterende Edge-, privacy-, CORS-, rate-limit-, timeout-, gratis kvote-, fallback- og rollbackgrænser.
- Assistenten forbliver read-only. RavScore, vejr, prognoser, sortering, konto-/turdata, geometri og land-/vandpunkter ændres ikke. Se DEC-0091 og `CHANGELOG-4.0.293.md`.

## 4.0.292 – mobil sidecache- og punktskifte-selvrecovery (2026-08-28)

- CI-hotfix: punktstagingens syntetiske READY-test bruger nu en eksplicit reference og kan ikke overstyres af produktionsworkflowets låste time. Første post-merge-run stoppede sikkert før DMI/deploy; runtimekontrakten er uændret.
- Gatehotfix: den eksisterende DMI-schedulertest accepterer og kræver nu, at private punktkandidater holdes uden for den offentlige dækningsnævner; testen er flyttet ind i punktstagingens PR-kildegate.
- Den samme scheduler-adfærdstest er gjort selvstændig i den tidlige kildegate ved lokalt at stubbe ubrugte netværksafhængigheder; produktions-DMI installerer fortsat de virkelige pakker før dataarbejdet.

- Genopretter forsiden efter Safari/WebKit back/forward-cache: en færdig visning genoptegnes, mens ufuldstændig eller afbrudt opstart genindlæses rent.
- Dækker kort, **Bedste områder**, valgt zone og **5-dages RavRadar** gennem ét idempotent `pageshow`-forløb med dubletværn og fail-safe reload.
- Indfører staged land-/vandpunktkandidater: aktivt punkt bevares, kandidaten DMI-valideres og opvarmes privat, og kun en særskilt ejeraktivering kan skifte atomisk efter fulde gates og central versionskontrol.
- Udvider hel-datasæt-fallbacken til højst seks lokale Candidate G-warmups; gamle og nye zoner blandes aldrig.
- Tilføjer målrettede livscyklus-, privatheds-, DMI-, state-, aktiverings-, versionskonflikt- og recoveryregressioner uden at flytte et faktisk punkt eller ændre score, vejr, sortering, brugerdata eller geometri. Se DEC-0089/0090 og `CHANGELOG-4.0.292.md`.
- PR #192/exact-head `33127353135`, merge `d22d0867`, produktion `33127437790`, build `98708851478` og Pages `98711255270` er grønne. Offentlig 390 × 844-returkontrol viser 210 farvede zoner, fem aktuelle områder og fem færdige prognoserækker uden browserfejl; stagingstatus er tom og saniteret. Den eksisterende Candidate G-nøddrift fortsætter korrekt med 0/673 frisk `READY`, mens den virkelige 48-timersstate modnes.

## 4.0.291 – offentlig gratis Spørg RavRadar (2026-08-27)

- Aktiverer den valgte Cloudflare GPT-OSS 20B gennem den hærdede server-side Edge-gateway efter ejerens udtrykkelige go.
- Tilføjer synlig DA/DE/EN-kvotetekst i assistentdialogen: den begrænsede daglige AI-kvote holder RavRadar gratis og gælder kun Spørg RavRadar uden indflydelse på kort, prognoser, RavScore eller øvrige funktioner.
- Registrerer som næste særskilte leverancer den mobile returfejl for kort/ranglister/femdøgnsvisning og ejerønsket om en væsentligt bredere, versionsbundet lokal ravfaglig assistent.
- Cloudflare-dashboardet er kontrolleret som Workers Free / $0 med 10.000 neuroner/dag og fejl ved overskridelse; betalt overflow, Workers Paid og prepaid AI Gateway er forbudt.
- Bevarer lokal domæneafvisning, deterministiske Candidate G-svar, server-only credentials, dataminimering, CORS, rate limits, timeout, struktureret validering og lokal fallback. Se DEC-0088 og `CHANGELOG-4.0.291.md`.
- PR #187/exact-head `33114501539`, merge `c6c9998c`, produktion `33114598957`, build `98665953481`, Pages `98668455689` og offentlig desktop-/390 px-kontrol er grønne. Den fortsat markerede vejr-nøddrift er uafhængig af assistentaktiveringen.

## 4.0.290 – central DA/DE/EN og sikker assistentgrænse (2026-08-27)

- Tilføjer ét centralt offentligt tekstkatalog med dansk standard/fallback, parameteriserede nøgler, localeformatering og lokalt husket Dansk/Deutsch/English-valg med flag og tydelige navne.
- Oversætter hele den offentlige flade: hovedside, aktuelle/femdøgnsstatusser, områdepanel, konto/login, turformularer, lokal Spørg RavRadar, **Om RavRadar** og alle 12 sektioner i **Grundbog i ravjagt**. Admin-, ekspert- og interne flader forbliver danske.
- Afviser kendte uvedkommende og sikkerhedsfølsomme spørgsmål før provider, holder bedste sted/tid/score deterministisk i Candidate G og reducerer mulig fjernkontekst til en offentlig allowlist.
- Implementerer en fortsat deaktiveret server-side Cloudflare GPT-OSS Edge med credentials kun på serveren, CORS, domænegate, kvotebuffer, timeout, struktureret output-/evidensvalidering og lokal fallback. Gratis Gemini er forkastet som offentlig EØS-produktionskandidat under aktuelle vilkår, men Flash-Lite 27/27 bevares som reference.
- Udvider den reproducerbare DA/DE/EN-runner til Cloudflare Workers Free-kandidaterne GLM-4.7-Flash, Gemma 4 26B og GPT-OSS 20B med samme schema/hårde stop samt latenstids-, token- og neuronmåling. GLM/Gemma blev stoppet efter ikke-evaluerbare smoke-svar; GPT-OSS er valgt som fortsat deaktiveret Edge-kandidat efter 1/1 smoke, 4/4 mål-gate og 25/26 beståede evaluerbare fuldtests. Én længdeafvigelse og én irrelevant timeout skal fejle lukket i gatewayen.
- Målrettede sprog-, fallback-, assistent-, Edge-, sikkerheds-, konto-/tur-, 210/673/2.100-præsentations- og lokale desktop-/390 px-browserkontroller er grønne. Candidate G 20/50/30, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede. Se DEC-0086/0087.
- PR #183/#184/#185 bestod exact-head CI. To gamle tekstbaserede fuldtests stoppede de første produktionsforsøg sikkert før deploy og er nu bundet til stabile i18n-nøgler med separat dansk fallbackkontrol. Produktion `33107232593`, build `98640417925` og Pages `98643230518` er grønne; offentlig 4.0.290 består DA/DE/EN, husket valg, fem **Bedste områder** og fem prognoserækker. Candidate G-fallbacken er fortsat tydeligt markeret under primærseriens genopbygning.

## 4.0.289 – årsagstro produktion og robust genopretning (2026-08-27)

- Forbyder, at en DMI-prognosetime efter den workflowlåste UTC-time bliver produktionstime; nærmeste fallbacktime vælges kun bagud inden for tre timer.
- Giver målrettet Copernicus to procesisolerede forsøg med seks minutters hard timeout og 20 sekunders pause.
- Gemmer et generisk hash-/modelbundet checkpoint med præcis 673 kompakte Candidate G-states før de sidste gates, uden vejr, scoreoutput, rå vektorer, koordinater eller private data.
- Udvider komplet nødvisning til højst 72 timer, men aldrig efter egen prognosehorisont, så Candidate G's 48-timers genopbygning har et sikkert overlap.
- Tilføjer ét automatisk retry efter fejlet, timeoutet eller før-start-fejlet schedule-run og et payloadfrit 45-minutters watchdog uden parallelle tunge builds; total GitHub-schedulerstilhed kræver fortsat ekstern overvågning.
- PR #181/exact-head `33076656266`, merge `6c8acf08` og produktion `33076772432`/build `98532962269`/Pages `98538133039` er grønne. Liveauditten består 4.0.289 med 210/673/420/2.100 og nul funktions-, konsol-, side- eller HTTP-fejl. Se DEC-0085 og `CHANGELOG-4.0.289.md`.
- Candidate G 20/50/30, fysik, DMI-først, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## 4.0.288 – automatisk Candidate G-genopretning (2026-08-27)

- Bevarer det seneste komplette, auditerede Candidate G-datasæt ved fejlet eller ufuldstændig ny datahentning og publicerer aldrig en halv ny runtime.
- Viser fallbacken som ét atomisk startup-/detaljedatasæt i højst 48 timer med tydelig besked om, at dataene ikke er aktuelle; **Bedste områder** og **5-dages RavRadar** kan derfor fortsætte sikkert.
- Genstarter Candidate G fra den reelle verificerede suffix efter et hul over tre timer og modner ny state i baggrunden uden interpolation eller backfill. Automatisk skift sker først ved 673/673 `READY` og grøn faktisk runtimeaudit.
- Tilføjer en eksakt hash- og tidslåst engangsrecovery af 09 UTC-checkpointet fra den fejlede produktion `33059522170`; kun kompakt afledt state kopieres.
- Målrettede tests og virkelige, dataminimerede artifactsimulationer er grønne. Exact-head-, produktions- og browserlukning afventer. Se DEC-0084 og `CHANGELOG-4.0.288.md`.
- PR #176 bestod exact-head `33066322196` og blev merged som `16ad8300`. Produktion `33066416034` gendannede den låste 09-state, men stoppede før DMI/deploy, fordi fallbackstage lå efter stateændringen. Opfølgningen flytter kun fallbackkopien før checkpointet og låser rækkefølgen i workflowtesten.
- Candidate G 20/50/30, fysik, vejr, normal sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## Historisk forundersøgelse – gratis Gemini-reference til Spørg RavRadar (2026-08-27)

- Auditerer den nuværende lokale/Edge-assistent mod Candidate G og dokumenterer de åbne produktionshuller uden at aktivere fjern-AI.
- Tilføjer en versionsbundet offentlig Candidate G-videnspakke og 45 balancerede dansk/tysk/engelsk evalcases, herunder åbne uvedkommende emner uden fast ordlistematch.
- Tilføjer en offline self-test og en eksplicit live-Gemini-runner, der kræver både lokal API-nøgle og bekræftet Free Tier uden billing.
- Valgte historisk `gemini-3.5-flash-lite`/low efter 27/27 remote-kandidatcases, median/p95 1.329/1.896 ms og DA/DE/EN 9/9. `gemini-3.7-flash` blev afvist efter fem 12/30-sekunders-timeouts. Produktionsvalget er senere erstattet af DEC-0087 på grund af aktuelle EØS-vilkår; resultatet er fortsat kvalitetsreference.
- Låser DEC-0083: kun ravrelevante spørgsmål, deterministiske bedste sted/tid/score-svar, fast afvisning af uvedkommende/interne spørgsmål og lokal fallback uden betalt overflow.
- Ingen offentlig runtime, version, RavScore, vejr, konto-/turdata, geometri, land-/vandpunkter eller private data er ændret.

## 4.0.287 – Supabase-identitet og EU-D1-turlager (2026-08-26)

- Supabase bevarer Auth/Edge, mens normale ture går til ti EU-låste Cloudflare D1-shards med HMAC-pseudonym og uden rå ID, mail, navn, JWT, GPS eller rute.
- Privat service-HMAC, kanonisk payload-hash og klient-/tur-id låser tidsgrænse, idempotens og konfliktstop.
- Migration kører før og efter cutover uden kildesletning. `TRIP_STORAGE_MODE=supabase` er eksplicit rollback uden normal dual-write.
- Daglig payloadfri kapacitetskontrol og eksplicit ejersletning er implementeret. Supabase-varslet 9. september 2026 forbliver åbent.
- Infrastruktur-PR #162/#163 og deres exact-head-gates er merged. Dedikeret Cloudflare-konto, mindst-mulige tokens, krypterede GitHub-secrets og rollback-Edge-deploy `33014772035` er verificeret uden private data.
- Første D1-cutover `33019198166` oprettede ti EU-shards og deployede Workeren, men stoppede sikkert før migration/Edge ved en kort health-udbredelsesforsinkelse. Den efterfølgende health-kontrol var grøn; deployverifikationen har nu bounded retry uden svagere kontrakt.
- PR #166 bestod exact-head `33019805663` og blev merged som `2d12c085`. D1-cutover `33019868542` migrerede fire eksisterende rækker, beviste idempotent genkørsel og aktiverede D1-normaldrift gennem grøn Worker-, Edge- og CORS-kontrol uden payloadlog.
- Produktion `33019856228` og Pages-job `98351206091` udgav `rr-20260826224651-210`: 210/210 aktive zoner, befolket **Bedste områder**, 210/673/420/2.100-struktur og nul browser-/HTTP-fejl. Read-only monitor `33021364240` viste ti shards og 0 % lagerforbrug. Se DEC-0082 og `CHANGELOG-4.0.287.md`.
- Cloudflare deploy-/audit-token er nu uden udløb og med uændrede mindst-mulige rettigheder. Supabase-PAT'et blev historisk udskiftet til udløb 25. august 2027 og ende-til-ende-verificeret i D1-run `33024408547`, før de gamle PAT'er blev tilbagekaldt.
- Det daværende credential-varsel bestod PR #169/exact-head `33025102301`, merge `1e402834` og manuel main-prøve `33025289153` uden for tidlig issue. Ejerens senere driftspræcisering pensionerer varslet: Supabase-PAT er kun et behovsstyret management-token, må udløbe uden normaldriftseffekt og oprettes kortvarigt først ved en konkret verificeret deploy/migration/rollback.
- Produktion `33025210517`/Pages `98367528389` og offentlig `rr-20260827000855-210` er grønne på 210/210 aktive zoner, fem ranglisterækker og den fulde 210/673/420/2.100-browseraudit.
- Den interne, score-neutrale Ravudsigten-sammenligning er startet med en forståelig analysejournal og første tidsstemplede snapshot af aktuelle top-fem, femdøgnssignaler, zonematch og mulige forskelsårsager. Den er fortsat longitudinel og uvalideret efter ét vejrvindue og er forbudt i app, offentlig håndbog, ekspert-/adminflader og public runtime.
- PR #171 bestod exact-head `33029393300` og blev merged som `f15f5892`. Første produktion `33029447510` stoppede sikkert før Supabase-sync/artifact/Pages, fordi den globale kildeneutralitetstest ikke havde den godkendte interne RDKS-undtagelse. Opfølgningen afgrænser undtagelsen til præcis analysefilen og kræver dens interne, score-neutrale og ikke-offentlige sikkerhedsmarkører.
- PR #172 bestod exact-head `33030112665` og blev merged som `7a234653`. Produktion `33030166104`/Pages `98382359708` bestod fuld kæde; offentlig `rr-20260827013448-210` er komplet med 210/210 aktive zoner, 673/673 scoreklare kystdele og fem rangliste-/prognoserækker i begge søgemåder uden synlig runtimefejl.

## 4.0.286 – rullende Candidate G-kontinuitet og predeploy-funktionsgate (2026-08-26)

- Den offentlige positive audit afviste 4.0.285 korrekt efter ellers grønne gates: 0/210 aktive zoner og 665/673 `WINDOW_INCOMPLETE`.
- Grænsebeviset før et faseskudt 48-timersvindue bevares nu kompakt til næste rullende reference. Det afspilles ikke i det aktuelle vindue og tæller ikke som måling, interpolation eller ekstra dækning.
- To-trins regressionstests kræver fortsat `READY` og 48 timers dækning ved næste reference.
- Produktionsworkflowet auditerer den faktisk genererede `data/live/conditions.json` før Supabase-sync, artifact og Pages og stopper på den dokumenterede masseregression.
- Den dataminimerede produktion `32997118162` beviste 672 `READY`, én warmup og nul replaymismatch, men kun 1.328/1.344 modes. De sidste 16 var otte godkendte native holds, som en ældre Phase D-forbetingelse afviste før Candidate G-memory.
- En native hold kan nu kun score fra den allerede afledte `READY` memory ved allowlist-afledt eksakt tre-timers tilladelse, alder højst tre timer og uden aktuelle U/V-, fart-, retnings- eller alignmentfelter. Almindelig uverificeret, for gammel og ikke-READY strøm er fortsat fail-closed.
- PR #159/exact-head `33001615758`, merge `c0f42b33` og produktion `33001743118` er grønne. Offentlig `rr-20260826185603-210` viser 210/210 aktive zoner, befolket **Bedste områder**, komplet 210/673/420/2.100-struktur og nul browser-/HTTP-fejl.
- Candidate G 20/50/30, +10/-8-/13-timersfysikken, sikkerhed, vejr, zoner, geometri og land-/vandpunkter er uændrede. Geodatafilerne ændrer kun topversionsfeltet til 4.0.286. Se DEC-0081 og `CHANGELOG-4.0.286.md`.

## 4.0.285 – Candidate G-cadencefase ved 48-timersgrænsen (2026-08-26)

- Den offentlige 4.0.284-strukturaudit var grøn, men den aktuelle rangliste var tom. Pages-artifacts viste 672/673 `READY` og 209/210 aktive zoner i sidste 4.0.283-build mod 8/673 og 0/210 allerede i første 4.0.284-build.
- Et eksakt lighedskrav ved `reference - 48h` fjernede målingen umiddelbart før vinduet, når referencen flyttede én time væk fra native tretimersfasen. 665 sammenhængende forløb blev derfor kunstigt 46 timer.
- 4.0.285 accepterer kun grænsekrydsningen med et verificeret compact bevis før grænsen og højst tre timers sammenhæng til første bevis efter den. Der opfindes ingen måling eller interpolation.
- Et ægte kort vindue uden forgænger og et hul over tre timer er fortsat fail-closed. Den eksisterende bounded-memory-selftest stoppede en første for bred variant og er bevaret sammen med den nye regression.
- En engangsrecovery er låst til workflow `32978542594`, datasæt `rr-20260826142942-210`, 673 del-ID'er og SHA-256 `d5877f8a0945619b700efa3a97807ac9552033d244ab117e92d8fea87f1877d5`. Den fletter kun compact transport evidence.
- Lokal simulation mod de virkelige offentlige source-/target-artifacts genskabte 672/673 `READY`; den ene kendte umodne del forblev lukket, og recoveryen blev straks inaktiv.
- Onlineaudits kræver nu mindst én aktiv aktuel zone, og Candidate G-shadowgaten stopper den brede accepterede 45–48-timers `WINDOW_INCOMPLETE`-fejlsignatur.
- Candidate G 20/50/30, scorekurver, sikkerhedsgrænser, vejr, zoner, geometri og land-/vandpunkter er uændrede. De to beskyttede geodatafiler ændrer kun topversionsfeltet til 4.0.285 som godkendt i DEC-0076. Se DEC-0081.

## 4.0.283 – Moderzonen bevares i Candidate G-slutkontrollen (2026-08-26)

- Retter en afgrænset fejl i den afsluttende videnskabelige kontrol, som mistede kystdelens moderzone, når 210 zoner blev foldet ud til 673 kyststrækninger.
- Produktion `32912103679` dokumenterede allerede 673/673 scoreklare kyststrækninger, heraf otte godkendte native-kadencereferencer, men slutkontrollen kunne kun genkende 665/673 uden moderzonekoblingen og stoppede derfor korrekt før deploy.
- En fælles hjælpefunktion bevarer nu den autoritative zone-nøgle under udfladning. En regressionstest låser, at også en kystdel uden indlejret `zoneId` kan matches til sin verificerede native-kadencereference.
- Datakravene lempes ikke: der opfindes ingen måling, historik, pil eller retning. Candidate G 20/50/30, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede. De beskyttede geodatafiler ændrer kun topversionsfelt til 4.0.283. Se DEC-0079.
- PR #153 bestod exact-head `32914734446`, blev merged som `1caad399`, og produktion `32914887586` bestod hele kæden inklusive releasegate og Pages.
- Offentlig kontrol beviser 210 zoner og 673/673 kyststrækninger på Candidate G-only. 657 dele har komplet transporthukommelse; 16 dele er ærligt lokalt utilgængelige med 30–48 timers naturlig historik og nul reset. Den falske **Mangler/Ukendt**-fejl er lukket uden kunstig historik.

## 4.0.282 – Eksakt Candidate G-reference ved native vinduesskift (2026-08-26)

- Lukker de sidste falske **Mangler/Ukendt** for de otte godkendte tretimers-regionalproxyer, når seneste ægte prøve ligger umiddelbart før beregningsvinduet.
- Genbruger kun en eksakt verificeret prøve på højst tre timer og kun som transportreference.
- Dataminimerer til tid og kystrelativ styrke; ingen rå vektorer, koordinater, punkt-id'er, ny pil eller mobilisering.
- Tilføjer målrettede tests. Candidate G 20/50/30, scorekurver, zoner, geometri og land-/vandpunkter er uændrede. Se DEC-0078.

## 4.0.281 – Candidate G-native teknisk diagnostik (2026-08-25)

- Retter den tekniske scorevisning, som fejlagtigt viste **Mangler**, **Ukendt**, `–/100` og **Ikke beregnet**, fordi brugerfladen stadig læste pensionerede felter fra den gamle scoremotor.
- Bevarer Candidate G's faktiske målingsstatus, retning mod den lokale kyst, 48-timers strømhistorik, fase, udgående episode og tab samt transport-, leverings- og mobiliseringsled gennem både kystdels- og zoneaggregationen.
- Native tretimers-mellemtimer beskrives som fastholdt afledt tilstand. De får ikke opdigtet rå måling, retning, klassifikation eller ny evidens.
- Teknisk visning siger udtrykkeligt, at vinden ikke indgår direkte i transportscoren, og forklarer beregningsleddene på almindeligt dansk.
- En landsdækkende kontrakttest låser den samme Candidate G-native forklaring for alle offentlige zoner og kyststrækninger. **Mangler/Ukendt** må kun vises ved reel manglende Candidate G-evidens.
- PR #150 er merged som `1308a07d`, og produktion `32899040618` er grøn. Offentlig audit viser 1.314 komplette tekniske modeforklaringer, 673 accepterede statefortsættelser og nul reset.
- Browserauditten følger nu Candidate G's lokale fail-closed-kontrakt og består 420 aktuelle visninger, 2.100 prognosevisninger og 673 kystdelsreferencer uden fejl. De 16 umodne dele viser utilgængelighed frem for falske felter eller gammel score.
- Candidate G 20/50/30, alle scorekurver, vejrregler, zoner, geometri, land-/vandpunkter, central admin-data og brugerdata er uændrede. De to beskyttede geodatafiler ændrer kun topversionsfelt til 4.0.281. Se DEC-0077.

## 4.0.280 – korrekt orienteret familiebillede (2026-08-25)

- Retter EXIF-orienteringen i familiebilledet på **Om RavRadar** uden at ændre originalen.
- Leverer tre korrekt orienterede, komprimerede billedvarianter og et responsivt layout med opret billede ved siden af teksten på pc og over teksten på mobil.
- PR #149 er merged som `42b7058f`, og ejeren har efter den offentlige udgivelse kontrolleret, at billedet står rigtigt på både mobil og pc.
- Candidate G, RavScore, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte. Geodatafilerne ændrede kun topversionsfelt til 4.0.280.

## 4.0.277 – årsagstro native tretimerskadence (2026-08-25)

- Retter et sikkert 666/673-stop, hvor en fremtidig regionalproxyprøve kunne tælles som aktuel dækning, mens den timeskarpe audit korrekt afviste den.
- Kun de otte ejerallowlistede `dkss_lf`-proxyer må fastholde den seneste afledte transporttilstand i højst tre timer mellem ægte prøver. Der tilføjes ingen bevægelse, evidens, U/V, hastighed, retning eller pil.
- Næste ægte prøve integrerer den faktiske tidsafstand. Over tre timer eller enhver ændret punkt-/kildekontekst stopper fortsat lokalt.
- Bevarer eksisterende Candidate G-historik uden backfill, interpolation eller rekonstruktion. Candidate G 20/50/30 er fortsat eneste offentlige profil uden rollback.
- Scorekurver, zoner, geometri, land-/vandpunkter og central admin-data er uændrede; geodatafilerne ændrer kun versionsfelt. Se DEC-0074.
- PR #140 bestod exact-head og blev merged. Første produktion byggede historik og runtime grønt, men stoppede sikkert før deploy på en forældet statisk test. Testen kræver nu den samme 673-kontrakt som produktionsauditen; ingen runtime-, score- eller dataadfærd er ændret af opfølgningen.
- Opfølgende PR #141 bestod exact-head `32817501003` på `128c71ce` og blev merged som `81e9b891`. Produktion `32817626537` bestod central hydrering, frisk vejr, 673/673-dækning, fuld validering, releasegate, artifact og Pages-deploy.
- Offentlig 4.0.277 viser 673/673 Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik. Candidate G 20/50/30 er fortsat eneste profil; rollbackprofilen er `null`, og legacyfallback er forbudt. 0/210 zoner er endnu aktive, fordi ingen lokal kæde ved kontrollen havde nået de krævede 48 timer.

## 4.0.276 – strømhistorik bevares pr. kystpunkt (2026-08-25)

- Retter den private Copernicus-cache, så en dynamisk indsamlingsgruppe eller flytning af ét punkt ikke længere kan ugyldiggøre verificeret historik for uændrede kystpunkter.
- Genindsamling af samme time erstatter kun de valgte punkter. Et ændret punkt mister sin egen gamle historik, mens uændrede søsterpunkter og deres eksakte samlingsbevis bevares.
- Den fulde centrale punktidentitet følger hver opdatering. Ukendte punkter, moderzone-/vandpunktmismatch, dubletter og forkert delmængdefingeraftryk afvises fail-closed.
- Der udføres ingen backfill, interpolation eller rekonstruktion. Candidate G 20/50/30 forbliver eneste offentlige scoremodel, og lokale scorer åbner ved ægte komplet 48-timers historik.
- En dataminimeret audit dokumenterede cirka 36 timers fortsat kompakt state. Den ældre brede cache var ikke sikkert sammenhængende til målreferencen for hele landet og bruges derfor ikke som genvej.
- PR #138 bestod exact-head `32787344926` på `acb59cc6` og blev merged som `72913723`. Fuld produktion `32787715986` og de naturlige produktioner `32788514636`/`32790639192` er grønne.
- Seneste dataminimerede livekontrol viser 673/673 accepterede states, nul resets og 6–39 timers lokale kæder. Et flyttet punkt modner kun sin egen kæde; uændrede punkters historik er bevaret.
- Scoreformel, vejrregler, offentlig runtimekontrakt, zoner, geometri og land-/vandpunkter er uændrede. Se DEC-0073.

## 4.0.274 – holdbar Candidate G-only-kontrakt (2026-08-24)

- Retter den centrale migrationsgrænse, som fik mergeproduktionen for 4.0.273 til at stoppe før deploy: en historisk central rollbackkonfiguration kan ikke længere overskrive den ejerbesluttede Candidate G-only-kontrakt.
- Validerer Candidate G-only både før central persistence og efter readback. En legacyprofil kan ikke vinde på samme eller højere versionsnummer.
- Forsiden, zonepanelet og Rav-assistenten bruger nu kun den lokale Candidate G-beregning. Manglende evidens giver utilgængelighed, ikke en skjult 25/40/35-, parent-, nabo- eller anden-timescore.
- Releasegaten stopper ved central legacykonfiguration eller genindførte offentlige imports af den gamle scoremotor.
- Adminforsiden viser **ALLE AKTIVE** eller berørte zone-/søgemådepar med forståelige årsager; andre zoner fortsætter Candidate G.
- 4.0.273 blev ikke deployet. Geodatafilerne har kun fået versionsfelt 4.0.274; geometri og land-/vandpunkter er uændrede. Se DEC-0072.

## 4.0.273 – Candidate G-only og lokal scoretilgængelighed (2026-08-24)

- Candidate G 20/50/30 er nu den eneste offentlige scoremodel. Den gamle 25/40/35-model kan ikke længere vælges som reserve, rollback eller automatisk fallback.
- Manglende Candidate G-data gør kun den konkrete zone, søgemåde og tid utilgængelig. Der lånes ingen score fra gammel model, moderzone, nabo eller anden time.
- Utilgængelige scorer udelades fra **Bedste områder** og **5-dages RavRadar**, mens resten af landet fortsætter normalt på Candidate G.
- Adminforsiden viser, om alle zoner er aktive, og lister ellers berørte zoner, søgemåder og forståelige årsager.
- Profil-, pipeline-, lands-, UI- og shadowtests er opdateret til den nye kontrakt. Produktionshydrering og releasegates forbliver fail-closed.
- Geodatafilerne har kun fået versionsfelt 4.0.273; geometri og land-/vandpunkter er uændrede. Se DEC-0072.

## 4.0.272 – fail-closed Candidate G-tilstandsrecovery (2026-08-24)

- En ikke-fatal timeout ved hentning af tidligere offentlig tilstand nulstillede kunstigt alle 673 kystdele. 4.0.272 gør hentefejlen fatal, afviser global nulstart og genoptager kun den kompakte tilstand fra den eksakte låste sunde produktion.
- PR #131/merge `1bbb4cc2` indførte rettelsen. PR #132/merge `392fea15` bevarede den ældre hydratorindgang uden runtimeændring.
- Produktion `32761751284` bestod hele kæden og udgav `rr-20260824183620-210` på 210/673. Offentlig top-5 varierer igen 76–71, og femdøgnslisten sorterer 86–76.
- Scoreformel, vejrregler, zoner, geometri og land-/vandpunkter er uændrede. Én lokal punktkontekst opvarmes, og otte ældre aktuelle evidenshuller holder midlertidigt hele runtime på den eksisterende 25/40/35-reserve.

## 4.0.269 – aktuelle scoreforklaringer (2026-08-24)

- De tre RavScore-komponenter forklarer den viste kystdels konkrete vind-, bølge-, strøm- og stateforhold.
- Mobilisering forklares som bølgevirkning, og lavt vand fremstilles ikke længere som selvstændig indtransporthjælp.
- Fundprognose, offentlige scorelofter, rå samlet score-JSON og det tomme kortvalgsfelt er skjult; bagvedliggende data og logik bevares.
- Kilder og licenser er opdateret. Candidate G 20/50/30, global reserve, scoretal, vejr, Supabase, geometri og land-/vandpunkter er uændrede.
- PR #120 bestod exact-head `32703138969`, blev merged som `d745e0ba`, og produktion `32703271897` udgav live `rr-20260824080543-210` som 4.0.269 på 210/673.
- Browserkontrollen bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. Se `CHANGELOG-4.0.269.md` og DEC-0068.

## 4.0.267 – komplet uploadskema for kontoindberetninger (2026-08-23)

- Den aktive observationstabel manglede de to POST-only-felter `forecast_target_at` og `report_accuracy`. Desuden afviste klientens privatlivskontrol den krævede tomme værdi `gps=null`, før turen blev gemt lokalt eller sendt.
- En databevarende, idempotent migration tilføjer felterne og genindlæser PostgREST-schemaet uden at ændre eller slette ture.
- Privatlivskontrollen accepterer kun lokationsfelter med værdien `null`; faktiske GPS-, koordinat-, positions-, rute- og spordata forbliver blokeret. Rettelsen dækker både kontoindberetning og **Start ravtur → Slut ravtur**.
- API-loggen viste intet POST-forsøg fra de to ejerprøver. De nåede derfor ikke outboxen og skal indberettes igen efter udgivelsen.
- Score, vejr, Candidate G, geometri og land-/vandpunkter er uændrede; geodatafilerne får kun versionsfeltet 4.0.267.

## 4.0.266 – virkeligt login og privat turlog (2026-08-23)

- Den første interaktive ejerprøve viste, at Supabase sendte magic links til `localhost:3000`, fordi den centrale Site URL var forkert, og ingen produktionsredirect var tilladt. Begge er nu sat til den aktuelle RavRadar-side.
- Den aktive `observations`-tabel manglede `data_quality_flags` og SELECT-policyen for egne ture. Den idempotente migration tilføjer begge dele uden ny tabel, dubletpost, `UPDATE`, `DELETE` eller sletning af historiske rækker.
- En dataminimeret `limit=0`-kontrol accepterer nu hele turloggens feltliste med HTTP 200, og Supabase viser **users can read own observations / SELECT / authenticated**.
- Turloggens fejltekst bruger almindeligt RavRadar-sprog i stedet for leverandørnavnet Supabase.
- Flytning til `ravradar.dk` kræver, at Supabases Site URL og redirect-liste ændres i samme deployment og prøves med et nyt magic link.
- Målrettede konto-, efterregistrerings-, auth- og syntakstests er grønne. PR #113/exact-head `32662085932`, merge `db4db876` og produktion `32662155582` bestod hele kæden.
- Et nyt magic link returnerede rent til 4.0.266, og den private turlog hentede uden fejl. Kun eftersendelsen fra ejerens oprindelige Chrome-outbox mangler at blive bekræftet ved en genindlæsning.
- Score, vejr, Candidate G, geometri og land-/vandpunkter er uændrede; geodatafilerne får kun versionsfeltet 4.0.266.

## 4.0.264 – forståeligt brugerflow og privat turlog (2026-08-23)

- Kontoen får **Mine ture og fund**, som viser brugerens eksisterende Supabase-ture uden en ny tabel, ekstra serverrække eller dobbelt lagring.
- Den aktive turknap bruger nu den komplette v2-rejse direkte og starter ikke længere den gamle GPS-baserede parallelrejse.
- Login forklarer magic link som et engangslink via mail, og callbacken henter den faktiske Supabase-bruger før kontoejerskab bruges.
- Centrale brugerord om RavScore, turen og fund er gjort mere almindelige og forklarende.
- Rodhåndbogen tilføjes til workflowets eksakte docs-only-skip; en separat ren dokumentationsmerge skal senere bevise, at ændringen giver 0 push-produktionskørsler.
- Candidate G, `20/50/30`, scorelogik, vejrruntime, geometri og land-/vandpunkter er uændrede. Versionsløftet må kun ændre versionsfeltet i de to geodatafiler.
- PR #104 bestod exact-head og blev merged. Den første produktionskørsel stoppede før release på en forældet UI-test. PR #105 rettede den, bestod exact-head og blev merged; den næste produktion stoppede før deploy på en anden gammel ordret stjernetest. Stjernetesten og den lokalt fundne gamle mobil-turtest følger nu den nye UI og indgår i kildegaten.
- PR #106 bestod exact-head og produktion `32652970105` udgav 4.0.264 på 210/673. Live konto-/turflowet er kontrolleret, og den fulde 420/2.100/673-audit er grøn efter at audittens gamle `3-timers trend`-opslag blev rettet til UI'ets `Vandstandsændring på 3 timer`.
- PR #107 bestod exact-head `32654048944`, merge `8b758337` og fuld produktion `32654119745`; live `rr-20260823171804-210` er grøn med den låste auditlabel.
- Den rene dokumentations-PR #108 bestod exact-head `32654780774` og blev merged som `98621bf9`. Mergecommitten oprettede 0 push-produktionskørsler, så rodhåndbogens docs-only-skip er bevist.

## 4.0.263 – Candidate G-gate følger den aktuelle zonereference (2026-08-23)

- 4.0.262-produktion `32642532892` beviste, at cadence-rettelsen virker: 673/673 states fortsatte, replaymismatch var 0, og 110 transportpotentialer blev positive mod 563 fysisk fortsat nul.
- Den efterfølgende audit fandt en særskilt profilfejl: et senere hul i femdøgnsprognosen gjorde `candidateWarmupEligible=false`, selv om alle 673 faktisk viste aktuelle referencer var sammenhængende `WINDOW_INCOMPLETE`.
- Candidate G's memory-/warmup-gate vurderer nu den nærmeste fælles aktuelle referencetime pr. zone. Hele femdøgnets Candidate G-scorecoverage kræves fortsat, og et gap ved den aktuelle reference udløser stadig global rollback.
- Fremtidige gaps forbliver fail-closed i deres egen state: der opfindes ingen strøm, og det brugbare suffix genstarter fra den faste rand efter hullet.
- Kontrakten eksponerer `CURRENT_COMMON_ZONE_REFERENCE` og er låst i målrettede tests og public-shadowen.
- Scorefysik, `20/50/30`, rollback `25/40/35`, geometri, land-/vandpunkter og beskyttede/private data er uændrede; kun versionsfeltet i de to geodatafiler løftes til 4.0.263.
- PR #101 bestod exact-head `32644701811`, blev merged som `9f5953f6`, og produktion `32644772373` bestod hele kæden. Live `rr-20260823142247-210` har Candidate G aktiv på 210/673 med 673 fortsatte states, nul reset/replaymismatch, 139 positive og 534 aktuelt fysiske nultransporter.
- Aktiv shadow `32645569741` og browserkontrollen er grønne med 420 aktuelle visninger, 2.100 femdøgnsvisninger, 673 kystdelsreferencer og nul fejl. P0 er produktionslukket.

## 4.0.262 – Candidate G følger produktionens native strømcadence (2026-08-23)

- Candidate G's rullende 48-timers transporthukommelse accepterer nu op til tre timer mellem to verificerede beviser, svarende til produktionens dokumenterede marine stride. Integrationen bruger fortsat den faktiske forløbstid; der opfindes ingen mellemliggende timeprøver.
- Mere end tre timers afstand, manglende seneste bevis eller missing inde i vinduet er fortsat et ægte datagab. DEC-0060's ejeraccepterede pre-public opvarmning må nu kun omfatte et kort, men sammenhængende `WINDOW_INCOMPLETE`-vindue; andre ikke-ready-statusser giver global legacyrollback.
- Den centrale profilgate eksponerer `candidateWarmupEligible`, og public-shadow genafspiller hver kompakt transportstate med aktuel kode og kræver identisk potentiale, udtransporttilstand, readiness, status og coverage.
- Målrettede tests dækker første native tre-timers fortsættelse, et komplet 17-punkts/48-timers vindue, opdelt mod ubrudt replay og fail-closed ved fire timers hul.
- Dataminimeret genafspilning af den fejlramte 4.0.261-runtime ændrer 673 fastlåste nuller til 110 positive og 563 fysisk fortsat nul. Det gamle artifact afvises som forventet med state-replaymismatch; ingen rå strømvektorer, koordinater eller private payloads vises.
- Model-id, state-schema, `20/50/30`, +10/-8-/13-timersreglerne, mobilisering 4/48 og waders-jagtbarhed er uændrede. Artifact, protected-dirty-data, privat cache, geometri og land-/vandpunkter er urørte; kun versionsfeltet i de to geodatafiler løftes til 4.0.262.
- Lokal implementation, målrettede tests og samlet source-/RDKS-/releasegate er grønne. Exact-head, frisk fuld produktion, aktiv 210/673-shadow og hændelseskrævet browserkontrol skal være grønne, før P0 kan kaldes produktionslukket.

## 4.0.261 – Candidate G aktiv og produktionsverificeret under pre-public opvarmning (2026-08-23)

- **Historisk P0 efter release:** Live `rr-20260823121818-210` viste transportpotentiale og transportkomponent 0 i 673/673 dele, fordi tre timers native bevisafstand blev afvist af en én-times-gate. Den lokalt implementerede 4.0.262-rettelse er beskrevet i DEC-0061 og afventer ovenstående produktionsbevis.

- Ejeren har i DEC-0060 valgt Candidate G som RavRadars gældende scoremotor nu og accepteret, at den første ikke-offentlige scoreperiode bruger mindre end 48 timers naturlig schema-2-historik.
- Den aktive profil er `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` med `20/50/30`; modelregler, strømgrænser, +10/-8-kurven, 13-timers udtransportgate, mobilisering 4/48 og vindstyret waders-jagtbarhed er uændrede.
- Profilomskifteren skelner nu mellem fuld beregnelig Candidate G-dækning og moden transporthukommelse. Pre-public opvarmning tillades kun med eksakt ejerautoritet; én manglende nødvendig kandidatscore giver fortsat global rollback til `25/40/35`.
- Runtime mærker den første periode `candidate-active-pre-public-warmup` og bevarer faktisk `WINDOW_INCOMPLETE`-/coverage-status. Manglende timer opfindes ikke og kaldes ikke et 48-timersbevis.
- `ravscore-profile-selection` er et nyt privat centralt admin-dokument. En nyere ejer-godkendt repositoryversion kan promoveres én gang, hvorefter central samme/nyere konfiguration er autoritativ. Produktion skriver dokumentet tilbage og kræver identisk readback.
- Den aktive, dataminimerede shadow kontrollerer nu, at den offentlige score er identisk med Candidate G i alle 673 dele, samtidig med at rå U/V, koordinater og private payloads fortsat er forbudt.
- Eksakt legacyrollback, automatisk aktiveringsforbud og global fail-closed-adfærd er bevaret og målrettet testet.
- Ingen artifact, protected-dirty-data, private caches, geometri eller land-/vandpunkter er ændret. I `data/kystdata.json` og `data/zones.geojson` er kun versionsfeltet løftet til 4.0.261.
- PR #97/exact-head `32636378576`, produktion `32636433944` og central readback beviser den aktive profil. PR #98/produktion `32637387600` og shadow `32637833674` lukkede auditkontrakten; PR #99 registrerede den grønne 210/673/420/2.100-browserkontrol.


## Intern Candidate G-rettelse efter 4.0.260 – afgrænset transporthukommelse (2026-08-23)

- DEC-0059 erstatter Candidate G's ubundne transportfortsættelse og den forkastede startprior 50 med et fast, rullende 48-timers vindue af sammenhængende, verificeret og afledt kystnormal strømevidens.
- Transporten genafspilles fra en fast rand 0, der betyder “ingen dokumenteret indtransport før vinduet” og ikke fralandsstrøm. Persistéret transportoutput bruges ikke som ny startværdi.
- Fuld pålandsstrøm bygger fortsat 10 point pr. effektiv time; fuld fralandsstrøm trækker 8 point pr. effektiv time og udtømmer transporten fra 13 timer. Mobilisering og waders-jagtbarhed er uændrede.
- Statekontrakten er versionsbundet som schema 2. Missing og tidsgab må ikke foregives at være neutral strøm og holder Candidate G's globale aktiveringsgate lukket, indtil 48-timersvinduet igen er komplet.
- Syntetiske tests beviser samme resultat efter komplet vindue for tænkte starter 0, 50 og 100. En dataminimeret historisk audit finder 582 komplette vinduer og nul startafhængighed uden at udgive rå strømvektorer, koordinater, del-id'er eller private payloads.
- Der kræves ikke en ny 48-timers realtidsudviklingstest. Candidate G er fortsat inaktiv; offentlig `25/40/35`, UI, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er uændrede.
- Exact-head `32633533257` bestod på `56824ab0`; PR #95 blev merged som `1d848724`, og fuld post-merge-produktion `32633607166` bestod frisk data, fuld validering, releasegate, Supabase, artifact og Pages.
- Live `rr-20260823102619-210` er integritetskontrolleret mod manifestet med 210 zoner og 673 kystdele. Alle 673 har schema 2 med ét første afledt timebevis, `transportMemoryReady=false` og `WINDOW_INCOMPLETE`; aktiv, ønsket og rollback er fortsat legacy, og Candidate G er aktiveret 0 steder.

## 4.0.259 – central Candidate G-tilstand og 210/673 public shadow (2026-08-23)

- Candidate G beregnes nu centralt for hver kystdel med den anbefalede `20/50/30`-model, men forbliver et adskilt `diagnostic-only`-navnerum. Den aktive offentlige `25/40/35`-score, UI, farver og zonevindere er uændrede.
- Transportpotentiale, effektive udtransporttimer og mobiliseringspotentiale føres videre ved den fælles aktuelle referencetime. Model, profil og kystkontekst er versionsbundet; samme-time-rekørsel og missing holder tilstanden, mens inkompatibel kontekst nulstiller fail-closed.
- Den kompakte tilstand indeholder ingen rå U/V, vind-, bølge- eller koordinatdata. Offentlige Candidate G-resultater viser kun de afledte værdier og de komponenter, der kræves for forklaring og kontrol.
- Den manuelle Candidate G-shadow auditerer nu den faktiske fallback-kompatible public runtime i stedet for at genhente en smallere native-only DMI-prøve. Kontrakten kræver 210 zoner, 673 dele og 1.346 rekonstruerbare modeevalueringer.
- DEC-0057 dokumenterer dataminimering, bootstrap, forklaring og rollback. Exact-head `32609888406`, PR #89/merge `31e50acb`, fuld produktion `32609952992` og read-only shadow `32610281620` er grønne på 210 zoner, 673 dele og 1.346 modeevalueringer. Alle 673 tilstande er første bootstrap og må ikke kaldes en modnet 48-timersfordeling; aktiv scorekobling afventer naturligt videreført state-alder og en frisk slutshadow.
- Første naturlige schedule `32613284735` udgav `rr-20260823023951-210` efter fulde gates. Den dataminimerede audit accepterede 673/673 tidligere tilstande, nulstillede 0 og dokumenterer 3/3 timers yngste/ældste naturlige state-alder; 48-timersslutshadow udestår.
- Artifact, protected-dirty-data, geometri, land-/vandpunkter, bundmodel og sikkerhedsbetydning er urørte.

## Intern RavScore-forskning efter 4.0.258 – Candidate G mobilisering (2026-08-23)

- `RESEARCH-3` samler den foretrukne private Candidate G: `20/50/30`, DEC-0054's jagtbarhed, DEC-0055's strømtransport og DEC-0056's nye mobilisering.
- Mobilisering beregnes som én kausal tilstand fra bølgehøjde² × periode med fire timers opbygning og 48 timers aftrapning. Direkte vind, aktuel strøm, separat varighed og statisk stedegnethed giver ikke ekstra mobiliseringspoint.
- En ny syntetisk audit tester kort spids mod vedvarende hændelse, præcis 48-timers halvering, missing-hold, kørselsfortsættelse og udtransportgate uden private input.
- Den eksisterende Git-ignorerede cache er genafspillet uden nye downloads: 1.460 evalueringer, gennemsnitlig ny mobilisering 73,348 mod 57,651 og samlet scoreændring +3,484 mod den valgte transportrevision.
- De nye mobiliseringstests indgår både i `test:score` og den hurtige kildegate. Samlet lokal `scripts/validate-source.ps1` og releasegate er grønne.
- Den gamle 243/673-shadow beskriver en tidligere snæver native-DKSS-testkontrakt, ikke manglende almindelig vejrdækning. Den aktuelle produktion har 673/673 dokumenterede strømidentiteter; en senere slutshadow skal bruge den endelige fallback-kompatible kontrakt.
- PR #86/merge `5d7d4c2b` og produktion `32606559443` er grøn transportbaseline med fulde gates, 210 zoner og 673 dele. En midlertidig DMI 429/uforandret collection blev håndteret af den godkendte fallback uden gateomgåelse.
- Mobiliseringscheckpointet bestod exact-head `32607989444` på `03083f92`, blev merged via PR #87 som `48240d73` og bestod fuld produktion `32608050112`. Central hydrering, frisk kontrolleret data, fuld validering, releasegate, Supabase, artifact og Pages er grønne; 210/673-kontrakten består.
- Offentlig RavScore `25/40/35`, UI, runtime, geometri, land-/vandpunkter og beskyttede data er uændrede. Næste delmål er samlet pipeline-/forklarings-/rollbackforberedelse før offentlig kobling.

## Intern RavScore-forskning efter 4.0.258 – Candidate G frigivelsesrevision (2026-08-23)

- PR #82 bestod exact-head-kildegate `32602287607` på `74624ac3` og blev merged som `189644a0`.
- Post-merge-produktion `32602328912` bestod frisk vejr/proveniens, fuld validering, releasegate, supportpakke, Supabase og Pages. Live `rr-20260822223539-210` er komplet med 210 zoner, 673 kystdele og samme datasæt-id i manifest, startdata og detaljedata.
- En ny syntetisk, reproducerbar audit låser den godkendte udtransportkurve: transportpotentialet falder 100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4 og 0 fra 13 effektive fuldstyrketimer.
- Auditten dækker samtidig halv styrke, deadband, neutral strøm, valgfri 24/48-timers halvering, manglende verificering, bølge-only, den begrænsede landingsfaktor og waders-vindstoppet.
- Den nationale shadowkontrakt bruger nu de aktuelle aktiveringsgates og afviser de erstattede waders-/pil-/ekstremmarkører.
- Ejeren har efterfølgende afgjort 13-timersbetydningen. Den nye interne `RESEARCH-2`-revision sætter Candidate G's slutscore til 0, når dokumenteret kraftig fralandsstrøm både har udløst reel udtransport og udtømt transportpotentialet. Mobilisering og jagtbarhed bevares som synlige delscorer.
- Den bindende forklaring er: `På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`.
- Reglen udløses ikke af startpotentiale 0, missing, neutral strøm eller almindelig svag modstrøm. Den tidligere `RESEARCH-1`-betydning med samlet score cirka 35 ved udtømt transport bevares kun som revisionsspor.
- Implementationen bestod exact-head `32604792201` på `f6458f09`, blev merged via PR #84 som `800a93cb` og bestod fuld post-merge-produktion `32604850884`.
- Live `rr-20260822232159-210` er direkte verificeret som komplet med 210 zoner, 673 kystdele og samme datasæt-id i manifest, startfil og detaljefil. Candidate G er fortsat ikke offentligt aktiveret.
- Offentlig RavScore `25/40/35`, UI, produktion, geometri, land-/vandpunkter og beskyttede data er uændrede. Candidate G forbliver privat og kan ikke aktiveres automatisk.

## Intern workflowrettelse efter 4.0.258 – docs-only skip bevist (2026-08-23)

- PR #80 blev merged som `1565e073` med kun `CHANGELOG.md` og intern AI/RDKS-dokumentation.
- GitHub viste 0 workflowkørsler på mergecommitten; `Update weather and deploy RavRadar` blev derfor ikke oprettet.
- Den snævre rod-CHANGELOG-rettelse er dermed både kilde-, produktions- og skip-verificeret uden brede undtagelser.

## Intern workflowrettelse efter 4.0.258 – produktionsbevis på rod-CHANGELOG (2026-08-23)

- PR #79 bestod exact-head-kørsel `32600654326` på `24d944c0` og blev merged som `41f71900`.
- Den forventede fulde produktion `32600714319` bestod frisk vejr/provenance, fuld projektvalidering, release-gate, supportpakke, Supabase-synkronisering og Pages-deploy.
- Live-manifestet er komplet som `rr-20260822215524-210` med 210 zoner og 673 kystdele. Dette rene dokumentationscheckpoint er det særskilte skip-bevis; ingen ny push-produktion må oprettes ved merge.

## Intern workflowrettelse efter 4.0.258 – samlet CHANGELOG i docs-skip (2026-08-22)

- Den selektive dokumentationsregel dækkede versionsfilerne `CHANGELOG-*.md`, men ikke projektets aktuelle samlede `CHANGELOG.md`; derfor udløste PR #78's docs-only merge en unødvendig fuld produktion.
- Den eksakte rod-fil tilføjes til allowlisten ved siden af versionsmønstret. Regressionstesten kræver begge og bevarer forbuddet mod brede Markdown-, docs-, data-, script-, workflow- og HTML-undtagelser.
- Workflowrettelsen kræver én fuld produktionskørsel og derefter et separat docs-only skip-bevis.

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
## Intern RavScore-forskning efter 4.0.258 – transporttærskel og kørselskontinuitet (2026-08-23)

- Efter ejerreview anbefales `0,03→0,15 m/s` som Candidate G's private kystnormale produktprior. `0,15` matcher RavRadars eksisterende betydning af en velegnet strømstyrke; profilen er ikke fundkalibreret.
- Det opdaterede `RESEARCH-2`-replay på 1.460 evalueringer giver 31,360 i gennemsnit og 213 ændrede scorebånd mod 28,291 for 0,05→0,20. Den mere følsomme 0,02→0,12 ændrer 377 bånd.
- Neutral og missing giver intet passivt tab. 24-/48-timers neutral halvering bevares som følsomhed, ikke produktadfærd.
- Regimemodellen kan nu fortsætte en kompakt afledt tilstand over en pipelinegrænse. En opdelt syntetisk kørsel reproducerer potentiale, effektive udtransporttimer og 13-timers nul-gate eksakt.
- Offentlig RavScore `25/40/35`, UI, produktion, private payloads, artifact, protected-dirty-data, geometri og land-/vandpunkter er uændrede.
# 4.0.260 – versionsbundet RavScore-omskifter uden offentlig aktivering (2026-08-23)

- RavRadar kan nu vælge én eksakt RavScore-profil for hele den lokale 210/673-runtime og rulle deterministisk tilbage til `RRS-CURRENT-B0-4.0.247`.
- Standard, aktiv og rollback er fortsat offentlig `25/40/35`; Candidate G's `20/50/30` er ikke aktiveret.
- Candidate G kræver eksplicit aktivering, komplet global dækning, frisk grøn slutshadow og særskilt ejerbeslutning. Manglende eller ukendt konfiguration falder fail-closed tilbage for hele datasættet.
- Profilkontrakten følger startpakke, detaljepakke og manifest. Nye tests låser legacyidentitet, Candidate G-projektion, udtransportforklaring, forbud mod blandede profiler og eksakt rollback.
- Den naturlige state er dokumenteret videreført i seks timer på alle 673 dele uden nulstilling. Det er praktisk evidens efter ejerbeslutning, ikke et 48-timersbevis.
- Ingen artifact-, cache-, geometri-, punkt-, bund-, sikkerheds- eller offentlig scoreændring indgår.
- PR #92 bestod exact-head `32628441062` på `eabf7e8b` og blev merged som `c5898ce8`. Fuld produktion `32628516066` udgav `rr-20260823083627-210` efter alle gates.
- Den dataminimerede audit består 210/673/1.346 med 673 accepterede tilstande, nul nulstillinger og 9/9 timers alder; browserauditten består 420/2.100/673 uden fejl.
- Candidate G er fortsat ikke aktiv. Den friske scorefordeling er væsentligt lavere end aktiv score og afventer særskilt ejerreview før en eventuel aktiveringsversion.
- En dataminimeret bootstrapaudit af 42.551 eksisterende offentlige historikposter viste under den daværende ubundne regel, at 65–117 timers forløb ikke kunne bestemme startreserven uden passivt neutralt tab. Den historiske anbefaling om neutral startprior 50 er nu erstattet af DEC-0059; 0 og 100 bevares kun som følsomhedsspor, og ingen score aktiveres.
## 4.0.265 – fleksibel kontoindberetning og ærligt fravalg (2026-08-23)

- En indlogget bruger kan vælge **Indberet tur eller fund** fra kontoen uden først at starte en tur.
- Efterregistreringen kræver, at brugeren selv vælger dato og klokkeslæt for turens start samt turens varighed. Dato og klokkeslæt er ikke forudfyldt. Formularen genbruger samme spørgsmål og zoneafhængige kyststrækningsvalg som en almindelig tur.
- Rapporten gemmes i den eksisterende `observations`-tabel uden ny tabel, dubletrække eller databaseændring. Aktuelle vejrforhold bruges aldrig som historisk erstatning.
- Når et sikkert historisk snapshot ikke kan genskabes, gemmes efterregistreringen med tomme forecast-/snapshotfelter og `calibration_eligible=false`; den kan bruges som erfaring, men ikke direkte til scorejustering.
- Den lokale sandsynlighedsberegning filtrerer nu udtrykkeligt rækker med `calibration_eligible=false`, så en efterregistrering uden historisk vejr ikke ændrer brugerens aktuelle fundchance.
- En startet tur kan nu **Afsluttes uden at indberette** efter bekræftelse. Det rydder den lokale aktive tur uden observationspost, outboxpost eller Supabase-række; **Svar senere** bevarer turen lokalt.
- **Mine ture og fund** viser tid og mærker efterregistrering, men viser ikke længere intern tekst om databasekopier.
- Gramfeltets maksimum følger nu databasens eksisterende grænse, så en ellers gyldig rapport ikke kan ende fastlåst i offlinekøen.
- Målrettede kontrakt-, observation-, turlog- og syntakstests er grønne. De tre første PR-kørsler stoppede sikkert på henholdsvis et gammelt profilversionsmærke, to manglende webhåndbogssætninger og den manglende versionsspecifikke changelog. Alle tre afgrænsede mangler blev lukket uden scoreændring. PR #111 bestod derefter exact-head `32658661075`, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er 4.0.265 på 210/673; den udgivne formular kræver selvvalgt dato og tid uden forudfyldning.
- Candidate G, `20/50/30`, scorelogik, vejrruntime, database, geometri og land-/vandpunkter er uændrede. Versionsløftet må kun ændre versionsfeltet i de to geodatafiler.
## 4.0.284 – Sikkerhedsgrænser og offentlige Edge-gateways (2026-08-26)

- Saniterer dynamisk HTML, indfører CSP og fjerner inline JavaScript fra offentlige sider.
- Begrænser ekspertadministration i RLS, RPC og UI og flytter observationsinsert til en validerende, rate-limited Edge-gateway.
- Samler fælles CORS/gatewaykode. Begge funktioner er live-verificeret uden private testdata; lokal assistent er standard, fordi fjernsecret ikke er installeret.
- Overvåger Supabases varsel om mulig begrænsning fra 9. september 2026. Se `CHANGELOG-4.0.284.md` og DEC-0080.
