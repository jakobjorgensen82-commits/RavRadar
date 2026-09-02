# RavRadar 4.0.320 – deterministisk DMI-gridgenbrug før integreret cutover

**Dato:** 2026-09-02
**Status:** Lokal kandidat. Candidate G er fortsat offentlig. Exact-head, én frisk isoleret 673 × 118-currentpreflight, det separate Feggesund 3 × 118-wavebevis, sikker merge, fuld produktion/releasegate/artifact/Pages, atomisk state-6-aktivering og offentlig desktop-/mobilverifikation afventer.

## Rodårsag og rettelse

- De isolerede preflights beviste, at DMI leverede DKSS-assets, men at producenten brugte titusinder af high-level `codes_grib_find_nearest`-kald, som genopbyggede samme grid-søgestruktur for hvert kystpunkt. Første asset brugte cirka 388 sekunder, senere assets cirka 51 sekunder, og kun 47 af 118 forecasttrin blev behandlet på 2.852 sekunder. Det var en lokal beregningsflaskehals, ikke dokumentation for et landsdækkende DMI-hul.
- `scripts/update-dmi-bulk.py` opretter nu ét ecCodes-nearest-handle pr. GRIB-message og genbruger det med `CODES_GRIB_NEAREST_SAME_GRID` efter første vellykkede opslag. Manglende low-level API stopper i smoketesten; den gamle langsomme fallback kan ikke passere ubemærket.
- Cacheidentiteten bruger `md5GridSection`, `GRID_LOOKUP_VERSION=9`, ecCodes API-version og Python-bindingens version. Den offentlige `gridDefinitionSha256` forbliver den eksisterende legacy-definition, så målt historik, provenance, state og recovery ikke re-identificeres af en ren performanceoptimering.
- Eksakte DKSS-currenttimer behandler fortsat de obligatoriske `current-u`, `current-v` og `sea-mean-deviation`. Valgfrie marine felter følger den etablerede tretimersstride. Samplingpunkt, 5 km-grænse, spatial-first-/lagvalg, missing- og provenancekontrakter er uændrede.
- Hvert asset behandles copy-on-write mod public cache, privat stage, current-shadow, collection-outcome og diagnostics. Kun en grøn komplet assetvalidator committer; interruption, exception og validatorfejl ruller hele assettet tilbage uden `processedStep` eller falsk collection-success. Én fælles controller checkpoint'er bulk og sidecars kompakt/atomisk senest efter otte committede assets eller 60 sekunder og ved forced grænser. Fuld clean/summarize/ocean-diagnostics og pretty finalisering sker én gang ved terminal write.
- Isoleret run `33604589582` bevarede progressionen, men viste, at 26–27 gamle fuld-cache-checkpoints kostede cirka 1.105 sekunder. Main-runs `33591129416`, `33608982473` og `33617117320` beviste, at DMI-filerne kunne hentes, men den gamle main-parser stoppede på tekstlig gridmetadata (`type str doesn't define __round__ method`) og deployede intet. 4.0.320 accepterer kun finite numerisk gridmetadata, bevarer teksthashen som provenance og lader exact-gap-selector stoppe bred Copernicus-erstatning.
- Tolv dynamiske transaction/checkpointtests, 21 WAM-bootstraptests, producent-/workflowtesten, native provenance og uafhængig slutreview er grønne uden P1/P2-fund.

## Uændrede kontrakter

- DMI er primær. Copernicus må først efter grøn DMI-terminalgate supplere eksakte dokumenterede part-/timehuller; ingen bred erstatning eller syntetisk historik tilføjes.
- Modellen er fortsat `RRS-COASTAL-PROCESS-INTEGRATED-1.1.0`, state `6.0.0`, med uændrede model-/bundlebindinger. Manglende ældre historik giver `HISTORY_INCOMPLETE` med score, interval, advarsel og `calibrationEligible=false`; manglende direkte input er fortsat timevis `UNAVAILABLE`.
- Ingen scorevægt, geometri, kystnormal, zone, land-/vandpunkt, privat payload, koordinat eller rå U/V ændres eller offentliggøres.

## Åbne releasebeviser

- De afgrænsede Python-/Node-/workflow-/smoke-/proveniens-/grid-/checkpointtests er grønne på den aktuelle slutdiff; GitHub skal nu bevise den committede exact head.
- PR'ens eksakte head skal bestå `validate:source` én gang.
- Derefter skal én isoleret preflight bevise operationel current for alle 673 kystdele × 118 timer med DMI-first og exact residual Copernicus. Feggesunds privacy-sikre tre bølgekystdele × 118 timer bevises særskilt.
- Først derefter må branchen merges, den fulde produktions-/releasekæde køre, og state 6 verificeres offentligt på desktop og mobil.
