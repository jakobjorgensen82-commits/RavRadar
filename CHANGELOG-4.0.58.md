# RavRadar 4.0.58

## Håndbog
- Udbygget fra kort projektdrejebog til fuld faglig og teknisk håndbog med 23 kapitler.
- Dokumenterer ravets fysiske egenskaber, bølge-/strømtransport, swash/backwash, vandstand, sortering, tang, morfologi, stormtiming og usikkerheder.
- Beskriver præcis hvordan den aktuelle kode omsætter teorien til vægte, tærskler, bonusser, fradrag og caps.
- Indeholder prioriterede spørgsmål til ekstern ekspert og faglig kildeliste.

## Release Governance
- Ny bindende RDKS-beslutning og automatiseret `release:gate`.
- Ny sikker `release:package`, som udelader `.git`, secrets, caches og udviklerartefakter.
- Release-rapport genereres og medtages i pakken.

## Domæneberedskab
- Arkitekturkrav til `ravradar.dk` dokumenteret.
- CNAME aktiveres ikke endnu; domæneskiftet kræver DNS-, HTTPS- og Supabase-redirectkontrol.

## Brugerflade
- “Drejebog” er omdøbt til “Håndbog” i aktive admintekster og rettigheder.
