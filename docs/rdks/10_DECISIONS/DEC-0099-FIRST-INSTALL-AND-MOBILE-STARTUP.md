# DEC-0099 – Én prioriteret mobilopstart og let første service-worker-installation

- **Status:** Produktions- og fysisk verificeret i 4.0.303.
- **Dato:** 2026-08-28
- **Erstatter:** 4.0.302's parallelle manifest-/conditions-start.
- **Bevarer:** DEC-0098's historikretur og DEC-0092/0093's kompakte, indholdsadresserede startdata.

## Evidens

4.0.301 var funktionel på ejerens iPhone, inklusive retur via RavRadar-knappen på **Om RavRadar**, men første indlæsning tog cirka 14 sekunder. 4.0.302 paralleliserede kort-/kystprojektion med manifest og prognosestart. PR #207, exact-head og produktion var grønne på desktop, men fysisk iPhone Safari blev markant langsommere: cirka 30 sekunder koldt, 7–8 sekunder varmt og langsom første åbning af **Om RavRadar**. 4.0.302 er derfor fysisk afvist trods grøn CI.

Service workerens første installation kunne samtidig konkurrere med den synlige opstart ved at forhåndshente kortfilen og store Om-billeder. Når `clients.claim()` gav den nye worker kontrol, udløste den generelle `controllerchange`-handler desuden en fuld genindlæsning, selv om det blot var første installation.

## Beslutning

1. Den offentlige start bruger igen den dokumenterede sekvens: zoner/kystprojektion, dernæst frisk manifest og til sidst den eksakt manifestbundne startpakke. De store detaljedata forbliver behovsstyrede.
2. Første `controllerchange`, hvor en hidtil ukontrolleret side blot overtages af den nyinstallerede worker, må ikke genindlæse siden. En senere reel workeropdatering på en allerede kontrolleret side genindlæser fortsat højst én gang.
3. Første service-worker-installation må ikke forhåndshente den store kortfil eller Om-sidens responsive billeder. De hentes og cachelagres fortsat, når siden faktisk bruger dem.
4. Om-returen fra DEC-0098 bevares. Ingen timer, watchdog, nonce-navigation eller mobil hard reload genindføres.
5. Grøn desktop-CI er ikke fysisk mobilbevis. Kold og varm iPhone Safari samt den interne Om-retur skal godkendes af ejeren, før problemet lukkes.

## Produktionsbevis

PR #209 bestod exact-head `33178940206`/job `98874825239` på commit `23940e21` og blev merged som `19886fc0`. Produktion `33179036658`, build `98875217073` og Pages `98877901727` bestod central hydrering, frisk vejr/proveniens, fuld validering, releasegate, artifact og deploy. Offentlig 4.0.303 viste 210 interaktive zoner, fem **Bedste områder** og fem resultater på alle fem prognosedage; varm isoleret desktopstart var cirka 1,6 sekunder, første Om-åbning cirka 0,9 sekund og retur cirka 1,7 sekunder.

Ejeren bekræftede derefter korrekt version og fungerende Om-retur på fysisk iPhone Safari. Både kold og varm start tog 4–5 sekunder mod 4.0.302's cirka 30 sekunder koldt og 7–8 sekunder varmt. Kravet i punkt 5 er dermed opfyldt.

## Afviste alternativer

- Fortsat parallel opstart er afvist af den konkrete iPhone-latenstid.
- Endnu en automatisk reload eller timeout er afvist, fordi tidligere forsøg gjorde en færdig side langsommere eller tom.
- Kunstig opvarmning, privat payloadinspektion eller ændring af data/geografi er uden for problemet og forbudt.

## Grænser

Ændringen påvirker kun offentlig opstartsorkestrering og service-worker-cache. Candidate G, RavScore, vejr, prognoseværdier, sortering, konto-/turdata, assistent, privatliv, geometri og land-/vandpunkter er uændrede. Geodatafiler må kun få topversion 4.0.303. Sibirien forbliver privat staged og uaktiveret.
