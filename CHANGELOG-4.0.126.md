# RavRadar 4.0.126

## GeoDanmark kystgeometri-v2 pilot

- Tilføjer en parallel, score-neutral geometri-v2 kontrakt med source manifest, pilotområder, migrationsklasser, kystdele, fjord-/havn-/å-eksklusioner og score-neutrale ravfælde-hypoteser.
- Tilføjer en read-only geometri-audit og dokumenterer den målte baseline: repositoryets 209 zoner, den centralt effektive offentlige bestand på 208 zoner, overlap og eksisterende centrale multi-ankre.
- Tilføjer gratis GeoDanmark-adgang via `DATAFORDELER_API_KEY` som GitHub repository secret. Secretværdien indgår ikke i kode, logs, dokumentation, artifacts eller commits.
- Tilføjer et isoleret manuelt `geometry_v2_pilot`-job i det eksisterende workflow. Det hydrerer central admin-sandhed før download, henter kun afgrænsede pilotområder, har ingen Pages-rettigheder og kan ikke ændre offentlig runtime eller RavScore.
- Pages-artifactet udelukker v2-kildedata, arbejdsmappe og geometri-dependencies. Releasegaten og workflowtesten kontrollerer denne isolation og scanner også Datafordeler-secretmønstre.

## Ikke ændret

- Ingen aktive zoner, navne, kystlinjer, adminoverrides, DMI-data eller RavScore er ændret af 4.0.126.
- Første reelle GeoDanmark-fetch afventer den manuelle CI-pilot. Resultatet må ikke kaldes CI- eller produktionsverificeret før den konkrete run og private rapport er kontrolleret.

