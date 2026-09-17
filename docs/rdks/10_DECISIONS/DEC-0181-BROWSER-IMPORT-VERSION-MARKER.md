# DEC-0181 – Versionsløft skal bevare browserens importsti

**Status:** Aktiv og bindende; implementeret og måltestet lokalt i 4.0.399,
livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.398 bestod sourcegate `35174942101` og blev merged som main
`d7420ade95990b97e6d3c65bcabe2a9f7c88dec1`. Code-only-run `35175276505`
stoppede efter 19 sekunder i lukningen af den offentlige browserkode.

Et manuelt mekanisk versionsløft havde skrevet `$14.0.398` i stedet for
`?v=4.0.398` i 21 imports i `app.js` og `bootstrap.js`. Den eksisterende
versionskontrol fandt versionsnummeret, men kontrollerede ikke den ugyldige
dollarmarkør. Ingen data, centrale writes, runtime eller deploy blev nået.

## Beslutning

Alle 21 imports gendannes som `?v=4.0.399`. Den generelle
releaseversionskontrol og modullukningskontrollen skal begge afvise enhver
browserkilde med en markør på formen `$<tal>.<tal>.<tal>`.

Den egentlige offentlige browserlukning køres målrettet før levering og skal
kunne opløse hele den integrerede importgraf.

Den lokale lukning har opløst 79 filer og forseglet closure
`2aca85e7ddd9702cc43fec06f62609a5c5f105107bee856caedb534d01450224`.

## Afgrænsning

Beslutningen ændrer ikke RavScore, vejrdata, cache, providerprioritet,
geometri, modelbinding eller offentlig score. Den retter kun importstier og
kontrol af deres syntaks.
