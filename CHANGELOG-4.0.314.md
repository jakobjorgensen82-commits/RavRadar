# RavRadar 4.0.314 – singleton-afteranker og sikker recoveryrelease

Dato: 2026-08-29
Status: Kilden bestod PR #227 exact-head `33272564543` og blev merged som `d1369d88`. Same-version-testhotfixet bestod PR #228 exact-head `33274411880`/job `99158510299`, blev merged som `503697425dd107883b34537a6e5eafc46ab5dcc6`, og push `33274505196` var en tilsigtet grøn no-op uden build, inspect eller Pages. Nyt exact-main D1-run på den endelige docs-synkroniserede mergehead, inspect/apply, frisk produktion og offentlig verifikation afventer.

## Hvorfor versionen findes

4.0.313 blev exact-head-valideret i PR #226, merged som `ff62ba11` og bestod hele exact-main D1-backend `33269631305`. Den efterfølgende read-only inspect `33269849748` stoppede før descriptor og mutation med `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT`.

After-artifactet kan for de otte native 3-timersdele legitimt indeholde kun det eksakte målte højreanker. Den fælles validator krævede mindst to punkter, selv om cadence allerede skulle bevises uafhængigt af before- og targetserien.

## Afgrænset løsning

- Ét punkt tillades kun i rollen `AFTER`, kun målt-only og kun efter eksakt state-replay.
- Before og target skal hver levere mindst to enstemmige intervaller og bevise samme native 3-timerskadence.
- Target skal indeholde samme afteranker med eksakt tid og strength.
- Nul after-punkter og singleton i before, target, rollback, cleanup eller en 1-timesdel stopper uden descriptor eller mutation.
- Seks-timers bracket, helt cadenceantal, source/run/artifact/head-binding, privacy, descriptorhash og apply-CAS er uændrede.

## Release- og racebeskyttelse

4.0.314 kræver et nyt exact-main D1-bevis; 4.0.313's grønne run kan ikke genbruges på en ny SHA. Inspect afhænger af D1-readiness. Normal push/schedule/`none` forbliver grøn no-op, indtil samme head har et succesfuldt descriptorbundet apply-step og Pages-job. Manglende eller malformed Actions-metadata åbner intet.

Den fælles produktions-concurrency annullerer aldrig en kørende apply. Hele hvert run- og jobsvar parse- og shapevalideres samlet, før et id kan anvendes; et delvist parseroutput kan derfor ikke åbne gaten. Regressionen beviser, at 4.0.315 ikke er permanent versionslåst.

PR #227 beviste kilden på eksakt head og blev merged. En allerede kørende 4.0.313-produktion `33271863449`/job `99151692515` fortsatte som tilsigtet under `cancel-in-progress: false`, men fuld `npm run validate` fandt derefter en forældet testassertion, som stadig forventede den tidligere eventafhængige cancel-expression. Kæden stoppede før releasegate og Pages; offentlig drift og data blev ikke publiceret fra kørslen.

Same-version-hotfixet ændrer ingen runtime- eller recoverysemantik. Det opdaterer den gamle assertion til præcis én `cancel-in-progress` med værdien `false` og fører testen ind i `test:workflow-action-contracts`, så PR'ens `validate:source` fremover fanger kontrakten. Den fulde lokale gate, to uafhængige revisioner og PR #228 exact-head/merge/no-op er grønne; D1, inspect og apply forbliver blokeret, indtil docs-checkpointet er merged og exact-main D1 er grønt på den endelige SHA.

## Uændrede forhold

Candidate G's 20/50/30, model-id, scoreformel, state schema 2.0/2.1, trust, 13-timersregel, mobilisering, DMI/Copernicus, vejr, geometri, land-/vandpunkter og private data er uændrede. Morgenhullet er fortsat åbent, indtil ny inspect, CAS-apply, frisk produktion og offentlig 210/673 desktop-/mobilverifikation er grøn.
