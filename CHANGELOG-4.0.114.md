# RavRadar 4.0.114 – isoleret Pages-deploy og genkørsel

## Formål
Denne release retter releasekædens struktur efter gentagne GitHub Pages-deployments, der blev stående i `deployment_queued`, selv om data, validering og Pages-artifact var færdige.

## Ændringer
- Den tunge data-/buildkæde og GitHub Pages-deploy er opdelt i to jobs.
- Kun det korte deployjob bruger miljøet `github-pages` og rettighederne `pages: write` og `id-token: write`.
- Et fejlet deployjob kan genkøres alene mod det allerede byggede Pages-artifact uden ny DMI-kørsel og uden et ekstra Pages-artifact.
- Push- og tvungne manuelle releasekørsler kan afbryde en ældre almindelig vejropdatering, så en ny version ikke bliver låst bag gamle jobs.
- Almindelige eksterne vejrkald afbryder fortsat ikke en igangværende tung kørsel.
- RavScore, DMI-audits, marine datakrav, skyggetilstand og offentlig runtime er uændrede.

## Rodårsagsafgrænsning
Loggene beviste ikke en fejl i det byggede artifact. Den gamle struktur holdt dog `github-pages`-miljøet gennem hele den 12–15 minutter lange datapipeline. Den nye struktur begrænser miljøets livscyklus til selve deploymentet og gør fejlen reproducerbar og genkørbar uden dyr datagenerering.

## Produktionsgate
Efter push skal det bekræftes, at:
1. `build-and-prepare` gennemfører og uploader præcis ét Pages-artifact.
2. `deploy-pages` starter som et særskilt job og publicerer 4.0.114.
3. Ved en eventuel Pages-fejl kan `Re-run failed jobs` genkøre deployjobbet alene.
4. Sitetesten består uden startup- eller funktionsregression.
