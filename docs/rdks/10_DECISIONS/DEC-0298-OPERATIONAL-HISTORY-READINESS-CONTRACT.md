# DEC-0298 – Operationel kontrol af historikvindue og scoreusikkerhed

**Dato:** 2026-10-30
**Status:** AKTIV afgrænset beslutning; kritisk 591-kvalifikation i PR758 er særskilt, og videreførelsen i den fremtidige 592-kilde har egne åbne kvalifikations- og leveringskrav.

## Påvist kontraktmodstrid

Den undersøgte almindelige 591-kørsel gennemførte beregning, privat gemning og Pages-deploy. En frisk lille offentlig manifest var helt byteidentisk med den forventede manifest i det forseglede handoff. Den normale private audit var bestået og forventede samme profil som producenten: modelCoverageReady=true, modelMemoryReady=true, modelMigrationReady=true og advisories=[]. Efterfølgende deployverifikation afviste alligevel profilen som uforenelig med historikkontrollerne.

Den aktuelle availability ved fælles H0 angav 210 aktive zoner, ingen utilgængelige zoner, 420 zone-/søgemådevalg markeret med ufuldstændig historik og ingen FULL_HISTORY. Alle 210 samlede historikposter angav 48 timers dækning og alene WAVE_MOBILISATION_HISTORY_INCOMPLETE. Den normale availability-builder vælger præcis current-rækken ved evaluatedAt; dette er ikke en optælling af alle 118 fremtidige timer.

Producent og normal privat audit skelner mellem et dækket current-supply-vindue, parathed i de tre hukommelsestilstande og usikkerhed i scoren fra tidligere bølge- eller last-mile-påvirkning. Den hidtidige deploykontrol antog derimod, at ethvert HISTORY_INCOMPLETE kræver modelMemoryReady=false. Den antagelse er påvist for bred i dette forløb.

## Præcis kontrolrettelse

I assertOperationalProfileControls udledes currentHistoryWindowIncomplete af de eksisterende poster i availability.historyIncompleteZones. Der er et reelt kort vindue, når mindst én historyCoverageHours er mindre end RAVSCORE_CURRENT_SUPPLY_POLICY.windowHours minus den afgrænsede tolerance 1e-12. Det erstatter alene brugen af enhver HISTORY_INCOMPLETE-markering som en krævet ikke-klar hukommelse.

En profil med et reelt kort strømvindue og modelMemoryReady=true afvises fortsat; den oprindelige 24-timers negative kontrol bevares. Normale positive tilfælde med fuldt vindue og WAVE_MOBILISATION_HISTORY_INCOMPLETE eller LAST_MILE_HISTORY_INCOMPLETE kan derimod bevare både klar profil og deres eksisterende kvalitetsusikkerhed. Den normale verifiermålprøve er bestået efter rettelsen; dette erstatter ikke den præcise samlede kildekontrol.

Alle øvrige krav bevares: eksakt model-/profilbinding og hash, eksplicitte booleanflag, den normale availability-validering, all-parts-dækning i forhold til brugbar zone og den præcise advisory-liste afledt af flagene. Rettelsen gør ikke en forkert profil, forkert kilde, manglende score eller modstridende advisory gyldig. Den ophæver ikke kvalitets- eller historikforbehold og ændrer ikke numeriske scorer.

## Faktiske udfald og ingen automatisk genoptagelse

Udført Pages-deploy, en offentlig manifest som matcher målet, godkendt fuld efterkontrol og afsluttende terminal kvittering er forskellige fakta. De to første blev observeret; de sidste blev ikke godkendt i det fejlede forløb. Manifestlighed alene beviser ikke hele den offentlige JavaScript-implementering. Ingen samlet fuldført-kørsel-påstand må udledes af den ene grønne deployhandling.

Den tidligere checkpointgenoptagelse var en foreløbig plan og er trukket tilbage, fordi nye data allerede er offentlige. Denne beslutning udløser ingen genoptagelse, ny vejrhentning, beregning, ekstra deploy, scorenulstilling eller historikreset. ROOT afklarer ukendt offentligt og centralt skriveudfald og koordinerer enhver senere normal handling.

Den manglende auditrapport i et tidligere forløb er en særskilt sag: DEC-0297s kopireduktion og faste fejlkvitteringer bevares, men den præcise tidligere udløser er stadig ubevist. Den må ikke sammenblandes med denne nu påviste efterkontrolmodstrid. Den aktive nativefasetype kan ikke genbruge et tidligere fasebevis gennem den eksisterende normale genbrugslæser; et gammelt artifactnavn eller uændrede 104 modelinput/SQL er ikke tilstrækkeligt bevis.

## Bevarelse og leveringskrav

Den kritiske rettelse kvalificeres særskilt på 4.0.591 i PR758. Denne fremtidige 4.0.592-kilde bevarer sin egen faktisk udstedte C/I/T, allerede udstedte migration og alle historiske SQL-filer, originaler, offentliggjort scorehistorik, administratorpunkter, geometri, kildeprioritet og scoreformel. Kontrolvidereførelsen udsteder ingen yderligere version, model eller SQL-overgang. Den gennemgåede reservekøs 600 sekunder, 800 faktiske HTTP-forsøg inklusive genforsøg, 150 ms mellem starter og to transporter bevares, ligesom den særskilte auditressourceforbedring.

Præcis kildekvalifikation og sikre leveringsvilkår uden en aktiv skrivende proces kræves fortsat. Faktisk efterfølgende normal offentlig verifikation og terminal kvittering skal dokumenteres, før den nye kontrolvej kaldes produktionsverificeret. Fuld femfamiliedækning, komplet historik og selvstændig drift er stadig særskilte åbne krav. Alle fem RavRadar-mål består.

Håndbog 89.284 tilføjes fra kanonisk Markdown og spejles til web og normal INSTALL-håndbogspayload. Alle 535 tidligere 592-afsnit bevares uændret, herunder 89.279, 89.282 og 89.283. De afgrænsede assistent-, observations-, kompakte delings- og auditressourceændringer bevares uden omskrivning. Den isolerede SOURCE-revision aktiveres ikke. 592 er fortsat ikke offentligt leveret. Konkrete driftsidentiteter, målinger og aktuelle skriveudfald ligger i privat checkpoint.
