# RavRadar 3.1.2 – fælles Zone Registry

- Én autoritativ Zone Registry bruges nu af både kortet, dropdowns og Administratorcenteret.
- Zone Registry hentes med versionsparameter og `no-store`, så en gammel 56-zoners fil ikke kan blive hængende som første svar.
- Service worker bruger network-first for `zones.geojson` og `zone-plan.json`.
- Administratorcenteret skelner tydeligt mellem 231 registrerede zoner, aktive zoner og historiske/erstattede zoner.
- DMI-cachetælleren bruger Weather Healths faktiske målpopulation i stedet for den lokalt indlæste UI-liste.
- Diagnoseeksporten indeholder registreret, aktivt og historisk zoneantal.
- Ny automatisk konsistenstest beskytter mod tilbagefald til parallelle zonelister.
