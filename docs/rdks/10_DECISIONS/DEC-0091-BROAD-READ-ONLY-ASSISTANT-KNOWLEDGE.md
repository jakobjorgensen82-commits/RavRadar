## 25. november — assistenten følger sproget i den åbne fane

En tysk RavRadar-fane gav et dansk svar efter sprogskift til dansk i en anden fane. Det fælles sprogvalg blev læst ved indsendelsen, selv om den tyske fane stadig viste sin tidligere valgte oversættelse.

Spørg RavRadar bruger nu sproget på den viste side til lokale svar, samtalens sammenhæng og det sprog, der sendes til den eksterne assistent. Sprogvælgeren gemmer stadig valget til næste indlæsning. Sprogskift i en anden fane afbryder ingen åben samtale. En målrettet prøve dækker situationen gennem den almindelige formular.

## 24. november — vandstandsændring på 3 timer

Den offentlige assistenthjælp forklarer feltet på dansk, tysk og engelsk. Tallet viser forskellen mellem den beregnede vandstand ved den valgte time og tre timer senere. Det giver et hurtigt overblik over ændringen, mens »Vandstand time for time« viser tidspunkt og udsving undervejs. Forklaringen følger den normale beregning i `scripts/lib/ravscore-production-adapters.mjs` og visningen i `js/ui/info-panel.js`.

Hjælpen svarer lokalt på hele generelle spørgsmål, også mens prognosen indlæses. Spørgsmål om bestemte steder eller tider og spørgsmål med andre led følger fortsat den normale behandling. Offentlig afprøvning følger den normale kodelevering.

## 24. november — præcis placering af opskyllet rav

Den offentlige side kontaktede Cloudflare AI på det klare spørgsmål om RavRadars mulighed for at forudsige et præcist landingssted, men viste en generisk anmodning om præcisering. Den lokale app-kandidat giver et direkte svar på dansk, tysk og engelsk som en del af den eksisterende offentlige hjælp. RavRadar kan pege på lovende kystområder og tidspunkter ud fra vejret og kystforholdene. Modellen kan ikke forudsige, hvor et enkelt ravstykke skyller op.

Kandidaten svarer kun på hele spørgsmål, der udtrykkeligt handler om RavRadars mulighed. Spørgsmål om udstyr, konkrete steder og tider, private oplysninger og ekstra led går fortsat gennem den normale behandling. Cacheadresserne ændres for den offentlige app-kæde, så den tidligere hjælp ikke kan skjule det nye svar. Offentlig levering og efterprøve udestår.

## 24. november — opfølgning om strøm mellem revler

Browserprøven viste et fagligt svar om ravtransport mellem revler. Den korte opfølgning om, hvad man konkret kan se fra stranden, fik en generisk afvisning, fordi det første svar ikke gemte emnet. Den lokale kandidat husker nu det afgrænsede emne og genbruger det eksisterende råd om at se efter åbninger i brændingen og følge bevægelsen af skum eller tang på overfladen. Spørgsmål med ekstra led går fortsat videre i fuld længde, og lukning af dialogen nulstiller sammenhængen. Den normale kalders lokale prøver dækker dansk, tysk og engelsk. Levering udestår.

## 24. november — sammensatte spørgsmål og opfølgning om Raman

Den offentlige assistent fik et valideret eksternt svar på et tysk spørgsmål om fluorescens og begrænsninger. Brugeren fik samme generiske afklaring på både spørgsmålet og opfølgningen. Den lokale app-rettelse forklarer fluorescensbaggrunden og spektroskopiens begrænsninger på dansk, tysk og engelsk. En kort, dækket opfølgning kan bruge den faste emnebetegnelse. Dialoglukning og sprogskift bryder sammenhængen. Ekstra led får den normale behandling af hele spørgsmålet.

Fluorescens kan overdøve svage Raman-signaler. Forsøg med rav viser, at laserbølgelængden har betydning for baggrunden. Naturlig variation, forvitring og behandling kan give overlappende signaler. [Edwards m.fl.](https://pubmed.ncbi.nlm.nih.gov/17320468/) · [Kwaśny og Bombalska](https://pubmed.ncbi.nlm.nih.gov/40572580/)

Den samme afgrænsede danske revleformulering accepterer også havstrøm. Den eksterne assistents generelle behandling af sammensatte spørgsmål og offentlig efterprøve udestår.

## 23. november — assistenten afventer den normale datastart

Et prognosespørgsmål under den første indlæsning kunne blive afvist, selv om de almindelige filer senere kom korrekt ind. Den lokale rettelse lader kun datakrævende spørgsmål afvente det allerede aktive startsignal. Derefter bruges den sædvanlige autoritative evidenslæser. Kortets visningsview gives ikke til assistenten, og der startes ingen ekstra indlæsning.

Lokale hjælpesvar er fortsat straks tilgængelige. Fejl i starten afslutter ventetiden med det eksisterende afslag. Dialogreset, sprog og nyere spørgsmål beskytter mod forsinkede svar, mens den normale indlæsning kan sætte den gemte jagtform. De eksisterende lokale UI- og startprøver dækker forsinket start, afslag og cacheadresser uden ekstern AI. Præcis kildekvalifikation og offentlig efterprøve udestår. Appversion, model, SQL og providerforløb bevares.

## 15. november — entydigt evidensvalg og struktureret AI-svar

Den afgrænsede assistentkandidat gør hele systeminstruksen til evidensvalg og beder den eksisterende GPT-OSS-model om samme femfeltsprotokol gennem Cloudflares direkte JSON-schema-format. Svarfeltet er en lokaliseret fast markør; modellen vælger fortsat disposition og alle nødvendige eksisterende fakta-ID’er. Serveren skriver fortsat det viste svar fra de godkendte tekstenheder.

Dette erstatter de modstridende instrukser om både kort markør og fri forklaring samt den løse json_object-request. De 45 fakta, vidensbindingen, normal udtrækning, råsvars- og helspørgsmålskontrol, begge 900-tegnsgrænser, model, kvoter og tidsfrister bevares. Der tilføjes ingen afskæring, automatisk modelgentagelse eller ny fallback.

Cloudflares egen GPT-OSS-adapter bruger direkte json_schema uden OpenAI-wrapperen name/schema. Et skema er ikke en garanti for korrekt leverandøradfærd. Præcis kildekvalifikation, sikker installation og faktiske normale danske, tyske og engelske svar kræves fortsat; syntetiske prøver lukker ikke offentlig AI-accept. De seneste normale prøver på den forrige kode afviste for lange råsvar før kanonisk komposition. Deres rå indhold og konkrete faktaudvalg er ikke aflæst, og promptmodstriden er derfor ikke bevist som eneste årsag.

Version 4.0.598, RavScore, kildeprioritet, SQL-regler, geometri og vejrhentning ændres ikke. Den pensionerede samlede Source-pakke genåbnes ikke.

## Tillæg 14. november 2026 — implicit fundrelevans og samme kompakte femfeltsprotokol

Den næste afgrænsede assistentkandidat genkender implicitte UV-fundspørgsmål gennem samme normale Edge-vej og beder modellen vælge disposition og dækkende kilde-id'er med en kort lokaliseret markør frem for en fri forklaring, som alligevel ikke udgives. Femfeltsprotokollen, alle råsvarsvagter, 45 fakta, K-bindingen og den kanoniske sammensætning under 900 tegn bevares. Den observerede tyske længdeafvisning skete før den kanoniske komposition; den engelske provider-timeout er fortsat uafklaret. Frister, kvoter og providerparametre ændres ikke. Syntetiske normale mål er ikke faktisk ekstern AI- eller helsvarsaccept; boblers diagnostiske betydning og den numerisk bundne enkeltleds-/tegnsætningsgrænse er særskilt åbne.

Materiale eller fund, UV eller fluorescens og et identifikations- eller skånsomhedsformål skal alle genkendes, før den nye implicitte relevansvej kan vælges. Eksisterende sikkerheds-, privatlivs- og uvedkommende-emnevagter står først. Det er ingen generel UV-adgangsbillet eller diagnose. Modellen skal fortsat vurdere alle led og markere manglende støtte som usikker; markøren er ikke en leverandørgaranti om outputlængde. Parser, rå answer-type/tomhed/900/sikkerhed, locale, kendte og entydige id'er, requestpool, helspørgsmål, privacy og alle kanoniske forbehold bevares. Ingen rå modelprosa udgives, og ingen overlang prosa accepteres ved efterfølgende klipning. Se håndbog 89.279.

## Tillæg 2026-11-14 — samme kanoniske sprog og svarbudget

Den forberedte rettelse giver den eksisterende provider de samme komplette kanoniske faktatekster på det ønskede dansk, tysk eller engelsk, som eftervalideringen udgiver. De 45 offentlige fakta, deres id'er og K-binding ændres ikke. Prompten beskriver den eksisterende grænse på 900 tegn, afsnitsadskillelse, hele usikkerhedsteksten og tegnprisen for gennemgåede sammenfatninger. Modellens egen korte prosa gør ikke de valgte enheder kortere. Kun nødvendige fakta til hele spørgsmålet skal vælges; uvedkommende zone- eller fuld gridforklaring skal ikke tilføjes til et almindeligt kystspørgsmål. Ingen eftervalidering må fjerne en valgt påstand eller et forbehold for at få plads.

Den eksisterende kanoniske sammenfatning får én kombination af de to allerede udstedte UV-fakta. Lav vægt i forhold til størrelse, harpiksagtig overflade, langbølget ravlygte omkring 395 nm i mørke, efterfølgende fysisk kontrol, baltisk ravs ofte tydelige fluorescens, variation med sammensætning/forvitring/behandling samt andre fluorescerende materialer og efterligninger bevares. UV alene er fortsat ikke bevis. Begge valgte id'er bevares; den tidligere større identifikationssammenfatning og alle enkeltfakta er uændrede. Et helt svar, der stadig ikke kan rummes, beder fortsat om fokus frem for at klippe eller kassere et valgt forbehold.

Det er en lokal kildekandidat. Faktisk valgte id'er ved de observerede fokusafvisninger er ikke aflæst. Syntetiske normale DA/DE/EN-prøver beviser komposition og kontrakt, ikke ekstern AI-accept. Det lokaliserede tyske input er større; virkningen på den uafklarede leverandørtid er ikke målt. Syv sekunders serverfrist, otte sekunders klientfrist, kvoter, model, requestparametre og privacy består. Den særskilte lokale komma-/helspørgsmålsfejl ændres ikke her, fordi den stadig er numerisk bundet i 598. Se håndbog 89.279.

## Tillæg 2026-11-14 — private fasetider med uændret svarfrist

Den forberedte observationsændring bevarer den fælles hårde serverfrist på syv sekunder og klientens otte sekunder. Modellen, alle requestparametre, offentlige svar og headers, validering, 6/minut, 40/time, 300/dag, dataminimering og oprydning ændres ikke. Sen body- eller kvoteafslutning får fortsat ingen vej til et nyt leverandørkald efter fristen. Der sendes ingen ekstra AI-forespørgsel eller automatisk genprøve.

Den eksisterende private fejlmarkør kan få seks faste observationsfelter. `quotaCompletedElapsedMs` og `quotaCompletedRemainingMs` er ét monotont snapshot efter bestået kvoteventetid. `providerStartElapsedMs` og `providerStartRemainingMs` er samme type snapshot umiddelbart før det lokale fetchkald, efter opbygning af argumenterne. Elapsed er tid siden den samme serverfrist begyndte; remaining er restbudget, ikke en ny fasefrist. En fase, der ikke blev observeret, har null. `providerFetchCalled` skelner lokal fetchinvokation fra den allerede eksisterende providergren. Det beviser aldrig modtagelse eller arbejdstid hos Cloudflare. `deadlineCause` bevarer den første faste årsag TIMER, REQUEST_ABORT eller CHECK, ellers null.

Observationerne føjes kun til de eksisterende observerede providerfejlgrene. Et tidligere body- eller kvoteafslag får ingen ny fejlgren eller logmarkør. Tal og årsager kontrolleres før logning; spørgsmål, svar, rå body, URL, credentials, request-id og frie fejlbeskeder indgår ikke. Loggerfejl bevarer den oprindelige offentlige status og body.

Den fokuserede lokale kontrol og de eksisterende assistentmål er syntetiske beviser. Ændringen løser ikke den observerede AI-timeout og dokumenterer ikke ekstern AI-accept. Faktisk tidsfordeling, præcis kildelevering og offentlig afprøvning er fortsat åbne. En eventuel senere fælles afstemning af server- og klientfrist kræver et begrundet budget og den normale bindingsvej. Der er ikke valgt nye frister eller providerparametre. Se håndbog 89.279.

## Tillæg 2026-11-01 — samlet serverfrist og relevante eksisterende fakta

Den lokale efterfølger bevarer alle 45 udstedte fakta og den fulde vidensbinding. Kun et helt genkendt generelt identifikationsspørgsmål må vælge et mindre, præcist relevant udsnit før inference. Hele det oprindelige spørgsmål kontrolleres, og et ukendt eller blandet led giver ikke adgang til at erklære et delsvar fuldstændigt. Manglende viden om en lups diagnostiske værdi beskrives uden opfundne kendetegn. Uvedkommende zone-/scorefakta kan ikke passere eftervalideringen for det valgte udsnit.

Den eksisterende syvsekunders serverfrist omfatter nu indgående indhold, kvoteventetid, leverandørens svarindhold og sidste synkrone svarbeslutning. Ejet indholdslæsning og leverandørtransport afbrydes; de uændrede kvotetransporter kan afsluttes senere, men får ingen fortsættelse til et leverandørkald. Browserens otte sekunder og fælles gateway ændres ikke. Der loves ikke wirelevering inden syv sekunder eller en løst koldstartsårsag.

En fast succesheader må kun sættes efter den reelle leverandørgren og normal resultatvalidering. Den indeholder ingen private oplysninger og erstatter ikke faktisk hosted kvalitetsaccept. De to normale lokale mål består med syntetisk transport. Præcis kildekontrol, sikker levering og offentlig DA/DE/EN-afprøvning udestår. Model, kvoter, klient, fakta, C/I/T, SQL, vejr, score og tidligere sikkerhedsgrænser bevares.

# DEC-0091 – Bred, versionsbundet og read-only viden i Spørg RavRadar

## Tillæg 2026-10-25 — hele spørgsmålet og samme offentlige prognose

De konkrete ejerfejl kræver produktrettelser, ikke flere generiske afvisninger. Kese/ravkese, egne funktioner og almindelig vind forklares gennem den normale lokale viden. Efterspurgt kalenderdag og national rangering læses fra hjemmesidens allerede validerede projektion uden ny scoring eller fuld zonehentning. Hele inputtet kontrolleres før match; tvetydige datoer og ukendte kvalifikationer må ikke blive et sikkert delsvar.

En faktisk offentlig ekstern case besvarede kun en del af et sammensat spørgsmål. Det eksisterende care-faktum er derfor styrket med allerede kurateret DA/DE/EN-viden om overflade, sprækker og opbevaring, og prompten kræver alle understøttede led eller ærlig usikkerhed. Faktaliste, sikkerhedsgrænser, kvoter og read-only-kontrakt bevares. Normale lokale mål og de direkte kontroller af den nu udstedte 4.0.588-binding består; præcis samlet kilde-/databasekontrol, installation og faktisk offentlig kvalitetsaccept mangler stadig. HTTP 200 eller et lokalt regelsvar er ikke samlet AI-accept.

## 9. oktober 2026 – lokal 4.0.553-rettelse af score-til-fund-svar

Faktisk offentlig browserafprøvning viser fjernsvar, der udleder reduceret
fundchance af lav score. Otte hele DA/DE/EN-spørgsmålsformer får nu et
kontrolleret svar i den eksisterende Edge-del baseret på de eksisterende
offentlige fakta: score er ikke målt fundchance eller mængde, og lav score
udelukker ikke fund. Kun input, som faktisk når Edge, dækkes. Hele inputtet
kontrolleres; ekstra ukendte eller sammensatte led beholder normal routing.
Andres private fund afvises, også efter lang indledning. Bindinger, CORS,
størrelse, sprog, kvoter og provider bevares. Normal handlerkontrol består
lokalt; offentlig levering mangler. Dette aktiverer hverken den brede
isolerede assistentkandidat eller bindingsadskillelsen i bero. Interne fejl,
privat diagnostik og produktionsfakta må ikke indgå i den offentlige viden.

## Tillæg 2026-10-20 — lokal 585-kandidat, hele spørgsmål uden ny myndighed

585 forbedrer den eksisterende DA/DE/EN-vej ved hele sammensatte spørgsmål, afgrænsede begynderspørgsmål, materialefarve kontra prognosefarve og offentligt emnebundne opfølgninger. Ukendt kvalifikation må ikke skjules af et lokalt delmatch. Den efterspurgte fremtidstime må ikke beskrives med aktuelle zonetal uden udtrykkelig afgrænsning. Ingen samtalehistorik, private brugerfakta eller interne fejlrapporter føjes til offentlig QA-viden. De oprindelige faglige read-only-, kilde-, sikkerheds- og privacygrænser består.

Den normale kvote- og turlagertransport bruger moderne `sb_secret_` kun som apikey; legacy service-role JWT beholder Bearer. RPC, body, kvote og timeout lempes ikke. Historisk hosted nøglefamilie er ukendt, så den lokale rettelse er ikke bevis for årsagen til samtlige 503 eller for fungerende ny ekstern AI. Lokale mål består; rigtig 585 PostgreSQL/source-CI, sikker Worker/Edge/Pages-levering og normal offentlig ekstern-AI-rundtur med aktuelle bindinger udestår. Den tidligere produktionsverifikation nedenfor er historisk evidens for sin egen version, ikke en leveringskvittering for 585. Se håndbog 89.259 og CURRENT_TRUTH.

## Status

Besluttet og produktionsverificeret i 4.0.293/4.0.294. Den offentlige formuleringstest udløste og lukkede en afgrænset 4.0.294-hotfix. **Kildebegrænsningen i beslutningens punkt 1 er historisk og erstattet af DEC-0105**, som tillader kildeklassificeret ekstern forskning, officielle kilder, RavRadars systematiske forskningsgrundlag og navngiven praktisk ekspertviden. Read-only-, sikkerheds-, privacy- og modelgrænserne består.

## Problem

Den offentlige GPT-OSS-gateway var sikker og domæneafgrænset, men dens godkendte vidensudsnit bestod kun af ti primært Candidate G-relaterede fakta. Den lokale fallback havde ni grove intents. Almindelige spørgsmål om ravets oprindelse, massefylde, skjulte lagre, kystformer, felttegn, identifikation og vejrforløb var derfor afhængige af AI-kvoten eller endte i et generisk svar.

## Beslutning

1. Grundbogens allerede godkendte, offentlige DA/DE/EN-viden er den faglige kilde. Assistenten må ikke opfinde nye naturgrænser eller gøre spor og mulige fælder til beviser eller garantier.
2. Den lokale router dækker 17 konkrete emner på dansk, tysk og engelsk: oprindelse, massefylde, tilgængelige ravlagre, vind, bølger, strøm, vandstand, kystfælder, felttegn, identifikation/UV, waders, vejrforløb, Candidate G, manglende data, modelbegrænsninger, teknik og udstyr.
3. Bedste sted, bedste tidspunkt og den valgte zones konkrete RavScore forbliver deterministiske Candidate G-funktioner. Almindelige faktaspørgsmål besvares lokalt uden netværk eller kvote; åbne relevante specialspørgsmål kan fortsat gå til GPT-OSS.
4. Den offentlige Edge-viden udvides fra 10 til 23 evidens-ID'er om de samme emner. Modellen skal fortsat returnere eksakt JSON, korrekt locale og kun kendte evidens-ID'er; ukendt eller ugyldigt output fejler lukket.
5. Fast afvisning, dobbelte domænegates, server-only credential, dataminimering, CORS, 6/minut, 40/time, 300/dag, syv sekunders timeout, gratis Workers-kvote og `ravAssistantRemoteEnabled=false` som rollback bevares.
6. Lokal viden låses med 51 reproducerbare cases, 17 pr. sprog. Den samlede provider-eval udvides til 66 balancerede cases, 22 pr. sprog, og dækker de nye evidensfamilier.

## Sikkerhedsgrænser

- Begge assistentveje er read-only. De kan ikke skrive eller ændre kort, prognoser, RavScore, vejr, sortering, konto-/turdata, privatliv, geometri eller land-/vandpunkter.
- Browseren modtager fortsat ingen Cloudflare-credential. Fjernkonteksten er fortsat begrænset til den valgte zones offentlige, allowlistede felter uden koordinater, rå U/V, persondata eller interne diagnoser.
- RavScore er ikke en procentchance eller sikkerhedsvurdering og kan ikke garantere fund.
- Kvote-, timeout-, Edge- og providerfejl må kun påvirke det enkelte fritekstsvar og falder tilbage lokalt.

## Verifikation

Målrettet kontrakt dækker alle 51 lokale sprog-/intentkombinationer uden et eneste netværkskald, 66 balancerede modelcases, komplet i18n-nøgle-/parameterparitet, offentlig dataminimering, evidensvalidering og eksisterende Candidate G-svar. PR #194 exact-head `33130341973`, merge `25722abc`, produktion `33130425262`, build `98718434389` og Pages `98721765768` er grønne. Den offentlige kontrol fandt derefter, at **Hvordan opstod rav?** ikke matchede oprindelses-intentet. 4.0.294 tilføjede denne og tilsvarende tyske/engelske dannelsesformuleringer samt tre nul-netværksregressioner. PR #195/exact-head `33131976433`, merge `a3eb4ac5`, produktion `33132053882`, build `98723615102` og Pages `98725082313` er grønne; offentlig DA/DE/EN-kontrol beviser de tre lokale svar. Den live 23-fakta Edge består desuden DA/DE/EN, fast afvisning, CORS/origin og reel 6/minut-browsergrænse med lokal fallback uden ændring af beslutningens faglige eller sikkerhedsmæssige grænser. Den efterfølgende driftsrotation 2026-08-28 erstattede kun server-secret'en, bestod samme livegrænser før tilbagekaldelse og et `200`-kald efter tilbagekaldelsen og ændrede ingen af beslutningens produkt-, data- eller privatlivskontrakter.

## 25. november 2026 – hvorfor UV-lys alene ikke kan identificere rav

Et sammensat spørgsmål i den offentlige tyske formular spurgte, hvorfor UV-lys alene ikke kan identificere rav sikkert, og hvorfor gløden er sværere at se i dagslys. Formularen viste beskeden om et utilgængeligt AI-svar. Det konkrete svar fra AI-tjenesten er ukendt.

Rettelsen dækker hele spørgsmålsformen på dansk, tysk og engelsk med den eksisterende forklaring om UV og dagslys. Andre materialer kan også fluorescere under UV-lys, og dagslyset kan overdøve gløden. Spørgsmål med ekstra ønsker går videre som hele spørgsmål. Den almindelige formularprøve dækker svarene og tilfældet med et yderligere ønske om private oplysninger. Browserprøven på den offentlige rettelse følges efter levering.

## 25. november 2026 – fanens sprog ved opfølgning om prognosen

En tysk fane kunne svare på både et spørgsmål om ravkesen og morgendagens bedste sted, men afvise opfølgningen om tirsdag efter et sprogskift til dansk i en anden fane. Årsagen var, at emnevalget stadig læste det gemte sprogvalg. Den åbne fane sender nu sit viste sprog til emnevalget. Den direkte kalder kan fortsat bruge det gemte sprog som standard. Formularprøven sammenligner de to situationer med den normale lokale rangering og uden netværkskald.
