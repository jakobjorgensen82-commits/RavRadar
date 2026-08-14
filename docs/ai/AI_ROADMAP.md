# AI Roadmap – RavRadar efter 4.0.208

Roadmappet prioriterer stabilitet og verificerbarhed før nye features. Status skal løbende flyttes til RDKS, når noget implementeres.

## Afsluttet P0 – lokal snapshotdiagnose

- Lokal validering kan nu skelne et udløbet repositorysnapshot fra en aktuel produktionsfejl uden at acceptere manglende zoner.
- Den skrivebeskyttede deployaudit har bekræftet 210/210 aktive zoner og vejrdata til alle tre Vadehavszoner.
- En fuld frisk validering følger fortsat den bindende rækkefølge: central adminhydrering og tombstones, nyt/hydreret vejr, fuld `validate`, releasegate og først derefter artifact/deploy.
- Næste aktive udvikleropgave ændres ikke: DMI-first femdøgnskæderne under DEC-0030.

## P0-ejerreview – ét land-/havpunktpar pr. kyststrækning

- Hver af de 673 aktive kyststrækninger har præcis ét autoritativt hav-/landpunktpar. Admin må kun flytte det eksisterende par; ekstra aktive par og automatisk national genopdeling er fravalgt i DEC-0037.
- En skrivebeskyttet retningsaudit har flagget 199 kontrolkandidater i 122 hovedzoner. Det er en prioriteringsliste, ikke 199 beviste fejl, fordi 171 kandidater er fragmenterede `MultiLineString`-dele.
- Ejeren gennemgår senere zonerne gradvist og placerer parret repræsentativt på bugtede dele. Arbejdet blokerer ikke uafhængige roadmapopgaver, men skal være afsluttet før endelig faglig godkendelse af alle lokale scorer, større scorekalibrering og domæne-/brugerrelease.
- En flytning bliver først aktiv efter central readback og grøn efterfølgende DMI-/releasekørsel. Afvist validering må ikke aktivere kladden.

## Næste aktive udvikleropgave – DMI-first femdøgnskæder

- Fortsæt P1-audit og design under DEC-0030 for vind, bølger, strøm, vandstand og øvrige viste/scorede komponenter.
- Dokumentér først faktisk dækning, provenance, overgangskvalitet og regressionsplan. Indfør ikke ny produktionskilde, fallback eller scoreændring før denne analyse er afsluttet og godkendt.
- Supabase-egress overvåges gennem næste billingperiode. Den private, dataminimerede besøgstæller med enkel adminrapport er fortsat P2.

## Afsluttet P0 – privat land-/vand- og fallbackkandidat teknisk verificeret

- 4.0.206 er produktionsverificeret i #31831068809. Målrettet roundtrip #31822371489 og fuld privat #31829349458 beviser den centrale retry-/rollbackkontrakt og hele den friske nationale slutkæde.
- Den aktuelle 17-dels fallback har et frisk eksternt 10-meterbevis med 11 verificerede, fire sikre vendinger og to blokerede dele. #31829349458 beviser nul overlap, 2/2 ejerskabsflytninger, 9/9 erstatninger, fallback-DMI og artifacts på en ren runner efter tidligere aktivering.
- Det tekniske P0 er afsluttet. Næste geometrihandling er ikke mere automatisk bygning, men en særskilt ejerafgørelse om den private kandidat. Ingen aktivering må ske uden den beslutning.

- Offentlig 4.0.204 er produktionsverificeret i #31815039302. Privat #31815423082 bestod hele den tunge 835-dels geometri-, DMI-, state-, vind-, shadow- og reviewkæde og stoppede kun ved en enkelt central `PGRST303`-læsning.
- 4.0.205 indfører en snæver én-gangs genprøvning for netop Supabases dokumenterede interne `sb_secret_`-oversættelsesfejl og gør beskyttet manifestsync fail-closed.
- Først køres den målrettede artifactbaserede roundtrip uden ny DMI og uden deploy. Derefter kræves normal produktionsverifikation og en ny fuld privat national kørsel inklusive fallback, central rollback og artifacts.
- Ingen privat kandidat må aktiveres offentligt uden de resterende gates og en særskilt ejerafgørelse.

- 4.0.200 er offentligt produktionsverificeret i #31798575274 med fuld validering, releasegate, DMI, Supabase og Pages.
- Privat #31798588868 beviste foreløbige punkter, native DMI-grid, vejrserier, state, vind og score-neutral shadow-score for en konsistent 835-dels kandidat. Den stoppede alene på reviewbyggerens historiske 783-tæller.
- 4.0.201 gør review og admin-roundtrip bestandsafledte under streng 1:1-validering. Næste trin er en fuld ny privat kørsel gennem endelige 121 rettelser, slut-DMI, slut-shadow-score, roundtrip/rollback og artifacts.
- #31802022918 bekræftede 27 grønne nationale trin, men den første native DMI-gate ramte sit marginale standardbudget. 4.0.202 ændrer kun de tre private nationale DMI-gates til det etablerede 3.000-sekunders kvalitetsbudget og afventer ny fuld kørsel.
- #31804967576 bekræftede tidsbudgettet og nåede gennem review/dubletaudit. Det efterfølgende stop viste, at det gamle 121-rettelsesbevis var lavet til den aktive 673-dels bestand, ikke til de private 835-/652-dels kandidater.
- 4.0.203 bandt beviser til fingeraftryk, men #31812035188 afslørede, at det første bevis var lavet efter 107 historiske korrektioner og derfor ikke var råt. Slut- og fallbackbeviset var allerede korrekte.
- 4.0.204 erstatter kun det første bevis med en audit direkte af GitHubs rå 835-dels kandidat: 520 verificerede, 149 sikkert vendte og 166 blokerede.
- Næste trin er normal 4.0.204-releasekørsel og derefter en ny fuld privat national kørsel gennem alle tre eksakte beviser, DMI, shadow-score, central roundtrip/rollback og artifacts.
- Ingen privat kandidat må aktiveres offentligt uden de resterende gates og en særskilt ejerafgørelse.

## Aktivt scope – nyere ejerbeslutning erstatter DEC-0036-stopreglen

Ejeren har udtrykkeligt godkendt en landsdækkende privat revision af kystdele og land-/vandpunkter. Det giver mandat til read-only/private geometri-, DMI-, state-, score-neutral shadow-, admin- og rollbackgates. Det giver ikke automatisk mandat til offentlig aktivering. DEC-0036's fem godkendte zoner er historik; Fejø/Femø og Havnø/Mariager forbliver slettet.

## Afsluttet P0 – hovedzoner med præcis kyst
- **Aktuel status efter 4.0.185:** 4.0.182–4.0.185 har afsluttet offentlig aktivering, entydige hovedzoneskel, redigerbart delejerskab, lokal scoreforklaring og behovsstyret “Hvor er det?”-visning. Historiske punkter nedenfor om kommende kandidat, manglende aktivering og ventende adminudvidelse er bevaret som forløb og er ikke aktuelle opgaver.
- **Resterende kystarbejde:** Havnø/Mariager Fjord forbliver bevidst slettet. De fem øvrige fallbackzoner samt den fejlplacerede Lolland vest/Albuen analyseres i en privat officiel-kystkandidat. Admin kan trække en zoneende til en eksisterende verificeret nabodel, bruge et reversibelt viskelæder og slette en hel zone. Helt ny geometri kræver fortsat geometri-, overlap-, land-/vandpunkt-, DMI- og offentlig runtimekontrol.
- **Aktuelt næste trin:** Kør den særskilte seks-zonekontrol for kandidatens 22 mål- og naborester. Ved grønt native DMI-bevis bygges en privat score-neutral runtime-/rollbackkandidat til ejerreview. Ingen af trinene må deploye eller genstarte den nationale geometriopbygning.
- **Ved enhver ny adminændring:** kontrollér at delen publiceres én gang, at der ikke opstår overlap eller relevante huller, at land-/vandpunkt og DMI-identitet følger med, og at hovedkort, lokal scoreforklaring og “Hvor er det?” viser samme ejerskab.
- 4.0.180 beviste lokal score til 605/605 dele, men den offentlige præsentation var forkert: hver intern beregningsdel blev tegnet som en synlig kortzone med egne to sorte endemarkeringer, tooltip og tre Leaflet-linjer. Det gjorde kortet uoverskueligt og tungt.
- 4.0.181 genopretter den bindende produktmodel: de 605 lokale dele bevares til punkter, vejr og RavScore bag kulissen, mens kortet igen viser én autoritativ kystlinje, ét navn, én klikflade og kun to endemarkeringer pr. hovedzone.
- Den næste private kandidat genbruger 605 godkendte dele og supplerer til 650 dele/203 hovedzoner med nul overlap og nul kildeafvigelser. 84 øvrige kildeforskelle er tidligere ejer-godkendte udeladelser. Kun fem geografisk modstridende hovedzoner afventer nu slutkontrol, før offentlig projektion og releasegate.
- Efter den akutte visningsrettelse auditeres alle områder, hvor beregningsdelene ikke dækker en kendt relevant ravstrand. Der må ikke gættes nye kystforløb eller slettes deldata som genvej.
- Ejerens efterkontrol har præciseret slutproduktet: hovedzonernes oprindelige struktur og forståelige navne kombineres med GeoDanmarks præcise strandforløb. Lokale dele forbliver tekniske data bag hovedzonen. Nye hovedzoner oprettes kun ved en konkret geografisk/navnemæssig fordel, aldrig automatisk ud fra et lokalt delnavn.
- Den dokumenterede kildefejl rettes først privat: fliseplanen skal dække zonens ejerskabsområde og ikke kun den gamle, potentielt fejlplacerede linje. Derefter genopbygges de manglende hovedzoner og alle uforklarede nationale huller auditeres samlet for officiel kyst, overlap, havn/å/indre farvand og udenlandsk/outlier-geometri. Først et grønt privat kort kan gå videre til offentlig aktivering; adminudvidelsen venter.
- 4.0.182 har gennemført dette forløb og er produktionsverificeret. Fortsat geometriarbejde foregår nu som read-only nataudit mod den aktive, hash-låste bestand. Det private kontrolkort viser både hele Danmark og hver enkelt del; dokumenterede problemer kan foreslås, men produktionen ændres ikke uden ny ejerafgørelse og fulde gates.

## Afsluttet datakæde – national kystgeometri v2
- Datakæden er produktionsverificeret i 4.0.180. Push-kørsel #31498481482 bestod fulde gates, central readback, artifact og deploy; det offentlige datasæt gav lokal score til 605/605 dele i alle 190 hovedzoner. Den efterfølgende visningsfejl betyder, at milepælen først er produktmæssigt lukket, når 4.0.181 er visuelt produktionsverificeret.
- Afsnittet nedenfor bevares som udviklingshistorik. Formuleringer om privat pilot, manglende aktivering og næste gate er historiske og må ikke læses som aktuel status.
- DEC-0033 er valgt som fremtidig produktretning: bedste gyldige lokale kystdel leverer zonescoren, men UI skal eksplicit skelne hele zonen fra navngivne delstrækninger og forklare den ravtekniske årsag. Før kodeaktivering bygges den forståelige ejer-reviewvisning og en score-shadow med dæknings-/usikkerhedskriterier.
- DEC-0034 autoriserer landsdækkende aktivering på den nuværende pre-domain testside efter national gate. Arbejdsrækkefølgen går fra valideret Blåvand-reference til national central-hydreret generering, rettelse af alle kendte semantiske/topologiske fejl, automatisk navn-/kilde-QA, lokale DMI/proveniens/state/UI/admin-forløb og samlet aktivering. En fast 7-points dækningsmargin bruges midlertidigt og revideres i den store analyse. Senere domæne-/brugerrelease har sin egen nye gate.
- Arbejdet følger DEC-0032 og udføres parallelt uden at ændre produktionszoner eller centrale adminoverrides.
- Første leverance er en permanent kilde-/licenskontrakt, v2-skema, national topologi-/navneaudit og tre repræsentative pilotområder.
- Flere lokale kystdele skal vurderes med selvstændig DMI-sampling og provenance; eksisterende multi-ankerretninger er ikke alene et dataprodukt.
- Høfder og andre ravfælder registreres score-neutralt. RavScore ændres ikke som del af geometri-piloten.
- National udrulning kræver særskilt go/no-go efter dokumenteret geometri-, admin-, DMI-, score/state-, runtime- og migrationskontrol.
- GeoDanmark-adgangen køres kun via et manuelt privat pilotjob med `geometry_v2_pilot=true`. #1931 beviste faktiske udtræk fra syv aktuelle lag i tre områder. 4.0.128 lukker den resterende afkortningsrisiko med pagination og privat upload af råfiler; næste trin er komplethedsverifikation og derefter parallel generering.
- Fra 4.0.129 har pilotjobbet sin egen concurrency-gruppe, så 15-minutters vejropdateringer ikke kan erstatte en ventende pilot.
- #1936 har produktionsverificeret komplet adgang: 21/21 lag/område-udtræk er komplette.
- 4.0.130 bygger den første private source-QA med afstande, fragmentering, konfliktflag og kort på den centralt effektive pilotbestand. Lokal kørsel viser, at alle ni zoner kræver review; næste trin er klassificerede delstrækninger og stednavneaudit, ikke blind snapping.
- #1959 verificerede 4.0.133 med 72 private forslag, officielle fjord-/norpolygoner, ni zonekort og reviewgate; #1958 verificerede den fulde produktionskæde. #1964 produktionsverificerede 4.0.134, og privat pilot #1967 verificerede Blåvand som to dele omkring det officielle hukpunkt med 15-meters landsideforskydning, punktpar og score-neutrale høfter. #1974 leverede tre private officielle ortofoto-overlays; reviewet gav no-go på en indadgående hukløkke. #1976 produktionsverificerede 4.0.135. Næste gate er privat rettelse og nyt ortofotogo, derefter DMI-grid, ikke aktivering.
- #1982 ortofotoverificerede 4.0.136-hårnålsrettelsen. #1987 verificerede 4.0.137's private native WAM-/DKSS-gridgate med gyldige og indbyrdes forskellige celler, og #1986 produktionsverificerede hele releasekæden. Næste Blåvand-gate er systemisk provenance-/merge-/score-/UI-/admin-design, ikke aktivering.
- 4.0.138 implementerer dette design som en maskinlæsbar privat shadow-kontrakt: stabile partserie-ID'er, egne provenancekrav, separate historiknøgler og eksplicit isolation fra parent-score, public runtime og admin-write. Privat pilot #1992 verificerede artifactet, og #1991 bestod den fulde produktionskæde. Næste gate er private flertidsserier med timeproveniens og komponentmerge; ingen aktivering.
- 4.0.139 implementerer flertidsseriegaten som privat metadata-/hashbevis over produktionens native WAM-/DKSS-parser. #1997 verificerede fire fælles komplette tider pr. del, og #1996 bestod den fulde produktionskæde. Næste gate er separat state-/historikvalidering; score, UI, admin og produktion forbliver uændrede.
- 4.0.140 replay-validerer separat delhistorik med unikke `historyKey`-nøgler gennem den faktiske score-neutrale `shadow-v2`-funktion. #2004 verificerede isolation og slettet transient input; #2003 bestod den fulde produktionskæde. Næste gate er score-neutral UI-review; admin-roundtrip, rollback og ejer-go/no-go ligger stadig senere.
- 4.0.141 gør UI-gaten maskinlæsbar og privat. #2009 verificerede én aktiv parent med bevaret RavScore-præsentation og to neutrale, ikke-interaktive dele uden score eller “bedste del”; #2008 bestod den fulde produktionskæde. Næste gate er privat central admin-roundtrip/rollback.
- 4.0.142 implementerer admin-gaten som et isoleret midlertidigt kladdedokument. #2014 verificerede create/read/update/delete, fravær og urørte runtime-dokumenter; #2013 bestod fuld produktion. Næste trin er eksplicit ejer-go/no-go, ikke automatisk aktivering.
- 4.0.143 starter den godkendte nationale skalering: central 208-zoners plan, deterministiske kildefliser, maskinlæsbare konfliktklasser og et isoleret privat nationalt GeoDanmark-job med deduplikering. Første private CI-artifact er næste evidensgate; derefter følger national topologi og de lokale DMI/state/UI/admin-led.
- 4.0.144 korrigerer den målte sekventielle flaskehals med begrænset firefliseparallelitet og fremdrift, tilføjer en streng national kilde-/secretgate og en `STRtree`-baseret source-QA for alle 208 zoner. Privat national CI er næste gate før topologi-/ravstrandsgenerering.
- #2029 verificerede 4.0.144 nationalt på den autoritative central-hydrerede plan: 208 zoner, 100 fliser/700 requests, ca. 5:15 hentning, grøn validator og source-QA. #2033 verificerede 4.0.145's kompakte 6,8 MB QA-artifact ved siden af råpakken på 413 MB; #2032 bestod normal produktion. 4.0.146 måler nu national havn-/å-/fjord-/norudskæring samt klit-, skrænt- og høfdeevidens read-only før delgenerering.
- #2037 verificerede 4.0.146's topologikæde, men artifactauditen afviste åmundingsreglen: 2.868 klynger er rå oversegmentering. 4.0.147 tilbageholder masker i zoner over 20 klynger og profilerer de accepterede råobjekters scalar-egenskaber, så næste regelrevision kan baseres på faktisk subtype/synlighed/navn/forløb frem for gæt.
- #2040 verificerede tilbageholdelsen i alle 45 overdense zoner. Profilen peger entydigt på bredde som næste kildefilter: 2.551 kandidater er kun 0–2,5 m brede mod 843 på mindst 2,5 m. 4.0.148 måler ≥2,5 m og ≥100 m linjelængde uden at lempe overdense-gaten.
- #2043 reducerede med dette filter åklynger til 489 og overdense zoner til én kendt partitionskonflikt. #2055 verificerede officielle stednavnekandidater til alle 755 dele. 4.0.152 danner 56 read-only lokale forslag fra de 28 grove dele uden forbindelsesgeometri; næste trin er revisionsbar navnebeslutning, ikke automatisk omdøbning.

## P0 – ægte Codex-baseline etableret i #1772
- **Første opgave – implementeret lokalt:** workflowets gate-bypass er lukket. En positiv preflight kræver nu `npm run validate` og `npm run release:gate` før artifact; negativ preflight kan fortsat stoppe billigt.
- Auditér de seneste to dages røde push-runs og grønne auto-runs som historik. Grøn topstatus på runs med `skipped` fulde gates er ikke releasebevis.
- **Gennemført:** #1772 på `292b4024…` brugte central admin-geometri og gennemførte frisk data, begge fulde gates, artifact og Pages-deploy med `success`.
- Hvis den strenge kørsel fejler, ret rodårsagen systemisk uden stale data, nulkonvertering, hardcodede zoner eller svækkede audits.
- Femdøgnsdiagnosen fra #1774 er gennemført: public runtime manglede vind i 187/208 zoner og bølger i 33/208, mens 203/208 havde mindst 96 timers marinegrundlag. Balanceret recovery er produktionsbekræftet i #1778/#1779; vind steg til 199/208 zoner med mindst noget data. HARMONIE-kildens native horisont er cirka 60 timer; det er et kilde-/retentionmål, ikke en reduktion af produktets cirka 120-timers mål.
- #1785 bekræftede valg af 18Z frem for et kortere 21Z-run. #1788 produktionsverificerede 48-timersfastholdelsen: 18Z blev bevaret, fire assets blev genbrugt, og den progressive serie voksede fra 4 til 7 behandlede tidspunkter. Fulde gates og deploy bestod.
- Fortsæt måling af workflowtid/schedulerbudget og DMI-coverage uden at svække marine audits.

## Næste P1 efter kortrettelsen – komplette DMI-first femdøgnskæder pr. komponent
- **Status: næste aktive roadmapopgave.** Timeproveniens og en 118-timers offentlig vindkæde er produktionsbevist; nu skal den faktiske aktuelle dækning og overgangskvalitet kortlægges separat for vind, bølger, strøm, vandstand og øvrige viste/scorede komponenter, før nye kilder eller fallback ændres.
- **Model efter DEC-0031:** Rutinemæssig overvågning og registrering af allerede definerede LF/NSBS-coverage-målinger kan udføres med GPT-5.6 Terra. Skift til GPT-5.6 Sol før ny faglig kildesyntese, provenance-/fallbackdesign, ændring af datakæden eller endelig kritisk validering.
- **Fase A startet:** `docs/research/DMI_FIRST_FIVE_DAY_SOURCE_AUDIT.md` kortlægger aktuel kode og officielle modelrammer. DMI dokumenterer HARMONIE til 54 timer, WAM til 5½ døgn og DKSS til 5 døgn. WAM/DKSS-vind er derfor første DMI-halekandidater, før ekstern fallback vurderes.
- Kortlæg for vind, bølger, strøm, vandstand, vandtemperatur og alle øvrige aktive score-/forecastkomponenter: nuværende DMI-kilde, native og typisk resterende horisont, runfrekvens, alternative DMI-produkter, lovlig/teknisk anvendelighed, opløsning og kvalitet.
- Design derefter den bedste kæde individuelt: primær DMI så langt den er valid, eventuel anden relevant DMI-kilde som forlængelse og kun ekstern fallback for den resterende hale mod cirka 120 timer.
- Revurdér eksisterende Open-Meteo-fallback fagligt og teknisk; historisk brug er ikke i sig selv et valg.
- Auditér overgangene for spring, tidsforskydning, dubletter, huller, enheder, retninger, stale data og interpolation. UTC og fuld timeproveniens er bindende.
- [x] Udvid diagnostik og pipeline med faktisk intervaldækning pr. komponent/zone samt collection, model-run, lead time, prognosealder, native/interpoleret/fallback-status og native kildetider. Frisk 4.0.125-produktion mangler som endeligt bevis.
- Vurder separat konsekvensen for RavScore, state og UI. Dag 5 må ikke fremstå lige så sikker som dag 1 uden evidens, og missing må aldrig opfindes som nul eller kopieret sidste værdi.
- **Stopregel:** Ingen ny produktionskilde, sammensyning eller scoreændring implementeres før kortlægning, design og regressionplan er dokumenteret og godkendt.

## P1 – vandstandskilder
- Gør forecast/cache-brugbarhed uafhængig af midlertidigt observationsstop.
- Vis observationsstatus, forecaststatus, cache gyldig til og samlet brugbarhed separat.
- Bevar opdagede kilder i registry; vis status frem for at lade dem forsvinde.
- Admin skal vise auto primær/sekundær, reel geodistance, vægte og metode samt tydelig override.
- Auditér Hals/prognosepunkter og end-to-end routing i RavScore, rangliste og femdøgnsvisninger.
- Etabler alarmtærskel for aktive observationskilder, der stopper før forecastcache udløber.

## P1 – Supabase/admin drift
- Reparer **Kontroller nu** under Supabase-lagringskontrollen.
- Test ekspertens håndbogsreview direkte mod Supabase: write, readback, reload og ejerens visning.
- Gør reviewkøen i stand til at slette/arkivere automatiske systemtestposter med auditspor.
- Bevar central autoritet for zonegeometri, regler og routing og udvid propagationstests frem for hardcoding.

## P2 – håndbog og ekspertarbejde
- Gennemarbejd hele håndbogen sprogligt og pædagogisk i almindeligt dansk.
- Omskriv ekspertens valideringsmatrix, så hvert punkt forklarer betydning, nuværende RavRadar-adfærd, usikkerhed, konkret ekspertspørgsmål og mulig effekt på regel/score.

## P2 – historisk state og faglig validering
- Bevar skyggetilstanden score-neutral, indtil faktiske produktionsdata og ekspertvalidering viser, at den er robust.
- Når et numerisk transportbidrag senere introduceres, gør det gradvist, versioneret, forklarligt og med regressionssammenligning.
- Bevar eksisterende pålidelige morfologidata; kræv ikke manuel landsdækkende morfologikortlægning.

## P2 – performance
- Bevar/udbyg startupmålinger for page load, JS-init, manifest/data fetch, parsing, scoreberegning og maprendering.
- Hold tunge state-/historikberegninger i pipeline og send kompakte præberegnede data til public klient.

## P2 – privat besøgsstatistik i admin
- Tilføj en usynlig offentlig besøgstæller og en enkel, adgangsbeskyttet rapport i administrationen.
- Rapporten skal mindst kunne vise sidevisninger og besøg fordelt pr. dag samt en valgt periode. Den må ikke fremstille besøg som unikke personer, medmindre metoden faktisk kan dokumentere det.
- Løsningen skal være dataminimeret, må ikke vise en offentlig tæller og må ikke indsamle præcise lokaliteter, rå IP-adresser, fingerprintingdata eller andre unødige personoplysninger.
- Tælleren må ikke påvirke RavScore, vejropdateringer eller offentlig opstart mærkbart. Fejl i statistik må aldrig blokere siden.
- Designet skal tage højde for Supabase Free-planens database- og egressgrænser, eksempelvis ved kompakt daglig aggregering frem for en voksende rå hændelseslog.

## P3 – planlagt videnskabelig forskningsrunde og RavScore-modelvalidering
- **Status: registreret, må ikke startes endnu.** Afhænger af afsluttet/klart afgrænset forecast- og schedulerstabilisering samt de højere P0/P1-opgaver.
- **Model efter DEC-0031:** Centrale forskningsfaser, synteser, evidenskonflikter, hypoteser, RavScore-vurdering og slutkonklusion udføres med GPT-5.6 Sol. Terra må kun bruges til klart afgrænsede mekaniske støtteopgaver uden tab af faglig kvalitet.
- Opbyg et permanent forskningsgrundlag i `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md` baseret primært på peer-reviewed forskning, universiteter, myndigheder, oceanografi, hydrodynamik, kystteknik og sedimenttransport.
- Hold frigivelse, transport, koncentration/aflejring og jagtbarhed analytisk adskilt; kortlæg derefter deres samspil og tidsrækkefølge som en samlet fysisk systemmodel før score og vægte vurderes.
- Auditér den faktiske RavScore-kode regel for regel for korrekt mekanisme, input, tids-/geografiafhængighed, evidensstyrke, overlap og risiko for dobbelt-tælling.
- Udarbejd evidensmatrix og klassificér anbefalinger som `BEVAR`, `FORBEDR`, `TEST`, `NY MEKANISME`, `FJERN/NEDVÆGT` eller `UTILSTRÆKKELIG EVIDENS`, samt forslag i evidensklasse A–D.
- Gennemfør en særskilt analyse af punktstrøm kontra opstrøms transporthistorik, rumlige strømfelter, konvergens/divergens, persistente transportkorridorer og det historiske begreb “strømbånd”. Det aktuelle produktionsforbud består, indtil stærk evidens, ikke-redundans, validering og særskilt godkendelse eventuelt begrunder noget andet.
- Analysér det fulde relevante vindfelt over hav og kyst gennem tid, også hvor kortet ikke viser vindpile. UI-pilene er udvalgte visualiseringer og må ikke afgrænse meteorologisk evidens. Undersøg opstrøms/regional vind, kobling til bølger og strøm, forsinkelser, persistens og selvstændig informationsværdi uden at dobbelt-tælle eksisterende input.
- Design senere validering mod strukturerede fundrapporter, ekspertvurderinger, historiske DMI-forløb, referenceperioder og kontrollerede backtests med selection bias eksplicit behandlet.
- **Stopregel:** Fase A–D er analyse uden produktionskode. Ingen scoremekanisme, vægt eller nyt datalag må aktiveres automatisk; fremlæg først samlet model, usikkerheder, eksperimenter og prioriterede forslag til særskilt godkendelse.
- Hvis senere godkendte mekanismer kræver tunge rumlige/historiske beregninger, udføres de i pipeline og sendes kompakt til klienten. Der konstrueres aldrig manglende data.

## Ikke-roadmap / forbudte genveje
Roadmappet må aldrig opfyldes ved at genindføre stale data, regionale strømbånd, falske nulværdier, hardcodede administratorzoner eller ved at gøre audits svagere.

Den planlagte P3-forskning må undersøge, om rumlige strømstrukturer har selvstændig fysisk informationsværdi. Det er ikke tilladelse til at genindføre regionale strømbånd i produktionen; den nuværende bindende regel gælder, indtil en senere eksplicit beslutning eventuelt erstatter den.
