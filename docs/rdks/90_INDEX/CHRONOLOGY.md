# 2026-09-19 – 4.0.436 skriver fuld 673-runtime atomisk

- 4.0.435 bestod exact-head `35457292220`, PR #380 og main `725068be`.
- Normalrun `35457642258` gennemførte alle providers og byggede gyldigt
  vind- og scoreinput 673/673, men én samlet indrykket JSON-streng overskred
  V8's grænse før artifact/deploy. Krypteret fremgang blev gemt.
- 4.0.436 skriver samme private dokument kompakt og løbende med atomisk
  udskiftning, parsebar grænse og indholdsfri størrelseslog. DEC-0215.
- Før merge blev en overgangsrisiko fundet: den gemte cache er bundet til
  forgængerbundlen. En eksakt 4.0.436-only readerbro for
  `d4e8844e`/`ad2337ab…` bevarer fremgangen uden bred kompatibilitetslempelse.

# 2026-09-19 – 4.0.429 giver gemt vejr og HARMONIE samme reelle vej frem

- 4.0.428 bestod exact-head `35416314162`, PR #373 og main `a2d03d95`.
- Normalrun `35416641052` gemte alle providercacher, men stoppede sent på
  gammel readiness; providerfri `35419876748` stoppede på en særskilt for
  snæver saved-weather-auditregel.
- HARMONIE valgte ét H0-asset, men prefetch + marine reserver fyldte det gamle
  arbejdsbudget, og en marine-only identitet gav et falsk parserfund.
- 4.0.429 ensretter diagnostisk fortsættelse, retter HARMONIE-identiteten og
  øger normal DMI til 1.500 sekunder. Reelle datamangler består. DEC-0209.

# 2026-09-19 – 4.0.428 sikrer H0-forsøg og fortsætter sikkert til deploy

- 4.0.427 bestod exact-head `35410861514`, PR #372, main `abf0274f` og grøn
  backend `35411487128`.
- Normalrun `35411701055` beviste 665/673 aktuelle strømdele i scoreinputtet,
  men ingen HARMONIE på grund af arvet cooldown og intet Pages på grund af en
  for snæver historisk seal-regel.
- 4.0.428 omgår kun cooldown for ét nødvendigt H0-asset og bruger den
  afgrænsede diagnostiske deploykontrakt uden at åbne kalibrering. De reelle
  datamangler forbliver åbne. DEC-0208.

# 2026-09-19 – 4.0.427 bevarer operationel strøm og lukker tidligste DMI-hul

- 4.0.426 bestod exact-head `35404863947`, PR #371 og main `41a39bbc`.
- Normalrun `35405307261` byggede 673/673 aktuelle strømdele, men adapteren
  beholdt kun 56, fordi valgfri historik kunne invalidere operationel closure.
- 4.0.427 isolerer tillidsdomænerne, gør HARMONIE-opslaget H0-smalt, sorterer
  reelle DKSS-huller kronologisk og tillader nyere privat produktion over en
  strukturelt gyldig historisk binding. 1.122/79.414 er fortsat ufuldstændigt.
  DEC-0207.

# 2026-09-19 – 4.0.426 genopbygger kun ved reelt checkpointfravær

- 4.0.425 bestod exact-head `35403040711`, PR #370 og main `05892afc`.
- Normalrun `35403510608` viste, at checkpointet hverken fandtes i GitHub-
  cache eller Supabase, og stoppede før provider uden dataændring.
- 4.0.426 tillader den allerede aktive historical integrated-handling at bruge
  afgrænset 48-timers measured recovery ved reelt fravær. En eksisterende
  ugyldig/udløbet fil stopper fortsat; øvrige handlinger åbnes ikke.
  DEC-0206-tillæg.

# 2026-09-19 – 4.0.425 fører historical maintenance gennem checkpointet

- 4.0.424 bestod exact-head `35401458027`, PR #369 og main `0b4a08ec`.
- Normalrun `35401927838` stoppede før provider, fordi fallbacken ikke
  genkendte den korrekte midlertidige action `integrated-historical-maintenance`.
- 4.0.425 fortsætter kun den handling med et fuldt valideret, aktuelt
  schema-6-checkpoint; ingen stateless cold start eller modelovergang åbnes.
  DEC-0206-tillæg.

# 2026-09-19 – 4.0.424 fører aktiv integrated forbi gammel privat runtime

- 4.0.423 bestod exact-head, PR #368 og backendrun `35400575522`.
- Normalrun `35400832705` stoppede før provider, fordi begge private runtime-
  generationer korrekt tilhørte den tidligere kontrakt.
- 4.0.424 lader kun aktiv `integrated` fortsætte til eksisterende målt stateless
  recovery; øvrige handlinger forbliver fail-closed. DEC-0206-tillæg.

# 2026-09-18 – 4.0.423 adskiller fuld datadækning fra sikker nødvisning

- 4.0.422-normalrun `35386276428` deployede og verificerede Pages, men viste
  ufuldstændig numerisk dækning og sluttede falsk rødt efter deploy.
- 4.0.423 retter samlet den fælles terminal, vindhorisont, HARMONIE-seriekant,
  replayakse, Feggesund-støttezoner og tidsestimat pr. providerfamilie.
- `MISSING` tæller aldrig som data eller komplethed; kun 100 % gyldig dækning
  er færdig. Append-only migration `20260918190000` binder inputrettelsen.
  Produktionsbevis afventer én almindelig vejrkørsel. DEC-0206.

# 2026-09-18 – 4.0.422 fører aktiv integrated source-repair gennem Pages

- 4.0.421-buildjob `105726470812` bestod hele providerfri predeploykæden.
- Pages stoppede før deploy på en gammel historisk-actionantagelse.
- 4.0.422 accepterer aktiv integrated, men kræver fortsat komplet source-
  verifikation og strict target før almindelig central reseal. DEC-0205.

# 2026-09-18 – 4.0.421 fortsætter kun en byte-identisk kendt audit

- 4.0.420 bestod exact-head `35381401273`, PR #365 og merge `069de220`.
- Providerfri `35381918986` stoppede før writes/deploy i runtimeauditen.
- Targetaudit og begge kildeaudits har samme kanoniske hash; 4.0.421
  fortsætter kun på denne tre-hash-identitet og bevarer alle senere gates.
  DEC-0204.

# 2026-09-18 – 4.0.420 samler komplet offentlig vejropdatering med central status

- Normal weather `35374238410` gennemførte alle providere, gemte caches og
  deployede/verificerede en komplet 210/673- og 79/79-pakke.
- Den sene centrale afslutning stoppede alene på gammel readiness-head, så
  Pages er foran central status.
- Providerfri `35379571657` afviste sikkert den ukendte kombination før
  mutation; 4.0.420 fastlåser den eksakte engangsgenopretning. DEC-0203.

# 2026-09-18 – 4.0.419 skelner kontraktombinding fra scoreændring

- 4.0.418 bestod exact-head `35366221956`, PR #362 og main `9573264f`, men er endnu ikke live.
- Code-only `35366953774` migrerede den beskyttede runtime som `CONTRACT_ONLY_REBIND`, men stoppede på et forkert krav om ændret score.
- Gentagelsen `35368826476` blev afbrudt; normal `35369122090` stoppede før providerkald på den gamle kontraktbinding.
- 4.0.419 fører den forseglede transitionstype gennem code-only og Pages og bevarer de strenge uændrethedsbeviser. DEC-0202.

# 2026-09-18 – 4.0.418 låser offentlig vejr til produktionens timeakse

- 4.0.417 bestod exact-head `35356064367`, PR #361, main `0890ed0e` og code-only `35356645337`.
- Normalrun `35357557315` gennemførte og gemte alle providerled, men stoppede før publicering på en forskudt zonehorisont.
- Rodårsagen var en ældre DMI-caches starttime, som skubbede +0..+117 og skar den sidste time væk.
- 4.0.418 materialiserer alle zoner på præcis produktionstime +0..+117 og viser reelle huller uden at forskyde tiden. DEC-0201.

# 2026-09-18 – 4.0.417 samler repareret state og aktuelle scorer

- 4.0.416 bestod exact-head `35351272955`, PR #360 og main `496ba278`.
- Code-only `35351928923` reparerede 673 states uden måleændringer; replay var grøn.
- 156 gemte aktuelle modes var ikke genberegnet, så kørselen stoppede før writes og Pages.
- 4.0.417 genberegner mode, offentlig delscore og zonevinder med eksakt vejr-/geometrilås. DEC-0200.

# 2026-09-18 – 4.0.416 fører kendt last-mile-state gennem privat ombinding

- 4.0.415 bestod exact-head `35348220691`, PR #359 og main `3a705259`.
- Saved-weather `35349088863` livebeviste actionrettelsen, men targetet var ikke nyere end offentlig 09:00.
- Samme-time code-only `35349313096` gendannede 4.0.410-runtime og stoppede på gammel validation før den kendte 673-dels reparation.
- 4.0.416 tillader kun den aktuelle kanoniske last-mile-reparation og grupperer ens fejl uden private payloads. DEC-0199.

# 2026-09-18 – 4.0.415 lader gemt vejr følge den sikre bindingsovergang

- 4.0.414 blev merged som `f1f33c44`; recovery `35346704791` skrev central version 24.
- Saved-weather `35346790218` installerede bindingen, men stoppede før private runtime og Pages på en gammel eksakt handlingskontrol.
- 4.0.415 accepterer begge integrerede maintenanceformer, afviser modelskift og genbruger den allerede installerede migration. DEC-0198.

# 2026-09-18 – 4.0.414 beviser den faktiske same-binding-source direkte

- 4.0.413 bestod exact-head `35343692557` og blev merged gennem PR #357 som `50216cd6`.
- Recovery `35344230599` bestod artifacts og frisk Pages, men krævede fejlagtigt første-cutover-transitionen fra en source, der faktisk var normal integrated maintenance.
- 4.0.414 validerer alle materielle sourcefelter og maintenance-sealen direkte og samler afvigelser før CAS. DEC-0197.

# 2026-09-18 – 4.0.413 validerer recoveryrapportens nyere profilblok

- 4.0.412 blev merged som `58212e59`; recovery `35342779550` bestod artifacts og frisk Pages.
- Den gamle exact-key-liste afviste den nyere korrekte `profile`-blok før CAS, så central og live forblev uændrede.
- 4.0.413 validerer både historisk og aktuel auditform uden at svække hashes eller andre beviser. DEC-0196.

# 2026-09-18 – 4.0.412 registrerer det allerede offentlige 4.0.410-target

- 4.0.411 bestod exact-head `35339636413` og blev merged gennem PR #355 som `52a7a15d`.
- Code-only og normal weather stoppede uden mutation, fordi Pages var foran central aktiv tilstand efter den tidligere sene resealfejl.
- 4.0.412 tilføjer en eksakt, same-binding og kalibreringslåst 23→24-recovery før providerfri deploy af last-mile-rettelsen. DEC-0195.

# 2026-09-18 – 4.0.411 retter last-mile-historikken og den sene reseal

- 4.0.410 blev leveret gennem exact-head `35330643842`, PR #354, main
  `ca2735af` og code-only `35331109332`.
- Normalrun `35331664087` gennemførte alle providere, gemte cacher og
  deployede/verificerede 210/673 på Pages trods runtimeauditfund.
- Auditten afgrænsede alle 673 replayfejl til `LAST_MILE_HISTORY_POINT`;
  browseren viste nødvisning, en passeret time, tre timers historik og ingen
  lokal femdøgnsprognose.
- 4.0.411 omslutter den gyldige punkt-tilstand ved genåbnet usikkerhed,
  reparerer den gamle schema-6-kant og lader normal reseal følge et sikkert
  verificeret deploy med bounded diagnostiske fund. DEC-0194.

# 2026-09-18 – 4.0.410 holder prognoser aktuelle trods kontrolfund

- 4.0.409 blev leveret gennem exact-head `35318809153`, PR #353, main `013baac8` og code-only `35320190547`.
- Normalrun `35320738621` gennemførte hele vejropbygningen og livebeviste prognoserevisionsrettelsen.
- Runtimeauditten stoppede bagefter på 673 `LAST_MILE_STATE`-fund; 420 aktuelle modes var utilgængelige, og senere kontroller/deploy blev ikke nået.
- 4.0.410 kører og samler alle uafhængige kontroludfald uden alene at blokere gyldige friske prognoser; hårde target-/main-, private-state-, privacy-, artifact- og deploygrænser består. DEC-0193.

# 2026-09-18 – 4.0.409 vælger nyeste gyldige DMI-komponent

- 4.0.408 blev leveret gennem exact-head `35310381268`, PR #352, main `891b5f3c` og code-only `35310919329`.
- Normalrun `35311408813` gennemførte alle providerled, gemte cacher og livebeviste Copernicus-rettelsen.
- Central weather stoppede på gammel og nyere gyldig DMI-bølge for samme del/time, fordi de blev behandlet som ligeværdige peers.
- 4.0.409 vælger nyeste gyldige `modelRun` pr. komponent, bevarer gammel gyldig komponent ved nyt hul og ændrer ikke RavScore-modellen. DEC-0192.

# 2026-09-18 – 4.0.408 udløber gamle Copernicus-forsøg uden at slette data

- 4.0.407 blev leveret gennem exact-head `35305418536`, PR #351, main `74ce8c38` og code-only `35306056877`.
- Normalrun `35306467385` gennemførte DMI og gemte fremgangen, men stoppede i Copernicus før Open-Meteo.
- En varig segmentjournal genindsatte et forældet forsøg efter den korrekte source-stage-rebase og udløste referencefejl.
- 4.0.408 anvender samme firetimersgrænse ved journalreplay og bevarer positive records i donorbanken. DEC-0191.

# 2026-09-17 – 4.0.407 retter vindmålet og gør replayfejlen konkret

- 4.0.406 blev live gennem exact-head `35242940822`, PR #350, main `459dc41c` og code-only `35252644724`.
- Normalrun `35253587766` gennemførte DMI, Copernicus og Open-Meteo, gemte cacher og byggede 210/673 med 192 utilgængelige aktuelle modes.
- Pages blev ikke nået: HARMONIE var ikke planlagt, og state replay fejlede 673/673 efter build.
- 4.0.407 bruger manglende 96-timers vindhorisont og rapporterer replayfejl i faste payloadfrie kategorier. DEC-0190.

# 2026-09-17 – 4.0.406 viser mobilpakken og prioriterer nødvendig delvind

- Live 4.0.405 er integreret 210/673 med 141 brugbare og 69 utilgængelige zoner.
- 296 dele mangler vind trods strøm/bølger; normalrun `35205052150` nåede ikke HARMONIE.
- 4.0.406 viser startpakken tidsmærket og forsøger ét HARMONIE-asset først ved manglende delvind.
- Exact-head `35241236001` bestod 22/24; fire UI-tekster er flyttet ud af modelclosure, så aktiv modelbundle er uændret. DEC-0188/0189.

# 2026-09-17 – 4.0.405 gør UTC-timekontrakten fælles

- 4.0.404 bestod exact-head 35215528731, PR #348 og main 5fc6e2fd.
- Saved-weather 35216079458 genbrugte 09Z uden providerkald og nåede gennem privat runtime, Edge og Pages-artifact.
- Pages stoppede før aktivering, fordi den fælles parser stadig afviste ækvivalent 09:00:00.000Z.
- 4.0.405 accepterer begge præcise UTC-former centralt; øvrige gyldighedskrav består. DEC-0187.

# 2026-09-17 – 4.0.404 normaliserer den gemte hele UTC-time

- 4.0.403 bestod exact-head 35214029193 og blev main c685c83d gennem PR #347.
- Providerfri 35214668708 stoppede før writes og Pages på 09:00:00.000Z mod den ækvivalente kanoniske 09:00:00Z.
- 4.0.404 normaliserer kun wire-formatet og kræver fortsat FRESH under 240 minutter. DEC-0186.

# 2026-09-17 – 4.0.402 afgrænser efter-vejr-kontrollen til det friske artifact

- 4.0.401 bestod exact-head 35187093136, PR #345, main 82f4fb08 og providerfri code-only 35187388134.
- Normalrun 35187767148 gennemførte alle provider-, cache-, closure-, historik-, runtime- og audittrin, men stoppede bagefter på en forældet DMI-testforventning.
- Helkæden havde 277 validate-bladkontroller og 44 historiske releasegatetests, som kunne stoppe normal vejrleverance på gamle kildeantagelser.
- 4.0.402 bruger 52 artifactkritiske og tre version-/modelbindingskontroller med samlet fejlrapport; runtime, Supabase, privacy, artifact og deploy består som hårde trin.
- Browserens gamle 4.0.398-fallback er fjernet. DEC-0184.

# 2026-09-17 – 4.0.401 sikrer den historiske kilde før fuldvalidering

- 4.0.400 bestod exact-head `35181131552`, PR #344, main `0744c79c` og providerfri code-only `35181573799`.
- Normalrun `35181918091` gennemførte provider-, cache-, closure-, historik-, build- og runtimeauditled; 4.0.400's shadow-rettelse bestod live.
- Fuldvalideringen stoppede bagefter, fordi den historiske Candidate G-test krævede `49dd4cb`, som en shallow runner med genbrugt sourceproof ikke havde hentet.
- 4.0.401 genbruger committen, hvis den findes, og henter ellers kun den eksakte pinnede commit samt bekræfter dens kendte træ før `npm run validate`. DEC-0183.

# 2026-09-17 – 4.0.400 retter falsk teststop efter grøn runtimeaudit

- 4.0.399 bestod sourcegate `35175844570`, PR #343, main `b86bcf97` og providerfri code-only `35176215202`.
- Normalrun `35176561317` gennemførte alle provider-, cache-, closure-, historik-, build- og runtimeauditled med 79.414 bogførte par og 420 lokale `MISSING`.
- Fuldvalideringen stoppede bagefter på en gammel 180-tegnssøgning, selv om det krævede 3.000-sekunders budget fandtes i det korrekte YAML-trin.
- 4.0.400 udtrækker det eksakte trin, kører testen tidligt i deploy-source-gaten og hærder versionsværktøjets capture group-erstatninger. DEC-0182.

# 2026-09-17 – 4.0.399 gendanner browserens importgraf

- 4.0.398 bestod sourcegate `35174942101`, PR #342 og blev main `d7420ade`.
- Code-only `35175276505` stoppede efter 19 sekunder før data/writes/deploy på 21 ugyldige `$14.0.398`-imports.
- 4.0.399 gendanner `?v=` og gør begge versionskontroller i stand til at afvise samme fejltype. DEC-0181.

# 2026-09-17 – 4.0.398 retter auditpræcision og delvis zonebrugbarhed

- 4.0.397 blev main `f3a200ff` efter sourcegate `35167221199`, PR #341 og code-only `35167698742`.
- Normalrun `35168055561` gennemførte DMI, Copernicus og Open-Meteo, gemte cacher og byggede 118 timer for 210/673, men auditten stoppede Pages.
- Tre bidrag og råsummen afrundes hver for sig og kan lovligt afvige `2e-6`; den tidligere `1e-6`-grænse var for snæver.
- Fuld dækning af alle kystdele er ikke det samme som brugbarhed af alle zoner. 4.0.398 skelner de to fakta og bevarer de uafhængige profilkontroller. DEC-0180.

# 2026-09-17 – 4.0.397 retter falsk auditstop efter prognosebygning

- 4.0.396 blev main `265ec215` og leveret providerfrit i `35158653973`.
- Normalrun `35159168292` gennemførte providerne, gemte cacher og byggede 118 timers prognoser for 210/673, men deploy blev stoppet af 47 del- og 1.285 zone-auditfejl.
- Auditten genafrundede tre allerede seksdecimal-afrundede bidrag ved en halv-point-grænse. 4.0.397 følger det eksakte mulige publiceringsinterval, bevarer bidragssumkontrollen og rapporterer kontrakt/formel separat. DEC-0179.

# 2026-09-16 – 4.0.393 fører ærlig Open-Meteo-missing gennem historikken

- 4.0.392 blev live som main `e84fba55` gennem sourcegate `35119195730`, PR #336 og providerfri deploy `35120023098`.
- Normalrun `35120782348` gemte alle providercacher og lukkede 79.075 værdier plus 339 lokale `MISSING`.
- History-adapteren genindførte fejlagtigt et globalt Open-Meteo-`COMPLETE`-krav efter closure; 4.0.393 validerer den eksakte positive+missing-rest. DEC-0176.

# 2026-09-16 – 4.0.392 gør nøddrift mobil og retter regional dobbeltvalidering

- 4.0.391 blev leveret providerfrit i `35104320358` som main `3d7fbba9`.
- Normalrun `35105048864` gemte DMI-, Copernicus- og Open-Meteo-cacher og lukkede hele domænet som 79.147 værdier plus 267 lokale `MISSING`.
- Runnet stoppede efter closure på regional adapters gamle 12-timers capture-heuristik; 4.0.392 bruger i stedet closureens eksakte kanoniske kildeidentitet. DEC-0174.
- Safari på iPhone kunne ikke afslutte nøddriftsopstarten, fordi cirka 118 MB detaljer blev hentet. 4.0.392 udskyder store detaljer og viser ærlig utilgængelighed uden stale værdier. DEC-0175.

# 2026-09-16 – 4.0.391 beholder gyldige gamle værdier før lokal missing

- 4.0.390 blev main `2dcf571a`; bootstrap `35081537023` gennemførte alle providerled og gemte fremgang.
- Open-Meteo sluttede med 84 forsøgte provider-negative par uden at ramme tidsbudgettet; den gamle globale nul-missing-gate stoppede buildet.
- Ejerens permanente rækkefølge er ny gyldig → gammel fortsat gyldig for eksakt par → lokalt `MISSING`; øvrige gyldige scorer fortsætter. DEC-0173.

# 2026-09-16 – 4.0.390 samler post-cutover-bootstrap i den normale rute

- 4.0.389 blev main `bf8eb739`; normalrun `35069942328` reducerede 6.450→5.025 reelle rester.
- Næste normalrun `35074225256` flyttede target en time, øgede DMI 14.260→14.772 og regional DMI 416→704 samt reducerede 5.181→4.565.
- Open-Meteo nåede hele køen i begge runs; resten var provider-negative null-/gittertilfælde, ikke uafprøvede batches.
- 4.0.390 tilføjer eksplicit main-only force-bootstrap med DMI 3.600 sekunder/seks samlinger og Copernicus 3.300 sekunder gennem normalruten; DMI har dermed længst providertid. DEC-0172.

# 2026-09-16 – 4.0.389 giver den normale kritiske restliste en realistisk ramme

- 4.0.388 blev main `8d0a5ac5`; normalrun `35064588725` livebeviste journalrebase, rotation og cache-save hos alle tre providerled.
- Før Open-Meteo manglede 6.254 par. Fire fejlfri requests udfyldte 396, hvorefter den delte 240-sekundersramme udløb med 5.858 rester.
- Oneoff `35067958289` stoppede før providers på en gammel Candidate G-bootstrap og blev afvist som post-cutover-rute.
- 4.0.389 bruger normal weather, 900 sekunder og `--critical-only`; prioritet, batch 50 og nul-missing-gate ændres ikke. DEC-0171.

# 2026-09-16 – 4.0.388 fjerner nul-overlap fra Copernicus-segmentjournalen

- 4.0.387 bestod sourcegate `35051800082`, PR #330 og code-only `35052231130`; integreret model er online som 4.0.387 med 210/673.
- Normalrun `35052715440` gennemførte DMI og gemte fremgang, men stoppede før Open-Meteo og writes på en gammel segmentjournalpost uden overlap mod den aktuelle DMI-hulmatrix.
- 4.0.388 filtrerer kun nul-overlap før strict source-stage. Blandede immutable forsøg med aktuelt overlap og validerede donorrecords bevares. DEC-0170.

# 2026-09-16 – 4.0.387 genbinder en aktuel integreret model til ny vejrkodekontrakt

- 4.0.386 bestod sourcegate `35050098674`, PR #329 og main `c3833354`.
- Normalrun `35050697588` stoppede før providers på to forventet inkompatible private runtimegenerationer efter den reelle Open-Meteo-kodeændring.
- Providerfri code-only `35051090133` valgte korrekt `integrated`, men predecessor-vagten accepterede kun historisk maintenance og stoppede før writes/deploy.
- 4.0.387 tillader den eksisterende eksakte `CONTRACT_ONLY_REBIND` for same-binding `integrated`, uden at åbne modeltransitioner eller unødvendig databasemigration. DEC-0169.

# 2026-09-16 – 4.0.386 roterer Open-Meteos tidsbegrænsede restkø

- 4.0.385 blev merged som main `879f4644`; normalrun `35043360563` og `35046314979` gendannede de private cacher og gemte providerfremgang.
- Første run reducerede reelle mangler fra 59.382 til 33.383. Næste startede ved 33.656, hentede kun 244 Open-Meteo-par og sluttede ved 33.412.
- Rodårsagen var gentaget start ved samme sorterede batch under begrænset køretid; senere batches kunne sulte.
- 4.0.386 roterer hele stabile batches med UTC-time, kvarter og GitHub-forsøg uden at ændre providerbevis, cache eller nul-missing-gate. DEC-0168.

# 2026-09-16 – central version 2 er aktiv; 4.0.385 retter normal weatherstart

- 4.0.384 sourcegate 35040475553, PR #327 og main 2628ddef blev fulgt af grøn central recovery 35040799616.
- Central readback er INTEGRATED_ACTIVE version 2 på deployment pages-35034589754-1; ingen leverance eller weather blev gentaget.
- Normal standard-weather 35041008201 stoppede før providers, writes og deploy, fordi dens private runtime-rod ikke var oprettet.
- 4.0.385 opretter roden, bruger bounded retry og forhindrer en Open-Meteo-følgefejl ved upstream-skip uden at lempe nul-missing-gaten. DEC-0167.

# 2026-09-16 – 4.0.383 er live; 4.0.384 afslutter kun central registrering

- PR #326/sourcegate `35034134953` gav main `11f101f8`; providerfri `35034589754` deployede og verificerede 4.0.383 som integreret 210/673.
- Centralen forblev ACTIVE version 1, fordi planen brugte en ældre offentlig closure. Ingen central write eller PENDING skete.
- 4.0.384 retter normal closurekilde og tilføjer eksakt source+target-artifactlåst ACTIVE version 1→2-recovery uden nyt deploy eller weather. DEC-0166.

# 2026-09-16 – 4.0.382 byggede 79/79, men central source var ikke den offentlige

- 4.0.382 sourcegate `35024395809` og PR #324 gav main `a7f0fcba`.
- Providerfri `35025121452`, forsøg 3, byggede og privacy-godkendte 79/79, men nåede ikke Pages-deploy.
- Central pointer pegede på `pages-34877443841-1`; live var 4.0.381 fra `pages-35020915350-1` med den kendte ene 404.
- 4.0.383 tilføjer en eksakt source-reparation for kun denne tilstand. Nyt target forbliver strengt 79/79. DEC-0165.

# 2026-09-15 – 4.0.381 går online; 4.0.382 retter én admin-404

- 4.0.381 sourcegate `35019932207` og PR #323 gav main `d84773a7`.
- Providerfri `35020915350` bestod private genbrug/publicering, Edge-readiness og Pages-deploy.
- Levende Pages viser integreret 4.0.381 og 210/673, men alle 210 zoner er fortsat score-utilgængelige.
- Offentlig closurekontrol fandt præcis én 404: den fejlagtigt udeladte admin-decoder. 4.0.382 flytter den og preflight-beviser hele artifactclosure. DEC-0164.

# 2026-09-15 – 4.0.381 accepterer uændret model og sætter Pages før central status

- 4.0.380 sourcegate `35015984953` og PR #322 gav main `de8ae966`.
- Providerfri `35016734197` beviste actual-current-restore, men stoppede på
  fejlagtig antagelse om, at enhver ny kodeversion også ændrer modelhashen.
- 4.0.381 understøtter byteidentisk contract-only-genbrug og beholder den
  snævre modelmigration til reelle modelændringer.
- Kode-only opdaterer central historisk status efter hårdt verificeret Pages,
  så en senere bookkeepingfejl ikke forhindrer den sikre side i at gå online.
  DEC-0163.

# 2026-09-15 – 4.0.380 retter audit og gentagen current-migration

- 4.0.379 sourcegate `34959283992` og PR #321 gav main `0cc4a867`.
- Providerfri `34959875107` bestod privacy, privat publicering, anonym-afvisning, assistent og readiness, men stoppede før Pages-begin på en tre-felts auditforbruger mod producentens fire felter.
- 4.0.380 accepterer kun en eksakt 420-sum, holder utilgængelige scorer ikke-kalibreringsegnede og migrerer næste private binding fra pointerens faktiske current-forfader. DEC-0162.

# 2026-09-15 – 4.0.379 fjerner tre ubrugte interne Pages-filer

- 4.0.378 sourcegate `34956693177` og PR #320 gav main `348d4a28`.
- Providerfri `34957362872` bestod central binding, restore/migration/installation, 210/673, privat bundle og Pages-prebuild, men privacy fandt tre ubrugte interne filer.
- 4.0.379 udelader gammel kystdata, intern zoneplan og admin-diagnostikdecoder i begge Pages-buildere. Auditregler, aktiv `zones.geojson`, vejr og score er uændrede. DEC-0161.

# 2026-09-15 – 4.0.378 samler Astra-fundene i én leveringsrettelse

- Code-only installerer den eksakte assistent, samler fire uafhængige prewrite-kontroller og foretager ingen produktionswrite, hvis en af dem fejler.
- Private kontrakter ignorerer kun mekanisk releaseversion; identisk runtime genbruges uden ny producentpointer, mens reel kildeændring fortsat ændrer hash.
- Mistede Supabase-svar afgøres med eksakt readback, sikre transienter genprøves, historisk restore er bevist med to reelle arkiver, og normal weather kan vælge ærlig koldstart efter udløb.
- Detaildownload følger manifestgrænsen. Exact-head, merge, code-only og livebevis afventer. DEC-0160.

# 2026-09-15 – 4.0.378 skelner aktiv current fra historisk previous

- PR #319/sourcegate `34946601576` gav main `ec26f8e4`; code-only `34947169348` beviste kanonisk DMI-cache, privat spec/bundle og 210/673 uden provider.
- Publicering stoppede før writes, fordi forgænger-current blev krævet at have den nye modelhash, før migrationsbeviset blev nået.
- 4.0.378 tillader kun den eksakte manifestbundne forgænger under overgangen og bevarer previous som valideret historisk rollback. DEC-0159.

# 2026-09-15 – 4.0.377 bruger kanonisk DMI-cache og eksakt samme-tids-efterfølger

- PR #318/sourcegate `34941640752` gav main `3144c557`; code-only `34942127741` bestod restore, migration, offentlig genopbygning og 210/673-audit uden provider.
- Privat specifikation stoppede før writes, fordi den læste en midlertidig acquisitionfil trods komplet installeret DMI-cache.
- 4.0.377 bruger `data/live/dmi-bulk-cache.json` og kræver eksakt migrationsbevis, uændrede målinger/states og byteidentiske øvrige filer ved privat efterfølger med samme vejrtid. DEC-0158.

# 2026-09-15 – 4.0.376 retter wrapperens privacy-rod

- PR #317/sourcegate `34939186051` gav main `e95339e5`; code-only `34939798892` beviste komplet metadataoverførsel og atomisk installation uden provider.
- Offentlig genopbygning stoppede før writes, fordi et ekstra privacykald brugte en label fremfor roden `startup` og derfor afviste det godkendte `flowPoints.current`.
- 4.0.376 bruger `startup`, `details` og `manifest`; allowlisten og privacygrænserne er uændrede. DEC-0157.

# 2026-09-15 – 4.0.375 migrerer alle eksakte modelmetadataforekomster

- PR #316/sourcegate `34933609573` gav main `dd59bc51`; code-only `34934257354` gendannede og installerede runtime uden provider.
- Offentlig genopbygning stoppede før writes på scoreprofilens gamle bundlehash; samme gamle identitet ligger i flere indlejrede runtimeformer.
- 4.0.375 gennemgår hele `conditions.json`, ændrer kun eksakt genkendte `modelBundleSha256`-felter, kræver en identisk leaf-allowlist og efterlader nul gamle hashes. DEC-0156.

# 2026-09-15 – 4.0.374 genbruger cachetransportens private filgrænse

- PR #315/sourcegate `34924287616` gav main `bf61970a`; `34924664012` passerede offentlig storfil og genbrugte cachemigration/-installation uden provider.
- Offentlig genopbygning stoppede før writes, fordi privat `conditions.json` oversteg et gammelt uafhængigt 256 MiB-loft.
- 4.0.374 bruger den beskyttede cachetransports eksisterende 768 MiB per-fil-loft og bevarer eksakt bundle- og runtimeintegritet. DEC-0155.

# 2026-09-15 – 4.0.373 accepterer den komplette manifestbundne detailruntime

- PR #314/sourcegate `34923460101` gav main `b2d401a1`; `34923801295` migrerede og installerede den private runtime uden provider.
- Offentlig genopbygning stoppede før writes, fordi `117.820.378` bytes oversteg et gammelt 64 MiB-loft.
- 4.0.373 bruger manifestets eksakte størrelse under 192 MiB og bevarer alle efterfølgende integritetsbeviser. DEC-0154.

# 2026-09-15 – 4.0.372 adskiller hydreret cachebevis fra rå source

- PR #313/sourcegate `34921912516` gav main `36ea9374`; `34922303619` genbrugte hele den allerede beviste providerfri kæde og passerede 11-feltsbindingen.
- Runnet stoppede før writes på en ugyldig raw-source-mod-hydrated-runtime-hashsammenligning.
- 4.0.372 bevarer de eksakte manifest-, bundle-, model- og inventarbeviser og fjerner alene den falske krydssammenligning. DEC-0153.

# 2026-09-15 – 4.0.371 låser den faktiske forgængerbinding

- PR #312/sourcegate `34920862401` gav main `9b5c82a8`; run `34921173187` beviste stor restore/udpakning uden provider.
- Migratorens næste kontrol havde tre forenklede fixturefelter og stoppede før runtime/Pages.
- 4.0.371 matcher alle 11 faktiske `fa418f43`/livefelter og tester mod current plus gammel bundlehash. DEC-0152.

# 2026-09-15 – 4.0.370 retter stor arkivudpakning og reel retry

- PR #311/sourcegate `34918950377` gav main `329ce119`; code-only `34919375457` installerede migration 17 og lukkede anonym adgang uden provider.
- Restore stoppede i arkivudpakning, og GitHub-errexit afbrød løkken efter første forsøg. Ingen runtime/Pages/completion blev skrevet.
- En 5 MiB regression reproducerede base64-regexens stackfejl. Lineær validering, 4 MiB streambidder, løbende størrelse/hash og shell-if består lokalt. DEC-0151.

# 2026-09-15 – 4.0.369 lukker privat adgang og gør restore oplysende

- 4.0.368 blev merged som `c4610636`; code-only `34915725308` genbrugte central version 1 og installerede migration 16.
- Forgænger-runtime kunne ikke gendannes, og oprindelig audit havde vist anonym HTTP 200. Ingen runtime-/Pages-/completionwrite skete.
- 4.0.369 tilføjer restriktiv Storage-policy som migration 17, anon-bevis før restore, tre korte forsøg og payload-frie årsagskoder. Migration 16 køres ikke igen. DEC-0150.

# 2026-09-15 – 4.0.368 efter central recovery

- PR #309/sourcegate `34914010157` blev merged som main `d25dfe8e`.
- Code-only-run `34914399119` gennemførte central recovery til `INTEGRATED_ACTIVE` version 1 uden provider.
- Fortsættelsen stoppede på jq false→tom-output; 4.0.368 bevarer boolske værdier eksplicit og fortsætter fra version 1.

# 2026-09-15 – 4.0.367 retter falsk grøn cutover og manglende central aktivering

Efter PR #307/#308 viste code-only-readbacken, at Pages havde det integrerede target fra `34877443841`, mens Supabase stadig stod uden operationelt dokument på legacy Candidate G. Gennemgang af hele runnet viste en fejlet privacyaudit, manglende plan og ufuldstændigt handoff; central begin/complete kørte aldrig. Pages-terminalen blev falsk grøn, fordi den alene krævede deploy og offentlig verification.

4.0.367 tilføjer en engangsrecovery låst til den præcise centrale starttilstand, oprindelige run/artifact og samtlige kanoniske evidenshashes. Den kræver en frisk offentlig verification og exact-main umiddelbart før atomisk central write og fortsætter derefter samme code-only-run gennem eksisterende historisk vedligeholdelse. Terminalen kræver nu handlingens faktiske completion eller gyldig reconciliation. Ingen provider, oneoff eller gammel cutover gentages. DEC-0149.

# 2026-09-15 – 4.0.366 adskiller rettelsesdeploy fra vejrhentning

Efter den første offentlige integrerede cutover blev de konkrete livefejl samlet gennemgået. 4.0.366 retter tabt DKSS-vind, retning 360, falsk strømhold hen over null, forkert tidsdækning, afhængig EDR-reparation og UI-værdier, der gjorde manglende data til nul. Om-siden får iPhone-/Android-installationsvejledning og Facebookfællesskab.

DEC-0148 gør den permanente leveringsvej kode-only: eksakt genbrug af senest gyldige data, ingen provider eller oneoff under rettelsesdeploy og separat tidsbegrænset normal weather bagefter. Det nye workflow er manuelt, exact-main- og bekræftelseslåst. Installeret migration 15 er urørt; migration 16 fører kun den nye modelbinding frem. Lokale produktkritiske kontroller er grønne; PR, deploy og driftsbevis mangler.

# 2026-09-14 – 4.0.365 fører dataset-id gennem auditrapporten

4.0.364 bestod sourcegate `34846130189`, blev merged gennem PR #301 som main `273cb052`, og handoff `34848494028` genbrugte cachen uden provider. Cutover `34849662988` forsøg 2 fortsatte efter retry af en midlertidig Supabase 502 og gav grøn runtimeaudit med 0 fejl.

Installationen stoppede derefter på, at checkpoint-leddet krævede auditrapportens `datasetId`, mens producenten aldrig skrev feltet. 4.0.365 returnerer det allerede validerede `full.datasetId`. Ingen model, score, vejr, rotation, cache, migration eller privacy ændres. Se DEC-0147.

# 2026-09-14 – 4.0.364 retter auditens sidste kendte H0-parameter

4.0.363 bestod sourcegate `34838663036`, blev merged som main `b4024371`, og det providerfri handoff `34840938570` blev grønt. Cutover `34842010506` byggede 210 zoner, 673 dele og 1.346 modes, men stoppede før writes. 4.0.363 fjernede 32/48 tidligere fejl; de resterende 8 last-mile- og 16 modeudslag kom fra samme auditfejl: H0-rekonstruktionen udelod den virkelige ældre `currentReferenceAt`, så senere null-svar overskyggede målingen. 4.0.364 sender denne tid videre som `nativeHoldReferenceTime` kun ved verificeret `NATIVE_CADENCE_HOLD`. Direkte regression for begge modes er grøn; modelbundles, migration 15, score, vejr og cache er uændrede.

Ingen database- eller modelbinding ændres. Exact-head, merge, kort providerfrit handoff, cutover og offentlig kontrol er åbne. Se DEC-0146.

# 2026-09-14 – 4.0.363 retter det første online-først-runtime-stop

4.0.362 bestod sourcegate, blev merged via PR #299 som main `8f5d818f`, og handoff `34830877368` blev grønt uden provider. Cutover `34832259268` gendannede cachen og byggede 210/673, men ændrede ikke database eller hjemmeside.

Runtimeauditen samlede fejl om de samme otte H0-holds. En delt mutable intervalliste lod næste forecasttime ændre mål-timens state. Candidate G var oracle-gyldig, men auditen krævede fejlagtigt targetreference frem for den virkelige kildetid.

4.0.363 kopierer state pr. time og binder den ældre Candidate G-reference til eksakt integreret holdbevis og tre-timersgrænsen. Replay og syntetisk 210/673-audit er grønne; migration 15 fremfører begge bundles. Ingen oneoff/weather før launch. Se DEC-0145.

# 2026-09-14 – 4.0.362 retter H0-input og går online før videre fejlsøgning

4.0.361 blev merged som main `6337fa09`. Handoff `34804412079` havde alle 79.414 currentudfald klassificeret, men ikke alle numerisk udfyldt. Cutover `34805083829` byggede 673 dele og kørte 272 kontroller; 271 bestod, én rumlig audit stoppede deploy.

Read-only diagnose `34820407527` viste, at et modelrunskryds i DKSS-vind gjorde alle scorer null, mens otte regionale currentholds manglede deres eksakte H0-kildereference og seks dele reelt manglede current ved H0. 4.0.362 retter begge kendte kodefejl, genbygger de bundne modeller og fører dem frem i append-only migration 14.

Ejeren besluttede online-først: første cutover gentager ikke fire brede kontrolsuiter, og ærligt `UNAVAILABLE` blokerer ikke launch. Den levende hjemmeside bruges til næste fejlsøgning; derefter bevises normal weather og rotation. Se DEC-0144.

Ældre kronologiafsnit nedenfor er historiske checkpoints.

# 2026-09-14 – 4.0.361 binder rumlig audit til produktionsvektor og integreret hold

4.0.360 bestod sourcegate `34795741830`, blev merged som main `cbb56fcb`, og handoff `34797345624` havde 79.414/79.414 currentpar uden provider/oneoff. Cutover `34798027472` gennemførte fem hovedkontroller og 272/272 underkontroller. Fire var grønne; kun den rumlige audit genkendte 654/673. Ingen writes/deploy.

Samme build havde 673/673 scoreklare dele og bestod integreret 210/673/1.346. Fem DMI-dele blev i auditten beregnet fra rå U/V før produktionens femdecimalers afrunding. Fjorten gyldige `NATIVE_CADENCE_HOLD` blev ikke genkendt, fordi auditten læste den pensionerede Candidate G-form i stedet for `ravScoreModel`.

4.0.361 bruger produktionsprojektionens eksakte U/V, læser den aktive integrerede holdform og rapporterer individuelle årsager. Modelbundle, score, vejr, rotation, cache og alle gates er uændrede. Exact-head, merge, handoff, cutover og offentlig kontrol er åbne. Se DEC-0143.

Ældre kronologiafsnit nedenfor er historiske checkpoints.

# 2026-09-14 – 4.0.360 deler DMI's native→runtime-projektion med den rumlige audit

4.0.359 bestod sourcegate `34788388836`, blev merged som main `8ec6b8be`, og handoff `34789764309` forseglede 79.414/79.414 currentpar uden provider/oneoff. Cutover `34790416354` gennemførte fem hovedkontroller og 272/272 underkontroller; fire var grønne, og kun den rumlige audit fejlede for 617 DMI-dele. Ingen writes/deploy.

Fejlen var rå native kilderække sammenlignet direkte med runtimebuilderens deterministisk udvidede form. 4.0.360 genbruger samme produktionsprojektion i auditten efter uændret native verifikation og bruger fastlåst `productionReferenceAt` frem for senere wall-clock-byggetid. Realistisk fixture og relevante DMI-/runtime-/workflowtests er grønne.

Ingen produktdata, score, rotation eller gate ændres. Exact-head, merge, same-head-handoff, cutover og offentlig kontrol er åbne. Se DEC-0142.

# 2026-09-14 – 4.0.359 retter seks kontrolorakler fra den komplette cutoverrapport

4.0.358 blev exact-head-valideret og merged som main `2a1c73d2`. Handoff `34781396538` genbrugte de fire cacher uden provider/oneoff og lukkede 79.414/79.414 currentpar. Cutover `34781869394` gennemførte 272/272 bladkommandoer og alle fem hovedkontroller, hvorefter seks fejl i fuld validering stoppede før deploy.

De seks var to gamle DMI-rotationsforventninger, en gammel availability-fixture, forkert DMI-cachekontekst i collectoren, gammel interpolation uden provenance og en skrøbelig kaldetælling. 4.0.359 retter dem samlet og bevarer hele den bindende barriere. Ingen produkt-, score- eller vejrfejl blev vist af gennemløbet; ingen generel fejlundtagelse indføres. Se DEC-0141.

PR #296/run `34786784374` bestod releasegaten og 30 sourceled, før den fandt en glemt synkronisering af webhåndbogen til Supabase-installationskopien. Syncen og den direkte test er rettet. De 90 efterfølgende sourcekommandoer er kørt samlet lokalt; alle er grønne efter brug af den bundne Python-runtime, og ingen ny kodefejl blev fundet.

# 2026-09-13 – 4.0.358 samler alle deklarerede underfejl og retter næste cutoverkanter

Efter grøn 4.0.357-sourcegate/main/handoff stoppede cutover `34769550035` før deploy i en forældet forecastfixture. Den femleddede barriere havde kørt alle hovedkontroller, men den fulde validering skjulte resten af sine leaf-kommandoer bag første fejl. Astra-reviewet fandt yderligere en gammel public-runtime-orakeltest, tre typed-false shellstop og en Pages-fejlslutning mellem lokal availability og rå memory. 4.0.358 retter dem samlet, deklarerer oneoff-fill-testen selvstændigt og fører alle 272 leaf-kontroller til ende med løbende planbundet rapport. Alle fem gates forbliver bindende; writes følger kun en grøn samlet blok. First-cutover får 180 minutter, normal/providerbudgetter er uændrede. Ingen score-, vejr- eller oneoffændring. Se DEC-0140.

# NYESTE CHECKPOINT – 2026-09-13 – lokal 4.0.357 efter samlet cutoverkontrol

- PR #293/sourcegate `34761823518` og main `b75672f7` er grønne og filtræ-identiske.
- Handoff `34763228997` bestod uden provider, oneoff eller ny 210/673-audit.
- Cutover `34763820124` kørte alle fem kontroller. Runtime/model, referencezoner, releasegate og vejrdata bestod; fuld validering fejlede alene på `126.60000000000002` mod `126.6`.
- Lokal 4.0.357 fjerner den ekstra normalisering efter én-decimal-afrunding og bevarer 360→0. Se DEC-0139.

# NYESTE CHECKPOINT – 2026-09-13 – lokal 4.0.356 efter grøn kapacitet og GitHub-startafvisning

- PR #292/sourcegate `34759300669` og main `5bcd5fb2` er grønne og filtræ-identiske.
- Cachefortsættelse `34760554781` bestod real-skala-kapacitet og forseglede handoff uden provider, oneoff eller ny 210/673-audit.
- Cutover `34761090699` blev afvist før første job. Caller-jobbet manglede den read-only `pull-requests`-adgang, som callee kræver.
- Lokal 4.0.356 retter permissionspariteten og ændrer intet vejr, modeldata eller nogen kapacitetsgrænse. Se DEC-0138.

# NYESTE CHECKPOINT – 2026-09-13 – lokal 4.0.355 efter første real-skala flerobjektpakning

- PR #291-head `ef9b7480` bestod sourcegate `34757328149`, blev merged som main `78c083e8`, og filtræerne er identiske.
- Cachefortsættelse `34758328372` gendannede fire cacher og genbyggede runtime uden provider, oneoff eller ny 210/673-audit.
- Schema-2-pakningen passerede alle rå- og objektgrænser. Runnet stoppede først bagefter, fordi den samme store `conditions.json` blev genlæst gennem en særskilt 16-MiB-evidensgrænse.
- Lokal 4.0.355 kontrollerer measured-warmup-felterne i første, allerede nødvendige parse og fører kun en boolean videre. En 17-MiB-regressionstest er grøn; ingen grænse hæves.
- Exact-head, ny cachefortsættelse, rapport, handoff, cutover og offentlig kontrol afventer. Se DEC-0137.

# NYESTE CHECKPOINT – 2026-09-13 – lokal 4.0.354 flerobjekttransport

- PR #290-head `d0748d9e` bestod sourcegate `34754075158` og blev merged som main `6305dd82` med identisk filtræ.
- Cachefortsættelse `34755365967` hentede intet providervejr, gendannede fire eksakte cacher, genbyggede runtime og passerede 2-GiB-rågrænsen.
- Det komprimerede arkiv oversteg derefter Supabases 50-MiB-loft for én fil. Intet handoff, cutover eller deploy blev udstedt.
- Lokal 4.0.354 fordeler arkivet på højst otte dele à 50.000.000 byte og højst 350.000.000 byte samlet, med del-/helhash og fuld readback før pointer-CAS.
- En endnu ikke nået ugyldig `+`-separator i næste `jq`-gate er rettet i samme version. Målrettede flerobjekt- og kapacitetstests er grønne. Se DEC-0136.

# NYESTE CHECKPOINT – 2026-09-13 – lokal 4.0.353 efter real-skala payloadmåling

- PR #289 exact-head `8cb545cd` bestod sourcegate `34744340201` og blev merged som main `ec198c73`.
- Fortsættelse `34745557797` gendannede fire eksakte cacher og genbyggede privat runtime uden provider eller ny 210/673-audit.
- 4.0.352's komprimering passerede V8-strengstoppet. Kapacitetsmålingen stoppede først ved samlet råpayload over 768 MiB.
- Ejeren godkendte præcis højst 2 GiB samlet for nye `GZIP_BASE64`-arkiver, fortsat 768 MiB pr. fil, 768 MiB legacy samlet og uændret 50.000.000-byte cutoverloft inden for det tekniske 50 MiB-objectloft.
- 4.0.353 implementerer formatbetinget loft og sekventiel, hashkontrolleret udpakning til atomisk stage. Tre målrettede kontroller er grønne; exact-head-CI, merge og live kapacitets-/handoff-/cutoverbevis afventer.
- DEC-0135 er bindende. Vejr, score, geometri, modelbinding og database er uændrede; ingen oneoff planlægges.

# NYESTE CHECKPOINT – 2026-09-13 – lokal 4.0.352 efter privat pakkestop

- PR #288-head `9511c9f4` bestod sourcegate `34737474686`, blev merged tree-identisk som main `099b70a8`, og backend `34738543144` bestod.
- Locked cache-only `34738698219` hentede intet providervejr og bestod current, WAM, freshness, modelbygning samt offentlig 210/673/118-struktur.
- Runnet stoppede derefter ved privat størrelsesmåling, fordi raw-base64-konvolutten overskred Nodes faste strenggrænse. Intet handoff eller deploy blev udstedt.
- Lokal 4.0.352 komprimerer hver fil før base64 og bevarer bounded bytes/SHA-256, privacy, rollback, CAS og legacylæsning. De to måltests er grønne.
- PR #289-run `34740223620` fortsatte hele releasegaten og fandt kun to stale `4.0.351`-forventninger i samme workflowtest. De er package-styrede nu, og den direkte test er grøn.
- Den forældede gentagelse `34741128298` blev annulleret. Lokal 4.0.352 har nu en exact `34738698219`-bundet handoff-fortsættelse med fire faste cacher, ingen providerproducent og ingen ny 210/673-audit; kapacitetsmåling og handoff er fortsat obligatoriske.
- Sourcegate `34742976226` gennemførte resten af kæden og fejlede alene på en gammel artifactoptælling på tværs af jobs. Den er afgrænset til det oprindelige preflight-job, og fire manuelt fundne bogstavelige patchmarkører i fortsættelseskommandoerne er samtidig rettet og måltestet.
- Næste er én exact-head-sourcegate, merge, det korte fortsættelsesjob, fuldt gated cutover og offentlig verifikation.

# NYESTE CHECKPOINT – 2026-09-13 – 4.0.351 main og lokal cold-start-readiness-hotfix

- PR #287-head `b12c1717` bestod exact-head-sourcegate `34732348167`, blev merged byteidentisk som main `a6e118d2`, og backend `34733200143` readback-verificerede migration 1–13.
- Cache-only `34733358422` hentede intet providervejr, bestod current/WAM/freshness/210/673 og rekonstruerede alle 1.346 modes. Kun `PUBLIC_PROFILE_NOT_READY` stod tilbage.
- Resolveren havde valgt source-attesteret `genuine-cold-start` for alle 673 dele. Producentprofilen anerkendte ikke denne godkendte DEC-0113/0114-initialisering. En lokal driftsrettelse kræver nu ensartet 673-dels cold-replay med eksakt lineage, measured-only kilde, 48-timersregnskab og target; tamper/mix afvises.
- PR #288-head `debb745f`/sourcegate `34736227522` bestod release-, model-, runtime- og migrationsled, men stoppede senere på den manglende identiske Supabase-installationskopi af webhåndbogen. Kopien og webhåndbogens aktive bindingstal er synkroniseret; begge direkte håndbogstests er grønne.
- PR #286-head `b6f06310` bestod sourcegate `34726624728`, blev merged byteidentisk som main `6d4adbb2`, og backend `34727884447` anvendte/readback-verificerede migration 13.
- Cache-only `34728026044` hentede intet providervejr og bestod current, WAM, freshness og 210/673-modelbygning, men stoppede før handoff/cutover/deploy på tre auditkoder.
- Et ægte manglende direkte H0-current reproducerede stoppet: producentens lovlige `null` current-bounds blev fejlagtigt krævet endelige af auditten; kastet blev misnavngivet last-mile og gav en afledt mode-fejl.
- Den lokale hotfix spejler producentens rene `CURRENT_DIRECT_INPUT_MISSING`/`UNAVAILABLE`, bevarer streng wave/last-mile-validering og kontrollerer coverage, memory og migration uafhængigt.
- Den målrettede fulde 210/673-audit med negative fixtures er grøn. Model, fysik, bundle, migration og cache er uændrede.
- Næste er én exact-head-CI, merge, backend-readback, cache-only preflight, faktisk cutover og offentlig verifikation; derefter normal weather og rotations-/cachebevis. Ingen ny oneoff.

# NYESTE CHECKPOINT – 2026-09-12 – 4.0.350 lokale inputfejl og samlet cutover

- PR #284's bounded fejlrapport blev merged som main `512f889d`.
- Cache-only-run `34706453561` hentede intet nyt vejr og beholdt current 79.414/79.414 med fordelingen DMI 67.686, Copernicus 8.668, regional 944 og Open-Meteo 2.116.
- Rapporten viste 659 kystdele i begge modes med `WIND_INPUT_MISSING` og 14 kystdele i begge modes med `CURRENT_DIRECT_INPUT_NOT_READY`.
- Kodegennemgangen fandt hardcodet `wind`, som afviste gyldig DKSS `windTail`, og manglende private præ-H0-referencer til de otte regionale closure-hold.
- 4.0.350 retter begge årsager for gemte og kommende data og gør resterende direkte inputmangel lokalt `UNAVAILABLE` i stedet for globalt stop. Den fælles kontrakt går gennem offentlig runtime, browser, admin og ture.
- Ejeren godkendte, at cutover kører fem uafhængige kontroller, samler alle fejl og stopper før writes, mens fem grønne resultater fortsætter automatisk.
- Append-only migration 12 og de nye model-/continuationhashes er lokalt måltestet. Exact-head-CI, merge, backendreadback, cache-only cutover, offentlig verifikation og normaldriftsbevis afventer.
- PR #285's første head `fe4969f1`/run `34717671774` stoppede før sourceproof, fordi den historiske migrationskædetest sammenlignede 4.0.349-filen med aktuelle 4.0.350-hashes. Opfølgningen fastlåser 4.0.349-hashes og filhash og tester 4.0.350 som næste append-only led; lokal kædetest er grøn, ny exact-head-CI kræves.
- Head `66338d63`/run `34717905077` bestod migrationsleddet og samlede tre senere fejl: Candidate G-stage/ture blev valideret som integrated, og releasegaten søgte den fjernede inline-historikkode. Én modelafhængig fælles validator og shared-validator-gatemarkør retter alle tre. Ejerens stop for testspiralen betyder ingen ny lang lokal fuldpakketest; exact-head-CI er næste samlede bevis.

# NYESTE CHECKPOINT – 2026-09-12 – 4.0.349 main passerer v1/v2 og stopper senere i scorepakken

- 4.0.349-head `fa5e648c` bestod PR #283-sourcegate `34700907469` og blev merged med byteidentisk tree som main `187e5998`.
- Backendrun `34702305208` genbrugte exact-content-beviset uden dobbelt fuld gate, anvendte alene migration 11 og bestod central readiness/readback.
- Cache-only-run `34702471040` fastholdt `2026-09-12T08:00:00Z`, hentede intet nyt vejr og bestod current 79.414/79.414, WAM, freshness og kontrolleret live-current-selection.
- Runnet passerede `RAVSCORE_RECOVERY_REPLAY_STATE_ONLY_HOLD_INVALID`; v1/v2-rettelsen er dermed produktionsbevist.
- Modelbygningen stoppede senere i den generiske offentlige 210/673-assertion. WAM-retning er strengt valideret, og score-neutral vandstand er ikke bevist som årsag.
- En lokal 4.0.349-hotfix udleder alle allerede beregnede lokale fejl som bounded offentlige id'er/antal/koder, uploader kun denne rapport og bevarer fail-closed uden handoff/deploy. Model- og metadatahash er uændrede.
- Ejeren ønsker ikke Candidate G som praktisk backup og har åbnet designet for integreret launch med tydelig lokal `UNAVAILABLE`. Før kontraktændring hentes rapporten og gennemføres et afgrænset Astra/Ultra-review.

# NYESTE CHECKPOINT – 2026-09-12 – 4.0.348 genbruger komplet cache efter modelstop

- PR #281-head `c4c70ac7` bestod sourcegate `34681246581` og blev merged byteidentisk som `6868ae04`. Oneoff `34682428800` genbrugte proofet uden en anden fuld kildegate.
- DMI leverede 67.686/79.414. Resten før Copernicus var 193; slutunionen blev 79.414/79.414 med missing 0. Native WAM-gaten var grøn 79.060.
- Modelbygningen stoppede derefter på rollback-oraklets READY-48h-krav under en tilladt målt koldstart. Intet handoff/cutover/deploy.
- DEC-0130 holder rollback privat numerisk og offentligt utilgængelig/null til READY og tillader kun attesteret koldstart eller privat `BUILDING_MEASURED_ONLY`-fortsættelse.
- Den tidligere WAM-binding er allerede centralt anvendt og forbliver checksumlåst. Ny append-only migration `20260912122607_measured_rollback_warmup_binding.sql` fører kun 4.0.348-forseglinger/readbackversion frem og skal anvendes før cachekontrollen; backendworkflowet genbruger kun exact-content-sourceproof efter live GitHub-verifikation.
- PR #282-head `cc06fa37`/run `34695465328` bestod model-, public-stage-, privacy-, runtime- og migrationsled, men stoppede i releasegatens forældede statiske testinventar. Migrationsbyggeren er lokalt føjet præcis én gang til planen og bundet til package-aliaset med regression; den røde head udstedte intet proof.
- En fastlåst cachekontrol genvaliderer samme target uden DMI-/Copernicus-acquisition eller Open-Meteo-netværk og uden automatisk genopfyldning. Alle post-data-gates består.
- DMI loggede kun pass 1. Multipass og normal rotation er fortsat liveåbne. Ny exact-head-CI, merge, backendapply/readback, cachekontrol, handoff, cutover, offentlig integreret model og normal vedligeholdelse afventer.

# HISTORISK CHECKPOINT – 2026-09-12 – 4.0.346 gør DMI-multipass reelt

- PR #279 exact head `47275529` bestod sourcegate `34666410182`; 4.0.345 blev merged som `64d2f23f`, og oneoff `34667430392` live-genbrugte exact-content-proofet uden en anden fuld sourcegate.
- Oneoffen stoppede fail-closed efter 1h41m38s med current 79.230/79.414 og 184 provider-negative OM-par. Alle 184 var forsøgt og isoleret genprøvet; intet handoff, artifact, deploy eller modelskift blev dannet.
- DMI søgte mod alle 79.414 par, lukkede WAM og betjente alle tre DKSS-familier, men nåede kun én producentpassage. Wrapperens exit-2-retur og fælles 3.000-sekundersramme gjorde de annoncerede senere pass utilgængelige netop ved runtime-uafsluttet current.
- 4.0.346 tillader højst tre særskilte 3.000-sekunderspass efter streng same-target/slutcache/runtimeklassifikation; et tredje strict-current-runtimepass kræver stigende DMI-parantal, mens exit-0-downloadbudgetvejen er særskilt. Normal drift, providerregler og slutclosure er uændrede.
- DEC-0128 er bindende. Exact-head-CI, merge, nyt main-runtimebevis, fulde closures/gates, integreret cutover og offentlig verifikation afventer. Candidate G er offentlig.

# NYESTE CHECKPOINT – 2026-09-12 – 4.0.345 efter negativ 4.0.344-runtime

- 4.0.344 blev merged som `f2cc2a77` efter grøn PR #278-sourcegate. Normalrun `34635781802` sluttede med 1.335 currentrester; oneoff `34642214559` sluttede 78.381/79.414 med 1.033 provider-negative OM-par, grøn WAM/Feggesund og intet handoff/cutover.
- DMI roterede alle seks collections og planlagde mod hele 79.414-registeret. Oneoff beviste derfor ikke en gammel positivlistefejl; det målte hovedproblem var 31 gentagne Copernicus-checkpoints på cirka 2.376 sekunder/78,2 % af CP-fasen.
- 4.0.345 journalfører hvert segment varigt og konsoliderer seks ad gangen gennem uændret strict bank→shadow→stage. 40.120-record-prøven er byteidentisk og reducerer seks segmenter 115,905 → 46,438 sekunder.
- Dobbelt sourcegate erstattes af PR exact-content proof med live PR/merge/artifact/run/job/step-verifikation og sikker fallback. Faktisk GitHub-run viste tomt `pull_requests`; direkte PR-endpoint bruges nu.
- PR #279's første head `72db0a70` fejlede run `34659873681` i en forældet statisk pre-journal-rebaseforventning. Ingen proof blev uploadet. Testen er lokalt rettet og journal/restart/source-stage genverificeret; ny exact-head-CI kræves.
- Anden head `581dfae9` bestod hele sourcegaten i run `34661632590`, men ren-tree-trinnet fandt en tracked Linux-ændring og blokerede proof. Alle 151 underkommandoer var enkeltvis rene på Windows; næste head logger exact path/mode/stat og forbliver fail-closed.
- Tredje head `e1e9dd1e`/run `34664907674` identificerede de to dynamiske tracked release-rapporter. Sourcekaldet undertrykker nu kun rapportwrite efter uændret fuld gate; post-data-/pakke-gates skriver fortsat rapporterne.
- DEC-0127 er bindende. Exact-head-CI, merge, komplet main-vejr, gates/handoff/cutover og offentlig integreret model mangler fortsat. Candidate G er offentlig.

# HISTORISK CHECKPOINT – 2026-09-11 – 4.0.343 retter starvation og ownerkontrakt

- 4.0.342 blev merged som `6a3133fe`. Oneoff `34565347360` bevarede cacherne, men sluttede current 77.859/79.414 med 1.555 rester og terminal WAM-fejl uden handoff/cutover.
- Tre konkrete runtimefund forklarer manglende closure: `dkss_nsb` fik nul DMI-ture i tre pass, Baltic sultede AMM15, og to vestlige WAM-dele blev sendt til en NSB-collection, der ikke dækker dem.
- 4.0.343 gør DMI-familybetjening bounded og fair, interleaver separate roterede Copernicus-produktkøer og anvender én fælles eksakt WAM-owner-policy med 458 DW/212 NSB og to DW-overrides.
- Normal og oneoff anvender samme producenter. Cache, sourceprioritet, granular admission, candidate/promotion, historik og fuld closure består.
- Målrettede lokale tests er grønne. Exact-head-CI, main-runtime, closure, handoff, cutover og offentlig modelproof mangler.

# NYESTE CHECKPOINT – 2026-09-11 – 4.0.341 livefund bliver 4.0.342-granularitet

- 4.0.341 blev merged på `main` som `caa49c42`. Backend `34534769955` blev rapporteret grøn, men oneoff `34534764449` afsluttede uden handoff og uden cutover. Candidate G forblev offentlig.
- WAM-candidate-isolationen beskyttede aktiv cache, men afslørede en for grov commitgrænse: `wam_dw` kunne lukke, mens alle 91 `wam_nsb`-assets blev rullet tilbage, fordi enkelte delmål fejlede. Hele-filen-eller-intet gjorde dermed selvstændigt gyldige søskenderækker utilgængelige.
- 4.0.342 bevarer den isolerede collection/modelRun-candidate og promotionens target-/pair-/lineageværn, men admitterer komplette exact-asset-provenancebundne part/time-tuples efter fuldt assetgennemløb. Rejected slices forbliver uændrede; komplet anden gammel lineage eller global assetfejl stopper hele stagen.
- Privat bootstrap bruger samme granulære cachebevaring uden at kalde en delvis time locked eller history-complete. Cold-start og slutvalidering er uændret.
- Copernicus-current bevarer nu returnerede eksakte native timer fra et ellers gyldigt shard og lader kun fraværende par gå videre. Attempts gemmer `observedNativeValidTimes` i nested v2 med legacy 4.0.341-readback, og Baltic-prerequisiten overlever pruning af sidste søskende. Tom/subsekund providerakse er retryable malformed, ikke no-record; dubletter, non-hourly tid og rækker uden for requesten forbliver fail-closed. Schema-3 seamtesten og 169-timersregressionen er grønne.
- Testforløbet fandt først to fixturefejl i en 55-test-WAM-suite (`53/55`) og bekræftede derefter de to korrektioner `2/2`. Den udvidede aktuelle WAM-suite er samlet grøn `63/63`, inklusive lineage-evidence og en reel parser→provenance→summary→admission-kæde med to PARTs; WAM-historik er grøn `35/35`, checkpoint er grøn `21/21`, og de tre Copernicus-måltests, Python compile samt code diff-check er grønne. Ingen 4.0.342 exact-head-CI-, provider-, closure-, handoff-, cutover- eller produktionspåstand er endnu tilladt.
- DEC-0124 registrerer den nye grænse. DEC-0122's allerede godkendte first-cutover-undtagelse flyttes snævert til exact-release 4.0.342; alle materielle gates består.

# NYESTE CHECKPOINT – 2026-09-10 – 4.0.341 isolerer WAM-promotion

- Efter reboot blev worktree, branch og GitHub-status genfundet uden tegn på tabt tracked arbejde eller afbrudt aktiv vejr-/releasekørsel. Cacherne blev ikke nulstillet. Seneste dokumenterede oneoff `34437713821` gemte sikre providerresultater, men sluttede 78.314/79.414 med 1.100 currentrester og WAM `MISSING_HOUR`; intet handoff eller modelcutover.
- Helkædekontrollen fandt en ny P0 efter 4.0.340: en delvist accepteret WAM-fil kunne mutere aktiv kandidat, og en enkelt komplet fil kunne under kvalitetsrefresh efterlade en tretimers-seam. Tællere/checkpoint kunne samtidig komme foran den sikkert promoverede state.
- 4.0.341 bygger derfor en isoleret kandidat pr. WAM-collection/modelrun. En fil kræver fuld denominator, og promotion kræver samme target, eksakt pair-superset og ingen nye lineage-konflikter. Hul/hale-fremgang kan promoveres straks; komplet-cache-kvalitet promoveres højst én gang efter terminal fase.
- En bounded ældre kausal WAM-fase kan kun følge en terminalt gennemløbet primærfase og bruger hvert assets egen modelrun-proveniens. Budget-, reserve- eller interruptionsstop åbner ikke fallback.
- Open-Meteos pairorden er ensrettet til `(validTime, partId)`, og den private runtimehash omfatter WAM-bootstrap. DMI → Copernicus → Open-Meteo, gamle horizon-gyldige data, 48 timers historik, `79.414`, native WAM 670 og Feggesund `354/354` består.
- Lokal målstatus: WAM 52/52, historik 35/35, vejrplan 17/17, Open-Meteo-donor 32/32 samt relevante DKSS-, scheduler- og private-runtimekontroller er grønne. Exact-head-CI, merge, main-runtime, fulde gates, cutover og offentlig modelkontrol er åbne. Normalworkflow og watchdog/shadow-dispatch forbliver deaktiveret.
- DEC-0122's engangscutover er overført snævert til exact-release 4.0.341 under stående ejerautorisation. Cachetransport, ekstern cron-/provider-tidsmåling og normal vedligeholdelseskapacitet er fortsat efter-launch-arbejde.

# NYESTE CHECKPOINT – 2026-09-09 – 4.0.337 tabsfri cache og launchgrænse

- Astra-helkædeauditen fandt decoderdrift, globalt prooftab, source-dictionary-fejl, forkert kandidatbinding og unødigt legacy-mellemtrin. De forhold er nu samlet implementeret lokalt med målrettede grønne tests.
- Ejeren godkendte én 4.0.337-first-cutover-undtagelse: eksakt succesfuld komplet main-oneoff, højst 50 MB privat archive, eksisterende storage/checkpointgrænser og uændrede integrity/privacy/readbackgates.
- Legacy cutover kræver nu det konkrete oneoff-run-id og den genfundne forseglede cache; en manglende eller fejlende producent kan ikke erstattes af en ny ubundet hentning.
- Undtagelsen dækker ikke almindelig højfrekvent drift. Cachetransportmigration uden nulstilling er registreret som P0 efter launch og før normal cron/watchdog.
- Read-only GitHub-job `34288231609` kørte codec-commit `bce970af` på den bevarede 760.487.472-byte DMI-cache med 578.063 sourceposter. Midlertidigt output var 94.150.151 byte; logisk hash/count var identisk, inputfilen uændret og Node-readback grøn. Den separate historiske Open-Meteo-overlapprobe fejlede fortsat og blev ikke forvekslet med codecbevis eller produktionsruntime.
- Den efterfølgende helkædekontrol fandt, at 256 MiB-readeren kunne stoppe den 760 MB store legacyfil før codec-normalisering. En særskilt bounded helper og alle fire relevante workflowveje skriver nu et separat atomisk materialiseret output før almindelig READY-/provenance-/registerlæsning; source bevares ved fejl, og overstor encoded input afvises.
- Candidate G er fortsat offentlig. Endelig exact-head, merge, main-oneoff, fulde gates og offentlig modelaktivering er åbne.

# NYESTE CHECKPOINT – 2026-09-08 – 4.0.336 kompakt WAM og tværgående sourceproof

- DMI/WAM-cachen skrives kompakt og atomisk på alle persisted veje; pretty-JSON-udvidelsen er fjernet uden at ændre den hårde 256 MiB-validator. Telemetri er aggregate-only.
- Same-SHA-sourceproof kan genbruges mellem de præcist allowlistede normal- og oneoff-producenter. Begge livehistorikker kan invalidere proof; sourcegaten består.
- En eksplicit manuel normal kørsel kan kun i `candidate-g:true|legacy-candidate-g:true|legacy-candidate-g:false` og `candidate-maintenance|candidate-legacy-maintenance` forsegle handoff efter komplet provider-/WAM-/validate-/releasekæde og exact-main-reconfirm.
- `34229976645` efterlod 2.015 Open-Meteo-par med gemte cacher og intet handoff. Måltests/review er grønne; exact-head CI og positiv runtime/produktion mangler. Candidate G er offentlig.
- PR #269 blev merged som `269db74b…`; exact-head-run `34245761528` bestod releasegaten, men stoppede før vejrruntime/deploy på en usynkroniseret statisk Supabase-håndbogskopi. Den bytepræcise SQL-kopi er lokalt rettet og kræver ny exact-head-kontrol.

# HISTORISK CHECKPOINT – 2026-09-08 – 4.0.335 vedvarende WAM-cache lokalt grøn

- WAM-helkædeauditen er implementeret samlet: granulær salvage, atomisk tuple-admission, exact-proof resume, korrekt parser/dækningsklassifikation og sen completeness-gate.
- Eksakte vedligeholdelsesrækker kan leve på tværs af modelkørsler; interpolation forbliver samme run/gitter/celle og højst fire timer.
- Feggesunds tre dele valideres af den eksisterende direct/proxy-kontrakt, mens native WAM-gaten dækker de øvrige 670 dele. Registry og slutkrav er uændret 673 og 354/354.
- Python-syntaks, 32 validator-tests, 24 producenttests samt to workflowtests er grønne. Exact-head CI, merge og runtime mangler; Candidate G er fortsat offentlig.

# HISTORISK CHECKPOINT – 2026-09-08 – 4.0.334 WAM-readiness efter komplet strømclosure

- Main-oneoff `34161930631` på `57a4c914…`, target 21Z, lukkede alle 79.414 strømpar: DMI 61.860, Copernicus 16.593, regional 944 og Open-Meteo 17. Det er positivt provider-/cachebevis.
- Runtime stoppede derefter på Feggesunds manglende 3 × 118 bølgetimer. DKSS LF havde brugt cirka 2.687 af 2.818 arbejdssekunder, så WAM ikke fik en tur; senere EDR 429 var sekundær. Intet artifact, deploy eller cutover.
- Lokal 4.0.334 reserverer fair runtime til begge WAM-familier, genbruger allerede behandlede assets, kræver strict WAM-readiness før downstream, materialiserer eksplicit `MISSING` på 118-timersaksen og binder Feggesund-preflight til slutproof.
- Candidate G-targetlaget er nu bounded: højst fire inklusive brotimer; ældre ensartet state giver source-attesteret cold start, mens mixed target stopper. Første cutover kræver konkret positivt handoff-run-id.
- Måltests og to reviews er grønne uden P0/P1. Versionssynkronisering er gennemført; exact-head, merge, ny main-runtime, fulde gates, Phase B og offentlig verifikation afventer. Candidate G er fortsat offentlig.

# NYESTE CHECKPOINT – 2026-09-07 – 4.0.333 adaptiv Open-Meteo-rest

- 4.0.332 bestod sourcegate `34125927405` på exact head `f23f306b…` og blev merged via PR #265 som `1e1093de…`.
- Main-oneoff `34127986853` genbrugte cachen og sluttede ved 79.132/79.414: DMI 65.409, Copernicus +12.661 og Open-Meteo 190/472 efter regionalleddet; 282 manglede, så intet artifact/deploy/cutover.
- Helikopterreview identificerede en koderisiko med under-batch-retry under et globalt tre-runders loft; det historiske run havde ikke den nye diagnostik og beviser ikke den konkrete restårsag. Lokal 4.0.333 bruger bounded FIFO/BFS af exact unresolved, binært split til singleton, særskilte retries/caps/deadline og provider-wide HTTP-cooldown. Måltests og to reviews er GO; exact-head CI og ny runtimeklassifikation afventer.

# NYESTE CHECKPOINT – 2026-09-07 – 4.0.332 horizon-validitet og run-bundet cutover

- Ejeren ophævede de absolutte 72-timers- og 90/150/240-minutters availability-/deploygates. En strukturelt valid future-række bruges til og med pakkens eksakte sidste prognoseinstant; `+1 ms` er udløbet. Alder er fortsat warning, emergency-/tillids-/tur-/kalibreringssignal.
- 4.0.332 bevarer exact 79.414/79.414 closure og implementerer granular salvage for DMI/Copernicus/Open-Meteo, newest-verified atomisk tuple replacement, advisory `HISTORY_INCOMPLETE` med alle zoner aktive samt site-age-warning.
- En eksakt grøn komplet producentkørsel kan levere et fem-cache, run-/head-/attempt-/target-/registry-/hashbundet privat source-handoff til første cutover. Consumeren genbeviser closure; bounded `update:weather` og alle fulde release-/deploygates består.
- Run `34083611297` endte 78.856/79.414 med 558 missing og intet deploy. Run `34093354004` sluttede sikkert med Copernicus success og Open-Meteo 2.735 required / 1.873 retained / 750 fetched / 2.623 filled; præcis 112 critical missing stod tilbage. Run `34104536681` på eksakt `main` `c2ce63ff` genbrugte DMI-cachen til 67.897/79.414 på 5m24s, lod Copernicus dække 8.372 og efterlod 3.145, men stoppede før første Open-Meteo-request på den lokalt rettede null-run-source-index-fejl. Copernicus-fremgangen blev gemt; ingen closure/artifact/deploy. Normal workflow er deaktiveret; Candidate G er offentlig.
- Source-transition-overlap/hysterese og en durable immutable multi-artifact-historik er særskilte post-launch-emner.

# NYESTE CHECKPOINT – 2026-09-03 – PR #246 merged; 4.0.321 checkpoint-egress lokalt reduceret

- PR #246 bestod exact-head `33706215425` og blev merged som `7198b685`; Candidate G forbliver offentlig under Phase A.
- Den efterfølgende helhedskontrol erstattede normal fler-megabyte checkpoint-readback med service-role metadata-CAS, udelukkede ny checkpointversionshistorik og lukkede direkte authenticated payloadread. Migration, schema og installer er identiske, og måltests er grønne.
- Appversion 4.0.321 og geodataversionerne er løftet med særskilt bevis for kun topversionsfelterne. Exact-head, data-/kapacitetsbeviser, merge, produktion, manuel Fase B og offentlig state-6-verifikation er endnu åbne.

# NYESTE CHECKPOINT – 2026-09-02 – 4.0.320 DMI-flaskehalsen fjernet lokalt

- Branch-preflights hentede officielle DKSS-assets, men high-level nearest-opslag genbyggede samme gridstruktur titusinder af gange; 47/118 trin på 2.852 sekunder var lokal beregningsfejl, ikke DMI-fravær. Den nye message-lokale low-level SAME_GRID-vej bevarer sampling-, lag-, 5 km-, missing- og provenienssemantik.
- Cacheversion 9 binder `md5GridSection` og ecCodes API-/bindingsversion internt, mens offentlig legacy-griddefinition bevares. Checkpoints er bounded til 8 assets/60 sekunder og forced ved sikre afslutningsgrænser. Main-run `33591129416` afdækkede desuden den gamle parsers tekstlige gridmetadata; numeric-only-rettelsen er lokal og deployede ikke fra det fejlede run.
- Appversionen er løftet til 4.0.320 med autoriseret topversion-only-geodatadiff, og de afgrænsede producent-/smoke-/checkpoint-/dokumenttests er grønne. Model-id/state/bundles, DMI-first/Copernicus exact-gap, Feggesund og scorekontrakten er uændrede. Exact-head, frisk 673 × 118-currentpreflight, separat Feggesund tre dele × 118-wavebevis, merge, produktion og offentlig kontrol afventer.

# NYESTE CHECKPOINT – 2026-09-02 – Feggesund direct-first wave-only undtagelse

- Ejeren supersederede snævert den tidligere Feggesund-pensionering: direkte lokal DMI-WAM for `DK-B05-11` vinder altid; kun når hele bølgetupletten mangler, må komplette, direkte, same-run DMI-tuples fra både `DK-B05-10` og `DK-B05-12` danne en 50/50 energikonsistent proxy. Alle generelle forbud mod current-, historik-, recovery- og nabolån består.
- Proxyen er lokalt implementeret med `LOW`/`MODERATE`/`HIGH`, DA/DE/EN-advarsel og `calibrationEligible=false` gennem mode, zone, public, tur og observation, også ved ellers `FULL_HISTORY`. Slutbundles er forseglet som integrated `a226e7d10f5c9fa94e122c0e4e3dc1367f1d5e44e763593e4568ac8a3ed1b14b`/`db475a1bbb1b85fe3e0277b8687d6f1edd6dd8d74e0d6fb4df748f955d5bafe1` over 44 filer/8 deklarerede forbrugere og Candidate G-rollback `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`ea22921e298a03ed1ef8787a4dbd79fd4fdf1a9b8e188d3c4b44e03f16fdceb0` over 56 filer. Exact-head `33577887262` fandt en sikkert stoppet rollback-calibration-regression; fem-validator-rettelsen og fire måltests er grønne. Release kræver fortsat privacy-safe 3 × 118 med direct + proxy = 354 og missing = 0 samt ny exact-head, merge, fuld produktion og offentlig kontrol; eksplicitte 4.0.317/4.0.318-hashes nedenfor er historiske checkpoints.

# TIDLIGERE CHECKPOINT – 2026-09-01 – DEC-0114 integrated-first measured warmup

- Ejeren besluttede, at den nye integrerede RavScore skal online på strict direct input og coherent operational target..+117, mens manglende ældre measured-only historik opbygges bagefter og vises som `HISTORY_INCOMPLETE` med advarsel og `calibrationEligible=false`. Candidate G's private rollback-orakel fortsætter som `BUILDING_MEASURED_ONLY`; schema-4-checkpoint og manuel rollback forbliver 673/673 READY-strict, checkpointtrinene er eksplicit warmup-N/A, og state-less recovery gælder kun ved reelt fravær af privat state. Migrationens 40-timers coherent WAM forbliver migration-only. Feggesund neighbor-proxy er pensioneret for denne release. Ingen syntese, interpolation, carry-forward, nabo-/kystdelslån, geometri- eller punktændring er tilladt.
- Den lokale lukning implementerede og måltestede Copernicus schema 3 med hard `OPERATIONAL_COMPLETE` på target..+117 og rådgivende measured-only −48..−1, en branch-isoleret 118h-data-preflight uden release/deploy, DMI-cachebackfill med atomiske hele timer og save-before-terminal-gate samt kalibreringslås gennem controller/trip/observation/admin/hydrering/reconciliation. Run `33498108421` forbliver negativ stale-katalogevidens; grøn preflight, exact-head, merge, frisk produktion og offentlig kontrol mangler. Candidate G er fortsat offentlig.

# NYESTE CHECKPOINT – 2026-08-31 – PR #241 merged; legacy-profilattestering lokalt rettet

- Denne topstatus superseder ældre topresumeer nedenfor, men bevarer dem som revisionsspor.
- PR #241 bestod exact-head-kildegaten i run `33397737159` og blev merged som `origin/main a1ce7632b4262d742ec4a8a59746a61241c3b79a`.
- Mergeproduktion `33400836760` passerede den tidligere Højbjerg/bearing-gate og beviste dermed den smalle `360→0`-rettelse. Den stoppede derefter fail-closed i den lokale legacy-kildeattestering, før DMI, beskyttede writes, artifact og Pages; Candidate G og den offentlige side blev ikke ændret.
- Rodårsagen er reproduceret: attesteringens testfixture tillod kun 11 profilfelter, mens den fastlåste 4.0.316-producent og den aktive offentlige Candidate G-manifestform har 20. Den lokale branch `codex/ravscore-legacy-profile-attestation` validerer nu den fulde eksakte feltmængde, readiness/advisory-konsistens og bit-for-bit samme profil i manifest og conditions. Ukendte felter og blandede profiler stopper fortsat.
- Målrettet legacy-, activation-, workflow-, deploy- og cutover-matrix samt privacy-sikker offentlig manifest/payload/53-fils source-closure-verifikation er grøn. Ingen private conditions-payloads, koordinater, rå U/V, geometri eller land-/vandpunkter er læst eller ændret.
- Candidate G/4.0.316 er fortsat eneste offentlige model. Ny exact-head, sikker merge, én frisk 4.0.319-produktion og offentlig desktop-/mobilverifikation udestår.

# NYESTE CHECKPOINT – 2026-08-31

- Dette topcheckpoint superseder ældre topresumeer nedenfor.
- PR #238 merged modelkilden til `origin/main 57f76d716310060e0d629c9f9d3691d386a2dd58`.
- PR #239/#240 merged workflowfixes videre til `origin/main be81005b50294f54367f154c393bb27910e16c6f`.
- Produktion `33391418061` og `33393684620` stoppede derefter korrekt før DMI, beskyttede writes, artifact og Pages, fordi én aktiv offentlig Højbjerg-del i `DK-B04-01` / `dk-b04-01-national-part-03` havde bearing `360` uden for den aktive `[0,360)`-kontrakt.
- PR #241 er den smalle opfølgning: afrundet `360` normaliseres til `0` uden geometri-, zone-, land-/vandpunkt- eller kystnormalændring.
- Første exact-head-CI for PR #241, `33394343851`, stoppede ved stale bundle-/binding-consumers; senere gates blev derfor ikke bevist. Bundle-/binding-consumerne er nu regenereret og målrettet lokalt verificeret; opdateret exact-head afventer.
- Endelige lokale bundle-hashes er integrated `e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73` og rollback `4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96`.
- Candidate G er fortsat offentlig; opdateret exact-head, merge, frisk produktion og offentlig browserverifikation afventer.
# Rekonstrueret chatkronologi

- 2026-08-31: PR #236 gendannede den eksakte 4.0.316/Candidate G-tree på `origin/main` `c58deb7827848918d58d68ba9969bfcb923311e5`. Exact-head `33342157517` og post-merge-produktion `33342219152` var grønne. Normal produktion `33345476979`/`rr-20260831010337-210` var første grønne recoverybevis. Det tidligere external-watchdog-`workflow_dispatch` `33347230240`, 2026-08-31 01:19–01:28Z, bestod fuld DMI, validate, releasegate, storage gate og Pages og publicerede `rr-20260831012407-210` (genereret 01:24:07Z, reference 00:00Z) komplet 210/673, `VERIFIED_ONLY`, uden syntetiske samples. Candidate G er 0/210 aktiv på grund af historikmemory. Runs `33343469247` og `33344823000` stoppede tidligere på forbigående HTTP 503 uden deploy eller offentlig mutation. Den afgrænsede bounded-retry-hotfix er produktionsverificeret gennem PR #237, exact-head `33352520408`, merge `8c03e25d`, backend `33352661061`, fuld produktion `33352634365` og efterfølgende automatisk run `33354263148`. Visuel offentlig mobil-/desktopkontrol er fortsat åben.

- 2026-08-31: 4.0.318's lokale state-6-kandidat har endelig integreret binding `778db7aa3946f925607a8304daa42ed17dd30294e4a51bf6d895d7293e84c4e7`/`e880d5425e6f7b93d8afc99cddf491e58ad5a4a2ab055f8e4455193609c90a73` over 43 filer/otte forbrugere og separat Candidate G-rollbackbinding `c73dac1b4376005e792580791d84eb79c9370e905a2a7fd0bdee857506a20cf8`/`4ccc2081982677aadbb47a5ee7d6f2b99fdcb7e42113e73029d5c60323a5ee96` over 55 filer. Outcome-v2 og P2-assistent/plain-language er lokalt grønne. Candidate G forbliver den eneste offentlige model indtil exact-head, merge, frisk state-6-produktion og atomisk offentlig cutover. Ét aktivt 15-minutters kontroljob diagnosticerer run/gates/deploy/live først og må kun reparere sikkert; det må ikke blindt redispatche eller oprette dubletproduktion.

- 2026-08-30 (modelcheckpoint, ikke udgivet): Ejeren opgav den planlagte fiktive rekonstruktion af morgenhullet efter read-only inspect `33279639424` og før descriptor, apply, mutation, artifact eller offentliggørelse. DEC-0109 bevares kun som historisk incident-/trustkontrakt; ingen ny incident-inspect eller apply er åben. Modelsporet fortsætter som én samlet kandidat under DEC-0110: `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `5.0.0`, bounded kausal energivægtet wave-approach med fire timers halveringstid og en ældre hale, ægte 48-timers privat cold start og same-model atomisk nøddrift højst 72 timer. Candidate G/4.0.310 forbliver offentlig sandhed, indtil exact-head, merge, frisk produktion og offentlig 210/673 desktop-/mobilkontrol er grønne.

- 2026-08-30: PR #233 bestod exact-head `33299676128` og blev merged som `63d789a4`. Post-merge-run `33299747300` frigav 4.0.315-D1-gaten og startede build, men stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**, fordi ingen measured-only fallback var inden for både 72 timer og prognosehorisonten. Ingen artifact/Pages blev publiceret, og ingen syntetiske data blev skabt. DEC-0112/4.0.316 gør fallback valgfri for en frisk measured-only primary, fjerner gammel/udløbet fallback fra manifest/public files og bevarer uventet primary accounting/audit fail-closed. Samtidig bindes DEC-0102 til `HISTORY_INCOMPLETE`-score over current+fem døgn ved gyldige direkte input, auto-forsvindende DA/DE/EN-advarsel og `calibrationEligible=false`; arkitekturforenkling placeres i modelroadmapet, ikke P0-hotfixen. 4.0.316 er ikke liveverificeret.

- 2026-08-30: Ejeren gjorde opmærksom på, at RavRadar offentligt viste **“Aktuelle data kunne ikke hentes. Gamle data vises ikke.”** Audit fandt, at 4.0.314's tilbagetrukne one-time Candidate G-operation stadig var prerequisite for al normal vejrproduktion. Da ingen descriptor eller apply fandtes, blev jobs grønne no-ops uden build/artifact/Pages; primary blev >8 timer og measured-only recovery >72 timer. Ingen syntetiske data var anvendt. DEC-0111 pensionerer operationen og dens interlock i 4.0.315 og genåbner normal measured-only produktion under de uændrede fulde gates. Exact-head, merge, frisk produktion og offentlig kontrol afventer.

- 2026-08-30: PR #231 bestod exact-head `33279317463`, blev merged som `d539fc9d`, og push `33279411885` var korrekt no-op. D1 `33279463545` blev helt grøn. Read-only inspect `33279639424` stoppede før descriptor/apply/build/Pages med `ONE_TIME_GAP_AMBIGUOUS_NATIVE_CADENCE` og muterede intet. Audit afgrænsede fejlen til suffixbaseret cadencegæt: policyklassificerede hourly dele kan lovligt have eksakte 2/3h-afstande inden for Candidate G's eksisterende ≤3h continuity uden at de manglende interne slots udfyldes. Lokal same-version-rettelse bruger den eksisterende otte-dels `dkss_lf`-policy som identitetsautoritet og binder en koordinatfri projektionshash i inspect/apply-CAS. Datahullet er fortsat åbent.

- 2026-08-30: PR #230 bestod korrigeret exact-head `33277107562`, blev merged som `228725ea` og gav korrekt no-op push. Første D1 `33277253662` stoppede efter Edge på en forbigående 503 med grøn fail-closed roll-forward; genkørsel `33277510537` blev helt grøn. Read-only inspect `33277738135` viste kun `ONE_TIME_GAP_BEFORE_NOT_UNIFORMLY_READY` og muterede intet. Audit beviste, at before-artifactet indeholder den ærlige primary, mens komplet nødvisning blev publiceret separat. Den lokale same-version-hotfix fjerner kun blanket-READY-kravet og tester 673 ærlige `WINDOW_INCOMPLETE`-før-suffixer; exact-head og livekæden afventer.

- 2026-08-29: Efter PR #227/#228 bestod docs-checkpoint PR #229 exact-head `33275025105`/`99160126852`, blev merged som `9291250c`, og push `33275147023` var korrekt no-op. D1 `33275218540` blev helt grøn. Inspect `33275438494` stoppede derefter i planforseglingen før descriptorupload, mutation, build og Pages. En lokal diagnostikhotfix gør kun allowlistede `ONE_TIME_GAP_*`-fejlkoder eller ved succes descriptor-SHA plus faste optællinger synlige. PR #230's første run `33276791132` fandt kun nedarvet Actions-miljø i testharnessen; det er lokalt rettet og dobbelt testet. Ny exact-head, final-SHA D1, inspect/apply og offentlig verifikation afventer.

- 2026-08-29: 4.0.313 blev exact-head-valideret i PR #226, merged som `ff62ba11`, gav korrekt no-op push og bestod hele D1-backend `33269631305`. Den efterfølgende read-only inspect `33269849748` stoppede før descriptor/apply på et legitimt singleton-afteranker for native 3-timersdele. Lokal 4.0.314 afgrænser dette til `AFTER` + uafhængigt cadence-/state-/targetankerbevis og tilføjer exact-D1/apply+Pages-overtakelås; offentlig 4.0.310 og datahullet er uændret.

- 2026-08-29: 4.0.312 bestod PR #225 exact-head `33266087776`/job `99136292810`, blev merged som `a5ece10d1b99fe2a4d45346cadf7225870622a7a`, og push `33266184326` blev korrekt grøn no-op uden artifact/Pages.

- 2026-08-29: Backend `33266229687`/job `99136669571` bestod source, Candidate G-constraint, D1-forberedelse og tidlige Edge-/Worker-gates, men fejlede Supabase→D1-synk med den faste fejl `TRIP_GATEWAY_UNAVAILABLE`. Failure-roll-forwarden er ikke readiness. Rekonstruktion, vejr, artifact og Pages blev ikke kørt; offentlig 4.0.310-nøddrift og morgenhullet var urørte.

- 2026-08-29: En syntetisk reproduktion beviste forskellen mellem 4.0.310's kendte nested nullblade og 4.0.311's bounded PostgREST-leafprojektion. Lokal 4.0.313 tillader kun migration→migration-kompatibilitet efter streng stored schema/privacy, eksakt non-null/core-lighed og gammel hash/registry; ingen row omskrives. Målrettede replay-, hybrid-D1-, privacy-, register-, error- og workflowtests er grønne. Exact-head/live-kæden afventer.

- 2026-08-29: 4.0.311-kilden blev committed som `4c4699fe3a87a3b804da1d8beea204e4144a7a76`. PR #224 bestod exact-head `33263734108`/job `99129959870`, blev merged som `7c168b00af535415117c968a8c021a493b083137`, og pushworkflow `33263858078` blev korrekt grøn no-op uden build, artifact eller Pages, fordi exact-main-backendbevis endnu ikke fandtes.

- 2026-08-29: Manuel backend `33263892151`/job `99130384780` modtog HTTP 201 for Candidate G-trip-quality-migrationens ene atomiske `BEGIN … COMMIT`-transaktion, men stoppede på post-SQL-katalogverifierens formatteringsfølsomme kontrol af canonical reason order. Den nye CHECK er med høj sandsynlighed fuldt committed, valideret og kommenteret; eneste alternativ er fuld rollback. `VALIDATE` kan have scannet rækker internt i PostgreSQL, men ingen observationspayload blev hentet til runneren eller logget, og der skete ingen rækkemutation. D1, Edge, Worker, sync, vejr, artifact og Pages blev ikke nået, og offentlig side forblev 4.0.310.

- 2026-08-29: Lokal 4.0.312-roll-forward udtrækker nu balanceret den relevante `jsonb_path_query_array(...)` fra PostgreSQL-deparserteksten, tolererer whitespace/casts/parenteser og kræver den eksakte kanoniske JSONPath. Reordered, duplicate, extra og ambiguous former afvises fortsat. Målrettede tests, fuld lokal source/release/RDKS/håndbog/version og geodatakontrol er grønne; PR exact-head, merge, ny exact-main-backend, inspect/apply, produktion og offentlig verifikation afventer.

- 2026-08-29: Offentlig sandhed er produktionsverificeret 4.0.310/`rr-20260829103233-210`; morgenens GitHub-schedulerhul efterlod den friske Candidate G-primary ved 0/673 `READY`, 673 `WINDOW_INCOMPLETE` og 5–12/48 timer under den komplette målte nødvisning. Ejeren godkendte præcis én hændelsesbundet rekonstruktion, `RRGAP-2026-08-29-CANDIDATE-G-01`, fordi perioden ikke bruges til reel ravjagt. Kun allerede afledt signeret kystnormal strength mellem eksakte artifacts må interpoleres. Vejr, rå U/V, koordinater, geometri, punkter og private payloads er udelukket. Se DEC-0109.

- 2026-08-29: Ved det tidligere lokale 4.0.311-checkpoint skelnede kandidaten measured-only schema 2.0 fra markeret reconstruction schema 2.1, gjorde rekonstruktion/nødvisning non-calibration og undertrykte reconstructed hard-outflow. Inspect/apply/direct rollback/kausal cleanup var CAS-bundne; fallback var measured-only, og reconstruction-mode kunne ikke skrive shared continuation/last-ready caches. Den senere source-/backendstatus står ovenfor.

- 2026-08-29: Runner-loss-audit tilføjede existing-D1/fresh Edge-predeploy-intents efter capacity/CAS. Existing D1 bruger 20-/30-minutters lease, femsekunders prober, dobbeltattestation, 20-sekunders drain, 600 sekunders restlease og samlet syvminutters Worker-gate; partial Edge går D1 roll-forward. Fresh partial Edge går exact-main/Supabase-secret/eksakt Edge-redeploy/dobbelt Supabase-attestation. Uden intent ved capacity/pre-CAS-fejl sker nul recoverymutation. 4.0.311-source er siden merged; live-storage, apply, produktion og offentlig verifikation afventer 4.0.312-roll-forward.

- 2026-08-29: DEC-0102 fik en bindende nøddriftsacceptgate for den integrerede næste model: én målt-only atomisk 210/673-pakke, eksakt model/state/hash, højst 72 timer og kortere forecastudløb, DA/DE/EN-advarsel, non-calibration trips, automatisk frisk primary og fail-closed ved ukendt/rekonstrueret/tampered/udløbet state. `calibration_eligible` er endnu ikke serverbevist mod signeret public manifest; global koefficientlæring forbliver P2-låst og må ikke beskrives som empirisk evidens.

- 2026-08-28: 4.0.295 bestod PR #198/exact-head `33153155088`, merge `6c0602d7`, produktion `33153271907`, build `98790063641` og Pages `98794513908`. Offentlig funktionskontrol og cirka 3,67 sekunders varm start er grønne, men READY-nødvisningens startup målte 3.562.253 byte/23,36 sekunder. 4.0.296 indfører én minimal scoreprojektion i primær og recovery med uændret detaljehash og cirka 95 % syntetisk reduktion. Se DEC-0092/0093.

- 2026-08-28: 4.0.294 bestod PR #195 exact-head `33131976433` på `80866ba8`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102`, Pages `98725082313` og privat shadow `33132055561`. Offentlig DA/DE/EN-kontrol beviste de naturlige oprindelsessvar sammen med farvet kort, fem aktuelle områder og fem prognosedage. Den live 23-fakta Edge bestod DA/DE/EN, fast afvisning, CORS/origin og 6/minut med lokal fallback. 4.0.294 er produktionsverificeret.

- 2026-08-28: 4.0.293 bestod PR #194 exact-head `33130341973`, merge `25722abc`, produktion `33130425262`, build `98718434389` og Pages `98721765768`. Offentlig version, kort, fem aktuelle områder, fem færdige femdøgnsresultater og konsol var grønne. Den naturlige formulering **Hvordan opstod rav?** blev dog afvist; 4.0.294 udvider kun oprindelses-intentet med DA/DE/EN-dannelsesformuleringer og tre nul-netværksregressioner.

- 2026-08-28: Ejerens godkendte næste spor udvider 4.0.293-kandidaten til 17 lokale DA/DE/EN-ravemner, 23 Edge-evidensfakta, 51 lokale og 66 samlede evalcases. Målrettede kontrakter samt fuld lokal sourcegate/releasegate er grønne; exact-head, produktion og offentlig kontrol afventer. Assistenten forbliver read-only og isoleret fra alle prognose-, score-, bruger- og geodata. Se DEC-0091.

- 2026-08-28: 4.0.292 PR #189 bestod exact-head `33124945636` og blev merged som `8b3668b7`. Produktion `33125043019` stoppede før DMI/deploy, fordi punktstagingens syntetiske READY-test arvede workflowets låste produktionstime. En afgrænset hotfix gør fixture-reference eksplicit og bevarer produktionens normale miljølåste reference.
- 2026-08-28: PR #190 bestod exact-head `33125466599` og blev merged som `6906ee5a`. Produktion `33125529746` byggede frisk DMI/Copernicus/runtime, men stoppede før deploy på en gammel scheduler-kildetest. Kontrakten kræver nu den tilsigtede udelukkelse af `privateStage` og kører i PR-kildegaten.
- 2026-08-28: PR #191 bestod exact-head `33126975042` og blev merged som `01c443b8`. Produktion `33127032179` stoppede før DMI/deploy, da den tidlige scheduleradfærdstest importerede endnu ikke installeret `requests`. Testen er gjort selvstændig med netværksstubs og tester fortsat den virkelige schedulerfunktion.
- 2026-08-28: PR #192 bestod exact-head `33127353135` på `e555680f`, blev merged som `d22d0867`, og produktion `33127437790`/build `98708851478`/Pages `98711255270` bestod hele kæden. Offentlig 390 × 844-returkontrol viste synligt farvet kort, fem aktuelle områder og fem færdige prognoserækker uden browserfejl. Punktstatus var tom og saniteret; ingen markør blev flyttet. Primær `rr-20260827235556-210` er fortsat 0/673 `READY`, så fallback `rr-20260827013448-210` leverer korrekt under naturlig 48-timers modning.

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

# 2026-09-14 – rettelsesdeploy skilles permanent fra vejrhentning

Almindelige rettelser leveres fremover som kode-only med senest gyldige data. Providerkæden kører separat bagefter og kan ikke ugyldiggøre rettelsen. Modelbinding må kun føres frem gennem en eksplicit, verificeret migration. Se DEC-0148.
# 2026-09-16 – 4.0.394 sorterer hele Open-Meteo-resten

- 4.0.393 bestod sourcegate `35130086861`, PR #337 og providerfri deploy `35130668700` som main `88ecda1e`.
- Normalrun `35131237007` gemte alle caches og lukkede 79.276 værdier plus 138 lokale `MISSING`.
- Historikadapteren sammenkædede positive og missing par i to blokke; 4.0.394 sorterer det samlede eksakte sæt kanonisk før validering. DEC-0177.

# 2026-09-16 – 4.0.395 gør Feggesunds sidste huller lokale

- 4.0.394 bestod exact-head `35137196497`, PR #338 og providerfri deploy `35137798403` som main `b67459b0`.
- Normalrun `35138332481` beviste den nye closure- og historikrækkefølge, men stoppede i central cacheopdatering på Feggesund 336 direct, 0 proxy og 18 missing.
- De 18 positioner er tre dele × seks yderste timer, hvor hverken direct eller begge naboer var komplette.
- 4.0.395 bevarer eksakt 354-positioners proof, men et ærligt missing er lokalt `UNAVAILABLE` i stedet for en national stopfejl. DEC-0178.
- Samme run viste ingen DMI-nettovækst: 39.309 → 38.660 ved et to timer nyere target; gemt progression og næste normale run skal bruges til fortsat driftsbevis.

# 2026-09-16 – 4.0.396 fører deldækning gennem den offentlige prognose

- 4.0.395 blev leveret via sourcegate `35146153044`, PR #339, main `349a2702` og code-only `35146689278`.
- Normalrun `35147366418` gennemførte providerkæde, closure og historik, men stoppede før deploy, fordi lokalprojektionen tabte `partial-zone`-metadata.
- 4.0.396 bevarer den validerede metadataallowliste og har en målrettet `partial-zone`→offentlig-prognose-regression. Ingen oneoff; scheduler pauset.
- Exact-head `35155765121` bestod alle øvrige kritiske kontroller og fandt kun den gamle bundlehash. Rollback `da27b811…`, integrated `d9ba75ed…` og continuation `d20939c1…` føres frem gennem 19. append-only migration `20260917001500`; forgængeren er urørt.
# 2026-09-17 – 4.0.403 fortsætter en allerede valideret runtime

- 4.0.402 bestod exact-head 35203813380, PR #346 og providerfri deploy 35204369048 som main 0132900c.
- Normalrun 35205052150 gennemførte alle provider-, cache-, closure-, historik-, runtimeaudit- og 52+3-led og gemte runtime for 09Z beskyttet.
- Adminsynkroniseringen stoppede derefter på den udefinerede stableDigest, før Pages.
- 4.0.403 retter readback og tilføjer en streng providerfri fortsættelse af præcis den nyere gemte runtime. DEC-0185.
