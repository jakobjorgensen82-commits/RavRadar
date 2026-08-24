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

## Produktionsbevis

- PR #131 blev merged som `1bbb4cc2`; PR #132 bevarede den ældre hydratorindgang og blev merged som `392fea15`.
- Produktion `32761751284` bestod central hydrering, frisk vejr/state, fuld validering, releasegate og Pages-deploy.
- Live `rr-20260824183620-210` kører som 4.0.272 på 210 zoner og 673 kystdele. Offentlig top-5 varierer igen 76, 74, 72, 72 og 71, og femdøgnslisten står 86, 84, 83, 76 og 76.
- En lokal kontekstreset efter punktpar 2 er bevaret. Otte aktuelle missing-evidence-huller fandtes allerede før nulstillingen og holder midlertidigt hele runtime på den sammenhængende 25/40/35-reserve; ingen score-, vejr- eller geodata er opfundet for at omgå gaten.
