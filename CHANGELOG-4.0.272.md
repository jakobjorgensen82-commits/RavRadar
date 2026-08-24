# Changelog – RavRadar 4.0.272

## Rettet

- Produktionen stopper nu, hvis det tidligere offentlige manifest og conditions ikke kan hentes atomisk.
- Candidate G accepterer ikke længere en landsdækkende `NO_PREVIOUS_STATE`-nulstart som normal aktiv opvarmning.
- En strengt afgrænset engangsrecovery genkender den dokumenterede nulstillede state-linje og kan genoptage den kompakte Candidate G-tilstand fra den eksakte sidste grønne 673-deles produktion. Den bliver straks inaktiv, når historikken før nulstillingen igen findes.
- En bevidst lokal punktændring kan fortsat nulstille netop den berørte kontekst uden at legitimere en global nulstart.
- Hydratoren bevarer den ældre nul-argument-indgang, som den fulde produktionsgate kontrollerer, mens isolerede tests bruger den nye rodvariant.

## Bevidst uændret

- Candidate G's scoreformel og 20/50/30-vægtning.
- Vejrregler, kildeorden og kravet om 673/673.
- Zoner, kystgeometri og land-/vandpunkter.
- Alt geografisk indhold i `data/kystdata.json` og `data/zones.geojson`. Kun filernes versionsfelt følger den samlede release fra 4.0.271 til 4.0.272.

## Afventer før produktionslukning

- Frisk central fuld produktion og releasegate.
- Offentlig 210/673-score- og browserkontrol.
