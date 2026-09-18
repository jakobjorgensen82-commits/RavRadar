# Samlet vejrgennemgang – 18. september 2026

Status: analyse, ikke implementeret rettelse. Astra Ultra er brugt til denne
afgrænsede helikoptertur. Skift tilbage med indsats Ekstra høj før næste
implementeringsafsnit. Ingen providerkald, workflowstart, commit, merge,
scoreformel-, geometri- eller produktionsændring er foretaget i analysen.

## Arbejdssted og faktisk produktion

Arbejd i `node_modules/RavRadar-4.0.396` under cb79-worktræet, ikke i det
gamle, ændrede ydre worktræ. Aktiv branch er
`codex/4.0.423-current-score-and-terminal`; HEAD er main `8a95c7cf` fra
PR #367. Appversionen er stadig **4.0.422**, ikke 4.0.423.

Normalrun **35386276428**, target **18. september kl. 21 dansk tid**
(`2026-09-18T19:00Z`), byggede og deployede 4.0.422. Buildjob
105733929058 og Pages-job 105750543259 lykkedes. Afslutningsjob
105750748315 var rødt på fuldvalideringens diagnose, efter vellykket deploy.
51 af 52 artifactkontroller bestod; den tilbageværende var den ældre
strøm-spatialaudit. Alle tre releasekontroller bestod. Den separate
integrerede runtimeaudit bestod med 673 fortsatte tilstande og **nul
state-replay-afvigelser**. Det er reel fremgang fra de tidligere 672.

Det er **ikke** bevis på fuldt brugbare scorer: 420 aktuelle zonetilstande
(210 zoner gange to måder) var utilgængelige. 420 er et antal, ikke en
HTTP-fejlkode. 43.942 af 49.560 zone/måde/time-resultater var utilgængelige
over de 118 timer. Ved target manglede vind i alle 673 kystdeles offentlige
vejrfelter; 590 dele fik vind som første scoringsfejl, 83 fik strøm som
første fejl. **83 er kystdele, ikke zoner**, og første fejl kan skjule flere.
Alle 673 havde bølgehøjde ved target. Zonevejret indeholdt vind, men
zonepunkter og delpunkter er ikke samme prøvested og må ikke ombyttes.

## Bekræftede fejl og den samlede rettelsesretning

### 1. Succesfuld levering bliver fejlagtigt afsluttet som mislykket

Manuel afslutning i `.github/workflows/run-current-weather-once.yml:162`
og normal/cron-klassifikation i `scripts/production-workflow-outcome.mjs:426`
kræver stadig grøn fuldvalidering/releasegate efter verificeret deploy.
Små reproduktioner med eksisterende classifierfixture bekræfter
`FAILED / INCOMPLETE_BUILD_GATES` ved kun diagnostikfejl og ellers
verificeret deploy. Reusable build følger allerede fortsæt/saml-fund.

Ret begge veje med én fælles afslutningskontrakt. Bevar DEPLOYED som
kendt topstatus, og medtag diagnosefund som særskilt årsag/rapport. Reelle
fejl i target, private writes, artifact, privacy, checkpoint, Pages,
offentlig verifikation eller central afslutning må ikke kaldes succes.
`CONTINUE_WITH_VALID_WEATHER` er ikke alene tilstrækkeligt bevis: den
eksisterende rapport kan have den disposition trods operationelle fejl.
Brug det faktisk forseglede `deployed_verified` samt komplette udfald.
Ukendt, cancelled eller skipped er ikke automatisk en gennemført kontrol.

Strømauditten `test-current-spatial-scientific-audit-4.0.76.mjs:123`
forventer fortsat verificeret strøm/hold for alle 673 dele. Ret dens
klassifikation af ærlig lokal MISSING uden at acceptere falsk score, pil
eller kildebevis. Der er endnu ikke privat bevis for, at **alle** fund i
sidste audit alene skyldtes denne forventning. Manglende data skal stadig
løses, ikke blot omdøbes.

Ejers seneste krav om at rette fejlmailen ændrer den tidligere tilladte
røde afslutning i DEC-0193 punkt 6 og DEC-0202s driftstillæg. Registrér den
præcise nye kontrakt ved implementering, ikke en generel skjul-alle-fejl-regel.

### 2. Vind kan tælles dækket uden brugbare mellemtimer

`component_horizon_hours` i `scripts/update-dmi-bulk.py:8879` måler
numeriske native punkter, ikke komplette vindpar og timeopløselige
kildeserier. Syntetisk giver 40 gyldige tre-timerspunkter fra skiftende
prognosekørsler **117 timers registreret dækning**, mens den faktiske
forecastbygger mangler mellemtimerne. Almindelig interpolation inden for
samme gyldige serie fungerer. Dette er et bevist mismatch mellem scheduler
og forbruger, men endnu ikke en privat kildeidentifikation af livehullerne.

Samme rå horisont bruges i collection_schedule, atmosphereFoundationNeeded,
windTail-behov, clean_and_summarize og tidlig cache-health. De skal bruge
én fælles, vind-specifik måling af reelt brugbare timer på den låste akse.
En rettelse kun i den synlige tæller er utilstrækkelig. Den strenge regel
mod at blande forskellige modelkørsler skal bevares.

Der findes også en mindre, reproduceret forskel: sikker seriesøgning ved
modelovergang bruges for DKSS-windTail, men ikke HARMONIE i
`dmi-forecast-store.mjs:433/489`. En gammel måletime ved -2 og en ny serie
ved +1/+4 giver manglende H0 for HARMONIE, mens DKSS finder en gyldig
eksisterende kantregel. Del den eksisterende sikre mekanisme, hvis den
indgår i rettelsen; indfør ikke fri interpolation mellem forskellige runs.
Denne kantretning kan ikke alene lukke alle skiftende tre-timershuller.

### 3. Historisk genopbygning mister netop sin historik

`bulkZoneToForecastRecord` modtager korrekt `startAt: replayStartAt` fra
både deployet og progressiv cache (`update-weather.mjs:2257/2295`). Den
kalder derefter `mergeHourlyPreferDmi` med kun generatedAt. Funktionen
filtrerer til den offentlige fremtidsakse (`:2950`) og fjerner fortiden.

Lille reproduktion af den virkelige mergefunktion beviser:

| Situation | Historiske inputtimer | Historiske outputtimer |
| --- | ---: | ---: |
| Kold genopbygning | 48 | 0 |
| Fortsættelse efter to timer | 1 | 0 |

Skil den offentlige 118-timersakse fra den private genopbygningsakse.
Bevar 4.0.418s præcise offentlige +0..+117-kontrakt. Historiske rækker skal
beholdes privat for samme sted/time, når kildebeviset er gyldigt; ingen
flytning af data fra en anden time. Vind, strøm og bølger forbliver
uafhængige hele komponentpar/-pakker. Dette er en konkret kodefejl, men
ingen garanti for at den alene forklarer 420 eller gendanner manglende rådata.

### 4. Feggesunds bølgebehov er usynligt for dele af planlægningen

Seneste runtimeaudit: 222 accepterede af 354 deltimer (219 direkte,
3 godkendt naboproxy), **132 mangler**. Forrige target kl. 19 dansk:
228 accepterede/126 manglende. De to godkendte nabozoner DK-B05-10 og
DK-B05-12 havde samme seneste bølgetime, 22. september kl. 03 dansk,
i begge artifacts. Ved ny target har hver 74 dækkede og 44 udækkede timer:
fem interne huller og 39 timer i slutningen. Det er altså ikke kun et
efterslæb på den første time eller en rent sammenhængende manglende hale.

Native WAM-plan/gate udelader bevidst Feggesunds tre dele og parentrækker
(`update-dmi-bulk.py:4172`). Derfor kan native WAM være komplet, mens de
operationelt nødvendige Feggesund-/nabobølger mangler. Syntetisk bevis:
Feggesund helt tom, men criticalWam tom; Feggesund-only fremskridt kan
afvises som INCOMPLETE_QUALITY_REFRESH, fordi det giver nul native gevinst.

Tilføj særskilt operationelt bølgebehov for det godkendte Feggesund-forløb
til prioritering **og** promotion. Bevar den native 670-dels kontrakt som
egen størrelse. Det er ikke korrekt blot at lempe 670 til en ny nævner,
fjerne bølgekravet eller bruge vilkårlige naboer/leverandører. Direkte
gyldige bølger først; proxy kun fra de allerede godkendte to naboer med
de eksisterende samme-time/samme-run-krav.

### 5. Tidsbudgettet bruges ikke kun på at hente nyttige hultimer

Payloadfrie loglinjer fra sidste build viser 779 sekunders DMI-arbejdsbudget
plus 120 sekunders afslutningsreserve. Første asset begynder ved +267s.
DKSS-LF behandler én fil; WAM-DW begynder ved +356s og behandler første
af 94 assets, gyldig netop H0. HARMONIE og WAM-NSB starter ikke i loggen.
WAMs behandling tager 163,8s mod ca. 22s for DKSS-LF; checkpointet er gemt
ved +562s, med ca. 217s tilbage. Den sidste kørsel fornyede således ikke
den manglende bølgehale.

ProgressCheckpointController bruger én p95-assetomkostning på tværs af
produktfamilier. En dyr WAM-fil kan derfor få en billig DKSS-fil vurderet
som dyr. Startkravet inkluderer også pending-/write-reserver. Koden
underbygger budgetforklaringen, men stdout beviser ikke den eksakte sidste
stopgren. Undersøg før ændring: familieopdelt omkostning, reelt huludbytte,
cursor videreføring på samme gyldige run og den lange forberedelse.
Forøg ikke blot køretiden og kald problemet løst. WAM vælger nyeste run;
runskifte nulstiller processedSteps. En ny targettime kan derfor igen tage
førstepladsen, før den manglende hale. Den fulde +0..+117-akse er allerede
med i WAM-evidensen: hypotesen om en rent current-only WAM-plan er afvist.

## Leveringen skal planlægges før ændringernes placering besluttes

En ændring kun i update-weather ændrer runtimekontrakten, men ikke
RavScore-bundlen; eksisterende CONTRACT_ONLY_REBIND kan levere kode uden
providerkald, og næste normalrun anvender de nye inputregler.

Ændres dmi-forecast-store, produktionsadaptere, Feggesund-proxy eller replay,
ændres modelbundlen også, selv om formel/vægte er uændrede. Den nuværende
MODEL_BINDING_MIGRATION kræver scoresChanged=true og kan derfor afvise en
korrekt inputreparation med uændret gemt vejrdatasæt. Last-mile-migrationen
genhenter/genopbygger ikke automatisk manglende vind eller bølger.

Vælg den rigtige kodeplacering ud fra årsagen, ikke for at skjule en ændring
for bindingen. Afklar og måltest en korrekt providerfri leveringsvej for de
faktisk berørte filer, så denne kendte leveringskant ikke først opdages
efter en lang vejrhentning. Ingen ændring af RavScore-formel eller vægte
er godkendt som en del af denne analyse.

## Næste samlede arbejdsafsnit

1. Efter modelskift: brug den eksisterende beskyttede cache og en lille
   payloadfri diagnose til at afgøre livevindens serie-/proveniensbrud og
   strømmens native/mellemtime-tab. Ingen ny providerkørsel til dette.
2. Ret fælles terminalkontrakt, historisk tidsakse og dokumenterede
   planner/promotion-fejl samlet. Tag HARMONIE-seriekanten med, når korrekt
   binding/leveringsvej er afklaret. Bevar gamle gyldige komponenter ved
   nye huller; verificér også hvordan dette gælder delvind, hvor det
   offentlige delbyg i dag sender null som previousRecord.
3. Kør kun relevante kontraktreproduktioner: præcis offentlig/historisk
   akse; gyldig/manglende vind; Feggesund-only hulgevinst; begge
   afslutningsveje samt code-only-binding. Ingen historisk testsuite-loop.
4. Synkronisér ny version alle steder, RDKS, issues, changelog og begge
   håndbøger, med særskilt versions-only geodatadiff. Lever rettelsen
   providerfrit gennem den aftalte kilde-/PR-vej.
5. Én almindelig tidsbegrænset vejrkørsel genbruger gemte cacher. Mål
   tilgængelige timer per komponent både før/efter forecast og efter
   kildekontrol — ikke blot cachepar eller grønt workflow. Verificér
   aktuel score, mellemtimer, Feggesund, bevarede gyldige værdier og
   korrekt grøn/rød afslutning. Scheduler genåbnes først på det grundlag;
   de gamle køposter må ikke vækkes. En efterfølgende rullende normal
   kørsel skal vise, at halen også flytter frem, frem for blot at gentage H0.

## Beviser og åbne hypoteser

Lokale artifacts ligger under `.tmp-420/`: seneste/forrige Pages-data,
runtimeaudit, sikre providerplaner og de syntetiske reproduktioner.
`reproduce-replay-axis.mjs` beviser tidsaksetabet.
`astra-wind/reproduce.mjs` beviser vindseriekanten; FINDINGS.md dokumenterer
117-timers schedulerreproen. `astra-wind/diagnose-wind.mjs` læser kun en
eksisterende cache og udskriver optalte fejlkategorier, ingen koordinater,
rå U/V eller private vejrpayloads. Den er syntakskontrolleret, men endnu
ikke kørt på produktionscachen.

Der er ingen privat rå DMI-cache i den downloadede supportpakke. Offentlige
fejlårsager er prioriterede enkeltårsager, ikke en komplet fejloptælling per
komponent. Fortolk dem ikke som fuld kildebevis. Hypotesen om et isoleret
første-time-problem er afvist af det gentagne tre-timersmønster. Hypotesen
om generel afrundingsfejl i Copernicus/Open-Meteo-vektorer er ikke
understøttet: producer og adapter anvender allerede samme fem decimaler.
En realistisk syntetisk DMI-strømkæde gennem forecast, sanitizer og
integreret scoring leverer korrekt strøm og begge scorer på både
mellemtimerne 19/20Z og native 21Z. Nær 360 grader normaliseres korrekt.
Der er dermed ikke bevis for en generelt ødelagt strøm-interpolation.
DMI_VERIFIED i closure går via den originale bulkcache, ikke den
supplerende live-current-liste; sammenlign disse to leds faktiske
brugbare timer før en ny strømlogik foreslås.

Korrekte resultater betyder endnu ikke stabil almindelig drift eller fuld
prognosedækning. Ingen af de ovenstående analysefund er implementeret eller
livebevist af denne helikoptertur.
