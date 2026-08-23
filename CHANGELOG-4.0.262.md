# RavRadar 4.0.262

- Retter Candidate G's transporthukommelse, så produktionens verificerede native strømbeviser må ligge op til tre timer fra hinanden.
- Integrerer den faktiske tid mellem beviserne uden at opfinde mellemliggende timeprøver. Mere end tre timer eller missing forbliver et fail-closed datagab.
- Begrænser den ejeraccepterede pre-public opvarmning til et kort, sammenhængende `WINDOW_INCOMPLETE`-vindue. Manglende seneste bevis, missing inde i vinduet eller tidsgab vælger legacy globalt.
- Tilføjer `candidateWarmupEligible` til profilgaten og eksakt genafspilning af kompakt transportstate i den dataminimerede 210/673-shadow.
- Låser native tre-timers fortsættelse, et komplet 17-punkts/48-timers vindue, opdelt mod ubrudt replay og fire-timers gap i målrettede tests.
- Bevarer Candidate G `20/50/30`, 0,03→0,15 m/s, +10/-8 point pr. effektiv time, udtransport fra 13 effektive timer, mobilisering 4/48 og vindstyret waders-jagtbarhed.
- Bevarer `RRS-CURRENT-B0-4.0.247` med `25/40/35` som eksakt global rollback. Automatisk aktivering og blandede profiler er fortsat forbudt.
- Ændrer ikke artifact, protected-dirty-data, privat cache, geometri, land-/vandpunkter, bundmodel eller sikkerhedsbetydning. I `data/kystdata.json` og `data/zones.geojson` ændres kun versionsfeltet til 4.0.262.
