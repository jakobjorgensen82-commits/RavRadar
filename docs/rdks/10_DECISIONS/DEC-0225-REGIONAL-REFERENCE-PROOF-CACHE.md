# DEC-0225 – regionalt strømbevis valideres én gang pr. live-dokument

**Status:** Aktiv fra 4.0.447  
**Dato:** 2026-09-20  
**Område:** normal vejrkørsel, live-current, integreret RavScore, driftstid

## Beslutning

Den fulde regionale referencekontrol må bygges én gang for det indlæste
`current-pilot-history`-dokument og derefter genbruges af alle kystdele i samme
proces. Cachen bindes til dokumentobjektet, den allerede validerede closure og
den samme reference-array med uændret antal poster.

Når en kontrol udtrykkeligt kræver genvalidering, kontrolleres posternes
identitet og kanoniske SHA-256 igen. Et nyt dokument, en ny closure, en ny
reference-array eller ændret antal poster kan derfor ikke genbruge beviset.

## Live evidens og rodårsag

4.0.446 bestod exact-head og blev merged som `1d9b0946`. Normalrun
`35513058150` gennemførte DMI på cirka 23 minutter, Copernicus på cirka fem,
Open-Meteo på cirka ti, closure på 34 sekunder og historik på 47 sekunder.
Derefter brugte `npm run update:weather` hele sin 25-minutters grænse.

Den sikre inputtrace havde 673/673 direkte scoreklare kystdele. I koden var
closure- og advisorybeviser allerede procescachede, mens
`buildRegionalReferenceDocumentProof` stadig gennemløb den samme fulde
closure for hvert kald fra kystdelssamlingen. Samme uforanderlige
kontrolstruktur blev dermed genopbygget mange gange i én kørsel.

## Driftssynlighed

`update-weather` skriver payloadfri faseposter med deltid og samlet tid efter
input/DMI-samling, offentlig zoneprognose, komponentruntime, kystdelsscore og
artifactskrivning. De indeholder kun stadienavn og aggregerede antal.

## Afgrænsning

Beslutningen ændrer ingen kildeadmission, værdi, scoreformel, fallbackregel,
vandstandsregel, geometri eller privat/offentlig payload. Den fjerner kun
gentagen validering af samme allerede godkendte dokument i samme Node-proces.

Da `live-current-pilot` er en del af den integrerede RavScore-implementerings-
lukning, er den genererede bundle-hash og dens eksisterende release-/Supabase-
bindinger regenereret samtidigt. Det er en integritetsbinding, ikke en ændring
af scoreformel eller modelparametre.

## Kontrol

Den eksisterende `test-current-operational-live-adapter.mjs` kører nu i den
kritiske vejrmatrix og beviser både gyldig regional reference, privat recovery,
in-place genvalidering og afvisning af manipulerede/uindbundne referencer.
