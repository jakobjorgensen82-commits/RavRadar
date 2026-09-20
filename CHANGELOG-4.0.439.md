# RavRadar 4.0.439

## Rettet overgang fra den gemte private runtime

4.0.438 blev merged via PR #383 som `2fbfe3b2`. Exact-head-sourcekontrollen
`35471789111` og backendkørslen `35472148224` var grønne. Den efterfølgende
almindelige vejrkørsel `35472299635` nåede DMI, Copernicus, Open-Meteo og
aktuel samling med 673 af 673 scoreklare kystdele.

Kørslen stoppede derefter, fordi den eksakte bounded-conditions-forgænger kun
blev genkendt og gendannet. Den blev ikke ført gennem den allerede eksisterende
kontrollerede rebind, før den aktuelle læser overtog den. De 673 gyldige
fortsættelser beholdt derfor forgængerens modelbundlehash `8f0ef780…`, mens
4.0.438 krævede `0e1c6625…`.

4.0.439 indsætter den hærdede private-runtime-migrering mellem restore og
installation, men kun når den forseglede overgang entydigt er klassificeret
som `bounded-conditions-writer`. Migreringen validerer den gamle source med
dens egen læser, source- og targetbindinger, kontrakter, inventar og 210/673.
Den ændrer kun det kendte modelbundlemærke i de validerede integrerede
fortsættelser. Målinger, vejrdata og Candidate G-state forbliver byte-logisk
uændret. Ukendte filer, bindinger, kontrakter eller datatab stopper fortsat.

Den separate historiske bølgeklassifikation køres kun, når overgangstypen
faktisk er `historical-wave-input`. Det fjerner den misvisende N/A-sidevej
fra bounded-overgangen.

RavScore-formlen, DMI-first, Copernicus/Open-Meteo som huludfyldning,
DMI-only-vandstand og geometri er uændret. Produktionsbeviset er én almindelig
continuation, som skal nå scorebygning, privat save, artifact, Pages og den
aktuelle offentlige time. Der startes ingen blind oneoff.
