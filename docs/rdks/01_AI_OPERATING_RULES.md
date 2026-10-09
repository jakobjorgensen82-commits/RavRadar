# 4.0.555 – DMI-gitterplacering; fortsat isoleret

DMI's officielle FAQ beskriver geografisk fejlplacering af DKSS ved brug af GRIB1's afrundede afstandsfelter og angiver gitterafstand som endepunktsafstand delt med antal punkter minus én. Kilde: https://www.dmi.dk/friedata/dokumentation/faq. Den normale producent beregner nu denne regel fra hver regular_ll/GRIB1-fils egne endepunkter, antal punkter og læserækkefølge. FAQ-eksemplet viser længdegraden; den tilsvarende konstruktion for den regelmæssige breddegradsakse er en eksplicit testet fortolkning, ikke bevis for en uafrundet geografisk oprindelse.

De normale marine opslag og begge batchkald bruger de beregnede koordinater med de oprindelige native elementindeks. Originale værdier, manglende felter, nulværdier, bitmap, kildeprioritet, centrale adminpunkter og scoreformel ændres ikke. Der anvendes ingen numerisk landmaske, hårdkodet modelopløsning, punktflytning i admin eller omskrivning af originalfiler. Andre modeller og GRIB-typer beholder den eksisterende vej. Ufuldstændig geometri stopper med en navngiven fejl; et faktisk opslag uden for gitteret giver fortsat ingen kandidater.

23 lokale måltests af faktisk producentkode består. De omfatter otte GRIB1-læserækkefølger som rent geometriske tests, de normale warm/batchkald med eksplicit kunstige header-/værdisvar, ugyldige headere og bevarelse af uafhængige opslag ved fejl. Dette er ikke native- eller produktionsbevis. Den opdaterede kontrol med den fastlåste rigtige decoder og egne kunstige GRIB-filer er endnu ikke bestået. Den tidligere forventning om at to afrundede aliasindeks skal nås i ét nærområde er erstattet: indeksene får forskellige headerberegnede koordinater og skal faktisk nås i hver sit nærområde. Native-aliasobservationen, strenge nåbarhedskrav, positive/nul-kontroller og afvisning af komponenter fra forskellige indeks bevares; ingen kandidatindsættelse eller skip.

Denne nye kildeevidens erstatter tidligere udsagn om, at endepunktsfortolkningen mangler officiel DMI-støtte. Den frikender ikke Nordsømodellens observerede landpunkter, adminsampling, historisk strøm, strømhukommelse eller RavScore. Parser20/grid9 og gamle kvitteringer kan ikke automatisk attestere den nye fortolkning. Kandidaten forbliver uden merge/aktivering, indtil alle cache-, native/protected/retained-, original-B/S- og SOURCE/T+3-veje har en dokumenteret tabsfri overgang. Gamle originaler og gyldige timer må ikke slettes eller ommærkes. Ingen ny originaldiagnose, vejrhentning, ændret cron, SQL-installation eller deploy følger af dette kildearbejde.


# Isoleret 4.0.555-kandidat – fælles native gitterpunkt; levering fortsat tilbageholdt

Den funktionelle kildekandidat strammer den normale kobling af felter: samme afrundede koordinat er ikke nok. Komponenterne skal også have samme native elementindeks og samme private identitet for hele gittersektionen, inklusive læserækkefølge. Den offentlige tredelte gitteridentitet ændres ikke, og den private kontrolmarkør må ikke lagres i offentlig eller privat gridPoints-/source-proveniens. Gyldige fælles punkter og nulværdier bevares; samme krav gælder strøm, vind og valgfri bølgeretning gennem de normale fælles kald.

De 12 afgrænsede tests af de faktisk udtrukne producentfunktioner består. Fem eksisterende syntetiske fixtures er opdateret uden svækkede assertions; schedulerens eksisterende Node/Python-kalder består. Nye mål nås én gang gennem den eksisterende sourcegruppe; der er stadig 47 kommandoer. Den eksisterende PR-nativeprøve omfatter nu egne kunstige GRIB-filer med den rigtige, uændrede, fastlåste decoder. Denne nativeprøve og den præcise nye GitHub-sourcegate er endnu ikke bestået. Manglende faktisk native nåbarhed skal give fejl, aldrig en indsat kandidat eller et skip. Workflowinventar og rækkefølge er måltestet efter registrering af det allerede eksisterende, skrivebeskyttede diagnoseworkflow; ingen ny dispatch følger heraf.

Kandidaten må ikke merges eller aktiveres, før cache-/historikovergangen er dokumenteret tabsfri og sandfærdig. Gamle processed-step-kvitteringer, retained/native/protected rækker, cacheklar-genvejen, strømhukommelse og SOURCE inklusive T+3 kan ikke frikendes af en ny parsingtest. Parser20/grid9 og den snævert auditerede decoderkompatibilitet er derfor endnu uændrede; det er et åbent aktiveringskrav, ikke bevis for sikker genbrug. Ingen gammel provenance ommærkes, gyldig historik slettes ikke, og et simpelt versionsbump er ikke en fuld overgang. Den fysiske koordinatfortolkning er fortsat åben; denne koblingsrettelse retter ikke automatisk placering, adminmål eller scorer.

4.0.554 er nu faktisk leveret: PR #544 blev kontrolleret på præcis head og merged som 232640149b3a74674e42618465026c65d05eee81. Det normale, providerfri deploy 37955527084 afsluttede med faktisk privat gemning/publicering, Edge, Pages, offentlig 210/673-kontrol og terminalbevis den 9. oktober kl. 18.07 dansk tid. Browseren viste 4.0.554 og ét korrekt kontrolleret score-/fundsvar. Det beviser ikke fungerende ekstern AI, en ny vejrgeneration eller hele revisionens afslutning. Tidligere afsnit, der kalder 4.0.553/554 lokale, er nu historik og erstattes af denne leveringsstatus.

Parallelle, isolerede lokale rettelser er frosset: brugerdataeksport afviser gamle svar efter nyt login, også til samme konto; den tyske assistent undgår et falsk farvematch inde i et andet ord. De er ikke kopieret til denne kandidat, installeret eller offentligt leveret. Begge aktuelle vejrbundles er uændrede. Bindingsadskillelsen og særskilte destinationstilladelser forbliver i bero; den store revision er isoleret/inaktiv. Ingen ekstra originaldiagnose, manuel vejrhentning, annullering, ændret cron, punkt-/geometriændring, kildeprioritetsændring eller scoreformelændring er godkendt af denne kandidat.

Restarbejdet omfatter fortsat Fur/no-loss, syvzonernes vandstandsundtagelse uden dkss_lf-strøm/temperatur, processtop/eksklusiv skrivning, original-B/S-før-T, timeout/afbrydelse/runner-tab, fejlworkerens fireminuttersgrænse, faktisk national kapacitet, holdbar brugerdata, bred Spørg RavRadar og dokumenteret drift uden Codex omkring 21. oktober. Lokale tests og grøn overvågning er ikke færdiggørelse. Samtaledeltaet er indarbejdet her og i begge håndbøger; detaljeret privat diagnostik bliver i checkpointet.

# AI operating rules

## Før arbejdet
- Læs `AGENTS.md`, `00_READ_FIRST.md`, `90_INDEX/CURRENT_TRUTH.md` og `90_INDEX/IMPLEMENTATION_STATUS.md`.
- Find relevante aktive beslutninger, krav, features og issues.
- Kontroller om koden allerede har en nyere løsning end den historiske kilde.

## Under chatimport
- Registrer kilde, omtrentligt tidspunkt, teksthash og kronologisk placering.
- Klassificer udsagn som aktuelt, implementeret, planlagt, erstattet, forkastet, forældet eller uklart.
- Skeln mellem et stadig gyldigt mål og en forældet teknisk løsning.
- Implementer aldrig alene på baggrund af en gammel chat.

## Ved hver ny version – uden brugerens påmindelse
- Udtræk samtaledeltaet siden seneste projekt-ZIP: beslutninger, krav, fejl, afklaringer, forkastelser og læring.
- Opdater `MASTER_LOG.md`, aktive krav, status, issues og `CURRENT_TRUTH.md` efter behov.
- Opdater håndbogen, når arkitektur, data, score, admin, AI, drift eller faglig forståelse ændres.
- Opdater changelog.
- Bevar kildesporbarhed og markér erstattede løsninger; overskriv ikke historien.
- Kør `npm run validate:rdks` og relevante tests.

## Nye Supabase-tabeller
- Nye tabeller i `public`, som RavRadar skal bruge via Data API, skal
  få eksplicitte og mindst mulige grants for de nødvendige roller i
  samme migration. Giv aldrig automatisk `anon` skriveadgang eller
  brede grants for at omgå en permission denied-fejl. Eksisterende
  tabellers adgang ændres kun efter særskilt funktionel vurdering.

## Konflikter
Stop og forklar konflikten før kodeændring, hvis et nyt ønske strider mod en aktiv beslutning. Aktuel brugerbeslutning kan ændre RDKS, men ændringen skal registreres med begrundelse.
## Bindende release-gate
- Før ændringen implementeres, identificér de eksisterende funktioner i det berørte UI-, data- og adminforløb. Efter ændringen kontrolleres samme funktionsflade igen. En grøn ny featuretest er ikke nok, hvis en ældre funktion kan være forsvundet.
- Fjern kun en eksisterende funktion efter en udtrykkelig aktuel ejerbeslutning. Afgræns fjernelsen til det bestilte: at fjerne en offentlig formular giver eksempelvis ikke i sig selv tilladelse til at slette den bagvedliggende observations-, tur- eller adminfunktion.
- Skriv aldrig, at en ZIP er færdigvalideret, medmindre de angivne kommandoer faktisk er kørt på præcis det pakkede indhold.
- Kør den releasegate, som ændringen kræver. Normal frisk produktion følger DEC-0184s 52 artifactkontroller og tre version-/modelbindingskontroller; efter DEC-0193 køres og rapporteres de uafhængige driftskontroller uden alene at blokere ellers gyldige friske prognoser. Target/main, privat state, artifact, privacy og deploy forbliver hårde. Fuld historisk validate/releasegate bruges målrettet eller periodisk, ikke automatisk efter hver vejrindsamling.
- Lever aldrig `.git`, secrets, caches eller `node_modules` i en brugerpakke.
- Skeln tydeligt mellem lokalt beståede tests og en faktisk grøn GitHub Actions-kørsel; påstå ikke CI-success uden bevis.
- Bevar eksisterende GitHub-secrets og Supabase-installation. En filopdatering må ikke kræve genoprettelse af secrets, medmindre navne eller backend faktisk ændres.

## End-to-end konsekvensanalyse
Før en RavRadar-ændring implementeres, skal hele runtime- og releasekæden analyseres: input, scheduler, tidsbudget, cache, datagenerering, score, tests, artifact, deploy og browser. En lokal rettelse må ikke frigives, før gamle antagelser og alternative fejlgrene er gennemgået.

## Stabilitetsniveauer og frisk evidens – 4.0.117
- Brug ordene lokalt valideret, CI-valideret og produktionsverificeret præcist.
- En pipelineændring er ikke produktionsverificeret før en frisk kørsel med de berørte eksterne data/centrale konfigurationer er gennemført og kontrolleret.
- Ved nye failures skal loggen fra den aktuelle run læses før en ældre supportpakke bruges som rodårsagsbevis.
- Hvis administratoren har ændret geometri/routing/regler, skal den centrale sync og propagation kontrolleres før kode ændres.

## Codex-start
Codex skal begynde i `docs/ai/CODEX_START_HERE.md`. AI-dokumentationspakken kondenserer den aktuelle arbejdsviden, men RDKS og faktisk kode er fortsat autoritative.

## Skift til ny chat
Når ejeren siger, at arbejdet skal fortsætte i en ny chat, stopper Codex det aktive featurearbejde ved en sikker grænse. Før chatten afsluttes skal Codex:
- synkronisere RDKS, roadmap, kendte issues og relevante håndbogsafsnit med den faktiske status;
- skrive eller opdatere `docs/ai/CURRENT_SESSION_HANDOFF.md` med ændringer, evidens, afviste løsninger, tests, mangler, worktree-/branchstatus, næste konkrete trin og anbefalet model;
- validere checkpointets dokumentation så langt den aktuelle tilstand tillader;
- og give ejeren en færdig besked, som kan indsættes i den nye chat.

En halvfærdig version må ikke fremstilles som releaseklar. Ucommittede filer, manglende gates og eksterne artifacts skal nævnes eksplicit.

## Modelvalg og ugentlig kvote – DEC-0031
- Før hvert væsentligt arbejdsafsnit vurderer assistenten nødvendig ræsonneringsdybde, kodebasebredde, fejlkonsekvens og påvirkning af faglig model, RavScore, data, DMI/fallback, arkitektur og produktion.
- Samme vurdering skal ende i en konkret anbefaling af brugerfladens **Indsats**. Assistenten minder ejeren om indstillingen ved hvert nyt arbejdsafsnit og stopper før kritisk hovedarbejde, hvis indsatsen skal hæves. `Let` bruges kun til simple tekstrettelser, status og helt mekaniske opgaver; `Høj` er normal RavRadar-udvikling; `Ekstra høj` er standard for geometri, land-/vandpunkter, DMI, RavScore, ukendt rodårsag, tværgående regressioner og kritisk slutkontrol; `Ultra` bruges kun til de vanskeligste kvalitet-først-analyser, hvor den ekstra tid og kvote er fagligt begrundet.
- GPT-5.6 Sol er standard ved kritisk eller uklar analyse, forskning, komplekse regressioner, arkitektur, produktionskritisk datalogik og større slutvalidering. Ved tvivl vælges kvalitet/Sol.
- Hvis en billigere aktuelt tilgængelig model kan levere samme nødvendige kvalitet, stopper assistenten før hovedarbejdet, anbefaler modellen og forklarer kort hvorfor. Efter et sådant skift er assistenten ansvarlig for at stoppe igen og anbefale Sol, før kritisk arbejde fortsætter.
- Rutinearbejde må ikke automatisk bruge Sol af bekvemmelighed. En tilladt arbejdsdeling er Sol til analyse/design, billigere model til klart specificeret mekanik og Sol til kritisk integration/review; den vurderes konkret og er ikke en tvungen skabelon.
- En kvotegrænse må aldrig sænke analyse-, forsknings-, test- eller valideringskrav. Ved pause opdateres et permanent checkpoint med udført arbejde, evidens, konklusioner, åbne og afviste hypoteser, ændringer, tests, mangler, næste konkrete trin og anbefalet model.
- Den planlagte videnskabelige RavRadar-/RavScore-analyse kræver som udgangspunkt Sol til centrale synteser, evidenskonflikter, hypoteser, scorebeslutninger og endelig vurdering.

## Permanent PR- og mergeautoritet - 2026-08-20
- Codex må oprette og opdatere korte Pull Requests fra RavRadar-branches, som Codex selv har pushet.
- PR-tekst skal være datasikker og må ikke indeholde secrets, credentials, private produktionsdata, komplette diagnostikpayloads, U/V-værdier eller andre følsomme oplysninger.
- Codex må selv merge en sådan PR til `main` uden særskilt ejergodkendelse, når alle relevante tests og release-gates er bestået, ingen kendt kritisk fejl er ignoreret, systemiske konsekvenser og nødvendige regressioner er vurderet, dataintegritet og produktionskontrakter er bevaret, og krævet RDKS-/AI-/håndbogs-/changelogdokumentation er opdateret.
- Grøn GitHub-topstatus er ikke i sig selv mergebevis ved konkret modstridende evidens. Røde eller uafklarede gates må ikke omgås. Ved reel fejl eller væsentlig usikkerhed skal Codex undersøge eller rette før merge.
- Efter sikker merge følger Codex den efterfølgende produktions-/deploykørsel, verificerer at korrekt commit er i produktion, kontrollerer relevante produktionsresultater og fortsætter direkte til næste ikke-blokerede roadmap-punkt.
- Irreversible, destruktive, usædvanligt risikable merges eller beslutninger uden for allerede godkendte RavRadar-krav kræver fortsat ejerens udtrykkelige godkendelse.

## Lokal Codex-klargøring og kildekontrol
- På en frisk Windows/Codex-runtime køres scripts/setup-codex.ps1 én gang. Scriptet installerer projektets tre eksisterende Python-afhængighedssæt og ændrer ikke repositorydata.
- Under udvikling køres målrettede tests. Den fulde validate:source skal bestå på PR'ens eksakte head i GitHub og gentages kun lokalt ved bred risiko, manglende CI eller konkret fejlevidens.
- Push og manuelle produktionsbyg beholder den tidlige kildekodegate. Planlagte vejropdateringer på samme allerede kontrollerede main-kode må springe denne gentagelse over.
- validate:source erstatter aldrig den fulde npm run validate og npm run release:gate efter central hydrering og frisk vejr; begge er fortsat obligatoriske før hvert nyt deploybart artifact.
- Fuld 210/673-browserkontrol er hændelsesstyret: ugentligt eller ved ændret UI, score eller offentlig datakontrakt. Se DEC-0045.
- Midlertidige runtime-shims skrives kun i systemets temp-mappe og må ikke stages.
