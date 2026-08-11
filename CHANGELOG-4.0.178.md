# RavRadar 4.0.178

- Erstatter 4.0.177's ecCodes-flerpunktsopslag, som produktionsrun #31493787424 viste stadig gentog den dyre søgning internt og derfor afsluttede med 0 forecasttrin.
- Læser HARMONIE-gridets koordinater én gang, begrænser dem til Danmarks punktregister og bruger små geografiske indeksfelter til at finde nærmeste celle for alle lokale punkter.
- Bevarer samme fysiske HARMONIE-cellevalg og fælles U/V-punkt, mens marine og bølgefelters eksisterende landmaske-, afstands- og flerpunktssøgning forbliver uændret.
- Opdaterer schedulerens isolerede ecCodes-testkopi med det nye koordinat-arraykald.

Produktionsstatus: afventer frisk fuld Linux-kørsel og online kontrol af lokale scorer.
