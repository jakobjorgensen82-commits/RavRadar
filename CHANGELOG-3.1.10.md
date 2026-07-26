# RavRadar 3.1.10

- Tværkontrol af alle 210 aktive kystzoners pålandsretning mod nærmeste lagrede kystlinje.
- Retninger ændres ikke automatisk, når geometri-signaler er uenige; zonen markeres i stedet til review.
- Transportscore begrænses til 60, hvis en høj indtransportscore bygger på en retning markeret `review`.
- Debug viser retningssikkerhed, uafhængig kystretning og geometriforskel.
- Regressionstest sikrer, at Øster Hurup-scenariet med strøm 135° mod og landretning 268° klassificeres som udgående.
- GitHub Actions-workflowet er gendannet, så DMI-cache og deployment fortsat virker.
