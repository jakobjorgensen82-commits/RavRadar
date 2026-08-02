# RavRadar 4.0.75

## GitHub-pipeline og offentlig runtime

- 4.0.74-fejlen er rettet ved at gøre `public-conditions.json` til en deterministisk projektion med én fælles implementering.
- `scripts/public-conditions-lib.mjs` er nu eneste kilde til både offentlig runtime og det tilhørende manifest.
- Vejropdateringen, manuel generator, tests og GitHub Actions bruger samme writer.
- Efter hydrering bygges den offentlige runtime altid igen fra den hydratiserede `conditions.json`.
- Før validering og deploy bygges runtime og manifest igen, også når vejropdateringen fejler og det seneste gyldige datasæt genbruges.
- Manifestet indeholder SHA-256 og byteantal for public runtime, så et ufuldstændigt eller blandet datasæt opdages.
- Workflowet kan derfor opgradere et ældre deploy, som endnu ikke havde `public-conditions.json`, uden at kræve manuel indgriben.

## Regressionstest

- Ny pipeline-test kræver byte-identisk projektion, korrekt hash, korrekt dataset-id og samme fælles writer i alle produktionsveje.
- Versionen er bygget direkte oven på brugerens projektmappe efter indkopiering af 4.0.74.
