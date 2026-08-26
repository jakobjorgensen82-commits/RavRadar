# DEC-0080 – Sikkerhedsgrænser og offentlige Edge-gateways

**Status:** Besluttet og live-infrastrukturverificeret i kandidat 4.0.284; exact-head-, produktions- og offentlig Pages-lukning afventer.

## Problem

Den oprindelige sikkerhedsvurdering fandt flere kæder, hvor browseren bar for meget tillid: HTML fra centralt gemte dokumenter kunne indsættes direkte, ekspertadministration kunne læse eller tildele bredere rettigheder end nødvendigt, observationer kunne skrives direkte til tabellen, og den offentlige assistent manglede en samlet server-side kontrakt for origin, input, timeout og misbrug.

En første Supabase-hærdning gjorde samtidig `experts_manage` for bred. En ekspertadministrator skulle kunne arbejde med ekspertkonti og tre ufarlige ekspertadgange, ikke læse administrator-/ejerprofiler eller tildele system-, diagnostik-, observations- eller fuld-adminrettigheder.

## Beslutning

1. Alle offentlige HTML-sider bruger en lukket CSP uden `unsafe-eval`. Inline scripts og event handlers udgår. Centralt håndbogs-HTML går gennem en allowlist-sanitizer, som fjerner aktive elementer, ukendte attributter, inline-stil, DOM-id'er og farlige URL-protokoller.
2. `experts_manage` må kun se aktive ekspertprofiler og kun rettighederne `admin_access`, `handbook_view` og `handbook_review`. Ejer og `full_admin` kan fortsat administrere hele den dokumenterede rettighedsmatrix. Både RLS, skrive-RPC og browserflade håndhæver grænsen.
3. Direkte `INSERT` på `observations` tilbagekaldes fra `anon` og `authenticated`. Browseren sender til `submit-observation`, som bruger feltallowlist, størrelses- og strukturgrænser, privatlivsfilter, brugerbinding, tidsgrænse for anonyme rapporter, idempotent klient-id og server-side rate limiting før service-role-skrivning.
4. De offentlige Edge-funktioner deler én kanonisk gateway i `supabase/functions/_shared/public-gateway.ts`. Gatewayen håndhæver origin-allowlist, CORS, POST/OPTIONS, JSON-størrelse, sikre fejl, upstream-timeout og HMAC-pseudonymiseret rate limiting. Funktionslokale kopier må ikke genindføres.
5. RavRadar-assistenten sender kun et lille offentligt kontekstobjekt uden zonebestand, conditions, regler, rå vektorer eller interne diagnostikfelter. Fjernassistenten er deaktiveret som standard med `ravAssistantRemoteEnabled: false`. Den lokale Candidate G-assistent er releaseadfærden, indtil en særskilt beslutning installerer og positivt verificerer en godkendt secret-/omkostningskontrakt.
6. Supabases legacy-JWT-verifikation er slået fra på begge Edge-funktioner, fordi klienten bruger den moderne publishable key, mens gateways selv håndhæver deres offentlige kontrakt. Brugeridentitet verificeres særskilt mod Supabase Auth, når en rapport påstår et `user_id`.

## Live infrastrukturbevis før merge

- Den smallere RLS blev anvendt i Supabase. En dataminimeret katalogkontrol viste præcis én SELECT-policy på `profiles` og én på `user_permissions`, korrekt ekspertscope, ingen legacy-policy og ingen `anon`-SELECT. Ingen private rækker blev åbnet.
- `submit-observation` og `ravradar-assistant` blev deployet gennem Supabases godkendte browsereditor, fordi Windows Application Control blokerede den lokale CLI. Windows-sikkerheden blev ikke svækket eller omgået.
- Tilladt origin gav `204` og eksakt allow-origin. En fremmed origin gav `403 ORIGIN_NOT_ALLOWED` uden allow-origin. Tomme payloads gav de forventede `400`-fejl.
- En syntaktisk gyldig, gammel anonym rapport blev stoppet med `403 LOGIN_REQUIRED_FOR_HISTORICAL_REPORT` før lagring. Ingen observationsrække blev oprettet.
- Et almindeligt fjernassistentspørgsmål viste, at `OPENAI_API_KEY` ikke er installeret. Kandidaten vælger derfor bevidst lokal-only og udfører ingen fjernkald fra Pages.

## Drift og åbne forhold

- Edge-deployment skal fremover ske gennem en godkendt browser-, CI- eller CLI-kanal. Windows Application Control må aldrig deaktiveres som genvej.
- Supabase varsler mulig projektbegrænsning fra 9. september 2026 efter forrige betalingsperiodes egressoverskridelse. Aktuel måling var cirka 455 MB/5 GB egress og 86 MB/500 MB database, men banneret er fortsat en reel driftsrisiko. Overvågning og planvalg er et driftskrav; sikkerhedsgates må ikke lempes for at spare kvote.
- Fjernassistenten må først aktiveres efter særskilt secret-, omkostnings-, positiv funktions- og fallbackverifikation. Den deployede, men deaktiverede funktion er ikke en offentlig funktionsafhængighed i 4.0.284.

## Releasekontrol

1. Målrettede sikkerheds-, assistent-, tur-, konto- og Pages-modultests.
2. RDKS-, håndbogs-, versions- og geodatadiffkontrol.
3. GitHub exact-head `validate:source` på PR-head.
4. Efter merge: central hydrering, frisk vejr, fuld `npm run validate`, `npm run release:gate`, artifact og Pages-deploy.
5. Offentlig kontrol af CSP, normal appstart, lokal assistent uden fjernkald samt observationens Edge-kontrakt uden at oprette private testdata.

Candidate G 20/50/30, scorekurver, vejr, zoner, geometri og land-/vandpunkter ændres ikke.
