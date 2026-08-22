# Strømstyret transporthukommelse i Candidate G

## Kort fortalt

Den nye private kandidat gør transportdelen mere direkte: indgående strøm bygger ravpotentiale op nær kysten, mens kraftig udgående strøm spiser af det fra første time. Bølger må hjælpe med den sidste levering over revle eller op på strand, men kan ikke selv transportere rav ind.

Ejeren har godkendt den præcise udtransportkurve: et potentiale på 100 falder med 8 point for hver effektiv time med fuld kraftig udgående strøm og når 0 ved 13 timer. Indgående fuld strøm bygger med 10 point pr. effektiv time og når 100 omkring 10 timer. Reglerne beregnes på 0–100 transportpotentiale, før Candidate G's private vægtning `20/50/30` anvendes.

Det er en bedre fysisk og forklaringsmæssig model end den tidligere generelle 24/48-timers forstærker. Den er dog endnu ikke klar til offentlig aktivering, fordi to kalibreringsvalg stadig flytter resultatet meget: grænsen for kraftig kystnormal strøm og reservoirværdien ved analysens begyndelse.

## Den godkendte mekanik

- Verificeret strøm mod kysten bygger potentiale.
- Verificeret strøm væk fra kysten reducerer potentialet straks.
- Fuld udtransport taber 8 point pr. effektiv time: 100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4 og derefter 0.
- Fuld indtransport bygger 10 point pr. effektiv time og når 100 efter cirka 10 timer.
- Svagere strøm giver en forholdsmæssig del af timevirkningen.
- Ikke-verificeret strøm pauser beregningen; den fortolkes hverken som god eller dårlig.
- Bølger alene giver nul transport.
- Bølgers og hændelsestimings samlede leveringskorrektion er begrænset til 15 procent og kan kun virke, når strømmen allerede har skabt et potentiale.

## Hvad replayet viser

Der er genbrugt 1.460 private evalueringer i den allerede flyttede, Git-ignorerede cache. Ingen nye rådata er hentet, og private rækker eller komplette kontrolsummer er ikke lagt i rapporten.

| Privat profil | Gennemsnitligt potentiale | 90-percentil | Maksimum | Candidate G-score mod reference |
|---|---:|---:|---:|---:|
| 0,05→0,20 m/s, start 0 | 7,246 | 41,563 | 63,549 | reference |
| 0,03→0,15 m/s, start 0 | 13,302 | 42,451 | 100 | +3,068 |
| 0,02→0,12 m/s, start 0 | 16,129 | 58,671 | 100 | +4,296 |
| 0,05→0,20 m/s, start 50 | 49,684 | 78,013 | 100 | +21,136 |

Referenceprofilen giver i gennemsnit potentiale 21,03 i de 436 indgående forløb og 0 i de 146 forløb med modgående strøm. Det er den ønskede retning. Langsstrømsforløb ligger lavt, fordi den kystnormale del er lille.

Samtidig er forskellen mellem profilerne for stor til at kalde en af strømgrænserne “rigtig” uden yderligere evidens. Warm-start-kørslen viser endnu tydeligere, at replayets begyndelsestilstand ikke er en detalje: en start på 50 flytter Candidate G-scoren mere end 21 point i gennemsnit.

## Afgrænset 24–48-timers kontrol

Analyseværktøjet understøtter nu et valgfrit passivt tab, men kun i timer med **verificeret neutral strøm**. Indgående og udgående strøm følger fortsat den godkendte 10-/8-pointsmekanik, og manglende strøm pauser fortsat modellen. Den passive regel er dermed en følsomhedskontrol, ikke en skjult ny produktregel.

| Privat profil, start 0 | Gennemsnitlig Candidate G-score | Forskel fra reference | Gennemsnitligt potentiale | Scorebånd ændret |
|---|---:|---:|---:|---:|
| Intet passivt tab | 31,052 | reference | 7,246 | 0 |
| Neutral halvering på 24 timer | 29,871 | -1,182 | 4,895 | 107 |
| Neutral halvering på 48 timer | 30,355 | -0,697 | 5,815 | 36 |

Det ser umiddelbart beskedent ud, fordi hovedkørslen starter fail-closed på 0. En startværdi på 50 eller 100 viser, at problemet ikke er løst: mod samme 24-timers halveringsprofil flytter den ukendte start stadig gennemsnitsscoren cirka 6,2 eller 11,1 point; ved 48 timer er forskellen cirka 11,2 eller 19,5 point.

En ny grænseaudit forklarer hvorfor. Alle 12 historiske hændelsesvinduer indeholder præcis 24 timer før evalueringens start, 72 timer efter og 96 timer i alt. Ingen har 48 eller 72 timers forhistorie. Hvis hele den ukendte startværdi lå i neutral strøm, ville der derfor stadig være 50 procent tilbage efter en 24-timers halvering og 70,711 procent efter en 48-timers halvering ved evalueringens begyndelse. Det er en matematisk randkontrol, ikke en antagelse om den faktiske strøm i perioden.

Denne begrænsning gælder den udvalgte historiske eventcache og må ikke forveksles med RavRadars separate offentlige mål om op til 72 timers strømhistorik. Replayet kan sammenligne regler på ens datagrundlag, men kan ikke alene vælge en fysisk 24- eller 48-timers levetid.

## Strømgrænsen kan heller ikke kalibreres her

Den eksisterende forskningsbase støtter kontinuerlig kystnormal retning og styrke, men giver ingen dokumenteret dansk ravgrænse i m/s. Replayet har samtidig nul evalueringer med fuld ind- eller udgående styrke ved referencegrænsen 0,05→0,20 m/s. Profilen 0,03→0,15 har nul fulde indgående og 10 fulde udgående evalueringer; 0,02→0,12 har to og 44. De 12 vinduer er udvalgt efter bølgehændelser og har ingen fund/nul-fund-labels. Lavere tærskler giver derfor mere modelaktivitet, men ikke bevis for større præcision.

Konklusionen er, at referencegrænsen fortsat kun er en forsigtig mekanisk prior. Den må ikke vælges, sænkes eller optimeres på dette replay alene.

## Hvad der er besluttet, og hvad der ikke er

Besluttet:

- strømmen er transportleddet;
- den eksakte 8-pointskurve for kraftig udtransport;
- cirka 10 timers opbygning ved fuld indtransport;
- bølger kan kun have en lille, afhængig landingsrolle;
- `20/50/30` er kandidatens private analyseprior;
- waders-vindkurven og jagtbarhedsloftet fra DEC-0054 fortsætter.

Ikke besluttet:

- om fuld styrke starter ved 0,12, 0,15, 0,20 m/s eller en anden dokumenteret værdi;
- hvordan det eksisterende potentiale rekonstrueres ved starten af en prognose eller et historisk replay;
- om neutral strøm skal give et passivt tab over 24–48 timer, og i givet fald hvor hurtigt;
- om modellen faktisk forudsiger ravfund bedre end den aktive score.

## Anbefaling

Behold den strømstyrede variant som det foretrukne private Candidate G-spor, fordi den matcher ejerens faglige forståelse og har tydeligere årsagssammenhæng. Aktivér den ikke offentligt endnu. Behold fail-closed start 0 og intet passivt tab som mekanisk reference, ikke som påstået naturregel. Brug 24- og 48-timers halvering som dokumenterede følsomhedsgrænser, indtil et mindst 72-timers forløb før evalueringen eller senere komplette ture kan skelne dem. Strømgrænsen kræver tilsvarende uafhængig fysisk eller fundbaseret evidens.

Offentlig RavScore forbliver `25/40/35`. Der er ikke ændret UI, data, geometri, land-/vandpunkter, artifact eller protected-dirty-data.

Efterkontrollen bestod exact-head-kildegate `32599255165` på `ed1f0297` og blev merged i PR #77 som `75ed93d6`. Den efterfølgende produktion `32599309735` bestod frisk vejr/proveniens, fuld validering, releasegate, Supabase og Pages. Live datasæt `rr-20260822212612-210` har 210 zoner og 673/673 scoreklare dele med sammenhængende dataset-id. Candidate G blev ikke aktiveret offentligt.

## Efterfølgende teknisk anbefaling efter ejerreview

Ejeren har bedt om et praktisk valg uden at foregive fundkalibrering. Den anbefalede private profil er derfor nu `0,03→0,15 m/s`, intet passivt tab ved neutral strøm og videreførelse af den kompakte afledte transporttilstand mellem produktionskørsler. Tilstanden består kun af tidspunkt, transportpotentiale og det igangværende effektive udtransportforløb; rå U/V, koordinater og private vejrserier indgår ikke.

Valget bygger på tre forhold:

1. `0,15 m/s` er allerede RavRadars aktive grænse for en velegnet absolut strømhastighed. Kandidaten bruger den mere præcist på den kystnormale del.
2. `0,05→0,20` er så forsigtig, at replayet aldrig når fuld styrke. `0,02→0,12` er så følsom, at 377 af 1.460 scorebånd ændres. `0,03→0,15` ligger mellem yderpunkterne og ændrer 213 bånd.
3. Neutral eller manglende strøm dokumenterer ingen udtransport. Et automatisk 24-/48-timers tab ville derfor fjerne potentiale uden observeret fysisk transport og svække ejerens krav om, at kortvarige eller svage ugunstige perioder ikke nulstiller et godt forløb.

Efter `RESEARCH-2`-nul-gaten giver den nye eksakte replaykontrol følgende score-neutrale sammenligning:

| Profil | Gennemsnitligt potentiale | Gennemsnitlig Candidate G-score | Ændrede scorebånd mod 0,05→0,20 |
|---|---:|---:|---:|
| 0,05→0,20, intet passivt tab | 7,246 | 28,291 | 0 |
| **0,03→0,15, intet passivt tab** | **13,302** | **31,360** | **213** |
| 0,03→0,15, neutral halvering 24 timer | 10,529 | 30,014 | 162 |
| 0,03→0,15, neutral halvering 48 timer | 11,743 | 30,619 | 178 |
| 0,02→0,12, intet passivt tab | 16,129 | 32,313 | 377 |

Ved den anbefalede profil er 0,03 m/s dødzone, 0,09 m/s halv styrke og 0,15 m/s fuld styrke. Det svarer til cirka 20 timers opbygning eller 26 timers udtransport ved 0,09 m/s og den godkendte 10-/13-timersadfærd ved 0,15 m/s. Værktøjet kan nu genoptage en kompakt tilstand på en ny kørselsgrænse og reproducerer den ubrudte 13-timerskurve eksakt.

Dette lukker kandidatens tekniske anbefaling, ikke den empiriske usikkerhed. Profilen er fortsat en forskningsprior, og offentlig aktivering kræver særskilt pipelinekobling, national slutkontrol, forklaring/rollback og ejerens aktiveringsbeslutning. Offentlig `25/40/35` er uændret.
