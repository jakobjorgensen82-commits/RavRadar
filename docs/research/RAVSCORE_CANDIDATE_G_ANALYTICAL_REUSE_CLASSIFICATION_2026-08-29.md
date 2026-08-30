# Candidate G — analytisk genbrugsklassifikation

- **Dato:** 2026-08-29
- **Status:** Implementeret klassifikation for den integrerede kandidat; offentlig cutover er ikke gennemført
- **Offentlig model under arbejdet:** Candidate G
- **Autoritativ ny kontrakt:** `js/core/ravscore-model-contract.js`
- **Geodata/private data:** Ikke læst eller ændret i analysen

Den klassificerede målkontrakt er model `RRS-COASTAL-PROCESS-INTEGRATED-1.0.0`, state `4.0.0`, variant `COASTAL-SUPPLY-MOBILISATION-STRUCTURAL-LAST-MILE-HUNTABILITY-1`, profil `cn-003-015-in10-out8-full24-cos48-gap3-wave4-48-coldrestart-gapcredit1-lastmileneutral-v3`, komponentskema `ravscore-components-huntability-transport-mobilisation-v3` og forklaringsskema `ravscore-explanation-integrated-v3`. `modelContractSha256` binder parameterkontrakten, mens `modelBundleSha256` binder 34+ kanonisk normaliserede transitive implementeringsfiler; endelige værdier afventer regeneration på afsluttet head.

## Formål og metode

Hvert aktivt Candidate G-led er vurderet som **BEVAR**, **FORBEDR**, **ERSTAT**, **FJERN** eller **UTILSTRÆKKELIG EVIDENS**. Klassifikationen sammenholder RDKS, implementering, produktionens producent-/forbrugerkæde, offline-replay og ejerens ekspertinput.

**BEVAR** betyder ikke, at en regel er en naturkonstant eller fundkalibreret. Det betyder, at den fortsat er en forsvarlig, eksplicit prior, og at der ikke foreligger bedre evidens. **UTILSTRÆKKELIG EVIDENS** betyder, at en mulig fysisk proces skal forklares som usikkerhed og ikke omsættes til et tal.

## Score- og produktsemantik

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| RavScore som 0–100 mulighedsindeks, ikke fundprocent | **BEVAR** | Semantikken er forståelig og ærlig. Den nye kontrakt kalder scoren et modelleret kystnært rav- og søgemulighedsindeks. Ingen empirisk fundpræcision må påstås uden repræsentative fund og nul-fund. |
| Én offentlig model med fail-closed adfærd | **BEVAR** | Candidate G forbliver eneste offentlige model indtil atomisk cutover. Derefter er den integrerede model eneste offentlige scoreejer. |
| 20 % jagtbarhed, 50 % transport, 30 % mobilisering | **BEVAR** | Offline-følsomhed gav ikke grundlag for at erstatte vægtene. De er en ejer-/forskningsprior, ikke en fundkalibreret sandhed. |
| Additiv sum før waders-cap | **BEVAR** | De tre led repræsenterer forskellige evidenstyper. En multiplikativ kerne ville gøre manglende nyligt transportbevis til bevis for nul fysisk mulighed og dermed skjult sætte et ukendt lokalt lager til nul. |
| Waders-slutscore begrænset af synlig jagtbarhed | **BEVAR** | Forhindrer høj waders-score, når metoden ikke er praktisk anvendelig. Det er en metodebegrænsning, ikke en fuld sikkerhedsgate. |
| Strandscore uden jagtbarhedscap | **BEVAR** | Bevarer skellet mellem fysisk mulighed og aktuelle søgeforhold på stranden. |
| Candidate G/ny model som samtidige offentlige shadowmodeller | **FJERN** | Sammenligning skal være offline. Der må ikke eksistere to offentlige RavScore-identiteter eller delvise modeludrulninger. |
| Adaptiv offentlig model/fundchance | **FJERN** | Adaptiv modelkode må ikke være offentlig runtime eller scoreejer. Historisk/intern regressionskode kan bevares, men må ikke eje offentlig score, forklaring, model-id eller fundchance. |

## Transport og strømstate

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Verificeret gridstrøm projiceret på kystnormalen | **FORBEDR** | Det er det stærkeste eksisterende transportbevis. Candidate G’s offentligt afrundede fart/retning bevares til den eksakte rollback, men den nye state bruger den præcise private kystnormalprojektion direkte fra det proveniensbeviste U/V-par; ellers blev 0,03-grænsen kunstigt kvantiseret. Signalet skal kaldes lokal afledt gridstrøm, aldrig undertow, ripstrøm eller måling bag en revle. |
| Signeret, dataminimeret kystnormal evidens | **BEVAR** | Understøtter replay, migration og rollback uden offentlige rå U/V eller private payloads. |
| Strømnormalisering `0,03–0,15 m/s` | **BEVAR** | Fortsat eksplicit prior. Følsomhed er undersøgt, men ingen evidens begrunder et andet aktivt interval. |
| `+10` indadgående / `−8` udadgående point pr. effektiv time | **FORBEDR** | Satserne bevares, men anvendes i én kontinuerlig state med 24 timers fuld aldervægt og hævet cosinus til 48 timer. |
| Hårdt 48-timers randvindue | **ERSTAT** | Maksimal alder på 48 timer bevares, men det abrupte randtab erstattes af `FULL_24H_THEN_RAISED_COSINE_TO_48H`. |
| `outboundEpisodeEffectiveHours` som separat skjult episode | **FJERN** | Udadgående evidens reducerer transportstate direkte. En særskilt episode må ikke akkumulere over neutral/manglende evidens. |
| Candidate G’s 13-timers gate, som nulstiller hele RavScore | **FJERN** | 13 timers stærk, sammenhængende udadgående påvirkning kan fortsat bringe **transportpotentialet** til 0 gennem `−8`-raten. Det er ikke bevis for, at mobilisering, jagtbarhed eller alt lokalt rav er nul, så hele RavScore må ikke gates til 0. |
| Maksimalt 49 evidenspunkter | **FORBEDR** | Højst 49 punkter accepteres og beholdes samlet. Et reelt præ-grænse-bropunkt optager én af pladserne. En tæt, ujusteret serie, der ikke kan bevares, fejler lukket i stedet for at blive approksimeret. |
| Native cadencehold op til tre timer uden ny bevægelse | **BEVAR** | Det er dokumenteret kildecadence, ikke interpolation. State ændres ikke, og holdet må ikke overskride gapgrænsen. |
| Missing/gap som neutral strøm | **FJERN** | Missing er ikke et fysisk nul. Over tre timers evidensgab eller inkompatibel evidens fejler lukket. |
| Phase-D-baseevaluator som skjult availabilitygate | **FJERN** | Den integrerede evaluator beregner kun sine erklærede komponenter. Historisk evaluator kan bruges offline, ikke som skjult produktionsafhængighed. |

## Mobilisering

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| `Hs² × T` som relativ bølgeenergiproxy | **BEVAR** | Egnet som relativ mobiliseringsprior. Den er ikke en beregning af bundforskydning, batymetri eller ravtransport. |
| Eksisterende energiankre | **BEVAR** | Ingen fundkalibrering eller bedre lokale data begrunder nye knækpunkter. |
| 4 timers opbygning / 48 timers aftrapning | **BEVAR** | Fortsat eksplicit, ikke-fundkalibreret prior. |
| Første bølgeprøve opfinder én times historik | **FJERN** | Kold start er utilgængelig og må ikke få skjult varighed eller buildkredit. |
| Missing bølge kan forblive normal READY og bygge videre | **ERSTAT** | Manglende `Hs` eller periode gør det aktuelle input utilgængeligt. Gyldig afledt state kan holdes uden build; ved retur gives højst én times buildkredit. |
| Gap over tre timer som almindelig fortsættelse | **FJERN** | Langt gap genstartes konservativt fra minimum af tidligere state og aktuelt mål og må højst få én times buildkredit. |
| Bølger kan skabe transport/supply fra nul | **FJERN** | Bølger mobiliserer, men skaber ikke observeret lager eller dokumenteret strømtransport. |

## Sidste nærkystlevering

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Mild fysisk bottleneck `0,85–1,00` | **FJERN** | Tilføjer en uobserveret, numerisk fysisk virkning oven på 20/50/30. Den har ikke lokalt datagrundlag. |
| `delivery = transportPotential × factor` efterfulgt af 65/35-blend | **ERSTAT** | Blandingen dobbelttæller transportpotentialet. Aktiv kontrakt bruger `delivery = transportPotential × 1`; delivery er dermed kun en score-neutral strukturel plads i årsagskæden. |
| `5,25 %` som aktiv maksimal leveringskorrektion | **FJERN** | Tallet har ikke grundlag som fysisk faktor eller interval. Det bevares kun som tydeligt mærket kontrafaktisk offline-ablation sammen med 0 % og 10 %. |
| `5,25 %` som midpoint eller fysisk usikkerhedsinterval | **FJERN** | Der findes intet numerisk fysisk last-mile-interval i aktiv output; værdien er `null`. |
| Eventtiming fra Phase D som leveringsbevis | **FJERN** | Produktionshistorikken gjorde feltet til praktisk konstant fallback og ikke et observeret timingbevis. |
| Ydre bølgeretning som numerisk last-mile-faktor | **FJERN** | Uden lokal batymetri og opløst surfzone kan fortegn og størrelse ikke forsvares. Retning er forklarende kontekst med scoreeffekt `NONE`. |
| Manglende bølgeretning som optimistisk/pessimistisk faktor | **FJERN** | Missing retning er score-neutral og markeres som usikkerhed. Den må ikke erstattes af et numerisk midpoint. |
| Lokal surfzone-, revle-, rip-, feeder-, langskyst- eller undertoweffekt | **UTILSTRÆKKELIG EVIDENS** | Processerne er relevante, men RavRadar mangler de lokale data, der skulle adskille og kvantificere dem. `physicalDeliveryResolved` forbliver falsk. |
| Strukturel last-mile-usikkerhed | **FORBEDR** | Uvisheden gøres til en permanent, eksplicit forklarings- og confidenceegenskab i stedet for at skjules i en lille faktor. |
| Ukendt lokalt eller sekundært ravlager som numerisk state | **UTILSTRÆKKELIG EVIDENS** | Lageret kan eksistere, men observeres ikke. Modellen må hverken sætte det til nul eller opfinde lagerpoint. |

## Vandstand, revler og fysisk fortolkning

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Faldende vandstand som universel udtransport | **UTILSTRÆKKELIG EVIDENS** | Faldende vand kan ledsage nettoudstrømning, men kan også blotlægge eller efterlade materiale bag revler. Gridstrømmen ejer det observerede transportfortegn; lokale surfzoneprocesser er uopløste. |
| Faldende/lav vandstand som RavScore-point | **FJERN** | Absolut niveau og trend giver ikke et universelt pointfortegn, og der er risiko for dobbelttælling af strømfysik. |
| Vandstand som synlig kontekst | **FORBEDR** | Forklaringen skal skelne mellem vandsøjlens nettobevægelse, blotlægning, retention og uopløst surfzoneadfærd. |
| Waders’ vandstands-tie-break | **BEVAR** | Ved scorelighed vælges lavere vandstand, derefter ikke-stigende trend og tidligste tidspunkt. Direkte scoreeffekt forbliver 0. |
| Statisk rev-, shallow-, bund- eller vegetationbonus | **FJERN** | RavRadar har ikke lokal procesopløsning til et generelt pointbidrag. Geodata ændres ikke i modelsporet. |

## Jagtbarhed og præsentation

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Waders-vindkurve: fuld til 6 m/s og 0 ved 15 m/s | **BEVAR** | Eksisterende ejerprior og synlig produktsemantik. |
| Eksisterende strand-vind- og bølgekurver | **BEVAR** | Ingen ny evidens begrunder andre ankre. Kurverne centraliseres i modelkontrakten og beskriver søgemetodens effektivitet, ikke ny mobiliseringskredit. |
| Waders: 80 % vind og højst 20 % bølgestraf | **BEVAR** | Bevarer den ejerbesluttede metodeprofil. Det aktuelle bølgefradrag er adskilt fra den tidslige `Hs² × T`-mobilisering og kan ikke give transport- eller last-mile-point. |
| Manglende vind eller bølgehøjde som normal jagtbarhed | **FJERN** | Begge fysiske input skal være endelige og ikke-negative; ellers fejler scoren lukket. |
| `direction-broad-19-v1` | **BEVAR** | National rangering er en særskilt præsentationspolitik. Alle forbrugere skal anvende samme comparator. |
| `score-water-tie-earliest-v2` | **FORBEDR** | Candidate G-adfærden centraliseres som én modelbundet politik for startup, detaljer, femdøgn og assistenter. |
| Scorebånd 35/55/75 og exceptional 90 | **BEVAR** | Præsentationspolitikken bindes til samme modelhash. |

## State, provenance, migration og recovery

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| DMI/Copernicus-proveniens og tidsbinding | **BEVAR** | Samme tid, kilde og dokumenteret fallback skal følge state, score, payload og forklaring. |
| Candidate G schema 2 som første cutovergrundlag | **FORBEDR** | Kun kompatibel afledt state/evidens migreres gennem `candidate-g-schema2-to-integrated-schema4-v1`. Historik opfindes ikke, og gamle scorer kopieres ikke. |
| Ubegrænset genimport af Candidate G | **FJERN** | Import er en præcis first-cutover-mekanisme og må kun ske, når hverken gyldigt integreret bundle eller checkpoint findes. |
| Candidate G som offline oracle og eksplicit rollback | **FORBEDR** | `integrated-schema4-to-candidate-g-schema2-v1` holder rollback deterministisk uden at blande Candidate G ind i ny score. Den varme projektion ligger kun privat som `ravScoreCandidateGRollback`. Operationel aktivering kræver manuel controller-CAS gennem `CANDIDATE_G_PENDING`, Candidate G-Pages-build og offentlig eksakt 210/673-verifikation. Scheduler kan ikke initiere; der deployes ingen Candidate G-assistent-Edge, lokale DA/DE/EN-svar tager over efter Edge-`409`, og schema-3-ture er Candidate G-bundne og ikke kalibreringsegnede. |
| Samme-model fuld runtimegendannelse | **FORBEDR** | Gendannelse sker via en privat, hashbundet bundle med eksakt filallowlist, modelbinding, path-/symlinkværn og atomisk installation. |
| Kompakt continuation-checkpoint | **ERSTAT** | Schema-4-checkpointet indeholder kun minimal afledt state, er bundet til model/hash, forventer 673 kystdele og er højst 72 timer gammelt. Ugyldigt tilstedeværende checkpoint fejler lukket. |
| Offentlig cache som kilde til fuld historik | **FJERN** | Fulde conditions, DMI-caches, pilot history og checkpoint forbliver private. Modellen kan være køreklar via privat bundle/checkpoint uden ny offentlig historikopbygning. |
| Model- og datakvalitet i ét confidence-label | **ERSTAT** | Datakomplethed og strukturel modelusikkerhed adskilles. Komplet input gør ikke last-mile-modellen moden eller fundkalibreret. |

## Offentlig payload, privacy og produktintegration

| Candidate G-led | Klassifikation | Begrundelse og konsekvens |
|---|---|---|
| Kompakt startup-/detaljeopdeling og hashes | **BEVAR** | Hurtig startup og lazy details er velfungerende. Manifest schema 4 binder model, dataset, filer, body-hashes og byteantal. |
| Pages med hele `data/live/` | **FJERN** | Pages må kun indeholde `manifest.json`, `public-conditions.json`, `public-condition-details.json` og `coastal-parts-v2.json`. |
| Offentlig adgang til fulde conditions/caches/pilot history/checkpoint | **FJERN** | Disse er private produktionsruntimefiler og afvises af privacy-gaten. |
| Rekursiv negativ privacy-audit | **FORBEDR** | Audit afviser state/evidens, rå U/V, private stier/caches/checkpoints og fremmede modelbindinger i hele artifactet. |
| 210 zoner / 673 kystdele | **BEVAR** | Ingen geometri eller land-/vandpunkter ændres. Modellen tilpasses den eksisterende dækningskontrakt. |
| DA/DE/EN, lokal/Edge-assistent, ture, observationer, admin og håndbøger som senere efterarbejde | **FJERN** | Alle producenter, adapters og forbrugere er del af samme plug-and-play-leverance og skal regressionsbevises før cutover. |

## Afviste hovedalternativer

### Multiplikativ eller harmonisk kerne

En multiplikativ kerne er matematisk attraktiv, men gør `transport = 0` til `score = 0` uanset mobilisering, jagtbarhed og muligt lokalt/sekundært lager. Det er en uunderbygget fysisk antagelse. Alternativet forbliver offline-ablation.

### Eksponentiel +10/−8-respons

En procentuel respons undgår nul, men ændrer ejerens deklarerede pointsatser til en ny ikke-lineær regel uden evidens. Den aktive implementering bevarer point pr. effektiv time og forbedrer i stedet alderskernel og evidensintegritet.

### Numerisk last-mile-faktor

En lille faktor kan se konservativ ud, men dens størrelse og fortegn kræver lokal batymetri, en opløst surfzonemodel og ravets lokale partikelstate. Aagaard, Black & Greenwood 2002 (DOI `10.1016/S0025-3227(02)00193-7`) viser både land- og søværts revletransport afhængigt af undertow, bølgeskævhed, dybde og hældning. Jalón-Rojas m.fl. 2025 (DOI `10.5194/gmd-18-319-2025`) viser, at vertikal position/densitet ændrer Stokes-/undertoweksponering, mens Lofty m.fl. 2023 (DOI `10.1016/j.watres.2023.120329`) bruger rav som lavdensitets bedload/saltation frem for en fri overfladetracer. Det er mekanistisk støtte, ikke dansk ravkalibrering. Det gælder også den tidligere `5,25 %`-hypotese. Den korrekte aktive repræsentation er score-neutral faktor 1 samt eksplicit strukturel usikkerhed.

### Vandstandspoint

Små niveau- eller trendpoint blev afvist, fordi absolutte niveauer ikke er universelt sammenlignelige, samme fysiske signal kan være indeholdt i gridstrømmen, og lokal batymetri afgør, om faldende vand primært blotlægger, fastholder eller transporterer materiale.

## Konklusion

Den integrerede model er en ny hel kontrakt, men ikke en blind genopbygning. Den bevarer 20/50/30, strømgrænser, +10/−8, 4/48-mobilisering, jagtbarhed, provenance, dæknings- og præsentationskontrakter. Den forbedrer state, evidence, missing, migration, recovery og payloadbinding. Den fjerner helscore-nulgaten, dobbelttælling, skjulte Phase-D-gates, offentlig adaptiv model og uunderbyggede vandstands-/last-mile-point.

Den vigtigste faglige korrektion er, at sidste nærkystlevering ikke længere skjules i `5,25 %` eller et opdigtet interval. Den er aktivt score-neutral med faktor 1 og permanent strukturel usikkerhed, indtil et nyt lokalt datagrundlag kan begrunde andet.
