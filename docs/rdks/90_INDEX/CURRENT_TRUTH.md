Warning: truncated output (original token count: 66053)
Total output lines: 1608

# Current truth – gældende projektviden

## 4.0.270-kandidat – før-lancering, ekspert, admin og synlig rangering

- Den seneste naturlige produktionskørsel dokumenterer 210 zoner og 673 kystdele. De 198 geografisk verificerbare zoner har 72 timers sammenhængende prognose med naturlige tretimerspunkter; der opfindes ikke mellemliggende timer. Tolv kendte zoner mangler ærligt et marint punkt.
- Supabase-projektet er sundt på Free-planen. I den aktuelle periode er databasen cirka 17 % og egress cirka 5 % af kvoten. Den forrige periodes egress-overskridelse og fristen 9. september overvåges fortsat.
- Administratoren og eksperten bruger den samme centralt gemte håndbog. Ekspertadgang er begrænset af rettighederne `admin_access`, `handbook_view` og `handbook_review`; målrettede admin-, håndbogs- og rettighedstest er grønne. Officielle opdateringer trevejsflettes mod sidste kildebaseline, så centralt godkendte ekspertændringer ikke overskrives ved deploy.
- En falsk rød status for `coastline-overrides` i den første adminoversigt er rettet ved at kontrollere alle fem centrale dokumenter.
- Offentlige lister bevarer DEC-0049's lotterikorrektion og viser den afrundede områdescore, de faktisk sorterer efter. Højeste viste områdescore står derfor øverst; detailvisningen viser fortsat bedste kyststræknings almindelige RavScore.
- Begge håndbøger beskriver den aktive Candidate G-model som 20 % søgeforhold, 50 % transport og 30 % rav i bevægelse. Arbejdsplan, kodekapitel, scenarier og hypoteseregister følger den faktiske aktive motor; ældre kandidater er tydeligt mærket som historik.
- Releasegaten kræver aktive Candidate G-spor og kontrollerer den aktive motor særskilt fra den globale 25/40/35-rollback.
- Versionsværktøjet synkroniserer nu hele den aktuelle webhåndbog til installationsfilen til Supabase, så en ny installation ikke starter med forældet faglig tekst.
- PR #122 bestod exact-head `32721778498` på `a885bc5b` og blev merged som `abe10127`. Produktion `32721891349` stoppede før Supabase- og Pages-deploy, da den centralt ændrede håndbog manglede en lagret baseline ved første migrering.
- PR #123 bestod exact-head `32724526697`, blev merged som `00f59456`, og produktion `32724616331` bestod alle kode-, data- og releasegates. Den stoppede før deploy, fordi den slanke Pages-pakke ikke udgiver håndbogens kildefil; ingen central håndbog eller offentlig side blev overskrevet.
- Første migrering kan bruge den produktionsverificerede 4.0.269-kilde på uforanderlig commit `d745e0ba4ad88dde91c308a9ad9810797f951c91` som baseline, men kun når dens SHA-256 matcher det tidligere beskyttede manifest. Kandidaten ændrer ingen delscore, farvegrænse, fysisk model, vejrdata, geometri eller land-/vandpunkt. Endelig hotfix-exact-head, frisk produktion og offentlig browserkontrol mangler endnu.

## Produktionsverificeret 4.0.269 – aktuelle scoreforklaringer og enkel offentlig visning

- **Hvorfor denne score?** bruger nu den valgte kystdels faktiske offentlige vind-, bølge- og strømværdier samt relevant opbygget Candidate G-state for alle tre komponenter. Generiske intervaltekster står ikke længere alene.
- **Rav i bevægelse** forklares som bølgevirkning – ofte skabt af vind – på allerede tilgængeligt rav og let materiale. Vind giver ikke direkte mobiliseringspoint, og strømmen står fortsat for transporten.
- Lavt og stigende vand kan forekomme samtidig; kun stigningen beskrives som mulig hjælp til at føre materiale længere ind. En fast lavvandsprofil i reserveberegningen mærkes som en fast egenskab.
- Den offentlige **Fundprognose** er skjult, fordi to ture ikke kan bære en troværdig procentchance. Observationer og intern læring bevares. **Anvendte scorelofter** og rå **Samlet score**-JSON er skjult, mens bagvedliggende teknisk logik består.
- Det tomme **Vælg et område på kortet**-felt er fjernet uden ændring af kortvalg. Kilde- og licensafsnittet følger den faktiske DMI-/Copernicus-/dokumenterede fallback- og kortkæde.
- Candidate G er fortsat aktiv 20/50/30. Ejerens 25/40/35-billede svarer til en kort global reservevisning; næste naturlige produktion viste igen Candidate G på 210/673. Den globale, ikke-blandede reserve bevares, og 4.0.269 forklarer begge profiler korrekt.
- Ingen scoretal, Candidate G-regel, vejrdata, Supabase-kontrakt, geometri eller land-/vandpunkter er ændret. De to geodatafiler ændrede kun versionsfeltet.
- PR #120 bestod exact-head `32703138969` på `37de330c` og blev merged som `d745e0ba`. Produktion `32703271897` udgav live `rr-20260824080543-210` som 4.0.269 efter grøn central hydrering, frisk DMI/strøm, fuld validering, releasegate og Pages.
- Den fulde offentlige browseraudit bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden kontrol-, konsol-, side- eller HTTP-fejl. Se DEC-0068.

## Produktionsverificeret 4.0.268 – ravjagt før RavRadar

- Den offentlige læring er nu en selvstændig **Grundbog i ravjagt**, ikke en vejledning i at trykke rundt i appen. Den lærer først ravets egenskaber, mobilisering, transport, vind, bølger, strøm, vandstand, kystformer, felttegn og selve jagten.
- Grundforklaringen er: Bølger kan mobilisere, strøm transporterer, og kysten sorterer og samler. Vind virker især gennem bølger, vandlag, vandstand og søgeforhold; der findes ingen universel gunstig dansk vindretning.
- Strand, vandkant, waders og UV omkring 365 nm beskrives som forskellige metoder. UV er et spor og ikke et endeligt ægthedsbevis; ødelæggende hjemmetests anbefales ikke.
- RavRadar forklares først efter den praktiske og fysiske viden. Den aktive `20/50/30`-model, waders-vindkurven og 13-timers udtransportregel beskrives som testede RavRadar-regler, ikke universelle naturgrænser.
- Centrale offentlige tekster om login, konto, tur, score, opdatering og datakilder er gjort mere forståelige. Interne standardord som fallback, datasæt, databaseleverandør og tekniske scorereferencer vises ikke som normal brugertekst.
- Kandidaten ændrer ingen score, Candidate G-regel, vejrdata, Supabase-kontrakt, geometri eller land-/vandpunkter. De to geodatafiler har kun versionsfeltet 4.0.268.
- Lokal målrettet test samt desktop- og 390 px-mobilkontrol er grøn. PR #116 bestod exact-head `32670857438` på source-head `c810155b` og blev merged som `5a2f7796`.
- Første produktion `32670920742` stoppede korrekt før deploy, fordi en ældre fuld rangeringstest stadig krævede den tidligere tekniske hjælpetekst ordret. PR #117/exact-head `32671863965` rettede kontrakten og blev merged som `21acb0a2`.
- Anden produktion `32671924885` kom forbi rangeringstesten, men stoppede fortsat før deploy på den samme fejlfamilie i stateforklaringstesten: den krævede den gamle **Hvad skete før nu?** frem for **De seneste timers betydning**. Også denne kontrakt blev rettet og flyttet til den tidlige kildegate.
- Den efterfølgende målrettede gennemgang af 29 direkte testlæsere er grøn og har også afviklet den historiske 4.0.240-sikkerhedstest til den gældende 4.0.268-kontrakt med én samlet afgrænsning og ingen gentagne delscoreadvarsler.
- PR #118 bestod exact-head `32672522334` på `8faccce3` og blev merged som `3c22e40b`. Frisk produktion `32672578127` bestod hele kæden og udgav live `rr-20260823230848-210` som 4.0.268 på 210 zoner og 673 kystdele.
- Den fulde offentlige browseraudit bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer med nul kontrol-, konsol-, side- eller HTTP-fejl. Se DEC-0067.

## Produktionsverificeret 4.0.267 – komplet uploadskema

- 4.0.266 løste redirect og privat turloglæsning, men den aktive tabel manglede stadig de manuelle kontoindberetningers POST-only-felter `forecast_target_at` og `report_accuracy`.
- Den centrale, databevarende hotfix er anvendt og read-only efterkontrolleret. Begge felter findes nu; ingen observationsrække er ændret eller slettet.
- Ejerens efterfølgende genindlæsning gav fortsat nul ture. API-loggen viste GET men intet POST: den fælles privatlivskontrol afviste den krævede tomme værdi `gps=null` før lokal lagring. Det ramte både efterregistrering og **Start ravtur → Slut ravtur**.
- 4.0.267 tillader kun lokationsnøgler med værdien `null`; alle faktiske GPS-/positions-/rutedata forbliver blokeret. De to tidligere forsøg nåede ikke outboxen og blev ikke fejlagtigt eftersendt.
- PR #115 bestod exact-head `32664463654` på source-head `92379b27`, blev merged som `43ceffc1`, og produktion `32664525128` bestod frisk data, fuld validering, releasegate, Supabase og Pages.
- Ejeren oprettede derefter en ny indberetning, og den blev både sendt og synlig i **Mine ture og fund**. Uploadkæden er dermed lukket ende til ende. Se DEC-0066.

## Produktionsverificeret 4.0.266 – virkelig magic-link-retur og aktiv turlogkontrakt

- Ejerens første autentificerede prøve viste, at 4.0.264/4.0.265 ikke var fuldt ende-til-ende-verificeret: Supabases Site URL stod til localhost, redirect-listen var tom, og den aktive `observations`-tabel manglede både `data_quality_flags` og SELECT-policyen for egne ture.
- Den centrale Site URL og tilladte redirect er nu `https://jakobjorgensen82-commits.github.io/RavRadar/`. Et senere skift til `https://ravradar.dk/` skal ændre begge indstillinger og prøves med et nyt link i samme deployment.
- `20260823_account_trip_log_contract.sql` er anvendt centralt. Den tilføjer kun det manglende felt og den private læseregel; ingen eksisterende observationer er ændret eller slettet.
- Read-only produktionskontrol får HTTP 200 for hele turlogfeltlisten med `limit=0`. Policyoversigten viser **users can read own observations / SELECT / authenticated** og ingen offentlig SELECT-policy.
- Den lokale outbox genprøver afventende ture ved sideindlæsning med samme klient-id. Brugerfladen omtaler en eventuel læsefejl som RavRadar og ikke som Supabase.
- PR #113/exact-head `32662085932`, merge `db4db876` og produktion `32662155582` er grønne. Produktionsadressen viser 4.0.266 efter fuld validering, releasegate og Pages-deploy.
- Et nyt magic link returnerede til RavRadar med en ren afsluttende adresse, kontoen blev indlæst, og **Mine ture og fund** hentede uden fejl. Codex-browseren viste nul ture, fordi ejerens tidligere afventende række ligger i den oprindelige Chrome-outbox. Den sidste ejerprøve er at genindlæse netop den Chrome-fane og kontrollere eftersendelsen. Se DEC-0065.

## Produktionsverificeret 4.0.265 – fleksibel kontoindberetning uden falske vejrdata

- En indlogget bruger kan vælge **Indberet tur eller fund** på kontosiden uden en forudgående turstart. Indberetningen bruger samme spørgsmål og eksisterende `observations`-tabel; der oprettes ingen ekstra tabel, dubletpost eller fundkopi.
- Brugeren vælger korrekt startdato, starttid og varighed. Valget gemmes som start, afslutning og midtpunkt. Aktuelle forhold på indberetningstidspunktet kobles aldrig på som historisk vejr eller score.
- Klienten kan ikke sikkert genskabe et vilkårligt historisk snapshot. Kontoindberetningen gemmes derfor med schema 1, tomme forecast-/snapshotfelter, entydige kvalitetsmarkører og `calibration_eligible=false`. Den er erfaring og kan senere sammenstilles kontrolleret med historiske data, men bruges ikke direkte til scorejustering.
- Den lokale sandsynlighedsberegning sorterer udtrykkeligt alle rækker med `calibration_eligible=false` fra. Ældre rækker uden feltet bevarer deres eksisterende adfærd.
- En startet tur kan afsluttes med **Afslut uden at indberette** efter bekræftelse. Det rydder kun den lokale aktive tur og opretter ingen observations-/outbox-/serverpost. **Svar senere** bevarer fortsat turen lokalt.
- Begge indgange bruger samme afhængige zone→kyststrækningsvalg og afviser en kyststrækning fra en anden zone. GPS-spor, rute, præcis position, fri tekst og billeder indsamles ikke.
- PR #111/exact-head `32658661075`, merge `cb7d2232` og produktion `32658724861` er grønne. Live `rr-20260823184330-210` er version 4.0.265 på 210/673, og det udgivne modul er målrettet kontrolleret for selvvalgt dato/tid uden forudfyldning samt fravalg. Candidate G, `20/50/30`, vejrdata, geometri og land-/vandpunkter er uændrede. Se DEC-0064.

## Produktionsverificeret 4.0.264 – forståeligt brugerflow og privat turlog uden dobbeltlagring

- Den aktive turrejse er nu direkte v2: start, afslut og færdiggør én komplet tur. Den gamle parallelle GPS-tur er ikke længere koblet til brugerfladen.
- **Mine ture og fund** læser de eksisterende `observations`-rækker gennem Supabase RLS. Der oprettes ingen ekstra tabel, serverrække eller kopi; læsningen sker først ved klik, med et lille feltudvalg og højst 100 ture.
- En allerede eksisterende turpost kan have `user_id`, når brugeren var logget ind ved indsendelsen. Feltet bruges kun til ejerens private læsning. Mail/navn gemmes ikke i turposten, og analyse eller modeltræning må ikke bruge identiteten.
- Anonyme ture forbliver anonyme. En lokal outbox er leveringssikring på enheden og deduplikeres mod serverrækkens eksisterende tur-id.
- Magic-link-teksten forklarer engangslinket, redirecten er versionsuafhængig på samme origin/sti, og callbacken henter den faktiske Supabase-bruger før kontoejerskab bruges.
- Offentlige hovedord er forenklet til blandt andet **Søgeforhold**, **Transport mod kysten** og **Rav i bevægelse**. Candidate G, `20/50/30`, scorelogik, vejrdata, geometri og land-/vandpunkter er uændrede.
- PR #106 bestod exact-head `32652894729`, blev merged som `23fa89ed`, og produktion `32652970105` bestod hele kæden. PR #107 bestod exact-head `32654048944`, blev merged som `8b758337`, og produktion `32654119745` bestod igen frisk data, fuld validering, releasegate og Pages. Live `rr-20260823171804-210` er 4.0.264 på 210/673.
- Konto-/loginforklaring og direkte tur uden GPS/rute er kontrolleret live. UI og audit er enige om `Vandstandsændring på 3 timer`, og 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer består uden kontrol-, konsol-, side- eller HTTP-fejl. En rigtig loginmail og autentificeret kontooversigt kræver senere ejerens interaktive prøve.
- PR #108 bestod exact-head `32654780774` og blev merged som den rent dokumentariske `98621bf9`. GitHub oprettede 0 push-produktionskørsler for mergecommitten, så den eksakte rodhåndbog og RDKS er bevist omfattet af docs-only-skip. Den seneste push-produktion er fortsat `32654119745`.


## Aktuel produktionsverificeret 4.0.263 – Candidate G-gate ved den aktuelle fælles zonereference

- PR #100/exact-head `32642456123`, merge `586fbd184f68c6445acfb38a39814f6348f14bd0` og produktion `32642532892` beviser DEC-0061's cadence: live `rr-20260823134605-210` accepterer 673/673 states uden reset eller replaymismatch og har 110 positive mod 563 fysisk fortsat nul transportpotentialer.
- 4.0.262's offentlige profil faldt alligevel fail-closed tilbage til legacy. Alle 673 faktisk valgte aktuelle referencer var lovlig `WINDOW_INCOMPLETE`, men den globale gate inspicerede også senere femdøgnsrækker og lod et fremtidigt gap gøre `candidateWarmupEligible=false`.
- DEC-0062/4.0.263 binder derfor `candidateMemoryReady` og `candidateWarmupEligible` til den nærmeste scoretid, der er fælles for alle kystdele i hver zone og ligger nærmest produktionsreferencen. Hele femdøgnets Candidate G-scorecoverage kræves fortsat.
- `LATEST_SAMPLE_MISSING`, `WINDOW_HAS_MISSING_EVIDENCE` eller `WINDOW_HAS_TIME_GAP` ved den aktuelle fælles reference giver fortsat global rollback. Et senere prognosegap behandles fail-closed i sin egen state og må ikke retroaktivt slå den aktuelle profil fra.
- Referencescopet offentliggøres som `CURRENT_COMMON_ZONE_REFERENCE` og kræves af den dataminimerede 210/673-shadow.
- PR #101/exact-head `32644701811`, merge `9f5953f6` og fuld produktion `32644772373` er grønne. Live `rr-20260823142247-210` har Candidate G aktiv på 210/673 med 673 accepterede states, nul reset/replaymismatch og 139 positive mod 534 aktuelt fysiske nultransporter.
- Aktiv shadow `32645569741` og browserkontrollen er grønne. Browseren bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden kontrol-, konsol-, side- eller HTTP-fejl. P0 er lukket.

## 4.0.262 – cadence rettet, men profilgaten rullede tilbage på senere prognosegap

- DEC-0061 retter lokalt 4.0.261's P0: Candidate G accepterer højst tre timer mellem verificerede native strømbeviser, bruger den faktiske forløbstid og opfinder ingen mellemtimer.
- Mere end tre timer, manglende seneste bevis eller missing inde i vinduet er stadig et ægte hul. Ejerens pre-public undtagelse accepterer kun `WINDOW_INCOMPLETE`; øvrige ikke-ready-statusser vælger legacy globalt via `candidateWarmupEligible=false`.
- Public-shadow genafspiller nu alle kompakte states og kræver identisk potentiale, udtransporttilstand, readiness, status og coverage. Målrettede tests dækker 3-timers fortsættelse, komplet 17-punkts/48-timers vindue, split/ubrudt replay og 4-timers fail-closed gap.
- Dataminimeret replay af den gamle 673-state giver 110 positive og 563 fortsat nul i stedet for 673 fastlåste nuller; det gamle artifact afvises med 658 forventede replaymismatch.
- Model/state/profile-identitet og de faglige `20/50/30`, 0,03→0,15, +10/-8, 13 timer, mobilisering 4/48 og wadersregler er uændrede. Ingen private data, geometri eller punkter er ændret.
- Exact-head og fuld produktion er grønne som beskrevet ovenfor. Den efterfølgende audit beviste selve cadence-replayet, men fandt DEC-0062's uafhængige referencescopefejl før aktiv shadow kunne godkendes.

## Historisk P0 i 4.0.261 – aktiv Candidate G kunne ikke opbygge transport ved produktionscadencen

- En dataminimeret read-only kontrol af live `rr-20260823121818-210` viser 673 Candidate G-states og 673/673 transportpotentialer på 0. Begge jagtformer har transportkomponent 0 i 673/673 dele.
- 15 dele har ét afledt strømbevis og 658 har to. De 658 par ligger tre timer fra hinanden; statekontrakten tillader højst én time mellem beviser. Det kontinuerte suffix reduceres derfor til den seneste enkeltprøve.
- Første prøve har nul forløbstid i transportintegrationen. Selv om seneste anonyme evidensfordeling indeholder både indgående, neutral og udgående styrke, kan en enkeltprøve ikke bygge eller nedbryde potentialet. Under uændret produktion vil det faste 48-timersvindue derfor aldrig blive komplet, og transporten vil ikke rette sig ind af sig selv.
- Manifestet vælger fortsat Candidate G globalt med `candidateCoverageReady=true`, `candidateMemoryReady=false` og `candidate-active-pre-public-warmup`. De tidligere grønne exact-head-, produktion-, shadow- og browsergates kontrollerede kontraktidentitet, men fangede ikke mismatch mellem én-times-gaten og tre-timers produktionsbevis.
- 4.0.261 er dermed teknisk deployet og gateverificeret, men den aktive score er ikke fagligt acceptabel som samlet Candidate G-score. DEC-0061/4.0.262 er den valgte lokale rettelse; de eksterne leverancegates står ovenfor.

## 4.0.261 – produktionsverificeret Candidate G under pre-public opvarmning

- Ejeren har udtrykkeligt besluttet, at Candidate G skal være RavRadars gældende scoremotor nu. Siden er endnu ikke offentlig, og ejeren accepterer, at de første scoreværdier bygger på mindre end 48 timers naturlig schema-2-historik.
- DEC-0060 vælger `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` med `20/50/30`. Modelregler, strømgrænser, +10/-8, 13-timers udtransportgate, mobilisering 4/48 og vindstyret waders-jagtbarhed ændres ikke.
- Den aktive profil må være `candidate-active-pre-public-warmup`, mens `transportMemoryReady=false`. Runtime skal fortsat vise den faktiske `WINDOW_INCOMPLETE`-status og coverage; opvarmningen må aldrig omtales som et komplet 48-timersbevis.
- Global dækning betyder i denne opvarmningsfase, at alle nødvendige Candidate G-resultater er beregnelige med korrekt model-id. Mangler én nødvendig score, vælger hele datasættet eksakt legacy `RRS-CURRENT-B0-4.0.247`; blandede profiler er forbudt.
- Aktiveringen ligger i det private, centrale admin-dokument `ravscore-profile-selection`, kræver versionsbundet ejerautoritet og har altid `automaticActivationAllowed=false`. En nyere ejer-godkendt repositorykonfiguration kan promoveres centralt én gang; derefter er samme eller nyere central konfiguration autoritativ, også ved rollback.
- Den tidligere rækkefølge med komplet 48-timersvindue og frisk slutshadow før kobling er erstattet kun for den nuværende ikke-offentlige opvarmning. Exact-head-kildegate køres før merge; fuld produktion, central readback, aktiv 210/673-shadow og fuld browserkontrol følger den eksakte merge. Modstridende evidens udløser global rollback.
- Når vinduet senere bliver komplet, fortsætter samme Candidate G-profil. Der programmeres eller aktiveres ikke en ny model på det tidspunkt; transporten bliver blot fuldt uafhængig af opvarmningsranden.
- 4.0.261 ændrer ingen private caches, artifact, protected-dirty-data, geometri eller land-/vandpunkter. I `data/kystdata.json` og `data/zones.geojson` ændres kun versionsfeltet.
- PR #97 bestod exact-head `32636378576` på `41cdb897`, blev merged som `0f7a9d5f`, og fuld produktion `32636433944` bestod central hydrering, frisk data, fuld validate, releasegate, central profil-readback og Pages. Live `rr-20260823112726-210` er 4.0.261 med Candidate G aktiv, 210 zoner, 673 dele, identiske manifesthashes og nul offentlig kandidat-scoreafvigelser.
- Første aktive shadow `32637022498` fandt ingen score-, coverage-, rekonstruktions- eller privatlivsfejl, men fejlede på en for snæver auditantagelse: 8 legitime `WINDOW_HAS_MISSING_EVIDENCE`-tilstande blev fejlagtigt afvist, fordi auditen kun tillod `WINDOW_INCOMPLETE` ved `memoryReady=false`. Runtimekontrakten og state-pipelinen har hele tiden defineret begge samt `LATEST_SAMPLE_MISSING` og `WINDOW_HAS_TIME_GAP` som ærlige ikke-ready-statusser. Auditkontrakten rettes og genkøres; den røde gate omgås ikke.
- Auditkontrakten blev rettet i PR #98 efter grøn exact-head `32637339636` og merged som `fd69f8a0`. Frisk produktion `32637387600` bestod central hydrering, frisk data, fuld validate, releasegate og Pages. Aktiv shadow `32637833674` bestod 210/673 på eksakt main.
- Den fulde livebrowseraudit af `rr-20260823114744-210` bestod 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger i begge jagtformer med nul kontrol-, konsol-, side- eller HTTP-fejl. Browserrunneren kan nu få den forventede version via `RAVRADAR_EXPECTED_VERSION`, så samme systematiske kontrol kan bruges uden kildeændring ved kommende versioner.

Alle senere versionsbundne afsnit i denne fil beskriver sandheden ved deres daværende checkpoint. Udsagn dér om, at Candidate G er privat, `diagnostic-only`, ikke aktiveret, eller at `25/40/35` er aktiv, er historik og er erstattet af dette 4.0.261-afsnit og DEC-0060. De faglige regler og dokumenterede usikkerheder består, medmindre en nyere beslutning udtrykkeligt erstatter dem.

## Historisk efter 4.0.260 – Candidate G fik afgrænset 48-timers transporthukommelse før aktivering

- DEC-0059 erstatter den ubundne videreførelse af transportpotentialet og den efterfølgende anbefaling om startprior 50. Candidate G genafspiller nu de seneste 48 timers sammenhængende, verificerede kystnormale strømbevis fra samme faste rand 0.
- Rand 0 betyder ingen dokumenteret indtransport før vinduets begyndelse. Det er ikke dokumenteret fralandsstrøm og udløser ikke totalscoregaten. Persistéret transportpotentiale og persistérede udtransporttimer er output, ikke skjult startinput til næste komplette vindue.
- State schema `2.0.0` og profilen `current-0.03-0.15-in10-out8-exhaust13-window48-boundary0-wave-build4-decay48` gemmer højst 49 afledte timebeviser som styrke -1..1 eller eksplicit missing. Rå U/V, fart, retning, koordinater, geometri, del-id'er og private payloads indgår ikke.
- Missing eller tidsgab behandles ikke som neutral strøm. Et komplet aktiveringsklart vindue kræver 48 sammenhængende timer ved den aktuelle reference; ellers er `transportMemoryReady=false`, og DEC-0058's globale omskifter bliver fail-closed på legacy.
- Syntetiske tests beviser 47/48-timersgrænsen, startuafhængighed 0/50/100, 0,15 m/s-loftet, 12/13-timers udtransport, kort modstrøm, fornyet indtransport, same-time, split/ubrudt og raw-input-forbud. Ingen 48-timers realtidsventetest kræves eller udføres.
- Read-only replay af 42.551 offentlige supplementposter fandt 582 dele med et ubrudt eksakt 48-timersvindue; alle 582 gav nul mismatch mellem tænkte eksterne starter 0/50/100. De øvrige 91 er ikke almindelige RavRadar-vejrholes: supplementfilen omfatter kun 633 dele og indeholder desuden tidsmæssige huller.
- Den nye state opbygges naturligt i højst 48 timer efter kontraktskiftet. Foreløbige Candidate G-resultater må bruges diagnostisk, men ikke som slutshadow eller aktiveringsbevis. Offentlig `25/40/35`, mobiliseringens 4/48-profil, geodata, geometri og land-/vandpunkter er uændrede.
- Exact-head `32633533257` på `56824ab0`, PR #95/merge `1d848724` og fuld produktion `32633607166` er grønne. Live `rr-20260823102619-210` har 210/673 og korrekt manifestintegritet.
- Første schema-2-produktion har præcis ét afledt timebevis på alle 673 dele, `WINDOW_INCOMPLETE`, 0/673 aktiveringsklar hukommelse, 0 offentlig Candidate G-aktivering og 0 raw-input-læk i den dataminimerede state. Ønsket, aktiv og rollbackprofil er fortsat `RRS-CURRENT-B0-4.0.247`.

## 4.0.260 – produktionsverificeret score-neutral omskifter, fortsat offentlig 25/40/35

- DEC-0058 indfører `RAVSCORE-PROFILE-SWITCH-4.0.260`. Ønsket, aktiv og rollbackprofil er fortsat `RRS-CURRENT-B0-4.0.247`; versionen ændrer derfor ingen offentlig score, farve, zonevinder eller bedste tidspunkt.
- Candidate G kan i en senere version kun vælges samlet, når aktiveringsflag, komplet global dækning, frisk grøn slutshadow og særskilt ejerbeslutning alle foreligger. Ukendt eller ufuldstændig konfiguration falder fail-closed tilbage til legacy for hele datasættet; blandede zone-/timeresultater er forbudt.
- Profilvalget sker før opbygning af lokale score-/vinderrækker og følger offentlig startpakke, detaljepakke og manifest. Rollback returnerer det oprindelige legacyresultat direkte og rekonstruerer ikke 25/40/35 gennem Candidate G-kode.
- Candidate G-adapteren bevarer `20/50/30`, wadersloftet og udtransportgaten med den godkendte danske forklaring. Den tilføjer ikke sikkerhedsråd eller bund-, dybde-, rende-, revle-, adgangs- eller stedegnethedsregler.
- PR #92 bestod exact-head `32628441062` på `eabf7e8b` og blev merged som `c5898ce8`. Fuld produktion `32628516066` bestod central hydrering, frisk DMI/fallback, fuld validering, releasegate, Supabase, artifact og Pages.
- Live `rr-20260823083627-210` er komplet med 210/210 zoner og 673/673 dele. Begge offentlige runtimefiler matcher manifestets byteantal og SHA-256, og den dataminimerede audit består 1.346 modeevalueringer med 673 accepterede tilstande, nul nulstillinger og nul rekonstruktionsfejl.
- Fælles state-reference er 09:00Z mod bootstrap 00:00Z; dokumenteret yngste/ældste naturlige state-alder er derfor 9/9 timer. Ejeren accepterede nattens seks timer som praktisk evidens; den længere observation er fortsat ikke et 48-timersbevis.
- Den fulde live-browseraudit består 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger uden browser-, side- eller HTTP-fejl.
- Omskifteren vælger fortsat legacy globalt, `publicScoreChanged=false` og automatisk aktivering er falsk. Den score-neutrale Candidate G-shadow ligger aktuelt lavere end aktiv score: waders 19,187 mod 35,770 og strand 21,276 mod 43,655 i gennemsnit; 1.127 af 1.346 modeevalueringer skifter scorebånd. Den vigtigste forklaring er lav, endnu ung tilstand: transportgennemsnit 4,242 og mobilisering 13,747. Dette er beslutningsevidens, ikke et aktiveringsbevis.
- Startreserveanalysen forklarer transportskævheden. 493/673 live dele har transport 0, men nul dele har udløst den dokumenterede udtransportgate. Den offentlige syvdøgnshistorik har 42.551 poster og dækker 633 dele med 65–117 timers forløb; genafspilning fra 0 giver stadig median 0 og gennemsnit 5,781.
- Historikken kunne ikke identificere den ukendte startreserve under den daværende ubundne regel: kun 6/633 dele endte uafhængigt af start 0 kontra 100, mens 607/633 bevarede mindst 50 points forskel. Den efterfølgende anbefaling om startprior 50 er nu erstattet af DEC-0059's faste 48-timers evidensvindue.
- Før offentlig aktivering kræves fortsat komplet bounded-memory-readiness på 673/673, central admin-roundtrip, en versionsbundet aktiveringsændring, frisk grøn aktiveringsshadow og særskilt ejer-gennemgang af scorefordelingen.
- Ingen artifact- eller protected-dirty-datafiler er lagt i Git. Privat cache, geometri og land-/vandpunkter er urørte; i geodata blev kun de to udtrykkeligt godkendte versionsfelter ændret fra 4.0.259 til 4.0.260.

## 4.0.259 – central Candidate G-tilstand produktionsverificeret uden aktiv scoreændring

- DEC-0057 kobler DEC-0055's transport og DEC-0056's mobilisering til den centrale kystdelspipeline. Candidate G beregnes ved samme fælles lokale referencetime som den aktive score, men ligger i et særskilt `diagnostic-only`-navnerum.
- Den historiske schema-1-fortsættelsestilstand indeholdt kun model-/profilversion, konteksthash, tidspunkt, transportpotentiale, effektive udtransporttimer og mobiliseringspotentiale. DEC-0059 erstatter transportdelen med et afgrænset afledt 48-timersvindue; rå U/V, vejrinput, koordinater og private replaydata er fortsat forbudt.
- Tilstanden er bundet til kystdel, vandpunkt, kystretning, model og profil via hash. Inkompatibel kontekst nulstiller fail-closed; samme-time-rekørsel og missing holder tilstanden uden dobbelttælling.
- Kun tilstanden ved `currentReferenceAt` føres videre. Fremtidige prognosetimer bliver ikke gjort til historisk sandhed i næste kørsel.
- Den aktive `25/40/35`-score, farve, zonevinder og UI læser ikke Candidate G-navnerummet. `automaticActivationAllowed=false` og `publicScoreChanged=false` er låst i runtime og test.
- Den manuelle shadow er omlagt fra en ny native-only DMI-prøve til den faktisk producerede fallback-kompatible detaljefil. Den kræver 210 zoner, 673 dele og 1.346 modeevalueringer og skriver kun en dataminimeret aggregatrapport.
- Exact-head `32609888406`, PR #89/merge `31e50acb` og fuld produktion `32609952992` er grønne. Live `rr-20260823011924-210` er version 4.0.259 med 210 zoner og 673 kystdele.
- Frisk read-only shadow `32610281620` består 210/673, 1.346 modeevalueringer og nul score-rekonstruktionsfejl. Den viser 0 accepterede og 673 nulstillede tilstande, præcis som forventet ved første bootstrap.
- Første naturlige schedule `32613284735` på `main`/`600e8a45` bestod frisk data, fuld validering, releasegate, artifact og Pages. Live `rr-20260823023951-210` består fortsat 210/673 og 1.346 modeevalueringer uden rekonstruktionsfejl.
- Alle 673 tilstande accepterede den tidligere kontekst, og ingen blev nulstillet. Fra bootstrapreferencen 00:00Z til den nye fælles reference 03:00Z er både yngste og ældste dokumenterede naturlige fortsættelsesalder derfor 3 timer. Det er første fortsættelsesbevis, ikke en modnet 48-timersslutshadow.
- Første produktion er derfor dokumenteret bootstrap fra 0 og må ikke kaldes en modnet 48-timersfordeling. Endelig aktiveringsshadow kræver naturligt videreført tilstand og dokumenteret state-alder.
- 4.0.259 ændrer ingen geometri, land-/vandpunkter, bundmodel, beskyttede data eller sikkerhedsbetydning.

## Candidate G – én bølgeenergistyret mobiliseringstilstand

- DEC-0056 gør `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` til den foretrukne private helhedskandidat. Transporten følger fortsat DEC-0055, jagtbarheden DEC-0054 og vægtene `20/50/30`.
- Mobilisering bygges nu som én kausal tilstand fra lokal bølgehøjde² × periode. Den bygger mod det aktuelle energimål med fire timers halveringstid og aftrappes mod et lavere mål med 48 timer.
- Direkte vind, aktuel strøm, en separat varighedsscore og statisk stedegnethed giver ingen mobiliseringspoint. Vind forbliver i waders-jagtbarheden, strøm i transportleddet og bølgeretning i den afhængige levering.
- En syntetisk audit låser én høj time til 15,910, fire moderate timer til 27,625, tolv høje timer til 87,500 og præcis halvering til 43,750 efter 48 rolige timer. En opdelt og ubrudt kørsel giver samme sluttilstand.
- Det private Git-ignorerede replay omfatter fortsat 12 hændelsesvinduer og 1.460 evalueringer uden nye downloads. Ny mobilisering er i gennemsnit 73,348 mod 57,651 tidligere; den samlede score er 31,775, +3,484 mod den allerede valgte strømrevision, med 332 ændrede referencebånd.
- Replayet er bølgehændelsesudvalgt og har ingen fundlabels. Fire/48 er derfor en begrundet forskningsprior, ikke en naturkonstant eller fundkalibrering. Aftrapning 24/72 timer flytter gennemsnitsscoren -1,651/+0,703 og bevares som følsomhed.
- Manglende bølger holder den afledte tilstand; missing betyder ikke roligt vejr. En offentlig pipeline skal stadig håndhæve freshness og komplet fallback-kompatibel inputcoverage.
- Den gamle 243/673-shadow målte en snæver native-DKSS-testkontrakt. De 430 øvrige dele var ikke bevis for manglende almindelig vejrdækning. Den aktuelle produktion dokumenterer 673/673 strømidentiteter via DMI, Copernicus eller godkendt proxy; en frisk slutshadow skal bruge den endelige inputkontrakt uden nye punktflytninger eller nuludfyldning.
- PR #86 blev merged som `5d7d4c2b`. Produktion `32606559443` bestod kildegate, frisk kontrolleret data, fuld validering, releasegate, Supabase og Pages med 210 zoner og 673/673 dele. Et DMI-kald ramte midlertidigt 429/uforandrede collections, men den godkendte fallback-kæde leverede et komplet kontrolleret datasæt; ingen gate blev omgået.
- Mobiliseringscheckpointet bestod exact-head `32607989444` på `03083f92`, blev merged via PR #87 som `48240d73` og bestod fuld post-merge-produktion `32608050112`. Produktionen gennemførte central adminhydrering, Supabase-roundtrip, frisk kontrolleret datastrøm, fuld validering, releasegate, artifact og Pages. `controlled-live` har 673/673 scoreklare dele: 622 DMI, 43 Copernicus og 8 godkendte regionalproxier; den nationale 210/673-kontrakt er grøn.
- Offentlig RavScore er fortsat `25/40/35`. Mobiliseringscheckpointet ændrer ikke UI, runtime, geometri, land-/vandpunkter, artifact eller protected-dirty-data. Næste delmål er samlet offentlig pipeline-/forklarings-/rollbackforberedelse, ikke endnu en modelrunde.

## Afgrænset rettelse af docs-only produktionsskip

- PR #78 var ellers ren intern dokumentation, men merge `7133b33b` startede fuld produktion `32599980640`, fordi workflowet ignorerede de historiske `CHANGELOG-*.md` uden at ignorere projektets aktuelle samlede `CHANGELOG.md`.
- Den snævre rettelse tilføjer kun den eksakte rod-fil `CHANGELOG.md` og bevarer den eksisterende versionerede `CHANGELOG-*.md`-regel. Kode, data, øvrige Markdownfiler, HTML, scripts og workflows er fortsat ikke bredt undtaget.
- Regressionstesten kræver nu begge changelogmønstre. PR #79 bestod exact-head `32600654326`, blev merged som `41f71900`, og fuld produktion `32600714319` bestod frisk vejr/provenance, fuld validering, release-gate, Supabase og Pages.
- Det deployede live-manifest `rr-20260822215524-210` er komplet med 210 zoner og 673 kystdele.
- PR #80 var et rent docs-checkpoint inklusive rodens `CHANGELOG.md` og blev merged som `1565e073`. GitHub viste 0 workflowkørsler på mergecommitten; push-produktionen blev altså ikke oprettet. Rod-CHANGELOG-fejlen er lukket og bevist rettet.

## Candidate G – strømstyret transportpotentiale efter 4.0.258

- En fast syntetisk frigivelsesrevision låser nu den godkendte kurve og de vigtigste randtilfælde uden private data. Den indgår i `test:score` og `validate:source`.
- Revisionen bestod exact-head `32602287607`, PR #82/merge `189644a0` og fuld produktion `32602328912`. Live `rr-20260822223539-210` er komplet med 210 zoner, 673 kystdele og ens datasæt-id i manifest, startdata og detaljedata.
- DEC-0055 gør verificeret kystnormal strøm til Candidate G's transportled. Bølger kan ikke skabe transport; de må kun påvirke den sidste levering med højst 15 procent, når strømmen allerede har skabt potentiale.
- Fuld indgående strøm bygger 10 point pr. effektiv time mod 100. Fuld udgående strøm reducerer straks med 8 point pr. effektiv time: 100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4 og 0 fra 13 timer.
- Den private kandidat beholder `20/50/30` og DEC-0054's vindstyrede waders-jagtbarhed. Offentlig RavScore er fortsat `25/40/35`; ingen score- eller UI-aktivering er foretaget.
- Referencegrænserne 0,05→0,20 m/s og replaystart 0 er forskningspriorer, ikke naturkonstanter. Følsomhed 0,03→0,15 og 0,02→0,12 flytter Candidate G-scoren henholdsvis +3,068 og +4,296 point, mens diagnostisk start 50 flytter den +21,136.
- Mekanikken består målrettede tests og det private 1.460-evalueringsreplay, men strømgrænsen, starttilstanden og et eventuelt passivt 24–48-timers tab er åbne aktiveringsblokeringer.
- Ejeren har erstattet `RESEARCH-1`-betydningen ved udtømt udtransport. I den foretrukne `RESEARCH-2`-revision sættes slutscoren til 0, når faktisk kraftig udtransport har udtømt transportpotentialet, mens mobilisering og jagtbarhed fortsat beregnes og vises. Start 0 uden faktisk udtransport, missing, neutral strøm og svag modstrøm udløser ikke gaten.
- `RESEARCH-2` bestod exact-head `32604792201` på `f6458f09`, blev merged via PR #84 som `800a93cb` og bestod fuld post-merge-produktion `32604850884`. Live `rr-20260822232159-210` er direkte verificeret med 210 zoner, 673 dele, `controlled-live` og samme datasæt-id i manifest/start/detaljer.
- Den afgrænsede efterkontrol viser, at alle 12 eventvinduer kun har 24 timers forhistorie. Neutral halvering på 24/48 timer flytter start-0-scoren -1,182/-0,697 point, men kan ikke løse den ukendte starttilstand eller vælge en fysisk levetid. Begge er følsomhedsspor; referenceadfærden er fortsat start 0 uden passivt tab.
- Referencegrænsen 0,05→0,20 m/s rammer ingen fuldstyrkeevalueringer i replayet. De lavere profiler rammer kun 0/10 og 2/44 fulde ind-/udgående evalueringer og mangler fundlabels. Strømgrænsen er derfor fortsat ukalibreret.
- Efter ejerreview er `0,03→0,15 m/s` den anbefalede private produktprior: 0,15 m/s matcher RavRadars eksisterende grænse for velegnet strøm, mens den kystnormale 0,03-dødzone dæmper meget svage udsving. Det er en teknisk anbefaling, ikke fundkalibrering.
- Den anbefalede tilstand har intet passivt tab ved neutral strøm. En kompakt afledt tilstand med tidspunkt, potentiale og igangværende effektive udtransporttimer skal føres videre mellem produktionskørsler; en kørselsgrænse må ikke nulstille ravpotentialet. Koden reproducerer nu en opdelt og ubrudt 13-timerskurve eksakt.
- Det opdaterede `RESEARCH-2`-replay giver 31,360 i gennemsnit og ændrer 213/1.460 scorebånd ved 0,03→0,15 mod 28,291 og 0 ændringer for 0,05→0,20. Den mere følsomme 0,02→0,12 ændrer 377 bånd. 24-/48-timers neutral halvering forbliver kun følsomhedsspor.
- PR #75's exact-head-kørsel `32598284279` bestod på `d37d15fe`, og checkpointet blev merged som `4379606e`. Der blev ikke bygget eller aktiveret et nyt produktionsartifact.
- Efterkontrollen bestod exact-head-kildegate `32599255165` på `ed1f0297` og blev merged via PR #77 som `75ed93d6`. Produktion `32599309735` bestod frisk vejr/proveniens, fuld validering, releasegate, Supabase og Pages. Live `rr-20260822212612-210` har 210 zoner og 673/673 scoreklare dele med ens dataset-id i manifest/start/detaljer; offentlig score er stadig `25/40/35`.
- G 24/48 og tidligere kandidater bevares som historisk evidens. Ingen nye rådata er hentet; private cachepayloads, artifact, protected-dirty-data, geometri og land-/vandpunkter er urørte.
- Den aktuelle aktiveringsliste er komplet dynamisk scoreinputcoverage, pipelinekobling af den kompakte transporttilstand, resterende mobiliserings-/helhedsreview, frisk national slutkontrol, UI/forklaring, central admin-roundtrip/rollback og eksplicit ejer-go/no-go. Strømprofil, neutral betydning og transportnul-kontra-totalscorenul er teknisk afgjort som private priorer; empirisk turkalibrering mangler fortsat. Automatisk aktivering er falsk.

## Candidate G 4.0.258 – vind er hovedsignal for waders-jagtbarhed

- Den foretrukne private forskningsvariant er `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED` med ejerens faglige analyseprior `20/50/30`. Offentlig RavScore er fortsat `25/40/35`.
- Waders-vindkurven er 100 til og med 6 m/s, derefter 7/80, 8/60, 10/35, 13/10 og 15/0. WAM's signifikante bølgehøjde kan kun reducere vindscoren med 20 procent af et negativt gab, højst 20 point; den kan ikke hæve scoren eller alene give hårdt stop.
- Waders-slutscore er højst jagtbarheden, også efter ekspertregler. Strandjagt er uændret og har intet jagtbarhedsloft.
- Replayet omfatter 1.460 evalueringer: 730 uændrede strandscorer, nul waders-score over jagtbarheden, 138 lave jagtbarheder uden score mindst 55 og seks af seks vindtilfælde ved mindst 15 m/s på 0.
- Bølgefradraget er gennemsnitligt 4,002 point og højst 20. Ved vind til og med 6 m/s er den nye kandidat aldrig lavere end den tidligere waders-limit.
- DEC-0054 erstatter DEC-0053's valg af variant, `20/45/35`, 18 m/s-stop og selvstændige bølgekobling. A-C, D-E, F, G 24/48 og tidligere waders-varianter bevares som revisionsspor.
- PR #73's exact-head-kildegate `32586707063` bestod på `2abc5a4c`. Merge `9bdb8de8` blev derefter produktionsverificeret i `32586958989` med frisk vejr/proveniens, fuld validering, releasegate, coverageaudit, support `RavRadar-support-3405`, Supabase og Pages.
- Live 4.0.258/datasæt `rr-20260822171406-210` er direkte verificeret med 210 zoner, 673/673 scoreklare kystdele og 2.100 femdøgnsvisninger. Den offentlige scoremodel er fortsat den uændrede `25/40/35`.
- Kandidaten er diagnostic-only og ikke fundkalibreret. En offentlig aktivering kræver særskilt ejer-go/no-go, komplette ture/hold-out, godkendt dynamisk inputcoverage og fulde gates.
- Bund, dybde, render, revler, adgang, stedegnethed og sikkerhedsrådgivning indgår ikke. Artifact, protected-dirty-data, private cachepayloads, geometri og land-/vandpunkter er urørte.

## Historisk Candidate G-beslutningsgrundlag – produktionsverificeret 4.0.257

Variant-, vægt- og jagtbarhedsvalgene i dette afsnit er erstattet af DEC-0054 og 4.0.258-afsnittet ovenfor.

- PR #70 blev merged som `bb16ffe9546a4668084045c1526702d01a54566f`. Produktion `32580314866` bestod central hydrering, frisk DMI/proveniens, fuld validering, releasegate, support, Supabase, Pages-artifact og deploy. Live datasæt `rr-20260822150210-210` har 210 zoner og 673 dele med komplet `controlled-live`-manifest.
- Frisk privat exact-merge-shadow `32580774128` bestod score-neutralt. De 243 allerede komplette dele bruges kun som aktuelt mekanisk kontrolsnapshot; der hentes ikke yderligere rådata til de øvrige dele i dette analyseafsnit.
- DEC-0053 samler én ejerreviewvariant: `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`. A-C, D-E, F og G 24/48 bevares som sammenlignings-, udviklings- og følsomhedsevidens, ikke som parallelle produktforslag.
- Replayets 730 strandscorer er uændrede, ingen af 730 waders-scorer overstiger jagtbarheden, og ingen af 216 waders-evalueringer under jagtbarhed 35 får mindst 55 point.
- Det friske 243-deles snapshot ligger mod aktiv model i gennemsnit -5,49 for strand og -0,97 for waders. Det viser reel omfordeling og kontraktmekanik, men er ikke landsdækkende fundkalibrering.
- Candidate G beholder `20/45/35` som analysecentrum. Endelig vægtning af jagtbarhed, transport og mobilisering afventer komplette ture med fund/nul-fund og hold-out. Offentlig `25/40/35` er uændret.
- Ingen ekstra rådata, offentlig score, UI, DMI/fallback, geometri, land-/vandpunkter, artifact eller protected-dirty-data er ændret.
- PR #71 bestod exact-head-kildegate `32583123375` og blev merged som `52f66808`. Ændringen er dokumentation og beslutningshukommelse; den bygger ikke et nyt produktionsartifact.

## 4.0.257-kandidat – ærlig Candidate G-coverage uden skjult stedmodel

- Frisk central shadow `32578554928` på den produktionsverificerede 4.0.256-merge `d629177a` bestod alle private score-neutrale trin for 210 zoner og 673 aktive dele.
- 243 dele havde komplette dynamiske scoreinput; 430 var eksplicit u-scorede, fordi de mangler komplet lokal DKSS-familie. Bølgefamilien manglede ikke blandt de u-scorede. Coverage er derfor 36,1 % og fortsat en hård no-go.
- Shadowen havde nul komplette lokale rev-/lavtvands-/ålegræsfelter. DEC-0052 præciserer, at dette kun er diagnostik: Candidate G bruger ingen statisk lokal retention-/stedmodel og giver disse felter nul point.
- `activationCoverageReady` måles nu kun på komplet dynamisk scoreinput til alle aktive dele. Parentzonens morfologi afvises fortsat som lokal evidens, og `automaticActivationAllowed` er fortsat altid falsk.
- Offentlig RavScore 25/40/35, Candidate G-beregningen, waders-loftet, UI, DMI/fallback, central admin, geometri og land-/vandpunkter er uændrede.
- Målrettede shadow-, Candidate G- og fase-D-tests samt fuld lokal `scripts/validate-source.ps1` og releasegate er grønne for 4.0.257. Exact-head PR-gate, produktion og en ny central shadow afventer.

## 4.0.256 – Candidate G-vægt og forklaring, produktionsverificeret

- Den ejer-godkendte `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` er genafspillet med `15/50/35`, `20/45/35` og `25/40/35` på 1.460 evalueringer. Yderpunkterne adskiller sig 4,947 point i gennemsnit og 282 referencebånd.
- `20/45/35` ligger praktisk midt mellem yderpunkterne og bevares som Candidate G's analysecentrum. Det er en faglig forskningsprior, ikke fundkalibrering; offentlig 25/40/35 er uændret.
- Alle tre priorer består de kanoniske kontrakter. Ingen giver waders-score over jagtbarheden eller mindst middel score ved waders-jagtbarhed under 35.
- Candidate G-resultatet har nu en diagnostic-only forklaringskontrakt med eksakte komponenter/bidrag, pil nu, historik før nu, fysisk gate og synligt waders-loft. Replayet gav nul forklaringsafvigelser i 1.460 evalueringer.
- PR #69 bestod exact-head-gate `32577977245`, blev merged som `d629177a`, og produktion `32578049137` bestod central hydrering, frisk DMI/proveniens, fuld validering, releasegate, support, Supabase, Pages-artifact og deploy.
- Live 4.0.256/datasæt `rr-20260822141748-210` viste 210 zoner, 673 dele, komplet manifest og `controlled-live`.
- Bund/dybde/render/adgang og særskilt sikkerhedsmodel indgår ikke. Private cachepayloads, artifact, protected-dirty-data, geometri og land-/vandpunkter er urørte.
- Samlet model-/vægt-/forklaringsgrundlag er klart til ejerreview. Aktivering er fortsat no-go, indtil komplet dynamisk scoreinputcoverage og ejerens samlede go/no-go er lukket.

## Dokumentationscheckpoint efter 4.0.255

- PR #68 bestod exact-head-gate `32576541706` på `7c4108f7` og blev merged som `8cffdd54`.
- Pushproduktion `32576619969` bestod frisk DMI/proveniens, fuld validering, releasegate, support, Supabase, Pages-artifact og deploy.
- Live 4.0.255/datasæt `rr-20260822135100-210` viser 210 zoner, 673 dele, komplet manifest, matchende conditions-datasæt og `controlled-live`.
- PR #68 ændrede kun intern dokumentation og release-rapporter; offentlig score, UI, data- og geometrikontrakter er uændrede.

## 4.0.255-kandidat – national waders-kontrakt ført ind i kildegaten

- PR #66 bestod exact-head-kildegaten `32575000140` og blev merged som `95e3064d`. Fuld produktion `32575055644` stoppede derefter korrekt før release, Supabase og Pages, fordi en ældre national kontrakttest fortsat krævede den erstattede gate `candidate-waders-product-decision`.
- Koden bruger allerede den nyere og korrekte åbne gate `candidate-waders-rule-order-public-product-review`. 4.0.255 opdaterer testen og gør den obligatorisk i `validate:source`, så kontraktforskellen fremover opdages før merge.
- Waders-varianten, vindkurven, replayresultaterne og den offentlige 25/40/35-model er uændrede. Ingen geometri, land-/vandpunkter, private caches eller beskyttede data er ændret.
- PR #67 exact-head-gate `32575697204`, merge `af8f30cf` og fuld produktion `32575740539` er grønne. Live 4.0.255/datasæt `rr-20260822133041-210` viser 210 zoner, 673 dele, komplet `controlled-live`-manifest og byte-/SHA-match for begge offentlige datafiler.

## 4.0.254-kandidat – ejerbesluttet waders-kobling, fortsat score-neutral

- Den næste Candidate G-forskningsvariant er `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`: strand er uændret, mens waders-scoren er det laveste af den hidtidige Candidate G-score og waders-jagtbarheden.
- Vinddelen er 100 fra 0 til og med 6 m/s og falder glidende gennem 7/80, 8/60, 10/35, 13/10 og 18/0. Bølgedelen er fortsat separat. Dette beskriver søgemetodens effektivitet, ikke sikkerhed.
- Historisk replay på 730 waders-evalueringer giver 27,351 mod 35,465 i den tidligere no-direct-reference. 231 falder, 323 er uændrede og 176 stiger højst 3 point på grund af den nye rolige-vindkurve; 200 skifter scorebånd.
- Samme loft på den gamle vindkurve ville give 26,901 i gennemsnit. Den nye kurves selvstændige forskel er derfor kun +0,449 point. Ingen af 216 evalueringer med ny jagtbarhed under 35 får mindst 55 point, og ingen waders-score overstiger jagtbarheden.
- Alle 730 strandscorer er identiske. Bund, dybde, render, vadebredde, adgang, geometri og land-/vandpunkter indgår ikke. Private rådata er ikke skrevet til Git.
- Den tidligere anbefaling om kun en separat metodestatus er erstattet som næste forskningscentrum. Offentlig 25/40/35, UI, DMI/fallback, central admin og produktionsruntime er fortsat uændrede; samlet model-, vægt-, forklarings-, coverage- og ejer-go/no-go mangler.

## 4.0.253 – Candidate G-produktkontrakt er merged og produktionsverificeret

- PR #62 bestod exact-head-kildegate `32568914124` på `d272c6ca` og leverede kode-/analysebaselinen som `b2951d90`; dokumentationscheckpointene gennem PR #64 bestod også exact-head-gates.
- Fuld produktionsverifikation `32570223437` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, support `RavRadar-support-3382`, Supabase, Pages-artifact og deploy på PR #64-merget `01904b92`. Pages-deployment `6036286717` er `success`.
- Det verificerede live-snapshot viste version 4.0.253 og datasæt `rr-20260822112859-210` med 210 zoner og 673/673 scorede kystdele. Aktuel head og aktuelt vejrdatasæt kontrolleres altid direkte, fordi begge kan bevæge sig efter dette checkpoint.
- Den Git-ignorerede 12-vinduescache er genafspillet uden private payloads i Git. Kandidatens eksakte komponenter, bidrag og fysiske gate rekonstruerer 1.460/1.460 scorer.
- På den foretrukne `G-50-50-NO-DIRECT-WIND`-variant har 219/730 waders-evalueringer jagtbarhed under 35; 7 af dem har mindst 55 point. Det kanoniske højenergiforløb er jagtbarhed 0 og score 79.
- Forskningsanbefalingen er én RavScore som ravpotentiale plus en tydelig separat metodestatus. En utilgængelig waders-metode må ikke anbefales, sikkerhed forbliver uafhængig, og ingen skjult koefficient er tilladt. Offentlig kobling afventer ejerbeslutning.
- I 332 af 872 tydeligt retningsbestemte contexts modvirker historikken den aktuelle retning; i 100 påvirker det den afrundede score. Pilen betyder fortsat strøm nu, mens historikken skal forklares særskilt.
- National dynamisk scoreinputcoverage var og er utilstrækkelig: 243/673 scorede dele. Den samtidige mangel på lokale retentionfeatures er efterfølgende klassificeret som diagnostik, ikke gate, af DEC-0052. Parentzonens morfologi må fortsat ikke arves.
- Aktiv score 25/40/35, offentlig UI, geometri, land-/vandpunkter, DMI/fallback, central admin og beskyttede data er uændrede. Kandidat G er ikke aktiveret.
- Fuld 210/673-browseraudit gentages ikke for dette checkpoint, fordi offentlig score, UI-adfærd og offentlig datakontrakt er uændrede; målrettet live metadata- og 673/673-kontrol er grøn.

## Copernicus-pilot #72 - fortsat sund 168-timersopsamling

- Readiness-skip `#32347036227` udløste automatisk `#32347060320`/artifact `copernicus-current-pilot-72` mod den centralt godkendte bestand på 673 dele.
- Den private cache har 46 eksakte timetidspunkter fra 2026-08-18 11:00Z til 2026-08-20 08:00Z, 28.934 observationer, 625 unikke mål og 629 mål/kilde-par.
- Baltic dækker 552/567 berettigede mål og AMM15 77/125. Summen er større end 625, fordi fire mål har evidens fra begge kilder.
- Der er nul ustabile mål/kilde-par for både gitterpunkt og lag. Interpolation, scorepåvirkning og offentlig runtime er fortsat slået fra, og supportgaten afviste secret- eller råvektorlæk.
- Syvdøgnskravet er endnu ikke opfyldt; der mangler fortsat naturlig vækst fra 46 til et fuldt 168-timersvindue.

## 4.0.238 er merged, produktionsverificeret og browserverificeret

- PR #1 blev merged med ejerens godkendelse som `b8844841d036925057a1f768c4392940f6117ad7`.
- Push-kørsel `#32344813967` bestod frisk central adminhydrering, DMI, fuld `validate`, releasegate, supportartifact, Supabase, Pages-artifact og deploy. Live datasæt er `rr-20260820074127-210` med 210 zoner.
- Support `RavRadar-support-3252` viser, at alle seks tidligere #3246-bølgehuller nu har 118 timer uden ændret DMI-first-kildeorden. Feggesund er fortsat det ene reelle bølge-missing.
- Historikrettelsen virker i produktion: de 198 verificerbare zoner har op til 56 verificerede prøver over 39,594 timer mod den tidligere lås på 22,563 timer. De 12 reelle `NO_SHARED_MARINE_GRID_POINT`-huller er fortsat `missing`.
- Browser-pluginet åbnede live 4.0.238. Den godkendte Playwright-fallback kontrollerede derefter 210 zoner, 673 dele, 420 aktuelle paneler og 2.100 femdøgnsvalg med nul fejl i score, label, farve, pile, tre komponenter, forklaring, lokal kontekst, debug og seks vejrmetrikker. Mobil 390 x 844 og desktop 1440 x 900 har ingen overflow eller funktionsfejl.
- Den fulde produktionskæde er bevist, men det særskilt krævede naturlige build over en UTC-grænse er endnu ikke observeret. `#32347036227` viste korrekt fail-closed skip uden artifact, da time 08 ikke var komplet; pilot #72 gjorde derefter timen klar.
- Ingen punkter, geometri, U/V, kildeorden, afstandsgrænser eller RavScore er ændret.

## Online DOM-/kliktest af live 4.0.238 - 2026-08-20

Live 4.0.238 er systematisk kontrolleret med Playwright mod datasæt `rr-20260820074127-210` efter grøn produktion `#32344813967`: 210 zoner, 673 kystdele, begge jagtformer, 420 aktuelle paneler og 2.100 femdøgnspaneler. Der er nul mismatch i score, label, farveniveau, vind-/strømpile, tre komponenter, forklaringer, lokal vinderkontekst, debug-ID og seks synlige vejrmetrikker samt nul console-, page- eller HTTP-fejl. Ingen produktionsdata eller geometri er ændret.

## P1-komponentcyklus efter 4.0.238

- #3252 introducerer ingen ny modelstart: HARMONIE er fortsat 2026-08-20 00Z, WAM 2026-08-19 18Z og DKSS 2026-08-19 12Z.
- Vindovergangens middel/p95 er 1,027/2,5 m/s og 37,957/128 grader; bølgeovergangene er uændrede fra #3246. De seks tidligere `missing->fallback`-bølgeovergange er væk uden ændret kildeorden.
- Resultatet tæller som stabil drift og historikvækst, ikke som en ny uafhængig DEC-0030-cyklus. Ingen permanent tærskel, fallback eller scoreændring er godkendt. Se `docs/research/P1_COMPONENT_CYCLE_AUDIT_4.0.238_20260820.md`.
- Det fulde 4.0.238-job tog 415 sekunder mod 475,5 sekunders median for de seks seneste fulde builds. Alle gates, Supabase og Pages kørte; korrekt readiness-skip uden artifact er ikke medregnet som produktion. Se `docs/research/P1_PRODUCTION_DURATION_4.0.238_20260820.md`.

Den private Copernicus-shadow har ved pilot `#58` 37 gyldige timer, 23.273 poster, 625 maal og 629 maal/kilde-par med nul gitter-/lagustabilitet. Planlagt `#59` dubletskippede korrekt uden artifact. Syvdoegnsvinduet er fortsat uafsluttet og maales hoejst dagligt.

## 4.0.237 produktionsverificeret – én komplet aktuel time pr. lokal zone

- Den seneste systematiske metadataaudit skelner nu korrekt mellem to forskellige krav: 673/673 er verificeret strømproveniens for alle kystdele, mens den offentlige lokale sammenligning derudover skal bruge samme eksakte time for alle dele i den konkrete zone. Kravet er lokalt pr. zone, ikke én fælles national klokktime.
- I auditen før frigivelsen fandtes en komplet fælles række for begge jagtformer i alle 210 zoner. Det produktionsverificerede datasæt vælger selv nærmeste komplette række pr. zone; forskellige zoner kan derfor ligge på forskellige eksakte timer. Ingen ny strømkilde eller ejerbeslutning var nødvendig.
- Den hidtidige runtime valgte hver dels nærmeste gyldige record uafhængigt. 642/673 dele stod allerede på deres zones nærmeste komplette time, mens 31 stod på en anden nær-time. Frontenden valgte samtidig nærmeste zonerække, selv når den var `uncertain`, og faldt derfor unødigt tilbage til hovedzonen.
- 4.0.237 beregner og publicerer `currentReferenceAt` pr. zone. Delens `current`, score, vejr, forklaring, debug og `flowPoints` bindes til den eksakte fælles zonetime. Kortet viser kun en lokal pil, når delens post matcher denne reference, og pilcellen skal findes ved præcis samme tidspunkt.
- Offentlig startpakke, detaljepakke, manifest og frontend fører både `productionReferenceAt` og zonens `currentReferenceAt` uden at blande datasæt eller tider. Femdøgnsudvælgelsen er fortsat timeeksplicit og påvirkes ikke af current-defaulten.
- Målrettede regressioner består for progressiv runtime, 210 zoner, 673 dele, 2.100 femdøgnsvisninger, eksakte pile, DMI-bulk/forecast og Copernicus-livefletning. Commit `9c971bc1` og `#32264833170` bestod frisk 673/673, fuld `validate`, releasegate, Supabase og Pages.
- Direkte liveaudit af `rr-20260819143933-210` fandt 210/210 komplette zoner og 673/673 dele på deres respektive `currentReferenceAt`: 196 zoner bruger 15:00Z og 14 bruger 14:00Z. Fordelingen er 622 DMI, 39 Baltic, fire AMM15 og otte tilladte regionale proxyer. Start-/detailmanifestets hashes matcher, `controlled-live` er aktivt, og den offentlige historik er credentialfri med 168 timers retention.
- Ejeren har slettet RavRadar-jobbene i cron-job.org. GitHubs efterfølgende naturlige produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og pilot `#32273634626` er grønne. Live `rr-20260819155614-210` består 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdøgnsvalg og 673 pile ved præcis 673/673.
- Den private pilotcache fra `#32273634626` har 30 gyldige timer, 18.870 poster, 625 unikke mål og 629 mål/kilde-par med nul gitter-/lagustabilitet, `scoreImpact=false`, `publicRuntime=false` og 168 timers retention. Det naturlige fulde 168-timersvindue er fortsat åbent og kontrolleres højst dagligt.
- Den faktiske online DOM-/kliktest forsøges først med Browser-pluginet og målrettet diagnostik. Hvis der ikke findes en konkret reparationsvej, har ejeren godkendt Chromium/Playwright som fallback til alle 210 zoner og 673 dele. Kontrollen må ikke ændre ejerens punkter.
- Ejerens land-/vandpunkter, geometri, U/V, kildeorden, afstandsgrænser, RavScoreformel, rollback og 100 %-gate er uændrede. De fire beskyttede dirty datafiler må fortsat ikke stages.

## 4.0.236 produktionsverificeret – én planlagt produktion beholder sin godkendte UTC-time

- Den naturlige GitHub-schedule-kørsel `#32249924919`/`#3217` afdækkede et nyt, snævert løb over timeskiftet. Readiness-gaten godkendte den komplette 11:00-time kl. 11:59, men den tunge bygning fortsatte efter kl. 12 og valgte derfor 12:00. De 43 Copernicus-dele manglede på den nye time, så den uændrede 673/673-gate stoppede korrekt ved 630/673 før releasegate, Supabase og Pages.
- 4.0.236 lader `current-hour-readiness` eksportere den godkendte eksakte time og binder hele `build-and-prepare` til den samme `RAVRADAR_PRODUCTION_TARGET_HOUR`. Både live-pilotbygningen og `update-weather.mjs` bruger dermed én sammenhængende referencetime, selv når arbejdet krydser et timeskifte.
- Datasættets `generatedAt`, dataset-ID og sundhedsrapport bruger fortsat den virkelige byggetid. Den låste faglige time rapporteres særskilt som `productionReferenceAt`, så kvarterskørsler bevarer friskhed og unik identitet.
- Push og bevidst manuel release uden en planlagt readiness-time bruger fortsat den aktuelle tid. Eksisterende friskheds-, 673/673-, release-, Supabase- og Pages-gates er uændrede og forbliver fail-closed.
- Den nye regression simulerer godkendelse kl. 11 og bygning kl. 12:04, kræver fortsat 11:00, beviser normal nutid uden lås og afviser ikke-timeskarpe værdier.
- Commit `668a1cdd` er på `main`. Den normale ikke-tvungne produktion `#32253251841`/`#3219` eksporterede 12:00 fra readiness, bar samme time gennem hele bygningen og bestod frisk 673/673, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy.
- Live version 4.0.236/datasæt `rr-20260819123607-210` er direkte metadata-verificeret: virkelig byggetid 12:36, `productionReferenceAt=12:00`, 210 zoner og præcis 673/673 dele. Fordelingen er 622 almindelige DMI-dele, 39 Baltic, fire AMM15 og de otte godkendte `dkss_lf`-proxyer. Alle 673 strømprovenienser er `verified`, alle 673 bruger `Godkendt land-/havpunkt for kystdelen`, `controlled-live` er aktivt og `credentialsIncluded=false`.
- Manuel pilot `#32257195240`/`#42` udvidede efterfølgende den private cache til 27 gyldige timer, 625 mål og 629 mål/kilde-par med nul gitter-/lagustabilitet, `scoreImpact=false` og `publicRuntime=false`. Normal `#32257480030`/`#3220` bestod derefter samme fulde kæde ved 13:00. Live `rr-20260819132304-210` har 210 zoner, præcis 673 forventede/scorede/verificerede dele, 622 DMI + 39 Baltic + fire AMM15 + otte tilladte proxyer og `productionReferenceAt=13:00`.
- De friske 12:00- og 13:00-datasæt afklarede 673/673-kildeproveniens; den særskilte zonevise tidslås er nu afsluttet i 4.0.237. Schedulerholdet er ophævet, ejeren har slettet cron-job.org-jobbene, og efter-deaktiveringsruns `#32272470720`, `#32272473716`, `#32272598725` og `#32273634626` er grønne.
- Ingen ejerpunkter, geometri, U/V, pilceller, score, kildeorden, afstandsgrænser eller rollback er ændret.

## 4.0.235 produktionsverificeret – én lokal del og ét tidspunkt i hele den offentlige visning

- Browseraudittens P1-rodårsag er rettet lokalt uden at ændre ejerens land-/vandpunkter: zonepanelet bygger nu score, tekst, debug og synlige vejrmetrikker fra samme lokale vinderdel og eksakte tidspunkt.
- Den nationale prognose og zonepanelets femdøgnsfaner bruger samme fælles lokale `selectLocalBestForDay`. Runtime bevarer for hver fælles time vinderdelens scorekomponenter, forklaringsårsager, kompakte transportforklaring og viste vejrdata.
- En lokal score uden lokal vejrpost låner ikke længere hovedzonens værdier. Ved ufuldstændig fælles lokal række bruges kun en tydeligt mærket hovedzonefallback, hvor score, tekst, debug og vejr kommer samlet fra hovedzonen, og ingen lokal del udpeges.
- Den nye syntetiske landsregression er grøn for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger. Den sammenligner vinder, tidspunkt, score, strøm-/vindretning, vandtemperatur, årsager og transportforklaring gennem offentlig startup-/detailfletning.
- Første centrale pushrun `#32248949564`/`#3215` stoppede fail-closed på fire workflow-User-Agents med den forrige version. Efter versionslukningen bestod `#32249770288`/`#3216` frisk central geometri, fuld `validate`, releasegate, præcis 673/673, Supabase, Pages-artifact og deploy.
- Det aktive datasæt `rr-20260819115558-210` er direkte metadata-, hash- og runtimeverificeret: 210 zoner, 673 dele, 622 DMI + 43 Copernicus + otte godkendte proxyer, `controlled-live`, 168 timers retention og `credentialsIncluded=false`.
- Den maskinelle liveaudit dækker 420 aktuelle zone-/jagtformvisninger og 2.100 femdøgnsvisninger. 400 aktuelle visninger er komplette lokale kontekster og 20 eksplicitte hovedzonefallbacks; femdøgnsvisningen har 1.956 lokale kontekster og 144 eksplicitte fallbacks. Identitet, tidspunkt, score, retninger, metrikker og forklaring hænger sammen i begge grene.
- Den faktiske DOM-/kliktest har været blokeret af Codex-browserpluginets manglende Chrome native-host-registrering og særskilte trusted-code-path-fejl. Det er et eksternt kontrolværktøjsproblem, ikke et modbevis mod datasæt eller runtime. Pluginet og målrettet diagnostik forsøges først; Chromium/Playwright er ejer-godkendt fallback. Se DEC-0044.
- Kystgeometri, centrale punkter, U/V, pilceller, scoreformel, kildeorden, afstandsgrænser, rollback og 673/673-gaten er uændrede.

## 4.0.234 produktionsverificeret – GitHub-plan og tabsfri Supabase-diagnostik

- Ejeren har besluttet, at GitHub Actions skal eje den normale 15-minuttersproduktion. Kandidaten kører ved UTC-minut 14/29/44/59, mens Copernicus-piloten ligger ved minut 6. Dette erstatter den tidligere aktive afhængighed af cron-job.org; ekstern cron slukkes først efter et naturligt GitHub-schedule-bevis.
- En planlagt kørsel uden eksakt aktuel Copernicus-time springer hele produktionsbygningen sikkert over. Heartbeatet dispatcher piloten, og næste kørsel prøver igen. Push/manual release og 673/673-gaten er ikke lempet.
- Så længe cron-job.org er aktivt under overgangen, er dets almindelige ikke-tvungne `workflow_dispatch` omfattet af samme timegate. Kun en bevidst manuel `force=true`-release og push går ubetinget videre til den fulde fail-closed kæde.
- Gentagne Supabase `57014` blev afgrænset til den meget store `runtime-diagnostics`-upsert. Kandidaten gemmer samme komplette JSON tabsfrit i et gzip/base64-arkiv med SHA-256 og byteantal. Den lokale repræsentative payload falder fra 4.014.169 til 208.874 byte; admin-download verificerer og genskaber originalen.
- Målrettede workflow-, heartbeat-, Supabase-, archive- og adminregressioner er grønne. Commit `7409d461` og pushrun `#32237507059`/`#3202` bestod derefter frisk central geometri, fuld `validate`, releasegate, præcis 673/673, den komprimerede Supabase-sync på otte sekunder, Pages-artifact og deploy. Overgangscommit `4ab7a659` bestod i pushrun `#32242510084`/`#3207` og eksterne gentagelser `#3208`/`#3209`. Det første nye naturlige GitHub-`schedule`-event `#32244914347`/`#3210` bestod current-hour-gate, fuld validering, releasegate, Supabase og Pages. Hel-timesdispatch `#32245473213`/`#3211` beviste derefter den sikre grønne udsættelse uden build, Supabase eller Pages, da aktuel time manglede. Ejeren har siden slettet cron-job.org-jobbene, og efterfølgende native kørsel uden ekstern dublet er grøn som dokumenteret øverst.
- Ingen centrale land-/vandpunkter, U/V-data, pile, score, kildeorden eller afstandsgrænser er ændret.

## Chromium-audit 2026-08-18 – fund lokalt rettet i 4.0.235, livebevis afventer

- Audit af 210 zoner og 673 kystdele bekræfter, at ejerens land-/vandpunkter er bevaret og faktisk bruges i den lokale scorekæde. Alle 673 har gyldig strømproveniens; kildefordelingen er 622 DMI, 43 Copernicus og otte godkendte regionalproxyer. U/V-retning, pilcelle, kildeklasse og afstand er konsistente. 4.0.233's ankerrettelse er derfor fortsat gyldig.
- Den direkte browser fandt en anden systemisk fejl: den lokale vinder, RavScore, tekst og debug bygges fra vinderdelen, men det synlige aktuelle vejrkort bygges fortsat fra hovedzonens `condition.current`. Blandt 414 sammenlignelige zone-/jagtformvisninger afveg strømretningen i 371, strømstyrken i 324 og vandtemperaturen i 414. Blåvand viste lokal NV 315° i debug, men N 11° i det synlige strømkort.
- Femdøgnsfanerne bruger hovedzonens generiske dagsvalg i stedet for den nationale prognoses lokale `bestForDay`. Af 1.964 sammenlignelige faner afveg score i 1.660 og bedste tidspunkt i 897. Dette kan også give hovedzonetekster som `Nord for fyret`/`Syd for fyret`, selv om den lokale kystdel har et andet præcist navn.
- Datasættet `rr-20260818201755-210` havde samlet 673/673-proveniens, men den fælles aktuelle 20:00-række var ufuldstændig i tre Limfjordszoner (`DK-B05-12`, `DK-B05-17`, `DK-B05-18`). Samlet artifactdækning er derfor ikke i sig selv bevis for 673/673 ved præcis samme aktuelle time.
- 4.0.235 samler nu kort, vinder, score, tekst, debug og metrikker om samme lokale del og tidspunkt og mærker fallback eksplicit. Ingen punkter, kilder, scoreformel eller 100 %-gate er ændret. Central produktion og direkte livebrowser afventer.

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

## 4.0.227 – lokal kystvinkel er en advarsel, ikke en ejerblokering…16053 tokens truncated… samt forkastelsen af de to fejlagtige præcisionsforslag. Den er ikke i sig selv en produktions- eller scoreaktivering.
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

## Privat besøgsrapport – implementeret og produktionsverificeret i 4.0.215
- Den offentlige side registrerer dataminimeret én sidevisning og højst ét browserbesøg pr. browserfane og dansk kalenderdag; statistikken vises kun i den adgangsbeskyttede adminrapport.
- Supabase gemmer kun daglige totaler uden rå IP-adresser, præcis lokalitet, fingerprint eller stabil besøgsidentitet. Browserbesøg kaldes ikke unikke personer, statistikfejl blokerer aldrig siden, og funktionen påvirker ikke RavScore.
- Produktion `31876816700` og direkte efterkontrol beviste Supabase-adgangskontrakten, Pages 4.0.215 og rapportens sidevisninger, browserbesøg samt oprettede/aktive konti.

## Næste aktive roadmaptrin
- Følg Candidate G's naturlige memoryopbygning dataminimeret som driftsevidens. Det er ikke en ny implementerings- eller aktiveringsgate, og den samme model fortsætter, når vinduet bliver komplet.
- Repræsentative ture med fund, reelle nul-fund, søgeindsats og hold-out bruges senere til efterkalibrering; de ændrer ikke automatisk den aktive model.
- Den gradvise manuelle ejerkontrol af eksisterende land-/vandpunktpar og øvrige uafhængige drifts-/forskningspunkter fortsætter kun efter den prioriterede liste i `ACTIVE_ROADMAP.md`; Candidate G-aktiveringen må ikke genåbnes af gamle afkrydsningsfelter.
- Supabase-egress følges fortsat gennem en faktisk billingperiode. Estimatorer er ikke billingbevis.

Denne fil er første opslag ved en ny chat. Den aktuelle sandhed står øverst og ved de nyeste emneafsnit; ældre versionsafsnit bevares som revisionsspor og må aldrig tilsidesætte en nyere, udtrykkeligt markeret status.

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
# 4.0.237 – ny DEC-0030-komponentmaaling

- Naturlig produktion `#3242` voksede den kompatible raa historik til 64 proever/30,903 timer, men de nye timeskarpe proever blev falsk ikke-verificerede. `productionReferenceAt` var 23:00, mens efterberigelsen matchede den senere `generatedAt` 23:52. Kandidaten bruger nu den gemte timeskarpe reference med fallback for aeldre dokumenter; frisk central produktion mangler.
- Isoleret replay af rettelsen paa hele `#3242`-artifactet giver 56 verificerede proever i 197 zoner, 50 i en zone og 30,903 timers verificeret spaend i alle 198 verificerede zoner. De samme 12 parent-zonehuller forbliver nul; ingen fortid er bagudfyldt.
- Supportartifactet fra naturlig produktion `#3237`/`rr-20260819213342-210` giver nye uafhaengige WAM 18Z- og DKSS 12Z-beviser; HARMONIE 12Z er kun delvist indfaset.
- Naturlig `#3242` tilfoejer en ny WAM 2026-08-19 18Z-cyklus. De 15 korte Limfjordsserier vokser fra 97 til 115 boelgetimer; hoejde-/retnings-/periodeovergange er 0,109/0,44, 20,07/100 og 0,353/1,3 (middel/P95). Feggesund forbliver korrekt `missing`.
- Komponentovergangene varierer fortsat efter felt, retning og modelindfasning. Stroemmens 198 haleovergange er `dmi -> missing` uden konstrueret tal. Der laases ingen permanent graense og aendres ingen score eller kilde.
- Alle 210 zoners kompatible `controlled-live`-historik starter ved 4.0.232-aktiveringen og spaender 28,903 timer. Aeldre parent-zonehistorik er ikke kompatibelt lokalt stroembevis og bagudfyldes ikke. 72-timers-exitkriteriet er aabent. Se `docs/research/P1_COMPONENT_TRANSITIONS_4.0.237_RUN3237.md`.

## 2026-08-20 - 4.0.238 naturligt timeskifte og mergeautoritet
- Schedule `#32351140886` er det krævede naturlige P0.3-bevis: frisk datasæt `rr-20260820085852-210`, begge fulde gates, Supabase og Pages bestod uden manuel omgåelse.
- Den efterfølgende onlinekontrol gennemgik 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger med nul fejl i score, label, farve, pile, forklaringer, vejrtal, komponenter, kontekst, konsol, side eller HTTP.
- P0.3 og den låste Open-Meteo-times issue er lukket. P1's naturlige 72/168-timersobservationer og uafhængige modelcyklusser er fortsat åbne.
- Codex må permanent merge egne RavRadar-PR'er efter fuld systemisk verifikation og datasikker PR-kontrol; grøn topstatus alene er ikke tilstrækkelig ved modstridende evidens.

## 2026-08-20 - post-merge produktion og P1 #3256
- Mergecommit `e1f835a3` er produktionsverificeret i `#32354210495`: support `RavRadar-support-3256`, datasæt `rr-20260820093508-210`, fuld validering, releasegate, Supabase, Pages og komplet browserkontrol bestod.
- `samples72h` er 70 rå prøver og 41,489 timers spænd i alle 210 zoner. 198 geografisk verificerbare zoner har verificeret spænd 41,489 timer; de 12 kendte parenthuller har nul verificerede prøver. Alle 210 er under 72-timerskravet.
- Supplementhistorikken har 45 unikke validtider over 45 timer for 633 dele. Shadow-cachen har cirka 104 timers capture-spænd og har besøgt alle 673 dele; 168-timerskravet er åbent.
- HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z er fortsat nyeste modelstarter. Overgangsmålene er uændrede, Feggesund er wave-missing, og ingen permanent grænse er godkendt.
- Produktionstiden var 410 sekunder; syv fulde builds har median 473 sekunder med uændrede gates.
- Node 20-deprecation har en lokal kandidat med officielle Node 24-majorer i ni workflows. Gates og betingelser er uændrede; PR-CI og frisk produktion mangler.

## Aktuel workflow-sandhed, 2026-08-20
- main indeholder Action-opgraderingen fra PR #3, men den første push-produktion blev stoppet før deploy af gamle versionsforventninger i fem regressionstests.
- Den offentlige side er derfor fortsat den senest verificerede 4.0.238-dataset fra før PR #3; merge-commit 4c6b7e3a er endnu ikke produktionsverificeret.
- Reparationskandidaten gør PR-gaten i stand til at opdage denne klasse af fejl før merge og ændrer ikke produktdata eller modeladfærd.
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

## P1-drift efter produktion #3261
- Datasæt `rr-20260820105744-210` har 72 rå prøver over 42,866 timer i alle 210 zoner. 198 zoner har samme verificerede spænd; 12 kendte parenthuller har fortsat nul verificerede prøver.
- Shadow-cachen spænder cirka 105,3 timer og har besøgt alle 673 dele. Den kontrollerede livepilot dækker 673/673 med 622 lokal DMI, 43 lokal Copernicus og otte godkendte regionale proxyer.
- Pilothistorikkens globale validtidsinterval er 57 timer og er ikke et 168-timers driftsbevis. Hverken 72- eller 168-timerskravet er nået.
- Der er ingen ny uafhængig HARMONIE-, WAM- eller DKSS-modelstart. Ingen kilde, fallback, score, tærskel eller geometri ændres. Se `docs/research/P1_DRIFT_CHECKPOINT_4.0.238_RUN3261.md`.
## Lokal kildekontrol på Windows
+- `scripts/validate-source.ps1` sender nu Python-afhængighedskontrollen som ét portabelt argument med citater, der bevares af både Windows PowerShell og PowerShell 7.
+- Den centrale workflowkontrakttest afviser den tidligere ikke-portable form. Produktionskode, data og releasegates er uændrede.
## Produktion og P1 efter PR #8
+- Merge `6d63ac3a` er produktionsverificeret i `#32363403425`; fuld validering, releasegate, Supabase, Pages og deploy bestod. Build-and-prepare tog 336 sekunder.
+- Support `RavRadar-support-3263` og det deployede `rr-20260820112436-210` matcher byte for byte. Browserkontrollen bestod 210 zoner, 673 dele, 420 aktuelle og 2.100 prognosevisninger med nul fejl.
+- P1-historikken er 73 rå prøver/43,31 timer i alle zoner og samme verificerede spænd i 198 zoner. De 12 parenthuller står ved nul; shadow-cachen spænder cirka 105,75 timer.
+- Ingen ny DMI-collection blev hentet. Der ændres ingen kilde, fallback, score, tærskel eller geometri.
+- En gentaget GitHub exit-2-annotation på det grønne fulde valideringstrin findes også i #3259/#3261; ingen fejlet deltest eller gate blev fundet.
## RavScore-forskning fase A-B
+- DEC-0029 er igangsat score-neutralt, fordi P1's næste 72/168-timersbevis afventer naturlig tid.
+- Den aktive score kommer fra `js/core/score-engine.js`, ikke den historiske rodprototype `ravscore.js`. Fra 4.0.242 er de foreløbige produktionsvægte 25 % jagtbarhed, 40 % transport og 35 % mobilisering/tilgængelighed efter DEC-0041.
+- Kodeauditen finder uvaliderede numeriske tærskler og mulig dobbelt-tælling af vind, bølger, strøm, alignment og kysttags. Bølgeretning/-periode og shadow-state findes, men påvirker ikke aktiv score direkte.
+- Første primærkilder støtter den overordnede kæde stormerosion -> transport -> aflejring, men ingen leverer klasse A-bevis for RavRadars tærskler eller vægte.
+- Ingen produktionskode, score, datakilde, fallback eller geometri er ændret. Se `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md`.
## RavScore fase C - syntetisk følsomhed
+- En permanent score-neutral audit finder 40 scoreændrende rækker blandt 54 aktive tærskelrækker.
+- Største lokale spring er -18 ved waders-vind over 6 m/s, -12 ved strandvind over 13 m/s og +10-11 ved strøm 0,15 m/s.
+- Strømstyrke/-retning påvirker både transport og mobilisering; kombinationen flytter slutscoren 32 point i basisscenariet. Det syntetiske transport-/mobiliseringsoverlap er 0,402.
+- Missing-adfærden er asymmetrisk: vind er hard gate, bølgefravær koster 2-3 baselinepoint, og strømfravær koster 19-20 plus loft.
+- Resultaterne beskriver kode, ikke ravfund. Ingen tærskel, vægt, score, kilde eller geometri er ændret.
## RavScore fase C produktionsverificeret
+- Merge `e85de36d` bestod produktion `#32366326503` med den nye score-neutrale self-test, fuld validering, releasegate, Supabase og Pages. Build-and-prepare tog 327 sekunder.
+- Support `RavRadar-support-3265` og live `rr-20260820115954-210` matcher byte for byte.
+- Browserkontrollen bestod 210 zoner, 673 dele, 420 aktuelle og 2.100 prognosevisninger med nul fejl. Aktiv scorekode og scoreadfærd er ikke ændret af fase C.
+- Samme artifact har 74 rå prøver/43,90 timer og samme verificerede spænd i 198 zoner; 12 parenthuller står ved nul. Shadow-cachen spænder cirka 106,34 timer.
## RavScore phase D truth - 2026-08-20
- The active RavScore implementation remains unchanged.
- Synthetic sensitivity evidence is not accepted as calibration evidence.
- Three candidate directions are defined as shadow-only: smoothed baseline, process-separated model, and uncertainty-aware process model.
- Production activation requires real find/no-find observations, temporal and geographic holdout evaluation, a new explicit RDKS decision, and full relevant release validation.

## 4.0.239 observation safety truth - 2026-08-20
- Trip GPS remains available locally for the existing trip feature, but remote serialization replaces it with `null`, including retries from an older outbox.
- The existing observation analysis now reports coverage only. It emits no actionable model suggestion and cannot create a new score patch from the former 12-row/four-per-outcome heuristic.
- Active RavScore and existing local adaptive-model versions are unchanged.
- Historical central rows have not been inspected or destructively modified; older rows may still require a separately approved GPS cleanup migration.

## Produktionsverificeret fase D-sikkerhed og hurtigere gates - 2026-08-20
- RavRadar 4.0.239 er produktionsverificeret på main-commit `b1d0e422a3322d393a7eeb32d5af4837cd6a779f` via run `32374202688`.
- Fjernobservationer indeholder ikke præcis tur-GPS. Lokal GPS bevares kun lokalt, også når en ældre outbox-post genforsøges.
- Observationer måler kun datadækning. Automatisk scorekalibrering og scoreforslag er låst, indtil fase D-gaten er dokumenteret og særskilt godkendt.
- Den fulde produktionsgate verificerede 673/673 kystdele med kilde-, tids-, gitter-, pil-, score- og forklaringskonsistens. Ingen land-/vandpunkter blev flyttet.
- En hurtig `validate:source`-gate kører nu før den dyre DMI-opdatering. Den fulde data- og releasevalidering efter friske data er uændret.
- Produktionen gendanner Copernicus-cachen både før og efter DMI-opdateringen, så en privat pilot, der afsluttes under DMI-arbejdet, kan bruges samme kørsel.
- Den fulde online browseraudit af 210 zoner og 673 kystdele køres ugentligt eller ved relevante score-, UI- eller datakontraktændringer, ikke ved enhver dokumentations- eller workflowændring.

## Tidskorrekt strømdækning - produktionsbevis 2026-08-20
- PR #18 skelner nu mellem bevaret syvdageshistorik og en verificeret strømpost, der kan bruges i den aktuelle runtime-tidslinje. Historik slettes ikke, og strømvalg/RavScore er uændret.
- En push-produktion, der krydsede 13→14 UTC uden target-hour, rapporterede korrekt 630/673 scoreklare dele og blev stoppet før deploy i run `32377002921`.
- PR #19 låser nu alle normale produktionsbyg til readiness-jobbets starttime. Kun timed schedule/ikke-forceret dispatch kan fortsat udsættes ved manglende current-hour-cache.
- Main-commit `c73a10d32f2aab15c63787ecb71893fd9275bbf6` er produktionsverificeret i run `32379229853`: target hour 14:00, 673/673 scoreklare dele, 673/673 streng strømaudit og grøn Pages-deployment.

## Observationsprivacy i databasen - forberedt 2026-08-20
- Browserens fjernpayload sender allerede `gps: null` og afviser lokationsfelter i observationsflowet.
- Supabase-skema og migration `20260820_observation_remote_privacy.sql` forbereder en server-side check samt skærpede anon/authenticated insert-policies, der afviser ny præcis lokation i `gps` og kendte lokationsnøgler i `weather_snapshot`.
- Checken er `NOT VALID`: den håndhæves for nye/ændrede rækker uden at scanne, ændre eller slette historiske observationer.
- Migrationen er ikke produktionsaktiv, før den er kørt kontrolleret mod den centrale database og både tilladt GPS-null insert og afvist GPS-insert er verificeret.
- Historisk central GPS må fortsat ikke slettes uden udtrykkelig ejergodkendelse.

## 4.0.240 jagtbarhed og sikkerhed - source

- Jagtbarhed forklares som praktisk søgemulighed og ikke som en sikkerhedsgodkendelse.
- Aktuel visning og fem-døgnsvisning har samme særskilte sikkerhedsnote.
- RavScore, pile, vægte, tærskler, data og geometri er uændrede.
- 4.0.240 er merged i PR #23 og produktionsverificeret på mergecommit 961beab1. Frisk produktionsvalidering og release-gate bestod, den deployede kilde indeholder begge nye tekster, og den systematiske onlineaudit bestod 210 zoner, 673 kystdele, 420 aktuelle visninger og 2100 femdøgnsvisninger uden fejl.

## 4.0.241 aktiv bølgeprior - source

- Bølgehøjde, periode og retning kan nu justere transportkomponenten efter DEC-0040.
- Justeringen er begrænset til plus/minus 12 transportpoint og sker før eksisterende fralandsstrømlofter.
- Manglende bølgeinput eller lokal pålandsretning giver nul effekt.
- Vægte, øvrige tærskler, pilekonventioner, data og geometri er uændrede.
- Syntetisk audit holdt transport inden for plus/minus 12 og samlet score inden for plus/minus 5. National public-audit gav minus 1 til plus 1, ingen farveskift og sikker fallback ved én manglende periode. PR #25 er merged som `eb66b280`. Produktion `#32405699346` bestod frisk data, fuld validering, release-gate, Supabase, Pages-build og deploy; direkte Pages-kontrol viser 4.0.241 og den aktive bølgejustering. Onlineaudit på `rr-20260820185733-210` bestod 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden fejl.

## Foreløbige produktionsvægte - 4.0.242 source

- DEC-0041 ændrer isoleret den aktive vægtning til 25 % jagtbarhed, 40 % transport og 35 % mobilisering/tilgængelighed.
- Vægtene er en forskningsbaseret prior før turdata, ikke en endelig kalibrering. Revurdering kræver senere fund og reelle nul-fund.
- Komponentregler, tærskler, scoregrænser, bølgeprior, pile, data, geometri og land-/vandpunkter er uændrede.
- Bølgepriorens tidligere kolliderende ID er rettet til DEC-0040; kystgeometri er fortsat DEC-0032.

- National vægtaudit på rr-20260820204808-210 dækker 673 kystdele og 42.846 scoreposter. De 420 viste zone-/jagtformsvisninger falder i gennemsnit 6,314 point; 7 skifter vindende del, og 110 krydser referencegrænserne 35/55/75. Det dokumenterer en reel reduktion af jagtbarhedsdominans, ikke en fundkalibrering.
## Produktionsverificering af 4.0.242 (2026-08-21)

- Den aktive foreløbige RavScore-vægtning er 25 % jagtbarhed, 40 % transport og 35 % mobilisering.
- PR #28 er merged som `4f3481f272de11554fb64ad602555804f362b715`.
- Produktionsworkflow `32421188352` bestod frisk datagenerering, fuld validering, release-gate, Supabase og Pages-deploy.
- Den fulde onlinekontrol bestod 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger uden fejl.
- En supplerende kontrol bestod alle 7.560 viste vægt- og bidragsforklaringer samt mobilvisning ved 390 x 844.
- Tidligere status om afventende 4.0.242-produktionskontrol er dermed erstattet. Se `docs/research/RAVSCORE_PROVISIONAL_WEIGHTS_4.0.242_PRODUCTION_AUDIT.md`.
## RavScore fase D observeret checkpoint, 2026-08-21

- Den reproducerbare score-neutrale audit dækker 41.116 produktionsposter og 1.346 aktuelle kystdel-/jagtformposter fra `rr-20260820220004-210`.
- Zonevinderen ligger gennemsnitligt 6,67 point over alle aktuelle kystdele; kalibrering kræver derfor faktisk kystdel.
- Aktuel strandjagtbarhed er 75 i alle 673 dele. Transport og mobilisering korrelerer 0,69-0,74 og kræver senere kontrolleret overlapstest.
- Ingen god aktuel zonevinder har et fysisk led under 35. 25/40/35 forbliver den foreløbige produktionsprior.
- DEC-0042 gør hele ture med indsats og uforanderligt prognosesnapshot til kalibreringsenheden. Enkeltfund er ikke fit-bevis.
- Kalibreringslåsen er fortsat aktiv; ingen scoreadfærd er ændret.

## Kandidatsandhed 4.0.243 - komplette ture

4.0.242 er fortsat produktionssandhed. Branch codex/trip-evidence-contract-4.0.243 indeholder en lokalt verificeret v2-turkontrakt. Den bruger komplette ture, uforanderligt prognosegrundlag, søgeindsats og faktisk kystdel; individuelle fund er ikke kalibreringsenheden. RavScore og 25/40/35 er uændret. Supabase-migration, fulde gates, merge, exact-commit deploy og 210/673-browserkontrol mangler. Ingen land-/vandpunkter er flyttet.
## 2026-08-21 - Produktionsdatabase for turbevis v2

- De additive v2-kolonner, constraints og unikke indeks er anvendt på den tomme `public.observations`-tabel og verificeret gennem både database-metadata og offentlig nul-rækkers PostgREST.
- Produktionstabellens legacy `id` og `zone_id` er numeriske. Klient-UUID og offentlige område-id'er gemmes derfor separat; ingen typecast eller historisk omskrivning anvendes.
- Observationernes RLS har nu særskilte stramme insert-politikker for anon og authenticated. Den tidligere permissive policy er fjernet, og præcis GPS/lokationsnøgler afvises server-side.
- Appversion 4.0.242 er fortsat aktiv. 4.0.243-koden er endnu ikke pushet/merget fra det lokale releasecheckpoint.
- Supabase-egressvarslet skyldes historisk forbrug. Seneste fulde dag var 64 MB mod tidligere cirka 700-1.500 MB pr. dag; nuværende niveau fremskrives under gratisgrænsen. Der bygges derfor ikke ny cachearkitektur uden ny evidens.

## 2026-08-21 - 4.0.243 er produktions- og browserverificeret

- PR #31 er merged som `2ded7943d3d90463ac5aa26b46fc23c77c937151`.
- Produktion `32455335962` bestod central adminhydrering, frisk vejr/current, fuld validering, releasegate, Supabase-synk, Pages-artifact og deploy.
- Liveversion 4.0.243 og datasæt `rr-20260821071436-210` blev kontrolleret med Browser-plugin først og derefter den godkendte fallback.
- Kontrollen dækkede 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger med nul model-, konsol-, side- eller HTTP-fejl.
- Ingen land-/vandpunkter eller koordinater blev flyttet; de to datafiler i PR'en ændrede kun versionsnummer.
- Den aktive score er fortsat 25/40/35. Næste retning følger DEC-0044; ingen ny scorekandidat er endnu godkendt.

## 2026-08-21 - Aftalt produkt- og forskningsretning

- Der bygges ravvinduer, hændelsesbaseret procesmodel, enkle lagdelte forklaringer, et omfattende læringsmodul og et internt forsknings-/regelregister.
- Der bygges ikke separat offentlig scoresikkerhed eller en funktion om forskel fra gårsdagens score.
- Gemte områder/varsler er udskudt mindst cirka et halvt år eller til en senere brugerdata-sektion.
- Gammel-mod-ny-scorekontrol skal være lokal og automatisk; ejer og Codex samarbejder om få vigtige afvigelser i almindeligt sprog. Ingen OpenAI API bygges ind i offentlig runtime.
- DMI forbliver førstevalg. Normal Copernicus-kørsel skal begrænses til godkendte DMI-huller; landsdækkende 673-kontrol er kun sjælden/manual forskning.

## 4.0.244-kandidat: Copernicus kun til DMI-huller
Den normale Copernicus-kørsel bygger sin målliste fra eksakt-timede lokale DMI-huller. Hele kysten kan kun vælges manuelt til sjælden forskning. DMI er fortsat førstevalg, de otte regionale DMI-proxyer ændres ikke, og ingen land- eller vandpunkter flyttes.

Den første 4.0.244-produktionskørsel stoppede korrekt ved 630/673 før release og deploy. Årsagen var, at en autoritativ DMI-hulliste først kan dannes efter den friske DMI-kørsel; den selvstændige pilot havde kun ældre deployet DMI-dækning og manglede den eksakte time. 4.0.245 flytter derfor den endelige måludvælgelse ind efter frisk DMI og henter kun disse mål før den uændrede fulde 673/673-gate. Den selvstændige pilot får samtidig seneste private DMI-cache og eksakt dispatch-time. Ingen score-, kildeprioritets-, proxy- eller koordinatregel ændres.

## 4.0.246-kandidat: lås til nærmeste verificerede DMI-strømtime

4.0.245 blev merged som `b461e7a5`, men den præcise produktion `32465245055` stoppede sikkert før livefletning, validering, release og deploy. Den låste 08:00-time fandtes i DMI-cachen for andre felter, men havde 0/673 lokale DMI-strømme; 09:00 havde 622/673. Målbyggeren afviste derfor korrekt en implicit landsdækkende Copernicus-kørsel.

4.0.246 må kun ved nul eksakt DMI-strømdækning vælge den bedst dækkede og derefter nærmeste verificerede DMI-strømtime inden for tre timer. Ved tidsmæssig lighed foretrækkes den fremtidige prognosetime. Den valgte time bindes samlet til målregister, Copernicus, livefletning, vejr, score og forklaring. Findes ingen nærliggende DMI-time, stopper produktionen fortsat. DMI-først, 673/673-gaten, proxyer, score og alle punkter er uændrede.

## 4.0.247 - omkostningsbevidst testmatrix

- 4.0.246 er produktionsverificeret via PR #36, merge c2e0d024, run 32467031990 og live version/datasæt med 210 zoner og 673 kystdele.
- DEC-0045 fjerner kun gentaget validate:source fra planlagte vejropdateringer på allerede kontrolleret main.
- Push/manuelle builds og exact-head PR-gaten bevarer kildekodekontrollen. Hvert nyt artifact kræver fortsat fuld validate og releasegate efter frisk DMI/Copernicus/proveniens.
- Browserkontrollen er ugentlig eller hændelsesstyret ved UI-, score- eller offentlig datakontraktændring.
- Ingen score, kildeprioritet, geometri eller land-/vandpunkter er ændret.

## 4.0.247 er produktionsverificeret

- PR #37 blev merged som 3dc331ca; exact-head-kildegaten og push-produktion 32468752244 er grønne.
- Push beholdt den tidlige kildekodegate. Frisk data, fuld validering, releasegate, Supabase, artifact og Pages bestod.
- Live datasæt rr-20260821094303-210 viser version 4.0.247, 210 zoner, 673 kystdele og reference 09:00Z.
- Den store browseraudit var ikke relevant, fordi workflowændringen ikke ændrede UI, score eller offentlig datakontrakt.

## 4.0.248 - automatisk RavScore-sammenligning

- DEC-0046 fastlægger stabile ID'er for gammel, nuværende og kandidat A-C.
- Gammel 40/35/25 sammenlignes direkte med aktiv 25/40/35 på samme offentlige scoreposter.
- A-C genbruger den eksisterende fysiske proceskandidat og 86.400 scenarier; en tynd read-only rapport udvælger de vigtigste forskelle.
- Kandidaterne er diagnostic-only og kan ikke ændre produktionsscore, forklaring, pile eller data.
- Ingen geometri eller land-/vandpunkter er ændret.

## v4.0.248-kandidatgennemgang (2026-08-21)

Den automatiske ejeroversigt og den faglige gennemgang er nu genereret. Dette afsnit erstatter tidligere status om, at rapporten manglede. Konklusionen er at beholde den aktive vaegtning 25/40/35 og ikke aktivere A, B eller C samlet. A er for volatil, B skal skelne levering fra passage, og C er en mulig mild fysisk gate, men der er kun 3 af 1.346 aktuelle kystdele med mindst middel score og et tydeligt svagt fysisk led. Naeste trin er derfor score-neutral intern skyggekoersel og maalrettet retningskontrol, ikke en offentlig scoreaendring. Se `docs/research/RAVSCORE_CANDIDATE_REVIEW_2026-08-21.md`.

## v4.0.249: privat RavScore-kandidat-shadow

Den eksisterende private nationale shadow-validator beregner nu A, B og C på samme lokale context som den aktive score. Den bruger 24 timers hændelseshistorik og 72 timers strømforløb, opdeler kandidat B i strøm mod, langs og væk fra kysten og gemmer kun dataminimerede forskelle. Den aktive vægtning 25/40/35, offentlig score, UI, vejrsampling, admin-data og geometri ændres ikke. Koden er målrettet selftestet; næste evidens er én virkelig privat national shadow-kørsel efter merge. Se DEC-0047 og `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`.

## Aktuel sandhed i 4.0.250

+RavRadar har nu et separat privat, manuelt RavScore-shadow-job, som laeser de aktive 210 zoner og 673 kystdele uden at aendre dem. Jobbet bruger den eksisterende native DMI-kaede og kan læse centralt gemte aktive ekspertregler, men kan hverken skrive til central admin, deploye eller aktivere score. Den offentlige vaegtning er stadig 25/40/35. A/B/C er analysemodeller, ikke produktionsregler. GeoDanmark-koersel `32474884163` stoppede korrekt paa et forældet punktbevis; den gate er ikke omgaaet.

## Aktuel sandhed i 4.0.251

Foerste private aktive RavScore-shadowrun stoppede korrekt foer state og score, fordi DKSS-komponenter fra forskellige collections var blevet klassificeret som én komplet familie. 4.0.251 goer den tidlige gridgate lige saa streng som marinegaten: en komplet familie skal komme fra samme collection, og U/V skal fortsat dele punkt. Den offentlige score, fallback og alle aktive punkter er uændrede.

## Aktuel sandhed i 4.0.252

`direction-broad-19-v1` er produktionsverificeret i begge nationale top-5-lister. PR #52 bestod exact-head-gaten på `f23214c8` og blev merged som `ad70fbca`. Exact-commit-produktion `32515757957` bestod frisk DMI, fuld validering, releasegate, Supabase og Pages. Live datasæt `rr-20260821185936-210` viser 4.0.252 med 210 zoner og 673 kystdele. Den godkendte Playwright-fallback kontrollerede 420 aktuelle visninger og 2.100 femdøgnsvisninger med nul score-, forklarings-, konsol-, side- eller HTTP-fejl. Den viste RavScore, alle lokale kystdelsresultater, pile, forklaringer, geometri og land-/vandpunkter er uændrede.

## RavScore parret retning og naeste private kandidat, 2026-08-21

- Exact-commit-koersel `32521046654` paa `64ee7b7a` gennemfoerte 1.460 private, score-neutrale par over 12 historiske forloeb og fire omraader.
- Den aktive model gav naesten samme retningsforskel ved lav og hoej bevaegelseskapacitet: 30,450 mod 30,327 point. Retning er derfor for lidt koblet til faktisk styrke i den aktive transportberegning.
- Kandidat E/F voksede derimod tydeligt med kapaciteten. F afvises fortsat som direkte produktionskandidat paa grund af bred niveausaenkning og stor scorebaandsudskiftning; den tidligere uparrede retningsbegrundelse for afvisningen er erstattet.
- Kandidat G er naeste private arbejdshypotese: korrigeret procesmodel, kapacitetsstyret retning, historisk stroem-/vindhukommelse, ingen udokumenterede statiske kystbonusser og foreloebigt vaegtcentrum 20/45/35.
- En kort og svag vending skal kun aendre lidt; en vedvarende og kraftig vending skal aendre mere. Tidligere timers og dages nettoforloeb skal medregnes med aftagende vaegt.
- Den aktive offentlige RavScore 25/40/35, DMI-first, geometri og land-/vandpunkter er uændrede. Se DEC-0050.

## RavScore historikhukommelse - foerste resultat 2026-08-21

- Et nyt privat, score-neutralt vaerktoej har analyseret 12 eksisterende 96-timersforloeb med 6, 12, 24 og 48 timers hukommelse.
- Ved 24 timer aendrede en syntetisk svag modtime den opbyggede tilstand 3,796 procent, mens en dobbelt staerk vedvarende modretning brugte cirka 12 timer paa at vende nettofortegnet. Ved 48 timer var tallene 2,151 procent og cirka 16 timer.
- I 828 observerede stromtimer vendte ingen svag stroemepisode nettotilstanden. Ved 24 timer var der 36 modepisoder og 14 nettovendinger; episoder varede typisk seks timer.
- Vind og boelger viste samme hovedprincip: svage korte vendinger aendrede lidt og vendte ikke hukommelsen, mens staerke vedvarende episoder kunne.
- Naeste shortlist er et 24-timers aktivt regimespor og et 48-timers baggrundsspor. Blandingsandel og scorepoint er ikke valgt; stroem, boelger og vind skal foerst ablateres uden dobbeltregning.
- Aktiv RavScore 25/40/35 og offentlig runtime er uændret. Se DEC-0050 og `docs/research/RAVSCORE_REGIME_MEMORY_RESULT_2026-08-21.md`.

## RavScore regimehukommelse merged og produktionsverificeret

- PR #56 er merged som `cd229466`; exact-head-gate `32522938958` var groen.
- Exact-commit-produktion `32523092260` bestod readiness, frisk DMI, centrale admin-/punktkontrakter, fuld validate, releasegate, Supabase, Pages-artifact og deploy.
- GitHub deployment `6028771928` er `success` paa praecis mergecommittet. GitHub Pages viser fortsat 4.0.252 og serverer den nye, ubrugte forskningsmodulfil.
- Custom-domaenets DNS kunne ikke oploeses fra den lokale Windows-session; GitHubs officielle Pages-adresse var tilgaengelig. Der er ingen evidens for en RavRadar-regression.
- Ingen offentlig score-, UI-, data- eller geometrikontrakt er ændret; derfor var fuld browseraudit ikke relevant for dette delmaal.
- Naeste trin er den private 24/48-timers dobbeltsporsmatrix og separate ablationer. Se `docs/research/RAVSCORE_REGIME_MEMORY_PRODUCTION_CHECKPOINT_2026-08-21.md`.

## RavScore 24/48-matrix og ablation - 2026-08-22

- Den private, score-neutrale analyse på de samme 12 historiske forløb sammenligner 24 timer, 48 timer og tre blandinger uden fremtidslæk.
- 24- og 48-timerssporene er enige om fortegnet i 98-99 procent af timerne. 48 timer reducerer strømsporets fortegnsskift fra 14 til 10; de øvrige spor ændrer sig mindre.
- Næste replay afgrænses til 24 alene, 50/50 og 48 alene. 75/25 og 25/75 tilføjede ikke tydeligt særskilt adfærd og udgår af næste matrix.
- Samlet korrelation overvurderer dele af overlap på grund af forskelle mellem hændelser. Bølge/vind-overlap består dog inden for hændelser, og vindstressproxy giver ikke et mere uafhængigt direkte vindbidrag.
- Lineær vind er derfor konservativ hovedanalyse. Vindstress bevares som yderkant, og replay skal have en variant uden direkte vind.
- Aktiv RavScore 25/40/35, offentlig runtime, DMI-first, geometri og alle land-/vandpunkter er uændrede. Se `docs/research/RAVSCORE_HISTORY_TRACK_ABLATION_RESULT_2026-08-22.md`.

## RavScore kandidat G - aktuel forskningssandhed 2026-08-22

- Kandidat G er implementeret diagnostic-only med 24 timer, 50/50, 48 timer og en separat 50/50-variant uden direkte vind.
- 1.460 private replayevalueringer viser, at G 50/50 ligger 1,492 point under aktiv model i gennemsnit, men skifter referencebånd i 474 evalueringer. Det er en væsentlig modelændring, ikke en lille vægtjustering.
- Lav kapacitet dæmpes 3,405 point mod kandidat E, mens høj kapacitet løftes 0,876 point. Historik kan ikke skabe transport ved nul fysisk kapacitet.
- 24/48 adskiller sig kun 0,064 point absolut i gennemsnit. Direkte vind adskiller sig kun 0,086 point fra no-direct og er ikke begrundet som selvstændigt bidrag.
- Kanoniske scenarier afslører, at waders-jagtbarhed 0 kan sameksistere med G-score cirka 79. Det blokerer aktivering, indtil betydning og forklaring er besluttet eksplicit.
- Centralt hydreret shadow `32554012542` paa PR #59's eksakte head kontrollerede 673 aktive dele i 210 zoner. 243 dele gav 486 scorecontexts, 430 var eksplicit u-scorede, og ingen var blokeret.
- G 50/50 laa nationalt 5,50 point under aktiv model for strand og 3,74 for waders i gennemsnit. 24/48 og no-direct-wind var praktisk identiske; direkte vind flyttede højst ét point.
- Den centrale regelkaede havde nul aktive regler og nul matches. Retention-featurecoverage var samtidig nul, saa shadowen lukker kørselsgaten, men ikke coverage-, forklarings- eller aktiveringsgaten.
- Faglig anbefaling: behold offentlig 25/40/35; brug 50/50 uden direkte vind som næste beslutningsvariant; aktiver ikke G nu.
- Ingen offentlig score, UI, data, DMI/fallback, geometri eller land-/vandpunkter er ændret. Se `docs/research/RAVSCORE_CANDIDATE_G_DECISION_BASIS_2026-08-22.md`.

## PR #59 og produktionsverificeret shadowgate-rettelse 2026-08-22

- PR #59 bestod exact-head-kildegaten `32565767549` og blev merged som `6b1511e0e72e0b8327ad3668ccc7159701dc68ed`.
- Produktion `32565885534` hydrerede centrale data og frisk DMI, men stoppede korrekt før releasegate, artifact og deploy i den fulde validering.
- Årsagen var en for bred test, som forbød enhver forekomst af ordet `admin` i det private shadowjob. Jobbets nye centrale regelhydrering er derimod en eksplicit GET-læsning efterfulgt af lokal regelfilsgenerering.
- Den samme shadowtest manglede i `validate:source`, så PR-gaten kunne ikke opdage kontraktkonflikten. PR #60 tillader kun de to læsende hydreringstrin, forbyder konkrete skrive-/deployveje og føjer testen til kildegaten.
- PR #60 bestod exact-head-gaten `32566573875` på `a13e5387` og blev merged som `41e01e2d21d6579a7c9a7fac489e6609038341ea`.
- Exact-commit-produktion `32566631701` bestod frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy. Deployment `6035679906` er `success` på samme commit.
- Live 4.0.252 viser datasæt `rr-20260822100745-210` med 210 zoner og 673 kystdele; manifest, byteantal og SHA-256 for den offentlige startpakke matcher. Offentlig RavScore er fortsat 25/40/35. Candidate G, beskyttede data, geometri og land-/vandpunkter er uændrede.

