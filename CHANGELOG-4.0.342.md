# RavRadar 4.0.342

## Granulær, sikker provideradmission

- Bevarer 4.0.341's isolerede WAM-candidate, monotone pairpromotion, terminale fallback med egen modelRun og faseatomiske kvalitetsrefresh af allerede komplet WAM.
- Erstatter whole-asset-starvation med admission af komplette, exact-asset-provenancebundne `(partId, nativeValidTime)`-bølgetuples efter fuldt, ikke-afbrudt assetgennemløb og eksakt accepted/rejected-regnskab.
- Bevarer rejected wave-slices bit-for-bit og afviser fortsat hele stagen ved global asset-/tidsakse-/parserfejl eller risiko for blandet komplet native lineage på samme tid.
- Lader privat WAM-bootstrap checkpoint'e sikre tuples uden at markere en delvis asset/time som locked eller history-complete. Genuine cold-start og final historik-/migrationvalidering er uændret.
- Bevarer eksakte returnerede native Copernicus-U/V-par fra et strukturelt gyldigt shard, selv om andre bestilte timer mangler; kun den eksakte rest går videre til næste collection og Open-Meteo. Den varige schema-3 seamtest beviser denne overgang.
- Gemmer hvert attempts faktisk observerede native tider som `observedNativeValidTimes` i et eksplicit nested v2-contract, men accepterer fortsat legacy 4.0.341-attempts. Den immutable Baltic-prerequisite kan valideres, også efter at sidste Baltic-søskende er prunet; 169-timersregressionen er grøn.
- Bevarer fail-closed Copernicus-kontrol af tidsakse, timejustering, dubletter og requestmedlemskab. Tom provider-timeakse og native tider med subsekunder er retryable malformed, ikke no-record. Ingen tidsinterpolation, hold eller ommærkning er tilladt.
- Lemper ingen slutgate: current kræver 79.414/79.414; bølger kræver 79.060 native WAM-par plus Feggesund 354/354, nul mangler og nul uløste lineage-konflikter før handoff/cutover.
- Flytter DEC-0122's allerede ejerautoriserede first-cutover-undtagelse snævert til exact-release 4.0.342 med alle materielle størrelse-, storage-, checkpoint-, privacy-, readback-, closure- og releasekrav uændret.

## Evidensstatus

- Tre målrettede Copernicus-tests er rapporteret grønne: `test-copernicus-current-pilot.py`, `test-copernicus-range-runner-v2.py` og `test-copernicus-current-source-stage.py`.
- Testforløbet fandt først to fixturefejl i en 55-test-WAM-suite (`53/55`); efter korrektion var de to berørte regressioner grønne `2/2`. Den udvidede aktuelle WAM-suite er derefter samlet grøn `63/63`, inklusive lineage-evidence og en reel parser→provenance→summary→admission-kæde med to PARTs. WAM-historik er grøn `35/35`, checkpoint er grøn `21/21`, de tre Copernicus-måltests er grønne, og Python compile samt code diff-check er grønne. Exact-head-CI og main-/produktionsbevis mangler fortsat.
- 4.0.341-main-oneoff `34534764449` er negativt runtimebevis for whole-asset-grænsen, ikke positivt 4.0.342-bevis. Exact-head-CI, main-providerclosure, handoff, cutover og offentlig modelkontrol mangler.

## Uændret

Ingen RavScore-formel, modelparameter, geometri, kystnormal, land-/vandpunkt, central adminværdi eller cache-reset ændres. Candidate G forbliver offentlig, og normalworkflow/watchdog forbliver deaktiveret gennem den kontrollerede release- og cutoversekvens.
