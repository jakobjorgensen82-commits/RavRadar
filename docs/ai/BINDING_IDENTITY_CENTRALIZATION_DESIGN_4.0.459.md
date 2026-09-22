# Design – central runtime-identitet uden nye binding-regressionsfejl

## Målet

Vi skal have én autoritativ identitet for en runtimegeneration. Den skal kunne
føres fra vejrbygning til privat runtime, checkpoint, database, public artifact,
Pages og browser uden at nogen del kopierer gamle SHA'er eller tider manuelt.

Det er en centralisering af *kilden til sandhed*, ikke en svækkelse af
kontrollerne. En consumer skal stadig afvise en forkert identitet; forskellen
er, at den sammenligner med den aktuelle manifestfil i stedet for sin egen
historiske konstant.

Manifestet alene er ikke nok: det skal suppleres af validerede views for
komponent/proveniens, geometri/punktpar og display-kontekst. Ellers kan en
generation have rigtige hashes, men stadig vise fx en zones vejr under en
anden kystdel. Det fulde felt- og procesinventar står i
`BINDING_IDENTITY_INVENTORY_4.0.459.md`.

## Foreslået kontrakt

Indfør et lille rent modul, eksempelvis
`scripts/runtime-identity.mjs`, med:

1. `buildRuntimeIdentity(input)` – bygger et objekt med fast feltorden og
   schema-version.
2. `assertRuntimeIdentity(value, context)` – validerer typer, UTC-tider,
   SHA-format, counts, modelbinding, contract hashes og privacyfelter.
3. `canonicalRuntimeIdentity(value)` og `runtimeIdentitySha256(value)` – én
   canonicalisering og hashfunktion, som alle trin bruger.
4. `readRuntimeIdentity(path)`/`writeRuntimeIdentity(path, value)` – atomisk,
   JSON-only manifest uden private payloads.
5. `deriveConsumerView(identity, purpose)` – små, eksplicitte view-objekter til
   DB, checkpoint, Pages og browser. Et view må kun indeholde felter, der er
   nødvendige for formålet, men det skal altid bære `identitySha256`.

Den private runtime, rå weather-cache, U/V-værdier, koordinater og credentials
skal aldrig ligge i manifestet. De bevises med hashes, counts og source-/asset-
identiteter.

## Produktionsforløb

```text
source + model + geometry + weather/provenance
                  │
                  ▼
        buildRuntimeIdentity (én gang)
                  │
       identity.json + identitySha256
        ┌─────────┼─────────┬─────────┐
        ▼         ▼         ▼         ▼
      DB/CAS   private    checkpoint  Pages/browser
```

Konkret rækkefølge:

1. Vælg `productionReferenceAt` og byg vejr-/provenienspakken.
2. Byg og valider integrated model, fallbackkomponenter, geometri og counts.
3. Generér runtime-identiteten. Efter dette må ingen trin genberegne en ny
   targettime eller modelbinding fra væguret.
4. Gem identiteten sammen med private runtime og checkpoint. DB-readback,
   Pages og browser læser samme `identitySha256`.
5. Ved continuation hentes predecessor-identiteten fra den beskyttede pointer.
   Den nye identitet skal enten være samme generation eller en eksplicit
   successor med dokumenteret ændringsliste. Der må ikke være en lokal
   `POST_CUTOVER_PREDECESSOR`-kopi.

## Hvad der skal flyttes først

1. `scripts/migrate-post-cutover-private-runtime.mjs`: fjern den historiske
   predecessor-konstant efter en overgangsperiode, hvor den kun kontrolleres
   mod manifestet.
2. `scripts/private-production-runtime-bundle.mjs` og
   `scripts/protected-private-production-runtime.mjs`: skriv/læs manifestet
   som identitetskilde og gem kun private payloads separat.
3. `scripts/integrated-cutover-readiness.mjs` og
   `scripts/ravscore-operational-activation.mjs`: brug identity view til
   model-, Edge-, DB- og source-readback.
4. `scripts/ravscore-continuation-checkpoint.mjs` og Candidate G-reserven:
   behold deres separate rollbackfelter, men bind dem til samme identity hash.
5. `.github/workflows/reusable-weather-build.yml`,
   `.github/workflows/deploy-code-only-repair.yml`,
   `reusable-pages-deploy.yml` og `reusable-operational-reentry.yml`: flyt
   identity mellem jobs som artifact/output i stedet for gentagne jq-/literal-
   konstruktioner.
6. Browserkontrakter og `data-service`: valider public manifestets identity
   view mod de fire offentlige filer; browseren skal ikke kende private hashes.

7. Vejr-/score-/UI-koblinger: indfør eksplicitte `componentView`,
   `geometryView` og `displayContext` med `zoneId`, `partId`, reference-time,
   provider/provenance og modelbinding. De skal følge samme identity hash og
   gøre parent-/nabofallback synlig i stedet for at lade felter glide sammen.

## Fejlscenarier designet væk

- En ny migration kan ikke glemmes i én kontrol: DB-view indeholder både
  migrationskædens canonical hash og hver funktionelle kontrakts hash.
- En ny model kan ikke blandes med gamle data: model-, bundle-, dataset- og
  identity-hash bæres samlet.
- En ny vejrtime kan ikke ændre en gammel bundle ved et UTC-skifte:
  `productionReferenceAt` er låst én gang og bruges i alle views.
- En Pages-upload kan ikke fremstå grøn fra et andet run:
  `sourceHead`, `datasetId`, `identitySha256`, run/attempt og public-manifest-
  hash kommer fra samme sealed artifact.
- En gammel protected runtime kan ikke skjules af et nyt filnavn:
  predecessorens fulde identity læses centralt, og enhver uoverensstemmelse
  rapporterer feltnavn + expected/actual hash i stedet for en generisk fejl.
- En consumer kan ikke acceptere delvis identity: schema-, required-field- og
  canonical-hashkontrol sker før sideeffekter.

## Teststrategi

- Unit: canonicalisering er stabil, hash ændres ved hvert identitetsfelt, og
  private felter afvises.
- Consumer matrix: samme fixture valideres af DB-readback, private bundle,
  checkpoint, Pages og browser.
- Negative fixtures: hver tidligere 4.0.451–4.0.459-fejl gengives med præcis
  feltnavn, ikke kun en generisk `identity mismatch`.
- Workflow: identity-artifactet må kun komme fra samme `GITHUB_SHA`, run og
  attempt; ingen job må bygge et nyt identity-dokument fra literals.
- Migration: en overgangstest beviser at den nye manifestkilde giver samme
  hashes som den nuværende kode, før gamle konstanter slettes.
- Produktion: først read-only shadow i én normal kørsel, derefter én
  code-only-kørsel, derefter normal weather continuation. Ingen one-off er
  nødvendig for selve centraliseringen.

## Sikker udrulning

1. Behold de nuværende fail-closed kontroller og udgiv kun inventar/design.
2. Tilføj manifestgeneratoren og få den til at producere en side-by-side
   identitet; sammenlign med alle nuværende outputs uden at ændre drift.
3. Flyt én consumergruppe ad gangen: private runtime → checkpoint/DB → Pages →
   browser. Hver gruppe har sin målrettede regression.
4. Når en hel normal vejrkørsel og den næste cron har bevist samme identity-
   hash gennem hele kæden, fjernes de gamle duplikatkonstanter.
5. Opdater RDKS og changelog med den konkrete field mapping. Hvis en binding
   ikke kan udledes entydigt, stopper centraliseringen og dokumenterer feltet;
   der må ikke gættes.

Før trin 2 skal en statisk audit klassificere hver forekomst af
`sourceHead`/dataset/tid/model-/bundle-/contract-hash, zone/part/point,
component/provenance, deployment og migration som producer, consumer eller
lokalt evidensfelt. Procesmatrixen i inventaret dækker også pilot-, admin-,
trip-, assistant-, recovery- og testflows; de må ikke ved et uheld blive
fortolket som public production identity.

## Det må vi ikke gøre

- Ikke erstatte alle kontroller med én løs `version`-streng.
- Ikke lade en consumer falde tilbage til sin egen gamle konstante hash.
- Ikke bruge `generatedAt` som erstatning for `productionReferenceAt`.
- Ikke samle private payloads i et offentligt manifest.
- Ikke slette Candidate G- eller historiske migreringsdata, før deres rolle er
  bevist udfaset.
