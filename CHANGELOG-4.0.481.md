# RavRadar 4.0.481 – kritiske DMI-timer og Copernicus' næste tur

- 4.0.480-run `35939353111` deployede en gyldig pakke uden tabte
  gamle værdier på 77.395 fælles positioner. Dets nye vindue har dog
  fortsat 5.659 vind-, 5.919 bølge-, 5.868 strøm-, 66.491 vandstands-
  og 31.653 temperaturhuller af 79.414 pr. vejrslag.
- DMI's kritiske marineassets roterer nu fra sidste faktisk forsøgte
  prognosetime efter de tre nærmeste timer. Det modvirker, at et nyt
  modelrun og et 25-minutters budget altid bruger tiden på samme
  begyndelse af Limfjordens 115 officielle timer.
- Copernicus får efter dagens vejrbygning en afgrænset, valgfri
  kvalitetstur til næste normale run. Den genbruger den eksisterende
  transaktionelle stage og samme krypterede private fremdrift; den
  pensionerede ukrypterede post-build-cache genaktiveres ikke.
- Kun den eksakte aktuelle 4.0.480-private pakke må fortsættes over
  den ændrede producentfingerprint med fuldt byte- og kontraktbevis.
  Scoreformel, kildegyldighed, DMI-only-vandstand og Limfjordshold
  ændres ikke.
- Lokale måltests er grønne; exact-head, merge og faktisk DMI-/CP-
  fremgang i produktion afventer. Se DEC-0251.
