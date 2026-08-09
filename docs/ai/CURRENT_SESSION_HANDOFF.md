# Aktuelt sessionshandoff – 2026-08-09

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
- Den aktive geometri-v2-pilot er privat, parallel, read-only og score-neutral. Ingen national eller lokal geometri må aktiveres automatisk.
- Kystlinjen repræsenterer relevante ravstrande, ikke enhver fysisk vandkant. Den må springe over åer og havne. Alle indre fjorde udelukkes undtagen Limfjorden.
- Høfter, læsider, odder og lignende kan være ravfælder, men registreres kun som score-neutrale hypoteser. Eventuel scoreeffekt tilhører den senere videnskabelige DEC-0029-proces.
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

## Aktuel ucommittet 4.0.139-kandidat
- `scripts/validate-blaavand-multi-step-series.py` genbruger produktionens native WAM-/DKSS-parser over op til seks aktuelle forecasttrin for begge private Blåvand-dele.
- Gaten kræver mindst to fælles komplette native tider, fuld delbundet komponentproveniens, samme current-U/V-celle og vertikallag samt nul interpolation, fallback og krydsmerge.
- Artifactet gemmer komponenttilstedeværelse og kontekstbundne værdihash, ikke rå vejrværdier. Alle geometri-, sampling-, state-, score-, UI-, publicerings-, admin- og aktiveringsflag er falske.
- Workflow, tests, version, RDKS, roadmap, forskningsaudit, changelog og begge håndbøger er opdateret. Lokal self-test og workflowkontrakttest består; samlet lokal validering, release-gate, commit/push, privat pilot, artifactreview og normal produktion mangler.
- Efter bestået 4.0.139 er næste gate separat privat state-/historikvalidering. Ingen aktivering uden senere UI-, admin-roundtrip-, rollback- og ejer-go/no-go.

## Model
Start og afslut 4.0.134 på GPT-5.6 Sol. Geometrisk review, fuld validering og CI-artifactkontrol er kritisk. En billigere model kan først overvejes til en senere, rent mekanisk dokumentationsopgave.

## Ny permanent arbejdsregel
Når ejeren fremover siger, at der skal oprettes en ny chat, skal Codex gentage denne proces: synkronisér permanent hukommelse, skriv aktuelt handoff, validér status og lever en indsættelsesklar besked til den nye chat.
