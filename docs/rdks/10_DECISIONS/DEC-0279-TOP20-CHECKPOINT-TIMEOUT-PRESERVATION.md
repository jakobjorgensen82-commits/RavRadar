# DEC-0279 – Bevar checkpointets eksisterende 55-sekundersgrænse

**Dato:** 2026-10-02. **Status:** Afgrænset4.0.532-kandidat; ikke leveret.

## Konkret regression og autoritet

Ejeren bad igen om at fortsætte Top20. DEC-0278s særskilte godkendelse af
bindings-/migrationsvalg og deploykontrol består; fysisk score, handicap,
sortering, målinger og historik er urørte. Ingen særskilt SQLinstallation.

PR499/head d70a91c3 bestod exact-headCI36975932551/proof11213148423 og blev
merged som mainefd3f45d09:06:20 dansk. Kode-only36976884378 stoppede ved
checkpointpublicering54 før privat slutbundle og Pages.25–30 binding/readback
bestod, så20261002080000 er anvendt og må ikke omskrives. Offentlig530 med
seneste ordinary36964052139-data er bevaret. Cron8348098 blev midlertidigt
pauset efter konkret fejl; schedule/payload/credentials er uændrede.

Kildekontrol fandt en reel regression:20261002080000 reassertede30s efter
DEC-0249s allerede anvendte20260928112500 havde sat den samme RPC til55s.
Den eksisterende test kontrollerede kun den gamle55s-fil, ikke sluttilstanden
efter alle migrationer. Den nye assertion reproducerede30s≠55s.
Dette er bevis for kontraktregressionen, ikke en aflæst fejlkode fra run54.
78sekunders trintid beviser ikke selv et database-timeout.

Ejeren godkendte kun faste sikre fejlkoder. GitHubs hele private joblog blev
fortsat afvist af automatisk sikkerhedsreview også med efterfiltrering.
Ingen rå log/private data blev hentet, gemt eller vist; ingen alternativ
browser/transportomvej. Rettelsen bygger på den uafhængigt reproducerede
kilderegression, ikke på en opdigtet logdiagnose eller bredere adgang.

## Minimal append-only genopretning

20261002094500_restore_checkpoint_cas_timeout.sql genopretter kun den
eksisterende funktionslokale55s. Ingen forøgelse ud over den tidligere
godkendte grænse, global role-/databaseindstilling, payload/stateændring,
CASlempelse, ny modelbinding eller providerkørsel.30s- og55s-forgængerne og
anvendtTop20-migration bevares byte-/LF-identiske.

Den samme service-role-only metadata-RPC får én ekstra check af den faktiske
pg_proc.proconfig for netop CAS-funktionen. Alle tidligere definitioner,
ACLs og checks bevares; anonym/authenticated execute er fortsat afvist.
Readback afviserfalse/null/manglende55s-check. Den offentlige RPC returnerer
fortsat ingen checkpointpayload; ingen nye credentials eller rettigheder.

Readiness kræver41 navngivne migrationer. Den eksakte checkpointdefinition
læses fortsat fra den navngivneTop20-bindingsmigration, ikke blindt fra den
nyeste driftsmigration. Kode-only-planen må kun anvende den ene nye sidste
migration. Både gamle sikkerhedsgates og nye migration/readbackkrav består.

## Evidens og levering

Eksisterende workflowtest RED30s≠55s; derefter workflow/readiness2/2PASS
499.8705ms/0skip, inklusive hårde negative live-checkfixtures. Det er ikke
SQLruntimeudførelse. Exact-headCI og faktisk migration/readback/checkpoint/
privat cache/R2/Pages-kæde kræves før leveretstatus. Ingen blindretry.
Gamle autentificerede femrækkeindeks bevares ved kode-only; Top20-effekt
kræver efterfølgende almindelig beregning og offentlig pc-/mobilkontrol.
Backup/ny kontrolleretTop5-tilbagevej fra DEC-0278 består. Storrevision519
og dens OFF-/CP/S/T-/writer-/runner-/kapacitetsgrænser er separat arbejde.
