# DEC-0106 – naturlig fosforformulering og tvetydig zonesøgning

- **Status:** Implementeret og lokalt fuldt valideret i 4.0.308-kandidaten; afventer exact-head og produktion
- **Dato:** 2026-08-29
- **Modelpåvirkning:** Ingen

## Evidens

Den offentlige 4.0.307-slutkontrol på mergecommit `6c0b6c49230393a3e4306a867dd3f4c3e845d234` fandt to kanter, som de tidligere syntetiske tests ikke dækkede:

1. “Hvad er hvidt fosfor på stranden?” blev afvist, selv om den kildebundne fosfor-sikkerhedsviden fandtes. Emnets mønster krævede samtidig omtale af rav.
2. `lyn` valgte automatisk den første matchende zone, eksempelvis Lynæs. Brugeren kunne derfor ikke se, at flere zoner – herunder Lyngså – matchede samme delstreng.

## Beslutning

- Hvidt fosfor genkendes lokalt på naturlige DA/DE/EN-formuleringer om fosfor på stranden, også når spørgsmålet ikke gentager ordet rav. Svaret forbliver den officielle sikkerhedsvejledning: lad fundet ligge, hold afstand og kontakt politiet.
- Zonesøgningen filtrerer den eksisterende rullemenu til **alle** delstrengsmatches. Ved flere matches vises antal og brugeren vælger i rullemenuen. Når søgningen ryddes eller ikke matcher, bevares/gendannes den fulde rullemenu.
- Tre naturlige fosforregressioner og en fler-match-zonekontrakt låser adfærden.

## Grænser

Candidate G, RavScore, scorevægte/-kurver, bølge-/strøm-/mobiliserings-/leveringssemantik, DMI/Copernicus, state/cache/recovery, modelprofil, geometri og land-/vandpunkter ændres ikke. Kun topversionsfelterne i de to geodatafiler må følge 4.0.308.

## Rollback

Mønsterudvidelsen og den filtrerede visning kan rulles tilbage uafhængigt. Det kildebundne fosforsvar, den oprindelige rullemenu og 4.0.307's øvrige rettelser må ikke fjernes.
