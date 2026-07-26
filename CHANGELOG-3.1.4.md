# RavRadar 3.1.4

- DMI oceanObs hentes nu med pagination, så hele stations- og observationssættet kommer med.
- Stationer deduplikeres pr. fysisk målested.
- En DMI-station inde i zonen bruges direkte og alene.
- Interpolation anvendes kun, når zonen ikke har egen station.
- Interpolation kræver én unik station på hver side langs samme kystkorridor; ellers bruges model-fallback.
- Samme station kan ikke længere tælle to gange.
- Weather Engine diagnostic version 2.8.2.
