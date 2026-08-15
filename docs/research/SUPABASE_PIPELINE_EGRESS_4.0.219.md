# Supabase pipeline-egress – 4.0.219

## Målt restproblem

4.0.153 fjernede den ufiltrerede læsning af alle centrale dokumenter og den ubegrænsede maskinhistorik. En ny gennemgang af produktionsartifact #2757 viste dog, at hver 15-minutterskørsel fortsat hentede cirka 0,53 MB kompakt `water-station-routing-audit`, selv om dokumentet straks blev genbygget fra den friske vejr- og routingkæde.

Auditten er maskindiagnostik, ikke redigerbar runtime-konfiguration. Den offentlige runtime læser den ikke, og ejerens admin henter den direkte som et beskyttet centralt dokument. Readback før vejrbygningen gav derfor ingen funktionel eller autoritativ værdi.

## Afgrænset rettelse

4.0.219 fjerner kun `water-station-routing-audit` fra `sync-admin-config.py`. Følgende bevares:

- central hydrering af stationsregister, aktiv routing, regler, overrides, retningsreviews og kystdelsaktivering;
- frisk generering af routingauditten i `update-weather.mjs`;
- beskyttet upload med manifest/hash;
- ejerens centrale adminrapport;
- fail-closed central hydrering og releasegates.

## Beregnet effekt

`npm run audit:supabase-pipeline-egress -- <artifactmappe>` serialiserer de relevante payloads kompakt og beregner en nedre pipelinegrænse. På #2757 med 96 kørsler dagligt og 30 dage:

| Måling | Før | Efter 4.0.219 |
|---|---:|---:|
| Estimeret readback pr. kørsel | ca. 1,66 MB | ca. 1,13 MB |
| Nedre 30-dagesestimat | ca. 4,44 GiB | ca. 3,03 GiB |
| Undgået routingaudit-readback | – | ca. 1,42 GiB |

Dette er ikke Supabases faktiske billingmåling. HTTP-overhead, manifestreadback, adminbrug, brugere og anden trafik er ikke medregnet. Dashboardets næste billingperiode er fortsat det autoritative forbrugsbevis.
