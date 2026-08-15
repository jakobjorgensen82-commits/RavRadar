# DEC-0038 – Lokal kystvinkel er vejledende i admin

- **Status:** Aktiv
- **Besluttet:** 2026-08-15
- **Ejerbeslutning:** Ja

## Baggrund

Administratoren konstaterede ved Kalø og Bornholm, at **Godkend og gem centralt** kunne forblive deaktiveret efter en færdig manuel zonekontrol. Ved Svansodde viste admin 50 graders afvigelse fra vinkelret og brugte dette som en hård 20-graders port.

Kontrollen sammenlignede det cirka 461 meter lange punktpar med ét cirka 15 meter langt segment i den detaljerede kystlinje. På en bugtet, takket eller fragmenteret kyst kan sådan en mikrotangent vende anderledes end den repræsentative kystretning, som punktparret er valgt for. Målingen kan derfor være nyttig som opmærksomhedssignal, men den kan ikke alene bevise, at ejerens geografiske helhedsvurdering er forkert.

DEC-0037 fastslår allerede, at ejeren på bugtede strækninger manuelt vælger det mest repræsentative sted, og at ét punktpar er en dokumenteret tilnærmelse for hele strækningen.

## Beslutning

1. Afvigelsen mellem punktlinjen og den nærmeste korte kysttangent vises fortsat, men er kun vejledende.
2. Ingen numerisk vinkelgrænse må deaktivere den centrale godkendelsesknap efter ejerens manuelle helhedskontrol.
3. En stor lokal vinkelafvigelse markeres som advarsel og forklares som ikke-blokerende.
4. Manglende/ugyldige punkter, urimelig punktafstand, manglende kryds med egen kyst og punkter på samme side bevares som blokerende integritetsfejl.
5. De tre eksplicitte zonebekræftelser, central readback, efterfølgende DMI-gridkontrol, releasegate og rollback bevares.

## Konsekvens

Kravet om en fagligt meningsfuld hav→land-retning ophæves ikke. Det fortolkes på den repræsentative skala, som den manuelt valgte kyststrækning og ejerens kortkontrol kræver, ikke som automatisk lydighed mod et enkelt mikrosegment.

Beslutningen ændrer ingen eksisterende punktplaceringer, DMI-serier, scoreværdier eller offentlig runtime af sig selv. Den gør det muligt for ejeren at gemme sin autoritative vurdering, hvorefter den normale centrale og produktionsmæssige validering fortsat gælder.
