# Kendte åbne og overvågede forhold

## National zone- og kystgeometri – aktiv pilot efter DEC-0032
- **ISSUE-PUBLIC-COAST-RESIDUAL-OWNER-CORRECTIONS – DMI-VERIFICERET / AFVENTER RUNTIMEGATE:** Den symmetriske overlapgate fandt og fjernede 11 additive dubletdele, som den tidligere ensidige kontrol overså. Slutkandidaten har 643 dele, nul tværzoneoverlap, nul uafklarede relevante huller og punktpar til 643/643 dele. #31532688885 godkendte alle 39 endelige nye punkter med fuld WAM+DKSS-dækning. Seks af 212 hovedzoner bruger fortsat deres bevarede fallbacklinje.
- **ISSUE-PUBLIC-COAST-WADDEN-MAINLAND-GAP – EJERGODKENDT OG INTEGRERET PRIVAT:** Den ravrelevante fastlandskyst fra Emmerlev mod Esbjerg indgår nu i tre private hovedzoner. Rømødæmning og økyster er udeladt; de to ejerbestemte broer på samlet 4.671,4 meter er bevaret som dokumenterede undtagelser. Kandidaten har ingen tværzoneoverlap og afventer DMI-/runtimegates.
- **ISSUE-NATIONAL-SOURCE-TILES-FOLLOWED-BAD-LEGACY-LINE – RODÅRSAG RETTET LOKALT / AFVENTER PRIVAT CI:** Den nationale kildeplan hentede kun GeoDanmark-fliser omkring hovedzonens gamle `coastLine`. Når netop denne linje lå kilometer fra den virkelige strand, fandtes den korrekte officielle kyst derfor ikke i inputtet. Planen dækker nu hele zonens afgrænsede ejerskabsgeometri (lokalt 128 mod tidligere cirka 100 fliser). De 190 allerede repræsenterede hovedzoner genbruger den hidtidige konservative matchning; de 18 aktive hovedzoner uden præcise dele får en bredere, fortsat privat recovery. Offentlig geometri må ikke ændres før ny kildehentning, national hul-/overlapaudit og ejerreview er bestået.
- **ISSUE-NATIONAL-RECOVERY-EVIDENCE-WINDOW – DELVIST CI-BEVIST I #31514481361:** Første udvidede private kørsel gav kystkandidater til 16 af de 18 hidtil helt manglende hovedzoner og øgede den private rå bestand fra 755 til 806 dele. Nibe Bredning vest afslørede, at zonepolygonen lå helt adskilt fra både kystlinje og land-/vandpunkter. Kildeplan og analysevindue bruger derfor nu summen af polygon, gammel linje og begge punkter (131 fliser lokalt). Ålsgårde/Helsingør mangler fortsat GeoDanmark-`Kyst`-kandidat og skal auditeres mod øvrige officielle lag; der må ikke tegnes eller gættes automatisk.
- **ISSUE-NATIONAL-RECOVERY-RECTANGLE-OVERREACH – FORKASTET EFTER #31516332559:** Ét samlet rektangel omkring modstridende polygon-, linje- og punktbeviser gav ganske vist Nibe en kandidat, men voksede det private råforslag urimeligt fra 806 til 1.072 dele. Metoden må ikke anvendes. Den erstattes af polygon-recovery for de 18 manglende zoner og kun ved helt tomt resultat et smalt, adskilt ekstrabånd omkring gammel linje/land-vandvidne. Lokal kildemåling giver dermed første forsøg plus Nibes 20,295 km og lader den geografisk fejlplacerede Ålsgårde/Helsingør-zone fail-closed.
- **ISSUE-PUBLIC-COAST-MUST-COMBINE-PARENT-ZONES-AND-PRECISE-SHORE – AKTIV P0:** Den akutte 4.0.181-rollback gjorde kortet overskueligt, men genindførte de gamle upræcise hovedzonelinjer. Slutmålet er én synlig/klikbar hovedzone med én scorefarve og kun to hovedzonegrænser, mens dens viste linje samles af de præcise GeoDanmark-kystdele. Interne beregningsdele må ikke danne offentlige ticks, tooltips eller farveskift. Relevante almindelige kyster må ikke have lange uforklarede huller; kun dokumenterede havne, åmundinger og irrelevante indre farvande må udelades. Adminudvidelsen afventer et korrekt kort.
- **ISSUE-PUBLIC-COAST-FIVE-RESIDUAL-ZONES – AFVENTER EJERVALG:** Den sikre additive kandidat dækker 203/208 hovedzoner uden overlap. Nibe Bredning vest, Ålsgårde/Helsingør, Lolland sydvest/Kramnitse, Fejø/Femø og Als syd/Kegnæs har enten central geografisk konflikt eller ingen sikker officiel kandidat. De vises alene i et privat fem-zoners slutkontrolkort. Ingen af dem må udfyldes eller flyttes automatisk.
- **ISSUE-COASTAL-PARTS-PUBLIC-MAP-EXPLOSION – RETTET LOKALT I 4.0.181 / AFVENTER PRODUKTION:** 4.0.176–4.0.180 projicerede hver intern beregningsdel som en synlig kortzone. Det gav to sorte endemarkeringer, tooltip og tre Leaflet-linjer pr. del, gentagne zonenavne, synlige huller og langsom kortstart. 4.0.181 tegner kun de oprindelige hovedzonekyster; lokale dele, punkter, vejr og RavScore bevares bag kulissen.
- **ISSUE-COASTAL-PARTS-RELEVANT-BEACH-COVERAGE – AKTIV:** Ejerens offentlige kontrol viser, at enkelte kendte gode ravstrande ikke indgår i de lokale beregningsdele. Kortets hovedzonelinje genoprettes straks, men beregningsdækningen skal auditeres særskilt og eventuelle huller føres til kort ejerreview uden automatisk generering.
- **ISSUE-NATIONAL-LEGACY-REVIEW-COUNT-STALE – LØST LOKALT I 4.0.175 / AFVENTER PRIVAT CI:** Seks godkendte kartografiske sideafgørelser reducerede korrekt den gamle 783-dels reviews blokeringer fra ni til tre, men reviewgaten krævede stadig 752/22/9 og stoppede #31474672948 efter bestået upstreamkæde. Gaten kræver nu 758 komplette, 22 deldækkede og tre blokerede dele; ingen geometri eller scorelogik er ændret.
- **ISSUE-NATIONAL-FINAL-CROSS-ZONE-OVERLAP – LØST LOKALT I 4.0.174 / AFVENTER PRIVAT CI:** Slutkontrollen fandt 311 overlappar mellem forskellige zoner efter ejerrettelserne. Once-only-samlingen giver lokalt 603 dele og nul overlap; én næsten lige Hammer Odde-konflikt er erstattet af en eksplicit grænse ved nordspidsen.
- **ISSUE-NATIONAL-FINAL-POINTS-STALE-AFTER-OWNER-REVIEW – LØST LOKALT I 4.0.174 / AFVENTER PRIVAT DMI-CI:** Det tidligere 774/783-punktbevis lå før sletninger, beskæringer og tværzonededuplikering. Punkterne er nu genberegnet til 603/603 på slutgeometrien, inklusive seks kartografisk dokumenterede sideafgørelser. Native DMI- og downstreambevis mangler endnu.
- **ISSUE-NATIONAL-INNER-WATER-FOLLOW-UP – LØST LOKALT I 4.0.173 / AFVENTER PRIVAT CI:** Ejeren har afgjort de 23 supplerende dele. En efterfølgende metrisk dubletaudit fandt 12 andre tekniske ID'er for allerede bedømte fysiske linjer og fører afgørelserne sikkert videre. Den resterende efterkontrol er nul.
- **ISSUE-NATIONAL-OWNER-REVIEW-UNUSABLE-OVERVIEW – LØST OG VISUELT EJERBEKRÆFTET I 4.0.171:** Første review pressede hele Danmark ind i et lille, baggrundsløst kort og havde ingen godkendelsesarbejdsgang. Det er erstattet af én stor del ad gangen med baggrundskort/luftfoto, kraftig linje, automatisk zoom, beslutningsknapper, bemærkning og eksport.
- **ISSUE-NATIONAL-WIND-ASSET-BUDGET – LØST OG CI-VERIFICERET I #31448258035:** Det begrænsede valg af præcis to HARMONIE-assets bestod for alle 774 berettigede dele inden for downloadgrænsen.
- **ISSUE-NATIONAL-SHADOW-THREE-HOUR-TREND – LØST OG CI-VERIFICERET I #31448258035:** Et ægte native `t`/`t+3h`-par blev anvendt, og alle 752 komplette dele blev shadow-scoret uden interpolation.
- **ISSUE-NATIONAL-PART-WIND-NOT-YET-VERIFIED – LØST PRIVAT I #31425327202:** 774/774 dele har mindst to native HARMONIE-trin; retrypopulationen var 20, og samme celle, afstand og provenance bestod uden interpolation eller parentfallback.
- **ISSUE-NATIONAL-SHADOW-SCORE-NOT-YET-VERIFIED – LØST PRIVAT I #31425327202 / AKTIVERING LUKKET:** 752 fuldt dækkede dele blev scoret privat; 22 deldækkede og ni blokerede forblev fail-closed.
- **ISSUE-NATIONAL-OWNER-REVIEW-AND-ADMIN-ROUNDTRIP – CI-VERIFICERET I #31448258035 / AFVENTER EJERREVIEW:** Reviewet samler 783 dele, og tempkladde-roundtrip/rollback bestod uden ændring af beskyttede dokumenter. Ingen aktivering er tilladt før Jakobs manuelle gennemgang og særskilte beslutning.
- **ISSUE-NATIONAL-SOURCE-SEQUENTIAL-SCALING – LØST I #2029:** Den tidligere repositoryplan gav 101 fliser/707 requests. Efter central hydration gav #2029 den autoritative plan 100 fliser/700 requests, som blev hentet med højst fire samtidige fliser på ca. 5:15; hele validator-/QA-/artifactjobbet sluttede på 7:45.
- **ISSUE-NATIONAL-RAW-ARTIFACT-DOWNLOAD-SCALE – LØST I #2033:** Det private råartifact er 413 MB komprimeret. #2033 bevarede råbeviset og uploadede samtidig et separat kompakt 6,8 MB artifact med plan, manifest og begge 208-zone-QA-filer.
- **ISSUE-NATIONAL-GEOMETRY-SOURCE-ACQUISITION – PRIVAT CI-VERIFICERET I #2029/#2033:** Den central-hydrerede nationale kæde bestod med 208 zoner, 100 fliser, komplette eksponerede lag, deduplikering, credentialgate og rumligt indekseret QA. 4.0.146 bygger næste read-only havn-/å-/fjord-/relevanstopologiaudit.
- **ISSUE-NATIONAL-SOURCE-QA-WIDESPREAD-CONFLICTS – AKTIV:** Det kompakte #2033-artifact viser kun 20 source-reference-ready zoner og 188 flaggede; 167 har under 80 % nærhed, 123 har afstand over 1 km, 73 er stærkt fragmenterede, og 46 har central-admin-konflikt. Blind snapping er derfor eksplicit forkastet; topologi, semantik og partition skal behandles før delgenerering.
- **ISSUE-NATIONAL-RIVER-MOUTH-OVERSEGMENTATION – MÅLT I #2037 / MASKER TILBAGEHOLDES I 4.0.147:** Den første nationale regel målte 2.868 klynger i 180 zoner, heraf 189 ved Falster/Nysted. Det kan ikke kaldes dokumenterede åmundinger. 4.0.147 anvender ingen åmaske i zoner over 20 klynger, markerer no-go og eksporterer egenskabsprofil/diagnostik til næste regelrevision.
- **ISSUE-NATIONAL-RIVER-WIDTH-FILTER – PRIVAT CI-VERIFICERET I #2043:** Filteret reducerede åklynger fra 2.868 til 489 og overdense zoner fra 45 til én kendt partitionskonflikt. Ingen no-go-maske blev anvendt; den resterende zone fortsætter som eksplicit redesignreview.
- **ISSUE-NATIONAL-COASTAL-PART-FRAGMENTATION – OPDELING CI-VERIFICERET I #2107 / PUNKTER AFVENTER:** 755 dele blev dannet uden forbindelsesgeometri; 28 grove dele er erstattet af 56 lokale forslag på højst 19,882 km. Den endelige private bestand er 783 dele med officielle navneforslag til 783/783 i 4.0.154. Lokale land-/vandpunkter og DMI-kæder er fortsat fail-closed.
- **ISSUE-ZONE-GEOMETRY-NATIONAL-CONSISTENCY – AKTIV:** Det aktuelle register indeholder geografisk misvisende navne/placeringer, utilsigtede overlap og mange kystlinjer, der fortsat bygger på ældre AI-/fallbackgeometri. Integritetstests beviser propagation, men ikke en korrekt national kystpartition.
- **ISSUE-MULTI-ANCHOR-SAMPLING-GAP – AKTIV / DMI-GRIDGATE 4.0.158:** 774 valgte vandpunkter har mindst én komplet native havmodelfamilie; 22 mangler enten WAM eller DKSS og må ikke fremstilles som fuldt dækkede. Ni geometriske dele er fortsat blokeret. Ingen må markedsføres som forskellig lokal vind/strøm, før sampling og provenance er implementeret pr. kystdel.
- **ISSUE-NATIONAL-PART-SERIES-NOT-YET-SAMPLED – LØST PRIVAT I #2146 / IKKE AKTIVERET:** Alle 774 private serier og 1.526 tilgængelige familier bestod to native trin med komplet provenance. Resultatet er stadig kun QA; parent-zonerne er fortsat eneste runtime-sandhed.
- **ISSUE-NATIONAL-STATE-MISSING-CURRENT – CI-VERIFICERET GAB I #2152 / 4 DELE:** Fire WAM-only dele har ingen komplet DKSS-currentfamilie og kan derfor ikke få lokal `shadow-v2`-state. De skal vises som manglende state og må ikke få parentfallback eller nulstrøm.
- **ISSUE-NATIONAL-PART-WIND-NOT-YET-VERIFIED – #2164 HARBO ODDE-CELLEGAB / #2167 GLOBAL RETRY FOR LANGSOM / 4.0.166 AFVENTER CI:** Global 32-cellesøgning for 774 dele blev stoppet efter 54 minutter. 4.0.166 bruger fire celler for alle og 32 kun som målrettet retry for faktiske gab; samme celle og eksisterende afstandsgrænse håndhæves fortsat.
- **ISSUE-NATIONAL-SHADOW-SCORE-NOT-YET-VERIFIED – 4.0.164 AFVENTER PRIVAT CI:** Den lokale gate bruger eksisterende RavScore på eksakt tidsfælles native data og klassificerer DEC-0033-dækning. Ingen score må aktiveres, før artifactet, UI-reviewet og admin-roundtrip/rollback er bestået.
- **ISSUE-OFFICIAL-PLACE-NAME-SERVICE-TRANSIENT-NONJSON – EKSTERN BLOKERING:** Tre forsøg på privat 4.0.159-rebuild (#2133, attempt 1–3) bestod geometri/topologi, men den officielle stednavnetjeneste returnerede ikke JSON. Gaten må ikke omgås med uofficielle eller stale navne; genkør når kilden er rask.
- **ISSUE-NATIONAL-MULTI-STEP-PARTS-SCOPE – LØST OG CI-VERIFICERET I #2146:** #2142 fandt, at `parts_by_id` ikke var defineret i flertrinsvalidatorens live-`run()`. 4.0.161 rettede scope og routing; #2146 bestod.
- **ISSUE-ZONE-ID-SEMANTIC-DRIFT – AKTIV:** Omdøbning eller flytning kan få et stabilt teknisk ID til at beskrive en ny geografisk strækning. Historik, observationer, regler og adaptive data kræver en eksplicit migrationsklassifikation.
- **ISSUE-FJORD-EXCLUSION-BOUNDARIES – AKTIV:** Kravet om at udelukke alle fjorde undtagen Limfjorden kræver dokumenterede grænser ved mundinger, sunde og tvivlsomme indre farvande; det kan ikke skjules i navnematch eller en generel bufferheuristik.
- **ISSUE-COASTAL-TRAP-EVIDENCE – PLANLAGT:** Høfder, læsider og andre lokale ravfælder kan være fagligt relevante, men deres scoreværdi er endnu ikke valideret og forbliver score-neutral under geometriarbejdet.
- **ISSUE-REPOSITORY-VS-CENTRAL-ZONE-COUNT – AKTIV:** Read-only v2-audit finder 209 aktive zoner i `data/zones.geojson`, mens den senest dokumenterede centrale produktionsbestand er 208 efter administratorsletning. Pilotgeneratoren skal anvende central hydrering/tombstones før forslag og må ikke genoplive en slettet zone.
- **ISSUE-GEODANMARK-FIRST-CI-PILOT – PRODUKTIONSVERIFICERET LØST:** #1936 hentede 21/21 komplette lag/område-udtræk i det private artifact. Seks krævede pagination; største udtræk havde 72.870 features. Adgang, lagvalg, pagination, råupload, maskering og isolation er verificeret. Forslagsgenerering er næste separate, fortsat score-neutrale fase.
- **ISSUE-GEOMETRY-PILOT-CONCURRENCY – PRODUKTIONSVERIFICERET LØST:** #1936 kørte i sin separate pilotgruppe samtidig med vejrproduktionsgruppen. Rutinevejr kan ikke længere erstatte eller afbryde piloten.
- **ISSUE-GEODANMARK-BLIND-SNAP-RISK – AKTIV:** Lokal 4.0.130-QA flaggede alle ni pilotzoner. Kystkilden indeholder flere bredder, øer og stærkt fragmenterede dele, mens enkelte eksisterende linjer er markant forskudte eller går på tværs af semantiske zonegrænser. Automatisk nærmeste-linje-snap må derfor ikke bruges; næste fase kræver klassificerede delstrækninger og eksplicit konfliktreview.
- **ISSUE-GEODANMARK-RAW-WATERCOURSE-OVERSEGMENTATION – LOKALT LØST / AFVENTER CI:** Første 4.0.132-prøve brugte begge vandløbskanter og midterlinjer og skabte 300 tekniske fragmenter med hundredvis af dubletter. Den frigives ikke. Løsningen bruger kun synlig, ikke-rørlagt midterlinje, kræver faktisk kystkontakt og indlandsfortsættelse, klynger dubletter og samler nærliggende fysiske fragmenter uden at opfinde forbindelsesgeometri. Samme artifact giver 84 private reviewforslag.
- **ISSUE-GEOMETRY-FJORD-POLICY-NOT-ENFORCED – LOKALT LØST / AFVENTER CI:** 4.0.132 beskrev fjordpolitikken, men havde ingen egentlig indre-vandpolygon. Visuelt review viste derfor kystdele i Nysted Nor og andre indre farvande. 4.0.133 henter officielle Farvand-GeoJSON-polygoner og udskærer `fjord`/`nor` uden for Limfjorden; pilotresultatet faldt fra 84 til 72 dele.
- **ISSUE-GEOMETRY-PILOT-ZONE-SEMANTICS – AKTIV OG GATED:** Zonekortene viser, at kun Blåvand er en lokal geometriopretning. Rømø og Askø/Lilleø er geografisk fejlplacerede; seks andre zoner kræver grænse-/partitionsredesign. Reviewgaten blokerer DMI-punktarbejde for disse otte, indtil nye semantiske afgrænsninger er dokumenteret.
- **ISSUE-BLAAVAND-DETAIL-PHYSICAL-VALIDATION – ORTOFOTO OG DMI-GRID LØST PRIVAT:** #1982 godkendte linjen mod officielt 2025-ortofoto. #1987 bekræftede gyldige WAM-/DKSS-celler, fælles current-U/V-lag og forskellige celler mellem begge vandpunkter. Dette er ikke i sig selv tilladelse til selvstændig sampling, admin-roundtrip eller aktivering.
- **ISSUE-BLAAVAND-INDEPENDENT-WEATHER-SERIES – PRIVAT FLERTID OG PROVENIENS LØST / INTEGRATION ÅBEN:** #1997 beviser fire fælles komplette native tider pr. del med fuld komponentproveniens, forskellige celler og nul krydsmerge/fallback. Separat state/historik, UI og admin-roundtrip er fortsat åbne; ingen serie er aktiveret.
- **ISSUE-COASTAL-PART-CROSS-MERGE – AFDÆKKET / KONTRAKTBLOKERET OG CI-VERIFICERET I #1992:** Den nuværende multi-anker-score sammenholder én zones vejrværdi med flere kystretninger. Hvis separate partdata blev koblet direkte på, kunne nordlig vejrsampling blive vurderet mod sydøstlig kyst og omvendt. Shadow-kontrakten forbyder derfor krydsmerge og part-score, indtil partidentitet følger hele kæden.
- **ISSUE-COASTAL-PART-HISTORY-COLLISION – PRIVAT ISOLATION LØST I #2004 / INTEGRATION IKKE AKTIVERET:** Produktionens historik slås op ved zone-ID. #2004 beviser, at private dele kan replayes med unikke `historyKey`-nøgler uden parent-genbrug, krydslæsning eller scorepåvirkning. En fremtidig produktionsintegration kræver stadig UI/admin/rollback/go-no-go.
- **ISSUE-COASTAL-PART-UI-ACTIVE-ZONE-AMBIGUITY – PRIVAT KONTRAKTBLOKERET OG CI-VERIFICERET I #2009 / INTEGRATION LUKKET:** Artifactet beviser én aktiv parent og to neutrale ikke-interaktive dele uden scorefarve, rangering eller “bedste del”. Offentlig integration og aktivering er fortsat lukket; næste sikkerhedsgate er admin-roundtrip/rollback.
- **ISSUE-COASTAL-PART-ADMIN-ROLLBACK – PRIVAT LØST OG CI-VERIFICERET I #2014 / AKTIVERING LUKKET:** Tempkladden blev slettet og verificeret fraværende; begge autoritative dokumenter beholdt identiske digests og versioner. Dette giver ikke aktiveringstilladelse; eksplicit ejer-go/no-go mangler.
- **ISSUE-BLAAVAND-HUK-HAIRPIN – LØST OG ORTOFOTOVERIFICERET I #1982:** 4.0.136 måler den afviste rute/chord-ratio, bevarer det søværts apex og genforener kysten efter den indadgående detur. #1982 viser, at den grønne relevante strandlinje springer lagune-/sandspidsomvejen over og ligger på sand/landsiden. 242,0 m detur fjernes uden sampling eller scoreændring.
- **ISSUE-OFFICIAL-PLACE-API-LIFECYCLE – OVERVÅGES / NATIONAL ADAPTER I 4.0.151:** Dataforsyningens nøglefri `steder`-API giver officiel stednavnegeografi, men DAWA er varslet til fremtidig lukning. 4.0.151 isolerer endpoint, kildefelter, flise-/requestspor og fail-closed validering; udfald må ikke udløse uofficiel fallback eller automatisk genbrug af gamle zonenavne.
- **ISSUE-PILOT-RENDER-DEPENDENCY-LEAK – RETTET I 4.0.131, AFVENTER CI:** #1942/#1943 stoppede almindelig fuld validering, fordi den private kort-renderers globale Pillow-import lækkede ind i produktions-self-testen. Importen er flyttet efter self-testen og kræves kun ved faktisk privat rendering; regressionstesten fastholder isolationen.

## 4.0.124 – komponenthuller og manglende timeproveniens
- **ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID – PRODUKTIONSVERIFICERET LØST:** Bredere kandidatsøgning lukkede tre zoner; centrale adminrettelser lukkede Nibe/Sebbersund og Falster/Nysted. Alle fem har nu direkte DKSS-vindhale.
- **ISSUE-COMPONENT-FIVE-DAY-COVERAGE – AKTIV:** Seneste snapshot havde 3 Limfjordszoner helt uden bølger, 13 med 117 bølgetimer og 8 med kun 101 timer for strøm, vandstand og vandtemperatur. Missing bevares korrekt og må ikke skjules med nul eller stale værdier.
- **ISSUE-HOURLY-DMI-PROVENANCE – AKTIV:** Timekæden bevarer ikke endnu collection, model-run, lead time og prognosealder komplet fra STAC/GRIB til conditions. 4.0.124 måler tabet; næste designfase skal bevare rå identitet frem for at rekonstruere den efterfølgende.

## 4.0.123 – fem direkte DKSS-U/V-huller
`ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID` er rettet i søgebredden, men ikke endnu lukket i produktion. #1851 og #1852 bekræftede samme fem huller trods komplet offentlig fallbackvind. Fire er Limfjordszoner med centralt gemte adminpunkter; den femte ligger ved Falster/Nysted. 4.0.123 undersøger flere marine landmaskeceller og rapporterer vindhalepar særskilt. Først en frisk produktionskørsel kan vise, om hullerne skyldtes kandidatloftet eller reel manglende DKSS-dækning inden for afstandsgrænsen.

## 4.0.122 – offentlig vindhale verificeret
`ISSUE-DMI-FIRST-FIVE-DAY-CHAIN` er delvist afklaret i produktion: #1845 leverede 208/208 zoner med 118 sammenhængende offentlige vindtimer og grønne gates/deploy. `ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID` er fortsat afgrænset til provenance-spørgsmålet; offentlig fallbackdækning er ikke det samme som direkte DMI-gridbevis.

## Løst i 4.0.121 – historiske diagnostikworkflows
**Status:** LØST

`schedule-test.yml` målte tidligere GitHubs interne schedule-adfærd, og `pages-microtest.yml` kunne manuelt publicere en minimal testside. Ingen af dem indgik længere i aktiv test, release eller recovery. De er fjernet, fordi især mikrotesten kunne konkurrere med produktionsdeployet om `github-pages`-miljøet. En kontrakttest fastholder nu kun `update-and-deploy.yml` som repository-ejet workflow.

## Høj prioritet
1. **ISSUE-STATION-CACHE-STATUS – PLANLAGT:** Stationslivscyklus skelner endnu ikke fuldt mellem observation og gyldig prognosecache.
2. **ISSUE-HANDBOOK-EVIDENCE – LØBENDE:** Flere faglige antagelser om rav og sedimenttransport kræver ekstern ekspertvalidering.
3. **ISSUE-DMI-FIRST-FIVE-DAY-CHAIN – P1 ANALYSE PLANLAGT:** Komponenternes DMI-horisont kan være kortere end hele brugerprognosen. DEC-0030 kræver separat kildekortlægning og cirka 120-timers kædedesign pr. komponent: DMI til sidste valide time, eventuel anden DMI-kilde og kun derefter ekstern hale-fallback med fuld proveniens. Ingen produktionsændring før analysen.
4. **ISSUE-WATERLEVEL-CONTINUITY – OVERVÅGES:** Kunstige spring må ikke genopstå ved kildeskift; Vadehavet skal vurderes særskilt.
5. **ISSUE-STATION-OFFICIAL-AUDIT – DELVIST LØST I 4.0.103:** OceanObs-målestationer og `tidewaterstation`-prognosepunkter opdages fra deres dokumenterede collections og skrives til en samlet audit. Første produktion skal bekræfte antal, horisont og Hals-punkternes faktiske data.

## 4.0.120 – offentlig fallbackhale
- **ISSUE-WATER-ROUTING-DROPS-FALLBACK – RETTET LOKALT:** Vandstandsroutingen overskrev hele den offentlige blandede prognose med den rene DMI-cache. Routing opdaterer nu vandstand separat i begge serier og bevarer alle andre offentlige komponenter.
- **ISSUE-OPEN-METEO-CALENDAR-DAY-HORIZON – RETTET LOKALT:** `forecast_days=5` startede ved midnat og gav kun cirka 110 fremtidige timer ved en kørsel kl. 10. Fallback bruger nu `forecast_hours=120`.
- **ISSUE-FIVE-ZONES-NO-SHARED-DKSS-GRID – AFGRÆNSET:** Fem navngivne zoner havde ingen fælles gyldigt DKSS U/V-punkt i #1835-supportdata. Direkte DMI-havdata forbliver `missing`; afventer frisk produktionsbevis for fallbackhalen.

## Produkt og admin
6. **ISSUE-RULE-USABILITY – DELVIST:** Regelbyggerens fulde menneskevenlige workflow og konfliktforklaring skal løbende verificeres i browseren.
7. **ISSUE-COASTLINE-EDITOR – RETTET I 4.0.90, OVERVÅGES:** Søgning, zonevalg, omdøbning og central gemning er samlet i én brugerrejse. Mobil browsertest og rollback overvåges fortsat.
8. **ISSUE-CENTRAL-STORAGE – DELVIST:** Supabase-opsætning og rettigheder kræver fortsat driftsverifikation.
9. **ISSUE-SUPABASE-FREE-QUOTA – RODÅRSAG OG DATABASE RETTET I 4.0.153 / EGRESS-MÅLING AFVENTER:** Alle centrale payloads blev hentet hvert 15. minut, og store maskindiagnostikker fik ubegrænset versionshistorik. 4.0.153 filtrerer readback og gør uploads idempotente. Central oprydning 2026-08-10 fjernede 8.647 historikrækker/cirka 600 MB og reducerede databasen fra 699 MB til 24 MB uden tab af aktuelle dokumenter. Fair-use-status lukkes efter næste billingperiodes egressmåling.

## Historiske problemer, der ikke må genindføres
- Timevis DMI/Open-Meteo-pendlen.
- Global 180°-vending som hurtigfix uden lokal geometri-audit.
- Afstandsbaseret stationsvalg uden kysttopologi og datastatus.
- Fjernelse af kendte stationer, fordi én kørsel mangler observationer.
- Genindførelse af brede førstegenerationszoner.
- Implementering af funktioner alene fordi de blev diskuteret teoretisk.

## Senest løst, kræver produktionsbekræftelse
- **ISSUE-PUBLIC-FORECAST-MAIN-THREAD – RETTET I 4.0.83, AFVENTER PRODUKTIONSBEKRÆFTELSE:** Dagens rangliste kunne ikke males, fordi 5-dages landsberegningen blokerede browserens hovedtråd synkront. Beregningen er nu opdelt og giver løbende browseren kontrollen tilbage.

## Løst i 4.0.85 – afrundingsinkonsistent strømvektor
**Status:** LØST

4.0.84 kunne gemme afrundet u/v, men beregne retning og hastighed fra uafrundede værdier. Det kunne påvirke audit og RavScore tæt på retningsgrænser. 4.0.85 bruger én kanonisk lagret vektor i hele kæden.

## Løst i 4.0.86 – funktioner uden synlig brugerrejse
**Status:** LØST

Reviewkøen fandtes kun i en parallel/inaktiv adminimplementering, mens den aktive admin kunne indsende reviews uden at ejeren kunne finde dem igen. Samme audit afdækkede manglende håndtering af lokale nødkladder, et tomt dokumentationscenter og uklar lokal virkning af model-forslag. Den aktive admin og sitetesten kontrollerer nu hele brugerrejsen.

## Løst i 4.0.87 – manglende kortpile, admin-kortrace og blandet modulcache
**Status:** LØST, AFVENTER PRODUKTIONSBEKRÆFTELSE

Pileinstallationen var gjort afhængig af browserens idle-callback uden runtimekontrol. Samtidig kunne retningskortets forsinkede Leaflet-start køre efter faneskift, og aktive browserimports bar flere ældre versionsparametre. 4.0.87 gør pileinstallationen deterministisk efter de centrale visninger, beskytter kortcontainerens livscyklus og kræver én releaseversion gennem hele importgrafen.

## Løst i 4.0.96 – vandstandsstationsfanen
- `stationDeliveryLabel` stoppede kortinitialisering for zoner med gemt override. Løst ved at bruge de aktive observations-, cache- og anvendelighedslabels.
- Beskyttet stationsstatus blev ikke hydreret fra Supabase og kunne blive forringet til ukendt/utilgængelig. Løst med central readback og ikke-destruktiv merge.


## Løst i 4.0.103 – supporteksponering og uens afstandsvægte
**Status:** LØST I KODE, AFVENTER GITHUB-BEKRÆFTELSE

Pages-buildet udelukker nu både `_support/` og support-ZIP. Automatisk routing og administratoroverride anvender samme reelle geografiske afstand til vægtning, mens topologien fortsat bestemmer kandidatvalget. Det fejlagtige plurale prognosepunkt-endpoint er erstattet af DMI's dokumenterede `tidewaterstation`-collection.

## Løst i 4.0.104 – administratorvalg og næsten konstant 0 cm
Status: **LØST, AFVENTER PRODUKTIONSVERIFIKATION**

Første valg i en zone uden routingpost blev tidligere foretaget i et løsrevet midlertidigt objekt. Samtidig kunne manglende prognoseværdier (`null`) blive konverteret til 0 og skabe en falsk nulserie. Begge rodårsager er rettet og dækket af regressionstest. Første GitHub-kørsel skal bekræfte varierede femdøgnsværdier og rødt aktivt administratorvalg i produktionen.

## Løst i 4.0.105 – forsinkede administratorvalg og døde knapper
**Status:** LØST I KODE, AFVENTER PRODUKTIONSBEKRÆFTELSE

Vandstandsfanen kunne tidligere blive vist med automatisk routing, mens central routing stadig ventede bag en stor samlet admininitialisering. Når Supabase-data senere ankom, blev tilstanden og DOM'en erstattet, så røde valg kom flere minutter for sent, og et klik på “Fjern” kunne blive overskrevet. 4.0.105 indlæser de tre nødvendige vandstandsdele først og holder fanen ikke-klikbar, indtil den endelige centrale routing er klar.

- 4.0.105 kunne fylde localStorage med store Supabase-dokumenter og udløse QuotaExceededError. Rodårsagen er rettet i 4.0.106 og produktionsbekræftet af ejer i den efterfølgende drift.

- 4.0.109 kunne fejle, fordi HARMONIE brugte næsten hele bulkbudgettet før DKSS. Rettet i 4.0.110 ved marine-first recovery; afventer produktionsverifikation.


## Overvåges fra 4.0.112
- **ISSUE-WORKFLOW-DURATION – AKTIV:** Deploy/Update-jobbet kan vare omkring 14 minutter og dermed overlappe et 10-minutters interval. Profilér collection- og trinforbrug, cachegenbrug og uændrede GRIB-assets. Auditkrav og marine dækning må ikke svækkes som genvej.
- **ISSUE-SITETEST-DASHBOARD-TIMING – RETTET I 4.0.112:** Sitetesten kunne kontrollere dashboardknappen efter admin-ready, men mens en anden fane stadig var aktiv. Den skifter nu eksplicit til dashboard og venter på en synlig, klikbar knap.
- **ISSUE-STATE-SHADOW-VALIDATION – AKTIV:** Tilstandsfelterne skal valideres over flere produktionstimer på de faste referencezoner, før de får numerisk scorevirkning.

## 4.0.113 – workflowcache og scheduler
- **ISSUE-DMI-CACHE-IMMUTABLE-KEY – RETTET I 4.0.113, AFVENTER PRODUKTIONSBEKRÆFTELSE:** Fem kørsler gendannede samme ugentlige primærnøgle og gemte derfor ikke ny rå GRIB-fremdrift. Workflowet bruger nu separat restore/save og unik save-nøgle.
- **ISSUE-WORKFLOW-DURATION – FORTSAT AKTIV:** De målte 12–15 minutter kan være kunstigt forhøjede af cachefejlen. Cron ændres ikke før nye målinger.
- **ISSUE-STATE-SHADOW-VALIDATION – FORBEDRET, FORTSAT AKTIV:** Hver frisk produktion logger nu datasætbundne referencefelter og håndhæver streng tilstedeværelse. Faglig stabilitet over flere timer skal stadig bekræftes.

## 4.0.114 – Pages-deploy og workflowkø
- **ISSUE-PAGES-DEPLOY-QUEUED – PRODUKTIONSBEKRÆFTET LØST/AFGRÆNSET I 4.0.114:** Flere selvstændige kørsler byggede og uploadede et gyldigt Pages-artifact, men GitHub Pages blev stående i `deployment_queued` til timeout. Build/data og deploy er nu adskilt, og kun deployjobbet ejer `github-pages`-miljøet. Et fejlet deploy kan genkøres uden ny DMI-kørsel.
- **ISSUE-WORKFLOW-QUEUE-PRIORITY – DELVIST RETTET I 4.0.114:** Push og tvungne manuelle releasekørsler må afbryde en ældre almindelig vejropdatering. Almindelige 10-minutters kald afbryder ikke den aktive kørsel. Den faktiske køadfærd og cronintervallet skal stadig måles i produktion.


## 4.0.115 – historisk strømproveniens
- **ISSUE-STATE-PRE-PROVENANCE – RETTET I 4.0.115, AFVENTER PRODUKTIONSBEKRÆFTELSE:** Historiske transportfelter blev tidligere beregnet før den endelige DMI-proveniensberigelse. Nu genberegnes de efter provenance, og kun verificerede DMI-prøver tæller.
- **ISSUE-STATE-DURATION-SEMANTICS – RETTET I 4.0.115:** Akkumulerede timer kunne fejltolkes som ét ubrudt forløb. Nye aktive-regimefelter beskriver det sammenhængende forløb særskilt.


## 4.0.116 – DMI U/V-grid og manglende femdøgnsfelter
- **ISSUE-DMI-UV-GRID-MISMATCH – RODÅRSAG FUNDET, RETTET LOKALT I 4.0.116:** 4.0.115 blev stoppet, fordi bulk-parseren kunne vælge nærmeste gyldige `current-u` og `current-v` separat. Forskellige masker kunne dermed danne en fysisk falsk vektor. 4.0.116 kræver nærmeste fælles fysiske punkt og invaliderer gamle mismatch-par. Afventer CI/produktion.
- **ISSUE-WATER-SOURCE-COVERAGE-INFLATION – RETTET LOKALT I 4.0.116:** `SOURCE::`-vandstandspunkter blev talt med som almindelige zoner i komponentdækning og sampled unødigt for andre parametre. Det kunne holde marine recovery aktiv og bruge tidsbudget, som ellers kunne nå vind/bølger. Afventer CI-måling.
- **ISSUE-FIVE-DAY-WIND-WAVE-ZERO – DELVIST RODÅRSAG FUNDET, RETTET LOKALT I 4.0.116:** JavaScript-konvertering kunne gøre `null` til 0, så manglende vind/bølge blev vist og delvist behandlet som fysisk nul. 4.0.116 gør kæden null-sikker. Produktion skal stadig afgøre, om der bagefter findes reelle kildedatamangler i bestemte timer/zoner.
- **ISSUE-WORKFLOW-DURATION – FORTSAT AKTIV:** Eksternt cron-job er nu 15 minutter. DMI-workload skal måles efter fjernelse af unødige `SOURCE::`-opslag; marine audits må ikke svækkes.

## 4.0.117 – schedulerens aktive zoner og DMI-vind
- **ISSUE-DMI-SCHEDULER-CACHE-DENOMINATOR – RETTET LOKALT I 4.0.117:** Schedulerens dækning kunne bruge zonerne i den gamle bulkcache som nævner og dermed overse nye aktive zoner uden cache. Nævneren er nu altid det aktuelle aktive zoneregister.
- **ISSUE-DMI-WIND-FAMILY-NAME – RETTET LOKALT I 4.0.117:** HARMONIE er familien `wind`, men schedulerens gamle mangeltabel brugte `atmosphere`. Reelt manglende DMI-vind kunne derfor få nul deficit. Familienavnet er nu konsistent gennem prioriteringen.
- **ISSUE-FORECAST-HORIZON-WIND-WAVE – FORTSAT AKTIV:** 4.0.116 fjernede falsk `null -> 0`; 4.0.117 retter dokumenteret schedulerudsultning. #1785 viste, at HARMONIEs native horisont er cirka 60 timer, så vind skal måles ved 24/48 timer, mens bølger og marine data fortsat måles ved 24/96 timer. Store HARMONIE-assets og runtime/downloadbudget forbliver et separat målepunkt.

## 4.0.117 hotfix – DKSS-modeludsultning under marine recovery
- **ISSUE-DKSS-GEOGRAPHIC-RECOVERY-ORDER – RETTET LOKALT I 4.0.117-HOTFIX:** 4.0.117 kunne registrere et marinegrundlagsgab uden at prioritere den DKSS-model, der geografisk dækkede de manglende zoner. Med to produktive collections kunne Limfjordsmodellen derfor blive stående som nummer tre, og strømauditten fejlede på aktive zoner uden bulkgrundlag. Schedulerprioriteten er nu datagabs- og kysttypebaseret. Afventer CI/produktion.
- **ISSUE-LIMFJORD-UV-SEARCH-RADIUS – DIAGNOSEN VAR UTILSTRÆKKELIG:** #1738 viste korrekt `NO_SHARED_UV_GRID_POINT`, og søgefladen blev udvidet uden at hæve 24-km-grænsen. Senere frisk CI viste, at dette ikke var den egentlige årsag til de tre tilbagevendende Limfjordsudfald.
- **ISSUE-DMI-UV-VERTICAL-LAYER-OVERWRITE – RETTET LOKALT, AFVENTER PRODUKTION:** DMI DKSS leverer strøm-U/V i flere vertikallag. Parserens kandidatcache var kun nøglebundet til familie+zone, så et senere/dybere U-lag kunne overskrive et lavere gyldigt U-lag før tilsvarende V blev behandlet. Lavvandede zoner kunne dermed ende uden vektor. Cache og parring er nu lag-isoleret, dybeste gyldige fælles lag vælges deterministisk, og parserversion 11 tvinger genbehandling.

## 4.0.117 – produktionsafslutning og Codex-overgang
- **ISSUE-DKSS-GEOGRAPHIC-RECOVERY-ORDER – PRODUKTIONSVERIFICERET LØST:** Efter de tidligere fejl er DKSS-recovery kørt succesfuldt i efterfølgende 4.0.117-produktioner. Bevar regressionstesten, men behandl ikke issue som åbent.
- **ISSUE-DMI-UV-VERTICAL-LAYER-OVERWRITE – PRODUKTIONSVERIFICERET LØST I 4.0.117:** Parsergeneration 11 isolerer U/V-kandidater pr. vertikallag. Efterfølgende friske 4.0.117-kørsler er grønne. Den tidligere radiusforklaring er historisk og må ikke genindføres som rodårsag.
- **ISSUE-ADMIN-ZONE-GEOMETRY-PROPAGATION – PRODUKTIONSVERIFICERET FOR SENESTE RETTELSER:** Tre Limfjordszoner havde reelt forkert land-/havpunkt og kystlinje. Administratoren rettede dem centralt; #1750 viste dem som ændrede og førte dem gennem den friske produktionskæde. Fremtidige tests skal beskytte propagation, ikke gamle koordinater.
- **ISSUE-FORECAST-EDGE-COVERAGE – RODÅRSAG FUNDET, RETTET LOKALT:** #1774 viste, at problemet ikke kun lå ved yderste kant: vind manglede helt i 187/208 zoner og bølger i 33/208. Samtidig havde 203/208 mindst 96 timers marinegrundlag. Binær `marineFoundationMissing` gav fortsat begge produktive pladser til DKSS og udsultede HARMONIE. Balanceret recovery efter 95 % marinegrundlag bevarer én DKSS-plads og åbner én plads for den mest underdækkede vind-/bølgefamilie. Afventer frisk produktion; ingen stale udfyldning eller nulkonvertering er indført.
- **ISSUE-HARMONIE-EXPIRED-ASSET-BUDGET – RETTET LOKALT EFTER #1778/#1779:** Schedulerrettelsen blev produktionsbekræftet, men #1778 brugte 1,74 GB på de tre ældste HARMONIE-assets med valid-tider 18–20 UTC, som allerede var udløbet ved generering 22:13 UTC. #1779 genbrugte dem og nåede frem til 23 UTC; offentlig vind steg fra 21 til 199 zoner med mindst noget data, men femdøgnshorisonten var endnu ikke genopbygget. Nye bulk-kørsler springer nu forecasttrin ældre end én time over, så downloadbudgettet starter ved den aktuelle forecastkant. Ingen fremtidige trin springes over, og progressiv cache bevares.
- **ISSUE-HARMONIE-PARTIAL-RUN-RESET – PRODUKTIONSVERIFICERET LØST I #1788:** #1785 valgte 18Z frem for den kortere 21Z-publikation. #1788 beviste den kildespecifikke 48-timersregel i drift: 18Z blev fastholdt, fire assets blev genbrugt, og den progressive serie voksede fra fire til syv tider; fulde gates og deploy bestod. Marine samlinger beholder 96 timer. Regression og diagnostik bevares.
- **ISSUE-DOCUMENTATION-DRIFT-BEFORE-CODEX – RETTET I HANDOFF:** `05_NEXT_CHAT_HANDOFF.md` og flere statusdokumenter beskrev en ældre 4.0.114–4.0.116-baseline. De er opdateret til 4.0.117, og en dedikeret Codex-pakke er gjort obligatorisk.
- **LOCAL-SNAPSHOT-CURRENT-PROVENANCE-WARNINGS – OBSERVATION VED HANDOFF:** Den lokale 4.0.117-pakke består fuld validering, men spatial-auditten giver 12 warnings for manglende dokumenteret current-gridproveniens i det medfølgende datasnapshot. Dette er ikke i sig selv en frisk produktionsfailure. Ved analyse skal snapshotets alder holdes op mod #1750 og nyere produktioner.

## 2026-08-07 – Bulk-zone-struktur efter dynamiske adminzoner
- **Fundet i produktion:** Strømaudit fejlede for Fur syd, Gjøl og Attrup, Aalborg vest og Egholm, Aalborg øst og Nørresundby samt Falster vest og Nysted Nor munding, selv om central weather-cache rapporterede `OK ... via mixed`.
- **Rodårsag:** `update-dmi-bulk.py` oprettede kun zoneposter, når et DMI-felt blev fundet eller en gammel bulkpost fandtes. En aktiv zone uden direkte bulk-hit kunne derfor forsvinde helt fra bulkstrukturen.
- **Rettet i Codex-handoff-kandidaten:** Bulk-builderen materialiserer nu hele den aktuelle zone-/kilderegistrering før DMI-felter flettes ind og filtrerer gamle bulkposter mod den aktuelle registrering. Missing forbliver missing; ingen nuldata eller stale data indføres.
- **Validering:** `npm run validate` og `npm run release:gate` består lokalt. Produktionsverifikation kræver næste friske GitHub/DMI-kørsel efter upload.

- **ISSUE-WORKFLOW-FALSE-GREEN-DEPLOY – PRODUKTIONSVERIFICERET LØST I #1772:** Bypasset blev lukket ved at lade gates følge enhver positiv preflight. #1769 beviste korrekt stop før artifact ved rød validate; #1772 beviste begge gates, artifact og Pages-deploy som `success` i samme friske run.
- **TRANSITION-NOTE – ERSTATTET:** Pre-Codex bootstrap-undtagelsen er ophørt i kode. Den bevares kun som historisk forklaring.
- **ISSUE-BULK-EMPTY-ACTIVE-ZONES – PRODUKTIONSVERIFICERET LØST I #1772:** #1769 afslørede, at `clean_and_summarize` slettede aktive records med tom `hourly`. Tomme records bevares nu som eksplicit `missing`; #1772 bestod den fulde spatial-audit uden stale data eller nuludfyldning.

## 4.0.118 – DMI-first vindhale
- **ISSUE-FIVE-DAY-DMI-WIND-TAIL – RETTET LOKALT, AFVENTER PRODUKTION:** DKSS' dokumenterede 10-meter U/V-vind udtrækkes nu som en separat hale efter HARMONIE. Modelserier blandes ikke, og HARMONIE vinder i overlap. En frisk kørsel skal bevise feltgenkendelse, zonehorisont, kildeskift og fulde release-gates.
- **ISSUE-OPEN-METEO-LOCAL-TIME-AMBIGUITY – RETTET LOKALT, AFVENTER PRODUKTION:** Fallback blev forespurgt med `Europe/Copenhagen` og leverede offsetløse tider. Kaldet bruger nu GMT, og tider lagres eksplicit som UTC.
- **ISSUE-FIVE-DAY-PER-HOUR-PROVENANCE – RETTET LOKALT I 4.0.125, AFVENTER PRODUKTION:** Collection, model-run og native gyldighedstid gemmes nu ved STAC/GRIB-indlæsningen og føres til alle DMI-komponenttimer med lead time, prognosealder og temporal status. Parsergeneration 14 skal genopbygge produktionens cache og auditten skal bekræfte, at felterne er komplette.

## 4.0.119 – produktionsbevist DKSS-parserfejl
- **ISSUE-DKSS-WIND-TAIL-V-DROPPED – PRODUKTIONSVERIFICERET LØST I #1831:** #1828 beviste, at DKSS-id 34 blev fejlfortolket som `sst` og forkastet som tvetydigt. #1831 genkendte begge U/V-felter, gav vindhale i 107 zoner med mindst 96 timer og gennemførte fulde gates/deploy. Det offentlige datasæt havde 108/208 zoner med mindst 96 timers samlet vind og maksimum 111,5 timer.
