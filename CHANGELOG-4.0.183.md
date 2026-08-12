# RavRadar 4.0.183

## Kort og hovedzoner

- Fjerner sorte markeringer ved interne kystdele. Der tegnes nu højst ét sort skel, når to forskellige hovedzoner mødes.
- Gør zoneskellene væsentligt mindre på landsniveau, så Danmarkskortets kyster ikke fremstår sorte.
- “Tilbage til oversigten” zoomer igen ud til hele Danmark.

## Administration

- Tilføjer visuel flytning af præcise kystdele mellem hovedzoner. Administratoren vælger modtagerzonen og klikker på en grå nabostrækning.
- En flytning bevarer kystdelens præcise geometri, landpunkt, vandpunkt, DMI-gridbevis og scoreidentitet. Produktionsbygningen grupperer derefter delen under den nye hovedzone.
- Ukendte eller slettede modtagerzoner afvises. Hver del publiceres kun én gang, så en ejerskabsændring ikke kan skabe et nyt geometri-overlap.
- Eksisterende mulighed for at slette hele zoner bevares. Resterende dele fra en slettet zone fjernes fra offentlig runtime, medmindre de først er flyttet til en aktiv zone.

RavScore-regler og de 643 godkendte fysiske kystdele ændres ikke af releasen.
