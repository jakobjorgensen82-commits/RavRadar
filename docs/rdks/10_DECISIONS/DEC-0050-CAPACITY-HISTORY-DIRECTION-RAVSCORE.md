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

## Resultat af foerste historikhukommelsesanalyse

Den foerste score-neutrale koersel paa 12 eksisterende 96-timersforloeb har afproevet 6, 12, 24 og 48 timers eksponentiel hukommelse for stroem, boelgeenergi og vind.

6 timer reagerer kraftigt paa en enkelt svag modtime og er ikke foerstevalg til et flerdages transportforloeb. 24 timer er den foreloebige aktive regimeshortlist, mens 48 timer er den foreloebige langsomme baggrundsshortlist. Ingen af dem er en godkendt produktionskoefficient.

Naeste kandidat G-test skal sammenligne 24 timer alene, 48 timer alene og en lille matrix af dobbelte spor. Stroem, boelger og vind skal ablateres separat, og hvert forecasttidspunkt maa kun bruge historik frem til det paagaeldende tidspunkt. Se `docs/research/RAVSCORE_REGIME_MEMORY_RESULT_2026-08-21.md`.

## Resultat af 24/48-matrix og separate ablationer

Den kausale matrix paa de samme 12 historiske forloeb viser kun 1-2 procent direkte fortegnsuenighed mellem 24- og 48-timerssporene. 48 timer reducerer stroemsporets fortegnsskift fra 14 til 10; de oevrige spor er mere ens. Yderblandingerne 75/25 og 25/75 tilfoejer ikke en tydelig selvstaendig adfaerd.

Naeste historiske kandidat-G-replay afgraenses derfor til 24 timer alene, 50/50 og 48 timer alene. Det vaelger ikke en produktionskoefficient.

Ablationen viser samtidig betydeligt boelge-/vindoverlap inden for haendelser. Lineaer vind er den konservative hovedanalyse, mens vindstressproxy kun er en foelsomhedsmaessig yderkant. En variant uden direkte vind er obligatorisk, foer et direkte vindbidrag kan foreslaas; direkte og indirekte vind maa ikke summeres som fulde uafhaengige bidrag.

Ingen point, aktiv score eller offentlig kontrakt er aendret. Se `docs/research/RAVSCORE_HISTORY_TRACK_ABLATION_RESULT_2026-08-22.md`.

## Resultat af historisk kandidat-G-replay

Kandidat G er nu implementeret som en score-neutral forskningsfunktion med stabile ID'er for 24 timer, 50/50, 48 timer og den obligatoriske 50/50-variant uden direkte vind. Historik multiplicerer kun en eksisterende transport-/leveringsvej og kan derfor ikke skabe transport ved nul fysisk kapacitet.

Replayet omfatter 1.460 evalueringer på de 12 private forløb. 24 og 48 timer adskiller sig kun 0,064 point absolut i gennemsnit og højst ét point. 50/50 bruges derfor som praktisk shadow-repræsentant, mens enderne bevares som følsomhedsgrænser.

G 50/50 ligger i gennemsnit 1,492 point under aktiv model, men skifter referencebånd i 474 af 1.460 evalueringer og spænder fra 32 point under til 24 point over. Ved lav kapacitet ligger den 3,405 point under kandidat E; ved høj kapacitet ligger den 0,876 point over. Det støtter kapacitetsprincippet, men viser også, at aktivering ville være en væsentlig modelændring.

Direkte vind flytter kun 0,086 point absolut i gennemsnit og højst ét point. Den foretrukne næste beslutningsvariant er derfor 50/50 uden direkte vind, indtil et selvstændigt direkte signal kan dokumenteres. 20/45/35 og historikgain 0,40 forbliver forskningspriorer.

Den kanoniske rotationsmatrix består 176 score-neutrale scenarier og bekræfter nul historikskabt transport ved nul kapacitet. Den afslører samtidig en aktiveringsstopklods: et ekstremt waders-forløb kan have jagtbarhed 0 og kandidat-G-score omkring 79. Ejerbeslutning om betydning, UI og forklaring er obligatorisk; en skjult ny gate maa ikke indfoeres.

Den versionsbundne offentlige ekspertregelkaede har nul aktive regler og flytter derfor ingen af de 1.460 scorer. Den centralt hydrerede nationale shadow `32554012542` paa PR #59's eksakte head fandt ligeledes nul aktive regler og gennemfoerte 673 aktive dele/210 zoner uden offentlige aendringer. 243 dele gav 486 scorecontexts, mens 430 forblev eksplicit u-scorede; retention-featurecoverage var nul. G 50/50 laa i gennemsnit 5,50 point under aktiv model for strand og 3,74 for waders. 24/48 og no-direct-wind var fortsat praktisk identiske. Kandidat G maa ikke aktiveres, foer pil-/forklaringskontrakten, waders-betydningen, coveragebegrænsningen og ejerens go/no-go er afsluttet.

Samlet beslutningsgrundlag: `docs/research/RAVSCORE_CANDIDATE_G_DECISION_BASIS_2026-08-22.md`.
