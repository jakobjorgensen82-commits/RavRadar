# RavRadar 4.0.54

## Vandstandsstationer
- Observationsstatus, prognose-/cachestatus og samlet anvendelighed er nu adskilt.
- En station kan fortsat være automatisk prognosebrugbar, når den ikke leverer en ny observation, hvis en gyldig DMI-prognosecache stadig dokumenterer stationens seneste bidrag.
- Stationsregistret gemmer cachetidspunkt, udløbstid, berørte zoner og samlet anvendelighedsstatus.
- Cachede stationsværdier kan bruges frem til cacheudløb, mens friske observationer altid har forrang.
- Der oprettes tilstandsnotifikationer, når prognosecache bliver tilgængelig eller udløber.
- Admin viser observationsstatus, cache gyldig til og samlet anvendelighed.

## Dokumentation
- Nyt dokumentationscenter kan åbnes direkte fra admin.
- Centeret samler håndbog, Current Truth, implementeringsstatus, aktive krav, kendte problemer og masterlog.
- RDKS og håndbogen er opdateret til den nye stationsmodel.
