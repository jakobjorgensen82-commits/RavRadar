# RavRadar 4.0.186

- Arbejdsomfanget er bindende låst til de seks fallbackzoner og det aftalte adminværktøj. Den øvrige produktionsverificerede kyst må ikke genopbygges eller ændres uden en ny, udtrykkelig ejerbeslutning; Havnø og Mariager Fjord øst forbliver slettet.

- Tilføjer trækbare endehåndtag til den præcise kyst i administrationen. En hovedzone kan forlænges til en eksisterende valideret nabokystdel, mens zonens afgrænsning følger automatisk.
- Tilføjer et reversibelt viskelæder, som deaktiverer en hel kystdel sammen med dens land-/vandpunkt- og DMI-kontrakt.
- Central lagring bruger schema 4 og verificerer både delejerskab og deaktiverede dele ved readback.
- Produktionsbyggeren udelader kun en del, når den centrale post er både udtrykkeligt deaktiveret og publiceret.
- Den private fallbackanalyse bevarer Havnø/Mariager Fjord som slettet. Tre zoner løses ved at flytte allerede validerede dele til korrekt ejer; tre kræver 12 nye officielle kandidatdele med 12/12 punktpar. Kandidaten har nul overlap mod andre aktive hovedzoner, men DMI- og ejer-gates mangler fortsat.
- Den nationale private Linux-kørsel bygger nu fallbackkandidaten direkte fra samme hentede officielle GeoDanmark-kyst og validerer de 12 vandpunkter på DMI's native grid. Output forbliver et ikke-aktiverbart QA-artifact.
- Den nationale kildekædes gamle 208-zonekonstant er løftet til den eksplicitte aktuelle politik på 211 efter de tre Vadehavszoner. Efter planporten kræver validatorerne fortsat identisk, ikke-tom zonebestand i plan, fliser, manifest, hydreret register og analyse.
- Privat #31589831140 kom forbi plan, officiel kildehentning, kilde-QA og fjord-/normasker, men fandt endnu to forældede 208-gates i topologiaudit og delgenerator. Begge analysetrin, validatorer, self-tests og kontrakttests følger nu den samme eksplicitte 211-zonepolitik. Offentlig geometri er uændret.
- Privat #31590992368 bestod derefter 211-zoneplan, 131 officielle kildefliser, topologi, dækningsaudit og delgenerator. Stednavnetrinnets gamle krav om præcis 100 fliser er erstattet af streng lighed med den aktuelle ikke-tomme plan og mindst én forespørgsel pr. stedtype pr. flise. Offentlig geometri er fortsat uændret.
