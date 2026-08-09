# Kystgeometri v2 – kilde- og adgangsaudit

**Status:** Aktiv pilotforberedelse
**Beslutning:** DEC-0032
**Produktionsvirkning:** Ingen

## Verificeret primær kandidat
GeoDanmarks objekttype `Kyst` er defineret som grænsen mellem hav og land. Geometrien er en kurve i EPSG:25832, og modellen har bitemporal historik. Data udstilles via GeoDanmark Vektor WFS og filudtræk.

- Objektkatalog: <https://grunddatamodel.datafordeler.dk/objekttypekatalog/GeoDanmark/Hydro/Kyst.html>
- Aktuel entitets-WFS: <https://datafordeler.dk/dataoversigt/geodanmark-vektor/geodanmark-vektor-wfs-entiteter/>
- WFS-base: `https://wfs.datafordeler.dk/GEODKV/GEODKV_WFS/1.0.0/WFS?`
- Format: GeoJSON eller GML.
- Adgang: API-key eller OAuth fra et registreret IT-system på Datafordeleren.
- Koordinatreferencesystem: EPSG:25832; RavRadars public/admin-geometri skal transformeres dokumenteret til WGS84/EPSG:4326.

GeoDanmark beskriver data som frie grunddata, der ajourføres løbende ud fra landsdækkende forårsortofoto og kommunale udpegninger. Én region totalajourføres årligt. Det betyder, at `Kyst` er en langt stærkere reproducerbar grundreference end den nuværende OSM-100m/ældre AI-fallback, men ikke at enhver strækning er optaget samme år.

- Vedligeholdelse: <https://admin.klimadatastyrelsen.dk/kortlaegning/geodanmark>
- Licensvilkår: <https://www.klimadatastyrelsen.dk/om-klimadatastyrelsen/vilkaar-og-priser>

Frie GeoDanmark-data hentet fra og med 16. maj 2024 er under CC BY 4.0. RavRadar skal kreditere GeoDanmark/Klimadatastyrelsen passende og gemme kilde-, hentetids- og licensmetadata sammen med pilotens generationsmanifest.

## Supplerende objekter
Dataoversigten bekræfter særskilte GeoDanmark-objekter for blandt andet `Havn`, `Høfde`, `Vandløbskant`, `Vandløbsmidte`, `SandKlit` og `Skrænt`. De kan bruges til klassifikation og review:

- `Havn` og vandløbsobjekter kan hjælpe med dokumenterede spring i ravstrandlinjen.
- `Høfde` kan registreres som en score-neutral mulig ravfælde efter DEC-0032.
- `SandKlit` og `Skrænt` kan bruges som kontrolsignaler, men er ikke i sig selv bevis for en tilgængelig ravstrand.

Ingen af objekterne må automatisk ændre RavScore.

## Adgangstilstand
Repositoryet har nu den task-relevante GitHub Actions-secret `DATAFORDELER_API_KEY`. Dens værdi er ikke læsbar i repositoryet eller lokalt og må aldrig sendes i chat, kode, log, dokumentation, diagnostics eller artifact. Et isoleret manuelt `geometry-v2-pilot`-job bruger den kun som procesmiljøvariabel. #1931 bekræftede fungerende secret-injektion, maskering, capabilities og faktiske featureudtræk fra syv aktuelle lag. Den aktuelle entitets-WFS bruger `_current` for aktuelle bitemporale objekter og `_hist` for historik; RavRadar vælger kun det præcise aktuelle lag. Flere maskelag ramte 10.000 features, så 4.0.128 paginerer og kræver dokumenteret komplethed før anvendelse.

#1936 lukkede komplethedsgaten: alle 21 kombinationer af syv lag og tre områder havde `complete=true` og samme `featureCount` som `sourceNumberMatched`. Seks kombinationer krævede 2–8 sider; maksimum var 72.870 features. Artifactet indeholdt alle 21 rå GeoJSON-filer og var cirka 341 MB. Denne evidens godkender kilden til parallel analyse, ikke automatisk zoneaktivering.

#1941 produktionsverificerede 4.0.130-kæden på den centralt hydrerede pilotbestand: source-QA, tre private kort og privat artifact blev genereret, mens build og Pages var sprunget over. Alle ni zoner blev flagget til review; blind snapping er derfor forkastet.

Den ældre generelle GeoDanmark WFS/fildownload er markeret til udfasning i 2026. Piloten skal anvende den aktuelle entitetsbaserede WFS eller en anden dokumenteret aktuel distributionsvej, ikke bygge ny afhængighed på den udgående tjeneste.

## Autoritativ stednavnekilde
Dataforsyningens offentlige `steder`-API udstiller steder fra Danmarks officielle stednavneregister med primærnavn, navnestatus, type, geometri og visuelt center. Geografisk afgrænsning kan ske med polygon og kræver ingen autentifikation. 4.0.131 bruger kun afgrænsede pilotpolygoner og hovedtyperne bebyggelse, farvand, landskabsform, naturareal og havnebassin.

- Officiel API-dokumentation: <https://dawadocs.dataforsyningen.dk/dok/api/sted>
- Endpoint: `https://api.dataforsyningen.dk/steder`
- Adgang: offentlig og nøglefri.
- Anvendelse: kandidater og navne-/placeringsaudit, aldrig automatisk omdøbning.

DAWA er markeret til fremtidig lukning. Adapteren og kildemetadata skal derfor forblive udskiftelige; en senere distributionsændring må stoppe navneauditten sikkert frem for at bruge uofficielle navne eller skjult fallback.

## Kvalitetsbegrænsning
`Kyst` er den fysiske hav/land-grundreference. RavRadars ravstrandlinje er et afledt produkt, fordi den med vilje:

- udelader havne og åudløb;
- udelader alle fjorde undtagen Limfjorden;
- kan udelade andre strækninger uden relevant, tilgængelig ravstrand;
- placeres kontrolleret på landsiden til kortvisning.

Derfor skal kildegeometri, fravalgsmasker og den endelige afledte linje opbevares separat. Et manuelt adminoverride skal kunne spores uden at slette den oprindelige kildeproveniens.

## Kontrolleret samling i 4.0.132
Generatoren accepterer kun kildestykker med eksisterende eller delvist geometrisk match. Semantiske/grænsemæssige stykker holdes helt ude. Havnelinjer udskæres med buffer. Vandløbsmasken bruger kun synlig, ikke-rørlagt midterlinje, kræver både kystkontakt og dokumenteret fortsættelse væk fra kysten og klynger nærliggende dubletter. Rå vandløbskanter anvendes ikke, fordi de typisk repræsenterer begge bredder og i første forsøg skabte kraftig oversegmentering.

Fysisk adskilte fragmenter inden for det dokumenterede grupperingsgab kan ligge i samme multipart-kystdel; systemet tegner ingen kunstig forbindelseslinje over springet. Hver del bevarer segment-ID'er, reviewklasse og antal fysiske fragmenter. Alle aktiverings-, vejr-, admin- og scoreflag er falske.

Prøvekørsel på det verificerede private #1948-artifact gav 84 reviewforslag. Rømø gav nul, fordi ingen af dens fire kildestykker bestod den geometriske gate. Dette kræver semantisk flyttereview, ikke en løsere automatisk tærskel.

## Officielle indre-vandpolygoner og visuelt review – 4.0.133
Stednavne-API'et kan levere GeoJSON-geometri, ikke kun visuelt center og bbox. Piloten henter derfor alle officielle `Farvand`-polygoner i de tre afgrænsede områder og vælger maskinlæsbart undertyperne `fjord` og `nor` uden for Limfjorden. Kilden kræver ingen nøgle. Limfjordområdet har en tom eksklusionsliste efter DEC-0032.

Lokal kørsel fandt seks relevante officielle polygoner i Lolland/Falster-området. Nysted Nor ramte `DK-B10-10`; Nakskov Fjord, Sakskøbing Fjord og Søndernor ramte den alt for brede `DK-B10-15`. Efter masken faldt det samlede antal private reviewdele fra 84 til 72. Polygonerne og de øvrige fravalg gemmes separat som privat reviewgeometri.

Ni zonekort viser, at den gamle zonegeometri ikke blot kræver koordinatjustering. Kun Blåvand er kandidat til lokal detailopretning. Rømø og Askø/Lilleø kræver semantisk flytning, mens Thisted, Fur, Aalborg og de tre øvrige Lolland/Falster-zoner kræver grænse-/partitionsredesign. Dommene ligger i `data/geometry-v2/pilot-geographic-review.json` og må ikke fortolkes som produktionsgodkendelse.

## Blåvand-detailforslag – 4.0.134
Den fysiske GeoDanmark-kyst splittes ved det officielle sted `Blåvands Huk`. Dette er vigtigt, fordi et enkelt langt kildeobjekt følger både nordkysten og knækket mod Hvidbjerg; nærmeste-ankerklassifikation alene gav en falsk topologisk opdeling og blev stoppet af testen.

Efter splittet dannes to private kystdele. Hvert fragment får en 15-meters parallelforskydning mod den side, hvor det tilhørende centralt verificerede admin-landanker ligger, og væk fra det verificerede vandanker. Den lokale prøve på #1959-input gav cirka 6,4 km pr. del, to modsatrettede land-/vandpunktpar og ni separate GeoDanmark-høfter. Høfterne er kun morfologihypoteser.

Kontrollen beviser geometrisk sidekonsistens mod central admin-sandhed, men ikke strandens aktuelle ortofotoudseende eller at et nyt vandpunkt ligger på en gyldig DMI-havcelle. Derfor er vejrsampling, adminændring, aktivering og score fortsat falske.

#1965 dokumenterede fail-closed-grænsen: en timeout i central Supabase-sync gav repositoryfallback med 209 zoner og uden Blåvands to centrale retningsankre, hvorefter detailgeneratoren stoppede. #1967 gennemførte en frisk central sync med 208 aktive zoner og anker-ID'erne `primary` og `anchor-msd9s5dc`. Artifactet indeholdt 72 kystdelsforslag, to Blåvand-detaildele, 15 detailfeatures, ni høfter og detailkortet; alle produktions-, admin-, vejr-, score- og aktiveringsflag var falske.

## Officiel ortofotokontrol – 4.0.135-kandidat
Datafordelerens aktuelle dataoversigt angiver `GeoDanmark Ortofoto forår Web Mercator WMTS`, 2025-data, JPEG, EPSG:3857 og adgang via API-key eller OAuth. Den allerede eksisterende `DATAFORDELER_API_KEY` er samme moderniserede credentialtype og anvendes derfor også her; en ekstra betalt eller separat datakilde er ikke nødvendig.

Det private pilottrin henter tre afgrænsede zoom-17-vinduer ved norddelen, Blåvands Huk og den sydøstlige del og tegner fysisk kyst, privat 15-meterslinje, land-/vandpunktkandidater og høfter ovenpå. Tiles og overlays forbliver i det private artifact. Scriptet logger eller gemmer aldrig credential eller credential-bærende URL og stopper ved afvist adgang. Dette etablerer reproducerbar kontrol, men udgør først et bestået ortofotobevis efter CI-fetch og manuelt visuelt review.

#1974 gav visuelt go til nord- og sydøststrækningen, men no-go ved en indadgående sandtange-/laguneløkke. 4.0.136-kandidaten måler hårnålen som 430,0 m rute over 144,3 m chord (ratio 2,98), bevarer det mest søværts apex og genforener derefter med den sydøstlige åbne strand. På det verificerede input fjernes 242,0 m detur. Tærsklerne ligger i policy, og en syntetisk regression kræver faktisk hårnål; manglende match stopper generatoren.

## Næste tekniske leverance
1. Ortofotogaten er bestået i #1982.
2. Kør 4.0.137-piloten og gennemgå den private DMI-gridrapport: begge punkter skal have gyldige `wam_nsb`- og `dkss_nsbs`-celler, current-U/V skal dele fysisk gridpunkt og vertikallag, og rapporten skal vise om cellerne faktisk er forskellige pr. komponent.
3. Ingen selvstændig sampling før fuld provenance-/score-/UI-plan. Design desuden nye semantiske zoneafgrænsninger for de øvrige otte, før deres land-/vandpunkter eller DMI-celler vurderes.

## Weather-shadow-isolation – 4.0.138-kandidat

Den eksisterende multi-ankerfunktion vurderer én zones strøm mod flere lokale retninger. Det er acceptabelt, så længe zonen kun har én vejserie, men kan ikke genbruges direkte til to selvstændige målepunkter: vejr fra én kystdel må aldrig scores mod den anden dels retning.

4.0.138-kandidaten indfører derfor kun en privat kontrakt. Hver Blåvand-del får stabil identitet, eget valideret grid, nødvendige timeproveniensfelter og en separat fremtidig historiknøgle. Krydsmerge, fallback, state, score, UI, public projection, admin-write og automatisk aktivering er falske. Den eksisterende parent-zone forbliver autoritativ. Næste forsøg må danne private flertidsserier, men ikke publicere eller score dem.
