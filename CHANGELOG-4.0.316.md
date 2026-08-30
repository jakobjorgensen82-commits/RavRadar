# RavRadar 4.0.316 – frisk primary uden gyldig ældre fallback

Dato: 2026-08-30

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
