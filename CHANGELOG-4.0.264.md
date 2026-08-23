# RavRadar 4.0.264

- Tilføjer **Mine ture og fund** under kontoen som en privat RLS-læsning af de eksisterende rækker i Supabase-tabellen `observations`.
- Opretter ingen ny turlogtabel, ekstra serverrække eller kopi. Listen hentes først ved klik, bruger kun nødvendige felter og viser højst de seneste 100 ture.
- Viser både nye komplette ture og ældre egne observationer. Lokale afventende ture samles med serverlisten via deres eksisterende klient-/tur-id.
- Bruger kun `user_id` til ejerens private adgang til den samme række. Mailadresse og navn gemmes ikke i turposten, og brugeridentiteten må ikke bruges i analyse eller modeltræning. Anonyme ture forbliver anonyme.
- Erstatter den aktive gamle GPS-baserede parallelrejse med den direkte komplette v2-rejse: Start tur, Afslut tur og Færdiggør tur. Historiske lokale og centrale data ændres eller slettes ikke.
- Forklarer magic link som et tidsbegrænset engangslink via mail, henter den faktiske Supabase-bruger efter callback og forhindrer, at en kontoejet outbox-tur sendes som en anden bruger.
- Forenkler centrale offentlige ord til blandt andet **Søgeforhold**, **Transport mod kysten** og **Rav i bevægelse** uden at ændre scoreberegningen.
- Tilføjer den eksakte `HANDBOOK-RAVRADAR.md` til workflowets docs-only-skip. Denne merge skal gennem én normal fuld produktion; en senere ren dokumentationsmerge skal bevise 0 oprettede push-produktionskørsler.
- Bevarer Candidate G, `20/50/30`, scorelogik, vejrdata, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches. I `data/kystdata.json` og `data/zones.geojson` er kun versionsfeltet ændret til 4.0.264.
- Målrettede kontrakttests og den samlede lokale source-/RDKS-/releasegate er grønne. Exact-head, frisk fuld produktion og live browserkontrol dokumenteres efter PR.
- PR #104 bestod exact-head `32651048627` og blev merged som `579bd167`. Første produktion `32651106811` stoppede før release på en gammel test, som stadig krævede den fjernede GPS-parallelrejse; opfølgningen retter testen til direkte v2 og føjer den til `validate:source`.
