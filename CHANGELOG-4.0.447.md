# RavRadar 4.0.447

## Rettet

- Den samme validerede regionale strømreference bygges nu kun én gang pr.
  indlæst live-dokument. Den normale 673-deles scorebygning genbruger beviset
  i stedet for at gennemløbe hele 79.414-pars closure igen for hver kystdel.
- Eksplicit genvalidering kontrollerer fortsat rækkefølge og indholdshash. Et
  nyt dokument, en ny closure eller en ny reference-array får altid et nyt
  bevis.
- `update-weather` logger nu varigheden af sine store interne faser, så en
  eventuel ny tidsgrænse kan placeres præcist uden endnu en blind rettelse.
- Fordi `live-current-pilot` indgår i RavScore-modellens transitive
  implementeringslukning, er modelbundle-hashen regenereret og synkroniseret i
  de eksisterende maskinlæsbare bindinger. Scoreformel og modelparametre er
  uændrede.

## Livegrundlag

- 4.0.446 blev exact-head-grøn, merged som `1d9b0946` og kørt i normalrun
  `35513058150`.
- DMI, Copernicus, Open-Meteo, 79.414-pars closure og syvdageshistorik
  gennemførte. `update-weather` ramte derefter igen sin 25-minutters grænse.
- Den gemte inputtrace viste 673/673 direkte scoreklare kystdele. Det afgrænser
  fejlen til den efterfølgende lokale samling/scorebygning, ikke til manglende
  providerinput.

## Uændret

- DMI-first, providerprioritet, vandstandens DMI-only-regel, fallbackdata,
  RavScore, geometri, land-/vandpunkter og MISSING-regler ændres ikke.
- Produktionsbevis kræver fortsat exact-head sourcegate, merge og én normal
  live continuation, som når cache, artifact og deploy.
