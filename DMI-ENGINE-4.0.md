# DMI Engine 4.0 — teknisk beslutning

DMI Forecast Data STAC bruges kun til modelrun, valid time og GRIB-asset URL. STAC-metadata bruges ikke til at gætte parametre.

Parametre identificeres inde i GRIB med collection-specifik kontekst:

- DKSS: vandstand og U/V havstrøm
- HARMONIE: 10 m U/V vind
- WAM: signifikant bølgehøjde, retning og periode

Et forecast step kan levere flere ønskede parametre. Derfor de-duplikeres kun på valid time inden for det seneste modelrun.

Collectionrotation må aldrig være afhængig alene af seneste succes. Hvert forsøg opdaterer `lastAttemptAt`; fejl giver midlertidig pause, hvorefter andre collections kan fortsætte.
