# RavRadar 4.0.314 – singleton-afteranker og sikker recoveryrelease

Dato: 2026-08-29
Status: Diagnostikhotfixet bestod PR #230 på exact-head `7ad1a98b` i `33277107562`/`99165644953`, blev merged som `228725ea98a04e5d34c4bf4c74d40799e94081a0`, og push `33277217412` var korrekt no-op. Første exact-main D1 `33277253662` stoppede på en forbigående 503 efter Edge-deploy, men dens fail-closed roll-forward bestod; genkørslen `33277510537`/`99166722076` blev helt grøn på samme SHA. Read-only inspect `33277738135`/`99167394284` viste kun den sanitiserede kode `ONE_TIME_GAP_BEFORE_NOT_UNIFORMLY_READY` og stoppede før descriptor, apply, build og Pages. Den afgrænsede source-hotfix tillader nu en eksakt replaybar, målt schema-2.0 før-primary i ærlig `WINDOW_INCOMPLETE` og kræver stadig, at det samlede target-reference-replay bliver `READY`. Lokal 210/673-regression er grøn; ny exact-head, merge, D1, inspect/apply og offentlig verifikation afventer.

## Hvorfor versionen findes

4.0.313 blev exact-head-valideret i PR #226, merged som `ff62ba11` og bestod hele exact-main D1-backend `33269631305`. Den efterfølgende read-only inspect `33269849748` stoppede før descriptor og mutation med `ONE_TIME_GAP_AFTER_EVIDENCE_COUNT`.

After-artifactet kan for de otte native 3-timersdele legitimt indeholde kun det eksakte målte højreanker. Den fælles validator krævede mindst to punkter, selv om cadence allerede skulle bevises uafhængigt af before- og targetserien.

## Afgrænset løsning

- Ét punkt tillades kun i rollen `AFTER`, kun målt-only og kun efter eksakt state-replay.
- Before og target skal hver levere mindst to enstemmige intervaller og bevise samme native 3-timerskadence.
- Target skal indeholde samme afteranker med eksakt tid og strength.
- Nul after-punkter og singleton i before, target, rollback, cleanup eller en 1-timesdel stopper uden descriptor eller mutation.
- Seks-timers bracket, helt cadenceantal, source/run/artifact/head-binding, privacy, descriptorhash og apply-CAS er uændrede.

## Ærlig før-primary

Før-runnet publicerede en separat komplet, målt nødvisning, mens supportpakken bevarede primary i `data/live/conditions.json`. Primary kan derfor legitimt være `WINDOW_INCOMPLETE` på sin egen reference. Det er ikke en kildeafvigelse: validatoren kræver fortsat målt schema 2.0, mindst to ordnede prøver, eksakt model-/profil-/stateKey-kontekst og fuld reproduktion af potentiale, udtransporttimer, readiness, coverage og evidens.

Kun replayet ved det aktuelle target må afgøre, om den eksakt bracketbundne engangsinterpolation lukker det aktive 48-timersvindue. En tidligere eller længere mangel rekonstrueres ikke. Hvis før-suffixen er for kort, indeholder et ekstra hul eller er schema 2.1/ukendt/manipuleret, stopper inspect før descriptor og mutation. Den positive regression bruger alle 673 før-states som ærlige 24-timers `WINDOW_INCOMPLETE`-suffixer; særskilte negativer beviser den ældre hul-, replay-, schema- og statusgrænse.

## Release- og racebeskyttelse

4.0.314 kræver et nyt exact-main D1-bevis; 4.0.313's grønne run kan ikke genbruges på en ny SHA. Inspect afhænger af D1-readiness. Normal push/schedule/`none` forbliver grøn no-op, indtil samme head har et succesfuldt descriptorbundet apply-step og Pages-job. Manglende eller malformed Actions-metadata åbner intet.

Den fælles produktions-concurrency annullerer aldrig en kørende apply. Hele hvert run- og jobsvar parse- og shapevalideres samlet, før et id kan anvendes; et delvist parseroutput kan derfor ikke åbne gaten. Regressionen beviser, at 4.0.315 ikke er permanent versionslåst.

PR #227 beviste kilden på eksakt head og blev merged. En allerede kørende 4.0.313-produktion `33271863449`/job `99151692515` fortsatte som tilsigtet under `cancel-in-progress: false`, men fuld `npm run validate` fandt derefter en forældet testassertion, som stadig forventede den tidligere eventafhængige cancel-expression. Kæden stoppede før releasegate og Pages; offentlig drift og data blev ikke publiceret fra kørslen.

Det tidligere same-version-sourcegate-hotfix i PR #228 ændrede ingen runtime- eller recoverysemantik. PR #228 lukkede sourcegaten, og docs-checkpoint PR #229 blev exact-head-valideret og merged. Exact-main D1 `33275218540` bestod derefter source, Candidate G-databasekontrakt, ti shards, capacity, Edge, maintenance, Worker, sync, D1-mode, slutreconciliation og slutattestation.

Read-only inspect `33275438494` hydrerede mål og eksakte kilder og stoppede i `Inspect, verify and seal`. Descriptorrefusal, descriptorupload, build og Pages blev sprunget over; der fandtes derfor ingen descriptor at anvende og ingen mutation. GitHubs sikre annotationsmetadata viste kun exit 1, mens den faste domænekode kun lå i hele jobloggen, som ikke må hentes under privacykontrakten. Diagnostikhotfixet gør derfor kun /^ONE_TIME_GAP_[A-Z0-9_]+$/ synligt som fejlannotation og erstatter enhver anden fejltekst med `ONE_TIME_GAP_SANITIZED_FAILURE_UNAVAILABLE`. En vellykket inspect annoterer kun descriptor-SHA, 673 berørte dele, syntetisk prøveantal samt 665/8 cadencefordeling, så den forseglede apply-binding kan aflæses uden joblog. Black-box-regressionen beviser kendt fejl, maskering af vilkårlig tekst og den allowlistede succesflade. En ny merge-SHA kræver igen exact-main D1 før ny inspect.

PR #230's første exact-head-kørsel `33276791132`/job `99164804850` nåede den målrettede rekonstruktionstest og stoppede før alle senere sourcechecks. Selve CLI-kontrakten var ikke brudt: GitHub-runnerens topmiljø havde som forventet `GITHUB_ACTIONS=true`, men testhelperens normale CLI-cases arvede det utilsigtet og assertede derfor den forkerte kanal. Harnessen fjerner nu variablen for normale cases og sætter den kun eksplicit for annotationstests. Den komplette syntetiske 210/673-test består både med og uden `GITHUB_ACTIONS` i forældremiljøet. Ingen workflow-, produktions- eller datahandling blev udført af PR-gaten.

## Uændrede forhold

Candidate G's 20/50/30, model-id, scoreformel, state schema 2.0/2.1, trust, 13-timersregel, mobilisering, DMI/Copernicus, vejr, geometri, land-/vandpunkter og private data er uændrede. Morgenhullet er fortsat åbent, indtil ny inspect, CAS-apply, frisk produktion og offentlig 210/673 desktop-/mobilverifikation er grøn.
