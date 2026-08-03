# RavRadar 4.0.89

## Adminzoner og reviewoprydning

- Retning hav-land har nu to adskilte, bekræftede handlinger: slet valgt kystdel og slet hele zonen.
- Destruktive ændringer gemmes centralt med readback før brugerens kvittering.
- Godkendte retninger, kystdele og zonesletninger anvendes automatisk på `data/zones.geojson` i GitHub-workflowet før vejrhyrering og offentlig runtime bygges.
- En slettet zone fjernes derfor fra kort, score, rangliste, prognose, debug og routing ved næste deployment.
- Zoneantal i tests følger nu det autoritative aktive zoneregister i stedet for et hårdkodet tal.
- Reviewkøen kan soft-slette enkelte poster og masse-rydde automatiske systemtestposter, mens auditsporet bevares.
- Automatiske testposter soft-slettes fremover direkte, hvis Supabase ikke tillader fysisk DELETE.
