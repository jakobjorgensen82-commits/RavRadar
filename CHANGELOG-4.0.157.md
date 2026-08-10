# RavRadar 4.0.157

- Retter den nationale DMI-gridvalidator efter #2118's korrekte fail-closed stop.
- Hver lokal kystdel arver nu den centralt hydrerede zones `coastType`.
- Gridgaten kører relevante native modelområder for vestkyst, indre danske farvande og Limfjorden i stedet for at kræve Nordsømodeller for hele landet.
- Proveniens bindes til den collection, som produktionens faktiske modelvalg har leveret pr. komponent. Ingen runtime- eller scoreaktivering.
