# RavScore candidate D/E - canonical results 2026-08-21

## Korrigering efter modelaudit

Resultaterne nedenfor dokumenterer den oprindelige D/E-kørsel, men de må ikke bruges som endeligt kandidatbevis. Den private procesmodel lod stadig rev, lavt vand og ålegræs påvirke enkelte delkomponenter, selv om disse statiske kysttræk ikke har tilstrækkelig evidens til universelle point. Den offentlige RavScore var ikke berørt. D/E skal genkøres score-neutralt med den rettede nul-effekt-kontrakt, før de numeriske resultater anvendes videre.

## Formaal

Dette er et privat forskningsresultat. Det aendrer ikke den aktive RavScore og maa ikke bruges som automatisk aktiveringsbevis.

Kandidat D retter en konkret modelsvaghed: gunstig timing maa ikke kunne skabe en leveringsvej, hvis boelger og stroem ikke transporterer materiale mod eller langs kysten. Kandidat E laegger en forsigtig fysisk flaskehals oven paa D. Statiske kystegenskaber som rev, lavt vand og aalegraes giver fortsat ingen point uden bedre evidens.

## Koersel

- 15 faste vejrsituationer
- 673 eksisterende kystdele
- 2 brugerformer
- 20.190 deterministiske evalueringer
- ingen flytning eller udskrivning af koordinater
- ingen raavejrdata, U/V-vaerdier eller produktionspayloads

## Centrale resultater

| Kontrol | Kandidat B | Kandidat D |
|---|---:|---:|
| Paaland kontra fraland, strand | +25,166 | +30,000 |
| Paaland kontra fraland, vadere | +25,166 | +30,000 |
| Friske kontra gamle forhold, strand | +33,905 | +32,841 |
| Friske kontra gamle forhold, vadere | +31,905 | +30,841 |
| Langs kysten venstre kontra hoejre | 0,000 | 0,000 |

Kandidat D reagerer dermed tydeligere paa transportretningen, bevarer tidsfoelsomheden og er symmetrisk for venstre og hoejre langs kysten.

Kandidat E reducerer D selektivt i de faste situationer:

| Situation | D strand | E strand | AEndring |
|---|---:|---:|---:|
| Stille og neutral | 38,883 | 35,156 | -3,727 |
| Opbygning med paalandstransport | 70,883 | 70,883 | 0,000 |
| Tidlig aftagende storm | 86,000 | 86,000 | 0,000 |
| Efter storm med paalandstransport | 89,000 | 89,000 | 0,000 |
| Efter storm med fralandstransport | 59,000 | 50,000 | -9,000 |
| Stroem paaland, boelger fraland | 81,000 | 81,000 | 0,000 |
| Boelger paaland, stroem fraland | 58,000 | 52,000 | -6,000 |
| Gamle forhold | 56,159 | 53,357 | -2,802 |
| Svag mobilisering | 65,159 | 62,841 | -2,318 |

E er smallere end den tidligere kandidat C: den reducerer ikke de klare paalandshaendelser, den tidlige aftagende fase, naerkyst-remobilisering eller rent stigende/faldende vand i sig selv.

## Hvad resultatet ikke beviser

- Det beviser ikke, at den nuvaerende fordeling mellem boelger og stroem er korrekt.
- Situationen med stroem paaland og boelger fraland ligger fortsat hoejt. Den omvendte situation ligger betydeligt lavere. Den asymmetri skal sammenholdes med litteratur og historiske haendelser, foer en kandidat kan anbefales.
- De faste situationer tester logik og rangorden. De kan ikke alene kalibrere endelige vaegte eller graenser.
- Den aktive offentlige model og vaegtene 25/40/35 er uændrede.

## Konklusion og naeste trin

D/E beholdes som private forskningskandidater. Naeste faglige trin er at fastlaegge, hvor meget boelger, stroem, mobilisering og tidsfase boer dominere under forskellige kystforhold. Derefter sammenlignes kandidaterne paa udvalgte historiske haendelsesvinduer. Foerst samlet evidens fra faste situationer, historiske forloeb og senere funddata kan begrunde en offentlig modelaendring.
