## 2026-08-25 – 4.0.277 fuldt produktionsverificeret

- Opfølgende PR #141 ændrede kun den forældede statiske dæknings-test, bestod exact-head `32817501003` på `128c71ce` og blev merged som `81e9b891`.
- Produktion `32817626537` bestod central hydrering, frisk vejr, 673/673 scoreklare dele, fuld validering, releasegate, artifact og Pages-deploy.
- Offentlig efterkontrol viser 673/673 Candidate G-states, 673 accepterede fortsættelser, nul resets og 12–45 timers naturlig historik. Candidate G 20/50/30 er eneste profil; rollbackprofilen er `null`, og legacyfallback er forbudt.
- 0/210 zoner var endnu aktive, fordi ingen lokal kæde havde nået 48 timer. Overvågningen følger naturlig modning; ingen kunstig historik, scoreændring, geometriændring eller punktændring er udført.

## 2026-08-25 – 4.0.277 exact-head grøn; forældet produktions-testkontrakt rettet

- PR #140 bestod exact-head `32816129342` på `35c8b7fb` og blev merged som `d3b4542f`.
- Produktion `32816237198` byggede syvdages strømhistorik, frisk vejr, proveniens og offentlig runtime grønt. Den fulde validering stoppede derefter før releasegate og deploy.
- Stoppet skyldtes kun, at `test-current-full-coverage-gate` stadig søgte efter det tidligere statiske feltnavn. Den udførte produktionsaudit brugte allerede den nye strenge 673-kontrakt.
- Testen kræver nu `verifiedScoreReadyParts = verifiedPartGridPoints + verifiedNativeCadenceHeldParts`. Dette lemper ikke kravet: alle 673 dele skal fortsat være eksakt verificerede eller have en dokumenteret, højst tre timer gammel native-cadence-tilstand.
- Scoremodel, stateberegning, vejr, zoner, geometri, land-/vandpunkter og central admin-data er urørte. Dette mellemtrin blev efterfølgende lukket af PR #141 og produktion `32817626537`, som dokumenteret ovenfor.

## 2026-08-25 – 4.0.277 årsagstro native tretimerskadence

- En naturlig mellemtime stoppede sikkert på 666/673. State var ikke tabt; en fremtidig regionalproxyprøve var fejlagtigt talt som aktuel readiness, mens den timeskarpe audit afviste den.
- Candidate G havde desuden skrevet timerne mellem de otte godkendte `dkss_lf`-proxyers ægte tretimersprøver som manglende evidens.
- 4.0.277 tillader kun disse otte dele at fastholde den seneste afledte transporttilstand i højst tre timer. Der tilføjes ingen bevægelse, evidens, U/V, hastighed, retning eller pil.
- Fremtidige prøver tæller aldrig. Næste ægte prøve integrerer faktisk tidsafstand; over tre timer og kontekstændringer stopper lokalt.
- Målrettede lokale regressioner er grønne. Exact-head og frisk produktionsbevis afventer. Score, zoner, geometri, punkter og central admin er urørte. Se DEC-0074.

## 2026-08-25 – 4.0.276 punktvis bevaring af Candidate G-strømhistorik

- Ejerens spørgsmål om de 48 timer udløste en dataminimeret kontrol af både kompakt Candidate G-state og den private brede Copernicus-cache.
- Den kompakte state var ikke tabt eller startet forfra: den dokumenterede kæde var cirka 36 timer ved den seneste kontrollerede reference.
- Den brede cache havde en gruppefejl. En ændret indsamlingsdelmængde eller ét flyttet punkt kunne erstatte en hel time eller fratage uændrede punkter deres samlingsbevis.
- 4.0.276 sender den fulde centrale identitetsliste, validerer den valgte delmængde eksakt, erstatter kun valgte punkter og genopbygger samlingsbeviset pr. time ud fra faktisk bevarede rækker.
- Et flyttet punkt mister kun sin egen ældre historik. Målrettede tests beviser, at et uændret søsterpunkt bevarer både samme times og ældre verificerede historik.
- Den ældre cache bruges ikke til kunstig recovery: kun 43 dele havde komplet kontinuitet til målreferencen, 621 var ufuldstændige, og otte manglede. Der opfindes ingen data.
- Candidate G 20/50/30, lokal fail-closed availability, scorefysik, offentlig kontrakt, geometri og land-/vandpunkter er uændrede.
- PR #138 bestod exact-head `32787344926` på `acb59cc6` og blev merged som `72913723`. Push-produktion `32787715986` bestod central hydrering, frisk vejr, fuld validering, releasegate, artifact og Pages.
- De naturlige produktioner `32788514636` og `32790639192` bestod efterfølgende samme kæde. Seneste dataminimerede livekontrol viser 673/673 accepterede states, nul resets og 6–39 timers lokale kæder. Det flyttede punkt modner alene; uændrede punkters historik er bevaret. Ingen zone havde endnu et ægte komplet 48-timersvindue.

## 2026-08-24 – 4.0.275 synkron håndbogs- og installationskilde

- PR #135 bestod exact-head `32775343561` og blev merged som `3a96c28d`. Produktion `32775444781` kom gennem central Candidate G-only-hydrering og den hurtige kildegate; den gamle scoremodel blev ikke genaktiveret.
- Den fulde validering stoppede før deploy, fordi repositoryets 154-kapitlers webhåndbog ikke var identisk med den statiske installationskopi. Workflowet havde ikke indlæst central ekspertdata i håndbogsfilen på dette tidspunkt; fejlen var reel kildedrift.
- 4.0.275 synkroniserer installationskopien og bevarer den fulde identitetskontrol. Samme kontrol køres nu også i exact-head `validate:source`, så fremtidig drift stopper før merge og vejrbygning.
- Den eksisterende beskyttede trevejsfletning af centralt godkendte ekspertændringer er uændret. Candidate G, vejr, zoner, geometri og punkter er urørte; geodatafilerne ændrer kun versionsfelt.
- PR #136 bestod exact-head `32778118765` på `8103143c018253861a154f9fce5b7d937572a166` og blev merged som `59ea4546f3505ed96d2512a9bf5c9925ff7dff2a`.
- Produktion `32778269487` bestod central hydrering, frisk vejr, fuld validering, releasegate, beskyttet adminsynkronisering, artifact og Pages. Live `rr-20260824211701-210` er 4.0.275 på 210 zoner og 673 kystdele.
- Det offentlige manifest bekræfter Candidate G-only, `rollbackProfileId: null`, forbud mod legacyfallback og lokal fail-closed availability. Ved kontrollen var 0/210 zoner aktive på grund af ufuldstændig sammenhængende 48-timers strømhistorik; admin viste alle berørte zone-/søgemådepar og almindelige årsager uden private data.

## 2026-08-24 – 4.0.274 central Candidate G-only-migration

- PR #134 bestod exact-head `32772324736` og blev merged som `10fd9896`, men mergeproduktionen `32772470050` stoppede sikkert før vejrbyg og deploy.
- Rodårsagen var central adminhydrering: et historisk centralt profildokument med 25/40/35-rollback overskrev den nye lokale Candidate G-only-kontrakt. Kildegaten afviste derefter den forbudte konfiguration. 4.0.273 blev ikke udgivet.
- 4.0.274 lader kun en central profil vinde, hvis den selv opfylder hele Candidate G-only-kontrakten og ikke er ældre. Et legacydokument kan ikke vinde på et kunstigt højere versionsnummer.
- Beskyttet persistence validerer kontrakten før skrivning og efter readback. Forside, informationspanel og Rav-assistent bruger kun lokal Candidate G; manglende evidens giver ingen erstatningsscore.
- Releasegaten kræver central Candidate G-only-migration og afviser offentlige legacyberegningsveje. Adminstatus viser alle aktive eller de konkrete lokale mangler, mens resten fortsætter.
- Geodatafilerne har kun versionsfelt 4.0.273 → 4.0.274; geometri og land-/vandpunkter er urørte.
- Målrettede tests er grønne. Ny exact-head, merge, frisk 210/673-produktion og livekontrol mangler.

## 2026-08-24 – 4.0.273 Candidate G-only godkendt og implementeret

- Ejeren forkastede den globale 25/40/35-reserve, fordi den ikke løser Candidate G's underliggende datagab og kan ændre hele landets scoremotor på grund af en lokal mangel.
- DEC-0072 gør Candidate G 20/50/30 til eneste offentlige profil. Et hul lukkes kun for den konkrete zone, søgemåde og tid; der lånes ingen legacy-, parent-, nabo- eller anden-timescore.
- Aktuelle og femdøgns-rangeringer udelader kun berørte scorer. Adminforsiden viser samlet aktivstatus og dataminimerede lokale årsager.
- Målrettede profil-, pipeline-, lands-, UI- og shadowtests er grønne. Exact-head, merge og frisk fuld produktion mangler.
- Geodatafilerne har kun versionsfelt 4.0.272 → 4.0.273; geometri og land-/vandpunkter er urørte.

## 2026-08-24 – 4.0.272 produktionslukket med normal scorevariation

- PR #132 blev merged som `392fea15`. Produktion `32761751284` bestod central hydrering, frisk vejr/state, fuld validering, releasegate og Pages-deploy og udgav `rr-20260824183620-210` som 4.0.272 på 210/673.
- Den målrettede offentlige kontrol viser aktuelle områdescorer 76, 74, 72, 72 og 71 samt femdøgnsscorer 86, 84, 83, 76 og 76 i faldende rækkefølge. Det tidligere landsdækkende 17/18-kollaps er væk.
- Recoveryen kopierede kun kompakt Candidate G-state. Scoreformel, vejrregler, zoner, geometri og land-/vandpunkter er uændrede; geodatafilerne ændrede kun versionsfeltet til 4.0.272.
- Én lokal `COASTAL_PART_CONTEXT_CHANGED` følger ejerens punktpar 2-flytning. Otte aktuelle missing-evidence-huller fandtes allerede i den sunde recoverykilde, så den globale profilgate viser midlertidigt den samlede 25/40/35-reserve. Der blandes ikke profiler og opfindes ingen strøm.

## 2026-08-24 – Candidate G-recovery bestod, ældre hydratorgate stoppede deploy

- PR #131 bestod exact-head-kildegaten og blev merged som `1bbb4cc2`.
- Produktion `32759180937` genkendte den dokumenterede nulstillede fortsættelseslinje, hentede den låste sunde 673-deles kilde og gennemførte state-only recovery grønt.
- Den fulde validering stoppede senere, fordi en ældre kontrakt fortsat søgte efter nul-argument-indgangen `active_zone_ids()`.
- Opfølgningen bevarer denne indgang som wrapper omkring den nye testbare rodvariant. Scoreformel, vejrdata, zoner, geometri og land-/vandpunkter er uændrede.

## 2026-08-24 – produktionsverificeret 4.0.271

- Samlet feltrettelse af Grundbog i ravjagt implementeret.
- Eksperthåndbog, RDKS, forskningsnotat, SQL-håndbogspayload og changelog synkroniseret.
- Rettelsen er score-neutral og ændrer ikke vejrdata eller geometri.
- PR #128 bestod exact-head `32742727246` på `f2026167` og blev merged som `a723ae8c`. Den første produktion `32743307402` stoppede korrekt før deploy, fordi det nye eksperthåndbogskapitel manglede den faste læsehjælp.
- PR #129 rettede kun læsehjælpen og den identiske Supabase-installationskopi, bestod exact-head `32745213320` på `5096d9aa` og blev merged som `499861e8`.
- Produktion `32745389504` bestod central hydrering, fuld validering, releasegate og Pages-deploy. Den offentlige version er 4.0.271, og de syv rettede grundbogspunkter er kontrolleret målrettet på den levende side.

## 2026-08-24 – før-lancering af ekspert, admin og synlig rangering

- PR #126 blev merged som `fda934ae`. Den eksakte mergeproduktion `32730674577` (#3522) bestod hele kæden og udgav Pages-artifact `9521472172` samt supportartifact `RavRadar-support-3522` (`9521463897`).
- Den seneste naturlige produktion blev kontrolleret dataminimeret: 210 zoner, 673 kystdele, 72 timers ægte tretimersprognose for alle 198 geografisk verificerbare zoner og tolv kendte ærlige marine huller.
- Supabase er sund i den aktuelle Free-planperiode med cirka 17 % database og 5 % egress; den forrige periodes egress-overskridelse overvåges frem mod 9. september.
- Admin- og ekspertfunktioner, rettigheder og den centrale håndbog bestod målrettede kontrakter. En falsk rød status for det femte centrale dokument er rettet. Deploysynkroniseringen trevejsfletter nu officielle håndbogsopdateringer med centralt godkendte ekspertændringer i stedet for at overskrive dem.
- Område- og femdøgnslister bevarer DEC-0049's fulde beskyttelse mod ekstra lotterilodder og viser nu den samme afrundede områdescore, som de sorterer efter. Den bedste kyststræknings almindelige RavScore vises fortsat i detaljen.
- Begge håndbøger, kodekapitel, scenarier, hypoteseregister, ekspertarbejdsplan, releasegate og Supabase-installationskopi er ajourført til aktiv Candidate G 20/50/30. Se DEC-0069 og før-lanceringsreviewet.
- PR #122 bestod exact-head `32721778498` på `a885bc5b` og blev merged som `abe10127`. Produktion `32721891349` stoppede sikkert før deploy, fordi en centralt ændret håndbog ved første migrering endnu ikke havde en lagret kildebaseline.
- PR #123 bestod exact-head `32724526697`, blev merged som `00f59456`, og produktion `32724616331` bestod alle kode-, data- og releasegates, men stoppede før deploy, fordi Pages ikke udgiver håndbogens kildefil.
- PR #124 bestod exact-head `32726897134`, blev merged som `fd7bc868`, og produktion `32727025187` bestod alle kode-, data- og releasegates, men stoppede sikkert før deploy ved hashkontrollen. Det afgrænser den sidste centralt synkroniserede 4.0.269-håndbog til commit `fc13fb5ab326d8824ca55235ac454ac230e3db3e` fra grøn produktion `32706573863`.
- Den endelige hotfix accepterer kun denne uforanderlige kilde som første baseline, når dens SHA-256 matcher det tidligere beskyttede manifest. PR #125 bestod exact-head `32728525467` på `3fe579ab`, blev merged som `7861079b`, og produktion `32728654553` bestod `source-update`, aktiv Candidate G-readback, alle gates, supportartifact og Pages.
- Den første gentagne liveaudit fandt én gammel auditlabel (`3-timers trend`) mod den korrekte offentlige tekst (`Vandstandsændring på 3 timer`). PR #126/exact-head `32730584569` rettede kun kontrollen. Gentaget 4.0.270-audit består 210/673, 420 aktuelle og 2.100 femdøgnsvisninger med nul kontrol-, konsol-, side- eller HTTP-fejl.
- 4.0.270 ændrer ikke scoremotor, farver, vejrdata, geometri eller land-/vandpunkter.

## 2026-08-24 – visuel scoregennemgang bliver til aktuelle forklaringer

- Ejerens gennemgang viste, at Candidate G's *Hvorfor denne score?* var generisk, at mobiliseringens bølgevirkning ikke var forklaret tydeligt, og at reserveprofilens lavt-og-stigende-vand-tekst var misvisende.
- 4.0.269 fører kun allerede offentlige, afledte værdier og tilstandsord ind i forklaringerne. Rå U/V, koordinater, private payloads og beskyttede data følger ikke med.
- Fundprognosen skjules på grund af et ikke-repræsentativt totursgrundlag. Observationer, én eksisterende lagring og intern læring bevares. Scorelofter og rå JSON skjules ligeledes uden logiksletning.
- Det tomme kortvalgsfelt fjernes, og kilde-/licensafsnittet opdateres til den faktiske DMI-, Copernicus-, dokumenterede fallback- og kortkæde.
- Den offentlige runtimekontrol viste Candidate G 20/50/30 på 210/673 efter den korte 25/40/35-reservevisning på ejerens billede. Den globale reserve bevares som fail-closed kontrakt; ingen blandet profil tillades.
- PR #120 bestod exact-head `32703138969` på `37de330c` og blev merged som `d745e0ba`. Produktion `32703271897` bestod central hydrering, frisk DMI/strøm, fuld validering, releasegate, artifact og Pages og udgav `rr-20260824080543-210` som 4.0.269 på 210/673.
- Den fulde offentlige browseraudit bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden kontrol-, konsol-, side- eller HTTP-fejl. Se DEC-0068.

## 2026-08-24 – grundbog, almindeligt sprog og en korrekt stoppet første produktion

- Læringsmodulet er omskrevet til en offentlig grundbog i ravjagt fra ravets egenskaber over mobilisering, transport, kyst og felttegn til strand-, vandkant-, waders- og UV-jagt. RavRadar forklares først bagefter.
- De centrale offentlige tekster er gennemgået og forenklet uden ændring af Candidate G, `20/50/30`, vejr, Supabase-kontrakt, geometri eller land-/vandpunkter.
- PR #116 bestod exact-head `32670857438` på `c810155b` og blev merged som `5a2f7796`.
- Første produktion `32670920742` stoppede før release/deploy, fordi den fulde validering fandt en ældre rangeringstest, der stadig krævede den erstattede tekniske hjælpetekst ordret.
- Den nye almindelige forklaring bevares. PR #117/exact-head `32671863965` rettede rangeringstesten og blev merged som `21acb0a2`.
- Produktion `32671924885` bekræftede rangeringstesten, men stoppede fortsat før deploy på en anden gammel ordret kontrakt: stateforklaringstesten krævede **Hvad skete før nu?** frem for **De seneste timers betydning**.
- Den anden kontrakt blev rettet og føjet til `validate:source`. Hele testsamlingen, der direkte læser de ændrede offentlige moduler, blev derefter kørt målrettet før næste PR.
- Den systemiske målretning kørte 29 direkte tests og fandt én yderligere historisk 4.0.240-sikkerhedstest, som ikke længere lå i en gate, men stadig krævede gentagne advarsler. Den historiske indgang følger nu 4.0.268-kontrakten, og hele gruppen er grøn.
- PR #118 bestod den samlede exact-head-kildegate `32672522334` på `8faccce3` og blev merged som `3c22e40b`.
- Frisk produktion `32672578127` bestod central hydrering, DMI/Copernicus, frisk vejr, fuld projektvalidering, releasegate, artifacts og Pages. Live `rr-20260823230848-210` er 4.0.268 på 210 zoner og 673 kystdele.
- Den fulde offentlige browseraudit bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden kontrol-, konsol-, side- eller HTTP-fejl. Leverancen er lukket; ingen score, vejrkontrakt, Supabase-kontrakt, geometri, land-/vandpunkter eller private data blev ændret.

## 2026-08-23 – skema og tom GPS-værdi blokerede turindberetninger

- Efter grøn 4.0.266-læsning viste ejerens genprøve, at hverken den oprindelige eller en ny manuel kontoindberetning blev synlig. Aggregeret databasekontrol viste nul nye rækker; ingen privat payload blev læst.
- Uploaden sender `forecast_target_at` og `report_accuracy`, men felterne fandtes ikke i den aktive tabel. Den centrale, databevarende hotfix tilføjede begge og genindlæste PostgREST-schemaet.
- Efter den centrale rettelse gav genindlæsning fortsat nul ture. API-loggen viste GET uden POST. Den fælles privatlivskontrol afviste `gps=null` før lokal lagring og ramte derfor både efterregistrering og almindelig Start/Slut-tur.
- 4.0.267 accepterer kun den tomme lokationsværdi `null`; faktiske GPS-, koordinat-, positions-, rute- og spordata afvises fortsat. PR #115/exact-head `32664463654`, merge `43ceffc1` og produktion `32664525128` er grønne, og en ny ejerindberetning blev sendt og synlig. De to tidligere forsøg nåede ikke outboxen. Se DEC-0066.

## 2026-08-23 – interaktiv login-/turlogprøve finder to produktionskontraktfejl

- Ejerens magic link landede på `localhost:3000`, og **Mine ture og fund** viste en læsefejl. Den virkelige prøve viste dermed, at de tidligere kilde-/Pages-beviser ikke dækkede ekstern auth-konfiguration eller den aktive brugertabel.
- Supabases Site URL stod til localhost, og redirect-listen var tom. Begge er rettet til den aktuelle GitHub Pages-origin. Flytning til `ravradar.dk` kræver samme samtidige ændring og et nyt loginlink.
- En nul-rækkers feltkontrol fandt præcis én manglende kolonne, `data_quality_flags`. Policyoversigten viste samtidig, at SELECT-policyen for egne ture ikke var installeret.
- Den idempotente migration tilføjede feltet, genoprettede den private policy, gav SELECT til `authenticated` og genindlæste PostgREST-schemaet. Den indeholdt ingen ændring eller sletning af observationer.
- Efter rettelsen accepteres hele turlogfeltlisten med HTTP 200/`limit=0`, og dashboardet viser **users can read own observations / SELECT / authenticated**.
- 4.0.266 versionsstyrer migration, almindelig fejltekst, tests og domænekravet. PR #113/exact-head `32662085932`, merge `db4db876` og produktion `32662155582` bestod.
- Et nyt magic link returnerede til den rene RavRadar-adresse, kontoen blev indlæst, og den private turlog hentede uden fejl. Den tidligere efterregistrering ligger i ejerens oprindelige Chrome-outbox; sidste ejertrin er at genindlæse netop den fane og kontrollere eftersendelsen. Se DEC-0065.

## 2026-08-23 – aftalt næste indberetningsforbedring

- Ejeren besluttede, at indloggede brugere senere skal kunne indberette en tur eller et fund direkte fra kontosiden uden først at starte en RavRadar-tur.
- Løsningen skal genbruge den eksisterende rapportformular, `observations`-række, privatlivskontrakt og kompakte vejr-/scoresnapshot; ingen ekstra tabel, dubletrække eller særskilt fundkopi.
- Brugeren vælger selv korrekt dato og tidspunkt. Kun historisk vejr og score fra det valgte tidspunkt må kobles til rapporten. Hvis sikkert historisk grundlag mangler, gemmes rapporten som erfaring, men ikke som direkte kalibreringsegnet evidens.
- En startet tur skal have **Afslut uden at indberette**, som efter bekræftelse rydder den lokale tur uden Supabase-post. **Svar senere** skal fortsat bevare turen lokalt.
- Den aktive start-/afslutningsdialog filtrerer allerede kyststrækninger efter valgt zone. Den kommende kontoindberetning skal genbruge samme zone→kystdel-komponent og gemme begge ID'er.
- Kravet er dokumenteret til et naturligt roadmaptidspunkt; ingen produktkode, score, geodata eller brugerdata er ændret i dette checkpoint.

## 2026-08-23 – lokal 4.0.264-kandidat: privat turlog og forståeligt brugerflow

- PR #104 bestod exact-head `32651048627` og blev merged som `579bd167`. Den første fulde produktion `32651106811` stoppede korrekt før release og deployment blev sprunget over, fordi `test-feedback-zone-ui` stadig krævede den bevidst fjernede GPS-parallelrejse. PR #105 rettede kontrakten, bestod exact-head `32651724416` og blev merged som `7c43146f`; produktion `32651786366` stoppede også før deploy, fordi `test-score-presentation` stadig forventede den erstattede ordlyd om en "exceptionel" stjerne. Den rettede feedbacktest var grøn i samme kørsel.
- Den aktuelle opfølgning retter stjernetesten til den nye almindelige formulering og en lokalt fundet mobiltest, som stadig krævede den gamle `startTrip()`-rejse. Begge kontroller køres fremover i `validate:source`, så de opdages før merge.
- PR #106 bestod exact-head `32652894729`, blev merged som `23fa89ed`, og produktion `32652970105` bestod central hydrering, frisk vejr/state, fuld projektvalidering, releasegate, artifact og Pages. Live `rr-20260823165645-210` er version 4.0.264 med 210 zoner og 673 kystdele.
- Live konto-/loginforklaring og den direkte turformular er kontrolleret; formularen oplyser og indsamler ingen GPS-rute. Første fulde audit fandt 2.520 gentagelser af én gammel auditlabel: siden viser `Vandstandsændring på 3 timer`, mens auditten søgte `3-timers trend`. Feltet var både beregnet og vist. Efter den afgrænsede labelrettelse består auditten 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden kontrol-, konsol-, side- eller HTTP-fejl.
- PR #107 bestod exact-head `32654048944`, blev merged som `8b758337`, og produktion `32654119745` bestod igen central hydrering, frisk vejr/state, fuld projektvalidering, releasegate, artifact og Pages. Live `rr-20260823171804-210` er 4.0.264 på 210/673, og auditlabelen er nu låst mod UI'et i kildegaten.
- Ejeren besluttede, at brugerens konto skal have et enkelt **Mine ture og fund** uden at gemme Supabase-data to gange. Implementationen læser derfor de eksisterende `observations`-rækker gennem RLS, først ved klik, med et lille feltudvalg og højst 100 ture.
- Den samme serverrække bruges både som privat ejerlog og som senere anonymiseret modelgrundlag. `user_id` bruges kun til RLS-ejerskab; mail/navn gemmes ikke i turposten og må ikke indgå i analyse, eksport eller træning. Anonyme ture forbliver anonyme.
- Den aktive turknap går direkte gennem v2-kontrakten og starter ikke længere den gamle GPS-baserede parallelrejse. Den aktive rejse indsamler ikke GPS, rute eller præcis position; historiske lokale data og historiske centrale rækker er urørte.
- Magic link forklares som et tidsbegrænset engangslink via mail. Callbacken henter den faktiske Supabase-bruger, og en kontoejet outbox-tur kan kun sendes som samme bruger.
- Centrale offentlige ord om RavScore og turen er gjort enklere. Candidate G, `20/50/30`, vejrdata, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er uændrede.
- Workflowets eksakte docs-only-skip omfatter rodhåndbogen. PR #108 bestod exact-head `32654780774`, blev merged som `98621bf9` med kun ignorerede dokumentationsfiler og oprettede 0 push-produktionskørsler. Den synlige planlagte kørsel var startet før dokumentationsmergen og er ikke mergeudløst.
- Version 4.0.264 og docs-only-reglen er produktions-/procesverificeret. De to geodatafiler fik kun versionsfeltet ændret fra 4.0.263 til 4.0.264.

## 2026-08-23 – rodhåndbog mangler i dokumentationsskip

- Den rent dokumentariske PR #102 blev merged som `0da5b31d`, men startede fuld push-produktion `32646026290`, fordi `HANDBOOK-RAVRADAR.md` ikke er omfattet af workflowets nuværende `paths-ignore`.
- Kørselen bestod og udgav `rr-20260823144117-210` med uændret 4.0.263-kode, Candidate G aktiv, 210/673, komplet coverage og korrekt `CURRENT_COMMON_ZONE_REFERENCE`. Det er en procesomkostning, ikke en score- eller runtimefejl.
- Forholdet er registreret som `ISSUE-ROOT-HANDBOOK-DOCS-SKIP`. En senere særskilt workflowrettelse skal både produktionsverificeres og efterfølges af en ren docs-merge med 0 push-kørsler.

## 2026-08-23 – Candidate G's aktuelle referencegate i 4.0.263

- PR #100/exact-head `32642456123`, merge `586fbd184f68c6445acfb38a39814f6348f14bd0` og fuld produktion `32642532892` beviste, at 4.0.262 accepterer den native tre-timers cadence korrekt: 673/673 states fortsatte uden nulstilling, replaymismatch var 0, og 110 transportpotentialer blev positive, mens 563 var fysisk nul efter de aktuelle strømforhold.
- Den ønskede Candidate G-profil rullede alligevel globalt tilbage til legacy. De 673 valgte aktuelle referencer var lovlige `WINDOW_INCOMPLETE`, men profilgaten bedømte warmup over alle senere femdøgnsrækker og lod et fremtidigt prognosehul slå den sunde aktuelle reference fra.
- DEC-0062 binder derfor memory- og warmup-gaten til den nærmeste fælles aktuelle scoretid for alle dele i hver zone. Komplet Candidate G-scorecoverage kræves fortsat for hele det publicerede femdøgn, og en missing- eller gapstatus ved den faktisk valgte aktuelle reference udløser stadig global rollback.
- Fremtidige huller forbliver fail-closed i deres egne states: der opfindes ingen mellemliggende strøm, det sammenhængende suffix brydes, og replayet genstarter fra den faste rand. De kan ikke længere retroaktivt ændre den aktuelle profilsundhed.
- Version 4.0.263, målrettede regressionstests, samlet lokal source-/RDKS-/releasegate og eksakt geodatadiff er grønne. PR #101 bestod exact-head `32644701811`, blev merged som `9f5953f6`, og fuld produktion `32644772373` bestod central hydrering, frisk data/state, samlet validering, releasegate, Supabase, artifact og Pages.
- Live `rr-20260823142247-210` har Candidate G aktiv på 210/673 med 673 accepterede states, nul reset, nul replay- eller scorerekonstruktionsfejl og 139 positive mod 534 aktuelt fysiske nultransporter. Aktiv shadow `32645569741` og browser 420/2.100/673 er grønne uden fejl. P0 er lukket.
- Candidate G's `20/50/30`, fysik, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er uændrede. Kun versionsfeltet i de to godkendte geodatafiler løftes til 4.0.263.

## 2026-08-23 – Candidate G native cadence-rettelse i 4.0.262

- Ejeren bad om en grundig analyse og den rette implementation efter fundet af 673/673 nultransporter.
- Rodårsagen er produktionens dokumenterede native tre-timers marine stride mod en fejlagtig én-times stategate. DEC-0061 accepterer op til tre timer, integrerer faktisk forløbstid og opfinder ingen mellemtimer.
- Et hul over tre timer eller missing er fortsat fail-closed. Pre-public warmup må kun være `WINDOW_INCOMPLETE`; en ny global `candidateWarmupEligible`-gate beskytter profile switchen.
- Målrettede tests og dataminimeret replay af den gamle 673-state er grønne: 110 transportpotentialer bliver positive, 563 forbliver nul efter evidensen, og 658 gamle artifactværdier afvises som mismatch.
- Version 4.0.262 og dokumentation er lukket lokalt. Exact-head, frisk fuld produktion, aktiv 210/673-shadow og browserkontrol afventer.

## 2026-08-23 – ejeren aktiverer Candidate G under den første pre-public opvarmning

- Efter PR #99 viste en ny dataminimeret livekontrol af `rr-20260823121818-210`, at transportpotentiale og transportkomponent er 0 i alle 673 dele. 658 dele har to beviser med tre timers afstand, mens modellen tillader højst én time; 15 har ét bevis. Det brugbare suffix bliver én prøve med nul forløbstid, så transporten kan ikke bygge og memory kan ikke modnes under uændret cadence.
- De tidligere grønne gates beviser deployment og kontraktidentitet, men ikke korrekt tidsintegration. P0 er genåbnet; global rollback eller en testet cadence-rettelse udestår. Ingen kode, central konfiguration eller runtime er ændret under opdagelsen.

- Ejeren præciserede, at siden endnu ikke er offentlig, og godkendte, at Candidate G bliver gældende nu, selv om scoreværdierne først retter sig fuldt ind efter et komplet naturligt 48-timersvindue.
- DEC-0060 erstatter derfor rækkefølgen, hvor komplet memory og frisk slutshadow skulle foreligge før kobling. Det er en pre-public ejerundtagelse; ufuldstændig historik skal fortsat vises ærligt og må ikke kaldes et 48-timersbevis.
- 4.0.261 vælger `RESEARCH-3` med `20/50/30` globalt. Mangler én nødvendig Candidate G-projektion, vælger hele datasættet legacy `25/40/35`; blandede profiler og automatisk aktivering er fortsat forbudt.
- Profilvalget gemmes som det private centrale admin-dokument `ravscore-profile-selection`. En nyere ejer-godkendt repositoryversion må krydse central hydrering én gang, hvorefter central samme/nyere værdi er autoritativ, også ved rollback.
- Målrettede lokale tests er grønne for aktiv opvarmningsprofil, global fail-closed, uændret rollback, aktiv public projection, dataminimeret shadow og central promotion/readback-kontrakt.
- PR #97 bestod exact-head `32636378576`, blev merged som `0f7a9d5f`, og produktion `32636433944` beviste central readback og live Candidate G på 210/673. PR #98/merge `fd69f8a0` lukkede den legitime non-ready-shadowstatus; produktion `32637387600` og shadow `32637833674` er grønne. PR #99/merge `328b4d7c` registrerede den fulde browserlukning med 420 aktuelle og 2.100 femdøgnsvisninger uden fejl. 4.0.261 er dermed produktionsverificeret.
- Artifact, protected-dirty-data, privat cache, geometri og land-/vandpunkter er urørte. Kun versionsfeltet i de to geodatafiler løftes til 4.0.261.

## 2026-08-23 – Candidate G får fast 48-timers transporthukommelse

- Ejeren afviste en ny vilkårlig startprior og valgte, at Candidate G skal rette sig ind efter de faktiske nyere forhold med tiden uden endnu en 48-timers realtidsudviklingstest.
- DEC-0059 implementerer derfor et fast, rullende 48-timers vindue af sammenhængende, verificeret og dataminimeret kystnormal strømevidens. Det tidligere gemte transportresultat bruges ikke som ny start.
- Den faste rand 0 betyder kun, at der ikke antages dokumenteret indtransport før vinduet. Den må ikke udløse udtransportgaten. Den aftalte +10/-8-kurve og 13-timers udtømning er uændret.
- Missing og tidsgab er ikke neutral strøm og holder aktiveringsberedskabet lukket. Schema 2 og en ny profilidentitet forhindrer skjult genbrug af den gamle statekontrakt.
- Syntetiske kontroller samt 582 komplette historiske 48-timersvinduer viser nul slutafvigelse mellem tænkte starter 0, 50 og 100. Auditoutputtet indeholder kun aggregater.
- Candidate G er fortsat score-neutral og inaktiv. Offentlig `25/40/35`, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er urørte.
- Exact-head `32633533257` bestod på `56824ab0`; PR #95 blev merged som `1d848724`. Produktion `32633607166` gennemførte central hydrering, frisk vejr/proveniens, fuld validering, releasegate, Supabase, artifact og Pages.
- Live `rr-20260823102619-210` består manifestets byte- og SHA-256-integritet med 210 zoner og 673 dele. Schema 2 er oprettet 673/673 med ét første timebevis, ingen aktiveringsklar transporthukommelse og nul offentlig Candidate G-aktivering. Legacy er fortsat aktiv, ønsket og rollback.

## 2026-08-23 – 4.0.259 central Candidate G og fallback-kompatibel shadow

- DEC-0057 kobler DEC-0055/0056 til den centrale 673-deles pipeline uden at ændre aktiv `25/40/35`.
- Kystdelen fører en kompakt versions-/kontekstbundet tilstand videre ved `currentReferenceAt`: tidspunkt, transportpotentiale, effektive udtransporttimer og mobiliseringspotentiale.
- Same-time og missing holder tilstanden; ændret model, profil, punkt eller kystretning nulstiller fail-closed. Rå U/V, øvrige vejrinput, koordinater og private replaydata indgår ikke i tilstanden.
- Den manuelle shadow genhenter ikke længere en smallere native-only DMI-prøve. Den auditerer den producerede fallback-kompatible public detaljefil og kræver 210/673 samt begge jagtformer.
- Samlet lokal kildegate og releasegate er grøn for 4.0.259. Exact-head `32609888406` bestod på `337466b5`, og PR #89 blev merged som `31e50acb`.
- Produktion `32609952992` bestod den fulde kæde og deployede 4.0.259/`rr-20260823011924-210` med 210 zoner og 673 dele.
- Read-only shadow `32610281620` bestod 210/673, 1.346 modeevalueringer og nul rekonstruktionsfejl; artifact `9485298931` er dataminimeret. Alle 673 tilstande er forventet bootstrap.
- Første naturlige schedule `32613284735` bestod hele produktionskæden og udgav `rr-20260823023951-210`. Den dataminimerede audit accepterede 673/673 tidligere tilstande, nulstillede 0 og bestod 210/673/1.346 uden rekonstruktionsfejl.
- Bootstrapreferencen 00:00Z til ny fælles reference 03:00Z dokumenterer 3/3 timers yngste/ældste naturlige fortsættelsesalder. Det opfylder ikke 48-timerskravet.
- Candidate G er fortsat `diagnostic-only`; aktiv score, UI, geometri, punkter og beskyttede data er uændrede. Modnet slutshadow efter naturlig state-alder udestår.

## 2026-08-23 – Candidate G bølgeenergistyret mobilisering

- DEC-0056 vælger `RESEARCH-3` som foretrukken score-neutral helhedskandidat: `20/50/30`, strømstyret transport, vindstyret waders-jagtbarhed og én bølgeenergistyret mobiliseringstilstand.
- Mobiliseringen bruger højde² × periode, fire timers opbygning og 48 timers aftrapning. Direkte vind, aktuel strøm, separat varighed og statisk stedegnethed giver ingen mobiliseringspoint.
- En syntetisk audit låser korte spidser, vedvarende hændelser, eksakt 48-timers halvering, missing-hold og kompakt fortsættelse uden private data.
- Det eksisterende Git-ignorerede replay omfatter 1.460 evalueringer. Mobiliseringen stiger fra 57,651 til 73,348 i gennemsnit; totalscoren er 31,775 og +3,484 mod transportrevisionen. Hændelsesudvalget er stormpræget og ikke fundkalibrering.
- Målrettede tests og samlet lokal `scripts/validate-source.ps1`, inklusive de nye mobiliseringsaudits og releasegate, er grønne.
- Transportbaseline PR #86/merge `5d7d4c2b` bestod post-merge-produktion `32606559443` med fulde gates og 210/673. Den godkendte fallback håndterede et midlertidigt DMI 429/uforandrede collections uden at skjule missing eller omgå gates.
- Mobiliseringscheckpointet bestod exact-head `32607989444` på `03083f92`, blev merged via PR #87 som `48240d73` og bestod fuld produktion `32608050112`. Central hydrering, frisk kontrolleret data, fuld validering, releasegate, Supabase, artifact og Pages er grønne; `controlled-live` har 673/673 scoreklare dele.
- Offentlig `25/40/35`, UI, runtime, geometri, land-/vandpunkter, artifact og protected-dirty-data er uændrede. Næste fase er samlet offentlig pipeline-/forklarings-/rollbackforberedelse.

## 2026-08-23 – Candidate G score-neutral frigivelsesrevision

- PR #82 bestod exact-head `32602287607` på `74624ac3` og blev merged som `189644a0`. Produktion `32602328912` gennemførte frisk vejr/proveniens, fuld validering, releasegate, support, Supabase og Pages uden fejl.
- Live `rr-20260822223539-210` er komplet med 210 zoner og 673 kystdele; manifest, offentlig startfil og offentlig detaljefil er atomisk bundet til samme datasæt-id.
- En ny syntetisk audit låser DEC-0055's udtransportkurve time for time fra 100 til 0 ved 13 effektive fuldstyrketimer og dækker de centrale randtilfælde uden private rådata.
- Den første audit viste 35/35 ved transportpotentiale 0. Ejeren har efterfølgende erstattet denne `RESEARCH-1`-betydning: `RESEARCH-2` sætter slutscoren til 0, når faktisk kraftig udtransport har udtømt transportpotentialet, men bevarer mobilisering og jagtbarhed som synlige delscorer.
- Den bindende forklaring er: `På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`. Gaten udløses ikke af start 0 uden faktisk udtransport, missing, neutral strøm eller svag modstrøm.
- `RESEARCH-2` bestod exact-head `32604792201` på `f6458f09`, blev merged via PR #84 som `800a93cb` og bestod fuld produktion `32604850884`. Live `rr-20260822232159-210` er direkte verificeret som 210/673 med samme datasæt-id i manifest/start/detaljer; offentlig `25/40/35` er fortsat aktiv.
- Den nationale shadowvalidator og dens kontrakttest følger nu de aktuelle aktiveringsgates og afviser erstattede waders-/pil-/ekstremmarkører.
- Candidate G forbliver diagnostic-only med `20/50/30`; offentlig `25/40/35`, UI, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches er uændrede. Automatisk aktivering er falsk.

## 2026-08-23 – docs-only skip praktisk bevist og lukket

- PR #80 indeholdt kun `CHANGELOG.md` og intern AI/RDKS-dokumentation og blev merged som `1565e073`.
- GitHubs Actions-forespørgsel på den eksakte mergecommit returnerede 0 workflowkørsler; `Update weather and deploy RavRadar` blev ikke oprettet.
- ISSUE-ROOT-CHANGELOG-DOCS-SKIP er dermed lukket efter exact-head, fuld produktion og separat praktisk skip-bevis. Den seneste fuldt produktionsverificerede baseline forbliver `rr-20260822215524-210` fra run `32600714319`.

## 2026-08-23 – PR #79 fuldt produktionsverificeret

- Exact-head `32600654326` bestod på commit `24d944c0`; PR #79 blev merged som `41f71900`.
- Fuld produktion `32600714319` gennemførte frisk vejr/provenance, fuld projektvalidering, release-gate, supportpakke, Supabase og Pages uden fejl.
- Live-manifestet `rr-20260822215524-210` er komplet med 210 zoner og 673 kystdele. Et rent docs-checkpoint inklusive `CHANGELOG.md` udføres nu som separat skip-bevis.

## 2026-08-22 – rod-CHANGELOG manglede i docs-only skip

- PR #78/merge `7133b33b` indeholdt kun intern dokumentation, men startede fuld produktion `32599980640`, fordi `paths-ignore` dækkede `CHANGELOG-*.md` og ikke den aktuelle samlede `CHANGELOG.md`.
- Rettelsen bevarer versionsmønstret og tilføjer kun den eksakte rod-fil. Regressionen kræver begge og afviser fortsat brede Markdown-, docs-, data-, script-, workflow- og HTML-undtagelser.
- En fuld produktion på selve workflowrettelsen og en efterfølgende ren docs-merge kræves som slutbevis.

## 2026-08-22 – Candidate G strømstyret transporthukommelse efter 4.0.258

- Ejeren har godkendt, at fuld kraftig udgående strøm straks reducerer det interne transportpotentiale med 8 point pr. effektiv time og når 0 fra 13 timer. Fuld indgående strøm bygger 10 point pr. effektiv time mod 100.
- Candidate G-varianten `G-CURRENT-LED-OUTFLOW-8-WADERS-WIND-LED` gør verificeret kystnormal strøm til transportleddet. Bølger alene giver nul transport og har kun en afhængig leveringsrolle på højst 15 procent.
- Privat replay på 1.460 evalueringer består mekanisk. Referencegrænser 0,05→0,20 m/s giver gennemsnitspotentiale 7,246; lavere følsomhedsgrænser flytter Candidate G-scoren +3,068 til +4,296, og diagnostisk start 50 flytter den +21,136.
- DEC-0055 klassificerer derfor strømgrænsen og start-/forældelsesreglen som åbne aktiveringsblokeringer. Offentlig RavScore `25/40/35`, UI og runtime er uændret.
- Candidate G beholder `20/50/30` og DEC-0054's waders-regler. Ingen nye rådata, geometri eller punktændringer indgår.
- Målrettede tests, samlet RDKS-/håndbogsvalidering og fuld lokal `scripts/validate-source.ps1` inklusive releasegate er grønne.
- PR #75's exact-head-kildegate `32598284279` bestod på `d37d15fe`; PR'en blev merged som `4379606e` uden et nyt produktionsartifact eller offentlig scoreaktivering.
- Efterkontrollen tilføjer valgfri neutral halvering på 24/48 timer som diagnostic-only følsomhed. Den flytter start-0-scoren -1,182/-0,697 point og ændrer ikke den godkendte 10-/8-pointskurve eller missing-pause.
- Alle 12 private eventvinduer har kun 24 timers forhistorie; ingen har 48/72. Referencegrænsen har samtidig nul fuldstyrkeevalueringer. Replayet kan derfor ikke vælge fysisk levetid eller strømgrænse, og offentlig aktivering forbliver lukket.
- Efterkontrollen bestod exact-head `32599255165` på `ed1f0297`, blev merged i PR #77 som `75ed93d6` og bestod fuld produktion `32599309735`. Live `rr-20260822212612-210` har 210 zoner og 673/673 scoreklare dele; offentlig `25/40/35` er uændret.

## 2026-08-22 – RavRadar 4.0.258: vindstyret waders-jagtbarhed i Candidate G

- Ejeren har valgt `20/50/30` som Candidate G's private faglige analyseprior. Offentlig RavScore `25/40/35` er uændret.
- `G-50-50-NO-DIRECT-WIND-WADERS-WIND-LED` bruger vind som hovedsignal: fuld jagtbarhed til 6 m/s og nul ved 15 m/s. WAM-bølger kan kun give et ensrettet blødt fradrag på højst 20 point.
- Privat replay på 1.460 evalueringer bevarer 730/730 strandscorer, holder alle waders-scorer under jagtbarheden og giver gennemsnitligt 4,002 points bølgefradrag.
- Den nationale score-neutrale shadow følger varianten gennem centrale regler og waders-loft. Automatisk aktivering er fortsat deaktiveret.
- DEC-0054 erstatter DEC-0053's variant, `20/45/35`, 18 m/s-stop og mere selvstændige bølgekobling. Tidligere modeller bevares som evidensspor.
- PR #73 bestod exact-head-kildegate `32586707063` og blev merged som `9bdb8de8`. Produktion `32586958989` bestod frisk vejr/proveniens, fuld validering, releasegate, coverageaudit, support `RavRadar-support-3405`, Supabase og Pages.
- Live 4.0.258/datasæt `rr-20260822171406-210` er verificeret med 210 zoner, 673 dele og 2.100 femdøgnsvisninger. Offentlig RavScore er fortsat `25/40/35`; Candidate G er ikke aktiveret.
- Ingen nye rådata er hentet. Private caches, artifact, protected-dirty-data, geometri og land-/vandpunkter er urørte.

## 2026-08-22 – Candidate G-beslutningsgrundlag samlet efter 4.0.257

- PR #70 blev merged som `bb16ffe9`; produktion `32580314866` og live `rr-20260822150210-210` bestod den fulde kæde for 210 zoner/673 dele.
- Exact-merge-shadow `32580774128` og det private 1.460-evalueringsreplay er genlæst uden nye rådata. De 243 komplette dele bruges alene som mekanisk nationalt snapshot.
- DEC-0053 fører kun `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` videre til ejerreview. Tidligere kandidater bevares som revisions- og følsomhedsevidens.
- Alle 730 strandscorer er uændrede, ingen waders-score overstiger jagtbarheden, og ingen af 216 lave waders-jagtbarheder får mindst 55 point.
- `20/45/35` er analysecentrum, ikke slutvægt. Offentlig `25/40/35` er uændret; endelig vægtning afventer komplette ture og hold-out.
- Ingen ekstra rådata, score, UI, geometri, land-/vandpunkter, artifact eller protected-dirty-data er ændret.
- PR #71 bestod exact-head-kildegate `32583123375` og blev merged som `52f66808204b1de4b643e05192a5bd7e92797244`. Dokumentationsmerget udløser ikke et nyt produktionsartifact.

## 2026-08-22 – RavRadar 4.0.257: Candidate G-coverage uden skjult stedmodel

- PR #69 bestod exact-head `32577977245`, blev merged som `d629177a`, og fuld produktion `32578049137` frigav verificeret 4.0.256 med 210 zoner og 673 dele.
- Den efterfølgende private centrale shadow `32578554928` bestod score-neutralt, men kun 243/673 dele havde komplette dynamiske scoreinput. 430 mangler komplet lokal DKSS-familie.
- DEC-0052 skelner nu dette reelle datagab fra statiske lokale rev-/lavtvands-/ålegræsfelter. Candidate G bruger ingen sådan stedmodel, giver den nul point og kræver den ikke i coveragegaten.
- Shadowvalidator schema 1.4.0 rapporterer fortsat felttilgængeligheden, afviser parentmorfologi og holder `automaticActivationAllowed=false`, men `activationCoverageReady` følger nu kun komplet dynamisk scoreinputcoverage.
- Målrettede shadow-, fase-D- og Candidate G-tests samt fuld lokal `scripts/validate-source.ps1` og releasegate er grønne. Offentlig score 25/40/35, UI, data, geometri og land-/vandpunkter er uændrede.

## 2026-08-22 – RavRadar 4.0.256: Candidate G-vægtinterval og forklaringskontrakt

- Den godkendte `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` er afprøvet score-neutralt med `15/50/35`, `20/45/35` og `25/40/35` på 1.460 evalueringer.
- Yderpunkterne adskiller sig 4,947 point i gennemsnit og 282 referencebånd. `20/45/35` bevares som gennemsigtigt analysecentrum; alle tre priorer består de kanoniske proces- og waders-kontrakter.
- Candidate G udstiller nu eksakte komponenter/bidrag, pil nu, historik før nu, fysisk gate og synligt waders-loft i en diagnostic-only forklaringskontrakt. Replay gav 1.460/1.460 konsistente forklaringer.
- Målrettede tests, RDKS, fuld lokal `scripts/validate-source.ps1` og releasegate er grønne for 4.0.256.
- Materialet er ikke fundkalibreret. Offentlig 25/40/35 og UI er uændret; komplet dynamisk scoreinputcoverage og ejer-go/no-go forbliver aktiveringsgates. DEC-0052 erstatter efterfølgende den ældre retention-coverageformulering.
- Den Git-ignorerede cache blev brugt uden private payloads i Git. Artifact, protected-dirty-data, geometri og land-/vandpunkter blev ikke læst eller ændret.
- Det foregående dokumentationscheckpoint PR #68 bestod exact-head-gate `32576541706`, blev merged som `8cffdd54` og bestod fuld produktion `32576619969`. Live 4.0.255/datasæt `rr-20260822135100-210` har 210 zoner og 673 dele.

## 2026-08-22 – 4.0.255 lukker hullet mellem kilde- og fuld shadowkontrakt

- PR #66 bestod exact-head-kildegaten og blev merged som `95e3064d`, men produktion `32575055644` stoppede fail-closed i fuld validering. Den nationale kontrakttest forventede stadig den erstattede gate `candidate-waders-product-decision`; releasegate, Supabase og Pages blev korrekt sprunget over.
- 4.0.255 forventer den aktuelle åbne gate `candidate-waders-rule-order-public-product-review` og kører selve den nationale weather-/score-shadow-kontrakttest i `validate:source`.
- Rettelsen ændrer ingen score, kandidatberegning, vejrdata, geometri, land-/vandpunkter eller beskyttede data. Ny exact-head-kildegate og fuld post-data-validering er obligatorisk.
- PR #67's exact-head-gate `32575697204` bestod på `b011f915`, og merge `af8f30cf` udløste grøn produktion `32575740539`. Frisk DMI/proveniens, fuld validering, releasegate, coverageaudit, support `RavRadar-support-3389`, Supabase, Pages-artifact og deploy bestod.
- Offentlig 4.0.255/datasæt `rr-20260822133041-210` har 210 zoner, 673 kystdele, komplet `controlled-live`-manifest samt byte- og SHA-match for både public conditions og public condition details.

## 2026-08-22 – 4.0.254 score-neutral waders-kandidat

- Ejeren har valgt, at waders-jagtbarhed får fuld vindkomponent til og med 6 m/s og derefter falder progressivt ved højere vind. Forskningskurvens ankre er 6/100, 7/80, 8/60, 10/35, 13/10 og 18/0 med lineær interpolation.
- Kandidaten `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` begrænser kun waders-slutscoren til den beregnede jagtbarhed. Strandjagtens Candidate G-score er uændret; sikkerhed og fravalgte modeller for bund-/stedegnethed indgår ikke.
- Privat replay af 1.460 evalueringer giver nul ændrede strandscorer og nul waders-scorer over jagtbarheden. Kandidaten er fortsat forskning og ændrer ikke den aktive offentlige 25/40/35-model uden en senere udtrykkelig go/no-go-beslutning.
- Ejerens land-/vandpunkter og beskyttede data er urørte; versionsændringer i kystdata er kun topniveauets versionsmetadata.

## 2026-08-19 – scheduler overdraget, 30-timerscache og browserfallback

- Ejeren slettede RavRadar-jobbene i cron-job.org. Efterfølgende naturlig produktion `#32272470720`, cachebevaring `#32272473716`/`#32272598725` og Copernicus-pilot `#32273634626` bestod, så GitHub Actions er eneste normale scheduler.
- Live `rr-20260819155614-210` bestod præcis 673/673 og sikker audit af 210 zoner, 673 dele, 420 aktuelle visninger, 2.100 femdøgnsvalg og 673 pile. Den offentlige historik er credentialfri med 168 timers retention.
- Den private cache nåede 30 gyldige timer og 18.870 poster med 625 mål, 629 mål/kilde-par og nul gitter-/lagustabilitet. `scoreImpact=false` og `publicRuntime=false` er bevaret; det fulde naturlige 168-timersvindue er fortsat åbent og kontrolleres højst dagligt.
- Den faktiske online DOM-/kliktest forsøges først med Browser-plugin og målrettet diagnostik. Hvis der ikke findes en konkret reparationsvej, har ejeren godkendt Chromium/Playwright som fallback for alle 210 zoner/673 dele. Testen må ikke ændre ejerens land-/vandpunkter.

## 2026-08-19 – 4.0.237 låser den aktuelle lokale visning pr. zone

- En sikker metadataaudit af det aktuelle 210-zone/673-dels livegrundlag fandt en komplet fælles række i alle 210 zoner, men kun 642 dele stod allerede på deres zones nærmeste komplette række; 31 dele brugte en anden nær-time.
- 4.0.237 indfører `currentReferenceAt` pr. zone, vælger kun en række hvor begge jagtformer og alle forventede dele er komplette, bygger hver dels aktuelle score og pil på præcis denne tid og fører referencen gennem offentlig runtime, manifest, detailfletning og frontend.
- 673/673-kildegaten er ikke ændret. Forskellige zoner må vælge forskellige nærmeste komplette timer; kravet er én sammenhængende lokal sammenligning pr. zone, ikke én national klokktime. Ejerens land-/vandpunkter, kildeorden, afstandsgrænser og scoreformel er urørte.
- Målrettede lokale regressioner er grønne. Commit `9c971bc1` og `#32264833170` bestod frisk central 673/673, fuld `validate`, releasegate, Supabase og Pages.
- Direkte liveaudit af `rr-20260819143933-210` fandt 210/210 komplette zoner og 673/673 dele på deres respektive `currentReferenceAt`: 196 zoner bruger 15:00Z og 14 bruger 14:00Z. Kilderne er 622 DMI, 39 Baltic, fire AMM15 og otte regionale proxyer; manifesthashes matcher, `controlled-live` er aktivt, og historikken er credentialfri med 168 timers retention.

## 2026-08-19 – 4.0.236 låser schedule-jobbet til readiness-timen

- Naturlig schedule `#32249924919`/`#3217` godkendte komplet 11:00-cache kl. 11:59, men den tunge bygning krydsede kl. 12 og valgte derefter 12:00. De 43 Copernicus-dele manglede, og 673/673-gaten stoppede korrekt ved 630/673 før releasegate, Supabase og Pages.
- `current-hour-readiness` eksporterer nu den godkendte time, og `build-and-prepare` binder live-pilot samt `update-weather.mjs` til den samme `RAVRADAR_PRODUCTION_TARGET_HOUR`. Push/manual uden readiness-output bruger fortsat nutiden.
- Root-`generatedAt`, dataset-ID og health bruger fortsat virkelig byggetid; den låste faglige time fremgår særskilt som `productionReferenceAt`.
- Ny regression simulerer timeskiftet og afviser ikke-timeskarpt input. DMI-, workflow- og heartbeatregressioner består målrettet. Ingen punkter, geometri, U/V, pile, score, kildeorden, afstand eller 673/673-gate er ændret.
- Commit `668a1cdd` blev pushet til `main`. Pushrun `#32252669641`/`#3218` brugte som designet nutiden uden readiness-lås og stoppede fail-closed på 630/673, fordi den nye 12:00-Copernicustime endnu ikke var indsamlet; releasegate, Supabase og Pages blev ikke kørt. Den automatisk bestilte pilot `#32252701720` gjorde derefter timen komplet.
- Normal ikke-tvungen `#32253251841`/`#3219` eksporterede 12:00 fra readiness, bar samme time gennem hele `build-and-prepare` og bestod 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Cachebevaring `#32253254239` bestod også.
- Live version 4.0.236/datasæt `rr-20260819123607-210` er direkte metadata-verificeret med virkelig byggetid 12:36, `productionReferenceAt=12:00`, 210 zoner og 673 verificerede dele: 622 almindelige DMI, 39 Baltic, fire AMM15 og otte godkendte `dkss_lf`-proxyer. Alle 673 bruger ejerens centralt godkendte land-/vandpunkter.
- Manuel pilot `#32257195240`/`#42` udvidede den private 168-timerscache til 27 gyldige timer, 625 mål og 629 mål/kilde-par med nul gitter-/lagustabilitet. Normal produktion `#32257480030`/`#3220` bestod derefter 13:00-readiness, 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Live `rr-20260819132304-210` bekræfter 210 zoner, 673/673 og `productionReferenceAt=13:00`.
- GitHubs midlertidige leveringshul blev lukket med nye naturlige grønne events for produktion, pilot og cachebevaring. Ejeren har siden slettet cron-job.org-jobbene, og efter-deaktiveringsruns er dokumenteret i det nyere checkpoint ovenfor.
- 4.0.235 er samtidig afsluttet som produktions-/runtimeverificeret: `#32249770288`/`#3216` bestod hele kæden, og live datasæt `rr-20260819115558-210` er hash-/runtimeauditeret for 420 aktuelle og 2.100 femdøgnsvisninger. Faktisk DOM-/kliktest afventer fortsat; plugin forsøges først, og Chromium/Playwright er ejer-godkendt fallback.

## 2026-08-19 – 4.0.235 samler hele zonepanelet om én lokal del og tid

- Den landsdækkende Chromium-audit viste, at den lokale vinder, RavScore, tekst og debug var korrekte, mens de synlige nu-metrikker stadig kom fra hovedzonen, og femdøgnsfanerne valgte tidspunkt med hovedzonens generiske algoritme.
- 4.0.235 indfører én fælles lokal visningskontekst. Aktuel visning bruger vinderdelens eksakte vejrpost, og både national prognose og zonepanelets femdøgnsfaner bruger samme `selectLocalBestForDay`.
- Vejrbyggeren bevarer vinderdelens kompakte scorekomponenter, årsager, transportforklaring og viste vejrdata ved hver fælles time. En manglende lokal post låner ikke hovedzonedata; fallback mærkes og kommer samlet fra hovedzonen.
- Ny syntetisk regression består for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger gennem offentlig startup-/detailfletning. Målrettede eksisterende score-, kort-, forklarings-, null-safety- og payloadtests er grønne.
- Ejerens land-/vandpunkter, kystgeometri, retningsankre, U/V, pilceller, scoreformel, kildeorden, afstandsgrænser, rollback og 673/673-gate er urørte. RDKS, versionslukning og lokal releasegate er grønne; fuld lokal `validate` stopper ved det kendte forældede 209/211-snapshot efter bestået geometri-v2. Central produktions-/browserverifikation af kandidaten afventer.
- Commit `2bd30234` blev fast-forwardet til `main`. Pushrun `#32248949564`/`#3215` hydrerede frisk central data og nåede den fulde projektvalidering, men stoppede fail-closed før release, Supabase og Pages, fordi fire aktive workflow-User-Agents stadig viste 4.0.234. Workflowet og versionsværktøjet er rettet, og både `validate-release-version` og `release-gate` håndhæver nu samme version før push.

## 2026-08-19 – 4.0.234 retter timeskifterace og Supabase-diagnostik ved rodårsagen

- Actions-runs blev fulgt systemisk: hel-timeskørsler stoppede ved 630/673, fordi 43 Copernicus-dele for den nye eksakte time endnu ikke var indsamlet, mens senere fulddækkede runs kunne stoppe på Supabase HTTP 500/PostgreSQL `57014` ved den store `runtime-diagnostics`-upsert.
- Ejeren besluttede at flytte den normale 15-minuttersstart fra cron-job.org til GitHub. Produktion ligger ved minut 14/29/44/59, piloten ved minut 6, og en lille readiness-gate udsætter en planlagt build sikkert, hvis aktuel time mangler.
- Den fulde runtime-diagnostik pakkes tabsfrit under samme beskyttede Supabase-nøgle. Den repræsentative payload falder fra 4.014.169 til 208.874 byte og genskabes kun efter browserkontrol af størrelser, SHA-256, version og tidspunkt.
- Målrettede lokale regressioner består. Ingen ejerpunkter, kilder, U/V, score, pile eller 673/673-gate er ændret.
- Commit `7409d461` og pushrun `#32237507059`/`#3202` bestod frisk central geometri, fuld validering, releasegate, 673/673, Supabase-sync på otte sekunder, Pages-artifact og deploy. Live datasæt `rr-20260819093242-210` viser 210 zoner, 673/673, `controlled-live`, 168 timers credentialfri historik og version 4.0.234. To efterfølgende eksterne dispatches `#3203` og `#3204` bestod også. Kun et naturligt schedule-event for selve produktionsworkflowet afventer, før cron-job.org må slukkes.
- Den fortsat aktive eksterne hel-timesdispatch `#3205` startede 10:00:40Z før den automatisk bestilte pilot var færdig 10:02:55Z og stoppede fail-closed i datavalideringen før release, Supabase og Pages. Overgangens almindelige ikke-tvungne `workflow_dispatch` føres derfor også gennem current-hour-gaten; push og manuel `force=true` omgår kun udsættelsen for at bevare fuld releasekontrol.
- Overgangscommit `4ab7a659` bestod i pushrun `#32242510084`/`#3207`; de efterfølgende eksterne dispatches `#3208` og `#3209` bestod også. Live datasæt `rr-20260819102736-210` blev metadata-verificeret med 210 zoner, præcis 673/673, `controlled-live`, credentialfri historik, 168 timers retention og uændret kildeorden.
- GitHubs første nye naturlige produktionsschedule `#32244914347`/`#3210` blev oprettet 2026-08-19T10:53:50Z, cirka ti minutter efter 10:44-planpunktet, og bestod current-hour-gate, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Ejeren blev derfor bedt om at deaktivere RavRadar-jobbene i cron-job.org. Faktisk deaktivering og næste native kørsel uden ekstern dublet skal bekræftes ved næste mulighed.
- Det efterfølgende eksterne hel-timeskald `#32245473213`/`#3211` fandt korrekt den manglende aktuelle time og sluttede grønt med build, Supabase og Pages sprunget over. Den oprindelige røde 630/673-timeskifterace er dermed direkte produktionsverificeret som løst. Dokumentationspush `#32245605472`/`#3212` bestod bagefter hele den centrale kæde.

## 2026-08-18 – nedlukningscheckpoint efter fuld Chromium-audit

- En direkte Chromium/Playwright-kontrol gennemgik 210 zoner, 673 kystdele, 420 aktuelle zone-/jagtformvisninger, 545 unikke strømpositioner og 2.100 femdøgnsfaner. Ingen projektdata eller ejerpunkter blev ændret.
- Audit bekræftede 673/673 match mellem ejerens land-/vandpunkter og runtime, 622 DMI + 43 Copernicus + otte godkendte regionalproxyer samt konsistente U/V-retninger, pilceller, afstande og kildeklasser. En enkelt rå pilemarkering var en DOM-overlap-falsk positiv; alle 545 unikke positioner havde en pil.
- Ny P1 blev afgrænset til offentlig præsentation: det aktuelle vejrkort viser hovedzonens `condition.current`, mens lokal vinder, score, tekst og debug bruger vinderdelen. 371/414 sammenlignelige aktuelle visninger havde forskellig strømretning; Blåvand viste lokal NV 315° mod synlig N 11°.
- Femdøgnspanelet bruger hovedzonens generiske dagsvalg i stedet for lokal `bestForDay`. 1.660/1.964 sammenlignelige faner havde forskellig score, og 897 havde forskelligt bedste tidspunkt.
- Datasæt `rr-20260818201755-210` havde samlet 673/673, men manglede dele på den fælles 20:00-række i `DK-B05-12`, `DK-B05-17` og `DK-B05-18`. Dette kræver særskilt timedækningsbevis og eventuel ejerplan, ikke en lavere gate.
- Kun RDKS-, status-, handoff- og roadmapdokumentation blev ændret. Programkode, geometri, score, kilder, live-data og deployment blev ikke rørt; rettelsen afventer næste session med Sol/Ekstra høj.

## 2026-08-18 – 4.0.233 isolerer hver lokal score til eget punktpar

- Ejerens seks Blåvand-billeder viste tre samtidige udsagn, der ikke kunne være sande: bedste del var `Havsande – nordkyst`, teksten valgte `Syd for fyret`, og debug viste lokal pålandsretning 117° men retningsforskel 29°.
- Direkte audit af den aktuelle livepakke fandt nul fejl i 673 U/V-retninger, pilceller, provenance, kildeklasser og afstande. Pilen mod nord var fysisk konsistent; scorefortolkningen var ikke.
- 216 dele i 52 zoner brugte en anden scoreretning end deres eget punktpar, og 49 aktuelle zonevindere var berørt. Rodårsagen var spredningen af `parent.properties`, som lod lokale dele arve moderzonens `directionAnchors`.
- Ny runtimebygger erstatter ankerlisten med præcis ét lokalt anker. Regressionen gennemgår alle 673 dele og reproducerer Havsande som offshore mod nordkystens egen retning.
- Kildeorden, strømdata, pileplacering, 168-timersopsamling og 100 %-gate ændres ikke.
- Commit `286ea9e5` bestod den fulde friske produktionskæde i `#32165688946` og den efterfølgende fulde kørsel `#32165969786`. Direkte liveaudit af `rr-20260818173528-210` kontrollerede alle 673 dele og 43.064 prognose-/jagtformstimer med nul lokale anker-, vinder/navn/score-, retning-, pil/grid-, provenance-, kildeklasse- eller afstandsfejl; manifestets byteantal og SHA-256 matcher.

## 2026-08-18 – ejer godkender kontrolleret live-strøm og auditerbar rollback

- Ejeren præciserede, at siden ikke er offentlig i udviklingsfasen. Gyldige Copernicus-/regionalproxydata inklusive U/V og nye strømpile må derfor gå online; kun loginoplysningerne er hemmelige. Det naturlige 168-timersbevis køres i den virkelige runtime i stedet for som syv dages spøgelsestest.
- Kandidaten bygger en separat online syvdøgnshistorik fra de private caches efter central geometri/DMI og før score. DMI er førstevalg; Baltic, AMM15 og de otte godkendte Limfjordsproxyer kan kun udfylde en manglende eksakt time med fuld celle-, lag-, afstands- og kildeproveniens.
- Score, detaljepakke og kort bruger samme U/V-post. Copernicus-/proxypile accepteres kun ved den faktiske kildecelle; et vandpunkt, en anden time eller en for fjern celle giver ingen verificeret pil.
- En versionsstyret kontrol har normal `controlled-live` med præcis 673/673 og nødtilstanden `dmi-only-rollback`. Nødtilstanden fjerner supplementet fra score/pile og mærker strøm som `missing`, men bevarer friske øvrige prognoser og må aldrig rapportere falsk fulddækning.
- Målrettede lokale regressioner for online U/V uden credentials, DMI-first, eksakt tid, afstand, pilcelle, 100 %-gate, rollback, workflowrækkefølge og null-safety består.
- Commit `161ba79e` blev fast-forwardet til `main`. `#32156725504` byggede historikken og nåede 665/673 (622 DMI + 43 Copernicus), hvorefter 100 %-gaten stoppede release. Support `#3125` viste 40 gyldige prøver på alle otte regionalproxyer; livebyggeren havde afvist dem på et ikke-kanonisk anchorfelt. Kontrollen er rettet til shadow-cachens faktiske identitetsfelter og skal nu genbevises centralt.
- Commit `5a7780e4` rettede ankerkontrakten og blev fast-forwardet til `main`. `#32158041877`/support `#3127` bestod derefter hele produktionskæden med 622 DMI + 43 Copernicus + 8 regionalproxy = 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy.
- Det første aktiveringsdatasæt `rr-20260818160548-210` blev direkte verificeret på GitHub Pages. `public-conditions.json` matchede manifestet byte- og SHA-256-præcist (`aa05a23795a4a1b232ef30274746acaad373fb9512572c1a8d4ec2b1d5e67ca3`). Første livehistorik havde 1.915 poster, 633 dele og syv tider uden credentials. Syvdøgnseftermålingen er dermed startet på den fungerende side; rollback forbliver versionsstyret og klar.
- Evidenscommittets efterkontrol `#32160090899`/support `#3129` bestod igen fuld validering, releasegate, Supabase, Pages og 673/673. Dets tidsbestemte datasæt `rr-20260818162702-210` og offentlige historik matchede supportartifactet byte- og hashpræcist. Det er et rutinebevis; et skiftende datasæt-ID må ikke gøres til permanent “current truth”.

## 2026-08-18 – privat supplerende strømkandidat og afgrænset Limfjordsproxy

- Ejerens fulde centrale punktgennemgang gav i #3079 622/673 lokale DMI-strømpunkter; alle 51 mangler er eftermålt.
- Direkte officiel kildetest fandt 39/51 mangler med Baltic U/V inden for 5 km og fire yderligere med AMM15. To AMM15-punkter er eksplicit `surface-only`. Resultatet er endnu ikke en flerruns produktionsgaranti.
- Ejeren oprettede de to Copernicus Actions-secrets. Kun navn og oprettelsestid blev kontrolleret; værdier blev ikke læst.
- En separat privat pilotkandidat bruger Toolbox, friske centrale kystdele, samme-celle/-tid/-lag U/V, nærmeste vandkolonne før dybeste fælles lag, nul interpolation, 168 timers retention og supportoutput uden rå vektorer eller credentials.
- DEC-0041 indfører efter fremtidige aktiveringsgates en eksplicit regional `dkss_lf`-proxy for Hanklit, Harbo Odde, Knudeklinter, Stenerodde, Aggersborgrimme, Løgstør, Petersborg og `DK-B05-20`. Højeste tilladte afstand er 15 km; målte afstande var 5,416–12,110 km. Alle andre dele beholder 5-km-grænsen.
- Lokale deterministiske tests og policytest mod #3079 består. Intet er endnu aktivt, deployet eller produktionsverificeret.
- Commit `0c010090` blev fast-forwardet til `main`. Første autentificerede private run `#32129799346` bestod på 1:59 og bekræftede præcis 39 Baltic + 4 AMM15 blandt DMI's 51 huller; alle 43 havde et dybere fælles lag ved 11:00Z. Kombineret potentiale er dermed 665/673, og de sidste otte er præcis allowlisten.
- Pushrun `#32129778162` stoppede korrekt uden deploy på den eksisterende 622/673-gate. En privat timeplan ved minut 17 samler nu højst syv døgns Copernicus-bevis; aktiv integration afventer fortsat flerruns og fulde gates.
- Commit `406353be` gjorde cachehistorikken sikkert aggregerbar uden rå U/V. Gentaget run `#32131021153` bestod, gendannede og deduplikerede 629 records, rapporterede 625 unikke mål/629 mål-kildepar og nul grid-/lagskift. Begge autentificerede runs lå ved samme 11:00Z-time, så et nyt tidsbevis og første cron-event afventer fortsat.
- Commit `cda7358b` er på `main`. Central `#32134021410`/artifact `#3094` hydrerede de friske centrale punkter og samlede 32 private `dkss_lf`-prøver til alle otte regionale allowlistdele ved fire forecasttider. Afstandene var 5,416–12,110 km; rapporten var råvektorfri, og `.cache` blev ikke publiceret.
- Kørslens releasekæde stoppede sikkert før Supabase og Pages på én mekanisk regression: workflowets User-Agent var løftet til 4.0.232, mens testen stadig forventede 4.0.229. Testen bruger nu `package.json`-versionen; offentlig runtime, 622/673-gate, pile og RavScore er fortsat uændrede.
- Pushrun `#32135079819` passerede den mekaniske testrettelse og stoppede derefter korrekt på den uændrede 622/673-audit uden deploy.
- Første cron-run `#32134686185` var grønt og hentede et nyt Copernicus-tidspunkt 12:00Z, men 11:00Z-råcachen var væk. Cache-API'en viste cirka 10,2 GB aktive caches, især fire samtidige DMI-GRIB-generationer på cirka 2,5 GB; LRU-fortrængning er dermed bevist.
- En råcache-artifact blev overvejet og forkastet, fordi repositoryet er offentligt. Den valgte løsning holder i stedet den allerede private cache nyligt anvendt med en credentialfri restore hvert tiende minut, nul upload og nul recordlogning. Eksakt manuel UTC-backfill kan reparere 11:00Z efter keepalive-bevis.
- Keepalive `#32136328681` ramte den bevarede 12:00Z-cache. Den ene kontrollerede backfill `#32136391556` genhentede 11:00Z og samlede 1.258 private records ved to tider, 625 unikke mål og 629 mål/kildepar med nul gitter-/lagskift og nul rå/credentiallæk i supportoutput. `#32136642330` ramte bagefter den nye backfill-cache. Aktiv integration er fortsat ikke autoriseret.
- En slutkontrol mod ejerens ord “vi beholder 100 % dækningskravet” fandt, at den faktiske rumlige audit stadig brugte den historiske 95 %-formel og derfor ville acceptere 640/673. Gaten kræver nu dynamisk alle aktive dele, aktuelt 673/673. En særskilt regression forbyder 95 %-formlen; replay af #3094 fejler korrekt på 622/673 med “alle 673 kræves”.
- Commit `9e2164b8` og central `#32139054129` beviser den nye gate i den fulde kæde: regressionen er grøn, auditten fejler på 622/673 med krav om alle 673, og releasegate, Supabase-sync og Pages er sprunget over.
- GitHubs automatiske keepalive leverede intet event før samme runs 2,704-GiB DMI-save. Copernicus-cachen blev igen fortrængt, og manuel `#32139755594` fandt den manglende. Cacheindekset havde tre store DMI-cacher og 8,126 GiB efter eviction. Produktionsjobbet gendanner derfor restore-only Copernicus-cachen før DMI-cachearbejdet; en statisk fuld-validate-regression forbyder save/artifact/credentials/rå U/V i dette blok.
- #32140001424/#32140470201 genopbyggede 11/12 UTC. Det sidste rensede artifact har 1.258 records, to tider, 625 unikke mål, 629 mål/kildepar og nul grid-/lagskift; ingen rå U/V eller credentialnavne findes i supportoutputtet.
- `b6cf0383`/#32140865173 gendannede præcis den cache før DMI, gemte derefter en ny 2.905.014.468-byte DMI-cache og efterlod Copernicus-cachen intakt. Begge nye regressioner bestod centralt, hvorefter fulddækningsgaten stoppede på 622/673 uden Supabase/Pages. #32141443152 ramte og validerede samme cache efter DMI-save uden recordlog.
- Manuel aktuel-time-pilot #32141772134 tilføjede 13:00Z efter DMI-beviset. Det sikre artifact viser 1.887 records ved 11/12/13 UTC, 625 mål, 629 mål/kildepar og nul grid-/lagskift; `scoreImpact=false`, `publicRuntime=false` og nul rå U/V/credentialmatches.
- Parallelt roadmaparbejde gjorde 168-timersgrænsen til en normal releasekontrakt. En ren regression bevarer den præcise grænsetime, fjerner ældre/fremtidige og beskadigede restoreposter, deduplikerer og kræver fail-closed gyldigt lokalt samme-tid/celle/lag-U/V-bevis for nye poster. Naturlig syvdøgnsdrift er fortsat et særskilt åbent bevis.
- `7f22e8e1`/`#32143798560` CI-verificerede retentiontesten efter frisk central hydrering og DMI-bygning. 100 %-kontrakten bestod, faktiske 622/673 stoppede release/deploy, og tre-timers-Copernicus-cachen fandtes fortsat efter cachearbejdet.
- GitHubs native timeplan var aktiv, men runhistorikken havde kun ét forsinket schedule-event og ingen efterfølgende timer. Det er samme platformrisiko, som tidligere førte produktionen over på ekstern `workflow_dispatch`.
- Keepalive bruger nu `workflow_run: requested` fra den eksternt startede produktionskørsel som heartbeat. Den gendanner cachen read-only og validerer schema, 168 timer, score-neutralitet og aktuel UTC-time uden rå U/V-log. Ved manglende time dispatcher et separat to-minutters job den eksisterende private pilot; kun dette job har `actions: write`, og ingen hjælpekæde kan gemme cache, uploade artifact eller deploye. Lokale heartbeat-, pilot- og workflowtests består; central automatisk kæde afventer.
- Forsinket schedule-run `#32146584311` tilføjede 14:00Z og gav 2.516 private records ved fire tider, 625 mål, 629 mål/kildepar og nul grid-/lagskift eller supportlæk. Det første automatiske heartbeat `#32146699458` ventede på piloten, gendannede den nye cache, bestod kontrollen og sprang dispatchjobbet over, fordi aktuel time allerede fandtes. Central manglende-time-dispatch afventer næste UTC-time.
- Pushrun `#32146695718` bekræftede heartbeatregressionen sammen med cachebeskyttelse, 168-timers-retention og dynamisk 673/673-kontrakt i den fulde centrale validering. Den faktiske dækning var fortsat 622/673, så releasegate, Supabase og Pages blev korrekt sprunget over.
- Dubletkontrollen er lokalt skærpet fra ren timeidentitet til time + komplet recordmanifest + deterministisk SHA-256 af alle aktuelt centralt hydrerede del-ID'er, parentzoner og vandpunkter. En legacycache eller et flyttet punkt kan derfor ikke undertrykke en frisk indsamling; genindsamling erstatter hele timen. Pilot-, retention- og heartbeatregressionerne består lokalt, mens central cachemigration afventer push.
- Central `#32149556595` fandt den gamle cache uden manifest og gennemførte automatisk dispatch. Den startede `#32149592195` hydrerede alle 673 aktuelle punkter, genindsamlede 14 UTC, bevarede fire tider/2.516 records og gemte `copernicus-current-shadow-v1-32149592195-1`; supportartifactet har fingeraftryk, nul grid-/lagskift og ingen rå U/V/credentials. Normal `#32149552657` bestod de nye regressioner og stoppede fail-closed på 622/673 uden releasegate, Supabase eller Pages.
- `#32150318931` gendannede derefter den nye manifestcache og sprang dispatchjobbet over. Begge geometribundne dubletgrene er således centralt bevist.

## 2026-08-16 – 4.0.231 binder den lokale pil til den viste scoretime

- #31930644562/#2875 genopbyggede IDW under semantik v3 og stoppede korrekt ved 114/210 hovedzoner og 414/673 lokale dele uden deploy. #31930976129/#2876 genopbyggede derefter NSBS og nåede 182/210 samt 574/673; Limfjord afventer.
- Havknude er frisk artefaktbevist: 38 native tider fra `dkss_nsbs`, afstand 2,80363 km, semantik v3 og dybeste gyldige lag i den valgte kolonne. Skalarfelternes fortsatte IDW-valg blokerer ikke længere strømmen.
- Den strenge audit fandt én ny, reel afvigelse. `PART::dk-b04-12-owner-approved-01` viste en verificeret score fra kl. 12, men pilens flowpunkt var tidligere beregnet ved byggetiden kl. 06:25 uden strøm og faldt derfor tilbage til vandpunktet.
- 4.0.231 vælger den lokale scorepost først og beregner derefter pilens DMI-celle ved præcis scoretiden. Et tidsligt datagab er tilføjet zoom-/pilregressionen. Værdi, score, lag, geometri og afstandsgrænse er uændrede.
- Den private syvdøgnscache fortsatte til cursor 300, 1.394 prøver, 630 ankre og 239 dele med `scoreImpact=false` og `publicRuntime=false`. Ingen rå U/V findes i ejeroversigten.
- Næste trin er lokale gates, push, Limfjordsgenopbygning og frisk nul-mismatch-audit. Den geografiske gate sænkes ikke.

## 2026-08-16 – 4.0.230 adskiller strøm fra skalare havmodelvalg

- #31929171918/#2872 gav et systemisk rodårsagsbevis: den private audit fandt et komplet `dkss_nsbs`-U/V-par 2,804 km fra Havknudes centrale vandpunkt, mens offentlig v2-runtime var `missing`.
- Ét globalt `marineSelection` havde valgt et `dkss_idw`-skalarpunkt 5,131 km væk på grund af kysttypeprioritet. Det relevante skalarvalg blokerede dermed fysisk forkert den nærmere strømkolonne.
- 4.0.230 vælger strøm pr. native tid på tværs af alle aktive DKSS-collections, nærmeste U/V-kolonne først og dybeste lag i samme kolonne bagefter. Skalarfelter bevarer særskilt modelvalg og kan ikke rydde eller blokere strøm.
- Parser v18 og strømsemantik v3 genbehandler gamle current-assets. V2-strøm invalideres selektivt; skalarfelter bevares. Forecastet interpolerer fortsat ikke over collection-, modelrun-, celle-, lag- eller samplingpunktskift.
- En ny regression bruger Havknudes målte koordinater og afstande og beviser korrekt NSBS-valg, afvisning af fjernere current og sikker cachemigration. De berørte målrettede tests består.
- #2872 fortsatte privat rotation til cursor 240 med 873 prøver/469 ankre/179 dele. 36 af 77 offentlige mangler var besøgt: én pipelinefejl ≤5 km, fire ved 5–6 km, fem ved 6–8 km, 23 over 8 km og tre uden observeret U/V; 41 afventede rotation. Ejeroversigten gemmer ingen rå U/V-værdier.
- RavScore, punkter, 5-km-grænse og geografisk gate er uændrede. Versionen afventer fuld lokal validering og frisk produktion; den er ikke deployet eller produktionsverificeret.

## 2026-08-16 – 4.0.229 korrekt strømposition, bundlag og syvdøgnscache

- Ejeren krævede, at pile over vand både står fysisk korrekt og bruger en fagligt relevant strøm. Den tidligere parser valgte dybeste lag på tværs af koordinater og kunne flytte aktiv strøm 12–24 km væk.
- Semantik v2 vælger nærmeste fælles DMI-U/V-vandkolonne først og derefter dybeste gyldige lag i samme kolonne. 0–3 km foretrækkes, 3–5 km accepteres, og alt længere væk bliver `missing` uden pil.
- Tidspunkt, lag, celle og samplingpunkt følger nu forecast, provenance, historik, score og pil. Interpolation over lag-/celle-/runskift er forbudt; ForecastEDR-/Open-Meteo-/fallbackstrøm uden samme bevis fjernes før aktiv anvendelse.
- En privat, score-neutral 168-timers cache opsamler roterende 0/5/15-km-transekter og flere lag. DEC-0040 og DEC-0029 fastholder fremtidens transportkæde: ydre tilførsel → overgang mod kyst → lokal bundnær levering, med lag, persistens, tidsforsinkelse og kontrol mod dobbelttælling.
- #2846 fandt en forældet antagelse om ét fast lag pr. serie. #2850 fandt en forældet forecastfixture. Begge blev rettet uden at ændre strømdata eller gates.
- #2853–#2855 gentager 187/210 verificerede hovedzoner og 596/673 lokale kystdele. #2855 har 20.924 verificerede timer og 3.856 fail-closed `non-dmi-current`-timer. Der er ingen kendt pil/grid-fejl i verificerede poster.
- De 23 hovedzoner og 77 lokale dele uden fælles U/V inden for 5 km står uden strøm og pil. Den geografiske gate er ikke sænket, så Supabase og Pages blev korrekt sprunget over. 4.0.229 er ikke deployet eller produktionsverificeret.
- Den private cache har 491 prøver for 153 ankre/58 dele; #2855 havde uændrede DKSS-samlinger og tilføjede derfor ingen dubletter. Den præcise handlingsliste er gemt i `docs/rdks/40_KNOWN_ISSUES/CURRENT-COVERAGE-4.0.229.md`.
- At #2855 heller ikke flyttede videre til nye dele afslørede en separat rotationsfejl: cursoren avancerede kun ved behandling af et nyt marineasset. Med 15 dele pr. modelgeneration ville hele landet ikke kunne gennemløbes inden for syv døgn.
- Første replayrettelse blev kørt i #2859, men gav nul replayassets og beholdt cursor 90 samt 491 prøver/58 dele. Råcacheauditten startede med 94 filer/3,98 GB og sluttede efter LRU med 50 filer/3,83 GB. Den fælles cache havde ingen tidsrelevant marine replayfil tilbage. Direkte DMI-STAC-kontrol viste et stabilt objekt-href uden query; URL-skift var derfor ikke rodårsagen.
- Efterrettelsen registrerer collection/modelrun/gyldighed i et privat manifest og prioriterer en tidsrelevant +0–12 timers marine fil pr. modelområde før LRU under det hårde 4 GB-loft. Objektsti-baseret cache-ID er kun fremtidssikring mod eventuelle querycredentials. Kun de 15 private forskningsdele og et tomt scratch-output behandles; offentlig DMI har første ret til budgettet.
- #2863 gav bootstrapbeviset: tre filer/29.783.658 byte, tre komplette U/V-assets, cursor 90→105, 58→73 dele og 491→531 prøver. #2864 gav genbrugsbeviset: samme tre assets, nul download, cursor 105→120, 73→88 dele og 531→573 prøver. Begge havde `reason=completed`, ingen fejl, `scoreImpact=false`, `publicRuntime=false`; #2864 beholdt 9 råfiler/3.755.913.193 byte uden pruning. 45 normale 15-minutters kørsler dækker én 673-dels rotation, og bootstrap/genbrug er nu CI-verificeret.
- #2866 fortsatte samme sikre genbrug til cursor 150, 118 besøgte dele og 667 prøver; tre replayassets gav 38 nye prøver uden download eller cachepruning. Den geografiske gate var fortsat 187/210 og 596/673 og stoppede før Supabase/Pages.
- For at adskille dårlige punkter fra DMI-modelhuller registrerer rotationen nu kun koordinat, afstand og lagmetadata til nærmeste eksakte fælles U/V-kolonne, også over 5 km. Fjerne U/V-værdier gemmes ikke. En support-only ejeroversigt klassificerer ≤5 km-pipelinehul, 5–6 km nær-tærskel til manuelt geometrireview, 6–8 km modelhul og >8 km strukturelt modelhul uden automatisk punktflytning eller ændring af pile/score.
- #31928382898/#2869 beviste målingen på rigtige DKSS-filer: cursor 195, 755 prøver/157 dele, 15 nye prøver og tre cachede replayassets. Fire af de 15 besøgte dele havde U/V inden for 5 km; de 11 aktuelle mangler fordelte sig på 2 ved 5,37–5,66 km, 4 ved 7,80–7,93 km og 5 ved 8,26–12,11 km. Ejerfilen havde nul `uMps`/`vMps`; offentlig dækning forblev 187/210 og 596/673, og deploy stoppede korrekt.

## 2026-08-16 – 4.0.228 flere verificerede kortpile ved indzoomning

- Ejeren fortsætter den manuelle land-/vandpunktgennemgang og bad om, at uafhængigt roadmaparbejde fortsætter sideløbende.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil flere naturlige data er opsamlet. De eksisterende data- og releasegates samt den automatiske historikopsamling fortsætter.
- Det aktive krav REQ-MAP-ARROWS-ZOOM-001 er implementeret: landsoversigten bevarer hovedzonepilene, mens zoomniveau 9 og nærmere kan vise lokale kystdeles selvstændige DMI-gitterpile.
- Hver lokal strømpil kræver strøm-U og strøm-V på præcis samme gitterkoordinat; hver lokal vindpil kræver tilsvarende vind-U og vind-V. Fallbackankre, ufuldstændig provenance og kunstige kopier giver ingen ekstra pil.
- Vindproveniensen dækker både det primære HARMONIE-U/V-par og DKSS-havmodellens `wind-tail`-U/V-par. Runtime mærker dem særskilt og bruger kun den serie, forecastet faktisk valgte.
- Den fulde detaljepakke fører alle lokale flowpunkter til browseren. Pilelaget opdateres automatisk, når pakken ankommer, og ved efterfølgende zoom eller kortflytning.
- Ændringen påvirker kun kortvisningen. DMI-værdier, kilder, forecast, RavScore, historik, zoner, kyster og land-/vandpunkter er uændrede.
- #31911509244/#2830 forsøg 1 stoppede korrekt ved 629/673 verificerede lokale strømpunkter efter delvis `dkss_lf`. Uændret forsøg 2 nåede 670/673, bestod fuld `validate` og releasegate, men stoppede før Pages på gentaget Supabase `57014` efter én tilladt retry.
- Artifactaudit af forsøg 2 fandt 670 ægte lokale strømpunkter, men nul ægte lokale vindpunkter i detaljepakken. Rodårsagen var manglende transport af `wind-tail-u-10m/v-10m`; read-only cache-replay viste 670/673 eksakte par på 507 unikke vindgitterpunkter. Fejlen blev rettet og regressionstestet før den næste fulde produktion.
- #31913779486/#2835 på commit `93b8c0216821d02bf913f7aab369406ba2365fe9` bestod derefter central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync og Pages.
- Produktionsdatasæt `rr-20260815231859-210` har 670/673 verificerede/offentliggjorte dele mod det daværende krav 640. Alle 670 har eksakte strøm- og vindgitterpunkter uden U/V-mismatch, fordelt på 461 unikke strøm- og 544 unikke vindpunkter. Artifact- og livehashes matcher manifestet. 4.0.232 erstatter senere denne 95 %-gate for alle nye releases.
- Direkte browserkontrol viste 54 pile på oversigten og 87 efter to zoomtrin uden konsolfejl. 4.0.228 er produktionsverificeret.

## 2026-08-15 – 4.0.227 vejledende lokal kystvinkel

- Ejeren viste, at admin ved Kalø og Bornholm kunne gemme punktkladder, men ikke aktivere **Godkend og gem centralt**, selv efter alle tre zonebekræftelser.
- Rodårsagen var `pairGeometryCheck`, som gjorde mere end 20 graders afvigelse mod ét nærmeste kystsegment til en hård fejl for hele zonen.
- Ved Svansodde blev den cirka 461 meter lange ejerplacerede linje sammenlignet med et cirka 15 meter langt mikrostykke og fik 50 graders afvigelse. På en bugtet kyst kan mikrotangenten ikke overtrumfe det optiske helhedsindtryk.
- Ejerbeslutningen i DEC-0038 gør vinklen vejledende. Reelle punkt-/afstand-/kystkryds-/sidefejl, de tre bekræftelser, central readback, DMI-gate og releasegate bevares.
- Admin forklarer nu ved knappen, om der findes en reel blokering, eller om den viste vinkel kun er en ikke-blokerende advarsel.
- Ingen eksisterende geometri, punktplacering, DMI-data eller RavScore ændres automatisk.
- #31908498204/#2824 på commit `6e920c297ef58f997ae95b3b6da16adfdf66bfe6` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- Artifactets releasegate står `passed`. Datasæt `rr-20260815210805-210` er komplet med 210 zoner og 673 kyststrækninger; de to SHA-256-kontroller matcher manifestet.
- Direkte Pages-kontrol viser version 4.0.227 og den deployede `valid:true, warning:true`-regel. Ejerteksten er til stede, og den gamle hårde vinkelblokering er væk.

## 2026-08-15 – 4.0.226 Supabase statement-timeout

- #31904109833/#2814 forsøg 1 gennemførte frisk DMI, fuld `validate`, releasegate, vejrcache og supportartifact, men stoppede før Pages ved HTTP 500/PostgreSQL `57014` på `runtime-diagnostics`-upserten.
- Payloaden er cirka 17,7 MB. Samme idempotente skrivning lykkedes i #2810/#2812 på cirka 11,5 sekunder og i uændret #2814 forsøg 2 på cirka 10,3 sekunder; rerunnen gennemførte Supabase og Pages.
- 4.0.226 tilføjer højst én genprøvning kun for eksakt `500/57014`. En anden timeout og alle andre fejl stopper fortsat releasekæden fail-closed.
- #31905211459/#2816 på commit `2dc8253a4c7f77449d6f92dcc9c996f211f033d2` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy. `runtime-diagnostics` lykkedes i første forsøg på cirka 11,5 sekunder; timeoutgrenen er bevist af regressionen, ikke ved en fremprovokeret produktionsfejl.
- Artifact og direkte Pages-kontrol viser version 4.0.226 og datasæt `rr-20260815195620-210`: 22.890/22.890 komplette DMI-vandstandstimer, 210/210 komplette aktuelle 19:00-rækker og match på begge manifesthashes.
- Sundhedsstatus var `degraded` ved et supplerende DMI EDR-kald med HTTP 429, men `userForecastStatus` var `ok`; det kendte Feggesund-bølgegab holder brugerfuldstændigheden på 209/210. Strøm og vandstand var 210/210.
- Ingen timeoutgrænse, payload, adminversionering, DMI, vejrdata, RavScore, historik eller geometri ændres. 4.0.226 er produktionsverificeret.

## 2026-08-15 – 4.0.225 aktuel klokktime i vandstandsrouting

- #2801 havde 210 udokumenterede DMI-vandstandstimer ved 17:00 UTC efter generering 17:02 UTC; #2800 før timegrænsen havde nul.
- Vandstandskildeindekset startede ved næste hele time og kunne derfor ikke route den offentlige series bevarede aktuelle time.
- 4.0.225 adskiller routingvinduets start fra faktisk genereringstid. Regressionen kontrollerer sammensat collection, model-run og forecastalder ved `HH:02`.
- Ingen vandstandsværdi, kilde, vægt, fallback, score, historik eller geometri er ændret.
- #31902872631/#2810 bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy på commit `18499eb10a45f561d4440a7944b34725049cf34d`.
- Supportartifactets datasæt `rr-20260815190651-210` har 22.890/22.890 routede DMI-vandstandstimer med fuld provenance og 210/210 komplette aktuelle 19:00-rækker. Manifesthashes matcher, og direkte Pages-kontrol efter #2810 viste 4.0.225 og samme datasæt.
- #31903561423/#2812 gentog alle fulde gates og deploy efter evidenscommitten. Datasæt `rr-20260815192135-210` gentager 22.890/22.890 og 210/210, matcher begge manifesthashes live og havde `ok` sundheds-, DMI-dæknings- og API-status. Det separate kendte Feggesund-bølgegab holder fortsat brugerfuldstændigheden på 209/210.

## 2026-08-15 – 4.0.224 sand vandstandskilde efter routing

- #2795 viste én udokumenteret aktuel DMI-vandstandstime pr. zone og afslørede, at hele den routede serie kunne beholde zonens tidligere collectionmærke efter værdien var erstattet.
- 87 zoner bruger faktisk punkter fra to DKSS-modelområder; et enkelt gammelt modelnavn var derfor utilstrækkeligt.
- 4.0.224 bevarer kildepunkternes faktiske collection(s), model-run, native tider og source keys gennem den eksisterende routing uden at ændre tal, vægte, fallback, score eller geometri.
- #31895640397 bestod fuld validate, releasegate, Supabase og Pages. #2797 har 23.310/23.310 routede timer med fuld modelidentitet; offentlig kontrol viser 4.0.224, datasæt `rr-20260815163132-210` og 210 zoner.

## 2026-08-15 – naturlig WAM-/DKSS-rotation og fortsat historik

- #31894320128 bestod central hydrering, frisk DMI, fuld validering, releasegate, Supabase og Pages; supportartifact #2794 indeholder datasæt `rr-20260815160400-210`.
- DMI's nye WAM-/DKSS-12 UTC-kandidater blev opdaget, men de komplette 00/06 UTC-serier blev korrekt bevaret over 96-timersgrænsen med cirka 107,9/109,9 timers resterende hale.
- Alle 210 zoner har verificeret aktuel strøm. Der var nul `CURRENT_ANCHOR_PROTECTED`, nul valgte vandstandskilder med warning/critical og nul nye alarmnotifikationer.
- Den verificerede strømhistorik voksede til cirka 4,27–39,99 timer. Ingen zone har endnu nået det bindende 72-timers exitkriterium, og intet er bagudfyldt.

## 2026-08-15 – 4.0.217 strømhistorikkens verifikationsmærke

- Read-only audit af #2750 viste 142 prøver/35,1 timer i alle 210 zoner, men verificeret strøm var fordelt 75×0, 125×1 og 10×101.
- Aktuel strøm havde et tidsmatchende DMI-U/V-bevis i 183/210 zoner. De resterende 27 havde kun en fjern `dkss_idw`-hale og blev korrekt afvist som `no-time-match`. Den særskilte historikfejl var, at `enrich-current-provenance` kun rettede den aktuelle prøve i `samples24h`, mens næste merge autoritativt læste `samples72h`.
- 4.0.217 skriver samme eksakte aktuelle verifikationsresultat til begge vinduer. Ingen gammel prøve genfortolkes, og den aktive score ændres ikke.
- #31882866344 bestod den fulde produktionskæde og deploy. Første datasæt `rr-20260815114746-210` har 145 prøver/35,719 timer i alle 210 zoner; fordelingen voksede til 102×1, 98×2 og 10×102 verificerede 72-timersprøver. 183 aktuelle tidsmatch blev bevaret som verificerede, og de 27 uden tidsmatch forblev uverificerede.

## 2026-08-15 – 4.0.216 produktionsverificeret

- Første pushkørsel #31880755907 stoppede korrekt før deploy, fordi en ældre performance-regressionstest fortsat læste femdøgnstimer fra den nye startpakke. Testen blev flyttet til den integritetsbundne detaljepakke; produktionslogik og gates blev ikke ændret.
- #31880984004 bestod derefter fuld central 210-zonehydrering, frisk vejrbygning, `validate`, releasegate, Supabase/artifact og Pages-deploy.
- Direkte kontrol viste offentlig 4.0.216, datasæt `rr-20260815110313-210`, startpakke på 2.534.969 bytes og komplet detaljepakke på 24.748.808 bytes.

## 2026-08-15 – 4.0.216 progressiv offentlig runtime

- Deployet payload blev målt til 27,11 MB: cirka 20 MB lokale kystdelsdata og 6,88 MB hovedzoneprognoser.
- Offentlig runtime er delt i en startpakke med aktuelle forhold/historik/aktuelle lokale vindere og en efterfølgende komplet detaljepakke.
- Dataset-id-værn, fail-open for aktuelle forhold og målrettede regressioner er tilføjet uden ændring af RavScore, data eller missing-regler.
- Frisk lokal 210-zonebrowsertest viste kort/rangliste på cirka 0,7 sekund, komplet efterfølgende femdøgnsvisning og nul browserfejl.
- Repositoryets historiske zoneregister indeholder fortsat en lokal ekstra `DK-B02-14`; CI skal anvende central adminhydrering/tombstones før den fulde gate og bevise den autoritative 210-zonebestand.

## 2026-08-15 – P1-kildeskift målt mod normal timevariation

- Den skrivebeskyttede komponentaudit måler nu overgangspar, cirkulære retningsspring og almindelige same-source nabotimer.
- Vandstandens overgang er ikke værre end normal timevariation; vind, bølger, strøm og vandtemperatur har væsentligt større grænsespring.
- Fallbackstrøm forbliver uverificeret, temperatur forbliver score-neutral, og permanente grænser afventer flere uafhængige kørsler.

## 2026-08-15 – samlet P1-komponentmatrix på 4.0.214

- #31874335007 bestod hele produktionskæden og leverede `rr-20260815083802-210`.
- En ny skrivebeskyttet audit målte vind, bølger, strøm, vandstand og vandtemperatur på samme 210×118-timers grundlag.
- Matricen dokumenterer komplet vind, ét fuldt bølgehul ved Feggesund, 15 enkelttime-bølgehuller og en fælles 17-timers marinehale i otte Limfjordszoner.
- Regressionsplanen er dokumenteret uden ændring af kilde, fallback eller RavScore.

## 2026-08-15 – 4.0.214 fail-closed temperaturcache

- 4.0.213-run #31873118298 var grønt, men støttepakken afslørede ældre temperaturpunkter uden vertikal provenance.
- Parser 16 kasserer disse temperaturpunkter og lader DKSS-rotationen genopbygge eksplicit `surface:0`.
- Øvrige vejrkomponenter og rå 72-timershistorik bevares.

## 2026-08-15 – 4.0.213 entydig DMI-havoverfladetemperatur

- Supportartifactet fra #31870747677 dokumenterede DMI-parameter 80 ved både `surface:0` og mange dybdelag i alle tre DKSS-collections.
- Den tidligere skalarparser kunne overskrive overfladetemperaturen med et senere dybdelag uden at gemme lagidentitet.
- 4.0.213 accepterer kun `surface:0`, gemmer laget i grid-/timeproveniens og hæver parsergenerationen til 15 for kontrolleret genopbygning.
- Datakilde, fallbackprioritet, RavScore, state og historikvinduer er uændrede. Lokal målrettet validering består; frisk fuld CI/produktion afventes.

## 2026-08-15 – 4.0.210 sammenhængende DMI-strømdækning

- 4.0.209-artifactet viste 125 hovedzoner med kun to sene strømtrin, 75 med syv sene trin og 10 med fuld serie fra nutiden.
- Schedulerens horisontsmål kontrollerede kun seriens slutpunkt. En fjern hale kunne derfor blokere genhentning trods et fire døgn langt hul ved nutiden.
- Dækning kræver nu en sammenhængende serie fra byggetiden. På det faktiske artifact identificeres 200 genhentningskrævende zoner, og `dkss_idw`/`dkss_nsbs` prioriteres først.
- Ingen datakilde, fallback eller score ændres. Produktion og 72 timers eftermåling mangler.

## 2026-08-15 – 4.0.208 lokal snapshotdiagnose

- En systemisk sammenligning viste, at de tre Vadehavszoner ikke fejlede i produktion. Deployet `zones.geojson` og `public-conditions.json` har 210/210 identiske zone-ID'er, inklusive `DK-B04-12`–`DK-B04-14` med vejrdata.
- Det lokale symptom kom fra et 31. juli-snapshot på 209 historiske vejrzoner sammenholdt med et råt repositoryregister før central adminhydrering og tombstones.
- `validate:data` stopper fortsat fail-closed, men klassificerer nu et udløbet snapshot særskilt fra et aktuelt dækningsbrud. En ny read-only kommando kontrollerer den deployede bestand uden at ændre data.
- Den historiske 211-formulering er markeret erstattet af den effektive centrale bestand på 210 efter sletning af Fejø/Femø og Havnø/Mariager Fjord øst.
- Ingen geometri, DMI-kilde, score eller offentlig funktion er ændret.
- #31848912461 produktionsverificerede 4.0.208 på commit `7a3382f200a72b702d814ba4d8ca205dc4523369`: central adminhydrering/tombstones, frisk vejrbygning, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy bestod. Direkte deployaudit viste datasæt `rr-20260814230422-210`, 210/210 og alle tre Vadehavszoner med vejrdata.

## 2026-08-14 – 4.0.206 produktions- og privatverificeret

- 4.0.205 blev produktionsverificeret i #31822335540; målrettet central roundtrip/rollback bestod i #31822371489.
- Privat #31822748625 bestod hele den nationale hovedkæde og central create/read/update/delete/rollback. Kørslens eneste efterfølgende fejl var fallbackbyggerens manglende outputmappe på en ren runner.
- Fallbackbyggeren opretter nu alle outputmapper og kan genbruges efter tidligere aktivering ved at anvende centralt aktive naborester med deres eksakte punktpar og retning.
- ESA WorldCover 10 m blev genkørt på den aktuelle 17-dels kandidat med uændrede fire sikre rettelser og to tvivlstilfælde. Ren lokal slutkontrol består med nul overlap, 2/2 ejerskabsflytninger og 9/9 erstatninger.
- Produktion #31831068809 genbrugte den kompatible progressive DMI-cache, færdiggjorde to modelsamlinger og bestod frisk vejr, fuld validering, releasegate, Supabase, artifact og deploy. Live Pages viser 4.0.206, 210 zoner og alle tre nye Vadehavszoner.
- Privat #31829349458 bestod hele den nationale kæde gennem fallback-DMI, central create/read/update/delete/rollback og begge artifacts. Ingen privat geometri blev aktiveret; det kræver fortsat særskilt ejerafgørelse.

## 2026-08-14 – 4.0.198

- #31792615992 bestod den korrigerede 210-zoneplan, officiel kildehentning, topologi, kystdele og navneaudit, men stoppede ved en isoleret historisk 208-kontrol i lokalitetsopdelingen.
- Kontrollen er samlet under den fælles 210-zonekontrakt og dækket af regressionstest. Ingen runtime- eller fagdata ændres.

## 2026-08-14 – 4.0.197

- Den første private land-/vandkørsel #31790559558 dokumenterede en separat, forældet planport: den krævede 211 effektive zoner, mens den centralt godkendte sletning af Fejø/Femø giver 210.
- Plan, topologiaudit, kystdelsbygger, stednavneaudit og deres fail-closed validatorer/tests er afstemt til 210. Historisk forældreregister og tidligere evidens på 211 omskrives ikke.
- Ændringen er ren pipelinepolitik og ændrer ikke geometri, DMI, score eller central admin-sandhed.

## 2026-08-14 – 4.0.196

- Et landsdækkende symptom i admin blev fulgt gennem generator, centrale reviews, offentlig kystdelsbygger, DMI-sampling, lokal score og forklaring. Rodårsagen var, at stednavne tidligere kunne afgøre land-/vandside; øer, forter og havnenavne kunne derfor vende et ellers vinkelret punktpar forkert.
- ESA WorldCover 2021 bruges som uafhængigt, versionsbundet sidebevis ved fire transektafstande. 434 af 673 aktive dele er verificeret, 121 er dokumenteret omvendte, og 118 er tvetydige og forbliver urørte.
- Admin viser igen den røde hav→land-retning. Retningstal er afledte og låst; godkendelse kræver, at punktlinjen krydser egen kyst, ligger på modsatte sider og er tilnærmet vinkelret.
- De 121 rettelser indføres først i den private nationale kandidat. DMI-grid, shadow-score, runtime og rollback skal være grønne før offentlig aktivering.

## 2026-08-14 – 4.0.195

- Ejerens produktionsbillede dokumenterede, at 4.0.194 ikke virkede: Rejsby var valgt i teksten, mens kortet stod på Bornholm uden vektorlag eller punkter.
- En isoleret browserharness med de aktive zone- og kystdelsdata reproducerede den konkrete Leaflet-stacktrace. Nye kort fik zonepolygonen før deres første geografiske position, så Leaflet stoppede i `_clipPoints` før resten af tegningen.
- Tegnerækkefølgen er vendt: beregn grænser, kør `fitBounds`, tegn derefter zone, kystdele og punktmarkører. Samme Rejsby-test viser korrekt Vadehavskort, 121 vektorstier, to markører og nul fejl.

## 2026-08-14 – 4.0.194 (erstattet)

- Reproduceret en kortlivscyklusfejl i land-/vandeditoren: listen kunne vise Rejsby/Ribe Vesterå, mens kortet stod på en tidligere Bornholm-zone uden valgte kystlag og punktmarkører.
- Zonevalg er gjort revisionsbundet. Tidligere forsinkede callbacks kan ikke overskrive det seneste valg; kortet invalideres, lagene bygges igen, og fokus sættes til den valgte zones dele ved hvert valg.
- Den valgte kystdel samt eksisterende land-/havpunkter bevares i editorens kort. **Vis på hovedkortet** er fjernet efter ejerbeslutning. Ingen DMI-, score- eller hovedkortlogik er ændret.

## 2026-08-12 – 4.0.192

- Ejerens land-/vandbestilling er implementeret som en samlet hovedzoneeditor: søgning viser alle aktive præcise kyststrækninger, deres geometri og individuelle land-/havpunkter.
- Markører kan trækkes eller sættes på ny. Kun verificeret central godkendelse anvendes i runtime; kladder er score-neutrale.
- DMI-sampling er flyttet fra den låste historiske punktfil til den byggede aktive kystdelskontrakt, så central adminrettelse, cachesignatur, DMI-grid, lokal score og offentlig runtime anvender samme havpunkt.
- Målrettede admin-, runtime-, DMI-cache- og schedulerregressioner består lokalt. Fuld validering, releasegate og frisk CI/produktion mangler ved dette checkpoint.

## 2026-08-12 – 4.0.186-kandidat

- Ejeren stoppede den fejlagtige udvidelse til en landsdækkende pipeline. DEC-0036 afgrænser bindende det aktive arbejde til seks navngivne fallbackzoner og det aftalte adminværktøj. Havnø/Mariager Fjord øst forbliver slettet; resten af den produktionsverificerede kyst er urørt baseline. Nye behov uden for omfanget kræver stop og udtrykkelig godkendelse før kode eller CI.
- Privat #31589831140 beviste den nationale 211-zonekæde gennem officiel kildehentning, kilde-QA og fjord-/normasker. Jobbet stoppede derefter på en historisk 208-konstant i topologiauditen. Topologiaudit, delgenerator, validatorer og regressionstests er afstemt til 211; ingen offentlig geometri blev ændret.
- Privat #31590992368 bestod videre gennem 131 fliser, topologi, dækningsaudit og delgenerator. Stednavneaudittens forældede 100-flisegate er gjort planbundet med komplet minimumsspor for alle fem stedtyper; offentlig geometri er uændret.
- Den præcise admin-kyst har fået trækbare endehåndtag og et reversibelt viskelæder. Flytning og deaktivering omfatter hele den validerede delkontrakt og central readback.
- En privat recoveryaudit forkaster de dokumenteret fejlplacerede gamle linjer som autoritet og bevarer Havnø/Mariager Fjord som slettet. Overlapgaten stoppede først 11 kopier af kyst, som allerede fandtes under andre hovedzoneejere. Den rettede plan flytter syv eksisterende dele, omplacerer to Ristinge-dele og bygger kun 12 reelt nye officielle dele til Langeland syd, Lolland vest/Albuen og Fejø/Femø. De 12 har punktpar og nul overlap mod andre aktive hovedzoner, men kandidaten kan ikke aktiveres før private ejer-, DMI-, score-, runtime- og rollbackgates.
- Efter lokal Windows-ecCodes afviste native DMI-kontrol på grund af en manglende DLL, blev kontrollen ikke omgået. Den eksisterende nationale Linux-pipeline genbygger i stedet fallbackkandidaten fra sin friske officielle kyst, gentager fail-closed ejerskabs-/overlapkontrol og validerer de 12 vandpunkter på native DMI-grid som privat artifact.
- Privat #31589561794 stoppede fail-closed ved national planlægning: central hydration havde 211 aktive zoner efter Vadehavsudvidelsen, mens konfliktpolitikken fortsat krævede 208. Den aktuelle politik er rettet til 211, og downstream-validering er gjort bestandskonsistent mellem plan, manifest, fliser, hydreret register og analyse.

## 2026-08-12 – read-only nataudit af den aktive 4.0.182-kyst
- Den produktionsverificerede, hash-låste bestand er bevaret byte-for-byte. Et nyt privat kontrolkort læser de 643 aktive dele direkte og tilbyder både samlet landsvisning og søgbar lokal visning uden mutations- eller aktiveringsvej.
- Landskortet samt lokale stikprøver ved Voerså–Sibirien og Vadehavet er åbnet og kontrolleret i browseren. Der ses ingen udenlandsk landsgeometri i oversigten; de godkendte Vadehavsforløb er til stede.
- Aktiveringskontrakten og alle 643 land-/vandpunktpar er genvalideret. Hele `test:coastal-geometry-v2`, RDKS-valideringen og håndbogens almindeligt-sprog-gate består.
- Forældede dokumentationslinjer om afventende runtimegate, privat Vadehavskandidat og manglende produktion er lukket eller tydeligt markeret som historik.

## 2026-08-11 – 4.0.181 genopretter hovedzonernes kortvisning
- Ejerens første offentlige kortkontrol viste, at 605 interne beregningsdele fejlagtigt blev gengivet som selvstændige synlige zoner med hver sin start-/slutmarkering, tooltip og tre Leaflet-linjer.
- Resultatet var et næsten sort Danmarkskort, gentagne navne, mange interne sorte markeringer, synlige kysthuller og markant langsommere indlæsning.
- 4.0.181 sender igen kun de oprindelige hovedzoner til kort-rendereren. De lokale dele, land-/vandpunkter, DMI-serier og lokale RavScore-resultater bevares uændret bag hovedzonen.
- Optællingen viste 2.488 synlige del-/multipartlinjer og cirka 12.440 Leaflet-objekter i den fejlbehæftede visning. 4.0.181 reducerer det til 209 aktive hovedzonelinjer og cirka 1.045 objekter; lokal browserkontrol viser 418 endemarkeringer, præcis to pr. zone. En særskilt audit af manglende kendte ravstrande forbliver åben.

## 2026-08-11 – 4.0.180 dækker sjældne atmosfæriske gridhuller
- #31497361674 bestod fulde gates, central readback og deploy. Online steg lokal scoredækning til 592/605 i alle 190 zoner.
- 13 dele mangler fortsat, fordi også de fire nærmeste HARMONIE-celler er missing. 4.0.180 bruger den tidligere private vindgates dokumenterede 32-celle-retrygrænse i det hurtige indeks.
- Kun nærmeste fælles gyldige U/V-celle accepteres; marine krav er uændrede.
- Push-kørsel #31498481482 bestod efterfølgende fulde gates, central readback, artifact og deploy. Det offentlige datasæt gav lokal score til 605/605 dele i alle 190 hovedzoner; kystmilepælen er dermed produktionsverificeret.

## 2026-08-11 – 4.0.179 bevarer fire hurtige vindkandidater
- #31495844161 beviste 4.0.178's indeks med otte HARMONIE-trin og 44 WAM-trin på 233 sekunder; fulde gates, central readback og deploy bestod.
- Online blev 543/605 dele scoret i alle 190 zoner. Supportartifactet viste 62 dele uden vind, fordi deres nærmeste indekserede HARMONIE-celle var missing.
- 4.0.179 gemmer de fire nærmeste celler i det hurtige indeks og genbruger den eksisterende fail-closed fælles U/V-gyldighedskontrol.
- Frisk online scoredækning afventer.

## 2026-08-11 – 4.0.178 indekserer HARMONIE-gridet én gang
- #31493787424 viste, at 4.0.177's native ecCodes-flerpunktsfunktion stadig brugte 1.008 sekunder på første vindfelt og afsluttede med nul forecasttrin. Den antagne hastighedsgevinst forkastes.
- 4.0.178 læser gridkoordinaterne én gang, afgrænser dem til registerets danske område og slår alle punkter op via små geografiske indeksfelter. Marine/bølgekontroller er uændrede.
- Samme run fandt også, at schedulerens isolerede ecCodes-teststub manglede den nye import; stubben følger nu den faktiske API.
- Frisk produktion og online scorekontrol afventer.

## 2026-08-11 – 4.0.177 samler lokale HARMONIE-gridopslag
- 4.0.176 blev deployet med 605 aktive kyststreger, grønne fulde gates, central readback og Pages, men online public conditions havde 0/605 lokale scorer.
- Workflowloggen dokumenterede årsagen: første HARMONIE-felt brugte hele arbejdsbudgettet på separate ecCodes-nearest-opslag for det udvidede 1.186-punktsregister og færdiggjorde derfor nul forecasttrin.
- HARMONIE er et komplet atmosfærisk grid. 4.0.177 bruger ecCodes' native flerpunktsopslag én gang pr. grid og cacher resultatet. Marine og bølgefelters bredere gyldighedssøgning er uændret.
- #31493787424 afviste løsningen: ecCodes gentog søgningen internt, første felt tog 1.008 sekunder og nul forecasttrin blev færdige. 4.0.178 erstatter metoden.

## 2026-08-11 – 4.0.176 aktiverer national lokal kystmodel
- Privat #31480089490 bestod hele den centralt hydrerede slutkæde med 605 dele, nul overlap, 605 punktpar, 594 fulde og 11 delvise marine gridbeviser samt central roundtrip/rollback.
- Ejeren gav udtrykkeligt go til aktivering på testdomænet. Orehoved-overlappet er eksplicit tildelt Falsters nordkyst.
- DMI-bulk sampler delpunkter i allerede downloadede GRIB-felter uden særskilte netkald. Lokale scores aggregeres med 7-punktsreglen og stopper som usikre uden skjult hovedzonefallback.
- Offentligt kort og prognose læser lokale kystdele og afledte scores. En kompakt central aktiveringspost styrer readback og rollback; de store kilde-/QA-filer gemmes ikke i Supabase.
- Første normale run #31489574586 bestod DMI, lokale scores, fuld Linux-validate og release-gate, men stoppede før Pages, fordi Supabase JSONB returnerede samme aktiveringsobjekt med en anden nøglerækkefølge. Readback sammenligner nu kanonisk nøglesorteret JSON i stedet for rå objektorden.
- #31491319173 bestod fulde Linux-gates, central readback og Pages-deploy. Online geometri viste 605 dele, men scorekontrollen viste 0/605, fordi første HARMONIE-trin ikke blev færdigt; 4.0.177 erstatter derfor gridopslaget.

## 2026-08-11 – 4.0.175 retter forældet reviewfordeling
- Privat #31474672948 nåede gennem den oprindelige nationale native DMI-, state-, vind- og shadow-kæde, men stoppede i den efterfølgende score-neutrale reviewbygger.
- De seks versionsstyrede kartografiske sideafgørelser fra 4.0.174 var allerede anvendt korrekt. Derfor var den faktiske 783-dels fordeling 758 komplette, 22 deldækkede og tre blokerede i stedet for den historiske 752/22/9-fordeling.
- Reviewgaten og dens self-test forventer nu 758/22/3 og 25 opmærksomhedsdele. Slutgeometrien på 603 dele og hele aktiveringsforbuddet er uændret.

## 2026-08-09 – 4.0.140 privat state-/historik-replaygate
- Kodeauditten viser, at produktionens statehistorik aktuelt slås op via `previous.zones[zoneId]`; private kystdele må derfor ikke kobles direkte på uden egen nøgle.
- En ny Node-validator bruger den faktiske `shadow-v2`-funktion med unik `historyKey` pr. del og stopper ved delt nøgle, parent-genbrug, krydslæsning eller numerisk scorepåvirkning.
- Faktiske current-U/V-replayværdier ligger kun i `.cache`, uploades ikke og slettes efter validering. Artifactet gemmer kun kompakt state og hash; alle runtime-/state-/score-/UI-/admin-/aktiveringsflag er falske.
- Privat pilot #2004 bestod med to unikke historiknøgler, nul parent-genbrug/krydslæsning, verificerede samples, nul scorepåvirkning og slettet transient input. Artifactet har ingen rå replayfelter eller credentialbærende URL.
- Normal produktion #2003 bestod central adminsync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `0f8171b`. Offentlig `version.json` viser 4.0.140.

## 2026-08-09 – 4.0.139 privat Blåvand-flertidsseriegate
- En ny privat validator genbruger produktionens native WAM-/DKSS-parser over flere forecasttrin for begge isolerede Blåvand-dele.
- Gaten kræver mindst to fælles komplette native tider, fuld komponentproveniens, fysiske gridpunkter og fælles current-U/V-celle og vertikallag. Krydsmerge, interpolation og fallback er forbudt.
- Artifactet gemmer kun komponenttilstedeværelse og kontekstbundne værdihash, ikke rå vejrværdier. Geometri, sampling, state, score, UI, public runtime og admin-write forbliver falske.
- Privat pilot #1997 bestod med fire fælles komplette native tider pr. del og 48 komponentposter med fuld DMI-proveniens, forskellige delceller, korrekt current-U/V-parring og nul interpolation/fallback. Artifactet har ingen rå værdifelter eller credentialbærende URL.
- Normal produktion #1996 bestod central adminsync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `f94620f`. Offentlig `version.json` viser 4.0.139.

## 2026-08-09 – 4.0.138 privat weather-shadow-kontrakt
- Den faktiske kodeaudit viser, at multi-anker-scoren i dag anvender én zones fælles vejrserie. Direkte tilkobling af to punktserier ville kunne blande en dels vejr med den anden dels kystretning.
- En maskinlæsbar Blåvand-policy og privat artifactgenerator låser derfor `zoneId::partId`, eget valideret grid, fuld nødvendig timeproveniens og separat historiknøgle pr. del.
- Krydsmerge, spatial interpolation, fallback, state, part-score, best-part-valg, public projection, UI, admin-write og automatisk aktivering er falske. Parent-zonen er fortsat runtime- og scoresandhed.
- Privat pilot #1992 verificerede præcis to isolerede delserier, unikke serie-/historik-ID'er, korrekte gridreferencer, ingen credentialbærende URL og alle mutations-/aktiveringsflag falske. Build og Pages var skipped.
- Normal produktion #1991 bestod central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `2d6127b`. Offentlig `version.json` viser 4.0.138.

## 2026-08-09 – 4.0.137 privat DMI-gridgate
- Efter #1982's ortofotogo validerer et nyt privat trin Blåvands to vandpunkter direkte i aktuelle `wam_nsb`- og `dkss_nsbs`-GRIB-assets med den samme nearest-valid-cell-logik og de samme afstandsgrænser som produktionen.
- Current-U/V skal dele både fysisk gridpunkt og vertikallag. Rapporten skelner gyldige gridceller fra uafhængige lokale serier, så to kandidater på samme celle ikke fremstilles som to målinger.
- Outputtet er privat og uden rå vejrværdier eller credential-URL'er. Geometri, admin, sampling, produktionsdata og RavScore ændres ikke. Lokal self-test bestod; den oprindelige kandidatstatus om manglende CI-evidens er erstattet af #1987/#1986 nedenfor.
- #1987 bestod hele den private pilot. Begge kandidater har gyldige WAM-/DKSS-celler; current-U/V deler samme fysiske celle og 17 m-lag pr. kandidat; alle seks komponentfelter bruger forskellige celler mellem nord og sydøst. Artifactet har ingen credentialbærende URL og alle mutations-/aktiveringsflag er falske.
- #1986 bestod central sync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `ab42e99`; offentlig GitHub Pages-version er 4.0.137.

## 2026-08-09 – 4.0.136 privat huk-hårnålsrettelse
- #1974-ortofotoet viste, at nord/sydøst overordnet passede, men at hukket fulgte en indadgående sandtange-/laguneløkke.
- Kandidaten måler route/chord-forholdet, bevarer det søværts apex og fjerner 242,0 m indadgående detur på det verificerede input. Manglende eksakt hårnål stopper sikkert.
- Lokal generator- og syntetisk self-test består. Nyt privat ortofotoartifact mangler; DMI-grid er fortsat blokeret.
- Privat pilot #1982 bestod med 108 tiles, tre overlays, nul credentialmatch og alle aktiveringsflag falske. Visuelt ligger den grønne linje på sand/landsiden og springer den indre omvej over; ortofotogaten er bestået.
- Normal produktion #1981 bestod frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy på `b82e311`; offentlig version er 4.0.136.

## 2026-08-09 – 4.0.135 officiel privat ortofotokontrol
- Den eksisterende moderniserede `DATAFORDELER_API_KEY` kan efter den officielle tjenestekontrakt bruges til gratis GeoDanmark Ortofoto forår Web Mercator WMTS; ingen ny betalt kilde eller credentialtype indføres.
- Pilotworkflowet danner tre private zoom-17-overlays ved Blåvand og bevarer fail-closed secret-håndtering. Ingen geometri, admin-data, DMI-sampling eller RavScore aktiveres.
- Lokal self-test består. Faktisk WMTS-adgang og visuelt artifactreview afventer den private CI-pilot; ortofotogaten er derfor endnu ikke bestået.
- Privat pilot #1974 bekræftede 108 officielle tiles, tre private overlays, secret-frit artifact og skipped build/Pages. Visuelt passer nord- og sydøststrækningerne overordnet, mens hukudsnittet viser en indadgående sandtange-/laguneløkke, der kræver geometrisk rettelse før go.
- Push-run #1973 stoppede før release-gate og deploy, fordi Pillow-importen lå før self-testen i det private script. Hotfixet flytter private imports bag self-testen og fastholder dependency-isolationen; ny produktionskørsel afventer.

## 2026-08-09 – 4.0.134 privat Blåvand-detailforslag
- #1959/#1958 lukkede 4.0.133-gaten med henholdsvis privat pilot og fuld produktionskæde.
- Blåvands fysiske kyst splittes ved det officielle Blåvands Huk i to navngivne retningsdele; en første nærmeste-ankerløsning blev forkastet, fordi den ikke splittede det lange kildeobjekt topologisk korrekt.
- Begge dele forskydes 15 meter mod den landside, som centralt verificerede adminankre dokumenterer, og får private land-/vandpunktpar uden vejrsampling.
- Ni høfter registreres separat og score-neutralt. Intet ændres i aktiv zone, admin, DMI eller RavScore.
- Ortofoto, DMI-grid og admin-roundtrip er næste stopgates.
- Commit `3843d20` blev produktionsverificeret i #1964 med begge fulde gates og Pages-deploy. Første private pilot #1965 stoppede korrekt efter central sync-timeout; #1967 lykkedes med 208-zone central sandhed og verificerede 2 dele, 15 detailfeatures, 9 høfter, detailkort og uændrede produktions-/admin-/vejr-/scoreflag.

## 2026-08-08 – kystgeometri v2 godkendt til score-neutral pilot
- Brugeren har godkendt opstart af en grundig national geometriomlægning, men ikke en direkte overskrivning af produktionszonerne.
- Kystlinjen defineres som relevante ravstrande og må springe over havne og åudløb. Indre fjorde udelukkes med Limfjorden som eneste undtagelse.
- Eksisterende zone-ID'er bevares som udgangspunkt, mens fejlagtige placeringer og navne må korrigeres under eksplicit migrationskontrol.
- Flere navngivne lokale kystdele med land-/vandpunkter ønskes, hvor retning, strøm og vind varierer. Kodeaudit viser, at admin allerede har multi-ankre, men vejrpipelinen endnu ikke har selvstændige komponentserier pr. anker.
- Høfder og andre konstruktioner kan være ravfælder. De registreres foreløbig score-neutralt og sendes til den senere DEC-0029-forskning frem for at ændre RavScore under geometriarbejdet.
- DEC-0032 låser parallel pilot, autoritativ kilde-/licenskontrol, central admin-sandhed, tre pilotmiljøer og særskilt go/no-go før national aktivering.
- Officiel kildeaudit har verificeret GeoDanmark-objektet `Kyst` i EPSG:25832, entitetsbaseret WFS med API-key/OAuth samt CC BY 4.0. Repository/procesmiljø har ingen identificeret Datafordeler-nøgle; adgang skal tilføjes uden for repositoryet før ægte pilotudtræk.
- Read-only offentlig sammenligning bekræfter, at central runtime ikke kan erstattes af repositoryfilen: 208 mod 209 aktive zoner, central sletning af `DK-B02-14`, omdøbning af `DK-B10-05` og 18 zoner med centralt gemte multi-ankre. V2-pilotens inputrækkefølge skal derfor være repositorybaseline → central hydrering/tombstones → v2-forslag → eksplicit admin-konfliktreview.
- Pilotområderne er fastlagt til Blåvand/Rømø, Limfjorden og Lolland/Falster. Acceptkriterierne tillader ingen utilsigtede overlap, indlejring, dobbelt kystdækning, genoplivede tombstones, tavst tabte overrides, udokumenteret selvstændig sampling eller RavScore-ændring.
- Datafordeler-adgangen er oprettet af ejeren som repository-secret `DATAFORDELER_API_KEY`. Den nye 4.0.126-kandidat isolerer GeoDanmark til et manuelt valgt, score-neutralt job med central adminhydrering, private artifacts og ingen Pages-rettigheder. Secretnavnet er kontrolleret mod workflowets forventede miljøvariabel; værdien er aldrig læst eller logget. Første CI-fetch afventer.

## 2026-08-09 – 4.0.126 sikker GeoDanmark-integrationskandidat
- GeoDanmark-fetcheren læser kun `DATAFORDELER_API_KEY` fra procesmiljøet, udfører først WFS capabilities og derefter begrænsede pilotudtræk, og producerer en secret-fri rapport med kildehashes og featuretal.
- Et isoleret `geometry-v2-pilot` workflowjob kan kun startes manuelt med `geometry_v2_pilot=true`. Det henter central admin-konfiguration og tombstones før source fetch, har kun læseadgang til repositoryet og uploader et privat 14-dages pilotartifact.
- Den hyppige vejrproduktion, Pages-artifactet og RavScore er isoleret fra GeoDanmark-piloten. Første CI-run er påkrævet før enhver påstand om fungerende adgang eller modtaget kildedata.

## 2026-08-09 – 4.0.127 GeoDanmark entity-lag hotfix
- Manuel pilot #1928 bekræftede, at `DATAFORDELER_API_KEY` blev injiceret og maskeret, at central adminhydrering lykkedes, og at både produktionsbuild og Pages-deploy blev sprunget over.
- Piloten stoppede ved lagvalg, fordi den aktuelle entitets-WFS udstiller bitemporale objekter som aktuelle `_current`-lag frem for kun det ældre eksakte objektnavn.
- Parseren læser nu kun WFS `FeatureType/Name`, foretrækker eksakt navn og derefter det præcise `_current`-navn, afviser `_hist` og løse præfiksmatch og gemmer ved ukendt kontrakt kun en secret-fri lagliste i det private artifact.

## 2026-08-09 – 4.0.128 pagineret GeoDanmark-pilot
- #1931 var grøn og hentede alle syv ønskede aktuelle lag i Blåvand/Rømø, Limfjorden og Lolland/Falster. Produktionsbuild og Pages-deploy blev sprunget over.
- Kystlagene var under serverloftet, men flere vandløbs-/skræntlag returnerede præcis 10.000 features. De er derfor ikke dokumenteret komplette.
- Fetcheren paginerer nu via WFS `startIndex`, fører `sourceNumberMatched`, `pageCount` og `complete` og afviser ukontrolleret datamængde over 250.000 features pr. lag/område.
- `actions/upload-artifact` får nu `include-hidden-files: true`, så `.geometry-v2-work` faktisk følger med det private 14-dages artifact. Den er fortsat udelukket fra Pages og commits.

## 2026-08-09 – 4.0.129 separat pilotkø
- Den ventende komplethedspilot #1933 blev erstattet af rutinevejropdatering #1934 på grund af GitHub Actions' ene pending-plads pr. concurrency-gruppe.
- Geometripilot og vejrproduktion bruger nu hver sin gruppe. En eksplicit nyere pilot kan annullere en ældre pilot, men vejrdiften kan ikke påvirke pilotens kø.
- #1936 gennemførte i den nye pilotgruppe: 21/21 komplette råudtræk, seks flersidede, maksimum 72.870 features og ca. 341 MB private GeoJSON-data. Build og Pages-deploy var `skipped`; ingen secretværdi blev persisteret.

## 2026-08-09 – 4.0.130 privat GeoDanmark source-QA
- Piloten gemmer nu de centralt effektive ni pilotzoner privat og sammenholder deres aktuelle kystlinjer med de komplette GeoDanmark-lag.
- Source-QA måler længde, fragmentering, nærhed og stikprøveafstande og registrerer havne, vandløbsender, høfder og terræn som score-neutral reviewkontekst.
- Tre private kort gør forskelle og ankre synlige. Lokal kørsel flaggede 9/9 zoner og viste, at Rømø, Limfjorden og Lolland/Falster kræver forskellige migrationsklasser; blind snapping er forkastet.
- Aktive zoner, centrale administratorværdier, RavScore, produktionsbuild og Pages forbliver uændrede. CI-verifikation af 4.0.130 afventes.

## 2026-08-09 – 4.0.131 officiel navne- og kystdelstriage
- #1941 verificerede 4.0.130 source-QA, kort og privat artifact med build/Pages isoleret.
- Hvert fysisk GeoDanmark-kildestykke klassificeres nu privat som eksisterende match, delvist match eller semantisk/grænsemæssigt review; lokal pilot gav 702 stykker.
- Dataforsyningens nøglefri `steder`-API er verificeret som Danmarks officielle stednavneregister. Afgrænsede pilotkald gemmer kun kompakte kandidatfelter og afstande.
- Migrationstriagen klassificerer Blåvand som geometriopretning, Rømø/Thisted som semantisk flyttereview og de øvrige seks som grænse-/partitionsreview. Ingen navne eller geometrier aktiveres automatisk.
- #1942/#1943 afslørede, at Pillow-importen i den private kort-renderer fejlagtigt blev evalueret under almindelig produktions-self-test. 4.0.131 indlæser nu Pillow først i det faktiske rendertrin, så private pilotafhængigheder ikke lækker til vejrproduktionen.

## 2026-08-09 – 4.0.132 kontrolleret privat kystdelssamling
- #1948 verificerede 4.0.131-piloten med 702 klassificerede kildestykker, officiel navneaudit og fuld isolation; #1947 bestod den parallelle fulde produktionskæde.
- Første lokale samling gav 300 tekniske fragmenter, fordi både vandløbskanter og midterlinjer skabte dublerede udskæringer. Resultatet blev forkastet før commit.
- Den korrigerede generator bruger kun synlige, ikke-rørlagte vandløbsmidter med faktisk kystkontakt/indlandsfortsættelse, klynger mundinger og samler nærliggende fragmenter som multipart uden kunstig forbindelseslinje.
- #1948-artifactet giver derefter 84 private reviewforslag. Rømø giver nul og forbliver semantisk stop. Aktive zoner, central admin, vejrsampling og RavScore er uændrede.

## 2026-08-09 – 4.0.133 officielle indre-vandmasker og zone-review
- #1952 verificerede 4.0.132 med 84 private forslag og isolation; #1951 bestod frisk produktion, fuld validate, release-gate og Pages.
- Visuelt review afslørede, at den eksplicitte fjordpolitik endnu ikke var geometrisk håndhævet. Dette blev behandlet som stopklods før DMI-punkter.
- Den nøglefri officielle stednavnekilde leverer nu Farvand-GeoJSON. `fjord` og `nor` udskæres uden for Limfjorden; 72 reviewdele resterer.
- Ni zonekort og en maskinlæsbar dom viser én detailkandidat (Blåvand), to semantiske flytninger og seks grænse-/partitionsredesign. Ingen produktion/admin/score ændres.

## 2026-08-08 – 4.0.125 fuld DMI-timeproveniens
- Brugerens godkendelse af næste roadmaptrin udløste implementering af provenance fra STAC/GRIB til beskyttede forecasttimer.
- Bulkparsergeneration 14 gemmer collection, modelkørsel og native gyldighedstid pr. komponent; timebyggeren beregner lead time, prognosealder, temporal status og native kildetider.
- Interpolation over en modelkørselsgrænse er nu en eksplicit regression og giver missing i stedet for en udokumenteret blanding.
- RavScore, fallbackprioritet og den slanke offentlige runtime er uændrede. Produktionsevidens afventes.

## 2026-08-08 – 4.0.124 komponentaudit
- De fem DKSS-vindhalehuller er produktionsverificeret lukket efter 4.0.123 og centrale adminrettelser.
- Datasæt `rr-20260808145245-208` havde 118 vindtimer i alle zoner, men dokumenterede separate bølge- og marine halehuller i Limfjorden.
- Audit schema 3 måler fem komponenters værdifelter, providerintervaller, missing og timevis DMI-proveniens. Ændringen er diagnostisk og score-neutral.
- Analyse af koden viste, at collection/model-run/lead time/prognosealder skal føres med fra STAC/GRIB; senere rekonstruktion ville være usikker ved cachede trin fra flere runs.

## 2026-08-08 – 4.0.123 produktionsgeometri og bredere marint kandidatvindue
- Audit af #1851/#1852 fandt de samme fem zoner uden direkte DKSS-vindhale, selv om alle 208 offentlige zoner havde 118 timers vind via fallbackkæden.
- Deployet zonefil, fuld conditions og bulkcache dokumenterede, at centrale adminrettelser faktisk var anvendt.
- Landmaskerede celler kunne fylde kandidatvinduet før værdikontrol. Loftet er udvidet fra 16/48 til 64/128; fysisk afstand og U/V-integritet er uændret.
- Direkte DKSS-resultat afventer frisk produktion. De fulde livecacher blev ikke fjernet, fordi de indgår i hydrering og admin/audit; den almindelige klient bruger fortsat kun den kompakte runtime.

## 2026-08-08 – 4.0.120 offentlig fallbackhale
- #1833/#1835 beviste NSBS/LF-rotation: 208/208 zoner havde vind og 203/208 mindst 96 timer, men maksimum var cirka 110 timer.
- De fem korte zoner havde ingen fælles gyldigt DKSS U/V-punkt. Ingen DMI-værdier konstrueres.
- Systemaudit fandt to senere tab: vandstandsrouting slettede den blandede fallbackserie, og `forecast_days=5` talte fra midnat.
- 4.0.120 bevarer den offentlige komponentserie og bruger `forecast_hours=120`. RavScore er uændret; frisk produktion afventer.

## 4.0.102 – 2026-08-05
- Kortets farver er ændret fra “forslag + aktiv routing” til kun at vise den aktive routing for zonen.
- Aktiv automatik vises grønt. Aktivt administratoroverride skjuler grønne markører og viser kun administratorens kilder rødt.
- Lilla “begge valg” er fjernet.
- Dublerede administratorvalg deduplikeres; én kilde vises og anvendes med 100 % vægt.
- Ingen ændring af automatisk udvælgelse, DMI-data, femdøgnsserier, interpolation, RavScore eller offentlig prognosekæde.


## 4.0.101 – 2026-08-05
- Rettede kun den automatiske udvælgelse af vandstandskilder.
- Admin genberegner nu valget fra de aktuelle brugbare kilder med samme topologiske kernefunktion som produktionen i stedet for at lade et gammelt/tomt auditdokument være autoritativt.
- Automatisk valg bevarer interpolation mellem to kilder med afstandsvægte og bruger én gyldig kilde med 100 % vægt, når en komplet topologisk indramning ikke findes.
- Manuel override og hele vandstands-, score- og prognosekæden fra 4.0.100 er bevidst ikke ændret.
- 4.0.95: Vandstandsstations-admin viser ukendt status ærligt, markerer udfasede stationer særskilt og viser inverse afstandsvægte for administratorvalgte stationer. DMI-hentning, prognosecache og scoremotor er uændret.
## 4.0.75 – 2026-08-02

- Rettede den fejlede 4.0.74 GitHub-integration.
- Samlede public runtime, manifest, hydrering og deploy omkring én deterministisk writer.
- Tilføjede hash- og pipelinekontrol samt DEC-0023.

## 4.0.72 – 2026-08-02
- Rettet uoverensstemmelsen mellem den aktuelle RavScore og “Bedste beregnede tidspunkt”.
- Den aktuelle vurdering indgår nu som kandidat for dagens prognose, og fortidige timer kan ikke vælges.
- Den højeste samlede RavScore vinder altid; vandstand bruges kun som tie-breaker ved samme score.
- Zoneprognosen og landsprognosen bruger nu samme centrale udvælgelsesfunktion.
- Visningen forklarer valget og kan vise de bedst rangerede alternative tidspunkter.
- Tilføjet bindende regressionstest for bedste-tidspunkt-konsistens.

## 4.0.71 – 2026-08-02
- Rettet den samlede sitetest, så resultatet altid vises direkte under knappen.
- Tilføjet levende fremdrift og synligt resultat for hver deltest.
- Tilføjet tydelig fatal fejlvisning og samlet timeout, så tavs afslutning eller evig kørsel ikke kan forveksles med succes.
- Seneste rapport gemmes lokalt og vises igen efter genindlæsning.
- Release-testen kræver nu synlig start, fremdrift, slutrapport og fejlstatus.

## 4.0.70 – 2026-08-02
- Udvidet den tidligere begrænsede sitetest til en samlet funktionstest af hele RavRadar.
- Testen åbner den offentlige side i en isoleret browserramme og kontrollerer kort, zonefarver, rangliste, jagtform og femdøgnsprognose.
- Tilføjet kontroller af landsdata, assistent, admin, Supabase, deployfiler, service worker, JavaScript-fejl og performance.
- Testrapporten grupperes efter område og kan downloades som JSON.
- Tilføjet DEC-0020 om samlet siteaccept og regressionsbeskyttelse.

## 4.0.69 – 2026-08-02
- Repareret “Kontrollér nu” med synlig status og fejlhåndtering.
- Tilføjet samlet sitetest og ægte CRUD-test af håndbogsreview i Supabase.
- Omskrevet ekspertens arbejdsplan og tilføjet læsehjælp i alle håndbogskapitler.
- Tilføjet DEC-0019.

## 4.0.68 – 2026-08-02
- Rettet Pages-deployregression: `js/services/handbook-review-store.js` blev fejlagtigt udelukket, selv om admin importerede modulet.
- Tilføjet browsermodul-lukningstest, som bygger det faktiske Pages-artifact og verificerer alle statiske modulimports fra `index.html` og `admin.html`.
- Release Gate stopper nu udgivelsen, hvis et importeret browsermodul mangler i deploy-artifactet.

## 4.0.67 – 2026-08-01
GitHub Actions-regression rettet: `manifest.json` og `conditions.json` hydreres nu som ét atomisk vejrdatasæt og må aldrig få forskellige `datasetId`.

## 4.0.66 – 2026-08-01
Admin-loginregression løst uden ny Supabase-opsætning; strømaudit, assistent-intents og frisk progressiv opstart indført.

## 4.0.58 – 2026-08-01
- Færdiggjort den adgangsbeskyttede RavRadar-håndbog med dyb faglig beskrivelse af rav, lavdensitetspartikler, kysthydrodynamik, sedimenttransport og implementering i RavScore.
- Kortlagt alle aktuelle tærskler, vægte, retninger, caps og ekspertregelprocesser til den faktiske kode.
- Indført bindende RDKS Release Governance efter læringen fra 4.0.56-forløbet.
- Tilføjet automatisk release-gate, sikker pakning og release-rapport.
- Registreret arkitekturretning for `ravradar.dk`, uden at aktivere CNAME før DNS og Supabase redirects er klar.
- Omdøbt brugerfladens “drejebog” til “håndbog”.

## 4.0.54 – 2026-07-31
- Implementerede stationsspecifik prognose-/cachestatus og samlet anvendelighed.
- Gyldig cache kan holde en station i automatisk routing, selv om nye observationer midlertidigt mangler.
- Tilføjede cachetilstandsnotifikationer og adminvisning af observation, cache og samlet status.
- Tilføjede dokumentationscenter i admin og opdaterede håndbogen.

# RDKS Master Log

## 4.0.53 – 2026-07-31
- Importeret syv historiske chats fra `chat.zip`.
- Rekonstrueret kronologien ud fra tekst og versionsforløb, ikke filnavne.
- Bevaret normaliseret kildetekst med SHA-256 og sporbarhed.
- Oprettet gældende beslutninger om DMI, retninger, zoner, stationer, score, admin, kysteditor, håndbog og sikker chatimport.
- Oprettet samlet aktiv kravoversigt, kendte issues og implementeringsstatus.
- Udbygget den levende håndbog i både Markdown og den synlige webdrejebog.
- Registreret som planlagt krav, at stationers observationsstatus og prognose-/cachestatus skal adskilles, og at gyldig cache fortsat gør stationen prognosebrugbar.
- Ingen produktionsalgoritmer er ændret alene på baggrund af historiske chats.

## 4.0.52 – 2026-07-31
- Opdaterede forældet admin-persistence-test til stationslivscykluskæden.

## 4.0.51 – 2026-07-31
- Første RDKS- og stationslivscyklusgrundlag.

## 4.0.56 – Supabase-sikret administration

Status: Implementeret

- Hele adminområdet kræver gyldig Supabase-session og relevante rettigheder.
- Håndbogen er flyttet bag Supabase-adgangskontrol.
- Ny særskilt eksperttilladelse til at læse håndbogen.
- Beskyttede admin-data synkroniseres til Supabase i stedet for at blive offentliggjort på GitHub Pages.
- Gamle vejrdata over friskhedsgrænsen afvises.
- Nye appversioner aktiveres og genindlæses automatisk.
## 4.0.57 – 2026-08-01

Status: Implementeret

- Stabiliseret Supabase-sikret administration efter installationsaudit.
- Rettet SQL constraint-inspektion og understøttelse af nye `sb_secret_` servernøgler.
- Håndbogen synkroniseres nu automatisk som beskyttet admin-dokument.
- Rå runtime-diagnostik hentes ikke længere fra en offentlig URL i admin.
- Versionskonsistens er udvidet til alle aktive bruger-, admin- og håndbogsfiler.

## 4.0.59 – 2026-08-01

Status: Implementeret og lokalt release-valideret

- Kystlinje-generatoren bevarer nu den aktuelle RavRadar-releaseversion i `data/zones.geojson`.
- Historiske geometri-snapshots må ikke overskrive releaseidentiteten.
- Release Gate testes efter samme geometri-trin som i GitHub Actions.
- Ændringen retter produktionsstop fundet af Release Governance i 4.0.58.

## 4.0.60 – 2026-08-01
- Håndbogen er færdiggjort så langt som muligt på det nuværende faglige og tekniske grundlag.
- 33 kapitler beskriver ravets og ledsagematerialers proceskæde samt den faktiske RavScore-kode.
- Ekspertvalideringsmatrix E-01–E-15 er indført.
- DEC-0015 gør evidens- og implementeringssporbarhed bindende.
- Release Gate kontrollerer fremover håndbogens faglige minimum og centrale kodekonstanter.

## 4.0.61 – 2026-08-01

Status: Implementeret

- Håndbogen er løftet fra disposition til fagligt referenceværk med 50 kapitler.
- Kystfysik, ravtransport, hypoteser, validering, feltprotokol og litteratursporbarhed er uddybet.
- RDKS DEC-0016 gør substans- og sporbarhedskrav bindende.
- Release Gate kontrollerer den udvidede håndbog og ekspertpunkter E-01–E-21.
- Hvide standardkodefelter i adminhåndbogen er erstattet af tematilpassede, læselige filreferencer.

## 4.0.62 – 2026-08-01
- Aktiv RavScore udvidet med flere veje til fundbart rav.
- Ny frigivelse og nærkystnær genmobilisering beregnes separat.
- Ingen parallel Model 2; forbedringen er implementeret direkte i produktionsmodellen.
- Håndbog kapitel 51, ekspertpunkt E-22 og DEC-0017 tilføjet.

## 4.0.63 – 2026-08-01
- Områdevalg i regelbyggeren er samlet i en landsdækkende, testbar områdemodel.
- Områder forvælger zoner, mens manuelle fravalg bevares gennem søgning og filtrering.
- Ekspertens fulde læseadgang til Regler er adskilt fra redigering og publicering.
- “Gemt centralt” viser nu lokal kvitteringstid efter verificeret Supabase-genlæsning.
- Ejerstyret og CI-baseret Supabase-persistenstest er indført.
- DEC-0018 gør områdeintegritet og central persistenstest bindende.

## 4.0.64 – Ekspertreview og Rømø-korrektion
- Ekspertformularer indlejret ved hvert håndbogsafsnit i admin.
- Supabase-write verificeres med readback før central kvittering.
- DK-B04-09 fjernet fra den aktive systembestand.
- DK-B04-08 udvidet til hele Rømøs vestside og beskyttet mod generator-rollback.

## 4.0.65 – Hydreringsbeskyttelse for slettede zoner
- Den deployede vejrtilstand må ikke genindføre pensionerede eller ukendte zoner.
- `conditions.json` filtreres mod det aktive zoneregister umiddelbart efter download og før versions-/friskhedsvurdering.
- DK-B04-09 kan derfor ikke genopstå fra en ældre GitHub Pages-cache.
- En regressionstest gør beskyttelsen bindende i den fulde valideringskæde.

## 4.0.73 – 2026-08-02
- Løst 400-fejl og skjult fejltekst i ekspertreviewets Supabase-flow uden at ændre eksisterende nøgler eller loginopsætning.
- Gjort stationshydrering historikbevarende og forhindret observationsskip i at nulstille stationernes livscyklus.
- Opdelt DMI-status i brugerprognose, DMI-komponentdækning, observation og cache.
- Udvidet helhedstesten med aktive adminfaner, navngivne ressourcer, performanceadvarsler og startup-profiler.

## 4.0.74 – 2026-08-02
- Offentlig runtime opdelt i en kompakt brugerfil og en fuld diagnosefil.
- Service worker cacher ikke længere live-data, så store query-varianter ikke ophobes.
- Mobilforsiden prioriterer et større, brugbart kort uden ændring af zoom- eller lagkontroller.
- Kontoikon, GPS-flow, knapplacering og farveforklaring er tilpasset mobilkravene.
- Håndbogen har fået et samlet kapitel om, hvordan RavRadar vurderer ravindtransport på forskellige kysttyper.
- DEC-0022 og nye regressionstests gør performance- og funktionskravene bindende.

## 4.0.76 – 2026-08-02
- Kunstige pileklynger omkring zonernes datapunkter er fjernet.
- DMI-strømpile placeres ved det dokumenterede marine gitterpunkt, som leverede current-u og current-v.
- Rå u/v-komponenter bevares i den fulde diagnosekæde og kontrolleres mod hastighed, retning og vist pil.
- 197 af 209 aktive zoner har dokumenteret DMI-marinegitterpunkt; 23.049 prognosetimer er verificeret.
- DMI-pile uden dokumenteret gitterproveniens skjules frem for at vise en usikker placering.
- DEC-0024 og håndbogskapitel 56 gør kravene bindende.

## 2026-08-02 – 4.0.77
- Rettet tom Oversigt ved første adminåbning.
- Sitetesten venter på fuld admininitialisering og opsamler browserdialoger uden popup.
- Versionskontrollen bruger faktiske runtimekilder.

## 2026-08-02 – 4.0.78
- Rettet en kritisk null-konverteringsfejl, hvor manglende DMI-u/v kunne blive til falsk 0/0-strøm.
- Indført eksplicit `verified`/`unverified` strømproveniens med gitterpunkt, metode og kildetider.
- 23.049 timer er verificeret; 1.613 timer er bevaret som ikke-verificerbare uden overskrivning.
- Strømauditten skelner nu mellem manglende dokumentation og reel fysisk uoverensstemmelse.
- DEC-0026 og en fast null-sikkerhedstest gør reglen bindende.

## 2026-08-02 – 4.0.79
- Rettet den offentlige sides fastlåste rangliste og 5-dages prognose.
- Den adaptive model indlæses nu én gang og genbruges i scoreberegninger i stedet for at blive læst og normaliseret titusindvis af gange.
- Aktuelle scores og grupperede prognosedage caches pr. zone og jagtform.
- Dobbelt rendering under opstart er fjernet, og fund-sandsynlighed beregnes kun, når zonepanelet faktisk har brug for den.
- Sitetestens kontrol af knappen til samlet funktionstest udføres nu på dashboardet og ikke efter faneskift.

## 2026-08-02 – 4.0.80
- Produktionssitetesten viste, at zonefarver var klar efter ca. 3,7 sekunder, mens rangliste og prognose først blev færdige efter ca. 21 sekunder.
- Rodårsagen var synkron opbygning af hundredvis af Leaflet-vind- og strømpile før de centrale prognosevisninger.
- Rangliste og 5-dages prognose renderes nu før pilene.
- Pilene bygges i ledig browser-tid, og Leaflet-laget afkobles under markøropbygningen for at undgå en DOM-opdatering pr. pil.
- Den gemte jagtform vælges før første scorecache opbygges.

## 2026-08-02 – 4.0.83
Brugeren dokumenterede, at dagens rangliste og 5-dages prognose kunne forblive permanent på "Indlæser", selv om automatiseret test på en kraftigere maskine afsluttede efter cirka 21 sekunder. Rodårsagen blev præciseret: DOM-ranglisten blev skrevet, men kunne ikke males, fordi den efterfølgende 5-dages beregning fortsatte synkront med omtrent 25.000 scoreberegninger. 4.0.83 indfører garanteret paint før prognosen, asynkron chunking, fremdrift og annullering ved jagtformsskift. Tidligere 4.0.79-4.0.81 må ikke betragtes som løst for denne fejl.

## 4.0.84 – Verificeret strømkonsistens efter hydrering
- GitHub-valideringen afslørede, at hydrerede prognoser kunne få rå DMI `current-u/current-v` tilføjet uden samtidig at genberegne den viste strømretning og -hastighed.
- Det skabte internt modstridende strømfelter og fik den videnskabelige strømaudit til at fejle.
- Rettelsen gør de verificerede u/v-komponenter autoritative og genberegner altid `currentSpeedMps` og `currentDirectionDeg` fra samme vektor.
- Auditgrænserne er ikke løsnet. Fejlen er rettet i datakæden.
- Ny regressionstest sikrer, at fremtidig proveniensberigelse aldrig kan efterlade u/v, retning og hastighed indbyrdes inkonsistente.

## 4.0.85 – Én kanonisk strømvektor i hele scorekæden
- Den præcise GitHub-fejl fra 4.0.84 blev reproduceret på de hydrerede produktionsdata.
- Fejlen skyldtes ikke en 180°-konvention og ikke en for løs/streng audit, men forskellig afrundingsrækkefølge: lagret u/v var afrundet, mens retning og hastighed var beregnet fra uafrundede værdier.
- Ved meget svag strøm kan dette give store vinkeludsving, fordi retningen er numerisk ustabil nær nulhastighed.
- Fremover fastlægges først én kanonisk lagret `currentUMps/currentVMps`-vektor. `currentSpeedMps` og `currentDirectionDeg` beregnes derefter fra præcis den samme vektor.
- Score, pil, debug og videnskabelig audit skal altid bruge samme kanoniske vektor. Auditgrænser må ikke løsnes for at skjule inkonsistens.
- Regressionstesten kontrollerer den arkitektoniske regel og ikke en bestemt tekststreng fra en tidligere implementation.

## 2026-08-03 – 4.0.86
- Brugerens konkrete fund viste, at håndbogsreview kunne indsendes uden synlig adgang til reviewkøen i den aktive admin.
- Audit fandt samme mønster for lokale nødkladder, dokumentationscenter og model-forslagenes lokale virkning.
- Aktiv admin fik samlet reviewkø, implementeringsflow, nødkladdehåndtering og reelle dokumentindgange.
- Sitetesten skelner nu 404, timeout, netværksfejl og HTTP-fejl og opdeler opstart i netværk/data, beregning og rendering.
- Reachability-test er tilføjet som releasekrav.

## 2026-08-03 – 4.0.87
- Produktionstesten og brugerobservationen viste, at vind- og strømpile kunne mangle, selv om data, rangliste og zonefarver var korrekte.
- Den efterstillede pileinstallation bevares af performancehensyn, men `requestIdleCallback` er erstattet med deterministisk timerkørsel, målbar status og runtimekontrol.
- Adminfejlen `Map container not found` blev ført til en forsinket Leaflet-callback, der overlevede faneskift; kort og timere ryddes nu ved skift.
- En importgraf-audit fandt aktive `?v=4.0.83`-referencer i 4.0.86. Versionsværktøj og release-test lukker nu hele browsergrafen til én version.

## 2026-08-03 – 4.0.88
- Produktionstesten dokumenterede `flow-arrows-started` fulgt straks af `flow-arrows-failed`.
- Historisk audit førte rodårsagen til 4.0.76: `pointFrom()` returnerede enten array eller `L.LatLng`, mens kaldet altid brugte spread til `L.latLng()`.
- 4.0.83 gjorde konsekvensen total, fordi det afkoblede lag først blev monteret efter hele løkken.
- 4.0.88 normaliserer til `L.LatLng`, isolerer fejl pr. zone og bevarer efterstillet pileinstallation.
- Brugerobservation viste desuden, at zonestreger først faldt på plads efter panorering. `zoomend` fandtes allerede, men stilen blev anvendt før Leaflets afsluttende zoomtransform. Offentligt `redraw()` i næste animation frame sikrer automatisk opdatering uden private Leaflet-metoder.

## 2026-08-03 – 4.0.89
- Retning hav-land fik særskilt sletning af valgt kystdel og hele zone med dobbelt bekræftelse for zonesletning.
- Centrale retningsreviews er nu en del af deploymentkæden og ændrer det autoritative zoneregister før vejrhydrering og offentlig runtime.
- Godkendte pålandsretninger og kystdele forplanter sig til score, kort, forecast og debug gennem samme zonefil.
- Reviewkøens automatiske systemtestposter kan ryddes via soft-delete, så auditspor bevares uden at køen fyldes.

- 2026-08-03 · 4.0.90: Kystlinjeeditoren blev adskilt tydeligt fra hav-land-retning. Søgning skifter kortzone, zonenavn kan ændres, og én central Gem ændringer-handling erstatter synlige kladde-/eksporttrin. Historiske kladder er bevidst ikke aktiveret.

## 4.0.91 – kontrollerede zonesletninger og gyldig reviewarkivering

GitHub-kørslen efter sletning af DK-B02-14 fejlede, fordi `validate-data.mjs` stadig krævede præcis 209 zoner. Valideringen er gjort dynamisk med sikkerhedsgrænse og krav om eksakt ID-sammenhæng mellem aktivt zoneregister og conditions. Samtidig blev det opdaget, at centrale retningsreviews blev anvendt uanset status; kun `verified` må nu påvirke produktionen. Reviewkøens soft-delete brugte den ikke-installerede status `archived`, men Supabase-skemaet tillader kun new/reviewing/accepted/implemented/rejected. Arkivering bruger nu rejected plus `[ARKIVERET]` i resolution_note og skjules i normal kø.

## 4.0.92 – Godkendte retningsankre må ændre produktionszoner

- GitHub-run 1181 viste, at central synkronisering korrekt anvendte godkendte retningsankre og fjernede DK-B02-14, hvorefter en gammel hårdkodet Blåvand-test stoppede deployment.
- Produktionszoner må ikke være låst til historiske gradtal i regressionstests, når ejerens adminworkflow eksplicit kan godkende nye hav-/landankre.
- Sikkerheden bevares ved at validere alle aktive zoners `onshoreDirectionDeg` mod den faktiske bearing fra `dataPoint` til `pinPoint` og ved at teste kompas- og scorekonventioner på syntetiske fixtures.

## 2026-08-03 – 4.0.93
- GitHub-kørslen efter 4.0.92 viste endnu en gammel fast antagelse: geometri-rollbacktesten krævede samme zoneantal og ID-sæt som historiske snapshots, selv efter en eksplicit administratorsletning.
- Hele zone-testkontrakten blev ændret fra historiske produktionsværdier til dynamisk integritet: manglende zoner skal være dækket af centrale sletningstombstones, og aktive zoner skal stemme med vejrdata.
- Administratorens godkendte navn, kystlinje, land-/havpunkter, retningsankre og pålandsretning er autoritative. En 180° korrektion er gyldig, når hav→land-geometrien stemmer.
- Rollbackværktøjet ændrer fremover kun polygongeometrien og kan ikke genoplive slettede zoner eller overskrive aktuelle adminfelter.
- En samlet regressionstest simulerer omdøbning, kystlinjeredigering, 180° vending, zonesletning og ikke-godkendte kladder.

## 2026-08-03 – 4.0.94
- Den grønne 4.0.93 blev valideret som baseline før ændringer.
- En read-only audit af administrator-redigerbare datakæder viste, at zoner, retninger, kystlinjer og stationsrouting allerede havde en produktionskæde, mens centralt gemte aktive regler kun blev læst lokalt i administratorens browser.
- Offentlig regelindlæsning blev ændret til en sanitiseret, versionsstyret fil genereret fra Supabase ved deployment.
- Rå centrale adminfiler blev udelukket fra Pages-artifactet.
- Ingen scorekonstanter, DMI-kæder, kortfunktioner eller zoneværdier blev ændret.

## 2026-08-04 – 4.0.96 vandstandsstations-admin
- Brugerens produktionstest viste, at alle stationer blev advaret som utilgængelige, automatiske stationer ikke blev grønne, og første zone kunne stå med tomt kort.
- Sitetesten dokumenterede `ReferenceError: stationDeliveryLabel is not defined`.
- Rettelsen er afgrænset til admininitialisering og beskyttet stationsstatus: runtimekald rettet, Supabase-hydrering tilføjet, ukendt status bevares, og central upload er ikke-destruktiv.
- DMI-prognosekæde, vandstandsværdier, interpolation og RavScore er uændrede.

## 2026-08-04 – 4.0.99 sandfærdig stationsobservation
- Historisk regressionanalyse af 4.0.52–4.0.94 viste, at OceanObs-kæden kun hentede `sealev_ln`, selv om stationsregistret også indeholder `sealev_dvr` og `sea_reg`.
- Samme kæde markerede en observationskørsel som succes uden krav om en eneste gyldig stationsmåling og brugte stationsregisterets størrelse som succesindikator.
- 4.0.99 henter alle tre vandstandsparametre, fletter seneste gyldige måling pr. station og registrerer kun succes ved reelle friske målinger.
- API-/netværksfejl tæller ikke længere som en manglende leveringskørsel for alle stationer.
- Stationscache kan nu dokumenteres direkte fra seneste reelle observation plus den konfigurerede cacheperiode.
- STAC/GRIB-modelprognosen, RavScore og den kanoniske strømvektorkæde er ikke ændret.

## 4.0.100 – fælles vandstandskilder
- Brugerbeslutning: både fysiske målestationer og DMI-prognosepunkter må bruges som vandstandskilder, når de har en gyldig femdøgnsprognose.
- Implementeret kildeklassifikation: `observation-station` og `forecast-point`.
- Begge typer samples i samme DKSS STAC/GRIB-model ved kildens koordinat, så serierne er sammenlignelige og indeholder meteorologisk/oceanografisk totalvandstand, ikke kun astronomisk tidevand.
- Administratoroverride har prioritet; ellers automatisk topologisk routing. Ved to kilder anvendes inverse afstandsvægte.
- Den resulterende serie forplanter sig til aktuel vandstand, RavScore, ranglister, femdøgnsprognose og time-for-time-tabellen.


## 2026-08-05 – 4.0.103 sikker Pages-pakning og verificerbar vandstandskæde
- Sundhedstjekket dokumenterede, at supportpakken kunne følge med i Pages-artifactet. Buildet udelukker nu `_support/` og `RavRadar-support-*.zip`, mens den private Actions-artifact bevares.
- Brugerbeslutning: automatisk interpolation og administratoroverride skal bruge samme reelle geografiske afstand. Kysttopologien bevares uændret som kandidatvalg; kun vægtgrundlaget er ensrettet til haversineafstand.
- DMI-dokumentationen viser collections `station`, `observation`, `tidewater` og `tidewaterstation`. Det plurale `tidewaterstations` gav 404 og er erstattet med den dokumenterede entalscollection.
- Kildediscovery og hver produceret kildes femdøgnsstatus auditeres nu eksplicit. Auditfilen er beskyttet og medtages ikke på Pages.
- Ny samlet regressionstest følger automatisk routing og administratoroverride gennem den producerede aktuelle vandstand, forecastStore og time-for-time-serie og kontrollerer samtidig Pages-eksklusioner og endpointkontrakt.

## 4.0.104 – administratoroverride og falske nulserier
- Rodårsag 1: Ved første kortklik i en zone uden eksisterende routingpost blev et midlertidigt objekt ændret, men objektet var ikke knyttet til `state.waterRouting.zones`. Valget kunne derfor ikke blive aktivt, gemt eller vist rødt.
- Rodårsag 2: Vandstandsroutingens talnormalisering behandlede `null` som `Number(null) = 0`. Manglende DMI-værdier kunne dermed danne en falsk, næsten konstant 0 cm-serie og gøre en tom prognosekilde routingberettiget.
- Rettelse: Routingpost oprettes direkte i det persistente dokument; `null`, `undefined` og tom streng afvises før numerisk konvertering.
- Regressionstest beskytter begge runtimekæder.

## 2026-08-05 – 4.0.105 prioriteret vandstandsadmin
- Produktion viste, at gemte administratorvalg kunne dukke op flere minutter efter fanen, og at “Fjern” kunne være uden varig effekt.
- Historisk og aktuel kodeanalyse viste, at vandstandsrouting ventede bag hele adminens diagnose-, regel- og historikblok og derefter kunne erstatte den viste tilstand.
- Zoneregister, DMI-vandstandskilder og central routing har nu deres egen prioriterede kæde. Fanen viser kun indlæsning, indtil denne kæde er komplet.
- Den langsomme baggrundsinitialisering genindlæser eller overskriver ikke længere vandstandsroutingen.
- Sitetesten måler nu reel funktionel klarhed for vandstandsfanen, ikke kun at admin til sidst bliver færdig.

## 2026-08-05 – 4.0.106
Konsollen dokumenterede QuotaExceededError ved både `ravradar-admin-document:water-level-station-routing` og legacy-nøglen. HAR viste, at routingdokumentet kun var ca. 2 KB, mens runtime-diagnostik alene var ca. 5,6 MB og stationsregisteret ca. 0,57 MB. Den generelle admin-document-cache havde fyldt browserens kvote. Store read-only dokumenter caches ikke længere lokalt, gamle cacher ryddes, og lokale skrivefejl er ikke-blokerende.

## 2026-08-05 – 4.0.107
Tilstandsmodellen er startet i score-neutral skyggetilstand. Pipelinen opsamler nu faktiske DMI-strømvektorer, alignment mod zonens aktuelle retningsankre, vindretning og vandstand og beregner indtransportmomentum, udtransporttryk, stærke energihændelser, mobiliseringspotentiale, nærkystpotentiale og procesfase. Ingen generelle strømbånd anvendes. Rå historik holdes væk fra public runtime. Ejer har samtidig produktionsbekræftet 4.0.106-rettelsen af røde vandstationsmarkører, override og Fjern.

## 4.0.108 – workflow-validering efter frisk DMI-proveniens
- Rodårsag: 4.0.107 validerede det hydrerede gamle datasæt før frisk DMI-opdatering. Strømauditten fandt derfor 0 direkte verificerede u/v-timer og stoppede push-workflowet.
- Rettelse: rækkefølgen er nu hydration → preflight → DMI/vejr → u/v-proveniens → public runtime → fuld validering → release gate → deploy.
- Regressionstest: `scripts/test-workflow-validation-order-4.0.108.mjs`.
- Ingen ændring af RavScore, skyggetilstandsmodel, offentlig load eller vandstationsfunktionalitet.

## 4.0.109 — workflow-test rettet
- Produktionsworkflowet i 4.0.108 nåede DMI-bulk, vejropdatering, strømproveniens og runtimebygning, men blev stoppet af en forældet test, der krævede to runtimebygninger.
- Kravet er nu rettet til præcis én deterministisk runtimebygning efter frisk vejr/proveniens og før validering.
- Ingen model- eller UI-adfærd er ændret.

## 2026-08-06 – 4.0.110 marine recovery før HARMONIE
- Produktionsloggen viste, at ét HARMONIE-asset på ca. 600 MB brugte ca. 676 sekunder. DKSS nåede derefter kun fire timer, og u/v-auditten fandt 0 verificerede prognosetimer.
- Rodårsagen var schedulerens vindreservation, som prioriterede atmosfære foran release-kritiske marine data.
- Når marinehorisonten er ufuldstændig, prioriteres DKSS nu før HARMONIE og bølger. Auditkravet er bevaret; manglende u/v skjules ikke.
- Fast udviklingsregel: ændringer skal konsekvensanalyseres gennem hele kæden fra scheduler og tidsbudget til cache, runtime, tests og deploy.

## 4.0.111 – Historisk forklaring i skyggetilstand
- Tilføjede fælles tilstandsforklaring til zonepanel, debug og Spørg RavRadar uden at ændre den numeriske score.
- Tilføjede bindende kildeneutralitetsregel og automatisk releaseblokering ved forbudte eksterne navne.
- Fastholdt hurtig offentlig opstart ved kun at bruge kompakte state-felter beregnet i pipelinen.


## 2026-08-06 – 4.0.112 sikker overlevering og automatisk referencevalidering
- En lang projektchat gjorde det nødvendigt at flytte maksimal aktuel viden ind i projektet før næste chat.
- Ny `05_NEXT_CHAT_HANDOFF.md` samler læserækkefølge, baseline, tilstandsplan, bindende afgrænsninger, driftsrisici og første handlinger.
- Fire manuelt kontrollerede zoner er gjort til automatiske referencezoner; nye omfattende billedserier skal normalt ikke kræves.
- Als Odde og Helberskov er korrigeret i dokumentationen som åben kyst nord for Mariager Fjord, ikke fjord.
- Sitetestens eneste kendte falske negative er rettet ved eksplicit dashboardaktivering og vent på klikbar knap.
- Tilstandsmodellen ændrer fortsat ikke RavScore. Næste scoretrin er glidende varighed/styrke af faktisk indadgående DMI-strøm, efter faglig skyggevalidering.
- DMI-workflowets lange køretid forbliver et separat optimeringsspor.

## 4.0.113 – 6. august 2026
- Fem produktionslogs blev analyseret samlet med projekt-ZIP og sitetest.
- Fast ugentlig GitHub-cache-nøgle blev identificeret som rodårsag til tabt rå GRIB-cachefremdrift mellem kørsler.
- Workflowet bruger nu separat restore/save og unik save-nøgle pr. run.
- Referencezonediagnostik er datasætbundet, logges kompakt og valideres strengt efter frisk produktion.
- RavScore er uændret. Cronintervallet afventer nye målinger efter cachekorrektionen.


## 2026-08-06 – 4.0.114 deployisolering
- Gentagne runs byggede og uploadede Pages-artifact, men stod i `deployment_queued` til timeout.
- Regressionanalysen fandt ingen ændring i Pages-actions mellem 4.0.112 og 4.0.113, men den monolitiske jobstruktur holdt `github-pages`-miljøet gennem hele den tunge pipeline.
- Build/data og deploy er opdelt. Kun deployjobbet ejer miljø og Pages-rettigheder.
- Fejlet deploy kan genkøres alene. Push/tvungen release kan afbryde en ældre almindelig vejropdatering.
- Score, DMI, marine audits og skyggetilstand er uændrede.

## 2026-08-06 – 4.0.115 verificeret historisk strømtilstand
- 4.0.114 blev produktionsbekræftet med grøn GitHub Pages-deploy og sitetest 19/19; 208 zoner havde data, 29 verificerede strømpile blev vist, og startup var 3,663 sekunder.
- Historisk transport blev identificeret som beregnet før den endelige DMI-proveniensberigelse.
- 4.0.115 genberegner transporthistorikken efter provenance og lader kun verificerede marine DMI-u/v-prøver tælle.
- Akkumuleret 24-timers transport er adskilt fra det aktuelle sammenhængende strømregime.
- `shadow-v2` er fortsat score-neutral. Den midlertidige Pages-mikrotest er fjernet.

## 2026-08-07 – 4.0.116 DMI-vektorintegritet og null-sikker femdøgnsprognose
**Status:** IMPLEMENTERET LOKALT, AFVENTER CI/PRODUKTION

- 4.0.115 blev stoppet af den strenge strømaudit, som fandt U/V-komponenter fra forskellige fysiske DMI-gitterpunkter og enkelte zoner uden komplet bulkgrundlag.
- 4.0.116 vælger kun strøm- og vind-U/V som par fra nærmeste fælles fysiske DMI-gitterpunkt; ingen fælles kandidat bliver manglende/ikke-verificeret data.
- Ældre cachede U/V-par med forskellige dokumenterede gitterpunkter invalideres sikkert.
- Vandstandskilder med `SOURCE::` bruges kun til DKSS-vandstand og tæller ikke som almindelige forecastzoner i dækning eller schedulerunderskud.
- Manglende vind/bølge behandles ikke længere som fysisk nul i den relevante JavaScript-kæde; ægte numerisk nul bevares.
- Eksternt croninterval er 15 minutter. Yderligere schedulerændring kræver nye målinger.
- `shadow-v2`, RavScore-vægte og dokumenteret morfologi er uændrede og score-neutrale i denne recovery-release.

## 4.0.117 – aktiv-zone scheduler og DMI-vind recovery
- Produktionskørsel #1717 bekræftede, at 4.0.116 fjernede U/V-grid mismatch.
- Schedulerens cachebaserede nævner er erstattet af det aktuelle aktive zoneregister.
- HARMONIE-deficit bruger nu samme family-key `wind` som collection-mappingen.
- Marine-first og de strenge marine audits er bevaret; score-neutral historisk tilstandsmodel er uændret.
- Ny regressionstest beskytter schedulerens aktive zoner, family-key og recoveryprioritet.

## 2026-08-07 – 4.0.117 hotfix – geografisk DKSS-recovery
- Produktionskørsel #1728 fejlede først i den strenge strømaudit efter vellykket DMI-opbygning, public runtime og referencezoner.
- Tre aktive Limfjordszoner manglede i bulkcache, fordi schedulerens to produktive slots gik til `dkss_nsbs` og `dkss_idw`, mens `dkss_lf` stod som nummer tre.
- Schedulerens marineprioritet bruger nu de aktive manglende zoners kysttype og den eksisterende DKSS-model-penalty, så den model der kan lukke flest faktiske grundlagsmangler kommer først.
- Mod #1728-state prioriteres `dkss_lf` før `dkss_nsbs` og `dkss_idw`; 11 marinegrundlagsmangler er Limfjord og 1 er vestkyst.
- DMI-only strøm, fælles U/V-gitterpunkt, runtimebudget og strenge marine audits er ikke svækket.
- Seks nyere chats er arkiveret som CHAT-0008–CHAT-0013 med kildeneutraliseret normaltekst og dynamisk kronologivalidering.

- Produktion #1738 bekræftede, at scheduler-hotfixen virkede (`dkss_lf` + `dkss_nsbs` blev kørt friskt), men strømauditten fejlede fortsat på DK-B05-10, DK-B05-13 og DK-B05-20.
- Ny rodårsag: Limfjordens marine kandidatsøgning undersøgte kun 16 kandidater/prober til 0,14°, selv om den fysiske acceptgrænse er 24 km. Søgefladen kunne derfor ikke altid finde et fælles vådt U/V-punkt inden for den tilladte afstand.
- Rettelse: kun Limfjordssøgningen udvides til 48 kandidater og prober til 0,26°; 24-km-grænsen og kravet om samme fysiske DMI U/V-punkt er uændrede.

## 2026-08-07 – 4.0.117 produktionsverifikation og Codex-handoff
- Commit `6c1dece72d5970a1fc095b9a22f080d811cd9f36` er dokumenteret 4.0.117-overgangsbaseline.
- Efter tidligere fejlede 4.0.117-kørsler gennemførte #1749 og #1750 succesfuldt på samme commit; #1750 er den friske kontrol efter seneste admin-geometriændringer.
- Administratorens korrigerede Limfjord-kystlinjer og land-/havpunkter blev synkroniseret fra Supabase og anvendt før DMI/weather-opbygningen.
- Den tilbagevendende U/V-fejl er dokumenteret som vertikallagsproblem i parserkandidaterne; parsergeneration 11 isolerer komponenter efter lag og kræver fælles lag ved parring.
- Arbejdsreglen er skærpet: fejlretning skal være systemisk, og lokal grøn test må ikke kaldes stabil produktionsbaseline.
- `sidste inden codex.odt` er importeret som CHAT-0014 med normaliseret kildetekst og hash.
- Ny AI-dokumentationspakke under `docs/ai/` samler Codex-start, knowledge base, arkitekturkort, working rules og roadmap.
- `05_NEXT_CHAT_HANDOFF.md`, Current Truth, Implementation Status, Active Requirements, Known Issues og håndbog opdateres til denne overgangssandhed.

## 2026-08-07 – sen Codex-bootstrap: korrigeret releasebevis og endelig admin-geometri
- Aktuel `main` ved handoff er `a164b6e52fa18efc7209d90779048bb86bcf870a` (`RavRadar 4.0.117 codex handoff v2`).

## 2026-08-08 – forecast-coverage og balanceret DMI-recovery
- #1774-supportpakken viste 203/208 zoner med mindst 96 timers marinegrundlag, men offentlig vind i kun 21/208 zoner og bølger i 175/208.
- Merge og public projection bevarede mangler korrekt. Schedulerens binære marine-foundation-tilstand brugte derimod begge produktive pladser på DKSS på grund af fem resterende marinehuller og udsultede HARMONIE.
- DEC-0028 indfører balanceret recovery efter 95 % marinegrundlag: én relevant DKSS-plads og én plads til den mest underdækkede vind-/bølgefamilie. Bred marinefejl er fortsat fuldt marine-first.
- Ingen audits, gridafstande, DMI-only-krav eller null-regler er svækket. Frisk produktion afventer.
- #1778 og #1779 bekræftede rækkefølgen `dkss_lf,harmonie_dini_sf`, begge fulde gates og deploy. Vind med mindst noget offentligt data steg fra 21/208 til 199/208 zoner.
- Supportmålingen viste, at den første kørsel brugte tre store downloads på udløbne HARMONIE-trin. Trin ældre end én time filtreres nu før download; 96-timers dækning skal fortsat opbygges og produktionsmåles.
- #1783 filtrerede dokumenteret to udløbne HARMONIE-trin og behandlede 23–01 UTC, men valgte en ny 21 UTC-generation med kun 11 forecasttrin. Vind fandtes fortsat i 199/208 zoner, mens 96-timersdækningen faldt til 1/208.
- Run-valget er derfor gjort progressionsstabilt: en foretrukken generation fastholdes, mens den rækker mindst 96 timer frem; ufuldstændige nye publikationer udskydes og diagnosticeres. Frisk produktion afventer.
- #1785 bestod fulde gates og deploy og valgte dokumenteret 18Z (54,7 timer) frem for den nyere 21Z (51,7 timer). Supportpakken viste samtidig, at HARMONIE-samlingen kun har cirka 60 timers native horisont. Fastholdelsen er derfor korrigeret til 48 timer for HARMONIE; marine samlinger beholder 96 timer. Næste run skal bevise genbrug af 18Z-reference og videre progressiv opbygning.
- Nyt brugerkrav DEC-0030 præciserer, at native HARMONIE-horisont ikke reducerer produktets femdøgnsmål. Efter aktiv cachestabilisering skal P1 kortlægge og designe individuelle cirka 120-timers DMI-first kæder for alle forecast-/scorekomponenter. Ekstern fallback må kun udfylde den manglende hale; analyse og særskilt design kræves før produktionsændring.
- #1788 produktionsverificerede HARMONIE-fastholdelsen på `e29fb7d`: 18Z blev fastholdt med 48-timersgrænse og eksplicit deferred 21Z, fire assets blev genbrugt, og serien voksede til syv behandlede tider. Begge fulde gates og Pages-deploy var grønne. DEC-0030-kortlægningen kan derfor begynde som næste P1-analyse.
- DEC-0030 fase A er startet uden produktionskode. Officiel DMI-dokumentation korrigerer HARMONIE NEA til 54 timer og viser WAM 5½ døgn samt DKSS 5 døgn; begge oceanprodukter indeholder 10 m vind og bruger ECMWF-forcing efter HARMONIE-delen. Aktuel kode bruger allerede time-/komponentvis DMI-first merge, men mangler collection/run/lead-time-proveniens, eksplicit Open-Meteo-modelidentitet og verificeret UTC-overgang. WAM-/DKSS-vind undersøges før ekstern hale-fallback.

## 2026-08-08 – planlagt videnskabelig RavScore-forskning
- En større forsknings- og modelvalideringsrunde er registreret som P3 i DEC-0029; den udføres ikke under den aktuelle forecast-/schedulerstabilisering eller foran højere P0/P1-opgaver.
- Den senere opgave skal opbygge en fysisk systemmodel fra frigivelse til jagtbarhed, auditere RavScore-koden, udarbejde evidensmatrix og designe virkelighedsvalidering uden automatisk scoreændring.
- Det bindende produktionsforbud mod generelle strømbånd består. Forskningen må senere revurdere rumlige strømstrukturers selvstændige informationsværdi, men enhver implementering kræver separat godkendelse.
- Ejeren præciserer, at vind ved kortets viste pile kun er en del af helheden. DEC-0029 kræver nu analyse af det relevante rumlige og historiske vindfelt, også uden for pile-/zonepunkter, samt kobling til bølger, strøm, mobilisering og transport. Kortets UI-markører må ikke blive en videnskabelig afgrænsning.
- Efter #1758 blev yderligere fire zoner konstateret geografisk forkerte og korrigeret centralt i admin: **Fur syd**, **Gjøl og Attrup**, **Aalborg vest og Egholm** samt **Aalborg øst og Nørresundby**. Kystlinje og/eller land-/havpunkter blev rettet som autoritativ geometri.
- #1760 kørte efter disse sidste adminrettelser på `a164b6e…` og gennemførte DMI bulk, central weather-cache, current provenance, public runtime, referencezoner, `validate:data` og GitHub Pages-deploy.
- Ny kritisk opdagelse: #1760 sprang de fulde trin `npm run validate` og `npm run release:gate` over, fordi almindelig `workflow_dispatch` ikke opfylder workflowets `push || force`-betingelse. Et grønt automatisk run kan derfor være deployet uden fuld releasegodkendelse.
- Konsekvens: de seneste automatiske grønne runs må ikke bruges som fuldt stabilitetsbevis. Status er kode på `main` og deployet, men ingen ny streng baseline er endnu bevist.
- Den sidste pre-Codex handoff-ZIP ændrer bevidst ikke workflowbetingelserne. Første Codex-kodeopgave er at lukke gate-bypasset direkte i repositoryet og derefter få en frisk kørsel, hvor begge fulde gates faktisk står `success`.
- Før denne strenge kørsel er grøn, må ingen større videreudvikling begynde.

## 2026-08-07 – første Codex-kodeopgave: gate-bypass lukket lokalt
- Faktisk `main`/HEAD blev verificeret som `cd70f505054d8578ea29c47be086f0b496161de0`; working tree var rent før ændringen.
- Bypasset blev bekræftet i både lokal fil og `origin/main`: gates krævede `push || force`, mens Pages-artifactet kun krævede positiv preflight.
- Begge fulde gates kræver nu enhver positiv preflight og står fortsat efter frisk data/proveniens/runtime og før artifactet.
- Negativ preflight bevarer den billige skip-adfærd uden artifact/deploy.
- Workflow-regressionstesten beskytter gatebetingelserne og artifact-rækkefølgen.
- Status efter implementeringen er lokalt rettet; CI-/produktionsverifikation afventer samme friske run med begge gates og deploy som `success`.

## 2026-08-07 – streng #1769 stoppede strukturelt tab af fire aktive zoner
- #1769 på `b3cb3974…` bekræftede, at positiv preflight nu planlægger fuld validate og releasegate før artifact; deploy blev korrekt stoppet ved fejlet validate.
- Central admin-sync og geometrianvendelse lykkedes med 208 aktive zoner. DMI, weather, provenance, public runtime og referencezoner blev bygget.
- Spatial-auditten fandt fire aktive zoner uden komplet `conditions/public/bulk`: `DK-B05-17`, `DK-B05-22`, `DK-B05-23` og `DK-B10-10`.
- Rodårsag: initial materialisering oprettede zonerne, men `clean_and_summarize()` slettede alle tomme `hourly`-records igen.
- Rettelse: aktive tomme records bevares som eksplicit missing. Ingen nul-, stale- eller fallbackdata konstrueres.

## 2026-08-07 – #1772 etablerer streng produktionsbaseline
- #1772 kørte på `292b402487efaf74e2a102773a3a8fbfbd39f5af` med seneste centrale admin-konfiguration.
- DMI bulk, weather-cache, current-proveniens, public runtime og referencezoner blev bygget med `success`.
- `Validate full project after fresh weather and current provenance` og `Run release governance gate after refreshed data validation` var begge `success`, ikke skipped.
- Pages-artifact, upload og `Deploy to GitHub Pages` var `success` i samme run.
- P0-bypasset og den efterfølgende tom-zone-regression er dermed CI-valideret og produktionsverificeret.

## 2026-08-08 – 4.0.118 DMI-first vindhale
- Officiel kildeaudit førte til HARMONIE som primær vind og DKSS 10-meter U/V som separat DMI-hale.
- Parsergeneration 12, modelisoleret interpolation og UTC-fallback er implementeret lokalt med regressionsdækning.
- Efter nattens #1828 viste den fulde produktionslog, at vindhale-V aldrig blev genkendt: lokalt DKSS-id 34 kolliderede med generisk `sst`-metadata.
- 4.0.119 gør producentens lokale id autoritativt, bruger parser/parameterkort 13/4 og roterer DKSS efter zonernes manglende komplette U/V-vindhale.
- #1831 produktionsverificerede begge DKSS U/V-felter, 107 vindhalezoner ≥96 timer, fulde gates og deploy. Offentlig samlet vind nåede 200/208 zoner, 108/208 ≥96 timer og maksimum 111,5 timer.
- RavScore er uændret. Frisk GitHub/DMI-produktion skal stadig bevise faktisk 118–119-timers dækning, kildeskift, gates og deploy.

## 2026-08-08 – permanent AI-model- og kvotestrategi
- DEC-0031 gør kvalitet-først-modelvalg bindende under den ugentlige Codex-kvote.
- Codex skal selv anbefale en billigere aktuelt tilgængelig model, når kvaliteten er den samme, og selv stoppe for at anbefale skift tilbage til Sol før kritisk arbejde.
- Kvoteudløb må ikke sænke analyse, forskning, tests eller validering; en pause kræver et permanent genoptageligt checkpoint.
- Den store videnskabelige RavRadar-/RavScore-analyse bruger som udgangspunkt Sol til centrale synteser og vurderinger.
## 2026-08-08 – 4.0.121 workflowoprydning
- Kontrol af kode, tests, aktiv dokumentation og Git-historik bekræftede, at `schedule-test.yml` og `pages-microtest.yml` kun var historisk diagnostik.
- Begge er fjernet. `update-and-deploy.yml` er fortsat eneste produktionsworkflow; `pages-build-deployment` tilhører GitHub Pages og er ikke en repositoryfil.
- Workflow-kontrakttesten beskytter det reducerede inventar. AI-hukommelse, RDKS og begge håndbøger forklarer begrundelsen.
## 2026-08-08 – 4.0.122 produktionsverificeret vindhale
- #1845 på `76c7c23` bestod frisk DMI, fuld validering, release-gate, artifact og Pages-deploy.
- Offentlig dataset `rr-20260808124116-208`: 208/208 zoner, 118 sammenhængende vindtimer.
- Fem-zoners direkte DKSS-gridproveniens er fortsat særskilt audit; fallbackdækning må ikke kaldes direkte DMI-bevis.
## 2026-08-09 – 4.0.141 privat score-neutral UI-gate
- Den faktiske kortvisning er auditeret: aktiv `coastLine` er RavScore-farvet og skal forblive parent-zonens autoritative visning.
- Et privat HTML/JSON-review bevarer parentens linje, farve, score, klikmål, tooltip og rangering; delene er kun neutrale, stiplede og ikke-interaktive forslag uden score eller “bedste del”.
- Ingen geometri, sampling, state, admin-data, offentlig UI eller RavScore aktiveres. Privat CI-artifact og normal produktionskørsel afventer.
- Produktcommit `67a6ebd` er pushed. Privat pilot #2009 bestod hele kæden og artifactaudit; normal produktion #2008 bestod central adminsync, Supabase-roundtrip, frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig version er 4.0.141.
## 2026-08-09 – 4.0.142 privat admin-roundtrip/rollback-kandidat
- En Blåvand-specifik gate skriver kun en unik midlertidig, aldrig aktiv kladde og kræver verificeret create/read/update/delete samt fravær efter rollback.
- De autoritative runtime-dokumenters payload-hash og version skal være uændrede. Ingen aktivering; privat CI afventer.
- Produktcommit `ca5f920` er pushed. Privat pilot #2014 bestod med verificeret rollback og urørte runtime-dokumenter; normal produktion #2013 bestod fulde gates og deploy. Næste trin er eksplicit ejer-go/no-go.
## 2026-08-09 – DEC-0033 bedste kystdel bestemmer zonescoren
- Ejeren besluttede, at højeste gyldige lokale delscore skal være zonens viste RavScore.
- UI skal tydeligt skelne hele zonen fra navngivne delstrækninger og forklare vind, strøm, bølger, vandstand, state/historik og forskellen til andre dele.
- Dæknings-/usikkerhedstærskler og shadow-validering mangler; beslutningen aktiverer ikke Blåvand.
- Ejeren fastsatte en midlertidig pragmatisk margin på 7 point: 78 mod 75 gælder praktisk hele zonen uden delopdeling. Marginen skal genvurderes i den store RavScore-analyse.
- Bestillingen er national bygning og offentlig aktivering, ikke kun Blåvand. Lokale navne skal knyttes til konkrete huk, byer, havnemoler eller andre forståelige orienteringspunkter. National aktivering forbliver gated af landsdækkende geometri-/navne-/topologi-/DMI-/UI-/rollbackvalidering.
## 2026-08-09 – DEC-0034 pre-domain national testaktivering
- Ejeren fastlagde, at den nuværende GitHub Pages-side uden aktive brugere er testmiljø frem til senere domænekøb.
- Hele Danmark skal bygges, kendte fejl skal rettes og den samlede kystgeometri-v2 må aktiveres på testsiden efter grøn national gate. Blåvand er reference, ikke eneste zone.
- En senere domæne-/brugerrelease kræver en ny modenheds-/produktionsgate. Dataintegritet, gratis kilder, secretsikkerhed og rollback gælder fortsat.

## 2026-08-09 – 4.0.143 national kildeplan-kandidat
- Auditten viste, at den hidtidige v2-generator kun dækkede tre pilotområder og ni zoner.
- En ny planlægger kræver den centralt effektive bestand på 208 zoner, danner deterministiske kildefliser og klassificerer kendte geografiske fejl samt centrale adminændringer maskinlæsbart.
- Et separat privat workflowjob henter syv gratis officielle GeoDanmark-lag nationalt og deduplikerer fliseoverlap. Det har ingen Pages-rettigheder og kan ikke ændre geometri, admin, vejr eller score.
- Lokal kontraktvalidering er grøn. Privat national CI, artifactaudit og topologigenerering mangler.

## 2026-08-09 – 4.0.144 national skalerings- og source-QA-kandidat
- #2027 produktionsverificerede 4.0.143 med fuld Linux-validate, releasegate og Pages-deploy.
- Den private 4.0.143-nationalmåling dannede 101 fliser/707 requests og var fortsat sekventielt aktiv efter mere end ti minutter uden flisefremdrift.
- 4.0.144 anvender højst fire samtidige fliser, logger fremdrift, validerer alle filer/hashes/lag/208 zoner og scanner for credentials før upload.
- En rumligt indekseret national QA sammenholder de samlede officielle kystobjekter med alle effektive zoner og viderefører konfliktklasser uden mutation eller aktivering.
# 2026-08-09 – 4.0.145 kompakt national QA-artifact
- #2028 produktionsverificerede 4.0.144 med fuld Linux-validate, releasegate, artifacts og Pages-deploy.
- Privat #2029 bestod central hydration/tombstones, 208-zoneplan, 101 fliser/707 requests på cirka 5:15, kildevalidator, `STRtree`-QA og privat råupload; hele jobbet tog 7:45.
- Råartifactet er 413 MB komprimeret. 4.0.145 bevarer det og uploader samtidig plan, manifest og begge QA-filer som en separat kompakt privat pakke.
- Ingen aktiv geometri, admin-data, vejrsampling, state, offentlig UI eller RavScore ændres.
# 2026-08-09 – 4.0.146 national read-only topologiaudit
- #2032 produktionsverificerede 4.0.145. Privat #2033 uploadede både råartifactet på 413 MB og den kompakte QA-pakke på 6,8 MB.
- Artifactet korrigerer målingen til 100 central-hydrerede fliser/700 requests; 101/707 var repositorybaselinen før central hydration.
- 12.094 deduplikerede kystfeatures gav 9.929 relevante kyststykker, men kun 20 referenceklare og 188 flaggede zoner. Blind snapping er forkastet.
- 4.0.146 tilføjer officielle nationale fjord-/normasker, havn-/åmundingsudskæring, klit-/skræntevidens, score-neutrale høfter og en fail-closed 208-zone topologigate uden aktivering.
# 2026-08-09 – 4.0.147 tilbageholdt åmundings-oversegmentering
- #2036 produktionsverificerede 4.0.146; privat #2037 bestod teknisk 208-zone topologiaudit og isolation.
- Artifactet målte 90 officielle fjord-/norpolygoner, 1.225 havneobjekter, 3.347 høfter og klit-/skræntevidens i 183/168 zoner.
- 2.868 åmundingsklynger, op til 189 i én zone, er fagligt afvist som oversegmentering trods grøn teknisk gate.
- 4.0.147 tilbageholder åmasker i zoner over 20 og eksporterer privat egenskabsprofil samt højst 200 geometri-frie samples til næste regelrevision.
# 2026-08-09 – 4.0.148 kildebaseret åbreddefilter
- #2039 produktionsverificerede 4.0.147; privat #2040 verificerede 45 overdense zoner med nul anvendte åmasker.
- Profilen viste 2.551 kandidater på 0–2,5 m, 806 på 2,5–12 m og 37 på mindst 12 m; synlighed/type skelnede ikke.
- 4.0.148 kræver officiel midtebredde mindst 2,5 m og fysisk linjelængde mindst 100 m, rapporterer smalle/korte fravalg og bevarer >20-klynge no-go.
# 2026-08-09 – 4.0.149 private nationale kystdelsforslag
- #2042 produktionsverificerede 4.0.148; privat #2043 reducerede åklynger til 489 og overdense zoner til den kendte `DK-B10-10`-partitionskonflikt.
- En ny read-only generator grupperer kun faktiske fragmenter som multipart, kræver officielle navne og holder punkter, sampling, state, score og aktivering falske.

# 2026-08-09 – 4.0.150 national lokalitetsgate
- #2046 produktionsverificerede 4.0.149 med fuld datakæde, validate, release-gate og Pages-deploy. Privat #2047 dannede 755 dele i 194 zoner; 14 zoner havde ingen del, 54 var planlagte konflikter, og én havde over 25 dele.
- Nul forbindelser, navne, punkter eller runtimefunktioner blev opfundet. Artifactauditen viste dog 23 dele over 20 km og 14 dele med over 20 fragmenter.
- 4.0.150 markerer de for grove dele fail-closed til lokalitetsreview. Lokal genbygning giver 129 umiddelbart reviewbare og 79 blokerede zoner; ingen aktiv geometri ændres.

# 2026-08-09 – 4.0.151 officielle nationale stednavnekandidater
- #2049 produktionsverificerede 4.0.150; privat #2050 verificerede 755 dele, 79 blokerede zoner og lokalitetsflag på 25 zoner/28 dele.
- Efter udtrykkelig ejergodkendelse blev de private delafgrænsninger brugt mod Dataforsyningens nøglefrie officielle `steder`-API. 503 requests over 100 udvidede fliser gav 37.815 deduplikerede steder.
- Alle 755 dele fik balancerede kandidater fra direkte kystnavne, lokale bebyggelser, havnekontekst og øvrig kontekst. 751 ramte loftet på 30 kandidater; dette er reviewmateriale, og alle `proposedName` er fortsat null.
# 2026-08-09 – 4.0.152 privat national lokalitetsopdeling
- #2054 verificerede 4.0.151-produktionen, og privat #2055 verificerede officiel kandidatdækning for 755/755 kystdele.
- De 28 grove dele opdeles i 56 read-only forslag på 2,565–19,882 km. Nærliggende kildefragmenter grupperes uden forbindelsesgeometri; 55/56 forslag har officielle direkte kystankre.
- Ingen admin-, produktionsgeometri-, DMI-, state-, score-, navne- eller aktiveringsændring er tilladt.
# 2026-08-10 – 4.0.153 Supabase Free-plan-kvotekontrol
- Supabase varslede fair-use efter 8,233 GB egress og 0,695 GB database. Tre MAU og 274 Edge Function-kald udelukker brugertrafik som hovedårsag.
- Kodeaudit viste ufiltreret fuld payload-readback hvert 15. minut og ubegrænset versionskopiering af bl.a. cirka 7,1 MB runtime-diagnostik.
- Readback filtreres nu til nødvendige adminnøgler (>98 % målt payloadreduktion), beskyttede writes er hash-idempotente, og maskindiagnostik skilles fra menneskelig rollbackhistorik.
- Central read-only audit fandt 8.647 oprydningsbare historikrækker med cirka 600 MB payload. Den bekræftede migration og `VACUUM FULL` blev udført i Supabase: databasen faldt fra 699 MB til 24 MB, alle 14 aktuelle admin-dokumenter er intakte, 676 rollbackrækker/8,3 MB er bevaret, maskinhistorik er 0, og maksimum er 100 versioner pr. dokument.
- Produktionskørsel #2056 på commit `7bb97c3` bestod central adminsync, fuld Linux-validate, release-gate, beskyttet Supabase-sync, Pages-artifact og deploy.

# 2026-08-10 – 4.0.154 officielle navneforslag til endelige lokale kystdele
- Privat #2107 CI-verificerede 4.0.152's friske central-hydrerede nationale kilde-, topologi-, kystdels-, stednavne- og lokalitetskæde; build og Pages var isoleret/skipped.
- Den endelige private bestand er 783 dele: 755 kildedele minus 28 grove erstattede dele plus 56 lokale forslag. Alle 783 får zoneunikke forslag fra officielle kandidat-ID'er med afstand og alternativer; automatisk omdøbning og aktivering er falsk.
- Den ene del uden direkte kystanker er den nordlige Hou/Bisnap-lokalitet. Den lukkes med officiel lokal bebyggelsesevidens `Hou Syd` 508,7 m fra delen, ikke et opdigtet navn.

# 2026-08-10 – 4.0.155 fail-closed nationale lokale punktpar
- #2110 produktionsverificerede 4.0.154; privat #2111 reproducerede 783/783 officielle navneforslag og nul blokerede på friske centralt hydrerede data.
- En lokal normalgate kombinerer officielle landvidner med officielle Farvand-vidner eller zonens centrale marinepunkt. 774/783 punktpar består; 575 bruger officielt Farvand og 199 central marineevidens.
- Ni dele har ingen gyldig modsat-side-kombination. De får null som land-/vandpunkt og præcis to neutrale normalalternativer til næste native DMI-gridreview. Sampling, state, score, admin og aktivering er falsk.

# 2026-08-10 – 4.0.156 national native DMI-gridgate

- #2114 bestod fulde produktionsgates/deploy; #2115 reproducerede 783 dele, 774 punktpar og ni blokeringer fra central admin-geometri.
- Ny privat validator sender 774 valgte vandpunkter og 18 alternativer gennem ét aktuelt WAM/DKSS forecast-step med produktionens parser, nearest-valid-cellesøgning og fælles U/V-regel.
- Rapporten er provenance-only og fail-closed; ingen rå vejrserie, geometri, admin, state, RavScore eller aktivering ændres.

# 2026-08-10 – 4.0.157 coastType-korrekt DMI-modelvalg

- #2118 stoppede alle 774 valgte punkter, fordi validatoren satte `coastType=unknown`; produktionens modelrouting filtrerede derfor Nordsø-WAM væk. Fejlen var i reviewvalidatoren, ikke evidens for 774 forkerte punkter.
- Punktartefaktet bærer nu central `coastType`, og gridgaten kører WAM NSB/DW samt DKSS NSBS/IDW/LF med produktionens egne prioriteringsregler. Ingen aktivering tillades.

# 2026-08-10 – 4.0.158 gridbevis og komponentdækning

- #2122 gav 752 valgte punkter med fuld WAM+DKSS, 18 med komplet DKSS uden WAM og fire med komplet WAM uden DKSS. Alle 774 har mindst én komplet native havmodelfamilie.
- 4.0.158 accepterer dette som vand/gridbevis, men mærker 22 som delvist dækkede. Manglende komponenter forbliver missing. Ni normalsidetvivl forbliver blokeret.
- #2126 bestod fulde produktionsgates/deploy. #2127 bestod hele den centralt hydrerede nationale kæde og bekræftede 774 gyldige valgte punkter, 752 fuldt dækkede, 22 delvist dækkede, nul ugyldige og ni fortsat blokerede; alle mutationsflag er falske.

# 2026-08-10 – 4.0.159 national weather-shadow-kontrakt

- 774 gridvaliderede dele får unik serie-/historikidentitet, samplingpoint og eksisterende gridproveniens. 22 komponentgab bevares; ni blokerede dele udelukkes.
- 194 zoner har private delkontrakter, mens 14 zoner forbliver helt uændrede. Alle 208 parent-zoner beholder autoritativ runtime, historik og score. Ingen sampling eller aktivering.
# 2026-08-10 – 4.0.160 national flertrinsserie-gate

- Implementerede privat, fail-closed flertrinsvalidering for 774 isolerede kystdelsserier.
- Hver faktisk tilgængelig WAM-/DKSS-familie kræver mindst to komplette native trin; 22 kendte familiegab bevares som missing.
- Artifactet må kun indeholde tilstedeværelse, digests og provenance. Rå værdier, state, score, UI, admin og public runtime er uændrede.
- Tre 4.0.159 private CI-forsøg blev stoppet før den nye kontrakt af den officielle stednavnetjenestes ikke-JSON-svar. Ingen gate blev svækket.
# 2026-08-10 – 4.0.161 livefundet routingrettelse

- #2142 bestod hele den nationale upstreamkæde og 4.0.159-kontrakten, men stoppede ved start af flertrinsgaten med manglende `parts_by_id` i live-`run()`.
- Flyttede opslagstabellen til korrekt scope og tilføjede regression for WAM-/DKSS-routing til de kontraktvalgte dele.
- Ingen runtime-, score-, admin- eller dataaktivering.
# 2026-08-10 – 4.0.162 national state-/historikisolation

- #2146 verificerede 774 flertrinsserier, 1.526 familier med to native trin og 9.156 komplette komponentbeviser uden rådata eller mutation.
- Implementerede transient state-replay for 770 DKSS-currentdækkede dele med unik historiknøgle og score-neutral `shadow-v2`.
- Fire WAM-only dele udelukkes eksplicit som `MISSING_DKSS_CURRENT_FAMILY`; ingen parentfallback eller nulstrøm.
- Replayinput slettes efter gate; state, score, UI, admin og public runtime forbliver deaktiveret.
# 2026-08-10 – 4.0.163 native lokal vindgate

- #2152 verificerede 770 isolerede `shadow-v2`-historikker, fire eksplicitte currentgab, slettet replay og nul scorepåvirkning.
- Identificerede lokal vind som nødvendig manglende datagate før DEC-0033-shadow-score; parent-vind er ikke tilladt som skjult fallback.
- Implementerede to-trins native HARMONIE wind-U/V-validering for alle 774 dele med samme-celle- og provenancekrav uden rådata eller aktivering.

# 2026-08-10 – 4.0.164 privat national shadow-score og vindbudget

- #2157 bestod hele upstreamkæden, men vindtrinnet ramte den importerede produktionsparsers standardarbejdsfrist efter 16 minutter. Fejlen er et utilstrækkeligt privat kørselsbudget, ikke evidens for ugyldige vindceller.
- Det private vindtrin får 3.000 sekunders budget; alle eksisterende DMI-, samme-celle-, provenance- og fail-closed-krav bevares.
- En ny privat gate samler kun eksakt tidsfælles native lokale komponenter og genbruger den aktive `calculateRavScore` uden at aktivere resultatet.
- 7-pointreglen omsættes til `whole-zone`, `only-part`, `several-parts` og `uncertain`. Manglende lokal sammenligning er altid `uncertain`.
- Rå marine/vind-input ligger kun transient i `.cache` og slettes efter validering. Parent-runtime og alle mutationsflag forbliver uændrede/falske. Privat CI afventer.

# 2026-08-10 – 4.0.165 native HARMONIE-kystkandidater

- 4.0.164 blev fuldt produktionsverificeret i #2163/#31414155813: frisk DMI, Linux-validate, releasegate, Supabase-sync, Pages-artifact og deploy bestod.
- Privat #2164/#31414173825 bestod geometri, topologi, navne, punkter, grid, marine flertrin og state. Vindgaten brugte det nye tidsbudget og stoppede derefter konkret ved `dk-b05-16-national-part-01` (`Harbo Odde`), som havde nul fælles gyldige wind-U/V blandt fire nærmeste celler.
- 4.0.165 gør atmosfærisk kandidattal miljøstyret og bruger 32 kun i den private nationale gate. Normal produktion beholder fire.
- Samme fysiske U/V-celle og den eksisterende afstandsgrænse på 24/40/32 km for Limfjorden/vest/øst valideres fortsat. Ingen interpolation eller fallback.

# 2026-08-10 – 4.0.166 målrettet HARMONIE-retry

- #2167 viste, at 32-kandidatsøgning for alle 774 dele er en skaleringsfejl: vindtrinnet arbejdede fortsat efter 54 minutter uden resultat og blev stoppet bevidst.
- Første pass bruger igen produktionsstandardens fire celler for alle. Kun de faktisk manglende del-ID'er genbehandles med 32 native kandidater og ryddet gridindekscache.
- Retrypopulationen rapporteres særskilt. Datagaten og 3.000-sekunders budgettet er uændrede.

# 2026-08-11 – 4.0.167 national ejer-review og admin-roundtrip

- Produktion #31425309838 bestod frisk DMI, fuld Linux-validate, releasegate, Supabase-sync, Pages-artifact og deploy.
- Privat #31425327202 bestod hele den central-hydrerede nationale kæde, 774 native vindserier og shadow-score for 752 fuldt dækkede dele. 22 deldækkede og ni blokerede blev bevaret uden fallback eller aktivering.
- Den private reviewside samler 783 dele med officielle navneforslag og statusfarver, som kun betyder datadækning. Del-score, scorefarve, rangering, rå vejr/state og offentlig integration er forbudt.
- National admin-roundtrip bruger kun et unikt midlertidigt dokument, kræver 783-dels readback/update, sletter dokumentet igen og kontrollerer `coastline-overrides` og `direction-reviews` uændrede.
- Brugerbeslutning: arbejdet fortsætter autonomt, indtil den samlede manuelle zonegennemgang er klar. Ingen implicit aktivering.

# 2026-08-11 – 4.0.168 native tretimers vandstandsgate

- Privat #31440337378 bestod hele upstreamkæden og 774-vindgaten, men stoppede shadow-score ved 0/752. Marine og vind havde tiderne 23:00/00:00, men scoremodellen kræver også native vandstand ved `t+3h`.
- Dette er en utilstrækkelig tidsindsamling, ikke en score- eller datakonverteringsfejl. Ingen interpolation eller konstrueret trend tillades.
- Det private job henter nu fire marine assets. Den transiente scoreinputgate kræver mindst ét reelt tretimerspar og giver ellers den præcise blokering `NO_NATIVE_THREE_HOUR_WATER_TREND`.

# 2026-08-11 – 4.0.169 begrænset vindassetvalg

- Privat #31445033036 bekræftede, at fire marine assets og den native tretimersgate består.
- Vindgaten stoppede senere ved downloadgrænsen, fordi den gamle overlaplogik tilføjede flere HARMONIE-assets, når marine input nu havde fire tider.
- Vindgaten vælger nu præcis to assets: et dokumenteret marint scoretidspunkt med `t+3h`-vandstand og ét yderligere native vindtrin. Det bevarer to-trinskravet uden at udvide byteforbruget.
# 2026-08-11 – 4.0.170 national ejerreview klar

- Offentlig #31448257626 produktionsverificerede 4.0.169 med fulde gates og deploy.
- Privat #31448258035 bestod hele den nationale kystzonekæde: 774 vindserier, 752 shadow-scorer, 22 deldækkede og ni blokerede dele.
- Score-neutral ejerreview med 783 dele og central admin-roundtrip/rollback bestod. Beskyttede dokumenter, geometri, score og offentlig runtime var uændrede.
- Reviewartifactet er auditeret og downloadet lokalt. Manuel ejerreview er næste gate; automatisk aktivering er fortsat forbudt.
# 2026-08-11 – 4.0.171 brugbar manuel kystzonegennemgang

- Ejerens skærmbillede dokumenterede, at første Danmarksoverblik var for småt, manglede baggrundskort og ikke gav en meningsfuld godkendelsesarbejdsgang.
- Reviewgeneratoren viser nu én stor del ad gangen med almindeligt kort/luftfoto, stednavne, kraftig valgt linje og automatisk zoom.
- De 31 opmærksomhedsdele vises først. Godkend/Skal rettes, bemærkning, lokal lagring, frem/tilbage og JSON-eksport er implementeret.
- Generatorselftest og statisk browser-JavaScript-test består. Ejeren bekræftede visuelt, at stort kort, baggrund, stednavne, automatisk zoom og kraftig blå kystlinje fungerer og ser fint ud.

# 2026-08-11 – 4.0.172 ejerafgørelser og indre-farvandsefterkontrol

- Ejeren gennemgik alle 31 oprindelige opmærksomhedsdele og eksporterede afgørelserne. De er normaliseret til et versionsstyret privat dokument: 11 godkendt uændret, 10 hele sletninger, tre sikre komponentrensninger, én navnerettelse og seks målrettede beskæringer.
- Stængerodde og Egernsund er blandt de eksplicit godkendte hele sletninger. Præcise vej-, havne- og åben-vandbeskæringer forbliver blokerede mod gæt.
- En ny audit læser alle 768 officielle Farvand-objekter i stedet for kun 90 fjord-/norobjekter. En eksakt metrisk kontrol viser nul faktisk fjord-/noroverlap i de 783 færdige linjer; nærhed er derfor ikke automatisk fejl.
- Nye kandidater kræver mindst fire uafhængige tegn blandt stor afstand til officielt hav, officiel havnenærhed, beskyttet farvandskontekst, meget kort del og lukket ø-/søform. Identisk geometri samles. Efterkontrollen er foreløbig 23 unikke dele, heraf seks kendte målrettede rettelser.
- Hele kæden er fortsat privat og score-neutral. Produktion, admin, sampling, state, RavScore og offentlig UI er uændrede.

# 2026-08-11 – 4.0.173 afsluttet ejerreview og fysisk dubletkontrol

- Ejeren gennemgik de 23 supplerende dele: 15 skal slettes, tre er godkendt, og fem er rettet præcist ved Thyborøn, Bremdal, Bjerget, Bouet og Flyvesandet.
- De fem forslag blev kontrolleret visuelt mod kortet. Der er ingen målrettet rettelse tilbage uden geometri.
- En metrisk audit fandt 12 yderligere tekniske ID'er, som fysisk dublerer allerede afgjorte linjer. Afgørelser føres videre; ved Thyborøn bevares kun den del af dubletten, der ligger langs den rettede kystlinje.
- Samlet korrektionsforslag dækker 60 tekniske dele: 30 sletninger, 19 uændrede godkendelser, ni korrigerede linjer og to navnerettelser. Den nye efterkontrol indeholder nul dele.
- Alt er fortsat privat, score-neutralt og ikke aktiveret i admin, produktionsgeometri eller offentlig runtime.

# 2026-08-11 – 4.0.174 once-only-slutkyst og nye punktpar

- Efter den grønne 4.0.173-kørsel viste en særskilt samlet kontrol 311 fysiske overlappar mellem forskellige zoner. Det tidligere dubletbevis dækkede kun andre ID'er for ejerbedømte dele og var derfor ikke en sluttopologigate.
- En ny once-only-samling anvender central zonekyst og datapunkt som deterministisk ejerskab. Hammer Odde splittes eksplicit ved nordspidsen mellem vest- og østsiden.
- Lokalt resultat: 753 inputdele, 603 endelige fysiske dele, nul overlappar og nul tætte uafgjorte ejerskaber.
- Punktpar er genberegnet på slutgeometrien. Seks tidligere blokeringer ved Thyborøn, Endelave, Flyvesandet, Helnæs, Nordvestlolland og Svaneke er kontrolleret på lokalkort og bevaret som versionsstyrede sideafgørelser. Resultatet er 603/603 punktpar.
- Workflowet gentager native DMI-grid, marine flertrinsserie, state-/historikisolation, vindserie og score-neutral shadow-score efter slut-samlingen. Intet aktiveres automatisk.
# 2026-08-11 – planlagt privat besøgsstatistik
- Ejeren ønsker en usynlig besøgstæller på den offentlige side og en enkel rapport i admin.
- Kravet er registreret som en senere P2-opgave. Rapporten skal være adgangsbeskyttet, dataminimeret og kvotesikker samt skelne sidevisninger fra besøg og eventuel anslået unikhed.
- Der er ikke givet tilladelse til profilering, fingerprinting, rå permanent IP-lagring eller offentlig visning. Statistik må ikke påvirke RavScore eller blokere siden.
## 2026-08-11 – 4.0.182 samler hovedzoner og præcise kyststreger
- Ejeren godkendte national slutkontrol og seks efterfølgende rettelser. Den nye bestand har 212 hovedzoner, 206 præcise kystforløb, seks sikre fallbacklinjer og 643 interne beregningsdele.
- Kortet viser fortsat kun hovedzonerne med én score og to endemarkeringer; de præcise dele bruges til selve kyststregens placering og lokal beregning.
- Kandidaten har nul tværzoneoverlap og nul uafklarede relevante kysthuller. Alle dele har land-/vandpunkter; 632 har fuldt og 11 delvist marint gridbevis.
- Privat #31532688885 bestod DMI for 39 nye/ændrede punktpar. Privat #31533385967 bestod runtime, offentlig kontrakt og central admin-roundtrip/rollback. Produktion afventer fuld release-kørsel.
- Produktionsforsøg #31536061680 og #31537882402 stoppede begge før deploy. Først blev de tre nye Vadehavszoner fjernet af legacy-generatoren; derefter blev den nye kystmanifest overskrevet af den ældre centrale manifest. Generatoren bevarer nu de eksplicit godkendte tilføjelser, og central sync tillader kun engangspromotion af en strengt nyere, eksplicit ejer-godkendt aktivering. Ved versionslighed vinder Supabase fortsat, så senere admin-rollback er intakt.
- #31539597870 passerede begge disse fejl, byggede frisk DMI for et effektivt centralt register på 211 zoner og skrev alle tre nye Vadehavszoner. Den centralt godkendte tombstone `DK-B02-14` forklarer forskellen fra repositoryets 212. Kørslens fulde validering stoppede kun på en formateringsfølsom legacy-test for `sync-admin-config.py`; testen er gjort semantisk og intet blev deployet.
- #31541126136 bestod derefter hele produktionskæden: frisk DMI, fuld projektvalidering, release-gate, central Supabase-readback, Pages-artifact og deploy. Direkte onlinekontrol viste version 4.0.182, 211 effektive hovedzoner, 643 aktiverede dele i 206 præcisionszoner, alle tre Vadehavszoner med offentlige forhold samt et synligt kort uden browserfejl. 4.0.182 er produktionsverificeret.
## 2026-08-12 – 4.0.183 entydige hovedzoneskel og redigerbart delejerskab
- Offentlige sorte skel samles til ét gensidigt møde mellem to forskellige hovedzoner. Interne dele og fritstående zoneender tegner intet skel, og skellet er mindre ved landszoom.
- “Tilbage til oversigten” gendanner Danmarksoverblikket.
- Admin kan flytte eksisterende præcise kystdele til en anden aktiv hovedzone. Geometri, land-/vandpunkt, DMI-gridbevis og del-ID følger samlet med; hver del publiceres kun én gang.
- Hele zonesletningen er bevaret. Ikke-flyttede dele under en slettet zone filtreres fra offentlig runtime, og ugyldigt ejerskab stopper bygningen.
- RavScore-regler og den fysiske 643-delsbestand er uændrede. Målrettede kort-, admin-, propagation-, sletnings- og aktiveringstests består, og GitHub Actions #31572312647 bestod den fulde produktionskæde inklusive Pages-deploy.

## 2026-08-12 – 4.0.184 lokal scoreforklaring

- Reersø og Mullerup viste korrekt grøn RavScore 78 og AI-prognose, men tomme delscorer og en falsk tekst om manglende data.
- Rodårsagen var `localZoneScore`, som beholdt totalscoren fra den vindende kystdel, men erstattede dens `components` og `componentReasons` med tomme objekter.
- Produktionsdata var konsistente: alle 643 dele fandtes, og 412/412 aktuelle kombinationer af 206 præcisionszoner og to jagtformer havde gyldig vinder, score og delscorer.
- 4.0.184 fører vinderens delscorer og faglige forklaringer videre og viser tydeligt én eller flere bedst scorende kystdele, men kun når spredningen er mere end 7 point. RavScore-regler og geometri er uændrede.
# 4.0.185 – lokalt delkort og ryddet zonepanel
- Ejeren besluttede, at den offentlige “Hvad fandt du?”-formular under hver zone skal fjernes.
- Zoneforklaringen får “Hvor er det?”, som ved klik viser de eksisterende præcise kystdele med navne og zoomer kortet til hovedzonen.
- Visningen genbruger den allerede indlæste kystkontrakt og ændrer ikke RavScore, geometri, DMI eller adminlagring.
# 2026-08-12 – bindende beskyttelse mod funktionstab
- Ejeren præciserede, at eksisterende funktioner ikke må smides væk under ændringer.
- RDKS kræver nu udtrykkelig ejerbeslutning før bevidst fjernelse, før/efter-kontrol af den berørte funktionsflade og dokumentation af både det fjernede og det bevarede.
## 2026-08-12 – 4.0.187 fem-zoneaktivering

- Ejeren godkendte fem af seks private zoner visuelt og beordrede `DK-B10-16` Fejø/Femø slettet helt.
- Fejø/Femø er fjernet fra zoneregister og præcis kystpakke og registreret som central administratorsletning i Supabase `direction-reviews` version 315.
- Den aktive kandidat har 651 kystdele i 210 effektive zoner, 651 punktpar, nul ugyldige punktpar og nul overlap. Privat #31609637964 havde allerede bestået geometri, native DMI, runtime og rollback for det godkendte grundlag.
- Den tidligere aktive kyst og zoneregisteret er bevaret i `data/geometry-v2/rollback-4.0.186-before-five-zone-coast/`. Ingen anden fungerende national geometri er ændret.

## 2026-08-12 – 4.0.188 progressiv DMI-zonecache

- Flere runs på både før- og efter-4.0.187-kode stoppede samme sted: current-spatial-auditen fandt kun 85/210 verificerede hovedzoner.
- GRIB-downloadcachen fortsatte, men den opbyggede DMI-zonecache blev kun bevaret ved et grønt deploy. Det nulstillede den afledte fremdrift efter hver rød releasegate.
- GitHub Actions gemmer nu kun en vellykket zonecache privat før releasegaten og gendanner den før næste DMI-opbygning. Builderen vælger mellem privat fremdrift og senest deployede cache efter datadækning, men kun når registersignaturen matcher aktuelle zoner, dele og punkter. Uvaliderede data deployes stadig ikke, og audits er uændrede.

## 2026-08-12 – 4.0.189 DMI-budgetrotation

- Runs #2423–#2426 viste samme reproducerbare mønster: den progressive cache blev bevaret, men auditten stod fast på 125/210 verificerede hovedzoner.
- `dkss_idw` brugte hele arbejdsbudgettet i hver kørsel og blev derefter valgt igen af den geografiske prioritering; de øvrige DKSS-modeller fik ikke arbejdstid.
- Schedulerens private collection-state registrerer nu tidsafbrudte marinemodeller og roterer dem bag ikke-forsøgte/ældre afbrudte modeller i næste recoverykørsel. Fuld/uændret gyldig behandling nulstiller markeringen.
- Kyst, land-/vandpunkter, RavScore, fallback, 90 %-grænse og deploygate er uændrede. CI-bevis mangler endnu.
## 2026-08-12 – 4.0.190 bevarer den nyeste DMI-arbejdsfremdrift

- #2429–#2431 gentog 125/210-dækningen, selv om 4.0.189 skrev budgetrotation. Analyse af hele kæden viste, at workflowcachen blev gendannet, men builderens kvalitetsrangering bagefter kunne vælge en ældre offentlig cache med flere rå komponenter.
- Dermed forsvandt nyere `collectionState`, budgetafbrydelser og behandlede forecast-trin, og efterfølgende runners begyndte igen med samme DKSS-model. Det svarer til det historiske fastlåsningsmønster, men rodårsagen var denne gang cachevalg, ikke STAC- eller GRIB-klassifikation.
- Kompatible caches rangeres nu efter nyeste checkpoint-/buildertid og først derefter datakvalitet. Checkpointet har allerede fået den offentlige cache flettet ind ved kørslens start, så gyldige data og sikker fallback bevares.
- GitHubs 15-minutters triggere kan stå i kø bag et cirka 29-minutters job; dette er forventet. De må ikke længere nulstille fremdriften. Fuld produktionsverifikation afventer frisk CI.
## 2026-08-12 – 4.0.191 fjerner flygtige felter fra DMI-cacheidentiteten

- #2437 gendannede og gemte workflowcachen, men begyndte alligevel igen med `dkss_idw`. Artifact-sammenligning viste forskellige registersignaturer mellem #2435 og #2437.
- DMI-vandkilderegisteret ændrer driftsfelter som `lastSeenAt`, observationstid, forecaststatus og cachetid ved hver produktion. Rå filhash gjorde derfor et korrekt checkpoint inkompatibelt. Zoners releaseversionsfelt kunne udløse samme falske reset.
- Cacheidentiteten er nu en kanonisk projektion af de stabile, samplingbestemmende felter. Reelle punkt-, geometri-, status- og ejerskabsændringer invaliderer fortsat cachen; almindelig drift gør ikke.
## 2026-08-14 – 4.0.193

- En landsdækkende audit dokumenterede, at DMI-schedulerens dækningsnævner kun omfattede 210 hovedzoner og derfor kunne afslutte recovery, selv om 651 lokale kystdele manglede selvstændig U/V-cache.
- Scheduler, runtimebuilder, lokal score, teknisk visning og videnskabelig strømgate er rettet som én sammenhængende kæde. Manglende lokal strøm kan ikke længere give en lokal score, og én del kan ikke fremstilles som bevis for hele zonen.
- Den fulde lokale forklaring, rå vejrdata, punktpar og pålandsretning følger nu vinderen. Hovedzonescoren fungerer som sikker fallback uden geografisk påstand, indtil lokal sammenligning er komplet.
- Friske progressive GitHub-kørsler og den efterfølgende landsdækkende orienterings-/punktrevision mangler fortsat ved dette checkpoint.
- Landsaudit af 651 aktive punktpar bruger nu hvert pars gemte kystreference og lokale tangent. 13 reelle afvigelser blev fundet; privat reparationskandidat giver 0.
- Afstandsbaseret orienteringsaudit og privat splitter er bygget. Den konservative kandidat berører 10 enkelt-delte hovedzoner, giver 673 dele, har 0 punktgeometrifejl og bevarer tvetydige Rejsby/Ribe Vesterå uændret.
- Helgenæs er visuelt kontrolleret som tre sider med landpunkt ind mod halvøen og vandpunkt ud fra hver side. Alle 10 foreslåede zoner har private kontrolbilleder.
- Privat #31764242827 validerede alle 45 ændrede/nye vandpunkter mod native DMI-grid med fuld dækning og nul ugyldige punkter.
- Kandidaten er derefter lokalt aktiveret som 673-dels pakke med 0 punkt-/overlapfund; 4.0.192/651 dele er bevaret som rollback. Hovedzonegeometrien er uændret.
- #31764453987 produktionsverificerede 4.0.193-kodekæden med frisk data, fuld validering, releasegate og deploy før aktiveringscommitten. Den daværende næste gate var mindst 95 % lokal U/V-dækning; 4.0.232 erstatter den for alle nye releases med 100 %.
- Første aktiveringsrun #31764957646 stoppede fail-closed: central sync erstattede manifestet, fordi den nye status manglede det eksisterende `owner-approved-*`-signal. Aktiveringsscript og manifest bruger nu den bindende promotionskontrakt og en repositoryrelativ rollbacksti; digest- og central readback-gater er ikke ændret.

## 2026-08-14 – 4.0.199

- Privat national run #31794474426 nåede 29 grønne trin og stoppede ved den første anvendelse af land-/vandevidens.
- Rodårsagen var faseorden: 14 dokumenterede dele skabes først af senere ejerrettelser og kan derfor ikke kræves i den foreløbige punktbestand.
- Første fase registrerer nu disse id'er som udskudte og anvender resten. Slutfasen er fortsat fail-closed og kræver alle dokumenterede rettelser før videre DMI- og aktiveringskontrol.
- #31796921725 beviste, at faseudskydelsen virker (107 anvendt, 14 udskudt), og fandt derefter en separat statusfejl: et uafhængigt korrigeret punktpar kunne beholde builderens gamle blokerede status.

## 2026-08-14 – 4.0.200

- Hele den isolerede statuskontrakt normaliseres nu sammen med en uafhængig sikker punktrettelse. Vejr, state, score og aktivering forbliver slukket frem til deres egne gates.
- Foreslået/blokeret-summer genberegnes. En målrettet DK-B07-21-regression består validatoren med 1 foreslået og 0 blokerede efter rettelsen.
- Ejerens krav om en eksplicit anbefaling af brugerfladens indsats ved hvert nyt arbejdsafsnit er gjort permanent i AGENTS og AI-operating-rules.

## 2026-08-14 – 4.0.201

- Produktion #31798575274 bestod frisk DMI, fuld validering, releasegate, Supabase-synkronisering og Pages-deploy på 4.0.200.
- Privat #31798588868 bestod den rettede foreløbige punktkontrakt, native DMI-grid, flertrinsserier, state, vind og shadow-score. Den faktiske bestand var konsistent 835/828/4/3, men score-neutral ejer-review krævede stadig historisk 783/758/22/3.
- Review og efterfølgende admin-roundtrip er gjort dynamiske under streng 1:1-kontrol af geometri, navne, punktstatus, shadow-ID'er, optællinger og central readback. Regressionen reproducerer 835-delsfordelingen og afviser manipulerede tællinger.

## 2026-08-14 – 4.0.202

- Offentlig #31801993662 bestod frisk DMI, fuld validering, releasegate, Supabase og Pages på 4.0.201.
- Privat #31802022918 bestod 27 nationale kyst-, navn- og punkttrin, men den native DMI-gate ramte standardtidsbudgettet under `dkss_lf` efter 11,1 minutter. Den forrige kørsel havde bestået samme 835-dels gate på 8,5 minutter, så logmønstret dokumenterer et marginalt budget frem for ugyldige punkter.
- De tre private nationale native DMI-gates får det etablerede 3.000-sekunders kvalitetsbudget. En regression låser budgettet fast; fysisk validering og offentlig adfærd ændres ikke.

## 2026-08-14 – 4.0.203

- Offentlig 4.0.202 blev produktionsverificeret i #31804954306 med frisk DMI, fuld projektvalidering, releasegate, Supabase-synkronisering og Pages-deploy.
- Privat #31804967576 passerede det tidligere tidsproblem og nåede gennem review/dubletaudit. Den stoppede ved slutpunkterne, fordi de 121 historiske rettelser var auditeret mod 673 aktive dele og ikke mod kandidatens 835/652 dele.
- Tre nye uafhængige 10-meterbeviser er genereret fra præcis foreløbig, endelig og fallback-punktbestand. Hvert bevis har eksakt delantal og SHA-256-fingeraftryk; forkert input stopper før DMI.
- Tvetydige punktpar deaktiveres nu helt og beholder kun to neutrale alternativer. Ingen vejr-, state-, score- eller aktiveringsflag kan følge med et uafgjort par.
- Den historiske fallbackbygger kunne stadig medtage Fejø/Femø. Dens vinduer er fjernet, og både Fejø/Femø og Havnø/Mariager Fjord øst er nu bindende slettet i rapport og validator.
- Offentlig geometri og RavScore er uændret. Næste evidens er fuld normal 4.0.203-kørsel samt en ny, isoleret privat national kørsel; privat kandidat må ikke aktiveres automatisk.

## 2026-08-14 – 4.0.204

- Offentlig #31811492510 produktionsverificerede 4.0.203 med frisk DMI, fuld projektvalidering, releasegate, Supabase-synkronisering og Pages.
- Privat #31812035188 bestod officiel kilde, topologi, kystdele og navne, men den nye fingeraftryksgate afviste det første 835-dels bevis. Sammenligning viste samme 835 ID'er og kystreferencepunkter, men 107 punktpar afveg, fordi 4.0.203-beviset var lavet efter anvendelse af historiske korrektioner.
- Det første bevis er genberegnet direkte fra den rå QA-punktfil fra #31812035188: 520 verificerede, 149 sikkert vendte og 166 blokerede. Slutbeviset matcher fortsat rå 652-dels GitHub-input, og fallbackbeviset matcher rå 17-dels input.
- Den strenge gate er bevaret. Offentlig geometri og RavScore er uændret; en ny privat national kørsel kræves.

## 2026-08-14 – 4.0.205

- Offentlig #31815039302 produktionsverificerede 4.0.204 med frisk DMI, fuld validering, releasegate, central Supabase-synkronisering og Pages-deploy.
- Privat #31815423082 bestod hele den nationale 835-dels kilde-, geometri-, punkt-, DMI-, state-, vind-, shadow-, review- og slutauditkæde. Det score-neutrale review indeholdt 667 komplette, to deldækkede og 166 blokerede dele.
- Kørslens første beskyttede læsning af `direction-reviews` stoppede alene med HTTP 401 / `PGRST303`. Supabase-loggen dokumenterede korrekt `sb_secret_`-nøgletype/fingeraftryk og senere vellykkede anmodninger med samme nøgle.
- Node-requesteren og Python-hydreringen bruger samme fail-closed kontrakt. Kun den eksakte kombination ny secret key + HTTP 401 + `PGRST303` genprøves én gang; alle andre eller gentagne fejl stopper. GitHub Actions må ikke fortsætte på repositoryfallback efter central læsefejl. Ingen secrets eller komplette request-URL'er logges.
- Beskyttet manifestsync stopper nu ved læsefejl i stedet for at antage et manglende manifest og genskrive uændrede dokumenter. Det beskytter både central sandhed og Supabase free-kvoten.
- En ny manuel, ikke-deployerende workflow genbruger det kompakte artifact fra #31815423082 og kører kun central national roundtrip/rollback. Lokal regression og self-tests er grønne; målrettet CI, normal produktion og ny fuld privat national slutkørsel mangler ved dette checkpoint.

## 2026-08-15 – 4.0.207

- Ejeren har besluttet, at hver af de 673 aktive kyststrækninger fortsat har præcis ét autoritativt land-/havpunktpar. Forslaget om flere aktive par og gamle visuelle "spøgelser" er forkastet; gamle punkter bruges ikke parallelt.
- Admin retter fremover kun ved at trække det eksisterende blå og grønne punkt. De to uvirksomme knapper **Sæt nyt havpunkt** og **Sæt nyt landpunkt** er fjernet efter udtrykkelig ejerbeslutning. Rød hav→land-pil, geometrikontrol, central readback, DMI-gate, runtimepropagering og rollback er bevaret.
- En ny skrivebeskyttet orienteringsaudit flagger 199 af 673 dele i 122 zoner ved mindst 35 graders vedvarende variation. 171 kandidater er `MultiLineString`; tallet er triage, ikke dokumenterede fejl og ikke tilladelse til automatisk ændring.
- Ejeren gennemgår senere zonerne gradvist og vælger en repræsentativ placering på bugtede dele. Gennemgangen blokerer ikke uafhængige roadmapopgaver, men skal afsluttes før endelig faglig godkendelse af lokale scorer, større scorekalibrering og domæne-/brugerrelease.
- Næste aktive udviklertrin er fortsat DMI-first femdøgnsaudit under DEC-0030. Supabase-egress overvåges gennem næste billingperiode; dataminimeret besøgstæller med enkel adminrapport er P2.
- 4.0.207 blev produktionsverificeret i GitHub Actions #31845836107 på commit `5176d2e14b2c5cff745caa428e6f1b43f45eb824`; frisk vejrdata, fuld projektvalidering, releasegate, Supabase-synkronisering, artifact og Pages-deploy bestod.
## 2026-08-15 – 4.0.209 tre døgns score-neutral vejrhukommelse
- 4.0.208-supportartifactet fra #31849701179 dokumenterede 101 rå prøver/cirka 24 timer i alle 210 zoner. Det aktive døgnsvindue var intakt, men der fandtes ingen rå evidens til mobiliseringsanalyse 24–72 timer tilbage.
- 4.0.209 bevarer et separat 72-timersvindue i pipelinen og afleder fortsat det uændrede 24-timersvindue til aktiv RavScore og `shadow-v2`. Rå historik udelades fra public projection.
- Vandstands-continuity bevarer nu den oprindelige DMI-timeidentitet. Provideranalysen afgrænser timekant, progressive HARMONIE/DKSS-overgange og komponentvis DKSS-dækning uden at ændre merge, fallback eller score.
- Målrettede tests er grønne. Fuld validate, releasegate og frisk produktion afventer.
## 2026-08-15 – 4.0.211 bevaret havmodel og genbehandling

- #31853585142 beviste 4.0.210-diagnosen og alle gates, men artifactet havde fortsat 125/75/10-grupperne uændret.
- Alle 39 IDW- og NSBS-timer blev sprunget over som allerede behandlet. Samtidig tabte cachemerge `marineSelection`, så en senere model kunne rydde den valgte serie.
- 4.0.211 bevarer og rekonstruerer modelvalget samt hæver behandlingssignaturen, så aktuelle filer genlæses én gang. Produktionsartifactet giver 1.138 rekonstruerbare hovedzone-/kystdelvalg.
- #31854174281 bestod hele releasekæden og deployede 4.0.211. Den næste fulde genopbygning #31855164652 behandlede NSBS, bestod DMI, fuld validering, releasegate, Supabase og Pages-deploy og udgav `rr-20260815011320-210`.
- Efterkontrollen viser verificeret aktuel strøm og bevaret modelvalg i 210/210 zoner samt 107 rå `samples72h`-prøver pr. zone. De 75 zoner, der først blev verificeret i den sidste kørsel, følges gennem 72 timer; historiske huller udfyldes ikke bagudrettet.
- Alle zoner har mindst cirka 70,8 timers marinegrundlag, mens 121/210 når mindst 96 timer. DEC-0030-opfølgningen klassificerer de resterende 89 zoners hale og designer cirka 120 timer før enhver kilde-, fallback- eller scoreændring.

## 2026-08-15 – 4.0.212 skalarfelter må ikke genvælge strømmodel

- Successive produktionsartifacts viser 210/210 zoner med strøm i #31856697202 og 183/210 i #31857361460. De 27 berørte NSBS-zoner gik ensartet fra 38 sammenhængende strømtrin til ét sent trin.
- Et marginalt nærmere vandstands-/temperaturpunkt fra en anden DMI-havmodel kunne genvælge hele `marineSelection` og rydde strømserien uden selv at levere et fælles U/V-par.
- 4.0.212 gør et eksisterende fælles strømpar autoritativt: skalarfelter må følge samme model, men ikke skifte den eller omskrive dens score. Et reelt bedre fælles strømpar kan fortsat skifte model. Ingen kilde, fallback eller RavScore ændres.
- #31870747677 produktionsverificerede rettelsen gennem central hydrering/tombstones, frisk NSBS-genindlæsning, fuld validering, releasegate, Supabase og Pages. Datasæt `rr-20260815071241-210` har verificeret strøm i 210/210 zoner, 37–38 strømtrin pr. zone og mindst 100,8 timers sammenhængende marinehorisont.
- Historikken er vokset til 131 ægte rå prøver i alle zoner. 72-timersmålingen fortsætter. Den næste DEC-0030-opgave er den fælles sidste cirka 17–19 timers hale til en reel 118–120-timers kæde.
## 2026-08-15 – 4.0.215 privat besøgsstatistik

- P2-besøgstælleren gemmer kun samlede dagstal for sidevisninger og browserbesøg og kører efter den normale offentlige opstart.
- Browserbesøg betyder første åbning pr. browserfane og dag, ikke unikke mennesker.
- Den ejerbeskyttede rapport viser valgt periode og separat antal oprettede og aktive login-konti.
- Ingen vejrdata, historik, RavScore eller scoremodel ændres. Fuld CI/deploy og første rigtige produktionstal afventer slutvalidering.
- Migrationen blev installeret og testet 2026-08-15. SQL-editoren genkørte samtidig en allerede eksisterende Havnø-tombstoneforespørgsel; det ændrede kun centraldokumentets version/opdateringstid. Payloaden blev straks gendannet fra version 324, tombstonen blev verificeret uændret, og dokumentet står derefter på version 326. Statistikfunktionerne bestod rolle- og endpointtesten, og de to testbesøg blev slettet igen.
- #31876816700 bestod derefter hele produktionskæden. Direkte GitHub Pages-kontrol viste 4.0.215; første rigtige sideåbning blev registreret som 1 sidevisning og 1 browserbesøg, og den private rapport viste desuden 2 oprettede/2 aktive login-konti.
## 2026-08-15 – 4.0.218 beskytter aktuel strøm ved modelskift

- Den resterende ujævnhed i 27 zoner var ikke en historikfejl: et marginalt bedre `dkss_idw`-U/V-par i den fjerne prognosehale kunne genvælge hele havmodellen og rydde en aktuel `dkss_nsbs`-serie.
- 4.0.218 kræver, at en kandidat selv har et fælles strømpar omkring nu, før den må erstatte en allerede aktuelt dækkende model. Recovery uden eksisterende aktuelt anker er bevaret.
- Ingen kilde, fallback, score eller punktgeometri ændres.
- #31883707138 bestod den fulde produktionskæde og deploy efter en 21-minutters DMI-kørsel. `rr-20260815122446-210` har verificeret aktuel strøm i 210/210; de 27 tidligere berørte zoner valgte NSBS og har hver 41 strømtrin. Et konkurrerende sent IDW-par forekom ikke i denne rotation, så den nye afvisningsgren følges fortsat.
## 2026-08-15 – P1-overgange gentaget til 4.0.218

- Tre produktionsdatasæt bekræfter, at vandstandsskift er på niveau med almindelige timer, mens vind, bølger, strøm og temperatur fortsat har større kildespring.
- Strømretningens gennemsnitlige overgang varierede 92° / 89° / 45°, men 95-percentilen forblev 179° / 175° / 162°. Fallbackstrøm er derfor fortsat ikke en verificeret fortsættelse af DMI-strøm.
- De to seneste datasæt er kun cirka 37 minutter fra hinanden. 4.0.218 gav en ny NSBS-cyklus, men HARMONIE/WAM var uændrede og den nye Limfjordscyklus ufærdig; permanente tærskler afventer derfor ny cyklusevidens pr. komponent. Ingen kilde, fallback eller score er ændret.
## 2026-08-15 – Supabase/admin-roadmap afstemt

- Roadmappets ældre åbne adminpunkter er verificeret mod aktuel kode og fulde releasegates: lagringskontrol, central persistensprøve, synlig håndbogsreviewkø, lokale nødkladder og soft-delete/systemtestrydning findes allerede.
- Ingen adminfunktion er ændret. Supabase-egress gennem næste billingperiode forbliver en særskilt åben driftsmåling.
## 2026-08-15 – 4.0.219 reducerer Supabase-readback

- Artifact #2757 dokumenterede, at den genbyggede vandstandsroutingaudit stadig blev hentet centralt før hver 15-minutterskørsel.
- 4.0.219 fjerner kun denne cirka 0,53 MB kompakte maskindiagnostik fra runtimehydreringen. Central stations-/adminstatus, frisk generering, beskyttet upload og adminvisning bevares.
- Read-only estimat ved 96 kørsler/dag falder fra cirka 4,44 til 3,03 GiB pr. 30 dage; cirka 1,42 GiB undgås. Faktisk Supabase-billing skal stadig eftermåles.
## 2026-08-15 – 4.0.220 verificeret historikberedskab

- Read-only P1-audit skelner nu rå historik fra tidsmæssigt verificeret fælles DMI-U/V-historik.
- Artifact #2764 viser 210/210 verificerede aktuelle zoner, 149 rå prøver/37,149 timer i alle zoner, men kun 1,43–37,149 timers verificeret spænd.
- En ny fuld `dkss_lf`-cyklus med 41/41 trin løftede Limfjordhalen fra 98 til 115 timer uden ny fallback.
- Ingen score, kilde, fallback eller produktionsdata er ændret; 72-timerskravet forbliver åbent.
- #31888082124 bestod fulde gates og deploy. Artifact #2771 beviser 210/210 aktuelt verificerede zoner og vækst til 152 rå prøver/37,722 timer; alle zoner er fortsat under 72 verificerede timer.
## 2026-08-15 – 4.0.221 vandstandsroutingalarm

- P1-audit bekræfter 373 kendte kilder, 240 med gyldig cache og 113 forecasttimer for både Hals Barre og Hals Havn.
- Alarmfunktionen fra 4.0.98 blev fjernet i 4.0.99 uden at kravet blev lukket; gamle alarmfelter kunne derfor fremstå kritiske trods gyldig forecast.
- 4.0.221 genberegner alarmen på effektiv routing og samlet forecast-/cachegyldighed, rydder stale mærker og bevarer kildevalg og RavScore.
- Den første push stoppede fail-closed på en forældet teksttest; den fokuserede testrettelse blev genvalideret uden gateændring. Efterkontrollen fandt derefter, at gamle 15/21-zonetal var stale registerfelter, mens faktisk runtimebrug både før og efter var 5/6.
- #31889559758 bestod hele produktionskæden. Artifact #2777 viser 116,6 timers resttid, nul valgte warning/critical-kilder og nul nye notifikationer; central routing er uændret, og datasættet er `rr-20260815142117-210`.

## 2026-08-15 – roadmapstatus ryddet op efter 4.0.221

- Håndbogens 111 kapitler og ekspertens 22-punkts arbejdsplan var allerede omskrevet og permanent regressionstestet; P2-punktet er derfor markeret afsluttet.
- Performancebaseline og progressiv public runtime var allerede produktionsverificeret i 4.0.216/#31880984004; kun almindelig mobil-/desktopovervågning forbliver åben.
- Ingen kode, datakilde, fallback, RavScore eller geometri er ændret.
- Samme read-only gennemgang af artifact #2777 målte 155 rå prøver/38,278 timer og 2,559–38,278 timers verificeret spænd. Historikken vokser, men alle 210 zoner er fortsat under 72 verificerede timer.
- Vandtemperaturens lagopfølgning kan lukkes: #2777 har `surface:0` i 210/210 hovedzonegitre og 9.159/9.159 native DMI-temperaturtrin fordelt på IDW, NSBS og LF. Det resterende firetimers Limfjordshul er horisont, ikke dybdelag.

## 2026-08-15 – 4.0.222 uafhængige modelcyklusser

- #2764, #2771 og #2777 har forskellige artifact-/dataset-id'er, men samme aktive HARMONIE-, WAM- og DKSS-modelruns.
- Den read-only komponentaudit viser nu collection, model-run, tidsopløsning og manglende DMI-proveniens pr. komponent.
- #2777 viser fuld run-identitet for vind, bølger, strøm og vandtemperatur samt 210 routede vandstandstimer uden modelrunfelter. Manglen rapporteres og udfyldes ikke.
- Ingen produktionsdata, kilde, fallback, RavScore eller geometri ændres.
# 2026-08-15 – 4.0.222 produktionsbevis

- Push-kørsel #31890898143 på `d5b49b32` bestod central adminhydrering/tombstones, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy.
- Artifact #2782 (`rr-20260815145011-210`) har fuld DMI collection/modelrun-proveniens for vind, bølger, strøm, vandstand og vandtemperatur. #2777's 210 udokumenterede vandstandstimer var ikke vedvarende.
- De aktive HARMONIE-, WAM- og DKSS-run-id'er er fortsat de samme, så endnu en uafhængig forecastcyklus afventes.
- Strømhistorikken er vokset naturligt til 158 rå prøver/38,760 timer i alle 210 zoner; verificeret spænd er 3,040–38,760 timer og fortsat under 72 timer overalt.
# 2026-08-15 – 4.0.223 delvis HARMONIE-cyklus

- #31891391302 og artifact #2783 viser den første nye vindcyklus efter 4.0.222: HARMONIE 12 UTC har 416 timer i 208 zoner, mens 03 UTC fortsat leverer 9.776 timer.
- P1-auditten viser nu antal zoner pr. model-run og collection@run, så en delvis indfasning ikke forveksles med et fuldt forecastbevis.
- Vindovergangene blev målt, men ingen permanent tærskel, kilde, fallback eller score er ændret.
- Strømhistorikken er vokset til 38,965 rå timer og 3,246–38,965 verificerede timer; 72-timerskravet er fortsat åbent.
- #31891984360 produktionsverificerede 4.0.223 og artifact #2785: HARMONIE 12 UTC voksede til 3.744 timer, 03 UTC faldt til 6.032 timer, begge i 208 zoner. Historikken nåede 39,176 rå timer og 3,457–39,176 verificerede timer.
- #31892505177/#2787 fortsatte samme HARMONIE-indfasning til 5.616/4.160 timer fra 12/03 UTC i 208 zoner med uændrede overgangsmål. Historikken nåede 39,364 rå timer og 3,644–39,364 verificerede timer.
- #31892947409/#2789 bestod Supabase/deploy og fortsatte HARMONIE-indfasningen til 7.488/2.288 timer fra 12/03 UTC. Vindovergangene flyttede sig under indfasningen; historikken nåede 39,516 rå timer og 3,797–39,516 verificerede timer.
- #31893406911/#2790 afsluttede HARMONIE 12 UTC-indfasningen med 9.360 timer/45 timer pr. zone i 208 zoner. Sammenligning med #2782 viser identisk DMI→fallback-hale og lavere, varierende fallback→DMI-spring; to fulde cyklusser er dokumenteret uden aktiveret tærskel. Historikken nåede 39,662 rå timer og 3,943–39,662 verificerede timer.
- En separat #31891504819 stoppede fail-closed ved ét Supabase `57014 statement timeout` på `runtime-diagnostics`; den efterfølgende release synkroniserede samme dokument grønt. Hændelsen overvåges uden forhastet retryændring.
- #2785 viser 9.287.456 byte kompakt runtime-diagnostik; 8.690.021 byte/93,57 % er 25 rå zoneeksempler. Ved 96 kørsler dagligt er det cirka 23,308 GiB JSON-skrivninger over 30 dage, ikke dokumenteret billing-egress. Eventuel opdeling kræver bevaret ejerdownload og særskilt godkendelse.
# 2026-08-16 – 4.0.229 nærmeste vandkolonne og privat strømfelt

- Ejerens kortfund blev sporet til et globalt dybdevalg i DMI-parseren: et fjernere dybt lag kunne erstatte en nær vandkolonne og dermed flytte både pilens og scorens strømgrundlag.
- Aktiv regel er nu nærmeste fælles DMI-U/V-vandkolonne først og dybeste gyldige lag kun på samme koordinat. 0–3 km foretrækkes, 3–5 km accepteres, og over 5 km er `missing`.
- Semantik, aktuelt samplingpunkt, koordinat, tid, lag og afstand følger hele kæden. Gamle cacher og historisk strøm med anden identitet invalideres fail-closed.
- En privat 168-timers cache genbruger eksisterende DKSS-GRIB og roterer gennem kystdele ved 0/5/15 km søværts med flere repræsentative lag. Den er score-neutral og rå vektorer publiceres ikke.
- DEC-0040 og DEC-0029 fastholder den kommende helhedsanalyse: ydre tilførsel → overgang mod kyst → lokal bundnær levering med lag, persistens, tidsforsinkelse og kontrol mod dobbelt-tælling.
- Målrettede tests, den øvrige dataneutrale valideringskæde og lokal releasegate består. Fuld `validate` stopper forventet på det historiske 209/211-snapshot; frisk central produktionsvalidering afventer.
- Produktforsøg #31919296190/#2846 på `14ce8908` gennemførte central adminhydrering, DMI-bulk, privat strømfeltscache og runtimebygning, men den fulde audit stoppede deploy. Supportartifactet viste blandt andet 33 native tider i `depthbelowsea:9` og én senere tid i `surface:0` for samme zone og vandkolonne.
- Fejlen lå i efterkæden: forecast, provenance og audit behandlede det sidst dokumenterede lag som ét fast lag for hele serien. Den korrigerede kontrakt vælger lag pr. native tid, bevarer eksakte tidsbestemte kilder og interpolerer kun ved identisk lag/celle/run.
- Read-only replay bevarer 11.400 verificerede hovedzone-prognosetimer. 353 lokale kystdele med matchende aktuelle adminpunkter havde tidsbestemt provenance og nul mismatch mellem pil og den viste times gridpunkt; øvrige punkter/dækning forblev `missing`.
- Replayet fandt også 101 kystdele, hvor DMI-bulkens samplingpunkt var ældre end den centralt reviewede kystdelskontrakt. Workflowet bygger nu kontrakten før DMI, og progressiv cache migreres selektivt: uændrede punkter bevares, flyttede punkter nulstilles.
## 2026-08-18 – 4.0.232 samler de otte regionale DMI-proxyer privat

- Kodegennemgangen viste, at coverage-auditten kun gemte afstand, celle og lag for DMI-kolonner over 5 km. De faktiske U/V-værdier til ejerens otte Limfjordsundtagelser blev derfor endnu ikke opsamlet.
- 4.0.232-kandidaten bygger præcis de otte allowlistmål fra den friske centrale kystdelsregistrering på hver DMI-kørsel. Kun `dkss_lf`, uændret godkendt samplingpunkt, Limfjord-zoneklasse og højst 15 km accepteres; almindelige dele og forskningsmål forbliver begrænset til 5 km.
- De regionale rå vektorer gemmes kun i den eksisterende 168-timers private cache. En ny support-only rapport viser modelrun, tid, celle, afstand og lag, men afviser rå `uMps`/`vMps`; både cache og diagnostik er udelukket fra Pages.
- Replay er samlingsafgrænset, så en ren regional indhentning kun behandler `dkss_lf`. Offentlig DMI, score, pile, kildemerge, coveragegate og deployment er uændret.
- Målrettede tests for allowlist, ændret centralt punkt, forkert zoneklasse/collection, 5-/15-km-grænser, cache-/reportisolering samt eksisterende DMI-, forecast-, scheduler- og workflowkontrakter består lokalt. RDKS, håndbog, version, modulclosure og releasegate er grønne. Fuld lokal `validate` når gennem geometri-v2 og stopper derefter forventet på det forældede 31. juli-snapshot; frisk central DMI- og Actions-cacheevidens mangler fortsat.
# 2026-08-20 – timeskarp reference i verificeret stroemhistorik

- Naturlig `#3242` viste 64 raa proever/30,903 timer, men et verificeret spaend fast paa 22,563 timer, selv om 198 hovedzoner havde verificeret aktuel DMI-stroem.
- Rodarsagen var et tidsmatch mellem sample paa `productionReferenceAt` og efterberigelse paa den senere `generatedAt`. Kandidaten bruger nu produktionsreferencen med bagudkompatibel fallback. Maalrettede retention-/transporttests er groenne; frisk central produktion mangler.
- Ingen score, state, kilde, fallback, geometri eller land-/vandpunkt er aendret.
# 2026-08-20 - 4.0.238 releasekandidat

- Draft-PR #1 er gennemgået som samlet kildekandidat. Historikrettelsen vælger `productionReferenceAt`, og Open-Meteo-fallbacken bevarer den låste første time over et UTC-timeskifte med et afgrænset fortidsvindue og 120 fremtidige timer.
- Den versionsbundne browserkontrol dækker begge jagtformer, 210 zoner, 673 kystdele, 420 aktuelle paneler, 2.100 femdøgnsvalg, score/label/farve, pile, tre komponenter, forklaring, lokal kontekst og seks vejrmetrikker. Liveversionen skal nu matche 4.0.238.
- Naturlig #3249 på gammel `main` bestod fuld validering, releasegate, Supabase og Pages, men viste fortsat 198 verificerede aktuelle zoner med fast 22,563 timers verificeret historik. Den dokumenterer behovet, ikke kandidatens produktionsresultat.
- Ingen land-/vandpunkter, kystgeometri, U/V, kildeorden, afstandsgrænser eller RavScore er ændret. Kandidaten må først kaldes produktionsverificeret efter sikker merge, frisk fuld central kørsel og gentaget online audit.
# 2026-08-20 - naturlig Copernicus-pilot #70

- Planlagt `#32342023293` producerede artifact `copernicus-current-pilot-70` mod 673 centralt godkendte mål.
- Den private 168-timerscache er vokset til 45 eksakte timer og 28.305 poster: 625 unikke mål, 629 mål/kilde-par og nul gitter-/lagustabilitet.
- Baltic har 552/567 og AMM15 77/125 verificerede mål inden for 5 km. 48 mål mangler fortsat Copernicus-par og bliver ikke udfyldt kunstigt.
- Piloten er fortsat score-neutral, privat og uden interpolation eller råvektorlæk. Den endelige analyse afventer et fuldt naturligt 168-timersvindue.

# 2026-08-20 - 4.0.238 produktions- og browserverificeret

- PR #1 blev merged med ejerens godkendelse som `b8844841`. Push `#32344813967` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy.
- Support `RavRadar-support-3252`/datasæt `rr-20260820074127-210` har 210 zoner. De seks #3246-bølgehuller har nu 118 timer med uændret DMI-first-kildeorden; Feggesund er fortsat dokumenteret missing.
- Verificeret currenthistorik vokser igen: op til 56 verificerede prøver og 39,594 timers spænd i de 198 verificerbare zoner mod tidligere 22,563 timer. De 12 reelle parenthuller forbliver missing.
- Browser-pluginet åbnede live 4.0.238. Godkendt Playwright-fallback kontrollerede 210 zoner, 673 kystdele, 420 aktuelle paneler og 2.100 femdøgnsvalg med nul score-, farve-, pil-, forklarings-, kontekst-, metrik-, konsol-, side- eller HTTP-fejl. Mobil og desktop er grønne.
- Naturlig schedule `#32347036227` stoppede korrekt uden produktionsartifact, da UTC-time 08 ikke var komplet. Automatisk pilot `#32347060320`/artifact #72 udvidede derefter den private cache til 46 eksakte timer og 28.934 poster med nul gitter-/lagustabilitet.
- Kun det særskilte naturlige produktionsbevis over et faktisk UTC-timeskift og de langsigtede 72/168-timersmålinger er åbne. Ingen land-/vandpunkter, geometri, U/V, kildeorden, afstandsgrænser eller RavScore er ændret.

# 2026-08-20 - P1-komponentcyklus efter 4.0.238

- Read-only sammenligning af #3246, #3249 og #3252 viser ingen ny modelstart i 4.0.238-artifactet: HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z fortsætter.
- Vindens DMI-til-fallback-delta er ikke forværret, bølgeovergangsmålene er uændrede, og de seks tidligere `missing->fallback`-bølgehændelser er væk uden ændret kildeorden.
- #3252 tæller som stabil drift og historikvækst, ikke som en ny uafhængig DEC-0030-cyklus. Ingen tærskel, fallback, score eller geometri er ændret.

# 2026-08-20 - P1-produktionsvarighed efter 4.0.238

- De seks seneste fulde `build-and-prepare`-jobs tog 689, 473, 478, 451, 544 og 415 sekunder; medianen er 475,5 sekunder.
- 4.0.238-kørsel `#32344813967` tog 415 sekunder, cirka 12,7 procent under medianen, og gennemførte fortsat alle faglige gates, Supabase og Pages.
- Readiness-skip uden artifact er ikke talt som produktion. Resultatet er stabil drift, ikke et nyt modelrotationsbevis; opfølgningen fortsætter ved nye HARMONIE-, WAM- og DKSS-cyklusser.

# 2026-08-20 - naturligt timeskifte, fuld browserkontrol og mergeautoritet
- GitHub schedule `#32351140886` byggede frisk `rr-20260820085852-210`, kørte fuld `validate` og releasegate, synkroniserede Supabase og deployede Pages.
- Browser-pluginet blev forsøgt først, men kunne ikke løse DNS. Godkendt system-Chrome/Playwright gennemgik derefter 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 prognosevisninger med nul fejl.
- P0.3 og `ISSUE-OPEN-METEO-LOCKED-HOUR-WINDOW` er lukket uden ændring af punkter, geometri, U/V, score, afstandsgrænser eller kildeorden.
- Ejerens nye permanente regel giver Codex betinget autoritet til at merge egne datasikre RavRadar-PR'er efter fuld systemisk verifikation; røde/uafklarede gates og konkret fejlevidens blokerer fortsat merge.

# 2026-08-20 - PR #2 post-merge og P1 support #3256
- PR #2 blev merged som `e1f835a3`. Push `#32354210495` byggede `RavRadar-support-3256` og `rr-20260820093508-210`; fuld validering, releasegate, Supabase, Pages og 210/673-browserkontrol var grøn.
- P1-matrixen viser 70 rå `samples72h` over 41,489 timer i alle 210 zoner. 198 har verificeret spænd 41,489 timer; 12 kendte parenthuller står ved nul. 72-timerskravet er åbent.
- Supplementhistorikken har 45 unikke validtider over 45 timer for 625 Copernicus- og 8 regionalproxydele. Shadow-cachen spænder cirka 104 timer, har besøgt 673/673 og er fortsat score-neutral; 168 timer er åbent.
- Ingen ny HARMONIE-, WAM- eller DKSS-start blev fundet. Overgangsmål, Feggesund wave-missing og parent-currenthuller er uændrede.
- Buildet tog 410 sekunder; medianen for syv fulde builds er 473 sekunder.
- Naturlig pilot `#32355447654` blev korrekt duplicate-suppressed. Den tæller ikke som ny time.
- GitHub Actions varslede Node 20-deprecation i #3256. En lokal kandidat opgraderer de ni berørte workflows til officielle Node 24-majorer uden ændrede gates eller betingelser; PR-CI og produktion afventer.

## 2026-08-20 - Action-opgradering stoppet sikkert og kildegate styrket
- PR #3 blev merged som 4c6b7e3a.
- Produktion 32358538559 bestod hydrering, vejrbygning og referencegenerering, men fuld validering fandt fem gamle testforventninger og stoppede før release-gate/deploy.
- En afgrænset reparationsbranch retter forventningerne, tilføjer en central Action-versionskontrakt samt reproducerbar lokal Codex-opsætning og kildekontrol.
- Lokal kildekontrol og release-gate er grønne. Ingen land-/vandpunkter eller beskyttede datafiler er ændret.
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

## 2026-08-20 - P1-driftcheckpoint #3261
- Produktion `#32361218606`, support `RavRadar-support-3261` og datasæt `rr-20260820105744-210` er eftermålt skrivebeskyttet.
- Historikken er vokset til 72 rå prøver/42,866 timer i alle 210 zoner. 198 har samme verificerede spænd; de 12 kendte parenthuller står ved nul.
- Shadow-cachen spænder cirka 105,3 timer, mens livepiloten fortsat dækker 673/673 dele med 622 lokal DMI, 43 lokal Copernicus og otte godkendte regionale proxyer.
- Der er ingen ny uafhængig modelstart. 72/168 timer er fortsat åbne, og ingen kilde, fallback, score, tærskel eller geometri er ændret.
## 2026-08-20 - portabel lokal kildekontrol
+- Den samlede lokale kontrol afslørede, at Windows PowerShell fjernede dobbelte citater fra inline Python, selv om samme hjælper virkede under PowerShell 7.
+- Python-koden sendes nu som én eksplicit argumentvariabel med portable citater, og workflowkontrakten beskytter formen fremover.
## 2026-08-20 - PR #8 og produktion #3263
+- PR #8 blev merged som `6d63ac3a`. Produktion `#32363403425` bestod fuld validering, releasegate, Supabase, Pages-build og deploy på 336 sekunders build-and-prepare.
+- `RavRadar-support-3263` og live `rr-20260820112436-210` matcher byte for byte. Fuld browseraudit gav 210/673, 420 aktuelle, 2.100 prognosevisninger og nul fejl.
+- P1 voksede til 73 rå prøver/43,31 timer; 198 verificerede zoner voksede med, mens 12 kendte parenthuller blev bevaret ved nul. Shadow-cachen spænder cirka 105,75 timer.
+- Ingen ny DMI-collection blev hentet, og ingen datakæde, score eller geometri blev ændret.
## 2026-08-20 - RavScore forskning fase A-B
+- DEC-0029 er igangsat score-neutralt, mens P1-retention afventer naturlig tid.
+- Aktiv kodeaudit afgrænser `score-engine.js`, lokal kystdelsscore, adaptive justeringer og regler; `ravscore.js` i roden er en ubrugt prototype.
+- Evidensbasen dokumenterer uvaliderede tærskler, overlap/dobbelt-tælling, en femleddet fysisk systemmodel, første primærkilder og ni valideringsforsøg.
+- Ingen score, vægt, kilde, fallback, data eller geometri er ændret.
## 2026-08-20 - RavScore fase C følsomhed
+- Ny score-neutral audit gennemløber 86.400 syntetiske scenarier plus tærskel-, missing- og overlapstests.
+- Auditen finder store diskrete spring ved 6 m/s waders-vind, 13 m/s strandvind, 0,15 m/s strøm og 0,7 m waders-bølge.
+- Samme strøm- og kystinput påvirker flere komponenter. Resultatet prioriterer ablation og hold-out-validering; ingen scorekode er ændret.
## 2026-08-20 - RavScore fase C produktion #3265
+- PR #11 blev merged som `e85de36d`. Produktion `#32366326503` bestod self-test, fuld validate, releasegate, Supabase og Pages på 327 sekunders build-and-prepare.
+- `RavRadar-support-3265` og live `rr-20260820115954-210` matcher byte for byte. Fuld 210/673-browseraudit gav nul fejl.
+- P1 voksede samtidig til 74 prøver/43,90 verificerede timer i 198 zoner og cirka 106,34 timers shadow-capture; de 12 parenthuller er uændrede.
## 2026-08-20 - RavScore phase D candidate gate
- Converted phase A-C evidence into a score-neutral candidate and calibration protocol.
- Recorded that synthetic grids cannot justify new production weights.
- Added a data-minimized observation schema without precise coordinates, identity fields, notes, images or copied diagnostics.
- Kept the active RavScore and all land/water points unchanged.

## 2026-08-20 - 4.0.239 observation privacy and calibration guard
- System review found that the UI promised local-only GPS while the remote observation row still contained the final trip point.
- Remote serialization now nulls GPS and strips local sync metadata for both fresh and queued rows.
- The former low-sample learning heuristic is retained only as history; runtime analysis is coverage-only and returns no score patch.
- No score, geometry, weather source or production data was changed.

## 2026-08-20 - Observation-sikkerhed, gateoptimering og produktionsbevis
- PR #14 indførte 4.0.239 med fjern-GPS-redaktion og scorelåst observationsanalyse. Første produktion `32369531789` stoppede korrekt på en statisk admintekstkontrakt før deploy.
- PR #15 rettede den konkrete adminforklaring. Produktion `32371852397` stoppede korrekt før deploy, fordi kun 630/673 dele havde tidsmatchende verificeret strøm; 43 Copernicus-dele fandtes kun i bevaret historik, fordi den friske private cache blev klar efter produktionsjobbets første cacheforsøg.
- PR #16, commits `673b1612` og `0191dca7`, lagde den hurtige kildekodegate før DMI og en ny Copernicus-cachegendannelse efter DMI. Merge-commit: `b1d0e422a3322d393a7eeb32d5af4837cd6a779f`.
- Produktion `32374202688` bestod alle gates, verificerede 673/673 kystdele og deployede præcis merge-committen. Målrettet Pages-kontrol bekræftede version 4.0.239, GPS-redaktion, kalibreringslås og adminforklaring.
- Ingen beskyttede dirty datafiler blev staged, ingen land-/vandpunkter blev flyttet, og ingen gate blev omgået.

## 2026-08-20 - PR #18/#19 og UTC-timeskifterace
- PR #18, commit `8755c308`, gjorde live-current-rapporten tidskorrekt og lagde selvtesten i `validate:source`. Merge-commit: `af5e2af4352a74377239279057101daa524d89db`.
- Produktion `32377002921` startede før og sluttede efter et UTC-timeskifte. Da push tidligere ikke fik `RAVRADAR_PRODUCTION_TARGET_HOUR`, viste den nye rapport korrekt 630/673 scoreklare dele; den fulde gate stoppede deploy.
- PR #19, commit `7f293a83`, lod readiness beregne target hour for alle normale produktionsbyg uden at ændre den timed cacheblokering. Merge-commit: `c73a10d32f2aab15c63787ecb71893fd9275bbf6`.
- Produktion `32379229853` beholdt 14:00 UTC gennem alle trin, rapporterede 673/673 scoreklare dele, bestod den fulde 673/673-audit og deployede præcis merge-committen.
- Ingen koordinater, kildeprioriteter eller scoreberegninger blev ændret.

## 2026-08-20 - server-side observationsprivacy forberedt
- Audit viste, at den centrale `observations.gps`-kolonne og eksisterende insert-policies teknisk kunne acceptere GPS fra en direkte REST-klient, selv om RavRadar-browseren allerede redigerer GPS væk.
- Der blev forberedt en idempotent `NOT VALID` constraint og skærpede anon/authenticated policies. De blokerer nye GPS-/lokationsfelter uden at ændre historiske rækker.
- `test:observation-db-privacy` låser klientredaktion, SQL-kontrakt, ingen historisk `UPDATE`/`DELETE`/`TRUNCATE` og placering i pre-DMI-gaten.
- Produktionsstatus for SQL forbliver åben, indtil migration og målrettet Supabase-verifikation er gennemført.

## 4.0.240 jagtbarhed og sikkerhed

- Startet som et lille, score-neutralt delmål efter RavScore fase D.
- Brugerforklaringen, begge håndbøger og en automatisk kopikontrol er opdateret.
- Ingen land-/vandpunkter eller scoreparametre er ændret.
- PR #23 blev merged som 961beab1; produktionen bestod frisk fuld validering, release-gate og onlineaudit af 210 zoner/673 kystdele uden fejl.

## 4.0.241 aktiv bølgeprior

- DEC-0040 aktiverer retning og periode som en begrænset transportjustering.
- Vægtning og øvrige scoredele er bevidst uændrede for at isolere effekten.
- Ingen land-/vandpunkter eller geometri er ændret.
- 55.296 aktive syntetiske scenarier og 436 aktuelle public-beregninger bestod; national scoreændring var minus 1 til plus 1 uden farveskift.

- 2026-08-20: 4.0.241 feature `ae4c86c6` merged via PR #25 som `eb66b280`. Produktion `#32405699346` bestod frisk fuld validering, release-gate, Supabase og Pages-deploy; direkte version-/kildekontrol er grøn. Onlineaudit på `rr-20260820185733-210` bestod 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger uden fejl.

- 2026-08-20: 4.0.242 / DEC-0041 fastlægger foreløbigt 25/40/35 for jagtbarhed, transport og mobilisering. Bølgepriorens kolliderende DEC-ID rettes til DEC-0040; geometri beholder DEC-0032. Kandidaten ændrer ingen regler, tærskler, pile, data, geometri eller punkter.

- 2026-08-20: 4.0.242-vægtaudit består 9.261 syntetiske kombinationer og 42.846 offentlige scoreposter på 673 dele. De 420 viste zoner falder i gennemsnit 6,314 point; kun 7 skifter vindende del. Ingen data, regler, tærskler, pile, geometri eller punkter ændres.
- **DEC-0042:** Tripniveau, faktisk indsats, lokal kystdel og immutable forecast-link er obligatorisk kalibreringsevidens. Enkeltfund og ufuldstændige historiske observationer er ikke fit-klare.
- **Fase D observeret audit:** 4.0.242 er målt score-neutralt på 41.116 zonevinderposter og 1.346 aktuelle kystdel-/jagtformposter. Se `docs/research/RAVSCORE_PHASE_D_OBSERVED_ABLATION_4.0.242.md`.

## 4.0.243 - komplette ture som kalibreringsevidens (releasekandidat)

- DEC-0043 fastlægger komplette ture, søgeindsats, faktisk kystdel og uforanderligt startgrundlag som v2-evidens.
- GPS/rute er udelukket fra fjernkontrakten; historiske v1-rækker bevares som dækningsdata.
- RavScore 25/40/35 og land-/vandpunkter er uændrede.
- Kandidaten afventer Supabase-migration, fulde gates, PR/deploy og 210/673-browserkontrol.

## 2026-08-21 - v4.0.243 produktionsverificeret og DEC-0044

- PR #31 blev merged som `2ded7943`. Produktion `32455335962` bestod frisk fuld validering, releasegate, Supabase, Pages-build og deploy.
- Live 4.0.243/datasæt `rr-20260821071436-210` bestod Browser-plugin-kontrol og fuld fallback-audit: 210 zoner, 673 kystdele, 420 aktuelle og 2.100 prognosevisninger med nul fejl.
- DEC-0044 samler ejerens nye retning: ravvinduer, hændelsesmodel, enkle forklaringer, læringsmodul, internt evidensregister og lokal automatisk gammel-mod-ny-scorekontrol i samarbejde med Codex.
- Separat scoresikkerhed og gårsdagsforklaring er fravalgt; varsler er udskudt. DMI forbliver førstevalg, og normal Copernicus-pilot skal begrænses til godkendte DMI-huller.
- RavScore 25/40/35 forbliver aktiv, indtil den store analyse og en særskilt fuldt valideret kandidatbeslutning er gennemført.

## 2026-08-21 - Copernicus-afgrænsning
4.0.244-kandidaten implementerer DEC-0044's DMI-først-princip i indsamlingen: den normale Copernicus-målliste består kun af kystdele uden en gyldig lokal DMI-vektor for den ønskede time. Manuel landsforskning bevares, og alle punkter forbliver uændrede.

## 2026-08-21 - 4.0.245 måludvælgelse efter frisk DMI

- 4.0.244-produktionen stoppede korrekt ved 630/673 før release og deploy, fordi en autoritativ eksakt-times DMI-hulliste ikke kunne dannes fra ældre deployet DMI-dækning.
- 4.0.245 danner derfor målregisteret efter frisk DMI og henter kun disse mål fra Copernicus før den uændrede fulde 673/673-gate.
- Den private pilot gendanner seneste progressive DMI-cache, og cachebevaringen sender den eksakte time videre.
- DMI-først, regionale proxyer, RavScore, geometri og alle land-/vandpunkter er uændrede.

## 2026-08-21 - 4.0.246 DMI-understøttet referencetime

- PR #35 blev merged som `b461e7a5`; produktion `32465245055` stoppede før release/deploy, fordi den ønskede 08:00-time havde nul lokal DMI-strøm.
- Den friske cache havde 622/673 lokale strømme kl. 09:00. 4.0.246 vælger derfor kun ved nul eksakt dækning den bedst dækkede og nærmeste DMI-strømtime inden for tre timer.
- Den valgte time bindes til målregister, målrettet Copernicus, livefletning, vejr og score. Uden en nærliggende DMI-time er udfaldet fortsat stop.
- Ingen score-, proxy-, geometri- eller punktregel ændres.

## 2026-08-21 - 4.0.247 cost/benefit-testmatrix

- 4.0.246 er produktionsverificeret i run 32467031990; live viser 210 zoner, 673 dele og reference 09:00Z.
- DEC-0045 reducerer dublerede kildekodekontroller, men bevarer exact-head PR-gate, push/manual pre-data-gate samt fuld post-data validate/releasegate før artifact/deploy.
- Browseraudit 210/673 forbliver ugentlig eller relevant ved UI-, score- og datakontraktændring.
- Ingen score, dataregel, geometri eller land-/vandpunkter ændres.

## 2026-08-21 - 4.0.247 produktionsverificeret

- PR #37 blev merged som 3dc331ca efter grøn exact-head-kildegate.
- Produktion 32468752244 bestod frisk data, fuld validering, releasegate, Supabase, artifact og Pages.
- Live datasæt rr-20260821094303-210 viser 4.0.247, 210 zoner og 673 kystdele.
- Ingen browseraudit var relevant, fordi UI, score og offentlig datakontrakt var uændret.

## 2026-08-21 - 4.0.248 automatisk RavScore-sammenligning

- DEC-0046 registrerer gammel, aktiv og Kandidat A-C med stabile ID'er.
- Eksisterende audits udvides i stedet for at bygge et nyt beregningssystem.
- Ejer-rapporten er read-only, dataminimeret og udvælger kun de vigtigste forskelle og fysiske paradokser.
- Ingen kandidat er godkendt til produktion; 25/40/35 og alle aktive regler er uændrede.

## v4.0.249: privat RavScore-kandidat-shadow

Den eksisterende private nationale shadow-validator beregner nu A, B og C på samme lokale context som den aktive score. Den bruger 24 timers hændelseshistorik og 72 timers strømforløb, opdeler kandidat B i strøm mod, langs og væk fra kysten og gemmer kun dataminimerede forskelle. Den aktive vægtning 25/40/35, offentlig score, UI, vejrsampling, admin-data og geometri ændres ikke. Koden er målrettet selftestet; næste evidens er én virkelig privat national shadow-kørsel efter merge. Se DEC-0047 og `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`.

## 2026-08-21 - 4.0.250 aktiv-kyst RavScore-shadow

Den nationale geometrikoersel stoppede fail-closed, fordi det uafhaengige land-/vandbevis ikke matchede kandidatens praecise punktbestand. Vi omgaas ikke gaten og flytter ingen punkter. I stedet er RavScore-analysen adskilt fra geometripiloten: et nyt laese-only job kan koere den eksisterende DMI- og A/B/C-shadowkaede paa den aktive offentlige bestand. Realistisk lokal opbygning verificerede 210 zoner og 673 kystdele med alle aendrings- og aktiveringsflag sat til falsk.

## 2026-08-21 - 4.0.251 sammenhaengende DMI-familier

Privat run `32479158213` kontrollerede alle 673 aktive punkter og stoppede derefter, fordi den tidlige gate accepterede DKSS-komponenter paa tværs af collections, mens flertrinsgaten korrekt krævede én collection. 4.0.251 flytter den strenge regel frem: en familie er kun komplet inden for samme collection, og U/V skal dele baade gridpunkt og collection. Ingen offentlig score eller punkter er ændret.

## 2026-08-21 - 4.0.252 fair landsrangering

Ejeren godkendte den landsdækkende `direction-broad-19-v1`-model efter analyse af 210 zoner, 673 kystdele, 107 timer og 214 jagtformskontekster. Begge nationale top-5-lister bruger samme interne korrektion for retningsmulighed og vinderstøtte. Den viste RavScore, lokale resultater, pile, forklaringer, geometri og land-/vandpunkter er uændrede.

PR #52 bestod exact-head-gaten og blev merged som `ad70fbca`. Exact-commit-produktion `32515757957` bestod hele kæden og udgav datasæt `rr-20260821185936-210`. Browser-pluginet fejlede konkret på DNS; den godkendte Playwright-fallback gennemførte derefter 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger med nul fejl.

## 2026-08-22 - kandidat G 24/48-historik og ablation

- Et nyt privat analyseværktøj sammenligner 24 timer, 48 timer og tre dobbeltsportsblandinger kausalt på de 12 eksisterende historiske forløb.
- En regression beviser, at fremtidige prøver ikke ændrer tidligere hukommelse eller normalisering.
- Separate strøm-, bølge- og vindablationer er gennemført med lineær vind og vindstress som alternative, aldrig samtidige beskrivelser.
- 24/48-sporene er enige om fortegnet i 98-99 procent af timerne; næste replay begrænses til 24 alene, 50/50 og 48 alene.
- Bølge/vind-overlap består inden for hændelser. Lineær vind går videre som konservativ hovedanalyse; vindstress er yderkant, og no-direct-wind forbliver obligatorisk.
- Cacheinput og output er Git-ignoreret. Beskyttede data, artifact, geometri, land-/vandpunkter, aktiv score og offentlig runtime er ikke ændret.

## 2026-08-22 - kandidat G historisk replay og beslutningsgrundlag

- Candidate G er implementeret diagnostic-only med stabile 24h-, 50/50-, 48h- og no-direct-wind-ID'er.
- 1.460 private evalueringer viser næsten identiske historikspor, kapacitetsstyret dæmpning ved lav bevægelse og kun 0,086 points gennemsnitlig absolut direkte-vind-effekt.
- 176 rotationsinvariante scenarier bekræfter vendinger og nul transport ved nul kapacitet, men afslører waders-jagtbarhed 0 samtidig med score cirka 79.
- Versionsbundne offentlige regler er afspillet med nul aktive regler og nul slutscoreændring.
- Centralt hydreret exact-head-shadow `32554012542` kontrollerede 673 aktive dele i 210 zoner; 243 dele blev scoret i begge jagtformer, 430 var eksplicit u-scorede, og nul var blokerede.
- G 50/50 laa i gennemsnit 5,50 point under aktiv model for strand og 3,74 for waders. 24/48 og no-direct-wind forblev praktisk identiske; den centrale regelkaede havde nul aktive regler.
- Retention-featurecoverage var nul. Runnet ændrede ikke score, state, admin, sampling, geometri, offentlig runtime eller produktion og uploadede kun et privat dataminimeret artefakt.
- Anbefalingen er ingen aktivering, offentlig 25/40/35 uændret og ejerreview af 50/50 uden direkte vind, waders-betydning, forklaring og coverage.

## 2026-08-22 - PR #59 merge og fail-closed produktionskontrakt

- PR #59 bestod exact-head-kildegaten `32565767549` og blev merged som `6b1511e0`.
- Pushproduktion `32565885534` gennemførte central hydrering og frisk vejr, men den fulde validering stoppede før release og deploy.
- Den fejlede test brugte det brede forbud `/admin/` og afviste dermed den nye GET-only regelhydrering. Samme test indgik ikke i PR-kildegaten.
- Reparationskandidaten bevarer hydreringen, låser den til read-only-adfærd, forbyder konkrete skrive-/deployveje og føjer kontrakten til `validate:source`.
- Ingen offentlig score, Candidate G-aktivering, beskyttede data, geometri eller land-/vandpunkter er ændret.
- PR #60 bestod exact-head-gaten `32566573875` og blev merged som `41e01e2d`.
- Exact-commit-produktion `32566631701` bestod frisk DMI, fuld validering, releasegate, Supabase, Pages-artifact og deploy; deployment `6035679906` er `success`.
- Live datasæt `rr-20260822100745-210` har 210 zoner og 673 dele. Manifest, byteantal og SHA-256 for den offentlige startpakke matcher.

## 2026-08-22 - 4.0.253 Candidate G-produktkontrakt

- Den Git-ignorerede 12-vinduescache er genafspillet score-neutralt. Eksakte komponenter, vægtede bidrag og fysisk gate rekonstruerer 1.460/1.460 Candidate G-scorer.
- Den foretrukne `G-50-50-NO-DIRECT-WIND` har 219/730 waders-evalueringer med jagtbarhed under 35; 7 har samtidig mindst 55 point, og det kanoniske højenergiforløb er 0/79.
- Forskningsanbefalingen er én RavScore som ravpotentiale med separat tydelig metodeegnethed, ingen anbefaling af utilgængelig waders-metode, sikkerhed som uafhængig kontrakt og ingen skjult koefficient. Offentlig kobling kræver ejerbeslutning.
- Pilen fastholdes som aktuel lokal strøm. Historik forklares særskilt; 332/872 tydelige contexts er modrettede, og 100 ændrer den afrundede score.
- Den nationale shadowrapport klassificerede coverage fail-closed og afviste parentzonemorfologi som lokal kystdelsevidens. 243/673 scorede dele var en aktiveringsblokering; DEC-0052 præciserer efterfølgende, at de samtidige nul lokale retentionfeatures kun er diagnostik.
- Aktiv 25/40/35, offentlig UI, DMI/fallback, geometri, land-/vandpunkter, central admin, private artifacts og beskyttede data er uændrede. Candidate G er fortsat diagnostic-only.

## 2026-08-22 - 4.0.253 merged og produktionsverificeret

- PR #62 bestod exact-head-kildegate `32568914124` på `d272c6ca` og blev merged som `b2951d90`.
- Pushproduktion `32568958136` gennemførte central adminhydrering, frisk DMI, fuld `validate`, releasegate, support `RavRadar-support-3379`, Supabase, Pages-artifact og deployment.
- Pages-deployment `6036054331` er `success`. Live version er 4.0.253; datasæt `rr-20260822110004-210` har 210 zoner og 673/673 scorede kystdele.
- Målrettet livekontrol var tilstrækkelig, fordi offentlig score, UI-adfærd og offentlig datakontrakt ikke blev ændret. Candidate G er fortsat privat, og coverage-/ejer-gates er fortsat åbne.
- Ingen private payloads, beskyttede dirty-datafiler, geometri eller land-/vandpunkter indgik i PR'en eller checkpointet.

## 2026-08-22 - endeligt Candidate G-produktionscheckpoint

- Dokumentationscheckpoint PR #63 bestod exact-head-kildegate `32569597610` på `b90c4adc` og blev merged som `579ea914`.
- Da friskhedsgaten krævede en ny vejropdatering, gennemførte `32569650036` den fulde produktionskæde i stedet for preflight-skip; alle gates og jobs bestod.
- Support `RavRadar-support-3380`, Supabase, Pages-artifact og deployment `6036178330` er grønne. Live `rr-20260822111522-210` viser 210 zoner og 673/673 scorede kystdele.
- Kandidat G er fortsat privat og score-neutral. Ingen offentlig score-/UI-kobling, geometri- eller punktændring indgik.

## 2026-08-22 - fremtidssikkert Candidate G-handoff

- PR #64 bestod exact-head-kildegate `32570172205` på `bd8a73ec` og blev merged som `01904b92`.
- Fuld produktion `32570223437` bestod med support `RavRadar-support-3382`, Supabase, Pages-artifact og deployment `6036286717`.
- Live-snapshot `rr-20260822112859-210` viste version 4.0.253, 210 zoner og 673/673 scorede kystdele.
- Handoffet binder herefter den faglige kodebaseline og dokumenterede produktionsbeviser, men ikke en evigt fast `main`-spids eller dataset-id. Begge skal kontrolleres direkte, så docs-publicering ikke gør sin egen tekst forældet.

## 2026-08-22 - ejerbesluttet waders-vind- og jagtbarhedsvariant

- Ejeren præciserede, at strand fortsat må vise højt ravpotentiale ved lav jagtbarhed, mens waders-scoren skal begrænses af søgemetodens faktiske jagtbarhed.
- Ny diagnostic-only variant `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT` bruger 100 vindpoint til og med 6 m/s og falder monotont gennem 7/80, 8/60, 10/35, 13/10 og 18/0. Bølger indgår separat.
- Historisk replay dækker 1.460 evalueringer. 730/730 strandscorer er identiske, ingen waders-score overstiger jagtbarheden, og ingen af 216 waders-evalueringer under jagtbarhed 35 får mindst 55 point.
- Mod den tidligere no-direct-reference falder waders-gennemsnittet fra 35,465 til 27,351. Selve den nye vindkurve flytter kun +0,449 point i gennemsnit mod det samme loft på den gamle kurve.
- Beslutningen er ikke sikkerhedsrådgivning og indfører ingen bund-, dybde-, rende-, vadebredde- eller adgangsmodel. Private rådata, geometri og land-/vandpunkter er urørte.
- Offentlig 25/40/35 er uændret. Samlet vægt-/forklarings-/coverage-/ejer-go/no-go er fortsat åbent.
# 2026-08-23 – 4.0.260 versionsbundet scoreomskifter uden aktivering

- Nattens seneste naturlige runtime `rr-20260823075018-210` består den dataminimerede Candidate G-audit med 210 zoner, 673 dele, 1.346 modeevalueringer, 673 accepterede tidligere tilstande, nul nulstillinger og nul rekonstruktionsfejl.
- Den dokumenterede state-alder er 6/6 timer. Ejeren har accepteret den som praktisk evidens til næste trin; den kaldes ikke et 48-timersbevis.
- DEC-0058 indfører `RAVSCORE-PROFILE-SWITCH-4.0.260` med legacy `RRS-CURRENT-B0-4.0.247`, Candidate G `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` og legacy som eksakt rollback.
- 4.0.260 vælger fortsat legacy. Candidate G kræver i en senere version eksplicit flag, komplet global dækning, frisk slutshadow-id og særskilt ejerbeslutnings-id. Automatisk aktivering er falsk, og manglende evidens falder globalt tilbage.
- Profilkontrakten føres gennem offentlig startpakke, detaljepakke og manifest. Målrettede tests dækker legacyidentitet, kandidatprojektion, udtransportforklaring, forbud mod blandede profiler og rollback.
- Samlet lokal `scripts/validate-source.ps1`, inklusive releasegate, er grøn for 4.0.260. Artifact, protected-dirty-data, privat cache, geometri og land-/vandpunkter er urørte. Exact-head, produktion, frisk slutshadow og browserkontrol udestår.
- PR #92 bestod exact-head `32628441062` på `eabf7e8b` og blev merged som `c5898ce8`. Produktion `32628516066` bestod central hydrering, frisk DMI/fallback, fuld validering, releasegate, Supabase, artifact og Pages.
- Live `rr-20260823083627-210` matcher manifestets byteantal og SHA-256 og består den dataminimerede 210/673/1.346-audit med 673 accepterede tilstande, nul nulstillinger og nul rekonstruktionsfejl. Reference 09:00Z dokumenterer 9/9 timers alder fra bootstrap 00:00Z.
- Browserauditten består 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer uden fejl. Aktiv profil er fortsat legacy, og automatisk aktivering er falsk.
- Candidate G-shadowen ligger markant lavere end aktiv score i den unge state. Denne scorefordeling er et åbent ejerreview før aktivering, ikke en leverancefejl eller tilladelse til automatisk skift.
- Efterfølgende bootstrapaudit fandt 493/673 transporttilstande på 0 uden én eneste faktisk udtransportgate. Den allerede offentlige historik har 42.551 poster og dækker 633 dele med 65–117 timer, men start-0-replay har stadig median 0.
- Kun 6/633 dele bliver uafhængige af start 0 kontra 100; 607/633 bevarer mindst 50 points priorforskel. Uden passivt neutralt tab er startreserven en eksplicit modelprior og kan ikke udledes ved blot at vente.
- Neutral startprior 50 anbefales til særskilt ejerbeslutning. Den er ikke implementeret; offentlig profil forbliver legacy, og Candidate G aktiveres ikke.
## 2026-08-23 – 4.0.265: fleksibel kontoindberetning

- En indlogget bruger kan nu indberette en tur eller et fund direkte fra kontoen uden en forudgående turstart. Brugeren skal selv vælge dato og klokkeslæt for turens start samt turens varighed.
- Kontoindberetningen genbruger de samme spørgsmål og samme `observations`-tabel. Der er ingen ny tabel, databasekolonne, dubletrække eller særskilt fundkopi.
- Nutidens vejr må aldrig sættes på en ældre tur. Den offentlige klient kan ikke sikkert genskabe et vilkårligt historisk snapshot, så rapporten gemmes som erfaring med tomme forecast-/snapshotfelter, kvalitetsmarkører og `calibration_eligible=false`.
- PR #111's første exact-head `32658093582` stoppede sikkert før merge, fordi Candidate G-profilens versionsmærke ikke var fulgt med fra 4.0.264 til 4.0.265. Kun versionsbindingen er rettet, og `scripts/set-version.mjs` opdaterer fremover både det centrale profildokument og kodekontrakten. Profilvalg, aktivering og scoreberegning er uændrede.
- Anden exact-head `32658348688` bestod versionsbindingen og alle nye kontoindberetningskontrakter. Den stoppede senere på to forklaringssætninger, der fandtes i rodhåndbogen og UI-kontrakten, men manglede i webhåndbogen. Webhåndbogen er synkroniseret; ingen produktkode eller score er ændret.
- Tredje exact-head `32658502017` bestod hele `validate:source` frem til releasegaten. Den eneste fejl var en manglende `CHANGELOG-4.0.265.md`; den versionsspecifikke releaseoversigt er tilføjet uden produktændring.
- PR #111's endelige exact-head `32658661075` bestod og blev merged som `cb7d2232`. Produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages; live `rr-20260823184330-210` er 4.0.265 på 210/673. Den målrettede, ikke-dataskrivende livekontrol bekræfter selvvalgt dato og tid uden forudfyldning samt **Afslut uden at indberette**.
- Den aktive afslutningsdialog har nu **Indsend tur**, **Svar senere** og et bekræftet **Afslut uden at indberette**. Fravalg rydder den aktive lokale tur med nul observations-, outbox- og Supabase-poster.
- Begge rapportveje bruger samme zone→kyststrækningsvalg. GPS-spor, rute, præcis position, fri tekst og billeder indsamles ikke.
- Turloggens brugerflade viser ikke længere den interne databaseforklaring “Der oprettes ikke en ekstra kopi i databasen”.
- Målrettede tests er grønne. Version, exact-head og produktion udestår. Candidate G, score, vejrdata, geometri, land-/vandpunkter og beskyttede data er uændrede. Se DEC-0064.
## 2026-08-24 – 4.0.268 samler offentlig ravjagtviden og almindeligt dansk

- Ejeren præciserede, at læringsmodulet skal lære alt det, projektet ved om ravjagt, og ikke først og fremmest forklare appen. Den nye **Grundbog i ravjagt** følger derfor kæden fra ravets egenskaber over hav og kyst til felttegn og selve jagten, før RavRadar forklares.
- Grundbogen dækker mobilisering, transport, vind, bølger, strøm, vandstand, revler, render, langs- og tværtransport, strand, vandkant, waders, UV, hændelsesfaser, scenarier, misforståelser, kilder og ordliste.
- Offentlig standardsprog i forside, scorepanel, Rav-assistent, login, konto, tur og fejl er samtidig gjort mere forståeligt. Admin- og debugværktøjer forbliver bevidst tekniske.
- Nye målrettede tests låser faglig rækkefølge, aktiv `20/50/30`, waders-kurve, udtransportregel, mobilopsætning, bølge-/strømroller og fravær af intern standardtekst. Lokal desktop og 390 px mobil er grøn.
- Ingen score, Candidate G-regel, vejrdata, Supabase-kontrakt, geometri eller land-/vandpunkt ændres. PR #118/exact-head `32672522334`, merge `3c22e40b`, produktion `32672578127` og live `rr-20260823230848-210` lukker leverancen på 210/673 med grøn offentlig browseraudit. Se DEC-0067.
## 2026-08-24 – 4.0.272 Candidate G-tilstandsrecovery under arbejde

- Ejerens screenshots viste kunstigt lave og stærkt ens RavScore-værdier landsdækkende.
- Den fejlramte offentlige produktion havde 673/673 globale `NO_PREVIOUS_STATE`-nulstillinger. Den sidste grønne 4.0.271-produktion havde 673/673 accepterede fortsættelser og normal scorevariation.
- Rodårsagen var en timeout i atomisk manifest-/conditions-hydrering, som blev logget men ikke stoppede workflowet.
- 4.0.272-kandidaten gør fejlen fatal, afviser global nulstart og indfører en streng engangs state-only recovery fra den eksakte sidste grønne Actions-kørsel. Den dokumenterede nulstillede fortsættelseslinje genkendes på tidsvindue og manglende før-historik, så senere accepterede nulstates ikke undslipper under et nyt datasæt-id; efter genindsættelsen er recoveryen straks inaktiv.
- Ejerens senere flytning af punktpar 2 er afgrænset som et separat lokalt friskdataforhold. Ingen parent-/nabostrøm må lånes, og 673/673-gaten består.
- Scoreformel, Candidate G 20/50/30, vejrregler, geometri, zoner og land-/vandpunkter er uændrede. Kun geodatafilernes versionsfelt følger releasen fra 4.0.271 til 4.0.272.
