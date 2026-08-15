# RavRadar 4.0.216

- Deler den offentlige runtime i en lille startpakke og en efterfølgende detaljepakke.
- Startpakken bevarer aktuelle forhold, kompakt historisk tilstand, strømpile og de aktuelle vindende kystdele for begge jagtformer.
- Femdøgnsprognosen og alle øvrige lokale kystdelsdata hentes umiddelbart efter første kort og rangliste uden at blokere dem.
- Manifest og klient afviser blanding af start- og detaljepakker med forskellige dataset-id'er.
- Manglende detaljepakke påvirker ikke aktuelle forhold; femdøgnsvisningen melder tydeligt, at den ikke kunne hentes.
- Vejrdata, historik, RavScore, vægte, kilder og missing-regler er uændrede.
- Lokal browserkontrol med frisk 210-zonedata viste kort/rangliste klar på cirka 0,7 sekund, færdig femdøgnsvisning, fungerende zonepanel og ingen browserfejl.
