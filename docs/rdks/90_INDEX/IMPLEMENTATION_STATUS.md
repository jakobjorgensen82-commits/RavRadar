# Implementeringsstatus – 4.0.307 ejerrettelser under ekstra høj slutkontrol

## 4.0.307-kandidat – luk de fundne huller fra 4.0.306

- [x] Gennemgå alle ejerkrav igen mod seneste produktionsverificerede `main`.
- [x] Udvid lokalt med 152 kildeklassificerede emner og 456 DA/DE/EN-katalogevals oven på de eksisterende 17 intent-kontrakter; brug ekstern forskning, officielle kilder, RavRadars forskningsgrundlag og navngiven ekspertviden.
- [x] Ensret Edge-faktakontrakten til 395 nm og fjern delstrengsafvisningen af Skagen i både browser og Edge.
- [x] Ret Kyst B-pilen i de tyske og engelske læringsskabeloner og korrigér håndbogens historiske 365 nm-reference.
- [x] Udvid Edge fra 23 til 38 offentlige fakta og gør relevant ravrouting bredere uden at åbne private eller modelinterne data.
- [x] Filtrér udløbne 5-dagesdatoer i dansk tid uden at relabele prognoseværdier.
- [x] Fjern prognosedetaljefilen som forudsætning for lokale fakta-/forsknings-/sikkerhedssvar og browserprøv 395 nm, fosfor, succinit, revlehul og nøddriftsdatoer ved manglende detaljefil.
- [x] Luk samlet målrettet browserkontrol på desktop/mobil og alle relevante tests.
- [x] Bestå lokal RDKS, geodatadiff, fuld sourcegate og releasegate på afsluttet head.
- [ ] Bestå PR exact-head, merge, frisk produktion og offentlig slutkontrol.

Ingen model-, vejr-, state-, geometri- eller punktændring. Se DEC-0105.

## P0 – genåbn GitHub/vejropdateringer uden at deploye den ufærdige model

- [x] Bevis at begge fejlede produktionskørsler stoppede før Pages-deploy.
- [x] Bevis at offentlig 4.0.305 fortsat har 210/673, gyldig primær prognose og gyldig auditeret Candidate G-recovery.
- [x] Før source tilbage til den rene ejercommit `c53f5060` med Candidate G som eneste offentlige model.
- [x] Tilføj præcis schema-3→Candidate G-checkpointadapter og negativ no-mutation-test.
- [x] Bestå fuld lokal sourcegate og særskilt geodatadiff.
- [x] Bestå PR #217 exact-head `33212348031`, merge `8ebbd4e7`, frisk produktion `33212435923`, fuld `validate`/`release:gate` og Pages-deployment `6148930627`.
- [x] Verificér offentlig 4.0.306 på desktop/mobil med frisk primary, komplet 210 zoner/673 kystdele og atomisk auditeret Candidate G-recovery.

Driftsovervågning efter P0-lukning: den friske primary står ved `0/673 READY` og modnes naturligt uden kunstig historik. Broen bevarede cirka 36/48 timers sammenhængende suffix, så forventet `673/673 READY` er cirka 2026-08-29T09:00:00Z. Den komplette recovery står ved `673/673 READY` med nul replayafvigelser og dækker til den effektive grænse cirka 2026-08-30T01:34:48Z; planlagte produktioner skal fortsat følges til automatisk primary-overtagelse.

Se DEC-0104.

## 4.0.306-kandidat – samlet smårettelsespakke

- [x] Tekst, læring, illustration, lokal assistentviden, zonesøgning, kortsignatur, pilkontrast, mobilombrydning og synlige scorenavne implementeret.
- [x] Version, beslutning og begge håndbøger opdateret.
- [x] Målrettede tests, RDKS/sourcegate og geodatadiff på afsluttet head.
- [x] PR exact-head, merge, frisk produktion og offentlig desktop-/mobilkontrol.

Ingen model-, vejr-, state-, geometri- eller punktændring. Se DEC-0103.

## Ejer-godkendt og ikke implementeret – integreret næste RavScore-generation

- [x] Afgræns ekspertspørgsmålet: bølgeorbitaler og halv-bølgelængde er ikke en komplet beskrivelse af undertow, ripstrømme eller RavRadars valgte bundnære modelstrøm.
- [x] Verificér mod aktuel kode, at Candidate G allerede adskiller jagtbarhed, strømstyret transport, bølgeenergimobilisering og afhængig bølgelanding.
- [x] Lås arbejdsformen: én isoleret, autonom model-worktree, én samlet kandidat, ingen offentlig fragmentudgivelse og ingen ekstra offentlig shadowmodel.
- [x] Lås genbrugsprincippet: alle aktive led auditeres og fungerende dele bevares, medmindre en dokumenteret analyse begrunder erstatning.
- [x] Lås det parallelle smårettelsesspor til ikke-modelkode og kræv, at modelsporet integrerer seneste grønne `main` før slutvalidering.
- [x] Lås plug-and-play som acceptkrav: kandidaten skal selv levere kompatibilitet, adaptere, state-migration og rollback til RavRadars eksisterende system; ingen senere RavRadar-ombygning må stå tilbage.
- [x] Lås grænserne: ingen private payloads, geometri eller land-/vandpunkter; ingen påstand om empirisk bedre fundrate uden repræsentative funddata.
- [ ] Model-worktree: opdatér forskning og udfyld BEVAR/FORBEDR/ERSTAT/FJERN-matricen.
- [ ] Model-worktree: design og implementér den samlede årsagsmodel med versionsbundet state, usikkerhed, forklaringer og rollback.
- [ ] Model-worktree: bevis plug-and-play mod eksisterende produktionsgenerator, runtimeprojektioner, UI/admin/assistent, 210/673, cache/recovery og releasegates.
- [ ] Model-worktree: færdiggør producent-/forbrugermatricen og bevis DA/DE/EN, lokal/Edge-assistent, konto/ture/observationer, admin/ekspert, begge håndbøger, payloads/hashes, central profil, workflows og audits før release.
- [ ] Model-worktree: gennemfør scenarie-, ablations-, følsomheds-, regressions-, integrations- og fuld releasevalidering mod seneste `main`.
- [ ] Udgiv først efter samlet modelbeslutning, exact-head, frisk produktion og offentlig kontrol.

Se DEC-0102 og `docs/research/RAVSCORE_NEXT_GENERATION_WORK_BASIS_2026-08-28.md`. Offentlig version forbliver 4.0.305.

## P1 produktionsverificeret – fjern rasterflisegitter uden kortfølger

- [x] Reproducer det offentlige gitter og mål 256 px-fliser på brøk-pixelplacering.
- [x] Afvis visuelt 0,5 px-overlap med Leaflets additive blanding.
- [x] Begræns 0,5 px-overlap og normal blanding til `leaflet-tile-pane`-rasterfliser.
- [x] Lås selector, mål og uændrede standard-/satellit-/vektorlag i kontrakttest.
- [x] Verificér lokalt standardkort, satellitkort, zoom, 211 zonepaths samt målrettet mobilresume/Om-retur.
- [x] Bestå RDKS, geodatabevis, fuld sourcegate og releasegate.
- [x] Bestå PR #212 exact-head `33188425818`, merge `06ca96e9`, produktion `33190412990`, build `98914205954` og Pages `98916104285`.
- [x] Verificér offentlig 4.0.305 med 210 zoner, fem Bedste områder, fem prognosedage, standard-/satellitkort og zoom uden flisesømme samt bevaret Om-retur.

Candidate G, RavScore, vejr, prognoser, sortering, konto-/turdata, privatliv, assistent, geometri og land-/vandpunkter er uændrede. Se DEC-0101.

## P1 produktionsverificeret – fælles RavRadar-kontakt

- [x] Skift dansk knaptekst til **Skriv til RavRadar**.
- [x] Skift `mailto:` til `RavRadar@outlook.dk` på dansk, tysk og engelsk.
- [x] Brug RavRadar-navnet i tysk og engelsk knaptekst.
- [x] Udvid Om-sidekontrakten med positive DA/DE/EN-krav og negativ kontrol af tidligere kontaktværdier.
- [x] Bestå geodatabevis, RDKS-, versions-, source- og releasekontroller.
- [x] Bestå PR #211 exact-head `33183709302`, merge `e5eed868`, produktion `33183809909`, build `98891543382`, Pages `98893788414` og offentlig DA/DE/EN-kontrol.

Candidate G, RavScore, vejr, prognoser, sortering, konto-/turdata, privatliv, assistent, geometri og land-/vandpunkter er uændrede. Se DEC-0100.

## P1 produktionsverificeret – prioriteret mobilopstart og let første service-worker-installation

- [x] Registrér 4.0.301 som fysisk funktionel med cirka 14 sekunders første iPhone-load.
- [x] Registrér 4.0.302 som fysisk afvist trods grøn PR #207/produktion: cirka 30 sekunder koldt, 7–8 sekunder varmt og langsom første Om-navigation.
- [x] Registrér PR #208's grønne exact-head og fail-closed produktion `33177494546` på `INVALID_SWITCH_VERSION`; intet rollbackartifact blev deployet.
- [x] Gendan den prioriterede sekvens kort/kyst → manifest → conditions uden 4.0.302's parallelle konkurrence.
- [x] Undgå reload ved første service-worker-claim, men bevar én reload ved senere reel workeropdatering.
- [x] Fjern kortfil og store Om-billeder fra installationens forhåndshentning; bevar filer og cache ved faktisk brug.
- [x] Bevar DEC-0098's historikretur samt DEC-0092/0093's data-/fallbackkontrakter.
- [x] Bestå målrettede startup-, worker-, Om-, resume-, fallback- og ydelseskontroller.
- [x] Bestå fuld lokal RDKS/sourcegate og releasegate.
- [x] Bestå PR #209 exact-head `33178940206`/job `98874825239`, merge `19886fc0`, produktion `33179036658`, build `98875217073` og Pages `98877901727`.
- [x] Verificér offentlig 4.0.303, 210 zonelinjer, fem aktuelle områder, fem dage × fem resultater og intern Om-retur.
- [x] Få ejeren til at godkende korrekt version, fungerende Om-retur og både kold og varm Safari-start på 4–5 sekunder på fysisk iPhone.

Candidate G, RavScore, vejr, prognoseinput, sortering, konto-/turdata, privatliv og geometri er uændrede. Sibirien forbliver privat staged og uaktiveret. Se DEC-0099.

## P1 kildekandidat – intern knap udfører den beviste historikretur

- [x] Luk 4.0.300 gennem PR #205/exact-head `33169073533`, merge `11f87093`, produktion `33169139060`, build `98841746378` og Pages `98843831281`.
- [x] Registrér ejerens røde fysiske Safari-test på bekræftet version 4.0.300.
- [x] Ret dokumentationsfejlen: 4.0.292's bevis var browsertilbage, ikke intern `./`-navigation.
- [x] Bevis offentligt, at Om-sidens referrer er den kanoniske samme-origin-forside.
- [x] Brug `history.back()` kun ved almindeligt klik efter den eksakte root-referrer; bevar statisk `./` ved direkte, fremmed eller modificeret åbning.
- [x] Lås query, `/index.html`, fremmed/tom referrer, modified click, historikkald og fallback i målrettet test.
- [x] Bevar eksisterende `pageshow.persisted`-redraw og 4.0.295/296's lazy startup uden timer/reload/watchdog.
- [x] Bestå målrettede historik-, resume-, startup-, ydelses- og versionskontroller.
- [ ] Bestå PR exact-head, merge, fuld produktion og Pages.
- [ ] Genverificér offentlig 4.0.301-version, referrer, 210 zonelinjer, fem aktuelle områder og fem resultater på alle fem prognosedage efter intern historikretur.
- [ ] Få ejeren til at bekræfte Safari og derefter Hjemmeskærm-appen på fysisk iPhone.

Candidate G, RavScore, vejr, prognoseinput, sortering, konto-/turdata, privatliv og geometri er uændrede. Sibirien forbliver privat staged og uaktiveret. Se DEC-0098; DEC-0094–0097 er historiske, fysisk afviste forsøg.

## P1 produktionsverificeret – minimal Candidate G-startprojektion

- [x] Luk 4.0.295 gennem PR #198/exact-head `33153155088`, merge `6c0602d7`, produktion `33153271907`, build `98790063641`, Pages `98794513908` og offentlig funktionskontrol.
- [x] Bevis 4.0.295's varme start omkring 3,67 sekunder og afgræns den resterende kolde recovery-flaskehals til 3.562.253 byte/23,36 sekunder.
- [x] Projektér aktuelle READY-scoreposter til score/status, dækningsfelter, komponenttal, kompakt vejr, minimale labels og vinderdelens lille DMI-`flowPoints`-bevis.
- [x] Brug samme projektion i primær runtime og auditeret recovery; bevar detaljepakke/hash, dataset, tider, scorer, rangering og state.
- [x] Lås begge modes med score-/rangeringsparitet, fravær af tunge felter, bevaret pilproveniens og 591.295 → 29.670 byte syntetisk reduktion.
- [x] Bestå fuld lokal sourcegate, RDKS/privacy/Edge/releasekontrol.
- [x] Bestå PR #199 exact-head `33156988524` og merge som `bdd23cc0`.
- [x] Bekræft fail-closed gate: produktion `33157055276`/build `98802272478` stoppede før releasegate/Supabase/Pages på manglende startup-pilproveniens; den målrettede korrektion er grøn.
- [x] Bestå PR #200 exact-head `33158782786`/job `98807893242` på `5dad21c6` og merge som `f1cd5868`.
- [x] Bestå produktion `33158840203`, build `98808126976` og Pages `98814032394` med frisk data/proveniens, fuld validering, releasegate, Supabase, artifact og deploy.
- [x] Verificér offentlig 4.0.296: 399.801 byte/1,37 sekunders no-cache startup, cirka 1,31 sekunders varm komplet browservisning, farvet kort, fem **Bedste områder** og fem rækker på alle fem prognosedage.
- [x] Bevar tydelig sund Candidate G-recovery, mens ægte 48-timersstate modnes uden kunstig historik.

Candidate G, RavScore, vejr, prognoseinput, sortering, konto-/turdata, privatliv og geometri er uændrede. Sibirien forbliver privat staged og kræver ægte modning samt senere særskilt ejeraktivering. Se DEC-0092/0093.

## P1 produktionsverificeret – offentlig formuleringstest

- [x] Reproducer offentlig afvisning af **Hvordan opstod rav?** på 4.0.293.
- [x] Udvid kun det eksisterende oprindelses-intent med naturlige dannelsesformuleringer på DA/DE/EN.
- [x] Tilføj tre formuleringregressioner med lokal routing og nul netværkskald.
- [x] Bevar de eksisterende 51 balancerede emnecases og hele read-only-/Edge-/Candidate G-grænsen.
- [x] Bestå fuld lokal sourcegate og releasegate.
- [x] Bestå PR #195 exact-head `33131976433`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102`, Pages `98725082313` og privat shadow `33132055561`.
- [x] Bestå offentlig DA/DE/EN-formuleringskontrol sammen med farvet kort, fem aktuelle områder, fem prognosedage og korrekt kvotetekst.
- [x] Bestå live Edge-kontrol af 23-fakta-kilden, DA/DE/EN, fast afvisning, CORS/origin og 6/minut med lokal fallback.
- [x] Rotér Cloudflare quick-start-tokenet med mindst-mulig Workers AI Read + Edit, opdatér kun den eksisterende Supabase-secret uden redeploy og eksponér aldrig værdien.
- [x] Bevis ny credential før tilbagekaldelse med DA/DE/EN, fast afvisning, CORS/origin, 6/minut og lokal fallback; tilbagekald derefter fire gamle tokens efter særskilt ejer-go.
- [x] Bevis post-revoke-vejen med et afgrænset `200`-retry efter ét fail-closed, transient `503 RATE_LIMIT_UNAVAILABLE` før provider.
- [x] Bestå målrettede RDKS-, håndbogs-, privacy-, Edge-, assistent- og fallbackkontroller samt fuld lokal `validate:source` og releasegate på Sol/Ekstra høj.

Ingen svartekst, GPT-OSS-model, Edge-gateway, RavScore, vejr, prognose, sortering, konto-/turdata, privatliv, geometri eller punkt ændres.

## P1 produktionsverificeret – klogere Spørg RavRadar med lokal fallback

- [x] Lås 17 konkrete grundbogsbaserede intents for dansk, tysk og engelsk.
- [x] Bevar bedste sted/tid/score som deterministiske Candidate G-funktioner og send kun åbne relevante specialspørgsmål til GPT-OSS.
- [x] Tilføj 51 balancerede lokale evalcases uden netværk eller AI-kvote.
- [x] Udvid Edge-viden fra 10 til 23 evidens-ID'er og den samlede provider-eval fra 45 til 66 cases.
- [x] Bevar fast emneafvisning, server-only credential, dataminimering, CORS, rate limits, timeout, gratis kvoteloft, fallback og rollback.
- [x] Bevis med målrettede tests, at DA/DE/EN, Edge-validering og eksisterende Candidate G-svar består.
- [x] Bestå fuld lokal sourcegate og releasegate på kandidatens afsluttede kilde.
- [x] Bestå PR #194 exact-head `33130341973`, merge `25722abc` og frisk produktion `33130425262`/build `98718434389`/Pages `98721765768`; første offentlige kontrol udløste 4.0.294-hotfixen ovenfor.

Ingen assistentvej kan skrive til eller ændre prognoser, RavScore, vejr, sortering, konto-/turdata, geometri eller land-/vandpunkter. Se DEC-0091.

## P1 produktionsverificeret – sikker land-/vandpunktændring

- [x] Bevar aktiv sampling, mens en separat kandidat redigeres og gemmes centralt.
- [x] Sample kandidat privat uden Pages-/supportlæk af koordinater eller rå strømdata.
- [x] Kræv U/V-grid ≤5 km, 96 timers fuld horisont og 48 timers hashbundet Candidate G-memory.
- [x] Kræv særskilt ejeraktivering, eksakt warm-state-injektion, fulde gates og central version-CAS.
- [x] Bevar tidligere active override og genbrug kandidatcache efter deployfejl.
- [x] Dæk højst seks lokale warmups med ét komplet senest verificeret fallbackdatasæt.
- [x] Bestå målrettede isolation-, READY-, privacy-, aktiverings-, recovery-, versionskonflikt- og 672/1-tests.
- [x] Bestå PR #189 exact-head `33124945636`; første produktion stoppede før DMI/deploy på en miljøafhængig syntetisk test, som nu er isoleret med eksplicit referenceparameter.
- [x] Bestå PR #190 exact-head `33125466599` og produktionens friske DMI/Copernicus/runtime; fuld validate stoppede før deploy på en forældet scheduler-regex, som nu låser den nye private kandidatgrænse i kildegaten.
- [x] Bestå PR #191 exact-head `33126975042`; produktionskildegaten stoppede før DMI/deploy på manglende tidligt installeret `requests`, og scheduleradfærdstesten er nu selvstændig uden at mocke schedulerlogikken.
- [x] Bestå PR #192 exact-head `33127353135`, merge `d22d0867`, frisk produktion `33127437790`, build `98708851478`, Pages `98711255270` og offentlig saniteret stagingstatus med tom kandidatliste.

Ingen faktiske punkter eller geometri er flyttet. Se DEC-0090.

## P1 produktionsverificeret – mobil retur til forsiden

- [x] Afgræns fællessymptomet for kort, **Bedste områder** og **5-dages RavRadar** til manglende recovery omkring Safari/WebKit back/forward-cache og afbrudt asynkron opstart.
- [x] Installer tidligt bootstrapværn før første await.
- [x] Genindlæs ved ufuldstændig kerne-/detaljetilstand; genoptegn ellers Leaflet, zonefarver, rangliste, valgt zone og femdøgnsvisning.
- [x] Saml samtidige resumehændelser og brug ren reload som fail-safe ved genoptegningsfejl.
- [x] Bestå målrettet livscyklus-, mobil-, første-paint-, progressiv prognose- og modulversionskontrol.
- [x] Bestå exact-head CI, frisk produktion og offentlig Chrome-kontrol ved 390 × 844 med synligt kort, 210 farvede zoner, fem aktuelle områder, fem færdige prognoserækker og nul konsolfejl/advarsler efter **Om RavRadar** → tilbage.
- [ ] Få en supplerende fysisk iPhone-efterkontrol fra ejeren; den automatiserbare livscyklus- og produktionskontrakt er allerede grøn.

Se DEC-0089. Candidate G 20/50/30, vejr, prognoseinput, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## P1 produktionsverificeret – offentlig gratis Spørg RavRadar i 4.0.291

- [x] Modtag særskilt ejer-go til offentlig GPT-OSS-aktivering.
- [x] Genbekræft Cloudflare Workers Free / $0, 10.000 neuroner/dag og fejl uden betalt overflow.
- [x] Tilføj synlig og stabil DA/DE/EN-kvotetekst i assistentdialogen.
- [x] Sæt det versionsstyrede offentlige aktiveringsflag og bevar `false` som rollback.
- [x] Lås remote-succes, `429`-fallback, fravær af browsercredential, lokal emneafvisning og deterministisk Candidate G-routing med målrettede tests.
- [x] Deploy den versionsstyrede GPT-OSS Edge og installer kun de to server-secrets gennem Supabases godkendte kanal.
- [x] Bestå live CORS-, fast afvisnings-, DA/DE/EN-, provider-, timeout-/fallback- og afgrænset rate-limitkontrol før merge.
- [x] Bestå lokal source/releasegate, exact-head CI, frisk produktion og offentlig desktop-/mobilbrowserkontrol.

Se DEC-0088. Candidate G 20/50/30, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

PR #187 bestod exact-head `33114501539` på `d781e464`, blev merged som `c6c9998c` og gennemførte produktion `33114598957`, build `98665953481` samt Pages `98668455689`. Offentlig 4.0.291-browserkontrol består version, farvet kort, fem aktuelle områder, fem dagsfaner, DA/DE/EN-kvotetekst, et rigtigt evidensbundet Edge-svar, fast rouladeafvisning og 390 px-visning. Vejrvisningen er fortsat tydeligt i bounded nøddrift, mens frisk Candidate G modnes; AI-releasen ændrer ikke dette.

## P1 produktionsverificeret – central DA/DE/EN og domæneafgrænset assistent i 4.0.290

- [x] Centralt DA/DE/EN-katalog med stabile nøgler/parametre, dansk standard/fallback og localeformatering.
- [x] Tilgængelig sprogvælger med flag+sprognavne og lokalt husket valg.
- [x] Komplet offentlig flade gennem hovedside, prognoser, områdepanel, konto/login, ture, lokal assistent, Om-siden og hele Grundbogen; admin/ekspert/internt forbliver dansk.
- [x] Fast flersproget afvisning før provider, deterministisk Candidate G-routing og dataminimeret offentlig kontekst.
- [x] Provider-neutral Cloudflare/Gemini-evalrunner med samme DA/DE/EN-kontrakt, hard billing-opt-in og token-/latenstids-/neuronrapportering.
- [x] Revider Gemini-produktionsvalget: historisk 27/27-reference, men gratis offentlig EØS-drift er no-go; Workers Free er kandidatsporet.
- [x] Bestå målrettede i18n-, assistent-, konto-/tur-, 210/673/2.100-præsentations- og lokale desktop-/390 px-browserkontroller på alle tre offentlige sider.
- [x] Kør Cloudflare-liveeval med mindst-muligt token på bekræftet Workers Free. Ejeren har valgt GPT-OSS 20B efter 1/1 smoke, 4/4 mål-gate og 25/26 beståede evaluerbare fuldtests; GLM/Gemma stoppede efter ikke-evaluerbare smoke-svar.
- [x] Hærd og deploy Edge efter modelvalg med server-secrets, domænegate, dataminimering, CORS, rate limits, timeout, struktureret validering og lokal fallback. Offentlig Pages-aktivering og slutkontrol er produktionsverificeret i 4.0.291.
- [x] Bestå fuld lokal kildegate/releasegate, PR #183/#184/#185 med exact-head CI og sikker fail-closed korrektion af tre gamle tekstbaserede gates.
- [x] Bestå produktion `33107232593`, build `98640417925`, Pages `98643230518` og offentlig DA/DE/EN-kontrol af forside, Om-side, Grundbog, husket sprog, fem **Bedste områder** og fem færdige prognoserækker. Candidate G-fallback er fortsat tydeligt markeret, mens ny primærserie modnes.

Se DEC-0086 og DEC-0087. Candidate G 20/50/30, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## Afsluttet P0 – årsagstro produktion og robust recovery i 4.0.289

- [x] Dokumentér rodårsagen: DMI lykkedes med 622/673, mens den gamle resolver valgte en fremtidig 09 UTC-time og Copernicus derefter timeoutede.
- [x] Forbyd fremtidige DMI-prognosetimer som produktionstime; vælg kun bedst dækkede/nærmeste verificerede time på eller før den låste reference.
- [x] Indfør præcis to procesisolerede Copernicus-forsøg med seks minutters hard timeout og 20 sekunders pause.
- [x] Gem og genbrug et generisk, hashkontrolleret 673-deles Candidate G-checkpoint før de sidste gates uden vejr, scoreoutput, rå vektorer, koordinater eller private data.
- [x] Udvid komplet fallback til højst 72 timer, men stop altid ved dens egen prognosehorisont og bevar atomisk datasetbinding.
- [x] Tilføj ét automatisk retry efter en fejlet, timeoutet eller før-start-fejlet planlagt kørsel og et payloadfrit 45-minutters stilheds-watchdog uden parallelle tunge builds; dokumentér total GitHub-schedulerstilhed som ekstern overvågningsrisiko.
- [x] Bestå målrettede time-, retry-, checkpoint-, fallback-, data-service-, watchdog-, heartbeat- og workflowtests samt fuld lokal `validate:source` og releasegate.
- [x] Synkronisér 4.0.289, RDKS, håndbøger og changelog; bestå RDKS/version/geodatadiff.
- [x] Bestå PR #181 exact-head `33076656266`, merge `6c8acf08`, frisk produktion `33076772432`, faktisk runtimeaudit/releasegate i build `98532962269`, Pages `98538133039` og offentlig 210/673/420/2.100-kontrol uden fejl.

Se DEC-0085. Candidate G 20/50/30, fysik, DMI-først, vejrberegning, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede.

## Tidligere produktionsverificeret P0 – automatisk Candidate G-genopretning i 4.0.288

- [x] Afgræns hændelsen til en komplet, men browserafvist 00-runtime og et korrekt fail-closed 09-build med 673 `WINDOW_HAS_TIME_GAP`.
- [x] Bevar det seneste komplette Candidate G-datasæt atomisk til startup, detaljer, rangliste og femdøgnsvisning i højst 48 timer med tydelig aktualitetsadvarsel.
- [x] Vælg altid det nyeste gyldige fallbackgrundlag og lås 210 zoner, 673 dele, 673 `READY`, 1.346 modes, dataset-id og hashes.
- [x] Genstart statepipelinen fra den virkelige verificerede suffix efter huller over tre timer uden interpolation/backfill; bevar standard-memory fail-closed uden eksplicit opt-in.
- [x] Fjern fallback atomisk, når den faktiske nye runtime igen er 673/673 `READY`; stop ved uventet delvis national recovery.
- [x] Implementér og test hash-/tidslåst engangsrecovery af den kompakte 09-state uden vejr, scores eller rå vektorer.
- [x] Bestå målrettede kodeprøver og dataminimerede 673-deles artifactsimulationer.
- [x] Synkronisér 4.0.288, RDKS/håndbøger/changelog, bestå lokal `validate:source` og bevis kun topversionsændring i de beskyttede geodatafiler.
- [x] Bestå PR #176 exact-head `33066322196`, merge `16ad8300` og bevis i produktion `33066416034`, at den låste 09-suffix gendannes; stop sikkert da fallbackkopien lå for sent.
- [x] Flyt fallbackstage før checkpointindlæsning, så den komplette 00-runtime auditeres/kopieres før den hydrerede state bliver warmup.
- [x] Bestå PR #178 exact-head `33066897710`, merge `5f9ee093` og produktion frem til den faktiske 210/673-runtime; dokumentér det sikre stop `33066980965` på auditkravet om kandidatscore under 0/673 `READY`.
- [x] Ret auditten snævert, så `READY` fortsat kræver score/bidrag/fysisk gate, mens warmup kun accepterer en entydigt utilgængelig rå mode uden score og en fortsat lukket offentlig mode. Det eksakte `RavRadar-support-3635` består med 673 accepterede states og nul replaymismatch, og fallbackpublicering er lokalt verificeret.
- [x] Bestå PR #179 exact-head `33069307854`, merge `653a9811`, fuld frisk produktion `33069384084`, build `98507461295`, Pages `98512392768` og offentlig browserkontrol af 210 farvede zoner, fem **Bedste områder**, fem prognosedage, zonedetaljer og nødteksten uden browserfejl.

Candidate G 20/50/30, fysik, vejr, normal sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede. Se DEC-0084.

## P1 afsluttet – gratis og domæneafgrænset Spørg RavRadar

- [x] Auditér lokal og Edge-assistent mod Candidate G, offentlig scoreforklaring, sikkerhedsgrænse og deterministisk dataansvar.
- [x] Dokumentér, at den nuværende Edge mangler DA/DE/EN, struktureret output, almindelig emneafvisning og sikker routing af bedste sted/tid/score.
- [x] Lås nulbetalingskravet: Free Tier uden billing eller betalt overflow; kvote-/providerfejl giver lokal fallback.
- [x] Opret `rav-assistant-public-v1` med ti allowlistede offentlige Candidate G-fakta og eksplicit forbud mod private/interne kontekster.
- [x] Opret 45 balancerede DA/DE/EN-cases for faglighed, selected-zone-data, usikkerhed, sikkerhed, faste og åbne uvedkommende spørgsmål samt prompt injection.
- [x] Opret offline self-test og eksplicit live-runner, som ikke foretager providerkald uden nøgle plus Free Tier-bekræftelse.
- [x] Bestå målrettet eval-, lokal assistent-, Edge-sikkerheds-, RDKS-, knowledge-, kildeneutralitets- og releasegatekontrol.
- [x] Bekræft Free Tier uden billing/betalt overflow til live-runneren og installer nøglen lokalt uden Git eller credentialoutput. Faktisk projektkvote skal fortsat aflæses igen før release.
- [x] Kør live-eval mod `gemini-3.7-flash` og `gemini-3.5-flash-lite`; dokumentér fejl, latenstid, tokens og modelvalg. 3.7 gav fem timeouts; Flash-Lite/low bestod 27/27 med median/p95 1.329/1.896 ms og 27.314 tokens.
- [x] Bevar Flash-Lite 27/27 som historisk reference, men erstat produktionskandidaten med ejerens GPT-OSS 20B-valg i DEC-0087; dette er ikke offentlig aktivering.
- [x] Implementér provider-neutral Edge-routing, struktureret validering, fast afvisning og rollback bag fortsat deaktiveret standardflag.
- [x] Aktivér efter særskilt ejer-go, positiv CORS/rate-limit/fallback/DA-DE-EN/browserkontrol og aktuel privatlivs-/vilkårskontrol; produktionsverificeret i 4.0.291.

Assistentaktiveringen ændrer ingen score-, vejr-, konto-/tur-, geometri- eller prognosedata. Se DEC-0083 og DEC-0088.

## Produktionsverificeret 4.0.287 – endeligt EU-turlager med Supabase-rollback

- [x] Bevar Supabase som Auth-, profil-, rettigheds-, rate-limit- og offentlig Edge-grænse.
- [x] Pseudonymisér ejer-id med en separat versionsbåret HMAC-secret og fjern rå identitet, JWT, GPS og rute før ekstern lagring.
- [x] Implementér privat HMAC-signering mellem Supabase Edge og Cloudflare Worker med body-hash og tidsgrænse.
- [x] Fordel tur-id'er deterministisk over ti EU-låste D1-shards og saml privat ejerlog uden direkte identitet.
- [x] Lås kanonisk payload-hash, klient-/tur-idempotens og konfliktstop.
- [x] Migrér Supabase idempotent uden kildesletning og rekonsiliér både før og efter Edge-cutover.
- [x] Bevar eksplicit `TRIP_STORAGE_MODE=supabase` uden automatisk fallback eller normal dual-write.
- [x] Tilføj daglig payloadfri 70/85 %-kapacitetskontrol og manuel, eksplicit bekræftet ejersletning i begge lagre.
- [x] Lås D1-, HMAC-, privatlivs-, turlog-, workflow-, CORS- og rollbackkontrakten med målrettede tests.
- [x] Bestå fuld lokal `scripts/validate-source.ps1` inklusive releasegate på den færdige kandidat.
- [x] Opret/godkend dedikeret Cloudflare-konto, mindst-mulige D1/Worker-credentials og krypterede GitHub-secrets gennem den godkendte kanal uden at vise værdier.
- [x] Bestå infrastrukturens exact-head-gates `33014102652`/`33014672254`, merge PR #162/#163 og deployér/verificér Edge i eksplicit Supabase-rollback gennem `33014772035`.
- [x] Bestå kandidatens exact-head `33019055639`, merge PR #164 som `e9cd20ee` og opret/skema-verificér ti EU-shards samt deploy Worker i det sikkert stoppede D1-run `33019198166`.
- [x] Bestå udbredelsesrettelsens exact-head `33019805663`, merge PR #166 som `2d12c085c8178c4b89e8b00bf00ca43abe15129f` og den fulde D1-migration/cutover `33019868542`.
- [x] Verificér live D1-normaldrift, privat Worker-/Edge-grænse, idempotent 4/4-rækkemigration, dataminimerede tællinger og den eksplicitte rollbackkontrakt.
- [x] Bestå fuld frisk produktionsgate `33019856228`, Pages-job `98351206091` og offentlig `rr-20260826224651-210`-kontrol med 210/210 aktive zoner, befolket rangliste, 210/673/420/2.100 og nul fejl.
- [x] Bestå separat read-only monitor `33021364240`/`98352259752` med ti shards, 0 MB afrundet og 0 % lagerforbrug uden turlæsning.
- [x] Sæt begge mindst-mulige Cloudflare-tokens til **No expiration** uden værdiskift eller bredere rettigheder.
- [x] Udskift Supabase-PAT'et til udløb 25. august 2027; bestå D1-verifikation `33024408547` før tilbagekaldelse af gammel og ubrugt mellem-token.
- [x] Genbekræft audit-tokenet payloadfrit gennem `33024621109`/`98362935528` med ti shards og 0 % uden turlæsning.
- [x] Implementér og verificér det daværende secret-frie GitHub-issue/mailvarsel gennem PR #169/exact-head `33025102301`, merge `1e402834` og manuel main-prøve `33025289153`.
- [x] Præcisér efter ejerbeslutningen 27. august, at Supabase-PAT kun er et behovsstyret management-token; pensionér det kalenderbaserede varsel og lås med test, at normal drift og monitorering ikke bruger PAT'et.
- [x] Bestå frisk produktion `33025210517`, Pages-job `98367528389` og offentlig `rr-20260827000855-210`: 210/210 aktive zoner, fem ranglisterækker og 210/673/420/2.100 uden auditfejl.

Supabase-banneret om mulig begrænsning fra 9. september 2026 forbliver et åbent driftskrav. Supabase-PAT'et må udløbe uden rutinefornyelse: et kortlivet token oprettes først ved en konkret Edge-deploy, migration eller rollback-deploy og tilbagekaldes efter grøn verifikation. Cloudflare-token roteres kun ved kompromittering eller rettighedsændring. Se DEC-0082.

## P1 aktiv – intern, longitudinel Ravudsigten-sammenligning

- [x] Opret den interne, forståelige analysejournal og registrér første tidsstemplede snapshot af aktuelle top-fem, femdøgnssignaler og sammenlignelige RavRadar-zoner. Se `docs/rdks/30_FEATURES/INTERNAL-RAVRADAR-RAVUDSIGTEN-ANALYSE.md`.
- [x] Luk den globale kildeneutralitetskonflikt efter PR #171/produktion `33029447510` med en enkeltfil-undtagelse, som selv kræver intern/score-neutral/ikke-offentlig markering; bestå PR #172 exact-head `33030112665`, merge `7a234653`, produktion `33030166104`/Pages `98382359708` og offentlig `rr-20260827013448-210`-kontrol.
- [ ] Fortsæt skånsom sammenligning af kun offentligt synlige, tidsstemplede resultater over flere vejrsituationer og brug eventuelle uafhængige fund med dokumenteret kvalitet/samtykke.
- [ ] Behandl mulige regler som hypoteser; ingen adgangsomgåelse eller privat kode.
- [ ] Bevar `scoreImpact=false` og `publicRuntime=false`; synlighed er begrænset til RDKS, roadmap og changelog og forbudt i app, offentlig håndbog, ekspert-/adminflader og offentlige prognosedata.

## Produktionsverificeret 4.0.286 – rullende Candidate G-kontinuitet og predeploy-funktionsgate

- [x] Verificér 4.0.285 exact-head `32993055324`, merge `de6b78444bf1d9bd19beb6100ceb193fe40a8d85` og fuld produktion `32993270783` uden at forveksle grøn struktur med funktionel stabilitet.
- [x] Afvis offentlig 4.0.285 på den positive kontrol: 0/210 aktive zoner og 665/673 `WINDOW_INCOMPLETE`.
- [x] Afgræns regressionen til, at et nødvendigt virkeligt grænsebevis ikke blev bevaret til næste rullende reference.
- [x] Bevar grænsebeviset kompakt uden at afspille eller tælle det i det aktuelle 48-timersvindue.
- [x] Lås to efterfølgende faseskudte referencer med regime- og statepipeline-tests.
- [x] Kør Candidate G-shadowaudit på den faktisk genererede runtime før deploy, ikke kun som `--self-test` i fuld validering.
- [x] Bevis, at den nye gate afviser det offentlige 4.0.285-artifact med 665/673-masseregressionen.
- [x] Bevis recovery mod de virkelige offentlige artifacts: 672/673 `READY`, én ærligt umoden del og derefter inaktiv recovery.
- [x] Løft appversion, synkronisér RDKS/håndbøger/changelog og bevis ren topversionsdiff i de beskyttede geodatafiler.
- [x] Bestå PR #157 exact-head `32995801418` og merge som `2f2fd14883fbb974b331774858a61473ca06acc4`.
- [x] Stop produktion `32995888183` fail-closed i den nye faktiske runtimegate før Supabase-sync, artifact og Pages; offentlig 4.0.285 forblev urørt.
- [x] Tilføj dataminimeret gatefejlrapportering med kun fejlkoder og summerede optællinger, ingen del-ID'er, rådata, koordinater eller private felter.
- [x] Bestå PR #158 exact-head `32997043974`, merge som `ca784210eabd1f26a615116c6da00684fcf24a01`, og stop produktion `32997118162` før deploy med sikker evidens: 672 `READY`, én warmup, nul replaymismatch og 1.328/1.344 modeevalueringer.
- [x] Afgræns de sidste 16 manglende modes til de otte godkendte `dkss_lf`-dele ved `NATIVE_CADENCE_HOLD`, hvor den ældre Phase D-base krævede aktuel strøm før Candidate G-memory.
- [x] Tillad kun Candidate G-memoryberegningen ved allowlist-afledt eksakt tre-timers hold, `READY`, alder højst tre timer og tomme aktuelle strømfelter; bevar almindelig unverified, for gammel og ikke-READY fail-closed.
- [x] Bestå målrettede evaluator-, state-, livepilot-, forklarings- og diagnosekontrakter samt 16/16 dataminimeret replay af de faktiske offentlige fejlpunkter.
- [x] Bestå PR #159 exact-head `33001615758`, merge `c0f42b33956e3d2af361da1366ab552b9e2a33ef` og fuld frisk produktion `33001743118` gennem faktisk runtimegate, validering, releasegate, Supabase, artifact og Pages.
- [x] Verificér offentlig `rr-20260826185603-210`: 210/210 aktive zoner, befolket **Bedste områder**, 210/673/420/2.100-struktur og nul kontrol-, browser-, side- eller HTTP-fejl.

## Udgivet men funktionelt afvist 4.0.285 – første cadencefaselukning

- [x] Sammenlign det sidste 4.0.283-, første 4.0.284- og deployede 4.0.284-Pages-artifact uden supportpakker eller private data.
- [x] Afgræns faldet til første 4.0.284-build: 672/673 → 8/673 `READY` og 209/210 → 0/210 aktive zoner.
- [x] Ret 48-timersgrænsen, så en dokumenteret kadencefase på højst tre timer bevares uden et kunstigt målepunkt.
- [x] Bevar fail-closed for et ægte 47-timersdatasæt uden verificeret forgænger og for interne huller over tre timer.
- [x] Hash-lås den sidste sunde offentlige compact state og sammenflet kun transportbeviser med den nyere public state.
- [x] Bevis recovery lokalt mod de virkelige artifacts: 672/673 `READY`, én kendt umoden del og recovery straks inaktiv.
- [x] Kør målrettede regime-, statepipeline-, recovery-, shadow- og ablationstests.
- [x] Gør den positive offentlige funktionskontrol permanent: onlineaudits kræver mindst én aktiv zone, og shadowgaten afviser den brede accepterede 45–48-timers fejlsignatur.
- [x] Løft appversionen til 4.0.285; præcis diff beviser kun topversionsfelt 4.0.284 → 4.0.285 i de to beskyttede geodatafiler og ingen ændret geometri eller land-/vandpunkter.
- [x] Bestå exact-head-kildegate `32993055324`, merge PR #156 som `de6b78444bf1d9bd19beb6100ceb193fe40a8d85` og fuld frisk produktion `32993270783`.
- [x] Kør skærpet offentlig kontrol; den afviste korrekt 4.0.285 med 0/210 aktive zoner og 665/673 `WINDOW_INCOMPLETE`.
- [x] Erstattet funktionelt af den produktionsverificerede 4.0.286; 4.0.285 må ikke kaldes stabil baseline.

Se DEC-0081. Den sikkerhedsrelaterede 4.0.284-kode forbliver uændret i patchen.

## Udgivet 4.0.284 – drifts- og sikkerhedshærdning

- [x] Lås offentlige sider med CSP, fjern inline scripts/event handlers og saniter centralt HTML med allowlist.
- [x] Afgræns ekspertprofil- og rettighedslæsning i både RLS, RPC og UI.
- [x] Flyt observationsskrivning fra direkte tabelinsert til en validerende, rate-limited Edge-gateway uden fjern-GPS.
- [x] Hærd assistentgatewayen med lille offentlig kontekst, origin-allowlist, størrelsesgrænse, timeout, rate limit og sikre fejl.
- [x] Saml de tre `public-gateway.ts`-kopier til én kanonisk delt kilde og forbyd nye funktionslokale kopier i testen.
- [x] Anvend og dataminimeret verificér den smallere live-RLS uden at åbne private rækker.
- [x] Deploy begge Edge-funktioner gennem en godkendt browserkanal uden at svække Windows Application Control; slå inkompatibel legacy-JWT-verifikation fra.
- [x] Verificér CORS, afvist fremmed origin, payloadfejl, rate-limit-tilgængelighed og afvist gammel anonym rapport uden databaseinsert.
- [x] Vælg lokal Candidate G-assistent som releaseadfærd og lås fjernflaget til `false`, fordi ingen godkendt OpenAI-secret er installeret.
- [x] Kør målrettede sikkerheds-, assistent-, tur-, konto- og Pages-modultests.
- [x] Sæt releaseversion, synkronisér RDKS/håndbøger/changelog og bevis kun versionsfeltændring i beskyttet geodata.
- [x] Bestå lokal `scripts/validate-source.ps1`, inklusive releasegate, samt målrettet browserkontrol af CSP, håndbog, Om-side, dokumentation og lokal assistent uden fjernkald.
- [x] Bestå GitHub exact-head `32986025916`, merge PR #155 som `a92e270419404f249c526ed06d821cc2c2cf5cb2` og fuld pushproduktion `32987875007` inklusive Pages.
- [x] Bestå offentlig CSP/app-/210/673/420/2.100-strukturkontrol uden browserfejl.
- [x] Luk den særskilte Candidate G-cadencefase gennem den produktionsverificerede 4.0.286-kæde.

Supabases mulige begrænsning fra 9. september 2026 forbliver en åben driftsrisiko. Fjernassistenten kan senere aktiveres som en særskilt ændring med secret-, omkostnings- og positiv kontraktverifikation; den er ikke en releaseafhængighed i 4.0.284. Se DEC-0080.

## Produktionsverificeret 4.0.283 – bevar moderzone i slutkontrollen

- [x] Afgræns fejlen til kontrolkonteksten; den byggede livepilot og Candidate G-state var allerede 673/673 scoreklare.
- [x] Bevar den autoritative moderzone, når kystdelskilden foldes ud.
- [x] Brug samme hjælpefunktion i regression og afsluttende videnskabelig kontrol.
- [x] Bevar alle krav til verificeret strøm, native kadence og lokal fail-closed adfærd.
- [x] Dokumentér DEC-0079, version 4.0.283 og kun topversionsændring i de beskyttede geodatafiler.
- [x] Bestå PR #153/exact-head `32914734446`, merge `1caad399`, fuld produktionskæde `32914887586` og offentlig 673-kystdelskontrol.

Offentlig version 4.0.283 er komplet på 210 zoner og 673 kyststrækninger. Candidate G 20/50/30 er aktiv og ønsket profil, rollbackprofilen er tom, og `legacyPublicFallbackAllowed=false`. 657 kyststrækninger har komplet transporthukommelse. De resterende 16 har 30–48 timers naturlig historik uden reset og gør kun deres fem moderzoner ærligt lokalt utilgængelige.

Candidate G 20/50/30, scorekurver, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede.

## Produktionsverificeret 4.0.282 – luk native vinduesgrænsen uden kunstig historik

- [x] Afgræns 665/673-stoppet til de otte godkendte regionalproxyers eksakte prøve umiddelbart før beregningsvinduet.
- [x] Før kun en verificeret reference på højst tre timer ind i state-pipelinen.
- [x] Dataminimér referencen til tid og kystrelativ styrke; rå U/V, koordinater og punkt-id'er må ikke bevares.
- [x] Bevis, at referencen kun viderefører transport og ikke skaber ny måling, pil, mobilisering eller opdigtet mellemtime.
- [x] Afvis en reference ældre end tre timer og bevar lokal fail-closed adfærd.
- [x] Lås kildehjælper, state-pipeline og produktionskobling med målrettede tests.
- [x] Dokumentér DEC-0078, version 4.0.282 og kun topversionsændring i de beskyttede geodatafiler.
- [x] Bestå exact-head-kildegate, merge og 4.0.283's fulde produktionskæde/offentlige 673-kystdelskontrol.

Candidate G 20/50/30, scorekurver, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede.

## Produktionsverificeret 4.0.281 – luk falske Mangler/Ukendt i Candidate G-visningen

- [x] Afgræns fejlen til Candidate G's offentlige forklaringsprojektion, zoneaggregationen og den tekniske UI-visning; selve scoreberegningen er ikke årsagen.
- [x] Bevar Candidate G's målingsstatus, transportreference, 48-timersdækning, fase, udgående forløb/tab, transportpotentiale, levering og mobilisering i den offentlige kontrakt.
- [x] Erstat pensionerede legacyfelter i den tekniske visning med Candidate G-native felter og almindelige danske forklaringer.
- [x] Gør native tretimers-mellemtimer tydelige uden at opfinde rå retning, forskel, klassifikation eller ny måling.
- [x] Lås profilprojektion, zoneaggregering, UI-markører og produktionspipeline med målrettede regressionstests.
- [x] Dokumentér DEC-0077 og opdatér roadmap, issues, changelog samt begge håndbøger.
- [x] Sæt og kontrollér releaseversion 4.0.281; særskilt diff viser, at de beskyttede geodatafiler kun ændrer topversionsfelt 4.0.280 → 4.0.281.
- [x] Bestå PR #150/exact-head, merge `1308a07d`, fuld produktionskæde `32899040618` og offentlig 4.0.281-kontrol.
- [x] Bevis 1.314 komplette diagnostiske modevisninger for 657 hukommelsesklare kyststrækninger, 673 accepterede statefortsættelser og nul reset.
- [x] Bestå browserkontrol af 420 aktuelle visninger, 2.100 prognosevisninger og 673 kystdelsreferencer uden fejl; de 16 umodne dele er ærligt lokalt utilgængelige uden legacyfallback.

Candidate G 20/50/30, scorekurver, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er uændrede.

## Produktionsverificeret 4.0.280 – ret orientering og layout for familiebillede

- [x] Afgræns fejlen til en billedkonvertering, som ignorerede EXIF-orientering; ingen score-, zone- eller geodatafejl er involveret.
- [x] Bevar kildebilledet urørt og indarbejd korrekt portrætretning fysisk i tre komprimerede JPEG-varianter.
- [x] Tilpas pc-layoutet til opret billede ved siden af tekst og mobillayoutet til opret billede over tekst uden vandret rulning.
- [x] Opdatér HTML, service-worker og målrettet test til kun at bruge de nye varianter og kontrollere deres faktiske dimensioner.
- [x] Kontrollér siden visuelt ved 1440 × 1000 og 390 × 844 pixel.
- [x] Sæt version 4.0.280; særskilt diff skal vise, at de to beskyttede geodatafiler kun ændrer topversionsfelt 4.0.279 → 4.0.280.
- [x] Bestå exact-head-kildegate og merge PR #149 som `42b7058f`; ejeren har derefter kontrolleret den offentlige side på både mobil og pc og bekræftet korrekt orientering og layout.

Candidate G, RavScore, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte.

## Produktionsverificeret 4.0.279 – offentlig Om RavRadar-side

- [x] Tilføj offentlig side med ejer, formål, scorekontekst, kompleksitet, kontakt og frivillig støtte.
- [x] Placér linket i den primære topmenu.
- [x] Vis MobilePay Box `4214MX`, synlig betalingsadresse og klikbar QR-kode til samme godkendte mål.
- [x] Komprimér de to ejerbilleder til responsive WebP-varianter uden at ændre originalerne.
- [x] Implementér særskilt pc- og mobiltilpasning med enspaltet smal visning og uden vandret rulning.
- [x] Medtag siden og lokale aktiver i service-workerens appskal.
- [x] Tilføj målrettet kontrakttest for tekst, links, billeder, navigation og responsive brudpunkter.
- [x] Dokumentér DEC-0076, aktive krav, roadmap, current truth, issues og begge håndbøger.
- [x] Sæt 4.0.279; særskilt diff viser kun topversionsfelt 4.0.278 → 4.0.279 i de to beskyttede geodatafiler.
- [x] Bestå PR #148, merge som `12db45a8`, fuld produktion `32881278351` og offentlig kontrol. Den fundne EXIF-orienteringsfejl følges op i 4.0.280.

Candidate G, RavScore, vejrruntime, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er urørte. Ejeren har stående godkendt fremtidige rene versionsfeltsynkroniseringer, når den samme særskilte diffkontrol består.

## Produktionsverificeret 4.0.278

## Produktionsverificeret 4.0.278 – retire aktivt Regelværksted og ret zonestatus

- [x] Bevis, at Regelværkstedets test og publicering ikke kunne validere den aktive Candidate G-tilstandsmotor og dens bindende invariants.
- [x] Fjern Regelværksted og Vidensbase fra den aktive adminnavigation samt de tre regelrettigheder fra rollemodellen.
- [x] Fjern offentlig indlæsning og workflow-generering af `rules/admin-active-rules.json`.
- [x] Bevar historiske centrale og lokale regelkladder urørt som arbejdshistorik uden offentlig scoreeffekt.
- [x] Gennemgå hele ekspert-håndbogen mod faktisk kodeadfærd og beskriv Candidate G 20/50/30, 48-timers state, lokal fail-closed og versionsstyret scoreændring korrekt.
- [x] Tilføj kilde- og releasekontrakter, som afviser genindførsel af det aktive Regelværksted eller den offentlige regelfil.
- [x] Hold det pensionerede browserværksted, regelmotoren, regeltjenesten og regelfilerne ude af Pages-artifactet, men bevar forskningskilderne i repositoryet.
- [x] Synkronisér håndbogens statiske installationskopi, kør målrettede tests og RDKS-validering.
- [x] Kontrollér, at både den aktuelle liste og 5-dages prognosen bruger den valgte jagtform, og lås begge veje med en målrettet regressionstest.
- [x] Sæt version 4.0.278 og verificér, at de to beskyttede geodatafiler kun ændrer versionsfelt fra 4.0.277.
- [x] Bestå PR #143 exact-head-kildegate og merge som `d627b5ee`.
- [x] Lad første produktion `32837294743` stoppe fail-closed før release/deploy på en forældet test, som krævede Regelværkstedets gamle gemmevej.
- [x] Vend testkontrakten, så den pensionerede gemmevej nu skal være fraværende.
- [x] Bestå PR #144 exact-head-kildegate og merge som `fdf6e82c`.
- [x] Lad produktion `32839004087` stoppe fail-closed før release/deploy på de sidste forældede krav til Regelværkstedets adminfane og centrale regeldokumenter.
- [x] Opdatér helhedstesten til alle 13 aktive adminfaner, det skrivebeskyttede kalibreringsgrundlag og de tre aktive centrale konfigurationsdokumenter.
- [x] Bestå PR #145, merge som `11478de3` og udgiv 4.0.278 gennem grøn produktion `32840785390`.
- [x] Afgræns efterkontrollens falske 0/210-status til manglende `available: true` på vellykkede zoneresultater; bekræft samtidig 205 gyldige aktuelle zonescorer og fem reelt lokale historikhuller.
- [x] Flyt dækningsgaten fra alle fremtidige prognoserækker til den fælles aktuelle reference, så et senere lokalt hul ikke gør current-status falsk negativ.
- [x] Kontrollér med offentlig runtime, at aktuel liste og alle fem prognosedage bruger særskilte strand-/wadersværdier; tilføj målrettet regression for begge rangeringer.
- [x] Bevar version 4.0.278 uden yderligere ændring af de beskyttede geodatafiler.
- [x] Luk statusrettelsen gennem PR #146 exact-head `32844951668`, merge `8facd2d8`, fuld produktion `32845130587` og offentlig efterkontrol.

Den offentlige efterkontrol viser 205/210 aktive zoner, fem lokalt utilgængelige zoner, 657/673 READY-kyststrækninger, 16 lokale `WINDOW_INCOMPLETE`-forløb og 673 accepterede statefortsættelser uden reset. Candidate G 20/50/30 er eneste offentlige profil. Aktuel liste og alle fem prognosedage bruger særskilte strand-/wadersscorer; tre prognosedage har også forskellig top-5-rækkefølge. De offentlige versionsfelter er fortsat 4.0.278. Ingen scoreformel, zone, geometri, land-/vandpunkt eller central adminpost ændres af rettelsen. Se DEC-0075.

## Implementeret og målrettet verificeret

- [x] Afgræns rodårsagen til fremtidstælling i current-readiness og falske null-mellemtimer i Candidate G-state for otte native tretimersproxyer.
- [x] Gør strømudvælgelsen årsagstro: kun eksakt målreference eller en ældre tilladt regionalproxyreference må anvendes.
- [x] Fasthold kun afledt transporttilstand i højst tre timer og tilføj ingen bevægelse, evidens, U/V, hastighed, retning eller pil.
- [x] Integrér den faktiske tidsafstand ved næste ægte native prøve og stop lokalt efter mere end tre timer.
- [x] Bevar eksisterende verificeret state og filtrér kun gamle syntetiske null-markører for den tilladte regionalproxyklasse.
- [x] Bestå målrettede pipeline-, readiness-, fremtidstid-, profil-, continuation-, public-shadow-, central-runtime- og brugerfladekontrakter.
- [x] Dokumentér beslutningen i DEC-0074, aktive krav, current truth, roadmap, known issues, håndbøger og changelog.
- [x] Sæt version 4.0.277 og verificér, at geodatafilerne kun ændrer versionsfelt.

## Produktionslukning

- [x] Bestå RDKS- og kildegaten på PR #140's eksakte head i `32816129342` på `35c8b7fb`.
- [x] Merge den eksakte grønne head som `d3b4542f`.
- [x] Lad første produktion `32816237198` bygge strømhistorik, vejr og offentlig runtime grønt og stoppe før deploy på en forældet statisk testkontrakt.
- [x] Ret kun `test-current-full-coverage-gate`, så den kræver den faktiske 673-dækning: eksakte dele plus dokumenterede native-cadence-tilstande.
- [x] Bestå PR #141 exact-head `32817501003` på `128c71ce` og merge som `81e9b891`.
- [x] Bestå frisk central produktion `32817626537`, fuld validering, releasegate, artifact og Pages-deploy.
- [x] Kontrollér dataminimeret live: 673/673 udgivne Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik.
- [x] Bekræft Candidate G 20/50/30 som eneste profil med `rollbackProfileId: null` og `legacyPublicFallbackAllowed: false`.

Ved slutkontrollen var 0/210 zoner aktive, fordi den længste lokale kæde var 45 timer. Overvågningen følger kun den naturlige passage af 48 timer; der bygges ingen kunstig historik og kræves ingen ny 48-timers udviklingstest.

Ingen Candidate G-regel, vejrregel, zone, geometri, land-/vandpunkt eller central admin-data ændres i 4.0.277.

# Historisk produktionsverificeret implementeringsstatus – 4.0.276 punktvis strømhistorik

## Implementeret og målrettet verificeret

- [x] Afgræns cacheidentiteten til hvert faktisk bevaret kystpunkt frem for én skiftende indsamlingsgruppe.
- [x] Send den fulde centrale identitetsliste med hver opdatering og validér den valgte delmængdes eksakte fingeraftryk.
- [x] Erstat ved genindsamling kun samme times valgte punkter; bevar uændrede søsterpunkter.
- [x] Fjern ved punktflytning kun det konkrete punkts ældre historik og genopbyg timens samlingsbevis fra de bevarede identiteter.
- [x] Afvis dubletter, ukendte punkter og identitetsmismatch fail-closed.
- [x] Bevar Candidate G-only 20/50/30, lokal utilgængelighed og forbuddet mod rekonstruktion, interpolation og legacyfallback.
- [x] Bestå målrettede cache-, retention-, DMI-først- og Candidate G-kadencetests.
- [x] Dokumentér beslutning og faktisk statefund i DEC-0073, current truth, roadmap, known issues, masterlog og changelog.

## Produktionslukning

- [x] Sæt version 4.0.276 og verificér, at geodatafilerne kun ændrer versionsfelt.
- [x] Bestå RDKS- og kildegaten på PR'ens eksakte head i `32787344926` på `acb59cc6`.
- [x] Merge den eksakte grønne head som `72913723` og bestå frisk central produktion `32787715986`, fuld validering, releasegate, artifact og Pages-deploy.
- [x] Kontrollér den levende Candidate G-only-runtime efter de naturlige produktioner `32788514636` og `32790639192`: 673/673 states accepteret, nul resets og 6–39 timers lokal fortsættelse uden rå strømvektorer, koordinater eller private payloads.

Ingen Candidate G-regel, vejrregel, zone, geometri eller land-/vandpunkt ændres i 4.0.276.

Den tekniske retention er lukket. Et flyttet punkt modner sin egen kæde, mens uændrede punkter beholder deres historik. 48-timerskravet opfyldes herefter af naturlig drift pr. datagrundlag og er ikke en ny udviklingstest.

# Historisk produktionsverificeret implementeringsstatus – 4.0.275 Candidate G-only

## Implementeret og målrettet verificeret

- [x] Fjern den offentlige 25/40/35-reserve og gør Candidate G 20/50/30 til eneste mulige offentlige profil.
- [x] Afvis legacyfallback, rollbackprofil og ugyldig profilkonfiguration fail-closed.
- [x] Lad manglende Candidate G-grundlag gøre kun den konkrete zone/søgemåde/tid utilgængelig.
- [x] Forbyd parent-, nabo-, anden-time- og legacyscore som erstatning.
- [x] Udelad utilgængelige scorer fra aktuelle og femdøgns-rangeringer, mens andre zoner fortsætter.
- [x] Tilføj en dataminimeret `scoreAvailability`-oversigt til offentlig runtime.
- [x] Tilføj adminfelt med samlet aktiv status og liste over berørte zoner, søgemåder og årsager.
- [x] Opdatér målrettede profil-, pipeline-, lands-, UI- og shadowtests.
- [x] Sæt version 4.0.273; geodatafilerne har kun versionsfelt 4.0.272 → 4.0.273.
- [x] Dokumentér beslutningen i DEC-0072, RDKS, roadmap, håndbog og changelog.
- [x] Bestå PR #134 exact-head-kildegaten og merge som `10fd9896`.
- [x] Lad mergeproduktionen `32772470050` stoppe før deploy, da central legacykonfiguration forsøgte at genindføre rollback.
- [x] Ret central hydrering, så en gyldig lokal Candidate G-only-kontrakt vinder over enhver legacykonfiguration uanset legacyversionsnummer.
- [x] Validér Candidate G-only før central persistence og efter readback.
- [x] Fjern de sidste offentlige legacyberegningsveje fra forside, zonepanel og Rav-assistent.
- [x] Udvid releasegaten, så central legacy og offentlige legacyimports ikke kan genindføres ubemærket.
- [x] Sæt version 4.0.274; geodatafilerne har kun versionsfelt 4.0.273 → 4.0.274.
- [x] Bestå PR #135 exact-head-kildegaten `32775343561` og merge som `3a96c28d`.
- [x] Bevis i produktion `32775444781`, at central Candidate G-only-hydrering og den hurtige kildegate består.
- [x] Afgræns næste sikre stop til reel drift mellem repositoryets webhåndbog og Supabase-installationskopi; central ekspertdata var ikke indlæst i det fejlede trin.
- [x] Synkronisér installationskopien med 4.0.275-webhåndbogen.
- [x] Bevar den strenge identitetskontrol i den fulde produktionsvalidering.
- [x] Føj samme identitetskontrol til exact-head `validate:source`, så drift opdages før merge og dyr vejrbygning.
- [x] Sæt version 4.0.275; geodatafilerne har kun versionsfelt 4.0.274 → 4.0.275.

## Produktionslukning

- [x] Bestå 4.0.275 exact-head-kildegaten `32778118765` på `8103143c`.
- [x] Merge den eksakte grønne head som `59ea4546`.
- [x] Bestå frisk central 210/673-produktion `32778269487`, fuld validering, releasegate, artifact og Pages-deploy.
- [x] Kontrollér live `rr-20260824211701-210`: Candidate G er eneste profil, rollback er `null`, og legacyfallback er forbudt.
- [x] Kontrollér lokal fail-closed availability og adminstatus. Ved kontrollen var 0/210 zoner aktive på grund af ufuldstændig sammenhængende 48-timers strømhistorik; ingen gammel eller opdigtet score blev vist.

Ingen Candidate G-regel, vejrregel, zone, geometri eller land-/vandpunkt blev ændret i 4.0.275. 4.0.273 og 4.0.274 nåede ikke produktion.

# Historisk implementeringsstatus – 4.0.272 Candidate G-tilstandsrecovery

## Produktionsverificeret

- [x] Rodårsag afgrænset til ikke-fatal atomisk hydreringstimeout efterfulgt af global `NO_PREVIOUS_STATE`.
- [x] Sidste grønne og fejlramte 210/673-artifact sammenlignet dataminimeret.
- [x] Hydrering gjort fail-closed ved timeout, hentefejl eller mismatch.
- [x] Profilgaten afviser global nulstart og accepterer kun lille lokal kontekstreset.
- [x] Engangs state-only recovery med uforanderlig kilde, 673 del-ID'er, integritetskontrol og afgrænset genkendelse af den dokumenterede nulstillede fortsættelseslinje implementeret.
- [x] Separat efterfølgende mangel på én kystdel efter ejerens punktflytning afgrænset uden parent-/nabofallback.
- [x] Version 4.0.272 sat; geodatafilerne har kun fået versionsfelt 4.0.271 → 4.0.272.
- [x] Målrettede tests, RDKS og PR #131 exact-head-kildegate.
- [x] PR #131 merged som `1bbb4cc2`; produktion `32759180937` beviste den afgrænsede state-only recovery, men stoppede senere på en ældre tekstlig hydrator-kontrakt.
- [x] Kompatibilitetsindgangen `active_zone_ids()` genetableret uden ændring af hydreringens eller scorens adfærd.
- [x] PR #132 merged som `392fea15`; produktion `32761751284` bestod central hydrering, frisk vejr/state, fuld validering, releasegate og Pages-deploy.
- [x] Live `rr-20260824183620-210` kontrolleret på 210/673 og version 4.0.272; offentlig top-5 varierer 76, 74, 72, 72, 71, og femdøgnslisten sorterer 86, 84, 83, 76, 76.
- [x] Engangsrecoveryen er logisk inaktiv efter genindsættelsen af før-historik.
- [ ] Overvåg de otte separate aktuelle missing-evidence-huller, som også fandtes før nulstillingen; Candidate G må først vises igen, når den eksisterende fail-closed gate er opfyldt naturligt.

Ingen scoreformel, Candidate G-vægt, vejrregel, zone, geometri eller land-/vandpunkt ændres.

# Implementeringsstatus – 4.0.271 offentlig grundbog

## Produktionsverificeret 4.0.271 – offentlig grundbog

- [x] Samlet public copy- og illustrationsrettelse implementeret.
- [x] Eksperthåndbog, struktureret håndbog, SQL-payload, RDKS, forskningsnotat og changelog opdateret.
- [x] Målrettet kontrakttest udvidet til de rettede formuleringer.
- [x] PR #128's eksakte head `f2026167` bestod kildegaten i `32742727246` og blev merged som `a723ae8c`.
- [x] Den første produktion `32743307402` stoppede korrekt før deploy ved manglende læsehjælp.
- [x] Hotfix-PR #129 bestod exact-head `32745213320` på `5096d9aa` og blev merged som `499861e8`.
- [x] Produktion `32745389504` bestod central hydrering, fuld validering, releasegate og Pages-deploy.
- [x] Den offentlige `learn.html` og version 4.0.271 er målrettet kontrolleret.

## Afsluttet

- [x] PR #126 blev merged som `fda934ae`. Den eksakte mergeproduktion `32730674577` (#3522) bestod hele kæden og udgav Pages-artifact `9521472172` samt supportartifact `RavRadar-support-3522` (`9521463897`).
- [x] Kontrollér en ny naturlig 210/673-produktionskørsel, prognoselængde, reelle tidsintervaller, fallback og vandstandsdiagnostik uden private payloads.
- [x] Kontrollér Supabase Free-planens aktuelle forbrug og tidligere egress-overskridelse.
- [x] Gennemgå administratorens og ekspertens håndbog, rettigheder, centrale dokumenter og målrettede funktionstest.
- [x] Ret den falske første adminfejl for `coastline-overrides`.
- [x] Bevar DEC-0049's lotterikorrektion, og vis den samme afrundede områdescore, som område- og femdøgnslisterne sorterer efter.
- [x] Ret forældede og modstridende Candidate G-afsnit, kodekapitel, scenarier, hypoteseregister og ekspertarbejdsplan i begge håndbøger.
- [x] Ret releasegaten, så den kontrollerer aktiv Candidate G særskilt fra 25/40/35-rollback i stedet for at kræve gamle håndbogstekster.
- [x] Synkronisér hele webhåndbogen til Supabase-installationsfilen ved versionsskift.
- [x] Trevejsflet officielle håndbogsopdateringer med centralt godkendte ekspertændringer ved deploy; stop sikkert ved ukendt afvigelse uden baseline.
- [x] Dokumentér ændringen i beslutning, researchnotat, roadmap, kendte forhold, handoff og changelog.
- [x] Bestå PR #122 exact-head `32721778498` på `a885bc5b` og merge den eksakte head som `abe10127`.
- [x] Lad produktion `32721891349` stoppe sikkert før deploy, da den fandt en centralt ændret håndbog uden en lagret første kildebaseline.
- [x] Bestå PR #123 exact-head `32724526697`, merge som `00f59456`, og lad produktion `32724616331` stoppe sikkert før deploy, da Pages ikke indeholder håndbogens kildefil.
- [x] Bestå PR #124 exact-head `32726897134`, merge som `fd7bc868`, og lad produktion `32727025187` stoppe sikkert ved hashafvigelsen efter alle øvrige gates.
- [x] Afgræns første migrering til den sidste centralt synkroniserede 4.0.269-kilde på uforanderlig commit `fc13fb5ab326d8824ca55235ac454ac230e3db3e` fra grøn produktion `32706573863`, med obligatorisk SHA-256-match mod det tidligere beskyttede manifest.

## Produktionslukning

- [x] Bestå PR #125 exact-head `32728525467` på `3fe579ab` og merge som `7861079b`.
- [x] Bestå produktion `32728654553` med beskyttet `source-update`, aktiv Candidate G-readback, fuld validering, releasegate, supportartifact og Pages.
- [x] Kontrollér live 4.0.270, begge offentlige ranglister, adminoversigten og eksperthåndbogen.
- [x] Ret den aktive browseraudits forældede label i PR #126 og bestå exact-head `32730584569` på `01853d21`.
- [x] Bestå fuld liveaudit: 210 zoner, 673 kystdele, 420 aktuelle og 2.100 femdøgnsvisninger; nul kontrol-, konsol-, side- eller HTTP-fejl.
- [x] Bevar score, vejr, Supabase-kontrakt, geometri og land-/vandpunkter uændret.

# Produktionsverificeret implementeringsstatus – 4.0.269 aktuelle scoreforklaringer

## Afsluttet leverance

- [x] Gør alle tre *Hvorfor denne score?*-forklaringer afhængige af den valgte rækkes faktiske offentlige forhold og relevante state.
- [x] Forklar bølgernes rolle i mobilisering og adskil den fra vindens indirekte virkning og strømmens transport.
- [x] Ret lavt-og-stigende-vand-teksten, så det lave niveau ikke fremstilles som indtransporthjælp.
- [x] Skjul offentlig Fundprognose, scoreloftsfelt og rå samlet score-JSON uden at slette data-, lærings- eller scorelogik.
- [x] Skjul det tomme kortvalgsfelt og bevar områdevalget.
- [x] Opdatér offentlige kilder og licenser til den aktive vejr-, hav- og kortkæde.
- [x] Bevar Candidate G 20/50/30, global reserve, scoretal, vejrkontrakt, Supabase, geometri og land-/vandpunkter.
- [x] Lås ændringen i målrettede tests og versionsbind 4.0.269; de to geodatafiler har kun versionsfeltdiff.
- [x] Bestå PR #120 exact-head `32703138969` på `37de330c` og merge den eksakte head som `d745e0ba`.
- [x] Bestå frisk central produktion `32703271897` med fuld validering, releasegate, artifact og Pages; live `rr-20260824080543-210` er 4.0.269 på 210/673.
- [x] Bestå fuld offentlig browserkontrol på 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl.
- [x] Luk RDKS, roadmap, begge håndbøger og changelog med de eksakte beviser.

Se DEC-0068 og `docs/research/PUBLIC_SCORE_EXPLANATION_REVIEW_4.0.269.md`.

# Produktionsverificeret implementeringsstatus – 4.0.268 offentlig grundbog og almindeligt dansk

## Afsluttet leverance

- [x] Tilføj en offentlig **Grundbog i ravjagt** med ravets egenskaber, hav, kyst, felttegn, jagtmetoder, hændelsesforløb, RavRadar-forklaring, kilder og ordliste.
- [x] Placér den praktiske og faglige ravjagt før RavRadar og RavScore.
- [x] Forklar bølger, strøm, vind, vandstand, revler, render, langs-/tværtransport, strand, vandkant, waders og UV uden en falsk universel retningsregel.
- [x] Gennemgå normal offentlig ordlyd i forside, scorepanel, Rav-assistent, konto, login, tur og fejl.
- [x] Tilføj målrettede kontrakttests og releasegate for faglig rækkefølge, emner, aktiv model, mobilopsætning og fravær af internt standardsprog.
- [x] Kontrollér desktop og 390 px mobil lokalt uden vandret overløb.
- [x] Bestå PR #116 exact-head `32670857438` på source-head `c810155b` og merge som `5a2f7796`.
- [x] Lad første produktion `32670920742` stoppe før deploy på den forældede ordrette rangeringstest; bevar den nye almindelige forklaring, ret testen og føj den til `validate:source`.
- [x] Bestå PR #117 exact-head `32671863965`, merge `21acb0a2` og bekræft i produktion `32671924885`, at rangeringstesten nu passerer.
- [x] Lad samme produktion stoppe før deploy på den næste forældede ordrette test; ret stateforklaringstesten til **De seneste timers betydning** og føj den til `validate:source`.
- [x] Kør 29 direkte læsere af de ændrede offentlige moduler målrettet; gør den historiske 4.0.240-sikkerhedstest til en kompatibel indgang til den gældende 4.0.268-kontrakt. Hele gruppen er grøn.
- [x] Bestå PR #118 exact-head `32672522334` på `8faccce3` og merge den eksakte head som `3c22e40b`.
- [x] Bestå frisk produktion `32672578127` med central hydrering, DMI/Copernicus, frisk vejr, fuld validering, releasegate, artifacts og Pages.
- [x] Kontrollér live `rr-20260823230848-210` som version 4.0.268 på 210 zoner og 673 kystdele.
- [x] Bestå offentlig browseraudit på 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden kontrol-, konsol-, side- eller HTTP-fejl.
- [x] Opdatér RDKS, roadmap, håndbøger, changelog og permanent handoff med eksakte commits og kørsler.

Score, Candidate G, `20/50/30`, vejrdata, Supabase-kontrakt, geometri og land-/vandpunkter er uændrede. Se DEC-0067.

# Produktionsverificeret implementeringsstatus – komplet uploadskema i 4.0.267

- [x] Bekræft aggregeret, at ingen af de to manuelle ture nåede databasen; læs ingen privat payload.
- [x] Sammenhold den manuelle uploads fulde feltliste med den aktive tabel og find præcis `forecast_target_at` og `report_accuracy` som manglende.
- [x] Tilføj begge felter centralt med databevarende SQL og genindlæs PostgREST-schemaet.
- [x] Bekræft særskilt, at **Start ravtur → Slut ravtur** ikke bruger de to skemafelter, men rammes af den fælles `gps=null`-klientfejl før lagring.
- [x] Ret privatlivskontrollen, så kun `null` accepteres for lokationsnøgler, mens faktiske GPS-/positions-/rutedata fortsat afvises.
- [x] Versionsstyr migration, regression, RDKS, håndbogsmetadata og changelog som 4.0.267.
- [x] Bestå PR #115 exact-head `32664463654`, merge `43ceffc1` og frisk 4.0.267-produktion `32664525128`.
- [x] Indberet én ny ejerprøve efter udgivelsen og bekræft, at den sendes og vises i **Mine ture og fund**. De to tidligere forsøg nåede ikke outboxen.

# Implementeringsstatus – produktionslogin og privat turlog i 4.0.266

## Produktionsverificeret leverance

- [x] Reproducer magic-link-fejlen og fastslå, at Supabases Site URL var localhost og redirect-listen tom.
- [x] Sæt central Site URL og tilladt redirect til den aktuelle GitHub Pages-origin.
- [x] Afgræns turlogfejlen med nul-rækkers requests: kun `data_quality_flags` manglede i det faste feltudvalg.
- [x] Verificér i policyoversigten, at den aktive tabel manglede SELECT-policyen for egne ture.
- [x] Anvend den databevarende migration centralt og verificér HTTP 200 med `limit=0` samt **users can read own observations / SELECT / authenticated**.
- [x] Versionsstyr migrationen, tabelgrantet, almindelig fejltekst og regressionstesten i repositoryet.
- [x] Dokumentér den bindende auth-ændring ved senere flytning til `ravradar.dk`.
- [x] Bestå målrettede konto-, efterregistrerings-, auth- og syntakstests lokalt.
- [x] Bestå versions-/RDKS-kontroller og én exact-head `validate:source` i PR #113, kørsel `32662085932`, head `bd3b4984`.
- [x] Merge den eksakte head som `db4db876` og verificér produktionskørsel `32662155582` med frisk vejr, fuld validering, releasegate, artifact og Pages.
- [x] Gennemfør et nyt interaktivt magic link til den rene produktionsadresse og verificér, at **Mine ture og fund** kan læses uden fejl; det tidligere viste token er ikke brugt.
- [ ] Genindlæs ejerens oprindelige Chrome-fane og bekræft, at dens lokale afventende efterregistrering eftersendes og derefter vises i **Mine ture og fund**. Codex-browseren har en anden lokal outbox og kan derfor ikke udføre dette sidste trin.

Ingen eksisterende observationer, score, Candidate G, vejrdata, geometri eller land-/vandpunkter er ændret. Se DEC-0065.

# Historisk implementeringsstatus – fleksibel kontoindberetning i 4.0.265

## Produktionsverificeret

- [x] Tilføj **Indberet tur eller fund** under en indlogget konto.
- [x] Genbrug samme rapportspørgsmål og samme `observations`-tabel uden ny databaseændring eller dobbeltlagring.
- [x] Gem brugerens valgte starttid, afledte sluttid og midtpunkt; knyt aldrig nutidens vejr til en historisk indberetning.
- [x] Markér efterregistreringen `calibration_eligible=false`, når et sikkert historisk snapshot ikke kan rekonstrueres.
- [x] Genbrug zone→kyststrækning og afvis kombinationer på tværs af zoner.
- [x] Tilføj bekræftet **Afslut uden at indberette** med nul observations-/outbox-/serverposter; bevar **Svar senere**.
- [x] Vis klokkeslæt og mærk efterregistrering i brugerens eksisterende private turlog.
- [x] Bestå de målrettede kontrakt-, observation-, turlog- og syntakskontroller.
- [x] Opdatér version, RDKS, håndbog og changelog og bestå nødvendige målrettede versions-/dokumentationskontroller.
- [x] Bestå én fuld `validate:source` på PR #111's eksakte head `32658661075`, merge som `cb7d2232` og produktionsverificér via `32658724861` og live `rr-20260823184330-210`.
- [x] Første exact-head `32658093582` stoppede sikkert før merge på Candidate G-omskifterens efterladte 4.0.264-versionsmærke. Ret mærket til 4.0.265 og gør versionsværktøjet ansvarligt for både profildokument og kodekontrakt uden at ændre aktiv profil eller scorelogik.
- [x] Anden exact-head `32658348688` bekræftede versionsrettelsen og alle nye kontoindberetningskontrakter, men stoppede på to manglende, allerede vedtagne forklaringssætninger i webhåndbogen. Synkronisér dem uden kode- eller scoreændring.
- [x] Tredje exact-head `32658502017` bestod alle kildekontrakter og stoppede først i releasegaten, fordi `CHANGELOG-4.0.265.md` manglede. Tilføj den versionsspecifikke releaseoversigt uden produktændring.

Ingen score, Candidate G, vejrdata, geometri eller land-/vandpunkter er ændret. En rigtig autentificeret indsendelse kræver senere en bevidst ejerprøve, fordi den opretter en virkelig Supabase-række.

# Historisk implementeringsstatus – brugerflow og privat turlog i 4.0.264

## Afsluttet 4.0.264-leverance

- [x] Fjern den gamle GPS-baserede parallelrejse fra den aktive turknap og brug den komplette v2-rejse direkte.
- [x] Vis gamle og nye egne ture under **Mine ture og fund** via den eksisterende `observations`-tabel og RLS.
- [x] Undgå dobbeltlagring i Supabase; læs først ved klik, højst 100 rækker og kun nødvendige felter.
- [x] Forklar magic link og hydrér bruger-id efter Supabase-callback.
- [x] Forenkle centrale offentlige RavScore- og turord uden at ændre scoreberegningen.
- [x] Tilføj målrettede tests for samme tabel, RLS, dataminimering, legacyrækker, direkte v2 og login-callback.
- [x] Tilføj den eksakte rodhåndbog til docs-only-skip og opdatér workflowtesten.
- [x] Versionsløft, RDKS-/håndbogs-/changeloglukning og samlet lokal source-/releasegate.
- [x] Bestå PR #104 exact-head `32651048627` og merge den som `579bd167`.
- [x] Afvis første produktionsforsøg `32651106811` før release, fordi den gamle `test-feedback-zone-ui` stadig krævede den fjernede GPS-parallelrejse; ret testen til at kræve direkte v2 og føj den til `validate:source`.
- [x] Bestå PR #105 exact-head `32651724416` og merge som `7c43146f`; afvis produktion `32651786366` før deploy på den næste forældede ordrette teksttest.
- [x] Ret stjerneforklaringens test og den lokalt fundne gamle mobil-turtest, og føj begge til `validate:source`.
- [x] Bestå PR #106 exact-head `32652894729`, merge `23fa89ed` og produktion `32652970105`; live 4.0.264 er 210/673.
- [x] Browserkontrollér konto-/loginforklaring, direkte tur uden GPS/rute og den fulde 420/2.100/673-visning uden fejl efter korrektion af auditlabelen.
- [x] Merge auditlabelrettelsen via PR #107/exact-head `32654048944` og produktion `32654119745`; live dataset er `rr-20260823171804-210`.
- [ ] En rigtig magic-link-mail, autentificeret turliste og kontoejet tur kræver senere ejerens interaktive loginprøve.
- [x] Separat ren dokumentations-PR #108/exact-head `32654780774`, merge `98621bf9`, med 0 oprettede push-produktionskørsler.

4.0.264 er nu produktionsverificeret sandhed. De følgende Candidate G-afsnit er revisionssporet for den nuværende scoremotor.

## P0-opfølgning efter 4.0.262-produktionen

- [x] Bestå PR #100 exact-head `32642456123`, merge `586fbd184f68c6445acfb38a39814f6348f14bd0` og fuld produktion `32642532892` med central hydrering, frisk state, `validate`, releasegate, Supabase og Pages.
- [x] Bevis i live `rr-20260823134605-210`, at cadence-replayet er rettet: 673/673 accepterede states, nul reset, nul replaymismatch, 110 positive og 563 fysisk fortsat nul.
- [x] Opdag, at profilen alligevel rullede tilbage til legacy, selv om alle 673 aktuelle referencer var `WINDOW_INCOMPLETE`; `candidateWarmupEligible` blev falsk på grund af senere prognosegaps.
- [x] Afgræns rodårsagen til, at memory-/warmup-gaten fejlagtigt gennemgik samtlige femdøgnsrækker i stedet for den aktuelle fælles zonereference.
- [x] Implementér DEC-0062: behold fuld Candidate G-scorecoverage for hele prognosen, men bind memory-/warmup-aktiveringen til den nærmeste fælles aktuelle referencetime pr. zone.
- [x] Bevar global rollback ved et gap på den aktuelle reference og lokal fail-closed stateadfærd efter senere prognosegaps.
- [x] Lås referencescopet som `CURRENT_COMMON_ZONE_REFERENCE` i profil, tests og public-shadow.
- [x] Bestå samlet lokal source-/RDKS-/releasekontrol og eksakt geodatadiff for 4.0.263.
- [x] Bestå PR #101/exact-head `32644701811`, merge `9f5953f6`, frisk produktion `32644772373`, aktiv shadow `32645569741` og browserkontrol for live `rr-20260823142247-210` på 210/673/420/2.100 uden fejl.

Den følgende 4.0.262-sektion er revisionshistorik. Cadencefejlen og den efterfølgende referencescopefejl er samlet produktionslukket i 4.0.263.

## P0-regression efter aktiveringslukningen

- [x] Konstatér read-only i live `rr-20260823121818-210`, at transportpotentiale og transportkomponent er 0 i 673/673 dele.
- [x] Afgræns årsagen: 658 dele har to beviser med tre timers afstand, mens `maximumGapHours=1`; suffixet bliver én prøve, og første prøves forløbstid er 0.
- [x] Fastslå, at `candidateCoverageReady=true` ikke opdager denne semantiske nultransport, og at memory ikke kan blive klar ved uændret cadence.
- [x] Vælg DEC-0061's native cadence-rettelse frem for rollback: maksimum tre timer, faktisk tidsintegration og ingen kunstige mellemtimer.
- [x] Begræns pre-public warmup til `WINDOW_INCOMPLETE`; afvis latest-missing, missing-evidence og time-gap globalt.
- [x] Tilføj `candidateWarmupEligible` og state-replayidentitet i den dataminimerede public shadow.
- [x] Bestå målrettede cadence-, state-, profil- og shadow-self-tests samt gammel-live-state-replay.
- [x] Bestå samlet lokal source-/RDKS-/releasekontrol og diffkontrol.
- [x] Bestå exact-head og fuld frisk produktion. Den dataminimerede efteraudit fandt DEC-0062's særskilte referencescopefejl, så aktiv shadow og browserlukning flyttes til 4.0.263.

## Ejer-godkendt pre-public opvarmningsaktivering

- [x] Registrér DEC-0060: Candidate G skal være gældende nu, mens den ikke-offentlige side opbygger sit første komplette 48-timersvindue.
- [x] Vælg `RESEARCH-3` med `20/50/30` og bevar alle faglige regler fra DEC-0054–0059 uændret.
- [x] Del den globale gate i beregnelig Candidate G-dækning og moden transporthukommelse; kræv fortsat fuld scoreprojektion, men tillad ufuldstændig memory kun med den eksakte ejer-godkendte pre-public-konfiguration.
- [x] Bevar global fail-closed legacy ved én manglende nødvendig kandidatscore; forbyd blanding mellem steder, timer og jagtformer.
- [x] Tilføj det private centrale dokument `ravscore-profile-selection`, sikker engangspromotion gennem central hydrering og byte-stabil central write/readback.
- [x] Bevar eksakt rollback til `RRS-CURRENT-B0-4.0.247`, slå automatisk aktivering fra og lås begge veje i målrettede tests.
- [x] Gør den aktive shadow i stand til at kontrollere Candidate G som gældende score under ærligt mærket `WINDOW_INCOMPLETE`-opvarmning.
- [x] Versionsløft til 4.0.261 uden geometriændring; kun versionsfelterne i de to geodatafiler må ændres.
- [x] Kør samlet lokal RDKS-/målrettet kildekontrol og releasegate.
- [x] Bestå exact-head `32636378576` på PR #97's præcise commit `41cdb897`.
- [x] Merge som `0f7a9d5f`, følg fuld produktion `32636433944` og verificér central profil-readback, live `rr-20260823112726-210`, manifest, aktiv Candidate G og global rollbackmetadata.
- [x] Kør aktiv dataminimeret shadow `32637833674` og fuld browserkontrol af live `rr-20260823114744-210`: 210/673, 420 aktuelle og 2.100 femdøgnsvisninger uden fejl.
- [x] Ret shadowens for snævre ikke-ready-statuskontrakt efter run `32637022498`; exact-head `32637339636`, PR #98/merge `fd69f8a0`, produktion `32637387600` og ny shadow `32637833674` er grønne. Runtime og score blev ikke ændret.

Den oprindelige aktiveringsleverance blev lukket af PR #97–99, men den efterfølgende P0-cadenceregression ovenfor genåbner scorevalideringen. Alle senere afsnit i denne fil er versionsbundet revisionshistorik. Uafkrydsede ældre punkter om den oprindelige aktiveringsrækkefølge er fortsat erstattet af DEC-0060; de erstatter ikke den nye P0.

# Tidligere checkpoint – Candidate G bounded transport-memory efter 4.0.260

## Afgrænset 48-timers transporthukommelse – offentlig score uændret

- [x] Erstat den ubundne maskinstart og anbefalingen om startprior 50 med DEC-0059's faste 48-timers vindue og faste randbetydning.
- [x] Persistér højst 49 dataminimerede kystrelative timebeviser; tillad kun `time` og afledt `strength`, og markér missing eksplicit.
- [x] Genafspil transporten uden at bruge persistéret transportpotentiale eller persistérede udtransporttimer som startinput.
- [x] Kræv præcis 48 timers sammenhængende evidens ved referencetimen for `transportMemoryReady=true`; missing og tidsgab holder den globale omskifter på legacy.
- [x] Versionsløft state til `2.0.0` og bind den nye `window48-boundary0`-profil til kystkontekstens hash.
- [x] Bevar `0,03→0,15 m/s`, +10/-8, 13-timers udtransportgate, 20/50/30, mobilisering 4/48, waders-loft og eksakt legacyrollback.
- [x] Lås 47/48 timer, startuafhængighed 0/50/100, fuldstyrkeloft, 12/13 timer, kort modstrøm, fornyet indtransport, same-time, split/ubrudt, changed-context, missing og raw-input-forbud i målrettede tests.
- [x] Genafspil eksisterende offentlig supplementhistorik read-only: 42.551 poster, 582 komplette 48-timersvinduer og nul startmismatch; ingen rå vektorer, koordinater, del-id'er eller private payloads i rapporten.
- [x] Bevar foreløbig Candidate G som `diagnostic-only` under naturlig opbygning; aktiv `25/40/35` må ikke ændres, og mekanisk accept kræver ingen 48-timers realtidsventetest.
- [x] Bestå samlet lokal `scripts/validate-source.ps1`, inklusive RDKS-validering, målrettede Candidate G-kontrakter og releasegate.
- [x] Bestå exact-head `32633533257` på `56824ab0`, merge PR #95 som `1d848724` og fuld post-merge-produktion `32633607166` med legacy aktiv og ny state fail-closed under opbygning.
- [x] Verificér live `rr-20260823102619-210`: manifestintegritet, 210 zoner, 673 dele, schema 2 på 673/673, ét første timebevis, 0/673 ready, 0 aktiverede Candidate G-dele og 0 raw-input-læk i state.
- [x] Erstattet af DEC-0060 for den første pre-public kobling. Aktiv 210/673-shadow `32637833674` er grøn; komplet naturlig memory følges kun som driftsevidens og er ikke en ny aktiveringsgate.

## Historisk 4.0.260-checkpoint – versionsbundet profilvalg og offentlig 25/40/35 uændret

- [x] Dokumentér 6/6 timers naturligt videreført state på 673/673 kystdele uden nulstilling eller rekonstruktionsfejl; perioden er praktisk ejeraccepteret evidens, ikke et 48-timersbevis.
- [x] Implementér én versionsbundet profilomskifter med eksakte legacy-, Candidate G- og rollback-id'er.
- [x] Bevar `RRS-CURRENT-B0-4.0.247` som ønsket, aktiv og rollbackprofil i 4.0.260.
- [x] Kræv eksplicit aktivering, komplet global Candidate G-dækning, frisk slutshadow-id og særskilt ejerbeslutnings-id før et fremtidigt kandidatskift.
- [x] Fald globalt tilbage til legacy ved manglende/ukendt konfiguration og forbyd blandede profiler mellem zoner, timer og jagtformer.
- [x] Før profilkontrakten gennem offentlig startpakke, detaljepakke og manifest.
- [x] Lås Candidate G-adapter, udtransportforklaring, forbud mod sikkerheds-/stedmodel og eksakt legacyrollback i målrettede tests.
- [x] Bestå samlet lokal `scripts/validate-source.ps1`, inklusive releasegate, på 4.0.260-kandidaten.
- [x] Bestå exact-head `32628441062` på `eabf7e8b`, merge PR #92 som `c5898ce8` og fuld post-merge-produktion `32628516066` med central hydrering, frisk data, fuld validering, releasegate, Supabase, artifact og Pages.
- [x] Kør frisk dataminimeret liveaudit af `rr-20260823083627-210`: 210/673/1.346, 673 accepterede tilstande, nul nulstillinger, nul rekonstruktionsfejl og 9/9 timers dokumenteret state-alder.
- [x] Kør fuld browserkontrol: 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden fejl.
- [x] Dokumentér den nye beslutningsevidens: Candidate G-gennemsnit 19,187/21,276 mod aktiv 35,770/43,655 for waders/strand og 1.127 scorebåndsskift; den unge tilstand har gennemsnitlig transport 4,242 og mobilisering 13,747.
- [x] Efterprøv bootstrap mod eksisterende offentlig historik uden nye kildedata: 42.551 poster, 633/673 dele og 65–117 timer ændrer ikke start-0-medianen fra 0; kun 6/633 dele bliver uafhængige af startprioren.
- [x] Afgør startreserven med ejeren: neutral prior 50 forkastes som ny vilkårlig maskinstart og erstattes af DEC-0059's afgrænsede evidensvindue. Faktisk 13-timers udtransport er fortsat den eneste vej til dokumenteret udtømt transport og totalscore 0.
- [x] Erstattet og afsluttet af DEC-0060 samt PR #97–99: central roundtrip, exact-head, produktion, aktiv shadow og browserbevis er grønne.

## Central tilstand og fallback-kompatibel shadow – score-neutral

- [x] Saml transport- og mobiliseringstilstanden i én versions- og kontekstbundet central kontrakt efter DEC-0057.
- [x] Persistér kun tilstanden ved kystdelens fælles aktuelle referencetime; fremtidige prognoser må ikke blive historisk startpunkt.
- [x] Lås opdelt/ubrudt identitet, same-time-hold, missing-hold og sikker nulstilling ved ændret model-/kystkontekst.
- [x] Bevis, at den kompakte tilstand ikke indeholder rå U/V, vejrinput, koordinater eller private replaydata.
- [x] Beregn Candidate G for begge jagtformer som separat `diagnostic-only`-runtime uden at ændre aktiv `25/40/35`.
- [x] Erstat den manuelle native-only aktiveringsshadow med en read-only audit af den faktiske fallback-kompatible 210/673-detaljeruntime.
- [x] Lås 1.346 modeevalueringer, score-rekonstruktion, udtransportforklaring, dataminimering og automatisk aktiveringsforbud i self-tests og kildegate.
- [x] Dokumentér 4.0.259-rollbacken: aktiv score ignorerede Candidate G-navnerummet. DEC-0058 erstatter nu denne med en særskilt versionsbundet omskifter og testet tilbagekobling.
- [x] Bestå samlet lokal `scripts/validate-source.ps1`, inklusive releasegate, for 4.0.259.
- [x] Bestå exact-head `32609888406` på `337466b5`, merge PR #89 som `31e50acb` og bevar den eksakte head under merge.
- [x] Bestå fuld post-merge-produktion `32609952992` med central admin, frisk fallback-kompatibel data, fuld validering, releasegate, Supabase, artifact og Pages.
- [x] Kør den nye manuelle 210/673-shadow som read-only run `32610281620` på den producerede 4.0.259-runtime: 210 zoner, 673 dele, 1.346 modeevalueringer og nul rekonstruktionsfejl. Alle 673 tilstande er korrekt bootstrap og ikke modnet.
- [x] Dokumentér første naturlige state-fortsættelse i schedule `32613284735`: live `rr-20260823023951-210` accepterer 673/673 tidligere tilstande, nulstiller 0 og består 210/673/1.346 med nul rekonstruktionsfejl. Dokumenteret yngste/ældste fortsættelsesalder er 3/3 timer.
- [x] Fortsæt nattens read-only observation til 6/6 timers dokumenteret naturlig state-alder. Ejeren accepterer dette som praktisk evidens; det er ikke en modnet 48-timersfordeling.
- [x] Forbered den særskilte, score-neutrale omskifter og brugerforklaring efter DEC-0058. Den historiske lukkede aktiveringsstatus er erstattet af DEC-0060 og produktionsverificeret i 4.0.261.

## Candidate G mobiliserings-/helhedsreview – score-neutralt

- [x] Erstat overlappende bølge-, vind-, strøm- og varighedspoint i mobilisering med én kausal bølgeenergitilstand.
- [x] Lås `Hs² × T` som relativ proxy uden at kalde den bundskærspænding eller direkte ravtransport.
- [x] Vælg fire timers opbygning og 48 timers aftrapning som anbefalet privat profil; behold 24/72 som følsomhedsgrænser.
- [x] Bevis syntetisk, at en udviklet moderat hændelse slår én høj spids, at 48 rolige timer halverer tilstanden, og at opdelt/ubrudt kørsel er identisk.
- [x] Bevis, at direkte vind, aktuel strøm, separat varighed og statisk stedegnethed ikke giver mobiliseringspoint.
- [x] Genafspil den eksisterende Git-ignorerede cache uden nye downloads: 1.460 evalueringer, ny mobilisering 73,348 mod 57,651 og samlet scoreændring +3,484 mod transportrevisionen.
- [x] Bevar DEC-0055's udtransportgate: en høj mobilisering kan forblive synlig, mens dokumenteret udtømt udtransport giver slutscore 0.
- [x] Dokumentér DEC-0056, beslutningsrapport, modelregister, RDKS, håndbog og changelog uden private payloads.
- [x] Bestå samlet lokal `scripts/validate-source.ps1`, inklusive de nye mobiliseringstests og releasegate.
- [x] Bestå exact-head `32607989444` på `03083f92`, merge PR #87 som `48240d73` og fuld post-merge-produktion `32608050112` med central hydrering, fuld validering, releasegate, Supabase, artifact, Pages og grøn 210/673-kontrakt.
- [x] Implementér samlet central persistens af transport- og mobiliseringstilstand samt fallback-kompatibel 673-deles shadowkontrakt i 4.0.259; exact-head, produktion, bootstrap-shadow og seks timers naturlig fortsættelse er leverancebevist. Frisk slutshadow på 4.0.260 udestår.

## Candidate G frigivelsesrevision – score-neutral

- [x] Lås den godkendte 0–13-timers udtransportkurve i en reproducerbar syntetisk audit.
- [x] Test halv styrke, deadband, neutral strøm, valgfri 24/48-timers halvering, missing-pause, bølge-only, landingsgrænse og waders-vindstop.
- [x] Kør auditten via `test:score` og `validate:source`.
- [x] Opdatér den nationale shadows aktiveringsgates og afvis de erstattede waders-/pil-/ekstremmarkører i kontrakttesten.
- [x] Dokumentér produktforklaring, automatisk aktiveringsforbud og rollback uden offentlig scoreændring.
- [x] Bestå exact-head `32602287607` på `74624ac3`, merge PR #82 som `189644a0` og fuld post-merge-produktion `32602328912`.
- [x] Verificér live `rr-20260822223539-210` som komplet 210/673 med samme datasæt-id i manifest, startdata og detaljedata.
- [x] Ejerbeslutning og score-neutral implementation: faktisk kraftig udtransport med udtømt transportpotentiale giver samlet Candidate G 0, mens de øvrige komponenter bevares synligt; start 0 uden faktisk udtransport udløser ikke reglen.
- [x] Bestå exact-head `32604792201` på `f6458f09`, merge PR #84 som `800a93cb`, fuld produktion `32604850884` og verificér live `rr-20260822232159-210` som komplet 210/673 uden offentlig Candidate G-aktivering.
- [x] Udpeg `0,03→0,15 m/s` uden passivt neutralt tab som anbefalet privat produktprior efter nyt `RESEARCH-2`-replay; det ændrer 213/1.460 scorebånd mod 377 for 0,02→0,12.
- [x] Implementér en score-neutral kompakt fortsættelsestilstand og bevis, at en opdelt pipelinekørsel reproducerer ubrudt potentiale, udtransporttimer og nul-gate eksakt.
- [x] Kobl den afledte tilstand gennem den centrale produktionspipeline og fallback-kompatible nationale shadow med score-neutral rollback i 4.0.259-kandidaten.
- [x] Luk coverage-, tærskel-, starttilstands-, validerings-, admin-/rollback- og ejer-go/no-go-gates gennem DEC-0055–0060 og PR #97–99.

## Docs-only skip – rod-CHANGELOG

- [x] Afgræns PR #78's uventede fulde produktion til den manglende eksakte `CHANGELOG.md`-linje i `paths-ignore`.
- [x] Bevar den eksisterende `CHANGELOG-*.md`-regel og tilføj kun `CHANGELOG.md`; ingen bred Markdown- eller docsundtagelse.
- [x] Udvid regressionstesten til at kræve begge mønstre og fortsat afvise `*.md`, `docs/**`, data, scripts, workflows og HTML.
- [x] Før workflowrettelsen gennem exact-head `32600654326`, merge `41f71900` og fuld produktion `32600714319`.
- [x] Bevis skip med PR #80/merge `1565e073`: GitHub viste 0 workflowkørsler på mergecommitten, og ingen ny push-produktion blev oprettet.

## Strømstyret transporthukommelse – score-neutralt forskningscheckpoint

- [x] Gør verificeret kystnormal strøm til transportpotentialets eneste opbygnings-/nedbrydningssignal.
- [x] Implementér ejerens fuldstyrkekurve med straks-tab på 8 point pr. effektiv udgående time og nul fra 13 timer.
- [x] Bevar REQ-STATE-003's cirka 10-timers opbygning som 10 point pr. effektiv indgående time.
- [x] Begræns bølger/hændelsestiming til en afhængig leveringskorrektion på højst 15 procent; bølger alene giver nul transport.
- [x] Genafspil 1.460 private evalueringer med reference- og følsomhedsgrænser samt en særskilt warm-start-kontrol.
- [x] Bevar `20/50/30`, DEC-0054's waders-kontrakt og offentlig `25/40/35` uændret.
- [x] Kør målrettede regime-, Candidate G-, scenarie-, analyse- og nationale shadow-self-tests.
- [x] Kør samlet RDKS-/håndbogsvalidering og fuld lokal `scripts/validate-source.ps1`, inklusive releasegate.
- [x] Bestå exact-head-kildegate `32598284279` på `d37d15fe`, merge PR #75 som `4379606e` og verificér, at ingen offentlig produktionsaktivering blev startet.
- [x] Implementér en isoleret neutral 24-/48-timers halveringsfølsomhed, bevis at den ikke ændrer ind-/udtransport eller missing, og auditér replayets tidsgrænser.
- [x] Dokumentér, at alle 12 eventvinduer kun har 24 timers forhistorie, at ingen referenceprøver når fuld strømstyrke, og at dette replay derfor ikke kan vælge levetid eller kalibrere strømgrænsen.
- [x] Bestå exact-head-kildegate `32599255165` på `ed1f0297`, merge PR #77 som `75ed93d6` og produktionsverificér i `32599309735` med live `rr-20260822212612-210`/210/673.
- [x] Afgræns det praktiske produktvalg uden at kalde det fundkalibrering: anbefal 0,03→0,15, videreført afledt tilstand og intet passivt neutralt tab; behold gammel start-0/0,05→0,20 og 24/48 som reference-/følsomhedsspor.
- [ ] Efterprøv senere den anbefalede prior mod komplette ture/hold-out, når materialet findes; manglende turdata må fremgå som modelusikkerhed.
- [x] Det særskilte ejer-go/no-go og de fulde produktgates er gennemført i DEC-0060 og PR #97–99. Komplette ture/hold-out forbliver senere efterkalibrering.

Nedenstående 4.0.258-afsnit gælder fortsat for jagtbarhed. DEC-0055 erstatter kun den foretrukne transportfortolkning.

## 4.0.258-kandidat

- [x] Fastlæg Candidate G's private analyseprior til `20/50/30`; offentlig `25/40/35` forbliver aktiv og uændret.
- [x] Implementér vindkurven 6/100, 7/80, 8/60, 10/35, 13/10 og 15/0 som særskilt diagnostic-only waders-profil.
- [x] Gør WAM-bølger til et ensrettet blødt fradrag på 20 procent af et negativt gab og højst 20 point, uden bølge-only hard stop.
- [x] Bevar waders-scoreloftet efter centrale ekspertregler og nul påvirkning af strandscore.
- [x] Genkør 1.460-evalueringsreplay, kanoniske scenarier, modeaudit og national shadow-self-test.
- [x] Dokumentér DEC-0054, ejerreview, håndbøger, RDKS og changelog uden private payloads.
- [x] Kør fuld lokal kildegate/releasegate på den samlede kandidat; alle kildechecks og den efterfølgende releasegate er grønne.
- [x] Exact-head PR-kildegate `32586707063` bestod, PR #73 blev merged som `9bdb8de8`, og produktion `32586958989` bestod frisk vejr/proveniens, fuld validering, releasegate, coverageaudit, Supabase og Pages.
- [x] Den senere ejerbeslutning blev truffet i DEC-0060, og den fallback-kompatible 210/673-produktkontrol er grøn. Turkalibrering er fortsat senere efterkalibrering.

Nedenstående 4.0.257-afsnit er historisk revisionsspor og er erstattet af DEC-0054, hvor de omtaler foretrukken variant, `20/45/35`, 18 m/s-stop eller selvstændig bølgevægt.

## Aktuelt score-neutralt beslutningscheckpoint

- [x] Produktionsverificér 4.0.257 via PR #70, merge `bb16ffe9`, fuld produktion `32580314866` og live `rr-20260822150210-210`.
- [x] Kør privat Candidate G-shadow `32580774128` på den eksakte mergecommit.
- [x] Genafspil den Git-ignorerede cache: 1.460 evalueringer, 730 uændrede strandscorer og nul waders-score over jagtbarheden.
- [x] Brug kun de 243 allerede komplette nationale dele som mekanisk kontrolsnapshot; hent ingen ekstra rådata til de øvrige dele i dette analyseafsnit.
- [x] Saml A-C, D-E, F og G 24/48 som revisionsspor og før kun `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` videre til ejerreview.
- [x] Bevar `20/45/35` som analysecentrum og offentlig `25/40/35` som aktiv model. Endelig produktionsvægt afventer komplette ture og hold-out.
- [x] Dokumentér beslutningsgrundlaget i DEC-0053 og den korte ejerreviewrapport.
- [x] Før beslutningspakken gennem PR #71, exact-head-kildegate `32583123375` og merge `52f66808`.
- [x] Ejerens samlede faglige review og særskilte aktiveringsbeslutning er gennemført i DEC-0054–0060.

## 4.0.257-kandidat – dynamisk inputcoverage adskilt fra udeladt stedmodel

- [x] Kør frisk central Candidate G-shadow på produktionsverificeret 4.0.256-merge `d629177a`.
- [x] Dokumentér 243/673 scorede dele og 430 u-scorede dele med manglende komplet lokal DKSS-familie.
- [x] Afklar mod nyere ejerbeslutninger, DEC-0050/0051 og faktisk kode, at statiske rev-/lavtvands-/ålegræsfelter ikke indgår i Candidate G.
- [x] Erstat den kombinerede scoreinput-/retention-gate med én ren dynamisk scoreinputcoveragegate.
- [x] Bevar retentionfelternes tilgængelighed som diagnostik, nul scorepåvirkning, afvist parentarv og `automaticActivationAllowed=false`.
- [x] Opdatér RDKS, forskningsgrundlag, Markdown-håndbog, webhåndbog og changelog.
- [x] Kør målrettede nationale shadow-, fase-D- og Candidate G-tests.
- [x] Kør fuld lokal `scripts/validate-source.ps1` og releasegate for 4.0.257.
- [x] Kør exact-head PR-gate, merge-/produktionskontrol og en ny central shadow på den præcise mergecommit.
- [x] Den særskilte fallback-kompatible landskontrakt blev etableret i DEC-0057 og produktionsverificeret 210/673 ved 4.0.261-aktiveringen.

## 4.0.256 – score-neutralt beslutningsgrundlag, afsluttet

- [x] Genafspil `15/50/35`, `20/45/35` og `25/40/35` på den godkendte waders-variant med eksakte komponenter og uændret fysisk gate.
- [x] Dokumentér yderpunktsforskellen: 4,947 point i gennemsnit og 282 referencebånd på 1.460 evalueringer.
- [x] Bevar `20/45/35` som gennemsigtigt analysecentrum; offentlig 25/40/35 forbliver uændret.
- [x] Verificér alle tre priorer på de kanoniske retnings-, kapacitets-, symmetri- og waders-kontrakter.
- [x] Tilføj diagnostic-only forklaringskontrakt for eksakte komponenter, bidrag, pil nu, historik før nu, fysisk gate og synligt waders-loft.
- [x] Genafspil 1.460 forklaringer med nul kontraktafvigelser og uden private payloads i Git.
- [x] Kør målrettede tests samt fuld lokal `validate:source` og releasegate for 4.0.256.
- [x] PR #69 exact-head-gate `32577977245`, merge `d629177a` og fuld produktion `32578049137`.
- [x] Genkør den centralt hydrerede nationale Candidate G-shadow `32578554928` på den eksakte mergecommit: 243/673 scorede, 430 uden komplet lokal DKSS-familie.
- [x] Ejerens samlede go/no-go er registreret i DEC-0060 og produktionsverificeret i 4.0.261.

## Afsluttet dokumentationscheckpoint efter 4.0.255

- [x] PR #68 exact-head-gate `32576541706`, merge `8cffdd54` og fuld produktion `32576619969`.
- [x] Live 4.0.255/datasæt `rr-20260822135100-210`: 210 zoner, 673 dele, komplet `controlled-live`-manifest og matchende conditions-datasæt.
- [x] Ingen offentlig score-, UI-, data-, geometri- eller punktændring.

## 4.0.255-kandidat – reparationsstatus efter PR #66

- [x] PR #66 exact-head-kildegate `32575000140` og merge `95e3064d`.
- [x] Produktion `32575055644` stoppede fail-closed i fuld validering før release, Supabase og Pages på den forældede nationale waders-markør.
- [x] Kontrakttesten forventer nu `candidate-waders-rule-order-public-product-review` og indgår i `validate:source`.
- [x] Målrettet national kontrakttest og shadow-selftest er grønne lokalt.
- [x] Fuld lokal `scripts/validate-source.ps1` og releasegate er grønne for 4.0.255.
- [x] PR #67 exact-head-gate `32575697204` og merge `af8f30cf`.
- [x] Produktion `32575740539`: frisk DMI/proveniens, fuld validering, releasegate, coverageaudit, support `RavRadar-support-3389`, Supabase, Pages-artifact og deploy.
- [x] Live 4.0.255/datasæt `rr-20260822133041-210`: 210 zoner, 673 dele, komplet `controlled-live`-manifest og byte-/SHA-match for public conditions/detail.
- [x] Ingen score, kandidatberegning, geometri, land-/vandpunkter eller beskyttede data er ændret.

## 4.0.254-kandidat – modeafhængig jagtbarhed

- **IMPLEMENTERET SCORE-NEUTRALT:** Stabil variant `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`, særskilt waders-vindprofil og synligt slutscoreloft ved jagtbarheden.
- **VINDKONTRAKT:** 100 vindpoint til og med 6 m/s; derefter monotont fald gennem 7/80, 8/60, 10/35, 13/10 og 18/0. Bølger beregnes fortsat særskilt.
- **REPLAY:** 1.460 evalueringer; 730/730 strandscorer uændrede, nul waders-score over jagtbarheden og nul middel/gode scorer ved jagtbarhed under 35.
- **AFGRÆNSNING:** Ingen sikkerhedsadvarsel, ingen bund-/dybde-/rende-/adgangsmodel og ingen ændring af beskyttede data eller land-/vandpunkter.
- **VALIDERET LOKALT:** Målrettede tests, RDKS, `scripts/validate-source.ps1`, releasegate og versionslukning er grønne.
- **ÅBEN:** Exact-head PR-gate, merge og samlet Candidate G-vægt-/forklarings-/coverage-/ejerbeslutning. Ingen offentlig aktivering.

## Produktionsstatus for 4.0.253

- **PR OG MERGE:** PR #62 leverede kode-/analysebaselinen som `b2951d90`; dokumentationscheckpointene gennem PR #64 bestod exact-head-gates og ændrede ikke programkode eller data.
- **FULD PRODUKTION:** Verifikationskørsel `32570223437` bestod central hydrering, frisk DMI, fuld `validate`, releasegate, support `RavRadar-support-3382`, Supabase og Pages på `01904b92`.
- **LIVE-SNAPSHOT:** Pages-deployment `6036286717` er `success`; version 4.0.253 og datasæt `rr-20260822112859-210` viste 210 zoner og 673/673 scorede kystdele. Aktuel rullende dataset-identitet kontrolleres live.
- **TESTMATRIX:** Ingen fuld browseraudit er nødvendig, fordi offentlig score, UI-adfærd og offentlig datakontrakt er uændrede. Målrettet live version-, datasæt- og coveragekontrol er grøn.
- **ISOLATION:** Ingen Candidate G-aktivering, score-/UI-ændring, geometri- eller punktændring og ingen beskyttede data i Git.

## Candidate G-produktkontrakt i 4.0.253

- **SCOREKONTRAKT:** 1.460/1.460 private evalueringer kan rekonstrueres fra eksakte komponenter, vægtede bidrag og fysisk gate; offentlig scorelogik er ikke ændret.
- **WADERS:** 219/730 evalueringer har jagtbarhed under 35, 7 af dem har mindst 55 point på den foretrukne no-direct-wind-variant, og det kanoniske højenergiforløb er 0/79.
- **PRODUKTANBEFALING:** Én RavScore som ravpotentiale med separat tydelig metodeegnethed; utilgængelig waders må ikke anbefales. Sikkerhed er fortsat uafhængig. Ejerbeslutning er åben.
- **PIL/HISTORIK:** Pilen er aktuel lokal strøm. Historik forklares separat; 332/872 tydelige contexts er modrettede, og 100 har ændret afrundet score.
- **COVERAGE:** National shadow er fortsat 243/673 scorede dele. DEC-0052 erstatter den ældre retention-gate: statiske lokale features er diagnostic-only, mens parentzonemorfologi fortsat ikke accepteres som lokal del-evidens.
- **ISOLATION:** Ingen offentlig UI-/scorekobling, geometri-, punkt-, DMI/fallback-, admin- eller protected-dataændring.

## P1-driftsevidens - Copernicus-pilot #72

- **STATUS:** Grøn naturlig schedule-kørsel og supportartifact.
- **VINDUE:** 46 eksakte timetidspunkter, 28.934 poster, første 2026-08-18 11:00Z og seneste 2026-08-20 08:00Z.
- **STABILITET:** 625 unikke mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- **ISOLATION:** `scoreImpact=false`, `publicRuntime=false`, `interpolation=false`; ingen rå U/V eller credentials i supportbeviset.
- **RESTERENDE:** Fortsæt naturlig opsamling til et fuldt 168-timersvindue før afsluttende forskningsanalyse.
- **KOMPONENTCYKLUS:** #3252 har ingen ny HARMONIE-, WAM- eller DKSS-modelstart i forhold til det foregående grundlag. Overgangene er stabile, men artifactet tæller ikke som en ny uafhængig DEC-0030-cyklus.
- **PRODUKTIONSVARIGHED:** 4.0.238's fulde build var 415 sekunder mod 475,5 sekunders median for seks fulde builds. Ingen gate blev reduceret; næste kvalificerede måling kræver en reel ny modelrotation.

## Status for 4.0.238

- **KODE OG MERGE:** PR #1 er merged som `b8844841`; historikmatcher, låst Open-Meteo-vindue og kildebaseret PR-validering er på `main`.
- **PRODUKTION:** `#32344813967` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, Supabase og Pages. Support `RavRadar-support-3252` indeholder datasæt `rr-20260820074127-210`.
- **BØLGER OG HISTORIK:** Seks #3246-huller er lukket til 118 timer med uændret kildeorden. Verificeret currenthistorik vokser igen til 39,594 timer i de 198 verificerbare zoner; 12 reelle huller forbliver `missing`.
- **BROWSER:** Live 4.0.238 er grøn for 210 zoner, 673 dele, 420 aktuelle og 2.100 forecastvisninger med nul funktionelle, konsol-, side- eller HTTP-fejl. Mobil og desktop er responsive uden overflow.
- **ÅBENT P0:** En naturlig fuld produktion skal stadig observeres over et faktisk UTC-timeskift. Readiness-skip `#32347036227` og pilot #72 viser den korrekte fail-closed forberedelse, men ikke selve grænsekrydsningen.
- **DATAINTEGRITET:** Ingen land-/vandpunkter eller beskyttede dirty datafiler indgår. De 12 dokumenterede strømhuller og Feggesunds reelle bølgemangel forbliver `missing`.

> **Aktiv opgavestyring:** Se `ACTIVE_ROADMAP.md`. Aeldre tomme afkrydsningsbokse i denne fil er historisk revisionsspor og er kun aktive, hvis de ogsaa findes i det aktive roadmap.

## Online browseraudit 2026-08-20

- [x] Reproducerbar liveaudit: `scripts/audit-online-browser-playwright-4.0.238.mjs`.
- [x] 210/210 zoner og 673/673 kystdele indlæst.
- [x] 420/420 aktuelle visninger og 2.100/2.100 femdøgnsvisninger kontrolleret.
- [x] 0 mismatch i score, farve, pile, forklaringer, lokal kontekst og debug-ID.
- [x] Browser-plugin diagnosticeret før godkendt Chromium-fallback.
- [x] Ingen land-/vandpunkter eller produktionslogik ændret.
- [x] Mobil 390 × 844 og desktop 1440 × 900 kontrolleret uden overflow eller funktionelle browserfejl.

## 4.0.237 – fælles aktuel zonetime

- [x] Livegrundlaget er auditeret sikkert uden rå U/V: alle 210 zoner har en komplet fælles lokal time; den hidtidige runtime har 642/673 dele på den valgte zonetime og 31 på en anden nær-time.
- [x] `currentReferenceAt` vælges som nærmeste komplette række, hvor begge jagtformer og alle forventede kystdele findes ved samme eksakte tidspunkt.
- [x] Producenten låser hver dels `current`, score og `flowPoints` til zonens reference. Pilcellen må ikke længere lånes fra nærmeste nabotime.
- [x] Startpakke, detaljepakke, manifest, detaljefletning og frontend fører produktions- og zonereferencen sammenhængende.
- [x] Nærzoom accepterer kun lokale pile, hvis delens current-tid er identisk med zonens reference.
- [x] Målrettede regressioner består for progressiv runtime, 210 zoner, 673 dele, 2.100 femdøgnsvisninger, kortpile, DMI-bulk/forecast og kontrolleret Copernicus-livefletning.
- [x] Ejerens punkter, geometri, U/V, scoreformel, kildeorden, afstande, rollback og dynamiske 673/673-gate er uændrede.
- [x] RDKS-, versions- og releasevalidering er grøn; commit `9c971bc1` er pushet til `main` uden de fire beskyttede dirty datafiler.
- [x] `#32264833170` bestod frisk central 210-zone/673-dels produktion, fuld `validate`, releasegate, Supabase og Pages. Live `rr-20260819143933-210` har 210/210 komplette zoner og 673/673 dele på deres respektive `currentReferenceAt`; 196 zoner bruger 15:00Z og 14 bruger 14:00Z.
- [x] Ejeren har slettet cron-job.org-jobbene. Efterfølgende native produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og pilot `#32273634626` er grønne; GitHub er eneste normale scheduler.
- [x] Live `rr-20260819155614-210` er sikkert auditeret for 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdøgnsvalg og 673 pile. Den private cache har samtidig 30 gyldige timer, 18.870 poster, 625 mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- [x] Faktisk online DOM-/kliktest er gennemfoert paa 4.0.237 efter produktion `#3237`: 210 zoner, 673 dele, 420 aktuelle visninger og 2.100 femdoegnsvalg er groenne. Browser-pluginet blev diagnosticeret foerst; trusted-RPC-opstartsfejlen gav ingen konkret lokal reparation, saa godkendt Chromium/Playwright-fallback blev brugt.
- [x] Naturlig produktion `#3245` gentager vandkildekontrollen: fire historiske cacheudloeb er ikke valgt i effektiv zonerouting, og vandstand/vandtemperatur har fortsat data i 210/210 zoner. Det naturlige exitkriterium for en valgt warning/critical-kilde er fortsat aabent.
- [x] DEC-0030-komponentmatricen for `#3245` omfatter nu ogsaa vandstand og vandtemperatur: 202 zoner har 118 timer, otte Limfjordszoner har 107 timer, og de sidste 88 zonetimer forbliver eksplicit missing frem for kunstig udfyldning.
- [x] De otte Limfjordshaler er afgraenset til manglende raa Open-Meteo Marine-vandstands- og temperaturfelter efter den fælles DKSS-modelkant; nabozoner skifter paa samme time til fallback. Routing og merge taber ikke eksisterende fallbackvaerdier, og ingen punkter flyttes.
- [x] Naturlig Copernicus-pilot `#64` genkendte samme UTC-time og centrale geometri fra `#63` og sprang authenticated download/cache/artifact over. Cachen forbliver korrekt paa 41 gyldige timer; duplikat-skippen taelles ikke som ny evidens.
- [x] Online browseraudit sammenligner nu alle seks viste vejrmetrikker mod den valgte lokale runtimepost i 420 aktuelle og 2.100 femdoegnsvisninger, inklusive at reelle `null`-felter vises som `Mangler`.
- [x] Naturlig produktion `#3246` afsloerede seks boelgehuller paa den laaste 03-time, da buildet passerede 04 UTC og Open-Meteo kun leverede fremtid fra 04. Kandidaten henter et dynamisk bagudvindue, filtrerer til referencetimen og bevarer 120 timer; frisk main-produktion mangler fortsat som bevis.
- [x] Fuld livebrowseraudit efter `#3246` er groen for 210 zoner, 673 dele, 420 aktuelle og 2.100 femdoegnsvisninger. De seks boelge-nullfelter vises som `Mangler` uden laan fra en anden time; det aabne punkt er fortsat produktionsbevis for kandidatrettelsen.
- [x] Den ikke-deployende PR-gate beskytter nu timeskifterettelsen med production-hour-lock, DMI-acquisition, DMI-bulk/fallback-integration og vandkilde-produktionskæden; workflowkontrakten kraever alle fire.

## 4.0.236 – låst produktionsreferencetime

- [x] `current-hour-readiness` eksporterer den eksakte time, som blev godkendt mod den private Copernicus-cache.
- [x] Planlagt `build-and-prepare` binder live-pilot og vejrbygning til samme `RAVRADAR_PRODUCTION_TARGET_HOUR`, også når jobbet krydser et UTC-timeskifte.
- [x] Root-`generatedAt`, dataset-ID og health bruger stadig virkelig byggetid; den faglige lås ligger særskilt som `productionReferenceAt`.
- [x] Push og manuel release uden readiness-output bevarer normal nutidsadfærd og hele den fail-closed kæde.
- [x] Regression simulerer 11:00 → 12:04-løbet, beviser den låste time og afviser ikke-timeskarp konfiguration. Workflow-, DMI- og heartbeat-regressionerne består målrettet.
- [x] `#32249924919`/`#3217` er dokumenteret som sikkert 630/673-stop uden releasegate, Supabase eller Pages; det var ikke en deployet datafejl.
- [x] RDKS, målrettede regressionssuiter, versionslukning og lokal `release:gate` er grønne. Fuld lokal `validate` passerer geometri-v2 og stopper derefter på det kendte forældede 209/211-snapshot; runtimepipeline-testen mangler tilsvarende den centralt byggede `public-condition-details.json`.
- [x] Commit `668a1cdd` er på `main`, og normal ikke-tvungen produktion `#32253251841`/`#3219` bestod readiness med låst 12:00-time, frisk 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy.
- [x] Live 4.0.236/datasæt `rr-20260819123607-210` er direkte metadata-verificeret med 210 zoner, 673/673, 622 DMI + 39 Baltic + fire AMM15 + otte tilladte proxyer, `productionReferenceAt=12:00`, `controlled-live` og `credentialsIncluded=false`.
- [x] Manuel pilot `#32257195240`/`#42` udvidede først cachen til 27 gyldige timer. Naturlig pilot `#32273634626` har siden udvidet den til 30 gyldige timer og 18.870 poster med fortsat 625 mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- [x] Schedulerholdet er ophævet efter tre nye naturlige grønne events: produktion `#32262008874`, Copernicus-pilot `#32262250342` og cachebevaring `#32262276171`.
- [x] Ejeren har faktisk slettet cron-job.org-jobbene, og efterfølgende native produktion, pilot og cachebevaring er verificeret grønne. GitHub er den normale scheduler.

## 4.0.235 – én lokal visningskontekst, produktionsverificeret

- [x] Aktuel zonevisning bruger vinderdelens eksakte lokale vejrpost sammen med samme lokale score, forklaring og debug.
- [x] Manglende lokal vejrpost låner ikke hovedzonens værdier; ufuldstændig fælles lokal række giver en tydeligt mærket, samlet hovedzonefallback.
- [x] National prognose og zonepanelets femdøgnsfaner bruger samme `selectLocalBestForDay`-beslutning.
- [x] Runtime bevarer vinderdelens kompakte komponenter, årsager, transportforklaring og viste vejrdata pr. fælles time uden rå U/V eller credentials.
- [x] Landsdækkende syntetisk regression består for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger med identisk vinder, tid, score, vejr og forklaring gennem startup-/detailfletningen.
- [x] Lokale forklarings-, kort-, scorepresentation-, null-safety-, progressive payload- og versionsregressioner består målrettet før versionsløftet.
- [x] RDKS, målrettede tests, versionslukning og lokal `release:gate` er grønne på 4.0.235. Fuld lokal `validate` gennemfører RDKS og hele geometri-v2-kæden og stopper derefter som forventet ved den kendte beskyttelse mod repositoryets forældede 209/211-vejrsnapshot; friskdata-leddene skal bevises centralt.
- [x] Første centrale pushrun `#32248949564`/`#3215` stoppede fail-closed før release, Supabase og Pages på fire efterladte 4.0.234-User-Agents. Fejlen er mekanisk og ændrer ikke data, score eller 673/673-gaten. Workflow, versionsværktøj, versionskontrol og releasegate er rettet lokalt, så drift nu afvises før push.
- [x] Versionsrettelsen blev pushet, og `#32249770288`/`#3216` bestod frisk 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy.
- [x] Live datasæt `rr-20260819115558-210` er metadata-, hash- og runtimeverificeret. 420 aktuelle og 2.100 femdøgnsvisninger bruger kun en komplet lokal kontekst eller en eksplicit samlet hovedzonefallback.
- [x] Den faktiske visuelle DOM-/kliktest er gentaget mod live 4.0.237 og datasæt `rr-20260819213342-210`; score, farve/level, pile, forklaring, lokal kontekst og femdoegnsvalg passer sammen uden fejl.
- [x] Frisk live 4.0.236 beviser 673/673 verificerede strømrecords ved den godkendte kildeorden. Det er deldækning, ikke bevis for én national eller automatisk valgt komplet lokal række; 4.0.237 retter den særskilte zoneudvælgelse.

## 4.0.234 – GitHub-plan og Supabase runtime-arkiv

- [x] Timeskifteroden er afgrænset: ekstern `:00`-produktion kunne løbe samtidig med den nye Copernicus-time og stoppe sikkert på 630/673.
- [x] GitHub-ejet produktionsplan er implementeret ved minut 14/29/44/59; piloten er flyttet til minut 6.
- [x] Planlagt produktion har en separat current-hour-readiness-gate og bygger/deployer intet, når aktuel UTC-time endnu mangler.
- [x] Overgangens almindelige, ikke-tvungne cron-`workflow_dispatch` bruger samme gate; manuel `force=true` og push bevarer den fulde fail-closed releasekæde.
- [x] Push/manual release, fulde gates og dynamisk 673/673 er uændrede.
- [x] `runtime-diagnostics` pakkes tabsfrit med gzip/base64, SHA-256 og byteantal under samme beskyttede nøgle; admin kan verificere og genskabe originalen, inklusive legacy-format.
- [x] Repræsentativ kompakt payload er reduceret fra 4.014.169 til 208.874 byte; målrettede roundtrip-, korruptions-, workflow-, heartbeat-, Supabase- og adminregressioner består.
- [x] RDKS, version, geometri-v2 og alle tests, som ikke kræver et frisk centralt runtimeartifact, består lokalt på 4.0.234; `release:gate` er grøn. Den samlede lokale `validate` stopper som forventet på repositoryets forældede 209/211-vejrsnapshot og manglende frisk `public-condition-details.json`, så friskdata-delene skal bevises centralt.
- [x] Commit `7409d461` og pushrun `#32237507059`/`#3202` beviser central geometri, fuld validering, releasegate, 673/673, komprimeret Supabase-sync på otte sekunder, Pages-artifact og deploy. Live 4.0.234/datasæt `rr-20260819093242-210` er direkte metadata-verificeret med 210 zoner, 673/673, `controlled-live`, credentialfri historik og 168 timers retention.
- [x] Naturligt GitHub-`schedule`-event `#32244914347`/`#3210` på `4ab7a659` bestod current-hour-gate, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Ejeren er bedt om at deaktivere RavRadar-jobbene i cron-job.org.
- [x] Eksternt hel-timeskald `#32245473213`/`#3211` uden den nye eksakte time sluttede grønt med `build-and-prepare` og Pages-deploy sprunget over; den tidligere røde 630/673-race er direkte produktionsverificeret som løst.
- [x] Efterfølgende native produktion, pilot og cachebevaring er hver verificeret grønne i `#32262008874`, `#32262250342` og `#32262276171`.
- [x] Cron-job.org-jobbene er slettet, og efterfølgende native produktion, pilot og cachebevaring er grønne.

## Browser-P1 – runtime- og produktionsverificeret i 4.0.235, visuel sluttest afventer

- [x] Chromium-audit gennemførte 210 zoner, 673 dele, 420 aktuelle zone-/jagtformvisninger og 2.100 femdøgnsfaner uden at ændre projektdata.
- [x] 673/673 ejerland-/vandpunkter matcher runtime; alle 673 strømvektorer, pilceller, kildeklasser og afstande er konsistente. Den tidligere 4.0.233-retningsisolation er ikke tilbagefaldet.
- [x] Rodårsagen til den aktuelle visuelle modsigelse er afgrænset: `app.js` sender hovedzonens `condition.current` til zonepanelets metrikker, mens vinder/score/debug bruger den lokale vinderdel; `js/ui/info-panel.js` vælger femdøgnstid generisk på hovedzonen i stedet for den lokale `bestForDay`.
- [x] Nuvisningen bruger vinderdelens eksakte lokale vejrpost og tidspunkt med tydeligt mærket fallback ved reel mangel.
- [x] Femdøgnsfanerne bruger samme lokale `bestForDay`-post som den nationale prognose.
- [x] Systemisk regression dækker alle zoner, begge jagtformer og fem døgn samt det afgrænsede lokale-mod-hovedzone-modbevis.
- [x] Samlet 673/673-proveniens er adskilt fra lokal fælles timedækning. Livegrundlaget har en komplet fælles time i hver af de 210 zoner, men ikke nødvendigvis samme nationale time; 4.0.237 vælger og publicerer den rigtige zonetime. Ingen ny kildeplan er nødvendig, og gaten er ikke sænket.
- [x] Central RDKS-/release-/produktionsvalidering og live runtimeaudit er afsluttet i `#32249770288`/`#3216` og datasæt `rr-20260819115558-210`.
- [x] Fuld DOM-/kliktest af farver, pile, vinderomraade, tekst, score og debug er gennemfoert for alle 210 zoner/673 dele med godkendt fallback efter plugin-diagnose. Se `data/diagnostics/ONLINE_BROWSER_AUDIT_4.0.237_20260820.md` og `docs/research/ONLINE_RESPONSIVE_AUDIT_4.0.237_20260820.md`.

## 4.0.233 – score, historik, forklaring og kystdel deler ét punktpar

- [x] Seks ejerbilleder og live detaljedata er sammenholdt. Blåvand-modsigelsen er reproduceret: `Havsande – nordkyst` havde lokal retning 117,3°, men scorede mod moderanker 29° ved `Syd for fyret`.
- [x] Alle 673 aktuelle strømrecords er auditeret uden at ændre kilder eller dækningskrav. Der er nul U/V/retning-mismatch, nul pil/grid-mismatch, nul uverificeret provenance, nul ugyldige kildeklasser og nul afstandsbrud.
- [x] Den systemiske scoreaudit finder 216 dele i 52 zoner, hvor den anvendte scoreretning afviger fra delens godkendte punktpar. 49 af de aktuelle 210 zonevindere er direkte berørt.
- [x] `localPartRuntimeProperties` erstatter moderzonens retningsankre med præcis ét lokalt anker, men bevarer øvrige statiske kystegenskaber.
- [x] Landsdækkende regression beviser 673/673 identiske punkt-, navn- og retningsidentiteter gennem scorekonstruktionen samt offshore-klassifikation for det konkrete Havsande-modbevis.
- [x] Eksisterende score-, retningsanker- og kortpiltests består målrettet.
- [x] RDKS-, release-, versions-, geometri- og målrettede runtimevalideringer består lokalt. Den fulde lokale kæde passerer RDKS og hele geometri-v2-kæden og stopper derefter som forventet på repositoryets forældede 209/211-vejrsnapshot; frisk datavalidering skal derfor ske centralt.
- [x] Første centrale forsøg `#32165003851` stoppede før release/deploy, fordi fire aktive workflow-User-Agents stadig bar versionsmærket 4.0.232. De er versionslukket til 4.0.233; ingen data-, score- eller gatebetingelse er ændret.
- [x] Commit `286ea9e5` er på `main`. `#32165688946` og `#32165969786` bestod central 673/673, fuld validering, releasegate, Supabase og Pages. Direkte liveaudit af `rr-20260818173528-210` kontrollerede 673 dele og 43.064 prognose-/jagtformstimer med nul lokale anker-, vinder-, retning-, pil/grid-, provenance- eller afstandsfejl og matchende manifesthash.

## Kontrolleret supplerende live-strøm i 4.0.232

## Copernicus-pilot og otte regionale Limfjordsproxyer

- [x] Ejeren har godkendt kontrolleret live-aktivering på den nuværende ikke-offentlige side. Syvdøgnsvinduet eftermåles i den virkelige runtime og er ikke længere et førkrav; præcis 673/673, fuld provenance og alle releasegates er fortsat førkrav til normal live-drift.
- [x] `data/current-live-pilot-control.json` er den versionsstyrede driftskontrol. `controlled-live` bruger supplementet; `dmi-only-rollback` fjerner det fra score og pile, bevarer friske øvrige prognoser og markerer de berørte strømme `missing` uden falsk fulddækning.
- [x] Produktionsworkflowet bygger `data/live/current-pilot-history.json` efter private cache-restore/DMI-bygning og før score. Filen indeholder kun geometri-, tid-, celle-, lag- og afstandsverificerede Copernicus-/regionalproxyrecords inklusive U/V; credentials er ikke med. Historikken er online, men indgår ikke i startpayloaden.
- [x] Den aktive kildefletning er implementeret lokalt som DMI ≤5 km → Baltic NEMO ≤5 km → AMM15 ≤5 km → otte ejerallowlistede `dkss_lf`-proxyer ≤15 km. Supplementet udfylder kun præcis samme forecasttime; ingen celle-, lag- eller tidsinterpolation er tilladt.
- [x] Lokale Copernicus- og regionalproxypile bruger den viste scoretimes faktiske kildecelle. Kortet accepterer de nye eksplicitte gitterkildeklasser og accepterer fortsat ikke vandpunktet eller en anden times celle som verificeret pil.
- [x] Den rumlige audit tæller i normaltilstanden kun runtimeposter med fuld kildeproveniens og eksakt match til onlinehistorikkens U/V-post. Alle 673 kræves stadig. Rollbackgrenen afviser enhver supplerende runtimepost og må ikke rapportere reduceret DMI-dækning som 100 %.
- [x] Nye Python-/Node-regressioner beviser online U/V uden credentials, DMI-first, eksakt-tidsfletning, afvisning over afstandsgrænserne, rigtig pilcelle, normal 673/673-gate og fail-closed DMI-only rollback.
- [x] `#32156725504` byggede den nye offentlige historik og scorede 665/673: 622 lokal DMI + 43 Copernicus. Support `#3125` viste samtidig 40 gyldige prøver fordelt på alle otte regionalproxyer. Manglen var en integrationsfejl: livebyggeren krævede et ikke-kanonisk anchorfelt. Valideringen følger nu shadow-cachens faktiske identitet (`targetPoint`, `sourceWaterPoint`, del/zone, klasse, vandområde, collection og maksimumafstand).
- [x] Commit `5a7780e4` og central `#32158041877`/support `#3127` byggede præcis 673/673 (622 DMI + 43 Copernicus + 8 regionalproxy) og bestod fuld validering, releasegate, Supabase, Pages-artifact og deploy.
- [x] Direkte live-HTTP-kontrol af det første aktiveringsdatasæt bekræftede version 4.0.232, manifestmatch, 673/673 scorede dele, credentialfri historik og 221 kompakte startup-strømpile fra kun de tre godkendte gitterkildeklasser. `#32160090899`/support `#3129` gentog fuld kæde, 673/673 og live artifactmatch.
- [ ] Følg nu den naturlige drift i syv døgn på den fungerende side. Direkte visuel kliktest gentages, når Codex' lokale browser-plugin igen kan starte; pluginfejlen ændrer ikke det beståede artifact-, hash-, HTTP- eller deploybevis.

- [x] Begge påkrævede Copernicus Actions-secrets findes; værdierne er ikke læst eller logget.
- [x] De aktuelle officielle dataset-id'er og U/V-variabler er katalogverificeret med Copernicus Marine Toolbox 2.4.1.
- [x] Separat privat workflowkode henter et begrænset én-times 3D-udsnit, bruger alle 673 friske centralt hydrerede kystdele, vælger nærmeste fælles vandkolonne før dybeste fælles lag og interpolerer ikke.
- [x] Kildernes rå restorecache opbevares højst 168 timer med `scoreImpact=false`/`publicRuntime=false`. Den validerede, credentialfri liveprojektion må efter ejerbeslutningen publicere U/V og provenance; den sikre supportrapport forbliver vektorfri.
- [x] Lokal syntetisk regression beviser tør nærmeste celle, dybeste fælles lag, samme U/V-celle/-tid/-lag, 5-km-afvisning, syvdøgnspruning og sikkert rapportoutput.
- [x] En særskilt ren retentionregression indgår nu i normal `npm run validate` og i Copernicus-workflowet. Den beviser præcis 168-timersgrænse, deduplikering, rensning af beskadigede/ældre/fremtidige restoreposter samt fail-closed afvisning af nye ugyldige eller for fjerne poster.
- [x] `7f22e8e1`/`#32143798560` CI-verificerer den nye retentiontest i den fulde centrale kæde. Den bestod før det forventede 622/673-stop; ingen Supabase-/Pages-aktivering skete, og tre-timers-Copernicus-cachen overlevede DMI-cachearbejdet.
- [x] DEC-0041 og en maskinlæsbar politik afgrænser regionalproxy til præcis otte Limfjordsdele, `dkss_lf`, uændret samplingpunkt og højst 15 km. Lokal test mod #3079 består.
- [x] 4.0.232-kandidaten opretter de otte regionale mål ved hver DMI-kørsel fra den centralt hydrerede registrering og gemmer deres faktiske U/V privat op til 15 km. Almindelige mål bevarer 5 km; forkert collection, ændret punkt, anden zoneklasse og over 15 km afvises.
- [x] Privat DMI-evidensrapport indeholder kun del, samplingpunkt, collection, run, tid, grid, afstand og lag. Regressionen afviser rå `uMps`/`vMps`, beviser Pages-udelukkelse og isolerer proxy-replay til `dkss_lf`.
- [x] Målrettede DMI-, forecast-, scheduler-, cache-, policy-, RDKS-, håndbogs-, versions- og modulregressioner samt lokal releasegate består. Fuld lokal `validate` gennemfører RDKS og geometri-v2-kæden og stopper derefter som forventet på repositoryets forældede 31. juli-snapshot; friske centrale data må ikke erstattes af dette snapshot.
- [x] Commit `0c010090` er på `main`; autentificeret run `#32129799346` bestod på 1:59, og renset artifact bekræftede 39 Baltic + 4 AMM15 af DMI's 51 huller, ingen credential-/U/V-læk og præcis otte resterende allowlistdele.
- [x] Privat timeplan ved minut 17 opsamler ét eksakt aktuelt 3D-tidssnit pr. run og beskærer rå skyggehistorik til 168 timer.
- [x] Run `#32131021153` beviste cache restore/deduplikering og sikker flerrunsaggregation: 629 records, 625 unikke mål, 629 mål/kildepar, én gyldig time, nul grid-/lagskift og nul rå U/V i artifactet.
- [x] Central `#32134021410`/artifact `#3094` beviste 8/8 regionale dele og 32 private `dkss_lf`-prøver ved fire forecasttider. Afstandene var 5,416–12,110 km, både overflade- og dybere lag var repræsenteret, supportrapporten havde ingen rå U/V, og `.cache` nåede ikke artifactet.
- [x] Samme kørsel stoppede før Supabase/Pages på en historisk fastkodet User-Agent-test efter 4.0.232-versionsløftet. Testen læser nu versionen fra `package.json`; DMI-download-, cachemigration-, tværmodel- og workflowrækkefølgetest består lokalt.
- [x] Pushrun `#32135079819` passerede den rettede versionstest og stoppede først ved den forventede uændrede rumlige gate på 622/673. Intet blev deployet.
- [x] Første faktiske `schedule`-event `#32134686185` var grønt og hentede 12:00Z, men målte kun én bevaret tid, fordi 11:00Z-cachen var fortrængt af repositoryets cirka 10,2 GB Actions-cache.
- [x] Rodårsagen er LRU-pres fra flere 2,48–2,52 GB DMI-GRIB-cacher, ikke deduplikeringskoden. En lokal regression beviser to-timers merge; en credentialfri keepalive gendanner uden upload eller rå log hvert tiende minut, og manuel citeret UTC-backfill er tilføjet.
- [x] Keepalive `#32136328681` ramte 12:00Z-cachen; backfill `#32136391556` samlede 1.258 records ved 11/12 UTC med nul grid-/lagskift og nul rå/credentiallæk; `#32136642330` ramte derefter præcis den nye to-timers-cache.
- [x] Ejerens live-pilotbeslutning erstatter kravet om et afsluttet flerruns-/syvdøgnsvindue før første aktivering. Flere runs og hele vinduet eftermåles fortsat live og skal senere afslutte stabilitetsbeviset.
- [x] Kør 4.0.232-kandidaten mod frisk central DMI og bekræft prøver til alle otte uden offentlig aktivering.
- [ ] Bekræft syvdøgnspruning efter et naturligt fuldt retentionvindue. Kodegrænsen er nu regressionsbevist, men faktisk drift over hele vinduet kan ikke erstattes af en syntetisk test.
- [x] Bekræft første faktiske `schedule`-event.
- [x] Verificér keepalive centralt, genhent 11:00Z kontrolleret og bekræft mindst to `validTime`-værdier i samme råcache.
- [x] Første automatiske heartbeat-event er bevist i `#32146699458`, og den forudgående naturlige pilot `#32146584311` udvidede cachen til 14 UTC uden ny LRU-fortrængning.
- [x] Den aktive integration er centralt produktions- og liveverificeret. Fra `#32158041877` og senest 4.0.236-kæden er fuld validering, releasegate, frisk produktionsworkflow, Supabase, Pages og direkte runtimekontrol grøn med præcis 673/673; den gamle DMI-only-status er historisk og ikke længere aktiv normaltilstand.
- [x] Pushrun `#32129778162` beviste, at den eksisterende gate ikke blev omgået: fuld validering stoppede ved 622/673 og intet blev deployet.
- [x] Ejerens 100 %-krav er nu den faktiske produktionsgate: `requiredPartCoverage` er lig det dynamiske antal aktive kystdele, aktuelt 673. Separat regression forbyder den historiske 95 %-formel; #3094-replay stopper på 622/673 med krav om alle 673.
- [x] `#32139054129` bekræftede gaten centralt: regressionen bestod, auditten stoppede med 622/673 og “alle 673 kræves”, og releasegate, Supabase samt Pages blev ikke kørt.
- [x] Ny cachepres-rodårsag er målt: ingen automatisk keepalive-event ankom før næste 2,704-GiB DMI-save, og `#32139755594` fandt Copernicus-cachen fortrængt. Produktionsjobbet har nu en restore-only pre-DMI-refresh med fuld-validate-regression og uden rå log/upload.
- [x] `#32140001424` og `#32140470201` genopbyggede kontrolleret 11/12 UTC: 1.258 records, to tider, 625 mål, 629 mål/kildepar og nul grid-/lagskift uden supportlæk.
- [x] `b6cf0383`/#32140865173 bekræftede centralt cache-hit før DMI og overlevelse efter en ny 2,905-GB DMI-save. #32141443152 ramte samme cache bagefter uden recordlog.
- [x] Manuel aktuel-time-pilot #32141772134 udvidede efterfølgende cachen til 1.887 records ved 11/12/13 UTC med nul grid-/lagskift og nul supportlæk.
- [x] GitHub-schedule blev afgrænset som ikke driftssikkert: workflowet er aktivt og manuel dispatch virker, men kun ét forsinket schedule-event kom, mens efterfølgende timer udeblev. Dette matcher platformens dokumenterede drop-/delay-risiko og projektets eksisterende eksterne schedulerarkitektur.
- [x] Keepalive bruger nu det eksternt startede produktionsworkflows `requested`-event som heartbeat. Den gendanner read-only, validerer schema/168 timer/score-neutralitet og dispatcher kun den eksisterende private pilot, når aktuel UTC-time mangler. Kun dispatchjobbet har `actions: write`; cache-save, artifact og deploy er fortsat forbudt.
- [x] Lokal heartbeat-, pilot- og workflowinventarregression består for manglende, forældet, aktuel og usikker cache uden rå U/V-log.
- [x] `#32146584311` udvidede cachen til 2.516 records ved 11–14 UTC uden gitter-/lagskift eller supportlæk. Automatisk heartbeat `#32146699458` ventede korrekt, ramte den nye cache og sprang dispatch over, fordi aktuel time allerede fandtes.
- [x] Pushrun `#32146695718` bestod heartbeat-, cache-, retention- og 100 %-regressionerne centralt og stoppede derefter korrekt på faktiske 622/673 uden releasegate, Supabase eller Pages.
- [x] Afsluttede timer har et SHA-256-fingeraftryk af alle centralt hydrerede del-ID'er og vandpunkter samt forventet recordantal. Samme time/samme geometri springes over; samme time/flyttet punkt, legacycache eller ufuldstændigt recordantal genindsamles og erstattes samlet. Ældre poster for flyttede dele fjernes selektivt.
- [x] `#32149556595` beviser automatisk legacycache-detektion og dispatch. Pilot `#32149592195` migrerede 14 UTC til nyt manifest og ny cache med fire tider/2.516 records uden læk; `#32149552657` bestod de nye regressioner før det forventede 622/673-stop.
- [x] `#32150318931` beviser den modsatte gren: ny manifestcache med samme time og geometri giver grønt preservejob og `dispatch-pilot` som skipped.
- [x] Automatisk centralt manglende/legacy-time-dispatch er bevist i `#32149556595` → `#32149592195`. Næste nye UTC-time skal fortsat vise almindelig naturlig udvidelse; GitHubs native schedule er kun reserve, ikke eneste driftstrigger.

# Implementeringsstatus pr. 4.0.231 – vist scoretime og strømpil deler DMI-celle

## 4.0.231 – lokal pil beregnes efter valg af den viste scoretime

- [x] #2875/#2876 har progressivt genopbygget `dkss_idw` og `dkss_nsbs` med parser v18 og strømsemantik v3 uden at lempe nogen gate.
- [x] Havknude har i #2876 38 native NSBS-strømtider fra cellen 2,80363 km fra det centrale vandpunkt; den tidligere skalarblokering er dermed rettet i et frisk produktionsartefakt.
- [x] #2876 afdækkede én selvstændig lokal pil/grid-afvigelse: en senere gyldig scoretime blev vist, mens pilens flowpunkt var beregnet ved byggetiden uden strøm.
- [x] Den lokale runtime vælger nu sin viste score først og beregner derefter `flowPoints.current` ved præcis scoretidspunktet. Manglende strøm på den viste tid forbliver fail-closed.
- [x] Zoom-/pilregressionen dækker nu et tidsligt datagab og beviser forskellen mellem byggetidens fallbackanker og scoretidens verificerede DMI-celle.
- [x] Privat cache i #2876: 168 timer, score-neutral, ikke offentlig, cursor 300, 1.394 prøver, 630 ankre og 239 dele; ingen rå U/V i ejeroversigten.
- [x] Målrettede pil-, DMI-, forecast-, provenance-, null-safety-, runtime-, versions-, håndbogs- og RDKS-kontroller består. Public-runtime-kontroller består mod det friske #2876-artefakt, og lokal `release:gate` består for 4.0.231.
- [x] Fuld lokal `validate` gennemfører RDKS og hele geometri-v2-selftestkæden og stopper derefter som forventet på repositoryets forældede 31. juli-snapshot (209/211 før central adminhydrering). Den lokale rumlige audit mangler tilsvarende de friske 673 kystdelsserier og må ikke bruges til at lempe produktionsgaten.
- [x] Produktrettelsen er samlet i commit `4181976c2a54862f3377582d4c25ca94b8f8f977`; push og central verifikation afventer.
- [ ] Genopbyg `dkss_lf`, og kræv nul pil/grid-mismatch i frisk central audit. Den uændrede 640/673-gate må ikke sænkes uden ejerbeslutning.
- [ ] Supabase, Pages og direkte livekort skal bestå, før versionen kan kaldes produktionsverificeret.

## 4.0.230 – skalare havfelter kan ikke blokere nærmeste strøm

- [x] #2872-artefaktet er analyseret: Havknude har fælles NSBS-U/V 2,804 km fra vandpunktet, selv om den offentlige v2-runtime manglede strøm.
- [x] Rodårsagen er fundet i det globale `marineSelection`: et IDW-skalarpunkt 5,131 km væk vandt kysttypeprioren og forhindrede den nærmere NSBS-strøm.
- [x] Strøm vælges nu pr. native tid på tværs af alle aktive DKSS-collections efter nærmeste komplette U/V-kolonne og derefter dybeste lag i samme kolonne.
- [x] Vandstand, overfladetemperatur og andre skalare havfelter beholder deres eget kysttilpassede valg og kan ikke rydde eller blokere strøm.
- [x] Semantik v3 og parser v18 tvinger genbehandling af gammel strøm, mens gyldige skalare felter og deres provenance bevares.
- [x] Interpolation og forecastidentitet afviser fortsat skift i collection, modelkørsel, celle, lag eller samplingpunkt.
- [x] Ny Havknude-regression bruger de målte produktionskoordinater/-afstande og beviser både korrekt NSBS-valg og afvisning af en fjernere strømkolonne. De berørte eksisterende DMI-, forecast-, integritets- og kortpiltests består målrettet.
- [x] DEC-0040, aktive krav, roadmap, RDKS, Weather Pipeline, Markdown-håndbogen og webhåndbogen beskriver komponentadskillelsen og bevarer den fremtidige transporthelhed.
- [x] Målrettede DMI-, scheduler-, forecast-, integritets-, pil-, cache-, håndbogs-, RDKS- og versionskontroller består. Lokal `release:gate` består for 4.0.230.
- [x] Fuld lokal `validate` gennemfører RDKS og hele geometri-v2-selftestkæden og stopper derefter som forventet på repositoryets forældede 31. juli-snapshot (209/211 før central adminhydrering). Den rumlige runtimeaudit mangler tilsvarende de friske 673 kystdelsserier og må ikke lempes; begge datakrav skal bevises centralt.
- [x] #2875/#2876 genbehandlede IDW og NSBS. Havknude er frisk artefaktbevist med 38 tider fra NSBS-cellen 2,80363 km væk; `dkss_lf` mangler fortsat.
- [ ] Den uændrede geografiske gate, Supabase, Pages og direkte livekort skal bestå, før denne kandidatlinje kan kaldes produktionsverificeret. Gaten sænkes ikke uden ejerbeslutning.

## 4.0.229 – nærmeste vandkolonne og bundnært lag

- [x] Rodårsagen er fundet: dybeste lag blev tidligere valgt på tværs af forskellige koordinater og kunne flytte aktiv strøm 12–24 km væk.
- [x] Strømvalg prioriterer nu nærmeste fælles U/V-vandkolonne før det dybeste gyldige lag i samme kolonne.
- [x] 0–3 km er foretrukket, 3–5 km accepteret reserve, og over 5 km afvises fail-closed.
- [x] Samplingpunkt, U/V-koordinat, tid, lag, afstand og semantik følger gennem bulkcache, forecast, provenance, score og pile.
- [x] Den faktiske koordinatafstand efterkontrolleres uafhængigt af cachens afstandsfelt, og direkte ForecastEDR-strøm uden lag-/kolonnebevis, Open-Meteos overfladestrøm samt anden fallbackstrøm fjernes før merge, historik og scoring.
- [x] Gamle strømdata og historisk strøm med tidligere semantik eller flyttet samplingpunkt kan ikke videreføres som verificeret.
- [x] Dybeste gyldige lag vælges særskilt pr. native forecasttid; lag-/celle-/runskift kan ikke interpoleres og bliver et synligt datagab.
- [x] Hovedzone- og kystdelspile bruger den valgte times egen provenienskoordinat, og lokale scoreposter bevarer samme tidsbestemte bevis.
- [x] Workflowet bygger centralt reviewede kystdelspunkter før DMI-sampling og migrerer progressiv cache selektivt pr. uændret samplingpunkt.
- [x] Privat roterende opsamling ved 0/5/15 km og flere lag har 168 timers retention, ændrer ikke score og publicerer kun kompakte antal/statusfelter.
- [x] DEC-0040, DEC-0029, roadmap, krav, kendte issues, håndbog og changelog beskriver helhedsmodellen **ydre tilførsel → overgang → lokal bundnær levering**.
- [x] Målrettede Python-/Node-regressioner, den øvrige lokalt kørbare valideringskæde og syntakskontrol består.
- [x] Lokal `release:gate` består. Fuld `validate` gennemfører geometri-v2-kæden og stopper som forventet på repositoryets historiske 209/211-vejrsnapshot; de centrale datakrav må kun bevises efter adminhydrering og frisk DMI i CI.
- [x] #31919296190/#2846 gennemførte semantik-v2-DMI og privat opsamling, men stoppede før deploy, fordi auditten fejlagtigt krævede ét fast dybdelag gennem hele tidsserien. Artifactet viste 33 bundlagstider plus én legitim overfladetid i et konkret eksempel.
- [x] Korrigeret artifactreplay bevarer 11.400 verificerede hovedzone-prognosetimer; 353 matchende lokale kystdele har tidsbestemt provenance og nul pil/grid-mismatch. Manglende progressiv dækning forbliver fail-closed.
- [x] #2850–#2855 beviser semantik v2, højst 5 km, tidsbestemt lag/punkt, selektiv cachemigration, fail-closed nuller og privat opsamlingsstatus. #2855 har 20.924 verificerede prognosetimer og nul kendt pil/grid-mismatch.
- [x] Den private cache er 168 timer, score-neutral og ikke offentlig runtime. Den har 491 prøver for 153 ankre/58 kystdele ved 0/5/15 km; et uændret DMI-run tilføjer ikke dubletprøver.
- [x] #2859 gav negativt produktionsbevis for første replay: nul fundne tidsrelevante marine cachefiler, `rotationAdvancedThisRun=false`, cursor 90 og uændrede 491 prøver/58 dele. Den fælles 4 GB-LRU havde ingen marine retention. DMI's aktuelle STAC-href er efterkontrolleret som stabil og var ikke årsagen.
- [x] Den lokale efterrettelse bruger et privat collection/run/tid-manifest og prioriterer en tidsrelevant marine fil pr. modelområde før LRU under det hårde 4 GB-loft. Objektsti-baseret cache-ID er fremtidssikring mod eventuelle querycredentials. Ved gammel/tømt cache er bootstrap begrænset til én fil pr. modelområde/tre pr. kørsel af resterende kapacitet efter offentlig DMI-bygning og behandles kun mod privat scratch-output.
- [x] Regressionen dækker spredt +0–12 timers replayvalg, stabil cacheidentitet på tværs af signaturer, prioriteret marine retention, bootstrapgrænse, privat isolation, statusfelter og 45-kørsels rotationsfremdrift. DMI-bulk, acquisition, forecastintegration og workflowrækkefølge består målrettet.
- [x] #2863 beviser bootstrap: tre komplette replayassets/29.783.658 byte, cursor 90→105, 58→73 dele og 491→531 prøver. #2864 beviser uændret-model-genbrug med tre assets, nul bootstrapbyte, cursor 105→120, 73→88 dele og 531→573 prøver. Begge er `reason=completed`, score-neutrale og ikke-offentlige; cacheloftet holdes.
- [x] #2866 fortsætter rotationen til cursor 150, 118 besøgte dele og 667 prøver med 38 nye prøver fra tre cachede replayassets; 4 GB-loftet holdes uden pruning.
- [x] Rotationens private coverage-audit registrerer nu også nærmeste eksakte fælles U/V-kolonnes afstand/koordinat/lag uden at gemme U/V-værdier over 5 km. En support-only ejeroversigt skelner pipelinehul ≤5 km, nær-tærskel 5–6 km til manuelt geometrireview, modelhul 6–8 km og strukturelt modelhul >8 km; den flytter aldrig punkter og er udelukket fra Pages.
- [x] #2869 beviser på rigtige DKSS-filer cursor 195, 755 prøver/157 dele, 15 nye prøver, tre cachede replayassets og coverage på 15 dele. Af 11 målte offentlige mangler er 2 ved 5–6 km, 4 ved 6–8 km og 5 ved 8,26–12,11 km; 66 af 77 afventer rotation. Ejerfilen har nul `uMps`/`vMps`, og offentlig dækning/gate er uændret.
- [ ] Den geografiske gate stopper på 187/210 hovedzoner og 596/673 lokale dele. 23 hovedzoner og 77 lokale dele har ingen verificeret fælles U/V-celle inden for 5 km og forbliver uden strøm/pil.
- [ ] Ejeren fortsætter punktrettelser eller træffer særskilt beslutning om fail-closed deldækning. Gaten sænkes ikke uden denne beslutning.
- [ ] Supabase, Pages-deploy og direkte livekontrol skal bestå, før versionen kaldes produktionsverificeret. Supportartifacts fra de fejlede runs findes og dokumenterer den sikre stoptilstand.

## 4.0.228 – lokale DMI-gitterpunkter bliver synlige tæt på

- [x] Landsoversigten bevarer hovedzonernes eksisterende repræsentative vind- og strømpile.
- [x] Fra zoomniveau 9 tilføjes lokale pile fra kystdelenes egne runtimeposter.
- [x] Lokale strømpile kræver eksakt fælles DMI-gitterpunkt for strøm-U/V; lokale vindpile kræver eksakt fælles punkt for vind-U/V.
- [x] Lokal vindproveniens følger den serie, forecastet faktisk bruger: primær HARMONIE foretrækkes, og ellers accepteres kun et eksakt DKSS-`wind-tail`-U/V-par med særskilt kildemærke.
- [x] Uverificerede lokale anker-/fallbackpunkter må ikke bruges til at fremstille ekstra tæthed.
- [x] Den progressive startpakke bevarer den aktuelle vinderdels flowpunkt, mens detaljepakken bevarer alle kystdeles flowpunkter.
- [x] Pilelaget opdateres, når detaljepakken er flettet ind, og fortsætter med at opdatere ved zoom og kortflytning.
- [x] Målrettet regression beviser flere fysisk adskilte pile ved nærzoom og uændret oversigt ved fjernzoom.
- [x] Eksisterende zoom-, strømproveniens-, null-safety-, DMI-bulk- og progressiv-runtime-tests består lokalt.
- [x] Den fulde lokale `validate` gennemfører hele geometri-v2-kæden og stopper derefter som forventet fail-closed på repositoryets historiske 209/211-vejrsnapshot før central adminhydrering; forholdet er ikke omgået eller omklassificeret.
- [x] Lokal `release:gate` består for 4.0.228.
- [x] DMI-værdier, kilder, forecast, RavScore, historik og geometri er uændrede.
- [x] #31911509244/#2830 forsøg 1 stoppede fail-closed ved 629/673 verificerede lokale strømpunkter efter delvis `dkss_lf`; uændret forsøg 2 nåede 670/673 og bestod fuld `validate` og releasegate.
- [x] Forsøg 2 stoppede efter den ene tilladte genprøvning af Supabase HTTP 500/PostgreSQL `57014`; Pages blev korrekt ikke deployet.
- [x] Artifactaudit af `rr-20260815224811-210` fandt transportfejlen: 670/670 lokale vindpunkter var zoneankre, fordi DKSS-`wind-tail-u/v` ikke blev genkendt. Read-only cache-replay finder 670/673 eksakte vindhalepar på 507 unikke gitterpunkter. Fejlen er rettet lokalt med direkte regression for primær vind, marin vindhale og U/V-mismatch.
- [x] #31913779486/#2835 på commit `93b8c0216821d02bf913f7aab369406ba2365fe9` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync og Pages-deploy.
- [x] Datasæt `rr-20260815231859-210` har 670/673 verificerede og offentliggjorte kystdele mod det daværende krav 640; 670/670 har eksakte DMI-punkter for både strøm og vind, nul U/V-mismatch, 461 unikke strømpunkter og 544 unikke vindpunkter. Beviset er historisk og opfylder ikke 4.0.232's nye fulddækningsgate.
- [x] Live manifest, startpakke og detaljepakke har samme datasætid og matchende SHA-256. Browserkontrollen viser 54 pile ved oversigten og 87 efter to zoomtrin, uden konsolfejl.

# Tidligere status: 4.0.227 – vejledende lokal kystvinkel

## 4.0.227 – ejerens helhedsvurdering kan godkendes

- [x] Rodårsagen er reproduceret i `pairGeometryCheck`: en afvigelse over 20 grader returnerede `valid:false` og låste hele zonen.
- [x] Svansodde-eksemplet er afgrænset til cirka 461 meter punktlinje mod cirka 15 meter lokalt kystsegment og 50 graders beregnet afvigelse.
- [x] Stor vinkelafvigelse returnerer nu `valid:true` og `warning:true`; den vises tydeligt som vejledende.
- [x] Godkendelsesstatus forklarer vinkeladvarsler og eventuelle reelle blokeringer direkte ved knappen.
- [x] Manglende punkter, ugyldig afstand, manglende kystkryds og samme side forbliver blokerende.
- [x] Målrettet regression dækker både ikke-blokerende stor vinkelafvigelse og fortsat afvisning uden kystkryds.
- [x] RDKS, releaseversion, browserens modulversioner, adminfrontend, admin-feature-reachability, sitetestkontrakt, håndbog og admin-persistens-/kort-/produktionskontrakter består lokalt.
- [x] Den fulde lokale `validate` gennemfører hele geometri-v2-kæden og stopper derefter som forventet fail-closed på repositoryets historiske 209/211-vejrsnapshot før central adminhydrering; forholdet er ikke omgået eller omklassificeret.
- [x] Lokal `release:gate` består for 4.0.227.
- [x] #31908498204/#2824 på commit `6e920c297ef58f997ae95b3b6da16adfdf66bfe6` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- [x] Supportartifactets releasegate er bestået. Datasæt `rr-20260815210805-210` er komplet med 210 zoner og 673 kyststrækninger, og SHA-256 matcher manifestet for både start- og detaljepakken.
- [x] Direkte Pages-kontrol viser 4.0.227, den vejledende vinkeladvarsel og ejerteksten; den tidligere hårde vinkelblokering findes ikke i den deployede admin-kode.

# Tidligere status: 4.0.226 – Supabase statement-timeout

## 4.0.226 – snæver idempotent genprøvning

- [x] #2814 forsøg 1 er afgrænset til HTTP 500/PostgreSQL `57014` ved den cirka 17,7 MB store `runtime-diagnostics`-upsert efter alle faglige gates.
- [x] Uændret #2814 forsøg 2 gennemførte samme skrivning på cirka 10,3 sekunder samt Supabase og Pages.
- [x] Requesteren genprøver kun eksakt `500/57014` og højst én gang.
- [x] Regressionen dækker recovery, vedvarende timeout, andre databasekoder og bevaret `PGRST303`-adfærd.
- [x] Workflow-gatetesten normaliserer CRLF/LF, så samme obligatoriske `validate`- og `release:gate`-betingelser valideres lokalt og på GitHub uden workflowændring.
- [x] Timeoutgrænse, payload, adminversionering, DMI, vejrdata, RavScore, historik og geometri er uændrede.
- [x] #31905211459/#2816 på commit `2dc8253a4c7f77449d6f92dcc9c996f211f033d2` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, Supabase, Pages-artifact og deploy.
- [x] Den virkelige `runtime-diagnostics`-upsert lykkedes i første forsøg på cirka 11,5 sekunder. Timeout-recoveryen er dækket af regressionen uden at fremprovokere produktionsfejl.
- [x] Artifact og live Pages viser 4.0.226 og datasæt `rr-20260815195620-210`; 22.890/22.890 DMI-vandstandstimer og 210/210 aktuelle rækker har fuld provenance, og begge manifesthashes matcher.
- [ ] Det kendte Feggesund-bølgegab holder fortsat brugerfuldstændigheden på 209/210. Et supplerende DMI EDR-kald ramte HTTP 429 i #2816, men `userForecastStatus` var `ok`; forholdet er adskilt fra 4.0.226-rettelsen.

# Tidligere status: 4.0.225 – aktuel time i vandstandsrouting

## 4.0.225 – samme tidsvindue i offentlig serie og kildeindeks

- [x] #2801 afgrænser regressionsmønstret til 210 rækker ved samme aktuelle klokktime.
- [x] Kildeindekset kan starte ved aktuel hele UTC-time uden at ændre den faktiske genereringstid.
- [x] Regressionen dækker `HH:02` → `HH:00`, sammensat DKSS-identitet og ikke-afrundet forecastalder.
- [x] Vandstandstal, routingvalg, fallback, RavScore, historik og geometri er uændrede.
- [x] Målrettede tests, RDKS, håndbog, version/module-closure og lokal releasegate består.
- [x] Fuld lokal `validate` når gennem geometri-v2-kæden og stopper forventet fail-closed på det historiske stale 209/211-vejrdata før central adminhydrering.
- [x] Read-only replay af #2801 giver uændret 210/0 routing-audit og fuld collection/model-run på 23.310/23.310 timer, inklusive 210/210 ved aktuel time.
- [x] #31902872631/#2810 bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportpakke, Supabase, Pages-artifact og deploy på commit `18499eb10a45f561d4440a7944b34725049cf34d`.
- [x] Datasæt `rr-20260815190651-210` har 22.890/22.890 routede DMI-vandstandstimer med fuld provenance og 210/210 komplette rækker ved aktuel 19:00-time; direkte Pages-kontrol efter #2810 viste 4.0.225 og samme 210-zone-datasæt.
- [x] #31903561423/#2812 gentog alle fulde gates/deploy efter evidenscommitten. Det senest auditerede datasæt `rr-20260815192135-210` gentager 22.890/22.890 og 210/210, matcher begge manifesthashes live og har `ok` sundheds-, DMI-dæknings- og API-status.
- [ ] Den separate kendte Feggesund-bølgemangel holder brugerfuldstændigheden på 209/210 og overvåges fortsat; den er ikke en del af den nu produktionsverificerede vandstandsrettelse.
- [x] Ny WAM 18Z-cyklus i 4.0.237/`#3237` bekraefter, at Feggesund har fungerende `dkss_lf`-marine data, men ingen boelgecollection; korrekt `missing` er eftermaalt uden punkt- eller kildeaendring.
- [x] 4.0.237/`#3237` afgraenser de aktuelle 97-/113-timershaler til de native WAM 18Z-/DKSS-sluttider og dokumenterer, hvor eksisterende fallback udfylder til 118 timer. Ingen tabt merge eller skjult udfyldning er fundet.

# Tidligere status: 4.0.224 – vandstandsroutingproveniens

## 4.0.224 – faktisk DMI-identitet efter routing

- [x] #2795 afgrænser fejlen til metadata efter den eksisterende værdirouting.
- [x] Rå kildepunkters DMI-proveniens bevares gennem timeinterpolation.
- [x] Enkelt- og flercollectionrouting får faktiske modelnavne, model-run, native tider, routingmetode og source keys.
- [x] Regressionen beviser, at et gammelt forkert modelmærke erstattes i både offentlig serie og forecaststore.
- [x] Vandstandsværdi, routing, fallback, RavScore, historik og geometri er uændrede.
- [x] #31895640397/#2797 giver 23.310/23.310 routede timer med collection og model-run, nul ufuldstændige provenienser samt grøn validate, releasegate, Supabase og Pages.
- [x] Direkte deploykontrol viser offentlig 4.0.224, datasæt `rr-20260815163132-210` og 210 zoner.

## 4.0.223 – delvis kontra fuld modelcyklus

- [x] #31894320128/#2794 beviser den tilsigtede progressive rotation: nye WAM-/DKSS-kandidater fra 12 UTC er opdaget, men 00/06 UTC beholdes, mens de stadig giver ca. 107,9/109,9 timers hale over 96-timersgrænsen.
- [x] Samme artifact har 210/210 verificeret aktuel strøm, nul valgte vandstandskilder med warning/critical og historikvækst til 4,27–39,99 verificerede timer.

- [x] Timer pr. modelkørsel suppleres med antal aktive zoner pr. modelkørsel og collection@run.
- [x] Selvtesten beskytter zonetællingen for både dokumenteret og udokumenteret DMI-proveniens.
- [x] Artifact #2783 dokumenterer en ny, men delvis HARMONIE 12 UTC-cyklus: 416 timer i 208 zoner.
- [x] #31891984360 produktionsverificerer auditten; artifact #2785 viser naturlig indfasning til 3.744 timer i 208 zoner og fortsat gamle WAM-/DKSS-run-id'er.
- [x] #31892505177/#2787 fortsætter samme indfasning til 5.616 timer fra 12 UTC med uændrede overgangsmål og historikvækst til 39,364 rå timer.
- [x] #31892947409/#2789 fortsætter til 7.488/2.288 HARMONIE-timer fra 12/03 UTC; ændrede overgangsmål bekræfter, at delvise snapshots ikke fastsætter en permanent grænse.
- [x] #31893406911/#2790 afslutter HARMONIE 12 UTC-indfasningen med 45 timer i 208 zoner og giver den anden fulde uafhængige vindcyklus.
- [x] Retningsspecifik sammenligning viser identisk DMI→fallback-hale og varierende fallback→DMI-start; ingen permanent tærskel er aktiveret.
- [x] Overgangstal og historikvækst er målt uden at ændre data, fallback eller score.
- [x] Et enkelt Supabase statement-timeout i #31891504819 stoppede deploy fail-closed; næste normale release synkroniserede og deployede uden retryændring.
- [x] Runtime-payloaden er størrelsesmålt: 9,287 MB kompakt, heraf 8,690 MB/93,57 % i 25 rå zoneeksempler.
- [ ] Beslutning om eventuel separat beskyttet lagring/download af rå zoneeksempler; ejerens diagnostikfunktion må ikke reduceres, og faktisk billing-egress skal fortsat måles separat.
- [ ] Afvent en ny vindhale/tredje fuld vindcyklus og nye WAM-/DKSS-run-id'er før permanente intervaller.

# Tidligere status: 4.0.222 – modelcyklusaudit

## 4.0.222 – uafhængig forecast-evidens

- [x] DMI-collection og model-run optælles pr. komponent og samlet som collection@run.
- [x] Native/interpoleret/kantopløsning og timer uden collection/model-run rapporteres fail-closed.
- [x] Selvtesten dækker både dokumenteret og udokumenteret DMI-proveniens.
- [x] #2764/#2771/#2777 er sammenlignet og dokumenteret som samme aktive modelcyklusser.
- [x] #31890898143 bestod fulde gates og deploy; artifact #2782 dokumenterer fuld collection/modelrun for alle fem komponenter og afgrænser #2777's vandstandsfund som ikke-vedvarende.
- [x] #2782 eftermåler historikvækst til 158 rå prøver/38,760 timer og 3,040–38,760 timers verificeret spænd uden bagudfyldning.
- [ ] Friske naturlige HARMONIE-, WAM- og DKSS-run-id'er skal fortsat eftermåles, før permanente overgangsintervaller kan besluttes.
- [x] Ny WAM 2026-08-19 18Z-cyklus er eftermaalt i `#3242`: 15 Limfjordszoner vokser til 115 timer, og alle tre boelgeovergange er dokumenteret.
- [ ] Ny fuldt indfaset HARMONIE-cyklus og flere uafhaengige komponentcyklusser mangler fortsat foer permanente overgangsintervaller.

# Tidligere status: 4.0.221 – vandstandsroutingalarm

## 4.0.221 – effektiv kildealarm

- [x] Artifact #2771 dokumenterer register, forecast/cache og Hals-kildernes 113 timer.
- [x] Fjernelsen i 4.0.99 og de stale videreførte alarmfelter er historisk afgrænset.
- [x] Effektiv automatisk/adminrouting bestemmer præcist hvilke aktive kilder der overvåges.
- [x] Seneste gyldighed fra DMI-kildeprognose og routet cache vurderes samlet uden at gøre observation og forecast til samme status.
- [x] Gyldig forecast rydder stale `critical`; advarsel, udløb, aktiv levering, historisk kilde og central tærskel er funktionelt regressionstestet.
- [x] #31889559758 bestod fulde gates og deploy; artifact #2777 rydder begge falske Hals-alarmer, viser 116,6 timers resttid, nul nye notifikationer og uændret faktisk routing i 5/6 zoner.
- [ ] En naturligt opstået warning/critical skal fortsat eftermåles i produktion; den syntetiske regression beviser allerede begge grene uden at fremkalde et kunstigt driftsbrud.
- [x] 4.0.237/`#3237` eftermaalte fire naturlige cacheudloeb: notifikationerne blev dannet, ingen udloebet cache var effektivt valgt, og aktiv vandstand forblev 210/210.
- [ ] En naturligt opstået warning/critical paa en faktisk valgt effektiv kilde skal fortsat eftermåles; der fremkaldes ikke kunstigt cacheudloeb.

## 4.0.220 – audit af brugbar transporthistorik

- [x] Rå prøveantal og råt tidsspænd bevares som selvstændige mål.
- [x] Aktuel DMI-verifikationsstatus, verificeret prøvefordeling og verificeret tidsspænd rapporteres uden at skrive.
- [x] Selvtesten beviser, at uverificerede prøver ikke tælles med, og at zoner under 72 verificerede timer forbliver åbne.
- [x] Artifact #2764 er målt til 210/210 aktuelt verificerede zoner, men kun 1,43–37,149 timers verificeret historik.
- [x] Ny fuld `dkss_lf`-cyklus med 41/41 trin og halevækst fra 98 til 115 timer er dokumenteret.
- [x] #31888082124 produktionsverificerer audit, fuld `validate`, releasegate, Supabase og Pages; artifact #2771 viser 210/210 aktuelt verificerede zoner og naturlig vækst til 152 rå prøver/37,722 timer.
- [ ] Fortsæt naturlig opbygning til mindst 72 verificerede timer i alle aktive zoner; ingen bagudfyldning eller scoreændring.

## 4.0.219 – routingaudit hentes ikke før hver vejrbygning

- [x] Artifact #2757 er størrelsesmålt med kompakt JSON og 96 kørsler/dag.
- [x] Routingauditten er fjernet fra central runtimehydrering, men bevares i frisk generering, beskyttet upload og ejerens adminvisning.
- [x] Regressionen bevarer stationsregister og redigerbar central konfiguration.
- [x] Read-only estimator viser cirka 3,03 GiB/30 dage som nedre pipelinegrænse mod cirka 4,44 GiB før rettelsen.
- [x] Målrettede Supabase/admin-regressioner, estimator, versions-/håndbogs-/RDKS-kontrol og lokal releasegate består.
- [x] Fuld lokal `validate` består hele geometri-v2-kæden og stopper derefter forventet fail-closed ved repositoryets historiske 211-zonegrundlag mod den centralt effektive bestand på 210; forskellen er ikke omgået.
- [x] #31885856568 produktionsverificerer central hydrering uden routingaudit-readback, frisk routingaudit-upload, fulde gates, Supabase og Pages på commit `5c823947`.
- [x] Artifact #2764 giver 3,028 GiB/30 dage som read-only nedre grænse og 1,416 GiB/30 dage undgået readback ved 96 kørsler/dag.
- [ ] Næste billingperiodes faktiske egressmåling; estimator og grøn funktionstest er ikke billingbevis.
- [x] 4.0.237-supportartifact `#3238` er estimator-maalt til 3,644 GiB/30 dage ved 96 koersler dagligt; stigningen fra cirka 3,03 GiB er afgraenset til stations-/notifikationsdokumentet.
- [ ] Naeste billingperiodes faktiske dashboardmaaling er fortsat noedvendig; estimatorens 3,644 GiB er ikke billingbevis.

## 4.0.218 – tidsmæssigt sikkert havmodelskift

- [x] De 27 zoners tilbagefald er adskilt fra 4.0.217-historikrettelsen og ført til et sent `dkss_idw`-halepar.
- [x] Et halepar kan ikke længere rydde en eksisterende strømserie omkring nu.
- [x] Et reelt bedre aktuelt par og recovery uden eksisterende aktuelt anker er bevaret.
- [x] Målrettede modelvalgs-, historik-, versions-, håndbogs- og RDKS-tests samt lokal releasegate består.
- [x] Fuld lokal `validate` består hele geometri-v2-kæden og stopper derefter forventet fail-closed ved repositoryets historiske 211-zonegrundlag mod den centralt effektive bestand på 210; forskellen er ikke omgået.
- [x] #31883707138 beviser central hydrering, DMI-bulk, fulde gates, Supabase og deploy; `rr-20260815122446-210` har aktuel verificeret strøm i 210/210 og 41 strømtrin i hver af de 27 tidligere berørte zoner.
- [ ] Kommende modelrotationer skal eftermåles, indtil et konkurrerende sent par faktisk udløser `CURRENT_ANCHOR_PROTECTED`; den første produktion valgte NSBS uden denne konkurrence.

## 4.0.217 – samme verificerede prøve i 24- og 72-timersvinduer

- [x] Produktionsartifact #2750 er målt: 210/210 zoner har 142 prøver og 35,1 timers rå historie.
- [x] Rodårsagen til den ujævne verifikationshistorik er lokaliseret til efterberigelse af kun `samples24h`.
- [x] Den eksakte aktuelle prøve synkroniseres til begge vinduer efter eksisterende DMI-U/V-verifikation.
- [x] Regressionen bevarer ældre `false`, afviser uverificeret ny strøm og beviser akkumulering over successive merges.
- [x] Auditten måler nu faktisk tidsspænd, største hul og verificeret andel.
- [x] Målrettede historik-/provenienstests, 210-zonesimulering, versionskontrol, RDKS og lokal releasegate består.
- [x] Fuld lokal `validate` stopper som forventet fail-closed ved repositoryets historiske 211-zonegrundlag mod den centralt effektive bestand på 210; forskellen er ikke omgået.
- [x] #31882866344 beviser central 210-zonehydrering, fulde gates, Supabase, deploy og første fremadrettede vækst: datasæt `rr-20260815114746-210` fordelte verificerede 72-timersprøver som 102×1, 98×2 og 10×102.
- [ ] Eftermålingen fortsætter til mindst 72 faktiske timer; fortid udfyldes ikke bagudrettet.

## 4.0.216 – progressiv offentlig vejrindlæsning

- [x] Byteaudit dokumenterer den deployede flaskehals i hovedzoneprognoser og lokale kystdelsdata.
- [x] Startpakken bevarer aktuelle scorer, kompakt historik, flowpunkter og aktuelle vindende kystdele for begge jagtformer.
- [x] Detaljepakken bevarer alle femdøgnstimer og alle lokale kystdele.
- [x] Manifest, klient og regression afviser datasetblanding.
- [x] Browserkontrol med frisk 210-zonedata viser kort/rangliste, færdig prognose, zonepanel og nul browserfejl.
- [x] Lokal `release:gate` og målrettede runtime-, historik-, versions-, RDKS- og browsertests består. Fuld lokal `validate` stoppede fail-closed ved repositoryets historiske 211-zonegrundlag og blev derfor ikke omgået.
- [x] #31880984004 bestod efter central adminhydrering den fulde 210-zonekæde med `validate`, releasegate, Supabase/artifact og Pages-deploy.
- [x] Direkte deploykontrol viste 4.0.216, datasæt `rr-20260815110313-210`, 210 zoner, 2.534.969 bytes startpakke og 24.748.808 bytes komplet detaljepakke.

## 4.0.215 – privat besøgsstatistik

- [x] Sidevisninger og browserbesøg er adskilt uden vedvarende besøgsidentitet.
- [x] Kun én aggregeret Supabase-række pr. dag gemmes; rå person- og browserdata er udeladt.
- [x] Ejerbeskyttet rapport viser periode, dagstal og separat antal login-konti.
- [x] Offentlig registrering er efter normal appstart og fail-open.
- [x] Målrettet kontrakttest dækker sessionstælling, dataminimering, kontotal og ikke-blokerende opstart.
- [x] Databasemigrationen er installeret og testet mod den offentlige RPC; de to afgrænsede testbesøg er fjernet igen.
- [x] #31876816700 bestod fuld frisk CI/deploy; direkte kontrol viste 4.0.215 og første rigtige produktionsoptælling på 1 sidevisning/1 browserbesøg.
- [x] Den private rapport viste dagstallet og 2 oprettede/2 aktive login-konti med korrekt forklaring af browserbesøg.

# Tidligere status: 4.0.214 – fail-closed genopbygning af havoverfladetemperatur

## 4.0.214 – fail-closed genopbygning af havoverfladetemperatur

- [x] #31873118298 afviste 756 nye dybdelagsmeddelelser og bestod hele releasekæden.
- [x] Artifactet afslørede ældre cachede temperaturtimer uden lagproveniens; 4.0.213 var derfor kun første halvdel af rettelsen.
- [x] Parser 16 fjerner umærkede/ikke-overflade temperaturtimer fail-closed og prioriterer manglende overfladetemperatur i DKSS-rotationen.
- [x] Øvrig vejrhistorik bevares; kun uverificeret temperatur kasseres.
- [x] Artifact #2777 beviser genopbygning i alle relevante modeller: 116 IDW-, 71 NSBS- og 23 LF-zoner samt 9.159/9.159 native temperaturtrin med `surface:0` og nul lagafvigelser.
- [x] #31874335007 bestod frisk DMI, fuld validering, releasegate, Supabase og Pages og leverede datasæt `rr-20260815083802-210`.
- [x] Den fælles P1-komponentmatrix og regressionsplan er dokumenteret for vind, bølger, strøm, vandstand og vandtemperatur.
- [ ] Det fulde virkelige 72-timersvindue afventer fortsat måling.
- [x] Numeriske overgangsfejl er målt på #31874335007 og sammenholdt med almindelige timer for alle fem komponenter.
- [x] Overgangsmålingen er gentaget på 4.0.214, 4.0.217 og en fuld DMI-rotation i 4.0.218; hovedmønstret er stabilt og dokumenteret i `P1_SOURCE_TRANSITION_REPEAT_4.0.218.md`.
- [ ] Permanente regressionsgrænser kræver fortsat flere forecastcyklusser pr. komponent: 4.0.218 gav en ny NSBS-cyklus, men ikke nye HARMONIE-/WAM-cyklusser eller en færdig ny Limfjordscyklus; det fulde virkelige 72-timersvindue afventer også.

## 4.0.213 – entydig DMI-havoverfladetemperatur

- [x] 4.0.212-supportartifactet dokumenterer DMI-parameter 80 ved både `surface:0` og mange `depthBelowSea`-lag i alle tre DKSS-collections.
- [x] Den tidligere skalarkæde kunne overskrive samme zone/time i GRIB-rækkefølge og bevare det sidst læste dybdelag uden lagidentitet.
- [x] Kun `surface`, niveau 0, accepteres nu som offentlig vandtemperatur; dybere lag afvises fail-closed.
- [x] Temperaturens grid- og timeproveniens gemmer `verticalLayer: surface:0`.
- [x] Parsergeneration 15 tvinger kontrolleret genbehandling af den aktuelle DMI-cache.
- [x] Målrettede parser-, grid-, forecast-, null- og historiktests består lokalt.
- [x] Senere fuldt gated produktion til og med #31889559758 beviser genopbygget overfladetemperatur, bevaret strøm/vandstand, supportartifact, Supabase og Pages.
- [ ] Den separate tidligere 15-timers hale er reduceret til fire viste timer i artifact #2777: otte Limfjordszoner har 114 mod 118 temperaturtimer. DEC-0030-horisontanalysen forbliver åben.

## 4.0.212 – komponentkorrekt DMI-modelskift

- [x] Produktionsforløbet #31856214946 → #31856697202 → #31857361460 → #31858042990 dokumenterer præcis overgang fra 210 til 183 zoner med aktuel strøm.
- [x] De 27 berørte zoner er én fælles NSBS-regression: 38 strømtrin blev reduceret til ét sent trin, ikke 27 uafhængige geografiske huller.
- [x] Skalare marinefelter kan ikke længere genvælge en eksisterende autoritativ havmodel eller omskrive strømvalgets score.
- [x] Et bedre fælles strøm-U/V-par kan fortsat skifte model; regressionstesten dækker begge sider.
- [x] #31870747677 genlæste NSBS én gang, bestod fulde gates/Supabase/Pages og dokumenterede verificeret aktuel strøm i 210/210 zoner.
- [x] Alle 210 zoner når mindst 100,8 timers sammenhængende marinehorisont; 27 har 37 strømtrin, 183 har 38.
- [ ] DEC-0030 skal forklare og designe de sidste cirka 17–19 timer fra 100,8 til reel 118–120-timers strømkæde.
- [ ] 131 rå historikprøver pr. zone er bevaret; eftermålingen fortsætter, indtil et fuldt 72-timers vindue er dokumenteret.

## 4.0.211 – bevaret DMI-havmodel og genbehandling

- [x] #31854174281 bestod fuld releasekæde og deployede 4.0.211.
- [x] #31855164652 genopbyggede den næste DMI-havmodel, bestod fuld validering/releasegate/Supabase/Pages og gav verificeret aktuel strøm i 210/210 zoner.
- [x] 210/210 zoner bevarede `marineSelection`, og alle havde 107 rå `samples72h`-prøver efter den efterfølgende kørsel.
- [ ] De 75 zoner, som først blev verificeret i #31855164652, følges gennem 72 timer; verificeret historik måles uden bagudrettet udfyldning.
- [ ] DEC-0030 klassificerer de 89 zoner under 96 timers marinehorisont. Aktuelt minimum er cirka 70,8 timer, og kun 121/210 når mindst 96 timer; cirka 120 timer er fortsat målet.
- [x] 4.0.210 efterkontrol dokumenterer, at diagnosen fandt hullerne, men alle 39 aktuelle IDW-/NSBS-filer blev sprunget over som tidligere behandlet.
- [x] `marineSelection` bevares nu gennem cachemerge.
- [x] Legacy-cache rekonstrueres fra faktisk collection, gitterafstand og kysttype; produktionsartifactet giver 1.138 gendannede valg.
- [x] En dårligere havmodel kan ikke længere rydde en bevaret autoritativ serie.
- [x] Behandlingssignaturen er hævet, så aktuelle DMI-filer genlæses præcis én gang under migrationen.
- [ ] Frisk produktion skal bevise forbedret strømserie, fuld validate, releasegate, Supabase, artifact og deploy.

## 4.0.210 – sammenhængende DMI-strømdækning
- [x] Produktionsartifactet er målt: 125 zoner havde kun to sene strømtrin, 75 havde syv sene trin, og 10 havde fuld serie fra nutiden.
- [x] Rodårsagen er lokaliseret til schedulerens horisontsmål, som brugte sidste gyldige tidspunkt uden at kontrollere start eller interne huller.
- [x] Dækning kræver nu en sammenhængende serie fra nutiden ved den native DMI-cadence.
- [x] Regression afviser en fjern prognosehale og et internt hul som komplet dækning.
- [x] Den korrigerede scheduler prioriterer `dkss_idw` og `dkss_nsbs` for de 200 dokumenterede hovedzonehuller.
- [ ] Frisk produktion skal bevise genhentning, fuld validate, releasegate, Supabase, artifact og deploy.
- [ ] Mindst 72 timers eftermåling skal dokumentere, hvor mange zoner der opbygger verificeret strømhistorik; reelle geografiske DMI-huller forbliver missing.

## 4.0.209 – længere historik og vandstandsproveniens
- [x] 4.0.208-artifactet er målt til 101 prøver/cirka 24 timer i alle 210 zoner.
- [x] Separat 72-timers pipelinehistorik er implementeret; aktiv score og `shadow-v2` bruger fortsat kun 24 timer.
- [x] Regression beskytter 72/24-adskillelsen og udelader begge rå vinduer fra `public-conditions.json`.
- [x] Vandstands-continuity bevarer den oprindelige DMI-identitet.
- [x] Målrettede retention-, current-history-, water-continuity- og forecast-store-tests består lokalt.
- [x] 4.0.209 er produktionsverificeret i #31852633877 med retention, provenance, artifact, Supabase og deploy; alle 210 zoner startede `samples72h` med 102 prøver.
- [ ] Providerskift analyseres videre under DEC-0030; ingen kilde-, merge-, fallback- eller scoreændring er inkluderet.

## Lokal validering og centralt effektiv zonebestand

- [x] Stale lokale `conditions.json`-data klassificeres særskilt fra en aktuel zone-/vejrdækningsfejl.
- [x] Dækningsgaten er fortsat fail-closed; den springer hverken manglende eller ukendte zoner over.
- [x] Atomisk mismatch mellem lokalt manifest og conditions er fortsat en hård fejl.
- [x] Skrivebeskyttet `audit:deployed-zone-weather` sammenholder deployet `zones.geojson` og `public-conditions.json` og kontrollerer eksplicit alle tre Vadehavszoner.
- [x] Direkte produktionsaudit 15. august 2026 gav 210/210 og vejrdata til `DK-B04-12`–`DK-B04-14`.
- [x] Den gamle 211-formulering i kendte issues er markeret erstattet: Fejø/Femø og Havnø/Mariager Fjord øst er centralt slettede; den effektive bestand er 210.
- [x] 4.0.208 er produktionsverificeret i #31848912461 på commit `7a3382f200a72b702d814ba4d8ca205dc4523369`: central adminhydrering/tombstones, frisk vejrbygning, fuld validering, releasegate, Supabase, artifact og deploy bestod. Direkte efterkontrol viste 4.0.208 og 210/210 med alle tre Vadehavszoner.

## Admin land/hav og manuel ejerreview

- [x] Beslutningen om præcis ét autoritativt punktpar pr. aktiv kyststrækning er registreret i DEC-0037.
- [x] **Sæt nyt havpunkt** og **Sæt nyt landpunkt** er fjernet fra editoren.
- [x] Trækbare eksisterende markører, rød hav→land-pil, geometrikontrol, central readback og DMI-/releasevalidering er bevaret.
- [x] Regressionstesten afviser genindførelse af de fjernede knapper og beskytter fortsat træk- og runtime-roundtrip.
- [x] 4.0.207 er produktionsverificeret i #31845836107: frisk vejrdata, fuld projektvalidering, releasegate, Supabase-synkronisering, artifact og Pages-deploy bestod.
- [ ] Ejeren gennemgår senere alle zoner manuelt og vælger et repræsentativt punktpar på bugtede strækninger. Opgaven kan udføres gradvist og blokerer ikke uafhængige roadmapopgaver.
- [ ] Den manuelle gennemgang skal være afsluttet før endelig faglig godkendelse af alle lokale scorer og domæne-/brugerrelease.

## Fallback efter fuld national kæde

- [x] Målrettet central roundtrip/rollback bestod i #31822371489.
- [x] 4.0.205 blev produktionsverificeret i #31822335540 med frisk DMI, fulde gates, central synkronisering og deploy.
- [x] Privat #31822748625 bestod hele den nationale hovedkæde og central create/read/update/delete/rollback før fallbacktrinnet.
- [x] Den dokumenterede clean-runner-fejl er rettet: fallbackbyggeren opretter selv alle outputmapper.
- [x] Byggeren kan genbruges efter tidligere aktivering ved at anvende centralt aktive naborester i stedet for slettede historiske del-ID'er.
- [x] Eksisterende validerede punktpar og deres retning bevares eksakt; manglende retning stopper fail-closed.
- [x] ESA WorldCover 10 m er genkørt på den aktuelle 17-dels kandidat med samme 11 verificerede, fire rettelser og to blokerede dele.
- [x] Ren lokal fallbackslutkæde består med 2/2 ejerskabsflytninger, 9/9 erstatninger og nul overlap.
- [x] 4.0.206 er produktionsverificeret i #31831068809 med progressiv DMI-færdiggørelse, frisk vejrbygning, fulde gates, Supabase, artifact og Pages-deploy; live runtime har 210 zoner og alle tre nye Vadehavszoner.
- [x] Privat #31829349458 beviser fallback-DMI, slutvalidering, nul overlap, central roundtrip/rollback og begge artifacts som del af hele den friske nationale kæde.
- [ ] Privat geometri må kun aktiveres efter særskilt ejerafgørelse.

## Supabase og privat national slutkontrol

- [x] Offentlig 4.0.204 er fuldt produktionsverificeret i #31815039302.
- [x] Privat #31815423082 har bevist hele den nationale kæde frem til og med endelig shadow-score, score-neutralt ejerreview og slutaudit for 835 dele.
- [x] Den eneste fejl er lokaliseret til første beskyttede `direction-reviews`-læsning: HTTP 401 / `PGRST303` fra Supabases interne secret-key-oversættelse.
- [x] Nye `sb_secret_`-nøgler sendes kun som `apikey`; en fælles requester genprøver kun den dokumenterede `PGRST303` én gang og stopper ellers fail-closed.
- [x] Python-hydreringen før DMI følger samme snævre retryregel og stopper GitHub Actions ved central læsefejl i stedet for at fortsætte på historiske repositorydata.
- [x] Beskyttet manifestsync kan ikke længere omdanne en læsefejl til “manifest mangler” og dermed udløse unødvendige Supabase-skrivninger.
- [x] Lokal regression dækker headerkontrakt, præcis én genprøvning, vedvarende/andre auth-fejl, kvotebeskyttet manifestlæsning og at målrettet workflow ikke kan deploye.
- [x] Målrettet CI-roundtrip mod artifactet fra #31815423082 bestod i #31822371489.
- [x] Privat #31822748625 beviste roundtrip/rollback i den fulde friske kæde; fallbacktrinnets clean-runner-fejl er afgrænset og rettet i 4.0.206.
- [ ] Privat geometri kan fortsat kun aktiveres efter særskilt ejerafgørelse; offentlig RavScore og geometri er uændrede.

## Effektiv national zonebestand

- [x] Central ejerbeslutning om sletning af Fejø/Femø giver 210 effektive aktive hovedzoner.
- [x] National plan, topologiaudit, delgenerator, stednavneaudit, validatorer og regressionstest bruger samme 210-zonekontrakt.
- [x] Lokalitetsopdelingen bruger også 210 og kan ikke længere stoppes af den historiske 208-konstant.
- [ ] Frisk privat national kørsel skal bekræfte hele kæden efter politikrettelsen.

## National land-/vandaudit og rettelse

- [x] 673 aktive lokale kystdele er kontrolleret mod uafhængig 10 m landdækning ved flere afstande fra den præcise kyst.
- [x] 434 punktpar er verificeret korrekte, 121 er dokumenteret omvendte, og 118 er bevaret som tvetydige uden automatisk gæt.
- [x] De 121 rettelser har reproducerbar evidens og nye vinkelrette land-/vandpunkter.
- [x] Admin viser rød hav→land-retning og kræver kystkryds, modsatte sider og højst 20 graders afvigelse fra vinkelret før godkendelse.
- [x] Produktionsbyggeren beregner pålandsretningen geodætisk fra punktparret; et gammelt gemt retningstal kan ikke tilsidesætte markørerne.
- [x] Den private nationale workflow anvender rettelserne før både første og endelige punkt-/DMI-validering.
- [ ] Frisk privat national GitHub-kørsel skal bevise DMI-grid, score-neutralitet, runtime og rollback for rettelseskandidaten.
- [ ] De 118 tvetydige kystdele skal samles i en særskilt manuel kontrol efter alle automatiske gates er afsluttet.

## Tidligere 4.0.195-status

## Admin land/hav

- [x] Hvert hovedzonevalg invaliderer kortstørrelsen, rydder tidligere lag og zoomer til den nye zones aktive kystdele.
- [x] Valgt kystdel, øvrige dele samt eksisterende land- og havpunkter tegnes med entydige roller.
- [x] Forsinkede kortcallbacks fra et tidligere valg kan ikke overskrive det seneste valg.
- [x] **Vis på hovedkortet** er fjernet; editorens arbejdskort er den eneste relevante visning.
- [x] Kortets geografiske grænser beregnes og anvendes før første vektorlag tilføjes; reproduceret Leaflet-fejl er væk i isoleret browserkontrol med produktionsdata.

## Lokal DMI, score og forklaring

- [x] Rodårsag dokumenteret: schedulerens dækningsnævner udelod 651 aktive lokale kystdele.
- [x] Hovedzoner og kystdele indgår nu i samme faktiske DMI-recovery.
- [x] Lokale scorer kræver lokal strømretning og -hastighed; manglende lokal sammenligning falder sikkert tilbage til hovedzonescoren uden geografisk påstand.
- [x] Fuld scoreforklaring, lokalt vejr, lokalt punktpar og lokal pålandsretning føres til offentlig runtime/debug.
- [x] 4.0.193 indførte historisk mindst 95 % verificeret lokal U/V-dækning og forbud mod overpublicering. Procentgrænsen er erstattet af 100 %-gaten i 4.0.232; overpubliceringsforbuddet består.
- [x] #31764453987 bestod frisk data, fuld validering, releasegate og deploy for 4.0.193-kodekæden før geometriaktivering.
- [x] Den historiske 95 %-indfasningsopgave er lukket som erstattet; nye releases kræver alle aktuelle dele under REQ-CURRENT-COVERAGE-100-001.
- [x] #31764957646 stoppede før deploy ved central manifestreadback, fordi aktiveringsstatus ikke matchede den eksisterende `owner-approved-*`-promotionskontrakt. Status og portabel rollbacksti er rettet uden at svække hash/readback.
- [x] Alle 651 aktive punktpar er auditeret mod eget kystreferencepunkt og lokal tangent: 13 afvigelser; privat reparationskandidat giver 0.
- [x] Vedvarende retningsskift er auditeret afstandsbaseret. En konservativ kandidat opdeler 10 hidtil enkelt-delte hovedzoner til i alt 673 lokale dele; Helgenæs bliver tre fysisk forskellige sider.
- [x] Kandidatens 673 punktpar består den samme geometriaudit med 0 afvigelser. Private kontrolbilleder er genereret og kontrolleret for alle 10 zoner.
- [x] Privat GitHub Actions #31764242827 validerede alle 45 ændrede eller nye vandpunkter mod DMI's native grid: fuld dækning og 0 ugyldige punkter.
- [x] Kandidaten er lokalt aktiveret som 673-dels pakke med versionsstyret rollback til 4.0.192/651 dele.
- [ ] Rejsby/Ribe Vesterå er ikke automatisk opdelt, fordi ét lokalt land-sidevalg er tvetydigt. Den nuværende del bevares frem for at gætte.
- [x] Målrettede regressioner for offentlig runtime, delscoreforklaring, kortvisning, adminredigering, ejerskab og aktivering består lokalt.
- [ ] Offentlig brugerflade, ydelse og Supabase-forbrug skal efterkontrolleres på den deployede 673-dels pakke.

## Tidligere 4.0.192-status

## Samlet land-/vandeditor
- [x] Søg hovedzone og vis alle tilhørende aktive kyststrækninger på ét kort.
- [x] Træk det eksisterende autoritative land-/havpunktpar; oprettelse af ekstra punktpar er bevidst fjernet i 4.0.207.
- [x] Central godkendelse med readback og kystdel-ID-bundet runtime-roundtrip.
- [x] DMI-signatur og sampling bruger den byggede aktive kystdelskontrakt med administratorens godkendte punktrettelser.
- [x] Eksisterende filterrækkefølge, centrale kladder og godkendelsesflow er bevaret; det overflødige hovedkortlink er fjernet efter ejerbeslutning.
- [ ] Frisk GitHub-kørsel skal bestå fuld DMI-, validerings-, release- og deploykæde.

## Stabil DMI-sampling-signatur

- [x] #2435/#2437-supportpakker er sammenlignet: signaturen skiftede fra `9c6f8338bfbe0491` til `ae6c3199488d784f` alene sammen med den løbende kilderegistrering.
- [x] Flygtige stations-, observations-, forecast- og versionsfelter er fjernet fra kompatibilitetssignaturen.
- [x] Faktiske samplingændringer i zone, kystdel eller vandkilde er fortsat signaturbrydende.
- [ ] Frisk GitHub-kørsel skal oprette den nye semantiske cache; den efterfølgende ikke-overlappende kørsel skal bevise genbrug og rotation væk fra tidsafbrudt `dkss_idw`.

## DMI-checkpoint bevares som faktisk arbejdsfremdrift

- [x] #2429–#2431 er analyseret som gentagen genstart fra forkert cachegrundlag.
- [x] Nyeste kompatible checkpoint vinder nu over en ældre offentlig cache, selv hvis udløbsrensning har reduceret antallet af rå komponentrækker.
- [x] Offentlig data er fortsat flettet ind i checkpointet ved hver kørsels start; ingen gyldig fallback eller releasegate er fjernet.
- [ ] Frisk GitHub-kørsel skal bevise, at rotationsstate overlever til næste runner, at DKSS-modellerne faktisk skifter, og at 125/210-dækningen vokser.

## DMI-budgetrotation efter fastlåst 125/210-mønster

- [x] #2423–#2426 er analyseret som et gentaget scheduler-loop, ikke som enkeltstående DMI-fejl.
- [x] Tidsafbrudte DKSS-samlinger registreres i den private collection-state og roterer bag ikke-forsøgte/ældre afbrudte marinemodeller.
- [x] Markeringen nulstilles ved fuld eller dokumenteret uændret gyldig samling.
- [x] Målrettede scheduler-, marine-first-, cache- og syntakstests er grønne lokalt.
- [ ] Frisk GitHub-kørsel skal bevise, at andre DKSS-samlinger nås, dækningen vokser fra 125/210, og den uændrede strømaudit til sidst består.

## Progressiv DMI-recovery uden offentlig bypass

- [x] Dokumenteret gentagen fejl: 85/210 hovedzoner med verificeret aktuelt marine U/V-par.
- [x] Dokumenteret, at fejlen også fandtes før 4.0.187 og ikke skyldes de seks kystzoner.
- [x] Privat progressiv `dmi-bulk-cache.json` gendannes før DMI-builderen og gemmes før fuld validering.
- [x] Kun en vellykket cache med aktuel registersignatur kan fortsætte; senest deployede cache bevares som kompatibel fallback, og fejl/afbrydelser gemmes ikke.
- [x] Offentlig Pages-artifact/deploy kræver fortsat alle eksisterende gates.
- [ ] Friske GitHub-kørsler skal bevise voksende dækning og til sidst grøn current-spatial audit.
- [x] Land/hav-admin er i 4.0.192 opdateret til lokale kystdele med eksisterende filterrangering bevaret; produktionsverifikation afventer den friske fulde GitHub-kæde øverst i dokumentet.

## Fem-zoneaktivering

- [x] Fem visuelt godkendte zoner er indarbejdet i den aktive præcise kystpakke.
- [x] Fejø/Femø (`DK-B10-16`) er fjernet fra zoneregister og kystpakke.
- [x] Den centrale Supabase-sletning er skrevet og læst tilbage som `deleted: true` i `direction-reviews` version 315.
- [x] Rollback til den tidligere 4.0.182-kyst er versionsstyret.
- [ ] Fuld lokal validate/releasegate.
- [ ] Frisk GitHub Actions-kørsel og offentlig verifikation.

- [x] DEC-0036 låser det aktive arbejde til de seks navngivne fallbackzoner og adminværktøjet. Den fejlagtigt udvidede landsdækkende pipeline er stoppet som arbejdsretning og må ikke genoptages uden ny udtrykkelig ejergodkendelse.
- [x] Admin-endepunkter kan trækkes til en eksisterende valideret nabokystdel.
- [x] Viskelæder deaktiverer/gendanner en hel del og dens punkt-/DMI-kontrakt samlet.
- [x] Central schema-4-readback validerer både ejerskab og deaktiveringer.
- [x] Produktionsbyggeren publicerer ikke centralt deaktiverede dele.
- [x] Privat fallbackrecovery bevarer `DK-B02-14` som slettet. Den korrigerede kandidat har 22 mål-/naborester, 22/22 punktpar og nul overlap; hele flytninger, der tømte nabozoner, er forkastet.
- [x] En separat, ikke-deployende seks-zoneworkflow validerer den låste plan og kandidatens vandpunkter på DMI's native grid; den starter ingen national genopbygning.
- [x] Fallbackrecovery og native DMI-gridkontrol er koblet på den eksisterende private nationale Linux-kørsel og uploader kun ikke-aktiverbare QA-artifacts.
- [x] Den nationale planport er opdateret fra den historiske 208-zonebestand til den aktuelle eksplicitte politik på 211 zoner; downstream-kildegater sammenligner bestandene indbyrdes i stedet for at skjule drift med en løs konstant.
- [x] #31589831140 bekræftede plan, officiel kildehentning, kilde-QA og fjord-/normasker for 211 zoner. Den efterfølgende topologiaudit og delgenerator er nu også afstemt til 211 med matchende validatorer og regressionstests.
- [x] #31590992368 bekræftede 211 zoner og 131 fliser gennem topologi, dækningsaudit og delgenerator. Stednavnegaten følger nu planens faktiske fliseantal og bevarer komplet requestkontrol uden den forældede 100-fliseantagelse.
- [x] Privat #31609637964 bestod 22/22 native DMI-gridvalg, den deaktiverede 656-dels/211-zoners runtime, uændrede zoner uden for det godkendte område og rollback-isolation.
- [ ] Ejeren skal visuelt godkende seks-zonekontrolkortet. Shadow-score og offentlig releasegate følger først derefter; automatisk aktivering er fortsat forbudt.

## 4.0.185 – produktionsverificeret

- [x] Offentlig “Hvad fandt du?”-formular fjernet uden at slette tur-/observationsinfrastruktur.
- [x] “Hvor er det?” tegner eksisterende kystdele ved klik, viser navne og zoomer til hovedzonen.
- [x] Kortvisningen kræver ingen nye billeder eller ekstra datahentning ved opstart.
- [x] GitHub Actions #31578272122 bestod frisk datakæde, fuld validering, releasegate og Pages-deploy; offentlig 4.0.185-kode er kontrolleret for knap, kortlag, zonezoom og fravær af fundformular.

- [x] Fælles lokal scoreresultatbygger bevarer totalscore, delscorer, begrundelser og geografisk dækning.
- [x] Én eller flere bedst scorende kystdele vises tydeligt ved en spredning over 7 point; præcis 7 point gælder fortsat hele zonen.
- [x] Aktuel zone og femdøgnsvisning anvender samme lokale resultatkontrakt.
- [x] Offentlig 4.0.183-runtime er systemisk auditeret: 412/412 aktuelle visninger kan bygges komplet, uden manglende vinder eller scoreuoverensstemmelse.
- [x] GitHub Actions #31575562432 bestod frisk datakæde, fuld validering, releasegate og Pages-deploy; den offentlige 4.0.184-runtime er efterkontrolleret på Reersø og Mullerup.

- [x] Interne sorte kystdelsmarkeringer er fjernet; ét gensidigt nærmeste møde mellem to forskellige hovedzoner giver ét skel.
- [x] Sorte skel skaleres ned ved landszoom, og tilbage-knappen gendanner Danmarksoverblikket.
- [x] Admin kan flytte en eksisterende præcis kystdel til en anden aktiv hovedzone. Delen beholder geometri, land-/vandpunkt, gridbevis og del-ID gennem public runtime og scoring.
- [x] Runtime afviser ukendte/slettede modtagere, publicerer en del én gang og filtrerer rester fra slettede hovedzoner.
- [x] GitHub Actions #31572312647 bestod fuld bygge-, data-, release- og Pages-kæde; 4.0.183 er produktionsverificeret.

- [x] Ejeren har godkendt national slutkontrol og de seks sidste rettelser.
- [x] Den frigivelsesklare bestand er 643 interne dele under 212 hovedzoner; 206 hovedzoner har præcis kyst og seks bruger sikker legacy-fallback. Der er nul tværzoneoverlap og nul uafklarede relevante huller.
- [x] Alle 643 dele har land-/vandpunkter; 632 har fuldt og 11 delvist marint gridbevis. Privat #31532688885 bestod DMI for alle 39 nye eller ændrede punktpar.
- [x] Privat #31533385967 bestod deaktiveret runtime, public-kontrakt og central admin-roundtrip/rollback uden ændring af beskyttede poster.
- [x] #31541126136 produktionsverificerede 4.0.182 med frisk DMI, fuld projektvalidering, release-gate, central Supabase-readback, Pages-artifact og deploy. Direkte onlinekontrol bekræftede 211 effektive hovedzoner, 643 kystdele under 206 præcise zoner, alle tre Vadehavszoner med vejrdata og et synligt fejlfrit kort.
- [x] Første releaseforsøg #31536061680 dokumenterede, at den historiske 4.0.48-generator fjernede de tre nye Vadehavszoner før validering. Generatoren bevarer nu eksplicit de godkendte tilføjelser; intet blev deployet fra den fejlede kørsel.
- [x] Andet releaseforsøg #31537882402 dokumenterede, at den ældre centrale aktiveringsmanifest overskrev den nyere ejer-godkendte 4.0.182-manifest før vejropbygningen. Central sync bevarer nu kun en semantisk nyere, eksplicit ejer-godkendt repositoryaktivering; ved samme eller ældre version er Supabase fortsat autoritativ, så admin-rollback bevares. Intet blev deployet fra den fejlede kørsel.
- [x] Tredje releaseforsøg #31539597870 beviste den rettede engangspromotion, frisk DMI og central vejrskrivning, men en ældre kildekodetest forventede den tidligere komprimerede Python-formatering og stoppede fuld validering. Testen matcher nu den faktiske nøgle-/stikontrakt uafhængigt af sikker formatering; intet blev deployet.

## National kystgeometri v2 – datakæde verificeret, offentlig kortvisning rettes
- [x] Ejeren har godkendt det private seks-zoners korrektionskort. Den versionsførte godkendelse tillader samling og audit, men ikke automatisk produktion eller scoreaktivering.
- [x] De seks godkendte rettelser er samlet med den additive kandidat til 206 præcisionsdækkede hovedzoner og 643 dele. En korrigeret symmetrisk overlapgate fjernede 11 oversete additive dubletdele; tre helt dublerede præcisionszoner faldt sikkert tilbage til deres hovedzonelinje. Tværzoneoverlap er nu nul, og hulauditen har nul uafklarede relevante huller.
- [x] Alle 643 dele har land-/vandpunkt; 39 nye eller ændrede dele er genereret uden blokering, mens 604 eksisterende punktpar genbruges.
- [x] Privat #31532688885 beviser native DMI-dækning for den endelige 39-punktsbestand: 39 fulde, nul delvise og nul blokerede.
- [x] Den score-neutrale vejridentitetskontrakt er bygget på det komplette kommende register med 212 hovedzoner.
- [x] Den versionslåste 643-dels kandidat bestod privat runtime-/releaseintegration i #31533385967 og blev efter ejerens godkendelse produktionsverificeret i #31541126136.
- [x] Den autoritative otte-zoners ejerfil `(4)` er versionsført og anvendt fail-closed. Seks bevarede/rettede kandidater er samlet i et privat korrektionskort; to fejlagtige præcisionsforslag er forkastet uden at slette deres eksisterende hovedzoner.
- [x] Vadehavsforslaget sammenholdes nu med hele den additive 650-dels kandidat, så den eksisterende Emmerlev-geometri ikke dobbeltregistreres. Den private Vadehavstilføjelse er 81,883 km efter denne deduplikering.
- [x] Ejeren har kontrolleret og godkendt det lille seks-zoners korrektionskort; godkendelsen er versionsført fail-closed.
- [x] Den manglende relevante fastlandskyst langs Vadehavet fra Emmerlev til Esbjerg er fundet som en ejerskabsfejl. Det rettede private forslag er 81,883 km uden Rømødæmning, økyster eller runtime-overlap. To ejerbestemte forbindelser på samlet 4.671,4 meter er eksplicit dokumenteret som manuelle broer og må ikke beskrives som direkte GeoDanmark-geometri.
- [x] Privat #31480089490 genbyggede den friske centralt hydrerede landskæde og bestod geometri, 605/605 land-/vandpunkter, 605/605 DMI-gridvalg, flertrinsserier, isoleret state/historik, lokal vind, shadow-score og central admin-roundtrip/rollback.
- [x] Slutbestanden er 605 lokale kystdele i 190 hovedzoner, nul fysiske overlap og 594 fuldt plus 11 delvist marinedækkede dele. Den sidste tætte ejerskabsbeslutning ved Orehoved tilhører Falsters nordkyst, ikke Bøgestrømmen vest.
- [x] Ejeren har 11. august 2026 givet udtrykkeligt go til aktivering på testdomænet. De 605 dele, 605 punktpar og deres DMI-gridbevis er versionslåst med SHA-256.
- [x] Det almindelige DMI-bulkjob sampler delene i allerede downloadede GRIB-felter uden ekstra netkald pr. del. De 605 dele ændrer ikke schedulerens 208-zoners dækningsnævner.
- [x] Score beregnes lokalt pr. del og tidspunkt. Bedste gyldige del bærer hovedzonens score; en 7-punktsmargin afgør hel zone, én del eller flere dele. Manglende lokal sammenligning bliver `uncertain`; gammel hovedzonescore bruges ikke som fallback.
- [x] Den offentlige kortvisning bruger de nye kyststreger. Central `coastal-parts-v2-activation` kan slå aktiveringen fra igen uden at slette den tidligere hovedzoneruntime.
- [x] #31491319173 beviste 605 offentlige kyststreger, fulde Linux-gates, Supabase-readback, Pages-artifact og deploy for 4.0.176.
- [x] Online audit fandt fail-closed 0/605 lokale scorer og workflowloggen dokumenterede separate gridopslag som årsag. #31493787424 viste derefter, at 4.0.177's ecCodes-flerpunktsfunktion stadig gentog den dyre søgning internt og færdiggjorde nul trin.
- [x] #31495844161 beviste 4.0.178's indeks: otte HARMONIE-trin, 44 WAM-trin, 543/605 lokale scorer i alle 190 zoner, fulde gates, central readback og deploy.
- [x] #31497361674 beviste fire kandidatceller, fulde gates, central readback og deploy; online steg dækningen til 592/605 i alle 190 zoner.
- [x] De sidste 13 kræver mere end fire naboceller. 4.0.180 genbruger den private vindgates dokumenterede 32-celle-retrygrænse og kræver fortsat fælles gyldig U/V.
- [x] #31498481482 bestod fulde gates, central readback, artifact og deploy. Onlinekontrollen viste lokal score til 605/605 dele i alle 190 hovedzoner.
- [x] Rodårsagen til det uoverskuelige kort er dokumenteret: `mapZoneCollection` gjorde hver intern del til en synlig zone, og `renderZones` tilføjede to sorte endemarkeringer samt casing, farvelinje og klikflade pr. del.
- [x] 4.0.181 fjerner denne projektion. Kortet modtager igen de oprindelige hovedzoner; lokale scorer læses fortsat fra `conditions.coastalParts`.
- [x] #2279 (`31505747519`) bestod frisk DMI-kæde, fuld Linux-validering, release-gate, Pages-artifact og deploy. Offentlig browserkontrol viste 208 centralt aktive hovedzoner og præcis 416 endemarkeringer.
- [x] Målrettede aktiverings-, public-runtime-, zoom- og scorepræsentationstests består. De 605 multipart-beregningsdele blev tidligere til 2.488 synlige linjer og cirka 12.440 Leaflet-objekter. Lokal browserkontrol viser nu 209 aktive hovedzonelinjer, cirka 1.045 kortobjekter og præcis 418 endemarkeringer – to pr. zone.
- [ ] Frisk produktion skal bevise farver, tooltips, klik, indlæsning og kun to synlige endemarkeringer pr. hovedzone.
- [ ] Auditér beregningsdækningen mod kendte relevante ravstrande; synlig hovedzonekyst og skjult beregningsdækning må ikke forveksles.
- [x] Rodårsagen til flere manglende præcise hovedzoner er identificeret: den private kildeplan valgte fliser fra den gamle kystlinje i stedet for zonens fulde ejerskabsområde.
- [x] Lokal plan- og analysetest dækker nu hele ejerskabsområdet (128 fliser for den seneste 208-zonebestand) og begrænser bred recovery til de 18 aktive hovedzoner uden præcise dele. De 190 repræsenterede zoner genbruger eksisterende arbejde.
- [ ] Ny privat national CI skal hente de ekstra officielle fliser og bevise, at recoveryzonerne ikke længere mangler kildedata.
- [x] Privat #31514481361 gennemførte 128-flisehentning, kildevalidering, analyse, topologi og delgenerering. 16/18 manglende hovedzoner fik kandidater; samlet privat råbestand blev 806 dele i 206 zoner. Jobbet stoppede først ved den kendt ustabile eksterne stednavnetjeneste.
- [ ] Anden privat recovery skal bruge alle zonebeviser samlet, så den internt modstridende Nibe-zone ikke afskærer sin faktiske kyst. Den resterende Ålsgårde/Helsingør-kilde skal undersøges særskilt mod officielle lag.
- [x] #31516332559 beviste, at et samlet evidensrektangel er for bredt: 1.072 rå dele i 207 zoner. Denne variant er forkastet og må ikke flettes eller aktiveres.
- [x] Målrettet lokal kildetest bevarer første forsøgs kandidater og genprøver kun helt tomme recoveryzoner i smalle evidensbånd. Resultatet er én resterende nul-zone: Ålsgårde/Helsingør; Nibe får 20,295 km officiel kandidat. Privat CI-bevis af topologi/slutantal mangler.
- [x] En ny privat hovedzoneaudit måler officiel kildeafstand, hovedzonedækning, tværzoneoverlap og handlingsrelevante huller. Førmålingen på de aktive 605 dele gav nul kildeafvigelser, nul overlap og 18 manglende hovedzoner. National once-only-samling reducerer zonevise dubletter til 84 fysiske kandidater: 75 løsrevne, syv endeforlængelser og to små mellemrum.
- [x] #31520862947 verificerede den afgrænsede tom-zone-recovery og kompakt QA. En additiv lokal kandidat bevarer de 605 godkendte dele og når 650 dele/203 hovedzoner med nul kildeafvigelser og nul overlap.
- [x] De 84 huller uden for de fem restzoner er geometrisk sammenholdt med den tidligere ejer-godkendte før/efter-bestand og er alle tidligere bevidste udeladelser; de må ikke genindføres automatisk.
- [ ] Fem restzoner gennemgås i `KYSTZONER-SLUTKONTROL.html`. Først derefter kan den præcise hovedzoneprojektion færdiggøres, valideres og frigives.
- [ ] Et privat samlet hovedzonekort skal derefter bevise præcis kyst, nul overlap, ingen uforklarede almindelige kysthuller, ingen udenlandske/outlier-linjer og kun to offentlige endemarkeringer pr. hovedzone. Ingen offentlig aktivering eller adminudvidelse før dette bevis.

## Historisk kystgeometri-v2-design før aktivering
Punkterne i dette afsnit er udviklingshistorik. Åbne pilotbokse er erstattet af den produktionsverificerede status ovenfor og er ikke længere aktuelle gates.
- [x] Lokal slut-samling efter alle ejerafgørelser reducerer 753 tekniske dele med 311 tværzone-overlap til 603 unikke fysiske dele med nul overlap. Hammer Odde har en eksplicit geografisk nordspidsgrænse.
- [x] Land-/vandpunkter er genberegnet på de 603 endelige linjer. Seks resterende sider er kontrolleret kartografisk og versionsstyret; lokalt resultat er 603/603 punktpar og nul blokeringer.
- [ ] Privat national CI skal bevise native DMI-grid, marine flertrinsserier, state-/historikisolation, vind og shadow-score igen på slutbestanden på 603 dele.
- [x] Privat #31474672948 nåede gennem den oprindelige native DMI-/state-/vind-/shadow-kæde, men stoppede ved en forældet 752/22/9-forventning efter seks allerede versionsstyrede punktbeslutninger. 4.0.175 retter alene forventningen til den faktiske 758/22/3-fordeling; en ny privat kørsel skal stadig nå slutbestanden på 603 dele.
- [x] Privat #31448258035 CI-verificerede 4.0.169's begrænsede vindvalg og hele den nationale kæde: 774 vindserier, 752 shadow-scorer, 22 deldækkede og ni blokerede dele, score-neutral reviewside med 783 dele samt bestået central admin-roundtrip/rollback.
- [x] Ejeren har gennemgået de 31 oprindelige opmærksomhedsdele. 4.0.172 bevarer beslutningerne revisionsbart og bygger et privat korrektionsforslag uden aktivering.
- [x] Ejeren har gennemgået alle 23 supplerende dele. Afgørelserne er normaliseret til 15 sletninger, tre godkendelser og fem præcise rettelser.
- [x] En metrisk landsaudit fandt 12 fysiske dubletter under andre tekniske ID'er. De arver den oprindelige afgørelse og ved præcise beskæringer kun den bevarede, rettede linje. Restlisten er nul; privat CI-bevis mangler fortsat.
- [x] 4.0.171 gør ejerreviewet praktisk anvendeligt med én stor del ad gangen, baggrundskort/luftfoto, tydelig linje, opmærksomhedsfilter, beslutningsknapper, bemærkning og lokal eksport.
- [ ] Privat #31440337378 bestod vindgaten, men stoppede shadow-score ved 0/752, fordi to på hinanden følgende midnatstrin ikke gav den krævede native `t+3h`-vandstand. 4.0.168 henter fire trin og kræver et ægte tretimerspar før scoreinput. Afventer nyt privat CI-bevis.
- [x] Privat #31425327202 verificerede 774/774 native vindserier; kun 20 faktiske gab brugte målrettet 32-celle-retry. Samme-celle-, afstands- og provenancekrav bestod.
- [x] Samme run verificerede DEC-0033-shadow-score for 752 fuldt dækkede dele; 22 deldækkede og ni blokerede forblev fail-closed, og alle mutationsflag var falske.
- [x] 4.0.167 bygger en privat score-neutral ejer-reviewside med alle 783 dele og statusfordelingen 752/22/9 uden delscores, scorefarver, rangering eller rådata.
- [ ] 4.0.167's nationale admin-roundtrip/rollback består lokalt; privat CI skal bevise tempkladde create/read/update/delete og uændrede beskyttede dokumenter.
- [x] 4.0.143 er produktionsverificeret i #2027: central sync, frisk data, fuld Linux-validate, releasegate, Pages-artifact og deploy bestod.
- [x] Første nationaljob målte 101 fliser og 707 sekventielle lagrequests; efter mere end ti minutter var hentningen fortsat aktiv uden flisefremdrift. 4.0.144 begrænser parallelitet til fire fliser og logger deterministisk fremdrift.
- [x] National kildevalidator kontrollerer plan/rapport, 208 zoner, samtlige eksponerede lag, komplethedsflag, filer, hashes, deduplikering, mutationer og credentialfravær før artifact-upload.
- [x] National source-QA bruger `STRtree` til at sammenholde samlede officielle kystobjekter med alle effektive zoner og viderefører planens konfliktklasse uden at foreslå aktivering.
- [x] Privat #2029 beviste korrigeret hentning af den aktuelle centrale 100-flise/700-request-plan på ca. 5:15, grøn validator og 208-zoners source-QA; hele jobbet sluttede på 7:45. 101/707 var den tidligere repositorybaserede planmåling.
- [x] National planlægger bruger den centralt hydrerede effektive bestand, kræver 208 zoner og danner deterministiske, overlappende kildefliser uden 208 manuelle Blåvand-forløb.
- [x] Kendte fejl ved Blåvand, Rømø, Limfjorden og Lolland/Falster er maskinlæsbare konfliktklasser; øvrige centrale ændringer stoppes automatisk som admin-konflikter.
- [x] Separat privat nationalt workflowjob kan hente og deduplikere syv gratis officielle GeoDanmark-lag uden Pages-rettigheder eller mutationsadgang.
- [x] #2029 beviste 208-zoners hydrering, 100 fliser/700 requests, komplethed, deduplikering og credentialkontrol; råartifactet er privat og 413 MB.
- [x] #2033 verificerede 4.0.145's særskilte kompakte artifact på 6,8 MB ved siden af råkilden; #2032 bestod normal produktion.
- [x] 4.0.146 måler national havn-/åmunding-/fjord-/norudskæring, klit-/skræntevidens og høfter i en read-only 208-zone topologiaudit med egen fail-closed gate.
- [x] #2037 verificerede topologiauditens tekniske kæde: 90 officielle masker, 194 zoner med bevaret kandidat og grøn isolation; #2036 bestod normal produktion.
- [x] Artifactaudit afviste første nationale åmundingsregel fagligt: 2.868 klynger i 180 zoner og op til 189 i én zone er oversegmentering, ikke 2.868 dokumenterede åmundinger.
- [x] 4.0.147 tilbageholder åmasker over en eksplicit auditgrænse, markerer zonen no-go og gemmer egenskabsprofil samt begrænsede diagnostiske samples uden geometri eller credentials.
- [x] #2040 viste 45 overdense zoner og nul fejlagtigt anvendte masker; #2039 bestod normal produktion.
- [x] 4.0.148 filtrerer på officiel midtebredde ≥2,5 m og fysisk linjelængde ≥100 m samt rapporterer alle smalle/korte fravalg.
- [x] #2043 målte 489 klynger og kun én overdense, allerede blokeret partitionszone; #2042 bestod normal produktion.
- [x] #2046 produktionsverificerede 4.0.149; privat #2047 dannede 755 dele i 194 zoner med nul opdigtede forbindelser og nul navne/punkter/runtimeaktivering.
- [x] #2049 produktionsverificerede 4.0.150; privat #2050 gav 129 umiddelbart reviewbare og 79 blokerede zoner samt lokalitetsflag på 25 zoner/28 dele.
- [x] #2054 produktionsverificerede 4.0.151; privat #2055 brugte 503 nøglefrie requests, deduplikerede 37.815 steder og gav balancerede kandidater til 755/755 dele uden automatisk navn eller aktivering.
- [x] 4.0.152 opdeler read-only de 28 grove dele i 56 lokale forslag (2,565–19,882 km; gennemsnit 12,43 km). 55/56 har officielt kystnært stedanker; fragmentgrupper bevarer kildelinjen 1:1 og tegner ingen forbindelser.
- [x] Privat #2107 CI-verificerede 4.0.152 på den friske centralt hydrerede 208-zonekæde: source-, topologi-, del-, navne- og lokalitetsgater bestod; build/Pages var korrekt skipped.
- [x] 4.0.154 danner 783/783 private, unikke navneforslag for den endelige bestand (755 minus 28 erstattede plus 56 lokale forslag). Hvert forslag har officielt kandidat-ID, afstand, alternativer og nul automatisk omdøbning/aktivering; Hou/Bisnap-ankergabet lukkes revisionsbart med `Hou Syd` 508,7 m fra delen.
- [x] #2110 produktionsverificerede 4.0.154 med fuld Linux-validate, release-gate og deploy; privat #2111 verificerede 783/783 officielle navneforslag og nul blokerede.
- [x] 4.0.155 danner 774/783 private land-/vandpunktpar fra modsat-side-evidens. 575 bruger et officielt Farvand-vidne og 199 zonens centralt hydrerede marinepunkt. Ni tvivlsomme dele forbliver uden aktive punktforslag og får to neutrale normalalternativer til native DMI-review.
- [x] #2114 bestod fulde produktionsgates/deploy, og #2115 reproducerede præcis 783 dele, 774 punktpar og ni blokeringer fra den aktuelle centrale admin-geometri.
- [x] #2118 stoppede korrekt fail-closed, men afslørede en validatorfejl: alle kandidater var mærket `unknown`, så Nordsø-WAM blev filtreret væk og alle 774 valgte punkter blev afvist.
- [x] #2122 verificerede coastType-routing: 752 valgte punkter har komplette WAM+DKSS-familier; 18 har komplet DKSS uden WAM, og fire har komplet WAM uden DKSS. Alle 774 har mindst én komplet native havmodelfamilie.
- [x] #2127 verificerede 4.0.158 fra central admin-geometri: 792 kandidater, 774 gyldige valgte vandpunkter, 752 med fuld WAM+DKSS, 22 med eksplicit deldækning og nul ugyldige valgte punkter. Alle ni tvivlsdele forbliver blokerede; alle mutationsflag er falske.
- [x] 4.0.159 bygger lokalt en privat national weather-shadow-kontrakt: 774 unikke serie-/historikidentiteter, 752 fulde, 22 med eksplicitte gab, ni udelukkede blokeringer samt 208 autoritative parent-zoner. Produktionsjob #2132 bestod alle Linux-gates; tre private genopbygninger blev eksternt blokeret før kontrakten, fordi den officielle stednavnetjeneste returnerede ikke-JSON.
- [ ] 4.0.160 tilføjede den fail-closed nationale flertrinsgate. #2142 bestod hele upstreamkæden, inklusive stednavne, 774-punkts DMI-grid og 4.0.159-kontrakt, men fandt en `parts_by_id`-scopefejl ved start af flertrinsgaten.
- [x] 4.0.161 rettede scopefejlen og regressionstestede collection-routing pr. del. Privat #2146 bestod hele kæden: 774 serier, 1.526 tilgængelige familier med præcis to native trin og 9.156 komplette komponentbeviser; ingen råværdier, fallback, interpolation eller mutation.
- [x] 4.0.162 tilføjede national state-/historikisolation. Privat #2152 verificerede 770 unikke `shadow-v2`-historikker med mindst to samples, nul parent-/krydslæsning, slettet replay og nul scorepåvirkning; fire WAM-only dele forbliver eksplicit uden state.
- [ ] 4.0.163 tilføjede lokal native HARMONIE-vindgate. #2157 ramte parserens standardtidsbudget efter 16 minutter; 4.0.164 retter kun det private tidsbudget til 3.000 sekunder og afventer nyt CI-bevis for 774/774 dele.
- [ ] 4.0.164 tilføjer privat DEC-0033-shadow-score på eksakt tidsfælles native lokale data. Den genbruger den aktive scoremotor, anvender 7-pointmarginen, sletter transient råinput og holder alle aktiverings-/mutationsflag falske. Afventer privat CI.
- [ ] #2164 beviste, at 4.0.164-tidsbudgettet når vindresultatet, men fire nærmeste HARMONIE-celler gav intet fælles U/V ved Harbo Odde. 4.0.165 udvider kun den private native kandidatsøgning til 32 og validerer fortsat samme celle/afstand. Afventer privat CI.
- [ ] #2167 viste, at global 32-cellesøgning ikke skalerer. 4.0.166 genindfører fire-celle-first og kører 32-celle-retry kun for faktisk manglende dele. Afventer privat CI.
- [x] Lokal RDKS, kystgeometri-v2, workflowkontrakt, releaseversion og releasegate består. Hele validate-rækken består bortset fra den kendte Windows/Linux-`rsync`-test, som skal bevises i CI.
- [ ] National topologi, ravstrandfravalg, lokal opdeling, navne og 774 punktpar er målt; ni punktpar samt DMI/state/score/UI/admin og aktivering er endnu ikke færdige.
- [x] Krav om ravstrandlinjer, fjordeksklusion, spring over havne/åer, navnekorrektion og fortsat fuld adminredigering er låst i DEC-0032.
- [x] Eksisterende multi-ankerfunktion er auditeret: flere navngivne retninger findes allerede i admin og scoreforklaring, men almindelig vejrpipeline leverer ikke endnu en selvstændig komponentserie pr. anker.
- [x] Høfder og andre mulige ravfælder er afgrænset som score-neutral registrering frem til særskilt RavScore-forskning og godkendelse.
- [x] Piloten er låst som parallel og ikke-destruktiv; `data/zones.geojson` og centrale adminoverrides er ikke ændret.
- [x] GeoDanmark `Kyst`, EPSG:25832, entitets-WFS, API-key/OAuth-adgang og CC BY 4.0 er verificeret i `docs/research/COASTAL_GEOMETRY_V2_SOURCE_AUDIT.md`.
- [x] V2-arbejdsskema, gratis-kildekontrakt, migrationsklasser og read-only baselineaudit er implementeret uden produktionsintegration.
- [x] Baselineaudit: 209 aktive repositoryzoner, 0 gemte multi-ankerzoner, 116 flaggede kystlinjer og 157 overlap over 0,01 km². Central runtime har senest 208 zoner, så pilotinput skal hydreres før generering.
- [x] Offentlig readback er sammenholdt med repositoryet: `DK-B02-14` er slettet centralt, `DK-B10-05` er omdøbt, og 18 zoner har centralt propagerede multi-ankre. Evidensen ligger i `data/diagnostics/coastal-geometry-v2-live-comparison.json`.
- [x] Autoritativ navneaudit samt private, revisionsbare fjord-/havn-/åpolitikker er implementeret på den centralt effektive pilotbestand.
- [x] Tre pilotmiljøer og nul-tolerancekriterier er låst i `data/geometry-v2/pilot-areas.json`: Blåvand/Rømø, Limfjorden og Lolland/Falster.
- [x] `DATAFORDELER_API_KEY` er oprettet som repository secret, og lokalt workflowjob/script henter kun små private pilotudsnit efter central adminhydrering. Secret værdi, rå arbejdsmappe og v2-data udelukkes fra Pages.
- [x] Pilot #1928 bekræftede secret-injektion, central hydrering, maskering og fuld isolation fra build/deploy; den stoppede sikkert ved første lagopslag.
- [x] #1931 hentede `Kyst_current` og seks supplerende `_current`-lag for alle tre pilotområder uden secretlæk eller produktionsjob.
- [x] #1936 verificerede pagination og privat råartifact: 21/21 lag/område-udtræk er komplette, seks er flersidede, og største udtræk har 72.870 features.
- [x] 4.0.130 genererer privat source-QA og oversigtskort direkte fra centralt effektive pilotzoner og komplette rålag; output ændrer ikke produktion.
- [x] Hver pilotzone klassificeres, og kun geometrisk støttede kildestykker samles til private reviewforslag; ingen blind snapping eller national aktivering.
- [x] #1974 verificerede gratis ortofoto-WMTS-fetch, 108 tiles, tre private Blåvand-overlays, fail-closed credentialhåndtering og skipped build/Pages.
- [x] Visuelt review er gennemført: nord og sydøst passer overordnet; hukudsnittet viser en uacceptabel indadgående sandtange-/laguneløkke.
- [x] Hukløkken er rettet privat og genkontrolleret mod officielt ortofoto i #1982.
- [x] 4.0.136-kandidaten registrerer hårnålen maskinelt (430,0/144,3 m; ratio 2,98), bevarer søværts apex og fjerner 242,0 m indadgående detur med syntetisk regression.
- [x] #1982 verificerede det nye officielle ortofotooverlay, 108 tiles, tre kontroludsnit, nul credentialmatch og alle aktiverings-/vejr-/scoreflag falske. Den relevante grønne linje springer den indre omvej over og ligger på sand/landsiden; ortofotogaten er bestået privat.
- [x] #1981 produktionsverificerede 4.0.136 med frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.137-kandidaten validerer begge private vandpunkter direkte i aktuelle native `wam_nsb`- og `dkss_nsbs`-GRIB-felter med produktionens nearest-cell-logik og fælles U/V-gridregel.
- [x] Privat pilot #1987 og artifactreview beviser gyldige WAM-/DKSS-celler for begge punkter, fælles current-U/V på 17 m-laget og forskellige nord/sydøst-celler for alle seks komponentfelter. Ingen sampling eller aktivering er sket.
- [x] #1986 produktionsverificerede 4.0.137 med frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.138 låser stabil partserieidentitet, eget punkt/grid/proveniens, separat historiknøgle og forbud mod krydsmerge, fallback, part-score, state, UI, public projection, admin-write og aktivering.
- [x] Privat pilot #1992 og artifactreview verificerer præcis to isolerede delserier, unikke serie-/historik-ID'er, korrekte gridreferencer, ingen credentialbærende URL og alle aktiverings-/mutationsflag falske.
- [x] #1991 produktionsverificerede 4.0.138 med central adminhydrering, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.139 danner private metadata-/hashbaserede flertidsserier via produktionens native DMI-parser og kræver mindst to fælles komplette trin med fuld komponentproveniens og korrekt current-U/V-parring.
- [x] Privat pilot #1997 verificerede fire fælles komplette tider pr. del, 48 fulde DMI-komponentposter, forskellige delceller, korrekt U/V-parring, nul interpolation/fallback og ingen credential- eller råværdilæk.
- [x] #1996 produktionsverificerede 4.0.139 med central adminsync, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.140 replay-validerer hver del med egen historiknøgle gennem den faktiske `shadow-v2`-funktion og afviser parent-genbrug, krydslæsning og scorepåvirkning. Midlertidigt råinput uploades ikke og slettes.
- [x] Privat pilot #2004 verificerede to unikke historiknøgler, nul parent-genbrug/krydslæsning, verificerede samples, nul scorepåvirkning, slettet transient input og intet rå-/credentiallæk.
- [x] #2003 produktionsverificerede 4.0.140 med central adminsync, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [x] 4.0.141-kandidaten implementerer et privat HTML/JSON-review, som bevarer parent-zonens eksisterende RavScore-farvelinje og forbyder part-scorefarve, delrangering, “bedste del”, klik og tooltip.
- [x] Privat pilot #2009 verificerede én aktiv parent, bevaret RavScore-præsentation, to helt score-neutrale ikke-interaktive dele, nul rå-/credentiallæk og alle mutations-/aktiveringsflag falske.
- [x] #2008 produktionsverificerede 4.0.141 med central adminsync, Supabase-roundtrip, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [ ] Næste gate er privat central admin-roundtrip/rollback; ingen geometri-, sampling-, state-, admin-, UI- eller scoreaktivering før eksplicit ejer-go/no-go.
- [x] 4.0.142-kandidaten implementerer en isoleret temp-document create/read/update/delete-gate med verificeret rollback og uændret hash/version for de to beskyttede runtime-admin-dokumenter.
- [x] Privat pilot #2014 verificerede temp create/read/update/delete, fravær efter rollback og identiske digests/versioner for begge beskyttede runtime-dokumenter.
- [x] #2013 produktionsverificerede 4.0.142 med central adminsync, Supabase-roundtrip, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- [ ] Kun eksplicit ejer-go/no-go er tilbage før nogen Blåvand-aktivering; den må ikke udledes af “fortsæt”.
- [x] #1976 produktionsverificerede 4.0.135 efter dependency-isolationshotfix med frisk data, fuld validate, release-gate, Pages-artifact og deploy.

## 4.0.126 – sikker gratis GeoDanmark-pilot, afventer CI
- [x] Gratis kildekontrakt, v2-schema, migrationslogik, audit og tre pilotområder er dokumenteret og regressionstestet.
- [x] `DATAFORDELER_API_KEY` er koblet til et isoleret manuelt workflowjob og kan ikke påvirke Pages-deploy eller RavScore.
- [x] Workflowet hydrerer central admin-sandhed før fetch og udelukker v2-data, arbejdsmappe og dependencies fra offentlig artifact.
- [ ] En konkret manuel Actions-run skal bekræfte secret-injektion, WFS capabilities, `Kyst`-featurehentning, frivillige supplerende lag og privat artifact uden secretlæk.
- [ ] Mål DMI-forskelle pr. lokal kystdel og design provenance/merge uden at ændre RavScore.
- [ ] Fremlæg pilotresultat og undtagelsesliste til særskilt go/no-go før national omskrivning.

## 4.0.127 – GeoDanmark entity-lag hotfix
- [x] #1928 dokumenterede, at adgang og secret virker, mens den første parser fejlagtigt søgte efter det ældre eksakte navn `Kyst`.
- [x] Capabilities-parseren læser nu kun `FeatureType/Name` og vælger deterministisk det aktuelle entity-lag med `_current`; `_hist` og beslægtede navne accepteres ikke.
- [x] Ved ukendt lagkontrakt gemmes en secret-fri capabilitiesrapport i det private artifact, så næste fejl kan diagnosticeres uden credential eller credential-bærende URL.
- [ ] Genkør CI-piloten og verificér konkrete featureudtræk før forslag genereres.

## 4.0.128 – komplet pagineret pilotartifact
- [x] #1931 verificerede adgang til 140 lag og faktiske featureudtræk fra `kyst_current`, `havn_current`, `vandloebskant_current`, `vandloebsmidte_current`, `hoefde_current`, `sandklit_current` og `skraent_current` i alle tre områder.
- [x] Kystudtrækkene gav 893, 1.392 og 1.325 features; flere maskelag ramte præcis serverloftet på 10.000 og kunne derfor ikke kaldes komplette.
- [x] 4.0.128 paginerer med `startIndex`, rapporterer source match/page count/completeness og stopper sikkert ved 250.000 features pr. lag/område.
- [x] GitHub artifact-upload inkluderer nu den skjulte private arbejdsmappe eksplicit; Pages ekskluderer den fortsat.
- [x] #1936 beviste komplette sider og gjorde 21 rå GeoJSON-filer (ca. 341 MB) tilgængelige i det private artifact.

## 4.0.129 – separat concurrency-kø til geometri-pilot
- [x] #1933 dokumenterede, at en nyere 15-minutters vejropdatering kan erstatte en ventende pilot, når begge deler samme concurrency-gruppe.
- [x] Pilotdispatch bruger nu `ravradar-geometry-v2-pilot`, mens vejrproduktion fortsat bruger `ravradar-weather-production`.
- [x] En ny pilot kan kun erstatte en ældre pilot; rutinevejret kan ikke længere annullere den.
- [x] #1936 kørte samtidig med den separate vejrproduktionskø og verificerede komplethed/artifact uden indbyrdes annullering.
- [ ] Byg næste read-only analysetrin på den centralt hydrerede zonebestand og de komplette råfiler; ingen produktionsaktivering.

## 4.0.130 – privat GeoDanmark source-QA og kort
- [x] Den centralt hydrerede delmængde af de ni pilotzoner gemmes kun i det private arbejdsartifact med hash og antal.
- [x] Eksisterende kystlinjer måles mod nærliggende GeoDanmark-kyst med længde, fragmentering, 250-meters dækning og stikprøveafstande.
- [x] Havne, vandløbsender, høfder, klit og skrænt registreres som score-neutral reviewkontekst; de fortolkes ikke automatisk som ravstrand eller åmunding.
- [x] Tre private PNG-kort viser nuværende kyst, GeoDanmark-kilde, zoner og centrale ankre.
- [x] Lokal analyse flaggede 9/9 zoner: Rømø har en stor forskydning, Limfjorden har manuelle konflikter/modstående bredder, og Lolland/Falster kræver egentlig zonepartition frem for simpel koordinatjustering.
- [x] #1941 verificerede den nye kæde, privat artifact, score-/produktionsisolation og uændret Pages.

## 4.0.131 – kystdels-, navne- og migrationstriage
- [x] 702 fysiske kildestykker på tværs af ni zoner får privat reviewklasse ud fra afstand til eksisterende kyst; ingen må aktiveres automatisk.
- [x] Det offentlige, nøglefri `steder`-API er verificeret som adgang til Danmarks officielle stednavneregister og forespørges kun i afgrænsede pilotpolygoner.
- [x] Navnetokens, autoritative kandidater, afstande og manglende match gemmes uden automatisk omdøbning.
- [x] Lokal migrationstriage: Blåvand geometriopretning; Rømø og Thisted semantisk flyttereview; Fur, Aalborg og fire Lolland/Falster-zoner grænse-/partitionsreview.
- [x] #1948 verificerede private outputs, netværksadgang, artifact og fortsat isolation; #1947 verificerede fuld produktionsvalidering og release-gate.

## 4.0.132 – kontrollerede private kystdelsforslag
- [x] Kun `existing-alignment-reference` og `partial-alignment-review` samles; alle semantiske/grænsemæssige stykker udelades fra forslag.
- [x] Havne udskæres med et dokumenteret bufferbånd. Kun synlige, ikke-rørlagte vandløbsmidter, der faktisk når kystkandidaten og fortsætter ind i land, danner deduplikerede mundingsmasker.
- [x] Fjordpolitikken er maskinlæsbar pr. pilotmiljø: ydre vestkyst, eksplicit inkluderet Limfjord og ekskluderede indre fjorde/nor ved Lolland-Falster.
- [x] Lokalt genkørt på det private #1948-artifact: 84 multipart-reviewforslag på ni zoner; Rømø stoppede sikkert med nul forslag.
- [x] Forslag, masker og provenance gemmes kun privat, vises orange på pilotkort og har eksplicit falsk aktivering, vejrsampling, adminændring og scoreændring.
- [x] #1952 verificerede antal, private kort, artifact og isolation; #1951 verificerede fuld Linux-validering, release-gate og Pages.

## 4.0.133 – officielle indre-vandmasker og geografisk reviewgate
- [x] Den officielle nøglefri stednavnekilde hentes som GeoJSON og leverer Farvand-polygoner; kun undertyperne `fjord` og `nor` udelukkes uden for Limfjorden.
- [x] Seks officielle polygoner blev fundet i Lolland/Falster-piloten. De relevante zoner rammes revisionsbart af Nysted Nor samt Nakskov/Sakskøbing Fjord og Søndernor; Limfjorden har bevidst ingen sådan maske.
- [x] Havne-, å- og indre-vandmaskernes faktiske private geometri gemmes med forslagene og vises rosa.
- [x] Ni højopløselige private zonekort viser nuværende linje, fysisk kilde, forslag, fravalg og officielle stednavne.
- [x] Maskinlæsbart geografisk review dækker alle ni zoner: én detailkandidat, to semantiske flytninger og seks grænse-/partitionsredesign.
- [x] Kun Blåvand må gå videre til privat detailopretning. Ingen zone er produktionsgodkendt, og ingen af de otte strukturelt fejlplacerede zoner må få DMI-punkter endnu.
- [x] #1959 verificerede 72 dele, seks officielle masker, ni zonekort, reviewgaten og fortsat privat isolation; #1958 verificerede fuld produktionskæde.

## 4.0.134 – privat Blåvand-detailforslag
- [x] Den sammenhængende fysiske GeoDanmark-kyst splittes ved det officielle Blåvands Huk, ikke ved nærmeste anker alene.
- [x] To navngivne dele dannes: `Nord for Blåvands Huk` og `Sydøst for Blåvands Huk mod Hvidbjerg Strand`.
- [x] Hvert fysisk fragment forskydes præcis 15 meter mod den side, som det tilhørende centralt verificerede land-/vandanker dokumenterer som land.
- [x] Hver del får et privat land-/vandpunktpar og lokal pålandsretning, men vejrsampling og DMI-gridbrug er eksplicit deaktiveret.
- [x] Ni GeoDanmark-høfter registreres separat som score-neutrale morfologihypoteser og indgår ikke i kystlinjen eller RavScore.
- [x] Et særskilt detailkort viser fysisk kyst, landforskudt linje, punktpar og høfter; alle produktions-, admin-, vejr-, score- og aktiveringsflag er falske.
- [x] #1967 verificerede 208-zone central hydrering, 2 dele, 15 features, 9 høfter, detailkort og alle mutations-/vejr-/scoreflag falske. #1965 viste samtidig, at manglende central ankersandhed stopper detailtrinnet sikkert.
- [x] Ortofotokontrol er gennemført; den private DMI-gridkontrol er implementeret i 4.0.137-kandidaten.
- [x] #1987 gennemførte CI-/artifactreview af DMI-gridrapporten uden credential-URL eller mutationsflag.
- [ ] Design og valider admin-roundtrip samt hele vejr-/proveniens-/score-/UI-kæden før nogen produktionsbeslutning.

## 4.0.125 – fuld timeproveniens fra STAC/GRIB
- [x] Collection, model-run og native gyldighedstid lagres pr. rå komponenttime i bulkcachen.
- [x] Lead time, prognosealder, native/interpoleret-status og anvendte native tidspunkter føres til beskyttede `conditions.json`.
- [x] Bølge-, strøm-, vandstands- og vandtemperaturproveniens overlever den endelige komponentmerge; vandstandskontinuitet bevarer original DMI-identitet.
- [x] Regressionstest afviser interpolation på tværs af modelkørsler.
- [x] Audit schema 4 måler også temporal status og native kildetider.
- [ ] Frisk produktion skal genopbygge parsergeneration 14 og bevise komplette proveniensfelter uden dækningstilbagegang.

## 4.0.124 – komponentvis interval- og proveniensaudit
- [x] De fem DKSS-vindhalehuller er lukket i produktion; de sidste centrale rettelser for Nibe/Sebbersund og Falster/Nysted propagerede og gav 36 direkte DKSS-haletidspunkter.
- [x] Seneste målte public dataset havde 208/208 zoner med 118 vindtimer.
- [x] Implementeringsauditten dækker nu vind, bølger, strøm, vandstand og vandtemperatur med DMI-/fallback-/missing-intervaller pr. zone.
- [x] Manglende collection, model-run, lead time og prognosealder på DMI-timer rapporteres maskinlæsbart.
- [x] #1862 gennemførte fulde gates og deploy; et frisk live-snapshot med samme commit gav 208/208 zoner og 118 vindtimer samt 0 auditfejl.
- [x] Den timevise pipeline er implementeret lokalt i 4.0.125 uden at udlede metadata, som råcachen ikke faktisk har gemt.

## 4.0.123 – marine landmasker og fælles U/V-søgning
- [x] #1851 og #1852 er auditeret på faktisk produktionscache: fem stabile DKSS-vindhalehuller, heraf fire i Limfjorden og ét ved Falster/Nysted.
- [x] Den centralt gemte og deployede admin-geometri er sammenholdt med bulkcache og fulde conditions; den anvendes faktisk af kørslen.
- [x] Kandidatvinduet er udvidet til 128 marine gridceller i Limfjorden og 64 ved øvrige kyster uden at ændre de fysiske afstandsgrænser.
- [x] Strøm og DKSS-vindhale får særskilt U/V-pardiagnostik.
- [ ] Første produktion på 4.0.123 skal vise, om én eller flere af de fem zoner får direkte DKSS-U/V; fallbackdækning er fortsat komplet uafhængigt heraf.

## 4.0.122 – produktionsverificeret vindhale
- [x] #1845 gennemførte frisk DMI-kørsel, fuld projektvalidering, release-gate, artifact og Pages-deploy som `success`.
- [x] Det offentlige datasæt har 208/208 zoner med vind og 118 sammenhængende timer i alle zoner.
- [ ] Direkte DKSS-gridproveniens versus fallback skal fortsat dokumenteres særskilt for de fem tidligere problemzoner.

## 4.0.121 – workflowoprydning
- [x] Aktiv kode, tests, release- og recoverydokumentation er kontrolleret: ingen procedure afhænger af `schedule-test.yml` eller `pages-microtest.yml`.
- [x] Begge historiske diagnostikworkflows er fjernet; `update-and-deploy.yml` er bevaret som eneste repository-ejede produktionsworkflow.
- [x] Workflow-kontrakttesten fejler, hvis ekstra YAML-workflows genindføres uden en ny bevidst beslutning.
- [x] `pages-build-deployment` er dokumenteret som GitHub-administreret Pages-mekanisme, ikke RavRadar-workflow.

## 4.0.120 – fallbackhale efter vandstandsrouting
- [x] #1833/#1835 beviste NSBS/LF-rotation og løftede offentlig vind til 208/208 zoner med data og 203/208 mindst 96 timer.
- [x] Fem zoner mangler et fælles gyldigt DKSS U/V-gitterpunkt; de udfyldes ikke kunstigt.
- [x] Vandstandsrouting bevarer den blandede offentlige komponentserie og opdaterer DMI-cachen separat.
- [x] Open-Meteo bruger 120 fremtidige timer i stedet for fem kalenderdage.
- [ ] Frisk CI/produktion skal vise 208/208 zoner med 118–119 timers vind samt fulde gates og deploy.

## 4.0.76
- Strømpile placeres ved dokumenterede DMI-marinegitterpunkter i stedet for kunstige offsets.
- Rå current-u/current-v bevares og valideres mod hastighed, retning og pil.
- 197/209 zoner har direkte DMI-gitterproveniens i den medfølgende cache; 12 zoner kræver fortsat kildespecifik opfølgning.
- DMI-pile uden dokumenteret punkt skjules.

## 4.0.73
- Ekspertreview viser fuld Supabase-fejl og understøtter eksisterende skemaer.
- Stationshistorik bevares ved hydrering og observationsskip.
- Helhedstesten skelner mellem funktionsfejl og performanceadvarsel og profilerer opstartstrin.

## 4.0.71
- Samlet sitetest viser nu levende fremdrift, slutrapport og fatal fejl direkte i admin.
- Tavs afslutning kan ikke længere fortolkes som bestået.
- Seneste rapport bevares lokalt efter genindlæsning.

## 4.0.70
- Samlet funktionstest dækker nu hele sitets centrale brugerrejser, data, deploy og performance.
- Testresultat vises pr. område og kan downloades.
- Live Supabase-skrivninger er fortsat mærkede og ryddes op automatisk.

Status er baseret på importerede chats, aktuelle RDKS-poster og projektets kode/teststruktur. Den er en styringsoversigt, ikke en påstand om ekstern driftsverifikation.

| Område | Status | Næste væsentlige arbejde |
|---|---|---|
| DMI-bulkprognoser | Implementeret, overvåges | Fortsat audit af horisont og marine randzoner |
| DMI-first vindhale | Implementeret lokalt, afventer frisk produktion | Bevis HARMONIE→DKSS-kildeskift og 118–119 timers dækning |
| Sammenhængende forecastserier | Implementeret | Regressionstest mod kildeskift og spring |
| Officielt zoneregister | Implementeret | Fortsat geografisk audit |
| Retningskonventioner | Implementeret og rådata-verificeret | Opfølgning på 12 zoner uden direkte DMI-gitterproveniens |
| DMI-stationsregister | Delvist implementeret | Officiel registerkontrol og fuld datalivscyklus |
| Observationslivscyklus | Rettet i 4.0.99, kræver produktionsverifikation | Bekræft OceanObs-resultat og adminstatus efter Update weather and deploy |
| Prognose-/cachestatus pr. station | Rettet i 4.0.99, kræver produktionsverifikation | Bekræft cacheudløb og alarmer på reelle stationsmålinger |
| Automatisk stationsrouting | Implementeret, overvåges | Bedre-station-notifikationer uden automatisk omskiftning |
| Adminoverride | Implementeret og runtime-rettet i 4.0.96 | Overvåg central readback og produktionens anvendelse af valgte stationer |
| Kystlinjeeditor | Delvist implementeret | Mobil regressionstest af kurver, deaktivering og lagring |
| Regelbygger | Delvist implementeret | Fuld brugertest, geografiske grupper og konfliktforklaring |
| Supabase/central adminlagring | Implementeret med samlet funktionstest | Kør produktionstesten ved releases og følg fejlrapporten |
| RavScore/debug | Delvist implementeret | Komplet forklaringskæde og nabozoneaudit |
| Ekspertreview og brugerfeedback | Implementeret med central CRUD-test | Faglig behandling af indsendte forslag |
| RDKS | Implementeret i første fulde historikversion | Automatisk samtaledelta ved alle kommende releases |
| Levende håndbog | Sprogligt revideret og markant udbygget | Fortsat faglig ekspertvalidering og konkrete forbedringer |
| Release Governance | **Produktionsverificeret i #1772** | Alle reelle produktionsbuilds kræver begge fulde gates; overvåg kontrakten ved fremtidige workflowændringer |
| ravradar.dk-beredskab | Planlagt/delvist | DNS, Supabase redirects, CNAME og produktionstest før aktivering |
| Faglig rav- og sedimenthåndbog | Markant udbygget | Ekstern ekspertreview og lokal kalibrering af tærskler |

## 4.0.74
- [x] Offentlig `public-conditions.json` genereres atomisk.
- [x] Offentlig side bruger ikke fuld `conditions.json`.
- [x] Scoreparitet verificeres for 209 zoner, begge jagtformer og prognosetimer.
- [x] Live-data undtages fra service-worker-cache.
- [x] Mobilkort, kontoikon, GPS-flow, knapper og farveforklaring er implementeret.
- [x] Håndbog og RDKS er opdateret.
- [ ] Produktionsmålinger efter deployment skal bekræfte den faktiske hastighedsgevinst på mobil og desktop.

## 4.0.77
- [x] Oversigt renderes ved første åbning.
- [x] Admin-ready-markør styrer aktiv fanetest.
- [x] Testdialoger opsamles uden popup.
- [x] Runtimebaseret versionskontrol.

## 4.0.78
- [x] Null, tomme værdier og manglende strømkomponenter kan ikke blive til falsk 0/0.
- [x] Verificeret proveniens indeholder gitterpunkt, metode og kildetider.
- [x] Ikke-verificerbare timer bevarer vist strøm uden falske råkomponenter.
- [x] Audit og Release Gate skelner mellem reel fejl og manglende dokumentation.

## 4.0.79
- [x] Rangliste og 5-dages prognose bruger én indlæst adaptiv model.
- [x] Aktuelle scores caches pr. jagtform og zone.
- [x] Prognosedage grupperes én gang pr. zone.
- [x] Skjult dobbelt rendering ved opstart er fjernet.
- [x] Sitetestens dashboardkontrol følger den faktiske UI-livscyklus.
- [ ] Produktionstesten efter deployment skal bekræfte hurtig rendering på brugerens enheder.

## 4.0.80
- Implementeret: Kritisk opstartsrettelse, så dagens rangliste og 5-dages prognose ikke længere blokeres af vind- og strømpile.
- Implementeret: Pile installeres efter centrale prognosevisninger og bygges samlet på et afkoblet Leaflet-lag.
- Implementeret: Jagtform vælges før første scorecache.

## 4.0.83
- [x] Dagens rangliste får et eksplicit browser-paint før 5-dages landsberegningen.
- [x] 5-dages prognosen beregnes i små, afbrydelige bidder med synlig fremdrift.
- [x] Gammel prognoseberegning annulleres ved skift af jagtform.
- [x] Regressionstest beskytter mod genindførelse af en synkron, blokerende prognoseberegning.
- [ ] Produktionssitetest efter deployment skal bekræfte faktisk rendering på brugerens browser.

### 4.0.84
- [x] Verificeret DMI u/v er autoritativ kilde for strømretning og -hastighed efter hydrering.
- [x] Proveniensberigelse genberegner viste strømfelter fra u/v.
- [x] Regressionstest for vektorkonsistens tilføjet.

## 4.0.85 – IMPLEMENTERET
- Kanonisk lagret DMI-u/v-vektor er indført i proveniensberigelsen.
- Hastighed og retning genberegnes fra de lagrede komponenter.
- Videnskabelig strømaudit består på 23.049 verificerede prognosetimer uden lempelse af tolerancer.
- Regressionstest beskytter mod fremtidig forskel mellem lagret vektor og afledte scorefelter.

## 4.0.86 – IMPLEMENTERET
- Synlig reviewkø og komplet ejerflow i aktiv admin.
- Synlig håndtering af lokale håndbogsnødkladder.
- Reelt dokumentationscenter med RDKS-kernedokumenter.
- Tydelig lokal afgrænsning af model-forslag.
- Sitetest skelner 404, timeout, netværksfejl og HTTP-fejl.
- Performanceprofil opdelt i netværk/data, beregning og rendering.
- Reachability-test beskytter centrale adminfunktioner.
- [x] Roadmappets P1-driftspunkter er efterkontrolleret mod aktuel kode: lagringskontrol, central persistensprøve, synlig reviewkø, lokale nødkladder og soft-delete/systemtestrydning er implementeret. Kun næste billingperiodes egressmåling står åben.

## 4.0.87 – IMPLEMENTERET
- Deterministisk, efterstillet installation af vind- og strømpile med ready/failed-status og retry ved reel fejl.
- Sitetest kontrollerer faktiske vind- og verificerede strømpile.
- Admin-kort ryddes ved faneskift, og forsinket initialisering kontrollerer containerens livscyklus.
- Hele den aktive browser-importgraf versionslukkes til releaseversionen.
- Rangliste, første paint og ikke-blokerende 5-dagesberegning er bevaret.

## 4.0.88 – IMPLEMENTERET
- Historisk koordinatfallback i pilelaget er rettet til én ensartet `L.LatLng`-type.
- Fejl isoleres pr. zone, så én mangelfuld datapost ikke fjerner alle pile.
- Zonestreger og grænsetikker redrawes automatisk efter zoomanimation.
- Regressionstest beskytter pilefallback og zoomopdatering.

## 4.0.89 – zoneændringer og reviewoprydning
Status: Implementeret og lokalt valideret.

- Slet valgt kystdel: centralt gemt og readback-verificeret.
- Slet hele zone: dobbelt bekræftelse, central tombstone og automatisk anvendelse i deployment.
- Retnings- og ankerændringer anvendes på den autoritative zonefil før runtime-data bygges.
- Reviewkø: individuel soft-delete og samlet oprydning af systemtestposter.
- Ny integrationstest beviser både retningsoverførsel og zonesletning i buildkæden.

## 4.0.90 – IMPLEMENTERET
- Kystlinjesøgning skifter nu både aktiv zone, kortudsnit og redigeringspunkter.
- Zoner kan omdøbes i kystlinjeeditoren uden at ændre zone-ID.
- Én Gem ændringer-knap erstatter kladde- og eksportarbejdsgangen i normal admin.
- Flyt kort og Præcis redigering er bevaret uden funktionsændring.
- Kun nye eksplicit publicerede ændringer anvendes i deployment; gamle kladder ignoreres.
- Central readback og buildtest beskytter navn/geometri-forplantningen.

## 4.0.93 – IMPLEMENTERET
- Alle testantagelser om fast zoneantal er erstattet af integritetskontrol mod det historiske ID-grundlag og eksplicitte administratorsletninger.
- En fuld 180° vending af land-/havpunkter og pålandsretning accepteres, når geometrien er konsistent.
- Geometri-rollback beskytter snapshots uden at låse admin-redigerbare navne, kystlinjer, punkter eller retninger.
- Rollbackværktøjet skifter kun polygongeometri og bevarer slettede zoner og aktuelle adminfelter.
- En ny samlet admin-zonekontrakttest dækker omdøbning, kystlinjeændring, 180° vending, zonesletning og beskyttelse mod ikke-godkendte kladder.

## 4.0.94 – IMPLEMENTERET
- [x] Aktive centrale administratorregler publiceres sanitiseret til offentlig runtime.
- [x] Offentlig score er uafhængig af den enkelte browsers lokale administratorlager.
- [x] Regelkladder og inaktive regler kan ikke påvirke produktionen.
- [x] Rå `data/admin/`-filer udelukkes fra Pages-artifactet.
- [x] Integrations- og release-gate beskytter hele kæden.

## 4.0.96 – IMPLEMENTERET
- Vandstandsstationsfanen bruger ikke længere det slettede `stationDeliveryLabel`-kald, som stoppede kortinitialisering og adminfanetest.
- Beskyttet stationsregister og routing-audit hydreres fra Supabase før vejropdatering.
- Manglende stationslivscyklus behandles som ukendt, ikke som dokumenteret utilgængelig.
- Upload til Supabase fletter livscyklusfelter ikke-destruktivt, så nyere men informationsfattigere filer ikke sletter kendt historik.
- Kortets eksisterende farvekontrakt er bevaret: grøn automatisk, rød administrator, lilla begge, grå udfaset, orange øvrig.
- DMI-prognoser, vandstandsværdier, RavScore og offentlig runtime er ikke ændret.

## 4.0.100
- [x] Målestationer og prognosepunkter klassificeres særskilt.
- [x] Tidewaterstations-registeret indlæses som prognosepunkter.
- [x] Begge kildetyper får DKSS-femdøgnsserier via STAC/GRIB ved deres koordinater.
- [x] Adminoverride og automatisk routing bruger samme produktionskæde.
- [x] Afstandsinterpoleret kildeserie forplantes til aktuel vandstand, RavScore, ranglister, femdøgnsprognose og time-for-time-vandstandstabel.
- [ ] Produktionens første fulde bulk-kørsel skal verificere Hals-kildernes faktiske horisont og markering.

## 4.0.101 – IMPLEMENTERET
- Automatisk vandstandskildevalg i admin genberegnes fra det aktuelle, indlæste kilderegister med samme `recommendWaterStationBracket`-funktion som produktionsrouting.
- Et hydreret, men ældre eller tomt `water-station-routing-audit` kan ikke længere overstyre en kilde, som nu er dokumenteret brugbar.
- To kompatible kilder bevarer automatisk afstandsvægtet interpolation; én kompatibel kilde anvendes med 100 % vægt frem for et tomt valg.
- Administratoroverride, kildestatus, DKSS-femdøgnsserier, RavScore, ranglister, vandstandstabeller og øvrig 4.0.100-funktionalitet er uændret.

## 4.0.102 – IMPLEMENTERET
- Vandstandskortet viser nu kun den routing, som faktisk er aktiv for den valgte zone.
- Ved aktiv automatisk routing vises valgte kilder grønt; ved aktivt administratoroverride skjules alle grønne automatiske markører, og administratorens kilder vises rødt.
- Den lilla kategori “begge valg” er fjernet, fordi den blandede et inaktivt forslag sammen med den aktive produktionsrouting.
- Samme vandstandskilde kan ikke længere stå både som primær og sekundær; dubletter samles, og én tilbageværende kilde får 100 % vægt.
- Automatisk udvælgelse, DMI-kilder, prognoseserier, interpolation, RavScore, ranglister, femdøgnsvisning og produktionsrouting er ikke ændret.


## 4.0.103 – IMPLEMENTERET, AFVENTER PRODUKTIONSBEKRÆFTELSE
- GitHub Pages-buildet udelukker `_support/` og `RavRadar-support-*.zip`, så den private supportpakke ikke kan kopieres ind i det offentlige artifact.
- Automatisk vandstandsinterpolation og administratoroverride bruger nu samme inverse vægtning efter reel geografisk haversineafstand. Kandidatvalgets kysttopologi er uændret.
- DMI-prognosepunkter opdages via den dokumenterede OceanObs-collection `tidewaterstation` (ental); det tidligere plurale 404-endpoint er fjernet.
- Kilderegisteret dokumenterer discovery-endpoint, resultat, antal og fejl. Hver vejrproduktion skriver desuden en beskyttet audit af alle målestationer og prognosepunkter med prognosestatus, horisont, gyldighed og routingberettigelse.
- En ny samlet produktionstest kontrollerer automatisk routing, adminoverride, geografiske vægte, forecastStore, zonens aktuelle vandstand og time-for-time-serie samt Pages-sikkerhed og DMI-endpointkontrakt.
- En rigtig GitHub-vejrproduktion skal stadig bekræfte det aktuelle antal DMI-prognosepunkter og deres faktiske femdøgnshorisont.

## 4.0.104 – IMPLEMENTERET, kræver produktionsverifikation
- [x] Første administratorvalg i enhver zone bindes til det centrale routingdokument.
- [x] Aktivt override vises rødt og kan gemmes ved første valg.
- [x] Manglende prognoseværdier kan ikke længere konverteres til falske 0 cm.
- [x] Tomme prognosekilder kan ikke blive routingberettigede.
- [x] Samlet regressionstest dækker override og vandstandsserie.
- [ ] Første deployment skal bekræfte UI og varierede værdier på den offentlige side.

## 4.0.105 – IMPLEMENTERET, kræver produktionsverifikation
- [x] Vandstandskilder, zoneregister og central administratorrouting indlæses i en separat prioriteret opstartskæde.
- [x] Vandstandsfanen er ikke klikbar med foreløbige eller tomme data.
- [x] Langsomme diagnose-, regel-, historik- og reviewkald kan ikke længere forsinke eller efterfølgende overskrive vandstandsroutingen.
- [x] Sitetesten åbner vandstandsfanen tidligt og måler, hvornår zonevalg, kort og administratoroverride faktisk er klar.
- [x] Eksisterende DMI-data, automatiske valg, manuel override, interpolation, vandstandsprognose, RavScore og offentlig runtime er uændret.
- [ ] Første deployment skal bekræfte, at gemte røde valg og Fjern-knappen er tilgængelige hurtigt og reagerer uden senere overskrivning.

## 4.0.106 – kvotesikker vandstandsrouting
**IMPLEMENTERET, afventer produktionsverifikation.** Store read-only admin-dokumenter fylder ikke længere localStorage, gamle store cacher ryddes, og QuotaExceededError kan ikke afbryde røde markører, Fjern eller central routinggemning.

## 4.0.107 – historisk tilstandsmodel i skyggetilstand
**IMPLEMENTERET, afventer pipeline- og produktionsverifikation.**
- [x] Udvidet 24-timers historik med vindretning, strøm, alignment og vandstand.
- [x] Akkumuleret indtransportmomentum og udtransporttryk.
- [x] Stærk energihændelses varighed/alder, mobiliserings- og nærkystpotentiale samt procesfase.
- [x] Score-neutral `shadow-v2`, som kun bruger verificerede marine DMI-prøver og ikke ændrer offentlig RavScore.
- [x] Kompakt public projection uden rå historik.
- [x] Ingen generelle strømbånd eller strømbåndsfallback.
- [x] 4.0.106 vandstationsrettelse markeret produktionsbekræftet af ejer.
- [ ] GitHub-kørsel skal opbygge rigtige historiksamples over flere kørsler.
- [ ] Sitetest skal bekræfte uændret eller acceptabel offentlig opstartstid.
- [ ] Debugkontrol skal udføres på zoner med kendte administrator-overrides af land-/havpunkter.

## 4.0.110 – marine recovery scheduler
**IMPLEMENTERET, AFVENTER PRODUKTIONSVERIFIKATION.** DKSS prioriteres før HARMONIE under manglende marinehorisont. Den videnskabelige u/v-audit er uændret.


## 4.0.112 – overgang, teststabilitet og referencezoner
- **IMPLEMENTERET:** Obligatorisk næste-chat-overlevering med aktuel sandhed, plan, beslutninger, kendte risici og første læserækkefølge.
- **IMPLEMENTERET:** Automatisk score-neutral referencezonerapport for Agger/Krik Vig, Asaa/Melholt, Als Odde/Helberskov og Blåvand/Hvidbjerg.
- **IMPLEMENTERET:** Sitetesten venter på aktivt dashboard og en synlig, klikbar samlet-test-knap.
- **FORTSAT SKYGGETILSTAND:** Historisk tilstand forklares, men påvirker ikke RavScore.
- **NÆSTE PLANTRIN:** Validér referencezonernes historiske felter over flere produktionstimer; aktivér derefter kun det glidende varigheds-/styrkebidrag for dokumenteret indadgående strøm.
- **ÅBEN DRIFT:** Workflowkøretid over cronintervallet skal profileres og optimeres separat.

## 4.0.113
- **IMPLEMENTERET:** Progressiv rå DMI GRIB-cache med separat restore/save og unik nøgle pr. kørsel.
- **IMPLEMENTERET:** Datasætbundet referencezonerapport med kompakt loglinje og streng CI-kontrol efter frisk datagenerering.
- **OVERVÅGES:** Faktisk cacheprogression, ophør af gentagen marine warmup og ny normal køretid.
- **UDSAT:** Ændring af eksternt 10-minutters croninterval, indtil nye produktionsmålinger foreligger.
- **IKKE IMPLEMENTERET:** Numerisk transportbidrag til RavScore.

## 4.0.114 – deployisolering
- **IMPLEMENTERET LOKALT:** `build-and-prepare` udfører data, validering, supportpakke og Pages-artifact.
- **IMPLEMENTERET LOKALT:** `deploy-pages` er et separat kort job med `needs`, eget environment og mindst mulige Pages-rettigheder.
- **IMPLEMENTERET LOKALT:** Fejlet deploy kan genkøres uden ny tung build.
- **IMPLEMENTERET LOKALT:** Push/tvungen release prioriteres ved at afbryde en ældre almindelig kørsel.
- **AFVENTER CI/PRODUKTION:** Første grønne deploy og efterfølgende sitetest af 4.0.114.


## 4.0.115 – IMPLEMENTERET LOKALT, CI STOPPET AF DMI-INTEGRITETSAUDIT
- [x] Historisk strøm beregnes igen efter den videnskabelige DMI-proveniensberigelse.
- [x] Ikke-verificerede strømprøver udelukkes fra transportvarighed og momentum.
- [x] Akkumuleret 24-timers transport er adskilt fra aktuelt sammenhængende regime.
- [x] Aktivt regime har egen varighed, momentum, stabilitet, sampleantal og verificeret dækningsmål.
- [x] `shadow-v2` er dokumenteret og regressionstestet som score-neutral.
- [x] Den midlertidige Pages-mikrotest er fjernet, så den ikke ved et uheld kan overskrive produktionssiden.
- [ ] Produktionslogs fra mindst tre friske timer skal stadig bruges til faglig stabilitetsvalidering før scoreaktivering. 4.0.115 nåede ikke produktion, fordi en ældre DMI U/V-gridfejl blev afsløret af release-auditen.


## 4.0.116 – IMPLEMENTERET LOKALT, AFVENTER CI/PRODUKTION
- [x] Strøm-U/V og vind-U/V vælges kun fra nærmeste fælles fysiske DMI-gitterpunkt.
- [x] DMI-strøm-U/V isoleres pr. vertikallag; samme vektor må aldrig blande dybder, og dybeste gyldige fælles lag vælges deterministisk (parser v11).
- [x] Ældre cachede U/V-par med forskellige dokumenterede gitterpunkter invalideres sikkert.
- [x] Vandstandskilder samples kun for `sea-mean-deviation` og er fjernet fra almindelige forecastdækningsmål.
- [x] Schedulerens zoneunderskud beregnes på aktive forecastzoner og ikke `SOURCE::`-hjælpepunkter.
- [x] Manglende vind/bølge/null håndteres null-sikkert i score-, regel-, best-time-, retnings- og UI-kæden; ægte nulværdier bevares.
- [x] Eksternt croninterval dokumenteret som 15 minutter.
- [x] `shadow-v2` og eksisterende morfologi forbliver score-neutrale/uændrede.
- [ ] CI skal bevise, at den strenge current spatial audit består med den nye fælles-grid-logik.
- [ ] Produktion og sitetest skal kontrollere femdøgnsfelter: reelle datagab vises som `Mangler`, og tilgængelig vind/bølge må ikke forsvinde.


## 4.0.117 – PRODUKTIONSVERIFICERET / CODEX-HANDOFF
- Schedulerens aktive-zone-nævner og `wind`-familie er implementeret.
- Geografisk DKSS-recovery er implementeret og efterfølgende kørt i produktion.
- U/V-gridintegritet er udvidet med vertikallagsisolering; parsergeneration 11 er aktiv i 4.0.117.
- Den seneste centrale adminzonegeometri blev hentet og anvendt i frisk #1750-kørsel, som gennemførte succesfuldt.
- 4.0.117 commit `6c1dece…` er derfor den dokumenterede overgangsbaseline.
- Codex AI-dokumentationspakken og CHAT-0014 er tilføjet som dokumentationslag uden ændring af RavScore.
- Åben: femdøgnshorisontens yderste `missing` for enkelte marine felter samt øvrige aktive roadmapkrav.

## Codex bootstrap-status 2026-08-07
- Aktuel `main`: `a164b6e…`, 4.0.117 handoff v2.
- #1760 deployede denne kode og den seneste synkroniserede admin-geometri, men de fulde `npm run validate`/`npm run release:gate` steps var `skipped`.
- Status må derfor ikke være "stabil baseline" endnu.
- Første Codex-implementering er workflow-gatefikset; først derefter kan næste fulde grønne run lukke stabiliseringsfasen.

## Første Codex-rettelse – releasegates
- [x] `npm run validate` og `npm run release:gate` er nu betinget alene af, at preflight beslutter at bygge frisk produktionsdata.
- [x] Billigt preflight-skip uden artifact/deploy er bevaret.
- [x] Workflow-kontrakttesten kræver begge gates før Pages-artifactet og forbyder trigger-/force-betingelser på gates.
- [x] #1772 på `292b4024…` viste central sync, frisk produktionskæde, begge fulde gates, artifact og Pages-deploy som `success` i samme run.

## Forecast-edge og schedulerbalance – 2026-08-08
- [x] #1774-supportdata er målt på alle 208 aktive zoner og gennem hele bulk/public-kæden.
- [x] Public projection bevarer manglende værdier korrekt; der er ikke fundet ny `null -> 0`-fejl.
- [x] Rodårsagen til den brede vindmangel er schedulerudsultning: 203/208 marinezoner var dækket, men fem huller holdt begge collection-pladser på DKSS.
- [x] Balanceret recovery ved mindst 95 % marinegrundlag er implementeret med én marineplads og én plads til mest underdækkede vind/bølgefamilie.
- [x] Regression dækker både bred marine-first recovery og den målte 203/208-profil.
- [x] #1778/#1779 og #1785 har bevist HARMONIE-forsøg, fulde releasegates, deploy og forbedret offentlig basiscoverage.
- [x] #1778 og #1779 beviste balanceret rækkefølge `dkss_lf,harmonie_dini_sf`, begge collections som `success`, fulde gates og deploy.
- [x] Offentlig vind steg progressivt fra 21/208 zoner i #1774 til 199/208 i #1779.
- [x] Udløbne HARMONIE-forecasttrin ældre end én time filtreres nu før download, så det begrænsede bytebudget bruges på aktuelle/fremtidige trin.
- [x] #1785 korrigerede målet: HARMONIE-samlingens native horisont er cirka 60 timer, så 96-timers vinddækning er ikke et gyldigt succeskriterium.
- [x] #1783 beviste, at udløbne HARMONIE-trin filtreres, og at aktuelle trin behandles; fulde gates og build bestod.
- [x] Nyeste, endnu ufuldstændige modelgeneration må ikke nulstille en brugbar progressiv generation. HARMONIE fastholdes ved mindst 48 resterende timer; marine samlinger fortsat ved 96.
- [x] Run-valget eksponerer valgt/nyeste generation, deres fremtidige horisont samt om et ufuldstændigt nyt run er udskudt.
- [x] #1785 beviste valg af 18Z frem for den kortere 21Z-generation samt fulde gates/deploy.
- [ ] Næste produktion skal bevise, at 48-timersreglen fastholder 18Z og bygger videre mod 24/48-timers vinddækning.

## Planlagt større forskningsopgave – RavScore og kystprocesser
- [x] Forskningsopgaven er registreret i roadmap og RDKS som P3 under DEC-0029.
- [x] Afhængigheder og stopregel er fastlagt: ingen start før forecast-/schedulerstabilisering og højere P0/P1-opgaver; ingen automatisk produktionskode eller scoreændring.
- [x] Det aktuelle forbud mod generelle strømbånd består, mens en senere forskningsrunde må revurdere den under streng evidens- og valideringspligt.
- [x] Forskningsprotokollen fastslår, at viste vindpile ikke afgrænser vindanalysen; relevant rumlig og historisk vind uden for pile-/zonepunkterne skal undersøges sammen med bølge-/strømkobling og dobbelt-tælling.
- [ ] Fase A: permanent kildekritisk forskningsgrundlag.
- [ ] Fase B: audit af faktisk RavScore-kode mekanisme for mekanisme.
- [ ] Fase C: konceptuel fysisk systemmodel før scoremodel.
- [ ] Fase D: evidensmatrix, strømstrukturkonklusion og prioriterede valideringseksperimenter.
- [ ] Eventuel implementering kræver en ny, særskilt brugerbeslutning efter forskningsleverancen.

## P1 – komplette DMI-first femdøgnskæder
- [x] Produktkravet og analyse-/stopreglen er registreret i DEC-0030 og REQ-DATA-007–010.
- [x] HARMONIEs cirka 60 timer er klassificeret som native kildehorisont, ikke som samlet produktmål.
- [x] #1788 produktionsverificerede 48-timers HARMONIE-fastholdelse, genbrug af fire assets og vækst fra fire til syv behandlede forecasttider; fulde gates og deploy bestod.
- [ ] Kortlæg eksisterende runtimekæde, faktisk horisont/runfrekvens og alle relevante DMI-alternativer pr. komponent.
- [x] Fase A er startet i `docs/research/DMI_FIRST_FIVE_DAY_SOURCE_AUDIT.md`: aktuel kodekæde, officielle DMI-horisonter, runfrekvenser, opløsninger, vilkår og foreløbige alternativer er dokumenteret.
- [x] Frisk #31849701179-audit dokumenterer 118 monotone timer i 210 zoner, komplet DMI-timeproveniens for vind/bølge/strøm/vandtemperatur og GMT/UTC i den aktive Open-Meteo-kæde.
- [ ] Den samme audit viser mange tilbage-skift mellem DMI og fallback samt fuldt tab af vandstandsidentitet efter continuity-trinnet; spor ægte datagab, cache/run-overgange og provenancebrud før design.
- [ ] Verificér faktiske WAM-/DKSS-vindfelter og overlap mod HARMONIE i friske runs; auditér samtidig Open-Meteo-modelidentitet.
- [ ] Vurder først derefter tail-fallback, overgangskvalitet, proveniens, automatiske dækningsgates samt konsekvens for RavScore og UI.
- [ ] Implementering og produktionsverifikation kræver efterfølgende dokumenteret design; ingen blind fallbackændring er godkendt.

## 4.0.119 – DKSS-vindhale, parser og scheduler
- [x] #1828 beviste `wind-tail-u-10m`, men manglende `wind-tail-v-10m`.
- [x] Lokale DKSS-id'er 33/34 er autoritative foran generiske ecCodes-navne. Parser/parameterkort er 13/4.
- [x] Schedulerrotation følger manglende komplet U/V-vindhale pr. zones DKSS-collection.
- [x] Regression reproducerer id 34-konflikten og en 208-zoners rotationsprofil.
- [x] #1831 beviste U+V i `dkss_idw`, 107 vindhalezoner ≥96 timer, fulde gates og deploy. Offentlig samlet vind: 200/208 med data, 108/208 ≥96 timer og maksimum 111,5 timer.
- [ ] De automatiske runs skal nu rotere LF/NSBS ind og måles, så de resterende geografiske huller lukkes mod produktmålet 118–119 timer.
## Supabase Free-plan-kvotekontrol
- [x] Ufiltreret 15-minutters readback af alle `admin_documents.payload` er erstattet af server-side nøglefilter; central adminhydrering forbliver før preflight.
- [x] Beskyttede pipelineuploads har SHA-256-manifest og springer uændrede payloads over.
- [x] Ny triggerkontrakt bevarer rollback for adminredigerede dokumenter, men versionskopierer ikke udskiftelige maskindiagnostikker.
- [x] Read-only størrelsesaudit og transaktionel, bounded oprydningsmigration er versionsstyret; aktuelle `admin_documents` slettes aldrig.
- [x] Central audit og migration kørt 2026-08-10: 8.647 rækker/cirka 600 MB blev fjernet, `VACUUM FULL` reducerede databasen fra 699 MB til 24 MB, 14 aktuelle dokumenter er intakte, og maskinhistorik er 0.
- [ ] Følg egress i næste billingperiode; dashboardets historiske 8,28 GB nulstilles ikke af kodeændringen.

## 4.0.199 – trinbevidst anvendelse af land-/vandevidens
- [x] Foreløbig punktbestand kan udskyde rettelser til dele, der først skabes af den senere ejerrettelsesfase.
- [x] Metadata angiver faktisk anvendte rettelser og konkrete udskudte id'er.
- [x] Slutbestanden anvender fortsat streng kontrol uden undtagelse.
- [ ] Privat national workflowkørsel skal bevise både den foreløbige udskydelse og den afsluttende fulde anvendelse.

## 4.0.200 – konsistent status efter uafhængig punktrettelse
- [x] En sikkert korrigeret række får forslagstatus, tomme gamle blokeringer og deaktiverede downstreamflag.
- [x] Foreslået/blokeret-summer genberegnes efter rettelser.
- [x] Målrettet regression flytter en syntetisk blokeret DK-B07-21-række fra 0/1 til 1/0 og består punktkontrakten.
- [x] #31798588868 passerede den foreløbige punktkontrakt, native DMI-grid, marine flertrinsserier, state, vind og shadow-score med 832 foreslåede og tre blokerede dele.
- [ ] Frisk privat national kørsel skal fortsat passere den afsluttende punktkontrakt efter ejerrettelserne; #31798588868 nåede ikke dette trin på grund af den separate reviewtæller nedenfor.

## 4.0.201 – bestandsafledt ejer-review og admin-roundtrip
- [x] #31798588868 dokumenterede en indbyrdes konsistent finaliseret foreløbig bestand på 835 dele: 828 komplette, fire delvise og tre blokerede.
- [x] Reviewgaten sammenholder nu geometri, navne, punktstatus, shadow-ID'er og alle tællinger 1:1 i stedet for at kræve det historiske 783-tal.
- [x] Admin-roundtrip læser, skriver og rapporterer reviewets faktisk validerede delantal og afviser uoverensstemmende input.
- [x] Målrettede 835/828/4/3-regressioner samt hele `test:coastal-geometry-v2` består lokalt.
- [ ] Ny privat national kørsel skal bevise review, endelige 121 punktrettelser, slut-DMI, slut-shadow-score, central roundtrip/rollback og artifacts samlet.

## 4.0.202 – robust tidsbudget til nationale native DMI-gates
- [x] #31801993662 produktionsverificerede 4.0.201 med fuld validering, releasegate, frisk DMI, Supabase og Pages.
- [x] #31802022918 bestod 27 nationale trin og reproducerede punktbestanden, men ramte standardtidsbudgettet under `dkss_lf` efter 11,1 minutter; samme gate bestod i #31798588868 på 8,5 minutter.
- [x] Foreløbig, endelig og fallback-baseret national DMI-gate har nu eksplicit `DMI_BULK_MAX_RUNTIME_SECONDS: 3000`, som allerede bruges af den nationale vindgate.
- [x] Workflowregressionen kræver budgettet på alle tre DMI-gates uden at ændre datakrav eller offentlig runtime.
- [ ] Ny privat national kørsel skal fortsat bevise hele kæden gennem review, slutpunkter, slut-DMI, shadow-score, roundtrip/rollback og artifacts.

## 4.0.203 – eksakt kandidatbundet land-/vandevidens

- [x] #31804967576 beviste, at 3.000-sekundersbudgettet virker, og nåede gennem første DMI, vejridentitet, flertrinsserier, state, vind, shadow-score, review og dubletaudit.
- [x] Fejlen efter review er dokumenteret som bestandsdrift: det gamle 121-rettelsesbevis var lavet til 673 aktive dele og kunne ikke anvendes sikkert på de private 835-/652-delsbestande.
- [x] Foreløbig, endelig og fallback-kandidat har nu hver sit eksakte delantal og SHA-256-fingeraftryk af ukorrigerede punktpar.
- [x] Tvetydige dele blokeres uden aktive punkter. 4.0.203's foreløbige optælling blev efterfølgende afvist som ikke-rå af #31812035188; den bindende rå optælling står under 4.0.204. Slutstatus er fortsat 427 verificerede, 111 rettede og 114 blokerede; fallbackstatus er 11 verificerede, fire rettede og to blokerede.
- [x] Fallbackbygger og validator kan ikke genindføre Fejø/Femø eller Havnø/Mariager Fjord øst.
- [x] `test:coastal-geometry-v2` og workflowrækkefølgen består lokalt.
- [x] Normal 4.0.203-produktion bestod fulde releasegates, DMI, Supabase og Pages i #31811492510.
- [x] Privat #31812035188 beviste, at fingeraftryksgaten stopper et første bevis, som var lavet efter 107 historiske korrektioner.

## 4.0.204 – første bevis direkte fra rå GitHub-kandidat

- [x] Den rå 835-dels punktfil fra #31812035188 er auditeret direkte: 520 verificerede, 149 sikkert vendte og 166 blokerede.
- [x] Slutbevisets fingeraftryk matcher fortsat den rå 652-dels GitHub-fil fra #31804967576; fallbackbeviset matcher sin rå 17-dels fil. De to beviser ændres ikke.
- [ ] Normal 4.0.204-produktion skal bestå fulde releasegates og deploy.
- [ ] En ny privat national kørsel skal bevise de tre eksakte beviser, DMI for valgte/alternative punkter, slut-shadow-score, admin-roundtrip/rollback og artifacts samlet.
- [x] DEC-0030 er eftermaalt read-only paa 4.0.237-produktionsartifact `#3237` med nye WAM 18Z- og DKSS 12Z-beviser samt delvis HARMONIE 12Z-indfasning.
- [ ] Det kompatible `controlled-live`-historikvindue er 28,903 timer fra 4.0.232-aktiveringen og skal fortsat opbygges naturligt til mindst 72 timer; ingen bagudfyldning.
- [x] `#3242` afgraenser falsk fastlaast verificeret historik til mismatch mellem sampletidens `productionReferenceAt` og efterberigelsens `generatedAt`; kode og maalrettede tests er rettet/groenne.
- [x] Isoleret fuldt artifactreplay loefter `#3242` fra 22,563 til 30,903 verificerede timer i 198 zoner og bevarer de samme 12 reelle parent-zonehuller.
- [x] Frisk central produktion `#32344813967` beviste, at de 198 verificerbare hovedzoners historiespaend igen vokser efter den timeskarpe rettelse; de 12 reelle parent-zonehuller forbliver eksplicitte.

## 2026-08-20 - P0.3 afsluttet
- Naturlig produktion `#32351140886` byggede og deployede `rr-20260820085852-210` med alle relevante gates, Supabase og Pages.
- Fuld online regression er grøn: 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger, nul fejl.
- Mergeautoritet er opdateret i `AGENTS.md`, Codex-starten, AI Working Rules og RDKS operating rules.
- Implementeringen er uændret; denne blok flytter ingen punkter og ændrer ingen score-, data-, geometri- eller runtimekontrakter.

## 2026-08-20 - post-merge P1 #3256
- [x] PR #2 merge `e1f835a3` er verificeret i frisk produktion, artifacts, Supabase, Pages og 210/673-browserkontrol.
- [x] P1 #3256 er målt read-only med det eksisterende komponentmatrix-audit: 70 rå prøver/41,489 timer i alle zoner, 198 verificerbare zoner med samme spænd og 12 uændrede parenthuller.
- [x] Modelcyklusser og overgangsmål er klassificeret som stabil drift uden ny uafhængig HARMONIE-, WAM- eller DKSS-start.
- [ ] 72-timers rå/verificeret historik og 168-timers supplement/shadow er fortsat naturlige tidskrav og må ikke backfilles.
- [x] De ni berørte workflows er mekanisk opgraderet til officielle Node 24-actionmajorer uden ændrede gates, jobrækkefølger eller betingelser. PR-CI og frisk produktion afventer.
- Ingen kode-, score-, data-, geometri- eller punktaftale er ændret af checkpointet.

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

## P1-checkpoint efter produktion #3261
- [x] Read-only eftermåling dokumenterer 72 rå prøver/42,866 timer i alle 210 zoner og 42,866 verificerede timer i 198 geografisk verificerbare zoner.
- [x] De 12 parenthuller er fortsat nul og klassificeret; 673/673 lokale dele er fortsat dækket af den kontrollerede livepilot uden punktflytning.
- [ ] Det naturlige 72-timerskrav er ikke nået. Ingen historik må bagudfyldes.
- [ ] Shadow-cachens cirka 105,3 timer skal vokse til 168 naturlige timer; pilothistorikkens 57 timers globale validtidsinterval er ikke i sig selv retentionbevis.
- [ ] Nye uafhængige modelstarter skal eftermåles før permanent komponentgrænse. #3261 er stabil drift, ikke en ny DEC-0030-cyklus.
## Lokal kildekontrol på Windows
+- [x] Python-pakkekontrollen er gjort kompatibel med både Windows PowerShell og PowerShell 7.
+- [x] En kildekontrakt afviser den tidligere citatform, som Windows PowerShell ændrede på vej til Python.
## Post-merge verifikation #3263
+- [x] PR #8/merge `6d63ac3a` bestod fuld central produktion, releasegate, Supabase og Pages.
+- [x] Artifact/live-hash og fuld 210/673-browseraudit er grønne med nul fejl.
+- [x] Den portable Windows PowerShell-kildekontrol er dermed også gennemført i PR-CI og frisk produktion.
+- [ ] P1 er vokset til 43,31 verificerede timer i 198 zoner og cirka 105,75 timers shadow-capture; 72/168-timerskravene er fortsat åbne.
## RavScore-forskning fase A-B
+- [x] Autoritativ aktiv scorekode og alle direkte justeringsveje er kortlagt.
+- [x] Konceptuel model adskiller lager, mobilisering, transport, levering/aflejring og jagtbarhed.
+- [x] Første evidensmatrix klassificerer amber-, Baltic-, sediment-, bølge-/strøm- og analogkilder med begrænsninger.
+- [x] Aktuelle tærskler og 40/35/25-vægte er markeret som arbejdshypoteser uden klasse A-kalibrering.
+- [ ] Fase C-D: materialefysik, dansk overførbarhed, kodefølsomhed, overlap/ablation, fund-/nuldata og hold-out-validering.
## RavScore fase C
+- [x] `scripts/audit-ravscore-sensitivity.mjs` er implementeret som skrivebeskyttet audit og self-test.
+- [x] Kildegaten og den fulde scoretest inkluderer auditens deterministiske kontrakt.
+- [x] Tærskelspring, missing-asymmetri, overlap og syntetiske komponentkorrelationer er dokumenteret.
+- [ ] Virkelighedsvalidering, ablation og glatte kandidatfunktioner mangler; aktiv score er uændret.
## RavScore fase C produktion
+- [x] PR #11/`e85de36d` er grøn i lokal gate, PR-CI og frisk fuld produktion `#32366326503`.
+- [x] Artifact/live-hash og fuld browseraudit bekræfter 210/673 og nul synlige regressioner.
+- [x] Følsomhedsauditen er permanent og score-neutral.
+- [ ] Fase D og virkelighedsvalidering mangler fortsat.
## RavScore phase D design status - 2026-08-20
- Complete: candidate architecture, anti-double-counting constraints, sensitivity/calibration/product gates, privacy rules and observation JSON Schema.
- Not implemented: candidate coefficients, candidate runtime, observation intake or production score changes.
- Next: internal immutable forecast-snapshot linkage and an anonymized coverage report.

## 4.0.239 observation safety - 2026-08-20
- Implemented locally: remote GPS redaction, legacy-outbox redaction and local sync-metadata removal.
- Implemented locally: phase D coverage report with score suggestions locked.
- Pending: PR/production verification, immutable forecast-snapshot linkage and explicit search-effort capture.
- Pending owner-authorized migration: remove any historical central GPS values after a count-only audit and rollback plan.

## Status 2026-08-20 - RavScore fase D og workflow
- Afsluttet: observationstransport er GPS-redigeret før fjernlagring, inklusive outbox-genforsøg.
- Afsluttet: læringsanalysen er dæknings-only og kan ikke oprette modelpatches eller scoreforslag.
- Afsluttet: hurtig kildekodegate før DMI og sen Copernicus-cachegendannelse er merged og produktionsverificeret.
- Produktionsbevis: run `32374202688`, commit `b1d0e422a3322d393a7eeb32d5af4837cd6a779f`, 673/673 kystdele, Pages-deployment grøn.
- Næste sikre delmål: gør livehistorikkens tidlige dækningsrapport tidskorrekt, så historisk dækning ikke forveksles med en scorebar post fra aktuel time og frem. Dette må ikke ændre strømvalg eller score.
- Fortsat låst: RavScore-model B0 ændres ikke uden fase D-kalibreringsgate og særskilt evidens.

## Status 2026-08-20 - tidsdækning afsluttet
- Afsluttet: live-current-rapporten måler scoreklar aktuel/fremtidig dækning separat fra bevaret historik.
- Afsluttet: live-current-selvtesten indgår i den hurtige pre-DMI-kildegate.
- Afsluttet: push, schedule og normal/forceret produktion bindes til readiness-jobbets eksakte UTC-time gennem hele bygget.
- Produktionsbevis: commit `c73a10d32f2aab15c63787ecb71893fd9275bbf6`, run `32379229853`, 673/673 scoreklare og verificerede kystdele.
- Næste roadmapdel: RavScore fase D-observationsdækning og evidensgate. Produktionsmodel B0 og kandidaternes scorepåvirkning forbliver låst.

## Status 2026-08-20 - databaseprivacy
- Implementeret i source: idempotent Supabase-migration, RLS-checks og `NOT VALID` databaseconstraint for ny fjern-GPS.
- Valideret lokalt: `test:observation-db-privacy` indgår i både fuld validering og den hurtige pre-DMI-gate.
- Ikke endnu produktionsverificeret: selve SQL-migrationen er ikke anvendt på den centrale Supabase-database.
- Næste gate: kontrolleret migration, positiv GPS-null insert-test og negativ GPS/lokationsnøgle-test uden eksport af rå payloads.

## 4.0.240 jagtbarhed og sikkerhed

- [x] UI-kopi adskiller praktisk jagtbarhed fra sikkerhed.
- [x] Markdown-håndbog og webhåndbog har samme kontrakt.
- [x] Automatisk kildekontrol er tilføjet.
- [x] Målrettede tests, validate:source og release-gate.
- [x] Lokal Browser-kontrol af aktuel visning og fem-døgnsvisning på desktop og mobil.
- [x] PR #23, merge, frisk produktionsdatagate, deploy, direkte kildekontrol og systematisk onlineaudit.

## 4.0.241 aktiv bølgeprior

- [x] Fælles bølgeretning-/periodefunktion og begrænset transportjustering.
- [x] Sikker fallback, forklaring og diagnostik.
- [x] Målrettet test og national offentlig auditværktøj.
- [x] Syntetisk audit af 55.296 scenarier og national offentlig audit af 210 zoner/673 beregnede kystdele.
- [x] `validate:source`, release-gate og lokal desktop-/mobilbrowserkontrol.
- [x] PR #25, merge `eb66b280`, frisk fuld produktion `#32405699346` og direkte deploykontrol.
- [x] Onlineaudit på `rr-20260820185733-210`: 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden fejl.

## 4.0.242 - foreløbige RavScore-vægte

- [x] Aktiv kodekandidat bruger 25 % jagtbarhed, 40 % transport og 35 % mobilisering.
- [x] DEC-0041 afgrænser ændringen til vægte og kræver senere fund-/nul-fundkalibrering.
- [x] DEC-0032-ID-kollisionen for bølgeprioren er rettet til DEC-0040.
- [x] Syntetisk audit af 9.261 kombinationer og national audit af 673 dele/42.846 scoreposter; 420 viste zoner ændres i gennemsnit minus 6,314 point og kun 7 skifter vindende del.
- [ ] Source-/release-gate og lokal browserkontrol.
- [ ] PR, frisk produktion og systematisk onlineaudit.
## 4.0.242 lokal gate-status (2026-08-20)

- Kildevalidering og lokal release-gate: bestaaet.
- Browser-plugin, desktop og mobilbredde: teknisk indlaesning bestaaet.
- Frisk 4.0.242-produktionsdata og visuel 25/40/35-konsistens: afventer deploy og er en bindende merge-efterkontrol.
- Fuld online browserkontrol af 210 zoner og 673 kystdele: afventer det friske 4.0.242-datasat.
## 4.0.242 afsluttet (2026-08-21)

- Implementeret og produktionsverificeret: 25 % jagtbarhed, 40 % transport og 35 % mobilisering.
- Kildegate, fuld friskdata-validering, release-gate, deployment, fuld onlinekontrol og mobilkontrol er bestået.
- 7.560 synlige delscoreforklaringer er kontrolleret for korrekt vægt, delscore og pointbidrag.
- Den tidligere status om afventende deploy og onlinekontrol er erstattet af dette resultat.
- Vægtningen forbliver foreløbig, indtil repræsentative fund- og nul-fundsture giver grundlag for kalibrering.
## Fase D observerede fordelinger og tripgate

- Implementeret score-neutralt: `scripts/audit-ravscore-observed-ablation.mjs` med deterministisk self-test i `validate:source`.
- Dokumenteret: nationale fordelinger, komponentablation, driveroverlap og zonevinderbias i 4.0.242.
- Besluttet i DEC-0042: tripniveau, indsats, faktisk kystdel og immutable forecast-link er obligatorisk før senere fit.
- Erstattet og udgivet: 4.0.243 leverede den dataminimerede tripkontrakt. 4.0.264 fjerner den resterende gamle GPS-baserede parallelrejse fra den aktive brugerflade; GPS-redaktion og kalibreringslås bevares.

## 4.0.243 kandidatstatus

Implementeret og målrettet testet: v2-kontrakt, JSON Schema, korrekt observationsmigration, start-/slutdialog, lokal kø, observations-outbox, offentlig scoreadapter, legacy-bro og app-tilkobling. Lokal Browser-plugin-kontrol bestod med 210 zoner og nul browserfejl. Ikke implementeret i produktion: Supabase-migration og efterfølgende deployverifikation. RavScore er ikke ændret.
## 2026-08-21 - Trip evidence v2 databaseklar

- **Implementeret i produktionens skema:** additive v2-felter, identity-kompatibilitet, klient-UUID-indeks, unik v2-tur, v2-checkconstraint og stramme privacy-politikker.
- **Verificeret:** offentlig kolonnekontrol, metadata for identity/constraints/indeks, anonym insert i en fuldt tilbagerullet transaktion og efterfølgende nul rækker.
- **Ikke udgivet endnu:** browserkoden på den lokale 4.0.243-kandidat. PR #31 peger fortsat på den tidligere push'ede commit og forbliver kladde.

## 2026-08-21 - Trip evidence v2 udgivet

- **Implementeret og udgivet:** v2-turkontrakt, dataminimeret fjernpayload, lokal kø, idempotent upload, produktionsschema, stram RLS, start/stop-flow og offentlig integration.
- **Produktionsverificeret:** merge `2ded7943`, run `32455335962`, live 4.0.243 og fuld 210/673-browserkontrol uden fejl.
- **Uændret:** RavScore 25/40/35, DMI-først, geometri og land-/vandpunkter.
- Tidligere status om kladde-PR, ikke-pushet kode og manglende produktion er erstattet.

## Næste implementeringsfaser efter DEC-0044

- Ikke implementeret: afgrænset normal Copernicus-pilot kun for godkendte DMI-huller.
- Ikke implementeret: færdig evidenssyntese og internt forsknings-/regelregister.
- Ikke implementeret: score-neutrale kandidatregler og automatisk gammel-mod-ny-rapport til Codex-samarbejdet.
- Ikke implementeret: hændelsesmodel, ravvinduer og nye lagdelte forklaringer.
- Produktionsverificeret i 4.0.268: omfattende offentlig **Grundbog i ravjagt** via PR #118, produktion `32672578127` og grøn 210/673-browseraudit.
- Udskudt: gemte områder og varsler.
- Fravalgt: separat offentlig scoresikkerhed og gårsdagsbaseret scoreforklaring.

## 4.0.244-kandidat
- Implementeret: automatisk Copernicus-målliste med kun aktuelle lokale DMI-huller.
- Implementeret: manuel full_coast-funktion til sjælden landsdækkende forskning.
- Implementeret: målliste-id'er og fingeraftryk bindes til hver cache-samling.
- Bevaret: DMI-først, kontrolleret regional DMI-proxy, uændrede kystpunkter og uændret offentlig RavScore-kontrakt.
- Produktionsresultat: den første 4.0.244-kørsel stoppede fail-closed ved 630/673 før release og deploy, fordi den eksakte DMI-hulliste ikke kunne dannes autoritativt før frisk DMI.

## 4.0.245-kandidat
- Implementeret: endelig eksakt-times måludvælgelse efter frisk DMI i produktionsjobbet.
- Implementeret: inline Copernicus-hentning kun for den dannede DMI-hulliste, efterfulgt af den uændrede fulde 673/673-gate.
- Implementeret: privat timepilot gendanner seneste progressive DMI-cache, og cachebevaringen sender den eksakte mål-time videre.
- Bevaret: DMI-først, regionale proxyer, RavScore, land-/vandpunkter og ingen offentlig rå U/V eller credentials.
- Åben gate: målrettede regressioner, fuld kildekodegate, PR-gates og præcis produktionsverifikation.

## 4.0.246-kandidat
- 4.0.245 er merged som `b461e7a5`, men produktion `32465245055` stoppede fail-closed i måludvælgelsen. Ingen release eller deploy skete.
- Dokumenteret årsag: den låste 08:00-time havde ingen lokal DMI-strøm, mens den nærliggende 09:00-time havde 622/673 og dermed 51 reelle supplementmål.
- Implementeret: ved nul eksakt dækning vælges den højest dækkede, derefter nærmeste verificerede DMI-strømtime inden for højst tre timer; ved lighed foretrækkes fremtidig prognosetime.
- Implementeret: den valgte time eksporteres maskinelt og bindes før Copernicus, livefletning og den øvrige vejr-/scorekæde.
- Bevaret: fuldt stop uden nærliggende DMI-time, DMI-først, 673/673, proxyer, score, geometri og punkter.
- Åben gate: målrettede tests, fuld kildekodegate, PR, exact-head-gates og præcis produktionsverifikation.

## 4.0.247 - testmatrix

- [x] Cost/benefit er målt og dokumenteret i docs/research/TEST_VALIDATION_COST_BENEFIT_2026-08-21.md.
- [x] Workflowregressionen kræver kildekodegate på push/manuelle builds og tillader skip alene på planlagte same-source builds.
- [x] Fuld post-data validate/releasegate er uændret obligatorisk ved ethvert nyt deploybart artifact.
- [ ] Exact-head PR-kildegate, merge og frisk produktionsverifikation mangler for kandidaten.
- [x] Ingen browseraudit kræves, fordi UI, score og offentlig datakontrakt er uændret.

### Produktionslukning

- [x] PR #37 exact-head-kildegate bestod.
- [x] Merge 3dc331ca og produktion 32468752244 bestod fuld post-data validering, releasegate, Supabase, artifact og Pages.
- [x] Live 4.0.247 viser 210 zoner og 673 kystdele.

## 4.0.248 - gammel/nuværende/kandidat-værktøj

- [x] Registrér stabile model- og regel-ID'er.
- [x] Opdel procesprioren i Kandidat A, B og C uden produktionspåvirkning.
- [x] Tilføj gammel-mod-nuværende vægtsammenligning på offentlige produktionsposter.
- [x] Tilføj dataminimeret dansk ejer-rapport oven på eksisterende audits.
- [ ] Generér rapporten på den aktuelle live-dataset og dokumentér de vigtigste fund.
- [ ] Kør målrettede tests, exact-head PR-gate og præcis produktion. Ingen 210/673-browseraudit kræves før en reel score/UI-ændring.

## v4.0.248-kandidatgennemgang (2026-08-21)

Den automatiske ejeroversigt og den faglige gennemgang er nu genereret. Dette afsnit erstatter tidligere status om, at rapporten manglede. Konklusionen er at beholde den aktive vaegtning 25/40/35 og ikke aktivere A, B eller C samlet. A er for volatil, B skal skelne levering fra passage, og C er en mulig mild fysisk gate, men der er kun 3 af 1.346 aktuelle kystdele med mindst middel score og et tydeligt svagt fysisk led. Naeste trin er derfor score-neutral intern skyggekoersel og maalrettet retningskontrol, ikke en offentlig scoreaendring. Se `docs/research/RAVSCORE_CANDIDATE_REVIEW_2026-08-21.md`.

## v4.0.249: privat RavScore-kandidat-shadow

Den eksisterende private nationale shadow-validator beregner nu A, B og C på samme lokale context som den aktive score. Den bruger 24 timers hændelseshistorik og 72 timers strømforløb, opdeler kandidat B i strøm mod, langs og væk fra kysten og gemmer kun dataminimerede forskelle. Den aktive vægtning 25/40/35, offentlig score, UI, vejrsampling, admin-data og geometri ændres ikke. Koden er målrettet selftestet; næste evidens er én virkelig privat national shadow-kørsel efter merge. Se DEC-0047 og `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`.

## 4.0.250 - implementeret, afventer foerste naturlige shadow-artifact

- Implementeret: `ravscore_active_shadow` som separat manuelt workflowjob med `contents: read`.
- Implementeret: aktivt 210/673-runtimeinput i den eksisterende private punkt-/plankontrakt.
- Implementeret: native DMI-grid, flertrins marine, state/historik, vind og A/B/C-shadow uden deploy eller aktivering.
- Lokalt verificeret: builder-selftest, workflowkontrakt og realistisk komplet 210/673-input.
- Afventer efter merge: exact-commit PR-gate, produktion og foerste manuelle nationale shadowkoersel.

## 4.0.251 - implementeret, afventer national genkoersel

- Implementeret: collection-sammenhaeng indgaar i wave- og DKSS-familieklassifikation.
- Implementeret: U/V-sammenhaeng kraever baade samme fysiske punkt og samme collection.
- Testet lokalt: national grid-selftest, shadowkontrakt og marine flertrinsserie.
- Foerste 4.0.250-run `32479158213`: 673 gyldige punkter; stoppet foer state/score paa inkonsistent DKSS-dækning.
- Afventer: PR-gate, 4.0.251-produktion og groen aktiv 210/673-shadowgenkoersel.

## 4.0.252 - fair landsrangering produktionsverificeret

- [x] Fælles `direction-broad-19-v1`-funktion for dagens og femdøgnets nationale lister.
- [x] Retningsmulighed bruger samme 360-graders matematik som den nationale analyse.
- [x] Støtteværn giver nul korrektion ved helzone eller mindst 50 procent støtte.
- [x] Den viste RavScore og alle lokale resultater er uændrede.
- [x] Kort forklaring er tilføjet ved begge landslister.
- [x] Målrettet 210/673-regression er tilføjet til den normale valideringskæde.
- [x] PR #52 exact-head-gate, merge `ad70fbca`, exact-commit-produktion `32515757957` og fuld online 210/673-browserkontrol er grønne.

## Historik – RavScore Candidate G før aktivering

- [x] Parret historisk retningskontrol isolerer retning fra forskelle i tidspunkt og styrke.
- [x] Retningsresultatet er opdelt efter lav, mellem og hoej fysisk bevaegelseskapacitet samt jagtform.
- [x] Foreloebige vaegte er sammenlignet reproducerbart; 20/45/35 er valgt som naeste private analysecentrum, ikke som produktionsvaegt.
- [x] Kandidat F er omklassificeret til foelsomhedsmaessig yderkant, og den sammenblandede gamle retningskonklusion er korrigeret.
- [x] Udled stroem- og vindhukommelse fra 96-timers historik med styrke, varighed, stabilitet, vendingsalder og nettoeffekt.
- [x] Koer separate stroem-, boelge- og vindablationer samt svage/kraftige vendinger.
- [x] Gentag historisk replay og national scenariematrix med kandidat G.
- [x] Udvid national shadow-validator med G-varianterne og central slutregelkaede; centralt hydreret exact-head-run `32554012542` er grønt og score-neutralt.
- [x] Pile, score, komponenter, forklaring og jagtbarhed er samlet kontrolleret; sikkerhed er bevidst uden for modellen. Slutkontrollen er produktionsverificeret i PR #97–99.
- [x] Den endelige vægtbegrundelse blev gennemgået med ejeren; `20/50/30` blev besluttet i DEC-0054 og aktiveret i DEC-0060.
- Historisk status ved dette checkpoint: offentlig score, UI, geometri og alle land-/vandpunkter var uændrede. Den efterfølgende aktivering er dokumenteret øverst.

## Kandidat G historikhukommelse - checkpoint 2026-08-21

- [x] Generisk score-neutral eksponentiel regimehukommelse implementeret med styrke, retning og faktisk tidsafstand.
- [x] Syntetisk kontrakt beviser, at en kort svag vending ikke sletter et opbygget forloeb, og at en kraftig vedvarende vending kan overtage.
- [x] 12 historiske forloeb analyseret for stroem, boelgeenergi, lineart vindspor og vindstressspor ved 6/12/24/48 timer.
- [x] Episodeanalyse maaler varighed og nettovendinger uden at gemme raa vejrvaerdier.
- [x] Sammenlign 24-timers aktivt spor, 48-timers baggrundsspor og en lille dobbeltsporsmatrix i kandidat G.
- [x] Koer separate ablationer af stroem, boelgeenergi, lineaer vind og vindstressproxy.
- [x] Integrér 24 alene, 50/50 og 48 alene i historisk replay/parret retning med en obligatorisk variant uden direkte vind.
- [x] National scenariematrix og versionsbundet offentlig regelkaede er gennemført.
- [x] Virkelig central shadow og aktuelle ekspertregler er kontrolleret på PR #59's eksakte head; kandidatens pil-/score-/forklaringskontrakt mangler fortsat før aktivering.

## Regimehukommelse - merge- og driftsstatus

- [x] PR #56 exact-head-kildegate og merge `cd229466`.
- [x] Exact-commit-produktion `32523092260`: fuld validate, releasegate, Supabase, Pages-artifact og deploy groen.
- [x] GitHub Pages deployment `6028771928` peger paa korrekt commit; live 4.0.252 serverer forskningsmodulet.
- [x] Ingen offentlig score/UI/datakontrakt; ingen gentaget 210/673-browseraudit noedvendig.
- [x] Kandidat G 24/48-dobbeltsporsmatrix og separate ablationer er gennemført score-neutralt.

## Kandidat G 24/48-matrix og ablation - 2026-08-22

- [x] Nyt analyseværktøj bruger kun den Git-ignorerede private cache og gemmer ingen rå vejrværdier, U/V, koordinater eller credentials.
- [x] Fem foruddefinerede historikvarianter er kørt på 12 forløb med kausal normalisering og nul fremtidslæk i selvtesten.
- [x] 24 og 48 timer er ens i fortegn 98-99 procent af tiden; baggrundssporet er roligere for strøm.
- [x] Hændelsescentreret audit skelner ægte inden-for-hændelse-overlap fra forskelle mellem udvalgte hændelser.
- [x] Bølge/vind-overlap og klasseafhængige ablationer afviser vindstress som uafhængigt fuldt direkte bidrag.
- [x] Målrettet kerne-/analysetest, RDKS, lokal `validate:source` og releasegate er grønne.
- [x] PR #58 exact-head-kildegate og merge `d2211927` er gennemført før dette replaydelmål.
- [x] Ingen produktionsscore, offentlig runtime, geometri eller punkter er ændret; derfor kræves ingen frisk data-/browserproduktion for selve forskningscheckpointet.

## Kandidat G replay og beslutningsgrundlag - 2026-08-22

- [x] Kandidat G 24 timer, 50/50, 48 timer og 50/50 uden direkte vind er implementeret som diagnostic-only med stabile model-ID'er.
- [x] Historik kan kun multiplicere en eksisterende transport-/leveringsvej og skaber nul transport ved nul kapacitet.
- [x] Privat replay gennemfører 1.460 evalueringer uden beskyttet geometri, rå vejrdata, U/V eller koordinater i rapporten.
- [x] Separate historik- og totalablationer dækker strøm, bølger, direkte vind og samlet vind; lineær/stress-vind og gain-/vægtfølsomhed er med.
- [x] 24/50-50/48 er praktisk talt scoreækvivalente; direkte vind har ubetydelig selvstændig effekt, så no-direct er foretrukken næste shadowvariant.
- [x] 176 kanoniske, rotationsinvariante nationale scenarier kontrollerer vendinger, konflikter, nul kapacitet og waders-jagtbarhed uden at læse land-/vandpunkter.
- [x] National shadow-validator beregner nu alle fire G-varianter og består self-test score-neutralt.
- [x] Versionsbundet offentlig ekspertregelkaede er afspillet; nul aktive regler giver nul slutscoreændring.
- [x] Centralt hydreret national shadow `32554012542` på exact head: 673 dele/210 zoner, 243 scorede dele, 430 eksplicit u-scorede, nul blokerede og nul offentlige ændringer.
- [x] National G 50/50 minus aktiv: -5,50 point for strand og -3,74 for waders i gennemsnit; 24/48 og no-direct-wind er fortsat praktisk identiske.
- [x] Den senere landsdækkende scoreinputgate blev erstattet af den fallback-kompatible 210/673-kontrakt i DEC-0057 og lukket ved 4.0.261-aktiveringen uden ekstra rådata eller statiske retentionfeatures.
- [x] Afgør waders-produktbetydningen: strand uden loft; waders højst jagtbarheden; vinddel fuld til 6 m/s; ingen sikkerheds- eller automatisk stedegnethedsmodel.
- [x] Aktuelle centrale regler er hydreret og kontrolleret: nul aktive regler og nul matchede contexts.
- [x] Definér og kontrollér kandidatens pile, komponenter og forklaring samlet score-neutralt; offentlig UI er bevidst uændret.
- [x] Ejer-go/no-go er gennemført; den foreløbige anbefaling blev erstattet af DEC-0054–0060 og aktiv `20/50/30`.
- Historisk status ved dette checkpoint: offentlig 25/40/35, DMI-first, UI, geometri og land-/vandpunkter var uændrede.

## Reparationsstatus efter PR #59 - central regelhydrering i read-only shadow

- [x] PR #59 exact-head-gate `32565767549` og merge `6b1511e0` er gennemført.
- [x] Produktion `32565885534` stoppede fail-closed før release og deploy på en testkonflikt; ingen fejlende artifact blev udgivet.
- [x] Rodårsagen er isoleret til det brede tekstforbud `/admin/` i shadowworkflowtesten, ikke til en central skrivning.
- [x] Den tilladte kæde er låst til GET-only `sync-admin-config.py` og lokal `generate-public-admin-rules.mjs`.
- [x] Konkrete centrale skrive-, roundtrip- og Pages-veje er fortsat forbudt i shadowjobbet.
- [x] Shadowworkflowtesten er føjet til `test:workflow-action-contracts` og dermed `validate:source`.
- [x] PR #60 exact-head-gate `32566573875` på `a13e5387`, merge `41e01e2d` og exact-commit-produktion `32566631701` er grønne.
- [x] GitHub Pages deployment `6035679906` er `success`; live 4.0.252/datasæt `rr-20260822100745-210` har 210 zoner og 673 kystdele med matchende startpakkehash.
- Historisk status ved dette checkpoint: Candidate G var diagnostic-only, og 25/40/35 var aktiv. DEC-0060/4.0.261 erstatter kun aktiveringsstatussen; beskyttede data, geometri og land-/vandpunkter er fortsat uændrede.
