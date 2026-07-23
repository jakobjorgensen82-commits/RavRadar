# RavRadar 2.3

RavRadar er en mobilvenlig PWA til vurdering af ravforhold langs danske kyster. Den virker uden login og uden Supabase. Vejrdata genereres statisk via GitHub Actions og gemmes i `data/live/conditions.json` – ikke i Supabase.

## Færdig platform

- RavScore for **Waders** og **Strand**
- kort, rangliste, GPS og offline-cache
- lokalt registrerede ravture, mens appen er åben
- prompt dagen efter: **“Var du på ravtur i går?”** med Nej, Ja, Meget og valgfrie gram
- observationer uden billeder, altid med tidsstempel, zone, RavScore og vejrsnapshot
- valgfrit Supabase-login med magic link eller adgangskode
- udviklertilstand: tryk på RavRadar-logoet 10 gange og brug PIN **1931**
- udviklerpanel med datastatus, proveniens, diagnostik, lokal statistik, GPS- og zoneinspektion

## Vigtige begrænsninger

En browser-PWA kan ikke garantere GPS-sporing, når appen er lukket eller suspenderet. RavRadar registrerer derfor kun ruten, mens siden er åben. GPS-ruter gemmes lokalt og vises kun i udviklertilstanden.

## Vejrarkitektur

Provider-rækkefølgen er:

1. DMI
2. Open-Meteo Marine
3. MET Norway
4. senere Copernicus Marine

Fallback-princippet er provider → næste provider → seneste cachede `conditions.json`. Den nuværende updater bruger DMI som aktiv primærkilde; fallback-providerne kan tilføjes uden at ændre frontendens dataformat.

## Supabase

RavRadar virker uden konfiguration. For login og synkronisering:

1. Kør `supabase/schema.sql` i Supabase SQL Editor.
2. Indsæt projektets URL og publishable key i `config.js`.
3. Aktivér de ønskede auth-metoder i Supabase.

Selv uden Supabase gemmes observationer og ture lokalt i browseren.

## Test

Kræver Node.js 22 eller nyere:

```bash
npm run validate
```

## Zoner

Den medfølgende `data/zones.geojson` er den eksisterende brede zoneversion. Den nye naturlige opdeling på cirka 100–200 zoner leveres regionsvis og kan senere samles til samme filformat. Kun åbne kyster og Limfjorden skal med; andre fjorde skal ikke indgå.

## Central vejropdatering (2.4)

GitHub Actions opdaterer den fælles `data/live/conditions.json` fire gange i timen.
App-brugerne læser kun denne statiske cache og kontakter derfor ikke vejrtjenesterne direkte.
Kildeprioriteten er DMI → Open-Meteo Marine → MET Norway → seneste gyldige cache.
Ved en midlertidig DMI-fejl gemmes fallback-data straks, og DMI prøves igen efter fem minutter.
Deployment fortsætter altid med den seneste gyldige cache, hvis en vejrtjeneste er utilgængelig.


## Central weather retry policy (2.4.1)

Weather is refreshed centrally by GitHub Actions every five minutes. Each run tries DMI first, then Open-Meteo Marine, then MET Norway, and finally the last valid cache. A DMI 429 or temporary network error opens a circuit for the rest of that run, so fallback data is published immediately. The workflow never sleeps for five minutes; the next scheduled run performs the DMI retry. End-user devices only read `data/live/conditions.json` and never call providers directly.

GitHub Pages deploy via Actions