# RavRadar 4.0.265

- Tilføjer **Indberet tur eller fund** under en indlogget konto, så en tidligere tur kan registreres uden først at være startet i RavRadar.
- Kræver, at brugeren selv vælger dato og klokkeslæt for turens start samt turens varighed. Dato og klokkeslæt er ikke udfyldt på forhånd.
- Genbruger de samme spørgsmål om jagtform, område, kyststrækning, søgning og fund som den almindelige afslutning af en startet tur.
- Gemmer efterregistreringen i den eksisterende `observations`-tabel uden ny tabel, ekstra række eller databaseændring.
- Bruger aldrig aktuelle vejrforhold som erstatning for turens historiske vejr. Uden et sikkert historisk snapshot gemmes forecast- og scorefelter tomme, og turen markeres `calibration_eligible=false`.
- Udelukker udtrykkeligt disse rækker fra den lokale sandsynlighedsberegning, så en efterregistrering uden historisk vejr ikke ændrer den aktuelle fundchance.
- Tilføjer **Afslut uden at indberette** for en startet tur. Efter bekræftelse ryddes kun den lokale aktive tur; der oprettes ingen observation, outboxpost eller Supabase-række. **Svar senere** bevarer turen.
- Viser klokkeslæt og mærket **Efterregistreret** under **Mine ture og fund**. Den interne sætning om databasekopier vises ikke for brugeren.
- Binder Candidate G-profilomskifterens versionsmærke til 4.0.265 og lader fremtidige versionsløft opdatere det automatisk. Profilvalg, aktivering, `20/50/30` og scorelogik er uændrede.
- Synkroniserer webhåndbogens allerede vedtagne forklaring af **Søgeforhold** med hovedhåndbogen og brugerfladen.
- Bevarer vejrdata, geometri, land-/vandpunkter, artifact, protected-dirty-data og private caches. I `data/kystdata.json` og `data/zones.geojson` er kun versionsfeltet ændret til 4.0.265.
- PR #111 bestod exact-head `32658661075`, blev merged som `cb7d2232`, og produktion `32658724861` bestod frisk vejr, fuld validering, releasegate, Supabase og Pages. Live `rr-20260823184330-210` er version 4.0.265 på 210 zoner og 673 kystdele.
- Den målrettede livekontrol bekræfter det udgivne kontoflow, den krævede selvvalgte dato og tid uden forudfyldning samt **Afslut uden at indberette**. En rigtig autentificeret indsendelse er fortsat en senere bevidst ejerprøve, fordi den opretter en virkelig Supabase-række.

## Efterfølgende produktionsfund

Den senere interaktive ejerprøve fandt, at Supabases centrale Site URL stadig pegede på localhost, og at den aktive `observations`-tabel manglede både `data_quality_flags` og ejerens SELECT-policy. 4.0.266/DEC-0065 er den bindende korrektion. 4.0.265's formular- og fravalgskontrakt består, men den autentificerede upload/turlog må ikke kaldes bevist af denne release.
