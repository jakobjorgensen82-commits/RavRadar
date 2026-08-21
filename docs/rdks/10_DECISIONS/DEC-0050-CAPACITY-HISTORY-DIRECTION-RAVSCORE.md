# DEC-0050: Kapacitets- og historikstyret retning i naeste RavScore-kandidat

**Status:** Aktiv forskningsbeslutning, ingen produktionsaktivering

**Dato:** 2026-08-21

**Scorepaavirkning:** Ingen

## Problem

Den aktive RavScore giver en stor retningsvirkning, naar der findes en stroemretning, men reducerer ikke virkningen tilstraekkeligt, naar stroemmen er meget svag. Et enkelt aktuelt tidspunkt kan desuden faa for stor betydning i forhold til det transportforloeb, som er bygget op gennem de foregaaende timer og dage.

Det samme princip gaelder vind. Vind kan paavirke havtilstanden gennem boelger, stroem og vandstand, men en direkte vindvirkning paa rav maa ikke antages at vaere lige stor ved alle styrker eller dobbeltregnes med de indirekte virkninger.

## Evidens

Exact-commit-koersel `32521046654` paa `64ee7b7a260cc7505b31a3a916fba5860aa66b0b` sammenlignede 1.460 par, hvor tidspunkt, styrker og historik var ens, mens boelge-, stroem- og vindretningen blev vendt kontrolleret.

Den aktive models gennemsnitlige paalands-minus-fralandsforskel var 30,450 point ved lav bevaegelseskapacitet og 30,327 ved hoej. Retningsvirkningen var altsaa naesten uafhaengig af, om havet reelt havde ringe eller stor flytteevne.

Kandidat E voksede fra 8,390 til 22,944 point, og kandidat F fra 9,364 til 27,011. De private kandidater reagerede dermed mere i takt med den fysiske bevaegelseskapacitet.

## Beslutning

1. Retningsfoelsomhed skal fremover testes med parrede modforloeb, hvor de oevrige forhold holdes ens.
2. En retnings virkning skal afhaenge af samtidig styrke og reel flytteevne. Svag stroem eller lav boelgeenergi maa ikke give samme retningsforskel som en kraftig haendelse.
3. Den naeste private kandidat skal bruge historik for stroemmens retning, styrke, varighed, stabilitet, vendingsalder og nettoeffekt med aftagende vaegt bagud i tiden.
4. En kort, svag vending maa kun aendre scoren lidt. En langvarig og kraftig vending skal kunne aendre den meget mere.
5. De samme historiske principper skal undersoeges for vind. Direkte vindvirkning behandles konservativt, mens indirekte virkning gennem boelger, stroem og vandstand bevares uden dobbeltregning.
6. Kandidat F med 15/50/35 afvises som direkte produktionskandidat, men beholdes som foelsomhedsmaessig yderkant.
7. Naeste private arbejdshypotese kaldes kandidat G. Dens foreloebige vaegtcentrum er 20 procent jagtbarhed, 45 procent transport og 35 procent mobilisering.
8. 20/45/35 er ikke en godkendt produktionsvaegt. Den skal analyseres sammen med de nye historikregler og kan flyttes, hvis den samlede evidens peger et andet sted hen.
9. Foer en ejerbeslutning skal resultatet fremlaegges grundigt i almindeligt sprog: hvorfor hver komponent har sin foreslaaede vaegt, hvilke data og fysiske argumenter der stoetter den, hvilke alternativer der blev afvist, og hvordan forskellige vejrsituationer paavirkes.

## Kandidat G

Kandidat G skal som minimum kombinere:

- den korrigerede procesmodel fra kandidat E;
- en mild fysisk flaskehals uden jagtbarhed i transportgaten;
- nul udokumenterede statiske bonuspoint fra rev, lavt vand eller aalegraes;
- kapacitetsstyret retning;
- historisk stroem- og vindhukommelse;
- et foreloebigt vaegtcentrum paa 20/45/35.

Kandidat G er score-neutral forskning. Den maa ikke skrive til offentlig runtime, administratorens data, geometri eller land-/vandpunkter.

## Obligatorisk validering foer mulig aktivering

- separate ablationer for stroem, boelger, direkte vind og samlet vindpaavirkning;
- svage og kraftige retningsvendinger med forskellig varighed og alder;
- historisk replay og den kanoniske nationale scenariematrix;
- national shadow mod den aktive model paa samme data;
- fuld afspilning af centrale ekspertregler og slutscorekaeden;
- separat kontrol af jagtbarhed og sikkerhed for vadejagt;
- sammenhaeng mellem pile, score, komponenter og brugerforklaring;
- ejerens udtrykkelige faglige go/no-go efter den forstaaelige vaegtforklaring.

Et groent teknisk job er ikke i sig selv godkendelse af en ny RavScore.

## Bevarede kontrakter

- Aktiv offentlig RavScore forbliver 25/40/35 indtil en senere godkendt release.
- DMI-first, fallbackregler, geometri og alle land-/vandpunkter er uændrede.
- Fuld 210/673-browserkontrol koeres foerst ved en relevant offentlig score-, UI- eller datakontraktaendring og efter produktion, ikke ved hvert privat forskningscheckpoint.

## Dokumentation

- `docs/research/RAVSCORE_PAIRED_DIRECTION_AND_WEIGHT_RESULT_2026-08-21.md`
- `docs/research/RAVSCORE_HISTORICAL_ACTIVE_F_COMPARISON_RUN_32498207764.md`
- `docs/research/RAVSCORE_PRELAUNCH_WEIGHTING_PRIOR_2026-08-21.md`
- `docs/research/RAVSCORE_MODEL_REGISTRY_2026-08-21.md`
