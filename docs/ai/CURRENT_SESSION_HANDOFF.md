# Aktuelt sessionshandoff – 2026-08-15

## Sikker baseline og 4.0.208-kandidat

- Seneste produktionsverificerede release er 4.0.207 på commit `5176d2e14b2c5cff745caa428e6f1b43f45eb824`, verificeret i GitHub Actions #31845836107 med frisk vejrdata, fuld validering, releasegate, Supabase, artifact og Pages-deploy.
- 4.0.208 ændrer kun lokal udviklerdiagnose og read-only kontrol. Ingen zone, geometri, DMI-kilde, RavScore eller offentlig UI-adfærd ændres.
- Den direkte deployaudit 15. august 2026 gav 210/210 identiske aktive zone-ID'er mellem `zones.geojson` og `public-conditions.json`. `DK-B04-12`, `DK-B04-13` og `DK-B04-14` findes alle med vejrdata.
- 4.0.208 er endnu kun kandidat, indtil en frisk GitHub-kørsel har bestået central adminhydrering, nyt vejr, fuld `validate`, releasegate, Supabase, artifact og deploy.

## Hvorfor de tre Vadehavszoner så ud til at fejle lokalt

- Det indcheckede `data/live/conditions.json` er fra 31. juli 2026 og dækker en historisk 209-zonebestand. Det er ældre end både Vadehavstilføjelsen og de seneste centrale tombstones.
- Det rå repositoryregister er ikke den effektive runtimebestand før central adminhydrering. Det kan fortsat indeholde Havnø/Mariager Fjord øst, mens det gamle vejrsnapshot kan indeholde Fejø/Femø. Begge zoner er centralt slettede; den aktuelle effektive bestand er 210.
- `validate:data` stopper fortsat ved mismatch, men siger nu **FORÆLDET LOKALT VEJRSNAPSHOT** og henviser til `npm run audit:deployed-zone-weather`. En aktuel mismatch forbliver en hård zone-/vejrdækningsfejl.
- `npm run hydrate:deployed-weather` hydrerer kun mutable vejrfiler. Fuld frisk validering kræver også central adminhydrering/tombstones først, som i `.github/workflows/update-and-deploy.yml`.

## Bindende ejerbeslutning om land-/vandpunkter

- Hver af de 673 aktive lokale kyststrækninger har ét autoritativt blåt havpunkt og ét grønt landpunkt. Ekstra aktive punktpar og automatisk national genopdeling er fravalgt i DEC-0037.
- Ejeren flytter senere eksisterende markører gradvist. Ændringer bliver først aktive efter central readback og en grøn efterfølgende DMI-/releasekørsel.
- Den manuelle gennemgang blokerer ikke uafhængigt roadmaparbejde, men skal være afsluttet før endelig faglig score- og brugerreleasegodkendelse.

## Næste arbejde

1. Kontrollér først GitHub Actions for 4.0.208. Kald den kun produktionsverificeret, hvis frisk vejr, fuld `validate`, `release:gate`, Supabase, artifact og deploy faktisk er grønne.
2. Næste aktive udvikleropgave er P1-audit/design af komplette DMI-first femdøgnskæder pr. komponent under DEC-0030. Ingen ny kilde, fallback eller scoreændring før dækning, provenance, overgange og regressioner er dokumenteret.
3. Supabase-egress overvåges gennem næste billingperiode. Privat dataminimeret besøgstæller med enkel adminrapport er fortsat P2.
4. Ejerens manuelle markørreview udføres senere gradvist.

## Arbejds- og modelregler

- Brug GPT-5.6 Sol og **Ekstra høj** indsats til DMI, RavScore, geometri, ukendt rodårsag, arkitektur og endelig kritisk validering. Anbefal billigere model før rent rutinearbejde og bed om Sol igen før kritisk arbejde, jf. DEC-0031.
- Central adminstatus er runtime-sandhed. Historiske hardcodede værdier må ikke overskrive den.
- Funktioner må ikke fjernes eller ændres uden aktuel ejerbeslutning.
- DMI er primær kilde. Manglende data er `missing`, aldrig nul, stale gentagelse eller skjult interpolation.
- Gamle chats er historik, ikke ændringstilladelse.
