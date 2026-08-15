# DEC-0029 – Planlagt videnskabelig forskningsrunde for RavScore

**Status:** PLANLAGT
**Registreret:** 2026-08-08

## Formål
RavRadars fysiske model skal på et senere, kontrolleret tidspunkt valideres systemisk mod den bedst tilgængelige forskning om frigivelse, transport, koncentration/aflejring og jagtbarhed af rav langs danske kyster. Arbejdet skal vurdere den samlede årsagskæde før nye point, vægte eller regler overvejes.

## Prioritet og adgangskriterier
Opgaven er P3 og må ikke startes, før:

1. den aktive forecast-/schedulerstabilisering, herunder progressiv 96-timers vind-/bølgedækning, er afsluttet eller klart afgrænset;
2. højere prioriterede P0/P1-opgaver ikke længere kræver indsatsen;
3. den aktuelle RavScore, dens input, regler, shadow-state og kendte modelhuller er kortlagt mod faktisk kode;
4. forskningsarbejdet kan gennemføres med permanent kilde- og evidenssporbarhed.

## Forskningsprotokol
Første fase er forskning og modelanalyse uden produktionskode. Peer-reviewed forskning, universiteter, myndigheder, oceanografi, hydrodynamik, sedimenttransport og dokumenterede observationer/modeller prioriteres. Anekdotisk ravjagtviden er kun hypotesegenererende.

Analysen skal holde disse mekanismer adskilt:

1. frigivelse/mobilisering;
2. transport og transporthistorik;
3. koncentration og aflejring;
4. tilgængelighed/jagtbarhed.

Der skal derefter udarbejdes:

- en konceptuel systemmodel før en scoremodel;
- et konkret, forklarligt forslag til næste generation af RavScore-/scoremodulet baseret på systemmodellen og kodeauditen; forslaget er en analyseleverance og giver ikke i sig selv mandat til implementering;
- en regel-for-regel-sammenligning af forskning og aktuel RavRadar-kode;
- en evidensmatrix med kilder, evidenstype/-styrke, geografi, tid, overlap, datakrav og valideringsmulighed;
- særskilt analyse af punktstrøm kontra rumlige strømstrukturer, opstrømsforhold, konvergens/divergens, transportkorridorer og persistens;
- særskilt analyse af det rumlige og historiske vindfelt over hav og kyst, herunder vind uden for de aktuelle zonepunkter og uden for de steder, hvor kortet viser pile. Kortpile er en selektiv brugerfladevisualisering og må aldrig definere det fysiske analyseområde. Analysen skal undersøge, om opstrøms og regionale vindforløb påvirker bølger, strøm, mobilisering, transport og senere ilanddrift ud over den lokale vind ved fundkysten;
- forslag klassificeret som `BEVAR`, `FORBEDR`, `TEST`, `NY MEKANISME`, `FJERN/NEDVÆGT` eller `UTILSTRÆKKELIG EVIDENS` samt evidensklasse A–D;
- konkrete valideringseksperimenter med selection bias og negativ evidens behandlet eksplicit.

## Strømbånd og større strømstrukturer
Det aktuelle forbud mod generelle strømbånd som scoreinput eller fallback forbliver bindende. Det er ikke et permanent videnskabeligt dogme: forskningsrunden skal undersøge, om rumlige strømfelter eller afledte transportstrukturer tilfører selvstændig, validerbar information ud over punktvise DMI-vektorer.

Ingen sådan mekanisme må påvirke produktionen uden stærk evidens, dokumenteret ikke-redundans, kompatibilitet med faktiske DMI-data, valideringsdesign og en efterfølgende særskilt brugerbeslutning. Hvis analysen viser støj, dobbelt-tælling eller falsk præcision, skal mekanismen forblive ude.

## Stopregel og leverancer
Forskningsrunden må ikke automatisk omskrive RavScore. Den skal stoppe efter evidensgrundlag, systemmodel, modelaudit, usikkerheder og prioriterede eksperimenter er fremlagt til godkendelse.

Det permanente hovedresultat skal oprettes som `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md`. Først efter særskilt godkendelse kan konkrete ændringer implementeres med regressionanalyse, tests, versionering, rollback og opdatering af RDKS/håndbog.

Tunge historiske eller rumlige beregninger skal, hvis de senere godkendes, udføres i pipeline og publiceres som kompakte afledte signaler. Manglende data må aldrig konstrueres som nul eller stale data.

## Vindfelt og kortpile
Vind ved de viste pile er ikke hele vindgrundlaget for ravets fysiske årsagskæde. Pilene viser kun udvalgte verificerede datapunkter og er designet til kortlæsning, performance og provenance; fravær af en pil betyder ikke, at vinden i området er fysisk irrelevant. Den senere analyse skal derfor starte i de tilgængelige rumlige og tidslige meteorologiske felter og relevante koblinger til bølge- og havmodeller, ikke i UI-markørernes placering.

Dette er et forskningskrav, ikke en forhåndskonklusion om ny score. Analysen skal kvantificere geografisk skala, lag, tidsforsinkelse, persistens, retning, overlap med eksisterende bølge-/strømvariable og risiko for dobbelt-tælling. Kun signaler med selvstændig evidens og efterfølgende virkelighedsvalidering kan senere foreslås til særskilt godkendelse.
