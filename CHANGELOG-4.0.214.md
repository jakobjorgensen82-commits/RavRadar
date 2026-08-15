# RavRadar 4.0.214

- Fjerner cachede vandtemperaturtimer, som ikke beviseligt kommer fra DMI's eksplicitte havoverfladelag.
- Viser `missing` i stedet for at genbruge en mulig dybdetemperatur som overfladetemperatur.
- Prioriterer DMI-havmodellerne på skift, indtil overfladetemperaturen er genopbygget.
- Bevarer øvrig vejrhistorik, fallbackprioritet, RavScore og state uændret.
