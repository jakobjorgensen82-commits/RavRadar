# Changelog 4.0.418

4.0.417 bestod exact-head `35356064367`, blev merged gennem PR #361 som main
`0890ed0ea70e3147718d0883c913b0c479b68072` og kom providerfrit online i
`35356645337`.

Den første almindelige weather-kørsel `35357557315` gennemførte DMI,
Copernicus, regional DMI, Open-Meteo og gemte deres fremgang. Den samlede
currentfordeling var 32.232 DMI-par, 5.158 Copernicus-par, 912 regionale
DMI-par, 40.039 Open-Meteo-par og 1.073 ærlige lokale huller ud af 79.414.
Kørselen stoppede bagefter før publicering, fordi zone `DK-B01-12` havde en
forskudt offentlig 118-timersakse.

Rodårsagen var, at sammenlægningen lod en ældre DMI-caches starttime definere
den offentlige akse. En gammel time kunne derfor ligge først, mens den rigtige
+117-time blev skåret væk. 4.0.418 binder nu hver offentlig zone til den
aktuelle produktions præcise UTC-time og materialiserer nøjagtig +0..+117.
Gyldige værdier for samme sted og time bevares komponentvist; et reelt hul
bliver et eksplicit `MISSING` på den rigtige time og forskyder aldrig resten.

DMI-rotation, providerprioritet, RavScore-formel, modelbundle, geometri og
land-/vandpunkter er uændrede. De gemte provider-cacher genbruges. Efter
providerfri kodelevering køres én almindelig weather; ingen oneoff.
