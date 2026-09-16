# DEC-0172 – Forlænget post-cutover-bootstrap bruger den normale sikre produktionsrute

**Status:** Aktiv; implementeret og måltestet lokalt i 4.0.390, exact-head og livebevis afventer
**Dato:** 2026-09-16

## Evidens

4.0.389 blev merged som main `bf8eb739476631ec534df3b2e3ba75e7370a3c29`.
To kontrollerede normale kørsler genbrugte og gemte alle providercacher.

Run `35069942328` havde 6.450 reelle rester før Open-Meteo og 5.025 efter.
Open-Meteo nåede alle 14 planlagte grupper. Run `35074225256` flyttede
produktionsreferencen en time, øgede DMI-dækningen fra 14.260 til 14.772 og
regional DMI fra 416 til 704, og reducerede resten før Open-Meteo til 5.181.
Efter Open-Meteo var 4.565 par tilbage.

Andet run nåede igen hele Open-Meteo-køen og afsluttede uden at ramme dens
tidsbudget. De tilbageværende par var provider-negative i passagen, primært
null-/gitterafstandstilfælde. Mere Open-Meteo-tid er derfor ikke den rigtige
bootstrap. De højere kilder flytter resten, men 900/360 sekunder til
DMI/Copernicus vil kræve mange normale rotationer.

Den gamle operational-118-oneoff er fortsat bundet til en pensioneret
Candidate G-bootstrap og stoppede før providers. Den genoplives ikke som
produktionsvej.

## Beslutning

- Den almindelige orchestrator får et eksplicit manuelt input
  `extended_provider_bootstrap`.
- Inputtet accepteres kun på `main` og kun sammen med `force=true`.
- Den forlængede kørsel bruger præcis samme post-cutover-rute, cacher,
  kildeprioritet, validering, writes og deploygates som normal weather.
- DMI får højst 3.600 sekunder, seks samlinger, 4.096 MB downloadramme og
  180 sekunders slutreserve.
- Copernicus får højst 3.300 sekunder i én bounded wrapperpassage.
- Open-Meteo forbliver 900 sekunder og `--critical-only`; dens tid øges
  ikke, fordi begge målte kørsler nåede hele restkøen.
- Buildjobbet får 240 minutter ved eksplicit providerbootstrap og fortsat
  180 minutter ved first-cutover. Normal og planlagt drift beholder 90 minutter, DMI 900
  sekunder/tre samlinger og Copernicus 360 sekunder.
- Nul-missing-gaten består. Ufuldstændige resultater gemmer kun privat
  fremgang og må ikke bygge eller deploye.

## Afgrænsning

RavScore, geometri, fysik, batchstørrelser, provideradmission, cacheformat og
offentlig datakontrakt ændres ikke. Scheduler forbliver pauset under den
manuelle bootstrap. Efter komplet closure må normal drift bevise den fortsatte
DMI-/Copernicus-overtagelse, før scheduleren genaktiveres.
