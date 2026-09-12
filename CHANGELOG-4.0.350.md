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
- Integrated bundle: `a575f767abf127ec1677268b9f310f5c6f569ea6d822af5ab09e16c187389bd6`.
- Candidate G-rollbackbundle: `ca18452294f87451bda4e73c188e18990379f9328ca1107a571459f5ae1d9528`.
- Continuationhash: `dce13d51ab2cdbf80effb17634c451f7318a88efee021d542f0e7656a689ea5f`.
- Kildegaten skal kun køre én gang på PR'ens eksakte slut-head. Fulde post-data-kontroller består fortsat for hvert nyt produktionsartifact.
- Den første lokale slutmatrix var grøn, inklusive de tunge offentlige 210/673-runtime- og auditregressioner, versionskontrol, RDKS-validering og ren slutdiff.
- PR #285's første sourcegate afslørede, at den historiske migrationskædetest brugte den aktuelle modelbinding til at genopbygge 4.0.349-leddet. Historiske 4.0.349-hashes og migrationens SHA-256 er nu fastlåst, mens 4.0.350 kontrolleres som et separat append-only efterfølgerled.
- PR #285's næste head `66338d63`/run `34717905077` bestod migrationskæden og samlede tre senere fejl: Candidate G-public stage og ture blev fejlagtigt sendt gennem den integrerede availability-policy, og releasegaten søgte efter den tidligere inline-historikvalidator. En fælles modelafhængig validator bevarer nu integreret lokal `UNAVAILABLE`, men kræver fortsat Candidate G som komplet 210/673 med fuld historik. Releasegaten følger den fælles fail-closed-validator. Lange lokale fuldpakketests gentages ikke; ny exact-head-CI er beviset.
- Versionen er lokal, indtil exact-head-CI, merge, backendreadback, cache-only cutover og offentlig 210/673-verifikation er grønne. Normal vejrdrift forbliver deaktiveret indtil da.

Se DEC-0132.
