# RavRadar 4.0.355 – den store private runtime læses kun én gang

## Resultat

- 4.0.354-head `ef9b74805fff5165ff1784329407498d0892b43f` bestod exact-head-sourcegate `34757328149` og blev merged gennem PR #291 som main `78c083e8fee76beb82c2a0d14fb9a2001d795ec2` med identisk filtræ.
- Cachefortsættelse `34758328372` gendannede fire eksakte cacher og genbyggede runtime uden provider, oneoff eller ny 210/673-audit.
- Schema-2-pakningen passerede i real-skala alle rå-, del-, antal- og samlet arkivgrænser.
- Runnet stoppede derefter, fordi den allerede parset og modelkontrollerede `data/live/conditions.json` blev læst igen gennem en særskilt 16-MiB-evidensgrænse.

## Rettelse

- De syv krævede measured-warmup-felter kontrolleres nu under `buildPrivateRuntimeCreateSpec`'s første og allerede nødvendige fulde parse.
- Kapacitetsmålingen modtager kun den afledte boolean. Den serialiserede create-spec beholder sin eksisterende form med metadata og filliste.
- Conditions-attestering accepteres kun fra den eksakte produktionsfil i samme build. Den lille auditrute beholder sin 16-MiB-grænse.
- Regressionstesten bruger en fil over 16 MiB og beviser, at der ikke sker en anden bounded læsning.

## Uændret

Vejrdata, sourceorder, RavScore, modelbindinger, migrationer, geometri, 210/673/118, 768-MiB/2-GiB-arkivgrænser og 50-MB/350-MB/8-objektgrænser er uændrede. Ingen oneoff planlægges.

Næste trin er én exact-head-4.0.355-sourcegate, merge og samme cachefortsættelse til samlet kapacitetsrapport og handoff; derefter fuldt gated cutover og offentlig/site-/normaldriftskontrol.
