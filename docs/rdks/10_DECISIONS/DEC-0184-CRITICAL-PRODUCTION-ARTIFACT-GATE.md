# DEC-0184 – Kritisk produktionsartifact-gate uden historisk testspiral

**Status:** Aktiv og bindende; implementeret og måltestet lokalt i 4.0.402,
exact-head og livebevis afventer
**Dato:** 2026-09-17

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
