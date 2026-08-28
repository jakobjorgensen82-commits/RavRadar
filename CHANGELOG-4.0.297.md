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
- PR #201 bestod exact-head `33162270459`/job `98819313935` og blev merged som `f1adf9b1`. Produktion `33162334072`, build `98819572518` og Pages `98821497503` var grønne.
- Offentlig 4.0.297 viste farvet kort, fem aktuelle områder og fem rækker på alle fem prognosedage; no-cache startup var 850.200 byte/3,24 sekunder, og varm komplet visning cirka 1,27 sekunder.
- Ejerens efterfølgende fysiske iPhone-test fejlede fortsat. Præciseringen viste, at testen bruger RavRadars eget link på **Om RavRadar**, ikke browserens tilbageknap. 4.0.297 løser derfor ikke den konkrete ejerrejse og følges op af 4.0.298/DEC-0095.
- Se DEC-0094 og DEC-0095.
