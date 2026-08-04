# RavRadar 4.0.96

## Rettet
- Fjernet runtimefejlen `stationDeliveryLabel is not defined` i vandstandsstationsfanen.
- Første valgte zone kan igen færdiginitialisere kortet, også når zonen allerede har et gemt override.
- Det beskyttede stationsregister og routing-audit hydreres nu fra Supabase før vejropdateringen.
- Manglende livscyklusstatus klassificeres som ukendt i stedet for utilgængelig.
- Central upload fletter stationshistorik ikke-destruktivt og beskytter mod nedgradering af kendte statusfelter.
- Kortets farver er bevaret efter signaturen: grøn automatisk, rød administrator, lilla begge, grå udfaset og orange øvrig.

## Ikke ændret
- DMI-hentning og prognoseværdier.
- Vandstandsinterpolation i produktionen.
- RavScore, offentlig side, service worker og kortets offentlige rendering.

## Test
- Ny kontrakttest beskytter runtimekald, statusfarver, Supabase-hydrering og ukendt status.
