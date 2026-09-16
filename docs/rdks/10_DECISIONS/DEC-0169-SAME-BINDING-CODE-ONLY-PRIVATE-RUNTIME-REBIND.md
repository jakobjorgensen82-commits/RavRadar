# DEC-0169 – Same-binding code-only må genbinde den eksakte private runtime

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.387, exact-head og livebevis afventer
**Dato:** 2026-09-16

## Evidens

4.0.386 bestod exact-head `35050098674`, blev merged gennem PR #329 som main
`c38333549a4bcabe6884f88b5611ae61300ae44b`, og normalrun `35050697588`
stoppede før providers og writes. De to beskyttede runtimegenerationer blev
fundet, men begge blev korrekt afvist som `MODEL_OR_CONTRACT_INELIGIBLE`,
fordi ændringen i Open-Meteo-producenten ændrede `fullRuntimeContractSha256`.

Den eksisterende providerfrie code-only-vej blev derefter kørt som
`35051090133`. Den valgte korrekt action `integrated`, fordi RavScore-
modelbindingen fortsat er aktuel. Direkte restore blev forventeligt afvist,
men predecessor-steppet krævede fejlagtigt kun action
`integrated-historical-maintenance` og stoppede før restore, migration, writes
og deploy.

## Beslutning

- En aktiv same-binding `integrated`-vedligeholdelse må bruge den eksisterende eksakte predecessor- og `CONTRACT_ONLY_REBIND`-vej, når direkte current-restore afvises på kontrakten.
- `integrated-historical-maintenance` forbliver tilladt på samme private rebind-vej.
- Candidate G-actions, retur og cutover må ikke bruge denne rute.
- Forgængerens source head skal være en reel forfader til aktuel main; dens descriptor, manifest, bundle og private filer valideres med forgængerens egen kode før genbinding.
- Genbindingen må kun ændre kontrakt-/kildeidentitet. Vejr, scorer, geometri, målinger og alle private payloadfiler skal forblive identiske.
- Databasebindingsmigration udføres fortsat kun for `integrated-historical-maintenance`; en aktuel modelbinding får ingen unødvendig databasemigration.
- Den eksisterende `integrated`-Pages-afslutning resealer først central implementation closure efter verificeret offentlig deploy.
- Code-only genbruger PR'ens exact-head-kildebevis og kalder ingen vejrprovider.

## Afgrænsning

Open-Meteo-rotationen fra DEC-0168, RavScore, modelbinding, providerprioritet,
cacheindhold, geometri og offentlig datakontrakt ændres ikke. Normal weather
forbliver pauset, indtil 4.0.387 har publiceret den genbundne runtime.
