# RavRadar 4.0.213

- Afgrænser DMI-vandtemperatur til parameter 80 ved det eksplicitte havoverfladelag `surface:0`.
- Forhindrer dybere `depthBelowSea`-temperaturlag i at overskrive den offentlige havoverfladetemperatur.
- Bevarer temperaturens vertikale lagidentitet i grid- og timeproveniens.
- Hæver parsergenerationen til 15, så den aktuelle DMI-cache genopbygges kontrolleret.
- Ændrer ingen datakilde, fallbackprioritet, RavScore, state eller historikvindue.
- Den separate 15-timers temperatur-/vandstandshale for otte Limfjordszoner forbliver åben under DEC-0030.
