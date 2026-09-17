# RavRadar 4.0.400

## Rettet

- Den nationale private vindtest læser nu hele det eksakte navngivne
  workflowtrin i stedet for et vilkårligt 180-tegnsvindue.
- Samme billige kontrakttest kører i den tidlige deploy-source-gate, før en
  eventuel vejrproduktion bruger tid hos DMI, Copernicus og Open-Meteo.
- Versionsværktøjet bruger entydige callback-erstatninger ved capture groups,
  så en version der begynder med `4` ikke kan ændre `$1` til `$14`.

## Verificeret grundlag

- 4.0.399 er offentligt leveret gennem code-only `35176215202`.
- Normalrun `35176561317` gennemførte providerforløb, cachelagring, closure,
  historik, runtimebygning og 210/673-audit.
- Alle 79.414 identiteter blev bogført; 420 var ærligt lokalt `MISSING`.
  Det er ikke komplet, men lokale huller blokerer ikke øvrige gyldige scorer.

## Uændret

RavScore, vægte, vejrdata, cacheindhold, providerprioritet, kystgeometri og
offentlig score ændres ikke af denne release. Næste produktionsskridt er
providerfri code-only og derefter én almindelig weather på gemte cacher.
