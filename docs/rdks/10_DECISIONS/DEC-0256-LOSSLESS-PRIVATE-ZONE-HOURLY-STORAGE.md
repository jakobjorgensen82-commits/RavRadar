# DEC-0256 – Tabsfri privat lagring af zone-timer

**Dato:** 2026-09-27
**Status:** AKTIV BESLUTNING; lokal 4.0.501, produktion afventer

## Baggrund

Kort 4.0.500-normalrun `36288805313` blev offentligt leveret. Den
første fulde normale opfyldning `36293202251` nåede alle tre
leverandører og scorebygning, men `data/live/conditions.json`
overskred V8's grænse for én JSON-streng ved atomisk lagring.
Den offentlige cache stod uændret. At hæve en tilfældig grænse
eller dele den private pakke i endnu en løs sidefil ville øge
kompleksiteten uden at løse den voksende datamængde.

## Beslutning

De private time-for-time-arrays for vejr- og scorezoner pakkes
tabsfrit hver for sig som gzip/base64 i den eksisterende private
`conditions.json`. Alle 210 zoner og hver række tælles. Byteantal,
SHA-256 og datasæt-/produktionstime kontrolleres ved hver læsning;
ændret, blandet eller ufuldstændig pakning afvises. Den nye private
storage-ABI er v2. Det er en lagringsform, ikke en ny vejr- eller
scoreberegning. Offentlige timefiler og fem vejrfelter ændres ikke.

En ny kørsel må læse den gamle v1-pakke alene, når dens beskyttede
arkiv, filhash, kilde-head, datasæt, tid, modelbinding og uændrede
score-/public-kontrakter passer eksakt med den sidste offentlige
4.0.500-generation. Den gamle cache nulstilles ikke. Et nyt v2-
produkt skal bevises i et kort, normalt run før endnu en lang
opfyldning; fuld dækning og slutstørrelse kan ikke udledes af
syntetiske prøver alene.

## Kapacitetsoverslag før levering

Den tidligere lange kørsel `36278712741` gemte en privat
`conditions.json` på 490.849.269 byte. Dens to største topfelter var
`coastalParts` 331.138.383 byte og `zones` 147.818.759 byte, samlet
478.957.142 byte (97,6 % af filen). Kun deres time-arrays pakkes;
topfelttallene er derfor ikke i sig selv et målt sparebeløb.

Ved den kørsels mål var 308.846 af 397.070 mulige vejrtype-/kystdel-/
timepar udfyldt (77,8 %). En bevidst grov lineær fremskrivning af hele
den gamle fil til 100 % giver cirka 631 mio. byte, altså omtrent
95 mio. byte over den aktuelle grænse på 535.822.312 byte. Det er et
planlægningsskøn, ikke en øvre matematisk grænse: felterne har fast
overhead, og scorehistorikkens størrelse følger ikke nødvendigvis
vejrparrene lineært. Hvis blot 250 mio. af de 479 mio. byte i de to
store topfelter er relevante time-arrays, skal de skrumpe cirka 38 %
for at nå grænsen i dette skøn. En forsigtig 50 %-reduktion af netop
disse 250 mio. byte ville give cirka 506 mio. byte i alt og omtrent
30 mio. byte luft til grænsen. En komplet syntetisk 210-zone ×
118-time/fem-vejrtype-prøve skrumpede samlet fra 16.102.303 til
1.043.657 byte (93,5 %), men dens gentagne struktur giver ikke en
garanti for samme forhold i produktion. Den første rigtige korte
kørsel må måle de eksakte rå, gzip- og slutbyte, og en fuld kørsel
må bekræfte både slutstørrelse og alle fem vejrfelter.

## Kontrol og åbent arbejde

Måltest 210 zoner × 118 timer med alle fem vejrtyper, identisk
genopbygning gennem ti generationer og afvisning af hash-/inventory-
fejl. Tjek aktiv normalbygning, offentlig projektion, provenance,
validering, privat bundling, restore, no-loss, central CAS, R2 og
Pages. Exact-head kilde-CI og et rigtigt kort produktionsrun mangler.
Vandstandens tilsyneladende cirka to døgn, havstrømsrest og
leverandørfordeling er særskilte åbne dataissues; denne beslutning
må ikke fremstilles som løsning på dem. Se DEC-0254/-0255.
