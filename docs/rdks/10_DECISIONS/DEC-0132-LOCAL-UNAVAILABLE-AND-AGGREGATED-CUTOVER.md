# DEC-0132 – lokale datahuller stopper kun lokalt, og cutover samler sine kontroller

- **Dato:** 2026-09-12
- **Status:** AKTIV, lokalt implementeret og måltestet; exact-head-, backend-, cutover- og offentligt bevis afventer
- **Ejergrundlag:** Ejeren ønsker den integrerede model online nu, ønsker fejl samlet i én cutovergennemgang og har bekræftet, at cutover skal fortsætte automatisk, når der ikke er fejl
- **Præciserer:** DEC-0110, DEC-0113, DEC-0114, DEC-0122, DEC-0130 og DEC-0131
- **Bevarer:** 210 zoner/673 kystdele som offentlig struktur, ingen opdigtede scores, eksakt provenance, privacy, append-only backend, én exact-head-kildegate og alle post-data-kontroller

## Produktionsfund

4.0.349-rapportrettelsen blev exact-head-valideret og merged via PR #284 som main `512f889dbb301bc7fb801478358625f5404586b2`. Cache-only-run `34706453561` genbrugte target `2026-09-12T08:00:00Z` uden providerhentning og viste den tidligere skjulte fordeling efter fuld zonegennemgang: 659 kystdele i begge jagtformer manglede accepteret vindinput, og 14 kystdele i begge jagtformer havde `CURRENT_DIRECT_INPUT_NOT_READY`. Hele vejrclosure var samtidig fortsat 79.414/79.414 med DMI 67.686, Copernicus 8.668, regional 944 og Open-Meteo 2.116.

Vinddataene manglede ikke i cachen. Den fælles RavScore-adapter krævede fejlagtigt komponentnavnet `wind`, selv når den faktiske, fuldt verificerede DKSS-kilde korrekt hed `windTail`. Den afviste derfor gyldige fremtidige vindrækker. Af de 14 currentdele var otte den allerede godkendte regionale politik. De havde en closure-bundet `NATIVE_CADENCE_HOLD`, men scorebyggeren kunne ikke se den nødvendige private præ-H0-kildereference. De resterende seks dele kræver ny same-main-runtimekontrol efter rettelsen; de må ikke opfindes eller skjules.

## Beslutning

1. `wind` og `windTail` er de eneste tilladte vindkomponentnavne. Adapteren skal læse det deklarerede navn, validere den fulde eksisterende kildeidentitet mod netop det navn og afvise mismatch. Det gælder både gemte data og alle kommende vejrbygninger.
2. En closure-bundet regional `NATIVE_CADENCE_HOLD` må kun bruges i den private score-/recoverybygning, når live-current-producenten samtidig leverer en eksakt, hash- og cachebundet præ-H0-kildereference. Referencen valideres og sorteres kanonisk som `(validTime, partId)`. Den publiceres aldrig og må ikke bruges til at opfinde U/V, pil eller et nyt tidspunkt.
3. Direkte inputmangel gør kun den berørte kystdel, jagtform og time `UNAVAILABLE` med `score=null`, tællinger og årsag. Den øvrige 210/673-struktur og øvrige gyldige scorer fortsætter. Utilgængelige dele må ikke vinde eller indgå i rangering.
4. Manglende ældre historik er fortsat `HISTORY_INCOMPLETE`, ikke direkte inputmangel. Den kan vise en konservativ score, men er ikke kalibreringsegnet. En kombination af lokal inputmangel og ufuldstændig historik må aldrig kaldes fuld modelhukommelse.
5. Den samme lokale availabilitykontrakt skal valideres i generator, offentlig conditions/manifest, Pages-audit, browserens dataservice, administration og ture. Almindelig runtime kræver eksakt manifest/current-lighed. Nødruntime må kun genberegne availability fra den valgte, allerede validerede time og skal bevare schema, policy, zonetal og valgt tidspunkt.
6. Før `integrated-cutover` må skrive checkpoint, database, privat runtime eller Pages, køres præcis fem uafhængige kontroller: offentlig runtimeaudit, strenge referencezoner, fuld projektvalidering, releasegate og datavalidering. Alle fem gennemføres, og en begrænset rapport indeholder kun trin-id og resultat.
7. Hvis én eller flere af de fem kontroller fejler, stopper cutover samlet efter kontrollen og før første ekstern skrivning. Hvis alle fem er grønne, fortsætter cutover automatisk gennem den eksisterende handoff-, privacy-, backend-, CAS-, Pages- og offentlige verifikation.
8. Almindelige vejrkørsler beholder deres hidtidige stoprækkefølge. Kildegaten køres én gang på PR'ens eksakte slut-head; byteidentisk main/backend må genbruge live exact-content-beviset. Post-data-kontrollerne kan ikke genbruges eller springes over.
9. Den centralt anvendte 4.0.349-migration forbliver byteuændret. Ny append-only `20260912194206_local_unavailable_cutover_binding.sql` fører kun integrated bundle, Candidate G-rollbackbundle, continuationhash og readbackversion frem. Candidate G er ikke automatisk offentlig fallback; den forbliver et privat, kontrolleret rollback-orakel.

## Bevis og næste rækkefølge

Måltests dækker virkeligt DKSS-`windTail`, forkert komponentmærke, fremtidig vejrbygning, regionale præ-H0-referencer, kanonisk sortering, lokale `UNAVAILABLE`-resultater, rangering, offentlig runtime, administration, ture, nødruntime, privacy og det femleddede cutoverstop. Integrated bundle er `d3b6c829dfb0d66251d7ebf0b0f4d0a1c357bbf0083aa6076b3f8743eaca397d`, Candidate G-rollbackbundle er `343f9f539146c61fbd0b75e2c4d1148189f56602abb85bff24bbbd708e43aae2`, og continuationhash er `87ea235809d1c305d93fd04ae434ecca07e2c573b5e4929b5b8a7446687eec06`.

Næste rækkefølge er versions-/RDKS-lukning, målrettet sluttest, én exact-head GitHub-kildegate, byteidentisk merge, append-only backendapply/readback og en ny cache-only main-kørsel. Hvis de fem kontroller er grønne, skal cutover fortsætte automatisk. Ved fejl bruges den samlede rapport til én rettelsesrunde uden provider-oneoff. Efter offentlig 210/673-verifikation genaktiveres normal vedligeholdelse kontrolleret, og næste normale kørsel skal bevise fremtidig vind/current, DMI-rotation og tidsoverskud.
