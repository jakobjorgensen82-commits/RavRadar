# DEC-0065: Produktionslogin og privat turlog skal verificeres mod den aktive Supabase-kontrakt

**Status:** IMPLEMENTERET LOKALT; CENTRAL KONFIGURATION OG DATABASE RETTET; RELEASE AFVENTER

**Dato:** 2026-08-23

**Scorepåvirkning:** Nej. RavScore, Candidate G, `20/50/30`, vejrdata, geometri og land-/vandpunkter ændres ikke.

## Fundet fejl

Den første bevidste ejerprøve af det autentificerede flow viste to uafhængige produktionsfejl, som de tidligere kilde- og deploytests ikke kunne se:

1. Supabases **Site URL** stod til `http://localhost:3000`, og listen over tilladte redirect-adresser var tom. Et magic link faldt derfor tilbage til localhost, selv om RavRadar-klienten bad om den aktuelle produktionsadresse.
2. Den aktive `observations`-tabel manglede kolonnen `data_quality_flags` og RLS-reglen **users can read own observations**. En efterregistrering blev derfor i den lokale leveringskø, mens **Mine ture og fund** fik HTTP 400 på sit faste feltudvalg.

4.0.264/4.0.265 beviste kildekode, UI, almindelige releasegates og ikke-autentificeret liveadfærd, men ikke den virkelige magic-link-retur eller den aktive databases læsekontrakt. De dele af den tidligere produktionsbeskrivelse er hermed præciseret; grøn Pages-produktion er ikke i sig selv bevis for et eksternt autentificeret flow.

## Beslutning

- Supabases standardadresse og tilladte produktionsredirect er sat præcist til `https://jakobjorgensen82-commits.github.io/RavRadar/`.
- Når RavRadar flyttes til det købte domæne, skal den faktiske kanoniske adresse, forventet `https://ravradar.dk/`, sættes som **Site URL** og tilføjes som tilladt redirect i samme deployment. En eventuel `www`-adresse tilføjes kun, hvis den reelt betjenes. Den hidtidige GitHub Pages-adresse beholdes kun så længe den fortsat skal kunne modtage loginlinks.
- Den idempotente migration `20260823_account_trip_log_contract.sql` tilføjer det manglende JSON-felt, genopretter den private SELECT-policy og giver kun rollen `authenticated` tabelrettigheden SELECT.
- Migrationen opretter ingen ny tabel eller turpost og indeholder ingen ændring eller sletning af eksisterende observationer.
- Den eksisterende lokale outbox forbliver leveringssikring. Ved næste sideindlæsning forsøger RavRadar igen at sende en afventende efterregistrering med samme klient-id, så der ikke oprettes en dublet.
- Brugerfladen omtaler en midlertidig læsefejl som en RavRadar-fejl og viser ikke leverandørnavnet Supabase som brugerforklaring.

## Kontrolkrav

- En dataminimeret produktionsaudit skal få HTTP 200 for turloggens fulde feltudvalg med `limit=0` og dermed hente nul rækker.
- Supabase-dashboardet skal vise RLS aktiveret og præcis en SELECT-policy for `authenticated`, der bruger `user_id = auth.uid()`.
- Et nyt magic link skal lande på den aktuelle RavRadar-origin uden token i den endelige rene adresse efter callback.
- Ejeren skal kunne se sin allerede indsendte eller lokalt afventende tur under **Mine ture og fund** efter ny indlogning og automatisk outbox-synkronisering.
- Kildekontrakten skal kræve migrationens kolonne, policy, grant og PostgREST-schemaopdatering og afvise `UPDATE`, `DELETE` og `TRUNCATE` i migrationen.
- Domæneskiftet til `ravradar.dk` er ikke afsluttet, før auth-adresserne er ændret og et nyt link er prøvet på den faktiske kanoniske adresse.

## Gennemført før release

- Site URL og redirect-listen er rettet og efterkontrolleret i Supabase.
- Migrationen er kørt med resultatet **Success. No rows returned**.
- Den offentlige feltkontrakt svarer HTTP 200 ved `limit=0`, og policyoversigten viser **users can read own observations / SELECT / authenticated**.
- Målrettede konto-, efterregistrerings-, auth- og syntakstests består lokalt.

Exact-head, merge, nyt Pages-artifact og den afsluttende ejerprøve på et nyt magic link udestår, før 4.0.266 kaldes fuldt produktionsverificeret.
