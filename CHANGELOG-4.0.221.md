# RavRadar 4.0.221

- Genopretter alarmen for valgte aktive vandstandskilder, som forsvandt i 4.0.99, mens kravet stod åbent.
- Alarmen bruger seneste gyldige tidspunkt fra både DMI-kildens egen prognose og den routede forecastcache.
- Leverende observationskilder og historiske/inaktive kilder alarmerer ikke; gamle falske alarmfelter ryddes ved næste bygning.
- Kildevalg, vandstandsserie og RavScore er uændrede. Funktionelle regressioner dækker gyldig prognose, advarsel, udløb, levering, historisk kilde og central tærskel.
