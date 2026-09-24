# DEC-0252 – Samme eksakte cachebevis i begge restore-trin

**Dato:** 2026-09-24
**Status:** Lokal 4.0.482, måltestet; exact-head og normalrun afventer

4.0.481 blev merged som `64599ed4` efter grøn exact-head-kildekontrol
`35951509094`. Den første normale kørsel `35952076841` stoppede **før
DMI, Copernicus og Open-Meteo**. Beskyttet restore hentede og verificerede
den aktuelle 4.0.480-private pakke korrekt. Næste lokale bundle-restore
afviste præcis samme pakke med `Private runtime bundle has incompatible
contract hashes`, fordi den brugte den nye kodes brede hash uden den
snævre forgængerafgørelse. Der blev hverken gemt ny cache eller deployet.
Dette er en dobbelt binding i restore-kæden, ikke en leverandørfejl og
ikke bevis for nye eller færre vejrdata.

Begge restore-trin skal bruge samme eksakte afgørelse. Før den anden
restore afstemmes den beskyttede aktuelle kildes beskrivelse med det
allerede byteverificerede bundles manifest: dataset, referencetime,
genereringstid, modelbinding, tre kontrakthashes og bundleindholdets
SHA-256 skal være identiske. Kun hvis den allerede godkendte,
hardkodet eksakte forgængeridentitet også matcher den aktuelle
forventning, bruges dens brede hash i anden restore. Alle target-,
minimumstid-, model-, manifest-, fil- og bytekontroller forbliver
aktive. Ukendt eller modstridende forgænger afvises.

Den fælles afgrænsning håndteres nu af
`scripts/private-runtime-second-restore-expectation.mjs`, der genbruger
de eksisterende tre eksakte forgængerfunktioner fra den beskyttede
restore. Ingen generel cache- eller hashundtagelse indføres. Hvis
beskrivelsen mangler i en anden procesgren, bruges fortsat den
oprindelige strenge forventning.

Næste trin: én exact-head-sourcegate på 4.0.482, merge og én almindelig
ikke-overlappende vejrkørsel. Først denne kørsel kan bevise DMI-rotation,
Copernicus-kvalitet, cachegemning, deploy og vejrrester pr. felt. Ingen
oneoff og ingen cron-genåbning på baggrund af den lokale test alene.
