# Vejrkomponenter: Copernicus-kildekontrakter, 2026-09-19

Status: afgrænset research til den igangværende implementering; **ikke produktions- eller dækningsbevis**. Ingen vejrdata er hentet i dette researchsnit, ingen private værdier er udskrevet, og ingen produktionsdata er ændret. Officielle kilder og den installerede/pinnede Toolbox 2.4.1 er kontrolleret. Notatet erstatter ikke DEC-0210 eller den samlede fejlmatrix.

## 1. Modelreference: hvad kan faktisk bevises?

**En hentetid er ikke en modelkørsel.** `acquisitionAt`, `creation_date`, katalogets `updated`/`arco_updated_date`, HTTP Last-Modified og datasetversionen `202411`/`202511` må ikke bruges som `modelRun`. Et subset-hash beviser bytes, ikke prognosens alder.

| Produkt | Verificeret i producentens dokumentation | Begrænsning |
| --- | --- | --- |
| NWS wave, WAV_004_014 | Original NetCDF har scalar `forecast_reference_time` og `forecast_period(time)` i sekunder. Variablerne henviser til disse koordinater. Originalfilnavnet indeholder også en bulletindato. | Det er **ikke verificeret**, at de koordinater er bevaret i det aktuelle ARCO-subset. Læs dem fra netop de modtagne bytes, ikke fra et separat katalogopslag. |
| NWS physics, PHY_004_013 | Originalfilnavne indeholder `bYYYYMMDD`; produktets base time er 00 UTC. Den viste NetCDF-header har kun validity `time`, ikke forecast-reference-koordinater. | Originalfilens producentnavn + filidentitet kan understøtte et særskilt originalfilspor. Det brugerdefinerede ARCO-subsetfilnavn beviser ikke bulletinen. |
| Baltic wave, WAV_003_010 | Den dokumenterede header har validity `time` og `creation_date`, men ingen `forecast_reference_time` eller `forecast_period`. | Ingen dokumenteret modelreference til hver række. Må ikke udledes fra 00/12-cyklus eller publiceringstid. |
| Baltic physics, PHY_003_006 | Den dokumenterede header har validity `time`, men ingen forecast-reference-koordinater. `BAL-NEMO_PHY-YYYYMMDDhh` angiver starten af filens 12 timers **gyldighedsinterval**. | Filnavnets dato er **ikke** en modelkørsel. Der er ikke dokumenteret et række-/subsetbundet modelRun-felt. |

Kilder: [NWS wave PUM, filformat og bilag](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-014.pdf), [NWS physics PUM, afsnit 2e og 4](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-013.pdf), [Baltic wave PUM, afsnit IV og VI](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-010.pdf), [Baltic physics PUM, afsnit IV og bilag](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-006-007.pdf).

Fravær i den dokumenterede kontrakt er ikke bevis for, at ingen fremtidig eller faktisk respons kan have flere metadata. Ingen aktuelle private subsetheaders er verificeret her. Den korrekte standardværdi er derfor `modelRun=null`/ukendt, indtil responsens egne metadata giver et gyldigt bevis.

### Toolbox-observationer

- `ResponseSubset` indeholder filsti/navn/størrelse, variable, coordinate extents og status; intet modelRun- eller bulletin-felt. Verificeret i installeret `copernicusmarine/core_functions/models.py:204` og [officiel responsdokumentation](https://toolbox-docs.marine.copernicus.eu/en/stable/response-types.html).
- `download_functions/subset_xarray.py:484` vælger de bestilte variable via xarray. Tilknyttede koordinater kan følge med; separate, ubestilte datavariable er ikke et garanteret metadata-sidechannel. `download_zarr.py:256` læser ARCO, ikke originale producentfiler.
- ARCO ændrer blandt andet koordinatnavne og dybdeorden. Toolbox konverterer normalt elevation til positiv, **faldende** depth. Vælg ikke overfladen som arrayindeks 0. Originale producentfiler og subset er forskellige leveringsspor. [Officiel NetCDF/ARCO-forklaring](https://help.marine.copernicus.eu/en/articles/8656000-differences-between-netcdf-and-arco-formats).
- Den aktive `scripts/run-copernicus-current-pilot.py`-funktion `download_subset` bruger nu `raise_if_updating=True`, ligesom den gamle wavepilot. Den konkrete `DatasetUpdating`-exception får højst ét retry efter fem sekunder inden for det eksisterende tidsbudget. Fortsat opdatering gemmer søskendefremgang som `IN_PROGRESS`/exit 75 og lader den eksisterende fallback/restplan fortsætte; det er hverken `COMPLETE` eller bevis på upstream-fravær. Seks små offline-scenarier omfatter faktisk checkpoint → OM-restplan → afgrænset resume. Flaget er **ikke** modelreference eller et generelt bevis for atomisk snapshot. [Officiel driftsvejledning](https://help.marine.copernicus.eu/en/articles/8684964-i-m-an-operational-user-what-should-i-know-to-use-the-copernicus-marine-toolbox).

## 2. Præcise feltkontrakter

| Komponent | NWS dataset/felt | Baltic dataset/felt | Læsekrav |
| --- | --- | --- | --- |
| Bølger | `cmems_mod_nws_wav_anfc_1.5km_PT1H-i`: `VHM0`, `VTPK`, `VMDR` | `cmems_mod_bal_wav_anfc_PT1H-i`: samme felter | Samlet tuple for samme time og celle. Højde m, **peakperiode** s, FROM-retning i grader. Ingen substitution med `VTM10`, `VTM02` eller swellperiode. |
| Vandstand | `cmems_mod_nws_phy-ssh_anfc_1.5km-2D_PT1H-i`: `zos` | `cmems_mod_bal_phy_anfc_PT1H-i`: `sla` | Begge m, hourly instantaneous; ikke daily mean eller detided. NWS standard_name `sea_surface_height_above_geoid`; Baltic `sea_surface_height_above_sea_level`. |
| Overfladetemperatur | `cmems_mod_nws_phy-sst_anfc_1.5km-2D_PT1H-i`: `thetao` | `cmems_mod_bal_phy_anfc_PT1H-i`: `thetao` på øverste native lag **0,50 m** | `sea_water_potential_temperature`, Celsius. NWS har et særskilt 2D-SST-produkt. Baltic må ikke genbruge strømlæserens dybeste fælles lag eller `bottomT`. |

Felter og units: [NWS physics PUM, datasetoversigten](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-013.pdf), [Baltic physics PUM, datasetoversigten og vertikalgrid](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-006-007.pdf), [NWS wave PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-014.pdf), [Baltic wave PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-010.pdf).

Waves CF-navne: `sea_surface_wave_significant_height`, `sea_surface_wave_period_at_variance_spectral_density_maximum`, `sea_surface_wave_from_direction`. Retningen kommer **fra**, med uret fra nord; normalisér dokumenteret 360 til 0 efter intervalkontrol, aldrig Stokes-drift til havstrøm. [Officiel retningskonvention](https://help.marine.copernicus.eu/en/articles/5046685-direction-conventions-of-currents-wave-and-wind-in-copernicus-marine-products).

### Datum og T+3

Gem vandstandens faktiske datum/standard_name sammen med tallet. At gange med 100 løser kun m→cm, ikke højdesystemet. `zos` og `sla` må ikke uden videre stemples som DMI's middelvandsafvigelse/DVR90. Generelt er SLA afvigelsen fra et tidsmiddel; MDT afhænger af produkt/referenceperiode. Et produktnavn eller et generisk MDT-felt beviser ikke en DMI-datumtransformation. [Officiel SSH/SLA-forklaring](https://help.marine.copernicus.eu/en/articles/6025269-what-are-the-differences-between-the-ssh-and-sla-variables).

Matematisk kan `100 * (level(T+3) - level(T))` bruges uden konstant datumoffset, **når** begge værdier har samme kvalificerede produkt, celle, datum og sammenhængende modelreference. Bland aldrig DMI ved T med CP ved T+3. H118–H120 skal med som privat støtte for H115–H117. Hvis modelreferencen mangler, er en fælles hentetid ikke bevis for fælles bulletin; denne adgangsregel skal afklares eksplicit i integrationen, ikke skjules i læseren.

## 3. Mindste implementerbare fælles læsekontrakt

Forslag til afgrænset implementeringssnit:

1. Fælles NetCDF-læser med produkt-/dataset-/versionsallowlist; bevar identiteten for faktisk subset, celle, gyldighedstid og valgte dybde. Dekodér `_FillValue`, scaling og units én gang. En manglende række må ikke kassere gyldige søskenderækker.
2. Returnér pr. komponent: værdier, `validTime`, `productId`, `datasetId`, `datasetVersion`, subset-/rækkeidentitet, grid-/lagidentitet, units/datum, `modelRun` samt eksplicit `modelRunEvidence` eller ukendt. `acquisitionAt` forbliver en separat auditværdi.
3. Læs CF-forecastreference fra **samme subset**. Accepter scalar eller entydigt tidsindekseret reference; bind til præcis række. Hvis `forecast_period` findes, skal `validTime - modelRun` stemme med den. Afvis NaT, tvetydige dimensioner og modstridende metadata. Samme wave-/U/V-tuple skal have fælles reference. Flere bulletiner i forskellige timer er ikke i sig selv ulovlige.
4. Adskil fysisk gyldighed fra alderssammenlignelighed: kvalificerede data uden modelRun kan fortsat fylde reelle huller efter DEC-0210; de må ikke erklæres nyere og erstatte beskyttet DMI efter 96-timersreglen. Et senere download af samme bulletin må aldrig nulstille alderen.
5. Nye måltests: metadata bevares gennem faktisk reader→record; ukendt reference bliver ved med at være ukendt; stale-DMI takeover nægtes ved ukendt reference; gyldige søskendetimer overlever hul; Baltic surfacevalg virker ved omvendt depthorden; bølger kræver rigtig peak; leveltrend afviser blandet datum/reference.

### Eksisterende kode, som kan genbruges / ikke må overtages blindt

- `scripts/pilot-feggesund-copernicus-wave.py`: genbrug variable-semantik og modelreference/lead-konsistens. Dens krav om én bulletin og et komplet 158-timers interval over alle dele er et **gammelt feasibility-kriterium**, ikke den nye reservekædes huludfyldningsregel.
- `scripts/lib/copernicus_current.py`: aktuelle records indeholder endnu ikke responsbundet modelRun; `nearest_shared_uv_*` vælger med vilje dybeste fælles U/V-lag. Det valg skal blive på strømkomponenten.
- Aktuel lokal dækningsadgang, wet-cell-bevis og centrale samplingpunkter skal bevares. Nye produktfelter er ikke i sig selv bevis for dækning i Feggesund eller tilladelse til at flytte geometri.

Åbent efter notatet: faktiske subsetmetadata pr. produkt; vandstandsdatums eksplicitte public-/adapterkontrakt; fallback-producentens wire-up og private recordschema; kontrolleret operationalt bevis. Der er **ikke** dokumenteret komplet fallbackdækning ved denne research.

## 4. Afgrænset lokal reader implementeret

`scripts/lib/copernicus_weather_components.py` læser nu de seks pinnede wave/level/SST-kontrakter fra NetCDF-filer. `read_component_subset(...)` returnerer `records` og `missing` pr. forventet time. SHA-256 beregnes fra præcis de bytes, der dekodes; scalar/tidsindekseret CF-modelreference og eventuel lead-kontrol følger den konkrete række. Ingen modelreference opfindes fra hentetid. Modstridende lokale metadata eller tomme felter afviser den pågældende time uden at kassere gyldige søskendetimer.

Readeren bevarer peak-/FROM-semantik, native celleindeks, units/datum og øverste Baltic-temperaturlag. Temperatur bruger den eksisterende fælles navngivning `waterTemperature`/`waterTemperatureC`. Vandstand returneres bevidst som `seaSurfaceHeightM` + datum, ikke som allerede DMI-kompatibel vandstand eller en konstrueret T+3-trend. Pakkede fillværdier, scaling og valid_range håndteres ved indlæsningen.

Der gælder en foreløbig konservativ parsergrænse på 2 km samt den eksisterende wavepilots filbudget på 16 MiB før dekodning. Det er **ikke** en ny global godkendt geografi-/hentepolitik for temperatur og vandstand. Readeren vælger ét nærmeste native punkt, interpolerer ikke og flytter ikke punktet, når en time er tom. Et record mærkes `reader-only-pending-spatial-and-request-binding`; produktionsadmission, vådcelle-/dækningsbevis og central målidentitet skal stadig bindes af producent/adapter.

`scripts/test-copernicus-weather-components.py`: 18 lokale syntetiske fil→xarray→record-scenarier bestået. Omfatter manglende/forkert modelreference, blandede bulletiner mellem timer, huller med bevarede søskende, peak vs mean, calm-retning, units/datum, surfacevalg ved omvendt depthorden og filbudget før dekodning. Ingen leverandørkald, ændring af `copernicus_current.py`, produktionskobling, scoreændring eller dækningspåstand er foretaget.

## 5. Privat komponentbank, statik og bounded transport implementeret lokalt

De seks kontrakter har nu egen privat producent, præcist PART-register og
hashbundne originale NetCDF-filer/receipts. Et opaque Node-index kan kun
oprettes gennem den faktiske Python-proces, som genlæser dynamiske OG statiske
originalbytes. En selvskrevet attest eller korrekt selvberegnet hash er ikke
admission. Projection binder også datatyper med typed IEEE754 bigendian;
`1`/`1.0` er identiske, men tal og samme tekstværdi er forskellige.

De officielle statiske `bathy`-dele er:

- [NWS-wave, version 202511](https://data.marine.copernicus.eu/product/NWSHELF_ANALYSISFORECAST_WAV_004_014/download?dataset=cmems_mod_nws_wav_anfc_1.5km_static_202511--ext--bathy).
- [NWS-physics, version 202511](https://data.marine.copernicus.eu/product/NWSHELF_ANALYSISFORECAST_PHY_004_013/download?dataset=cmems_mod_nws_phy_anfc_1.5km_static_202511--ext--bathy).
- [Baltic-wave, version 202311](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_WAV_003_010/download?dataset=cmems_mod_bal_wav_anfc_static_202311--ext--bathy).
- [Baltic-physics, version 202411](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/download?dataset=cmems_mod_bal_phy_anfc_static_202411--ext--bathy).

PUM'erne dokumenterer `mask`/`sea_binary_mask` og
`deptho`/`sea_floor_depth_below_geoid`. Parseren kræver samme nærmeste native
celle i statik og dynamik, mask=1, korrekte koordinatenheder og positiv
dybde. NWS-wave beholder den eksisterende pilots mindst 10 m dybde.
Der søges IKKE videre efter en anden våd celle. 2 km er fortsat den
konservative eksisterende parserafgrænsning, ikke et påstået dækningsbevis
eller en ny godkendt generel SST/vandstandspolitik.

NWS' forespørgselsdomæne -16..13/46..62,75 og Baltics 9..30/53..66
kommer fra deres PUM'er: [NWS-physics](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-013.pdf),
[Baltic-physics](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-006-007.pdf)
og [Baltic-wave](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-010.pdf).
Rektanglerne frasorterer kun umulige forespørgsler; de giver ingen lokal
admission. Aktuelle subsetheaders/statikkens faktiske dimensioner er endnu
ikke observeret. Ukendte former forbliver afvist, ikke gættet.

Transporten har eksplicit tid, request- og bytebudget, hårdt afgrænset
underproces og `raise_if_updating=True`. Kun den konkrete DatasetUpdating
får ét afgrænset retry. Fejl/huller gemmes som retrybare, gyldige
søskendetimer checkpointes, og IN_PROGRESS tillader næste reserveled.
Current-producenten er fortsat separat. Vind har endnu ingen verificeret
CP-produktkontrakt og forbliver en eksplicit åben reserveopgave.

Banken binder aktuelle `targets`, bevarer uændrede dele ved ejerskifte/
punktændring andre steder og følger callerens historik/H120-retention.
En tom henteliste tømmer ikke læseindexet. `.000Z` normaliseres kun i
opslag; allerede hashede beviser omskrives ikke. Gemte originalfiler og
statik er del af den private restorekontrakt, aldrig offentlig payload.
Vandstand er fortsat native datum og optages ikke som DMI-centimeter.

Manglende/korrupt referenced original eller receipt frigør kun de berørte
bankslots til næste genhentning. En korrupt content-address-fil/receipt
bevares lokalt i `quarantine`, mens korrekt ny payload reparerer den
oprindelige reference. Gode søskendefiler/timer ændres ikke. Manglende
statik for god dynamik kan genhentes uden at hente dynamikken igen.

Målrettet lokal evidens: 14 bankcases, 10 actual-byte/transportcases og
Python→Node→model/flow/Feggesund-reservesti. Ingen providerhentning,
national skaleringsmåling eller produktionsbevis er lavet i dette snit.
