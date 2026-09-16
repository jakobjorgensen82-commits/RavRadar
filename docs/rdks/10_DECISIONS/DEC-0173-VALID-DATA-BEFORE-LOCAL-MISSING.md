# DEC-0173 – Gyldige gamle vejrdata går altid forud for lokalt MISSING

**Status:** Aktiv og bindende; implementeres i 4.0.391, exact-head- og livebevis afventer
**Dato:** 2026-09-16

## Baggrund og evidens

4.0.390 blev merged som main `2dcf571a00572ddd67a9fe18dd077d8c97336a7f`.
Den forlængede providerbootstrap `35081537023` gennemførte DMI, Copernicus
og Open-Meteo og gemte deres fremgang. Open-Meteo-diagnostikken viste 84
uløste par fordelt på 21 kystdele. Alle 84 var forsøgt, og tidsbudgettet var
ikke nået. De var provider-negative i den konkrete passage.

Den hidtidige globale nul-missing-gate stoppede derefter hele buildet. Det er
strengere end RavRadars allerede besluttede lokale availability-kontrakt og
kan samtidig få en ny tom eller modstridende levering til at skygge for en
ældre, stadig gyldig værdi. Det er ikke den ønskede produktadfærd.

## Bindende beslutning

1. Nye gyldige data erstatter gamle data.
2. Ved et hul beholdes gamle data for præcis samme sted og tidspunkt, så
   længe de stadig er gyldige.
3. Først når både nye data mangler og den gamle værdi er udløbet, bliver
   feltet `MISSING`.
4. Et lokalt `MISSING` må ikke gøre resten af RavRadar ubrugelig.

Reglen gælder for alle vejrkilder og alle normale, manuelle og genoptagne
vejrkørsler. En ny tom, ugyldig eller indbyrdes modstridende levering må
aldrig slette eller skygge for en ældre, entydig og fortsat gyldig værdi for
det samme `(partId, validTime)`.

En gammel værdi er gyldig, når dens eget prognosetidspunkt stadig ligger i
det aktive 118-timersvindue, og dens identitet, kilde, enhed, fysik,
proveniens og øvrige eksisterende valideringskrav fortsat består. Datoen,
hvor værdien blev hentet, udløber ikke i sig selv en prognoseværdi, som stadig
gælder det samme fremtidige tidspunkt.

Kildeprioriteten består: DMI → Copernicus Baltic → Copernicus AMM15 →
regional DMI → Open-Meteo. En ny gyldig værdi fra en højere prioriteret kilde
overtager. Inden for samme kilde vælges den nyeste entydige gyldige levering;
hvis den nyeste levering er tom eller modstridende, prøves en ældre gyldig
levering for det eksakte par før næste kilde og før `MISSING`.

## MISSING og komplethed

Det autoritative domæne er fortsat præcis `673 × 118 = 79.414` identiteter.
Hver identitet skal være repræsenteret af enten én valideret værdi eller én
eksplicit `MISSING`-tilstand. `79.414` repræsenterede identiteter er derfor
ikke det samme som `79.414` numeriske værdier.

RavRadar arbejder fortsat mod nul `MISSING`, og kun nul `MISSING` må kaldes
et komplet vejrdatasæt. Et ærligt lokalt `MISSING` gør kun den berørte
kystdel, søgemåde og time utilgængelig. Andre dele og timer med gyldige input
skal fortsat beregnes, vises og kunne bruges.

Hvis mindst én anden kystdel i samme zone og time har en gyldig score, vises
zonens score ud fra de gyldige dele som `partial-zone`. Det oplyses tydeligt,
hvor mange dele der indgår, og de manglende dele regnes ikke med. Resultatet
må ikke bruges til kalibrering, og vinderen markeres som usikker, fordi en
manglende del i princippet kunne have været bedre. Først når ingen kystdel i
den konkrete zone, søgemåde og time har en gyldig score, bliver zonescoren
utilgængelig.

Hvis mindst én anden kystdel i samme zone og time har en gyldig score, vises
zonens score ud fra de gyldige dele som `partial-zone`. Det oplyses tydeligt,
hvor mange dele der indgår, og de manglende dele regnes ikke med. Resultatet
må ikke bruges til kalibrering, og vinderen markeres som usikker, fordi en
manglende del i princippet kunne have været bedre. Først når ingen kystdel i
den konkrete zone, søgemåde og time har en gyldig score, bliver zonescoren
utilgængelig.

Manglende data er ikke nul, må ikke opfindes, lånes fra en anden kystdel eller
skjules som en ny måling. Strukturel korruption, forkert identitet, ugyldig
proveniens, overlap eller kontraktbrud er fortsat globale stopfejl og må ikke
omklassificeres til et uskadeligt lokalt `MISSING`.

## Erstatning af ældre krav

Denne beslutning erstatter kun de dele af DEC-0172 og kravene
`REQ-4.0.390-HARD-CLOSURE-001`, `REQ-4.0.389-CLOSURE-001` samt tidligere
strict-79.414/nul-missing-krav, som forbød build og deploy ved et ærligt
lokalt `MISSING` efter udtømt gyldig fastholdelse.

Den erstatter ikke målet om fuld dækning, kildeprioriteten, de eksisterende
data- og sikkerhedskontroller eller kravet om ærlig status. Scheduler forbliver
pauset, indtil 4.0.391 er merged og én normal vejrkørsel har bevist både
fastholdelse, lokal `MISSING` og brugbare resterende scorer.

Closure-v3 ændrer den forseglede integrerede bundle og continuationidentitet.
De føres derfor frem i det nye reproducerbare append-only migrationsled
`20260916120000_valid_data_before_local_missing_binding.sql`; ingen tidligere
migration omskrives.
