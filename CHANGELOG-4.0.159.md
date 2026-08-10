# RavRadar 4.0.159

- Tilføjer en privat national weather-shadow-kontrakt for de 774 gridvaliderede lokale kystdele.
- Hver del får unik `zoneId::partId`-serie og separat historiknøgle; parentfallback, krydsmerge, interpolation, public projection, state og score er forbudt.
- 752 fuldt dækkede og 22 delvist dækkede dele bevarer deres faktiske gridproveniens og komponentgab. Ni blokerede dele udelukkes.
- Alle 208 parent-zoner forbliver autoritativ runtime: 194 har private delkontrakter, og 14 forbliver helt uændrede.
