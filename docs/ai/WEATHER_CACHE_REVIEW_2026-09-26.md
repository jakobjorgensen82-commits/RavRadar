# Kort helikoptergennemgang – 4.0.492, 26. september 2026

## Faktisk kæde og evidens

- Main 4.0.491 `197f3cc3`, merged PR #454; exact-head `36208248292` grøn.
- R2-migration `36225146256`: 2 generationer/5 objekter/199.955.131 byte;
  hashes/readback og anonym afvisning består. Supabase-originaler bevaret.
- Normalrun `36225273085`, job `108358020913`: R2-read, 11Z-migration/
  installation, 15Z-tabsanker og hentning af præcis krypteret fremdrift
  består. UTC-input er `2026-09-26T06:00:00Z`; samleren accepterede kun
  `.000Z`. Stop før nye DMI/Copernicus/Open-Meteo-kald, publish og Pages.
- Cache `weather-private-progress-encrypted-v2-Linux-main-36183093672-1`
  findes, 56.603.798 byte; genbekræftet i GitHub 26/9 kl. 07:32 UTC.

## Reproducerede fejl og samlet rettelse

1. UTC-format: den virkelige seconds-only-streng giver samme stop i den
   krypterede CLI-kæde. Normalisér kun eksakte UTC-timer, med/uden `.000`.
   Negative minutter/sekunder/fraction/offset/kalenderdato og manglende
   input skal afvises uden installation. Historisk lignende rettelser i
   4.0.404/405/437 havde ikke dækket den nye 4.0.490-helper.
2. Overlappende Open-Meteo-originaler: bank A kan vælge svar X for time 1
   og svar Y for time 0, selv om Y også indeholder time 1. Den tidligere
   samler genafspillede Y først og kunne erstatte X eller genindføre
   fravalgte timer. Syntetisk originalbundet test genskaber
   `OPEN_METEO_PART_RECOVERY_LOST_VALID_RECORD`. Ny operationel samler
   genvaliderer begge bankers originaler og sammenfatter kun valgte
   poster: seneste bank først, beskyttet bank kun på huller; retention,
   budget, DMI-only-vandstand og efterfølgende originalvalidering består.
3. Diagnostik: faste årsagskoder gør unionstrinnets fejl synlige. Vilkårlige
   exceptiontekster, private paths, svar og credentials udgives aldrig.

## Tværgående konsekvenscheck

- Ændring direkte i score-importeret bankmodul ville ændre begge
  modelpakker og continuation, kræve databasebinding og ændre de
  installerede conditions-bytes, som den krypterede fremdrift er bundet
  til. Derfor ligger rettelsen i `verified-open-meteo-generation-union`.
  Den gamle backfill-helper er bevaret som inaktiv legacykode med sine
  eksisterende kompatibilitetstests, ikke som produktionssamler. Ingen
  produktionskald bruger den længere; workflowtesten låser dette.
- Begge eksisterende modelpakker er verificeret uændrede. Ingen ny
  database-, source-prioritets-, score-, geometri- eller punktændring.
- Installer er atomisk overlay og sletter ikke en gammel bank, som
  ikke findes i progress-pakken. Fejlet rename rulles tilbage; usikker
  rollback stopper. Baseline- og bundlehash kontrolleres før installation.
- Copernicus forener valgte nativeposter med original NetCDF/static/
  receipts og eftervaliderer dem; den bruger ikke OM's svar-replay.
  15 Copernicus-original-/transporttests består.
- R2-upload bevarer immutable objekter, bruger byte-/SHA-readback og
  2 GB bucketloft. Den aktuelle læsevej er livebevist, men næste nye
  private publish/retention og Pages er endnu ikke livebevist.
- De beskyttede generationer er fra 24/9 kl. 11/15 UTC. Den eksisterende
  72-timersgrænse er ikke udløbet under analysen og ændres ikke.
- De 35 målrettede JS-kontroller omfatter reel krypteret restore/CLI,
  overlap på temperaturtimer, forkert krypteringsnøgle/base, rollback,
  bytes/kvoteloft, 72-timerskrav og workflowrækkefølge. Linux sourcegate
  kræves på PR-head; den fulde ecCodes-pakke kan ikke installeres i den
  lokale Windows-runtime, og det er ikke produktionsfejl.

## Bevidst ikke konkluderet

De 34 tidligere vandtemperaturtab er ikke bevist løst. Resthuller og
korrekt leverandørfordeling i vind, bølger, havstrøm, vandstand og
vandtemperatur skal måles efter den virkelige korte kørsel. Ingen
fuld-cachepåstand, lang genhentning, stateless reset eller genstart af
cron. Dagens kvoteopgave er sprunget over efter ejeren; permanente
Free-budgetmålinger og 30 % reserve består. Ingen garanti for gratis drift.

## Næste

Versions-/RDKS-kontrol, én exact-head PR-gate, sikker merge og én kort
normalrun med `quick_confirmation=true`, `quick_progress_source=36183093672-1`.
Følg restore, alle tre providers, fem no-loss-tal, R2-publish og Pages.
Ved konkret ny fejl: ingen lang ny kørsel; gem evidens og ret årsagen.
