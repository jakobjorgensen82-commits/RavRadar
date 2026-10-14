# RavRadar – bindende arbejdsinstruks

Denne fil skal læses før analyse, programmering eller versionsbygning.

## Aktuel kritisk grænse — strømhistorik og genoptagelse, 14. oktober 2026

Aktuelt 15. oktober: PR610 er kildeleveret efter præcis CI inklusive Linux og PostgreSQL. Den næste genoptagelse stoppede før vejrhentning på miljøtimens Z/.000Z-format. Den normale 673-dels CLI-prøve har reproduceret fejlen og består efter en snæver miljønormalisering, inklusive fem ugyldige input og originalbevarelse. Den lille kildegate består lokalt; ny præcis CI, levering og offentlig effekt er åbne. Tilstands- og originalkrav, version, SQL, model og SOURCE-afgrænsning er uændrede. Se håndbog 89.230; ældre status nedenfor er erstattet kun på disse punkter.

Den tidligere PUBLIC-sammeoriginalrettelse og præcise fulde fremskridtsvalg er kildeleveret efter faktisk Linux-/PostgreSQL-kontrol. Den efterfølgende normale vejrhentning stoppede imidlertid i kystdelens strømhistorik, før nogen ny offentlig generation blev leveret. Det nye stop er ikke den tidligere PUBLIC-kalder. Streng kontrol ved faktisk ny strømbrug består; tilgængeligheden af de nødvendige historiske råfiler er endnu ukendt.

Den lokale normale kystdelshistorik-/behovsprøve består med 70 prøver uden skip. Historikplanen følger den faktisk valgte tilstand og historiske strømendepunkter og normal bro, ikke et fast vægursvindue. Ægte kildeledger, reservekomplement, originaler og alle no-loss-grænser skal bevares. Den strøm-only historiske cachelæsnings kilde har nu første faktisk beståede Linux-nativekontrol på ca827; samlet source og PostgreSQL er fortsat åbne. Nyt samlet kildebevis, sikker levering, kapacitet, ny offentlig effekt og alle fem mål med frist 18. oktober er åbne. Se håndbog 89.230. Ældre fronter er kun erstattet på disse præcise statuspunkter.

Den historiske strøm-only cachelæser har nu sin første faktisk beståede Linux-nativekontrol på PR610-head ca8273d58fb37 i CI 38644100696/1. Den normale native-wrapper og alle syv obligatoriske native-underprøver er gennemført, herunder ejet læselease, procesafslutning, EOF, tilbagerulning og historisk genbrug. Den regionale normale prøve og den nationale producentkæde består lokalt med 673 dele og 118 timer gennem CLI til JavaScript. De tilknyttede lokale Open-Meteo- og kontrolprøver består efter præcis rettelse af prøveinput-headeren for otte mål; de oprindelige fejl bevares. Det er lokale/syntetiske input, ikke bevis for providerdata, national produktionsdrift eller hård databevarelse i næste faktiske generation. Den private 72-timers-/51-timersbehovsbro mapper højst 127 rækker med højst to eksisterende 121-timersvinduer. Tre private slutstøttetimer bevares til den uændrede scalar-T+3-sanitizer; offentlige 118 timer og det normale 121-timersunderlag ændres ikke. Den normale lokale 673-dels CLIprøve består også med nøgleomordnet input og eksklusiv outputoprettelse. Status 15. oktober: Den samlede source-kontrol i samme CI fejlede i fem kontroller; De efterfølgende trin 15–19, herunder PostgreSQL-kontrollen, blev derfor ikke kørt. De afgrænsede lokale kildekompatibilitetsrettelser bevarer ægte gamle kildepins, updaterens fulde historiske kildeinverse og alle gamle model-/SQL-/ABI-grænser. Den normale updater-indgangsprøve består lokalt 21/21 uden skip; første værtsfejl er bevaret, og ingen produktguard er lempet. Ny samlet CI på det rettede præcise head, PostgreSQL, sourceproof og sikker offentlig levering er fortsat åbne; det første native-PASS er ikke samlet CI- eller produktionsbevis.

## Aktuel kritisk afgrænsning — 14. oktober 2026

PR #606 er kildeleveret, men den efterfølgende normale vejrhentning stoppede ved faktisk strømbrug før offentlig levering. Bevar den strenge strømguard. Den snævre PUBLIC-rettelse må kun prioritere en kvalificeret genfortolkning af de samme hele originalbytes for alle faktiske endepunkter; den normale zonemap er autoritet, ikke manglende zonefelter i en part-række. Historisk replay, gyldige originaler og almindelig kildeprioritet bevares. Præcist krypteret fremskridtsgenbrug i det fulde normalforløb kræver stadig faktisk GCM-restore, autentisk baseline/admission og uændrede budgetter/original-/ny-time-gates. Lokale mål er nu bestået efter faktisk afklaring af sandboxens filgrænse; Linux/Bash, præcis CI og produktion er særskilt åbne. Se håndbog 89.229 og privat checkpoint. Alle fem mål er åbne med frist 18. oktober; de eksisterende tilladelses- og writer-grænser består.

## Obligatorisk rækkefølge
1. Læs `docs/ai/CODEX_START_HERE.md` og derefter `docs/rdks/00_READ_FIRST.md`, `01_AI_OPERATING_RULES.md`, `90_INDEX/CURRENT_TRUTH.md` og `90_INDEX/IMPLEMENTATION_STATUS.md`.
2. Læs relevante aktive krav, beslutninger og kendte issues.
3. Læs relevante håndbogsafsnit og verificér dem mod aktuel kode.
4. Sammenhold nye ønsker og gamle chats med nyere beslutninger og faktisk kodeadfærd.
5. Gamle chats er historiske kilder. De giver aldrig i sig selv tilladelse til kodeændringer.

## Automatisk versionspligt
Ved enhver ny version skal assistenten uden særskilt påmindelse:
- indarbejde samtaledeltaet siden seneste ZIP i RDKS,
- opdatere implementeringsstatus og åbne issues,
- opdatere changelog,
- opdatere relevante dele af både Markdown-håndbogen og webhåndbogen,
- markere hvad der er erstattet, forkastet eller fortsat uklart,
- og køre RDKS-validering samt relevante tests.

Ejeren har stående godkendt, at topversionsfeltet i `data/kystdata.json` og `data/zones.geojson` automatisk følger den reelle releaseversion. Codex skal derfor ikke bede om en ny særskilt godkendelse til en ren versionsfeltsynkronisering. Før commit skal en særskilt diff bevise, at kun versionsfeltet er ændret; enhver anden ændring af geodata, zoner, geometri eller land-/vandpunkter falder uden for godkendelsen og skal stoppe releasen.

En version må ikke afleveres, hvis projektets hukommelse stadig beskriver en tidligere version eller mangler væsentlige beslutninger fra den aktuelle samtale.

Ved konflikt gælder: brugerens aktuelle instruktion > aktiv RDKS-beslutning > verificeret aktuel kodeadfærd > håndbog > changelog > gamle chats.

## Omkostningsbevidst testmatrix
- Under udvikling køres kun målrettede tests for den berørte kontrakt samt nødvendige versions- og RDKS-kontroller.
- Den fulde validate:source skal bestå én gang på PR'ens eksakte head i GitHub. Lokal gentagelse er kun nødvendig ved bred/tværgående risiko, manglende CI eller konkret fejlevidens.
- Almindelige rettelser deployes efter DEC-0148 som kode-only med eksakt genbrug af senest gyldige data og uden ekstern vejrhentning. Normal vejrhentning følger som et særskilt, tidsbegrænset forløb.
- Den tidlige kildekodegate køres på ny eller uverificeret main-kode. Vejropdateringer, også cron-/watchdog-dispatch og manuelle genkørsler, må genbruge et live-verificeret grønt source-step på præcis samme main-commit. Senere fejl, ændret run-attempt eller ukendt evidens kræver ny kontrol; en cachemarkør alene er aldrig bevis. Se DEC-0045's tillæg 2026-09-04.
- Hvert artifact med frisk produktionsdata skal efter DEC-0184 køre den faste 52-blads artifactgate, tre version-/modelbindingskontroller og de selvstændige runtime-, Supabase-, checkpoint-, privacy-, artifact- og deploytrin. Efter DEC-0193 samles fund i de uafhængige normale driftskontroller uden alene at blokere ellers gyldige friske prognoser; hårde target-/main-, private-state-, artifact-, privacy- og deploygrænser består. De øvrige fulde/historiske suites køres målrettet eller periodisk, ikke efter hver vejrindsamling. Et kode-only artifact følger fortsat DEC-0148.
- Fuld 210/673-browserkontrol køres ugentligt eller efter relevante ændringer i UI, score eller offentlig datakontrakt. Små afgrænsede ændringer får målrettet kontrol.
- En kendt fejl eller konkret modstridende evidens i den berørte produktionsflade kræver målrettet kontrol og må ikke skjules. En forældet eller historisk test uden betydning for artifactet registreres og rettes uden at blokere normal produktion. Se DEC-0184.

## Codex og systemisk arbejdsmodel
- `docs/ai/CODEX_START_HERE.md` er obligatorisk indgang for Codex.
- Tænk hele brættet: en fejl i én test/zone er et symptom, indtil input, central admin-konfiguration, scheduler, cache, DMI/GRIB, provenance, score/state, public runtime, UI, tests og deployment er gennemgået.
- Kald aldrig en baseline stabil på baggrund af lokal validering alene, når ændringen afhænger af DMI, Supabase eller produktionspipeline.
- Administratorens centralt gemte redigerbare data er runtime-sandhed og må ikke erstattes af historiske hardcodede værdier.

## Bindende model- og kvotestyring
- Kvalitet kommer før kvotebesparelse. Før hvert væsentligt arbejdsafsnit vurderer Codex ræsonneringsbehov, kodebasebredde, fejlkonsekvens og påvirkning af RavScore, faglig model, DMI/fallback, dataintegritet, arkitektur og produktion.
- Før hvert nyt arbejdsafsnit skal Codex også vurdere og tydeligt anbefale den nødvendige **Indsats** i brugerfladen. Hvis den aktuelle indsats er for lav, skal Codex bede ejeren skifte før det kritiske arbejde starter. `Let` er kun til simple tekstrettelser, status og helt mekaniske opgaver; `Høj` er normal RavRadar-udvikling; `Ekstra høj` kræves som udgangspunkt til kystgeometri, land-/vandpunkter, DMI, RavScore, ukendt rodårsag, systemiske regressioner og slutvalidering; `Ultra` reserveres til de vanskeligste kvalitet-først-analyser, hvor merforbruget er begrundet.
- GPT-5.6 Sol bruges som udgangspunkt til kritisk analyse, ukendt rodårsag, forskning, RavScore/fysisk model, komplekse regressioner, arkitektur, DMI-/forecast-/cache-/fallbacklogik og endelig validering af større ændringer.
- Når en aktuelt tilgængelig billigere model kan levere samme nødvendige kvalitet, skal Codex stoppe før hovedarbejdet, anbefale den konkrete model og kort begrunde valget. Codex skal tilsvarende stoppe og bede om skift tilbage til Sol, før næste kritiske del.
- Ved reel tvivl vælges Sol. Kvoteudløb må aldrig medføre, at analyse, forskning, tests eller validering springes over.
- Ved kvotepause skrives et permanent checkpoint med evidens, konklusioner, afviste/åbne hypoteser, ændringer, tests, resterende arbejde, næste trin og anbefalet model.
- Den planlagte videnskabelige RavRadar-/RavScore-analyse udføres som udgangspunkt med Sol. Billigere modeller må kun udføre afgrænsede støtte- eller rutineopgaver uden kvalitetsrisiko. Se DEC-0031.

## Midlertidig Codex-overgangstilstand 2026-08-07
- Dette afsnit beskriver den historiske 4.0.117-overgang. Kravet om fuld validate/releasegate efter hver vejrbygning er supersederet af DEC-0184; kravet om reelle data-, privacy-, artifact- og deploygates består.
- Den nuværende 4.0.117-handoff er en **bootstrap til Codex**, ikke en ny dokumenteret stabil release.
- GitHub-workflowet har en kendt alvorlig gate-fejl: almindelige `workflow_dispatch`-vejropdateringer kan bygge og deploye, selv om `npm run validate` og `npm run release:gate` springes over. Et grønt automatisk run er derfor ikke i sig selv releasebevis.
- **Første kodeopgave i Codex:** ret workflowet, så ethvert nyt produktionsartifact/deploy, der bygger frisk produktionsdata, ikke kan passere uden de relevante fulde gates. Bevar muligheden for billigt preflight-skip, når der slet ikke bygges/deployes nyt artifact.
- Første strenge post-fix-kørsel skal bruge den aktuelle `main`-kode og den senest centralt gemte admin-geometri. Først når den fulde kæde inkl. `npm run validate` og `npm run release:gate` faktisk har kørt og er grøn, må baselinen kaldes stabil/produktionsverificeret.
- Denne overgangspakke må **ikke** selv ændre de eksisterende workflow-gatebetingelser; det er bevidst udskudt til den første Codex-session, så Codex kan ændre, teste, committe og verificere rettelsen direkte i repositoryet.

## Permanent PR- og mergeautoritet
- Codex må oprette og opdatere korte, datasikre Pull Requests fra RavRadar-branches, som Codex selv har pushet.
- Codex må merge disse PR'er til `main` uden særskilt ejergodkendelse, men kun efter selvstændig verifikation af alle relevante tests, release-gates, regressioner, dataintegritetskrav, produktionskontrakter og nødvendig RDKS-/håndbogs-/changelogdokumentation.
- En grøn GitHub-status er aldrig tilstrækkelig, hvis konkret evidens viser en fejl eller væsentlig usikkerhed. Røde eller uafklarede gates må ikke omgås; fejlen skal undersøges eller rettes før merge.
- PR-tekst og commits må ikke indeholde secrets, credentials, private produktionsdata, komplette diagnostikpayloads, U/V-værdier eller andre følsomme oplysninger.
- Efter en sikker merge skal Codex følge deployet, verificere den mergede commit og relevante produktionsresultater og fortsætte til næste ikke-blokerede roadmap-punkt.
- Irreversible, usædvanligt risikable eller destruktive merges samt beslutninger uden for allerede godkendte RavRadar-krav kræver fortsat ejerens udtrykkelige godkendelse.

## Lokal Codex-klargøring og kildekontrol
- På en frisk Windows/Codex-runtime køres scripts/setup-codex.ps1 én gang. Scriptet installerer projektets tre eksisterende Python-afhængighedssæt og ændrer ikke repositorydata.
- Før en kilde-PR køres den lille produktkritiske sourcegate målrettet. Den kræver ikke central adminhydrering eller frisk produktionsdata.
- Sourcegaten erstatter ikke DEC-0184s post-data artifact-, modelbinding-, runtime-, privacy-, Supabase- og deploybevis. Den fulde validate/releasegate bevares til målrettet eller periodisk brug. Kode-only rettelsesdeploy følger DEC-0148 og beviser eksakt genbrug og artifactintegritet.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
