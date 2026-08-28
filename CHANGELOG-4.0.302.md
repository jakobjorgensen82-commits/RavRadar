# RavRadar 4.0.302 – én koldstart uden førstegangsreload

Dato: 2026-08-28

## Ændret

- Første service-worker-installation må overtage den allerede indlæste side uden at udløse en ny fuld opstart.
- En rigtig senere service-worker-opdatering genindlæser fortsat siden præcis én gang.
- Manifest/prognosestart begynder parallelt med zone-/kystdelsgrenen i stedet for først bagefter.

## Evidens

- 4.0.301 og ejerens fysiske iPhone Safari reproducerede cirka 14 sekunders første load, mens efterfølgende faner var hurtige.
- Koden kaldte `clients.claim()` ved aktivering og genindlæste ubetinget på den deraf følgende `controllerchange`.
- Den målrettede 4.0.302-kontrakt beviser nul reload ved første claim, én reload ved en senere opdatering og parallel opstart af de uafhængige offentlige datagrene.

## Uændret

- Om → RavRadar-historikreturen og bfcache-genoptegningen, som ejeren fysisk godkendte i 4.0.301.
- Service-worker-versionering, sikker updateovertagelse, Candidate G, RavScore, vejr, prognoseindhold, sortering, konto-/turdata og privatliv.
- Geometri og land-/vandpunkter. Geodatafilerne ændrer kun topversionsfelt 4.0.301 → 4.0.302; Sibirien forbliver privat staged.

## Verifikation

- Målrettede cold-start-, mobilresume-, Om-retur- og ydelsestests samt fuld lokal `validate:source`/releasegate er grønne.
- Exact-head, produktion, Pages og offentlig/fysisk koldstart afventer. Se DEC-0099.
