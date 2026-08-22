# Jagtformsafhængig jagtbarhed i næste RavScore, 2026-08-22

## Kort konklusion

Strand og waders skal ikke have samme slutkobling til jagtbarhed.

- **Strand:** Et stærkt fysisk ravpotentiale må fortsat give en høj RavScore under kraftig vind. Jagtbarheden må ikke lægge loft over strandscoren.
- **Waders:** Vind og bølger påvirker direkte muligheden for at lyse gennem vandet. Den samlede waders-score må derfor ikke være højere end waders-jagtbarheden.
- **Ikke sikkerhed:** Modellen beskriver søgemetodens effektivitet, ikke om det er sikkert at gå i vandet.
- **Ingen grundegnethed:** Bund, dybde, render, vadebredde og adgang indgår ikke.

Den ejer-godkendte næste forskningsvariant er:

`waders-score = min(Candidate G-score, jagtbarhed)`

Den har ID `G-50-50-NO-DIRECT-WIND-WADERS-LIMIT`. Strandscoren er uændret. Varianten er diagnostic-only og ikke godkendt til offentlig produktion.

## Vindkurven

Vinddelen af waders-jagtbarheden følger denne kontinuerte, stykkevist lineære kurve:

| Vind | Vinddel |
| ---: | ---: |
| 0-6 m/s | 100 |
| 7 m/s | 80 |
| 8 m/s | 60 |
| 10 m/s | 35 |
| 13 m/s | 10 |
| 18 m/s og derover | 0 |

Seks m/s er overgangspunktet og ikke en kunstig klippe. Enhver stigning over 6 m/s trækker vinddelen ned. Bølgehøjden beregnes fortsat som en særskilt del af waders-jagtbarheden, så roligt vand kan bevare en brugbar score, mens højere bølger kan begrænse den selv ved moderat vind.

Den tidligere Candidate G-kurve bevares uændret som reference. Den nye kurve anvendes kun af den nye navngivne variant.

## Hvorfor et loft og ikke kun nye vægte

I Candidate G tæller jagtbarhed 20 procent. Høj transport og mobilisering kunne derfor tidligere give cirka 79 point, selv når waders-jagtbarheden var nul. Det er misvisende for en jagtform, hvor vind og bølger kan gøre lygtesøgningen ineffektiv.

Fem score-neutrale koblinger blev sammenlignet på samme historiske grundlag:

| Forsøg | Virkning på 730 waders-evalueringer | Vurdering |
| --- | --- | --- |
| 45/35/20-vægte | Løftede 451 scorer og ændrede scorebånd 345 gange | For bred |
| Blødt loft `30 + 0,70 × jagtbarhed` | Sænkede 122 scorer og ændrede 49 scorebånd | Målrettet, men mindre direkte |
| Loft ved jagtbarheden | Sænkede 226 scorer, løftede ingen og ændrede 189 scorebånd | Enkelt og tydeligt |
| Geometrisk middel | Løftede 499 scorer og ændrede 323 scorebånd | For bredt og kompliceret |
| Laveste af fysisk potentiale og jagtbarhed | Sænkede 701 scorer og ændrede 285 scorebånd | Ændrer for meget |

Det direkte loft gør produktbetydningen synlig: Ravpotentialet kan være højt, men den viste waders-score kan ikke love mere, end søgeforholdene tillader.

## Historisk genafspilning af den godkendte variant

Den nye variant blev genafspillet på 1.460 evalueringer fra de 12 eksisterende historiske hændelsesvinduer: 730 waders og 730 strand.

- Alle 730 strandscorer var identiske med `G-50-50-NO-DIRECT-WIND`.
- Waders-gennemsnittet gik fra 35,465 til 27,351, altså -8,114 point.
- 231 waders-scorer faldt, 323 var uændrede og 176 steg.
- De 176 små stigninger kommer fra den nye rolige-vindkurve; den største stigning var 3 point.
- 200 waders-evalueringer skiftede scorebånd.
- Den nye gennemsnitlige waders-jagtbarhed var 56,347 mod 54,474 før, altså +1,873 point.
- 216 waders-evalueringer havde jagtbarhed under 35; ingen af dem fik en samlet score på 55 eller mere.
- Ingen af de 730 waders-scorer oversteg sin jagtbarhed.

Sammenlignet med det samme direkte loft anvendt på den gamle vindkurve var den nye variants gennemsnit kun 0,449 point højere. 19 af 730 evalueringer skiftede scorebånd. Kurveændringen er dermed lille i forhold til selve den jagtformsafhængige kobling.

De udvalgte hændelser er ikke repræsentative for alle danske dage. Tallene dokumenterer regelvirkningen; de er ikke en empirisk national kalibrering.

## Vind og bølger med fast fysisk ravpotentiale

En syntetisk matrix holder transport og mobilisering fast på 85 og varierer kun vind og bølger. Tabellen viser den endelige eksperimentelle waders-score:

| Vind | Bølger 0,4 m | Bølger 0,7 m | Bølger 1,0 m | Bølger 1,2 m |
| ---: | ---: | ---: | ---: | ---: |
| 6 m/s | 85 | 71 | 50 | 37 |
| 7 m/s | 81 | 67 | 47 | 34 |
| 8 m/s | 66 | 61 | 44 | 31 |
| 9 m/s | 57 | 52 | 42 | 29 |
| 10 m/s | 47 | 42 | 36 | 27 |
| 12 m/s | 34 | 30 | 24 | 20 |
| 13 m/s | 28 | 23 | 17 | 14 |

Det betyder i RavRadar:

- Ved højst 6 m/s får vinden ingen fradragsvirkning, men faktiske bølger kan stadig begrænse wadersjagten.
- Over 6 m/s falder resultatet trinvis og glidende med vinden.
- Ved 8 m/s kan meget roligt vand fortsat være brugbart, men 1 meter bølger giver en svag score.
- Ved 10-13 m/s bliver waders-scoren lav, selv om det fysiske ravpotentiale er stærkt.
- Den tilsvarende strandscore ændres ikke.

## Kanonisk yderpunkt

Det eksisterende højenergiforløb gav waders-jagtbarhed 0 og Candidate G-score 79. Den nye variant giver 0 for waders, mens den tilsvarende strandscore fortsat er 84. Dette er søgbarhed, ikke en sikkerhedsadvarsel.

## Besluttet og åbent

Besluttet i næste forskningsvariant:

- ingen direkte vindhukommelse;
- 50/50-sporet mellem 24 og 48 timers historik;
- ny waders-vindkurve med maksimum til 6 m/s og monotont fald derefter;
- synligt waders-loft ved jagtbarheden;
- uændret strandscore;
- ingen bund-/dybde-/adgangsmodel og ingen sikkerhedsadvarsel.

Fortsat åbent før offentlig aktivering:

- den samlede Candidate G-model og den endelige vægtbegrundelse;
- produktforklaring, pile og komponentvisning;
- coveragegaten for lokale retention-features;
- ejerens samlede go/no-go;
- senere kalibrering mod komplette fund- og nul-fundsture.

## Databeskyttelse og afgrænsning

- Genafspilningen brugte kun den Git-ignorerede private cache.
- Ingen rå vejrværdier, U/V, koordinater eller private payloads skrives til Git.
- Beskyttede data, geometri og land-/vandpunkter blev ikke læst eller ændret.
- Offentlig RavScore, UI, regler, DMI/fallback og central admin er uændrede.

## Valideringsopfølgning efter PR #66

PR #66 bestod den hurtige exact-head-kildegate, men den fulde post-data-validering forventede fortsat det gamle interne gatenavn `candidate-waders-product-decision`. Koden bar allerede den nyere, mere præcise åbne gate for regelrækkefølge og offentlig produktreview. Produktionen stoppede derfor korrekt før release og deploy. 4.0.255 opdaterer testen og gør den obligatorisk i kildegaten; analysens kurve, replay og scorer er uændrede.
