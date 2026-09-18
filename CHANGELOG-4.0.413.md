# Changelog 4.0.413

4.0.413 retter den eksakte live-recovery fra 4.0.412. Run `35342779550`
verificerede immutable artifacts og den offentlige 4.0.410-side, men stoppede
før databasekaldet, fordi recovery-validatorens gamle eksakte feltliste ikke
indeholdt den nyere, korrekte `profile`-blok i runtimeauditten.

Recovery accepterer fortsat den historiske rapportform uden `profile`. Når
feltet findes, kræves den eksakte kendte struktur med boolske readinessfelter,
unikke sikre advisories, overensstemmelse mellem deklareret og forventet profil
og samme antal utilgængelige current-scorer som historikregnskabet. Rapportens
fastlåste hash, artifacts, livebevis og alle øvrige recoverygrænser er uændrede.
