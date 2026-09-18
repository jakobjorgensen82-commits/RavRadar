# DEC-0193 – Normal weather udgiver gyldige prognoser trods kontrolfund

**Status:** Aktiv, bindende og livebevist i 4.0.410 gennem normalrun `35331664087`
**Dato:** 2026-09-18

## Evidens

4.0.409 bestod exact-head `35318809153`, blev merged gennem PR #353 som
main `013baac897e2158d316301abd04193442c3a0ddb` og kom online gennem den
providerfrie kørsel `35320190547`.

Den efterfølgende almindelige weather `35320738621` gennemførte DMI,
Copernicus, Open-Meteo, closure, syvdøgnshistorik, central weather,
proveniens og offentlig runtime. Dermed er 4.0.409-rettelsen bevist: den
tidligere `RAVSCORE_RECOVERY_REPLAY_CONFLICT` kom ikke igen.

Kørslen stoppede derefter i runtimeauditten. Alle 673 kystdele gav den samme
brede, payloadfrie kategori `LAST_MILE_STATE`, og 420 aktuelle modes var
utilgængelige. Fordi auditten var et hårdt stop, blev de efterfølgende
uafhængige kontroller ikke kørt, og de ellers friske vejrdata blev ikke
udgivet. Den gamle rapport blev ikke uploadet i normalruten, så den præcise
underkategori kan ikke bevises bagudrettet.

## Beslutning

1. En almindelig weather skal forsøge alle uafhængige kontroller og samle
   deres resultater i én payloadfri driftsrapport.
2. Fejl i runtimeaudit, produktionsartifact-validering, releasegate,
   backend-readiness, datavalidering, trip-readback, implementeringsaudit og
   stationsinventar registreres som fund. De må ikke alene forhindre, at et
   ellers sikkert artifact med friske, gyldige vejrdata bliver udgivet.
3. En lokal RavScore-/statefejl må gøre den berørte score utilgængelig, men
   må ikke blokere gyldige prognoser eller resten af RavRadar. Fejlen forbliver
   synlig og prioriteret til efterfølgende rettelse.
4. Gyldige nye komponenter erstatter gamle. Ved et nyt hul bevares den gamle
   gyldige komponent for samme sted og time. Først når begge mangler eller er
   udløbet, bliver feltet lokalt `MISSING`.
5. Hårde sikkerhedsgrænser består: eksakt og ikke-regressivt produktionstarget,
   eksakt main, byggeligt artifact, beskyttet statekontinuitet, ingen privat
   payload i Pages og et forseglet deployhandoff. Fejl her udgiver ikke et
   usikkert artifact; den eksisterende offentlige pakke bliver stående.
6. En kørsel må ende som rød eller `DEGRADED`, efter at et sikkert artifact er
   udgivet. Det er bevidst: fejlene skal være synlige uden at gøre prognoserne
   gamle.
7. Normal scheduler genaktiveres først efter én fuld normal kørsel, hvor den
   nye fortsættelse, rapporten, deployet og den levende side er verificeret.
8. 4.0.410 ændrer ikke RavScore-formel, vægte, modelbundle, geometri,
   land-/vandpunkter eller kildeprioritet.

## Verifikation

Livebeviset er gennemført. Run `35331664087` fortsatte efter den røde
runtimeaudit, gennemførte de øvrige kontroller og deployede/verificerede Pages
med 210 zoner og 673 kystdele. Den sene centrale reseal fejlede bagefter og er
rettet særskilt i DEC-0194; det ændrer ikke, at selve prognosedeployet og denne
beslutnings fortsættelseskrav blev bevist.

Kildeændringen skal bestå de målrettede workflow-, opsamlings- og
replayklassifikationstests samt én exact-head sourcegate. Efter merge køres
først providerfri kodebinding og derefter én almindelig weather på de gemte
cacher. Den skal fortsætte efter et eventuelt replayfund, uploade både
runtimeaudit og samlet driftsrapport, bygge/deploye et sikkert artifact og
afsløre den præcise last-mile-underkategori. Scheduler forbliver pauset, til
det livebevis foreligger.
