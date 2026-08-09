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

Den ældre generelle GeoDanmark WFS/fildownload er markeret til udfasning i 2026. Piloten skal anvende den aktuelle entitetsbaserede WFS eller en anden dokumenteret aktuel distributionsvej, ikke bygge ny afhængighed på den udgående tjeneste.

## Kvalitetsbegrænsning
`Kyst` er den fysiske hav/land-grundreference. RavRadars ravstrandlinje er et afledt produkt, fordi den med vilje:

- udelader havne og åudløb;
- udelader alle fjorde undtagen Limfjorden;
- kan udelade andre strækninger uden relevant, tilgængelig ravstrand;
- placeres kontrolleret på landsiden til kortvisning.

Derfor skal kildegeometri, fravalgsmasker og den endelige afledte linje opbevares separat. Et manuelt adminoverride skal kunne spores uden at slette den oprindelige kildeproveniens.

## Næste tekniske leverance
1. Definér v2-arbejdsskema og JSON Schema for zone, kystdel, kildeproveniens, fravalg, ravfælde og ID-migration.
2. Byg read-only audit af den eksisterende geometri og v2-fixtures.
3. Kør det manuelle `geometry_v2_pilot=true`-job og kontroller den private pilotrapport/artifact.
4. Sammenhold foreslåede marine punkter med faktiske DMI-celler før score-/produktionsintegration.
