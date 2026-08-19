# RavRadar 4.0.236

## Rettet

- En planlagt 15-minutterskørsel bruger nu den samme eksakte UTC-time fra Copernicus-readiness-gaten gennem live-pilotbygning og vejrscoring. En kørsel kan derfor ikke godkende eksempelvis 11:00 og senere skifte til 12:00, blot fordi bygningen krydser et timeskifte.
- `current-hour-readiness` eksporterer den godkendte time, og `build-and-prepare` binder den som `RAVRADAR_PRODUCTION_TARGET_HOUR` for både Copernicus-fletningen og `update-weather.mjs`.
- Datasættets `generatedAt`, ID og sundhedstidsstempel bruger fortsat den virkelige byggetid. Den låste time ligger særskilt som `productionReferenceAt`, så kvarterskørsler ikke får samme identitet eller ser ældre ud, end de er.
- Push og bevidst manuel release uden en planlagt readiness-time bruger fortsat det aktuelle tidspunkt og skal stadig bestå hele den fail-closed releasekæde.

## Bevis og afgrænsning

- Den naturlige schedule-kørsel `#32249924919`/`#3217` dokumenterede løbet: 11:00 blev godkendt før kl. 12, hvorefter den gamle kode skiftede til 12:00 og stoppede sikkert på 630/673. Releasegate, Supabase og Pages blev ikke kørt.
- En ny regression simulerer timeskiftet, kræver at 11:00 bevares, kræver normal nutid uden lås og afviser en ikke-timeskarp værdi.
- Ingen land-/vandpunkter, kystlinjer, U/V, pilceller, scoreformel, kildeorden, afstandsgrænser, rollback eller 673/673-gate er ændret.
- Commit `668a1cdd` er på `main`. Normal ikke-tvungen kørsel `#32253251841`/`#3219` eksporterede 12:00 fra readiness, bar samme time gennem hele bygningen og bestod frisk 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy.
- Den direkte livekontrol af version 4.0.236/datasæt `rr-20260819123607-210` fandt 210 zoner, præcis 673 verificerede dele, virkelig byggetid 12:36 og særskilt `productionReferenceAt=12:00`. Kilderne er fortsat 622 DMI, 39 Baltic, fire AMM15 og otte godkendte `dkss_lf`-proxyer; alle 673 bruger de centralt godkendte land-/vandpunkter.
- Manuel pilot `#32257195240`/`#42` udvidede cachen til 27 gyldige timer med 625 mål, 629 mål/kilde-par og nul gitter-/lagustabilitet. Den efterfølgende normale `#32257480030`/`#3220` bestod hele kæden igen. Live `rr-20260819132304-210` bruger 13:00 som `productionReferenceAt` og har 210 zoner samt præcis 673/673 verificerede og scorede dele.
- GitHubs tre aktive native schedules oprettede ingen nye events efter cirka 11:58 UTC trods korrekte cronudtryk på standardbranchen. Det er registreret som et eksternt driftsmæssigt hold; cron-job.org må ikke deaktiveres, før et nyt naturligt GitHub-event igen er verificeret.

## 4.0.235-produktionsbevis indarbejdet

- Pushrun `#32249770288`/`#3216` bestod frisk central 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy.
- Live datasæt `rr-20260819115558-210` er metadata-, hash- og runtimekontrolleret med 210 zoner, 673 dele, 622 DMI-, 43 Copernicus- og otte godkendte proxyposter, `controlled-live`, 168 timers retention og `credentialsIncluded=false`.
- Den maskinelle præsentationsaudit gennemgik 420 aktuelle visninger og 2.100 femdøgnsvisninger. Alle bruger enten én komplet lokal kontekst eller en eksplicit sammenhængende hovedzonefallback. Direkte DOM-/kliktest afventer fortsat reparation af Codex-browserpluginets native host.
