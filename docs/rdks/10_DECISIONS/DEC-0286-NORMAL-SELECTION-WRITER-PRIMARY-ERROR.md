# DEC-0286 – Bevar den normale selection-writers første gemmefejl

**Dato:** 2026-10-02. **Status:** Implementeret og måltestet i separat 4.0.539-kandidat; egen exact-head CI og produktion afventer.

Denne afgrænsede revision udtager kun den allerede RED-reproducerede normale
persistWeatherComponentSelections fra dirty519. Den faktisk normale updater
awaiter samme funktion før provenanceberigelse, offentlige timefiler og
kompakt privat output. Caller og gemmemarkørens kontrakt er uændrede.

writeFile/sync/rename kunne maskeres af senere eget close eller egen temp-
cleanup. To lokale failed-flags og catch/rethrow bevarer præcis første thrown
værdi. Kun eget handle/egen write-temp forsøges fortsat ryddet. Close-only
og cleanup-only er stadig hårde fejl, aldrig saved-marker-succes. Før valid
rename bevares tidligere ledger BYTEidentisk. Cleanup-only efter validrename
bevarer den komplette nye ledger og returnerer stadig ingen succes; ingen
rollback, pruning, ny retry eller løfte om repareret oprydning.

API/path/hash/bytes/format/admission, H0, kildeprioritet/DMI→CP→OM/96h,
argumenter/workers/budgetter, score/Top20/kolonner, model67/3a14/otte bindinger,
geometri/admin, SQL-runtime og plan forbliver uændrede. Ingen descriptor/
factory/OFF-stack eller whole519copy. FullCP-SførT/writer-eksklusivitet/
completedclose/kill/failure4min/runner/nationalkapacitet er IKKE hermed bevist.

## Målrettet evidens og actualcaller-grænse

Eksisterende BIG RED3primaryFAIL+2controlPASS277.7015ms genbruges, ikke
gentaget. Isoleret eksisterende runtime+selectionhistory20/20parent-subtest
units PASS443.2039ms/0skip:10 gamle runtimeparents og3 gamle historyparents,
2 genbrugte nye parents med5 undercases. Ikke20 nye cases eller ny matrix.
Gammel testtekst er byteidentisk, og de2parents er identiske med BIGs allerede
måltestede. Streng inversediff viser kun den ene funktion/ingen anden runtime-
delta; historyformat/caller og ejerens538tekst er urørte før versionssynk.

Existing normal-wireup-prøve “durable selected-input marker” PASS1/1,
107.5073ms/0skip. Den beviser eksisterende awaited/source-rækkefølge, IKKE
en fuld673dels updaterexecution. Ingen providers/privateinputs/installation.
Mekanisk539version/RDKS/begge håndbøger og relevant source-CI er selvstændige
krav før levering. Appliedmigrations immutable; SQL kun eksakt håndbogskopi.

Målrettede docs/privacy/model-version/code-only4/4PASS291.9898ms/0skip;
RDKS539/14chats, releaseversion, sourcecritical102, model67/3a14/ottebindinger
består. npm var ikke tilgængelig i denne shell; samme eksisterende
source-critical-gate.mjs blev derfor kørt direkte med Node, ingen installation.
Streng scopekontrol:75 andre filer kun539versionsløft, geodata kun topversion,
versionkontrakt kun version/tid, SQL udenfor eksakt håndbogspayload LF-SHA256
154c3443752d840124f4caed95663e8a2c5bea346302e4dc6231a13f8ff62325 uændret.
Testprefix-kontrollen blev præciseret til den faktiske tolinjede nye import;
alle gamle tests og de genbrugte nye parents er byteidentiske. Ingen ny
runtimesuite eller produktændring for kontrolværktøjets importafgrænsning.

## Aktuel levering og samme sammenlignelige dækning

539 er STACKED på538branch/head74805d6d65e8826871358c39e39b16a1520de7f6,
ikke main.538/PR506 er exact-headCI37038700918/job110943189843 SUCCESS19:17:11DK,
source8/unchangedtree9/proof10 bestået. Kun sourceproof11242055418/416bytes/
unexpired/privatePayloadIncluded=false blev hentet, ROOTmatchet SHA256
14ce88e9c2797bb2d8f0c76aa98814222d78a57fdf566865a507747f4e911a68. Hold538head
URØRT; ingen statuscommit/gentagenCI/merge til538branch. Attachment100cap,
slet intet.538 er endnu IKKE merged/deployed/offentlig.

Følg kun ejerens ONEordinary37036350223 fra18:47:48DK på offentlig537/main
1b3e172d, normalbudgetter. Cron8348098 aktiv/uændret22:19DK; ingen main/merge/
kode-only/binding/audit/oneoff/ekstraweather/cancel mens aktiv. Efter faktisk
completion/resultatkontrol lever538 FØRST via renewedgates/DEC0148false.
Derefter retarget539 tilmain og forny head/base/content/exactCI/ROOTproof/
writers før egen sikkerDEC0148false og actual effektkontrol. Klar538 må ikke
forsinkes af denne uafhængige writerrevision. Grøn run alene er ikke savebevis.

Ny PUBLIC12Z FIELDmåling19:10DK:366017/397070=92.1794645780%, før09Z
365481/397070=92.0444757851%,+0.1349887929procentpoint. SammehasValue/673×118×5,
alle118hashes/bytes/start-slutmanifest matchet. Wind89.7852/wave100/current
98.3895/level86.1221/temp86.6006%. Numericprognosefelter, IKKEstationsmålinger/
privatehistorik/provider-native/score/kausalretention. Forskellige rolling-
vinduer; ingen historikETA, ingen ny måling af stadigaktiveordinary. Taskens
nye public-weather-field-coverage-2026-10-02-12z.json bevares; genhent ikke
uændret1.3GB. Full519/OFF og alle særskilte admission/log/donor/PROXY/SOURCE-
afvisninger består. Valgt6.1Sol/Ekstrahøj/model/indsats/plan/kadence uændret.
