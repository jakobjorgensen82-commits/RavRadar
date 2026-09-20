# DEC-0220 – Copernicus-timeout skal aflevere eksakt baseline uden dyr replay

**Dato:** 2026-09-20  
**Version:** 4.0.442  
**Status:** Vedtaget lokalt; driftsbevis afventer næste almindelige kørsel.

## Beslutning

Copernicus må kun starte et nyt shard, når der er mindst 45 sekunder tilbage
til sikker stategemning. Wrapperens samlede normale budget er 420 sekunder,
hvor 120 sekunder er reserveret til afslutning og genindgang.

Hvis en hard timeout rammes, skal recovery først bevise, at den eksisterende
bank, shadow og source-stage stadig er præcis den gemte, genbrugelige baseline.
I så fald beholdes baselinen uændret, og validerede segmentkvitteringer bliver
liggende til næste almindelige kørsel. Recovery må ikke forsøge en tung replay
under den korte afslutningsfrist. Kan baselinen ikke bevises, gælder den gamle
strenge consolidation og fail-closed gate.

## Hvorfor

Run `35486533929` gennemførte DMI, men Copernicus' lokale timeout recovery
brugte hele sin korte frist på bank/shadow/source-stage-consolidation. Det
efterlod ikke et entydigt source-stage-bevis, selv om segmentkvitteringerne var
gemt. Den fejl var en timeout-handoff-fejl, ikke bevis på at de hentede data
var gyldige som komplet datasæt.

## Sikkerhedsgrænser

- Baseline skal matche både den originale stage og donorprojektionen.
- Journalen slettes ikke af fast recovery.
- Delvis eller ukendt state må ikke markeres READY.
- DMI/fallback-prioritet, gamle gyldige data, score og geometri ændres ikke.

## Evidens

`test-copernicus-bounded-retry-4.0.289.py`,
`test-copernicus-current-source-stage.py`,
`test-copernicus-segment-journal.py`, workflowkontrakterne og
`release-gate.mjs` er grønne efter rettelsen. Den eksakte almindelige
continuation er stadig det nødvendige produktionsbevis.
