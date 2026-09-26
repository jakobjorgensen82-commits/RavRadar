# DEC-0255 – Privat produktionscache til R2 med målt Free-budget

**Dato:** 2026-09-26
**Status:** AKTIV BESLUTNING; migration og restore bevist, ny publish/deploy afventer

## Måling 2026-09-26 efter skiftet

Run `36232521656` gendannede fra aktiv R2, men stoppede før ny
produktionsskrivning og Pages. Cloudflare viste fem objekter/
199,96 MB, 38 Class A, 33 Class B og $0,00 for 26/9–26/10.
Supabase Pro viste 0,00 GB Egress og 0,00 GB Cached Egress i den
netop begyndte periode. Koden bruger R2 for den store private
runtime, men Supabase til admin-/pointer-/deploy-beviser, og gamle
Supabase-objekter bevares til rollback. Denne ene måling kan ikke
godkende tilbagevenden til Free; mål flere faktiske driftsdøgn.

## Målt milepæl 2026-09-26

PR #454/4.0.491 er merged. Bucketbegrænset token og GitHub-secrets
er oprettet efter ejerens bekræftelse. Run `36225146256` kopierede
to generationer/fem objekter/199.955.131 byte og bestod byte-/SHA-
readback samt anonym afvisning uden at ændre pointer eller originaler.
Backend er skiftet til R2. Kort run `36225273085` gendannede cacheparret,
men stoppede før providers på et UTC-formatkrav i samleren. Lokal
4.0.492 retter dette og den reproducerede overlap-fejl i OM-unionen.
Ny R2-publish og Pages er stadig ikke bevist. Ejeren sprang dagens
kvoteopgave over; de permanente måle- og Free-returkrav består.

Nedenstående beskriver fortsat beslutningens regler; kravene om
token/kopiering før backendskift er nu opfyldt, ikke udestående.

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
den ene private bucket. R2's konto-ID bindes særskilt som
`RAVRADAR_R2_ACCOUNT_ID`; den eksisterende `CLOUDFLARE_ACCOUNT_ID`
til andre Cloudflare-funktioner må ikke stiltiende genbruges.
Bucketens lokale 2.000.000.000-byte-tærskel
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
