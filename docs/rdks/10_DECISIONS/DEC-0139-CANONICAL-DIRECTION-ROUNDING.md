# DEC-0139 – kanonisk hav→land-retning afrundes præcis én gang

**Status:** Aktiv lokal beslutning for 4.0.357. Exact-head-CI og ny cutover afventer.

## Baggrund

4.0.356-head `dfce04f1` bestod sourcegate `34761823518` og blev merged som main `b75672f7` med identisk filtræ. Handoff `34763228997` bestod uden provider, oneoff eller ny 210/673-audit. Cutover `34763820124` startede og gennemførte sin femleddede samlebarriere.

Fire kontroller var grønne: integreret public-runtime/modelaudit, strenge referencezoner, releasegate og vejrdatavalidering. Kun fuld projektvalidering fejlede. `test-admin-part-direction-editor-4.0.192.mjs` sammenlignede den direkte hav→land-retning `126.60000000000002` med den forventede én-decimalværdi `126.6`.

## Rodårsag

`canonicalOnshoreBearing` normaliserede først den rå retning, afrundede korrekt til én decimal og sendte derefter det afrundede tal gennem modulo-normalisering endnu en gang. Den sidste operation kunne genindføre en binær decimalhale. Retningens fysiske betydning var uændret, men den serialiserede kanoniske værdi var ikke stabil.

## Beslutning

1. Den rå retning normaliseres fortsat til intervallet `[0, 360)` før afrunding.
2. Den afrundes præcis én gang til én decimal og returneres uden endnu en modulooperation.
3. Hvis afrundingen giver præcis `360`, returneres `0`, så intervallet fortsat er `[0, 360)`.
4. En regression kræver en eksakt stabil decimalværdi, og den eksisterende nord/360→0-test bevares.
5. Geometri, land-/vandpunkter, retningsbetydning, vejr, RavScore, modelstate, sourceorder, database og privacy ændres ikke.

## Produktionsfølge

4.0.357 får én exact-head-sourcegate. Efter byteidentisk merge genskabes kun det SHA-bundne handoff fra de eksisterende cacher. Cutover køres derefter igen uden oneoff eller provideropfyldning. De fem produktionskontroller svækkes ikke.
