# RavRadar 4.0.243

## Ændret
- Turrapporter bruger en versioneret v2-kontrakt for komplette søgeture i stedet for enkeltfund som kalibreringsenhed.
- Brugeren vælger søgemetode, zone og kystdel ved start og bekræfter faktisk sted, søgegrundighed og fund/ikke-fund ved afslutning.
- Faktisk start, slut, varighed og turens midtpunkt bevares, også når brugeren svarer senere.
- Prognosedatasæt og et kompakt tilladt kalibreringssnapshot fastholdes ved turstart.
- Stedskift bevares som dækningsdata, men markeres som ikke egnet til automatisk kalibrering.
- Fjernpayloaden udelukker GPS, rute, spor, koordinater og præcis position.
- Den tabsikre lokale kø og observations-outbox genbruger samme UUID ved genforsøg.
- Historiske observationer bevares som v1; RavScore 25/40/35, regler, pile, data, geometri og land-/vandpunkter er uændrede.

## Validering
- Målrettet turkontrakt, observationsprivatliv og app-syntaks er grønne.
- Isolerede mobil-dialoger bestod ved 390 x 844 uden overflow eller browserfejl.
- Integreret Browser-plugin-flow bestod med 210 zoner, start/stop, samme kystdel og nul browserfejl uden at indsende testsvar.
- Den fulde hurtige kildegate bestod kode-, score-, DMI-, workflow-, RDKS-, håndbogs- og privatlivstrin.
- Release-gaten bestod for 4.0.243 efter oprettelse af denne versionsspecifikke changelog.

## Åbne releasekrav
- Supabase-migrationen skal anvendes og verificeres på public.observations.
- Derefter kræves release-gate, PR-gates, exact-commit deploy og fuld 210/673-browserkontrol.
- 4.0.242 er fortsat produktionssandhed indtil alle krav er afsluttet.
- Afstemt turupload med produktionens historiske bigint-skema via unik klient-UUID og eksplicitte tekst-id'er for faktisk zone/kystdel.
- Anvendt og verificeret de additive v2-databasefelter samt server-side privacy-politikker uden historiske rækker eller præcise positioner.
