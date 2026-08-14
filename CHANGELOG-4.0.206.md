# RavRadar 4.0.206

## Rettet

- Den private fallbackbygger opretter nu selv alle outputmapper. En ren GitHub-runner er derfor ikke afhængig af lokale, ikke-sporede reviewmapper.
- Fallbackbyggeren er idempotent efter en tidligere godkendt aktivering: allerede aktive nabo-rester genbruges med samme ID, geometri og centralt gemte land-/vandpunkt i stedet for at kræve de slettede oprindelige del-ID'er.
- Den fælles punktbygger medtager eksisterende validerede punktpar i den samlede punktbestand og afviser et eksisterende punktpar, hvis den tilhørende pålandsretning mangler.
- Det kandidatbundne 10-meterbevis er genkørt mod den aktuelle 17-delsbestand. Resultatet er uændret: 11 verificerede, fire sikkert vendte og to blokerede dele. Det nye fingeraftryk afspejler alene den aktuelt serialiserede, centralt hydrerede kandidat.

## Verifikation

- Privat #31822748625 bestod hele den nationale kilde-, geometri-, navn-, land-/vand-, DMI-, vejr-, state-, vind-, shadow-, review- og centrale admin-roundtrip/rollbackkæde. Den afslørede derefter den manglende outputmappe i fallbackbyggeren.
- En ren lokal fallbackkæde bygger 17 dele og består evidensbinding, fire rettelser, to fail-closed dele, 2/2 ejerskabsflytninger, 9/9 erstatninger samt nul overlap internt og mod øvrige aktive zoner.
- ESA WorldCover 10 m blev genkørt på den aktuelle kandidat og gav præcis samme fire rettelser og samme to tvivlstilfælde som det tidligere bevis.

## Ikke ændret

- Offentlig geometri, RavScore og centrale ejerdata ændres ikke af rettelsen. En ny fuld privat national kørsel skal stadig bevise fallback-DMI og artifacts samlet, før kandidaten kan forelægges til særskilt ejerafgørelse.
