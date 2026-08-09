# RavRadar 4.0.143

## National geometri-v2-kildekæde
- Tilføjer en central-hydreret national arbejdsplan, som kræver 208 effektive zoner.
- Opdeler kysten i deterministiske officielle kildefliser og klassificerer kendte semantik-/partitionsfejl samt centrale adminændringer.
- Tilføjer et separat privat GitHub Actions-job til national GeoDanmark-hentning og deduplikering uden Pages-rettigheder.
- Bevarer alle aktive zoner, admin-data, vejrserier, state og RavScore uændret.

## Status
- Lokale kontrakt- og self-tests, RDKS, releaseversion og releasegate er grønne. Alle validate-deltests er grønne bortset fra den kendte Windows-begrænsning i Linux/rsync-artifacttesten.
- Første private nationale CI-kørsel, artifactaudit og den efterfølgende topologigenerator mangler.
