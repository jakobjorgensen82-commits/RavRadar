# Sammenligning af korrektioner for national zonerangering

Dato: 2026-08-21

Dataset: `rr-20260821154200-210`

Omfang: 210 zoner / 673 kystdele / 12 rangeringer

## Formaal

Denne private foelsomhedsanalyse sammenligner faa mulige korrektioner af de nationale top-5-lister. Den lokale RavScore, den vindende kystdel og alle offentlige forklaringer er uaendrede.

Hver rangering indeholder 192-210 zoner med en gyldig lokal kystdelsscore. Zoner uden en gyldig lokal prognosetime faar ikke en kunstig fallbackscore.

| Kandidat | 6+ dele i top-5 | Overrepraesentation | Nye top-5-medlemmer | Aendrede foerstepladser | Gns. top-5-justering | Maks. justering | Eksempler |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| Ingen korrektion | 25/60 | 3.50x | 0 | 0 | 0.00 | 0.00 | Falster nord og Orehoved: 8/12; Falster vest og Nysted Nor munding: 6/12 |
| Raa antal-straf, maks. 4 point | 19/60 | 2.66x | 6 | 1 | 0.87 | 4.00 | Falster nord og Orehoved: 7/12; Falster vest og Nysted Nor munding: 1/12 |
| Retningsmulighed, maks. 4 point | 24/60 | 3.36x | 2 | 3 | 2.47 | 3.94 | Falster nord og Orehoved: 8/12; Falster vest og Nysted Nor munding: 5/12 |
| Retning og vinderstoette, maks. 2 point | 25/60 | 3.50x | 2 | 2 | 0.96 | 1.89 | Falster nord og Orehoved: 8/12; Falster vest og Nysted Nor munding: 6/12 |
| Retning og vinderstoette, maks. 4 point | 21/60 | 2.94x | 5 | 3 | 1.70 | 3.78 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 4/12 |
| Retning og vinderstoette, maks. 6 point | 19/60 | 2.66x | 8 | 3 | 2.32 | 5.68 | Falster nord og Orehoved: 6/12; Falster vest og Nysted Nor munding: 2/12 |

## Vurdering

- Den raa antal-straf er kun en negativ kontrol. Den kan ikke skelne mellem mange ens retninger og mange reelt forskellige retninger.
- Den rene retningsstraf er ogsaa en negativ kontrol. Den straffer en zone, selv naar flere kystdele faktisk understoetter det gode resultat.
- De stoettebaserede kandidater justerer kun meget, naar zonen baade har stor retningsmulighed og en isoleret vinder.
- En stor zone skal fortsat kunne blive nummer et. Naar hele zonen er god, er den stoettebaserede justering derfor nul; flere stoettende dele reducerer den gradvist.
- Ingen kandidat aktiveres paa baggrund af dette ene produktionsforloeb. Resultatet bruges til at udpege et lille interval, som efterfoelgende skal koeres paa de historiske vejrsituationer.
- En fremtidig justering er en intern rangeringstilpasning. Den maa ikke fremstilles som en lavere lokal ravchance.

## Kontrol

Alle 12 rekonstruerede baseline-rangeringer matchede den eksisterende top-5-rangering eksakt foer korrektion. Score impact: nej. Public runtime impact: nej. Land-/vandpunkter: uaendrede.
