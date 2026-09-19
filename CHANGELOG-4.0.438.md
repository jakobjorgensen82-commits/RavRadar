# RavRadar 4.0.438

## Offentlige timedata bevares uden en uparsebar privat kæmpefil

- Normalrun `35463989289` på main `65bda6a9` gennemførte alle tre
  providerfaser og byggede vind, bølger, brugbar strøm og score for 673/673
  kystdele. Det stoppede først ved den endelige private conditions-skrivning.
- En højere filgrænse er ikke en holdbar løsning: de efterfølgende trin læser
  fortsat hele `conditions.json` som én streng og parser den samlet.
- De eksakte 118 offentlige timefiler gemmes nu i en hashbundet, autentificeret
  og størrelsesbegrænset privat gzip-pakke. Den kompakte private conditions
  fjerner kun den allerede pakkede kopi af kystdelenes `hourly`-rækker.
- Conditions og timepakken installeres atomisk. Publicering genskaber de
  samme timefiler byte-for-byte og genbygger zoneshards; rollbacktest beviser,
  at en fejl ikke efterlader et blandet par.
- Strømproveniens færdiggøres før pakning. Det senere provenance-trin skal
  være en ren idempotenskontrol og stopper ved en uventet ændring.
- Startsidens færdigberegnede nationale ranking hashbindes i conditions, så
  den ikke genberegnes tom efter restore uden private hourly-rækker.
- Kapacitetsauditen på den faktiske generation målte 203.510.947 rå bytes og
  en pakke på 9.331.534 bytes, langt under grænsen på 256 MiB.
- Den private fuldruntimekontrakt, den eksakte forgængerovergang og den
  append-only backendbinding er opdateret. Ny migration er
  `20260919231000_public_hour_delivery_binding.sql`.
- Workflowets centrale cachetrin får 25 minutter til projektion og forsegling;
  leverandørernes egne budgetter og datakrav er uændrede.
- Ingen scoreformel, kildeprioritet, vandstandsregel, geometri eller offentlig
  time er fjernet. Se DEC-0217.
