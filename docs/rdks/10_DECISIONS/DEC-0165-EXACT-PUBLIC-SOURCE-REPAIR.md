# DEC-0165 – Kendt offentlig kildedrift repareres eksakt uden at svække målet

**Status:** Aktiv; implementeret lokalt i 4.0.383, livebevis afventer  
**Dato:** 2026-09-16

## Evidens

4.0.382 bestod sourcegate `35024395809`, PR #324 og merge til main
`a7f0fcbac844d6c0e0919015162d2409703cb44d`. Providerfri code-only
`35025121452`, forsøg 3, byggede en komplet og privacy-godkendt ny Pages-pakke
med 79/79 browserfiler. Den blev ikke deployet.

Kørslen stoppede før Pages, fordi den centrale pointer fortsat beskriver den
ældre deployment `pages-34877443841-1`, mens den faktiske offentlige side er
4.0.381 fra `pages-35020915350-1`. 4.0.381 gik online før dens efterkontrol
fandt den kendte ene 404, og derfor nåede den centrale maintenance ikke at
registrere det offentlige skift. Den faktiske kilde har 78/79 filer; kun
`js/services/runtime-diagnostics-archive.js` mangler.

## Beslutning

- Normal kodelevering kræver fortsat eksakt overensstemmelse mellem central
  pointer og offentlig manifestidentitet.
- En enkelt versionsstyret reparationspolitik må genkende netop 4.0.381 ved
  repository, run, attempt, commit, deployment-id, artifact-id/digest,
  artifact-seal, manifest, binding, implementation-closure og offentlig
  closure.
- Den kendte kilde skal stadig verificere alle 79 forventede filer. Kun den
  fastlåste gamle decodersti må være HTTP 404; de øvrige 78 skal være korrekte,
  og kontrollen må ikke læse private payloads.
- Reparationsresultatet hedder `repairable-source`, aldrig `passed`. Ukendt
  drift, ekstra mangler eller ændrede hashes stopper fortsat.
- Den faktiske offentlige deployment bruges som source-id gennem plan,
  handoff og central same-binding maintenance. Dermed beskriver historikken
  den side, der reelt er online, fremfor den gamle centrale pointer.
- Undtagelsen gælder kun den defekte kilde. Den nye 4.0.383-målpakke skal før
  upload og efter deploy bestå den normale strenge 79/79-closure, privacy,
  model-, source- og latest-main-kontrol. Reparationsflaget må ikke sendes til
  målverifikationen.

## Drift

4.0.383 leveres uden DMI, Copernicus, Open-Meteo eller oneoff. Efter
offentlig 79/79-verifikation og central completion køres én almindelig,
tidsbegrænset weather-kørsel for at bevise numeriske scorer, rotation og
cachevedligeholdelse. Struktur 210/673 alene er stadig ikke datakomplethed.

