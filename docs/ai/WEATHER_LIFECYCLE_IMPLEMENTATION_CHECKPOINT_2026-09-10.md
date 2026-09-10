# Vejrlivscyklus – permanent implementeringscheckpoint 2026-09-10

## Nuværende arbejdsgrænse

**AKTUEL VERIFIKATION:** Ejeren har bekræftet Sol Ultra, fastholdt launchovervågningen og bedt revidere udskudte opgaver mod det, rettelsen faktisk løser. Plan/DMI/checkpoint/WAM, CP-/OM-banker, recovery, runner/checker/closure, workflows og privat runtime er måltestet grønt. Windows-PATH og to testfixtures er afklaret uden ny producentændring. Modelbinding er konsistent; runtimepakkehash beregnes på endelig kode. Se WEATHER_LIFECYCLE_TEST_EVIDENCE_2026-09-10.md for faktiske kommandoer/resultater og read-only cachekapacitet. Ny head/CI/merge/drift afventer. Ældre udsagn om ingen tests nedenfor gælder det forudgående implementeringscheckpoint, ikke nu.

**NYERE EJERGODKENDELSE 2026-09-10:** Lokale måltests er nu godkendt, og ejeren har bestilt autonom fortsættelse til stabil cache, scorelaunch, efterkontrol og udskudte opgaver. Se AUTONOMOUS_WEATHER_LAUNCH_PLAN_2026-09-10.md i samme mappe. Gamle afventnings-/testpausebeskrivelser nedenfor er historiske og må ikke blokere den godkendte fortsættelse. Den annullerede gate34398417483 må stadig ikke genstartes. Anbefalet model til næste kritiske fase er Sol Ultra; ejer er bedt skifte før hovedarbejdet. Ingen tests udført ved denne autorisationsopdatering.

Dette er fortsættelsen af den samlede ejerbestilte analyse og rettelse efter computerfrysningen. Start IKKE helikopteranalysen forfra og genstart IKKE den annullerede kildegate. Kvalitet prioriteres over hastighed. Se også WEATHER_COLLECTION_SYSTEM_REVIEW_2026-09-09.md i samme mappe.

- Branch: codex/wam-same-run-resolution-4.0.340. Eksisterende committed/pushed PR #274-head: c4043bf7f0ae0e9ed147263bb49cce3cd5fc7abc.
- Main er senest verificeret b0ca7f5d / 4.0.339. Kildegate 34398417483 er completed/cancelled. Den integrerede scoremodel er ikke dokumenteret online; Candidate G er senest verificerede offentlige model.
- Ingen tests, compile, providerkald, workflowdispatch, staging, commit/push, merge, backendwrite eller produktion er udført i dette implementeringsafsnit. De nye tests er kun skrevet.
- Ejeren er spurgt asynkront, om de korte målrettede LOKALE tests må køres, når pakken er samlet. Ved dette checkpoint er der ikke registreret et svar. Den udtrykkelige tidligere ordre var ikke at genstarte den annullerede GitHub-test; også lokal eksekvering er midlertidigt pauset som forsigtighed indtil afklaring, ikke som ny permanent ejerregel. Spørgsmålet autoriserer ikke GitHub-genstart, weather eller deploy. Respektér et eventuelt nyere svar.
- Arbejdet er endnu IKKE releaseklart. De tidligere grønne WAM-/bindingschecks gælder ikke nye lokale filer. Genererede model-/SQL-/Edge-/releasebindinger er ikke genbygget efter denne større rettelse.
- Aktuel kritisk indsats: Ultra. Skift ikke til rutinemodel midt i bank-/proof-/fallbackintegrationen.

## Implementeret lokalt før dette checkpoint

1. Fælles præcis 118-timers henteplan fra valideret CP/OM og policyregional dækning. DMI bruger planen alene til prioritet, aldrig som DMI-proveniens. Plan bygges før DMI og igen efter DMI før CP. Fejl i valgfri plan giver konservativ fortsættelse.
2. DMI bevarer ældre gyldig tuple+proof indtil konkret ny atomisk erstatning; newer processing metadata alene afskærer ikke genbrug. Same-run officielle revisionsværn består.
3. DMI-checkpoint genbruger ledgerbyggerens fulde validerede attestation inden for samme checkpoint. Cadence, fsync, atomisk writer og uafhængige readers består. Ingen tvær-checkpointmemoisering.
4. Genuine-cold-start bevarer/validerer historik men springer fuld historiknetwork over før operationelle behov. WAM-mode, begge WAM-familier, nødvendig lagbro og strict candidate-g-migration består.
5. **Korrigeret efter consumer-/gatereview:** Parent-strøm er valgfri oversigtsdata, ikke et krav til den integrerede PART-score. Der findes 12 dokumenterede geografiske parenthuller. Parent-only currentMissing må derfor hverken gøre et asset kritisk eller genåbne et færdigt processed asset; den første lokale modsatte ændring er fjernet før test/produktion. Med gyldig plan kræves PART-uniondækning, ellers native PART-tuple/proof. Andre komponenter, bounded kvalitetsrefresh og terminal PART-spatial skipping bevares.
6. CP-positiv admission følger præcis original record/acquisition og oprindelige forsøg. Dagens korte negative journal må ikke kassere ældre gyldige positive beviser. Quality-bank bygges fra fuld donorstate, ikke residualprojiceret stage.
7. CP samme-source/samme-nyeste-acquisitionAt-modstrid vælges ikke efter hash. Fysisk/policymæssigt ækvivalente dubletter må vælges deterministisk; modstrid gør kilden ineligible for dette par, også ældre alternativer. Anden gyldig kilde eller missing fortsætter. Strengt nyere entydig acquisition kan senere løse.
8. CP-checker er bank-aware: afvist bank eller projectionmismatch kan ikke lade gammel READY springe runneren over. Checker skriver ikke/quarantinerer ikke; runner ejer recovery.
9. OM donorbank, bevaret original acquisition, fejlstyret retry, meningsfulde timeoutbudgetter, adskilt strict v2-projektion og privat recovery er skrevet. Se dog den kritiske OM-manifestrettelse nedenfor: første lokale salvageudgave var ikke sikker.
10. Workflowintegration normal/oneoff/pilot/postbuild-quality er skrevet. Legacycachepaths bevares præcis (CP2, OM1, postbuild6), fordi cachepathændring ellers kan miste gamle restorematches. Nye banker har egne fælles private cachefamilier; bank-save før legacyprojection-save under fornyet exact-main-autoritet.
11. Alle tre præ-rebase sletninger af CP-stage er fjernet. Originale beviser importeres før rebase. Kun tre eksplicitte safe plan/fetchrapporter uploades, syv dage, før terminalgates.
12. Nye rootfiler: scripts/lib/weather_acquisition_plan.py, scripts/build-weather-acquisition-plan.py, scripts/test-weather-acquisition-plan.py. Planbyggerens efter-DMI-rapport skelner DMI-egenrest fra samlet unionrest; ukendt DMI giver null, ikke falsk nul. Store bankobjekter frigives mellem providers.
13. Tre nye producerfiler er tilføjet PRIVATE_RUNTIME_CONTRACT_FILES: planbygger, common planlib, CPbanklib. package.json test:weather-acquisition omfatter plan, OMbank og workflowregression og kaldes via eksisterende CP/source-lane. CPbankregressioner ligger i eksisterende test-copernicus-current-source-stage.py.
14. Aktive DEC-0118/0119/0114, ACTIVE-REQUIREMENTS, begge håndbøger og changelog er opdateret med tydelig lokal/ikke-testet status.

## Bankmanifest og vedvarende konfliktmasker – implementeret og statisk reviewet

Den første OM-salvageudgave maskerede part/time fra selve den beskadigede record. Hvis skaden ændrer partId eller validTime, rammer masken forkert par, og en modstridende rask søskende kan blive falsk entydig. Dropped > 0 tillod samtidig brudt bankchecksum. Et senere legacymerge kunne desuden genindføre parret, fordi masken ikke blev bevaret på tværs af generationer. Dette er et konkret statisk P1-fund, ikke kørt test.

CP's første nye bankudgave var alene strict whole-bank; en enkelt beskadiget leaf kunne derfor gøre alle bankdonorer utilgængelige. Originalbytes blev bevaret og andre providers fortsatte, men det er ikke den ønskede granulære håndtering.

Dette er nu implementeret samlet i de NYE, endnu ikke deployede banker:

- Selvstændigt intakt header/manifest binder ORIGINAL record/acquisition-identitet, part/time/source/acquisitionAt og relevante proofafhængigheder.
- Intakt manifest giver afgrænset identifikation af manglende/beskadigede leaves. Maskescope må ikke udledes af den ødelagte payload.
- Masker består gennem targetskift, startup/checkpoint/quality-save, planprojektion og legacy-API. De ophæves først ved strengt nyere, entydig og fuldt positivt admitted tuple eller legitimt retentionudløb.
- Fuld donorreserve og brugbar projektion holdes adskilt. En afledt filtreret projection må aldrig blive den eneste kilde til bankwrite og derved slette maske/konfliktvidner.
- Uafklaret header/manifest/registry/policy/proofkorruption kræver fortsat whole-quarantine. Ukendt bevis kan ikke opfindes.
- Nye regressioner skal dække part/timekorruption, slettet konfliktvidne, flere generationer, gammel legacyimport, inadmitted versus admitted nyere tuple, disjunkte gode par, quality og afbrudt bankwrite.
- CP-quarantine er nu afgrænset til to fuld-SHA-filer og højst 1GiB pr. logisk path, ingen automatisk sletning/overskrivning. OM har to private quarantine-slots pr. bank/v2. Remote save er en selvstændig hændelse; local donor_bank_written er ikke fjernlagringsbevis.

Begge manifestimplementationer er færdige og uafhængigt statisk reviewet. CP havde yderligere et crashvindue: karantænering kunne fjerne bankpointeren før ny atomisk bankwrite. Begge berørte grene bruger nu preserve_source=True; originalen bliver liggende til replace. OM kopierer allerede uden pointerhul.

Planbyggeren bruger nu også OM merge_donor_bank(existing, []) i hukommelsen før udvælgelse. En reparerbar leaf må ikke fjerne alle raske OM-reserver fra DMI/CP-prioriteten. Originalfilhash bevares, ingen bankwrite i planner, og uafklaret control/proofskade må ikke genoplive legacy. Hume har genlæst denne kobling og de skrevne fixtures.

CP og OM eksporterer donor_bank_written straks efter faktisk atomisk bankwrite, før projektion. OM eksporterer checkpoint_written straks efter faktisk strict-v2-write, før safe-report. Senere fejl må ikke skjule allerede gemt progression fra workflowets cache-save. Local flag er stadig ikke bevis for remote save.

Der er ingen resterende konkret P0/P1 i de afgrænsede slutreviews, men INTET er funktionelt testet. CP's 168 timers retention plus fremtidige 117 timer bevarer flere versioner pr. par. Vækst, faktisk RAM-forbrug og afstand til 1GiB-loftet er umålt; afvist oversize-write bevarer gammel bank, men bæredygtig drift er ikke bevist.

## Afsluttede ejerskaber og review

- release_chain_final_review (Hooke): CPimplementation afsluttet; derefter uafhængigt review af fælles plan og normal/oneoff-kobling.
- wam_independent_review (Harvey): OMimplementation og korrigeret DMI-kravafgrænsning afsluttet. Filer frigivet.
- binding_chain_review (Hume): workflow- og release-dependencyinventory afsluttet; uafhængigt review af CP, OM og OM-planrettelsen afsluttet.
- Root: fælles plan/builder, package/bindinginventory, uafhængig DMI-afgrænsning, RDKS/handbooks/checkpoints og samlet integration.

## Hvad stadig skal ske

1. Indhent/afklar autorisation til den forberedte korte lokale målmatrix. Der er nu skrevet plan-/builder-, CP-/OM-bank-, crash-/konflikt-, DMI-prioritet/genbrug/checkpoint/cold-start- og workflowregressioner. Kør ikke den annullerede GitHub-test.
2. Funktionel verifikation og måling mangler. Koden skal bevise donor→bedre kilde→donor, timeskift, interne huller/hale, ugyldig leaf, vedvarende maskering, nyere heling, partial-save og konsistente normal/oneoff-readers. Ingen gamle grønne resultater må genbruges som bevis for nye filer.
3. Genberegn den fulde producerbinding på endelig kode. Nye Pythonproducenter er med i det manuelle fullRuntimeContract-inventory, inklusive copernicus_target_identity.py. Modelbundles og score-/continuation-ID ændres kun, hvis deres faktiske afhængigheder ændrer fingerprint; Pythonændring alene kræver ikke automatisk nyt model-ID. Bevar otte applied migrationer bytefast; pending migration9 og øvrige consumers skal matche det faktiske finalresultat. Intet nyt hash må gættes.
4. Nødvendige autoriserede lokale måltests, exact-head CI og kontrolleret release følger senere. User har IKKE autoriseret genstart af den annullerede gate ved dette checkpoint.
5. Faktisk main-vejr skal bevise komplet current/WAM/lagbro/Feggesund, korrekt genbrug og holdbar tid. Først da same-head-handoff, backendreadiness, fulde post-data-gates og atomisk modelcutover.
6. Efter launch består tabsfri privat runtime-/archive-/egress-transport i shadow og målt genaktivering af bæredygtig ekstern cron; ingen blind hyppig drift nu.

## Uændrede levende bevisgrænser

Seneste oneoff34387410217: DMI42926/79414, CP-primaryrest1923, regional472, OMrequired1451/retained739/fetched177/filled916/missing535; WAM MISSING_HOUR; provider-saves grønne, intet handoff. Forrige run34371642565 manglede324. Tre timers windowshift og29 berørte dele giver mindst124 tilbagefaldne overlappar; deres konkrete årsagsfordeling er ikke målt. Hele535-restens aktuelle leverbarhed, faktisk WAM-lukning og normal vedligeholdelseshastighed er ikke bevist af koden.

## Fil- og toolhygiejne

Bevar .cache, .tmp-*, forensic worktree og scripts/inspect-*. De er ikke releasefiler. Ingen geometri/land-/vandpunkter ændres.

Windows workspace-ACL kræver ofte escalated read/write. Direkte apply_patch har fejlet; working fallback er:
C:/Users/Lenovo T14/AppData/Local/OpenAI/Codex/bin/fd4c151a749f3ab4/codex.exe --codex-run-as-apply-patch
Patch gives via PowerShell here-string. Den gamle 8e5b... exe findes ikke mere. Ingen shell write-tricks, tests eller compile som genvej.
