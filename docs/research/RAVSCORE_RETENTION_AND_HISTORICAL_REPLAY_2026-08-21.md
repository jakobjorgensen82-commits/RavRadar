# RavScore: fastholdelse og historisk genafspilning

Status: Faglig afgrænsning og implementeringsplan. Dokumentet ændrer ikke RavScore, produktion eller kystpunkter.

## Kort beslutning

Kandidat B må ikke få en fast universel fastholdelsesbonus fra `rev`, `lavt vand` eller `ålegræs`. Nationaljobbet havde nul komplet dækning for lokale fastholdelsesfeatures, og forskningen viser, at fastholdelse er en tidslig proces, ikke en enkelt statisk egenskab.

DEC-0052 afslutter dette spørgsmål for Candidate G: de statiske lokale felter holdes helt ude af modellen og er ikke en aktiveringsgate. Den dynamiske leveringskæde og kravet om komplet vejr-/strøminput består uændret.

Fastholdelse opdeles fremover i:

1. levering til brændingszone eller opskyl,
2. midlertidig ophobning,
3. eksponering, så materialet kan findes,
4. fortsat fastholdelse eller begravelse,
5. mulig genmobilisering og udskylning.

De første historiske kontroller kan laves nu. Vi skal ikke vente på fremtidigt vejr.

## Hvad forskningen støtter

### Rav kan vende tilbage flere gange

Chubarenko og Stepanova beskriver, at stormbølger, strøm og rullestrukturer kan føre rav og negativt opdriftsbårne plastpartikler mellem den undersøiske kystskråning og stranden gentagne gange. Forfatterne kalder selv mekanismen en hypotese og efterlyser direkte systematiske observationer. Den støtter hændelseshukommelse og genmobilisering, men ikke en fast dansk scoretærskel.

Kilde: [Chubarenko og Stepanova 2017](https://doi.org/10.1016/j.envpol.2017.01.085).

### Høj vandstand og bølger kan levere opskyl

Et felt- og modelstudie fra Rigabugten fandt, at stormopskyl hovedsageligt var lokalt og blev dannet under kombinationen af høj vandstand og bølger. Det støtter levering under en hændelse, men viser ikke, at faldende vand i sig selv skaber aflejringen.

Kilde: [Soomere med flere 2014](https://doi.org/10.5697/oc.56-4.673).

### Faldende vand kan blotlægge uden at være årsagen til levering

Når energien og vandstanden falder efter en hændelse, kan tidligere leveret materiale blive mere tilgængeligt for brugeren. Det er en ændring i eksponering og jagtbarhed. Den må ikke automatisk forveksles med ny transport eller ny aflejring.

Konsekvensen er, at stigende og faldende vand ikke skal have samme absolutte scoreeffekt. Høj vandstand kan medvirke til levering, mens faldende vand senere kan blotlægge materialet. Begge dele kræver et tidsforløb.

### Partikler samles forskellige steder

Kontrollerede bølgeforsøg med plastpartikler viser, at ophobningsstedet afhænger af tæthed, størrelse, form, synkehastighed, bølgeforhold og strandprofil. Ikke-flydende partikler kan samles ved revler, render eller inde i sedimentet, og placeringen kan ændres igen over tid.

Det understøtter, at RavRadar ikke bør have én universel “strandfangst”-regel. Rav med forskellig tæthed og form kan reagere forskelligt, og en del af materialet kan blive begravet frem for synligt.

Kilder:

- [Guler med flere 2022](https://doi.org/10.1016/j.marpolbul.2022.113902)
- [Wave-Induced Distribution of Microplastic in the Surf Zone](https://doi.org/10.3389/fmars.2020.590565)
- [Bonanno med flere 2026](https://doi.org/10.1016/j.coastaleng.2026.104968)
- [Lofty med flere 2023](https://doi.org/10.1016/j.watres.2023.120329)

### Strandens gennemtrængelighed kan ændre tilbageskyl

Store laboratorieforsøg viser, at infiltration og eksfiltration i en permeabel strand påvirkes af sedimentets gennemtrængelighed og grundvandstanden. Det kan ændre swash og backwash, men RavRadar har ikke landsdækkende lokale data med den nødvendige kvalitet. Strandtype må derfor højst være en diagnostisk hypotese nu.

Kilde: [Steenhauer med flere 2011](https://doi.org/10.1029/2010JC006789).

## Konsekvens for kandidat B

Den nuværende forskningskandidat kan give op til 10 lokale fastholdelsespoint ud fra grove zonefelter. Denne del skal erstattes eller holdes neutral før en offentlig kandidat vurderes.

### Det kan bruges nu

- retning mod, langs eller væk fra kysten,
- strømstyrke sammen med retning,
- bølgeretning, bølgehøjde og periode,
- varighed af et sammenhængende transportforløb,
- hændelsens alder,
- forholdet mellem tidligere maksimal og aktuel bølgeenergi,
- og om energien er tiltagende, på toppen eller aftagende.

### Det forbliver diagnostisk

- revler, høfder, tang, ålegræs og lavt vand som lokale fælder,
- strandens permeabilitet og hældning,
- præcis begravelsesrisiko,
- og et bestemt antal timer efter storm som universelt optimum.

Manglende fastholdelsesdata skal give lavere modelsikkerhed. Det må ikke behandles som hverken perfekt fastholdelse eller sikker udskylning.

## En bedre foreløbig tilstandsmodel

| Tilstand | Hvad systemet kan sige | Foreløbig scorebehandling |
| --- | --- | --- |
| Mobilisering | Energi kan sætte relevant materiale i bevægelse | Mobiliseringsdelen |
| Levering | Nettoforløbet støtter bevægelse mod kystdelen | Transport-/leveringsdelen |
| Ophobning mulig | Hændelsen og aftagende energi kan give midlertidig samling | Forsigtig forskningsprior, ikke lokal fældebonus |
| Eksponeret | Forholdene gør et tidligere leveret lag mere søgbart | Jagtbarhed og forklaring |
| Genmobilisering mulig | Ny energi kan flytte eller skjule materialet igen | Reducér sikkerhed; undgå automatisk positiv bonus |
| Ukendt fastholdelse | Lokale fælder og begravelse er ikke dokumenteret | Neutral score, lav modelsikkerhed |

## Historiske datakilder

### Vestkysten, Skagerrak og den åbne Nordsø

- Copernicus `NWSHELF_REANALYSIS_WAV_004_015` giver bølgehøjde, periode, retning og Stokes-drift fra 1980 med cirka 1,5 km gitter. Produktmanualen angiver tre-timers øjebliksværdier.
- Copernicus `NWSHELF_MULTIYEAR_PHY_004_009` giver timeopløst strøm og havniveau fra 1993 med cirka 7 km gitter.
- ERA5 giver timeopløst vind og bølgevariable fra 1940 og kan bruges som fælles atmosfærisk reference, ikke som lokal strandmodel.

Kilder:

- [NWS wave reanalysis](https://data.marine.copernicus.eu/product/NWSHELF_REANALYSIS_WAV_004_015/description)
- [NWS physics reanalysis](https://data.marine.copernicus.eu/product/NWSHELF_MULTIYEAR_PHY_004_009/services)
- [ERA5 hourly data](https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels)

### Kattegat, bælter og Østersøen

- Copernicus `BALTICSEA_MULTIYEAR_WAV_003_015` giver timeopløste bølger, retning, periode og Stokes-drift fra 1980 med cirka 2 km gitter.
- Copernicus `BALTICSEA_ANALYSISFORECAST_PHY_003_006` giver timeopløst tredimensionel strøm og havniveau fra december 2022 med op til 56 dybdelag og cirka 2 km gitter.
- `BALTICSEA_MULTIYEAR_PHY_003_011` går tilbage til 1993, men strøm og havniveau leveres kun som døgnmidler. Det er for groft til en timepræcis stormfase og bruges kun som baggrundskontekst.

Kilder:

- [Baltic wave hindcast](https://data.marine.copernicus.eu/product/BALTICSEA_MULTIYEAR_WAV_003_015/description)
- [Baltic physics analysis/forecast](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_PHY_003_006/description)
- [Baltic physics reanalysis](https://data.marine.copernicus.eu/product/BALTICSEA_MULTIYEAR_PHY_003_011/description)

### DMI

DMI's operationelle WAM- og DKSS-prognoser er fortsat produktionskilden. DMI's åbne prognose-API viser kun de seneste cirka 48 timers modelkørsler og er derfor ikke et langt historisk arkiv. RavRadar skal bevare kompakte, dataminimerede hændelsesfeatures fra naturlige kørsler fremover, men ikke gemme store rå GRIB-felter uden et konkret behov.

Kilder:

- [DMI prognosedata](https://www.dmi.dk/friedata/prognosedata)
- [DMI forecast-data API](https://www.dmi.dk/friedata/dokumentation/forecast-data)

## Effektiv historisk pilot

Piloten skal være automatisk og ikke kræve mange timers manuel ejeranalyse.

1. Find automatisk kandidathændelser ud fra regionale percentiler for bølgeenergi, varighed og retningsstabilitet.
2. Vælg et lille, balanceret sæt med transport mod kysten, langs kysten, væk fra kysten, modstridende bølge/strøm, aftagende faser og rolige kontroller.
3. Start med 12 hændelsesvinduer fra perioden efter december 2022, hvor både Nordsø- og Østersøprodukterne har timeopløst strøm og havniveau.
4. Genafspil hver hændelse fra mindst 24 timer før energitoppen til 72 timer efter.
5. Beregn de samme kompakte features som RavRadar: mobilisering, retningsintegral, varighed, levering, hændelsesalder, eksponering og datadækning.
6. Gem kun summeringer, kildeidentitet og nødvendige afledte features. Rå U/V, credentials og komplette payloads må ikke komme i repository eller PR.
7. Lad systemet vælge de største modeluenigheder og forklare dem på almindeligt dansk.
8. Udvid kun ud over de første 12 hændelser, hvis kandidatens rangering eller konklusion ændrer sig væsentligt.

Smalle farvande som Limfjorden må ikke få falsk præcision fra et for groft reanalysegitter. De valideres med de faste scenarier og de kompakte DMI-forløb, som RavRadar allerede opsamler fremover.

## Stopregler

- Historiske Copernicus-data er en separat privat forskningskilde og overtager ikke DMI i produktion.
- Ingen prøver flytter eller erstatter eksisterende land-/vandpunkter.
- En reanalyseværdi kaldes ikke en observation ved stranden.
- Daglige strømdata bruges ikke til at rekonstruere timepræcis retning.
- En lokal fastholdelsesbonus aktiveres ikke uden dokumenteret feature og geografisk dækning.
- Historiske scenarier kan teste fysisk adfærd, men de kan ikke alene bevise fundchance uden senere komplette ture.

## Implementeret hændelsesvælger

`scripts/select-ravscore-historical-events.py` modtager kun afledte regionale timefeatures. Den afviser koordinater og rå U/V-felter, finder sammenhængende hændelser over regionens 95-percentil for den relative bølgeenergiproxy og sammensætter et balanceret katalog.

Kataloget prioriterer levering mod kysten, transport væk fra kysten, bølge-/strømkonflikter, passage langs kysten og rolige kontroller. Det gemmer kun tidsvindue, kildeidentitet, retningsklasse, varighed, vandstandsfase og relative hændelsesmål. Det kan ikke ændre score eller produktion.

Den lokale fixturekontrol køres med:

```text
npm run test:ravscore-historical-events
```
