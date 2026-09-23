# DEC-0237 – normal vejrkørsel skal have tid til hele kæden

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.467; livebevis afventer

Normalkørslerne `35794859378` og `35804736772` gennemførte leverandørerne og
gemte krypteret privat fremgang. Den første blev afbrudt under opbygning af
central vejr-cache; den anden gennemførte også denne opbygning, men blev
afbrudt i den efterfølgende runtimekontrol. Begge ramte buildjobbets fælles
90-minuttersgrænse, ikke en datavalideringsfejl i kontroltrinnet. Intet nyt
offentligt artifact eller deploy kom ud af disse to kørsler.

Normaljobbets loft er 180 minutter; eksplicit providerbootstrap beholder 240.
De enkelte leverandørers og cachetrinnets særskilte tidsgrænser er uændrede.
Et større fælles loft giver kun plads til kontrol, artifact og deploy efter en
lang, men sund indsamling; det pålægger ikke kørslen at bruge tiden.
Regressionen kræver plads til DMI (55 min), Copernicus (7), Open-Meteo (15),
central cache (45) og mindst 30 minutter til øvrige trin. Target-, privat-,
data-, release-, privacy- og artifactgates er uændrede.

De cirka 5.600 resterende par i de seneste rapporter er **strøm for en
kystdel og en prognosetime**, ikke et totalt hulantal på tværs af vejret.
`35794859378` havde 5.711 rester over 57 kystdele; `35804736772` havde
5.640 over 56. Open-Meteo-rapporterne viser mange faktiske null-svar og
enkelte afviste gitterafstande; hverken dens runtime- eller attemptbudget blev
nået. Det beviser ikke endnu, om samme præcise sted/time er tilbagevendende,
eller hvorfor DMI og Copernicus ikke allerede udfyldte dem. En separat
krydsleverandøranalyse skal sammenligne eksakte restpar og kildeafvisninger
før en ændring af prøvepunkter, valideringsgrænser eller prioritet. Gamle
gyldige værdier må fortsat ikke erstattes med tomme værdier.
