# Aktuelt sessionshandoff – 2026-08-14

## Nyeste sikre grænse – 4.0.206 produktions- og privatverificeret

- 4.0.206 på commit `4dc464a` er produktionsverificeret i #31831068809 med genbrugt progressiv DMI-cache, to færdiggjorte modelsamlinger, frisk vejr, fuld validering, releasegate, Supabase, artifact og Pages-deploy. Live Pages viser 4.0.206, 210 zoner og alle tre Vadehavszoner.
- Privat #31829349458 bestod hele den friske nationale kæde gennem 835 foreløbige dele, kandidatbundne land-/vandbeviser, alle DMI-/vejr-/state-/vind-/shadowtrin, ejerrettelser, slutkyst/-punkter, central create/read/update/delete/rollback og den rettede 17-dels fallback med nul overlap, native DMI og artifacts.
- ESA WorldCover 10 m-resultatet er fortsat 11 verificerede, fire sikkert vendte og to blokerede fallbackdele. De to blokerede forbliver fail-closed.
- Ingen privat geometri blev aktiveret. Næste geografiske skridt er en særskilt ejerafgørelse på baggrund af det private artifact; indtil da forbliver den produktionsverificerede offentlige geometri urørt.

## Nyeste sikre grænse – 4.0.205-kandidat

- Offentlig 4.0.204 er produktionsverificeret i #31815039302 og forbliver urørt baseline.
- Privat #31815423082 bestod hele 835-dels kilde-, geometri-, punkt-, DMI-, state-, vind-, shadow- og reviewkæden. Den stoppede alene ved første centrale læsning af `direction-reviews` med HTTP 401 / `PGRST303`; reviewet tæller 667 komplette, to deldækkede og 166 blokerede dele.
- Supabase-loggen viser korrekt `sb_secret_`-nøgletype/fingeraftryk og senere vellykkede anmodninger med samme nøgle. 4.0.205 genprøver kun denne eksakte gatewayfejl én gang. Andre eller gentagne auth-fejl stopper fortsat.
- Beskyttet manifestsync er gjort fail-closed, så en læsefejl ikke kan udløse unødvendige skrivninger. Ny målrettet workflow genbruger #31815423082-artifactet uden DMI eller deploy.
- Næste rækkefølge: lokale fulde gates, commit/push, målrettet roundtrip, normal produktionsverifikation af 4.0.205 og ny fuld privat national slutkørsel. Privat aktivering kræver fortsat særskilt ejerbeslutning.
- Alle ældre “næste trin” nedenfor er historiske, når de strider mod dette checkpoint.

## Tidligere sikre grænse – 4.0.204-kandidat

- Den tidligere DEC-0036-stopregel er erstattet af ejerens udtrykkelige mandat til at fortsætte den landsdækkende private kyst- og land-/vandaudit. Privat arbejde må fortsætte systemisk; offentlig aktivering kræver stadig særskilt go/no-go.
- Offentlig 4.0.203 er produktionsverificeret i #31811492510. Privat #31812035188 bestod kilde, topologi, dele og navne, men stoppede ved første eksakte bevis, fordi 4.0.203-beviset var lavet efter 107 historiske korrektioner og derfor ikke matchede den rå kandidat.
- 4.0.204 bruger et nyt råt første ESA WorldCover 10 m-bevis: 835 dele, 149 rettelser og 166 blokerede. Slutbeviset matcher fortsat den rå GitHub-fil med 652 dele, 111 rettelser og 114 blokerede; fallback matcher 17 dele, fire rettelser og to blokerede. SHA-256 og delantal skal matche præcis ukorrigeret input.
- Tvetydige dele har ingen aktive punkter og kan ikke få vejr, state, score eller aktivering. Fejø/Femø og Havnø/Mariager Fjord øst forbliver slettet i fallbackbygger og validator.
- RDKS, håndbog, changelog og version 4.0.204 skal være grønne før commit/push. Derefter følges både normal release og ny privat national kørsel helt til slut.
- Alle ældre scope-, delantal- og “næste trin”-afsnit nedenfor er historisk spor, når de strider mod dette checkpoint.

## Historisk scope fra 2026-08-12 – erstattet af checkpointet ovenfor

DEC-0036 afgrænsede dette daværende arbejde. Fem zoner (`DK-B07-19`, `DK-B08-12`, `DK-B08-18`, `DK-B08-19`, `DK-B10-14`) blev godkendt til 4.0.187. `DK-B10-16` Fejø/Femø blev slettet lokalt og centralt; Havnø/Mariager Fjord øst forbliver slettet. Den senere aktuelle ejerbeslutning har udvidet det private auditscope, men ikke aktiveringsmandatet.

Den første 12-dels kandidat bestod DMI, men runtimekontrollen viste, at hele flytninger ville tømme to nabozoner. Den er derfor erstattet før aktivering. Den aktuelle kandidat opdeler ved grænserne og har 22 mål-/naborester, 22/22 punktpar, to Ristinge-ejerskabsflytninger, ni kontrollerede erstatninger og nul overlap. `.github/workflows/validate-six-zone-recovery.yml` skal nu gentage native DMI-kontrollen på de 22 dele; workflowet kan ikke deploye.

#31609637964 bestod derefter hele den private kæde inklusive 22/22 native DMI-gridvalg, deaktiveret 656-dels/211-zoners runtime og uændrede ikke-berørte zoner. `KYSTZONER-SEKS-ZONER-KONTROL.html` er bygget lokalt til ejerreview. Næste trin er visuel ejergodkendelse; derefter shadow-score og offentlig releasegate, aldrig automatisk aktivering.

## Kritisk checkpoint 2026-08-11 / 4.0.181

- Den nationale aktivering i 4.0.180 projicerede fejlagtigt 605 interne beregningsdele som selvstændige synlige kortzoner. Multipart-geometri gav 2.488 synlige linjer og cirka 12.440 Leaflet-objekter, sorte endemarkeringer over hele kortet, gentagne navne og meget langsom indlæsning.
- Ejerens bindende præcisering: De eksisterende hovedzoner er de synlige zoner. Lokale kystdele er interne beregningsdele for forskellige retninger og lokale vejrserier; de må ikke fremstå som hundreder af nye offentlige zoner. Hver synlig hovedzone skal kun have én sort markering i hver ende.
- 4.0.181 fjerner kun den fejlagtige offentlige projektion. De 605 dele og deres lokale scoredata bevares uændret. Kortet tegner igen 209 aktive hovedzoner, cirka 1.045 Leaflet-objekter og præcis 418 endemarkeringer.
- Den visuelle reparation er produktionsverificeret i #2279 (`31505747519`): frisk DMI-kæde, fuld Linux-validering, release-gate, Pages-artifact og deploy bestod. Offentlig browserkontrol viste version 4.0.181, 208 centralt aktive hovedzoner og præcis 416 endemarkeringer.
- Mulige huller i den interne beregningsdækning, herunder kendte gode ravstrande, er fortsat et selvstændigt P0-auditpunkt. Ingen dele må slettes eller nye linjer opfindes automatisk som del af UI-reparationen.
- Det planlagte arbejde med DMI-femdøgnsrapport/besøgstæller er pauset, indtil kortreparationen er deployet og visuelt godkendt.

## Nyeste checkpoint – 2026-08-11 / 4.0.170

- Offentlig #31448257626 er produktionsverificeret for 4.0.169 med fulde gates og deploy.
- Privat #31448258035 bestod hele nationalkæden: 774 native vindserier, 752 shadow-scorer, 22 deldækkede og ni blokerede dele.
- Den score-neutrale reviewside indeholder 783 dele. Central admin-roundtrip/rollback bestod, og beskyttede dokumenter samt offentlig runtime er uændrede.
- QA-artifactet er downloadet til `.audit/run-31448258035`. Næste trin er Jakobs manuelle gennemgang; intet må aktiveres automatisk.

## Aktiv 4.0.143-kandidat – national kildeplan
- Worktree indeholder en central-hydreret planlægger for præcis 208 effektive zoner, maskinlæsbare konfliktklasser og deterministiske kildefliser.
- Et nyt isoleret `geometry_v2_national`-job henter og deduplikerer de syv gratis officielle GeoDanmark-lag til et privat artifact uden Pages-rettigheder.
- Lokale plan-, fetch-, workflow- og pilotkontrakter, RDKS, versionskontrol og release-gate er grønne. Hele validate-rækken er kørt deltest for deltest; alle bestod undtagen den kendte Windows-begrænsning i `test:pages-module-closure`, som kræver Linux/rsync. Linux-CI er det endelige fulde bevis.
- Næste nødvendige eksterne evidens er første private nationale CI-kørsel. Derefter auditeres artifactet, og den nationale topologi-/ravstrandgenerator bygges på de faktiske kildedata.
- Ingen aktiv geometri, admin-data, vejr, state, score eller offentlig UI er ændret.

## Aktiv 4.0.144-kandidat – skaleret national hentning og source-QA
- 4.0.144 blev efterfølgende produktionsverificeret i #2028. Privat #2029 bestod central hydration/tombstones, 208-zoneplan, autoritative 100 fliser/700 requests på ca. 5:15, kildevalidator, `STRtree`-QA og privat råupload; hele jobbet tog 7:45, og build/Pages var skipped. 101/707 var den tidligere repositorybaserede måling.
- Råartifactet er 413 MB komprimeret og var upraktisk langsomt at downloade. 4.0.145-kandidaten tilføjer derfor et separat kompakt privat artifact med plan, manifest og begge QA-filer; råartifactet bevares uændret.
- 4.0.145 er nu produktionsverificeret i #2032; privat #2033 verificerede både råartifact og kompakt 6,8 MB QA-artifact. Auditen viser 20 referenceklare og 188 flaggede zoner. 4.0.146 bygger read-only national topologiaudit med fjord/nor, havn, åmunding, klit/skrænt og høfter samt fail-closed 208-zonegate.
- 4.0.146 er produktionsverificeret i #2036. Privat #2037 bestod teknisk med 90 fjord-/normasker, 1.225 havneobjekter, 3.347 høfter og 208 zoneoutputs, men artifactauditen afviste 2.868 åmundingsklynger som oversegmentering. 4.0.147 tilbageholder åmasker i zoner over 20 og eksporterer aggregeret egenskabsprofil plus højst 200 geometri-frie samples.
- 4.0.147 er produktionsverificeret i #2039; privat #2040 beviste 45 overdense zoner og nul anvendte masker. 2.551/3.394 kandidater er kun 0–2,5 m brede. 4.0.148 filtrerer derfor på officiel bredde ≥2,5 m og fysisk linje ≥100 m, tæller fravalg og bevarer >20 no-go.
- 4.0.148 er produktionsverificeret i #2042; privat #2043 gav 489 åklynger og kun én overdense kendt partitionszone. 4.0.149 bygger private nationale multipart-reviewdele uden opfundne forbindelser, navne, punkter eller runtimeaktivering.
- 4.0.143 er produktionsverificeret i #2027 med fuld Linux-validate, releasegate, artifact og Pages-deploy.
- Første nationaljob målte 101 fliser/707 sekventielle requests og var efter mere end ti minutter fortsat i hentetrinnet uden flisefremdrift.
- Worktree bruger nu højst fire samtidige fliser, synlig progress, streng kontrol af komplethed/filer/hashes/deduplikering/secrets og rumligt indekseret QA for alle 208 zoner.
- Nye self-tests, workflowkontrakter, RDKS-validering, versionskontrol, `git diff --check` og releasegate består lokalt. Commit/push, fuld Linux-produktions-CI, privat 4.0.144-CI og artifactaudit mangler.

## Hvorfor checkpointet findes
Ejeren oplevede, at den lange chat var blevet langsommere, og bad om at fortsætte i en ny chat. Dette dokument er den permanente, genoptagelige status. Det er ikke et releasebevis.

## Sådan indlæses hele projektviden i den nye chat
Checkpointet er et navigationskort, ikke en erstatning for RavRadars samlede hukommelse. Den nye chat skal læse og sammenholde følgende, før arbejdet fortsætter:
1. `AGENTS.md`.
2. `docs/ai/CODEX_START_HERE.md`.
3. `docs/rdks/00_READ_FIRST.md`, `01_AI_OPERATING_RULES.md`, `90_INDEX/CURRENT_TRUTH.md` og `90_INDEX/IMPLEMENTATION_STATUS.md`.
4. `docs/rdks/20_REQUIREMENTS/ACTIVE-REQUIREMENTS.md` og `40_KNOWN_ISSUES/KNOWN-ISSUES.md`.
5. Aktive beslutninger, især DEC-0029, DEC-0030, DEC-0031 og DEC-0032.
6. `docs/ai/AI_KNOWLEDGE_BASE.md`, `AI_ARCHITECTURE_MAP.md`, `AI_WORKING_RULES.md`, `AI_ROADMAP.md` og `AI_LESSONS_LEARNED.md`.
7. `docs/research/COASTAL_GEOMETRY_V2_SOURCE_AUDIT.md` samt relevante DMI-/RavScore-forskningsnotater.
8. Relevante afsnit i `HANDBOOK-RAVRADAR.md` og `docs/handbook/content.json`.
9. Dette checkpoint, aktuel kode, `git status`, diff og seneste Git-historik.

Gamle chats og chatkilder er historiske forklaringer, ikke selvstændig tilladelse til ændringer. Ved konflikt gælder ejerens aktuelle instruktion, derefter aktiv RDKS, verificeret kodeadfærd, håndbog, changelog og til sidst historiske chats.

## Tværgående viden og brugerbeslutninger, som ikke må gå tabt
- RavRadar er gratis, drives ikke kommercielt og tjener ingen penge. Nye datakilder og teknisk adgang skal derfor være gratis; ingen betalt plan eller skjult betalt fallback må indføres.
- `DATAFORDELER_API_KEY` findes som GitHub repository secret og må aldrig skrives i kode, logs, dokumentation, artifacts, commits eller chat. Secret-navnet passer til den aktive workflowimplementering.
- Administratorens centralt gemte Supabase-data er runtime-sandhed. Manuelle navne-, kystlinje-, land-/vandpunkt-, retningsanker- og sletteændringer må ikke overskrives af repositoryets historiske geometri.
- RavRadar har 209 aktive repositoryzoner, men senest 208 centralt effektive offentlige zoner, fordi `DK-B02-14` er slettet centralt. Generatorer skal hydrere central sandhed og tombstones først.
- Den afsluttede Blåvand-referencepilot var privat og score-neutral. DEC-0034 autoriserer nu bygning og samlet aktivering af hele Danmark på den nuværende pre-domain GitHub Pages-testside efter grøn national gate; dette erstatter den tidligere generelle no-activation-afgrænsning, men ikke kravene om dataintegritet, rollback og releasevalidering.
- Kystlinjen repræsenterer relevante ravstrande, ikke enhver fysisk vandkant. Den må springe over åer og havne. Alle indre fjorde udelukkes undtagen Limfjorden.
- Høfter, læsider, odder og lignende kan være ravfælder, men registreres kun som score-neutrale hypoteser. Eventuel scoreeffekt tilhører den senere videnskabelige DEC-0029-proces.
- I den senere store DEC-0029-analyse er vinden ved kortets viste pile kun ét udsnit. Kortpile er UI-visualiseringer og må ikke afgrænse det fysiske analysefelt. Relevant rumlig/opstrøms vind over hav og kyst, også hvor ingen pile vises, samt historik, bølge-/strømkobling, forsinkelse og dobbelt-tælling skal undersøges som del af den samlede ravkæde. Dette ændrer ikke RavScore nu.
- Flere lokalt navngivne kystdele er ønskede, når vind og strøm rammer strækninger forskelligt. De bliver ikke selvstændige vejrmålepunkter, før DMI-sampling, provenance, merge, score/state og UI er implementeret og valideret ende til ende.
- Eksisterende zone-ID'er bevares som udgangspunkt. Hvis et ID flyttes til en væsentligt anden geografi, kræves eksplicit migration eller afgrænsning for historik, observationer, regler og læringsdata.
- Admin skal fortsat kunne revidere navn, kystlinje, lokale dele, land-/vandpunkter og retninger med central readback, historik og rollback.
- DMI er primær vejr-/havkilde. Fungerende DMI-data må ikke erstattes af fallback for kosmetisk ensartethed. Manglende data forbliver `missing`; de må aldrig opfindes som nul, stale gentagelse eller skjult interpolation.
- Et grønt GitHub-run er kun releasebevis, når de fulde validate- og release-gates faktisk er kørt som success før artifact/deploy. Pilotjobbet skal derimod springe build og Pages-deploy over.
- Repositoryet ejer kun `.github/workflows/update-and-deploy.yml`. `pages-build-deployment` er GitHubs Pages-mekanisme, ikke RavRadars workflowfil.
- Codex skal tænke hele systemet: input, central admin, scheduler, cache, DMI/GRIB, provenance, score/state, public runtime, UI/admin, tests, artifact og deployment.
- Modelvalg er Codex' ansvar. Sol bruges ved kritisk geometri, DMI, RavScore, arkitektur, regressioner og slutvalidering. Codex skal selv bede ejeren skifte til en billigere model, når samme kvalitet kan opnås, og selv bede om Sol igen før kritisk arbejde.

## Seneste produktionsverificerede baseline
- Version 4.0.134, commit `3843d20e0fb6ffb7e76bef3a817125317a29cc40` på `main`.
- Privat GeoDanmark-pilot #1967: success med 208 centralt effektive zoner, 72 private kystdele, to Blåvand-detaildele, 15 detailfeatures, 9 høfter og detailkort; build/Pages var skipped.
- Produktionskørsel #1964: success med frisk data, fuld validate, release-gate, Pages-artifact og deploy på samme commit.

## Produktionsverificeret 4.0.134
4.0.134 blev committed og pushed på `main` som `3843d20`. Produktionsrun #1964 gennemførte frisk dataopbygning, fuld validate, release-gate, Pages-artifact og deploy som success. Privat pilot #1967 gennemførte central hydrering og hele GeoDanmark-/Blåvand-kæden som success, mens build og Pages-deploy var skipped.

Implementeret lokalt:
- `data/geometry-v2/blaavand-detail-policy.json` låser kun `DK-B03-13`, 15 meters landsideforskydning, to lokale dele og falske aktiverings-/vejr-/scoreflag.
- `scripts/build-blaavand-detail-proposal.py` bruger centralt hydrerede og verificerede adminankre som land-/vandvidner.
- Den fysiske GeoDanmark-kyst splittes topologisk ved det officielle sted `Blåvands Huk`.
- Delene hedder `Nord for Blåvands Huk` og `Sydøst for Blåvands Huk mod Hvidbjerg Strand`.
- Lokal kørsel på det private #1959-input gav cirka 6,4 km pr. del, præcis 15,0 meters målt forskydning, to land-/vandpunktpar og ni score-neutrale GeoDanmark-høfter.
- `scripts/render-geodanmark-pilot-maps.py` danner `maps/zones/DK-B03-13-detail.png` med fysisk kyst, detailkyst, punktpar og høfter.
- Workflowet kører det nye detailtrin efter samlingen og før kort/artifact-upload.
- Kontraktstest, RDKS, roadmap, kendte issues, forskningsaudit, Markdown-håndbog, webhåndbog og changelog er opdateret til den lokale 4.0.134-kandidat.

## Vigtig afvist løsning
Første forsøg fordelte hele råfragmenter efter nærmeste adminanker. En ny topologisk gate viste, at den sydøstlige del da lå cirka 3 km fra hukpunktet, fordi ét langt GeoDanmark-objekt følger både nordkyst og knækket mod Hvidbjerg. Løsningen blev forkastet. Den aktuelle kode splitter først dette objekt ved nærmeste punkt til det officielle Blåvands Huk og klassificerer derefter siderne.

## Lokale kontroller, der er bestået
- Faktisk generering på #1959-artifact: 2 dele, 2 landpunkter, 2 vandpunkter, 9 høfter, i alt 15 detailfeatures.
- Blåvand self-test.
- Hele `test:coastal-geometry-v2`-kæden kørt direkte med bundtet Node/Python: bestået.
- `scripts/validate-rdks.mjs`: bestået for 4.0.134.
- `scripts/validate-release-version.mjs`: bestået for 4.0.134.
- JSON-parse af policy og webhåndbog: bestået.
- `git diff --check`: bestået før dette checkpoint.

## Lokal runtimebemærkning
Desktop-runtimepakken har Node/Python/pnpm, men ingen `npm`-kommando. Validate-deltestene blev derfor kørt i samme rækkefølge via pnpm; kun `test:pages-module-closure` stoppede lokalt, fordi Windows-miljøet mangler Linux/rsync. Den fulde Linux-kæde bestod efterfølgende i #1964.

## CI- og artifactevidens
- Lokal validate bestod alle deltests undtagen den kendte Windows-begrænsning i `test:pages-module-closure`, som kræver Linux/rsync; release-gaten bestod lokalt.
- #1965 stoppede i Blåvand-trinnet efter central sync-timeout. Fallbackinputtet havde 209 repositoryzoner og ingen centrale Blåvand-ankre, så generatoren nægtede korrekt at fortsætte.
- #1967 havde central sync `ok`, fjernede `DK-B02-14`, anvendte 208 aktive zoner og to Blåvand-ankre. Artifactet havde 72 `private-coastal-part-proposal`, 15 detailfeatures, 9 høfter og `DK-B03-13-detail.png`; alle produktions-, admin-, vejr-, score- og aktiveringsflag var falske.

## Resterende arbejde i næste chat
1. Læs AGENTS og den obligatoriske dokumentkæde samt dette handoff.
2. Kontrollér worktree og den seneste dokumentations-/evidenscommit.
3. Næste faglige gate er gratis officiel ortofotokontrol af Blåvand og reproducerbar kildeadgang.
4. Først derefter må de private vandpunktkandidater valideres mod relevante DMI-gridmasker.
5. Ingen Blåvand-geometri, land-/vandpunkter, selvstændig sampling, adminændring eller RavScore må aktiveres uden de senere systemiske gates.

## Aktuel ucommittet 4.0.135-kandidat
- Den officielle aktuelle Datafordeler-kontrakt er verificeret: gratis `GeoDanmark Ortofoto forår Web Mercator WMTS`, 2025-data, EPSG:3857 og API-key/OAuth. RavRadars eksisterende `DATAFORDELER_API_KEY` er den nødvendige moderniserede credentialtype; ingen ny konto, betalt adgang eller separat secret er nødvendig.
- `scripts/build-blaavand-ortho-review.py` henter tre afgrænsede zoom-17-vinduer og danner private overlays for norddelen, Blåvands Huk og sydøstdelen. Fysisk kyst, 15-metersforslag, punktkandidater og høfter vises oven på ortofoto.
- Workflowtrinnet ligger kun i `geometry-v2-pilot`, bruger samme secret som WFS og gemmer aldrig key eller credential-bærende URL. Output er privat og alle aktiverings-, vejr- og scoreflag er falske.
- Versionen er hævet til 4.0.135, og RDKS, krav, issue, roadmap, forskningsaudit, begge håndbøger og changelog er opdateret.
- Lokal `test:coastal-geometry-v2`, ortofoto-self-test, RDKS-validering, releaseversionsvalidering og webhåndbogens JSON-parse består. Faktisk WMTS-fetch kan kun bevises i CI med repository-secret; commit, push, fuld release-gate, privat pilot, artifactreview og normal produktionskørsel mangler.
- Ortofotogaten er ikke bestået, før de tre billeder er hentet og gennemgået visuelt. DMI-gridvalidering må først begynde derefter.
- Pilot #1974 er efterfølgende grøn: 108 tiles og tre overlays blev genereret, build/Pages var skipped, rapportens produktions-/vejr-/scoreflag var falske, og en artifactsøgning fandt ingen credentialmatch. Visuelt passer nord- og sydøststrækningerne overordnet; ved selve hukket følger kilden en indadgående sandtange-/laguneløkke. Ortofotogaten er derfor delvist bestået, men samlet no-go indtil hukgeometrien er rettet og genkontrolleret.
- Normal push-run #1973 stoppede sikkert før release/deploy, fordi Pillow blev importeret før det private scripts self-test i produktionsmiljøet. Det lokale hotfix flytter både `requests` og Pillow bag self-testen og tilføjer en importordensregression. Ny commit/push og normal produktion mangler.
- Hotfixet blev committed/pushed som `47f88a3`. Normal produktion #1976 gennemførte frisk data, fuld Linux-validate, release-gate, support-/Pages-artifacts og deploy som success; offentlig `version.json` viser 4.0.135. 4.0.135 er dermed produktionsverificeret, men det faglige ortofotoresultat for hukløkken er fortsat no-go.

## Aktuel ucommittet 4.0.136-kandidat
- Den ortofotoafviste huk-hårnål er målt til 430,0 m rute over 144,3 m chord (ratio 2,98).
- Policy og generator bevarer det søværts apex, genforener med den sydøstlige åbne strand og fjerner 242,0 m indadgående detur på #1974-inputtet.
- Generatoren stopper, hvis hårnålen ikke genfindes inden for de eksplicitte tærskler; syntetisk self-test og faktisk regeneration består.
- To dele, 15,0 m offset, to punktpar og ni score-neutrale høfter bevares. Ingen aktivering, adminændring, DMI-sampling eller scoreændring.
- Version/RDKS/changelog/begge håndbøger er opdateret. Fuld lokal validering, commit/push, privat pilot, nyt ortofotoartifact og normal produktion mangler.
- Kandidaten blev committed/pushed som `b82e311`. Privat pilot #1982 gennemførte central sync, 108 ortofototiles, tre overlays og privat artifact med build/Pages skipped; ingen credentialmatch og alle aktiverings-/vejr-/scoreflag falske. Det nye hukoverlay er visuelt godkendt: relevant grøn strandlinje springer den indre lagune-/sandspidsomvej over og ligger på sand/landsiden.
- Normal produktion #1981 gennemførte frisk data, fuld Linux-validate, release-gate, Pages-artifact og deploy som success. Offentlig `version.json` viser 4.0.136.
- Ortofotogaten er dermed bestået. Næste faglige gate er privat DMI-gridvalidering; Blåvand-geometri, punkter, sampling, admin og RavScore er fortsat ikke aktiveret.

## Aktuel ucommittet 4.0.137-kandidat
- `scripts/validate-blaavand-dmi-grid.py` læser de to private vandpunkter fra det centralt hydrerede Blåvand-detailforslag og genbruger `scripts/update-dmi-bulk.py` direkte som produktionsparser.
- Det private pilotjob installerer den eksisterende gratis DMI/eccodes-afhængighed og læser ét aktuelt forecast-step fra `wam_nsb` og `dkss_nsbs` via den eksisterende `DMI_API_KEY`. Secret og asset-URL gemmes eller logges ikke i rapporten.
- Gaten bruger produktionens nearest-valid-cell-søgning, vestkystens fysiske afstandsgrænse og fælles fysisk current-U/V-gridpunkt med samme vertikallag. Der anvendes ingen spatial interpolation.
- Rapporten gemmer kun gridkoordinater, afstande, collection, model-run og native valid time; rå vejrværdier gemmes ikke. Den angiver også pr. komponent, om de to kandidater faktisk rammer forskellige celler. Samme celle må ikke fremstilles som to uafhængige lokale serier.
- Alle mutationsflag er falske. Produktionsgeometri, centralt gemt admin, almindelig vejrsampling, public runtime og RavScore ændres ikke.
- Lokal DMI-grid-self-test, GeoDanmark-workflowkontrakt, alle øvrige geometri-self-tests, RDKS, releaseversionskontrol, webhåndbogens JSON-parse, `git diff --check` og release-gaten består.
- Den samlede lokale validate-kæde er kørt manuelt med den bundtede runtime. Alle kørte produkt-/JS-tests består bortset fra de kendte Windows-begrænsninger: `test:pages-module-closure` mangler Linux/rsync, og fire tests der kalder det ikke-tilgængelige globale `python` får `spawnSync.status=null`. De samme Python-programmer/self-tests består direkte med den bundtede Python. Linux-CI skal være det endelige fulde bevis.
- Den oprindelige kandidatstatus var, at commit/push, pilot, artifactreview og produktion manglede; den status er erstattet af #1987/#1986-evidensen nedenfor. Ingen Blåvand-data må aktiveres alene på gridresultatet.
- Kandidaten blev committed/pushed som `ab42e99`. Privat pilot #1987 bestod hele GeoDanmark-/ortofoto-/DMI-kæden med build og Pages skipped. Begge punkter har gyldige WAM-/DKSS-celler; current-U/V deler samme fysiske celle og 17 m-lag pr. punkt; alle seks komponentfelter bruger forskellige celler nord/sydøst. Artifactet indeholder ingen credentialbærende URL, og alle mutations-/aktiveringsflag er falske.
- Normal produktion #1986 bestod central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig GitHub Pages `version.json` viser 4.0.137. DMI-gridgaten er dermed bestået privat, men ingen Blåvand-geometri, punkter, sampling, admin-data eller RavScore er aktiveret.

## Produktionsverificeret 4.0.138
- Kodeauditten bekræfter, at den aktive multi-anker-score bruger én fælles zoneserie mod flere retninger. Separate Blåvand-data må derfor ikke kobles direkte på: det kan krydsvurdere nordligt vejr mod sydøstlig kyst eller omvendt.
- `data/geometry-v2/blaavand-weather-shadow-policy.json` låser to stabile `zoneId::partId`-identiteter, egne validerede samplingpunkter/grid, fuld nødvendig timeproveniens og separate fremtidige historiknøgler.
- `scripts/build-blaavand-weather-shadow-contract.py` kræver bestået #1987-lignende gridrapport, identiske partmængder og falske mutationsflag. Den danner kun et privat kontraktartifact.
- Krydsmerge, spatial interpolation, fallback, parent-historikgenbrug, part-state, part-score, best-part-valg, public projection, UI, admin-write og automatisk aktivering er eksplicit deaktiveret. `DK-B03-13`-parentserien, historikken og RavScore forbliver autoritative.
- Workflowet bygger kontrakten efter DMI-gridgaten og før kort/artifact-upload. Produktcommit `2d6127b` er pushed til `main`.
- Privat pilot #1992 (`31318970308`) bestod. Artifactet har præcis to isolerede delserier med unikke serie-/historik-ID'er, korrekte gridreferencer, ingen credentialbærende URL og alle sampling-/state-/score-/UI-/publicerings-/admin-/aktiveringsflag falske. Build og Pages var skipped.
- Normal produktion #1991 (`31318963269`) bestod central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på samme commit. Offentlig GitHub Pages `version.json` viser 4.0.138.
- Næste faglige gate er private flertidsserier med timeproveniens og komponentmerge. Sampling, state, score, UI, admin og geometri forbliver deaktiveret.

## Produktionsverificeret 4.0.139
- `scripts/validate-blaavand-multi-step-series.py` genbruger produktionens native WAM-/DKSS-parser over op til seks aktuelle forecasttrin for begge private Blåvand-dele.
- Gaten kræver mindst to fælles komplette native tider, fuld delbundet komponentproveniens, samme current-U/V-celle og vertikallag samt nul interpolation, fallback og krydsmerge.
- Artifactet gemmer komponenttilstedeværelse og kontekstbundne værdihash, ikke rå vejrværdier. Alle geometri-, sampling-, state-, score-, UI-, publicerings-, admin- og aktiveringsflag er falske.
- Produktcommit `f94620f` er pushed. Privat pilot #1997 (`31320524120`) bestod med fire fælles komplette native tider pr. del og 48 komponentposter med fuld DMI-proveniens, korrekte og forskellige gridpunkter mellem delene, korrekt current-U/V-parring og nul interpolation/fallback. Artifactet har ingen rå værdifelter eller credentialbærende URL; build/Pages var skipped.
- Normal produktion #1996 (`31320499331`) bestod central adminsync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig GitHub Pages `version.json` viser 4.0.139.
- Næste gate er separat privat state-/historikvalidering. Ingen aktivering uden senere UI-, admin-roundtrip-, rollback- og ejer-go/no-go.

## Produktionsverificeret 4.0.140
- `scripts/validate-blaavand-state-history.mjs` replay-validerer de to delserier gennem den faktiske score-neutrale `shadow-v2`-funktion med hver sin kontraktfastlagte `historyKey`.
- Gaten stopper ved delt historiknøgle, parent-genbrug, krydslæsning eller numerisk/delscorepåvirkning. Den validerer strukturel isolation, ikke endnu fysisk langtidsstate.
- `validate-blaavand-multi-step-series.py` skriver kun current-U/V til en midlertidig `.cache`-fil. Node-gaten sletter filen i `finally`; den ligger uden for det private artifact. Rapporten gemmer kun kompakt state og kontekstbundne hash.
- Produktcommit `0f8171b` er pushed. Privat pilot #2004 (`31322405400`) bestod med to unikke historiknøgler, nul parent-genbrug/krydslæsning, verificerede samples, nul scorepåvirkning, slettet transient input og intet rå-/credentiallæk; build/Pages var skipped.
- Normal produktion #2003 (`31322394986`) bestod central adminsync, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig GitHub Pages `version.json` viser 4.0.140.
- Næste gate er score-neutral UI-review; central admin-roundtrip/rollback og ejer-go/no-go følger senere. Ingen aktivering.

## Produktionsverificeret 4.0.141 – privat score-neutral UI-gate
- Den faktiske `js/map/map-view.js` er auditeret: den aktive zones `coastLine` får farve direkte fra RavScore-niveauet og bærer det eksisterende klikmål og tooltip.
- `scripts/build-blaavand-score-neutral-ui-review.mjs` danner et privat JSON/HTML-review efter bestået shadow-kontrakt og state-/historikgate. Parentens linje, farve, score, klikmål, tooltip og rangering skal bevares.
- To delkonturer må kun være neutrale, stiplede, ikke-interaktive og mærket “Privat forslag · ikke aktiv”. Delscore, scorefarve, delrangering, “bedste del”, vejr-/stateværdier og offentlig integration er forbudt.
- Produktcommit `67a6ebd` er pushed. Privat pilot #2009 (`31323962496`) bestod hele GeoDanmark-/ortofoto-/DMI-/statekæden og den nye UI-gate; build og Pages var skipped.
- Artifact `geodanmark-geometry-v2-pilot-31323962496` er auditeret: én aktiv parent, alle parent-retentionsflag sande, begge dele uden score/farve/rangering/“bedste del”/klik/tooltip, alle mutations- og aktiveringsflag falske, ingen transient replayfil og ingen credential-/råværdilæk.
- Normal produktion #2008 (`31323950611`) bestod central adminsync, Supabase-roundtrip, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy. Offentlig GitHub Pages `version.json` viser 4.0.141.
- Ingen Blåvand-geometri, sampling, state, admin-data, offentlig UI eller RavScore er aktiveret. Næste gate er en privat, ikke-destruktiv central admin-roundtrip/rollback-kontrakt; derefter kræves eksplicit ejer-go/no-go.

## Model
## Produktionsverificeret 4.0.142 – privat admin-roundtrip/rollback
- `scripts/validate-blaavand-admin-roundtrip.mjs` kræver bestået privat UI-gate og skriver kun et unikt `geometry-v2-private-roundtrip-<runId>`-dokument.
- Gaten verificerer create/read/update/delete og fravær efter rollback. Før/efter-hash og version for `coastline-overrides` og `direction-reviews` skal være identiske.
- Rapporten gemmer kun digests/versioner og boolske beviser, ikke adminpayload, credential eller request-URL. Alle mutations-/score-/aktiveringsflag er falske.
- Produktcommit `ca5f920` er pushed. Privat pilot #2014 (`31324849864`) bestod hele kæden og den nye admin-gate; build/Pages var skipped.
- Artifactet beviser temp create/read/update/delete og fravær efter rollback. `coastline-overrides` beholdt identisk digest og version 55; `direction-reviews` identisk digest og version 314. Ingen rå payload/credential/URL eller mutation blev gemt.
- Normal produktion #2013 (`31324840861`) bestod central adminsync, Supabase-roundtrip, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy.
- Alle private sikkerhedsgater for Blåvand-piloten er nu bestået. Næste trin er eksplicit ejer-go/no-go; ingen aktivering må ske implicit.

## Ny ejerbeslutning efter 4.0.142 – score og forklaring
- Ejeren har valgt, at den bedst vurderede gyldige lokale kystdel fremover skal bestemme zonens RavScore.
- Det skal stå meget tydeligt, om scoren gælder hele zonen eller kun bestemte dele. Ved delvis dækning skal det lokale navn/strækning vises.
- Detaljen skal give en forståelig ravteknisk forklaring på den vindende del og forskellen til de øvrige, inklusive vind, strøm, bølger, vandstand, historik/state og øvrige aktive komponenter.
- DEC-0033 fastholder missing/proveniens, valg pr. tidspunkt og jagtform samt krav om senere faglige tærskler for “hele zonen”, delvis og usikker dækning.
- Dette er produktretning, ikke aktiveringstilladelse. Næste leverance er fortsat den visuelle ejerpræsentation med rigtigt kort/ortofoto og almindeligt sprog.
- Ejeren præciserede, at dækningslogikken ikke må være krakilsk: 78 mod 75 skal ikke opdeles eller særforklares. Den midlertidige faste margin er 7 point og skal genvurderes i den store RavScore-analyse.
- Ejeren præciserede også, at bestillingen er at bygge og senere aktivere den nye model for hele Danmark, ikke kun Blåvand. Delnavne skal være stedbaserede: fx nord/syd for huk, by eller havnemole.
- National aktivering er ikke evidensmæssigt klar endnu: kun Blåvand har bestået hele kæden, mens de øvrige otte pilotzoner dokumenterede semantiske/grænsemæssige redesignbehov. Næste arbejdsafsnit er derfor national byggekæde og validering, ikke en Blåvand-specialrelease.

## NY CHAT – bindende næste arbejdsafsnit efter ejerens endelige præcisering
- Ejeren accepterer, at de kendte nationale fejl netop skal rettes som del af arbejdet. De må ikke bruges til at fastholde en permanent Blåvand-only-løsning.
- Den nuværende GitHub Pages-side har ingen aktive brugere og er testmiljø frem til senere køb/flytning til domæne. Hele den nye Danmarksløsning må bygges og aktiveres på testsiden efter grøn national gate. En senere domæne-/brugerrelease kræver en ny særskilt produktionsgate.
- Blåvand er den gennemvaliderede reference for metode og UX. Overfør den i stor skala: central admin-sandhed først; gratis officielle kilder; rettede zonebetydninger/navne; kystlinjer uden havne/åer/indre fjorde; stedbaserede delnavne; lokale punkter/serier/proveniens/historik; score-/dæknings-UI; central readback/rollback.
- Midlertidig score-/dækningsregel: bedste gyldige del bestemmer zonescoren; forskel på højst 7 point fremstilles som praktisk hele zonen; over 7 point navngives den relevante del. Selve scoren/marginen genanalyseres i den senere store DEC-0029/RavScore-analyse. Ingen stor faglig scoreanalyse nu.
- Den store senere analyse skal fortsat bruge hele det rumlige/historiske vindfelt, også områder uden kortpile. Pile er UI, ikke fysisk analysegrænse.
- Lokal visuel ejerreview ligger ucommittet i `.owner-review/blaavand/` og bruger det private artifact i `.cache/owner-review-source-2014/`. Serveren har været `http://127.0.0.1:8765/.owner-review/blaavand/`. Disse mapper må ikke deployes eller committes; de kan bevares lokalt til reference.
- Git før dette checkpoint: `main` på `3cf3bd7` plus denne checkpointændring; kun kendt dependency/cacheaffald og de to lokale reviewmapper er untracked. 4.0.142 er produktionsverificeret via privat #2014 og produktion #2013. Push-run #2021 for `3cf3bd7` var stadig `in_progress` ved checkpointstart og skal sammenholdes med nyere status.
- Første opgave i ny chat: auditér den eksisterende nationale v2-generator/pilotkode mod den centralt effektive bestand og lav en konkret national implementeringsplan med automatiserbare trin, konfliktklasser og aktiveringsarkitektur. Fortsæt derefter implementeringen; start ikke Blåvand forfra.
- Brug GPT-5.6 Sol til national geometri, arkitektur, DMI/proveniens/state og endelig gate. Bed kun om billigere model ved rent mekaniske, afgrænsede opgaver og bed om Sol igen før kritisk arbejde.

## Model
Start og afslut 4.0.134 på GPT-5.6 Sol. Geometrisk review, fuld validering og CI-artifactkontrol er kritisk. En billigere model kan først overvejes til en senere, rent mekanisk dokumentationsopgave.

## Ny permanent arbejdsregel
Når ejeren fremover siger, at der skal oprettes en ny chat, skal Codex gentage denne proces: synkronisér permanent hukommelse, skriv aktuelt handoff, validér status og lever en indsættelsesklar besked til den nye chat.
