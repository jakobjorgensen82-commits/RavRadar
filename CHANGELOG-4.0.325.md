# RavRadar 4.0.325 – terminalbevist active-bootstrap

Dato: 2026-09-05

## Rettet

- En første active-bootstrap afhænger ikke længere af én hardkodet, kortlivet GitHub-cachekey. Resolveren gennemgår tilgængelige main-scopede legacycacher i nyeste rækkefølge.
- Før en key må bruges, genverificeres dens eksakte GitHub run-id via det immutable attempt-endpoint, main/workflowidentitet samt `success` for DMI-producent, den tilhørende progressive zonecache-save og DMI-terminalkravet. Main-keyen skal være entydig og have gyldig cacheversion; manuelle pilot-/118h-kørsler afvises før cache-restore uden for main.
- Actions-cache-restoren får kun resolverens eksakte key og bruger ingen `restore-keys`. Det gendannede dokument skal fortsat bestå strict `DMI_READY` og det eksakte kystdelsregister, før det kan materialiseres som active-donor.
- En definitiv 404 på en enkelt cachekandidats run/attempt prøver næste ældre kandidat. Netværksfejl, 401/403/429/5xx, ufuldstændigt inventar og øvrig evidensusikkerhed stopper fail-closed. Den private scheduled pilot må blot springe over, når et komplet inventar ikke indeholder en bevisbar donor.
- GRIB-, kandidat- og researchcache gemmes kun efter et faktisk startet, ikke-annulleret DMI-producentforsøg. Et skipped producenttrin kan derfor ikke længere kopiere den restorede 2,78 GB GRIB-cache til endnu en unik run-key.

## Uændret

- Active/candidate-isolation, atomisk READY-promotion, fuld target..+117-kontrol, intern-gap-/haleudfyldning og tre normale DKSS-collections er uændrede.
- DMI → Baltic → AMM15 → policybundet regional DMI → Open-Meteo, historikvinduer, ekstern cron, GitHub-reserveschedules, geometri, punkter, model og scorelogik ændres ikke.

## Evidensstatus

PR #257 bestod exact-head `33989875253` og blev merged som `948ba60b365dc604056ac0c719bd67645b3e3478`. Den efterfølgende ventende kørsel `33991028274` blev stoppet under checkout, før DMI, cachewrite, protected write eller deploy, fordi den daværende hardkodede donor ikke længere fandtes.

Run `33991952081` bekræftede den gamle fejl på merged main: sourcegaten blev grøn, men den hardkodede og forsvundne key stoppede før DMI; det skipped DMI-trin blev alligevel efterfulgt af en ny 2.778.397.542-byte GRIB-save. Den nye no-skipped-save-regel lukker netop denne cachechurn.

Resolver-unit, active/candidate-kontrakt, workflowrækkefølge og reusable-kontrakt er grønne. Den skærpede read-only liveprøve valgte entydigt cache-id `7369179233`, version `2f5a0598…`, run `33990516150` attempt 1 og 48.847.855 byte; producent, save og terminaltrin var grønne, mens runnet først fejlede senere i Copernicus. Det er DMI-donorbevis, ikke komplet vejr- eller produktionsbevis. Exact-head, merge, første active-save, frisk fetched/missing, fuld produktionsgate og komplet 210/673/118 afventer.
