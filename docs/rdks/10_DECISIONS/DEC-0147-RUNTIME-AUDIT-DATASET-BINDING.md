# DEC-0147 – Runtimeauditen skal bære det allerede validerede dataset-id

**Status:** Aktiv
**Dato:** 2026-09-14
**Besluttet af:** Konkret first-cutover-evidens og ejerens krav om hurtig online-fortsættelse
**Berører:** Integreret runtimeaudit og checkpoint-/deploy-handoff
**Supplerer:** DEC-0146 og DEC-0144

## Kontekst

4.0.364 bestod sourcegate `34846130189`, blev merged gennem PR #301 som main `273cb052026e9f3b5b15fb9e0314ae8c032b0233`, og providerfrit handoff `34848494028` blev grønt. Cutover `34849662988` forsøg 2 fortsatte efter en midlertidig Supabase 502 og byggede den integrerede runtime.

Den payloadfri cutoverrapport viste `PASSED`, runtimeaudit `success` og `failureCount: 0`. 4.0.364's H0-rettelse virkede derfor i den virkelige kæde. Installationen stoppede først i det efterfølgende checkpoint-led.

Checkpoint-leddet krævede et `datasetId` i auditrapporten. Auditproducenten validerede allerede, at inputtet havde et ikke-tomt dataset-id, men feltet blev ikke kopieret til rapportens topniveau. Den efterfølgende `jq -e`-binding kunne derfor aldrig lykkes.

## Beslutning

1. Den integrerede runtimeaudit skal returnere `datasetId: full.datasetId` sammen med status og produktionsreference.
2. Der indføres ingen alternativ id-kilde, fallback eller omskrivning i checkpoint-leddet. Det er producentens allerede validerede id, der føres videre.
3. Den grønne 4.0.364-runtimeaudit med 0 fejl er det konkrete bevis for score-/H0-rettelsen. 4.0.365 ændrer ikke scoremodel, vejr eller cache.
4. De fire brede first-cutover-suiter forbliver sprunget over efter ejerbeslutningen. Der køres ingen oneoff eller almindelig weather før offentlig launch.
5. Efter exact-head sourcegate og merge genskabes kun det SHA-bundne providerfri handoff, hvorefter cutoveren forsøges igen.

## Konsekvenser

- Audit, manifest, checkpoint-disposition og deploy-handoff kan bindes til samme datasæt med den kontrakt, workflowet allerede kræver.
- Der kræves ingen migration eller ny modelbundle.
- En midlertidig Supabase 5xx behandles fortsat som retry, ikke som RavRadar-kodefejl.
- Offentlig sitekontrol og bevis for almindelig weather/cache/rotation følger efter launch.
