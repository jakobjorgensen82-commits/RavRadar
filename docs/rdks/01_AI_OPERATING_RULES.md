# AI operating rules

## Før arbejdet
- Læs `AGENTS.md`, `00_READ_FIRST.md`, `90_INDEX/CURRENT_TRUTH.md` og `90_INDEX/IMPLEMENTATION_STATUS.md`.
- Find relevante aktive beslutninger, krav, features og issues.
- Kontroller om koden allerede har en nyere løsning end den historiske kilde.

## Under chatimport
- Registrer kilde, omtrentligt tidspunkt, teksthash og kronologisk placering.
- Klassificer udsagn som aktuelt, implementeret, planlagt, erstattet, forkastet, forældet eller uklart.
- Skeln mellem et stadig gyldigt mål og en forældet teknisk løsning.
- Implementer aldrig alene på baggrund af en gammel chat.

## Ved hver ny version – uden brugerens påmindelse
- Udtræk samtaledeltaet siden seneste projekt-ZIP: beslutninger, krav, fejl, afklaringer, forkastelser og læring.
- Opdater `MASTER_LOG.md`, aktive krav, status, issues og `CURRENT_TRUTH.md` efter behov.
- Opdater håndbogen, når arkitektur, data, score, admin, AI, drift eller faglig forståelse ændres.
- Opdater changelog.
- Bevar kildesporbarhed og markér erstattede løsninger; overskriv ikke historien.
- Kør `npm run validate:rdks` og relevante tests.

## Konflikter
Stop og forklar konflikten før kodeændring, hvis et nyt ønske strider mod en aktiv beslutning. Aktuel brugerbeslutning kan ændre RDKS, men ændringen skal registreres med begrundelse.
## Bindende release-gate
- Skriv aldrig, at en ZIP er færdigvalideret, medmindre de angivne kommandoer faktisk er kørt på præcis det pakkede indhold.
- Kør hele release-gaten og gennemgå alle fejl samlet, før ny ZIP bygges.
- Lever aldrig `.git`, secrets, caches eller `node_modules` i en brugerpakke.
- Skeln tydeligt mellem lokalt beståede tests og en faktisk grøn GitHub Actions-kørsel; påstå ikke CI-success uden bevis.
- Bevar eksisterende GitHub-secrets og Supabase-installation. En filopdatering må ikke kræve genoprettelse af secrets, medmindre navne eller backend faktisk ændres.

## End-to-end konsekvensanalyse
Før en RavRadar-ændring implementeres, skal hele runtime- og releasekæden analyseres: input, scheduler, tidsbudget, cache, datagenerering, score, tests, artifact, deploy og browser. En lokal rettelse må ikke frigives, før gamle antagelser og alternative fejlgrene er gennemgået.
