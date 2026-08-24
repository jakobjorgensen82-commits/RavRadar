# DEC-0069: Før-lancering ekspert-/adminlukning og synlig rangering

**Status:** Godkendt gennem ejerens før-lanceringsopgave 2026-08-24

**Scorepåvirkning:** Nej på lokale RavScore-tal, komponenter og farver. Ja på rækkefølgen i de to nationale top-5-lister.

## Problem

Før ekspertgennemgang og lancering skulle naturlig produktion, Supabase-kvote, adminfunktioner og håndbogen kontrolleres samlet. Kontrollen fandt desuden to konkrete brugerproblemer:

1. **Bedste områder** og **5-dages RavRadar** blev sorteret efter et skjult, korrigeret placeringstal, mens brugeren så den ukorrigerede RavScore. Derfor kunne en synlig score på 68 stå under 63 eller 86 under 81.
2. Adminens første lagringsoversigt viste `coastline-overrides` som fejl, fordi dokumentet blev vist i tabellen uden at indgå i den første helbredskontrol.

Håndbogens nyeste afsnit beskrev Candidate G korrekt, men arbejdsplanen, kodekapitlet, scenarierne og hypoteseregisteret indeholdt fortsat gamle 25/40/35-regler. Releasegaten krævede samtidig tre af de forældede tekster og beskyttede dermed fejlen.

## Beslutning

1. De nationale lister sorteres fortsat efter DEC-0049's `direction-broad-19-v1`, så områder med mange kyststrækninger ikke får flere lodder i lotteriet.
2. Det afrundede korrigerede tal vises som **områdescore**. Derfor står højeste viste tal altid øverst, mens den bedste kyststræknings almindelige RavScore fortsat vises, når området åbnes.
3. Begge lister forklarer kontrakten i almindeligt dansk.
4. Adminens standardkontrol skal omfatte alle fem dokumentområder, som den første tabel viser.
5. Den beskyttede ekspert-/adminhåndbog skal tydeligt skelne aktuel 20/50/30-sandhed fra historiske Candidate G-forberedelser.
6. Versionsværktøjet skal synkronisere hele den aktuelle webhåndbog ind i Supabase-installationsfilens startpayload. Et versionsnummer må ikke længere få en gammel håndbog til at ligne en ny.
7. Releasegaten skal kontrollere aktive Candidate G-markører og både den aktive motor og rollback-motoren. Den må ikke kræve forældet brugertekst for at bevise den historiske rollback.
8. Deploy må ikke overskrive godkendte centrale ekspertændringer i håndbogen. Den officielle kilde og den centrale håndbog trevejsflettes mod sidste kildebaseline. Ved den første overgang, hvor den lagrede baseline endnu ikke findes, må den tidligere produktionsverificerede 4.0.269-kilde fra den uforanderlige commit `d745e0ba4ad88dde91c308a9ad9810797f951c91` kun bruges som baseline, når dens SHA-256 matcher det tidligere beskyttede manifest. Kan den ikke hentes eller verificeres, stopper synkroniseringen sikkert.

## Kontrolgrundlag

- Naturlig produktion kontrolleres dataminimeret på den faktisk publicerede 210/673-runtime.
- Supabase kontrolleres på aggregerede kvotetal; private turpayloads læses ikke.
- Admin kontrolleres gennem målrettede kontrakttests og en autentificeret livevisning uden at oprette, ændre eller slette centrale ekspertdata.
- Geometri, land-/vandpunkter, private caches, artifact og protected-dirty-data er uden for ændringen.
- Produktion `32721891349` beviste den sikre stopadfærd: den centrale håndbog afveg fra den tidligere officielle kilde, og deploy blev afbrudt før Supabase- eller Pages-publicering, fordi første overgang endnu manglede en baseline.
- PR #123 bestod exact-head `32724526697` og blev merged som `00f59456`. Produktion `32724616331` bestod alle kode-, data- og releasegates, men stoppede før deploy, fordi den slanke Pages-pakke ikke udgiver `docs/handbook/content.json`. Et Pages-link er derfor ikke en gyldig kildebaseline.

## Erstattet beslutning

Den foreløbige idé om at gøre bedste enkeltstræknings RavScore til primær sortering blev forkastet efter ejerens præcisering, fordi den ville genindføre flere lotterilodder for store områder. DEC-0049 bevares fuldt; i stedet gøres den hidtil skjulte områdescore synlig.

