# DEC-0239 – bevar målt scorehistorik og kontrollér faktisk strømvisning

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.468; livebevis afventer

Normalrun `35823773587` på 4.0.467 gennemførte DMI, Copernicus,
Open-Meteo, central cache, Pages og offentlig kontrol. Den offentlige
prognose `rr-20260923063008-210` viser 207/210 zoner med aktuel score;
de tre utilgængelige ligger ved Nibe/Aalborg. Ved T0 har 639/673
kystdele en verificeret strømvektor og otte en eksplicit, højst tre timer
gammel regional tilstandsfastholdelse. Ved T+117 kommer 616 verificerede
strømvektorer fra reserven. Det beviser, at den supplerende strøm nu faktisk
når offentlig prognose, ikke at alle vejrdata er komplette.

Den fulde produktionskontrol rapporterede én fejl trods vellykket deploy:
otte Limfjord-dele med gyldig fastholdt score blev afvist af den rumlige
efterkontrol. Den integrerede model gemmer overgangstypen i
`ravScoreModel.publicContext.currentTransition`, men kontrollen læste
fortsat et topniveaufelt. Dens egen test flyttede feltet kunstigt og skjulte
fejlen. 4.0.468 læser det faktiske felt; testen bruger nu producentens
uforandrede output og afviser modstridende gammel topniveaumetadata. Kilde,
tid, maksimalt tre timer, hukommelsestilstand og privat regionalt bevis
kontrolleres fortsat.

Samme run måtte genopbygge scoretilstanden koldt for 673/673 kystdele:
4.0.466's private runtime blev afvist som model-/kontraktinkompatibel,
og der fandtes intet særskilt beskyttet fortsættelsescheckpoint. Den
offentlige historik faldt dermed tilbage til ufuldstændig; 0/420 aktuelle
zone-/mode-visninger havde fuld historik. Koden og Supabase-kontrakten
understøtter allerede et privat, målt checkpoint med 673 tilstande uden
at gøre gammel rollback klar. 4.0.468 lader både normal weather og
kode-only gemme og publicere det ved `BUILDING_MEASURED_ONLY`, med
`MEASURED_WARMUP_PUBLISHED` og samme strenge hash-, kilde- og
slutkontroller. Gammel model aktiveres ikke. Første live kode-only-/normalrun
skal bevise, at checkpointet faktisk kan bygges og genbruges.

Den automatiske normale weather-workflow er midlertidigt deaktiveret,
efter at et ekstra planlagt run blev annulleret før jobstart. Den må først
genaktiveres efter målrettet rettelse, exact-head-gate og en kontrolleret
fortsættelse med bevis for cache- og checkpointgenbrug. En ny lille
lograpport skal vise før-/efterdækning for vind, bølger, vandstand og
vandtemperatur uden private steder eller måleværdier.

Åbent og **ikke** løst her: offentlig T+12 mangler lokal vind for 289/673
kystdele, T+117 for 313/673; de fleste ligger i B07–B12. Den aktuelle
havstrøm-closure har 5.201 uafklarede kystdel×time-par i 57 dele. Kilden
til de to restgrupper skal undersøges hver for sig. At DMI har vind på
mindst én time for 669 dele beviser ikke vind ved T+117. Den normale
rotation og dens gemte markør skal måles ved næste kørsel, ikke antages.

**Efterfølgende 4.0.469-korrektion:** 4.0.468 blev merged, men det første
providerfri kode-only-run `35835042039` nåede ikke deploy. Checkpointets
replay af en gyldig regional fastholdelse under ufuldstændig historik
afveg fra modellens egen regel. DEC-0240 beskriver den målrettede rettelse;
checkpointpubliceringen er fortsat ikke livebevist.
