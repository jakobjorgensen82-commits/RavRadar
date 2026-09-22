# 4.0.461 – bind migrationen til den faktisk valgte protected generation

## Hvad der blev rettet

Code-only-run `35740940791` viste den egentlige fejl i predecessor-kæden:
pointerens nyeste generation var `19:00`, mens restore korrekt valgte den
foregående `16:00`-generation, fordi den offentlige måltid stadig var `16:00`.
Migrationen brugte alligevel descriptoren for den nyeste generation og
afviste derfor den korrekte forgænger som et identitetsmismatch.

4.0.461 tilføjer en målrettet `--describe-target`-descriptor. Den vælger den
centrale pointerpost, hvis `productionReferenceAt` præcis matcher det mål,
med current-generation først ved en ægte same-reference successor. Restore,
source-archive, manifest og migration bruger dermed samme generation.

## Afgrænsning

Ingen providerkald, vejrdata, cache, score, geometri eller offentlig payload
ændres. Den fail-closed identitetskontrol er bevaret; rettelsen fjerner kun
forvekslingen mellem current pointer og den faktisk valgte forgænger.
