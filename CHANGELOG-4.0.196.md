# RavRadar 4.0.196

## Rettet

- Land- og havpunkter er gjort til én fysisk kontrakt pr. kystdel: grøn på land, blå i vand og hav→land vinkelret gennem egen kyst.
- Admin viser en tydelig rød hav→land-linje og forhindrer godkendelse af punktpar, som ikke krydser kysten korrekt.
- Pålandsretningen beregnes altid fra punktparret og kan ikke længere afvige fra de viste markører.
- En landsdækkende 10 m sideaudit dokumenterer 121 omvendte punktpar; rettelserne er koblet til den private DMI- og releasevalidering.

## Bevidst ikke automatisk ændret

- 118 tvetydige kystdele bevares, indtil de kan kontrolleres sikkert. Systemet gætter ikke land-/vandside.
- Rejsby og Ribe Vesterå er verificeret korrekt og ændres ikke automatisk.

## Releasegrænse

- Versionen er først lokalt valideret efter fulde gates. De nye nationale punktpar må først aktiveres offentligt efter en grøn privat DMI-/score-/runtime-/rollbackkørsel.
