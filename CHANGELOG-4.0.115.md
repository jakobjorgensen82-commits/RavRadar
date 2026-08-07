# RavRadar 4.0.115 – verificeret strømhistorik i score-neutral shadow-v2

## Formål
Præcisere den historiske strømtilstand før den første fremtidige scoreændring. Versionen ændrer ikke RavScore.

## Ændringer
- Historiske transportfelter genberegnes efter den videnskabelige DMI-proveniensberigelse.
- Kun strømprøver med verificeret marin DMI-u/v tæller som ind- eller udtransport.
- Ikke-verificerede prøver markeres som utilgængelige og bliver hverken nulstrøm eller transport.
- Akkumuleret 24-timers ind-/udtransport er adskilt fra det aktuelle sammenhængende strømregime.
- Nye kompakte felter beskriver aktivt regime, varighed, momentum, stabilitet, sampleantal og verificeret dækning.
- Tilstandsmodellen er opgraderet til `shadow-v2` og er fortsat score-neutral.
- Referencezonerapport og forklaringer viser de nye felter.
- Den midlertidige GitHub Pages-mikrotest er fjernet.

## Uændret
- RavScore og alle delscorer.
- Eksisterende dokumenteret morfologi.
- DMI-audits, marine collections og provenienskrav.
- Ingen generelle strømbånd eller transportfallback.
- Offentlig browser modtager ikke rå 24-timershistorik.

## Produktionsgate
Før scoreaktivering skal mindst tre friske produktionstimer vise fagligt stabile `shadow-v2`-felter i de fire referencezoner.
