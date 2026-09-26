# DEC-0255 – Privat produktionscache til R2 med målt Free-budget

**Dato:** 2026-09-26
**Status:** AKTIV BESLUTNING; lokal implementation, liveovergang ikke bevist

Supabases foregående periode brugte 11,9 GB cachet og 6,45 GB øvrig
egress mod Free-grænser på 5 GB for hver kategori. Organisationen blev
begrænset med HTTP 402. Ejeren har midlertidigt opgraderet til Pro;
kontoen viser nu Pro uden den tidligere spærring. Den store private
produktionsruntime flyttes til en ny privat Cloudflare R2-bucket i EU,
Standard-klassen. Offentlig Pages-levering, Supabase-admindokumentet
med current/previous-pointer, Auth, små operationelle beviser og
checkpoint bliver på deres eksisterende platforme. Dette er ikke en
generel databaseflytning.

Før skift skal *begge* pointerrefererede generationer kopieres fra
Supabase til R2 og læses tilbage med samme SHA-256, byteantal og
samlet archive-hash. Anonym læsning skal være afvist. Kopiering ændrer
hverken pointer eller Supabase-originaler og kan genoptages. Én delt
produktionskø forhindrer samtidig vejr-publish. Den første R2-restore
og efterfølgende publish skal verificeres på aktuel main, før almindelig
vejrhentning udvides. Ingen tom cache eller stateless erstatning er
tilladt ved R2-fejl. Efter nye R2-only-generationer er den gamle
Supabase-kopi ikke længere en automatisk aktuel rollback.

Workflowets backend er Supabase, indtil den særskilte migration og
R2-secrets er på plads. R2-token må kun have Object Read & Write på
den ene private bucket. Bucketens lokale 2.000.000.000-byte-tærskel
stopper nye objekter før 10 GB Free storage; den er **ikke** en
Cloudflare-kontodækkende betalingsgrænse. Bucketens drift kræver
regelmæssig kontrol af faktisk kontoforbrug: Standard-lager, Class A,
Class B og evt. billable usage. Cloudflare Free omfatter aktuelt
10 GB-måned Standard-lager, 1 mio. Class A og 10 mio. Class B pr.
måned; anden brug på kontoen tæller også. Infrequent Access bruges
ikke. Billingsalarm er kun varsel efter registreret forbrug, ikke
en hård spærring.

Den aktive Codex-kontrol `ravradar-r2-og-supabase-kvoter` aflæser
kontokvoter hver sjette time og varsler ved 70 % af R2's Free-grænser,
enhver fakturerbar R2-udgift, fremskrevet Supabase-egress over
3,5 GB i en kategori eller manglende måletal. Den kan varsle, men kan
ikke forhindre en Cloudflare-opkrævning; det kræver fortsat den lokale
bucketgrænse, begrænset nøgleadgang og opfølgning på varsel.

Supabase må først sættes tilbage på Free, når flere faktiske døgn efter
R2-skiftet viser, at både cachet og øvrig månedstrafik fremskrevet fra
den normale drift holder sig under 3,5 GB hver, dvs. 30 % reserve mod
5 GB. Database, Storage og andre Free-kvoter skal også være under
deres grænser med reserve. Første nulstilling ved Pro-opgraderingen
er ikke et sådant bevis. Hvis målingen ikke består, beholdes Pro eller
findes den resterende kilde, før downgrade. Beslutningen ændrer ikke
de fem feltvise vejrgates, DMI-prioritet, score eller offentlig kontrakt.
