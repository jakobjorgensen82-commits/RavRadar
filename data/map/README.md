# Landsmaske til strømpilenes visning

`current-arrow-land-mask.json` er et statisk, landsdækkende kystudtræk, ikke
vejrmålinger, administratorgeometri eller en ny marinemodel.

Kilde: [OpenStreetMap land polygons](https://osmdata.openstreetmap.de/data/land-polygons.html),
© OpenStreetMap-bidragsydere. Database og dette udtræk er under
[Open Database License (ODbL)](https://osmdata.openstreetmap.de/info/license.html).
Kildens opdatering er 8. oktober 2026; præcis metadata står i JSON-filen.

Udtrækket dækker WGS84-boksen `[7.7,54.4,15.6,57.9]`, inklusive danske øer,
fjorde og omgivende hav. Det bevarer alle 762365 kystpunkter i 6639 polygoner;
ingen ringe, øer eller punkter er fjernet ved forenkling. Huller og overlap
behandles særskilt. Binær delta-pakning bruger 1e-7-graders præcision. Hele
afrundingsusikkerheden og selve kystgrænsen er ukendt, ikke bevist vand.

Den normale browserkalder kræver SHA-256
`27ad5fe81a31ca56f51586404f2400a52109cc34b130d95af68157bfa73e22dc`.
Masken gælder alene blå piles visning ved den uændrede originale koordinat.
Vejrdata, scorer, provenance og administratorens land-/vandpunkter ændres ikke.

Ved en kontrolleret kildeopdatering bruges
`node scripts/build-current-arrow-land-mask.mjs --build` i et checkout uden
eksisterende egen originalkopi. Builderen gemmer den fulde regionale original
privat før pakning. `--from-original` genbruger den uden netværk. Masken bygges
ikke i vejrhentningen. Begge kommandoer opretter kun en særskilt
`.cache/current-arrow-land-mask/candidate.json` og erstatter ikke den godkendte
offentlige fil. Kandidaten skal bevares og kontrolleres før en afgrænset
releaseopdatering af den offentlige fil og browserens låste checksum.
Ny maskes checksum, nationale land-/vandprøver og normale
browserkalder skal bestå før release. Se DEC-0293.
