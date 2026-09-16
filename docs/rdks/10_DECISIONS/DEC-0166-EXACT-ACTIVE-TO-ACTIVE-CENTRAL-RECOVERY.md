# DEC-0166 – Eksakt ACTIVE-til-ACTIVE-genoptagelse af allerede levende 4.0.383

**Status:** Gennemført i 4.0.384; sourcegate 35040475553, PR #327 og central recovery 35040799616
**Dato:** 2026-09-16

## Evidens

PR #326 bestod exact-head sourcegate `35034134953` og blev merged som main
`11f101f8f4c304253e55d5c850d4274e626db2a2`. Providerfri code-only-run
`35034589754` gendannede og kontrollerede den private runtime, publicerede
backend og deployede Pages. Frisk offentlig kontrol viser 4.0.383, integreret
model, 210 zoner, 673 kystdele og ingen privat payloadlæsning.

Den centrale afslutning nåede ingen write. Maintenance-planen brugte den
ældre offentlige forgængers implementation-closure som kilde, selv om den
centrale ACTIVE version 1 har sin egen forseglede closure. Planen blev derfor
afvist; centralen forblev sikkert ACTIVE version 1 og kom aldrig i PENDING.

## Beslutning

- En engangsgenoptagelse må kun køre manuelt på main med en særskilt eksakt
  bekræftelse.
- Den accepterer kun den kendte centrale ACTIVE version 1 med source-head,
  deployment, closure, manifest, audit, readiness, modelbinding og profil fra
  den oprindelige aktivering.
- Det allerede levende mål accepteres kun fra de eksakte source- og
  target-recovery-artifacts. GitHub skal stadig rapportere de fastlåste
  artifact-id'er, digests, størrelser, runs og heads, og target skal bestå en
  frisk offentlig 210/673-verifikation.
- Genoptagelsen skriver måltilstanden i én atomisk CAS fra ACTIVE version 1 til
  ACTIVE version 2. Den opretter ingen PENDING-mellemtilstand og genkører ikke
  private writes, Edge eller Pages.
- Den forseglede targetprofil fra 4.0.383-artifactet er central sandhed ved
  recovery. 4.0.384's lokale releaseprofil må ikke erstatte den.
- Den almindelige code-only-plan skal fremover bruge centralens aktive
  implementation-closure som source for historisk integrated maintenance.
- Workflowet må være genkørbart som read-only succes, hvis den eksakte ACTIVE
  version 2 allerede findes; enhver tredje tilstand stopper.

## Afgrænsning

Recoveryworkflowet kører ingen kildekontrol, vejrprovider, oneoff,
private-runtimebygning, databaseinstallation, Edge-deploy eller Pages-deploy.
Det genbruger ikke bare en antagelse om tidligere succes; alle immutable
beviser kontrolleres, og den levende side læses frisk umiddelbart før CAS.

DEC-0166 fortsætter DEC-0165 efter det vellykkede offentlige 4.0.383-deploy.
DEC-0165's source-reparation er historisk gennemført; normal weather og
numerisk score-/rotationsbevis er fortsat åbent efter central aktivering.

## Produktionsudfald

Main 2628ddefa547191c678f88ba9791b2cd867ea3e4 kørte den afgrænsede recovery
uden sourcegate, weather, privat build, Edge eller Pages. Den atomiske write og
readback gav INTEGRATED_ACTIVE version 2 med den forventede binding og
deployment pages-35034589754-1. Den efterfølgende normale weathervej
reguleres af DEC-0167.
