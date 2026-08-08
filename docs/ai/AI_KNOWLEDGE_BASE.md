# AI Knowledge Base – RavRadar

## 4.0.123 – DKSS-landmasker
Produktionens centralt gemte zonegeometri er bulkjobbets input og kan afvige fra repositoryets historiske datapunkter. Marine U/V-opslag undersøger 64 kandidater ved almindelige kyster og 128 i Limfjorden, men de fysiske afstandsgrænser og kravet om ét fælles U/V-gridpunkt er uændrede. `marineGridSearch.vectorPairs` skelner mellem fejl i strøm og vindhale. De fulde livecacher er vedvarende hydreringstilstand; offentlig browserruntime er fortsat `public-conditions.json`.

## Formål
RavRadar er et dansk kystbeslutningssystem for ravjagt. Systemet producerer en RavScore 0–100 og femdøgns/time-for-time prognoser for kystzoner. Scoren er beslutningsstøtte, ikke en garanti. DMI er den autoritative kilde til de marine og meteorologiske data, som projektet kan hente pålideligt.

Produktets femdøgnsmål skal skelnes fra én models native horisont. En komponentkæde bruger den bedst egnede DMI-kilde til dens sidste valide time, undersøger andre DMI-produkter som forlængelse og anvender først derefter ekstern fallback på den resterende hale. Kæden og skiftetiden fastlægges separat for hver komponent; fallback må ikke skubbe fungerende DMI-data ud. Se DEC-0030.

## Arkitektonisk sandhed
Der findes flere forskellige typer sandhed, som ikke må blandes:
- Git-repository: versioneret kode, tests og dokumentation.
- RDKS: aktuelle krav, beslutninger, status, issues og historik.
- Supabase: centralt gemt administratoropsætning og beskyttede workflows.
- DMI: autoritative vejr-/havdata.
- Genererede caches/public data: afledte snapshots, ikke kravgrundlag.
- Håndbog: faglig og operationel forklaring.
- Chatarkiv: historisk beslutningskontekst.

## Produktionskæde
GitHub-workflowet bygger først/forbereder data og deployer derefter et færdigt Pages-artifact. Tidligt synkroniseres central admin-konfiguration og godkendt zonegeometri. Derefter hydreres eksisterende frisk state, DMI-registre og DMI-bulkdata opdateres efter scheduler/tidsbudget, central weather-cache bygges, strømproveniens tilknyttes, public runtime bygges og valideres, referencezoner kontrolleres, supportpakke genereres og et lean Pages-artifact deployes. `_support` og private adminmellemprodukter må ikke ende offentligt.

Det aktive repositoryinventar består kun af `.github/workflows/update-and-deploy.yml`. `schedule-test.yml` var en historisk schedule-diagnose, og `pages-microtest.yml` var en manuel minimal Pages-diagnose; begge blev fjernet i 4.0.121, fordi ingen aktiv test-, release- eller recoveryprocedure brugte dem, og mikrotesten kunne publicere til produktionens Pages-miljø. `pages-build-deployment` er GitHubs platformsmekanisme og må ikke tælles som en RavRadar-workflowfil. Den eksterne scheduler udløser fortsat produktionsworkflowet via `workflow_dispatch`.

## DMI bulk og vektorer
Aktive bulkfamilier omfatter DKSS-varianter for marine data, WAM for bølger og HARMONIE for vind. Schedulerens prioritet skal bestemmes af faktiske aktive zoners datagab, ikke kun historisk cacheindhold. Marinegrundlag prioriteres højt, fordi faktisk DMI-strøm ikke må erstattes af regionale antagelser.

Strømvektoren er særlig følsom. U og V må ikke vælges uafhængigt fra forskellige steder. Fra 4.0.116 kræves fælles fysisk gridpunkt. 4.0.117 stabiliserede dette yderligere: DKSS leverer current-komponenter i flere vertikallag, så kandidatcache og parring er lag-isoleret. Vektoren kræver samme forecasttid, samme fysiske gridpunkt og samme vertikallag; blandt gyldige fælles lag vælges deterministisk et fælles lag efter den implementerede policy. Parsergeneration 11 tvinger ældre assets gennem den korrigerede logik.

## Zonegeometri og administrator
Zoner er ikke statiske fixtures. Administratoren kan ændre navn, kystlinje, land-/havpunkter, retning og relevante ankre og kan slette zoner. Godkendte centrale ændringer skal anvendes på det autoritative zoneregister før vejrproduktion. Tests må ikke låse historiske navne, koordinater, antal eller retninger.

Ved Codex-overgangen blev dette produktionsverificeret: tre Limfjordszoner havde forkert geometri, blev korrigeret i admin, og den friske #1750-kørsel viste ændringerne i den centrale geometry-sync og førte dem videre til succesfuld weather-cache. Læringen er, at en datamangelsfejl kan skyldes både parser/scheduler og forkerte autoritative koordinater; begge dele skal kontrolleres før kodeændring.

## Vandstandskilder
Vandstandskilder omfatter observationsstationer og prognosepunkter. Observationsstatus og forecast/cache-status er forskellige begreber. En kilde kan fortsat være prognosebrugbar, mens dens gyldige forecastcache består, selv om nye observationer midlertidigt udebliver. Aktiv adminrouting vinder over auto-routing; auto primær/sekundær, afstande, vægte og metode skal være synlige og konsistente gennem score og prognoser.

## RavScore og historisk state
RavScore bruger aktuelle og dokumenterede forhold. Eksisterende pålidelige morfologidata bevares. Den historiske state-model beregnes i pipeline og er fortsat skyggetilstand i 4.0.117; den skal valideres fagligt før nye numeriske scorebidrag aktiveres. Faktisk DMI-strøm er eneste gyldige strømgrundlag for transportstate.

En større kildekritisk forskningsrunde er planlagt som P3, men ikke startet. Den skal senere validere hele kæden fra frigivelse til jagtbarhed, auditere den faktiske scorekode og særskilt undersøge, om rumlige strømstrukturer tilfører information ud over punktvise DMI-vektorer. Indtil en separat, evidensbaseret beslutning eventuelt siger andet, bruges generelle strømbånd fortsat hverken som scoreinput eller fallback. Forskningen har ingen automatisk tilladelse til at ændre RavScore.

## Performance
Public klienten skal starte hurtigt. Store råhistorikker, private audits og tunge beregninger må ikke flyttes til browserstartup. Den historiske målsætning/baseline er ca. 2–3,5 sekunder; tidligere regression mod ca. 13 sekunder er en advarsel om at holde pipelinearbejde server-/buildside.

## 4.0.117 – hvad der blev lært
En serie fejl omkring Limfjorden viste, hvorfor lokal symptomrettelse er farlig. Først blev schedulerens DKSS-rækkefølge korrigeret, derefter blev kandidatsøgningen undersøgt, men den dybere parserårsag var vertikallagsoverskrivning. Samtidig viste administratorens efterfølgende korrektioner, at nogle zoners geometri reelt var forkert. Den endelige arbejdsregel er derfor: undersøg hele kæden og alle autoritative inputs før du konkluderer rodårsag.

## Kendt åben kant ved overgangen
I den friske femdøgnsproduktion kan forecastets yderste timer vise `missing` for strøm/vandstand i enkelte zoner. Det er et dæknings-/horisontproblem, ikke tilladelse til at kopiere sidste værdi eller gøre missing til nul. Det skal undersøges som separat aktiv opgave.

## Lokal snapshot-advarsel ved handoff
Den projekt-ZIP, som Codex-handoffet blev bygget fra, består `npm run validate`, men den lokale `test:current-spatial-audit` rapporterer 12 advarsler om aktive zoner uden dokumenteret current-U/V-gridpunkt i netop det bundne datasnapshot. Det er ikke det samme som en frisk produktionsfejl. Ved overgangen har #1750 højere evidens for de senest korrigerede adminzoner, fordi den kørte efter central geometri-sync med friske data. Codex skal derfor altid sammenligne snapshot-tidspunkt, run-tidspunkt og commit før en warning erklæres aktuel regression.

## 4.0.117 – korrigeret releasehistorik før Codex
Efter den første handoff blev det opdaget, at topniveauet `success` på en almindelig automatisk vejropdatering ikke betyder, at hele release governance er kørt. Workflowet betinger `npm run validate` og `npm run release:gate` af `push` eller `force=true`, mens en almindelig `workflow_dispatch` med reel vejropdatering fortsat kan nå Pages-artifact og deployment. #1760 er et konkret eksempel: DMI bulk, central weather-cache, current provenance, public runtime, referencezoner, `validate:data` og Pages deployment var succes, men de to fulde gates var `skipped`.

Konsekvensen er, at de seneste automatiske grønne runs ikke må bruges som stabilitetsbevis. Den aktuelle 4.0.117-kode er på `main` og er deployet, men handoffet skal betragtes som **ikke fuldt release-verificeret**, indtil Codex har lukket gatehullet og en frisk kørsel har vist `success` på begge fulde gate-trin.

### Første Codex-rettelse
Gatehullet er lukket ved at lade både fuld validering og releasegate følge samme positive preflight-kontrakt som produktionsartifactet. En almindelig `workflow_dispatch` kan derfor ikke længere bygge frisk data og nå artifactet med triggerbetinget skipped gates. Negativ preflight stopper fortsat uden artifact/deploy. #1769 beviste korrekt stop ved rød validate; #1772 produktionsverificerede begge gates, artifact og deploy som `success`.

### Endelig admin-geometri før Codex
Efter #1758 blev yderligere fire zoner gennemgået manuelt og konstateret klart geografisk forkerte: **Fur syd**, **Gjøl og Attrup**, **Aalborg vest og Egholm** samt **Aalborg øst og Nørresundby**. Administratoren rettede deres kystlinje og/eller land-/havpunkter centralt. #1760 blev startet efter disse sidste rettelser og viste, at den efterfølgende DMI/weather/provenance/public/deploy-kæde kunne gennemføres. Da de fulde releasegates var `skipped`, er dette bevis for propagation/deployment, ikke fuld releasegodkendelse.
