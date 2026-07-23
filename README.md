# RavRadar 1.0

RavRadar er en mobilvenlig, statisk webapp til vurdering af ravforhold langs danske kyster. Hjemmesiden og alle faste data ligger på GitHub Pages. Supabase er kun valgfrit lager for anonyme fundobservationer.

## Indeholder

- 21 brede danske kystzoner, inklusive vestkyst, Kattegat, øerne og Limfjorden
- valg mellem Waders og Strand
- RavScore med vægtningen jagtbarhed 40 %, transport 35 % og frigivelse 25 %
- automatisk DMI-hentning fra HARMONIE, WAM og DKSS hver tredje time
- rangliste over de bedste aktuelle områder
- kort, GPS-knap, forklaringer og mobiltilpasning
- valgfri anonyme observationer via Supabase
- automatisk validering og GitHub Pages-udgivelse
- ingen brugerupload

## Arkitektur

GitHub Pages indeholder hele webappen, zoner, scoremotor og det kompakte aktuelle DMI-datasæt. GitHub Actions henter prognoser og udgiver siden. Supabase bruges ikke til vejrdata og belastes derfor kun minimalt.

## Engangsudgivelse

1. Erstat indholdet i repositoryet med alle filer fra denne mappe.
2. Commit og push til `main`.
3. Vælg **Settings → Pages → Source: GitHub Actions**.
4. Åbn fanen **Actions** og kontroller, at `Update DMI and deploy RavRadar` bliver grøn.

Siden publiceres derefter automatisk og DMI-data opdateres hver tredje time.

## Supabase-observationer

Observationer er valgfri. Webappen virker uden dem. For at aktivere dem:

1. Kør `supabase/schema.sql` én gang i Supabase SQL Editor.
2. Indsæt projektets offentlige URL og publishable key i `config.js`.

Der gemmes ingen navne, e-mailadresser eller præcise brugerpositioner. Med de kompakte felter vil 500 MB række til meget store mængder observationer.

## Domæne

Et domæne som `ravradar.dk` kan senere forbindes i GitHub Pages under **Custom domain**. Koden kræver ingen ændring.

## Lokal test

Med Node.js 22 eller nyere:

```bash
npm run validate
```

## Datakilder og forbehold

Prognoser kommer fra DMI Open Data Forecast EDR API. RavScore er en vejledende model og kan ikke garantere fund. Brugeren skal altid vurdere lokal bølgegang, strøm, vanddybde og sikkerhed.

## Central vejrarkitektur (2.5)

RavRadar-klienterne kalder aldrig vejrtjenester direkte. GitHub Actions opdaterer den fælles
`data/live/conditions.json` hvert femte minut og deployer den statiske app.

Kildeprioritet pr. zone:

1. DMI Open Data
2. Open-Meteo Marine
3. MET Norway
4. Seneste gyldige cache

Ved DMI HTTP 429, timeout eller midlertidig netværksfejl publiceres fallback-data straks.
Workflowet venter ikke fem minutter i samme job; næste centrale kørsel forsøger automatisk
DMI igen. Hver zone indeholder `provider`, `providerLabel`, `fallback`, `stale` og `attempts`,
så datakilden kan vises i udviklerdiagnostikken.
