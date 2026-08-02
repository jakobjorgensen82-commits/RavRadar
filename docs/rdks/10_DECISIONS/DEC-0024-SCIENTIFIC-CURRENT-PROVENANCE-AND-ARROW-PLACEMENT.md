# DEC-0024 – Videnskabelig sporbarhed for strømdata og kortpile

**Status:** Aktiv og implementeret i 4.0.76.

## Beslutning
En kortpil må ikke fremstille mere rumlig information, end RavRadar faktisk har. Tidligere tegnede kortet flere kopier af samme zoneværdi omkring zonens datapunkt. Kopierne kunne lande på land og lignede selvstændige målinger. Denne metode er forbudt.

En DMI-strømpil skal stå ved det originale gyldige modelgitterpunkt, der leverede både `current-u` og `current-v`. De to komponenter skal komme fra samme koordinat. Hvis gitterpunktet ikke kan dokumenteres, må en DMI-pil ikke vises. Ved en anden udbyder må pilen kun vises ved den koordinat, udbyderen faktisk blev forespurgt på.

## Retningskonvention
- `current-u` er østlig hastighedskomponent.
- `current-v` er nordlig hastighedskomponent.
- Strømretning er retningen vandet bevæger sig imod.
- 0° er nord og 90° er øst.
- Retning beregnes med `atan2(u,v)` og normaliseres til 0–359°.
- Strømpilen må ikke vendes 180°. Vindpilen vendes, fordi vinddata er en fra-retning.

## Krav til datakæden
Rå u/v skal bevares i den fulde diagnosekæde, så hver beregnet hastighed og retning kan efterprøves. Den offentlige fil kan udelade råkomponenterne af hensyn til størrelse, men skal indeholde det verificerede visningspunkt og kildetype.

## Releasekrav
En release skal stoppe, hvis:
- u og v kommer fra forskellige gitterpunkter,
- `hypot(u,v)` ikke svarer til hastigheden,
- `atan2(u,v)` ikke svarer til retningen,
- strømikonet ikke peger i mod-retningen,
- kortet igen bruger kunstige offsets,
- eller en DMI-pil vises uden dokumenteret marine gitterproveniens.

## Åbent arbejde
Zoner uden direkte DMI-gitterproveniens skal fortsat undersøges. De må ikke fejlagtigt markedsføres som direkte DMI-strøm, før en gyldig marine modelkoordinat er dokumenteret.
