# RavRadar 4.0.409 – nyeste gyldige DMI-komponent i recovery

Dato: 2026-09-18

## Ændret

- Gammel deployet privat historik og ny progressiv DMI-historik samles nu
  pr. kystdel, time og komponent efter dokumenteret `modelRun`.
- En nyere gyldig strøm kan erstatte gammel strøm, mens en gammel gyldig
  bølge bevares, hvis den nyere prognose mangler bølger, og omvendt.
- Strømmens U/V-par og bølgernes højde/periode/kildebevis forbliver atomiske;
  felter blandes ikke på tværs af ugyldige rækker.
- Samme eller ikke-sammenlignelige `modelRun` med forskellige værdier
  stopper fortsat som en reel konflikt.
- Den generiske replaykontrol og den aktive RavScore-model er uændrede.

## Baggrund

4.0.408 blev leveret gennem exact-head `35310381268`, PR #352, main
`891b5f3c8ba8778c91d41ac15f2448c4e66af655` og providerfri code-only
`35310919329`.

Normalrun `35311408813` gennemførte alle tre providerled og livebeviste
Copernicus-rettelsen. Closure havde 31.733 DMI-, 4.956 Copernicus-, 904
regionale og 41.001 Open-Meteo-par samt 820 ærlige lokale `MISSING` ud af
79.414. Providerfremgangen blev gemt. Central weather stoppede bagefter, fordi
en gammel og en nyere gyldig DMI-bølge blev behandlet som ligeværdige peers i
replayet i stedet for som to prognoserevisioner.

## Drift

Efter exact-head, merge og providerfri code-only køres én almindelig weather
på de gemte providercacher. Ingen oneoff. Bootstrap bruges kun, hvis den målte
rest og normal kørselskapacitet bagefter viser et konkret behov. Scheduler
forbliver pauset, indtil central weather, runtimeaudit og deploy er grønne.
