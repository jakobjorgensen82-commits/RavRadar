# RavRadar 4.0.74 – hurtig offentlig runtime og mobilkort i centrum

## Offentlig performance
- Ny kompakt `data/live/public-conditions.json` genereres atomisk sammen med den fulde `conditions.json`.
- Brugersiden henter kun den kompakte fil; admin, audits og diagnostik beholder den fulde fil.
- Den kompakte fil bevarer alle brugerrettede felter og giver identiske RavScores.
- Manifestet peger nu eksplicit på både offentlig og fuld runtimefil.

## Cache og dataintegritet
- Live-data lagres ikke længere i service-worker-cachen.
- Tilfældige query-parametre kan derfor ikke skabe mange store cachekopier.
- Dataset-id kontrolleres fortsat, og gamle data vises ikke som aktuelle.
- Sitetesten genbruger den offentlige runtime og kontrollerer, at forsiden aldrig henter den fulde conditions-fil.

## Mobilforside
- Kortet fylder mere på mobil og er fortsat fuldt interaktivt.
- Konto vises med et velkendt personikon.
- Den særskilte GPS-knap er fjernet; placering anmodes først ved start af en ravtur.
- `Start ravtur` og `Spørg RavRadar` står ved siden af hinanden.
- Jagtformsvælgeren er komprimeret.
- Farveforklaringen ligger under kortet.
- Zoom- og lagknapper er uændrede, og bedste zoner markeres ikke særskilt.

## Håndbog og RDKS
- Nyt samlet håndbogskapitel forklarer i almindeligt dansk, hvordan RavRadar vurderer indtransport, mobilisering, jagtbarhed og forskelle mellem kysttyper.
- Ny RDKS-beslutning fastholder den slanke offentlige runtime, sikker live-cache og mobilprioriteringen.

## Regressionstest
- Offentlig runtime sammenlignes deterministisk med den fulde fil.
- Aktuelle scores og prognosescores kontrolleres for alle zoner og begge jagtformer.
- Release fejler, hvis forsiden igen bruger den fulde conditions-fil eller mobilkravene falder ud.
