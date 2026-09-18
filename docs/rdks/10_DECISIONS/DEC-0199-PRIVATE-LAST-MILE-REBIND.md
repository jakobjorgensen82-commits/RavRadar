# DEC-0199 – Kendt last-mile-reparation må passere privat ombinding

**Status:** Aktiv; ombindingen livebevist i `35351928923`, efterfølgende afledt scorekæde overtages af DEC-0200
**Dato:** 2026-09-18

## Evidens

4.0.415 bestod exact-head `35348220691`, blev merged gennem PR #359 som main
`3a705259`, og saved-weather `35349088863` accepterede korrekt
`integrated-historical-maintenance`. Kørselen stoppede derefter sikkert, fordi
den beskyttede targettime ikke var strengt nyere end den offentlige 09:00-time.

Den korrekte samme-time code-only-kørsel `35349313096` gendannede den eksakte
4.0.410-private runtime, men stoppede i ombindingen. Denne runtime stammer fra
`35331664087`, hvor alle 673 continuations havde den allerede afgrænsede
last-mile-envelope-fejl. Omdanneren krævede stadig, at hver continuation først
bestod forgængerens gamle validator, før den aktuelle 4.0.411+-validator fik
lov at udføre den kendte deterministiske reparation.

## Beslutning

- Forgængerens validator forsøges fortsat først.
- En afvisning må kun fortsætte, når den aktuelle validator accepterer state som
  `INTEGRATED_CONTINUATION` og returnerer en kanonisk reparation.
- Reparationens diff må kun ligge under
  `historyBounds.lastMile.minimumFactorTrack` og
  `historyBounds.lastMile.maximumFactorTrack`. Modelbindingens eksisterende
  hashskifte er fortsat separat tilladt.
- Alle andre ændringer i state, vejr, målinger, geometri eller Candidate G
  stopper ombindingen.
- Ens fejl samles efter fejltekst og tælles. Hundredvis af ens fund må ikke
  længere danne én loglinje, som GitHub skjuler.
- Den skriftlige migrationsrapport bevarer sin eksakte payloadfrie kontrakt.
  Den private payload logges eller uploades aldrig.

## Afgrænsning

RavScore-formel, vægte, modelbundle `039abdfe...`, vejrdata, providerorden,
geometri og land-/vandpunkter ændres ikke. Scheduler forbliver pauset, og der
køres ingen oneoff. Efter providerfri levering skal én almindelig vejrkørsel
og efterfølgende vedligeholdelse bevise stabil drift.
