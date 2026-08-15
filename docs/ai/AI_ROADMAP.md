# AI Roadmap – RavRadar 4.0.227

## 4.0.227 – ejerens repræsentative kystretning må ikke låses af en mikrotangent

- Admin viste en 50-graders vinkelafvigelse ved Svansodde og deaktiverede godkendelsen, fordi et cirka 461 meter langt punktpar blev sammenlignet med ét cirka 15 meter langt segment i en bugtet kyst.
- DEC-0038 gør den lokale vinkelmåling vejledende. Ejerens helhedsvurdering efter de tre zonebekræftelser kan gemmes centralt.
- Reelle integritetsfejl, Supabase-readback, DMI-gridvalidering, releasegate og rollback bevares.
- #31908498204/#2824 bestod hele produktionskæden. Artifact og direkte Pages-kontrol viser 4.0.227, 210 zoner, 673 kyststrækninger, matchende manifesthashes og den ikke-blokerende vinkeladvarsel live.
- P1-modelrotationen og 72-timershistorikken fortsætter uden faglig ændring.

## 4.0.226 – Supabase må tåle én annulleret idempotent skrivning

- #2814 forsøg 1 viste en transient HTTP 500/PostgreSQL `57014` på den store beskyttede runtime-diagnostik efter alle faglige gates. Den uændrede rerun gennemførte samme skrivning og deploy.
- Den fælles requester genprøver nu kun eksakt statement-timeout én gang og fejler fortsat hårdt ved gentagelse eller andre fejl.
- #31905211459/#2816 gennemførte fuld 4.0.226-produktion med frisk DMI, alle gates, Supabase og Pages. Normalvejen skrev `runtime-diagnostics` i første forsøg; timeoutgrenen er dækket af regressionen.
- P1-modelrotationen og 72-timershistorikken fortsætter uden ændring.

## 4.0.225 – aktuel vandstandstime bevarer modelidentitet

- #2801 viste et tidsafhængigt provenancehul på præcis én time i alle 210 zoner efter timegrænsen.
- Den afgrænsede rettelse holder vandstandskildeindeksets start på samme aktuelle klokktime som den offentlige serie uden at ændre forecastalder eller faglige værdier.
- #31902872631/#2810 bestod hele produktionskæden. #31903561423/#2812 gentog alle fulde gates og deploy efter evidenscommitten; begge supportartifacts har 22.890/22.890 fuldt dokumenterede routede DMI-vandstandstimer og 210/210 komplette rækker i aktuel time. Direkte Pages-kontrol efter #2812 viste 4.0.225 og datasæt `rr-20260815192135-210`.
- P1-modelrotationen, det virkelige 72-timershistorikvindue, Feggesund-bølgegabet og DMI-rate limiting fortsætter uændret som separate måle-/analyseforhold.

Roadmappet prioriterer stabilitet og verificerbarhed før nye features. Status skal løbende flyttes til RDKS, når noget implementeres.

## Afsluttet P0 – lokal snapshotdiagnose

- Lokal validering kan nu skelne et udløbet repositorysnapshot fra en aktuel produktionsfejl uden at acceptere manglende zoner.
- Den skrivebeskyttede deployaudit har bekræftet 210/210 aktive zoner og vejrdata til alle tre Vadehavszoner.
- En fuld frisk validering følger fortsat den bindende rækkefølge: central adminhydrering og tombstones, nyt/hydreret vejr, fuld `validate`, releasegate og først derefter artifact/deploy.
- 4.0.208 er produktionsverificeret i #31848912461 på commit `7a3382f`; direkte efterkontrol viste version 4.0.208 og datasæt `rr-20260814230422-210`.
- 4.0.209 indførte separat 72 timers rå pipelinehistorik score-neutralt og rettede tabet af DMI-vandstandsidentitet. 4.0.211-produktionen beviser, at historikken bevares mellem kørsler; det fulde 72-timers målevindue er endnu ikke gået.
- Næste aktive udvikleropgave ændres ikke: DMI-first femdøgnskæderne under DEC-0030.

## P0-ejerreview – ét land-/havpunktpar pr. kyststrækning

- Hver af de 673 aktive kyststrækninger har præcis ét autoritativt hav-/landpunktpar. Admin må kun flytte det eksisterende par; ekstra aktive par og automatisk national genopdeling er fravalgt i DEC-0037.
- En skrivebeskyttet retningsaudit har flagget 199 kontrolkandidater i 122 hovedzoner. Det er en prioriteringsliste, ikke 199 beviste fejl, fordi 171 kandidater er fragmenterede `MultiLineString`-dele.
- Ejeren gennemgår senere zonerne gradvist og placerer parret repræsentativt på bugtede dele. Arbejdet blokerer ikke uafhængige roadmapopgaver, men skal være afsluttet før endelig faglig godkendelse af alle lokale scorer, større scorekalibrering og domæne-/brugerrelease.
- En flytning bliver først aktiv efter central readback og grøn efterfølgende DMI-/releasekørsel. Afvist validering må ikke aktivere kladden.

## Næste aktive udvikleropgave – DMI-first femdøgnskæder

- 4.0.224 retter et P1-provenienshul uden at ændre værdier: vandstand fra valgte DMI-kildepunkter mærkes nu med de faktiske enkelt- eller sammensatte DKSS-modelområder. #31895640397/#2797 og direkte deploykontrol beviser 23.310/23.310 dokumenterede routede timer, 210 zoner og offentlig 4.0.224.

- Den naturlige #31894320128/#2794 ser nye 12 UTC-kandidater for WAM og DKSS, men beholder korrekt de komplette 00/06 UTC-runs, mens de stadig har ca. 107,9/109,9 timers hale over 96-timerskravet. Næste opfølgning er det faktiske beskyttede skift, når den gamle serie falder under kravet; kørslen gav samtidig 4,27–39,99 verificerede historiktimer og nul aktive vandstandscachealarmer.

- Fortsæt P1-audit og design under DEC-0030 for vind, bølger, strøm, vandstand og øvrige viste/scorede komponenter.
- Produktionsbevis #31855164652 og datasæt `rr-20260815011320-210` giver verificeret strøm ved nutiden i 210/210 zoner. Strømkæden når mindst cirka 70,8 timer i alle zoner, men kun 121/210 når mindst 96 timer. Den konkrete P1-opfølgning er derfor at klassificere og forklare halen i de resterende 89 zoner og designe vejen til cirka 120 timer uden at skjule `missing`.
- Følg den verificerede strøm gennem et fuldt 72-timers vindue. Artifact #2777 viser 155 rå prøver og 38,278 timers rå historie i alle 210 zoner, men den verificerede historie spænder kun 2,559–38,278 timer afhængigt af zone. 4.0.220 gør denne forskel til et fast read-only mål. Baseline må ikke udfyldes bagudrettet.
- Exitkriteriet for historikopfølgningen er mindst 72 timers faktisk bevaret pipelinehistorik i alle 210 zoner samt en særskilt liste over reelle DMI-huller. Det er analysegrundlag for senere mobiliserings-/scorearbejde og ændrer ikke den aktive 24-timersscore.
- 4.0.212 lukker en dokumenteret overgangsregression før den videre haleanalyse: kørsel #31857361460 reducerede 27 komplette NSBS-strømserier til ét sent tidspunkt, fordi et marginalt nærmere skalarfelt kunne genvælge hele havmodellen. Kun et gyldigt fælles strøm-U/V-par må nu ændre det autoritative valg. #31870747677 genoprettede 210/210 ved nutiden og mindst 100,8 timers sammenhængende marineprognose i alle zoner.
- 4.0.214-opfølgningen er lukket af artifact #2777: 210/210 temperaturgitre og 9.159/9.159 native DMI-temperaturtrin har eksplicit `surface:0`, fordelt på IDW, NSBS og LF. Gamle umærkede/dybe temperaturer er ikke vendt tilbage.
- Limfjordens bølge-/haleanalyse er nu afsluttet på 4.0.213-artifactet: `DK-B05-11` har ingen gyldig bølgekilde, og otte zoners vandstands-/temperaturhale skyldes en kortere DMI-havhorisont. `missing` bevares. Næste P1-trin er en samlet komponentmatrix og regressionsplan; ingen ny kilde eller scoreændring er godkendt.
- Den samlede komponentmatrix er nu målt på 4.0.214-datasæt `rr-20260815083802-210`. Vind er komplet; bølger har ét fuldt hul og 15 enkelttimehuller; strøm, vandstand og temperatur deler samme 17-timers hale i otte zoner. Næste P1-trin er numerisk overgangsmåling pr. komponent, mens 72-timershistorikken fortsat bygges.
- Kildeskiftene er nu målt i fire produktionsdatasæt til og med 4.0.219. Vandstand er fortsat stabil; vind, bølger, strøm og temperatur har fortsat større grænsespring end almindelige timer, men størrelsen varierer. Næste P1-trin er stadig uafhængige nye modelcyklusser pr. komponent før valg af regressionsintervaller – fortsat uden scoreændring.
- 4.0.222 gør uafhængighed maskinlæsbar: komponentauditen viser collection/model-run og udokumenterede DMI-timer. #2764, #2771 og #2777 bruger samme aktive HARMONIE-, WAM- og DKSS-run-id'er og tæller derfor kun som én forecastcyklus pr. model, selv om de fortsat er gyldige drifts- og historikbeviser.
- Produktionsartifact #2782 bekræfter fuld collection/model-run-proveniens i alle fem komponenter og fortsat samme aktive modelcyklus. Historikken er vokset til 38,760 rå timer og 3,040–38,760 verificerede timer; næste automatiske opfølgning er den første naturlige kørsel med et nyt relevant run-id samt fortsat vækst mod 72 verificerede timer.
- Artifact #2783 gav den første nye HARMONIE-cyklus med 416 timer i 208 zoner. I 4.0.223-artifact #2785 er 12 UTC vokset til 3.744 timer, mens 03 UTC er faldet til 6.032 timer i de samme 208 zoner. Zonedækningen pr. run er nu produktionsverificeret. Næste opfølgning er den videre 12 UTC-indfasning samt nye WAM-/DKSS-run-id'er; en delvis cyklus fastsætter ingen tærskel.
- Artifact #2787 fortsætter samme indfasning til 5.616 timer fra 12 UTC og 4.160 timer fra 03 UTC i 208 zoner med uændrede overgangsmål. Gentagne indfasningsartifacts er driftsbevis; næste selvstændige P1-evidens er en fuldt indfaset vindcyklus eller et nyt WAM-/DKSS-run-id.
- Artifact #2789 fortsætter til 7.488/2.288 timer fra 12/03 UTC i 208 zoner. Overgangsmålene flyttede sig igen under indfasningen, så ingen delmåling låses som permanent interval. WAM/DKSS er fortsat uændrede, og historikken er 39,516 rå timer.
- Artifact #2790 afslutter HARMONIE 12 UTC-indfasningen med 45 timer i 208 zoner og kun to bevarede 03 UTC-timer pr. zone. To fulde vindcyklusser er nu sammenlignet: fallback→DMI varierer, mens DMI→fallback-halen er identisk. Vindrammen er foreløbig; næste uafhængige vindbevis er en ny hale eller tredje fuld cyklus, mens hovedfokus flyttes til nye WAM-/DKSS-run-id'er og 72 verificerede historiktimer.
- Den nye fulde `dkss_lf`-cyklus i artifact #2764 har 41/41 trin og løfter de otte Limfjordszoner fra 98 til 115 viste timer. Næste haleopgave er at følge dette over nye LF-cyklusser og forklare de sidste tre timer samt de øvrige modelgrænser; ingen fallback eller scoreændring før kilde/run/lead-time og overgang er forklaret.
- Dokumentér først faktisk dækning, provenance, overgangskvalitet og regressionsplan. Indfør ikke ny produktionskilde, fallback eller scoreændring før denne analyse er afsluttet og godkendt.
- 4.0.219 fjerner overflødig central readback af den genbyggede routingaudit og tilføjer en read-only pipelineestimator. Den beregnede nedre 30-dagesgrænse falder fra cirka 4,44 til 3,03 GiB; faktisk Supabase-egress overvåges fortsat gennem næste billingperiode.

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
- **Aktuel arbejdsrækkefølge 2026-08-15:** Lad de normale GitHub-kørsler opbygge og bevise 72 timers strømhistorik uden ekstra tvungne kørsler. Gennemfør imens den skrivebeskyttede P1-måling af bølger og vandstand, derefter vandtemperatur og til sidst en samlet vindopfølgning. Bølger godkendes kun som komplette, når højde, retning og periode findes sammen; vandstand følges gennem DKSS, continuity og aktiv kildepunktrouting med bevaret identitet.
- Lufttemperatur hentes og findes i den offentlige timefil, men vises ikke i det aktive informationspanel og bruges ikke af den aktive RavScore. Nedbør, skydække, lufttryk og sigtbarhed er heller ikke aktive P1-komponenter. De må ikke udvide den bindende P1-kæde uden et konkret produktbehov og en ny beslutning.
- Direkte måling af dataset `rr-20260815071241-210` viser komplette bølger i 209/210 zoner; Mors nord/Feggesund mangler alle 118 timer. Vandstand er komplet i 202/210 zoner; otte Limfjordszoner mangler den samme 15-timershale. Næste evidens er beskyttet timeproveniens fra friske normale runs, ikke en ny fallback.
- Vandtemperaturens lagproblem er produktionslukket: #2777 har eksplicit `surface:0` i alle 210 zoner og alle tre DKSS-modeller. 202 zoner har 118 viste timer og otte Limfjordszoner 114; de sidste fire timer er et separat horisont-/overgangsproblem. Temperatur er fortsat score-neutral.
- Design derefter den bedste kæde individuelt: primær DMI så langt den er valid, eventuel anden relevant DMI-kilde som forlængelse og kun ekstern fallback for den resterende hale mod cirka 120 timer.
- Revurdér eksisterende Open-Meteo-fallback fagligt og teknisk; historisk brug er ikke i sig selv et valg.
- Auditér overgangene for spring, tidsforskydning, dubletter, huller, enheder, retninger, stale data og interpolation. UTC og fuld timeproveniens er bindende.
- [x] Udvid diagnostik og pipeline med faktisk intervaldækning pr. komponent/zone samt collection, model-run, lead time, prognosealder, native/interpoleret/fallback-status og native kildetider. Frisk 4.0.125-produktion mangler som endeligt bevis.
- Vurder separat konsekvensen for RavScore, state og UI. Dag 5 må ikke fremstå lige så sikker som dag 1 uden evidens, og missing må aldrig opfindes som nul eller kopieret sidste værdi.
- **Stopregel:** Ingen ny produktionskilde, sammensyning eller scoreændring implementeres før kortlægning, design og regressionplan er dokumenteret og godkendt.

## P1 – vandstandskilder
- [x] Forecast/cache-brugbarhed er uafhængig af midlertidigt observationsstop.
- [x] Observationsstatus, forecaststatus, cache gyldig til og samlet brugbarhed vises separat.
- [x] Opdagede kilder bevares i registeret med status frem for at forsvinde.
- [x] Admin viser automatisk primær/sekundær, reel geodistance, vægte, metode og tydelig override.
- [x] Hals/prognosepunkter og end-to-end routing er auditeret i artifact #2771: begge Hals-kilder har 113 timer, og samme producerede serie går til forecaststore, zone, femdøgnsvisning og score-/ranglistekæde.
- [x] 4.0.221 genopretter alarmtærsklen for faktisk valgte aktive kilder mod både kildeprognose og forecastcache. #31889559758 og artifact #2777 rydder de falske Hals-mærker, viser 116,6 timers resttid og bevarer faktisk routing i 5/6 zoner; de gamle 15/21-tal var stale diagnosefelter.
- [ ] Eftermål den første naturlige warning/critical i drift; fremkald ikke kunstigt cacheudløb og svæk ingen gate.

## Afsluttet P1 – Supabase/admin drift
- [x] **Kontroller nu** genlæser forbindelses- og lagringsstatus og viser fejl fail-closed i admin.
- [x] Den fulde persistensprøve tester midlertidig write, readback og gendannelse; håndbogsreviewets centrale kø og lokale nødkladder er synlige i ejerens admin.
- [x] Reviewkøen kan soft-delete enkelte poster og rydde mærkede systemtestposter, mens auditsporet bevares.
- [x] Central autoritet for zonegeometri, regler og routing er bevaret og dækket af admin-, propagation- og releasegates.
- Den særskilte måling af Supabase-egress gennem næste billingperiode er fortsat åben; en grøn funktionstest er ikke et forbrugsmål.
- #31891504819 ramte ét `57014 statement timeout` ved skrivning af `runtime-diagnostics` og stoppede korrekt før deploy. #31891984360 synkroniserede umiddelbart efter samme dokument og deployede grønt. Gentagelser overvåges, før en snæver retry eventuelt designes; en bred retry indføres ikke på ét transient fund.
- Artifact #2785 måler den kompakte runtime-diagnostik til 9,287 MB. De 25 rå zoneeksempler udgør 8,690 MB/93,57 % og cirka 23,308 GiB JSON-skrivninger over 30 dage ved 96 kørsler dagligt. En senere opdeling kan mindske timeout-risikoen, men må bevare ejerens rå download og kræver særskilt godkendelse; tallet er skrivevolumen, ikke billing-egress.

## Afsluttet P2 – håndbog og ekspertarbejde
- [x] Alle 111 webhåndbogskapitler har fast læsehjælp og er gennemarbejdet i almindeligt dansk; den permanente regression afviser kapitler uden læsehjælp.
- [x] Ekspertens 22-punkts valideringsmatrix er omskrevet til en arbejdsplan. Hvert punkt forklarer hvad RavRadar gør, hvorfor det kan være for simpelt, hvad eksperten konkret skal vurdere, og hvad svaret eventuelt kan bruges til. Intet ekspertinput ændrer regler eller score automatisk.

## P2 – historisk state og faglig validering
- Bevar skyggetilstanden score-neutral, indtil faktiske produktionsdata og ekspertvalidering viser, at den er robust.
- Når et numerisk transportbidrag senere introduceres, gør det gradvist, versioneret, forklarligt og med regressionssammenligning.
- Bevar eksisterende pålidelige morfologidata; kræv ikke manuel landsdækkende morfologikortlægning.

## Afsluttet P2 – performancebaseline, fortsat overvågning
- [x] Startupmålinger og en gentagelig byteaudit dokumenterer payloadens vigtigste dele.
- [x] Tunge state-/historikberegninger ligger fortsat i pipeline, mens klienten modtager kompakte præberegnede startdata.
- **Analyse startet 2026-08-15:** `npm run audit:public-startup-payload` gør bytefordelingen gentagelig uden at skrive. Direkte deploymåling af `rr-20260815094833-210` viser 27,11 MB: lokale kystdele udgør 19,99 MB, og hovedzonernes prognoser 6,88 MB. Det gamle lokale 209-zonesnapshot på 6,91 MB er kun historisk baseline uden aktive kystdelsdata.
- **Produktionsverificeret i 4.0.216:** Et lille aktuelt startdatasæt efterfølges af ikke-blokerende femdøgnstimer og detaljerede lokale kystdelsdata. Datasetintegritet, missing, prognose, assistent, lokal score og historik bevares; lokal frisk 210-zonebrowsertest viste cirka 0,7 sekund til kort/rangliste og efterfølgende komplet prognose uden browserfejl. #31880984004 bestod fuld gate og deploy.
- [ ] Fortsæt almindelig produktionsovervågning på mobil og desktop; det er drift, ikke en blokering for næste roadmapopgave.

## P2 – privat besøgsstatistik i admin
- [x] 4.0.215 implementerer en usynlig, ikke-blokerende offentlig tæller og en ejerbeskyttet adminrapport.
- [x] Rapporten viser sidevisninger og browserbesøg pr. dag og valgt periode samt oprettede og aktive login-konti som særskilte tal.
- [x] Browserbesøg tælles højst én gang pr. browserfane og dag og kaldes ikke unikke personer.
- [x] Supabase gemmer kun kompakte dagstotaler uden rå hændelseslog, IP, præcis lokalitet, fingerprint eller stabil besøgsidentitet.
- [x] Migrationen og dens roller er efterkontrolleret: offentligheden kan kun tælle, mens rapportlæsning kræver authenticated plus ejer/full_admin-kontrol.
- [x] #31876816700 og direkte efterkontrol beviser deploy, første rigtige 1/1-optælling og adminrapport med 2 oprettede/2 aktive login-konti.
- [ ] Følg fortsat dagstal, anonym støj/misbrug og Supabase-egress gennem næste billingperiode; en helt anonym offentlig tæller kan ikke bevise mennesker.

## P3 – planlagt videnskabelig forskningsrunde og RavScore-modelvalidering
- **Status: registreret, må ikke startes endnu.** Afhænger af afsluttet/klart afgrænset forecast- og schedulerstabilisering samt de højere P0/P1-opgaver.
- **Model efter DEC-0031:** Centrale forskningsfaser, synteser, evidenskonflikter, hypoteser, RavScore-vurdering og slutkonklusion udføres med GPT-5.6 Sol. Terra må kun bruges til klart afgrænsede mekaniske støtteopgaver uden tab af faglig kvalitet.
- Opbyg et permanent forskningsgrundlag i `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md` baseret primært på peer-reviewed forskning, universiteter, myndigheder, oceanografi, hydrodynamik, kystteknik og sedimenttransport.
- Hold frigivelse, transport, koncentration/aflejring og jagtbarhed analytisk adskilt; kortlæg derefter deres samspil og tidsrækkefølge som en samlet fysisk systemmodel før score og vægte vurderes.
- Det samlede forskningsgrundlag, den fysiske systemmodel og kodeauditen skal danne grundlag for et konkret forslag til næste generation af RavScore-/scoremodulet. Det nye modul bygges ikke som en skjult fortsættelse af analysen: arkitektur, signaler, vægte, regressioner og overgang fra den nuværende score kræver ejerens særskilte godkendelse før implementering.
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
# Aktuel P1-status – 4.0.210

- DMI-first-komponentanalysen har lokaliseret en konkret strømschedulerfejl: en fjern DKSS-hale blev fejlagtigt regnet som sammenhængende dækning fra nutiden.
- 4.0.210 retter kun dækning/genhentning. Næste trin er produktion og 72 timers måling, derefter klassifikation af resterende geografiske DMI-huller før enhver kilde-, fallback- eller scorebeslutning.
# Aktuel P1-status – 4.0.211

- 4.0.210 beviste den korrigerede huldiagnose, men produktionsartifactet afslørede et yderligere cacheproblem: modelvalget gik tabt, mens behandlingsstatus overlevede.
- 4.0.211 bevarer/gendanner modelvalget og tvinger én genbehandling. Næste beslutningspunkt er den direkte produktionsoptælling og derefter 72 timers verificeret historik; kilde- og scoreanalyse forbliver efterfølgende trin.
