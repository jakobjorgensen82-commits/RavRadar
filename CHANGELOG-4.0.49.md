# RavRadar 4.0.49 – manuel kystlinjeeditor

## Formål

Denne version tilføjer et sikkert adminmodul til zonevis redigering af den synlige kystlinje. Modulet ændrer ikke automatisk brugerkortet og ændrer ikke zonernes polygoner, ID'er, vejr-routing, RavScore eller onshore-retninger.

## Arbejdsgang

- Vælg og søg en zone.
- Sammenlign den oprindelige linje med den redigerede linje på satellit- eller standardkort.
- Træk eksisterende punkter direkte.
- Klik på blå mellempunkter for at indsætte flere punkter.
- Dobbeltklik på et punkt for at slette det.
- Aktivér strandmarkørtilstand og klik på stranden. Nærmeste punkt flyttes til markøren, mens valgte nabopunkter formes gradvist.
- Brug fortryd, gentag og nulstilling pr. zone.
- Gem som central Supabase-kladde i dokumentet `coastline-overrides`.

## Sikkerhed og kompatibilitet

- Kladder påvirker ikke den offentlige side.
- Samlet eksport kopierer den eksisterende FeatureCollection og ændrer kun `properties.coastLine` for gyldige kladder.
- Polygoner og alle øvrige zoneegenskaber bevares.
- Automatisk kontrol finder manglende punkter, koordinater uden for Danmark, selvkryds, meget lange segmenter og store længdeændringer.
- Ugyldige kladder kan ikke gemmes eller eksporteres.
- Eksporten skal fortsat lægges på GitHub og gennem den normale validering.
- Eksisterende geometri-snapshots og rollbackmekanisme er uændret.

## Nye filer

- `js/core/coastline-editor-model.js`
- `js/ui/admin-coastline-editor.js`
- `scripts/test-coastline-editor-4.0.49.mjs`
