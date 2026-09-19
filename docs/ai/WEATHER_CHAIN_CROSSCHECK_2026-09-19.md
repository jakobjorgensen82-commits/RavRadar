# Tværgående krydstjek og samlet rettelsesplan

## NYESTE leveringshændelse – 4.0.430 merged, 4.0.431 historisk reentry

4.0.430 bestod exact-head `35446765316` og blev merged som `f7c954fe`.
Den providerfri kørsel `35447099504` startede ingen vejrleverandører og
deployede intet. Den fandt og verificerede det allerede offentlige target
210/673 samt gemte holdbar source-/targetevidens, men central PENDING version
30 forblev åben.

To sekventielle reentry-fejl blev fundet samlet: den gamle forseglede
readiness blev fejlagtigt målt mod 4.0.430's senere migrationsliste, og den
næste kontrol ville have krævet den kendte diagnostiske warmup-rapport helt
grøn, selv om dens immutable plan allerede havde calibration=false. Lokal
4.0.431 validerer derfor historisk evidens mod dens egne hashes og plan, mens
nye transitions stadig kræver dagens fulde migrations- og policykrav.

Artifactkrydstjek af sidste rigtige providerkørsel `35416641052` viser ingen
ny overset fejlkategori: H0-vind med nul accepterede rækker, otte direkte
strømhuller, 420 utilgængelige modes, de tre auditkoder, reserve-/budgetfund
og den forældede strømkontrol er alle dækket af matricen nedenfor. Det er
stadig ikke et produktionsbevis for rettelserne; det kræver først providerfri
central afslutning/deploy og derefter almindelige vejrkørsler.

## NYESTE samlede lukningsmatrix – 2026-09-19

Dette afsnit går forud for alle ældre statusafsnit i dokumentet. Den samlede
rettelse er fortsat lokal og er **ikke** produktionsbevist endnu, men den er
ikke længere afgrænset til 96-timersreglen eller den senest observerede fejl.
Den omfatter alle fund fra kørslen, den første helhedsanalyse, genstarten og de
efterfølgende krydstjek:

| Sammenhæng | Med i den samlede kodeændring | Resterende bevis |
| --- | --- | --- |
| DMI-plan, rotation og horisont | H0-grundlag, særskilt fremtidsrotation, vedligeholdelsescursor, ny officiel revision, scalarstøtte og privat H118–H120 til præcise tre-timers trends. | Almindelige produktionskørsler skal bevise fremgang og senere DMI-overtagelse. |
| Bevaring og kildevalg | Nye gyldige komponenter erstatter gamle pr. sted/time/komponent; nye huller bevarer gamle gyldige værdier; først udløbet+tomt bliver MISSING. DMI har førsteprioritet, reservekilder fylder huller, og dokumenteret DMI ældre end 96 timer kan udfordres af faktisk nyere kvalificeret reserve. | Frisk produktion skal bevise faktisk partition, provenance og komplethed. |
| Leverandørkæden | Copernicus og Open-Meteo producerer de manglende vind-, bølge-, strøm- og temperaturdele gennem samme bank/admission/valg/PART-kæde. Feggesunds direkte vej er med. Vandstand er kun DMI. | Rigtige providerkørsler og offentligt resultat. |
| Bølgeperioden | DMI PP1D/peak er skilt fra MWP/middel i decode, provenance, historisk overgang og scoreinput; Hs²×T-formlen er ikke ændret. | Gammel beskyttet runtime kræver den implementerede kontrollerede overgang og efterfølgende produktionsbevis. |
| Historik og checkpoint | Warmup, schemaovergang, ægte gammel læser, historisk inputtransition og eksakt replay er sammenhængende; en ny kontrakt må ikke få en falsk ny fortid. | Central SQL/migration og første virkelige overgang skal gennemføres. |
| Genoptagelse og deploy | Alle aktuelle indgange bruger fælles reentry, præcist run/attempt/head/deploybevis, monotont Pages-target og recovery efter fejlet complete. | Merge, reentry af den aktuelle uafsluttede overgang og central afslutning. |
| Mere end 14 dage | Payloadfri terminalkvittering gemmes holdbart og krypteret i den eksisterende private Supabase-lagring, peges på af en central metadata-pointer og kan genbruges uden udløbet GitHub-artifact. CAS/readback og ukendt svar er dækket. | Første virkelig gemte og genlæste kvittering i produktion. |
| Netværksbrud | Supabase genprøver afbrudt body-læsning for sikre reads og identiske idempotente writes; ugyldige/for store payloads skjules ikke som netværksfejl. | Driftsbevis ved rigtige kald. |
| Privat fremskridt | Én AES-256-GCM-krypteret progressfil indeholder allowlistede komponentbanker, originalbeviser, DMI active/candidate/current, CP/OM-current og staging. Nøglen afledes domæneadskilt fra den eksisterende service-role-secret; ingen ny manuel secret kræves. Vellykket privat runtime bærer samme fremskridt holdbart. | En rigtig kørsel skal rapportere størrelse og bevise restore; gamle remote cachegenerationer slettes først derefter. |
| Gamle cacheveje | Aktive normal-/manualveje gemmer ikke længere private mellemdata råt i Actions-cache. Gammel post-build-refresh, keepalive og pilot-oneoff er permanent deaktiveret. Officielle rå DMI-GRIB-filer er fortsat tilladt som ikke-private kildedata. | Kontrollér efter merge, at kun krypteret progress og den tilladte GRIB-cache oprettes. |
| Browser og offentlig pakke | Hashbundne shards, samme-time-visning, atomisk generationsskift, mobil-resume, aktuel time og afvisning af ældre svar er med. Lokalt MISSING gør ikke resten af siden ubrugelig. | Frisk artifactstørrelse samt rigtig Safari/browser- og hjemmesidekontrol. |
| Drift og varsling | Vagthund, reel offentlig alder, stale-run-sammenhæng og selvkørende cron/genoptagelse er samlet; ingen Codex-afhængighed er designmålet. | Flere almindelige kørsler i træk uden håndholdte indgreb. |
| Kontroller | Kildegaten er reduceret til 24 direkte produktionskritiske kommandoer og samler fejl. Recovery-workflowet indgår nu i releasekontrakten, og warmup-successoren indgår i både bindingsfixture og releasegate. De nye kontrakter har målrettede tests. | Én fuld sourcegate på PR'ens endelige head; ingen ny tung lokal gentagelse. |

Den ældre analyse nedenfor bevares som årsags- og designhistorik. Formuleringer
længere nede om, at 14-dagesbevis, krypteret failed-run-progress eller
komponentkæden "ikke er implementeret", er dermed historiske og ikke den
aktuelle status.

**Efterfølgende implementering:** [Gemt arbejde og åbne forbindelser efter genstart](WEATHER_CHAIN_IMPLEMENTATION_CHECKPOINT_2026-09-19.md).
Planen nedenfor er fortsat hele opgaven; checkpointet skelner nu mellem
lokalt implementerede dele og det endnu ufærdige arbejde.

Dato: 2026-09-19. Grundlag: 4.0.429 / `4bee5b0d`, den eksisterende
[helhedsanalyse](WEATHER_CHAIN_REVIEW_2026-09-19.md) og efterfølgende
uafhængige krydslæsninger. Dette er analyse, ikke en implementeret release.

Ejeren har udtrykkeligt fastholdt, at ALLE tidligere fund skal med. Den nye
96-timersregel er ét kildevalgspunkt, ikke en indsnævring af opgaven. Der
er ikke kørt nye providere, lavet deploy eller ændret scoreformel/geometri.

## Samlet konklusion

Problemerne ligger i overgange mellem flere led, ikke kun i en langsom
leverandør. Indsamling kan gemme brugbare data, som næste adapter afviser;
en inputrettelse kan gøre gammel state inkompatibel; korrekt Pages kan
efterlade central status uafsluttet; og en offentlig pakke kan være
integritetskontrolleret, men for stor til at vise den aktuelle time.

Derfor skal nedenstående fire arbejdspakker udvikles som én samlet plan.
De er ikke en bestilling på fire separate fejl-for-fejl-produktionsforsøg.
Uafhængige dele kan implementeres parallelt; integration og nødvendige
schemaovergange planlægges før første levering. Kun reelle kompatibilitets-
eller migrationskrav begrunder en separat leveringsgrænse.

## A. Bevar fremgang og gør genoptagelse sammenhængende

Omfatter hovedrapportens fund 4–8 og de gamle lokale verifierændringer.

1. Gem gyldig integrated continuation også under Candidate G-warmup, men
   behold `rollbackActivationReady=false`. State der kan fortsættes er ikke
   automatisk state, som er godkendt som reserve-model.
2. Reader, writer, SQL-validering, restore, kontrakthash og workflowets
   checkpoint-disposition skal understøtte samme schema. Ændringen af
   checkpointkoden ændrer selv continuation-hash; derfor skal eksakt gammel
   → ny læsning/migration med. Ellers fremkalder rettelsen en ny cold start.
3. Klassificér fuld og dokumenteret partiel cold replay konsekvent gennem
   runtimeaudit, readiness, offentlig verifier og central complete.
   Nul-aktive-zoner-undtagelsen er ikke en holdbar regel.
4. Fælles genoptagelse før admin-sync på normal, manuel, saved-weather og
   code-only. Brug eksakt run/attempt/head/artifact og entydigt deployjob,
   ikke kun et jobnavn uden reusable-prefix. Håndtér også fejlet complete.
5. Behold som udgangspunkt eksisterende begin før Pages. Bare at flytte
   begin til efter Pages skaber en uopdaget tilstand med gammel ACTIVE
   centralt og nyt offentligt target. En sådan ændring kræver i stedet et
   særskilt holdbart publiceringsintent og ACTIVE-recovery.
6. Serialisér alle aktuelle produktionsindgange, men ikke både caller og
   reusable med samme gruppe. Verificér desuden monoton generation før
   Pages: en ældre saved-weather på samme main må ikke overtage nyere vejr.
   Samme-time code-only kræver eksakt forgænger, ikke kun lighed i klokkeslæt.
7. Retry skal dække transportbrud under body-læsning. Sikker GET og den
   dokumenteret idempotente checkpoint-RPC kan genforsøges; identisk write-
   payload og read-back/CAS skal bevares. Ugyldig JSON, for stor body og
   integritetsfejl må ikke bare klassificeres som midlertidigt netværk.

GitHub-køen er ikke i sig selv bevis for targetrækkefølge: ventetid og
workflowets afsendelsestid er ikke samme sorteringsnøgle. Se
[GitHubs concurrency-kontrakt](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-workflow-concurrency).
De historiske kørsler må fortsat ikke genoplives ved genaktivering.

## B. Én autoritativ inputkæde, ikke flere konkurrerende kildevalg

Omfatter fund 1–3 og 11–13 samt det nye bølgefund nedenfor.

- Bevar rå gyldige kandidater med deres originale beviser adskilt fra den
  eksklusive valgte inputrække. DMI, som må udfordres efter 96 timer, er
  stadig gyldig DMI i råbanken; den må ikke ommærkes til upstream-fravær.
- Planen skal skelne reelle huller, nødvendig fornyelse, reserveforberedelse
  og mulighed for DMI-overtagelse. Behovet måles pr. del/time/komponent med
  samme gyldighed som forbrugeren, inklusive godkendt interpolation.
- Bevar H0-hjælp, men giv også vindhorisont, WAM og andre nødvendige felter
  afgrænset arbejde. Når huller er løst, må et sticky startflag ikke blokere
  resten af DMI-arbejdet. Rotation og resultatet af samme negative asset
  bevares; en ny officiel revision kan åbne et nyt forsøg.
- Ret backfill og dubletnormalisering samlet: gyldig komponent, tid og
  kildebevis vælges atomisk. Den eksisterende geografiske grid-/lagprioritet
  må ikke erstattes af en generisk største-timestamp-regel.
- Gem vind og marine uafhængigt ved delvis requestfejl. Slå tider op eksakt;
  ingen marine-værdi fra et nabosted i arrayet og ingen forkortet "3h"-trend.
- Hold den private støtteakse adskilt fra offentlig H0..H117. Privat T+120
  er nødvendig for sidste trends; private historiktimer beholdes efter
  eksisterende regler. H115, H116 og H117 må ikke miste H118–H120 i merge.
- Native og fallback skal accepteres ensartet gennem cache, PART-adapter,
  replay, scoreinput og public projektion. At udvide API-requesten alene
  løser ikke DMI-only-regler i de senere led.

### 96 timer er ikke bare en if-sætning

`build-copernicus-target-registry.py:149–188` bruger `dmi-gaps-only`.
`current_operational_closure.py:1089–1213` kræver CP/OM inden for det præcise
komplement til alle verificerede DMI-par. Python og JS har samme bundne
kildeorden. Derfor kræves en versionsbundet **valgpartition** med beskyttet
DMI, gyldig udskiftelig DMI og faktiske huller, efterfulgt af én vinder pr.
par. Rå DMI-ledger forbliver sandfærdig. Uden nyere gyldig reserve vælges
den stadig gyldige DMI.

Nuværende CP-schema gemmer acquisitiontid, datasetversion og subsethash,
men ikke en responsbundet meteorologisk modelreference. OM har hentetid og
responsehash, heller ikke modelRun. Disse cacher kan være gyldige huludfyldere,
men beviser ikke en nyere prognose end DMI. En produktversion er ikke et
vejrrun. Gamle records må ikke efterstemples fra nutidige globale metadata.
[OMs metadata](https://open-meteo.com/en/docs/model-updates) beskriver også
serverforskelle ved opdatering; separat metadata er ikke automatisk bevis
for den konkrete respons. Dette er en åben integrationsopgave, ikke en
begrundelse for at kassere gyldige reserver.

Alderen vurderes ved én låst `productionReferenceAt`, ikke af browseren eller
forskellige vægure under samme kørsel. Genhentning nulstiller ikke alder.
En korrektion af samme gamle run skal bevare original modelalder; den må
ikke få nyt modelRun alene for at genvinde DMI-prioritet.

### Nyt bølgefund og virkning på allerede gemte data

DMI skelner officielt PP1D/231 (peak), MWP/232 (middel) og MP2/221.
[DMI WAM-parametre](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam).
`update-dmi-bulk.py:374` lader både PP1D og MWP gå til
`dominant-wave-period`. Den faktiske classifier er reproduceret isoleret:
begge blev dominant. Kandidatbufferen ved 5881 kan derefter lade den sidste
message erstatte den første. Det er en kodebevist fejl, ikke endnu et bevis
for hvilken periode alle produktionsrækker indeholder.

Rettelsen skal omfatte decoder, feltidentitet/proveniens, donoraccept og
replay — ikke kun ændre OM til `wave_peak_period`. CP `VTPK` passer til den
tilsigtede peak-semantik; scoreformlen Hs²×T ændres ikke. Rækker med uklar
periodesemantik må ikke blot ommærkes som sikre peak-værdier.

Kontrollér originalt feltbevis. Kan et berørt asset genlæses fra faktisk
bevaret og hashverificeret GRIB, genbruges det. Det er ikke garanteret, at
alle råfiler findes: `prune_raw_cache` ved 3255 begrænser råcachen. Ellers
planlægges målrettet fornyelse af netop den berørte bølgekomponent. Ingen
automatisk nulstilling af gyldig vind, strøm eller hele cachen.

### Vandstand, temperatur og fysisk betydning

En tre-timers ændring kan leveres fra samme dokumenterede serie og præcise
T/T+3-punkter uden at kende et konstant absolut datumoffset. Absolutniveau
er derimod ikke bevist fælles mellem DKSS, CP og OM. Legacy-offset mellem
forskellige tidspunkter er ikke en gyldig datumtransformation.

Vandstand er numerisk score-neutral i `ravscore-integrated.js:88`, men
absolutniveau bruges ved waders-tiebreak (`best-time-policy.js:117`) og i
UI-tabeller/min/max. Derfor er ukendt datum ikke ligegyldigt. Adskil
accepteret niveau og accepteret trend. Fuld niveaudækning kræver dokumenteret
normalisering eller en eksplicit kilde-/referenceopdelt kontrakt, som ikke
lader usammenlignelige tal indgå i samme lavvandsvalg. Ingen skjult
scoreændring eller opdigtet DVR90-label.

Vandtemperatur kræver dokumenteret overflade, ikke strømmens dybeste fælles
lag. PART-identitet og konkrete vådceller skal verificeres for de nye
produkter; global produkthorisont er ikke lokalt dækningsbevis. Feggesunds
allerede godkendte DMI-proxy må ikke uden videre udvides til andre kilder.

## C. Historikken skal passe til det input, der faktisk blev brugt

Dette er forbindelsen mellem A og B, ikke endnu en selvstændig scoremodel.

- Ny kildepolitik ændrer ikke automatisk fortidens valgte input. Hvis en
  historisk time faktisk korrigeres, skal state enten fortsætte på bevaret
  attesteret historik eller beregnes igen fra før første ændrede time.
  Et gammelt checkpoint må ikke stiltiende få en ny fortid.
- Recovery-replay afviser forskellige signatures for samme komponent/time
  (`ravscore-recovery-replay.mjs:322`). Autoritativt kildevalg skal derfor
  ske før union; rå gammel DMI og ny reserve er ikke ligeværdige peers.
- `CONTRACT_ONLY_REBIND` er kun til uændret autoritativt indhold. Nye valgte
  værdier, cachefiler eller reparerede bølgeinput kræver korrekt afledt
  generation og migrationsbevis, ikke et kosmetisk hashskifte.
- Acquisition, adapter og public projector indgår forskellige steder i
  private/modelkontrakter. En uændret matematisk formel betyder derfor ikke
  automatisk uændret implementeringsbinding. Bevar valideret gammel læser
  og planlæg ny binding uden at skjule den nødvendige overgang.
- 96 timers kildepolitik ændrer ikke checkpointets særskilte
  fortsættelses-/historikregler eller åbner kalibrering for reserveinput.

## D. Browser og publicering som ren, tidskorrekt levering

Omfatter fund 9–10 plus ovenstående generation/statebinding.

En read-only størrelsesmåling på **ældre gemt offentligt artifact**
`rr-20260918201700-210`, ikke på dagens sidste providerkørsel, viste:

- Hele detaljefilen: 146.966.250 bytes.
- Dens zonevise scoretidsserier: 137.062.126 bytes.
- En zones eksisterende vejr-/scoretidsserier: 453.874–1.728.078 bytes.
- En landsdækkende times eksisterende vejr-/scorerækker: 981.186–3.044.068
  bytes før nye envelopes og supplerende metadata.

Det understøtter opdeling, men er ikke et endeligt mobil-memorybevis.
Fremtidige fuldt tilgængelige scorer kan fylde anderledes end de mange
unavailable-resultater i dette artifact. Bevar nødvendige forklaringer og
lokale data; formindsk ikke filen ved blot at slette produktfunktioner.

Leveringen skal omfatte generator, manifest, privacy-allowlist, artifact-
kopi, verifier, service-worker, loader og UI-opdatering samlet. En tidligere
gemt exact-source skal fortsat kunne kontrolleres under sit gamle schema.
Code-only har i dag lighedskrav til hele manifest/projektion; ren ændring af
pakning skal have et eksplicit semantisk ækvivalensbevis, ikke et generelt
fravalg af den kontrol (`prepare-code-only-public-runtime.mjs:429–439`).

Krav til browseren:

1. Små hashbundne time-/zonepakker fra samme generation og model; ingen ny
   kildeudvælgelse eller scoreberegning i transportlaget.
2. Manifest genlæses ved relevante time-/visibility-hændelser. Installer ny
   generation atomisk, og afvis sent svar fra en forladt generation.
3. Allerede gyldigt indlæst vejr kan fortsat bruges ved netfejl inden for
   sin egen horisont. Manglende én detaljefil er ikke grund til permanent H0.
4. Bounded hukommelsescache og enkelt samtidige hentninger pr. nøgle.
   Nuværende `memory` er en ubegrænset Map; TTL styrer genbrug, ikke sletning
   (`data-service.js:81–108`). Bare at tilføje mange shards kan give ny
   hukommelsesvækst i en længe åben fane.
5. Pile/punkt/kilde skal passe til den valgte time. Detaljefilens PART-
   metadata beskriver primært H0; slicing alene gør dem ikke tidskorrekte.
   Bevar nærzoomfunktioner og de relevante lokale dele, ikke kun vinderen.
6. Ukendt CP/OM-modelalder vises ærligt, men må ikke gøre ellers gyldige
   data fysisk ugyldige eller låse aktuel time. Publicering, dataalder og
   numerisk dækning er forskellige egenskaber.

## Kapacitet, privatliv og admin hører med i samme ændring

Nye komponentbanker/valgbeviser skal ind i fast privat filinventar, manifest,
kontrakthash og restore. Rå kandidater gemmes én gang; checkpoint/public
må ikke blive ekstra råbanker. Mål serialiseret OG komprimeret størrelse
mod eksisterende bounds, inklusive overhead: checkpoint 16 MiB, privat
arkiv 768 MiB pr. fil/2 GiB råt samlet, højst 350.000.000 komprimerede bytes
og otte objekter à 50.000.000 bytes. Ingen blind forhøjelse af grænser.

Centralt gemte godkendte punkter forbliver autoritet. Target-/punktfingerprint
og kildeidentitet må hverken nulstilles ved et almindeligt timeskift eller
ignoreres ved en reel adminændring. Gamle lokale hardcodede geometrier må
ikke bruges til at få nye providere til at give et tal.

Den særskilte admin-kontrol viser, at uændrede punkter har stabil identitet:
`copernicus_target_identity.py:19–48` bruger part/parent/vandpunkt, ikke
releaseversion eller targettime; DMI udelader også runtime/version i sin
sampling-signatur (`update-dmi-bulk.py:7919–7984`). Almindeligt timeskift er
derfor ikke i sig selv en geometriændring eller grund til at nulstille data.

En reel aktiveret vandpunktsændring ændrer derimod samlet registerbinding og
kan afvise hele tidligere CP-/OM-bank samt DMI-retained-donor. Leaf-salvage
omgår ikke topidentiteten. Det følger den eksisterende strenge kontrakt og
er ikke påvist som årsag til dagens fejl. Kontrolleret migration af uændrede
dele ved fremtidig punktaktivering bør være en særskilt roadmap-afhængighed,
ikke en skjult lempelse i denne rettelse. Et ændret landpunkt kan omvendt
bevare vejrpunktet, men ændre kystretning/statekontekst; vejr- og stategenbrug
skal derfor vurderes separat. Ingen punktændring er en del af arbejdet nu.

## Samlet, afgrænset verifikation før normaldriftsbevis

Brug kontraktscenarier på tværs af grænserne, ikke blot tests for en enkelt
helper. De uafhængige scenarier rapporterer alle fund i samme gennemløb.

- Ældre progress + nyere active-donor; rotation bevares, nyere kvalificeret
  komponent vælges, null eller fejl i anden komponent tømmer intet.
- Først et H0-hul, derefter hullukning og resterende budget: horisont/WAM
  samt DMI-opgradering får arbejde. Fuld OM-dækning er ikke slut på DMI.
- PP1D og MWP i begge filrækkefølger; ukendt gammel wave-proof isoleres
  uden tab af øvrige komponenter. Mål effekt på relevant historik/state.
- Eksakt T+3 i sidste tre offentlige timer; mislykket marine ved gyldig
  vind; ukendt absolutdatum med separat gyldig trend.
- 96-timersgrænsen med forskellige komponentaldre, genhentet samme run,
  dokumenteret nyere reserve og bevarelse uden sammenlignelig erstatning.
- Valgt ny fallback går gennem Python-partition, JS-reader, replay, public
  kilde/vejr og score uden ommærkning eller modstridende dobbelte værdier.
- Warmup fortsætter efter schema-/kodeændring; rollback forbliver lukket.
  Blandede lovlige historiktyper afvises ikke som national modelkonflikt.
- Pages lykkes men complete-svar tabes; alle indgange kan færdiggøre samme
  generation uden ny weather. Ældre saved-target må ikke deploye bagefter.
- Ren public-ompakning fra samme runtime bevarer scores/input/tid og alle
  relevante UI-funktioner. Ny manifest i åben fane, to timeskift, netudfald,
  sen respons og mobil tilbage fra dvale må ikke skabe gamle/nye blandinger.

Ingen af disse scenarier er påstået implementeret eller bestået i denne
analyse. Efter samlet lokal rettelse køres målrettede kontroller og ét
relevant exact-head CI-bevis, ikke genstart af gamle oneoffs. Leveringen
genbruger gemt data, hvor kontrakten faktisk tillader det. Derefter bevises
normal drift på gyldige nødvendige felter, kildefordeling på samme tidsakse,
fortsat state, aktuel browser og afsluttet central/public generation.

## Resterende konkrete afklaringer, ikke en åben testspiral

- Respons-/subsetbundet modelreference for relevante CP/OM-produkter.
- Absolut vandstandsreference og dokumenteret håndtering af sammenligninger.
- Faktisk berørte gamle bølgerækker og tilgængelig original GRIB-evidens.
- Nye produkters konkrete overfladelag/vådcelle/admission og Feggesund-dækning.
- Eksakt migrations-/læserækkefølge og størrelsesmåling på færdige målpakker.

Disse kan undersøges parallelt med den klare persistence-/recovery-/
transportrettelse. De må ikke skjules ved at påstå komplet eller stabil
drift. Målet er stadig fulde gyldige data, ikke blot en grøn installation.

## Afsluttende krydskontrol før levering

Den samlede implementering er efterfølgende ført gennem den afgrænsede
målmatrix. Tre sidste røde resultater var forældede forbrugere af den nye
kontrakt og er lukket samlet:

- den aktive webhåndbog og Markdown-håndbog bruger nu de faktisk genererede
  4.0.430-bundle- og continuation-hashes samt 65/65 filantal;
- code-only-kontrollen beviser nu de fælles observe/restore/persist-led og de
  to eksplicitte source-repair-afgrænsninger i stedet for at tælle fire gamle
  betingelsesgentagelser;
- cutover-readiness kontrollerer den nye afgrænsede tre-timers målte
  warmupreference og ikke den erstattede eksakte tidslighed.

Det ændrer ikke status til produktionsbevist. Exact-head-kildegate, merge,
central genoptagelse, Pages-verifikation og almindelige vejrkørsler udestår.
