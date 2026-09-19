# RavRadar 4.0.436

## Resultat

4.0.436 retter den sidste tekniske blokering i normalrun `35457642258`.
Vejrdata og score blev bygget for alle 673 kyststrækninger, men den private
samlede `conditions.json` blev så stor, at `JSON.stringify` ikke kunne danne
én samlet streng. Filen skrives nu kompakt, løbende og atomisk med en fast
grænse, som holder den parsebar i de efterfølgende private trin.

## Produktionsbevis fra 4.0.435

- 4.0.435 bestod exact-head `35457292220`, blev merged gennem PR #380 som
  `725068be` og startede almindelig weather `35457642258`.
- DMI-producenten startede og gemte reel fremgang. Copernicus og Open-Meteo
  gennemførte bagefter, og den fælles DMI-first-samling lykkedes.
- Scoretracen dækkede 673/673 kystdele. Efter kildekontrollen havde 673/673
  gyldigt vindpar, 673/673 gyldigt bølgeinput og 673/673 beregnelig vade- og
  strandscore. Strøm var verificeret direkte på 665 og båret som kontrolleret
  state-only-hold på otte; samlet direkte strømgrundlag var 673/673.
- Runnet stoppede først ved skrivning af den private samlede JSON med
  `RangeError: Invalid string length`. Det var ikke en ny vind-, provider-
  eller scorefejl. Krypteret providerfremgang blev gemt efter stoppet.

## Rettelse

- Den private JSON bygges ikke længere som én stor streng i hukommelsen.
- Writeren gengiver samme JSON-semantik kompakt i afgrænsede blokke, skriver
  til en tilfældig midlertidig fil, synkroniserer og omdøber atomisk.
- En fejl eller størrelsesoverskridelse efterlader den seneste gyldige fil
  urørt og rydder kun sin egen midlertidige fil.
- Maksimum ligger konservativt under Node/V8's strenggrænse, fordi senere
  kontroller fortsat skal kunne læse og parse hele private dokumentet.
- De fem største topfelter og den samlede byteantal logges uden private
  værdier, så ny utilsigtet vækst bliver synlig i samme run.
- Writeren er med i den private fuldruntimekontrakt og har en måltest for
  byteidentisk JSON, UTF-8, delte objekter, store arrays, overskridelse,
  atomisk bevaring og cirkulære objekter.

## Uændret

Ingen data, timer, kystdele, scorefelter eller kildebeviser er fjernet for at
gøre filen mindre. RavScore, providerprioritet, DMI-only-vandstand, geometri,
zoner og land-/vandpunkter er uændrede. Næste almindelige kørsel skal genbruge
den gemte fremgang og bevise artifact, deploy og offentlig visning.
