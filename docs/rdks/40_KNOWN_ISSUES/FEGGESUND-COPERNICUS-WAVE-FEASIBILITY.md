# Feggesund: privat Copernicus-bølgefeasibility

**Status:** Afgrænset, manuel feasibility. Ikke produktionskilde, ikke modelændring og ikke cutover-godkendelse.

## Hvorfor piloten findes

`DK-B05-11` er fortsat det ene reelle bølgegab i den aktive DMI-kæde. DMI `wam_dw` har ikke et accepteret vådt punkt inden for den gældende afstand, og den eksisterende fallback lukker heller ikke gabet. Den korrekte offentlige adfærd er derfor fortsat `missing`, indtil en komplet kildekontrakt er bevist og særskilt besluttet.

Piloten undersøger, om en af to officielle Copernicus Marine-produkter alene kan dække alle de aktuelt centralt hydrerede kystdele under `DK-B05-11`. Den må ikke kombinere de to produkter for at skjule et hul, søge videre efter en fjernere våd celle eller aktivere en kilde automatisk.

## Officielle kandidater og semantik

Piloten låser følgende offentlige produktkontrakter:

- [NWSHELF_ANALYSISFORECAST_WAV_004_014](https://data.marine.copernicus.eu/product/NWSHELF_ANALYSISFORECAST_WAV_004_014/services): `cmems_mod_nws_wav_anfc_1.5km_PT1H-i` og statisk `cmems_mod_nws_wav_anfc_1.5km_static`/`bathy`, katalogversion `202511`. Produktmanualen beskriver timesopløst `VHM0`, `VTPK` og `VMDR`, hvor `VMDR` er bølgeretning **fra** sand nord, samt én 00Z-kørsel med −48 timers analyse og +168 timers forecast. Manualen oplyser også, at Kattegat/Baltikum syd for 57,25° er maskeret, og at modeldybder under 10 meter hæves til 10 meter. Se [Copernicus PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-014.pdf).
- [BALTICSEA_ANALYSISFORECAST_WAV_003_010](https://data.marine.copernicus.eu/product/BALTICSEA_ANALYSISFORECAST_WAV_003_010/services): `cmems_mod_bal_wav_anfc_PT1H-i` og statisk `cmems_mod_bal_wav_anfc_static`/`bathy`, katalogversion `202311`. Produktmanualen beskriver cirka 1 sømils grid, timesopløst `VHM0`, `VTPK` og `VMDR`, hvor `VMDR` er bølgeretning **fra**, og 00Z/12Z-produktion med op til +216 timer. Den viste native filkontrakt har ikke i sig selv en tilstrækkelig bulletinbinding; derfor accepterer piloten kun kandidaten, hvis det faktisk hentede subset indeholder entydig `forecast_reference_time` og konsistent `forecast_period` for hele vinduet. Se [Copernicus PUM](https://documentation.marine.copernicus.eu/PUM/CMEMS-BAL-PUM-003-010.pdf).

Højde, peakperiode og FROM-retning er fysisk kompatible med den integrerede models eksisterende bølgeinput. Piloten roterer ikke retningen, beregner ingen RavScore og skriver ingen vejrserier. En eventuel senere adapter må fortsat sikre, at FROM→bevægelsesretning kun konverteres én gang.

## Hård acceptkontrakt

For hvert produkt testes alle eksisterende dele under parent `DK-B05-11` separat ved deres uændrede, centralt hydrerede vandpunkter. Punkter, geometri og kystnormaler flyttes eller overskrives ikke.

Et produkt kan kun blive markeret som en feasibility-kandidat, når produktet **alene** opfylder alt dette:

1. Det eksakte nærmeste gridpunkt ved hver del er vådt. Piloten må aldrig springe en maskeret nærmeste celle over og vælge en fjernere våd celle.
2. Afstanden til både den statiske og dynamiske celle er højst 2,0 km, og de to subsettyper binder til samme celle for den enkelte del.
3. NWS-cellen opfylder den dokumenterede 10-meters modeldybdegrænse; Baltic-cellen har positiv, endelig modeldybde.
4. Hver del har præcis 158 sammenhængende UTC-timer fra `target−40` til og med `target+117`, uden manglende, dobbelte eller ekstra timer.
5. Alle timer har endelig, ikke-negativ bølgehøjde, positiv peakperiode og gyldig FROM-retning ved aktiv sø. Eksakt ro (`Hs=0`) må være retningsløs, men skal fortsat have endelig positiv periode.
6. Alle dele kommer fra samme entydige bulletin for det pågældende produkt. `forecast_period` skal svare til `valid time − forecast reference time`, og hele vinduet skal ligge inden for produktets dokumenterede lead-horisont.
7. Alle dele er komplette i samme produkt. NWS og Baltic må aldrig sammenflettes til en kunstig komplet kandidat.

En maskeret, for fjern, for lav, inkonsistent, flerkørsels- eller ufuldstændig kandidat afvises. Et negativt feasibility-resultat er ikke en pipelinefejl; det viser, at produktet ikke kan lukke kontrakten som krævet.

## Privacy, kapacitet og drift

Piloten er en isoleret mode i det allerede registrerede, manuelt startede workflow `build-ravscore-historical-wave-pilot.yml`. Dermed kan den køres mod en specifik branch/ref, før modelarbejdet merges. Den har kun `contents: read`, har ingen schedule, deploy, cache-save eller produktionsskrivning og genbruger de eksisterende Copernicus- og Supabase-secrets uden at gemme dem.

Hver af de berørte dele bruger et exact-point dry-run og et exact-point subset for både statisk og dynamisk data i hvert produkt. Dry-run-estimatet må højst være 8 MiB pr. produkt, og de faktiske midlertidige filer højst 16 MiB pr. produkt. Filerne slettes før artifactet skrives.

Artifactet må kun indeholde:

- forventet, testet, vådt og komplet delantal pr. produkt,
- kontrakt- og evidenshashes,
- booleans for de lukkede gates,
- og en grov størrelsesbucket.

Det må ikke indeholde del-id'er, navne, koordinater, gridceller, targettid, bulletintid, rå højder, perioder, retninger, NetCDF-filer, credentials eller private payloads.

## Beslutning efter pilot

Et grønt workflow betyder kun, at forespørgslerne blev udført og det datasikre artifact blev valideret. `candidateAccepted=true` for et produkt er nødvendig, men ikke tilstrækkelig, for en ny produktionskilde.

En senere kildeaktivering kræver fortsat en særskilt RDKS-beslutning, en komplet producent-/forbrugerkæde, cache/recovery/proveniens, kapacitetsvurdering, rollback, exact-head CI og frisk produktionsverifikation. Indtil da forbliver DMI-first-adfærden og Feggesund `missing` uændret. Ingen ny ekstern datahentning er en releasegate for den integrerede model i denne feasibility-leverance.
