# RavRadar 4.0.313 – afgrænset legacy-replay-roll-forward

Dato: 2026-08-29
Status: Exact-head-valideret og merged. Exact-main D1-backend er helt grøn; rekonstruktions-apply, frisk produktion og offentlig verifikation afventer.

## Hvorfor denne version findes

4.0.312 bestod PR #225 exact-head-kørsel `33266087776`/job `99136292810` og blev merged som `a5ece10d1b99fe2a4d45346cadf7225870622a7a`. Det automatiske push-run `33266184326` var korrekt grøn no-op uden artifact eller Pages, fordi exact-head D1-beviset endnu manglede.

Backendkørslen `33266229687`/job `99136669571` bestod kilde, Candidate G-constraint, D1-forberedelse og de første Edge-/Worker-gates, men stoppede ved den idempotente Supabase→D1-synkronisering med den faste klientfejl `TRIP_GATEWAY_UNAVAILABLE`. Failure-roll-forwarden er ikke et readinessbevis. Ingen rekonstruktions-inspect/apply, vejrproduktion, artifact eller Pages blev kørt; morgenhullet og offentlig 4.0.310-nøddrift forblev urørte.

## Reproduceret rodårsag

Den gamle 4.0.310-producent kunne lagre kendte `null`-blade i `weather_snapshot` og `calibration_features`. Den dataminimerede 4.0.311-PostgREST-projektion henter kun eksplicitte tilladte blade og modtager ikke JSON-nullblade. Den samme historiske tur fik derfor en ny kanonisk projektion og hash. Workeren så den som en konflikt, og den globale D1-registry beholdt korrekt den oprindelige hash.

Rodårsagen er reproduceret udelukkende med syntetiske, ikke-private fixtures. Ingen produktionspayload, koordinat eller rå U/V er læst eller logget.

## Afgrænset løsning

- Kompatibilitet med forskellig hash tillades kun, når både den lagrede og indkommende post er `supabase-migration`; live writes får ingen bypass.
- En gammel schema-v2-række skal bestå den fulde top-level allowlist, nested type-/intervalkontrakt, identitetsforbud og lokationsforbud, før kendte nullblade og deres tomme underobjekter fjernes. Ukendte felter afvises også, når værdien er null.
- Schema-v1 bruger fortsat den eksisterende bounded weather-projektion og får samme bounded top-level `calibration_features`-projektion. Ukendte legacyfelter kan kun bortfalde gennem denne dokumenterede allowlist.
- Efter den tilladte projektion skal alle bevarede ikke-nullværdier, kernefelter, ejer, klient-/tur-id og målshard være eksakt ens. En reel ændring stopper uden mutation.
- Den eksisterende D1-række, payload-JSON, payloadhash og registryhash omskrives aldrig. En manglende registrybinding må kun genetableres med den allerede selvhash-verificerede historiske hash; en modstridende registryhash afvises.
- Worker-readback bruger samme strenge schema-v2 stored-kontrakt og må ikke bortfiltrere et ukendt top-level-felt.
- Edge-klienten eksponerer kun faste fejlkategorier. Ubetroet eller malformed fejl-/success-body må ikke nå log eller exceptiontekst.

## Bevis

Syntetiske regressioner dækker schema-v2-nulltab, null-only-underobjekter, schema-v1 bounded projektion, ukendte null/non-null-felter, ændrede kerne-/nestedværdier, migration-only-kilden, forskellig gammel/ny hash, eksisterende registry, manglende registry-reparation, forkert registryhash, to genkørsler og byteidentisk række/hash/registry. Malformed 200/5xx, ukendte serverdetaljer og timeout giver kun faste sikre fejl.

Projektets fulde lokale `scripts/validate-source.ps1` bestod på den endelige præcommit-diff sammen med RDKS-, release-, versions- og geodatagaten. En uafhængig slutrevision fandt ingen resterende replay-, privacy-, idempotens- eller dokumentationsblocker.

Exact-D1-releaseinterlocken omfatter 4.0.313. PR #226 bestod exact-head `33269501339`/job `99145314693`, blev merged som `ff62ba116d08a7894d206d350ea5bdde199fe433`, og push `33269584236` var korrekt no-op. Exact-main backend `33269631305`/job `99145677813` bestod begge syncs, slutreconciliation, Edge, Worker, registry og SQL.

## Uændrede forhold

Candidate G, RavScore, 20/50/30, +10/-8, 13-timersgaten, mobilisering, DMI/Copernicus, vejrdata, state/recoverysemantik, geometri, land-/vandpunkter og private data er uændrede. Trip protocol/header og trustmigrationsgrænsen forbliver 4.0.311.

Rekonstruktionen er ikke anvendt. Read-only inspect `33269849748`/job `99146287609` stoppede før descriptor/apply med `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT`; ingen data eller cache blev ændret, og intet nyt descriptor-/releaseartifact eller Pages-deploy blev oprettet. Den sikre fortsættelse er 4.0.314's snævre singleton-afteranker-roll-forward, nyt exact-head D1-bevis, ny inspect, descriptor-/mål-CAS-bundet apply, frisk normal produktion og offentlig desktop/mobil/210/673-verifikation.
