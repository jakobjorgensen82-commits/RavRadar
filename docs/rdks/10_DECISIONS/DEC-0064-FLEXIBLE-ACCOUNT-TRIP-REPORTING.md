# DEC-0064: Fleksibel kontoindberetning uden falske vejrdata eller dobbeltlagring

## Tillæg 2026-10-20 — selvrapportering er ikke samtykke eller vejrautenticitet

Den lokale 585-kandidat mærker nye almindelige ture og nye manuelle kontoindberetninger `self-reported` gennem de normale producenter og validatorer. Markøren beskriver indberetningsoprindelse alene; den udsteder ikke samtykke, ægte historisk snapshot, statistikpolicy eller modelautoritet. Fravær på gamle payloads forbliver fysisk fravær, og gamle payloadhashes/originaler omskrives ikke. `unknown` og `synthetic-test` beholder deres afgrænsning. Manuel efterregistrerings valg af tid, manglende historisk snapshot, `calibration_eligible=false`, dataminimering og ejeradgang ændres ikke af dette tillæg.

Den samme normale 585-levering skal opdatere og verificere den eksisterende Worker på uændret D1-schema med aggregate eksplicit OFF før de tre Edge-funktioner og den offentlige klient. 004/005-installation og statistikrelease er særskilte og følger ikke med. Den private positive producent→lagret original→job→consumer→charge-prøve er lokal evidens, ikke hosted drift eller anonym offentlig statistik. Pseudonymisering er ikke anonymisering; fravalg, testdata og ejersletning skal respekteres. Rollover/hosted kontrol og automatisk retention er åbne; automatisk sletning aktiveres ikke uden den manglende mailafsender til det aftalte varsel. 585 er ikke installeret eller offentligt bevist. De oprindelige krav og historiske kvitteringer nedenfor bevares for deres eget scope. Se håndbog 89.259.

21. oktober: En særskilt privat `TARGET_TESTED`-kandidat lukker leveringskalderens manglende 005-trin. Det eksisterende `allow_004` beholder sit omfang; nyt `allow_005` er eksplicit false som standard. Kun kontrol0 kan modtage hver godkendt DDL én gang efter eksakt 001/002/003-kontrol og den uændrede 004-policy. Fravær, kun 004, hele 004+005, ændret schema og statistikobjekter på de øvrige ni shards skelnes. Ukendt skriveudfald stopper uden gentagelse; Worker-reparation kan ikke gentage DDL. Alle gamle SQL-bytes, lifetime-budgettet og aggregate OFF bevares.

Fire valgte normale mål består på Node22.23.3 i en privat Git-LF-kildehost; begge JavaScript-syntakskontroller består. YAML-formatkontrollen er ikke gennemført, fordi den lokale Python mangler PyYAML. Dette er ikke samlet kildekontrol, D1-installation, faktisk netværks-/DDL-fejlgenopretning eller produktionslevering. 004/005 er fortsat uinstallerede. Faktisk Worker-/Free-CPU og hukommelse, anonymitet og gentagne rapporters spor, tur-/vejroprindelse samt statistikrelease er fortsat åbne; pseudonymer eller `self-reported` lukker ikke disse krav. Ingen automatisk retention eller mailafsender aktiveres. Se håndbog 89.260; aktuel vejrstatus ændres ikke her.

**Status:** PRODUKTIONSVERIFICERET

**Dato:** 2026-08-23

**Scorepåvirkning:** Nej. Ændringen indsamler bedre brugerobservationer, men ændrer ikke RavScore, Candidate G eller den aktive `20/50/30`-profil.

## Beslutning

En indlogget bruger kan under kontoen vælge **Indberet tur eller fund** uden først at have startet en tur i RavRadar. Kontoindberetningen bruger de samme spørgsmål om jagtform, faktisk område, kyststrækning, søgegrundighed og fund eller intet fund som den almindelige afslutning af en startet tur.

Brugeren vælger selv turens korrekte startdato, starttid og varighed. Dato og klokkeslæt må ikke være forudfyldt, så rapporten kan ikke indsendes, før brugeren aktivt har valgt dem. RavRadar gemmer den valgte start, den beregnede afslutning og turens midtpunkt. En efterregistrering må aldrig få vejr eller RavScore fra indberetningstidspunktet, fordi det ville beskrive den forkerte situation.

Den offentlige klient kan ikke sikkert genskabe et vilkårligt historisk vejr- og scoresnapshot. Derfor gemmes kontoindberetningen i den eksisterende `observations`-tabel med schema 1, tomme forecast-/snapshotfelter, `calibration_eligible=false` og entydige kvalitetsmarkører for manuel efterregistrering og manglende historisk snapshot. Rapporten er fortsat nyttig som brugerens erfaring og som grundlag for en senere kontrolleret sammenstilling med historiske data, men den må ikke bruges direkte til at justere scoreregler.

Den lokale sandsynlighedsberegning må heller ikke medtage en observation, når `calibration_eligible=false`. Historiske rækker uden dette nyere felt bevarer deres hidtidige adfærd; det er kun udtrykkeligt uegnede rækker, der sorteres fra.

Der oprettes ingen ny Supabase-tabel, ekstra serverrække eller særskilt fundkopi. Samme række er både brugerens private logpost og det dataminimerede observationsgrundlag. `user_id` bruges fortsat kun til ejerens private RLS-adgang og må ikke bruges i modelanalyse.

Det afhængige valg af zone og kyststrækning genbruges i begge rapportveje. En kyststrækning må kun gemmes, når den tilhører den valgte zone. GPS-spor, rute, præcis position, fri tekst og billeder indsamles ikke.

Når en startet tur afsluttes, har brugeren tre ærlige valg:

- **Indsend tur** gemmer den komplette rapport.
- **Svar senere** lukker formularen og bevarer den aktive tur lokalt.
- **Afslut uden at indberette** kræver bekræftelse og rydder kun den lokale aktive tur. Der oprettes ingen lokal observationspost, outboxpost eller Supabase-række.

## Forhold til aktive ture

En tur, som er startet i RavRadar, beholder DEC-0042's schema-2-kontrakt og det faktiske vejr-/scoresnapshot fra turens start. Kontoens efterregistrering er en særskilt indgang til samme `observations`-tabel, men den må ikke foregive at have et sådant snapshot.

## Kontrolkrav

- Kontrakttest skal låse brugerens valgte tid, afvisning af fremtidig afslutning, zone→kyststrækning og tomme vejr-/scorefelter.
- Servicetesten skal låse samme `observations`-endpoint, eksisterende klient-id-deduplikering, indlogget ejer og `calibration_eligible=false`.
- Den direkte sandsynlighedsberegning skal bevise, at rækker med `calibration_eligible=false` hverken ændrer stikprøvestørrelse eller resultat.
- Fravalgstesten skal bevise, at den aktive lokale tur ryddes, og at nul observations-/outbox-/serverposter oprettes.
- Den fælles formular og de forståelige danske forklaringer skal være kontraktlåst.
- En rigtig autentificeret indsendelse må kun udføres som en bevidst interaktiv ejerprøve, fordi den opretter en virkelig Supabase-række.

## Testomfang

Under udvikling køres kun de målrettede tests for denne kontrakt samt nødvendige versions- og RDKS-kontroller. Den fulde `validate:source` skal bestå én gang på PR'ens eksakte head i GitHub. Fuld produktionsvalidering og releasegate køres først i den faktiske produktionskæde, som bygger det nye artifact.

## Uændrede grænser

- Candidate G, `20/50/30`, scorelogik, vejrdata og profilvalg ændres ikke.
- Der ændres ingen geometri, land-/vandpunkter, artifact, protected-dirty-data eller private cachedata.
- Der tilføjes ingen ny Supabase-tabel eller særskilt tur-/fundrække. DEC-0065/4.0.266 tilføjer den manglende eksisterende kontraktkolonne `data_quality_flags`, som denne beslutning allerede krævede, uden at ændre eller slette observationer.

## Produktionsbevis

PR #111 bestod exact-head `32658661075` og blev merged som `cb7d2232`. Produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er version 4.0.265 på 210 zoner og 673 kystdele. Den målrettede, ikke-dataskrivende livekontrol bekræfter den udgivne efterregistreringsformular, dens krævede selvvalgte dato og tid uden forudfyldning samt **Afslut uden at indberette**.

Den efterfølgende interaktive ejerprøve viste, at den autentificerede upload og turlog ikke var omfattet af dette produktionsbevis: den aktive tabel manglede `data_quality_flags` og ejerens SELECT-policy. DEC-0065/4.0.266 er den bindende produktionskorrektion. Formular- og fravalgskontrakten ovenfor består uændret.
