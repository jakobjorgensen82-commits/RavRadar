# RavRadar 4.0.406

Dato: 2026-09-17

## Ændret

- Mobil og andre begrænsede browsere kan vise den aktive integrerede models
  kompakte, tidsmærkede snapshot uden at hente den cirka 175 MB store
  detaljepakke ved opstart.
- Passerede prognoser filtreres fra snapshotvisningen. Pile og turstart er
  fortsat lukkede, indtil den præcise aktuelle time er tilgængelig.
- En almindelig DMI-kørsel forsøger ét aktuelt HARMONIE-asset først, når
  aktive kystdele mangler vind. Derefter fortsætter samme kørsel med den
  hidtidige prioritet for strøm og bølger.

## Hvorfor

4.0.405 er live med 210 zoner og 673 kystdele, men mobilværnet skjulte også
141 allerede gyldige zonescorer. Samtidig havde 296 kystdele strøm og bølger,
men ikke vind på delpunktet; det gjorde 69 zoner helt utilgængelige. Den
almindelige DMI-kørsel nåede ikke HARMONIE, fordi strøm og bølger brugte
tidsbudgettet først.

## Uændret

RavScore-formlen, geometri, land-/vandpunkter, strømprioritet, datavalidering
og lokal `MISSING` er uændrede. Der køres ingen oneoff. Se DEC-0188 og
DEC-0189.
