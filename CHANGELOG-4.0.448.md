# RavRadar 4.0.448

## Rettet

- Den private resumérbare public-hour-pakke bruger nu samme 16 MiB-grænse som
  den offentlige timeleveringskontrakt. En gyldig offentlig timefil mellem 8
  og 16 MiB bliver derfor ikke længere afvist ved den afsluttende pakning.
- Kapacitetsauditten henter timefiler med samme kontraktgrænse som pakningen.
- Tilføjet regression, der bygger og gendanner en gyldig offentlig timefil på
  over 8 MiB byte-for-byte.
- Fordi leveringskoden ligger i den transitive model-lukning, er den aktive
  modelbinding, den inaktive Candidate G-rollbackbinding og continuation-
  bindingen regenereret samlet. Den gamle migration er bevaret uændret; den
  nye append-only successor er
  `20260920220000_public_hour_pack_capacity_binding.sql`.

## Livegrundlag

- Normalrun `35530859518` nåede 210/210 offentlige zoner og 673/673 scoredele.
  Providerkæde, komponentruntime og scoreforberedelse var grønne.
- Run'et stoppede kun i den private timepakke, fordi den brugte en forældet
  8 MiB-enkeltfilgrænse mod den offentlige kontrakts 16 MiB. Der blev derfor
  ikke bygget nyt artifact eller deployet fra run'et.

## Uændret

- DMI-first, fallback, scoreformel, geometri, MISSING-regler og den samlede
  private pakkes 256 MiB-grænse er uændret.
- Exact-head sourcegate, merge og en ny normal kørsel mangler fortsat før
  produktionsbevis.
