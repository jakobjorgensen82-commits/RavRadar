# RavRadar 3.0.0

## AI Prediction Engine
- Kombinerer RavScore, godkendte modeltilpasninger og lokal feedback til en sandsynlighed for ravfund.
- Viser sikkerhed, datagrundlag og forklaringer direkte i zonepanelet.
- Falder sikkert tilbage til den klassiske RavScore, når feedbackgrundlaget er lille.

## Water Level Engine 2.0 – DMI-fakta
- DMI's modelvandstand forbliver autoritativ og ændres ikke af RavRadar.
- Zoner uden lokal station kan bruge højst de to nærmeste DMI-stationer til observationsinterpolation.
- Forskellen mellem observation og model gemmes kun som diagnostik; den korrigerer ikke DMI-prognosen.

## Administration og historik
- Nyt historisk analysemodul med dato-, zone- og resultatfiltre.
- Sammenholder fund med gemt RavScore, DMI-kilde, vandstand, vind og bølger.
- Dashboardet viser drift, vejr, regler, observationer og modelstatus.

## Machine Learning Studio
- Dataafledte forslag kræver mindst 12 ture og mindst fire fund/ikke-fund.
- Godkend-knappen aktiverer en ny versionsstyret parameterprofil direkte i fremtidige prognoser.
- Afvis-knappen gemmer beslutningen, så samme forslag ikke gentages uden ændret datagrundlag.
- Beslutningshistorik og nulstilling/rollback er indbygget.
- Systemet omskriver aldrig JavaScript-kildekode.

## Performance
- Nye moduler caches af service worker.
- Beregninger er lokale, små og deterministiske.
- Appversion og cacheversion er hævet samlet til 3.0.0.
