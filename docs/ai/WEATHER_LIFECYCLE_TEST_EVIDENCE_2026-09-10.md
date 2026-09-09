# Lokal målverifikation – vejrlivscyklus og WAM – 2026-09-10

## Scope

Ejer har godkendt lokale tests og bekræftet Sol Ultra/autonom fortsættelse. Testene kører på branch codex/wam-same-run-resolution-4.0.340: committed base c4043bf7 plus den samlede lokale rettelse. Ingen ny CI, providerhentning, commit/push, merge, backend eller produktion er kørt i dette testafsnit.

Resultater gælder testenes konkrete kontrakter på koden ved udførelsen, ikke al RavRadar-funktion eller produktionsstabilitet. Senere relevante kodeændringer kræver ny målrettet verifikation. Tests har syntetiske/isolerede input og må ikke ændre den eneste bevarede produktionscache.

Python bruges fra C:/Users/Lenovo T14/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe med -B. Node-tests, der starter Python, får samme mappe forrest i processens PATH og PYTHONDONTWRITEBYTECODE=1; ingen systemglobal ændring.

## Root-resultater

| Kommando / testfil | Faktisk resultat |
| --- | --- |
| Python scripts/test-weather-acquisition-plan.py | Exit0,16/16,0,030s testtid. Præcis union/reference, donor-recovery i memory og ukendt DMI→null. |
| Python scripts/test-dmi-dkss-primary-mode.py | Exit0,primary-kontrakt bestået. Kritiske PART-huller versus valgfri parentstrøm og kvalitet. |
| Python scripts/test-dmi-native-provenance.py | Exit0,eksakt producent/reader-paritet bestået. |
| Python scripts/test-dmi-transactional-checkpoint.py | Exit0,21/21,0,152s testtid. Syntetiske karantæne-/afbrydelsesscenarier indgår. |
| Python scripts/test_dmi_wave_bootstrap_update_integration.py | Første fulde løb:23/24 bestået, én gammel rækkefølgeassertion fejlede. Se præcis afklaring nedenfor. |
| Python scripts/test_dmi_wave_bootstrap_update_integration.py ResumeAndFailClosedTests.test_oneoff_reuses_candidate_target_and_gates_wam_after_progress_save | Efter testrettelse: Exit0,1/1. De andre23 blev ikke gentaget uden relevant kodeændring. |
| Node scripts/test-weather-acquisition-workflows.mjs | Exit0. Legacy-cacheversioner, separate banker, advisoryplan og selvstændige slutgates bestået. Statisk workflowkontrakt. |
| Node scripts/test-workflow-validation-order-4.0.108.mjs | Efter midlertidig PATH-klargøring: Exit0,workflowinventar og underliggende DMI-oneoff9/9. |
| Node scripts/test-copernicus-cache-preservation-4.0.232.mjs | Exit0. Statisk cache/save/karantænekontrakt. |
| Node scripts/test-dmi-forecast-store.mjs | Exit0. Forecast Store/Water Level Engine inkl. WAM-seam. |
| Node scripts/test-resolve-candidate-g-wave-bootstrap-target.mjs | Exit0. Aggregate bootstrap-target. |
| Node scripts/test-ravscore-production-adapters.mjs | Exit0. Strømproof, afvisning af ubeviste zoner, vinder og margin. |
| Node scripts/sync-ravscore-model-binding.mjs --check | Exit0.8 consumers matcher integrated hash8a94a4ef1f33c7e9714ac5b634037ae3a4b5d9b7c2861230f32e766696d02c80. Ingen generation/write udført. |
| Node scripts/test-release-contract-metadata.mjs | Exit0. Deterministisk releaseContract og immutable migrationsbinding. |
| Python scripts/test_dmi_wave_history_bootstrap.py | Exit0,35/35,0,726s testtid. Eksakte/same-series/mixed-series WAM-scenarier. |
| Node scripts/validate-rdks.mjs | Exit0. RDKS,14 chatkilder og håndbog for4.0.340. Senere dokumentdelta skal kontrolleres igen ved endelig pakke. |
| Node scripts/validate-release-version.mjs | Exit0.4.0.340 konsistent i app/admin/manifest/service worker/workflowroller/releasekontrakt. |

## De to første teststop – afklaret uden ny producentændring

1. Workflowtesten starter selv kommandoen python. Windows PATH pegede på Store-aliaset, selv om den installerede runtime findes. Første run exit9009. Midlertidig process-PATH til samme bundled Python som projektets validate-source.ps1 fjernede miljøfejlen; efterfølgende fuldt workflowcheck bestod. Ingen dependency-geninstallation eller repo-runtimeombygning.
2. WAM-integrationsfixture krævede fortsat OM-restore EFTER Copernicus-hentning. Den nye godkendte unionplan kræver restore af ALLE fallbackbanker FØR DMI. Testen kræver nu eksplicit CP-bank, OM-legacy, OM-bank og plan før DMI; progress-saves før terminal WAM-gate består. Kun denne test er ændret, ingen producentadfærd er lempet. Det tidligere røde scenarie er grønt ved snæver genkørsel.

## Afsluttede parallelle grupper og supplerende rootcheck

| Testfil | Faktisk resultat |
| --- | --- |
| test-open-meteo-donor-bank.py | Exit0,32/32,1,515s testtid. Ingen cacheændringer. |
| test-open-meteo-current-fallback.py | Exit0,28 navngivne scenarieblokke; ingen indbygget unittesttæller. |
| test-copernicus-current-source-stage.py | Først exit1 efter20,4s: ny proof_attempt-fixture manglede target_part_ids. Testhelperen blev bundet til acquisitionens egne targets og samme shard-scope. Efter test-only-rettelse exit0,ca.61s;38 dokumenterede scenarie-/kontrolblokke. Ingen lempet produktionsadmission. |
| test-copernicus-range-runner-v2.py | Exit0,ca.12,5s, monolitisk assertionssuite. |
| test-copernicus-range-checker-v2.py | Exit0,ca.3,9s, monolitisk assertionssuite. |
| test-current-operational-closure.py | Verificeret exit0,6/6,0,004s testtid. Første kommandos resultat gik tabt i lokal JS-outputwrapper; derfor én genkørsel med korrekt resultatopsamling. |
| test-copernicus-heartbeat-4.0.232.py | Exit0,heartbeat-kontrakt bestået. |
| test-private-production-runtime-workflow.mjs | Exit0,ca.3s. |
| test-private-production-runtime-bundle.mjs | Exit0,ca.1s. |

De to reelle testfixture-rettelser er workflowrækkefølgen ovenfor og CP-helperens acquisition-scope. Ingen producentkode er ændret i denne testfase. OM-agentens første forkert stavede Pythonsti startede ingen test; kun de efterfølgende faktiske bundled-runtime-resultater tæller.

## Binding og read-only driftsstatus

privateRuntimeContractHashes er beregnet read-only: continuationStateContractSha256=7fbe180011fa745e3b0c3a5365c0234358c711e7c8cab425d3c188e248154417; fullRuntimeContractSha256=3e5485844d066a9d886ae93f009eb35455f18e52e58164e34d35d43910218c35; publicProjectionContractSha256=7b255a1143493797c0157afa97976c49f73d6a251f3a431b097a9601652cb7e7. De er checkoutbyte-hashes, ikke normaliserede SQL/model-implementationhashes. Ny privat runtimepakke skal dannes på endelig kode; tidligere pakker må ikke ommærkes. Model-/rollback-/continuation-JS ændres ikke i dette delta, så Pythonændringerne alene kræver ikke nye SQL-bindinger. Den allerede pending niende WAM-migration består.

Read-only GitHub: PR274 er åben på c4043bf7, main senest b0ca7f5d; ingen ny CI eller weatherdispatch udført. Cacheinventar47 poster,10.166.365.283 byte, heraf9.742.641.482 rå GRIB-byte. Seneste DMI-, CP- og OM-generationer er listet; dette siger ikke noget om deres fulde indhold. Usage-API viste44 poster, mens liste-API viste47; usage kan være forsinket. Storage-/retention-limit-GET svarer HTTP402 med krav om betalingsmetode. Den faktiske konfigurerede grænse er ukendt; ingen betaling, køb, sletning eller indstillingsændring. Kilde: GitHubs officielle REST cache- og dependency-caching-dokumentation, læst2026-09-10.

## Næste kontrolgrænse

Afsluttede tilstødende checks: test-regional-current-operational.py exit0 (5 navngivne testfunktioner), test-current-operational-live-builder.py exit0 og test-current-operational-live-adapter.mjs exit0. Ingen rettelser. Common plan er stadig advisory; exact residual og positiv sourceadmission forbliver selvstændige.

Endelig pakkecheck: Alle fem SOURCE_BINDING_PREFLIGHT-kommandoer kørt sekventielt og exit0: rollback-bundle --check, model-bundle --check, sync-ravscore-model-binding --check, sync-release-contract-metadata --check og test-open-meteo-binding-migration. Håndbogens installationskopi synkroniseret; validate-rdks, validate-release-version og test-security-hardening er grønne. git diff --check er grøn. Sammenligning med origin/main viser kun den niende nye migrationsfil; de otte anvendte er uændrede. Særskilt geodatadiff er1/1 linje pr. fil, og strukturel JSON-sammenligning uden topfeltet version er identisk i både data/kystdata.json og data/zones.geojson (4.0.339→4.0.340).

Målmatrixen er afsluttet. Næste trin er staging/privacykontrol, commit/push af samlet pakke og én ny exact-head-CI. Den gamle annullerede gate genstartes ikke. Ingen79.414/79.414-, WAM-live-, hastigheds-, kvote- eller driftsgaranti kan udledes af lokale tests. Efter docs-delta genkøres kun den korte RDKS-kontrol, ikke de uændrede producenttests.
