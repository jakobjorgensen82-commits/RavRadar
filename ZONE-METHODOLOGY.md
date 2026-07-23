# RavRadar – metode for national zoneinddeling

Denne fil låser arbejdsgangen for udvidelsen fra brede testzoner til et landsdækkende, skalerbart zonenet.

## Grundprincipper

- Zoner følger naturlige kystafsnit, ikke kommunegrænser.
- Et nyt kystafsnit starter typisk ved et næs, en odde, en havn, et sejlløb, en markant bugt, en klint eller et tydeligt skift i kystens retning og eksponering.
- Indre fjorde medtages ikke som selvstændige områder. Limfjorden er den eneste fjorddækning.
- Øer opdeles efter eksponering og kystretning, når øens størrelse og topografi gør det relevant.
- En pin skal ligge på den faktiske strand eller kystlinje. Marine datapunkter skal ligge i vandet ud for zonen og må ikke lande i havne, søer eller på land.
- Navne skal kunne forstås lokalt og på landsplan. De bygges primært af kendte kystbyer, strande, næs, odder og klinter.

## Kvalitetskontrol før aktivering

1. Kontroller navn og stavning mod officielle danske stednavne.
2. Kontroller pin visuelt på standard- og satellitkort.
3. Kontroller marine datapunkt mod kystlinje og modeldækning.
4. Tegn en skjult geofence-polygon langs zonens reelle kystafsnit.
5. Kontroller overlap og huller mod nabozoner.
6. Kør `npm run validate` og `npm run validate:zone-plan`.

## Implementering i bidder

`data/zone-plan.json` er masterplanen. Hver batch gennemgås geografisk og flyttes derefter til `data/zones.geojson`. Appens kort, vind-/strømpile, prognoser og vejrjob er allerede datadrevne og anvender automatisk samme egenskaber for nye aktive zoner.
