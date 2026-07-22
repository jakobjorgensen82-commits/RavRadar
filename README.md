# RavRadar 2.1

RavRadar er en statisk, mobilvenlig GitHub Pages-side til vurdering af ravforhold. GitHub indeholder hjemmesiden, kortzoner, scoremotor og kompakte prognosedata. Supabase er reserveret til levende brugerdata.

## Fast arkitektur

### GitHub Pages

- hjemmeside og brugerflade
- Leaflet/OpenStreetMap-kort
- polygonzoner i `data/zones.geojson`
- RavScore-motoren
- kompakte aktuelle forhold i `data/live/conditions.json`
- automatiske valideringstests

### Supabase

- anonyme brugerobservationer
- eventuelle favoritter eller konti senere
- små administrative indstillinger, hvis de skal ændres uden ny udgivelse

Store GeoJSON-filer, rå DMI-svar og unødvendig historik skal ikke gemmes i Supabase. Det beskytter grænsen på 500 MB.

## RavScore

Den samlede score bruger den aftalte vægtning:

- jagtbarhed: 40 %
- transport: 35 %
- frigivelse: 25 %

Waders og strand beregnes forskelligt. Ved waders straffes vind over cirka 6 m/s kraftigt. Transport tager både højde for hastighed og retning i forhold til zonens kyst. Stormhistorik giver kun en begrænset frigivelsesbonus.

## Projektstruktur

- `index.html`, `style.css`, `app.js`: brugerflade
- `js/core/score-engine.js`: scoreberegning
- `js/map/map-view.js`: kort og polygonzoner
- `js/services/data-service.js`: dataindlæsning
- `js/ui/info-panel.js`: områdevisning
- `data/zones.geojson`: faste zoner
- `data/live/conditions.json`: kompakte aktuelle forhold
- `supabase/schema.sql`: minimal database til observationer
- `scripts/`: datakontrol og test af scoremotor

## Lokal kontrol

Kræver Node.js 22 eller nyere:

```bash
npm run validate
```

GitHub Actions kører samme kontrol automatisk ved push og pull request.

## Udgivelse

Indholdet af denne mappe skal ligge i roden af repositoryet `RavRadar`. GitHub Pages publicerer fra branch `main` og mappen `/ (root)`.

ZIP-filen er en samlet arbejdskopi. Pak den ud og upload filerne til repositoryets rod, eller brug GitHub Desktop til at erstatte projektfilerne og lave et commit.

## Aktuelle data

Der vises aldrig opdigtede målinger. Indtil den officielle DMI-integration er færdig, viser zonerne “Ingen data”. Det forventede format pr. zone er:

```json
{
  "current": {
    "windSpeedMps": 4.2,
    "windDirectionDeg": 80,
    "waveHeightM": 0.3,
    "waterLevelCm": 12,
    "waterLevelTrendCm3h": 4,
    "currentSpeedMps": 0.22,
    "currentDirectionDeg": 240
  },
  "history": {
    "maxWind24hMps": 10.5,
    "maxWave24hM": 1.1,
    "hoursSinceHighEnergy": 8
  }
}
```
