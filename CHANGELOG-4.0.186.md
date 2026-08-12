# RavRadar 4.0.186

- Tilføjer trækbare endehåndtag til den præcise kyst i administrationen. En hovedzone kan forlænges til en eksisterende valideret nabokystdel, mens zonens afgrænsning følger automatisk.
- Tilføjer et reversibelt viskelæder, som deaktiverer en hel kystdel sammen med dens land-/vandpunkt- og DMI-kontrakt.
- Central lagring bruger schema 4 og verificerer både delejerskab og deaktiverede dele ved readback.
- Produktionsbyggeren udelader kun en del, når den centrale post er både udtrykkeligt deaktiveret og publiceret.
- Den private fallbackanalyse bevarer Havnø/Mariager Fjord som slettet og danner en ikke-aktiverbar officiel-kystkandidat for de fem resterende fallbackzoner samt den fejlplacerede Lolland vest/Albuen. Kandidaten har 21 sammenhængende dele og 21/21 foreslåede land-/vandpunktpar; DMI- og ejer-gates mangler fortsat.
