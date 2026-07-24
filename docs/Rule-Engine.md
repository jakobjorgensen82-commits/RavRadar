# RavRadar Rule Engine 1.0

## Mål
Regelmotoren skal omsætte dokumenteret viden, ekspertviden og afprøvelige hypoteser til transparente scorejusteringer uden at skjule basisscoren.

## Evalueringsresultat
Hver evaluering returnerer:

- `baseScore`
- `adjustment`
- `finalScore`
- `matchedRules[]`
- `unmatchedRequiredData[]`
- `explanations[]`
- `engineVersion`

## Retninger
Vind- og strømretninger skal behandles cirkulært. Et interval kan krydse 0°, eksempelvis 315–30°. Retninger skal angive semantik: `from` for meteorologisk vind og `towards` for transportretning/strøm, så de ikke blandes.

## Historik
Betingelser kan evalueres over 6, 12, 24, 48 eller 72 timer. Understøttede aggregeringer er blandt andet gennemsnit, maksimum, minimum, andel af timer i retningsinterval og længste sammenhængende forløb.

## Persistence
Persistence oprettes som en tilstand med starttid, udløbstid, oprindelig effekt og annulleringsbetingelser. Tilstanden skal kunne forklares i UI: eksempelvis "Tidligere forhold fastholder potentialet i op til 36 timer".

## Sikkerhed
Regler må aldrig tilsidesætte sikkerhedsadvarsler for kraftig vind, bølger eller andre farlige forhold. En høj ravsandsynlighed er ikke det samme som sikre jagtforhold.
