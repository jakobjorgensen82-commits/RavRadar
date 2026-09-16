# RavRadar 4.0.386

## Rettet

- Den tidsbegrænsede Open-Meteo-restkø roterer nu mellem hele, stabile batches på almindelige vejrkørsler.
- UTC-time, kvarter og GitHub-forsøgsnummer vælger køens startpunkt, så gentagne svære eller tomme svar ikke spærrer alle senere, uprøvede huller.
- Sikre driftsdiagnoser viser det numeriske rotationspunkt og om køen faktisk blev flyttet, uden del-id'er, koordinater eller rå vektorer.
- Releasegaten låser rotationskontrakten, og måltesten beviser både spredning over tid, retry-forskydning og sandfærdige resthuller.

## Bevaret

- Open-Meteos providerbevis og negative observationer bruges ikke som skjult scheduler-cursor.
- Batches dannes fortsat deterministisk før rotation; genopfriskning af eksisterende data beholder sin ældst-først-rækkefølge.
- Providerprioritet, cacheformat, RavScore, geometri og offentlig datakontrakt er uændrede.
- En normal vejrkørsel må fortsat ikke bygge eller deploye med reelle manglende par.
- Livebeviset er én almindelig tidsbegrænset vejrkørsel med genbrug af den gemte cache; ingen oneoff.
