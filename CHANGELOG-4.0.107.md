# RavRadar 4.0.107

## Tilstandsmodel i skyggetilstand
- Den rullende 24-timers historik pr. zone indeholder nu vindretning, strømstyrke, strømretning, faktisk alignment mod zonens verificerede land-/havretning, vandstand og vandstandsændring.
- Pipelinen beregner kompakte, afledte tilstandsfelter: varighed og momentum for indadgående strøm, varighed og tryk for udadgående strøm, varighed og alder for stærke energihændelser, retningsstabilitet, mobiliseringspotentiale, nærkystpotentiale og procesfase.
- Modellen kører som `shadow-v1`: felterne kan ses i scoreforklaring/debug, men påvirker ikke RavScore, rangliste eller femdøgnsprognosens numeriske score i denne version.
- Der anvendes ingen generelle strømbånd og ingen strømbåndsfallback. Tilstanden beregnes kun fra de faktiske marine strømdata og zonens aktuelle, administratorredigerbare retningsankre/onshoreDirectionDeg.
- Rå historik sendes ikke til den offentlige browser. Kun få kompakte tilstandsfelter føjes til public runtime, så opstartshastigheden bevares.

## Morfologi
- Eksisterende dokumenterede zonefelter som rev, ålegræs og lavt vand bevares og fortsætter uændret i den eksisterende scoremotor.
- Manglende morfologidata giver ikke straf, og versionen indfører intet krav om ny manuel landsdækkende kortlægning.

## Vandstandsstationer
- 4.0.106-rettelsen er nu produktionsbekræftet af ejer: røde administratorprikker, aktivering af override og Fjern fungerer igen.
- QuotaExceededError-forløbet, oprydning af store localStorage-cacher og kravet om ikke-blokerende lokal cache er fastholdt i RDKS, håndbog og regressionstest.

## Regression og sikkerhed
- Ny test beviser, at skyggetilstandsfelterne ikke ændrer RavScore eller delscorer.
- Testen kontrollerer den kompakte public projection og forbyder generelle strømbånd i historikpipelinen.
