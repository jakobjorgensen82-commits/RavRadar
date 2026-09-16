# RavRadar 4.0.385

## Rettet

- Normal weather opretter nu den private runtime-rod, før den beskyttede runtime gendannes.
- Protected restore får højst tre korte forsøg og rydder en eventuel delvis bundlekandidat mellem forsøgene.
- Open-Meteo-slutkontrollen kører ikke længere som en falsk følgefejl, når et tidligere stop betød, at providerforløbet slet ikke startede.
- Det eksisterende centrale recoveryworkflow er registreret i den ikke-deployende workflowinventarkontrol.
- Håndbogskontrollen kræver den aktuelle normal-weather-status frem for den forældede antagelse om, at enhver ny release er code-only.

## Bevaret

- Et vedvarende restoreproblem stopper fortsat før providers, writes og deploy.
- Efter faktisk provider eller verificeret handoff kræves fortsat succes, checkpoint og nul manglende par.
- RavScore, modelbinding, geometri, sourceprioritet, rotation og cacheformat er uændrede.
- Livebeviset køres som almindelig tidsbegrænset weather; ingen oneoff eller ny cutover.
