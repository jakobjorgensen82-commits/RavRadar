# RavRadar 4.0.21 – Tidevandssikker DMI-kontinuitet

## Rettelse før deployment

- Fjerner automatisk reparation eller udglatning af gyldige DMI-vandstande alene på grund af store timespring.
- Bevarer DMI som autoritativ kilde, også ved kraftige tidevandsændringer som kan være fysisk korrekte i Vadehavet og andre tidevandsområder.
- Store DMI→DMI-spring registreres fortsat i diagnostikken, men klassificeres som `authoritative-dmi-dynamic-change` med handlingen `accepted-without-modification`.
- Automatisk kontinuitetsreparation er nu begrænset til dokumenterbare datamangler: korte interne DMI-huller og sammenhængende, niveautilpassede fallbackblokke ved reel manglende DMI-dækning.
- Fjerner gammel fallback- og reparationsmetadata før hver ny sammensætning.
- Opdaterer regressionstest, så en kraftig, men sammenhængende tidevandskurve skal bevares uændret.

## Uændret fra 4.0.20

- Automatisk visning af RavRadars primære og sekundære DMI-stationsvalg i admin.
- Kandidatrangering, afstand, vægte og forklaring af automatisk beregning.
- Tydelig markørforskel mellem alle stationer, automatiske valg og administratoroverrides.
- Cacheaudit, stationskontrol og accepteret prognosehorisont omkring 118 timer.
