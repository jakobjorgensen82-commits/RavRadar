# RavRadar 4.0.83

## Kritisk rettelse af permanent "Indlæser" på offentlig side
- Dagens rangliste males nu i browseren, før 5-dages beregningen starter.
- 5-dages landsprognosen er ændret fra én lang synkron blok til en afbrydelig, asynkron beregning i små bidder.
- Prognosen viser løbende procentfremdrift og giver browserens hovedtråd tilbage efter hver anden zone.
- Skift af jagtform annullerer en gammel igangværende prognoseberegning, så to beregninger ikke konkurrerer.
- Vind- og strømpile installeres fortsat først efter den centrale prognosevisning.
- Ny regressionstest sikrer, at dagens rangliste kan tegnes før 5-dages beregningen.

## Rodårsag
4.0.79 optimerede enkelte beregninger, og 4.0.80 flyttede pilene, men 5-dages landsberegningen var stadig synkron. DOM'en blev opdateret med ranglisten, men browseren kunne ikke male ændringen, før omtrent 25.000 scoreberegninger var afsluttet. På langsomme enheder kunne fanen derfor fremstå permanent fastlåst eller blive afbrudt af browseren.
