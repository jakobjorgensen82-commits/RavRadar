# RavRadar 4.0.389 – Open-Meteo lukker kun de aktuelle huller med en realistisk tidsramme

## Ændret

- Den normale Open-Meteo-restfyldning får højst 900 sekunder mod tidligere
  240 sekunder.
- Normalruten bruger `--critical-only`, så Open-Meteo stopper, når den
  eksakte restliste er tom, i stedet for at bruge tid på proaktiv
  genopfriskning.
- Releasegate og workflowkontrakttests kræver den nye ramme og den
  kritiske-only-afgrænsning.

## Bevidst uændret

- Maksimalt 50 punkter pr. providerrequest.
- DMI → Copernicus Baltic → Copernicus AMM15 → regional DMI → Open-Meteo.
- Alle fysik-, afstands-, provenance-, cache- og komplethedskrav.
- Nul reelle mangler før artifact, write og deploy.

## Driftsevidens

Normalrun `35064588725` havde 6.254 reelle rester før Open-Meteo. Rotation
virkede, alle providers gemte fremgang og der var ingen providerfejl, men kun
396 par nåede gennem fire requests inden den delte 240-sekundersramme. Den
gamle oneoff `35067958289` nåede ingen provider og bruges ikke igen efter
cutover. Se DEC-0171.
