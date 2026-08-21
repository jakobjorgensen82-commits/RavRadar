# Vejruafhaengigt audit af zonernes retningsmulighed

Dato: 2026-08-21

Dataset: `4.0.193`

Omfang: 210 zoner / 673 kystdele

## Formaal

Auditten undersoeger, om zoner med mange forskelligt vendte kystdele faar flere muligheder for at finde en hoejt scorende del. Den roterer en taenkt stroemretning gennem alle 360 grader. Dermed er resultatet uafhaengigt af dagens konkrete vejr.

Den aendrer ikke RavScore, rangering, produktionsdata eller land-/vandpunkter.

## Resultat efter antal kystdele

| Kystdele | Zoner | Gns. dele | Staerk retning (+/-25 grader) | Brugbar retning (+/-55 grader) | Retningsmulighed mod en enkelt retning |
| --- | ---: | ---: | ---: | ---: | ---: |
| 1-2 | 116 | 1.5 | 18.2% | 38.2% | 1.23x |
| 3-5 | 69 | 3.9 | 38.3% | 64.1% | 1.99x |
| 6+ | 25 | 9.3 | 63.0% | 86.2% | 2.62x |

Sammenhaengen mellem antal kystdele og den vejruafhaengige retningsmulighed er `0.746`. Sammenhaengen mellem antal unikke retninger og retningsmuligheden er `0.7454`.

## De to rejste eksempler

| Zone | Kystdele | Unikke retninger | Staerk retning | Brugbar retning | Retningsmulighed |
| --- | ---: | ---: | ---: | ---: | ---: |
| Falster nord og Orehoved | 11 | 11 | 70.3% | 99.7% | 2.89x |
| Falster vest og Nysted Nor munding | 26 | 26 | 99.4% | 100.0% | 3.11x |

## Samlet vurdering

- Problemet er reelt: forskelligt vendte kystdele giver en systematisk mulighedsfordel, selv uden et bestemt vejrsystem.
- Raat antal kystdele er ikke i sig selv et godt korrektionsgrundlag. Flere dele med samme retning giver naesten ingen ekstra retningsmulighed.
- En fast straf ved mere end to kystdele vil derfor ramme for bredt. Det friske vejraudit viste desuden, at gruppen med 3-5 dele samlet var omtrent proportionalt repraesenteret, mens gruppen med mindst 6 dele var tydeligt overrepraesenteret.
- Den lokale viste RavScore boer fortsat beskrive den bedste faktiske kystdel. En eventuel korrektion boer kun paavirke nationale sammenligninger som "Bedste omraader" og "5 dages RavRadar".
- En kandidat skal vaere begraenset og kombinere effektiv retningsdaekning med stoetten fra zonens andre kystdele. En zone skal ikke straffes, hvis flere dele reelt har gode forhold.

## Naeste beslutningspunkt

Sammenlign faa, forklarlige korrektioner mod baade dette vejruafhaengige audit og flere historiske vejrsituationer. Ingen formel maa aktiveres, foer den er vurderet mod hele landet, scoreforklaringerne og de to nationale top-5-visninger.
