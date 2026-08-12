# DEC-0036 – Bindende afgrænsning til seks problemzoner

**Status:** IMPLEMENTERET I 4.0.187
**Dato:** 2026-08-12

## Beslutning

Det aktive kystarbejde er afgrænset til følgende seks hovedzoner:

- `DK-B07-19` – Langeland syd og Bagenkop
- `DK-B08-12` – Nykøbing Sjælland og Rørvig
- `DK-B08-18` – Dronningmølle og Hornbæk
- `DK-B08-19` – Ålsgårde og Helsingør
- `DK-B10-14` – Lolland vest og Albuen
- `DK-B10-16` – Fejø og Femø

Havnø og Mariager Fjord øst er bevidst slettet og må ikke genoprettes.

Det aftalte adminværktøj skal lade ejeren trække den præcise kyststreg, lade hovedzonens afgrænsning følge og bevare eller nyvalidere land-/vandpunkter, DMI-data, lokal scoreidentitet og øvrig runtimekontrakt. Viskelæderet skal bevares.

Efter den visuelle slutkontrol besluttede ejeren, at `DK-B10-16` Fejø og Femø også skal slettes helt. De fem øvrige rettelser er godkendt til aktivering. Sletningen er registreret både i zoneregisteret, den aktive kystpakke og det centrale `direction-reviews`-dokument, så en senere adminhydrering ikke kan genoprette zonen.

## Hård stopregel

- Den produktionsverificerede nationale kyst uden for de seks zoner er urørt baseline.
- Der må ikke startes, fortsættes, rettes eller aktiveres en landsdækkende genopbygning, ny opdeling eller ny analysepipeline som del af denne opgave.
- Eksisterende fungerende kort-, score-, data-, admin- og forecastfunktioner må ikke ændres uden en ny, udtrykkelig ejerbeslutning.
- Hvis arbejdet viser et behov uden for de seks zoner eller kræver en bred arkitekturændring, skal arbejdet stoppe, og ejeren skal spørges før kode, CI-kørsel eller aktivering.
- Private landsdækkende artifacts fra den fejlagtigt udvidede arbejdsgang er ikke godkendte input og må ikke aktiveres.

## Begrundelse

Ejeren bestilte en målrettet rettelse af seks fallbackzoner og et sikkert adminværktøj. En efterfølgende landsdækkende pipelinegenkørsel lå uden for den aftalte opgave. Denne beslutning forhindrer gentagelse og har forrang for ældre, bredere nationale arbejdsplaner, indtil ejeren udtrykkeligt ændrer afgrænsningen.
