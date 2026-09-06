# RavRadar 4.0.326 – regional shadow-rollover før Open-Meteo

Dato: 2026-09-06

## Rettet

- Den regionale DMI-shadow beholder fortsat syv dages private prøver, men en prøve fra et ældre modelrun behandles ikke længere som en hashkonflikt med den aktuelle strict-validerede DMI-ledger.
- Ældre prøver er fortsat utilgængelige som kilde i den aktuelle closure. Det konkrete restpar går derfor videre til Open-Meteo i den allerede besluttede kildeorden.
- En hashafvigelse inden for det modelrun, som den aktuelle ledger faktisk har valgt, stopper fortsat fail-closed. En revideret officiel asset kan fortsat kun vinde med sin eksakte ledgerbundne erstatningsprøve.
- Open-Meteo-CLI''en kan nu føje en allowlistet, versal domænekode til den generiske residualplanfejl. Private del-id''er, koordinater, rå U/V, payloads og fritekst kan ikke vises.

## Produktionshændelse

- Oneoff-run `34004697179` gjorde DMI og Copernicus terminalt READY. Copernicus dækkede 7.408 af 8.512 eksakte restpar og efterlod 1.104 til regional DMI/Open-Meteo; rådgivende historik havde fortsat 417 mangler.
- Open-Meteo stoppede før første netværkskald med `OPEN_METEO_RESIDUAL_PLAN_INVALID`. Den 168-timers regionale shadow og den aktuelle single-run-ledger kunne reproducere den fejlagtige konfliktklasse syntetisk.
- Normalrun `34004873418` gemte ny DMI-kandidat-/GRIB-/shadowfremgang, men producenten nåede ikke terminal success og stoppede korrekt før supplement og deploy.

## Uændret og næste bevis

- DMI → Baltic → AMM15 → policyregional DMI → Open-Meteo, 673 × 118, targetfriskhed, 48-timers modelhistorik, active/candidate-isolation, ekstern cron og GitHub-reserveschedules er uændrede.
- Geometri, land-/vandpunkter, scoreformel, model-id og stateversion er uændrede.
- De korte regionale-, closure- og Open-Meteo-tests er grønne. Exact-head-kildegate, merge og en ny stor main-oneoff skal bevise rettelsen med de bevarede cacher; komplet vejr, produktionsgates og modelaktivering er endnu ikke bevist.
