# RavRadar 4.0.88

## Kortrettelser
- Rettet den historiske pilefejl fra 4.0.76, hvor fallback blandede koordinat-arrays og Leaflet `L.LatLng`. En zone uden særskilt flowpunkt kan ikke længere stoppe hele pilelaget.
- Vind- og strømpunkter normaliseres nu til én `L.LatLng`-type, og fejl isoleres pr. zone.
- Zonestreger, hvid kant, klikflade og grænsetikker opdateres automatisk efter zoom. Et efterfølgende `requestAnimationFrame`-redraw beskytter mod Leaflets afsluttende zoomtransform, så brugeren ikke længere skal panorere kortet.
- Nye regressionstests beskytter både koordinatfallbacken og zoom-redraw.
