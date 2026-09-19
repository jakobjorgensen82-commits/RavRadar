# DEC-0215 – Stor privat conditions skrives løbende og atomisk

**Status:** Writeren er leveret i 4.0.436; overgangens versions-/tidskant er
erstattet af DEC-0216 og 4.0.437; samlet produktionsbevis åbent
**Dato:** 2026-09-19

## Observeret problem

Normalrun `35457642258` gennemførte DMI, Copernicus, Open-Meteo, DMI-first-
samling, historik og integreret scorebygning. Den afgrænsede scoretrace viste
gyldigt vindpar og beregnelig score på alle 673 kystdele. Først da hele den
private `conditions.json` skulle gemmes, forsøgte producenten at danne én
indrykket JSON-streng. De nye 673 × 118 timevise kystdelsresultater gjorde
strengen større end V8 kunne oprette, og runnet stoppede med
`RangeError: Invalid string length`.

Det var derfor forkert at tolke stoppet som manglende lokal vind eller som en
fejl i scoreformlen. Det var samtidig utilstrækkeligt blot at hæve en vilkårlig
grænse: alle senere private læsere skal fortsat kunne parse dokumentet.

## Beslutning

1. Den komplette private conditions-kontrakt bevares. Ingen kystdel, time,
   score, state eller provenance fjernes for at omgå fejlen.
2. JSON serialiseres kompakt og løbende i afgrænsede blokke; der oprettes
   aldrig én samlet outputstreng.
3. Der skrives kun til en ny tilfældig fil. Efter fuld skrivning og `sync`
   omdøbes den atomisk. Ved enhver fejl bevares den gamle gyldige destination.
4. Writeren afviser output over en konservativ UTF-8-bytegrænse under V8's
   `MAX_STRING_LENGTH`. Det binder producer og alle senere `JSON.parse`-læsere
   til samme reelle kapacitet.
5. Samlet størrelse og de største topfelters byteantal logges uden indhold.
6. Writeren indgår i private runtimes fulde implementeringshash, så gammel
   kode ikke kan behandles som samme produktionskontrakt.
7. Den krypterede fremgang fra det fejlede run er bundet til bundle
   `ad2337ab…`, som blev publiceret fra `d4e8844e`. Den aktuelle exact-release
   må derfor én gang
   gendanne netop denne baseline med netop dens gamle reader, før fremgangen
   åbnes. Releaseversion, source head, bundlehash, modelbinding, zone-/delantal
   og alle tre gamle kontrakthashes skal matche eksakt. Alle andre
   forgængere afvises. Når en ny runtime er publiceret, matcher
   engangsovergangen ikke længere og kan ikke genbruges.

**Tillæg:** 4.0.436 blev merged, men første almindelige run stoppede før
providers på forskellen mellem de ækvivalente UTC-former `...:00Z` og
`...:00.000Z`. DEC-0216 flytter derfor den uændrede eksakte overgang til
4.0.437 og normaliserer de to tilladte heltimeformer.

## Konsekvens

Rettelsen gør den allerede beregnede 673-delsruntime skrivbar uden at skjule
huller eller ændre modelresultater. Hvis data senere vokser ud over den
parsebare grænse, stopper runnet før udgivelse med en præcis størrelsesfejl og
bevarer den seneste gyldige fil. Den krypterede fremgang fra `35457642258`
skal genbruges; leverandørarbejdet må ikke blindt startes forfra.
