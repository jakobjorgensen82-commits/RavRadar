# DEC-0075 – Regelværkstedet udgår som aktiv scorevej

**Status:** AKTIV – IMPLEMENTERES I 4.0.278

**Dato:** 2026-08-25

**Berører:** adminnavigation, rettigheder, ekspertarbejdsgang, offentlig scorekæde, produktionsworkflow og håndbøger

**Ændrer ikke:** Candidate G's 20/50/30-formel, 48-timers tilstand, scorekurver, vejrdata, zoner, geometri, land-/vandpunkter eller eksisterende centrale regeldokumenter

## Problem

Det tidligere Regelværksted gav indtryk af, at en administrator kunne skrive, teste og aktivere en regel direkte i den offentlige RavScore. Den kontrakt var ikke sand for Candidate G:

- værkstedets test brugte enkle aktuelle snapshots og højst et udsnit af zonerne,
- testen genafspillede ikke Candidate G's 48-timers historik,
- regelfortolkeren håndhævede ikke transport-nul, wadersloft og lokal fail-closed,
- den offentlige Candidate G-scorevej læste ikke regeltjenesten,
- og publiceringen kunne derfor hverken bevise eller sikkert gennemføre den lovede scoreændring.

Et sådant værktøj er mere risikabelt end nyttigt. Det kan få en fagligt rimelig tekst til at ligne en produktionsklar modelændring uden systemets samlede kontroller.

## Beslutning

1. Regelværkstedet og fanen til videns-/regelaktivering fjernes fra den aktive administration.
2. Rettighederne `rules_view`, `rules_edit` og `rules_publish` udgår af den aktive rollemodel.
3. Den offentlige app og produktionsworkflowet må ikke indlæse eller generere `rules/admin-active-rules.json`.
4. Candidate G 20/50/30 er fortsat den eneste offentlige scorevej. Der lægges ingen adminregel, adaptiv justering eller lokal browserregel oven i den.
5. Ekspertviden registreres i håndbogsreviewet uden scoreeffekt. En accepteret ændring går gennem testbar hypotese, bindende RDKS-beslutning, autoritativ Candidate G-kode, målrettede regressioner, exact-head-gate, frisk produktion og offentlig verifikation.
6. Eksisterende centrale og lokale regeldokumenter slettes eller omskrives ikke. De bevares som historisk arbejdsmateriale og må ikke indlæses af adminforsiden, publiceres eller påvirke RavScore.
7. `js/core/rule-engine.js`, de gamle regelfiler og analyseværktøjer kan bevares som historiske forskningsværktøjer i repositoryet, men må ikke beskrives som aktiv implementering og må ikke kopieres med i det offentlige Pages-artifact.
8. Ekspert- og systemhåndbog skal beskrive den faktiske aktive Candidate G-kæde og tydeligt markere ældre regel- og adaptive spor som historik.

## Kontrol

- Admin må ikke vise navigation til Regelværksted eller aktiv regelviden.
- Den aktive rettighedsliste må ikke indeholde de tre regelrettigheder.
- Workflowet må ikke generere den offentlige administratorregelfil.
- Pages-artifactet må ikke indeholde det pensionerede browserværksted, regeltjenesten, regelmotoren eller de gamle regelfiler.
- Offentlig regeltjeneste må ikke læse den tidligere fil.
- Releasegaten skal afvise, hvis en af disse aktive veje genindføres.
- Håndbogens scoreformel, tilstand, datakilder og sporbarhed skal stemme med den aktive kode.

## Erstattede beslutninger

Denne beslutning erstatter DEC-0018 punkt 4 og alle senere beskrivelser af et aktivt administratorstyret regelsæt. De øvrige dele af DEC-0018 om geografi og verificeret central lagring gælder fortsat.
