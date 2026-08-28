# RavRadar 4.0.297 – mobil retur fra bfcache

Dato: 2026-08-28

## Ændret

- Installerer mobilens returværn før den asynkrone appopstart.
- Genindlæser forsiden rent ved en persisted bfcache-retur på mobil, så en frosset halvfærdig tilstand ikke kan efterlade kort og prognoser tomme.
- Bevarer desktopens idempotente genoptegning, men tilføjer et tresekunders watchdog og en konkret DOM-sundhedskontrol for kort, **Bedste områder** og **5-dages RavRadar**.
- Genindlæser også fail-safe, hvis en persisted retur sker før appimporten er afsluttet, eller genoptegningen ikke giver en komplet offentlig visning.

## Uændret

- 4.0.296's kompakte og hurtige startupkontrakt.
- Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid og sortering.
- Konto-/turdata, privatliv, assistent- og Edge-kontrakten.
- Geometri og land-/vandpunkter. Sibirien aktiveres ikke.

## Verifikation

- Målrettede lokale regressionstests dækker mobil hard reload, tidlig import-reload, sund desktopretur, watchdog og manglende DOM-sundhed.
- Fuld lokal `validate:source` og releasegate er grøn for 4.0.297.
- Exact-head, produktion, offentlig kontrol og fysisk mobilretur afventer.
- Se DEC-0094.
