# Changelog 4.0.280

## Om RavRadar-billedet

- Familiebilledet på **Om RavRadar** er vendt fysisk korrekt i billedfilerne. Visningen er derfor ikke længere afhængig af, om browseren læser kameraets EXIF-orientering.
- Tre komprimerede portrætvarianter bruges responsivt: 540 × 720, 900 × 1200 og 1350 × 1800 pixel.
- På pc står billedet opret ved siden af teksten. På mobil står det opret over teksten uden vandret rulning.
- Service-workerens appskal og den målrettede Om-side-test bruger kun de nye, korrekt orienterede varianter.
- Ejerens originale billeder er ikke ændret eller flyttet.

## Uændret

Candidate G 20/50/30, RavScore, vejr- og havdata, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er ikke ændret. De beskyttede geodatafiler ændrer kun topversionsfelt 4.0.279 → 4.0.280.
