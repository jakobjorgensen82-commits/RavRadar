# RavRadar 4.0.350 – lokal utilgængelighed og samlet cutoverkontrol

Dato: 2026-09-12

## Rettet

- Den fælles RavScore-vejradapter accepterer nu den verificerede DKSS-komponent `windTail` ud over `wind` og kontrollerer fortsat, at deklaration og kildebevis er ens. Fejlen havde afvist gyldig vind for 659 af 673 kystdele i cachekontrollen.
- De otte godkendte regionale dele kan bruge deres closure-bundne `NATIVE_CADENCE_HOLD` i privat scoring, fordi live-current nu medfører den eksakte præ-H0-kildereference. Referencen valideres mod cache, proof, grid, lag, U/V og hash og bliver aldrig offentlig.
- Direkte inputmangel gør kun den berørte del, jagtform og time `UNAVAILABLE`; resten af den komplette 210/673-pakke fortsætter. Utilgængelige dele deltager ikke i rangering, og ingen score, værdi, retning eller historik opfindes.
- Den samme availabilitykontrakt håndhæves i conditions, manifest, audit, Pages, browserdataservice, administration og turstart. Nødruntime må kun genberegne den for den faktisk valgte, validerede time.
- `integrated-cutover` gennemfører nu runtimeaudit, referencezoner, fuld validering, releasegate og datavalidering i én samlet kontrolblok. Alle fejl samles uden payload; enhver fejl stopper før eksterne writes, mens fem grønne resultater automatisk lader cutover fortsætte.

## Binding og drift

- Ny append-only migration `20260912194206_local_unavailable_cutover_binding.sql` fører kun de tre nye model-/continuationforseglinger og readbackversionen frem. Den allerede anvendte 4.0.349-migration er uændret.
- Integrated bundle: `d3b6c829dfb0d66251d7ebf0b0f4d0a1c357bbf0083aa6076b3f8743eaca397d`.
- Candidate G-rollbackbundle: `343f9f539146c61fbd0b75e2c4d1148189f56602abb85bff24bbbd708e43aae2`.
- Continuationhash: `87ea235809d1c305d93fd04ae434ecca07e2c573b5e4929b5b8a7446687eec06`.
- Kildegaten skal kun køre én gang på PR'ens eksakte slut-head. Fulde post-data-kontroller består fortsat for hvert nyt produktionsartifact.
- Den lokale slutmatrix er grøn, inklusive de tunge offentlige 210/673-runtime- og auditregressioner, versionskontrol, RDKS-validering og ren slutdiff.
- PR #285's første sourcegate afslørede, at den historiske migrationskædetest brugte den aktuelle modelbinding til at genopbygge 4.0.349-leddet. Historiske 4.0.349-hashes og migrationens SHA-256 er nu fastlåst, mens 4.0.350 kontrolleres som et separat append-only efterfølgerled.
- Versionen er lokal, indtil exact-head-CI, merge, backendreadback, cache-only cutover og offentlig 210/673-verifikation er grønne. Normal vejrdrift forbliver deaktiveret indtil da.

Se DEC-0132.
