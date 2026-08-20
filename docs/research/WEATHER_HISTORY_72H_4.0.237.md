# 72-timers vejrhistorik - 4.0.237

## Maaling

Produktionsartifact `#3237`, datasæt `rr-20260819213342-210`, har samme `samples72h`-forloeb i alle 210 zoner:

- 62 samples
- foerste sample `2026-08-18T16:05:48.548Z`
- seneste sample `2026-08-19T21:00:00.000Z`
- spaend `28,903` timer

Den senere naturlige produktion `#3242` voksede videre til 64 raasamples og `30,903` timer. Vaeksten er ensrettet og passer med den kontrollerede liveaktivering af 4.0.232 den 18. august. Det er ikke evidens for tilfaeldigt tab mellem zoner.

## Afgrænsning

Det fulde 72-timersvindue er endnu ikke naaet og maa ikke kaldes produktionsverificeret. Der indfoeres ingen backfill, og den aktive 24-timers score-/state-semantik aendres ikke. Current-proveniensens verificerede del er et separat krav; reference-time-rettelsen maa ikke faa raahistorikkens laengde til at se laengere ud end den er.

Naeste selvstaendige bevis er en naturlig produktion efter `2026-08-21T16:05:48Z`, hvor alle 210 zoner skal have et reelt spaend paa mindst 72 timer, og retention/pruning fortsat skal bestaa. Ingen kode-, score-, kilde-, fallback- eller punktaendring er begrundet af denne maaling.
