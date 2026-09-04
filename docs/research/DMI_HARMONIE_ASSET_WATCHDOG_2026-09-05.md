# DMI HARMONIE-assetwatchdog, 2026-09-05

## Konklusion

Engangsrun `33918250039` på main `ce93cebc5371e16dc7b1e2248e81a20460cfe567` blev ikke langsomt færdigt. DMI-trinnet blev dræbt af GitHubs 55-minuttersgrænse, mens ét downloadet `harmonie_dini_sf`-forecasttrin havde været inde i ecCodes-behandling i mere end 52 minutter. Tidligere HARMONIE-trin i run `33907599084` tog cirka 5,8–7,7 sekunder. Fejlklassen er derfor et fastlåst enkeltasset, ikke normal DMI-gennemløbstid.

De tre efterfølgende cache-save-trin bestod. Allerede atomisk committede DMI-assets blev derfor bevaret, men Copernicus og resten af opfyldningskæden blev ikke nået. Ingen private payloads, koordinater eller rå U/V er læst eller gengivet i denne analyse.

## Afgrænset rettelse

`run-dmi-bulk-supervised.py` er nu fælles indgang for både normal vejrproduktion og den store engangsopfyldning. Watchdoggen starter kun mellem producentens eksisterende start- og slutmarkør for et HARMONIE-forecasttrin. Hvis samme trin ikke afsluttes inden 180 sekunder, stoppes producentprocessen. Det er ikke en generel treminuttersgrænse for downloads, andre DMI-samlinger eller hele jobbet.

Efter et watchdogstop genstartes den eksisterende producent i en fail-closed `FINALIZE_ONLY`-tilstand. Den må ikke hente eller behandle nye assets, men den genindlæser og validerer den senest atomisk gemte cache, rydder/finaliserer og genbygger den strenge current-ledger. Finaliseringen har selv et loft på 420 sekunder. Kun en faktisk grøn DMI-terminalkontrakt giver downstream adgang; ellers skrives en kort, ikke-tom fejlkode og workflowet stopper. Hverken READY, manglende værdier eller historik opfindes.

Rettelsen ændrer ikke DMI-first, Copernicus exact-gap, regionalpolitik, 673 × 118-slutgaten, historikkrav, scoreformel, model-id/state, geometri eller land-/vandpunkter. En ny main-kørsel er nødvendig som runtimebevis.

## Kontrol

- Fem syntetiske supervisorcases dækker normal afslutning, fastlåst asset, begrænset finalisering, ikke-tomme failure-outputs og fravær af miljøhemmeligheder i loggen.
- Eksisterende oneoff-, DMI-workflow-, valideringsrækkefølge- og private-runtimekontrakter er måltestet grønne.
- Supervisorfilen indgår i den private produktionsruntimes kryptografiske kontrakt.
- Exact-head-kildegate, merge og ny samlet vejrkørsel er fortsat åbne ved dette lokale checkpoint.
