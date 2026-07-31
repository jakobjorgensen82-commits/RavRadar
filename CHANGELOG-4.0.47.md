# RavRadar 4.0.47 — Natural coastline production build

## Formål

De synlige, dynamisk RavScore-farvede zoneforløb bygges nu direkte fra en højopløselig, OSM-afledt kystlinje i GitHub Actions. Den gamle, sparsomme GSHHS-linje bruges ikke længere som produktionsgrundlag.

## Arkitektur

- `data/zones.geojson` i kildepakken bevarer den auditerede 4.0.44-geometri som sikker baseline.
- Ved hver deployment hentes den immutable kilde `@geo-maps/countries-coastline-100m@0.6.0` fra jsDelivr.
- `scripts/generate-production-coastlines-4.0.47.py` klipper et sammenhængende naturligt kystsegment til hver eksisterende RavRadar-zone.
- Zone-ID, polygon, RavScore, klik, tooltip, dataPoint, onshoreDirectionDeg, DMI-routing og øvrige egenskaber ændres ikke.
- Små U-formede afstikkere fra moler og havnebassiner brobygges, mens større naturlige fjorde og næs bevares.
- Den synlige linje forskydes 5 meter væk fra zonens marine datapunkt, så den ligger på strandsiden af kystgrænsen.

## Sikkerhed og rollback

- Hele datasættet bygges og valideres i hukommelsen før atomisk udskiftning.
- Mindst 190 af 210 aktive zoner skal kunne bygges sikkert; ellers stopper deployment, og den allerede publicerede version forbliver uændret.
- Zoner, der ikke kan matches entydigt, beholder automatisk den auditerede 4.0.44-linje.
- `data/geometry-snapshots/zones-4.0.47.geojson` og en detaljeret audit oprettes under deployment.
- De eksisterende 4.0.44/4.0.45 snapshots og rollback-script bevares.

## Kilde og licens

Kystdata er afledt af OpenStreetMap og leveres via `simonepri/geo-maps`, version 0.6.0. Data er under OSM/ODbL-vilkår. Kortets eksisterende OpenStreetMap-attribution bevares.
