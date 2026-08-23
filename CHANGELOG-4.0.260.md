# RavRadar 4.0.260

- Tilføjer en versionsbundet RavScore-profilomskifter med eksakte id'er for aktiv profil, Candidate G og rollbackprofil.
- Bevarer den offentlige `25/40/35`-score som både ønsket, aktiv og rollbackprofil. Candidate G aktiveres ikke.
- Kræver samlet Candidate G-dækning, frisk slutshadow og særskilt ejerbeslutning før et fremtidigt skift; manglende evidens falder globalt tilbage til legacy.
- Fører den valgte profil gennem offentlig startpakke, detaljepakke og manifest, så slutshadow og browserkontrol kan bevise én fælles model.
- Tilføjer testet Candidate G-projektion til den eksisterende offentlige scorekontrakt og eksakt rollback uden blandede zone-/timeresultater.
- Dokumenterer seks timers naturlig statefortsættelse som ejeraccepteret praktisk evidens, men ikke som et 48-timersbevis.
- Ændrer ikke artifact, protected-dirty-data, privat cache, geometri, land-/vandpunkter, bundmodel eller sikkerhedsbetydning.
- PR #92 bestod exact-head `32628441062` og blev merged som `c5898ce8`; produktion `32628516066` bestod hele releasekæden og udgav `rr-20260823083627-210`.
- Liveaudits består 210/673/1.346 og browserkontrollen 420/2.100/673 uden fejl. Den naturlige state er videreført til 9/9 timer uden nulstilling.
- Candidate G er fortsat score-neutral og ligger væsentligt lavere end aktiv score i den friske fordeling. Effekten af den unge transport-/mobiliseringstilstand skal gennemgås med ejeren før en senere aktiveringsversion.
