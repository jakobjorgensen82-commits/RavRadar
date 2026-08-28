# RavRadar 4.0.298 – sikker direkte retur fra Om RavRadar

Dato: 2026-08-28

## Ændret

- Gør RavRadar-knappen på **Om RavRadar** til en entydig, ny forsidenavigation med versionsmarkør og unik nonce i både Safari og Hjemmeskærm-app.
- Installerer et lille selvhostet returværn før Leaflet og den asynkrone appopstart.
- Kræver et synligt kort, fem **Bedste områder**, fem dagsfaner og fem færdige rækker i den viste prognosedag efter den direkte retur.
- Udfører højst én frisk retry efter seks sekunder; en fortsat fejl stopper uden reloadløkke.
- Bevarer 4.0.297's bfcache-recovery for browserens egentlige tilbage-/fremnavigation.

## Uændret

- 4.0.296's kompakte startup og 4.0.297's generelle sidecache-recovery.
- Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid og sortering.
- Konto-/turdata, privatliv, assistent- og Edge-kontrakten.
- Geometri og land-/vandpunkter. Den private Sibirien-kandidat aktiveres ikke.

## Verifikation

- Målrettede tests dækker sund retur, timeout, præcis én retry, ingen løkke, fravær af returmarkør, statisk link, tidlig installation og service-worker-cache.
- 4.0.297's produktion var teknisk grøn, men ejerens efterfølgende fysiske iPhone-test af den interne knap var rød. 4.0.298 erstatter derfor ikke denne evidens med desktopbevis.
- PR #203 bestod exact-head `33164570642`/job `98826795332` og blev merged som `077b6fb9`. Produktion `33164639052`, build `98827073610` og Pages `98829261896` var grønne.
- Offentlig side viste 4.0.298, 210 interaktive zonelinjer, fem aktuelle områder og fem prognoserækker, men værnet ledte fejlagtigt efter zonelinjerne i standard-overlay-pane. Det forblev derfor `pending`, genindlæste en allerede komplet retur efter cirka seks sekunder og endte `failed` efter retry.
- Ejerens fysiske iPhone-test var rød med meget langsom og derefter udeblevet side. 4.0.298 er ikke fysisk løst og følges op af DEC-0096/4.0.299.
- Se DEC-0095.
