# RavRadar 4.0.186

## Privat seks-zonevalidering

- Tilføjet en separat, ikke-deployende CI-kontrol for præcis de seks aftalte recoveryzoner.
- Indchecket en afgrænset privat kandidat; efter nabobeskyttelsen består den af 22 mål- og naborester med 22 punktpar, så DMI-gridkontrollen ikke kræver en national kystopbygning.
- Tilføjet regression, der afviser andre zoner, national pipeline og deploy fra denne arbejdsgang.
- Seks-zoneworkflowet installerer eksplicit de geometri-biblioteker, som den fail-closed overlapkontrol kræver på Linux.

- Arbejdsomfanget er bindende låst til de seks fallbackzoner og det aftalte adminværktøj. Den øvrige produktionsverificerede kyst må ikke genopbygges eller ændres uden en ny, udtrykkelig ejerbeslutning; Havnø og Mariager Fjord øst forbliver slettet.

- Tilføjer trækbare endehåndtag til den præcise kyst i administrationen. En hovedzone kan forlænges til en eksisterende valideret nabokystdel, mens zonens afgrænsning følger automatisk.
- Tilføjer et reversibelt viskelæder, som deaktiverer en hel kystdel sammen med dens land-/vandpunkt- og DMI-kontrakt.
- Central lagring bruger schema 4 og verificerer både delejerskab og deaktiverede dele ved readback.
- Produktionsbyggeren udelader kun en del, når den centrale post er både udtrykkeligt deaktiveret og publiceret.
- Den private fallbackanalyse bevarer Havnø/Mariager Fjord som slettet. Første forslag om hele del-flytninger blev forkastet, fordi to nabozoner ville miste al præcis kyst. Den korrigerede kandidat opdeler ved de faktiske grænser, har 22/22 punktpar og nul overlap; ny DMI-kontrol af denne bestand mangler.
- Admin afviser nu en trukket del med en synlig årsag, hvis geometri, land-/vandpunkt, retning eller DMI-gridbevis mangler.
- Privat #31609637964 bestod alle 22 native DMI-gridvalg samt den deaktiverede 656-dels/211-zoners runtime og rollback-isolation. Offentlig aktivering afventer visuelt ejerreview.
- Den nationale private Linux-kørsel bygger nu fallbackkandidaten direkte fra samme hentede officielle GeoDanmark-kyst og validerer de 12 vandpunkter på DMI's native grid. Output forbliver et ikke-aktiverbart QA-artifact.
- Den nationale kildekædes gamle 208-zonekonstant er løftet til den eksplicitte aktuelle politik på 211 efter de tre Vadehavszoner. Efter planporten kræver validatorerne fortsat identisk, ikke-tom zonebestand i plan, fliser, manifest, hydreret register og analyse.
- Privat #31589831140 kom forbi plan, officiel kildehentning, kilde-QA og fjord-/normasker, men fandt endnu to forældede 208-gates i topologiaudit og delgenerator. Begge analysetrin, validatorer, self-tests og kontrakttests følger nu den samme eksplicitte 211-zonepolitik. Offentlig geometri er uændret.
- Privat #31590992368 bestod derefter 211-zoneplan, 131 officielle kildefliser, topologi, dækningsaudit og delgenerator. Stednavnetrinnets gamle krav om præcis 100 fliser er erstattet af streng lighed med den aktuelle ikke-tomme plan og mindst én forespørgsel pr. stedtype pr. flise. Offentlig geometri er fortsat uændret.
