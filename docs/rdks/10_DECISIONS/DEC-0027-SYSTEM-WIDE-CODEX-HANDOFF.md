# DEC-0027 – Systemisk arbejdsmodel og Codex-handoff

- **Status:** AKTIV
- **Dato:** 2026-08-07

## Beslutning
RavRadar skal fra Codex-overgangen udvikles i et lokalt Git-repository med repositoryets AI-dokumentationspakke som obligatorisk startgrundlag. Fejlretning skal være systemisk: den konkrete fejl ses som ét symptom i en større runtime-/releasekæde.

En version eller baseline må kun kaldes stabil, når påstanden matcher evidensniveauet. Lokale tests giver lokal validering; GitHub Actions giver CI-validering; data-/pipelineændringer kræver desuden frisk produktionsverifikation.

## Begrundelse
4.0.117-forløbet viste, at flere lokale rettelser kunne være rimelige uden at forklare hele fejlen. Schedulerprioritering, candidatesøgning, vertikallagsparring og forkert administratorgeometri spillede hver sin rolle. En isoleret testgrøn løsning gav derfor for stor sikkerhed.

## Konsekvenser
- `docs/ai/CODEX_START_HERE.md` er obligatorisk AI-indgang.
- RDKS/håndbog opdateres sammen med implementering.
- Adminredigerbare data behandles som runtimeinput, ikke testfixtures.
- Historiske chats bruges som evidens/årsagskontekst, ikke som implicit aktive krav.
- En frisk produktionsfejl skal analyseres fra dens aktuelle run/log før en ældre supportfil bruges som forklaring.
