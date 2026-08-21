# RavScore regimehukommelse: merge- og produktionscheckpoint 2026-08-21

## Resultat

PR #56 blev merged til `main` som `cd2294666f2325aab553bbcf9450a8963af48477` efter groen exact-head-kildegate `32522938958` paa `aebfa61c79dcf025f17f697ba374f98edac8578b`.

Den naturlige exact-commit-produktion `32523092260` blev afsluttet groent:

- timed current-hour readiness bestod;
- central admin-konfiguration og godkendte kystdelspunkter blev hydreret;
- DMI-opdatering og eksakt DMI-huludvaelgelse bestod;
- der var ikke behov for en bred Copernicus-hentning;
- offentlig weather/runtime blev genbygget;
- fuld projektvalidering og releasegate bestod;
- supportartifact, Supabase-synk og Pages-artifact bestod;
- build-and-prepare tog 6 minutter og 54 sekunder;
- Pages-deploy tog 13 sekunder og bestod.

GitHub deployment `6028771928` peger paa praecis mergecommit `cd2294666f2325aab553bbcf9450a8963af48477`, miljoe `github-pages`, status `success`.

Direkte kontrol via GitHubs bekræftede Pages-adresse viste:

- `version.json` er fortsat 4.0.252;
- `js/core/ravscore-regime-memory.js` svarer HTTP 200;
- den deployede fil indeholder den forventede `buildExponentialRegimeMemory`-eksport.

Custom-domaenet `ravradar.dk` kunne ikke DNS-opslås fra den lokale Windows-session ved kontrollen. Det er ikke klassificeret som en RavRadar-fejl, fordi GitHub deployment og den officielle Pages-adresse begge er groen/tilgaengelig. Der paastaas ikke en separat live-datatælling fra custom-domaenet i dette checkpoint.

## Omfang

Mergepakken tilfoejer kun privat, score-neutral analyse og dokumentation. Modulet importeres ikke af den aktive RavScore. Offentlig score 25/40/35, UI, forklaringer, DMI-first, geometri og alle land-/vandpunkter er uændrede.

Der kraeves derfor ikke en ny fuld 210/673-browseraudit for dette delmaal. Den koeres igen ved en reel offentlig score-, UI- eller datakontraktaendring.

## Naeste trin

Naeste arbejdspunkt er kandidat G's lille dobbeltsporsmatrix:

1. 24-timers aktivt regimespor alene;
2. 48-timers baggrundsspor alene;
3. faa foruddefinerede blandinger af de to;
4. separate ablationer for stroem, boelger, lineart vindspor og vindstressspor;
5. derefter historisk replay og parret retningskontrol uden fremtidslaek.

Den endelige vaegtning og blanding er fortsat aaben og skal senere forklares grundigt i almindeligt sprog foer ejer-go/no-go.
