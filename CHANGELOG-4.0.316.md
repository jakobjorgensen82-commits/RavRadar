# RavRadar 4.0.316 – frisk primary uden gyldig ældre fallback

Dato: 2026-08-30

## Same-version Edge-verifierhotfix 2026-08-31

- Exact-main-runs `33343469247`, `33344823000` og `33348745681` stoppede alle ved det normale ikke-indloggede turlogkald, da gatewayen svarede HTTP 503. Det tredje run nåede det eksakte step efter grøn vejrproduktion, 210/673, fuld validate og releasegate, men før deploy. Kodeaudit viste efterfølgende, at normalruten kalder den muterende rate-limit-RPC før auth; den må derfor aldrig genkøres. Ingen private payloads blev læst eller logget, ingen turdata blev skrevet, og intet nyt artifact blev publiceret.
- Grønt external-watchdog `33351078871` oprettede senere præcis én produktion `33351090164`. Den bestod vejr/DMI/Copernicus, 210/673, fuld validate, releasegate og datagates, men gammel step 69 stoppede igen før deploy på normal unauthenticated `trip-log` HTTP 503. Dette er det fjerde uafhængige incidentbevis.
- D1-count-proben har en uafhængig fast `POST {}`-descriptor med højst tre forsøg ved 429/502/503/504 eller bundet timeout/Node `TypeError`. Usigneret kræver 401; hvert signeret forsøg får frisk timestamp/HMAC og kræver 200 med eksakt-key body `{ok, trip_count}`, `ok=true` og ikke-negativt safe-integer-count. Workeren udfører kun `SELECT`; interne count-readfejl mappes alene til fast datasikker 503.
- En fælles helper tillader højst tre forsøg med 0/250/750 ms deterministisk ventetid, kun for HTTP 429/502/503/504 samt den eksisterende bundne timeout og Node-fetchens transport-`TypeError`.
- Retryfladen er fail-closed begrænset til OPTIONS og en privat HMAC-signeret, statefri `trip-log`-GET uden request-body med fast syntetisk signature-path, per-attempt nonce/query og no-store-headers. Helperen ejer hele descriptoren; gammel Edge afviser metoden med ikke-transient 405 før rate limit, mens ny Edge returnerer fast minimal 401 `LOGIN_REQUIRED` før rate/auth/storage.
- Den signerede probe ligger før rate limit, auth og storage og beviser kun Edge-liveness samt fast response-kontrakt/mode/version. Normal `trip-log`, observationens 400-/kvalitetsprober og alle reelle rate/auth/storage-ruter forbliver single-shot.
- Den aktive pre-write gate kører også eksisterende Worker-health og HMAC-signeret `/v1/trips/count`. Kun denne separate Worker-probe er et faktisk D1-readiness-bevis.
- Efter retry kræves stadig eksakt 204/CORS/version/mode, 403 uden tilladt origin eller den signerede faste 401. Forkert ikke-transient kontrakt stopper straks; udmattelse er rød; transient body og transportårsag indgår ikke i fejl eller log.
- Det er en operational-only kilde-/Edge-/workflow-/test-/RDKS-patch uden Pages-, app-, model-, state-, turdata- eller geodataændring. Versionen forbliver 4.0.316; exact-head, merge og payloadfri liveverifikation mangler.

## Hændelsen efter 4.0.315-merge

- PR #233 bestod exact-head `33299676128` og blev merged som `63d789a4`.
- Post-merge-run `33299747300` frigav den pensionerede D1-/reconstruction-readiness og startede normal build. 4.0.315-retirementen fjernede dermed den tidligere grøn-no-op-blocker.
- Runnet stoppede rødt ved **“Stage audited last verified Candidate G public fallback”**, fordi ingen komplet measured-only fallback både var inden for 72 timer og sin egen kortere prognosehorisont. Intet nyt artifact eller Pages-deploy blev publiceret.

## 4.0.316-hotfixkandidat

- En last-verified fallback er valgfri for en frisk measured-only primary, som består egne current-hour-, direkte input/provenance-, 210/673-, accounting-, audit-, validate- og releasegates.
- En gyldig measured-only fallback kan fortsat stages. Gammel, udløbet, ufuldstændig, ukendt, blandet, rekonstrueret eller manipuleret fallback må aldrig vises; den er fraværende i manifestet og fjernes fra publicerede fallbackfiler.
- Forventet fravær af fallback må ikke blokere aktuelle eller femdøgnsdata. Uventede primaryoptællinger, manifest-/filafvigelser, auditfejl og manglende direct current/future-input stopper fortsat fail-closed.
- Der skabes ingen syntetiske eller interpolerede data. Manglende historik og manglende fallback forbliver manglende.

## Bindende senere model- og arkitekturkrav

- DEC-0112 og DEC-0102 fastlægger, at `HISTORY_INCOMPLETE` i den kommende model fortsat giver score over hele current+femdøgnsfladen, når den konkrete times direkte current/future-input er gyldige.
- Score, detaljer, femdøgnsvisning, admin og ekspertflade skal vise en tydelig auto-forsvindende DA/DE/EN-advarsel, og bundne ture/observationer skal have `calibrationEligible=false`. Manglende direkte input er separat `UNAVAILABLE`.
- Modelleverancen skal reducere monolitisk workflowkobling, grøn-no-op/skipped-uklarhed og spredt version/docs/string-testkobling. Dette arbejde er ikke blandet ind i P0-hotfixen.

## Status og uændret scope

- 4.0.316 er ikke live eller produktionsverificeret. Exact-head, merge, frisk fuld produktion, artifact/Pages og offentlig 210/673/current/femdøgnskontrol afventer.
- Candidate G-formel, RavScore, DMI/Copernicus, storage, geometri, zoner, land-/vandpunkter og private data er uændrede af P0-hotfixen. DEC-0111-retirementen består.
