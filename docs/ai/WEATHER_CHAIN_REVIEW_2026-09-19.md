# Samlet gennemgang af vejrhentning, modelhistorik og hjemmeside

**Efterfølgende implementering:** [Genstartscheckpoint og komplet fund→rettelse-matrix](WEATHER_CHAIN_IMPLEMENTATION_CHECKPOINT_2026-09-19.md).
Nedenstående beskriver analysen før kodearbejdet, ikke den aktuelle lokale
implementeringsstatus. Alle fund skal fortsat dækkes af den samlede rettelse.

Dato: 2026-09-19. Analysegrundlag: main `4bee5b0d0909b56a6f66e0f0e961f51321f9d236`,
release 4.0.429. Dette er et analysecheckpoint, ikke en ny release eller en
erklæring om stabil drift. Ingen produktionskode, modelvægt, geometri eller
acceptgrænse er ændret under gennemgangen.

**Efterfølgende helhedskrydstjek:**
[Samlet rettelsesplan og interaktioner](WEATHER_CHAIN_CROSSCHECK_2026-09-19.md).
Den gennemgår alle fund sammen og tilføjer bølgeparameterfejlen,
118/121-præciseringen, konkrete public-størrelser, migrationsrisici og
responsbundet provideralder. Fire-døgnsreglen indsnævrer ikke analysen.

## Ejerens aktuelle krav

- Undersøg hele kædens sammenhæng og krydstjek fund før samlet implementering.
  Små lokale rettelser må ikke blot flytte fejlen til næste led.
- Målet er gyldige data i alle nødvendige felter, steder og timer. MISSING er
  kun lokal nødadfærd, aldrig et komplet datasæt eller acceptabel sluttilstand.
- Nye gyldige komponenter afløser gamle. Ved hul bevares gyldig ældre komponent
  for samme sted og tid; først når ingen gyldig værdi findes, bliver den MISSING.
- DMI har førsteprioritet. Ejeren har korrigeret analysens formulering:
  Copernicus/Open-Meteo er ikke tiltænkt kun strøm eller prognosehalen.
  De skal udfylde ALLE resterende huller i ALLE nødvendige vejrtyper efter
  hver DMI-kørsel, både aktuelle, indre og yderste timer. Gyldig DMI, også
  gyldige gemte værdier, må ikke overskrives. Derefter Copernicus og til sidst
  Open-Meteo for felter, de kan levere gyldigt. Koden, der kun accepterer
  current-fallback i PART-modellen, er en implementeringsmangel, ikke formålet.
- Ejerens efterfølgende præcisering: reservedækning er ikke en permanent
  afslutning af DMI-opgaven. Når DMI er med og har kapacitet, skal den opsøge
  og overtage samme kvalificerede komponent fra Copernicus/Open-Meteo.
  Værdi og bevis skifter samlet; et forgæves forsøg efterlader gyldig reserve
  urørt. Hullukning/fornyelse og kildeopgradering skal måles særskilt.
- Scoreformel og faglige vægte ændres ikke som del af denne fejlretning.
- Seneste reserveundtagelse under afklaring: ejeren foreslår at lade CP/OM
  erstatte fire døgn gamle DMI-data. Anbefaling: mindst 96 timer fra eget
  modelrun til låst vurderingstid, ikke downloadtid eller forecastlead.
  Nyere gyldig reserve kan overtage; uden erstatning bevares gyldig DMI,
  og ny gyldig DMI vinder igen. Dette afløser det mellemliggende forslag om
  sidste prognosedøgn. Registreret i DEC-0210, endnu ikke implementeret.

## Faktisk status, ikke historiske checkpoints

- PR #374 er merged; exact-head sourcegate `35420912328` var grøn.
- `35421108551` genbrugte gemt vejr og deployede Pages den 19/9 cirka 06.27
  dansk tid. Offentlig verifikation afviste derefter profilens
  `modelMigrationReady=false`. Central status var allerede INTEGRATED_PENDING
  version 30. Fejlrecovery ramte samme verifierfejl.
- `35421627495` stoppede i central admin-sync før nogen providerhentning.
- Sidste faktiske fulde providerforløb er `35416641052`, med produktionstime
  19/9 klokken 04.00 dansk tid (02:00Z). Senere saved-weather er ikke nye data.
- Live manifest er `rr-20260919033449-210`, genereret 03:34:49Z og bundet til
  02:00Z. Startfilen er 887.107 byte; detaljefilen 148.241.305 byte.
- Workflow 318363965 er fortsat `disabled_manually`. Ingen ny providerkørsel
  eller aktivering af cron er udført i denne analyse.
- To lokale, ucommittede kodefiler fra den tidligere snævre verifierrettelse
  ligger stadig i worktree. De er ikke en færdig løsning og må ikke leveres
  alene: `verify-ravscore-operational-pages-deployment.mjs` og dens test.
- Arbejdsroden er det indlejrede `node_modules/RavRadar-4.0.396`, branch
  `codex/4.0.428-weather-completeness`. Den ydre worktree må ikke forveksles
  med den aktive kode. `.tmp-420/` er privat diagnostik og må aldrig stages.

## Målt grundlag fra sidste providerforløb

Den payloadfri stageoversigt har 673-dels summering, men kun 14 detaljerede
trace-rækker. Tallene nedenfor kommer fra summeringen, ikke fra de 14 rækker.

| Ved produktionstimen | Antal af 673 |
| --- | ---: |
| Gyldig vind i rå DMI, adapter og modelgrundlag | 0 |
| Bølgehøjde og periode i saniteret input | 673 |
| Bølgeretning i saniteret input | 673 |
| Gyldig aktuel strøm helt frem til modelinput | 665 |
| Vandstand | 377 |
| Tre-timers vandstandstendens | 78 |
| Tilgængelig score pr. søgemåde | 0 |

665 dele mangler vind som direkte scoreårsag; otte mangler direkte
strømgrundlag. 669 dele har mindst én accepteret fremtidig DKSS-vindtime.
Det er ikke det samme som 669 komplette vindprognoser. De fire øvrige deles
identitet kan ikke udledes af denne summering og må ikke kaldes Feggesund.

Den offentlige audit har 43.310 utilgængelige zone/time/mode-kombinationer
af 49.560. Feggesund har 198 accepterede bølgedeltimer af 354; 156 mangler,
og nul er udfyldt af den godkendte nabo-proxy. Alle 673 tilstande er bygget
ved cold replay, ingen er fortsat fra gemt state. Replayet har ingen
rekonstruktionsfejl; auditens tre fejlkategorier er blandet lineage,
blandet transition og national migration-not-ready.

De overlappende provider-cachetal er ikke eksklusiv kildefordeling og må
ikke lægges sammen som sådan. Komplet strøm er heller ikke komplet vejr.

## 1. Planlægning måler ikke hele det nødvendige vindarbejde

**Kodebevist; det gamle budgets H0-tab er produktionsbevist.**

`update-dmi-bulk.py:8776`, `11777` og `1286`: mangler native HARMONIE-vind
ved H0, bliver HARMONIE-opgaven begrænset til netop den time og ét asset.
Collectionen behandles én gang; der følger ikke en separat horisontpassage.
Næste nye H0 kan derfor udløse samme begrænsning igen. 1.500 sekunders budget
kan hjælpe akut H0, men udvider ikke i sig selv opgaven til fremtidige timer.

Forbrugeren accepterer HARMONIE eller gyldig DKSS-windTail pr. time
(`dmi-forecast-store.mjs:676–699`). Det akutte behov og freshness-shortcutten
bruger ikke samme union; sidstnævnte kræver 96 timers HARMONIE alene
(`update-dmi-bulk.py:10907`). Alle reelle strømhuller prioriteres samtidig
foran rene DKSS-vind-/scalarhuller (`1945–1991`).

**Retningskrav:** én måling af accepterede nødvendige komponenter pr.
kystdel/time skal styre både planlægning og forbrug. H0 må have hurtig hjælp,
men vindhorisont, WAM-forældre og vandstand må have afgrænset garanteret
arbejde; mere samlet køretid er ikke alene en løsning.

## 2. 118 timer kræver en dækkende kæde, ikke kun mere DMI-tid

**Officielt dokumenteret kapacitet plus kodebevist kildevalg.**

DMI dokumenterer DINI-vind til 60 timer hver tredje time, DKSS til fem døgn
hver sjette time og WAM til 5½ døgn hver sjette time. DKSS er normalt først
komplet cirka 3 timer og 20 minutter efter modelstart. Se de officielle
[DINI](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-weather-model-harmonie-for-dini-and-ig),
[DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss),
[WAM](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam)
og [tilgængelighed](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-availability).

Heraf følger: 120 timer regnet fra DMI-modelstart er ikke 120 timer fra
RavRadars senere produktionstime. Er seneste komplette modelrun eksempelvis
otte timer ældre end H0, slutter det ved H0+112. Gamle modelruns slutter endnu
tidligere og kan ikke udfylde H0+117. Den eksisterende højst 95-minutters
kantregel kan ikke løse flere timers manglende hale. Dette er et beregnet
eksempel, ikke et påstået katalogudtræk fra den konkrete kørsel.

Vandstandstendensen behøver desuden værdien tre timer senere end den viste
time (`dmi-forecast-store.mjs:681,692–715`). Sidste H117-tendens behøver derfor
gyldigt grundlag ved H120. Horizonbehov skal beregnes fra de faktisk brugte
felter, inklusive sådanne afhængigheder og historik.

Den integrerede fallbackkæde henter i dag strøm fra Copernicus/Open-Meteo.
Vindadapteren accepterer kun DMI `wind|windTail`
(`ravscore-production-adapters.mjs:309–333`). Repositoryet har også en ældre
Open-Meteo-zonevej til vind, bølger og vandstand. Den er faktisk aktiv i normal
zonebygning via resolveZone/fallbackForZone/forecastFromOpenMeteo, men disse
felter er ikke dermed accepteret input til den integrerede 673-dels model.
Det er et konkret brud mellem eksisterende hentning og den nye forbruger.

Ejerens aftale er bredere end haleproblemet: reservekilder skal lukke alle
resterende komponenttimer, uanset hullets placering og vejrtype. Det kræver
samme sted/tid, korrekt enhed, modelidentitet,
kildeprioritet og dokumenteret sammenlignelighed. Vandstandsreferencer må
ikke blandes uden datumafklaring; vindhastighed og retning skal følges ad.
Der må ikke sættes nul ind, ekstrapoleres vilkårligt eller forkortes horisont
for at få et kunstigt grønt komplethedstal.

WAMs officielle parameterliste indeholder også 10-meters vindhastighed og
retning over den længere horisont. Det er en DMI-kandidat til undersøgelse,
ikke en allerede implementeret eller kvalitetsbevist vindhale. Den blev
allerede nævnt i `docs/research/DMI_FIRST_FIVE_DAY_SOURCE_AUDIT.md`; den gamle
forskningsnote indeholder dog også senere erstattede strømregler og er ikke
selv en aktiv implementeringstilladelse.

Open-Meteos officielle [vejrdokumentation](https://open-meteo.com/en/docs)
viser 10-meters vind og længere prognoser; [marine-dokumentationen](https://open-meteo.com/en/docs/marine-weather-api)
viser bølger, vandstand, vandtemperatur og strøm. API-mulighed er dog ikke
bevis på gyldig lokal dækning. Vandstand er angivet mod global middelvandstand
og har udtrykkelige kystbegrænsninger. Den eksisterende continuity-offset er
ikke i sig selv en dokumenteret datumkonvertering. Genbrug den brugbare
hentekode, men bind hver accepteret komponent til den rigtige kystdel/time
og vis samme udvalgte værdi i model, offentlig vejrvisning og kildeoplysning.

En særskilt kodekant skal rettes samlet: private forecast normaliseres til
120 rækker H0..H119, men sanitizeren genberegner H117-vandstandstendens fra
H120. Sidste offentlige tendens kan derfor blive null, selv med tilstrækkelig
upstream-data (`dmi-forecast-store.mjs:629`,
`ravscore-production-adapters.mjs:450,563–571`). Konteksthul, ikke årsagen til
de 420 manglende aktuelle scorer. Støttetimer må beholdes privat uden at
ændre den offentlige H0..H117-akse.

Krydstjekket præciserer, at `mergeHourlyPreferDmi` allerede før adapteren
klipper til 118 offentlige timer (`update-weather.mjs:1128,2958–2963`).
Dermed kan H115, H116 OG H117 mangle deres H118–H120-grundlag. At ændre
standardnormalisering fra 120 til 121 alene løser ikke hele fejlen.

## 3. Strøm kan allerede genbruges; forklaringen om hel cache var forkert

**Eksisterende korrekt mekanisme; én isoleret friskhedsfejl reproduceret.**

`load_previous` bevarer eksakte strømbeviser fra tidligere hentninger.
`backfill_compatible_cache_data` samler pr. del/time og flytter U/V og kilde
som én tuple (`update-dmi-bulk.py:7849–7893,8550–8568,9439–9499`).
En streng READY-donor betyder sammenhængende processing/proveniens, ikke at
DMI selv skal dække alle strømpar. Legitimt upstream-fravær kan være et
eksakt fallbackkomplement (`dmi_native_provenance.py:1930–2010`).

Der er ikke belæg for at gøre dette donor-krav til årsag til seneste H0-tab
eller blot fjerne det. Den almindelige donor er i forvejen den verificerede
aktive cache, og delvist candidatearbejde kan deltage gennem sit ledger.

Derimod bevarer backfill altid en gyldig primary-komponent, selv når en
gyldig donor har nyere modelrun (`7700–7706,7849–7870`). Med
`PREFER_OUTPUT_CACHE=true` kan en ældre progress-cache efter asymmetrisk
restore derfor undertrykke en nyere aktiv komponent. En lille isoleret
reproduktion bekræfter valget; forekomst i seneste produktion er ikke bevist.

**Retningskrav:** behold progress/rotation, men sammenlign gyldige
komponentrevisioner hver for sig. U/V forbliver atomiske; vind og bølger kan
fornyes uafhængigt af strøm. Eksisterende geografisk gridprioritet må ikke
ubemærket erstattes af en generel nyeste-timestamp-regel.

## 4. Kodeændring, privat historik og reserve-model danner en løkke

**Kodebevist; seneste run dokumenterer 673 cold replays.**

Den fulde private runtimehash omfatter acquisitionfiler som
`update-dmi-bulk.py` og `update-weather.mjs`
(`private-production-runtime-workflow.mjs:46–99`). En sådan rettelse kan
derfor gøre den gemte hele runtime inkompatibel. Det selvstændige schema-6
checkpoint bygges/gemmes/publiceres samtidig kun, når Candidate G-reserven
er READY (`reusable-weather-build.yml:2047–2083`). Under warmup mangler dette
uafhængige holdepunkt.

Mulig kæde: vejrkode ændres → fuld runtime afvises → intet selvstændigt
checkpoint → ny cold replay → fortsat warmup. Det forklarer en systemisk
risiko; ikke enhver kodeændring er en dokumenteret nulstilling.

Code-only-ruten kan allerede gendanne eksakt forgængerruntime og lave
verificeret CONTRACT_ONLY_REBIND. Den skal bruges ved rettelseslevering,
før næste normale weather, når denne vej er kompatibel.

Holdbar persistens skal også gemme gyldig integrated continuation under
warmup. Den tilhørende Candidate G-warmup-state skal bevares, fordi den
eksisterende pipeline behøver den ved fortsættelse. Gemning er ikke
rollbackgodkendelse. Et nyt checkpointschema og append-only SQL-validering
skal skelne gyldig gemt state fra `rollbackReady`; gammel schema-4-envelope
må ikke bare lempes. 673 dele, unikke sampling-contexts, model-/statehash,
samme reference, privacy, 72 timer og CAS skal bestå.

## 5. National readiness og offentlig verifier modsiger lokal robusthed

**Reproduceret med rigtige readinessfunktioner.**

En korrekt fuld 48-timers cold replay accepteres. En korrekt dokumenteret
partiel replay accepteres også. Nationalt kræves alligevel præcis én
`initialStateSource` over alle dele
(`ravscore-operational-state-readiness.mjs:51–64`). En blanding af de to
lovlige cold-replaytyper afvises. Den offentlige model bruger derimod
migrationflaget som advisory og afgør scoregyldighed lokalt
(`ravscore-public-model.js:257,627`).

Den lokale verifierpatch, der kun tillader migration=false ved nul aktive
zoner, er derfor for snæver. Når vindrettelsen gør nogle zoner tilgængelige,
kan den samme overgang blive afvist igen. Den må ikke leveres alene.

**Retningskrav:** klassificér bevisligt kompatibel overgang samlet, og behold
fuld/partiel historik præcist pr. del. Ugyldig modelbinding, replay og state
skal stadig afvises. Nationalt uens historiklængde er ikke automatisk
inkompatibel model. Førstegangscutover og Candidate G har særskilte krav.

## 6. Gennemført Pages og central afslutning kan låse næste hentning

**Aktuel produktionsfejl plus kodebeviste recoverykanter.**

Seneste saved-weather satte PENDING før Pages. Pages lykkedes, verifieren
fejlede, og næste manuelle weather stoppede før providerne. Den manuelle
weather og code-only deler ikke hovedworkflowets pending-recovery.

Recovery søger desuden bogstaveligt efter jobbet `Deploy prepared Pages
artifact` (`update-and-deploy.yml:455,462,469`). GitHub returnerer faktisk
`Deploy verified code-only artifact / Deploy prepared Pages artifact` for
job 105839350731. Match skal understøtte kendt reusable-prefix og stadig
kræve eksakt run, attempt, head og ét entydigt deployjob.

Historical complete har continue-on-error, men recoverytriggerens særskilte
complete-failure-gren gælder kun code-only (`reusable-pages-deploy.yml:728`).
Almindelig historical-maintenance kan derfor overse et fejlet sluttrin.

At flytte begin efter Pages er ikke alene en løsning: tabt afslutning kan
efterlade gammel ACTIVE centralt og nyt target offentligt. Genindgang skal
kunne afslutte det dokumenterede offentlige target fra gemt handoff uden
at hente vejr igen. Behold holdbar intent eller gør begge tilstande
genoptagelige; byg ikke endnu en engangsundtagelse.

## 7. Samtidige ruter kan publicere baglæns på samme main

**Kodebevist mulig sammenfletning; ikke observeret i seneste logs.**

Manuel weather bruger `ravradar-current-weather-once`, mens normal og
code-only/saved bruger `ravradar-weather-production`. Private generationer
har CAS og tidsregressionsbeskyttelse, men Pages har alene exact-main og
horisontkontrol før deploy (`reusable-pages-deploy.yml:460–495`). To runs
på samme SHA kan derfor afslutte Pages i omvendt tidsrækkefølge.

Brug fælles serialisering af alle produktionsruter, med deaktiverede gamle
køer håndteret eksplicit. En eventuel ekstra prædeploykontrol af offentlig
produktionstime skal også håndtere lige-tids kode-only korrekt. Fælles
gruppe må ikke utilsigtet genoplive historiske kørsler.

## 8. Retry omfatter ikke hele netværkssvaret

**To syntetiske reproduktioner, ingen eksterne writes.**

`supabase-admin-rest.mjs:48–67` og checkpoint-RPC
`protected-ravscore-continuation-checkpoint.mjs:508–528` retryer fetch-fejl,
men læser body uden for try/retry. Brud efter headers giver ét forsøg og
fejl, også ved en sikker GET. Checkpoint-RPC er allerede idempotent for
identisk payload i SQL; tabt svar kan derfor håndteres med samme body.

Transportretry skal dække body-læsning, men ikke skjule ugyldig JSON,
overstor body eller integritetsfejl. Central CAS og privat runtimepointer
har allerede præcis readback ved tvetydigt commit; de mekanismer bevares.

## 9. Mobilbeskyttelsen låser den gamle time

**Kode-/offlinebevist og observeret i Chrome på live 4.0.429.**

`data-service.js:839–864` kræver projektion efter H0 eller ved nøddrift.
Browser + detaljefil over 8 MiB giver kun den gamle H0-startpakke med
`emergencyDetailsDeferred`. `app.js:253–256` afbryder derefter alle normale
detaljehentninger, og timegenberegning gentager samme valg. Et gyldigt
datasæt kan derfor sidde fast alene på grund af filstørrelse/timeovergang.

Blot én ikke-sammenlignelig kildealder gør hele pakken EMERGENCY. Gyldige
Copernicus/Open-Meteo-kilder kan derfor udløse grenen allerede ved H0.
Ukendt alder er ikke det samme som ugyldig værdi.

Livekontrol viste gammel time 19/9 kl. 04.00, deaktiveret ravtur og en
fremtidig Livø-prognose på forsiden, hvis klik gav et panel uden lokal
femdøgnsprognose. Dette matcher koden. Det er ikke et nyt iPhone/Safari-bevis.

Åben fane genbruger også samme manifest ved timer/visibility og opdager ikke
automatisk en ny weatherpakke (`app.js:326,415`). Pile, som var indlæst før
timeovergang, kan blive stående med H0-data; første deferred indlæsning
installerer dem slet ikke.

**Retningskrav:** små hashbundne aktuelle-time-pakker og lokale zonefiler,
samme dataset/model og rigtig valgt time. Ny manifest læses ved timeovergang
og tilbagekomst; byt atomisk, og brug gyldig eksisterende prognosetime ved
netfejl. Hæv ikke blot 8 MiB-grænsen og genindfør Safari-hukommelsesproblemet.

Hele leveringskæden skal med: offentlig privacyprojektion, manifestindeks,
normal/saved/code-only-generering, artifactkopi, privacy-allowlist,
live-verifier, importgraf, service-worker og versionssynkronisering.
Brug uforanderlige dataset-/hashstier, ikke bare queryparametre på filer der
overskrives. Rå private records må ikke kopieres direkte til offentlige filer.

FlowPoints i dagens detaljefil er H0-metadata, også når timeprojektionen
vælger en senere score. En ren fildeling beviser derfor ikke senere timers
pilpunkter, hvis provider/grid skifter. Pilpunkt og kilde skal komme fra den
valgte times dokumenterede data; ellers må netop pilen ikke vises.

Public-projektor og runtimekontrakt indgår i modelbundle. Undersøg separat
deterministisk leveringsmodul med uændrede scoreværdier, men omgå aldrig den
eksisterende model-/browserbinding for at undgå en nødvendig migration.

## 10. Tests og dokumentation har også selvstændige fejl

`test-current-full-coverage-gate-4.0.232.mjs` forventer kildeteksten
`requiredCoastalPartCoverageRatio:controlledLive?1:null`. Den rigtige rapport
beregner siden 4.0.423 `verifiedScoreReadyParts/requiredPartCoverage`.
Dette er en forældet teksttest, ikke bevis på en regnefejl i den nye ratio.
De reelle datamangler er dokumenteret separat og forsvinder ikke af den grund.

Browsertesten forventer netop permanent defer af stor detaljepakke, mens
positiv timeprojektion testes uden browserens document. Den tester dermed
en lokal beskyttelse uden at bevise den nødvendige efterfølgende funktion.

Flere top-checkpoints kaldte stadig 4.0.429 lokal og handoff stod på 4.0.426.
De er historik, ikke nyeste faktiske drift. Denne rapport og nye topnoter
skal styre næste arbejdsafsnit.

## 11. Fælles række- og fallbackhåndtering kan blande tid, værdi og kilde

**Små offline-reproduktioner mod de faktiske funktioner; ikke påvist som
årsag til et bestemt produktionsresultat.**

- `normalizeForecastHourly` (`dmi-forecast-store.mjs:629–647`) beholder den
  første ikke-null værdi ved dublettid, men overskriver `sources` fra senere
  række. To uafhængige gennemgange har reproduceret gammel værdi med anden
  kildes provenance. Komponentværdi og kildebevis skal vælges atomisk før
  normalisering; et senere source-spread må ikke ommærke beholdte værdier.
- `forecastFromOpenMeteo` bruger `marineIndex.get(time) ?? index`: manglende
  eksakt marinetid kan hente en værdi fra en anden time. Fælles arrayindeks
  er ikke bevis for fælles gyldighedstid.
- Samme funktion klamper +3-timersindeks til sidste række. Det kan give en
  falsk tre-timersændring over kortere tid eller nul. Kræv eksakt T+3.
- Både øjebliks- og prognosehentning bruger Promise.all for atmosfære og
  marine. En isoleret marinefejl kasserer derfor en vellykket vindhentning.
  Forecastforsøget er også koblet til et forudgående vellykket aktuelt kald.
  Bevar og cache hver gyldig komponent uafhængigt, før resultater samles.
- 121 inputtimer bliver til 120 både ved OM-trim og standardnormalisering.
  En senere 118-timersmerge/continuity mister igen støttetimer. Rettelse af
  ét indeks alene giver derfor ikke korrekt H117-vandstandstendens.

Det nye reserveinput må ikke sendes ind i disse kendte fejlkæder. Ret
tidsopslag, retention og proveniensvalg som en fælles kontrakt, med små
offline-cases fremfor gentagne livehentninger.

## 12. DMI-opgradering kan blive udsultet trods resterende tid

**Kodebevist planlægningsrisiko; ikke kvantificeret i den aktuelle produktion.**

`update-dmi-bulk.py:2094–2146` fjerner gyldigt reservedækkede strømpar fra den
reelle hulliste, hvilket er korrekt for hullukning. Senere vedligeholdelse
kræver imidlertid både, at hele collectionen var refresh-only ved starten,
og at `primary_critical_work_observed` er falsk (`2296–2310`). Flaget sættes
ved indledende huller (`11486–11529`) og ved arbejde/budgetstop/fejl i andre
kritiske collections (`13881–13890`); det nulstilles ikke efter hullukning.
Selv tilladt vedligeholdelse har som standard kun to assets samlet.

Både normal og oneoff deler dette. Mere tid er derfor ikke alene en garanti
for DMI-overtagelse. Kildevalget er derimod allerede korrekt DMI-først for
strøm, når gyldig DMI faktisk er hentet: `current_operational_closure.py`
1119–1124 og 1181–1209 kræver DMI og reservekomplement uden overlap.
Rotation og bevarelse ved forgæves refresh findes og skal ikke nulstilles.

Retningskrav: vurder aktuel udførbar rest, ikke et historisk boolean-flag.
Brug ledig tid til vedvarende fair DMI-opgradering, også når kørslen begyndte
med huller. Bevar kvalificerede reserver og undgå meningsløs genprøvning af
samme negative asset. Måltest lukket hul → senere DMI-opgradering i samme
kørsel samt fuld reservedækning → fortsat native arbejde.

Der findes ingen aktiv komponentbaseret near-expiry-selector for PART-strøm.
120 timers DMI-current-lead er fra modelrun til validTime, ikke en TTL fra
download. CP's historikretention er ikke kildeudløb; OM har heller ikke en
fetchedAt-TTL. Legacy `DMI_CACHE_REFRESH_BELOW_HOURS=24` er fornyelsesplan,
ikke reserveovertagelse. Ejerens seneste 96-timers-forslag skal derfor
implementeres eksplicit gennem samme autoritative kildevalg; det findes
ikke allerede og må aldrig blive en automatisk sletning af brugbar DMI.

## 13. Bølge- og temperaturfallback kræver de korrekte variable

Den parallelle kilde-/kodegennemgang har afgrænset konkrete input uden
ændring af scoreformel eller centrale punkter. CP-bølger bruger totalbølgens
`VHM0`, `VTPK` og `VMDR` som én dokumenteret tuple. Baltic-dataset er
`cmems_mod_bal_wav_anfc_PT1H-i`; NWS er
`cmems_mod_nws_wav_anfc_1.5km_PT1H-i`. NWS' regionale maskering må ikke
omgås som en Feggesund-løsning. Se officielle [Baltic-PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-010.pdf)
og [NWS-PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-014.pdf).

OMs `wave_period` er ikke automatisk peakperioden. Den officielle
[ECMWF-implementering](https://raw.githubusercontent.com/open-meteo/open-meteo/main/Sources/App/Ecmwf/EcmwfVariable.swift)
skelner `mwp` fra `pp1d`/`wave_peak_period`. Den eksisterende zonekode bruger
`wave_period`; dette må ikke ukritisk videreføres til peak-baseret PART-input.

Temperatur kræver overfladelaget. Baltic-PHY har `thetao` på dybdelag;
strømmens deepest-common-layer må ikke genbruges. NWS har et særskilt
`cmems_mod_nws_phy-sst_anfc_1.5km-2D_PT1H-i` med `thetao`. Se
[Baltic-PHY-PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-006-007.pdf)
og [NWS-PHY-PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-013.pdf).
OMs SST kan være tidsinterpoleret; en timeakse er ikke automatisk native
timeværdier. [Marine-API](https://open-meteo.com/en/docs/marine-weather-api).

`ravscore-production-adapters.mjs:337–400` afviser stadig ikke-DMI-bølger
bortset fra den snævre godkendte proxy. Temperatur mangler tilsvarende
komponentspecifik sanitizer. Genbrug PART-identitet, batch/resume og
NetCDF-infrastruktur, men tilføj feltkorrekt admission og provenance i
adapter, replay, public visning og dækningsoptælling. Åbent før produktion:
aktuelle datasetversioner, Baltic-overfladedybde, lokale gyldige vådceller,
feltdefinitioner, vandstandsnulniveau og faktisk Feggesund-dækning. En lang
produktprognose beviser ikke, at alle lokale timer er gyldige.

## Samlet implementerings- og bevisrækkefølge

### Fælles komponentdesign før implementering

Behold den dokumenterede strømplan; dens `coveredPairs` er ikke komplet vejr.
Tilføj en lille separat komponentplan med samme targetfingerprint, UTC-akse,
inputhashbinding og ingen rå værdier. Tre fælles logiske kontrakter skal eje
forløbet, med ens scenarier på tværs af Python og JavaScript:

1. Valider kandidat: bind gyldige værdier og deres bevis til samme komponent,
   del, tid, enhed og aktuelle samplingidentitet. Frisk og gemt behandles ens.
2. Vælg kandidat: gyldig DMI før CP før OM, kvalificeret nyeste revision inden
   for samme kilde. Hentetid er ikke modeltid. Samme-run konflikt er ikke en
   invitation til at vælge efter tilfældig arrayrækkefølge. Strømmens allerede
   særskilt godkendte direkte/regional-hold-politik må ikke ændres ubemærket.
3. Opgør dækning fra de valgte komponenter: planner, adapter, diagnose og
   offentlig projektion skal være enige. UI må ikke foretage endnu et eget
   kildevalg. Adskil reelt hul, ikke forsøgt, kildefejl, lokalt afvist,
   gyldig reserve og mulighed for senere opgradering til foretrukken kilde.

Helt dækket af Open-Meteo betyder ikke, at DMI aldrig skal overtage;
prioriteret kildeopgradering er en særskilt, afgrænset opgave efter reelle
huller. Det er nu udtrykkeligt ejerbekræftet i DEC-0210. DMI-planen må ikke
bruge "gyldigt dækket af en vilkårlig kilde" som permanent skip. Planlæg
roterende opgraderingsarbejde med ledig kapacitet og genoptagelse, men lad
ikke nytteløse gentagelser mod samme utilgængelige upstream-run eller
opgraderinger fortrænge nødvendig hullukning/fornyelse. Adskil kvalificeret
kildeprioritet fra revisionens friskhed inden for samme kilde. Et råt
DMI-punkt hver tredje time er heller ikke en offentlig
timekomplethed; brug forbrugerens samme gyldige interpolationsregler.

Vandstandsniveau og afledt trend kan have hver sit kildebevis. Bevar et
gyldigt DMI-niveau, selv hvis dets fremtidige trendende mangler. En
reservetrend kan kun komme fra et helt, sammenligneligt T/T+3-par fra samme
kvalificerede serie; ikke ved subtraktion mellem DMI og Copernicus. Dette
skal vises ærligt og må ikke ommærkes som en DMI-trend.

Skeln mellem nødvendige scorefelter og nødvendige øvrige sidefelter. Begge
skal have komplethedsmål, men manglende temperatur skal ikke alene slukke en
ellers gyldig score. Den aktive P1-liste er vind, bølger, strøm, vandstand og
vandtemperatur; indfør ikke nye produktkrav om nedbør/lufttryk/andre felter
alene fordi en API kan levere dem.

### Levering og faktisk drift

1. Afslut komponentkædedesign: dokumenteret DMI-prioritet og reservekilder
   for hele behovsaksen; adskil ægte upstream-grænser, planlægningskø og
   værdier der kasseres i en adapter. Ingen ændring af scoreformlen.
2. Ret fælles driftspakke: readiness/verifier, genindgang, jobidentitet,
   complete-outcomes, serialisering, body-retry og komponentfriskhed.
   Afslut eksisterende dokumenteret Pages-target uden nye providerkald.
3. Lever vejrrettelser via kompatibel code-only-ombinding; bevar modelhistorik.
   Gør checkpoint under warmup til selvstændig dokumenteret persistens,
   ikke til reserve-model-aktivering.
4. Ret plan og accepteret komponentfallback samlet. Det er ikke nok at
   hente vind/vandstand, hvis adapteren stadig afviser den.
5. Lever små offentlige datapakker med korrekt time, provenance og atomisk
   opdatering. Kontrollér mobilbrowseren og åbne faner, ikke kun Node-fixtures.
6. Mål normal drift på gyldige nødvendige del/time/komponenter, første/sidste
   accepterede time, kilder og årsager til hvert hul. Sammenlign samme tidsakse
   mellem to runs, separat fra nye tilkomne haletimer. Bevis fortsat state,
   ikke blot cachefilens eksistens eller en grøn deploy.
7. Følg flere almindelige kørsler gennem leverandørskift og en hel normal
   døgncyklus. To runs kan bevise en bestemt fortsættelse, men er ikke alene
   bevis for stabilitet ved alle cycle-/horisontfaser. Genaktivér planlægning
   kontrolleret, og fortsæt derefter de øvrige roadmap-punkter.

## Afgrænset verifikation, ikke endnu en fuld testspiral

- Kør målrettede kontraktscenarier én gang pr. reel ændring: ny/gammel/ugyldig
  komponent; uafhængig vind/bølge/strøm; dokumenteret blandet replay;
  mistet svar før/efter commit; allerede deployet target; samtidige tidsmål.
- Bevis CP/OM → DMI ved samme komponent samt fortsat DMI-planlægning trods
  fuld reservedækning. En ugyldig DMI-kandidat skal lade gyldig reserve
  urørt; en nyere OM-hentetid må ikke alene fortrænge gyldig DMI. Afklar den
  seneste foreslåede 96-timers-undtagelse, og bevis den på grænsen, med
  komponentuafhængighed, nyere DMI og bevarelse uden gyldig erstatning.
- Brug samme gemte produktionsrapporter til hele restanalysen. Start ikke
  en oneoff for at genskabe eksisterende fejlevidens.
- Browserbevis omfatter aktuel time, to timeovergange, ny deploy i åben fane,
  zone/mode/ranking/tur/pile, kort netudfald og mobil tilbage fra dvale.
- Bevis numerisk komplethed særskilt fra strukturel 210/673-komplethed,
  providerprioritet, tilstrækkelig historik og sikkert deploy.
- Alle uafhængige kontroller samler deres fund. En ugyldig kilde bliver ikke
  gyldig ved at lade installationen fortsætte; lokal MISSING holdes synlig.

## Kontroller kørt i analyserunden

- Små offline-reproduktioner: fuld/partiel cold replay accepteres hver for
  sig, men blandingen afvises; ældre primary vinder over nyere donor;
  browser-timeprojektion udløser permanent defer; body-brud udløser ikke retry.
- GitHub-log/API og offentligt manifest læst; live Chrome gennemgået ved
  oversigt, fremtidig zoneprognose og tilbage. Ingen eksterne writes.
- `node scripts/validate-rdks.mjs`: bestået. `git diff --check`: bestået.
- Den samlede npm-alias kunne ikke køres direkte, fordi npm ikke er på PATH.
  Dens særskilte security-hardening-script blev forsøgt, men Node afviste
  TypeScript-indlæsning fra projektets indlejrede node_modules-sti
  (`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`). Det er en lokal
  kørselsbegrænsning, ikke en påvist ny produktionsfejl. Ingen fuld sourcegate
  eller bred suite er kørt eller påstået bestået i denne analyse.

Ejerkorrektionen er nu særskilt fastholdt i DEC-0210. Resterende
komponentdesign og kildedokumentation tilføjes før implementering.

Ingen fund ovenfor giver grundlag for at kalde den nuværende drift stabil.
Analysen har afvist flere for brede forklaringer og gjort næste rettelser
tværgående; endelig stabilitet kræver de beskrevne faktiske driftsbeviser.
