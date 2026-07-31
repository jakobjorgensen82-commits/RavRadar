# AI operating rules

## Før arbejdet
- Læs `AGENTS.md`, denne fil og `90_INDEX/CURRENT_TRUTH.md`.
- Find relevante aktive beslutninger, krav, features og issues.
- Kontroller om koden allerede har en nyere løsning end den historiske kilde.

## Under chatimport
- Registrer kilde, omtrentligt tidspunkt og udtrukne udsagn.
- Klassificer hvert udsagn som aktuelt, erstattet, forkastet, forældet eller uklart.
- Implementer aldrig alene på baggrund af en gammel chat.

## Ved ny version
- Opdater `MASTER_LOG.md`.
- Opdater berørte beslutninger, krav, features og issues.
- Opdater `CURRENT_TRUTH.md`, hvis gældende sandhed ændres.
- Opdater changelog og håndbog, når brugeradfærd eller arkitektur ændres.
- Kør RDKS-validering og relevante tests.
