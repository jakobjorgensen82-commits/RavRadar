# DEC-0119 – horizon-gyldigt vejr og run-bundet første modelcutover

- **Status:** Ejerbesluttet og bindende; 4.0.332 bestod exact-head sourcegate `34125927405` og blev merged via PR #265 som `1e1093dead7fbbf5adcd401592d11c6b1c21d746`. Oneoff `34127986853` beviste horizon-/cacheprogression, men sluttede 79.132/79.414 med 282 missing; komplet runtime og cutover afventer
- **Besluttet:** 2026-09-07
- **Ejer:** RavRadar
- **Supplerer:** DEC-0110, DEC-0112, DEC-0114 og DEC-0118
- **Supersederer snævert:** hårde aldersgrænser i DEC-0085, DEC-0102, DEC-0110, DEC-0112, DEC-0114 og DEC-0115 samt den gamle rå 72-timershistorik i DEC-0116. Deres krav til atomisk pakke, samme model, model-/state-/registry-/hashbinding, ingen syntese, privacy og fail-closed horizon/integritet består

## Problem og ejerpræcisering

RavRadar havde flere aldersregler, som kunne kassere eller blokere et ellers komplet og fremadrettet gyldigt vejrsæt: 90/150/240 minutter i weather-workflowet og 72 timer i public emergency/continuation. De målte ikke, om den konkrete prognosetime stadig fandtes og var gyldig; de målte hvor længe siden pakkens reference eller generering lå. Dermed kunne en komplet 118-timerspakke blive afvist, selv om den stadig dækkede den time, brugeren bad om, og samme kunstige stop kunne blokere den nye model.

Ejeren præciserer, at den eneste og nyeste tilgængelige prognose skal bruges, uanset alder, når den stadig er strukturelt valid og ikke har passeret sin egen sidste gyldige prognosetime. Alder skal fortsat vises ærligt og påvirke tillid, nødstatus og kalibrering, men må ikke i sig selv blive til missing eller utilgængelighed.

Run `34083611297` dokumenterer samtidig den fortsat hårde slutgrænse: 4.0.331 nåede 78.856 af 79.414 par og efterlod 558 missing; artifact/deploy fortsatte ikke. Run `34093354004` sluttede med 112 missing efter faktisk Open-Meteo-fremgang. Run `34104536681` genbrugte DMI-cachen og nåede Copernicus, men stoppede før første Open-Meteo-request, fordi regionalleddet afviste en ærlig valgt DMI-collection med `modelRun=null` og nul positive/source-bærende rækker. 4.0.332 retter denne consumerkonflikt uden at lempe positive kildebeviser.

Efter merge beviste main-oneoff `34127986853` igen, at gamle men horizon-gyldige sourcecacher kan genbruges uden at blive nulstillet. Runnet nåede 79.132/79.414 og stoppede korrekt på 282 eksakte missing før handoff, artifact og deploy. Det er positivt horizon-/cachebevis og negativt completenessbevis; det kan ikke åbne modelcutover.

## Bindende beslutning

1. **Horizon bestemmer availability.** En current-/future-række må bruges uanset acquisition-, capture-, generation-, checkpoint- eller targetalder, når dens eksakte time, topidentitet, target-/registrybinding, kildeproveniens, hashes, fysiske scope og øvrige strukturelle kontrakt er valide, og den forseglede pakke stadig dækker den forespurgte time. Alder må aldrig alene ommærke en sådan række til missing.
2. **Eksakt slutgrænse.** `validUntil` og `operationalRangeEndAt` er inklusive. Ved præcis sidste prognoseinstant er datasættet brugbart; én millisekund senere er det udløbet. Fremtidigt target, mismatch mellem target og `target+117`, ikke-dækket UTC-time og enhver brug efter horizon stopper fail-closed.
3. **Alder er kvalitet, ikke datamanglende.** De tidligere 90/150/240-minutters grænser bevares kun som klassifikation mellem `FRESH` og `STALE_TARGET_VALID` samt workflow-/adminadvarsel. Public runtime kan vise `EMERGENCY_LAST_COMPLETE`, når pakken ikke er frisk, men vælger den virkelige time på samme verificerede 118-timersakse. Emergency-, gammel- og historikufuldstændig evidens forbliver `calibrationEligible=false` for tur, observation og læring. Brugerfladen må ikke kalde data friske, hvis de er gamle.
4. **Completeness og trust er uændret hård.** Et nyt weather-artifact, public runtime, deploy og modelcutover kræver fortsat præcis 673 kystdele × 118 timer = 79.414 unikke operationelle par, præcis én godkendt kildeklasse pr. par, nul overlap, nul missing, eksakt registry/target/model/hashbinding og alle relevante fulde gates. Ufuldstændige, blandede, ukendte, manipulerede eller udløbne pakker må ikke publiceres.
5. **Run-bundet source-handoff ved første cutover.** En grøn 118-timers producentkørsel på `main` må efter exact closure forsegle de fem private sourcecacher for DMI-kandidat, Copernicus-shadow, Copernicus source-stage, regional current-shadow og Open-Meteo. Handoffet bindes til repository, producentworkflow, `workflow_dispatch`, `refs/heads/main`, eksakt source-head, run-id, run-attempt, runner-OS, cachekey, target, registry, closure, source counts og hver inputfils bytes/hash. Det offentligt downloadede artifact indeholder kun én aggregeret privacy-safe attestering; private cacher ligger i en eksakt run-bundet Actions-cache.
6. **Cutover-consumeren genbeviser alt.** Første integrerede cutover kræver ejerens eksakte manuelle bekræftelse og det konkrete producent-run-id. Consumeren verifierer runidentitet, grøn konklusion, artifactnavn/digest/inventar, attestation, cachekey og inputhashes, installerer alle fem filer atomisk og genbygger closure. Den nye closure skal være identisk med handoffets target, sluttime, registry, source counts, closure-id og safe projection. Handoffet kan kun bruges, mens dets horizon er gyldig. Manglende, ekstra, symlinket, for stor eller ændret fil samt run-/head-/attempt-/hashmismatch stopper uden delvis installation.
7. **Ingen skjult gateomgåelse.** Handoffet erstatter kun gentaget lang providerindsamling under den kontrollerede første cutover. Central adminhydrering, sourcegate, `update:weather`, den integrerede runtimebygning, Feggesund/spatial audit, live kapacitet, fuld `npm run validate`, `npm run release:gate`, artifact/privacy, Pages og offentlig verifikation består. `update:weather` og de generelle vejrkald beholder deres bounded trin- og jobrammer.
8. **Granulær salvage gennem hele providerkæden.** DMI, Copernicus og Open-Meteo skal stoppe på ulæselig JSON, ugyldig topidentitet, target-/registry-/policy-/ledgerkontrol eller anden autoritativ control-plane-korruption. I en ellers parsebar og korrekt bundet cache skal hver acquisition/record/zone/time/komponentkilde/gitteropsummering valideres selvstændigt. Kun den berørte proof-enhed og dens værdier fjernes; positionen bliver et ærligt hul. Canonical hashes, records, ledgers, seals og source-stage genbygges fra tilbageværende verificerede positive beviser. Ingen invalid leaf må skabe availability, og én invalid leaf må ikke nulstille uafhængige positive par.
9. **Nyeste verificerede tuple vinder uden kildelås.** En ældre horizon-gyldig tuple bliver brugbar, indtil en nyere tuple fra en højere prioriteret kilde er fuldt verificeret og kan erstatte den atomisk. DMI → Baltic → AMM15 → policybundet regional DMI → Open-Meteo består. En Open-Meteo-række kan derfor senere erstattes; source-transitionen må aldrig blande tuplekomponenter eller gætte proveniens.
10. **Historik er advisory.** Den integrerede model kan gå online med alle 210 zoner aktive og numeriske `FULL_HISTORY`-/`HISTORY_INCOMPLETE`-optællinger, når den direkte 79.414-akse er komplet. Ufuldstændig 48-timers mobiliserings-/transporthistorik giver forklarende reason codes, konservative bounds, advarsel og `calibrationEligible=false`, ikke `UNAVAILABLE`. Historik må ikke syntetiseres. Den gamle generelle rå 72-timersretention er ikke længere en aktiverings-, availability- eller scoreforudsætning.
11. **Kontrolleret drift under cutover.** Det normale workflow forbliver deaktiveret under den kontrollerede cutover. Oneoff/118-timerskørslen er accelerator og sourceproducent; almindelige, eksternt cron-dispatchede kørsler er fortsat den varige updater efter genaktivering. GitHubs schedule er reserve, og tunge writers forbliver serialiserede.
12. **Ærligt DMI-katalogudfald fortsætter.** En valgt DMI-collection med `modelRun=null` kan kun accepteres, når dens validerede ledger har nul `PROCESSED`/`VERIFIED` og ingen `sourceAsset`. Den giver ingen positiv kildeautorisation og sender alle sine eksakte huller videre. Eksakte retained old-run-proofs må stadig indekseres. Enhver positiv eller kildebærende null-run-række er control-plane-konflikt og stopper fail-closed.

## Eksplicit supersession

Følgende gamle krav er **SUPERSEDERET** af ejerens aktuelle instruktion og denne beslutning:

- `REQ-WEATHER-TARGET-FRESHNESS-001`: 90/150/240 minutter er warnings, ikke availability-/deploygates.
- `REQ-PUBLIC-EXPIRED-FALLBACK-ABSENT-001`, `REQ-RAVSCORE-NEXT-ATOMIC-EMERGENCY-001`, `REQ-RAVSCORE-NEXT-EMERGENCY-LAST-COMPLETE-001`, `REQ-LOCAL-WARMUP-WHOLE-DATASET-FALLBACK-001` og `REQ-CANDIDATE-G-RECOVERY-FALLBACK-HORIZON-001`: den absolutte 72-timersgrænse er fjernet; pakkens egen horizon er hård.
- Aldersdelen af `REQ-RAVSCORE-INTEGRATED-CONTINUATION-001`: et korrekt samme-model-checkpoint afvises ikke alene ved 72 timer; det skal fortsat matche target, horizon, model, state, registry, hashes og tidsretning.
- `REQ-DATA-016` og DEC-0116 punkt 10's generelle rå 72-timerskrav: gældende model bruger op til 48 timers verificeret advisoryhistorik, som gerne må være ufuldstændig med korrekt kvalitetsstatus.
- DEC-0115's 90/150/240-minutters hårde friskhedsgater og DEC-0118-tabellens bevarelse af dem.

Historiske runbeskrivelser, hvor 72-timersreglen faktisk forklarede daværende adfærd, ændres ikke til nye fakta; de er revisionsspor og giver ikke længere normativ tilladelse eller blokering.

## Forkastet, bevaret og uafklaret

**Forkastet:** alder alene som missing, `UNAVAILABLE`, cacheprune eller deploystop; partial historik som national modelblokering; hel-cache-reset på én lokal defekt; implicit valg af en vilkårlig gammel eller ny weather-kørsel ved cutover.

**Bevaret:** exact 79.414 closure, DMI-first og kildeprioritet, atomisk tuple-replacement, source-/model-/registry-/hashbinding, ingen interpolation/carry/nabolån, calibration lock, privacy, bounded generelle vejrtrin og alle fulde release-/Pages-gates.

**Uafklaret og særskilt efter lancering:**

1. Mål scorekontinuitet ved providertransitioner og vurder dokumenteret overlap/hysterese, så skift fra Open-Meteo til Copernicus/DMI ikke giver unødige spring. Ingen sådan glatning eller blanding er godkendt i 4.0.332.
2. Design en durable, immutable multi-artifact-historik og selector for den nyeste komplette horizon-gyldige weatherpakke. 4.0.332's handoff er bevidst exact-run-bundet og er ikke denne generelle historik.

## Evidensgrænse

4.0.332's målrettede kontrakttests er lokale beviser for implementeringen, ikke exact-head-, GitHub-, provider- eller produktionsbevis. Candidate G forbliver offentlig, indtil den samlede autoriserede cutover har bestået den reelle kæde og er verificeret online.
