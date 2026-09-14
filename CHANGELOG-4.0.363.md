# RavRadar 4.0.363 – rene H0-tilstande og korrekt holdaudit

**Dato:** 2026-09-14
**Status:** Lokal releasekandidat; exact-head-CI, merge, same-head-handoff, cutover og offentlig verifikation mangler.

## Faktisk produktionsbevis

- 4.0.362 bestod exact-head-sourcegate, blev merged gennem PR #299 som main `8f5d818f5e0ee558984e3d75a1ef136f3cd73def`, og handoff `34830877368` blev grønt i andet forsøg uden providerhentning.
- Cutover `34832259268` gendannede de forseglede cacher og byggede vejr, provenance og public runtime for 210 zoner og 673 kystdele. Den ændrede ikke database eller offentlig side.
- Runtimeauditen samlede ét ensartet mønster for otte H0-holds: 8 state-replay-fejl, 8 last-mile-metadatafejl, 8 Candidate G-statefejl, 8 Candidate G-orakelfejl og 16 afledte mode-rekonstruktionsfejl.

## Rodårsag og rettelse

- En intern liste over native holdintervaller blev delt mellem scoretimer. Da den næste forecasttime tilføjede sit bevis, blev den tidligere H0-tilstand ændret bagud i tid. H0-state kunne derfor ikke genåbnes deterministisk.
- Hver scoretime får nu sin egen uforanderlige kopi af intervallisten. En regression beviser, at senere forecasttimer ikke kan ændre H0-state, og at state kan genåbnes byte-for-byte.
- Candidate G's gyldige holdstate beholdt korrekt den virkelige kildetid to timer før måltimen. Auditen krævede fejlagtigt, at den skulle ligne en ny måling i måltimen.
- Auditen accepterer nu kun den ældre reference, når den integrerede runtime samtidig erklærer `NATIVE_CADENCE_HOLD`, begge modeller peger på samme kildetid, det regionale kildebevis er eksakt, og alderen er højst tre timer. Uden bevis eller uden for grænsen fejler den fortsat.

## Binding og launch

- Integrated bundle er `327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01`; Candidate G bundle er `1ccbb10ed3e89f9c8336539a2c566d7ab6efd099bf3e9d1598dbb31e84d5c3a1`.
- Append-only migration `20260914020000_h0_state_snapshot_binding.sql` fører begge bundles og continuation-hashen frem. De 14 forgængere ændres eller genkøres ikke.
- De to direkte regressioner, den syntetiske 210/673-runtimeaudit, migrationsplan, installationskontrakt, workflowkontrakt, bundle- og bindingskontroller er grønne.
- Ingen oneoff eller almindelig weather køres før modellen er online. Næste trin er én exact-head sourcegate, merge, kort same-head-handoff, cutover, offentlig kontrol og derefter normal weather.

Se DEC-0145.
