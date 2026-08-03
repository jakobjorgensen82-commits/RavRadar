# RavRadar 4.0.86 – sammenhængende adminarbejdsgange og præcis sitetest

## Håndbog og review
- Den aktive admin har nu en synlig reviewkø på Håndbog-fanen med tæller og direkte genvej efter indsendelse.
- Ejer kan ændre reviewstatus, åbne implementering, redigere det berørte håndbogsafsnit, gemme centralt og verificere readback før reviewet markeres implementeret.
- Lokale nødkladder vises samlet og kan gensendes, eksporteres eller slettes.

## Dokumentation og model-forslag
- Dokumentationscenteret giver nu adgang til håndbog, Current Truth, implementeringsstatus, aktive krav, kendte problemer og masterlog.
- Model-forslag forklarer tydeligt, at godkendelse kun aktiverer en lokal browsermodel og ikke automatisk ændrer fælles produktion.

## Sitetest
- Deploykontrollen skelner mellem 404/manglende fil, timeout, netværksfejl og andre HTTP-fejl.
- En tidligere rapport mærkes som senest gemte rapport, så den ikke forveksles med en ny test.
- Opstartsprofilen opdeles i browser/grundside, netværk/data, beregning og rendering.
- Admin-testen kontrollerer nu synlig adgang til reviewkø, nødkladder, dokumentationscenter og lokal modelstatus.

## Test
- Ny `test:admin-feature-reachability` beskytter de komplette brugerrejser mod at ende som kode uden synlig adgang.
