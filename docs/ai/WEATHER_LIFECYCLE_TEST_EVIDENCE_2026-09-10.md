# Lokal målverifikation – vejrlivscyklus og WAM – 2026-09-10

## Tillæg – lokal 4.0.341-kandidat

Efter 4.0.340 blev merged, blev WAM-promotion ændret lokalt, så ufuldstændige modelrun-kandidater ikke kan forringe aktiv cache. Følgende nye resultater gælder den konkrete lokale kode ved udførelsen:

| Kontrol | Faktisk lokalt resultat |
| --- | --- |
| `scripts/test_dmi_wave_bootstrap_update_integration.py` | 52/52 bestået. Dækker isoleret kandidat, umiddelbar hul-/halepromotion, quality-promotion ved fuld faseafslutning, budget/interrupt, terminal ældre fallback og checkpoint-resume. |
| `scripts/test_dmi_wave_history_bootstrap.py` | 35/35 bestået. Eksakt/same-series valg og fortsat afvisning af mixed-run-interpolation. |
| Python `py_compile` for ændrede producentfiler | Bestået. |
| `scripts/test-private-production-runtime-workflow.mjs` | Bestået efter eksplicit binding af den direkte importerede `dmi_wave_history_bootstrap.py` til den fulde private runtimeattestation. |
| `git diff --check` | Bestået; kun de kendte LF→CRLF-advarsler på Windows. |

Samlet status er **kun lokal målverifikation**. Ingen 4.0.341 exact-head-CI, merge, providerhentning, normal-/watchdogkørsel, cachepromotion, artifact, deploy eller offentlig modelkontrol er udført. Resultaterne beviser derfor kontrakterne med syntetiske/isolerede input, ikke produktionsstabilitet eller faktisk hastighed.

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

Den samlede lokale 4.0.341-slutmatrix genkørte WAM-producentintegration `52/52`, WAM-historik `35/35`, vejrplan `17/17`, Open-Meteo-donor `32/32`, transaktionelle checkpoints `21/21`, schedulerpakken, DMI-lagring/proveniens/DKSS/vind, private runtime-, versions-, håndbogs- og cutoverkontrakter. Tre gamle testforudsætninger blev afstemt: parsergeneration 19 → 20 i en marine-fixture; en fokuseret AST-sele fik den copy-on-write-type, som produktionsmodulet allerede definerer; og model-downloadtesten følger nu helperen, der adskiller generisk assetkomplethed fra bevist aktiv WAM-closure. Det er test-only; ingen completeness-, provenance-, cache- eller releasegrænse er lempet. Et lokalt første forsøg uden bundled Python på `PATH` startede ikke de indlejrede Pythonchecks og tæller ikke som produktfejl; samme workflowtest og DMI-kontrol bestod med projektets bundne runtime.

privateRuntimeContractHashes er genberegnet read-only på den samlede lokale 4.0.341-kandidat: continuationStateContractSha256=7fbe180011fa745e3b0c3a5365c0234358c711e7c8cab425d3c188e248154417; fullRuntimeContractSha256=04e4adbbfb44ec7ee8f5360489c4cf0deeccf9c085d13d794a81cdd9ad78295a; publicProjectionContractSha256=d3d4ba55f389b0536c9a704e559dfbb04ed8bbe1fcfbeebfa98e51b41e1e6e3c. De er checkoutbyte-hashes, ikke normaliserede SQL/model-implementationhashes. Full-runtime- og public-projection-hashene følger både den nye WAM-bootstrapbinding og versionssweepet; continuation-state-kontrakten er uændret. Den aktive normaliserede continuation-implementationhash er ff1d884f32825f44fd5c1cafa6b3e211e44900dc0663261b86b890e0cbbb85f3 og er verificeret i den pending niende WAM-migration. Ny privat runtimepakke skal dannes på endelig kode; tidligere pakker må ikke ommærkes.

Read-only GitHub: PR274 er åben på c4043bf7, main senest b0ca7f5d; ingen ny CI eller weatherdispatch udført. Cacheinventar47 poster,10.166.365.283 byte, heraf9.742.641.482 rå GRIB-byte. Seneste DMI-, CP- og OM-generationer er listet; dette siger ikke noget om deres fulde indhold. Usage-API viste44 poster, mens liste-API viste47; usage kan være forsinket. Storage-/retention-limit-GET svarer HTTP402 med krav om betalingsmetode. Den faktiske konfigurerede grænse er ukendt; ingen betaling, køb, sletning eller indstillingsændring. Kilde: GitHubs officielle REST cache- og dependency-caching-dokumentation, læst2026-09-10.

## Exact-head-CI 34417094732 og afgrænset opfølgning

Exact head `e459b826e3fae296ca8074f9a9efeadb8a7f663d` bestod alle fem bindingspreflights og den fulde releasegate. Sourcegaten fortsatte derefter gennem de efterfølgende checks og stoppede alene i `test-copernicus-target-registry-4.0.244.py` med `Older retained DMI inverted a newer verified tuple`.

Lokal reproduktion og tre uafhængige gennemgange fandt en forældet fixture, ikke en ny producentfejl. Fixturet satte kun nyere kilde/outcome som `PROCESSED` metadata; den cached tuple og den genberegnede actual attestation forblev den ældre, præcist proof-bundne kilde. Det er den tilsigtede atomiske kontrakt: metadata alene må ikke slette brugbare data.

Test-only-rettelsen har to ben: metadata-only-ledgeren accepterer den gamle actual winner; når cachetuple og actual attestation faktisk skiftes til den nyere kilde, afvises det gamle retained proof som unused. Ingen produktionsfil er ændret. Den rettede target-registry-test er exit0, og `test-dmi-native-provenance.py` er exit0. To uafhængige reviewers fandt ingen analog gammel forventning eller ny P0/P1 i register→plan→fallback→closure-sporet.

## Exact-head-CI 34420641243 og handoff-opfølgning

Exact head `f44b7c9cb55bb89c5a15daed61d2c2b2996b1d2e` bestod bindingspreflight, den fulde releasegate og de nye plan-/provider-/closuretests. Første og eneste observerede stop kom derefter i `test-verified-weather-source-handoff.mjs`: testen søgte stadig efter det fjernede trin `Remove only invalid production Copernicus source disposition`.

Workflowet erstattede med vilje sletningen med `Preserve original Copernicus admission evidence before production rebase`. Det er den godkendte donorbankkontrakt: gyldigt originalt source-stage-bevis bevares, indtil det kan migreres kontrolleret. Test-only-rettelsen bruger det faktiske trinnavn, afviser eksplicit sletning af stage, shadow og donorbank og kræver handoff-værn på de nye donorbank- og plantrin. Den isolerede test og alle 14 efterfølgende workflowtests er grønne lokalt. Ingen produktionskode, workflow, migration, cache eller geodata er ændret i denne opfølgning.

Et uafhængigt workflowreview fandt ingen yderligere konkret P0/P1 i source-stage-, donorbank- og handoff-kæden. Det er statisk og lokalt bevis; faktisk GitHub-cache- og provideradfærd kræver fortsat en helt grøn exact-head-kørsel og efterfølgende kontrolleret main-runtime.

## Næste kontrolgrænse

Afsluttede tilstødende checks: test-regional-current-operational.py exit0 (5 navngivne testfunktioner), test-current-operational-live-builder.py exit0 og test-current-operational-live-adapter.mjs exit0. Ingen rettelser. Common plan er stadig advisory; exact residual og positiv sourceadmission forbliver selvstændige.

Endelig pakkecheck: Alle fem SOURCE_BINDING_PREFLIGHT-kommandoer kørt sekventielt og exit0: rollback-bundle --check, model-bundle --check, sync-ravscore-model-binding --check, sync-release-contract-metadata --check og test-open-meteo-binding-migration. Håndbogens installationskopi synkroniseret; validate-rdks, validate-release-version og test-security-hardening er grønne. git diff --check er grøn. Sammenligning med origin/main viser kun den niende nye migrationsfil; de otte anvendte er uændrede. Særskilt geodatadiff er1/1 linje pr. fil, og strukturel JSON-sammenligning uden topfeltet version er identisk i både data/kystdata.json og data/zones.geojson (4.0.339→4.0.340).

Målmatrixen er afsluttet. Næste trin er staging/privacykontrol, commit/push af samlet pakke og én ny exact-head-CI. Den gamle annullerede gate genstartes ikke. Ingen79.414/79.414-, WAM-live-, hastigheds-, kvote- eller driftsgaranti kan udledes af lokale tests. Efter docs-delta genkøres kun den korte RDKS-kontrol, ikke de uændrede producenttests.
