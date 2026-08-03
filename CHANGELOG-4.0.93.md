# RavRadar 4.0.93

## Rettet
- Fjernet den sidste geometri-rollbacktest, som krævede samme faste zoneantal som historiske snapshots og derfor stoppede GitHub efter en lovlig zonesletning.
- Zonevalideringen bruger nu eksplicitte centrale sletningstombstones og ID-integritet i stedet for en fast minimums- eller totalgrænse.
- En godkendt fuld 180° vending af land-/havpunkter og pålandsretning accepteres, når geometrien er konsistent.
- Rollback-snapshots må ikke længere overskrive administratorens aktuelle zonenavn, kystlinje, land-/havpunkter, retningsankre eller pålandsretning.
- Rollbackværktøjet kan ikke genoplive administrativt slettede zoner.

## Regressionstest
- Ny samlet admin-zonekontrakt simulerer omdøbning, kystlinjeændring, 180° vending, zonesletning og en ikke-godkendt retningskladde.
- Simuleret GitHub-kæde består med 208 aktive zoner efter én sletning og med en fuldt vendt, konsistent pålandsretning.
- Testene beskytter nu integritet og forplantning frem for historiske administrator-redigerbare værdier.
