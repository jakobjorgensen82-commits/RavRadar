# RavRadar 4.0.362 – online først med rettet H0-vind og currenthold

**Dato:** 2026-09-14
**Status:** Lokal releasekandidat; exact-head-CI, merge, handoff, cutover og offentlig verifikation mangler.

## Faktisk grundlag

- 4.0.361 blev merged gennem PR #298 som main `6337fa09065b38bc578dad1a81a83ddd505bbd0d`.
- Handoff `34804412079` havde et fuldt regnskab over 79.414/79.414 currentpar uden providerhentning. Det betyder, at hvert par havde et klassificeret udfald; ikke at hvert par havde et tal.
- Cutover `34805083829` byggede alle 673 dele og kørte 272 kontroller. 271 var grønne; den rumlige strømaudit stoppede deploy.
- Diagnose `34820407527` viste H0: vind 669/673, bølger 673/673, direkte current 659/673, otte gyldige state-only-holds, seks lokale currentmangler og vandstand 669/673. Alle scorer var null på grund af en modelrunskant i vindinputtet.

## Rettelser

- DKSS-`windTail` finder nu et sikkert interval inden for samme native modelrun, når det globale nabopar krydser to runs. Primær HARMONIE-vind må fortsat ikke krydse modelruns.
- Den integrerede og den bevarede rollback-vej bruger den eksakte private currentkildereference ved et godkendt H0-hold. Højst tre timer, korrekt provenance og ingen nyere endelig currentværdi kræves.
- Senere null-evidens bevares som ukendt historik. Holdet bliver `HISTORY_INCOMPLETE`; der opfindes ingen vektor eller bevægelse.
- Modelbundles er genbygget og bundet gennem den nye append-only migration `20260914010000_h0_reference_recovery_binding.sql`.

## Første launch

- Den brede reference-, fuld-validate-, releasegate- og datavalideringsblok gentages ikke inde i 4.0.362-cutoveren. Udfaldene registreres som sprunget over.
- Exact-head sourcegate køres én gang på PR-head. Runtimebygning, databasebinding, beskyttede writes, privacy, artifact og offentlig deploy består som tekniske trin.
- En ærligt utilgængelig score må gå online. Live-systemet bruges derefter til den videre fejlsøgning.
- Ingen oneoff før launch. Efter offentlig kontrol genaktiveres almindelig weather for at bevise cachevedligeholdelse og DMI-rotation.

Se DEC-0144.
