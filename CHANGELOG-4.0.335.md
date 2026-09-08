# Changelog 4.0.335

Status: **lokalt implementeret og måltestet pr. 2026-09-08**. Exact-head GitHub-kildegate, merge, main-oneoff, fulde produktionsgates og offentlig modelcutover er endnu ikke gennemført.

## Ændret

- En ugyldig WAM-række fjernes nu alene som en lokal bølgetuple. Andre bølger, strøm, vind og historik bevares; der findes ikke længere en bred nulstillingsvej for PART-bølgedata.
- Eksakte, validerede WAM-rækker må ved vedligeholdelse komme fra flere modelkørsler og celler. Interpolation er fortsat højst fire timer og må kun ske inden for samme collection, modelkørsel, gitter og fysiske celle.
- Nye bølgetuples valideres komplet med værdier, retning og native provenance, før den gamle tuple erstattes atomisk.
- WAM-checkpoints kan kun genbruges ved samme processing-signatur og modelkørsel, eksakt officielt assetbevis og genvalideret dækning i den faktiske cache.
- Feggesunds tre dele udskydes fra native WAM-gaten til den eksisterende, særskilte direct/proxy-gate. De øvrige 670 dele kræver fortsat native WAM; slutgaten kræver fortsat præcis 354/354 Feggesund-timer.
- Den tidlige WAM-kontrol er en registrerende inspektion. Currentkæden DMI → Copernicus → regional DMI → Open-Meteo må derfor gemme sin progression, før en ufravigelig WAM-slutgate stopper closure, artifact og deploy.
- WAM-assetfejl samles pr. afvisningskode, og cachefejl skelner mellem manglende fil, størrelse, I/O, JSON og schema.

## Lokal evidens og åbent arbejde

- Python-syntaks, 32 validator-tests, 24 producent-/genbrugstests, workflowinventar og den integrerede workflowadapter er grønne.
- Ingen lang lokal sourcegate er gentaget. Projektets politik kræver én fuld `validate:source` på PR'ens eksakte head i GitHub.
- Candidate G/4.0.316 er fortsat senest verificerede offentlige model. Først et komplet main-oneoff og alle efterfølgende gates kan sætte den integrerede model online.
