# DEC-0184 – Kritisk produktionsartifact-gate uden historisk testspiral

**Status:** Aktiv og bindende; den oprindelige 52+3-kæde er livebevist i
4.0.402. Den faktisk aktuelle normalplan har 55 bladkontroller og tre
særskilte releasekontroller; se tillægget 19. oktober. Den tidligere
54-plan og dens begrundelse bevares som dateret historik nedenfor.
**Dato:** 2026-09-17

## Præcisering 2026-10-19 — faktisk 55+3 og arkivgenstart

Den uændrede normale `validate:production-artifact` udvider på den faktiske 4.0.584-kilde til 55 bladkommandoer. Mod den ægte 54-plan på 4.0.551 (`e6b34db2d82d18b69fdeec21a63b8b10a6f6fa3d`) er eneste tilføjede blad `node scripts/test-current-arrow-land-mask.mjs` gennem `test:flow-arrow-runtime`; ingen blade er fjernet. Det er optælling af den eksisterende plan, ikke en ny kontrol, ekstra testbank eller ændring af `package.json`. De tre særskilte releasekontroller består.

En providerfri arkivgenstart beregner et nyt artifact fra gemte, autentificerede input og bruger derfor den normale artifactcollector og `release:gate:production`, ikke den brede historiske `validate`/`release:gate`. Begge collectorer forsøges også ved fund i den første. Denne særlige arkivgren kræver begge faktiske udfald bestået før SQL, ny B/S-publicering og Pages. Den almindelige vejrhentnings diagnostiske fortsættelse efter DEC-0193 ændres ikke; selvstændige target/main-, runtime-, databevarelses-, model-, privat-, artifact- og deploygrænser består.

Kun den særlige arkivgenstarts kode-only-job får et loft på 90 minutter; samme jobs almindelige kode-only-gren beholder 60 minutter (`inputs.restart_archived_weather == true && 90 || 60`). Ingen leverandørbudgetter, normal vejrhentning, cron, releaseversion, C/I/T eller SQL ændres af workflowrettelsen.

Status er lokal kildeforberedelse. Den seneste arkivgenstart bestod arkiv og normal beregning, men blev annulleret under bred validering omkring 60 minutter, før nyt leveringsartifact, B/S-publicering, SQL-installation eller Pages. Tidligere syntetisk kilde-/database-/nationalt bevis er ikke dette produktionsbevis; den nye præcise kildekontrol og den faktiske leveringskæde mangler fortsat.

## Præcisering 2026-09-30

Beskrivelsen af 52 bladkontroller nedenfor er den oprindelige 4.0.402-plan,
ikke den aktuelle plans størrelse. 4.0.438 udvidede `test:public-runtime`
med `test:public-hour-delivery-pack` og `test:current-provenance-sealing`
under DEC-0217. `validate:production-artifact` udvider dermed nu til 54
bladkontroller. Den hidtidige statiske assertion på 52 var forældet; 4.0.518
synkroniserer den med den faktisk kørte plan uden at tilføje eller fjerne
produktionskontroller.

## Baggrund

4.0.401 blev leveret gennem exact-head 35187093136, PR #345, main
82f4fb08ab14bf50fd4c285e0148f2ebb7666313 og providerfri code-only
35187388134.

Normalrun 35187767148 gennemførte DMI, Copernicus, Open-Meteo,
DMI-first-closure, syvdøgnshistorik, central vejrbygning, offentlig runtime
og den uafhængige runtimeaudit. Det stoppede bagefter i den brede
projektvalidering, fordi en gammel DMI-test stadig forventede 55 minutter,
900 sekunder og tre collections uden den allerede implementerede
extended-bootstrap-gren. Fejlen beskrev testen, ikke det byggede vejr- eller
scoreartifact.

Helkædegennemgangen viste 277 bladkontroller i npm run validate. Kæden
stoppede ved første fejl. Den efterfølgende fulde releasegate startede
desuden 44 historiske kilde-, Candidate G- og rollbacktests. Flere af disse
kontroller var enten allerede dækket før providerarbejdet eller kunne fejle
på gamle tekstforventninger uden at sige noget om det friske artifact.

## Beslutning

1. En almindelig kørsel med frisk produktionsdata bruger
   validate:production-artifact: 36 navngivne produktionsområder, som
   udvider til præcis 52 bladkontroller af data, vejr, forecast, geometri,
   scorevisning, startup, mobil, offentlig runtime, coverage, proveniens,
   retninger, vandkilder og lokal MISSING.
2. Alle 52 bladkontroller forsøges. Collectorens payloadfri rapport skrives
   løbende, bindes til den eksakte plan og fejler samlet efter sidste
   kontrol. Én fejl skjuler derfor ikke de resterende fejl.
3. Produktionsreleasekontrollen består særskilt af tre hurtige kontroller:
   eksakt releaseversion, aktiv RavScore-bundle og alle aktive
   modelbindingsforbrugere. Også disse udføres af collectoren og rapporteres
   samlet.
4. De øvrige 225 bladkontroller og den fulde 44-tests releasegate slettes
   ikke. De forbliver tilgængelige som fuld, målrettet, ugentlig eller
   kildekritisk kontrol, men genkøres ikke efter hver almindelig
   vejrindsamling.
5. Den uafhængige runtimeaudit, faktiske Supabase-/checkpointwrites,
   privat-runtime-integritet, Pages-artifactlukning, privacy-audit og deploy
   består som selvstændige hårde workflowtrin. En reel fejl i disse eller i
   de 52+3 kontroller stopper fortsat udgivelsen.
6. Releasekontrollen forsøges også, når artifactcollectoren har fundet fejl,
   så samme gennemløb giver begge rapporter. Senere writes og deploy sker
   fortsat ikke efter en kritisk fejl.
7. Stale DMI-tests synkroniseres med den eksisterende
   extended-bootstrap-kontrakt. Ingen DMI-runtime, collectionrotation,
   providerkilde eller datakrav ændres.
8. Browserens viste version må ikke have en hardkodet ældre fallback.
   app.js læser den versionssynkroniserede DOM-/runtimeversion og fejler
   tydeligt, hvis den mangler.

## Risiko og afgrænsning

Ejeren har udtrykkeligt godkendt, at de 225 øvrige validate-kontroller og de
44 historiske releasegatetests ikke længere blokerer hver normal
vejrleverance. Risikoen er, at en regression, som kun kan ses i en af disse
historiske tests, ikke opdages af netop den vejrleverance. Risikoen begrænses
af exact-head-sourcegate, målrettede tests ved ændringer, bevaret fuld suite
og de faktiske data-, runtime-, privacy-, artifact- og deploytrin.

DEC-0013 og DEC-0045s krav om fuld npm run validate og fuld
npm run release:gate efter hver frisk vejrbygning er supersederet af denne
beslutning. Deres krav om reel udgivelsessikkerhed, dataintegritet, privacy
og dokumenteret deployment består.

## Gennemførelsesbevis 2026-09-17

4.0.402 bestod exact-head `35203813380`, blev merged gennem PR #346 og kom
providerfrit online i `35204369048`. Normalrun `35205052150` gennemførte
alle provider-, cache-, closure-, historik- og runtimeled samt alle 52+3
kontroller. Det efterfølgende stop lå i adminsynkroniseringens udefinerede
`stableDigest` efter den validerede private runtime var gemt; det ændrer ikke
beviset for denne beslutnings produktionsgate.
