# RavRadar 4.0.331 – historisk sourceprecondition før kildegaten

**Status:** Lokalt implementeret og målrettet valideret releasekandidat 2026-09-07. 4.0.330 er supersederet før vejrruntime; 4.0.331 er endnu ikke exact-head-CI-valideret, merged eller produktionsverificeret.

## Hvad run 34077360903 beviste

- Den autoriserede 118-timers oneoff startede på eksakt `main`-head `8020cdfe539df0841246714c22705d78927c8bdb` og nåede aldrig vejrhentningen.
- Den fulde releasegate i `validate:source` bestod. Den efterfølgende test `test-legacy-candidate-g-source-verification.mjs` stoppede, fordi oneoffens shallow checkout ikke indeholdt det fastlåste historiske Candidate G-sourcehead `49dd4cb454656bdf629e5df760176705e38d2cb0` og derfor ikke kunne slå dets tree op.
- Det er en manglende Git-sourceprecondition i workflowmiljøet, ikke en DMI-, Copernicus-, Open-Meteo-, cache-, model- eller produktionsdatafejl. Det afsluttende `always()`-trin for Open-Meteo blev rødt alene, fordi selve Open-Meteo-trinnet var skipped efter sourcefejlen.
- Central adminhydrering, alle vejr-cache-restores og -writes, DMI, Copernicus, Open-Meteo, closure, runtime, kapacitetsmåling, artifact, deploy og modelaktivering blev sprunget over. Runnet ændrede derfor ingen provider- eller vejrcachedata.

## Rettelse

- Alle workflows, som kan udføre den fulde `validate:source`, skal materialisere det eksakte fastlåste historiske Candidate G-sourcehead før gaten, uafhængigt af om den aktuelle operation er normal vedligeholdelse, pilot, oneoff eller modelcutover.
- Den målrettede fetch skal verificere den eksakte 40-tegns SHA og `FETCH_HEAD`; den giver alene read-only adgang til commit, tree og blobs. Den ændrer ikke checkout-head, branch, caches, centrale data eller protected runtime.
- PR-gatens fulde checkout bevares. Trip-storage harmoniseres fra sin eksisterende eksakte HEAD-fetch til samme fail-closed HEAD+TREE-forhåndskontrol, og de tre weather-kaldesteder får samme precondition. Dermed er alle workflows, som kan køre sourcegaten, beskyttet.
- Den målrettede workflowregression beviser fetch før hver mulig source-gate, og at vejrhentning fortsat ligger efter en grøn eller live-verificeret exact-main-sourceproof. De fokuserede lokale kode-, workflow-, versions-, RDKS-, håndbogs-/SQL- og protected-metadata-kontroller er grønne; det er ikke GitHub- eller runtimebevis.

## Uændret og fortsat åbent

- 4.0.330's provider-, cache-, provenance-, fallback-, history- og closurelogik ændres ikke.
- Normal og oneoff deler fortsat cachemekanismen; normal drift er den varige updater, mens oneoff er en ikke-deployende accelerator. Normal workflow forbliver deaktiveret under den kontrollerede genopfyldning og må først genaktiveres efter ejerens plan.
- Frisk main-oneoff, faktisk providerprogression, Open-Meteo-fill, præcis 79.414/79.414 currentclosure, nul overlap/missing, Feggesund 354/354, hydreret spatial audit og live Supabase-kapacitet er fortsat åbne.
- Fuld post-data `npm run validate` og `npm run release:gate`, artifact/deploy og særskilt Phase B-modelcutover mangler fortsat. Candidate G er offentlig.
- Ingen scoreformel, modelstate, geometri, kystnormal, land-/vandpunkter, cacheformat eller providerbudget ændres i 4.0.331.
