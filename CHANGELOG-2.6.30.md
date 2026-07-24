# RavRadar 2.6.30

## Administratorpanel
- Ét administratorniveau bag 10 tryk på logoet og PIN 1931.
- Nyt fanebaseret kontrolcenter: overblik, regelværksted, gode råd, vejr/vandstand, zoner, observationer og system.
- Administrationen låses til den aktuelle browsersession.

## Regelværksted
- Opret, redigér, kopiér, deaktivér og slet administratorregler.
- Intuitiv opbygning med almindelige danske betegnelser.
- Betingelser for vindstyrke, vindretning, bølgehøjde, vandstand, jagtform, grundscore og tid efter kraftigt vejr.
- Geografi: hele Danmark, kysttype eller bestemte zoner.
- Effekter: bonus, fradrag, persistence, gate, fast score og råd uden score.
- Kilde, tillidsniveau (lav/mellem/stor), videnstype, noter, prioritet og forklaring.
- Indbygget testsimulator mod valgte zoner og vejrforhold.
- Lokal versionshistorik samt JSON-import og -eksport.
- Aktive administratorregler indgår direkte i browserens regelmotor.

## Gode råd
- Særskilt, enkel arbejdsgang til erfaringer fra dygtige ravjægere.
- Råd kan gemmes som annotationer uden at påvirke score og senere kopieres til en egentlig regel.

## Drift og data
- DMI-status, alarmkvote, datakilder og vandstandsinterpolation vises, når data findes.
- Søgbar zoneliste og pseudonymiseret observationseksport.
- Diagnostikeksport og sikker rydning af kun RavRadar-caches.
- Vejrsnapshots i observationer berøres ikke af cache- eller retentionfunktioner.

## Validering
- JavaScript-syntaks valideret.
- Projektets samlede npm-validering bestået: 223 zoner, scoremotor, regelmotor, weather-health, 214 aktive kystlinjer, zoneplan og vidensbase.
- Den medfølgende cache indeholder 0 aktuelle vejrzoner; de genereres centralt af GitHub Actions.
