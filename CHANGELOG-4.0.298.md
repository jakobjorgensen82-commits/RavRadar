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
- Fuld lokal `validate:source` inklusive RDKS-, privacy-, Edge-, Candidate G- og releasekontrol er grøn. PR exact-head, produktion, offentlig kontrol og fysisk Safari-/Hjemmeskærm-test afventer.
- Se DEC-0095.
