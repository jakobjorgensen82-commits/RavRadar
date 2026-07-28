# RavRadar 4.0.14 – DMI tidsinterpolation og selvreparerende bulkpipeline

## Formål
Versionen retter den centrale årsag til, at gyldige 3-timers DMI-data blev til tomme timer i den færdige 120-timers prognose. Målet er højere faktisk DMI-dækning uden at kopiere gamle modeltrin eller skjule datamangler.

## Ændringer

- DMI-data interpoleres lineært mellem tilstødende modeltrin i stedet for at vælge nærmeste trin med en fast 90-minutters grænse.
- Strøm interpoleres på de oprindelige U/V-komponenter. Retningen beregnes først bagefter, så 0/360-graders overgang og retningsskift behandles fysisk korrekt.
- Vind og bølger interpoleres som vektorer; vandstand, temperatur og bølgeperiode interpoleres som skalarer.
- Der interpoleres kun over normale modelhuller. Store huller udfyldes ikke kunstigt, og sidste modeltrin gentages ikke ubegrænset.
- Den færdige DMI-cache er timebaseret og registrerer samtidig den oprindelige modelkadence og interpolationsmetoden.
- Bulk-assets markeres kun komplette, når alle kerneparametre for modeltypen er fundet, og mindst én zone faktisk er udfyldt.
- Behandlingsstatus er bundet til parser-, parameterkort-, grid- og zoneregistersignatur. Ændringer udløser kontrolleret genbehandling.
- Ufuldstændige tidligere forecasttrin genprøves automatisk i stedet for at blive låst permanent som færdige.
- Hvis en valgt collection giver nul reelt arbejde, fortsætter samme kørsel til næste prioriterede collection.
- Diagnostikken viser genprøvede ufuldstændige assets og collections uden fremdrift.

## Nøjagtighedsprincip
DMI er fortsat autoritativ, når en gyldig komponent findes. Open-Meteo bruges kun komponentvist, hvor DMI mangler. Interpolation bruges kun mellem originale DMI-modeltrin og ændrer ikke de oprindelige modelværdier ved modeltidspunkterne.
