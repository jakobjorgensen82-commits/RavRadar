# RavRadar 4.0.109

## Rettelse af workflow-validering

- Rettet en forældet regressionstest, som stadig krævede to genopbygninger af `public-conditions.json`.
- Efter 4.0.108's korrekte workflow-omlægning skal public runtime bygges præcis én gang: efter frisk vejr og strømproveniens, men før fuld validering og deploy.
- Testen kontrollerer nu den faktiske sikre rækkefølge i stedet for et gammelt antal forekomster.
- Ingen ændring af RavScore, skyggetilstandsmodel, DMI-hentning, vandstandsrouting eller offentlig UI.

## Baggrund

4.0.108 flyttede valideringen til efter DMI-opdatering og u/v-proveniens. Den gamle test `test-public-runtime-pipeline-4.0.75.mjs` forventede stadig både en genopbygning efter hydrering og en før deploy. Det krav var nu direkte i konflikt med den nye, korrekte rækkefølge og stoppede workflowet, selv om DMI-opdateringen og den friske runtime var gennemført korrekt.
