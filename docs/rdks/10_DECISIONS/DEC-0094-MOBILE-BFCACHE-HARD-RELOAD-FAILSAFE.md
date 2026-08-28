# DEC-0094 – Mobil bfcache-retur skal genindlæse forsiden rent

## Status

Implementeret og produktionsverificeret i 4.0.297 gennem PR #201/exact-head `33162270459`, merge `f1adf9b1`, produktion `33162334072`, build `98819572518`, Pages `98821497503` og offentlig funktions-/ydelseskontrol. Ejerens fysiske mobilretur afventer som sidste bevis.

## Problem

4.0.292 indførte genoptegning ved `pageshow.persisted`, og automatiseret desktop-/390 px-kontrol var grøn. Efter 4.0.295/296's progressive og behovsstyrede dataopstart viste ejerens fysiske mobil imidlertid igen en tom forside efter retur fra eksempelvis **Om RavRadar**: kort og prognoser kom ikke frem. Desktopretur kunne fortsat gennemføres korrekt. Evidensen peger derfor på mobilbrowserens frosne bfcache-tilstand, ikke på den nu løste payloadflaskehals.

## Beslutning

1. Et tidligt livscyklusværn installeres i `bootstrap.js`, før asynkron storage- og appimport.
2. Ved en persisted retur på mobilvisning (`max-width: 900px`) genindlæses forsiden straks og rent. En normal sideindlæsning har `persisted=false`, så kontrakten skaber ikke en løkke.
3. En persisted retur før appimportens afslutning genindlæser også straks på alle skærmstørrelser.
4. Desktop bevarer den billigere idempotente genoptegning. Et tresekunders watchdog genindlæser, hvis appen ikke markerer returen sund.
5. Sundhed kræver ikke kun afsluttet Promise, men synlige DOM-ankre for Leaflet-kortet, **Bedste områder** og **5-dages RavRadar**. En manglende del giver ren genindlæsning.
6. Flere samtidige hændelser og eksisterende resume-lås bevares. Watchdoget rydder sig selv efter dokumenteret sund retur.

## Afgrænsning

Rettelsen ændrer kun den offentlige sides browserlivscyklus. Den ændrer ikke Candidate G, RavScore, vejr, prognoseinput, scorer, sortering, konto-/turdata, privatliv, cachede produktionsdata, geometri eller land-/vandpunkter. Sibirien forbliver en privat staged kandidat og aktiveres ikke af denne ændring.

## Beviskrav

- Målrettede tests skal bevise mobil hard reload, tidlig import-reload, sund desktopretur, watchdog-reload og reload ved mislykket DOM-sundhed.
- Fuld `validate:source` skal bestå på PR'ens eksakte head.
- Hvis 4.0.297 udgiver et nyt artifact, skal fuld produktion, releasegate og Pages bestå.
- Offentlig version, farvet kort, fem **Bedste områder**, fem resultater på alle fem prognosedage og den forbedrede opstartstid skal genverificeres.
- Ejeren skal til sidst bekræfte den konkrete retur fra **Om RavRadar** på den fysiske mobil. Indtil da må fejlen ikke kaldes fysisk produktionsverificeret løst.
