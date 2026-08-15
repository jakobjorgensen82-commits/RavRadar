# Aktuelt sessionshandoff – 2026-08-15

## Produktionsverificeret 4.0.211

- Separat `samples72h` bevarer tre døgns rå vejrhistorik til senere mobiliseringsanalyse; `samples24h` forbliver eneste aktive score-/statevindue.
- Begge rå vinduer udelades fra `public-conditions.json`, og Supabase-egress påvirkes ikke.
- Vandstands-continuity bevarer DMI-identitet. Providerskift er analyseret, men ingen kilde-, fallback-, merge- eller scoreændring er lavet.
- #31854174281 og #31855164652 bestod de fulde gates og deploy. Datasæt `rr-20260815011320-210` har verificeret aktuel strøm i 210/210 zoner og 107 bevarede rå historikprøver pr. zone.

## Sikker baseline

- Seneste produktionsverificerede release er 4.0.211 på commit `7e8733eff36f0930ecaa983f8b29916c63f66c2e`. #31854174281 og #31855164652 bestod central adminhydrering/tombstones, frisk DMI, fuld validering, releasegate, Supabase, artifact og Pages-deploy.
- 4.0.208 ændrer kun lokal udviklerdiagnose og read-only kontrol. Ingen zone, geometri, DMI-kilde, RavScore eller offentlig UI-adfærd ændres.
- Den direkte deployaudit efter udgivelsen gav datasæt `rr-20260814230422-210` og 210/210 identiske aktive zone-ID'er mellem `zones.geojson` og `public-conditions.json`. `DK-B04-12`, `DK-B04-13` og `DK-B04-14` findes alle med vejrdata.

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

1. Næste aktive udvikleropgave er P1-audit/design af komplette DMI-first femdøgnskæder pr. komponent under DEC-0030. Ingen ny kilde, fallback eller scoreændring før dækning, provenance, overgange og regressioner er dokumenteret.
   - Strømopfølgning: klassificér de 89 zoner, som endnu ikke når 96 timers marinehorisont; alle når aktuelt mindst cirka 70,8 timer, og cirka 120 timer er fortsat målet.
   - Historikopfølgning: mål de 75 sidst reparerede zoner gennem et fuldt 72-timers vindue. Alle 210 zoner skal bevare rå historik, men manglende fortid må ikke rekonstrueres kunstigt.
2. Supabase-egress overvåges gennem næste billingperiode. Privat dataminimeret besøgstæller med enkel adminrapport er fortsat P2.
3. Ejerens manuelle markørreview udføres senere gradvist.

## Arbejds- og modelregler

- Brug GPT-5.6 Sol og **Ekstra høj** indsats til DMI, RavScore, geometri, ukendt rodårsag, arkitektur og endelig kritisk validering. Anbefal billigere model før rent rutinearbejde og bed om Sol igen før kritisk arbejde, jf. DEC-0031.
- Central adminstatus er runtime-sandhed. Historiske hardcodede værdier må ikke overskrive den.
- Funktioner må ikke fjernes eller ændres uden aktuel ejerbeslutning.
- DMI er primær kilde. Manglende data er `missing`, aldrig nul, stale gentagelse eller skjult interpolation.
- Gamle chats er historik, ikke ændringstilladelse.
# 4.0.210-kandidat – DMI-strømhuller ved nutiden

- 4.0.209 er produktionsverificeret i #31852633877 på commit `b157d4176c20b112728492abc29f32f7a1426389`; live datasæt er `rr-20260815000929-210` med 210 zoner og 102 `samples72h`-prøver pr. zone.
- Artifactmålingen viste 125 hovedzoner med to strømtrin 19. august, 75 med syv sene trin og kun 10 med en sammenhængende serie fra 14. august.
- Rodårsagen er `component_horizon_hours`: den målte kun sidste komplette tidspunkt og accepterede derfor en fjern hale som fuld dækning.
- 4.0.210 kræver start nær byggetiden og native sammenhæng. På det faktiske artifact bliver resultatet 10 komplette og 200 genhentningskrævende hovedzoner; `dkss_idw` og `dkss_nsbs` prioriteres.
- Ingen kilde, fallback eller score ændres. Næste bevis er frisk produktion og derefter 72 timers eftermåling af verificeret strømhistorik.
# 4.0.211 – anden rodårsag i DMI-strømcachen og produktionsbevis

- #31853585142 deployede 4.0.210 og bestod alle gates, men efterartifactet viste fortsat 125 zoner med to sene strømtrin, 75 med syv og 10 med fuld serie.
- Schedulerens nye diagnose virkede; genhentningen gjorde ikke. IDW og NSBS blev forsøgt, men alle 39 filer pr. model blev sprunget over som tidligere behandlet.
- `merge_previous` tabte `marineSelection`. 4.0.211 bevarer valget, rekonstruerer 1.138 legacy-valg i det faktiske artifact og hæver grid-/behandlingssignaturen fra 5 til 6 for én fuld genbehandling.
- Frisk produktion og direkte artifactoptælling er gennemført: 210/210 zoner har verificeret strøm ved nutiden. Næste trin er 72 timers historikmåling og DEC-0030-klassifikation af de 89 zoner under 96 timers marinehorisont. Ingen score eller kilde ændres.
