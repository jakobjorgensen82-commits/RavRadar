# DEC-0064: Fleksibel kontoindberetning uden falske vejrdata eller dobbeltlagring

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
- Der tilføjes ingen Supabase-tabel eller databasekolonne.

## Produktionsbevis

PR #111 bestod exact-head `32658661075` og blev merged som `cb7d2232`. Produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er version 4.0.265 på 210 zoner og 673 kystdele. Den målrettede, ikke-dataskrivende livekontrol bekræfter den udgivne efterregistreringsformular, dens krævede selvvalgte dato og tid uden forudfyldning samt **Afslut uden at indberette**.
