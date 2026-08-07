# Aktive krav – samlet register

Denne fil er den operationelle kravoversigt. Detaljer og historik findes i beslutninger, chatkilder og kode.

## Data og prognoser
- **REQ-DATA-001 – AKTIV:** DMI prioriteres; fallback må ikke skabe timevis pendlen.
- **REQ-DATA-002 – AKTIV:** Komponentserier filtreres separat før interpolation og merges på faste UTC-timer.
- **REQ-DATA-003 – IMPLEMENTERET:** Ingen dublerede eller ikke-monotone forecasttider.
- **REQ-DATA-004 – AKTIV:** 118–119 timers realistisk horisont accepteres.
- **REQ-DATA-005 – AKTIV:** Vandstandsspring vurderes efter kilde og tidevandsmønster; reelle Vadehavssvingninger må ikke blindt udglattes.
- **REQ-DATA-006 – AKTIV:** Diagnostik viser kilde, friskhed, horisont og fallback pr. komponent og zone.

## DMI-stationer
- **REQ-STATION-001 – DELVIST:** Alle kendte stationer bevares med DMI-status og datalivscyklus.
- **REQ-STATION-002 – IMPLEMENTERET OG REGRESSIONSSIKRET I 4.0.103:** Vis automatisk primær/sekundær, afstand, vægt og valgmetode pr. zone. Automatikken genberegnes fra aktuelle brugbare vandstandskilder, vælger fortsat topologisk egnede kilder, men interpolerer efter reel geografisk haversineafstand ligesom administratoroverride. Én kompatibel kilde bruges med 100 % vægt. Et gammelt auditresultat må ikke skjule et nyere gyldigt valg.
- **REQ-STATION-003 – IMPLEMENTERET OG REGRESSIONSSIKRET I 4.0.102:** Adminoverride erstatter automatik, når override kan levere efter de valgte krav. Admin viser de faktiske afstandsvægte. Kortet viser kun den aktive routing: grøn ved automatik, rød ved aktivt administratorvalg; grønne markører skjules under override, og lilla “begge valg” er fjernet. Dublerede administratorvalg samles til én kilde med 100 % vægt.
- **REQ-STATION-004 – AKTIV:** Nye stationer, udfald og genoptaget levering udløser meningsfulde notifikationer ved tilstandsændring – ikke spam ved ét manglende tidspunkt.
- **REQ-STATION-005 – IMPLEMENTERET:** Skeln observationsstatus fra prognose-/cachestatus og vis samlet anvendelighed.
- **REQ-STATION-006 – DELVIST:** Vis seneste observation, cache gyldig til, historisk stabilitet og om stationen kan bruges nu.
- **REQ-STATION-007 – AKTIV:** Foreslå bedre station til en zone, men ændr ikke administratorens valg automatisk.
- **REQ-STATION-008 – AKTIV:** Historiske/inaktive stationer markeres tydeligt og kræver ekstra bekræftelse ved override.
- **REQ-STATION-009 – AKTIV:** Stationskortet skal kunne verificeres mod DMI's officielle register.
- **REQ-STATION-010 – IMPLEMENTERET I 4.0.103, AFVENTER PRODUKTIONSBEKRÆFTELSE:** DMI-prognosepunkter opdages via `tidewaterstation`-collectionen. Alle vandstandskilder auditeres med kildetype, discovery-resultat, prognosehorisont, gyldighed og routingberettigelse.

## Retning, zoner og kort
- **REQ-GEO-001 – IMPLEMENTERET:** Strøm er bevægelsesretning; vind er fra-retning.
- **REQ-GEO-002 – AKTIV:** Alle zoners pålandsretning skal kunne auditeres og dokumenteres.
- **REQ-GEO-003 – IMPLEMENTERET:** Als Odde/Helberskov er placeret nord for Mariager Fjord.
- **REQ-GEO-004 – AKTIV:** Hav-/landpunktsfunktionen ændres kun ved en udtrykkelig bestilling; spørgsmål om betydning er ikke implementeringskrav.
- **REQ-GEO-005 – IMPLEMENTERET I 4.0.90:** Kystlinjeeditoren bevarer lokale krumninger, Flyt kort og Præcis redigering. Søgning vælger og viser den matchende zone, og navn/geometri gemmes centralt med readback og anvendes automatisk ved deployment.
- **REQ-GEO-006 – IMPLEMENTERET I 4.0.93:** Administratoren kan omdøbe, ændre kystlinje, ændre land-/havpunkter og retningsankre samt slette zoner. Godkendte ændringer, også en fuld 180° korrektion, må gå til produktion uden håndrettede tests; tests validerer integritet og konsistens frem for gamle værdier.
- **REQ-ADMIN-007 – AKTIV:** Tekniske nødkladder og eksportmellemtrin må ikke være en del af ejerens normale arbejdsgang. De kan bevares internt som fejlsikring; faglige statusser som en endnu ikke aktiv regel må fortsat vises forståeligt.

## RavScore og forklaring
- **REQ-SCORE-001 – AKTIV:** Debug forklarer rådata, kilder, retninger, delscorer, caps, regler og AI.
- **REQ-SCORE-002 – AKTIV:** Statiske kystforhold må kun forstærke dokumenteret dynamisk transport.
- **REQ-SCORE-003 – AKTIV:** Høje eller nabomæssigt usandsynlige scorer flagges til audit.
- **REQ-SCORE-004 – AKTIV:** Scorepræsentation skal være konsistent på kort, bedste områder og femdøgnsvisning.

## Admin, regler og eksperter
- **REQ-ADMIN-001 – AKTIV:** Ikke-teknisk administrator skal kunne forstå hvert felt og dets effekt.
- **REQ-ADMIN-002 – AKTIV:** Regelbygger i trin med livepreview, forklaringsknap, geografiske grupper og konflikttjek.
- **REQ-ADMIN-003 – AKTIV:** Dialoglukning virker via kryds, Annuller, Escape og klik udenfor med advarsel ved ikke-gemte ændringer.
- **REQ-ADMIN-004 – AKTIV:** Prioritet vises som Lav/Normal/Høj/Kritisk med forståelig effekt; internt tal kan bevares.
- **REQ-ADMIN-005 – AKTIV:** Centrale ændringer har versionshistorik og rollback.

## Projektstyring
- **REQ-RDKS-001 – IMPLEMENTERET:** RDKS læses før arbejde og opdateres ved hver ny version.
- **REQ-RDKS-002 – IMPLEMENTERET:** Historiske chats er normaliseret, kronologiseret og sporbare.
- **REQ-RDKS-003 – AKTIV:** Samtalens nye beslutninger og status indarbejdes automatisk ved versionsaflevering.
- **REQ-RDKS-004 – AKTIV:** Håndbogen opdateres ved relevante arkitektur-, data-, score- og adminændringer.
## Release og domæne
- **REQ-RELEASE-001 – IMPLEMENTERET:** En samlet release-gate skal bestå før en ZIP kan erklæres installationsklar.
- **REQ-RELEASE-002 – IMPLEMENTERET:** Releasepakker må ikke indeholde `.git`, secrets, caches eller `node_modules`.
- **REQ-RELEASE-003 – AKTIV:** CI-fejl udløser samlet release-audit og dokumenteret ny pakke – ikke manuelle enkeltlapninger som slutleverance.
- **REQ-RELEASE-004 – IMPLEMENTERET I 4.0.103:** `_support/` og support-ZIP må aldrig indgå i det offentlige GitHub Pages-artifact.
- **REQ-DOMAIN-001 – AKTIV:** RavRadar klargøres til `ravradar.dk` med relative stier, Supabase redirects, HTTPS og kontrolleret canonical-strategi.
- **REQ-HANDBOOK-001 – IMPLEMENTERET:** Håndbogen beskriver grundigt rav-/sedimentprocesser og kortlægger dem til den faktiske scorekode og ekspertregler.

- **REQ-HANDBOOK-002 – IMPLEMENTERET:** Håndbogen skal beskrive rav- og sedimenttransport ekstremt grundigt, herunder alle centrale mekanismer, aktive scoretærskler, usikkerheder, forskningsanalogier og prioriterede ekspertspørgsmål.
- **REQ-HANDBOOK-003 – IMPLEMENTERET:** Ekspertspørgsmål skal have stabile ID'er og være sporbare til kode og evidensklasse.
- **REQ-RELEASE-002 – IMPLEMENTERET:** Release Gate skal stoppe ændringer, hvor centrale scorekonstanter eller fagkapitler ikke længere stemmer med håndbogen.


## 4.0.66 – regressioner, strøm og frisk opstart
- Admin-login skal virke med eksisterende Supabase-opsætning og må aldrig hænge uendeligt.
- Kritiske brugerrejser skal regressionssikres.
- Strømretning skal kunne spores fra rådata til pil og RavScore.
- Spørg RavRadar skal forstå almindelige spørgsmål.
- Forsiden skal starte progressivt uden gamle eller blandede data.

## 4.0.86 – komplette brugerrejser
- **REQ-ADMIN-006 – IMPLEMENTERET:** En funktion er først færdig, når den har en synlig indgang, kan gennemføres og resultatet kan findes igen i den aktive admin.
- **REQ-HANDBOOK-004 – IMPLEMENTERET:** Håndbogsreview har synlig reviewkø, direkte genvej, statusbehandling, central implementering og håndtering af lokale nødkladder.
- **REQ-DIAGNOSTIC-001 – IMPLEMENTERET:** Sitetestens deploykontrol skelner 404, timeout, netværksfejl og øvrige HTTP-fejl.
- **REQ-DIAGNOSTIC-002 – IMPLEMENTERET:** Opstartsprofilen opdeles i netværk/data, beregning og rendering.

- **REQ-ADMIN-008 – IMPLEMENTERET I 4.0.94:** Aktive centrale regler skal automatisk publiceres til én fælles offentlig regelfil. Offentlig RavScore må ikke afhænge af browserens lokale adminlager, og rå adminmellemdata må ikke udstilles på GitHub Pages.

## Vandstandsserier og administratorvalg – bindende regressionkrav
- `null`, `undefined` og tomme DMI-værdier må aldrig normaliseres til fysisk 0 cm.
- En vandstandskilde må kun være routingberettiget, når den indeholder en reel, tilstrækkelig femdøgnsserie.
- Første klik på en vandstandskilde i en zone uden tidligere routing skal straks oprette zonens routingpost, aktivere override, vise valget rødt og gøre det centralt gemmeligt.

## Vandstandsadmin – prioriteret og atomisk initialisering
- **REQ-WATER-ADMIN-INIT-001 – IMPLEMENTERET I 4.0.105:** Vandstandsfanen må først være klikbar, når zoner, vandstandskilder og central routing er indlæst som én sammenhængende tilstand.
- **REQ-WATER-ADMIN-INIT-002 – IMPLEMENTERET I 4.0.105:** Øvrige admin- og diagnosekald må ikke blokere eller senere overskrive brugerens aktive vandstandsrouting.
- **REQ-MAP-ARROWS-ZOOM-001 – AKTIV, IKKE IMPLEMENTERET:** Ved indzoomning skal kortet vise mærkbart flere verificerede vind- og strømpile, når flere faktiske DMI-gitterpunkter findes i udsnittet. Pilene må ikke flyttes eller kunstigt kopieres, og ændringen må ikke påvirke DMI-data eller RavScore.

- Vandstandskortets klik, røde markører og Fjern skal reagere straks, også hvis browserens localStorage er fuld. Central Supabase-lagring må ikke afhænge af lokal cache.

## Tilstandsmodel og læring – 4.0.107+
- **REQ-STATE-001 – IMPLEMENTERET I SKYGGETILSTAND I 4.0.107:** Historikken skal akkumulere faktisk indadgående og udadgående DMI-strøm over tid i stedet for kun at bruge et øjebliksbillede.
- **REQ-STATE-002 – AKTIV:** Den numeriske score skal senere stige gradvist med varigheden og styrken af dokumenteret indadgående strøm; der må ikke indføres et fast universelt krav om 3–5 timer.
- **REQ-STATE-003 – AKTIV:** Efter meget kraftig mobilisering skal roligere forhold og indadgående strøm kunne opbygge potentialet gradvist mod et stærkt niveau omkring et cirka 10-timers forløb, ikke via en hård kontakt.
- **REQ-STATE-004 – AKTIV:** Tidligere indtransport skal kunne skabe et vedvarende nærkystpotentiale, som ikke nulstilles af svage vinddrejninger, men kan nedbrydes af stærk/vedvarende udtransport.
- **REQ-STATE-005 – BINDENDE:** Generelle strømbånd må ikke bruges i score, tilstand eller fallback. Kun faktiske marine data må styre strømtransporten.
- **REQ-RESEARCH-RAVSCORE-001 – PLANLAGT:** Efter afsluttet/klart afgrænset forecaststabilisering og højere P0/P1-opgaver skal RavScore og den samlede fysiske ravkæde gennemgå en kildekritisk forsknings- og modelvalideringsrunde efter DEC-0029. Første fase er score-neutral og uden produktionskode.
- **REQ-RESEARCH-RAVSCORE-002 – BINDENDE FOR DEN PLANLAGTE OPGAVE:** Forskningen skal skelne frigivelse, transport, koncentration/aflejring og jagtbarhed, kortlægge faktisk kode regel for regel og bevare kilder, evidensstyrke, geografisk/tidsmæssig relevans, antagelser og forkastede hypoteser permanent.
- **REQ-RESEARCH-RAVSCORE-003 – BINDENDE STOPREGEL:** Ingen forskningskonklusion må automatisk ændre RavScore, regler, vægte, data eller fallback. Konkrete ændringer kræver efterfølgende særskilt godkendelse, valideringsdesign, regressionanalyse og versionering.
- **REQ-RESEARCH-CURRENT-STRUCTURES-001 – PLANLAGT UDEN PRODUKTIONSMANDAT:** Rumlige strømstrukturer, opstrøms transport, konvergens/divergens og persistente korridorer skal undersøges for selvstændig informationsværdi. REQ-STATE-005 forbliver bindende, indtil stærk evidens og en senere eksplicit beslutning eventuelt erstatter den.
- **REQ-PERFORMANCE-STATE-001 – BINDENDE:** Historik og tilstandsberegning sker i pipeline. Offentlig runtime må kun modtage kompakte afledte felter, og opstart må ikke forringes væsentligt.
- **REQ-MORPHOLOGY-001 – BINDENDE:** Eksisterende dokumenteret morfologi må fortsat påvirke scoren. Manglende data er neutralt, og administratoren pålægges ikke ny landsdækkende manuel kortlægning.
- **REQ-OBSERVATION-ZONE-001 – AKTIV:** En fundrapport skal kræve valg af jagtzonen. GPS bruges som plausibilitetskontrol og må ikke automatisk antages at være jagtstedet, fordi rapporten kan indsendes hjemmefra.

## Historisk model og brugerfund – aktivt
- Den historiske tilstandsmodel skal valideres i skyggetilstand, før den får lov at ændre RavScore.
- Indtransport skal senere påvirke score gradvist efter varighed og styrke; der må ikke indføres en fast generel forsinkelse.
- Brugerfund skal kræve valgt zone; GPS bruges kun til plausibilitetskontrol.
- Projektet skal være kildeneutralt og må ikke indeholde navne på eksterne analysekilder.


## Chat-overlevering og referencevalidering – 4.0.112
- **REQ-HANDOFF-001 – IMPLEMENTERET:** Hver release før en ny projektchat skal bære en selvstændig RDKS-overlevering med læserækkefølge, aktuel baseline, næste plantrin, risici, referencezoner og bindende afgrænsninger.
- **REQ-REFERENCE-001 – IMPLEMENTERET:** Tilstandsmodellen skal kunne valideres automatisk på faste referencezoner uden gentagne manuelle billedserier.
- **REQ-REFERENCE-002 – BINDENDE:** Referencezonerapporten er diagnostik og må ikke i sig selv ændre RavScore.
- **REQ-REFERENCE-003 – BINDENDE:** Als Odde og Helberskov må ikke klassificeres som fjordzone.
- **REQ-SITETEST-DASHBOARD-001 – IMPLEMENTERET:** Sitetesten må først kontrollere samlet-test-knappen efter at dashboardfanen er aktiv og knappen er synlig og klikbar.
- **REQ-SCREENSHOT-001 – BINDENDE:** Ejeren skal kun bedes om nye manuelle screenshots i yderste nødstilfælde, når projekt-ZIP, logs, sitetest og automatisk diagnostik ikke kan afgøre spørgsmålet.

## Workflowcache og produktionsbevis – 4.0.113
- **REQ-DMI-CACHE-PROGRESS-001 – IMPLEMENTERET:** Rå DMI GRIB-cache skal kunne akkumulere fremdrift mellem GitHub-kørsler. Save-nøglen skal være unik, og næste kørsel skal gendanne seneste kompatible cache.
- **REQ-REFERENCE-PRODUCTION-001 – IMPLEMENTERET:** Hver frisk produktion skal logge referencezonernes datasæt-id, strømverifikation og skyggefelter i maskinlæsbart format.
- **REQ-REFERENCE-PRODUCTION-002 – BINDENDE:** Frisk produktion må ikke bestå den strenge referencekontrol, hvis en af de fire zoner mangler en score-neutral skyggetilstand. Nye produktioner skal bruge `shadow-v2`. Manglende verificeret DMI-strøm skal logges som advarsel og må ikke erstattes af generelle strømbånd eller anden transportfallback.
- **REQ-SCHEDULER-MEASURE-001 – AKTIV:** Croninterval må først ændres efter måling af mindst tre kørsler med fungerende progressiv cache.

## Release- og deployrobusthed – 4.0.114
- **REQ-DEPLOY-ISOLATION-001 – IMPLEMENTERET:** Den tunge data-/buildkæde og GitHub Pages-deploy skal være separate jobs. Kun deployjobbet må holde `github-pages`-miljøet og Pages-skriverettighederne.
- **REQ-DEPLOY-RETRY-001 – IMPLEMENTERET:** Et fejlet Pages-deploy skal kunne genkøres som fejlet job mod det eksisterende artifact uden ny DMI-kørsel og uden ny artifact-upload.
- **REQ-RELEASE-PRIORITY-001 – IMPLEMENTERET:** En push- eller udtrykkeligt tvungen releasekørsel må afbryde en ældre almindelig vejropdatering. Almindelige eksterne vejrkald må ikke afbryde den aktive tunge kørsel.
- **REQ-DEPLOY-SCORE-NEUTRAL-001 – BINDENDE:** Workflowrettelser må ikke ændre RavScore, marine audits, DMI-proveniens, skyggetilstand eller offentlig startupberegning.


## Verificeret strømhistorik – 4.0.115
- **REQ-STATE-VERIFIED-CURRENT-001 – IMPLEMENTERET:** Historiske transportfelter må kun bruge prøver med verificeret marin DMI-proveniens.
- **REQ-STATE-ACTIVE-RUN-001 – IMPLEMENTERET:** Akkumuleret 24-timers transport og aktuelt sammenhængende strømforløb skal være separate felter.
- **REQ-STATE-GAP-001 – BINDENDE:** En ikke-verificeret prøve eller et hul over to timer stopper det aktive forløb; manglende data må ikke blive til nulstrøm.
- **REQ-STATE-SCORE-NEUTRAL-002 – BINDENDE:** `shadow-v2` må ikke ændre RavScore eller eksisterende morfologibidrag.


## DMI-vektorintegritet og femdøgns-null-sikkerhed – 4.0.116
- **REQ-DMI-SHARED-VECTOR-GRID-001 – BINDENDE:** U/V-komponenter for strøm og vind må kun kombineres fra samme fysiske DMI-gitterpunkt og samme forecasttid. Ingen fælles kandidat betyder manglende data.
- **REQ-DMI-OLD-VECTOR-INVALIDATION-001 – BINDENDE:** Cachede vektorpar med dokumenteret forskellige gitterpunkter må ikke genbruges som gyldige.
- **REQ-WATER-SOURCE-SAMPLING-001 – BINDENDE:** `SOURCE::`-vandstandskilder må kun samples for DKSS-vandstand og må ikke indgå i dækning/schedulerunderskud for forecastzonernes strøm, vind eller bølger.
- **REQ-MISSING-WEATHER-NULL-001 – BINDENDE:** `null`, tom eller ikke-numerisk vind/bølge er manglende data, ikke 0. UI, score, regler og prognosevalg skal bevare denne forskel.
- **REQ-TRUE-ZERO-WEATHER-001 – BINDENDE:** En eksplicit numerisk 0-værdi fra datakilden er gyldig og må ikke forveksles med manglende data.

## 4.0.117 / Codex-overgang – aktive tværgående krav
- **REQ-RELEASE-NO-SKIPPED-GATES – IMPLEMENTERET OG PRODUKTIONSVERIFICERET I #1772:** Et nyt produktionsartifact/deploy efter reel dataopbygning kræver, at både `npm run validate` og `npm run release:gate` kører og består. Preflight-skip uden build/deploy er bevaret. #1772 beviste begge gates, artifact og deploy som `success` i samme friske kæde.
- **REQ-CODEX-BOOTSTRAP-001 – ERSTATTET:** Den midlertidige pre-Codex undtagelse ophørte med første Codex-workflowrettelse. Historikken bevares, men tillader ikke længere deploy med skipped gates.

- **SYSTEMISK FEJLRETNING – AKTIV:** En fejl må ikke behandles som isoleret fil/test. Hele input→produktion→UI→release-kæden skal vurderes, og seneste fungerende reference skal bruges ved regressioner.
- **STABILITETSBEGREB – AKTIV:** Lokal grøn validering er ikke bevis for CI eller produktion. DMI-/Supabase-/pipelineændringer kræver frisk ekstern verifikation før de betegnes produktionsstabile.
- **CENTRAL ADMIN-GEOMETRI – AKTIV OG PRODUKTIONSVERIFICERET:** Centralt gemte kystlinjer, land-/havpunkter, retninger og øvrige redigerbare zonefelter skal være autoritative og propagere gennem hele produktionskæden. Tests må ikke hardcode historiske adminværdier.
- **DMI U/V VERTIKALLAG – AKTIV KONTRAKT:** Current-U/V må kun parres på samme forecasttid, samme fysiske DMI-gridpunkt og samme vertikallag. Kandidater fra forskellige lag må ikke overskrive eller blandes.
- **FORECAST-EDGE-COVERAGE – AKTIV:** Yderste del af femdøgnshorisonten skal undersøges for `missing` strøm/vandstand/vind/bølge. Manglende data må ikke fyldes med stale værdi eller 0.
- **CODEX-HUKOMMELSE – AKTIV:** `docs/ai/`, RDKS, håndbog, tests, Git-historik og chatarkiv skal vedligeholdes som projektets persistente AI-hukommelse. Væsentlige beslutninger må ikke kun leve i en samtale.
