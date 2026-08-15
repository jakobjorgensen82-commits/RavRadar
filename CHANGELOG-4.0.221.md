# RavRadar 4.0.221

- Genopretter alarmen for valgte aktive vandstandskilder, som forsvandt i 4.0.99, mens kravet stod åbent.
- Alarmen bruger seneste gyldige tidspunkt fra både DMI-kildens egen prognose og den routede forecastcache.
- Leverende observationskilder og historiske/inaktive kilder alarmerer ikke; gamle falske alarmfelter ryddes ved næste bygning.
- Kildevalg, vandstandsserie og RavScore er uændrede. Funktionelle regressioner dækker gyldig prognose, advarsel, udløb, levering, historisk kilde og central tærskel.
- Produktionskørsel #31889559758 bestod alle gates. Artifact #2777 viser nul falske Hals-alarmer, 116,6 timers resttid og uændret faktisk brug i 5/6 zoner; tidligere 15/21 var gamle diagnosefelter.
