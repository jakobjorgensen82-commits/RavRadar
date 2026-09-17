# DEC-0186 – Produktionstimen normaliseres ved grænsen

**Status:** Aktiv og bindende; implementeret og måltestet lokalt i 4.0.404,
exact-head og livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.403 bestod exact-head 35214029193 og blev merged gennem PR #347 som
main c685c83d10583b038329d2c13a7e790855433e71. Den providerfrie fortsættelse
35214668708 stoppede efter 31 sekunder, før private writes og Pages.

Den centralt gemte runtime angav den gyldige hele UTC-time som
2026-09-17T09:00:00.000Z. Freshness-kontrollen bruger den kanoniske,
ækvivalente skrivemåde 2026-09-17T09:00:00Z og afviste derfor inputtet som
PRODUCTION_TARGET_TIME_INVALID. Model, kilde, offentlig repair-tilstand og
source ancestry var allerede godkendt.

## Beslutning

1. Den beskyttede descriptors tilladte hele UTC-time læses fortsat som enten
   HH:00:00Z eller HH:00:00.000Z.
2. Kun den valgfrie .000-del fjernes ved workflowgrænsen, før den eksisterende
   kanoniske freshness- og private-runtime-kontrakt kaldes.
3. Normaliseringen må ikke flytte tidspunktet, vælge en anden generation eller
   ændre datasetidentiteten.
4. Freshness-resultatet skal eksplicit være FRESH. En runtime over 240 minutter
   må ikke fortsætte ad denne reparationsrute.
5. Alle øvrige krav fra DEC-0185 består. Ingen provider må kaldes, og ingen
   write eller Pages må ske efter en bindingsfejl.

## Risiko og afgrænsning

Ændringen accepterer ikke en ny tidsform; begge tekster er allerede tilladt
af den beskyttede descriptor og repræsenterer præcis samme instant. Den gør
kun wire-formatet kanonisk før den eksisterende strenge kontrol.

