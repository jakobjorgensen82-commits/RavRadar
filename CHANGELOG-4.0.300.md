# RavRadar 4.0.300 – gendannet mobil sidecache-retur

Dato: 2026-08-28

## Ændret

- Gendanner RavRadar-knappen på **Om RavRadar** som det almindelige statiske link `./` fra 4.0.292.
- Fjerner Om-sidens nonce/`location.assign`, mobil hard reload, separat returwatchdog, DOM-sundhedsreload og resume-markører.
- Genoptegner ved `pageshow.persisted` fortsat Leaflet-layout, zonefarver, **Bedste områder**, valgt zone, **5-dages RavRadar** og pile fra den allerede indlæste state.
- Genindlæser kun, hvis Safari gendanner en side, før appimporten er færdig.

## Uændret

- 4.0.295/296's kompakte, indholdsadresserede startup og behovsstyrede detaljelæsning.
- Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter.
- Sibirien forbliver privat staged og uaktiveret.

## Verifikation

- Eksakt sammenligning mod 4.0.292 dokumenterer de senere livscyklusregressioner.
- Målrettede mobilresume-, Om-retur-, startup-, ydelses-, modulversions- og releaseversionskontroller er grønne.
- Geodatafilerne ændrer kun topversionsfelt 4.0.299 → 4.0.300.
- Exact-head, frisk produktion, Pages, offentlig funktionskontrol og fysisk iPhone Safari-/Hjemmeskærm-test afventer. Se DEC-0097.
