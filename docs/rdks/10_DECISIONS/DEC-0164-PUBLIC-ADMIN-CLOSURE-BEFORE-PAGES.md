# DEC-0164 – Den færdige Pages-pakke skal indeholde hele browserclosure

**Status:** Aktiv; implementeret lokalt i 4.0.382, livebevis afventer
**Dato:** 2026-09-15

## Evidens

4.0.381 bestod sourcegate `35019932207`, PR #323 og merge `d84773a7`.
Providerfri `35020915350` gennemførte den nye contract-only-genbinding og
Pages-deploy. Den offentlige side viste 4.0.381 og den integrerede model, men
efterkontrollen fandt HTTP 404 på
`js/services/runtime-diagnostics-archive.js`.

4.0.379 havde fejlagtigt dokumenteret, at filen kun blev importeret af et
udeladt admin-dashboard. Faktisk er `admin.html` et offentligt entrypoint,
`admin-dashboard.js` indgår i den forseglede browserclosure, og dashboardet
importerede decoderen statisk. Hele closurekontrollen viste 78 HTTP 200 og
præcis denne ene 404.

## Beslutning

- Den payloadfrie decoder er nødvendig offentlig browserkode og flyttes til
  `js/services/protected-runtime-envelope.js`.
- Den gamle diagnostiknavngivne sti fjernes og må fortsat ikke publiceres.
  Beskyttede runtimepayloads, komplette diagnostikdokumenter, rådata og private
  caches forbliver private.
- Begge Pages-buildere beregner closure igen fra den færdige `_site` og kræver
  byteidentisk manifest med den allerede forseglede målclosure.
- Closure- og privacykontrollen udføres begge før deres fælles udfald. En reel
  manglende browserfil eller privacyfejl forbliver blokerende før nye writes
  eller artifactupload.
- Pages- og offentlig verifikation svækkes ikke. 4.0.381 viste, at de stoppede
  på en reel ødelagt adminside, ikke på uvæsentlig bookkeeping.

## Drift

4.0.381 er offentlig med den integrerede model og korrekt 210/673-inventar,
men adminclosure er defekt, central maintenance-completion blev ikke kørt, og
alle 210 zoner er fortsat lokalt utilgængelige for score. 4.0.382 leveres
providerfrit først. Derefter følger én normal tidsbegrænset weather-kørsel for
numeriske scorer, DMI-rotation og cachevedligeholdelse. Ingen oneoff.
