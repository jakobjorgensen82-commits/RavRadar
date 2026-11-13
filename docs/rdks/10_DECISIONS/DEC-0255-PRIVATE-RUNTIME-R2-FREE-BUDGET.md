# DEC-0255 – Privat produktionscache til R2 med målt Free-budget

## Tillæg 13. november 2026 — kun den kommende Source-vejrbucket får ekstra råderum

Den kommende Source-kandidat giver kun den eksisterende private vejrbucket et lokalt loft på 3.000.000.000 bytes gennem den normale R2-parameter. Adminarkiv, databasebackup og øvrige buckets beholder 2.000.000.000-byte-loftet. De tre kendte lokale lofter summerer dermed til 7 GB, men er ingen kontodækkende betalingsgrænse eller bevist Free-klarhed. Uændret maksimal vejrgeneration og 50 MB preflightmargin bevares; gamle unikke originaler slettes ikke. Dette er Source-only forberedelse, ikke en ændring af den fungerende 598-model eller en aktiveret kapacitets-/oprydningsløsning.

Hel-generationsreservation og sikkert dokumenteret retirement er fortsat særskilte krav. Det forhøjede loft må ikke finansieres med antaget sletning, og der gives ingen ny slette-, migrations-, nøgle- eller aktiveringsret. Den normale præcise Source-, CODE- og backendkvalifikation kræves før levering. Ældre 2 GB-vejrmålinger nedenfor bevarer deres oprindelige driftsperiode.


## Tillæg 13. november 2026 — selvstændig databasebackup uden ekstra tidsplan

**Status: aktiv bevarings- og leveringskontrakt; kode forberedt privat, automatisk udførelse ikke aktiveret.** Dette tillæg vedrører den separate private databasebackup og ændrer ikke den fungerende private vejr-cache eller dens pointere. De daterede målinger og tidligere migrationsforløb nedenfor bevares som historik.

Brug ét efterfølgende job i den eksisterende adminhistorikvedligeholdelse. Dets autoritet kommer fra den normale botbestilling, den præcise modtagerbinding og den afsluttede, verificerede almindelige vejrkørsel på samme main. Bevar den eksisterende OUTER-lås og turlagerets INNER-lås. Backupjobbet har egen Node24/CLI-klargøring og en frisk kontrol af mindst 35 minutter til kildevejrets oprindelige næste slot. Vejr- og manuelt backupworkflow ændres ikke; der oprettes ikke nye nøgler, buckets, tjenester eller tidsplaner.

I hvert egnet vindue udføres højst én normal handling: stærkt kontrolleret gendannelse af den aktuelle backup, rotation af én overflødig gammel gruppe eller ny optagelse efter syv døgn. En kvittering udstedes kun efter fuld arkivindholds-/dubletparitet, isoleret Auth-funktion og bekræftet ejet oprydning. Den knyttes kryptografisk til samme autentificerede arkiv og kan ikke selv give produktions- eller sletteret.

Retirement kræver positiv tidligere publicering i locatorhistorikken for ALLE kandidater, også kandidater med kvittering. Current og særskilt verificeret reserve læses fuldt tilbage før sletning. Alle locatorauditrækker og delte objekter bevares. Indeks slettes sidst, og et ukendt DELETE bliver ikke blindt gentaget. Eksisterende fuld inventarlæsning skal holde alle urefererede managed SQL-/partobjekter tilbage og blokere ny capture; ældre eller ukendte objekter må ikke antages ubrugelige.

Normal rotation sigter mod to verificerede generationer og højst én ny under kontrol. Der reserveres plads til hele transporten før upload; 300 MB pr. transport og 2 GB i backup-bucketen er fortsat lokale lofter. De er ikke en garanti for kontoens samlede R2-lager-/operationsforbrug eller Supabase-/GitHub-Free. Automatikken er som udgangspunkt OFF. Den faktiske variabelaflæsning og eventuel senere aktiveringskvittering gemmes privat; en manglende variabel er ikke weekly. Aktivering kræver præcis kildekvalifikation, faktisk autentisk arkiv-/Auth-restore, afklarede gamle rester og dokumenteret samlet ressourcegrundlag.

Databasepariteten gælder arkivets fem SQL-filer, ikke et atomisk live-snapshot, Storage-objekternes filbytes, produktionsrestore eller erasure-bevis. Ejerens øvrige Free- og brugerdataopgaver forbliver åbne. Denne ændring fastholder app-/modelversion 4.0.598 og udsteder ingen numerisk model eller migration. Se aktive krav, implementeringsstatus og håndbog 89.347.

**Dato:** 2026-09-26
**Status:** AKTIV BESLUTNING; migration og restore bevist, ny publish/deploy afventer

## Måling senere 2026-09-26 – supplerende livekontrol

Kort run `36242754220` på 4.0.494 læste R2-parret igen og
gendannede seneste krypterede fremdrift. Det stoppede i en lokal
tidskontrol før ny vejrbygning og R2-publish. Cloudflare viste fortsat
fem objekter, 199,96 MB, 38 Class A, 33 Class B og $0,00 for
26/9–26/10. Supabase Pro viste 0,20 GB Cached Egress og 0,003 GB
Egress i samme periode; kontrolpanelet kan halte op til en time.
Den tidligere nulmåling er derfor erstattet af disse aflæsninger.
Den store pakke går via R2, men Supabase-trafik er ikke nul, og
Free-retur er ikke godkendt uden flere normale driftsdøgn.

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
