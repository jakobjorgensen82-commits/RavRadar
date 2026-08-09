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

## Næste tekniske leverance
1. Kør 4.0.132-piloten og verificér private forslag, masker, kort og isolation.
2. Gennemgå pilotforslagene visuelt/fagligt og registrér undtagelser uden at ændre aktive zoner.
3. Design kandidat-land-/vandpunkter og sammenhold marine punkter med faktiske DMI-celler før score-/produktionsintegration.
