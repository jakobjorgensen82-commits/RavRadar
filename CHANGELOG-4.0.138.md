# RavRadar 4.0.138

- Tilføjer en privat weather-shadow-kontrakt for de to DMI-gridvaliderede Blåvand-kystdele.
- Giver hver del stabil serieidentitet, eget samplingpunkt/grid, nødvendige provenancefelter og separat fremtidig historiknøgle.
- Forbyder krydsmerge, spatial interpolation, fallback og genbrug af parent-historik.
- Bevarer den eksisterende Blåvand-zoneserie, historik og RavScore som autoritativ runtime.
- Aktiverer ikke sampling, state, part-score, UI, public projection, admin-write, geometri eller RavScore.

Produktionsverificeret: privat pilot #1992 byggede og uploadede kontrakten med præcis to isolerede delserier, unikke serie-/historik-ID'er, korrekte gridreferencer og alle aktiverings-/mutationsflag falske. Artifactet indeholder ingen credentialbærende URL. Normal produktion #1991 bestod central adminhydrering, frisk DMI-/vejropbygning, fuld Linux-validate, release-gate, Pages-artifact og deploy på `2d6127b`; offentlig `version.json` viser 4.0.138.
