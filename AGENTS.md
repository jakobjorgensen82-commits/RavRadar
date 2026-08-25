# RavRadar – bindende arbejdsinstruks

Denne fil skal læses før analyse, programmering eller versionsbygning.

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
- Push og manuelle produktionsbyg beholder den tidlige kildekodegate. Planlagte vejropdateringer på den allerede kontrollerede main-kode gentager den ikke.
- Hvert nyt produktionsartifact skal fortsat bestå fuld validering og releasegate efter central hydrering og frisk vejr/proveniens.
- Fuld 210/673-browserkontrol køres ugentligt eller efter relevante ændringer i UI, score eller offentlig datakontrakt. Små afgrænsede ændringer får målrettet kontrol.
- Ingen kontrol må springes over ved en kendt fejl, væsentlig usikkerhed eller konkret modstridende evidens. Se DEC-0045.

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
- Før en kilde-PR køres scripts/validate-source.ps1. Den svarer til GitHubs kildegate og kræver ikke central adminhydrering eller frisk produktionsdata.
- validate:source er aldrig en erstatning for den fulde npm run validate og npm run release:gate, som fortsat skal køre efter central hydrering og frisk vejr før deploy.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
