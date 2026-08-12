# RavRadar 4.0.186

- Tilføjer trækbare endehåndtag til den præcise kyst i administrationen. En hovedzone kan forlænges til en eksisterende valideret nabokystdel, mens zonens afgrænsning følger automatisk.
- Tilføjer et reversibelt viskelæder, som deaktiverer en hel kystdel sammen med dens land-/vandpunkt- og DMI-kontrakt.
- Central lagring bruger schema 4 og verificerer både delejerskab og deaktiverede dele ved readback.
- Produktionsbyggeren udelader kun en del, når den centrale post er både udtrykkeligt deaktiveret og publiceret.
- Den private fallbackanalyse bevarer Havnø/Mariager Fjord som slettet. Tre zoner løses ved at flytte allerede validerede dele til korrekt ejer; tre kræver 12 nye officielle kandidatdele med 12/12 punktpar. Kandidaten har nul overlap mod andre aktive hovedzoner, men DMI- og ejer-gates mangler fortsat.
- Den nationale private Linux-kørsel bygger nu fallbackkandidaten direkte fra samme hentede officielle GeoDanmark-kyst og validerer de 12 vandpunkter på DMI's native grid. Output forbliver et ikke-aktiverbart QA-artifact.
