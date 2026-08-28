# DEC-0097 – Gendan den beviste mobile sidecache-genoptagelse

## Status

**ERSTATTET AF DEC-0098.** 4.0.300 bestod PR #205/exact-head `33169073533`, merge `11f87093`, produktion `33169139060`, build `98841746378` og Pages `98843831281`. Offentlig desktopretur var komplet på 1,29 sekunder, men ejerens fysiske Safari-test på bekræftet version 4.0.300 var fortsat rød. Den historiske 4.0.292-verifikation brugte browserens tilbagefunktion, ikke det interne `./`-link; 4.0.300 genskabte derfor ikke den faktisk beviste hændelse.

## Problem

4.0.292 havde en enkel og fungerende returkontrakt: **Om RavRadar** linkede direkte til `./`, en færdig sidecache-side blev genoptaget og genoptegnet, og kun en retur før afsluttet appimport blev genindlæst. 4.0.297–299 ændrede denne vej i tre trin: mobil hard reload, DOM-watchdog og til sidst en unik versions-/nonce-navigation.

Desktopmålinger for 4.0.299 var grønne, men den fysiske iPhone viste fortsat forsiden uden kort og prognoser efter tryk på RavRadar-knappen. Indholdet kom frem efter lås, kort ventetid og oplåsning. Det er konkret evidens for en suspenderet side/layout-genoptagelse og modbeviser, at en ny kold navigation er den rigtige mobilstrategi.

## Beslutning

1. RavRadar-knappen på **Om RavRadar** er igen et almindeligt statisk link til `./`, præcis som i den produktionsverificerede 4.0.292-kode.
2. Om-sidens JavaScript må ikke overtage klikket, tilføje nonce eller kalde `location.assign`, `replace` eller `reload`.
3. Det tidlige bootstrapværn genindlæser kun, når Safari gendanner siden fra bfcache, før appimporten er færdig. En færdig mobilapp må ikke hard reloade på grund af skærmbredde.
4. Ved `pageshow.persisted` genoptegner den eksisterende app samme allerede indlæste state: Leaflet-layout, zonefarver, **Bedste områder**, valgt zone, **5-dages RavRadar** og strømpile.
5. Det særskilte mobile/desktop-watchdog og den efterfølgende DOM-sundhedsreload fjernes. En vellykket genoptegning må ikke omdannes til en ny kold navigation af en selector eller timer.
6. 4.0.295/296's indholdsadresserede, behovsstyrede datalæsning bevares. Rettelsen ruller kun browserlivscyklussen tilbage, ikke startup-ydelsen.

## Afgrænsning

Ændringen er read-only browsernavigation og genoptegning. Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter er uændrede. Sibirien forbliver privat staged; intet punkt aktiveres.

## Beviskrav

- Målrettede tests skal låse det direkte `./`-link, fravær af klikoverstyring, fravær af mobil hard reload/watchdog og den fulde genoptegning.
- 4.0.296's opstarts-/payloadkontrakter skal fortsat bestå.
- Fuld `validate:source` skal bestå på PR'ens eksakte head.
- Et nyt artifact skal bestå frisk produktion, releasegate og Pages.
- Offentlig kontrol skal bevise version, farvet kort, fem **Bedste områder** og fem rækker på hver af fem prognosedage.
- Ejeren skal derefter teste den interne Om-knap i fysisk iPhone Safari og Hjemmeskærm. Browserens tilbageknap skal også virke. Fejlen må ikke kaldes fysisk løst før ejerprøven er grøn.
