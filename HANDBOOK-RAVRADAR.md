# RavRadar Håndbog

## Hver lokal kystdel vurderes mod sin egen kyst – 4.0.233

Strømpilen viser, hvor vandet bevæger sig. Den skal derfor ikke altid pege mod land. Ved Havsande viste pilen en nordgående strøm korrekt, men tekst og RavScore kunne samtidig kalde den gunstig indtransport, fordi `Havsande – nordkyst` arvede de ældre retninger `Nord for fyret` og `Syd for fyret` fra hele Blåvand-zonen. Systemet kunne vælge den sydlige retning, selv om panelet viste nordkysten.

Fra 4.0.233 har hver lokal kystdel præcis ét aktivt scoreanker: dens eget blå vandpunkt, grønne landpunkt, lokale navn og retningen fra vand mod land. Moderzonens eller en nabodels retningsankre må ikke bruges i delens score, historik, debug eller forklaring. Det betyder eksempelvis, at `Havsande – nordkyst` kun forklares og scores som `Havsande – nordkyst`; navnet `Syd for fyret` kan ikke længere optræde som dens valgte transportgrundlag.

Den landsdækkende kontrol omfatter alle 673 dele. Den ændrer ikke strømværdien, pilens retning, modelcellen, kildeordenen eller kravet om 673/673. Den retter forbindelsen mellem de allerede godkendte lokale punkter og den beregning, brugeren ser.

4.0.233 er produktionsverificeret i de fulde centrale kørsler `#32165688946` og `#32165969786`. En direkte livekontrol af 673 dele og 43.064 prognose-/jagtformstimer fandt ingen uoverensstemmelser mellem delnavn, lokal retning, vinder, score, strømretning, pilens modelcelle, provenance eller afstandsgrænse.

## Supplerende strøm kører som kontrolleret live-pilot – aktiv fra 4.0.232

RavRadar bruger fortsat DMI som førstevalg, men ejeren har godkendt, at de verificerede supplerende strømdata går online på den nuværende ikke-offentlige udviklingsside. Når lokal DMI mangler ved en præcis time, prøver systemet Baltic NEMO og derefter AMM15 inden for 5 km. Kun for de otte udtrykkeligt godkendte Limfjordsdele må nærmeste `dkss_lf`-celle til sidst bruges som regional proxy inden for 15 km. Nærmeste komplette vandkolonne vælges før dybeste fælles lag, og der interpoleres ikke mellem Copernicus-/proxytider, celler eller lag.

Kildernes autentificerede råcache opbevares højst syv døgn og forbliver privat. Den validerede liveprojektion ligger derimod online i den separate fil `data/live/current-pilot-history.json` med U/V, kilde, tidspunkt, grid, dybde, afstand og kvalitetsklasse. Filen hentes ikke ved normal sidestart, så hele historikken ikke gør kortet langsommere. Copernicus-loginoplysninger kommer aldrig med. Den aktuelt valgte post må påvirke RavScore og de nye pile, og særligt lavvandede celler med kun overfladelag mærkes `surface-only` frem for at blive kaldt bundnære.

Syvdøgnsgrænsen kontrolleres ved hver normal releasevalidering. Systemet beholder en prøve på selve 168-timersgrænsen, fjerner ældre, fremtidige eller beskadigede poster og samler identiske prøver. En helt ny prøve accepteres kun, når punkt, modelcelle, afstand og begge strømkomponenter opfylder samme-tid/celle/lag-reglen. Det naturlige syvdøgnsforløb observeres i den virkelige live-runtime og er ikke længere et krav om syv dages spøgelsestest før første aktivering.

Den første autentificerede timeprøve dækkede 43 af de 51 aktuelle DMI-huller: 39 fra Baltic og fire fra AMM15. De sidste otte er præcis de godkendte Limfjordsproxyer. Den centrale produktionskørsel `#32158041877` bekræftede derefter hele kildekæden med 622 lokale DMI-dele, 43 Copernicus-dele og otte regionalproxyer, altså præcis 673/673. Fuld validering, releasegate, Supabase og Pages bestod, og datasættet er hashverificeret på den aktive side. Normal `controlled-live` er derfor åbnet, mens syvdøgnsstabiliteten eftermåles live.

GitHubs egen timeplan viste sig ikke stabil nok. RavRadar bruger derfor den samme eksterne tidsstarter, som allerede starter vejropdateringen, som et sikkert hjerteslag. Et privat job ser kun efter, om cachen indeholder den aktuelle UTC-time. Mangler timen, starter det den eksisterende Copernicus-collector; findes timen allerede, downloades den ikke igen. Kontrollen skriver aldrig rå strømværdier eller credentials i loggen.

En UTC-time tæller kun som færdig for den punktbestand, den faktisk blev hentet til. Collectoren laver derfor et digitalt fingeraftryk af alle centrale del-ID'er og vandpunkter og gemmer det sammen med timens forventede antal råposter. Hvis ejeren flytter blot ét vandpunkt, hvis en gammel cache mangler dette manifest, eller hvis recordantallet ikke passer, hentes timen igen. Data fra gammel og ny geometri blandes dermed ikke.

Før de otte regionale poster anvendes, kontrollerer systemet, at hvert centralt vandpunkt stadig er præcis det ejer-godkendte punkt, at delen stadig tilhører Limfjorden, at kilden er `dkss_lf`, og at den faktiske modelcelle højst ligger 15 km væk. Denne undtagelse ændrer ikke 5-km-grænsen for nogen anden del. Den viste score og pil bruger samme præcise U/V-post, og pilen står på den faktiske modelcelle.

En versionsstyret driftskontrol fungerer som sikker rollback. Normaltilstanden `controlled-live` kræver 673/673. Hvis supplementet viser en reel fejl, kan `dmi-only-rollback` slå Copernicus og regionalproxy ud af score og pile igen, mens friske vind-, bølge-, vandstands- og øvrige prognoser fortsætter. De berørte strømdele bliver tydeligt `missing`; rollback må aldrig foregive fuld strømdækning.

## Den lokale strømpil følger den scoretime, der faktisk vises – 4.0.231

En lokal kystdel kan mangle verificeret strøm omkring byggetidspunktet, men have et senere gyldigt DMI-tidspunkt, som bliver den nærmeste scorepost på kortet. Tidligere blev scoren og pilens sted valgt i to forskellige rækkefølger: scoren kunne være fra den senere gyldige time, mens pilen blev forsøgt placeret ved byggetiden og derfor faldt tilbage til det blå vandpunkt.

Fra 4.0.231 vælger RavRadar først den lokale scorepost, som faktisk vises. Derefter hentes pilens position fra netop denne times verificerede DMI-proveniens. Hvis den viste time ikke har en dokumenteret DMI-celle, vises ingen lokal DMI-strømpil. En anden times celle eller administratorens vandpunkt må ikke ligne et målepunkt.

Rettelsen ændrer ikke strømværdien, det valgte dybdelag, RavScore, land-/vandpunkter eller femkilometergrænsen. Den sikrer alene, at tal, tid og pilested er ét sammenhængende fysisk udsagn. Den private syvdøgnsopsamling og den planlagte analyse af hele transportkæden fortsætter uændret.

## Strøm vælges selvstændigt på tværs af DMI's havområder – 4.0.230

RavRadar brugte tidligere ét samlet valg af havmodel til både strøm, vandstand og vandtemperatur. Det kunne skjule en god, nær strømcelle, hvis et andet modelområde var foretrukket til et skalarfelt. Ved Havknude fandtes der eksempelvis et komplet strømpar 2,80 km fra vandpunktet, men et andet modelområde var valgt til øvrige havdata.

Fra 4.0.230 vurderes strømmen særskilt for hvert DMI-tidspunkt. RavRadar leder på tværs af alle aktive danske havmodelområder efter det nærmeste sted med både strøm-U og strøm-V. Først i den valgte vandkolonne tages det dybeste gyldige lag. Vandstand og overfladetemperatur beholder deres egne modelvalg og kan ikke længere fjerne eller blokere strøm.

Hvis den bedste strømcelle eller model skifter mellem to DMI-tider, opfinder RavRadar ikke en glidende mellemstrøm; mellemtimen bliver manglende. Afstandsgrænsen på 5 km, administratorens punkter, RavScoreformlen og reglen om ingen uverificerede pile er uændrede. Den private syvdøgnsopsamling fortsætter samtidig score-neutralt til den senere analyse af ydre tilførsel, overgang mod kysten og lokal bundnær levering.

## Bugtede kyster kan godkendes ud fra helhedsindtrykket – 4.0.227

RavRadar viser fortsat, hvor meget linjen fra det blå havpunkt til det grønne landpunkt afviger fra den nærmeste korte kystlinje. På en lige kyst er det et nyttigt fingerpeg. På en bugtet eller meget detaljeret kyst kan et ganske kort kysthak imidlertid vende anderledes end den samlede strækning.

Fra 4.0.227 er denne lokale vinkel derfor kun en advarsel. Den kan ikke længere låse **Godkend og gem centralt**, når ejeren har kontrolleret hele zonen og sat de tre flueben. Admin skriver direkte, at ejerens manuelle helhedsvurdering afgør godkendelsen.

Manglende punkter, urimelig afstand, en linje der ikke rammer den valgte kyststrækning, eller punkter på samme side er fortsat reelle fejl. Central readback og den efterfølgende DMI-/releasekontrol er også uændrede. Rettelsen flytter ikke eksisterende punkter og ændrer ikke RavScore af sig selv.

## Supabase genprøver én annulleret diagnostikskrivning – 4.0.226

En stor beskyttet driftsrapport kan normalt gemmes på cirka 10–12 sekunder, men én produktion ramte databasens tidsgrænse efter cirka 19 sekunder. Alle vejr- og releasekontroller var allerede grønne, og siden blev korrekt ikke deployet.

Fra 4.0.226 genprøver RavRadar præcis én gang, når Supabase udtrykkeligt svarer, at PostgreSQL annullerede statementet på grund af timeout. Gentages timeouten, eller opstår en anden fejl, stopper releasekæden fortsat. Timeoutgrænsen, rapportens indhold, adminhistorik, vejrdata og RavScore er uændrede.

Den fulde produktionskørsel #2816 bestod alle vejr- og releasekontroller, Supabase og Pages. Den store rapport blev denne gang gemt i første forsøg på cirka 11,5 sekunder; den særlige timeoutvej er derfor bevist i en kontrolleret test og ikke ved at fremprovokere en databasefejl.

## Den aktuelle vandstandstime beholder sin modelidentitet – 4.0.225

En vejrbygning få minutter efter hel time kunne vise den rigtige vandstand, men mangle modelnavn og modelkørsel på netop den igangværende time. De senere timer var korrekt mærket.

Fra 4.0.225 starter vandstandens kildeindeks på samme aktuelle klokktime som den offentlige prognose. Den faktiske byggetid bruges fortsat til at beregne forecastalder. Vandstand, valgte punkter, vægte, fallback og RavScore er uændrede.

Produktionskontrollen i #2810 gennemførte hele validerings- og deploykæden. Alle 22.890 routede DMI-vandstandstimer havde fuld kildeidentitet, inklusive 210/210 zoner i den aktuelle time, og det deployede site serverede samme komplette 210-zone-datasæt.

## Vandstand viser den model, der faktisk leverede værdien – 4.0.224

RavRadar kan beregne en zones vandstand fra ét eller to valgte DMI-vandstandspunkter. Værdien var korrekt, men kildeoplysningen kunne blive stående fra zonens tidligere havmodel. Det var især misvisende, når de valgte punkter lå i to forskellige DMI-modelområder.

Fra 4.0.224 følger de faktiske modelnavne, modelkørsel og kildetider med den beregnede vandstand. Hvis to modelområder indgår, vises det i data som en sammensat kilde i stedet for at vælge ét navn. Selve vandstanden, de valgte punkter, vægtene, fallbacken og RavScore er uændrede.

## Mindre Supabase-forbrug uden tab af admin-data – 4.0.219

RavRadar genbygger en detaljeret rapport om vandstandsrouting ved hver vejrbygning. Tidligere blev den gamle rapport først hentet fra Supabase, selv om den straks blev erstattet. Fra 4.0.219 springes kun denne overflødige hentning over. Den nye rapport gemmes fortsat centralt og kan læses i admin; stationsregister, regler, routingvalg og andre redigerbare data hentes stadig før beregningen.

En lokal estimator viser lavere forventet pipelineforbrug, men den kan ikke erstatte Supabases faktiske forbrugstal. Derfor fortsætter overvågningen gennem næste faktureringsperiode.

## Et sent strømpar må ikke fjerne strømmen nu – 4.0.218

RavRadar vælger én DMI-havmodel ad gangen for en zone. Fra 4.0.218 kan en anden model ikke overtage alene på grund af et lidt bedre punkt flere døgn ude, hvis den nuværende model allerede har et komplet strømpar omkring nu. Den anden model må stadig overtage, når den også selv har strøm omkring nu, og en zone uden aktuel strøm må stadig repareres. Der opfindes ingen data, og RavScore er ikke ændret.

## Verificeret strøm gemmes i hele tre-døgnsvinduet – 4.0.217

RavRadar gemmer den samme aktuelle vejrprøve i et aktivt 24-timersvindue og et score-neutralt 72-timersvindue til senere forskning. En efterkontrol viste, at selve DMI-strømmen var verificeret, men at mærket kun blev skrevet tilbage til 24-timerslisten. Da næste kørsel viderefører den lange liste, gik mærket tabt igen.

Den aktuelle prøve gemmes nu med samme strenge DMI-verifikation i begge vinduer. Gamle uverificerede prøver ændres ikke, så systemet opfinder ingen historik. RavScore, kilder og fallback er uændrede; 72-timersvinduet skal fortsat opbygges naturligt over tre døgn før faglig brug.

## Gamle temperaturer uden lagmærkning fjernes – 4.0.214

RavRadar viser kun DMI-vandtemperatur, når målingen beviseligt kommer fra havoverfladen. Ældre cachede temperaturer uden lagmærkning vises som manglende, indtil DMI har genopbygget dem. Vind-, bølge-, strøm- og vandstandshistorik bevares.

## Vandtemperatur er temperaturen ved havoverfladen – 4.0.213

DMI's havmodeller indeholder temperatur både ved overfladen og i mange dybder. RavRadar skelnede tidligere ikke disse lag i den skalare temperaturkæde. Et dybere lag kunne derfor overskrive overfladeværdien, selv om appen viser feltet som almindelig vandtemperatur og fallbacken leverer havoverfladetemperatur.

RavRadar accepterer nu kun DMI's eksplicitte overfladelag, niveau 0, som offentlig vandtemperatur. Laget gemmes sammen med kilde, modelkørsel og tidspunkt. Dybere temperaturer bruges ikke som erstatning; hvis overfladetemperaturen mangler, forbliver den manglende eller følger den eksisterende tydeligt markerede komponentfallback.

Produktionskontrollen i 4.0.221 viser, at genopbygningen er færdig i den aktuelle cache: alle 210 hovedzoner har et dokumenteret overfladetemperaturpunkt, og alle 9.159 kontrollerede DMI-temperaturtrin kommer fra `surface:0`. Det gælder IDW-, NSBS- og Limfjordsmodellen. Det kortere temperaturforløb i otte Limfjordszoner er et separat prognosehorisontproblem og ikke en dybdetemperatur.

Rettelsen ændrer ikke RavScore, mobiliseringsstate, fallbackprioritet eller 72-timershistorikken. Den sikrer alene, at den viste DMI-temperatur har den samme tilsigtede fysiske betydning som feltets navn og fallbacken. De otte Limfjordszoners sidste 15 timer er fortsat en separat åben dækningsanalyse.

## Havmodelvalget bevares mellem kørsler – 4.0.211

4.0.210 fandt de rigtige strømdatahuller, men produktionskontrollen viste, at DMI-filerne ikke blev læst igen. Cachen huskede, at filerne tidligere var behandlet, men havde mistet oplysningen om, hvilken havmodel der var valgt for hver zone.

RavRadar bevarer nu havmodelvalget sammen med serien. For den eksisterende cache gendannes valget fra den faktisk anvendte model, dens gitterafstand og zonens kysttype. Den aktuelle DMI-kørsel genbehandles én gang, så manglende begyndelsestimer kan komme tilbage. En dårligere model må ikke rydde en bedre bevaret serie.

Manglende strøm forbliver missing, og RavScore ændres ikke.

## Sammenhængende DMI-strøm fra nutiden – 4.0.210

RavRadar kontrollerede tidligere strømprognosens sidste tidspunkt, men ikke om serien begyndte ved nutiden. Derfor kunne nogle få strømtrin langt ude i femdøgnsprognosen skjule, at de første døgn manglede.

En strømserie tæller nu kun som dækkende, når den starter tæt på den aktuelle vejrbygning og fortsætter uden større huller. Ellers prioriteres den relevante DMI-havmodel igen. Manglende værdier forbliver manglende; rettelsen tilføjer ingen ny kilde, interpolation eller scoreændring.

Det første produktionsmål er at genhente de 200 hovedzoner, som 4.0.209 fejlagtigt betragtede som dækkede. Derefter følges den verificerede 72-timers strømhistorik, før strøm får nogen ny betydning i mobiliseringsscoren.

## Tre døgns score-neutral vejrhukommelse – 4.0.209

Den hidtidige pipeline gemte 101 rå prøver pr. zone over præcis cirka 24 timer. Det bærer den aktive døgnbaserede mobiliseringsscore, men ikke en senere faglig analyse af storm, transport og faldende energi gennem flere døgn.

RavRadar bevarer derfor nu to adskilte vinduer. `samples24h` er fortsat det eneste rå vindue, som RavScore og `shadow-v2` bruger. `samples72h` bevarer tre døgn med vind, bølger, strøm, vandstand og temperatur til senere mobiliseringsanalyse. Det længere vindue ændrer ingen score, vægt eller tærskel.

Rå historik sendes fortsat ikke i den kompakte `public-conditions.json`. En fremtidig scorebrug af timerne 24–72 kræver særskilt faglig analyse, regressioner og ejerbeslutning. Vandstands-continuity bevarer samtidig DMI-timens fulde identitet.

## Lokal validering og aktive zoner – 4.0.208

RavRadars aktive zoner bestemmes af den centralt gemte administratorstatus. En historisk fil i repositoryet kan derfor indeholde en zone, som senere er slettet centralt, eller mangle en zone, som senere er godkendt. Den fil er udviklingshistorik og må ikke alene bruges som bevis for, at den offentlige side mangler en zone.

Den aktuelle offentlige bestand er 210 hovedzoner. De tre Vadehavszoner `DK-B04-12`, `DK-B04-13` og `DK-B04-14` findes både i det deployede zoneregister og i det offentlige vejrdatasæt. Fejø/Femø og Havnø/Mariager Fjord øst er centralt slettede og må ikke genopstå fra ældre snapshots.

Den lokale datavalidering er fortsat streng. Hvis zone- og vejrlisterne ikke matcher, stopper den. Er vejrsnapshotet samtidig udløbet, forklarer den nu, at der er tale om et **forældet lokalt vejrsnapshot**, ikke automatisk en produktionsfejl. `npm run audit:deployed-zone-weather` kan kontrollere den deployede bestand uden at skrive. En fuld frisk kørsel skal først hente central adminstatus og anvende tombstones, derefter hente eller bygge vejr og til sidst køre alle gates.

`npm run hydrate:deployed-weather` opdaterer kun mutable vejrfiler. Kommandoen erstatter ikke central adminhydrering og må ikke bruges til at omgå eller skjule en reel dækningsfejl.

4.0.208 er produktionsverificeret i GitHub Actions #31848912461 på commit `7a3382f200a72b702d814ba4d8ca205dc4523369`. Den fulde kæde og deploy bestod, og den direkte efterkontrol viste version 4.0.208, 210/210 matchende zoner og vejrposter samt vejrdata til alle tre Vadehavszoner.

## Ren og idempotent fallbackkontrol – 4.0.206

Den private fallbackkontrol skal kunne køres både på en helt ren GitHub-runner og efter, at en tidligere godkendt kandidat allerede er blevet aktiveret. Byggeren opretter derfor selv alle sine private outputmapper. Den bruger den centralt hydrerede aktive kyst som sandhed og kan genkende de aktive naborester, selv om de oprindelige del-ID'er ikke længere findes.

Når en aktiv naborest allerede har et valideret landpunkt, vandpunkt og en afledt pålandsretning, bevares de eksakt i den nye private kandidat. De må ikke erstattes med historiske hardcodede punkter. Et eksisterende punktpar uden retning afvises fail-closed.

Det kandidatbundne ESA WorldCover-bevis er genkørt på den aktuelle 17-dels fallbackbestand. Resultatet er uændret: 11 punktpar er verificeret, fire vendes sikkert, og to forbliver blokerede. Den rene lokale slutkæde har 2/2 ejerskabsflytninger, 9/9 erstatninger og nul overlap. Den fulde private GitHub-kæde bestod i #31829349458, inklusive native DMI, central rollback og artifacts. Det er et teknisk bevis, ikke en aktiveringsbeslutning; offentlig aktivering kræver fortsat en særskilt ejerafgørelse.

## Sikker central adminforbindelse – 4.0.205

GitHub Actions bruger Supabases nye, uigennemsigtige `sb_secret_`-nøgle som `apikey`. Den må ikke sendes som et Bearer-token. Supabase omsætter selv nøglen til et internt, kortlivet token, før Data API'et kaldes.

Hvis netop denne interne omsætning én enkelt gang svarer med HTTP 401 og fejlkoden `PGRST303`, venter RavRadar ét sekund og prøver samme anmodning én gang mere. Alle andre adgangsfejl – og en gentaget `PGRST303` – stopper fortsat processen. Nøgler, komplette URL'er og rå admin-data må ikke skrives i rapporter eller logs.

Reglen gælder både Node-baserede roundtrips/synkroniseringer og Python-hydreringen, der henter centrale ejerdata før DMI. Når GitHub Actions har centrale secrets, må en læsefejl ikke falde tilbage til historiske repositorydata. Beskyttet synkronisering læser altid det eksisterende manifest fail-closed; en læsefejl må ikke fortolkes som “intet manifest”, fordi det ellers kunne udløse unødvendige genskrivninger og belaste Supabase-kvoten. En særskilt målrettet workflowkontrol kan genbruge et eksisterende privat QA-artifact og prøve den centrale roundtrip/rollback igen uden ny DMI-opbygning eller mulighed for deploy.

## Kandidatbundet land-/vandkontrol – 4.0.204

Den uafhængige 10-meterkontrol må kun rette den præcise punktbestand, som kontrollen faktisk blev lavet på. Hvert privat bevis indeholder derfor både antallet af kystdele og et digitalt fingeraftryk af alle ukorrigerede land-/vandpunkter. Hvis kysten, del-ID'et eller punktparret ændres, stopper workflowet i stedet for at genbruge en gammel afgørelse.

Foreløbig national kandidat har 835 dele: 520 er verificeret, 149 kan sikkert vendes, og 166 forbliver blokeret. Dette første bevis er lavet direkte fra den rå, ukorrigerede GitHub-kandidat. Efter ejerens geometritrin har slutkandidaten 652 dele: 427 verificerede, 111 sikkert vendte og 114 blokerede. En blokeret del har ikke aktive land-/vandpunkter; den bevarer kun to neutrale muligheder til senere kontrol og kan ikke få vejr, state, score eller automatisk aktivering.

Fallbackkontrollen følger samme regel. Dens 17 dele har 11 verificerede, fire sikkert vendte og to blokerede. Fejø/Femø og Havnø/Mariager Fjord øst er bevidst slettede og må ikke genopstå fra historiske reviewfiler.

## Land- og havpunkter – fysisk kontrakt i 4.0.196

Hver lokal kyststrækning har et grønt punkt på land og et blåt punkt i vandet. Linjen fra det blå til det grønne punkt er pålandsretningen. Den skal krydse netop den valgte kyststrækning omtrent vinkelret. Det samme punktpar bestemmer DMI-samplingen, retningssammenligningen, den lokale score og forklaringen til brugeren; et separat gammelt retningstal kan ikke overstyre markørerne.

Den nationale kontrol bruger uafhængig 10-meter landdækning ved flere afstande på begge sider af den præcise kyst. Kun entydige fejl rettes automatisk. Tvetydige ø-, havne- og smalle kystforløb går til manuel kontrol, og stednavne bruges aldrig som bevis for, hvilken side der er land.

## Strømsted, bundnært lag og syvdøgnsforskning – 4.0.229

Det blå vandpunkt er samplinganker for både den viste strømpil og den strøm, som den aktive score må bruge. RavRadar prøver først den nærmeste DMI-vandkolonne med et komplet U/V-par og vælger derefter det dybeste gyldige lag i præcis den kolonne. Op til 3 km foretrækkes, 3–5 km kan accepteres, og over 5 km går kæden videre til de godkendte supplementer. Baltic og AMM15 må højst ligge 5 km væk; kun de otte udtrykkeligt godkendte Limfjordsproxyer må ligge op til 15 km væk. Gamle cacher, direkte ForecastEDR-strøm uden fælles kolonne- og lagbevis, Open-Meteos overfladestrøm og andre ikke-godkendte fallbacks lukkes ude før historik, score og kort.

DMI kan have forskellige dybeste tilgængelige lag på forskellige forecasttidspunkter. Derfor foretages lagvalget for hver native tid. RavRadar må kun beregne mellemtimer, når begge native tider har samme lag, vandcelle og modelkørsel; ellers vises strøm som manglende mellem tiderne. Pilen står altid på den valgte times egen dokumenterede celle. For en lokal del vælges den viste scoretime først, så pilen ikke kan falde tilbage til byggetidens vandpunkt, mens tallet kommer fra en senere DMI-time. Centralt flyttede kystdelspunkter bygges før næste DMI-sampling, og kun cachen for det flyttede punkt nulstilles.

En privat, score-neutral cache bruger DKSS-felter ved vandpunktet samt cirka 5 og 15 km søværts. Repræsentative overflade-, mellem- og bundlag bevares højst 168 timer. Også når DMI-modellen er uændret, behandler en almindelig kørsel de næste 15 kystdele i et privat arbejdsområde. Systemet genbruger først en tidsrelevant råfil med stabil identitet; mangler den, må højst én fil pr. havmodelområde og tre i alt hentes inden for det eksisterende DMI-budget og derefter bevares til genbrug. Den private behandling kan ikke skrive til offentlig vejrdata eller score. Ved den normale 15-minutters rytme besøges alle 673 dele på cirka 11 timer og 15 minutter. Den kommende analyse skal undersøge hele kæden **ydre tilførsel → overgang mod kysten → lokal bundnær levering**, inklusive tidsforsinkelse, persistens og risiko for dobbelt-tælling med vind og bølger. Ingen ny scorevægt er aktiveret.

Rotationen registrerer også, hvor langt der er til den nærmeste modelkolonne med et eksakt fælles U/V-par, selv når den ligger uden for 5 km. I det tilfælde gemmes kun koordinat, afstand og lagmetadata – ikke de fjerne strømværdier. En privat ejeroversigt skelner derfor mellem nær-tærskel 5–6 km til rent manuelt geometrireview, modelhul 6–8 km, strukturelt modelhul over 8 km og en datakædefejl, hvor gyldig strøm faktisk findes inden for 5 km. Selv en nær-tærskel-post må kun flyttes, hvis vandpunktet i sig selv er forkert – aldrig blot for at nå modelcellen. Oversigten flytter ingen punkter automatisk, og den offentlige 5 km-grænse er uændret.

**Håndbogsversion:** 4.0.233

**Opdateret:** 18. august 2026

## Lokal DMI og geografiske delscorer – 4.0.193

En lokal kystdel må kun få en lokal RavScore, når den har en tilladt, fuldt verificeret strømretning og strømhastighed. Scheduler og releasekontrol tæller derfor kystdelene selv – ikke kun hovedzonerne. Alle aktive dele skal have dokumenteret DMI-, Copernicus- eller særskilt tilladt regionalproxy-U/V, aktuelt 673/673, og runtime må aldrig vise flere lokalt scorede dele end den verificerede cache indeholder. Den historiske 95 %-indfasningsgrænse er erstattet.

Hvis de lokale data endnu ikke er komplette, bruger siden midlertidigt den fortsat valide hovedzonescore. Den påstår i så fald ikke, hvor i zonen forholdene er bedst. Når en lokal score bruges, følger dens fulde forklaring, rå vejrdata, land-/havpunkt og pålandsretning samlet med. Den tekniske visning må derfor ikke kombinere en lokal score med hovedzonens gamle retning.

Syvpointsreglen kræver en reel sammenligning. Én enkelt beregnet kystdel kan ikke bevise, at hele en bugtet zone har samme forhold. Zoner med vedvarende forskellige kystretninger skal opdeles i meningsfulde lokale beregningsdele med egne validerede punktpar; små kysthak må ikke skabe støjende kunstige dele.

Den landsdækkende systemaudit fandt 13 eksisterende kystdele, hvor det gemte referencepunkt ikke passede med den lokale kystretning og land-/vandparret. Punktparrene er genforankret til den faktiske lokale kyst og består derefter geometri- og sidekontrollen med nul fund. En konservativ retningsaudit erstatter én grov del med flere meningsfulde dele i 10 bugtede hovedzoner, herunder Helgenæs øst, så pakken går fra 651 til 673 dele.

Alle 45 nye eller flyttede vandpunkter blev valideret mod DMI's native modelgrid i den private Linux-pipeline med fuld dækning og nul ugyldige punkter. Den 673-dels pakke blev derfor aktiveret med den tidligere 651-dels pakke som rollback. Rejsby/Ribe Vesterå blev ikke ændret automatisk, fordi den lokale landside ikke kunne udledes entydigt; tvivl må aldrig omsættes til en tilfældig retning. Den senere bindende produktionsgate kræver nu verificeret tilladt U/V-dækning til alle aktive dele, aktuelt 673/673, samt alle øvrige releasegates.

## Progressiv DMI-opbygning

RavRadar bygger DMI-dækningen over flere begrænsede GitHub-kørsler. Både de downloadede modelfiler og en vellykket afledt privat zonecache bevares som arbejdsfremdrift. Cachen må kun genbruges, når den passer til præcis de aktuelle zoner, kystdele og land/hav-punkter; efter en relevant adminændring begynder de berørte data derfor sikkert forfra. Hvis den strenge datakontrol stopper en kørsel, bliver de ufærdige data ikke lagt på den offentlige side, men næste kørsel kan fortsætte fra et kompatibelt grundlag. Manglende data forbliver manglende; kontrollens krav og RavScore ændres ikke.

Hvis én DMI-havmodel bruger hele kørslens tidsbudget, husker den private cache også dette. Næste kørsel giver en af de andre relevante havmodeller førsteret, så eksempelvis Nordsøen, indre danske farvande og Limfjorden ikke kan blokere hinanden ved gentagne kørsler. En model betragtes først som færdig, når dens behandling faktisk er fuld eller dokumenteret uændret og gyldig.

## Aktuel afgrænsning af kystarbejdet

DEC-0036 begrænsede den daværende kystopgave til seks problemzoner. Efter slutkontrollen blev fem godkendte rettelser aktiveret: Langeland syd/Bagenkop, Nykøbing Sjælland/Rørvig, Dronningmølle/Hornbæk, Ålsgårde/Helsingør og Lolland vest/Albuen. Fejø/Femø blev efter udtrykkelig ejerbeslutning slettet helt ligesom Havnø og Mariager Fjord øst. Ejeren har senere udtrykkeligt godkendt en landsdækkende privat revision. Den må gennemføre alle kontroller, men den offentlige produktionskyst er fortsat baseline og må ikke erstattes uden særskilt godkendelse og fulde gates.

De seks zoner valideres i en særskilt privat arbejdsgang, som ikke kan udgive et kort. Kandidaten har 22 mål- og naborester med egne land-/vandpunkter, så nødvendige nabozoner beholder deres kyst. Delene bliver først brugbare, når DMI's native grid, lokal score, runtime og rollback er kontrolleret. Admintræk flytter altid en hel valideret kystdel med dens målepunkter og vejridentitet – aldrig en løs visuel streg. Admin viser straks en konkret fejl og udfører ikke flytningen, hvis geometri, punkter, retning eller DMI-gridbevis mangler.

## Hvor ligger zonens kystdele? – 4.0.185

Når RavRadar fortæller, at bestemte kystdele scorer højere end resten af hovedzonen, kan brugeren vælge **Hvor er det?**. Hovedkortet zoomer derefter til zonen og tegner dens allerede indlæste præcise kystdele med navn. De aktuelt bedste dele fremhæves. Hvis forskellen er højst 7 point og forholdene derfor gælder hele zonen, udpeges ingen enkelt del som bedre.

Kortet bruger de samme kystdata, som allerede er hentet til hovedkortet. Funktionen kræver derfor ingen samling af skærmbilleder og ingen ekstra datahentning ved normal opstart. Den tidligere offentlige formular **Hvad fandt du?** vises ikke længere under hver zone; turregistreringens særskilte observation og administratorens analysefunktion er fortsat bevaret.

## Lokal scoreforklaring i 4.0.184

Når en hovedzone består af flere præcise kystdele, kommer zonens viste RavScore fra den bedst scorende del. Hvis forskellen mellem bedste og dårligste del er højst 7 point, vises forholdene som gældende for hele zonen. Først når forskellen er mere end 7 point, fortæller zonepanelet tydeligt, hvilken navngiven kystdel der scorer bedst, og at den høje score ikke nødvendigvis gælder resten af zonen. Ligger flere dele inden for 7 point af den bedste, vises de alle med navn og score.

Jagtbarhed, transport, mobilisering og deres forklaringer hentes fra den samme vindende kystdel. Dermed kan en grøn hovedzonescore ikke længere stå sammen med tomme delscorer eller teksten om manglende forklaringsdata, når de lokale beregninger faktisk findes. Reglen ændrer ikke RavScore; den gør den eksisterende lokale beregning forståelig i både den aktuelle visning og femdøgnsvisningen.

Håndbogen er den faglige og tekniske reference for RavRadar. RDKS er bindende for aktive krav og beslutninger; koden er autoritativ for den aktive beregning.


## 1. Formål, målgruppe og fagligt løfte

*Håndbogens rolle som fælles sandhed for ejer, eksperter og udvikling.*

RavRadar er et beslutningsstøttesystem til ravjagt langs danske kyster. Systemet samler prognoser, lokale kystdata, en forklarlig procesmodel og kontrollerbare ekspertregler. Det skal hjælpe med at vælge sted og tidspunkt, men må aldrig fremstille en høj score som et løfte om fund.

Håndbogen er skrevet til tre målgrupper: ejeren, eksterne rav-/sediment-/kysteksperter og fremtidige udviklere. En ekspert skal kunne læse dokumentet uden at kende koden og forstå både den faglige hypotese, de konkrete tærskler og hvor systemet er usikkert.

Fagligt løfte: Alle væsentlige antagelser skal kunne spores til enten forskning, praktisk observation, projektbeslutning eller eksplicit hypotese. Systemets egne tærskler må aldrig præsenteres som naturkonstanter.
Håndbogen beskriver den aktive version. RDKS er autoritativt for bindende beslutninger, aktive krav og kendte åbne problemer. Koden er autoritativ for, hvad systemet faktisk beregner i den aktuelle release. Ved uoverensstemmelse skal uoverensstemmelsen registreres og rettes – ikke bortforklares.

I den private geometri-v2-pilot kan 4.0.135 hente gratis officielt GeoDanmark Ortofoto forår 2025 via Datafordelerens moderniserede API-key-adgang. Tre højopløselige Blåvand-udsnit overlejrer fysisk kyst, privat 15-meterslinje, punktkandidater og score-neutrale høfter. Materialet er kun et manuelt kontrolgrundlag; det aktiverer hverken geometri, vejrsampling, admin-data eller RavScore.

Ortofotoet afslørede ved Blåvands Huk en fysisk kysthårnål ind mod en sandtange/lagune. 4.0.136 målte og fjernede den indadgående detur, og #1982 gav visuelt ortofotogo. 4.0.137 kontrollerer derefter de to private vandpunkter direkte i aktuelle WAM- og DKSS-gridfelter med produktionens afstands- og fælles U/V-regler. Kontrollen aktiverer ikke punkterne.


## 2. Evidensklasser, kildekritik og usikkerhed

*En fast klassifikation, så ekspertviden og hypoteser ikke bliver skjult som fakta.*

RavRadar bruger fire evidensklasser. De skal fremgå både i håndbogen og i regelmotoren, når en faglig påstand omsættes til scorelogik.

Klasse | Betydning | Må bruges til | Må ikke bruges til
Dokumenteret viden | Understøttet af relevant forskning, officiel måling eller veletableret kystfysik | Procesforklaring, forsigtige generelle regler | Lokale numeriske tærskler uden lokal validering
Ekspertobservation | Gentagen praktisk erfaring fra kendt område og jagtform | Regelkladde, lokal prioritering, testhypotese | Automatisk landsdækkende regel
RavRadar-hypotese | Plausibel mekanisme eller arbejdsværdi | Simulering, eksperimentel regel, audit | Skjult produktionsregel uden markering
RavRadar-valideret | Understøttet af kontrollerede projektdata og hold-out-test | Modeljustering med versionshistorik | Universel naturvidenskabelig sandhed
En kilde skal vurderes efter relevans, målemetode, skala og overførbarhed. Forskning i plastpartikler kan være nyttig som analogi, fordi visse plasttyper og rav har lav densitet og kan kobles til organisk opskyl, men plast og rav er ikke identiske. Form, størrelse, overflade, biofilm, vandmætning og bundkontakt kan ændre transporten væsentligt.

Når ekspertens udsagn strider mod nuværende kode, skal udsagnet registreres som en ændringshypotese. Først når mekanisme, geografi, betingelser, effekt og test er beskrevet, kan det blive en aktiv regel.


## 3. Ravets fysiske egenskaber og hvorfor densitet alene ikke er nok

*Ravets opdrift, bundkontakt, form og kobling til organisk materiale.*

Rav er fossil harpiks med en densitet, der typisk ligger tættere på havvand end mineraler som kvarts. Det betyder ikke, at alt rav flyder frit. Mange stykker synker i almindeligt havvand, men kræver mindre løfte- og transportkraft end sand, grus og sten af samme størrelse. Saltindhold, temperatur, luftlommer, porøsitet, indlejret materiale, størrelse og form påvirker den effektive opførsel.

Den relevante model er derfor ikke 'rav flyder' versus 'rav synker', men et kontinuum:

- Rav kan ligge skjult og mekanisk låst i sand, grus, ler, tørv, tang eller revner.

- Bølger og strøm kan løsne materialet og reducere bundkontakten.

- Stykket kan rulle, hoppe, glide eller blive kortvarigt suspenderet.

- Det kan transporteres sammen med let organisk materiale eller andre lavdensitetspartikler.

- Når energien falder eller vandet trækker sig tilbage, kan det aflejres i en opskylslinje, lavning, revlebagkant, tangvold eller på en ny blotlagt kant.

Større og uregelmæssige stykker kan reagere anderledes end små flade stykker. RavRadar har i dag ingen partikelstørrelsesmodel. Scoren beskriver derfor et generelt potentiale for jagtbart rav, ikke transporten af en bestemt ravstørrelse.

Ekspertpunkt E-01: Fastlæg hvilke ravstørrelser og -former de nuværende tærskler realistisk repræsenterer, og om der bør findes særskilte profiler for småt strandrav, mellemstort rav og større bundnære stykker.

### 3.1 Densitet, opdrift og reduceret neddykket vægt

Baltisk rav omtales i den relevante kystlitteratur typisk med en materialedensitet omkring 1,05–1,09 g/cm³. Havvandets densitet varierer med saltholdighed og temperatur. Det betyder, at et stykke rav ofte er svagt negativt flydende: det synker, men den neddykkede vægt er langt mindre end for kvarts med densitet omkring 2,65 g/cm³. Den lille densitetsforskel kan gøre rav følsomt over for svage vertikale turbulensimpulser, bølgeorbitaler og kontakt med organisk materiale. Det er dog ikke det samme som neutral opdrift.

### 3.2 Form, orientering og effektiv modstand

To ravstykker med samme masse kan reagere forskelligt. Et fladt stykke har større projiceret areal og kan få større løft og hydrodynamisk modstand end et kompakt stykke. Ruhed, revner, indlejret materiale og biofilm ændrer både modstand og synkehastighed. Derfor er en enkelt densitetsværdi utilstrækkelig som partikelmodel.

### 3.3 Bundkontakt og skjult rav

Et ravstykke, der ligger frit oven på glat sand, er ikke i samme tilstand som et stykke, der er klemt mellem grus, indlejret i tørv eller dækket af et tyndt sandlag. Den kritiske belastning for at frigøre stykket kan derfor være bestemt af mekanisk låsning snarere end af ravets egen masse. RavRadar bruger i dag vejrhistorik som indirekte proxy for denne frigørelse, men beregner ikke lokal bundskærspænding eller begravelsesdybde.

Implementeret i: js/core/score-engine.js og js/core/coastal-process-model.js. Der findes endnu ingen partikelstørrelses- eller synkehastighedsmodel.


## 4. Tilstedeværelse og kildelagre

*Hvor ravet kan komme fra, og hvorfor vejr ikke kan skabe rav.*

En prognose kan kun være god, hvis der findes rav i eller opstrøms for det område, der aktiveres. RavRadar modellerer i øjeblikket ikke et fysisk lager af rav. Det betyder, at systemet vurderer transport- og findeforhold, men ikke kender den reelle mængde rav i sedimentet.

Mulige kildelagre omfatter eroderende geologiske lag, ældre strand- og klitaflejringer, undervandsrevler, lavninger med organisk materiale, tidligere stormdepoter, tangbælter og materiale transporteret langs kysten fra naboområder. En høj energihændelse kan åbne et lager; efterfølgende hændelser kan tømme det.

Gentagne høje scorer uden fund kan derfor skyldes lagerbegrænsning og ikke nødvendigvis fejl i strøm- eller bølgemodellen. Fremtidig læring bør skelne mellem 'forholdene var fysisk gunstige' og 'området leverede faktisk rav'.

Ekspertpunkt E-02: Identificér kysttyper og områder, hvor geologisk ravtilstedeværelse er kendt, sandsynlig eller lav, og vurder om der kan bygges en langsomt skiftende kildelagerfaktor uden at skabe falsk sikkerhed.


## 5. Den samlede proceskæde

*RavRadar opdeler chancen i tilstedeværelse, frigivelse, transport, koncentration, aflejring og jagtbarhed.*

RavRadar bruger proceskæden som den stærkeste forklaringsramme, men ikke som en absolut port. Den fulde kæde giver normalt det største potentiale, fordi flere nødvendige betingelser virker samtidig. Rav kan dog allerede ligge i et sekundært nærkystlager og genmobiliseres uden en ny storm eller ny erosion af et primært lager.

Den klassiske kæde er:

- Tilstedeværelse: rav findes i et tilgængeligt lager.

- Frigivelse/mobilisering: bølger, strøm eller erosion løsner rav og ledsagemateriale.

- Transport: vandbevægelsen flytter materialet mod, langs eller væk fra den relevante kyst.

- Koncentration: forskelle i densitet, form, bundfriktion og strømfelt sorterer materialet.

- Aflejring/retention: faldende energi, kystgeometri, vegetation eller opskyl fastholder materialet.

- Eksponering: vandstand og bølger gør aflejringen synlig eller tilgængelig.

- Jagtbarhed: sigt, sikkerhed, bølgehøjde og adgang gør eftersøgning realistisk.

Den aktive RavScore har tre numeriske hovedkomponenter: jagtbarhed, transport og mobilisering/tilgængelighed. Den sidste komponent vælger nu det stærkeste af ny frigivelse og nærkystnær genmobilisering. Tilstedeværelse og koncentration er endnu ikke selvstændige scoringskomponenter. De optræder kun indirekte gennem kystegenskaber, historik og ekspertregler. Det er en vigtig modelbegrænsning.

Modelkritik: En lineær vægtet sum kan give en pæn score, selv om én nødvendig proces er meget svag. Offshore-caps reducerer denne risiko for transport, men modellen har endnu ikke generelle multiplicative gates for alle procesled.


## 6. Bølger, orbitalbevægelse, brydning og turbulens

*Bølgernes dobbelte rolle som mobilisering og jagtbarhedsproblem.*

Bølger påvirker rav på flere skalaer. På dybere vand giver bølgeorbitaler frem-og-tilbage-bevægelse nær bunden. Når bølgerne kommer ind på lavere vand, ændres orbitalerne, bølgerne stejler og bryder. Brydning skaber turbulens, undertow, setup og strømme i surfzonen. Disse processer kan løsne bundmateriale og gøre lette partikler mobile.

Bølger er derfor ikke kun en 'ind mod land'-mekanisme. Den enkelte orbitalbevægelse er oscillerende, og nettotransporten afhænger af bølgeasymmetri, strandhældning, strøm, undertow, Stokes drift, sedimentets respons og hvor i profilen partiklen befinder sig. RavRadar bruger ikke en fuld bølge-resolverende partikelmodel.

I den aktive frigivelsesscore giver historisk maksimal bølgehøjde mindst 1,5 m +14 point. I den separate procesindikator giver mindst 1,2 m 22 mobiliseringspoint og mindst 2,0 m 35. Disse tærskler er arbejdsværdier – ikke validerede danske ravgrænser.

Samtidig reducerer store bølger jagtbarheden. For waders giver bølger over 0,7 m et fradrag på 25 point i jagtbarhed, mens bølger på højst 0,3 m giver +12. For strandjagt giver bølger over 2,5 m -12. Det afspejler, at høj fysisk energi kan være positiv for mobilisering og negativ for sikker eftersøgning på samme tidspunkt.

Ekspertpunkt E-03: Valider om bølgehøjde alene er tilstrækkelig, eller om periode, retning, bølgeenergiflux, brydningsindeks og varighed bør indgå.

### 6.1 Energi, periode og orbitalhastighed

Signifikant bølgehøjde er kun én del af den fysiske belastning. Bølgeenergi pr. overfladeareal vokser omtrent med kvadratet på bølgehøjden, mens bølgeperioden påvirker bølgelængde, gruppehastighed og hvor dybt orbitalbevægelsen mærkes. To prognoser med samme bølgehøjde, men forskellig periode, kan derfor give forskellig bundpåvirkning og surfzonebredde.

### 6.2 Shoaling, refraktion og brydning

Når bølger bevæger sig mod lavere vand, falder gruppehastigheden, bølgen bliver stejlere og retningen kan drejes af dybdekonturerne. Brydningen frigiver energi og driver både langs- og tværkyststrømme. Lokale revler og render kan koncentrere brydning eller skabe læzoner. RavRadars punktdata ved et havanker kan ikke fuldt beskrive denne rumlige struktur.

### 6.3 Swash og backwash

På strandfladen kommer vandet ind som uprush og løber tilbage som backwash. De to faser er ikke symmetriske: vanddybde, hastighed, infiltration, turbulens og sedimentkoncentration ændres gennem cyklussen. Rav kan føres op i swash og efterlades, men kan også genmobiliseres af backwash. Aflejring kræver derfor ikke blot pålandsgående bølger; den kræver en kombination af timing, faldende energi, strandhældning og partikelegenskaber.

Evidens: Generel bølge- og sedimentfysik er veletableret. De konkrete RavRadar-grænser på 1,2 m, 1,5 m og 2,0 m er arbejdsværdier og skal valideres mod danske funddata.


## 7. Strøm: retning, hastighed og bundnær transport

*Hvordan strøm tolkes, og hvorfor en 180°-fejl er kritisk.*

Strømdata i RavRadar tolkes oceanografisk som den retning, vandet bevæger sig mod. Vindretning tolkes meteorologisk som den retning, vinden kommer fra. En 180°-fejl i strømkonventionen kan få udtransport til at ligne indtransport og er derfor en kritisk regression.

Strømmen vurderes mod zonens lokale onshoreDirectionDeg eller mod flere retningankre for bugtede kyster. Retningsforskellen omsættes i den aktive score til en alignment:

Retningsforskel | Alignment | Fortolkning | Retningsbidrag
0–25° | 1,00 | stærkt mod land | +30
26–55° | 0,65 | delvist mod land | ca. +20
56–90° | 0,20 | skråt/langskyst med mindre indkomponent | +6
91–130° | -0,35 | overvejende væk | ca. -11
131–180° | -0,80 | kraftigt væk | -24
Strømhastighed mellem 0,15 og 0,65 m/s giver +18 i transportscoren. Over 0,65 m/s giver kun +5, fordi stærk strøm kan være effektiv, men mere uforudsigelig. Under 0,15 m/s giver -12. Hvis strømdata mangler, begrænses transportscoren til højst 52.

Ved strøm mindst 0,15 m/s og alignment højst -0,75 sættes transportloft 28. Ved alignment højst -0,35 sættes loft 42. Det er en vigtig sikkerhedsregel mod den tidligere fejl, hvor en zone kunne blive grøn, selv om strømmen pegede væk fra land.

Modeldata repræsenterer ikke nødvendigvis præcis den bundnære strøm, som et ravstykke oplever i surfzonen. Lodret shear, bølgestrøm, revler, render og lokale hvirvler kan afvige fra modellens gridcelle.

Ekspertpunkt E-04: Valider hastighedsintervallet 0,15–0,65 m/s, retningstrinnene og offshore-lofterne for forskellige kysttyper og vanddybder.

### 7.1 Hvilken strøm måler modellen?

En numerisk havmodel leverer strøm i en gridcelle og på bestemte modelniveauer. Den værdi er ikke nødvendigvis identisk med strømmen få centimeter over bunden i brændingszonen. Vindstress, trykgradient, tidevand, densitetsforskelle, bølgeinducerede strømme og bundfriktion kan skabe lodret shear. Derfor skal en prognosticeret strømretning fortolkes som en repræsentativ vandbevægelse – ikke som en direkte observation af et ravstykke.

### 7.2 Strøm som transportør efter mobilisering

Bølger kan øge koncentrationen af mobile partikler ved at løfte dem fra bunden; middelstrømmen kan derefter advectere materialet. Denne arbejdsdeling er vigtig: en moderat strøm kan være effektiv, hvis bølgerne allerede har mobiliseret materialet, mens samme strøm under helt rolige bundforhold kan have ringe effekt.

### 7.3 Retningsusikkerhed ved buede kyster

Én pålandsretning er kun en lokal normalvektor. Ved bugter, odder og uregelmæssige kystlinjer kan samme strøm være ind mod én del af zonen og væk fra en anden. RavRadar bruger derfor flere retningsankre og vælger den mindst offshore-prægede relevante vurdering, men dette kan også overvurdere et lille gunstigt delområde. Eksperten bør vurdere, hvornår minimum-, middel- eller arealvægtet alignment er mest fysisk korrekt.

Implementeret i: js/core/direction-anchors.js og js/core/score-engine.js.


## 8. Vindens direkte og indirekte rolle

*Vind skaber bølger og overfladedrift, men er ikke lig med bundstrøm.*

Vind påvirker ravtransport indirekte ved at skabe bølger, ændre vandstand og drive overfladelag og organisk opskyl. Den kan også flytte allerede strandet tørt let materiale på stranden. Men vindretningen alene beskriver ikke den bundnære transport.

RavRadar omregner vind 'fra'-retningen til en bevægelsesretning ved at lægge 180°. Hvis denne retning ligger inden for 55° af lokal pålandsretning, får transportscoren +6. Hvis den ligger mere end 90° væk, gives -2. Vindens direkte transportbidrag er med vilje mindre end strømmens.

I frigivelsesscoren bruges historisk maksimal vind over 24 timer: mindst 14 m/s giver +35, 9–13,99 m/s giver +18 og lavere vind +4. Dette er en grov energiproxy. Varighed, fetch, retning og bølgeopbygning indgår ikke direkte.

Brugerens erfaring fra den nordjyske østkyst – at fralandsvind ofte kan give gode jagtforhold – viser netop, hvorfor vindretning ikke må behandles som en universel indtransportregel. Fralandsvind kan give roligere kystvand samtidig med, at tidligere bølger eller lokal strøm fortsat har flyttet materiale.

Ekspertpunkt E-05: Beskriv hvilke situationer hvor fralandsvind forbedrer jagtbarhed uden at stoppe bundnær indtransport, og hvor længe den mekanisme realistisk kan bestå.


## 9. Vandstand, setup, tidevand og den aktive kystzone

*Vandstand ændrer både transportvej, aflejring og adgang.*

Vandstand er ikke blot et antal centimeter. Den flytter brydningszonen, oversvømmer eller blotlægger revler og tanglinjer, ændrer hvilke render der er aktive og bestemmer hvor bølgerne afleverer materiale.

Den aktive transportscore bruger ændringen over tre timer. Stigning på mindst 8 cm giver +8. Fald på mindst 8 cm giver +3. Næsten stabilt niveau under 2 cm ændring giver -4. Logikken antager, at stigende vand kan føre let materiale ind over lavt vand, mens faldende vand kan samle eller eksponere materiale ved nye kanter.

Vadehavet kræver særbehandling. Store sekventielle ændringer kan være ægte tidevand og må ikke automatisk udglattes. Et mønster, der skifter unaturligt mellem datakilder time for time, er derimod en dataintegritetsfejl.

Aktuel observation og prognose er forskellige produkter. Observationen kan bruges til 'nu' og modelkontrol; prognosen bruges til fremtid. Cache kan være gyldig, selv om en ny observation midlertidigt mangler.

Ekspertpunkt E-06: Valider om absolut vandstand, ændringshastighed, forudgående maksimum/minimum og lokal referencehøjde bør indgå særskilt.

### 9.1 Absolut niveau versus ændring

Den samme stigning på 8 cm kan have forskellig betydning, afhængigt af om den sker fra meget lavt til normalt niveau eller fra normalt til højvande. Absolut niveau bestemmer hvilke revler, render og tanglinjer der er oversvømmet; ændringen beskriver bevægelsen mellem tilstandene. Den aktive score bruger primært ændringen og mangler derfor en zoneafhængig vertikal reference.

### 9.2 Meteorologisk vandstand og tidevand

I danske farvande kan vindstuvning, atmosfærisk tryk, bassinresonans og tidevand bidrage forskelligt. Vadehavet har en tydelig tidevandsdynamik, mens andre områder kan være mere domineret af vindstuvning. En landsdækkende regel bør derfor ikke antage samme tidsmønster overalt.

### 9.3 Observation, prognose og cache

En station kan midlertidigt mangle en ny observation, mens dens senest hentede prognose stadig er gyldig. RavRadar skelner derfor mellem observationsstatus og prognose-/cachestatus. Det reducerer unødvendige kildeskift, men kræver tydelig visning af alder og gyldighed.


## 10. Langs- og tværkysttransport

*Rav kan ankomme fra siden og aflejres ved ændringer i kystretning.*

Bølger, der rammer kysten skråt, kan skabe en langskyst strøm og transportere materiale parallelt med stranden. Rav kan derfor komme fra en nabozone, selv når den lokale strøm ikke peger direkte mod land. Odder, bugter, havne, revler og indløb kan ændre eller afbryde transportvejen.

Den aktive RavScore giver et mindre positivt retningsbidrag ved 56–90° forskel til pålandsretningen. Det er en grov repræsentation af skrå/langskyst transport, ikke en fuld beregning af transportkonvergens.

Et fagligt bedre system bør skelne mellem: (a) lokal indtransport, (b) langskyst tilførsel, (c) konvergens hvor transporten bremser eller mødes, og (d) bypass hvor materialet fortsætter forbi zonen.

Ekspertpunkt E-07: Udpeg zoner hvor langskyst transport sandsynligvis er vigtigere end direkte tværkysttransport, og hvilke nabozoner der bør forbindes i et transportnetværk.


## 11. Undertow, returstrøm og ripstrømme

*Hvorfor store indkommende bølger også kan skabe udadgående bundnær transport.*

Når bølger fører vand ind i surfzonen, skal vandmassen returnere. Returtransport kan foregå som undertow, feeder currents og ripstrømme. Det betyder, at store indkommende bølger ikke automatisk giver netto indtransport af alle partikler.

Et ravstykke kan påvirkes af indgående swash i den øvre strandzone, men af udadgående returstrøm nær bunden længere ude. Nettoretningen afhænger af, hvornår stykket er suspenderet, hvor højt i vandsøjlen det befinder sig, og hvor hurtigt det aflejres.

RavRadar har i dag ingen eksplicit undertow- eller ripstrømsmodel. Offshore-caps på den modellerede strøm er den vigtigste beskyttelse mod at overvurdere en situation, men lokale surfzoneprocesser kan stadig afvige.

Ekspertpunkt E-08: Vurder om kombinationen høj bølgeenergi + modelleret udadgående strøm bør give særskilt faseafhængig logik i stedet for et enkelt transportloft.


## 12. Hydrodynamisk sortering og ledsagematerialer

*Hvorfor rav ofte findes i bestemte fraktioner, men indikatorerne ikke er entydige.*

Kysttransport sorterer materiale efter mere end densitet. Størrelse, form, ruhed, løfteareal, bundfriktion og synkehastighed påvirker, hvornår en partikel mobiliseres og aflejres. Rav kan derfor koncentreres sammen med tang, træ, frø, kul, skum, skaller eller bestemte grusfraktioner uden at alle disse materialer følger præcis samme bane.

En frisk tanglinje kan være et nyttigt felttegn, fordi let organisk materiale og rav kan være transporteret og strandet under samme hændelse. Men tang kan også være flyttet uden rav, være gammel, omlejret af vind eller komme fra et andet lag i vandsøjlen.

RavRadar giver i dag kun statiske bonusser for tang/ålegræs, rev og lavt vand – og kun når strømmen allerede har mindst en svag indkomponent. Det forhindrer en statisk egenskab i at skabe en falsk transportsituation.

Ekspertpunkt E-09: Rangér ledsagematerialer efter deres værdi som indikator og beskriv, hvornår de er tegn på frisk aflejring versus gammel omlejring.


## 13. Tang, ålegræs og vegetation som transportør og fælde

*Vegetation kan både flyde, synke, fange og senere frigive rav.*

Vegetation påvirker rav på mindst fire måder: flydende tang kan transportere eller samle små stykker; nedsunkne tangbælter kan lagre rav; vegetation reducerer lokal strøm og fremmer aflejring; og en ny storm kan genmobilisere tidligere lagret materiale.

Forskning i retention af lavdensitetspartikler i marine vegetationskanopier støtter mekanismen som analogi, men RavRadar har ingen måling af vegetationens tæthed, sæson eller tilstand. Feltet seagrass er statisk og groft.

I aktiv transportscore gives +3 for tang/ålegræs, når strøm-alignment er mindst 0,20. I procesindikatoren giver vegetation 12 retentionpoint. Disse to tal er arbejdsværdier og kan dobbeltrepræsentere samme mekanisme i forklaringen, selv om kun transportscoren påvirker RavScore direkte.

Ekspertpunkt E-10: Beskriv sæson-, dybde- og stormafhængig retention i tang/ålegræs og om statisk zoneflag bør erstattes af dynamisk observation.


## 14. Kystmorfologi, revler, render, odder og menneskeskabte strukturer

*Hvordan geometri fokuserer, blokerer eller omdirigerer transport.*

Kystformen bestemmer, hvordan bølger bryder, hvor strømmen accelererer, og hvor materiale kan aflejres. Revler kan beskytte en indre zone, skabe kanaler og flytte brydningslinjen. Render kan fokusere udadgående strøm. Odder kan skabe læ, konvergens eller bypass. Havne og høfder kan afbryde langskyst transport og skabe ophobning på den ene side og underskud på den anden.

RavRadar klassificerer heuristisk vestkyst, østkyst, fjordsystemer, odder, rev, lavt vand, vegetation og flere kystretninger. Klassifikationen er ikke en detaljeret morfodynamisk model.

Aktive statiske transportbonusser er +4 for lavt vand, +3 for rev og +3 for vegetation – kun ved indgående/skrår indtransport. Frigivelsesscoren giver +5 til coastType === west. Procesindikatoren giver yderligere retentionpoint, men påvirker ikke den numeriske RavScore direkte.

Ekspertpunkt E-11: Auditér om de statiske zoneegenskaber er korrekt registreret, og om de bør påvirke transport, frigivelse, retention eller kun forklaring.


## 15. Storm, efterstorm og tidslig persistens

*En hændelse er et forløb, ikke et øjebliksbillede.*

Ravjagt efter en storm kan være bedre end under stormens maksimum. Høj energi kan først frigøre materiale; derefter kan fortsat strøm transportere det; til sidst kan faldende energi og vandstand gøre det synligt og jagtbart.

Den aktive frigivelsesscore starter på 22. Historisk vind og bølger kan hæve den. Hvis der er gået 3–18 timer siden høj energi, gives +12. Mere end 48 timer giver -8. Den separate procesindikator klassificerer under 3 timer som højenergifase, 3–18 timer som efterstorm/transportfase, 18–48 timer som aflejringsfase og senere som sen efterfase.

Der er ikke i dag en aktiv landsdækkende persistence-regel i rules/national-rules.json eller rules/local-rules.json. Den eneste skabelon ligger som inaktiv hypotese. Det er vigtigt: håndbogen beskriver en plausibel proces, men systemet fastholder ikke automatisk høje scorer i et bestemt antal timer ud over den indbyggede frigivelseshistorik.

Ekspertpunkt E-12: Fastlæg hændelsesfaser for forskellige kysttyper og hvilke betingelser der afbryder persistens – eksempelvis stærk udstrømning, ny stormretning eller meget lav vandstand.

### 15.1 Stormen er en sekvens – ikke et enkelt maksimum

Et højt bølge- eller vindmaksimum kan mobilisere materiale, men det bedste jagttidspunkt kan komme senere. Under den kraftigste fase kan rav være i transport, ligge under uroligt vand eller blive ført forbi et område. Når energien falder eller retningen ændres, kan materialet koncentreres og aflejres. Derfor skelner RavRadar mellem højenergifase, efterstorm/transportfase, aflejringsfase og sen efterfase.

### 15.2 Hysterese og hukommelse

Kystsystemet har hukommelse: bundprofil, sedimentkoncentration og ravlager ved tidspunkt t afhænger af timerne og dagene før. Den aktive model bruger 24-timers maksimum og tid siden høj energi som en enkel hukommelse. Den modellerer ikke den faktiske energiintegral, gentagne stormpulser eller hvor meget lager der allerede er tømt.

### 15.3 Retningsskift

Litteraturen om baltisk rav peger på stærke og langvarige storme samt en efterfølgende vindsvækkelse eller retningsændring som relevante for opskyl. Det er fysisk plausibelt, fordi mobilisering og strandaflejring kan kræve forskellige hydrodynamiske faser. RavRadar bør på sigt registrere selve sekvensen af retninger og energi, ikke kun maksimumværdier.


## 16. Aflejring, opskylslinjer og genmobilisering

*Hvor ravet ender, og hvorfor fundstedet kan flytte sig efter hændelsen.*

Aflejring sker, når transportkapaciteten falder eller partiklen møder en fælde. Det kan være ved swashgrænsen, bag en revle, i en tanglinje, i læ af en odde, ved en strandvold eller i en lavning. Flere opskylslinjer kan repræsentere forskellige vandstande og hændelser.

Efter aflejring kan rav flyttes igen af næste bølge, faldende vand, vind på stranden, fodtrafik eller ny storm. En synlig tanglinje er derfor et øjebliksbillede af en dynamisk proces.

RavRadar modellerer ikke eksplicit strandingsposition eller sandsynlig højde på stranden. Vandstandsændring og jagtform bruges som indirekte signaler.

Ekspertpunkt E-13: Beskriv hvilke kombinationer af faldende vand, bølgeaftagning og kystprofil der bedst forudsiger synlige opskylslinjer.


## 17. Jagtbarhed, sigt og sikkerhed

*Fysisk transportpotentiale er ikke det samme som et godt eller sikkert jagttidspunkt.*

Jagtbarhed er den højst vægtede komponent i den aktive score (40 %). Den skal afspejle, om brugeren realistisk kan se og nå ravet. RavRadar har to jagtformer: waders og beach.

For waders starter jagtbarhed på 60. Vind højst 3 m/s giver +28; 3–6 m/s +8; 6–8 m/s -35; over 8 m/s -60. Bølger højst 0,3 m giver +12, mens over 0,7 m giver -25. For strandjagt giver vind højst 8 m/s +15, 8–13 m/s +5 og over 13 m/s -25; bølger over 2,5 m giver -12.

Disse tærskler er hovedsageligt sikkerheds- og observationsarbejdsværdier. Lokal bund, mørke, strømstyrke, temperatur, is, adgang og brugerens erfaring indgår ikke fuldt. Appen må ikke erstatte egen sikkerhedsvurdering.

Ekspertpunkt E-14: Valider wadersgrænserne for forskellige kyster og vurder om strøm, temperatur og bølgeperiode skal kunne blokere anbefalingen helt.


## 18. Præcis implementering i RavScore 4.0.60

*Den faktiske kodevirkning, trin for trin.*

Den aktive beregning findes i js/core/score-engine.js. Den gamle rod-fil ravscore.js er historisk/sekundær og må ikke bruges som beskrivelse af den aktive app uden at bekræfte importkæden.

18.1 Hovedformel
rå score = jagtbarhed × 0,40 + transport × 0,35 + mobilisering/tilgængelighed × 0,25

Vægtene kan ændres af den godkendte adaptive model, men normaliseres altid til 1,0. Hver vægt begrænses til 0,05–0,80. Derefter lægges et adaptivt justeringsled på -25 til +25. Til sidst anvendes aktive ekspertregler.

18.2 Niveauer

Score | Visning
90–100 | God + exceptionel markering
75–89 | God
55–74 | Middel
35–54 | Svag
0–34 | Dårlig
18.3 Transportberegning
Transport starter på 34. Strømhastighed, strømretning, vindretning og tre-timers vandstandstrend tilføjes. Statiske kystegenskaber kan kun tilføjes ved alignment mindst 0,20. Derefter anvendes manglende-data- og offshore-caps.

18.4 Frigivelsesberegning
Frigivelse starter på 22. Maksimal vind over 24 timer, maksimal bølge over 24 timer, tid siden høj energi og vestkystflag påvirker resultatet.

18.5 Regelrækkefølge
Regelmotoren sorterer aktive regler efter prioritet. gate kan blokere anbefaling; override kan sætte en bestemt score; bonus, penalty og persistence summerer point. Slutresultatet begrænses til 0–100.

18.6 Forklarbarhed
Resultatet indeholder råvejr, historik, zonegeometri, delscorer, vægte, bidrag, retningankre, caps, adaptive matches, regelmatches, baseScore og finalScore. Debugsporet er nødvendigt for faglig audit.

Kendt begrænsning: Procesindikatoren transportEvent.index vises som forklaring, men indgår ikke direkte i RavScore. Det kan forvirre, hvis indikator og score peger forskelligt.


## 19. Procesindikatoren for hændelsesfase

*En separat diagnostisk model, som ikke må forveksles med RavScore.*

js/core/coastal-process-model.js beregner en hændelsesindikator med mobilisering 45 %, timing 25 %, fortsættelse 20 % og retention 10 %. Den klassificerer kysten heuristisk og giver en fasebeskrivelse.

Indikatoren kan være fagligt nyttig, fordi den gør hændelsesforløbet synligt. Men den påvirker i dag ikke scoretallet. En ekspert kan derfor se høj mobilisering og samtidig en lav score, hvis jagtbarhed eller transport er dårlig.

Fremtidig ændring skal vælge én af tre retninger: (a) indikator forbliver ren forklaring, (b) indikator bliver en kontrolleret gate/bonus, eller (c) hovedscoren ombygges til en egentlig procesmodel. Den må ikke snige sig ind som skjult dobbeltvægtning.


## 20. Retningskonventioner, kystankre og geometrisk audit

*Sådan undgår systemet vendte pile og forkert lokal kystretning.*

Vind er 'fra'; strøm er 'mod'; onshoreDirectionDeg er retningen fra hav mod land. UI-pile, rå komponentvektorer og scoreretning skal testes som én kæde.

Bugtede zoner kan have flere retningankre. Systemet vælger den mindst offshore / mest gunstige relevante kystdel og dokumenterer valgmetoden. Det er en pragmatisk løsning, men kan overvurdere en stor zone, hvis kun en lille kystdel rammes gunstigt.

Land- og havpunkter, kystlinje, ankre og onshoreDirectionDeg skal auditeres visuelt. Als Odde og Helberskov nord for Mariager Fjord er en fast regressionskontrol.

Administratorens godkendte geometri er den aktive sandhed. Hvis de oprindelige land- og havpunkter er byttet om, kan en korrekt rettelse vende retningen næsten eller præcis 180°. RavRadar må advare om en stor ændring, men må ikke afvise den alene på grund af vinkelforskellen. Det afgørende er, at havpunkt, landpunkt og `onshoreDirectionDeg` stemmer indbyrdes, og at samme værdi bruges af score, kort, forecast og debug.

Ekspertpunkt E-15: Vurder om flere kystankre skal vægtes efter kystlængde, eksponering og transportforbindelse i stedet for at vælge bedste alignment.


## 21. Fra faglig viden til aktive regler

*En kontrolleret vej fra ekspertudsagn til produktion.*

En ekspertregel skal indeholde: påstand, mekanisme, geografi, jagtform, målbare betingelser, tidsvindue, effekt, evidensklasse, tillid, kilde, testeksempler, modbeviser og rollbackplan.

Arbejdsgangen er:

- Registrér rå observation som viden – uden scoreeffekt.

- Formulér en testbar hypotese.

- Opret regelkladde med konkret geografi og betingelser.

- Simulér positive, negative og grænsetilfælde.

- Kontrollér konflikter og maksimal samlet effekt.

- Aktivér kun med relevant rettighed og versionshistorik.

- Evaluer mod nye fund og nul-fund.

- Tilbagetræk eller justér ved manglende effekt.

Fri tekst-assistenten må kun oprette kladder. Den må ikke aktivere regler. En regel uden geografi, med ekstrem effekt eller med betingelser der altid er sande skal give advarsel.

Der er aktuelt ingen aktive nationale eller lokale fagregler i JSON-filerne. Det betyder, at eksperten starter med at validere basismodellen og derefter kan opbygge et kontrolleret regelsæt.


## 22. Hvordan ekspertudsagn og feltdata skal testes

*Fra anekdote til reproducerbar forbedring.*

En god test skal på forhånd definere hvad der forventes. Eksempel: 'Efter mindst 12 timer med bølger over X og derefter 3–12 timer med strøm mod land, stiger fundraten i zonegruppe Y sammenlignet med tilsvarende perioder uden indgående strøm.'

Testdata skal indeholde både fund og nul-fund, jagtindsats, tidspunkt, zone, jagtform, vejrsnapshot, modelversion og eventuelle lokale observationer. Uden indsats kan et nul-fund ikke fortolkes sikkert.

Data bør opdeles i udvikling og hold-out. En regel må ikke vurderes på de samme observationer, som blev brugt til at opfinde den. Små datasæt skal rapporteres med stor usikkerhed.

Før en scoreændring bør man kontrollere kalibrering, rangering mellem zoner, falske toppe, geografisk bias og om forbedringen kun skyldes sæson eller brugeradfærd.


## 23. Datakilder, forecastintegritet og tidsserier

*DMI-prioritet, fallback og hvorfor kontinuitet er vigtigere end kunstige 120 timer.*

DMI er autoritativ dansk kilde, når data er tilgængelige og brugbare. Open-Meteo og andre kilder er fallback. Fallback skal være komponentvis og transparent.

Vind, bølger, strøm, vandstand og temperatur behandles som separate tidsserier. De filtreres før interpolation og canonicaliseres til faste UTC-timer. Kildeskift DMI → fallback → DMI time for time er forbudt, fordi det kan skabe kunstige spring.

En horisont på cirka 118–119 sammenhængende timer er acceptabel. Det er bedre end at gentage sidste værdi for at ramme 120.

Hver scoreforklaring bør vise datakilde, modelkørsel, forecasttid, alder, fallback og mangler. Dataældre end friskhedsgrænsen må ikke vises som aktuelle.


## 24. DMI-vandstandsstationer, observationer og cachelivscyklus

*Tre separate statuslag for hver station.*

En station har mindst tre statuslag:

- Registerstatus: kendt, aktiv, historisk/inaktiv eller ukendt i DMI-registeret.

- Observationsstatus: seneste måling, leverer nu, midlertidigt tavs eller aldrig observeret.

- Prognose-/cachestatus: gyldig prognosecache, gyldig til, udløbet eller mangler.

Samlet anvendelighed må ikke sættes til falsk, blot fordi en ny observation mangler. Hvis gyldig prognosecache findes, kan stationen fortsat anvendes til prognosen. Friske observationer har forrang; cache må kun bruges til dokumenteret udløb.

Stationsregisteret er persistent. Opdagede stationer fjernes ikke ved en tom kørsel. Admin viser automatisk primær/sekundær station, afstand, vægt, valgmetode og eventuel override.

Historiske/inaktive stationer skal være tydeligt markeret og må normalt ikke vælges uden advarsel. Hele registeret skal periodisk sammenholdes med DMI's officielle liste.

I admin viser kortfarverne den routing, der faktisk er aktiv for zonen. Grøn betyder aktiv automatisk routing. Når administratoroverride er slået til, skjules de grønne automatiske markører, og de kilder som faktisk styrer produktionen vises rødt. Lilla “begge valg” bruges ikke længere. Grå er udfaset, og orange er øvrige kilder. Manglende livscyklusdata vises som ukendt og må ikke fejlagtigt blive til “utilgængelig”. Beskyttet stationshistorik læses tilbage fra Supabase før en ny kørsel og flettes ikke-destruktivt, så kendte observationer og cacheoplysninger ikke går tabt.


## 25. Brugerfeedback, adaptiv model og AI

*Menneskekontrolleret læring med versionshistorik.*

Feedback gemmer et uforanderligt vejrsnapshot, score, modelversion, zone, jagtform og resultat. Både fund og nul-fund er nødvendige. Persondata og samtykke skal håndteres separat.

Den adaptive model kan ændre hovedvægte, global justering, zonejusteringer og metrikjusteringer. Forslag skal godkendes manuelt. Ændringer versionsstyres og kan rulles tilbage.

AI må strukturere fri tekst, forklare score, finde mønstre og foreslå hypoteser. AI må ikke selv aktivere regler eller ændre produktionsmodellen. En AI-konklusion er ikke faglig evidens.


## 26. Administration, Supabase og ekspertrettigheder

### Privat besøgsstatistik – 4.0.215

RavRadar tæller sidevisninger og browserbesøg uden at oprette en offentlig tæller. En sidevisning er hver indlæsning. Et browserbesøg tælles højst én gang pr. åben browserfane og kalenderdag, også hvis siden genindlæses. Det er derfor et mål for browser-sessioner, ikke for unikke mennesker.

Supabase gemmer kun én samlet række pr. dag med de to tal. Der gemmes ingen rå besøgsliste, IP-adresse, præcis placering, browserfingeraftryk eller stabil besøgsidentitet. Tællingen startes først efter appens normale opstart og må aldrig blokere kort, vejr eller RavScore.

Ejerens private adminrapport viser den valgte periode og dagstallene. Antal oprettede login-konti samt aktive konti vises separat fra besøgstallene, fordi en konto er dokumenteret i login-systemet, mens et browserbesøg ikke beviser en unik person.

Supabase Free-kvoten beskyttes ved at skelne mellem central admin-sandhed og udskiftelig maskindiagnostik. Schedulerens readback henter kun de dokumentnøgler, som produktionsbygningen faktisk anvender. Identiske maskinoutputs skrives ikke igen. Regler, geometri, routing og andre menneskeligt redigerede dokumenter beholder versionshistorik og rollback, mens store runtime-diagnostikker kun beholder den aktuelle kopi. Databaseoprydning starter altid med en read-only størrelsesaudit og må aldrig slette den aktuelle række i `admin_documents`.

*Hele den værdifulde adminfunktionalitet ligger bag adgangskontrol.*

GitHub Pages kan udlevere den statiske admin-skal, men uden gyldig Supabase-session og rettigheder må den ikke vise eller hente beskyttede data. Sikkerheden ligger i Supabase JWT/secret-serverflow og Row Level Security – ikke i at skjule et link.

Håndbogen er et beskyttet admin-dokument. Eksperten skal have admin_access og den særskilte rettighed handbook_view. Indsendelse af faglige kommentarer kræver handbook_review.

Læsning, redigering, publicering, rå diagnostik, systemadministration og ekspertadministration er adskilte rettigheder. Ejerrollen har fuld adgang. Service role / sb_secret må kun findes som GitHub Secret og aldrig i browserkode eller ZIP.


## 27. Diagnostik, sundhed og faglig audit

*Fra datakilde til slutscore uden skjulte spring.*

RavRadar skelner mellem brugerprognosens komplethed, DMI-dækning, acquisition, konvertering, horisont, observationer, cache og fallback. En grøn brugerprognose kan eksistere samtidig med degraderet DMI-status.

Runtime-diagnostik, stationaudit, cacheaudit og implementeringsaudit er beskyttede admindokumenter. De må ikke ligge som offentlige JSON-adresser.

En faglig scoreaudit skal kunne følge: rå komponenter → enheder → retning → lokal geometri → delscore → caps → adaptiv justering → regeljustering → slutscore.


## 28. Release Governance og RDKS-gate

*Den bindende proces, som skal forhindre gentagelse af 4.0.56-forløbet.*

En version er ikke installationsklar, før præcis det pakkede indhold har bestået hele valideringen og Release Gate. Kodegennemgang alene er ikke nok.

RavRadar har ét repository-ejet GitHub Actions-workflow: `.github/workflows/update-and-deploy.yml`. Det bygger produktionsdata, kører gates og deployer Pages. De tidligere `schedule-test.yml` og `pages-microtest.yml` var afsluttede diagnostiske forsøg og blev fjernet i 4.0.121; mikrotesten kunne ellers publicere en testside til samme Pages-miljø som produktionen. Navnet `pages-build-deployment` i GitHub er platformens egen Pages-mekanisme og ikke en workflowfil i RavRadar.

Obligatorisk rækkefølge:

- Brug seneste uploadede projekt som eneste arbejdskilde.

- Kortlæg samtaledelta, aktive RDKS-krav og nuværende implementering.

- Opdater kode, håndbog, RDKS, changelog og versionsfelter samlet.

- Kør generatorer i samme rækkefølge som GitHub Actions.

- Kør hele npm run validate.

- Kør npm run release:gate.

- Byg ZIP med npm run release:package.

- Auditér ZIP for .git, secrets, caches og manglende workflowfiler.

- Efter push: verificér den faktiske GitHub Actions-kørsel som grøn.

- Ved fejl: gennemgå hele den resterende pipeline samlet; undgå manuelle lapninger én fejl ad gangen.

GitHub Secrets og Supabase-installation bevares uden for ZIP. En ny ZIP må ikke kræve genoprettelse af eksisterende secrets, medmindre en bevidst nøglemigration er dokumenteret.


## 29. Overgang til ravradar.dk

*Eget domæne foran GitHub Pages og Supabase.*

Brugerne skal besøge ravradar.dk, selv hvis GitHub Pages fortsat hoster frontend. Projektet skal derfor bruge relative appstier, korrekt manifest og service worker, og undgå hardcodede GitHub Pages-adresser.

Før domænet aktiveres skal DNS, GitHub Pages custom domain, HTTPS, www-strategi, Supabase Site URL og redirect-URLs være afklaret. Admin- og loginflow skal testes på både primært domæne og valgt redirectdomæne.

CNAME må først tilføjes, når DNS og Supabase redirects er klar. Ellers kan login eller deployment låses i en halvkonfigureret tilstand.


## 30. Ekspertens valideringsmatrix

*En prioriteret arbejdsplan for faglig gennemgang.*

ID | Emne | Nuværende antagelse | Højeste værdi af ekspertinput
E-01 | Ravstørrelse/form | Én generel partikelprofil | Størrelsesafhængige transportregimer
E-02 | Kildelagre | Ikke modelleret | Geologisk/geomorfologisk lagerkort
E-03 | Bølgeenergi | Højde som proxy | Periode, retning, varighed og brydning
E-04 | Strøm | 0,15–0,65 m/s gunstigt | Bundnære tærskler pr. kysttype
E-05 | Vind | Lille direkte transporteffekt | Fralandsvind og efterstormmekanismer
E-06 | Vandstand | 3-timers trend | Absolut niveau og lokale referencer
E-07 | Langskyst | Indirekte i alignment | Transportnet mellem nabozoner
E-08 | Undertow/rip | Ikke eksplicit | Faseafhængig offshorelogik
E-09 | Ledsagemateriale | Kvalitativt | Indikatorhierarki og friskhed
E-10 | Vegetation | Statisk zoneflag | Sæson og dynamisk retention
E-11 | Kystmorfologi | Grove statiske flags | Lokale fælder, bypass og render
E-12 | Persistens | 3–18 timer bonus | Kystspecifik fase og afbrydelse
E-13 | Aflejring | Ikke lokaliseret | Opskylshøjde og timing
E-14 | Sikkerhed | Generelle grænser | Kyst-/mode-specifik gate
E-15 | Flere ankre | Bedste alignment vælges | Areal-/længde-/eksponeringsvægtning
Eksperten bør kommentere hvert punkt med: enig/uenig, begrundelse, geografisk rækkevidde, foreslåede målelige betingelser, forventet effekt og hvilke observationer der kan modbevise påstanden.


## 31. Gennemregnede faglige scenarier

*Eksempler der viser modelens styrker og svagheder.*

Scenario A – stærk indgående strøm efter storm, roligt nu
Historisk vind 15 m/s og bølger 1,8 m giver høj frigivelse. Strøm 0,3 m/s næsten mod land giver høj transport. Vind og bølger er nu lave, så waders-jagtbarhed er høj. Dette er den type situation, modellen er bygget til at rangere højt.

Scenario B – stor storm nu, strøm væk fra land
Frigivelse kan være høj, men waders-jagtbarhed falder kraftigt. Ved stærk offshore-strøm sættes transportloft 28. Slutscoren bør ikke blive grøn alene på stormenergi.

Scenario C – roligt vejr uden nylig energi
Jagtbarhed kan være meget høj, men transport og frigivelse er moderate/lave. Scoren bør være middel eller svag. Der kan stadig findes gammelt rav; modellen vurderer ikke lageret.

Scenario D – skrå/langskyst strøm ved odde
Alignment kan give et mindre positivt bidrag. Hvis transporten faktisk konvergerer i læsiden, kan modellen undervurdere zonen; hvis materialet bypasser odden, kan den overvurdere den. Dette kræver lokal ekspertregel eller forbedret netværksmodel.

Scenario E – gammel browsercache
Data ældre end friskhedsgrænsen må ikke vises som aktuelle. Siden skal hente friske data eller vise tydelig utilgængelighed. Gamle scores må ikke stå som om de er nuværende.


## 32. Faglige hovedkilder, analogier og læsevej

*Kilder bag procesforståelsen og deres begrænsninger.*

Følgende kilder understøtter den generelle procesforståelse. De validerer ikke automatisk RavRadars numeriske tærskler:

- Chubarenko, I. m.fl. (2017), *Microplastics in sea coastal zone: Lessons learned from the Baltic amber*. Marine Pollution Bulletin. Vigtig analogi mellem rav, lavdensitetspartikler, stormmobilisering og strandingsprocesser. https://www.sciencedirect.com/science/article/abs/pii/S0269749116316402

- Davidson, B. m.fl. (2023), *Beaching model for buoyant marine debris in bore-driven swash*. Flow. Laboratorie-/modelarbejde om partikelstranding i swash og betydningen af partikelinerti og indgangsbetingelser. https://www.cambridge.org/core/journals/flow/article/beaching-model-for-buoyant-marine-debris-in-boredriven-swash/DBBD345FD31CCA10CC21F29744EA1A57

- Isachenko, I. m.fl. (2023), *Beach-cast appearance on the tide-less sea shore*. Estuarine, Coastal and Shelf Science. Relevant for post-storm beach-cast i det sydøstlige Østersøområde. https://www.sciencedirect.com/science/article/abs/pii/S0272771423000094

- Kim, S. m.fl. (2024), *Short-term buoyant microplastic transport patterns driven by surf zone processes*. Marine Pollution Bulletin. Understøtter betydningen af brydning, orbitalbevægelse og surfzoneprocesser for lavdensitetspartikler. https://www.sciencedirect.com/science/article/abs/pii/S0025326X2400225X

- Kerpen, N.B. m.fl. (2024), *Microplastic retention in marine vegetation canopies under oscillatory flow*. Science of the Total Environment. Analogikilde for retention i vegetation. https://www.sciencedirect.com/science/article/pii/S004896972307910X

- Chen, W. m.fl. (2023), *A review of practical models of sand transport in the swash zone*. Coastal Engineering. Oversigt over swashturbulens, sedimentadvektion, infragravitetsbølger, infiltration og strandhældning. https://research.utwente.nl/en/publications/a-review-of-practical-models-of-sand-transport-in-the-swash-zone/

- USGS, *Sediment Transport in Coastal Environments*. Officiel oversigt over bølge-, strøm- og strukturpåvirket kysttransport. https://www.usgs.gov/centers/pcmsc/science/sediment-transport-coastal-environments

- USGS glossary, definition af longshore current/transport. https://pubs.usgs.gov/of/2008/1206/html/glossary.html

Kilder om plast bruges kun som mekanistisk analogi. Ravets egen transport skal så vidt muligt valideres med ravspecifik litteratur og lokale feltobservationer.


## 33. Ordbog og faste begreber

*Centrale ord, som skal bruges ens i UI, kode og ekspertkommunikation.*

- Alignment: matematisk mål for hvor godt en bevægelsesretning passer med lokal pålandsretning.

- Canonical UTC-time: fast time uden minutforskydning, brugt ved merge.

- Cap/loft: maksimal tilladt delscore ved en begrænsende tilstand.

- Fallback: sekundær datakilde ved manglende/ugyldig primær kilde.

- Frigivelse: mobilisering fra bund, sediment, vegetation eller depot.

- Jagtbarhed: sikker og praktisk mulighed for at finde rav.

- OnshoreDirectionDeg: lokal retning fra hav mod land.

- Observation: faktisk måling.

- Prognose: modelberegnet fremtidig værdi.

- Cache: tidligere hentet data, som stadig er dokumenteret gyldig.

- Retention: midlertidig eller længerevarende fastholdelse.

- RDKS: RavRadar Decision & Knowledge System.

- Swash: området der gentagne gange overskylles og tørlægges af bølgeopskyl.

- Undertow: nettoudadgående returstrøm under bølger i surfzonen.

- Override: administratorens bevidste erstatning af automatik.

- Regression: tidligere løst fejl, som vender tilbage.


## 34. Fluidmekanisk grundlag: kræfter, skærspænding og turbulens

*De fysiske størrelser, der forbinder vejrdata med mulig partikelbevægelse.*

RavRadar bruger i dag empiriske scoregrænser. For at kunne forbedre dem skal man forstå de underliggende kræfter.

### 34.1 Neddykket vægt
Den nedadrettede effektive vægt bestemmes af forskellen mellem partiklens og vandets densitet. For rav er denne forskel lille sammenlignet med mineralsk sand. Derfor kan en mindre hydrodynamisk kraft være tilstrækkelig til at reducere bundkontakten, men form og mekanisk indlejring kan dominere.

### 34.2 Drag og løft
Strøm omkring en partikel giver drag i strømmens retning og kan give løft gennem trykforskelle og turbulente impulser. Kræfterne afhænger omtrent af vandets densitet, det projicerede areal og hastigheden i anden. En fordobling af lokal hastighed kan derfor give en langt større belastning end en lineær score antyder.

### 34.3 Bundskærspænding
Bundskærspænding er den tangentiale belastning, som vandbevægelsen overfører til bunden. Ved kombinerede bølger og strøm kan den maksimale belastning være væsentligt større end bidragene hver for sig. En fysisk mobiliseringsmodel bør sammenligne den kombinerede belastning med en kritisk værdi for den relevante partikel og bundtilstand.

### 34.4 Turbulens
Turbulens skaber kortvarige vertikale og horisontale hastighedsfluktuationer. En timegennemsnitlig strøm på 0,2 m/s fortæller derfor ikke, hvor store de enkelte løfteimpulser er. Bølgebrydning og vortices ved revler kan være afgørende.

Modelhul: RavRadar beregner ikke bundskærspænding, friktionshastighed eller turbulensintensitet. Disse er kandidater til en fremtidig fysisk delmodel, hvis nødvendige input kan skaffes robust.


## 35. Partikelmekanik og dimensionsløse tal

*Hvordan Shields-, Reynolds- og Rouse-tænkning kan bruges uden at foregive falsk præcision.*

### 35.1 Shields-parameteren
Shields-parameteren sammenholder bundskærspænding med partiklens neddykkede vægt og størrelse. Den bruges normalt til mineralsk sediment. For rav kan den give en struktureret ramme, men standardkurverne er ikke direkte valideret for uregelmæssige, lavdensitetsstykker.

### 35.2 Partikel-Reynolds-tal og dragregime
Dragkoefficienten afhænger af strømregimet omkring partiklen. Små glatte stykker og store uregelmæssige stykker kan derfor ikke antages at have samme respons, selv når deres densitet er ens.

### 35.3 Synkehastighed og Rouse-lignende tænkning
For sediment bruges forholdet mellem synkehastighed og turbulent blanding til at vurdere, om partikler holdes i suspension. Ravets lave synkehastighed kan gøre kortvarig suspension sandsynlig, men der mangler systematiske målinger fordelt på størrelse, form, saltindhold og biofilm.

### 35.4 Praktisk anvendelse i RavRadar
Disse tal skal i første omgang bruges til at formulere testbare hypoteser og laboratorieforsøg – ikke til at erstatte scoremotoren med uprøvede formler. En ny fysisk parameter må først aktiveres, når den kan beregnes stabilt og giver bedre hold-out-resultater.

Ekspertpunkt E-16: Definér et realistisk forsøgsprogram for kritisk mobilisering og synkehastighed for repræsentative ravklasser.


## 36. Bølgespektrum, periode, retning og varighed

*Hvorfor signifikant bølgehøjde alene kan skjule væsentlige forskelle.*

En havtilstand består af mange bølgekomponenter. Signifikant bølgehøjde opsummerer højden, men ikke hele spektret.

### 36.1 Periode
Lange bølger påvirker typisk bunden på større dybde og kan give en anden surfzone end korte vindbølger. Periode bør derfor undersøges som forklarende variabel sammen med højde.

### 36.2 Retning og kysteksponering
Den relevante bølgeretning skal sammenholdes med lokal kystnormal, revler og lægivende geometri. En offshore modelretning kan blive refrakteret, før bølgen når stranden. Ét havanker er derfor en approximation.

### 36.3 Fetch og varighed
Lokal vind over kort fetch kan give stejle, korte bølger, mens fjern swell kan ankomme efter at den lokale vind er faldet. Varighed styrer, hvor længe bunden udsættes for mobiliserende belastning. RavRadars nuværende maksimumsregel kan ikke skelne mellem en kort spids og mange timers vedvarende energi.

### 36.4 Kandidat til ny energidosering
En fremtidig indikator kan integrere en bølgeenergi-proxy over tid, vægtet med retning og periode. Den skal testes mod den enklere maksimumsregel, så kompleksitet kun beholdes, hvis den forbedrer prognosen.


## 37. Strandprofiler, revler og morfodynamiske tilstande

*Hvordan bundformen kan ændre den samme vejrprognoses virkning.*

Strande er ikke statiske skrå flader. Revler, render, cusps, erosionskanter og strandhældning ændres under storme og rolige perioder.

### 37.1 Revler som både lager og barriere
En revle kan lagre let materiale, bryde bølger og skabe en roligere landværts zone. Et brud i revlen kan koncentrere udadgående strøm. Derfor kan samme revle både fremme aflejring og skabe eksport afhængigt af placering.

### 37.2 Erosiv og akkretiv profil
Højenergiforhold kan flytte sand offshore og danne eller forstærke revler; roligere bølger kan føre sediment landværts. Rav behøver ikke følge sandets nettotransport, men bundprofilens ændring bestemmer, hvilke gamle lag og lommer der åbnes.

### 37.3 Databehov
RavRadar har i dag statisk kystgeometri og generelle kystegenskaber. Dynamisk bathymetri er ikke tilgængelig i prognoseopløsning. Brugerobservationer af nye render, erosionskanter og tanglinjer kan derfor være værdifulde som kortlivede zonetilstande.

Ekspertpunkt E-17: Angiv hvilke morfologiske observationer en ravjæger realistisk kan registrere, og hvor længe de bør påvirke modellen.


## 38. Kildelager, udtømning og genopfyldning

*En konceptuel model for noget den nuværende score ikke kan se.*

Vejr beskriver transportkapacitet, men fund kræver tilgængeligt rav. Derfor bør RavRadar på sigt skelne mellem en hurtig hydrodynamisk tilstand og et langsomt latent kildelager.

### 38.1 Mulige lagre

- Geologiske ravførende lag og eroderende klinter.
- Ældre strandaflejringer og stormvolde.
- Undervandslommer med tørv, træ og organisk materiale.
- Revler og render, som midlertidigt opsamler lette partikler.
- Langskyst tilførsel fra naboceller.

### 38.2 Udtømning
Et område kan levere godt efter første storm og dårligt efter næste, selv om vejret ligner, fordi det lettilgængelige lager er tømt. Gentagne fund og nul-fund skal derfor tolkes som information om både model og lager.

### 38.3 Forsigtig implementering
En lagerindikator bør være probabilistisk og langsomt skiftende. Den må ikke skjule dårlig hydrodynamik eller skabe en permanent favoritliste. Den bør opdateres af kvalitetssikrede observationer med negativ-evidens-vægtning, der tager højde for søgeindsats og sigt.

Ekspertpunkt E-18: Vurder om en latent lagerfaktor er fagligt meningsfuld, og hvilke observationer der kan opdatere den uden cirkelslutning.


## 39. Tang, ålegræs og beach-cast som fysisk system

*Organisk opskyl kan transportere, fange og skjule rav – men er ikke et entydigt signal.*

### 39.1 Samtransport
Rav og organisk materiale kan begge have lav effektiv neddykket vægt og optræde i samme strandingshændelse. Det gør frisk tang til en plausibel indikator. Men tangens store fleksible form, opdrift og overfladeorientering betyder, at den kan reagere meget anderledes end et kompakt ravstykke.

### 39.2 Retention
Vegetationsmåtter og tangvolde reducerer lokale hastigheder, øger ruhed og skaber hulrum. Laboratorieforskning på lavdensitetspartikler viser, at vegetation kan tilbageholde partikler under bølger. Overførbarheden til rav afhænger af skala, vegetationstype og hvor materialet befinder sig i vandsøjlen.

### 39.3 Tidsalder
Frisk, våd tang ved den aktive opskylslinje er et andet signal end tør tang flyttet af vind. RavRadar bør derfor ikke nøjes med en permanent zoneegenskab; feltobservationer bør indeholde friskhed, højde på stranden, dominerende materiale og tidspunkt.

Ekspertpunkt E-19: Definér en praktisk klassifikation af opskyl, som kan bruges konsistent af ikke-eksperter.


## 40. Dansk regional oceanografi og hvorfor én landsregel er utilstrækkelig

*Nordsø, Skagerrak, Kattegat, Bælter, Øresund og Vadehav har forskellige dynamikker.*

Danmarks kyster ligger i flere hydrodynamiske regimer. En regel, der virker på en åben Nordsøkyst, kan være forkert i et beskyttet farvand eller tidevandspræget vadeområde.

### 40.1 Åbne vestkyster
Stor fetch, kraftig bølgeenergi, stormsurge og markant profilændring gør mobilisering og sikkerhed centrale. Bølgeretning og periode kan være vigtigere end lokal vind i det konkrete øjeblik.

### 40.2 Skagerrak og Kattegat
Komplekse forbindelser mellem Nordsøen og Østersøen, tæthedsstrømme, vindstuvning og lokal kystgeometri kan give forskel mellem overflade- og bundstrøm. Nordjyske østvendte kyster kan få rolige jagtforhold under fralandsvind, mens tidligere eller fjern bølgeenergi stadig har påvirket bunden.

### 40.3 Indre farvande
Bælter, fjorde og smalle passager kan være strømstyrede og stærkt afhængige af lokale indløb. Et groft modelgrid kan overse nærkystlige hvirvler og strømkonvergens.

### 40.4 Vadehavet
Tidevand, render, vadeflader og hurtig vandstandsændring kræver særregler. Jagtbarhed og adgang kan ændres hurtigere end den generelle timeprognose antyder.

Ekspertpunkt E-20: Definér regionale modelprofiler og hvilke tærskler der ikke bør være landsdækkende.


## 41. Måleusikkerhed, modelopløsning og repræsentativitet

*Hvorfor præcise tal ikke nødvendigvis er præcise beskrivelser af stranden.*

### 41.1 Gridpunkt versus zone
Vejr- og havmodeller giver værdier for en celle eller interpoleret position. En RavRadar-zone strækker sig langs en uregelmæssig kyst og kan rumme flere revler, læzoner og orienteringer. Dataene skal derfor opfattes som repræsentative signaler med usikkerhed.

### 41.2 Tidsopløsning
Timeværdier kan skjule korte bølgegrupper, vindstød, tidevandsvendinger og ripstrømme. Omvendt kan en kort lokal hændelse være for lille til at have betydning for hele zonen.

### 41.3 Prognosefejl og kildeblanding
En fysisk model kan være god, men prognosen forkert. RavRadar skal derfor skelne mellem modelusikkerhed, datakvalitet og faglig scoreusikkerhed. Kildeskift inden for samme tidsserie kan skabe kunstige spring og skal undgås.

### 41.4 Visning til brugeren
En score bør ledsages af datadækning, alder og centrale usikkerheder. Et tal uden forklaring kan skabe større falsk sikkerhed end en mere forsigtig kvalitetsklasse.


## 42. Hypoteseregister: hvad RavRadar antager lige nu

*Et falsificerbart register over de vigtigste arbejdshypoteser.*

ID | Hypotese | Nuværende implementering | Kan afkræftes ved

H-01 | Historisk høj vind og bølgeenergi øger sandsynligheden for frigivelse. | 24-timers maksimum og bonusser. | Systematiske nul-fund ved god søgeindsats og kendt lager.

H-02 | Moderat strøm med indkomponent er mere gunstig end meget svag eller stærkt offshore strøm. | 0,15–0,65 m/s bonus og offshore-caps. | Funddata viser andet optimum eller kysttypeafhængighed.

H-03 | 3–18 timer efter høj energi er ofte en gunstig transport-/aflejringsfase. | Frigivelsesbonus. | Tidsstemplede fund topper konsekvent uden for intervallet.

H-04 | Frisk organisk opskyl øger sandsynligheden for ravkoncentration. | Statiske zonebonusser og ekspertregler. | Kontrollerede observationer viser ingen merværdi efter vejrkontrol.

H-05 | Flere retningsankre beskriver uregelmæssige kyster bedre end én normal. | Mindst-offshore relevant anker. | Metoden giver systematisk for høje scorer i bugter/odder.

Hypoteseregisteret skal opdateres, når scorelogik ændres. En hypotese må ikke slettes, blot fordi den afvises; den skal arkiveres med resultat og version.


## 43. Faglig validering: fra anekdote til test

*Hvordan RavRadar kan lære uden at overtilpasse til enkelte ture.*

### 43.1 Prospektiv registrering
Den stærkeste test er at gemme prognosen, før udfaldet kendes. Efterfølgende registreres søgetid, dækket strækning, metode, sigt, fundmængde og kvalitet. Det forhindrer, at modellen omskrives ud fra hukommelse alene.

### 43.2 Negative observationer
Et nul-fund er kun informativt, hvis der faktisk blev søgt tilstrækkeligt og forholdene var observerbare. Ti minutters søgning i uklart vand bør ikke vægte som to timers systematisk søgning.

### 43.3 Hold-out og geografisk generalisering
Nye tærskler skal vurderes på perioder og zoner, som ikke blev brugt til at udlede dem. Ellers kan modellen lære lokale tilfældigheder.

### 43.4 Kalibrering
En score på 80 behøver ikke betyde 80 % fundchance. Scoren er en relativ indeksværdi. På sigt kan man undersøge kalibrering: hvor ofte og hvor meget rav findes ved forskellige scoreintervaller, betinget af søgeindsats.

### 43.5 Før/efter-test af regler
En ekspertregel bør have en tydelig forventet effekt, testperiode og rollback-kriterium. Ændringer skal versionsmærkes, så forbedring kan adskilles fra ændret datakvalitet.


## 44. Feltprotokol for ravjægere og eksperter

*Et minimumsdatasæt, der kan gøre observationer brugbare for modellen.*

Feltdata bør registreres ensartet. Følgende minimum foreslås:

- Præcis zone og start/sluttid.
- Jagtform: strand, vandkant, waders, UV nat.
- Aktiv søgetid og omtrentligt dækket strækning.
- Antal og samlet masse af rav; eventuelt størrelsesklasser.
- Friskhed og placering af tang/ålegræs/andet opskyl.
- Observeret bølgehøjde, uklarhed, strømretning og sikkerhedsforhold.
- Ny erosionskant, revle, rende, udløb eller anden morfologisk ændring.
- Fotodokumentation med frivillig positionssløring.
Observationen skal markere, om vurderingen er direkte set, estimeret eller hentet fra appen. Ellers risikerer man at bruge modellens egen prognose som uafhængig bekræftelse.

Ekspertpunkt E-21: Gennemgå protokollen og fjern felter, der ikke kan registreres pålideligt i praksis.


## 45. Kendte fejlscenarier og hvordan de skal opdages

*Konkrete situationer hvor en høj eller lav score kan være misvisende.*

### 45.1 Høj score, intet lager
Vejret er ideelt, men området er udtømt eller har lav ravtilstedeværelse. Diagnosen er ikke nødvendigvis forkert transport; den kan være kildelager.

### 45.2 Grøn score ved offshore strøm
Andre komponenter kan tidligere overdøve en ugunstig strøm. Offshore-caps blev indført for at forhindre dette. Retningskonvention og pilesymbol skal stadig auditeres.

### 45.3 God lokal lomme skjult af zonegennemsnit
En lille bugt eller havnelæ kan være god, selv om zonens repræsentative modelpunkt er middelmådigt. Dette taler for flere ankre eller finere zoner – men også mod overfortolkning af små modeldetaljer.

### 45.4 Datakildeskift
Skift mellem DMI og fallback time for time kan skabe kunstige vandstandsspring eller retningsskift. Kontinuitet og kildeproveniens skal kontrolleres før scoring.

### 45.5 Gammel browsercache
Gamle prognoser må ikke fremstå som aktuelle. Dataalder valideres, og for gammel cache skal give en tydelig fejltilstand frem for normal visning.


## 46. Sporbarhed fra faglig påstand til kode og data

*Hvor eksperten og udvikleren finder den konkrete implementering.*

Emne | Aktiv fil | Kontrol

Hovedscore og vægte | js/core/score-engine.js | scripts/test-score-engine.mjs

Procesfase | js/core/coastal-process-model.js | scripts/test-process-model-4.0.33.mjs

Retningsankre | js/core/direction-anchors.js | scripts/test-direction-anchors.mjs

Ekspertregler | js/core/rule-engine.js | scripts/test-rule-engine.mjs

Adaptiv model | js/core/adaptive-prediction.js | scripts/test-adaptive-prediction.mjs

Vejrdata | scripts/update-weather.mjs | Forecast- og datakvalitetstests

Stationsrouting | data/water-level-station-routing.json | Stationstopologi og cachetests

Håndbog | docs/handbook/content.json | scripts/release-gate.mjs
Historiske rodfiler kan stadig findes i projektet af kompatibilitets- eller dokumentationsgrunde. Håndbogen skal altid pege på den aktive fil og tydeligt mærke historiske implementeringer.


## 47. Kildekritik og overførbarhed til rav

*Hvordan litteratur fra sand, plast og vegetation må – og ikke må – bruges.*

### 47.1 Direkte ravlitteratur
Den mest relevante litteratur beskriver baltisk rav som svagt negativt flydende materiale, der kan cirkulere mellem undervandsskråning og strand og vaskes op efter stormforløb. Studierne er geografisk koncentreret i den sydøstlige Østersø. De giver mekanistisk støtte, men ikke direkte danske tærskler.

### 47.2 Sedimentlitteratur
Kystingeniørviden om bølger, strøm, skærspænding, bedload, suspension og morfologi er veletableret. Rav er dog ikke et standard-sandkorn. Formler kan bruges til struktur og størrelsesorden, men kræver nye partikelparametre og validering.

### 47.3 Plast som analogi
Visse plasttyper har densitet tæt på rav og kan vise, hvordan lavdensitetspartikler strander, recirkulerer eller tilbageholdes i vegetation. Plast varierer imidlertid ekstremt i form, fleksibilitet, biofilm og størrelse. Derfor må plaststudier aldrig alene fastsætte en ravregel.

### 47.4 Praktisk ravjægerviden
Langvarig lokal erfaring kan opdage mønstre, som modeller og publikationer overser. Den kan samtidig være påvirket af selektiv hukommelse, skiftende søgeindsats og skjulte variable. RavRadar behandler den som værdifuld ekspertobservation, der skal operationaliseres og testes.


## 48. Annoteret faglig bibliografi

*Kilderne bag den nuværende forståelse og præcis hvad de kan støtte.*

- Chubarenko & Stepanova (2017), “Microplastics in sea coastal zone: Lessons learned from the Baltic amber”, Environmental Pollution 224, 243–254, DOI 10.1016/j.envpol.2017.01.085. Direkte relevant analogi mellem baltisk rav og lavdensitetsplast. Understøtter stormmobilisering, recirkulation og betydningen af tæthed; fastsætter ikke RavRadars danske tærskler.

- Isachenko m.fl. (2023), “Beach-cast appearance on the tide-less sea shore: Parameters of favoring surface waves”, Estuarine, Coastal and Shelf Science 281, 108219. Relevant for bølgeparametre og beach-cast på en mikrotidal Østersøkyst. Geografisk overførbarhed skal vurderes.

- Chardón-Maldonado, Pintado-Patiño & Puleo (2016), “Advances in swash-zone research”, Coastal Engineering 115, 8–25, DOI 10.1016/j.coastaleng.2015.10.008. Grundlag for usikkerheden og kompleksiteten i swash-zone transport.

- USACE Coastal Engineering Manual, EM 1110-2-1100. Autoritativ teknisk reference til bølger, strøm, sedimenttransport og kystmorfologi.

- NOAA Ocean Service: Longshore Currents og Rip Currents. Pædagogisk, autoritativ beskrivelse af bølgedrevne langsstrømme og lokal offshore eksport.

- Kerpen m.fl. (2024), “Microplastic retention in marine vegetation canopies under breaking irregular waves”, Science of the Total Environment 912, 169280, DOI 10.1016/j.scitotenv.2023.169280. Understøtter, at vegetation kan tilbageholde lavdensitetspartikler; er en analogi, ikke direkte ravbevis.

- Coastal Wiki/Van Rijn: Sand transport. Samlet faglig oversigt over bedload, suspension, bølge- og strømkomponenter samt tidsforsinkelse i ikke-stationær transport.

- DMI Frie Data og API-dokumentation. Autoritativ kilde til hvilke observations- og prognoseprodukter RavRadar henter; dokumenterer datakilden, ikke ravfysikken.
Kildelisten skal udvides løbende. Hver ny aktiv regel skal pege på mindst én mekanistisk kilde eller være tydeligt mærket som ekspertobservation/hypotese.


## 49. Ekspertens review-arbejdsgang

*Sådan omsættes faglig kritik til en sporbar og testbar ændring.*

- Find det relevante kapitel og angiv konkret påstand eller tærskel.
- Vælg type: faglig fejl, usikker antagelse, ny forskning, forbedringsforslag eller manglende dokumentation.
- Beskriv hvilke kyster, årstider og vejrforløb udsagnet gælder for.
- Angiv forventet retning og størrelse på modelændringen.
- Vedlæg kilde, data eller gentagne observationer.
- Foreslå en test og et kriterium for accept eller afvisning.
- Ejeren vurderer forslaget; en accepteret ændring bliver først aktiv i en versioneret release.
En ekspertkommentar ændrer aldrig håndbogen eller scoremotoren direkte. Den gemmes i Supabase med versionshistorik og kan accepteres, afvises eller implementeres af ejeren.


## 50. Faglig ordliste

*Ensartede definitioner af de vigtigste begreber.*

**Advektion:** Transport med middelstrømmen.

**Backwash:** Vandets tilbagestrømning ned ad strandfladen efter swash.

**Bedload:** Partikler, der ruller, glider eller hopper tæt ved bunden.

**Bundskærspænding:** Den tangentiale belastning vandbevægelsen overfører til bunden.

**Fetch:** Den frie strækning vinden blæser over vandet og kan opbygge bølger på.

**OnshoreDirectionDeg:** RavRadars lokale retning fra hav mod land; bruges som reference for strøm og vind.

**Refraktion:** Drejning af bølger, når dele af bølgefronten bevæger sig i forskellig dybde.

**Ripstrøm:** Lokal, kanaliseret strøm væk fra stranden gennem surfzonen.

**Saltation:** Partikeltransport i gentagne hop nær bunden.

**Setup:** Forhøjet middelvandstand nær kysten forårsaget af bølgers momentumoverførsel.

**Swash:** Den vekslende op- og nedløbende vandbevægelse på strandfladen.

**Undertow:** Middelreturstrøm, ofte udadgående nær bunden under brændingszonen.


## 51. Flere veje til fundbart rav: primærlager, sekundærlager og genmobilisering

*Hvorfor RavRadar ikke må gøre den fulde stormkæde til en absolut sandhed.*

Den klassiske stormfortælling er vigtig, men ufuldstændig. Rav kan flyttes gennem gentagne korte cyklusser mellem strand, swashzone, revle, rende, tang og helt lavt vand. Derfor skelner modellen nu mellem et **primært lager**, der kræver egentlig frigivelse, og et **sekundært nærkystlager**, hvor rav allerede er hydrodynamisk tilgængeligt.

### 51.1 Primærlager

Rav er begravet, mekanisk låst eller ligger uden for almindelig bølge- og strømpåvirkning. Her er høj energi, erosion eller langvarig bundpåvirkning typisk nødvendig.

### 51.2 Sekundært nærkystlager

Rav er tidligere frigivet og ligger på en revle, i en rende, i tang, i et tidligere opskyl eller umiddelbart uden for brændingszonen. Backwash eller faldende vand kan have trukket det ud, uden at det er ført tilbage til et dybt lager.

### 51.3 Genmobilisering

Moderate bølger kan løfte eller rulle ravet, mens en indgående eller skrå strøm giver nettotransport. Vandstandsændring kan flytte den aktive kant. Hændelsen behøver ikke opfylde stormtærsklerne, men kræver stadig tilstedeværelse, bevægelse og gunstig transport/aflejring.

### 51.4 Aktiv implementering

Komponenten mobilisering/tilgængelighed har to spor:

- **Fresh-release:** historisk vind, historiske bølger, tid siden høj energi og eksponering.
- **Nearshore-remobilisation:** aktuelle bølger, strømstyrke, indkomponent, vandstandsændring og retention.

Det højeste spor bærer komponenten. Begge stærke samtidig giver en begrænset bonus. Den fulde kæde vægter dermed fortsat højest, men er ikke den eneste vej til en meningsfuld score.

Ekspertpunkt E-22: Vurder hvilke kombinationer af bølger, strøm, vandstandsændring og kystmorfologi der realistisk genmobiliserer rav fra sekundære nærkystlagre, og hvor længe sådanne lagre kan bestå.

Implementeret i: **js/core/score-engine.js** og **js/core/coastal-process-model.js**.


## Sproglig standard fra 4.0.69
Hele webhåndbogen er gennemgået med fast læsehjælp, forklaring af centrale fagord og en omskrevet ekspertarbejdsplan i almindeligt dansk. Ekspertens opgave beskrives nu med konkrete spørgsmål og eksempler frem for en teknisk matrix.


## 53. Sådan skal RavRadar forstå fejl, cache og manglende målinger

RavRadar skelner mellem tre forskellige situationer:

1. **En rigtig fejl:** En nødvendig fil mangler, Supabase afviser en skrivning, eller en central brugerfunktion virker ikke. Fejlen skal vises med den konkrete årsag.
2. **En advarsel:** Siden virker, men noget er langsomt eller bør undersøges. Det må ikke blandes sammen med en funktionsfejl.
3. **En forventet mellemtilstand:** Browseren bruger en verificeret cache, eller en DMI-observationskørsel springes bevidst over, fordi sidste kontrol stadig er ny nok. Det er ikke det samme som, at data aldrig har eksisteret.

For vandstandsstationer betyder det, at RavRadar viser separat, om stationen er kendt, hvornår den senest leverede en måling, om en prognosecache stadig er gyldig, og om stationen samlet set kan bruges. En kørsel uden ny observationshentning må aldrig omskrive en tidligere leverende station til “aldrig leveret”.

Den samlede funktionstest viser **fejl**, **advarsler** og **bestået** særskilt. En langsom ressource er en advarsel, mens en manglende kritisk fil er en fejl.


## 54. Sådan regner RavRadar ud, om rav sandsynligvis kommer ind

*En samlet forklaring af scoringskæden, de aktive hovedregler og forskellene mellem kysttyper.*

RavRadar beregner ikke ravfund ud fra én enkelt vejrregel. Systemet vurderer en kæde af forhold, som tilsammen siger noget om, hvor sandsynligt det er, at rav eller ravførende materiale kan blive frigjort, flyttet, samlet og gjort tilgængeligt for en ravjæger. En høj score er derfor en samlet sandsynlighedsvurdering – ikke et løfte om fund.

### 54.1 De tre aktive hoveddele

**Jagtbarhed** beskriver, om forholdene er praktisk egnede til at lede. Vind, bølger, sigtbarhed, vandstand og jagtformen strand eller waders påvirker denne del. En zone kan godt have god fysisk transport, men stadig være dårlig eller usikker at lede i.

**Transport** beskriver, om strømmen og kystens retning sandsynligvis fører materiale mod den relevante kyst, langs kysten eller væk fra den. RavRadar sammenholder strømretningen med zonens lokale kystretning og eventuelle retningsankre. Kraftig strøm væk fra land kan begrænse transportscoren, også når andre forhold ser gode ud.

**Mobilisering** beskriver, om rav og ledsagemateriale sandsynligvis er blevet løsnet eller genaktiveret. Historisk vind og bølgeenergi, tid siden kraftig energi, aktuelle bølger, strøm, vandstandsændringer og lokale fastholdelsesforhold indgår. Modellen anerkender både ny frigivelse fra et lager og genmobilisering af rav, som allerede ligger i nærkysten.

### 54.2 Beregningen trin for trin

1. RavRadar læser aktuelle og historiske data for vind, bølger, strøm, vandstand og temperatur.
2. Strømretningen sammenholdes med den faktiske lokale kystretning. Systemet vurderer ikke blot en gennemsnitlig landsretning.
3. De tre delscorer beregnes hver for sig. Hver regel kan give plus, minus, advarsel eller loft.
4. Kysttype og lokale zoneegenskaber påvirker kun de dele, hvor de er fagligt relevante. En statisk kystegenskab må ikke alene skabe en høj score uden fysisk transport.
5. Delresultaterne samles til RavScore. Aktive ekspert- og administratorregler kan justere resultatet inden for fastlagte grænser.
6. Begrænsninger anvendes til sidst. Eksempelvis kan tydelig offshore-transport sætte et loft over transport eller samlet score.
7. “Bedste tidspunkt” vælges blandt de samme timescorer. Det må aldrig vælge en time med lavere RavScore, blot fordi vandstanden ser mere bekvem ud. Ved helt samme score kan vandstand bruges som tie-breaker for waders.

### 54.3 Forskelle mellem kysttyper

**Åben vestkyst:** Stor bølgeenergi kan frigive meget materiale, men undertow og udadgående strøm kan samtidig føre det væk. Efterstormfasen, faldende bølger og skift til mere gunstig transport kan derfor være vigtigere end selve stormens maksimum.

**Nordjysk østkyst og Kattegat:** Mere moderate bølger kan være tilstrækkelige. Strømretning, vedvarende langskysttransport og tidligere mobiliseret materiale kan få relativt større betydning. Fralandsvind er ikke automatisk dårligt og kan i nogle situationer forbedre sigt, vandstand og genindtransport.

**Indre farvande, fjorde og sunde:** Lokale render, odder, smalle passager og små retningsændringer kan dominere. Modelgitteret kan være groft i forhold til den lokale geometri, og derfor skal lokale regler og ekspertinput vægte forsigtigt og tydeligt.

**Vadehavet:** Tidevand, vandstand, adgang, render og meget store strømvariationer kræver særskilt fortolkning. En time med god transport kan være uegnet at færdes i, og den bedste jagttid er derfor et kompromis mellem fysisk transport og sikker adgang.

### 54.4 Hvad trækker op og ned?

Typiske forhold, der kan trække op, er passende strømstyrke mod eller gunstigt langs kysten, nylig eller aktuel mobilisering, faldende energi efter storm, gunstig vandstandsudvikling og lokale forhold, der kan koncentrere ledsagemateriale.

Typiske forhold, der kan trække ned, er meget svag strøm, tydelig strøm væk fra land, manglende mobilisering, høj bølgeuro ved wadersjagt, høj vind, dårlig adgang eller manglende kritiske data. En enkelt positiv faktor må ikke skjule en stærk negativ transportretning.

### 54.5 Hvad RavRadar endnu ikke ved sikkert

RavRadar kender ikke den faktiske mængde rav i sedimentet. Den modellerer transport- og findeforhold. Størrelse, form, begravelsesdybde, lokale revler, vegetation og bundnære strømme kan ændre det virkelige resultat. Derfor er ekspertens vigtigste opgave at pege på konkrete kyster og situationer, hvor en aktiv regel giver forkert retning, forkert styrke eller forkert tidsforløb.

### 54.6 Sådan skal eksperten kommentere

For en regel eller vurdering skal eksperten beskrive: hvad der ser forkert ud, hvilken kysttype det gælder, hvilke målbare forhold der bør udløse en anden vurdering, hvor meget scoren bør ændres, og hvilke observationer der ville kunne vise, at hypotesen er forkert. På den måde kan kommentaren omsættes til en testbar regel i stedet for en løs mening.

## 55. Sådan holdes den hurtige brugerfil og den fulde diagnosefil sammen

RavRadar gemmer de samme vejrforhold i to forskellige udgaver. Den lille brugerfil indeholder alt det, der skal bruges på kortet, i scorerne og i femdøgnsprognosen. Den store fil indeholder desuden tekniske spor, som kun er nødvendige for administration og fejlsøgning.

Den lille fil beregnes altid direkte fra den store fil med den samme faste opskrift. GitHub må ikke genbruge en lille fil fra én vejrberegning sammen med en stor fil fra en anden. Derfor bygger RavRadar brugerfilen igen efter hydrering og lige før publicering. Manifestet indeholder både datasættets id, filens størrelse og et digitalt fingeraftryk. Hvis én af disse værdier ikke passer, stopper releasen i stedet for at vise blandede eller forældede data.

Denne opdeling ændrer ikke RavScore, kortfarver, bedste tidspunkt eller de viste vejrdata. Den reducerer kun den mængde intern diagnostik, som en almindelig bruger ellers skulle hente.

## 56. Hvor står strømpilene, og hvilken vej peger de?

*Dette afsnit forklarer forskellen mellem zonens kystpunkt, modelgitteret og den pil, brugeren ser.*

En strømpil er ikke blot pynt. Den skal vise en bestemt beregnet vandbevægelse ved et bestemt sted. RavRadar viser derfor ikke længere flere kopier af den samme pil spredt tilfældigt omkring en zone. Den tidligere visning kunne placere pile på land og kunne få kortet til at ligne et tæt målenet, selv om alle pilene byggede på den samme zoneværdi.

Hver strømpil placeres ved det modelgitterpunkt, hvor den valgte kilde leverede de to strømkomponenter. Det gælder både lokal DMI, Copernicus og de otte godkendte regionale Limfjordsproxyer. Den ene komponent beskriver bevægelsen mod øst eller vest, og den anden beskriver bevægelsen mod nord eller syd. Hvis RavRadar ikke kan dokumentere fælles tidspunkt, celle, lag, afstand og kilde, vises der ingen verificeret strømpil.

### 56.1 Sådan beregnes retningen

RavRadar bruger den oceanografiske måde at angive strøm på: Retningen fortæller, hvor vandet bevæger sig hen. 0° betyder mod nord, 90° mod øst, 180° mod syd og 270° mod vest. De østlige og nordlige komponenter omregnes med en vektorberegning. Strømpilen peger direkte i denne retning og bliver ikke vendt.

Vind er anderledes. Meteorologisk vindretning fortæller normalt, hvor vinden kommer fra. Derfor vendes vindpilen 180°, så kortpilen viser, hvor luften faktisk bevæger sig hen. Den forskel er bevidst og testes automatisk.

Pilene tilføjes først, når dagens rangliste og femdøgnsprognosen er klar. Det beskytter den første visning mod at blive blokeret af mange kortmarkører. Installationen er dog en garanteret efterfølgende opgave: systemet registrerer både start, succes og fejl, og sitetesten kontrollerer, at der faktisk findes vindpile og verificerede strømpile på kortet.

### 56.2 Sådan kontrolleres zoneværdien

For hver valgt strømtime kan RavRadar efterprøve tre ting:

1. Om øst-/vest- og nord-/syd-komponenten kommer fra samme modelpunkt.
2. Om den viste hastighed svarer til længden af de to komponenter tilsammen.
3. Om den viste retning og kortpil svarer til komponenternes faktiske bevægelsesretning.

Den aktive audit kontrollerer fortsat hovedzonernes DMI-timer og kontrollerer derudover alle 673 lokale kystdele. I normal live-tilstand skal hver del have enten gyldig lokal DMI eller en eksakt onlinehistorikpost fra den tilladte Copernicus-/proxyklasse. Den viste U/V, scoretid og pilcelle skal være identiske. Mangler dokumentationen for blot én del, stopper normal release.

### 56.3 Hvad betyder pilens sted ikke?

Pilen viser modelværdien på modelgitteret. Den beviser ikke, at strømmen er præcis den samme helt inde ved stranden, bag en mole, i en smal rende eller på den anden side af en revle. RavRadar bruger den bedst dokumenterede modelværdi sammen med kystens retning, men lokale bundforhold kan afvige. Derfor skal ekspertens kommentarer især pege på områder, hvor modelpunktet ligger for langt fra den relevante kyst eller ikke repræsenterer lokale render og passager.

### 56.4 Flere ægte pile ved indzoomning

På landsoversigten viser RavRadar fortsat ét repræsentativt vind- og strømpunkt pr. hovedzone. Når brugeren zoomer ind til niveau 9 eller nærmere, kan kortet vise flere pile fra de lokale kystdele. En ekstra pil vises kun, når kystdelen har sit eget dokumenterede DMI-, Copernicus- eller godkendte regionalproxy-gitterpunkt.

For strøm skal øst-/vest- og nord-/syd-komponenten komme fra præcis samme koordinat. For vind gælder samme regel for de to vindkomponenter. Vindpunktet kan komme fra DMI's almindelige atmosfæremodel eller fra havmodellens vindserie, alt efter hvilken serie prognosen faktisk bruger; RavRadar bevarer denne forskel i kildemærket. Et almindeligt zoneanker, et fallbackpunkt eller en kopi af en eksisterende pil bruges ikke til at gøre kortet tættere. Pilene flyttes heller ikke for at undgå overlap; hvis to punkter ligger for tæt på skærmen, kan den ene i stedet skjules ved det aktuelle zoomniveau.

Den hurtige startpakke indeholder pilgrundlaget for de kystdele, der vinder aktuelt. Den fulde detaljepakke hentes bagefter og indeholder alle dokumenterede lokale punkter. Pilelaget tegnes automatisk igen, når pakken ankommer, og ved senere zoom eller kortflytning.

Visningen ændrer ikke land-/vandpunkterne eller flytter modeldata. Den viser det selvstændige rumlige datagrundlag, som den valgte strøm og RavScore faktisk bruger på den pågældende time.

## 57. Hvorfor admin ikke må starte med en tom Oversigt

Når RavRadar åbner administrationen, skal systemet først kontrollere login og rettigheder. Nogle datakilder tager længere tid at hente end andre, men det må ikke efterlade fanen **Oversigt** helt tom. Efter godkendt adgang viser RavRadar derfor straks et første, brugbart overblik med de oplysninger, der allerede findes. Når de resterende data er hentet, opdateres det samme overblik automatisk.

Den samlede sitetest åbner administrationen i en skjult, isoleret browserramme. Forsinkede kortopgaver må ikke overleve et faneskift. Retnings- og stationskort fjernes derfor, når fanen forlades, og Leaflet starter kun, hvis den forventede kortcontainer stadig findes. Den venter nu på en tydelig færdigmarkør, før den skifter mellem fanerne. Eventuelle browserdialoger eller rettighedsafvisninger bliver skrevet i testens rapport i stedet for at dukke op oven på den administration, ejeren arbejder i. Det gør testen både mere præcis og mindre forstyrrende.

## 58. Manglende strømdata betyder ikke, at strømmen er nul

*Dette afsnit forklarer, hvorfor RavRadar skelner skarpt mellem en målt nulstrøm og en strøm, som ikke kan efterprøves fra rå DMI-komponenter.*

DMI beskriver strøm med to tal: en øst-/vest-komponent og en nord-/syd-komponent. Begge kan godt være præcis nul, men det skal være værdier, DMI faktisk har leveret. Hvis en værdi mangler, må RavRadar ikke skrive nul i stedet. Nul betyder nemlig fysisk, at der ikke er bevægelse i den pågældende retning, mens en manglende værdi betyder, at vi ikke ved det.

RavRadar markerer derfor nu en prognosetime som **verificeret**, når begge komponenter kan forbindes med det samme marine DMI-gitterpunkt og med et gyldigt tidspunkt. Ved lineær interpolation gemmes også de to DMI-tider, som beregningen ligger mellem. Derefter kan hastighed og retning regnes efter og sammenlignes med den pil, brugeren ser.

Hvis sådan et sikkert match ikke findes, ændrer RavRadar ikke den eksisterende viste strømværdi. I stedet fjernes de rå u/v-felter, og timen mærkes **ikke verificerbar** med en årsag, eksempelvis manglende gitterpunkt, manglende tidsmatch eller en anden datakilde. Den må ikke fremstilles som videnskabeligt efterprøvet, men den bliver heller ikke fejlagtigt omskrevet til nulstrøm.

Det betyder, at auditrapporten har tre forskellige resultater:

1. **Verificeret:** rå DMI-komponenter, sted, tid, hastighed, retning og pil hænger sammen.
2. **Ikke verificerbar:** dokumentationen er utilstrækkelig, men der er ikke bevist en fysisk fejl.
3. **Reel uoverensstemmelse:** dokumenterede komponenter giver en anden hastighed eller retning end den, RavRadar viser. Dette stopper releasen.

Denne skelnen er vigtig, fordi ærlig usikkerhed er bedre end en præcis, men opdigtet nulværdi.

## Ydelse på den offentlige side – opdatering 4.0.83
Når RavRadar beregner de bedste områder for fem dage, skal mange zoner og timer vurderes. Tidligere blev hele arbejdet udført i én ubrudt omgang. Selvom dagens rangliste teknisk var skrevet til siden, kunne browseren ikke nå at vise den, før alle beregninger var færdige. På langsomme telefoner kunne det ligne en permanent fastlåsning.

Fra 4.0.83 vises dagens rangliste først. Browseren får derefter lov til at tegne siden, og femdøgnsberegningen fortsætter i små bidder med procentvis fremdrift. Det ændrer ikke RavScore-reglerne eller valget af bedste tidspunkt; det ændrer kun, hvordan arbejdet fordeles, så brugerfladen forbliver levende.

### Teknisk læring fra version 4.0.84
Når RavRadar dokumenterer en strømprognose med rå øst-/vest- og nord-/sydkomponenter fra DMI, skal den viste hastighed og retning beregnes fra netop de samme komponenter. En hydreret ældre cache må ikke bevare gamle afledte værdier. Derfor genberegner systemet nu altid strømretning og -hastighed, når verificeret u/v-proveniens tilføjes.

### Teknisk læring fra version 4.0.85 – én strømvektor, ét svar
Når RavRadar har verificerede DMI-komponenter for strømmen, gemmes øst/vest-komponenten og nord/syd-komponenten først som systemets kanoniske vektor. Hastighed og bevægelsesretning beregnes derefter fra netop disse lagrede værdier. Dermed bruger RavScore, kortets pil, debugvisningen og den videnskabelige audit samme fysiske grundlag.

Det er især vigtigt ved meget svag strøm. Når både u og v ligger tæt på nul, kan få decimalers forskel flytte den beregnede vinkel meget, selv om den fysiske strøm næsten ikke flytter vand. En stor vinkelændring ved næsten nul hastighed er derfor ikke nødvendigvis en stor fysisk ændring. RavRadar må aldrig blande en retning fra én præcision med komponenter fra en anden.

## 58. Fra kode til brugbar funktion

En funktion er ikke færdig, blot fordi en metode, databasepost eller skjult visning findes i projektet. RavRadar kræver nu en komplet brugerrejse: administratoren skal kunne finde funktionen fra den aktive menu, forstå dens formål, gennemføre opgaven, få en sand kvittering og finde resultatet igen.

### Håndbogsreview
Når en rettelse indsendes, kan den straks åbnes via **Håndbog → Reviewkø**. Ejeren kan vurdere den, ændre status og åbne implementeringen. Ved implementering redigeres det berørte håndbogsafsnit, hvorefter den centrale håndbog gemmes og læses tilbage. Først efter verificeret readback markeres reviewet som implementeret.

Hvis Supabase ikke kan modtage rettelsen, oprettes en lokal nødkladde. Den vises nederst på Håndbog-fanen og kan gensendes, eksporteres eller slettes. En lokal nødkladde er aldrig autoritativ projektviden.

### Dokumentation og model-forslag
Dokumentationscenteret åbner Current Truth, implementeringsstatus, aktive krav, kendte problemer, masterlog og håndbogen. Model-forslag er udtrykkeligt lokale browsermodeller. De ændrer ikke automatisk fælles produktion eller andre enheder.

### Sitetestens fejl og tider
Deploykontrollen skelner mellem en virkelig manglende fil (HTTP 404), timeout, netværksfejl og andre HTTP-fejl. Opstart rapporteres særskilt som netværk/data, beregning og rendering. Dermed må en langsom hentning ikke fejlagtigt beskrives som en langsom scoremotor.

## Administration af kystdele og zoner

### Samlet land-/vandkontrol i 4.0.192

I fanen **Retning: hav → land** søger administratoren nu efter en hovedzone. Kortet viser hele zonen og alle de præcise kyststrækninger, den består af. Hver strækning har sit eget blå havpunkt og grønne landpunkt. Punkterne kan trækkes direkte, eller administratoren kan vælge **Sæt nyt havpunkt** eller **Sæt nyt landpunkt** og derefter klikke på kortet.

Når en anden hovedzone vælges, beregner editoren først grænserne for dens kystdele og punktpar og flytter kortet dertil, før linjer og markører tegnes. Denne rækkefølge er nødvendig i Leaflet; ellers kan hele vektorlaget stoppe, inden noget vises. Den valgte kystdel vises kraftigst; dens eksisterende blå havpunkt og grønne landpunkt er flytbare, mens de øvrige dele og punkter stadig kan ses som sammenhæng. Editorens kort er selve arbejdsfladen, så den tidligere knap **Vis på hovedkortet** er fjernet.

En ændring gemmes først som kladde og påvirker ikke RavScore. Ved **Godkend og gem centralt** bindes punkterne til den konkrete kystdels ID og læses tilbage fra Supabase. Den næste produktionskørsel bruger samme aktive kystdelsfil til DMI-gridopslag, lokal vejrserie, score og offentlig visning. Hvis DMI- eller releasevalideringen ikke accepterer punktet, deployes ændringen ikke, og workflowet melder fejl.

I fanen **Retning hav-land** kan ejeren nu vælge mellem to forskellige handlinger:

- **Slet valgt kystdel** fjerner kun den valgte del af zonens kystorientering. Zonen fortsætter med de resterende kystdele.
- **Slet hele zonen** fjerner zonen fra det aktive system efter to tydelige bekræftelser.

Ændringerne gemmes centralt og kontrolleres ved genlæsning. Ved næste deployment anvendes de på RavRadars autoritative zonefil, før vejrdata og offentlig runtime bygges. Derfor bruger kort, score, ranglister, prognoser, debug og routing samme godkendte retning og zonesammensætning.

En slettet zone kan gendannes gennem versionshistorikken og den centrale auditlog. Reviewkøens testposter skjules med soft-delete, så historikken bevares uden at fylde den daglige arbejdsoversigt.


## Administration: redigering af kystlinjer
Kystlinjeeditoren bruges kun til zonens navn og det geografiske forløb af den synlige kystlinje. Den er adskilt fra fanen **Retning: hav → land**, som styrer landpunkt, havpunkt og pålandsretning til RavScore.

Administratoren søger efter en zone, vælger den, bruger **Flyt kort** eller **Præcis redigering** og trykker derefter **Gem ændringer**. Gemningen skrives centralt og læses tilbage som kontrol. Ved næste deployment anvendes det nye navn og den nye kystlinje automatisk på zoneregister, kort, søgning, ranglister, prognoser og debug. Zone-ID bevares, så historik, routing og observationer ikke mister deres reference.

Gamle tekniske kystlinjekladder fra tidligere versioner aktiveres ikke automatisk. Kun ændringer, som er gemt gennem den nye centrale arbejdsgang, kan blive anvendt i produktionen.

## Centrale regler og ens score for alle brugere – 4.0.94
Når ejeren aktiverer en regel i administrationen, gemmes den centralt. Ved næste deployment udvælger RavRadar kun regler med status **Aktiv**, kontrollerer deres struktur og opretter en lille offentlig regelfil med de felter, scoremotoren behøver. Regler, der endnu ikke er aktive, påvirker ikke brugerne.

Den offentlige side læser ikke længere ejerens lokale browserlager. Det betyder, at to brugere ikke kan få forskellige RavScore-resultater, blot fordi den ene browser tidligere har været brugt til administration. Alle brugere anvender samme versionerede regelsæt.

Rå centrale adminfiler indeholder arbejdsmateriale og må ikke publiceres på GitHub Pages. Kun den sanitiserede liste over aktive regler bliver offentlig, fordi den er nødvendig for at beregne og forklare den fælles RavScore.



### Automatisk kildevalg og interpolation
RavRadar beregner det automatiske valg direkte fra de vandstandskilder, som er brugbare i den aktuelle kørsel. Et tidligere routing-audit er dokumentation, men må ikke fastholde et tomt valg, hvis en kilde senere har fået en gyldig femdøgnsserie. Systemet forsøger først at vælge to kompatible kilder på hver sin side langs den lokale kystkorridor. Kysttopologien bestemmer altså hvilke kilder der vælges, mens de to serier interpoleres med inverse vægte beregnet ud fra den reelle geografiske afstand fra zonens datapunkt. Det er samme vægtprincip som administratoroverride. Hvis kun én kompatibel kilde findes, anvendes den med 100 % vægt i stedet for at efterlade zonen uden automatisk kilde. Administratoren kan fortsat overrule valget; override ændrer ikke den automatiske beregningsmetode for andre zoner. Når override er aktivt, viser kortet kun administratorens aktive kilder rødt. Automatiske forslag kan stadig læses i beregningspanelet, men vises ikke som grønne kortmarkører. Samme kilde kan ikke stå både som primær og sekundær; den samles til én kilde med 100 % vægt.

## Vandstandskilder: målestationer og prognosepunkter
RavRadar kan bruge både fysiske DMI-målestationer og DMI-prognosepunkter. Målestationer opdages i OceanObs `station`, mens prognosepunkter opdages i den særskilte `tidewaterstation`-collection. Entalsnavnet er vigtigt; det tidligere plurale endpoint fandtes ikke. En målestation viser observationsstatus. Et prognosepunkt viser i stedet, om det modtager en gyldig femdøgnsprognose. Begge typer samples i samme DKSS-model ved kildens koordinat, så de kan sammenlignes og afstandsvægtes. Administratorens aktive valg bruges før systemets automatiske valg. Den valgte serie bruges både i RavScore, ranglister, femdøgnsvisningen og tabellen “Næste fem dage – Vandstand time for time”.


### Driftstjek af alle vandstandskilder
Efter hver vejrproduktion skriver RavRadar en beskyttet auditfil med alle vandstandskilder. For hver kilde fremgår type, DMI-id, koordinat, observationsstatus, om den modtager en gyldig DKSS-femdøgnsserie, antal prognosetimer, gyldighedstid og om den må indgå i routing. Filen bruges til at bevise, om eksempelvis Hals Havn og Hals Barre faktisk har modtaget de serier, som admin viser. Den offentlige GitHub Pages-side må ikke indeholde denne audit eller projektets supportmappe.

### Teknisk sikkerhed for vandstandsserier
RavRadar skelner mellem en reel måling på 0 cm og en manglende værdi. Manglende data må aldrig vises eller beregnes som 0 cm. En vandstandskilde bruges kun, når den har en reel og tilstrækkelig prognoseserie. Når administratoren vælger en kilde på kortet, bliver valget straks den aktive røde routing for zonen og kan gemmes centralt.

## 24.1 Hurtig og sikker opstart af vandstandskildefanen
Når fanen **Vandstandsstationer** åbnes, skal RavRadar først have tre ting på plads: zonerne, det aktuelle register over vandstandskilder og det centralt gemte administratorvalg. De indlæses derfor før de øvrige diagnoser og adminregistre.

Mens de hentes, viser fanen en tydelig besked og kan ikke redigeres. Det forhindrer, at administratoren ser et midlertidigt automatisk valg, trykker på en knap og bagefter får handlingen overskrevet af en forsinket Supabase-læsning. Når kortet og knapperne vises, er den aktive routing allerede den endelige centrale tilstand. Røde markører betyder derfor straks et aktivt administratorvalg, og **Fjern** ændrer det samme dokument, som efterfølgende gemmes centralt.


### Lokal browsercache og central lagring
Vandstandsrouting gemmes centralt i Supabase. Browserens localStorage er kun en lille, valgfri hjælpe-cache. Store stationsregistre og diagnostik må ikke gemmes der. Hvis browserens lagerkvote er fuld, skal kortet stadig reagere med det samme, og den centrale gemning skal fortsætte.


## Teknisk driftsnote 4.0.107 – historisk tilstand uden scoreændring
RavRadar gemmer nu en begrænset 24-timers historik i produktionspipelinen og beregner varighed og styrke for strøm ind mod og væk fra den lokale kystretning. Den nye tilstand er foreløbig diagnostisk og ændrer ikke RavScore. Formålet er først at kontrollere, at forløb og retninger er fagligt korrekte. Generelle strømbånd bruges ikke. Kun de faktiske marine strømdata og zonens aktuelle retningsankre anvendes. Rå historik sendes ikke til den offentlige side.

Vandstationsfejlen fra 4.0.105 skyldtes fyldt browserlager. Fra 4.0.106 er lokal cache ikke-blokerende, store læsedokumenter gemmes ikke i localStorage, og røde administratorvalg samt Fjern er produktionsbekræftet som fungerende.


## DMI-pipeline og prioritering (4.0.110)
Når strømprognosens marine horisont mangler, henter RavRadar DKSS før den meget store HARMONIE-vindfil. Det beskytter de faktiske u/v-strømvektorer og vandstandsdata, som er nødvendige for score og audit. Vind kan midlertidigt komme fra den eksisterende fallbackkæde; manglende strøm må aldrig behandles som nul.

### DMI-first vind gennem fem døgn (4.0.118)
RavRadar bruger HARMONIE-vind så længe den valgte modelgeneration har valide værdier. Derefter kan DKSS' 10-meter-vind forlænge serien mod fem døgn. DKSS-vinden gemmes som sin egen U/V-vektor og blandes ikke med HARMONIE under interpolation. Hvis begge modeller har samme forecasttime, vælges HARMONIE. Når HARMONIE slutter, beregnes DKSS-halen kun mellem DKSS' egne modeltrin.

Hver færdig vindtime angiver, om den kom fra HARMONIE, DKSS eller fallback. Open-Meteo bruges kun, hvor DMI-kæden mangler en brugbar time, og tidsstemplerne hentes som UTC. RavRadar er gratis og ikke-kommerciel, men systemet skal stadig overholde kildevilkår, begrænse unødige kald, cache data og kreditere kilderne. Lokal grøn test er ikke bevis for femdøgnsdækning; den skal måles i en frisk produktion.

Fra 4.0.120 beder fallbackkaldet om 120 timer fremad fra kørselstidspunktet. Det undgår, at timer siden midnat bruger en del af femdøgnsbudgettet. Vandstandsrouting må kun ændre vandstandsfelterne; den må ikke erstatte den offentlige blandede serie med den rene DMI-cache og dermed fjerne en gyldig fallbackhale for vind eller andre komponenter. Direkte DMI-værdier har fortsat prioritet i alle timer, hvor de findes.

## Historisk tilstand i RavRadar
RavRadar vurderer ikke kun den aktuelle time. Systemet opsummerer også det seneste forløb med kraftig vind og bølger samt hvor længe strømmen har bevæget sig ind mod eller væk fra kysten. I version 4.0.111 bruges disse oplysninger kun til forklaring og teknisk kontrol. De ændrer endnu ikke RavScore.

Forklaringen kan blandt andet vise:
- at en kraftig hændelse nyligt kan have mobiliseret materiale,
- at indtransport gradvist bygges op, jo længere en indadgående strøm varer,
- at tidligere gunstige forhold kan efterlade et vedvarende nærkystpotentiale,
- eller at udadgående strøm gennem flere timer sandsynligvis nedbryder potentialet.

Der bruges ikke en fast regel om, at almindelig indtransport altid tager et bestemt antal timer. Varighed, retning og styrke vurderes samlet.

## 60. Historisk tilstandsmodel, referencezoner og sikker videreudvikling

### 60.1 Hvorfor RavRadar bruger en tilstandsmodel
Ravtransport beskrives ikke godt nok af et øjebliksbillede. Et område kan have haft kraftig mobilisering, flere timers indadgående strøm og derefter roligere forhold. Ravet kan stadig være nær kysten, selv om den aktuelle vindretning ikke længere ser optimal ud. Derfor skelner RavRadar mellem aktuelle jagtforhold og den historiske proces, som har ført zonen frem til den aktuelle time.

Den historiske model beregner blandt andet:
- hvor længe en kraftig energihændelse har stået på,
- hvor længe siden hændelsen sluttede,
- hvor længe strømmen har haft en indadgående eller udadgående komponent,
- akkumuleret indtransportmomentum og udtransporttryk,
- mobiliseringspotentiale,
- nærkystpotentiale,
- og en forklarende procesfase.

I 4.0.112 er dette fortsat en skyggetilstand. Den bruges til forklaring, diagnostik og faglig kontrol, men ændrer ikke RavScore. Det er bevidst: nye historiske regler skal først bevises på faktiske produktionsdata og i regressionstest.

### 60.2 Ingen universel transportforsinkelse
RavRadar bruger ikke en hård regel om, at almindelig indtransport altid kræver tre, fire eller fem timer. Den fysiske transporttid afhænger blandt andet af afstand, strømstyrke og hvor materialet allerede befinder sig. I stedet skal det senere numeriske bidrag vokse glidende med dokumenteret varighed, styrke og stabilitet af indadgående strøm.

Efter meget kraftig mobilisering kan roligere forhold og indadgående strøm opbygge et stærkt potentiale over omtrent ti timer. Det er et gradvist forløb og ikke en kontakt, der pludselig skifter ved præcis ti timer.

### 60.3 Faktiske strømdata – ingen generelle strømbånd
Kun den faktiske marine strømvektor må styre transportberegningen. Generelle beskrivelser af faste strømbånd omkring Danmark bruges hverken som scoregrundlag eller fallback. Når DMI-u/v mangler, er data ukendt. Manglende data må ikke blive til nulstrøm eller en antaget regional strøm.

### 60.4 Morfologi
Eksisterende dokumenterede zoneoplysninger om rev, ålegræs og lavt vand bevares i RavScore. Manglende oplysninger er neutrale og må ikke give straf. RavRadar kræver ikke, at administratoren manuelt kortlægger hele Danmarks bund og kystmorfologi. Praktiske råd om revler, høfter, ålegræs, tangbræmmer og opskyl kan bruges i håndbog og vejledning, også hvor de ikke indgår som numerisk data.

### 60.5 Faste referencezoner
Fire zoner bruges til automatiseret kontrol af geometri, strøm og skyggetilstand:
- Agger og Krik Vig,
- Asaa og Melholt,
- Als Odde og Helberskov,
- Blåvand og Hvidbjerg.

Als Odde og Helberskov er åben kyst nord for Mariager Fjord og må ikke behandles som fjordzone. Referencezonerapporten samler zonegeometri, pålandsretning, morfologi, verificeret strømproveniens og historiske state-felter. Rapporten ændrer ikke scoren. Nye manuelle billedserier skal kun kræves, hvis projekt-ZIP, logs, sitetest og automatisk diagnostik ikke kan afgøre en konkret fejl.

### 60.6 Brugerfund og GPS
En fremtidig fundrapport skal kræve, at brugeren vælger den zone, hvor jagten foregik. GPS må bruges til at kontrollere, om valget virker plausibelt, men må ikke automatisk blive jagtstedet. Brugeren kan oprette rapporten hjemmefra, og telefonens aktuelle position kan derfor være irrelevant.

Fundrapporten skal knyttes til den historiske vejr- og tilstandskæde på det valgte tidspunkt. AI kan senere finde mønstre og foreslå nye regler, men en produktionsregel kræver menneskelig godkendelse, versionering og efterfølgende effektkontrol. Manglende fund er svagere evidens end et dokumenteret fund, fordi erfaring, udstyr, søgetid og konkurrence påvirker resultatet.

### 60.7 Performance
Historik og tilstand beregnes i pipeline. Den offentlige browser modtager kun kompakte afledte felter. Rå 24-timershistorik og store diagnostikfiler må ikke flyttes til offentlig startup. Seneste verificerede opstart omkring 3,45 sekunder er en baseline, som nye ændringer skal sammenlignes med.

Fra 4.0.216 modtager browseren først en lille startpakke med aktuelle forhold, kompakt historisk tilstand, pilegrundlag og de lokale kystdele, der vinder aktuelt. Kort og dagens rangliste kan derfor vises uden at vente på hele femdøgnsprognosen og alle kystdeles timeresultater. Detaljepakken hentes straks bagefter og udfylder femdøgnsvisning, assistent og alle lokale detaljer. Begge pakker skal have samme dataset-id; ellers bruges detaljerne ikke. Ingen historiske data eller scoreinput slettes af opdelingen.

### 60.8 Sikker udviklingsmetode
Før en ændring implementeres, skal hele kæden gennemgås:
input, scheduler, tidsbudget, cache, DMI-hentning, proveniens, tilstand, score, offentlig runtime, UI, admin, tests, artifact, deploy og browsercache.

Gamle tests kan indeholde antagelser om en tidligere arkitektur. De skal findes og vurderes, før workflowet ændres. En release må ikke afleveres alene fordi den nye, lokale test består. Hele valideringen og release-gaten skal køre på præcis det pakkede indhold.

### 60.9 Overlevering mellem projektchats
Ved starten af en ny chat skal `docs/rdks/05_NEXT_CHAT_HANDOFF.md` læses sammen med Current Truth, implementeringsstatus, aktive krav, kendte issues og seneste changelog. Projekt-ZIP’en er den primære tekniske sandhed. Historiske chats bruges kun til begrundelse, når projektets aktuelle dokumentation ikke er tilstrækkelig.

## Produktionskontrol af historisk tilstand (4.0.113)
Den historiske tilstand er fortsat en skyggeberegning uden pointvirkning. Efter hver frisk produktion kontrollerer workflowet de fire faste referencezoner. Kontrollen kræver verificeret DMI-strøm og en score-neutral skyggetilstand; nye produktioner bruger `shadow-v2`. En kompakt loglinje gør det muligt at sammenligne varighed, styrke, stabilitet og nærkystpotentiale mellem produktionstimer uden nye manuelle screenshots.

Den rå DMI GRIB-cache skal bevare fremdrift mellem kørsler. GitHub-caches kan ikke overskrives under samme nøgle, så hver kørsel gemmer en unik cache og næste kørsel henter den seneste kompatible. Dette er en driftsmekanisme og ændrer ikke de marine kvalitetskrav.


## Releasekæden i 4.0.114

RavRadars tunge dataarbejde og selve offentliggørelsen er nu adskilt. Jobbet `build-and-prepare` henter og kontrollerer data, bygger supportpakken og uploader ét færdigt Pages-artifact. Det korte job `deploy-pages` publicerer derefter præcis dette artifact.

Kun deployjobbet har adgang til miljøet `github-pages`. Hvis GitHub Pages fejler efter et færdigt build, kan ejeren vælge **Re-run failed jobs**. Derved genkøres kun deploymentet; DMI-pipelinen, scorevalideringen og artifact-uploaden gentages ikke.

En almindelig vejropdatering må ikke afbryde en allerede aktiv tung kørsel. En ny kode-push eller en udtrykkeligt tvungen release må derimod afbryde en ældre almindelig vejropdatering, så en ny version ikke bliver låst bag gamle vejrjobs. Denne procesændring ændrer ikke RavScore eller datakravene.


## Verificeret strømhistorik i 4.0.115
Historiske transportfelter beregnes først endeligt, når den aktuelle strøm er knyttet til dokumenterede DMI-u/v-komponenter. En prøve uden verificeret marin provenance tæller derfor ikke som indtransport eller udtransport. Den behandles heller ikke som nulstrøm.

RavRadar viser nu to forskellige tidsmål:
- **Akkumuleret 24-timers transport** summerer alle verificerede perioder med indadgående eller udadgående strøm i det glidende døgn.
- **Aktuelt sammenhængende regime** beskriver kun den ubrudte seneste periode. Det stopper ved retningsskift, neutral strøm, manglende verifikation eller mere end to timers hul mellem prøver.

Denne skelnen forhindrer, at eksempelvis to timers indtransport, flere timers udtransport og derefter to nye timers indtransport fejlagtigt forklares som fire timers ubrudt indtransport. Tilstanden hedder `shadow-v2` og ændrer stadig ikke RavScore. Rå prøver forbliver i pipeline; browseren får kun de kompakte afledte felter.


## DMI-vektorer og manglende vejrfelter i 4.0.116
En strøm- eller vindvektor består af to komponenter: øst/vest-komponenten U og nord/syd-komponenten V. De to tal må kun sættes sammen, når de kommer fra det samme fysiske DMI-gitterpunkt på samme prognosetid. Hvis nærmeste gyldige U og nærmeste gyldige V ligger forskellige steder, søger RavRadar efter det nærmeste punkt, hvor begge findes. Findes der ikke et fælles gyldigt punkt inden for den tilladte afstand, markeres vektoren som manglende i stedet for at konstruere en usikker retning.

Vandstandskilder, som bruges til stationsrouting, er hjælpepunkter. De har kun brug for DKSS-vandstand og må ikke bruge beregningstid på vind, bølger, strøm eller vandtemperatur. Dækningstal for forecastzoner tæller derfor kun de almindelige aktive zoner.

Manglende data og fysisk nul er to forskellige ting. `null` betyder, at RavRadar ikke har en gyldig værdi. Det skal vises som **Mangler** og må ikke opfylde regler, blive til vindstille eller give en kunstig retning på 0°. Tallet `0` er derimod gyldigt, når datakilden faktisk leverer nul. Denne forskel gælder både vind, bølger og andre numeriske vejrfelter.

## 61. 4.0.117 – systemisk drift, DMI-dybdelag og Codex-overgang

### 61.1 Hvorfor én rød zone ikke nødvendigvis er én kodefejl
RavRadar er en kæde. En zone kan ende uden strømdata, fordi dens centralt gemte geometri er forkert, fordi scheduleren ikke når den relevante DMI-model, fordi GRIB-parseren vælger komponenter forkert, fordi en cache er ufuldstændig, eller fordi data falder ud senere i provenance/public runtime. Derfor skal en fejl følges både baglæns til kilden og fremad til det synlige resultat. En test, der fejler, er først et symptom; rodårsagen er det sted, hvor den korrekte information faktisk bliver forkert eller forsvinder.

### 61.2 DMI-current i flere vertikallag
DMI's DKSS-data kan indeholde strøm-U og strøm-V i flere vertikale lag. Det er ikke nok, at U og V ligger ved samme bredde-/længdepunkt. De skal også høre til samme forecasttid og samme vertikallag. Hvis et U-felt fra ét dybdelag parres med V fra et andet, er den beregnede retning ikke en dokumenteret fysisk DMI-vektor.

Fra 4.0.117 holder RavRadar derfor kandidater adskilt pr. vertikallag. U og V må først danne en vektor, når forecasttid, fysisk gitterpunkt og vertikallag er fælles. Valget mellem flere gyldige fælles lag skal være deterministisk og fremgå af proveniens/diagnostik. Parsergeneration 11 sikrer, at ældre GRIB-assets ikke fortsætter med den tidligere kandidatlogik.

### 61.3 Administratorens geometri er produktionsdata
Kystlinje, landpunkt, havpunkt, retning og andre administratorredigerbare zonefelter er ikke kosmetiske indstillinger. De påvirker blandt andet hvilket havområde RavRadar leder efter data i, lokale retninger og hele den efterfølgende score-/prognosekæde. Når administratoren gemmer en korrekt ændring centralt, skal produktionsworkflowet hente den og anvende den før vejrproduktionen.

I den afsluttende 4.0.117-kontrol blev tre Limfjordszoners kystlinjer og land-/havpunkter rettet i admin, fordi de var geografisk forkerte. Den friske produktionskørsel #1750 viste ændringerne som centralt anvendte og gennemførte weather-kæden. Det er derfor forkert at reparere en fremtidig test ved at hardcode tidligere koordinater. Testen skal kontrollere, at den aktuelle gyldige admingeometri propagere korrekt.

Kystgeometri v2 bygges parallelt og score-neutralt. Den bruger gratis GeoDanmark-kildedata i et særskilt manuelt pilotjob, aldrig i det hyppige vejrloop. Jobbet henter først den centrale admingeometri og dens slettede zoner, så et automatisk forslag ikke kan genoplive eller overskrive ejerens rettelser. Kilden, rå pilotdata og API-adgang ligger ikke i den offentlige Pages-side. Flere lokale kystdele må først blive selvstændige vejrmålepunkter, når DMI-sampling, provenance, score og brugerflade faktisk understøtter dem ende til ende.

### 61.4 Hvad “stabil” betyder
RavRadar skelner mellem tre niveauer:
- **Lokalt valideret:** de relevante tests på udviklingsmaskinen er grønne.
- **CI-valideret:** den relevante GitHub Actions-kørsel er grøn.
- **Produktionsverificeret:** den friske eksterne data-/admin-/pipelinekæde og det deployede resultat er kontrolleret.

En DMI- eller Supabase-relateret ændring må ikke kaldes stabil alene på grund af lokale tests. 4.0.117-overgangen bruger commit `6c1dece72d5970a1fc095b9a22f080d811cd9f36` med de efterfølgende grønne #1749 og #1750-kørsler som dokumenteret baseline; #1750 er særligt vigtig, fordi den lå efter de centrale geometriændringer.

### 61.5 Forecastets yderste kant
Hvis en strøm-, vandstands-, vind- eller bølgeserie mangler i forecastets yderste timer, er værdien ukendt. RavRadar må ikke forlænge sidste kendte værdi kunstigt eller gøre den til 0. Et sådant hul skal undersøges som et dækningsproblem i kilden, schedulerens tidsbudget, merge-/filterkæden eller forecast-horisonten. Det må ikke blandes sammen med den tidligere Limfjord-fejl, hvor en zone slet ikke fik et gyldigt marinegrundlag.

### 61.6 Codex og projektets hukommelse
Den videre kodeudvikling kan foregå direkte i et lokalt Git-repository med Codex. Codex får ikke automatisk tidligere samtalers hukommelse, så RavRadar gemmer den aktuelle projektsandhed i RDKS, denne håndbog, `AGENTS.md`, AI-dokumentationspakken under `docs/ai/`, tests og Git-historik. Chatarkivet bruges til historisk begrundelse.

Codex skal begynde med `docs/ai/CODEX_START_HERE.md` og derefter følge RDKS-læserækkefølgen. En væsentlig ændring er ikke færdig, før koden, tests, RDKS, håndbog og relevante issues/roadmap fortæller den samme historie.

### 61.7 Arbejd som på et helt bræt
Ved komplekse fejl skal udvikleren holde hele kæden i overblik: input og administratoropsætning, scheduler og tidsbudget, cache, DMI-collection og GRIB, grid-/lagparring, interpolation/routing, provenance, historisk state, RavScore, public runtime, UI/admin, regressionstests, artifact, deploy og browsercache. Det er denne systemiske arbejdsform, der skal forhindre en ny række symptomrettelser, hvor hvert træk kun flytter fejlen til næste led.

### 61.8 Vigtig korrektion: et grønt automatisk run kan være utilstrækkeligt
Ved den afsluttende Codex-overgang blev workflowets statuslogik gennemgået igen. Her viste det sig, at en almindelig automatisk `workflow_dispatch` kan bygge nye vejrdata og deploye et Pages-artifact, selv om de to fulde trin `npm run validate` og `npm run release:gate` er sprunget over. #1760 var grønt og deployede, men begge fulde gates stod `skipped`.

Derfor gælder fremover: **grøn topstatus er ikke nok**. En release er kun strengt godkendt, når de bindende gate-trin faktisk er kørt og har status `success`. Den aktuelle 4.0.117-handoff er kode- og deploymæssigt aktiv, men må ikke betegnes som ny stabil baseline endnu.

Den første Codex-kodeændring har rettet workflowbetingelsen: når preflight beslutter at bygge frisk produktionsdata, skal begge fulde gates køre og bestå før Pages-artifactet bygges. Hvis preflight fastslår, at der ikke skal bygges noget nyt, kan kørslen fortsat stoppe billigt uden artifact og deploy. #1769 viste korrekt stop ved fejlet validate, og #1772 gennemførte central sync, frisk produktionskæde, begge gates, artifact og Pages-deploy med `success`. Baseline er derfor produktionsverificeret.

### 61.9 Balanceret DMI-recovery
Marine data har fortsat første prioritet, når grundlaget mangler bredt. Men få vedvarende geografiske huller må ikke blokere vind og bølger i alle fremtidige kørsler. Når mindst 95 % af de aktive forecastzoner har marinegrundlag, bruger scheduleren derfor første produktive plads på den mest relevante DKSS-model og anden plads på den mest underdækkede vind- eller bølgefamilie.

Grænsen er en budgetregel, ikke en lempelse af datakravene. Zoner uden gyldig strøm forbliver manglende, marineauditten er uændret, og RavRadar kopierer hverken sidste værdi eller nul ind. Hvis marinegrundlaget falder under 95 %, går begge pladser igen til marine recovery.

HARMONIE-filerne er store nok til, at én kørsel kun kan behandle få forecasttrin. Cachen bygges derfor progressivt mellem kørsler. Forecasttrin, der allerede er mere end én time gamle, downloades ikke på ny; budgettet starter ved den aktuelle forecastkant og fortsætter kronologisk fremad. Den ene times tolerance bevarer et anker omkring genereringstidspunktet til den dokumenterede tidsinterpolation.

En ny modelgeneration publiceres ikke nødvendigvis med hele sin naturlige horisont på én gang. DMI's HARMONIE-samling rækker her omtrent 60 timer, mens marine DKSS-runs rækker længere. RavRadar fastholder derfor en progressiv HARMONIE-generation, mens den stadig rækker mindst 48 timer frem; marine samlinger bruger fortsat 96 timer. En nyere, men endnu kort publikation får ikke lov at nulstille opbygningen. Der kopieres ingen værdier mellem generationer; reglen styrer kun, hvilket dokumenteret DMI-run der behandles.

Den native horisont er ikke det samme som RavRadars produktmål. Målet er fortsat en dokumenteret prognose gennem cirka 120 timer pr. komponent. DMI bruges til den sidste valide DMI-time; en anden relevant DMI-kilde undersøges som forlængelse, og først derefter må en ekstern fallback udfylde den manglende hale. Vind, bølger, strøm, vandstand og temperatur kan derfor have forskellige skiftetidspunkter. Hvis en forsvarlig hale ikke findes, vises manglende data i stedet for nul, stale gentagelser eller skjult fallback.

### 61.10 DKSS' lokale vindkoder i 4.0.119
Generelle GRIB-tabeller kan navngive DKSS' lokale DMI-koder forkert; V-vindkode 34 blev eksempelvis kaldt havoverfladetemperatur. RavRadar bruger nu den lokale kode som autoritativ og kræver stadig U og V fra samme gitterpunkt. Scheduleren følger manglende vindhale pr. zones valgte DKSS-model, så IDW, NSBS og LF kan rotere over successive kørsler.
# Marine datapunkter og DMI-landmasker (4.0.123)

Administratorens centralt gemte datapunkt bruges i produktionskørslen. DMI kan stadig have landmaskerede celler omkring smalle fjorde og lavvandede områder. RavRadar undersøger derfor et bredere område efter et fælles fysisk U/V-havpunkt, men flytter ikke afstandsgrænsen og opfinder ikke værdier. Hvis intet gyldigt punkt findes, vises den dokumenterede fallback, mens direkte DMI-status forbliver manglende.
# Sådan kontrolleres femdøgnsdata (4.0.124)

RavRadar kontrollerer nu vind, bølger, strøm, vandstand og vandtemperatur hver for sig. Hver sammenhængende periode markeres internt som DMI, fallback eller manglende. Det betyder, at fuld vinddækning ikke længere kan skjule et kortere bølge- eller strømforløb. Kontrollen ændrer ikke prognosen eller RavScore; den viser, hvor datakæden senere skal forbedres.

# Sådan spores en DMI-time tilbage til modellen (4.0.125)

Når RavRadar læser et DMI-forecasttrin, gemmes både collection, modelkørsel og det native gyldighedstidspunkt sammen med komponentværdien. Oplysningerne følger vind, bølger, strøm, vandstand og vandtemperatur separat gennem den fulde interne datakæde.

En time mellem to native modeltrin mærkes som interpoleret og henviser til begge kildetidspunkter. Lead time fortæller, hvor langt prognosetimen ligger efter modelkørslens start, mens prognosealderen fortæller, hvor gammel modelkørslen var, da RavRadar byggede datasættet. To trin fra forskellige modelkørsler må ikke blandes; hvis en sammenhængende serie ikke kan dokumenteres, forbliver timen manglende. Den tekniske sporbarhed ligger i den beskyttede diagnosefil og gør ikke den offentlige brugerfil større. RavScore er uændret.

# GeoDanmark-entitetslag i kystpiloten (4.0.127)

GeoDanmarks entitets-WFS udstiller aktuelle bitemporale objekter som lag med endelsen `_current`, mens `_hist` indeholder historikken. RavRadars pilot vælger kun det præcise aktuelle lag. Hvis Datafordeleren ændrer lagkontrakten, stopper piloten og gemmer en credential-fri lagoversigt i sit private artifact. Den gætter ikke på et beslægtet lag og ændrer fortsat hverken aktive zoner eller RavScore.

Fra 4.0.128 hentes store lag sidevis. Hver rapport angiver antal sider, kildens oplyste antal og om udtrækket er komplet. Piloten stopper ved en fast sikker maksimumgrænse frem for at acceptere en tavst afkortet å-, havne- eller terrænmaske. Råfilerne ligger kun i det private, tidsbegrænsede GitHub-artifact.

Fra 4.0.129 har piloten sin egen GitHub Actions-kø. RavRadars planlagte vejropdateringer kan derfor ikke annullere en ventende eller igangværende geometri-pilot, og piloten kan ikke afbryde vejrdiften.

# Privat kildekontrol og pilotkort (4.0.130)

Piloten sammenholder nu de centralt gemte, effektive pilotzoner med GeoDanmarks kystlinjer og laver private målinger og kort. Den måler blandt andet afstand, hvor stor en del af den nuværende linje der ligger tæt på kilden, og om kilden består af mange adskilte stykker. Havne, vandløbsender, høfder, klitter og skrænter vises kun som neutral reviewkontekst.

Den første lokale analyse flaggede alle ni pilotzoner. Rømø har en tydelig geografisk forskydning, Limfjorden indeholder manuelle konflikter og flere mulige bredder, og Lolland/Falster kræver en bedre zoneinddeling frem for blot at flytte enkelte koordinater. Derfor bliver den nærmeste GeoDanmark-linje ikke automatisk gjort til RavRadars kystlinje. Næste fase opdeler og klassificerer kyststrækningerne og gennemfører stednavnekontrol. Aktive zoner, adminrettelser og RavScore er fortsat uændrede.

# Officiel navne- og kystdelstriage (4.0.131)

#1941 bekræftede, at source-QA og kort kan dannes privat på den centralt gemte pilotbestand uden build eller Pages. Piloten opdeler nu den fysiske GeoDanmark-reference i målbare kildestykker og mærker dem som tæt på den nuværende linje, delvist match eller semantisk/grænsemæssigt review. Et råt kildestykke er stadig ikke det samme som en færdig ravstrand.

Zonenavnene sammenholdes desuden med Danmarks officielle stednavneregister via Dataforsyningens offentlige, nøglefri API. Systemet gemmer kandidater, navnestatus, type og geografisk afstand, men foreslår ikke automatisk et endeligt navn. Den lokale pilot klassificerede Blåvand som geometriopretning, Rømø og Thisted som mulig semantisk flytning og de øvrige seks zoner som grænse-/partitionsarbejde. Næste skridt er at samle kontrollerede stykker til sammenhængende kystdelsforslag og anvende eksplicitte havn-, å- og fjordfravalg.

# Kontrollerede private kystdelsforslag (4.0.132)

Piloten samler nu kun GeoDanmark-stykker, der ligger tæt på eller delvist følger den eksisterende kyst. Stykker med mulig forkert geografisk betydning stoppes. Havne og faktiske kystskærende, synlige vandløbsmidter fjernes med dokumenterede afstandsbånd; nærliggende dubletter samles, så begge åbredder ikke bliver til mange kunstige kystdele. Små spring kan høre til samme multipart-del, men systemet tegner ingen opdigtet linje hen over springet.

Fjordreglen står eksplicit pr. pilotområde: kun ydre vestkyst, Limfjorden bevidst inkluderet og indre fjorde/nor ved Lolland-Falster udelukket fra automatisk forslag. En lokal prøve på det verificerede #1948-artifact gav 84 private reviewforslag. Rømø gav med vilje ingen forslag, fordi alle kildestykker kræver semantisk flyttereview. Kortet viser forslag orange. De er ikke aktive zoner, har ingen land-/vandpunkter eller selvstændig DMI-sampling og ændrer ikke RavScore.

# Geografisk reviewgate og officielle fjordpolygoner (4.0.133)

En regeltekst om fjorde er ikke nok. Det første zonevise review viste kystforslag inde i blandt andet Nysted Nor. Piloten henter derfor officielle Farvand-polygoner som GeoJSON og fjerner undertyperne fjord og nor overalt uden for Limfjorden. Maskerne gemmes privat med navn og kilde-ID og vises rosa på kortene. Resultatet faldt fra 84 til 72 reviewdele.

Hver pilotzone har nu sit eget højopløselige kort med nuværende kyst, fysisk GeoDanmark-kyst, forslag, fravalg og officielle stednavne. Reviewet frigiver kun Blåvand til næste private detailopretning. Rømø og Askø/Lilleø ligger geografisk forkert. Thisted, Fur, Aalborg, Stubbekøbing samt Falster/Nysted og Lolland/Kragenæs kræver nye grænser eller partitioner. Ingen af disse otte må få nye DMI-punkter, før den geografiske betydning og migration er besluttet.

Kørsel #1936 bekræftede hele denne kildekæde. Alle 21 lag/område-udtræk var komplette, også de seks der krævede flere WFS-sider, og de rå filer forblev i det private artifact. Det er et datagrundlag for næste analysefase, ikke en ændring af kortets aktive zoner.

# Privat Blåvand-detailforslag (4.0.134)

Blåvands fysiske GeoDanmark-kyst deles ved det officielle sted Blåvands Huk. Dermed får den nordgående strand og den sydøstgående strækning mod Hvidbjerg hver sin navngivne kystdel i stedet for ét misvisende fælles punkt.

Kystlinjen forskydes 15 meter mod land. Landsiden bestemmes separat for hver del ud fra de to centralt gemte og verificerede adminankre; det modsatte lokale normalpunkt bliver en privat vandpunktkandidat. Punkterne bruges endnu ikke til vejr eller score. Ni officielle høfter vises særskilt som mulige ravfælde-hypoteser, men de tegnes ikke ind i kystlinjen og giver ingen point.

Detailforslaget er kun reviewmateriale. Ortofotogaten og den private DMI-gridgate er bestået; de to kandidater rammer forskellige celler for alle kontrollerede komponenter. 4.0.138 låser hver fremtidig delserie til egen identitet, provenance og historik, 4.0.139 beviser komplette native flertidsserier, og 4.0.140 beviser separat score-neutral historikisolation. Privat pilot #2009 verificerede 4.0.141's UI-gate: den eksisterende aktive Blåvand-zone beholder sin RavScore-farvede kystlinje, score og rangering, mens de to delkonturer kun vises neutralt, stiplet og “ikke aktiv”. Ingen delscore, scorefarve, “bedste del” eller interaktion tillades. Produktion #2008 bestod fulde gates og deploy. Sampling, state, offentlig UI og admin-write er fortsat deaktiveret.

4.0.142-kandidaten tester kun den centrale admintransport gennem en unik midlertidig kladde. Kladden læses, opdateres og slettes igen, og de eksisterende centrale kystlinje- og retningsdokumenter skal have samme indholdshash og version før og efter. Det er rollbackbevis, ikke en lagring eller aktivering af Blåvand-forslaget.

# National kildeplan for hele Danmark (4.0.143)

RavRadar kan nu planlægge kystgeometri-v2 for hele den centralt effektive bestand uden at gentage Blåvand manuelt 208 gange. Efter central adminhydrering og tombstones kræver planen præcis 208 aktive zoner. Kystlinjerne fordeles på små, reproducerbare GeoDanmark-fliser, og kendte fejl samt nye centrale ændringer sendes til tydelige konfliktklasser i stedet for at blive overskrevet.

Et separat privat GitHub-job kan hente de gratis officielle kyst-, havne-, vandløbs-, høfde-, klit- og skræntlag for fliserne og fjerne dubletter fra overlap. Jobbet har ingen adgang til Pages og ændrer hverken aktive zoner, admin, vejrdata eller RavScore. 4.0.143 er derfor en kilde- og planlægningsgate; den er ikke den færdige Danmarkskyst eller en aktivering.

## National skalerings- og komplethedsgate (4.0.144)

Den første nationale måling gav 101 fliser og 707 lagforespørgsler. Sekventiel hentning var for langsom og viste ikke flisefremdrift. RavRadar bruger derfor højst fire samtidige fliser og logger hvert afsluttet trin, uden at øge antallet af data eller ændre kildens sikkerhedsgrænser.

#2029 bekræftede hele kæden med 208 zoner og den centralt hydrerede plan på 100 fliser/700 lagforespørgsler: hentningen tog cirka 5 minutter og 15 sekunder, kildevalidatoren og den rumlige QA bestod, og råpakken blev bevaret privat. #2033 verificerede en separat kompakt QA-pakke på 6,8 MB ved siden af den 413 MB store råpakke.

## National topologiaudit (4.0.146)

Den faktiske QA viser, at kun 20 zoner er direkte referenceklare, mens 188 er flagget. RavRadar må derfor ikke flytte alle linjer til nærmeste officielle kyst. Først måles officielle fjord- og norpolygoner uden for Limfjorden, havne, synlige åmundinger, klit- og skræntevidens samt høfter for alle 208 zoner. Resultatet er privat og kræver manuelt review; det kan ikke aktivere geometri, sampling, state eller score.

#2037 viste, hvorfor også topologiregler skal auditeres fagligt: første åregel fandt 2.868 klynger, op til 189 i én zone. Det er oversegmentering fra rå vandløbsdata, ikke et troværdigt antal åmundinger. Fra 4.0.147 holdes disse åmasker tilbage i overdense zoner, og råegenskaber profileres privat, før reglen skærpes.

#2040 viste, at 2.551 af 3.394 rå kandidater kun er 0–2,5 m brede. 4.0.148 tester derfor kun officielle vandløb på mindst 2,5 m med mindst 100 m fysisk linje. Små grøfter registreres som fravalgt evidens, men skærer ikke hul i en ravstrandlinje.

#2043 reducerede resultatet til 489 mulige åmundinger og kun én overdense zone, som allerede kræver partitionsredesign. #2050 verificerede 755 private multipart-dele i 194 zoner uden at tegne over spring og stoppede 25 zoner/28 for grove dele til lokal opdeling. 4.0.151 henter officielle stednavnekandidater for hver faktisk del og fordeler dem mellem direkte kystnavne, lokale bebyggelser, havnekontekst og øvrig kontekst. Kandidaterne er reviewmateriale; de bliver ikke automatisk navne, og delene har endnu ingen datapunkter eller score.

#2107 verificerede den friske nationale opdeling. De 28 grove dele erstattes privat af 56 kortere forslag, så den endelige reviewbestand er 783 dele. 4.0.154 giver hver del et revisionsbart, zoneunikt navneforslag med officielt sted-ID, afstand og alternativer. Den ene del uden direkte kystnavn bruger nær lokal bebyggelsesevidens ved Hou i stedet for et opdigtet navn. Forslagene aktiverer fortsat hverken geometri, admin, DMI, state eller RavScore.

4.0.155 undersøger derefter land- og havside lokalt. Et punktpar kræver et officielt landvidne og et marinevidne på modsatte sider af den lokale kystnormal. 774 af 783 dele består denne første port. De sidste ni får ingen punkter; de sendes med to neutrale alternativer til native DMI-gridkontrol. Dermed bliver et gammelt fælles zonepunkt aldrig tavst kopieret ud på alle bugtede kystdele.

4.0.156 indførte gridgaten, og 4.0.157 rettede modelrouting efter central kysttype. #2127 verificerede 4.0.158: 752 valgte punkter har både komplette bølge- og DKSS-familier, 18 har komplet DKSS uden WAM, og fire har komplet WAM uden DKSS. Mindst én komplet native havmodelfamilie beviser et brugbart vandgrid, men en manglende familie forbliver eksplicit manglende og bliver aldrig nul. De ni tvivlsomme normalsider forbliver blokerede, fordi ingen kun har én gyldig side. Ingen sampling, state, RavScore eller offentlig visning aktiveres.

4.0.159 giver hver af de 774 gridvaliderede dele en privat, unik serieidentitet og separat historiknøgle bundet til delens eget samplingpunkt og gridproveniens. En del må aldrig låne parent-zonens eller en nabodels værdier; de 22 kendte komponentgab forbliver missing. Ni blokerede dele får ingen kontrakt. Alle 208 eksisterende zoner beholder deres autoritative runtime, historik og RavScore, mens kontrakten afventer flertidsserie-, state-, UI- og admin-gates.

4.0.160 kræver mindst to komplette native tidstrin for hver WAM- eller DKSS-familie, som faktisk findes ved den enkelte del. Delvis dækning er gyldig som delvis dækning og udfyldes aldrig med nul eller parentdata. Current-U/V skal komme fra samme fysiske celle og vertikallag. Det private QA-artifact gemmer kun tilstedeværelse, digests og provenance; rå vejrdata, state, RavScore, UI, admin og offentlig runtime ændres ikke.

4.0.161 retter den første livefundne routingfejl fra #2142 og sikrer med regressionstest, at en DMI-collection kun behandles for de dele, hvis validerede gridkontrakt faktisk har valgt den.

#2146 verificerede derefter 774 unikke serier, 1.526 tilgængelige WAM-/DKSS-familier og 9.156 komponentbeviser. Hver familie har præcis to native trin med komplet DMI-provenance; artifactet indeholder ingen rå vejrdata.

4.0.162 afprøver isoleret `shadow-v2`-state på de 770 dele, der har komplette DKSS-currenttrin. Fire WAM-only dele forbliver eksplicit uden state og må ikke låne parentdata eller blive til nulstrøm. Replayværdierne eksisterer kun transient og slettes efter kontrollen; den gemte rapport indeholder digests og state-sammenfatninger. RavScore skal være numerisk uændret for både waders og beach.

#2152 verificerede denne isolation for alle 770 mulige dele og bevarede fire current/state-gab. 4.0.163 tilføjede derefter den manglende lokale vindgate: alle 774 scorekandidater skal have mindst to native HARMONIE-trin, hvor wind-U/V deler fysisk gridcelle og bærer fuld provenance. #2164 fandt, at Harbo Odde ikke havde et fælles gyldigt U/V-par blandt fire nærmeste celler. #2167 viste, at 32-cellesøgning for alle 774 dele ikke skalerer. 4.0.166 bruger derfor fire celler for alle og 32 kun som målrettet retry for faktiske gab; #31425327202 verificerede 774/774 dele med 20 målrettede retries.

4.0.167 samler de 783 endelige kystdele i en privat ejer-reviewside. Neutral grå betyder komplet datagrundlag, gul betyder deldækning, og rød betyder geografisk blokering; farverne er aldrig RavScore. Siden viser ingen delscore, rangering, rå vejrdata eller state. En efterfølgende central admin-test bruger kun en midlertidig, aldrig aktiv kladde, som slettes igen med de beskyttede runtime-dokumenter uændrede.

4.0.168 præciserer tidskravet: en lokal score må kun beregne vandstandsændringen, når DMI leverer både et native tidspunkt og et native tidspunkt tre timer senere. Fire havtrin hentes i den private kontrol; mangler et ægte tretimerspar, stoppes delen i stedet for at interpolere eller opfinde en trend.

4.0.169 holder vindforbruget sikkert afgrænset: præcis to native vindfiler hentes. Den første skal passe til et dokumenteret havtidspunkt med en native vandstand tre timer senere; den anden beviser, at delen har en selvstændig vindserie over mindst to tider.

Privat nationalkørsel #31448258035 har nu bestået hele kæden. Den bekræfter 774 selvstændige vindserier, 752 komplette shadow-scorer, 22 deldækkede dele og ni blokerede dele. Den samlede gennemgangsside viser alle 783 dele neutralt, og admin-testen blev rullet helt tilbage uden ændring af beskyttede data. Næste trin er ejerens manuelle kortgennemgang; intet er aktiveret automatisk.

I 4.0.171 foregår gennemgangen én kystdel ad gangen på et stort almindeligt kort eller luftfoto. Den valgte del vises med en kraftig blå linje, og siden zoomer automatisk ind. De 31 dele med deldækning eller blokering kommer først. Ejeren kan godkende, markere til rettelse, skrive en bemærkning og eksportere resultatet. Alt gemmes lokalt og er fortsat score-neutralt og ikke-aktiverende.

I 4.0.172 er de 31 afgørelser ført tilbage som et privat, versionsstyret review. Klare hele sletninger og løse små komponenter kan danne et teknisk forslag, mens beskæringer ved veje, havne og komplekse indre kyster fortsat skal vises igen i stedet for at blive gættet. En ekstra landskontrol bruger alle officielle farvandstyper, men sletter aldrig på baggrund af et navn eller en afstand alene. Kun dele med mindst fire uafhængige faresignaler kommer i den korte efterkontrol; identiske dubletter vises én gang. Intet aktiveres automatisk.

I 4.0.173 er den korte efterkontrol afsluttet. Ejeren slettede 15 dele, godkendte tre og beskrev fem præcise rettelser. En metrisk dubletkontrol fandt 12 ekstra tekniske ID'er, som dækkede de samme fysiske linjer. De arver nu ejerens afgørelse, og en beskåret linje arver kun den del, som faktisk blev bevaret. Derfor er der ingen resterende dele til endnu en manuel gennemgang. De rettede linjer er visuelt kontrolleret, men hele pakken er fortsat privat og ændrer endnu ikke den offentlige RavRadar.

4.0.174 udfører en ekstra slutkontrol, som ikke må forveksles med reviewdubletterne. Nabozoner havde tilsammen 311 tilfælde, hvor den samme officielle kyst var med i begge zoner. Hvert fysisk stykke tildeles nu præcis én zone ud fra den centralt gemte zonekyst og datapunkt. Ved Hammer Odde bruges nordspidsen eksplicit som grænse: vestsiden tilhører nordvestzonen, og østsiden nord-/Sandvigzonen. Slutresultatet er 603 dele uden overlap. Land-/vandpunkter genberegnes først derefter; seks visuelt entydige sider er dokumenteret særskilt, så alle 603 dele lokalt har et punktpar. DMI, state, vind og shadow-score skal stadig bestå igen på disse 603 dele før aktivering.

4.0.175 retter kun en forældet kontrol i den gamle 783-dels gennemgang. De seks dokumenterede land-/vandafgørelser betyder, at 758 dele nu er teknisk komplette, 22 har deldækning og tre fortsat er blokerede. Kontrollen forventede fejlagtigt stadig den tidligere fordeling 752/22/9. Kystlinjer, punktplaceringer, vejrdata og RavScore er ikke ændret af rettelsen.

4.0.164 bygger også næste private shadow-gate. Den eksisterende RavScore-motor beregner hver lokal del udelukkende, når vind, bølger, strøm og vandstand findes på samme native tidspunkt, og når næste native vandstandstrin kan danne den faktiske tre-timers trend. Ingen nærmeste-tid eller parentdata bruges. Ved komplet sammenligning betyder højst syv points samlet spænd praktisk hele zonen; ellers navngives én eller flere dele inden for syv point af vinderen. Mangler blot én nødvendig lokal sammenligning, er dækningen usikker. Resultatet er fortsat privat og kan ikke ændre den aktive RavScore.

Før et privat artifact accepteres, skal alle 208 zoner være bundet til planen, alle eksponerede lag være komplette, og filer og hashværdier stemme. Deduplikering måles, og credential- eller mutationsfund stopper kørslen. Først derefter udføres en rumligt indekseret fysisk kystsammenligning for alle zoner. Resultatet er fortsat QA og kan ikke aktivere kyst, vejr eller score.

## National aktivering af lokale kystdele i 4.0.176

Efter ejerens to kortgennemgange og privat run #31480089490 er den aktive kandidat 605 lokale kystdele i 190 hovedzoner. Samlingen har nul fysisk overlap. Alle 605 dele har et landpunkt og et vandpunkt; 594 har fuld marin modeldækning og 11 har dokumenteret deldækning. Den sidste tætte ejerskabsbeslutning ved Orehoved er lagt til Falsters nordkyst.

Vejrpipelinen bruger de eksisterende samlede DMI-filer og foretager lokale gridopslag for hvert vandpunkt. Der sendes derfor ikke ét DMI-kald pr. kystdel. Hver del får sin egen lokale vejrserie og RavScore. Den højeste gyldige delscore bestemmer hovedzonens score på det pågældende tidspunkt. Er forskellen mellem bedste og dårligste del højst syv point, kan resultatet beskrives som hele zonen; ellers vises én eller flere dele inden for syv point af vinderen. Mangler en nødvendig lokal sammenligning, er resultatet usikkert, og systemet må ikke genbruge den gamle hovedzonescore.

De lokale kystdele er beregningsdele, ikke nye brugerzoner. Kortet viser derfor hovedzonens autoritative, sammenhængende kystlinje med én zonetitel, én klikflade og kun en sort markering ved hver af hovedzonens to ender. Delene ligger bag visningen og leverer lokale målepunkter og scorer. Aktiveringen gemmes centralt som et lille versions- og hashdokument; de store kildefiler ligger ikke i Supabase. Rollback sker ved at slå dette dokument fra og genudgive den bevarede hovedzoneruntime.
# Driftsnote til 4.0.181

De 605 lokale beregningsdele er lagt online. Vindkortets koordinater læses og indekseres én gang. For hvert lokalt punkt kan op til 32 nære celler kontrolleres ved sjældne datahuller; kun den nærmeste celle med både gyldig U- og V-vind accepteres. #31498481482 beviste score til 605/605 dele. Den første kortversion tegnede fejlagtigt hver beregningsdel som en synlig zone og blev uoverskuelig og tung. 4.0.181 genopretter hovedzonernes kystlinjer uden at fjerne de lokale beregninger. Kendte relevante ravstrande, som ikke indgår i beregningsdelene, auditeres særskilt.

## Præcise hovedzonekyster i 4.0.182

Dette afsnit beskriver 4.0.182-bestanden som en historisk aktiveringsmilepæl. På det tidspunkt kombinerede kortet de to nødvendige lag: hovedzonerne var de eneste synlige og klikbare zoner, mens deres viste kyststreg blev bygget af de præcise, gennemgåede lokale kystdele. Bestanden omfattede da 212 hovedzoner; 206 havde præcis kystgeometri, og seks brugte fortsat deres gamle linje, fordi et sikkert nyt forløb enten blev forkastet eller viste sig kun at være en dublet. Den aktuelle centrale bestand er 210 efter senere ejerbesluttede sletninger; se afsnittet *Lokal validering og aktive zoner – 4.0.208*.

Der findes 643 lokale beregningsdele bag kortet. Alle har land- og vandpunkt; 632 har fuld marin DMI-dækning og 11 har dokumenteret deldækning. De 39 nye eller ændrede vandpunkter bestod native WAM- og DKSS-kontrol i #31532688885. En symmetrisk overlapkontrol fjernede 11 oversete additive dubletter, så slutbestanden har nul tværzoneoverlap og nul uafklarede relevante kysthuller.

Vadehavets fastlandskyst fra Emmerlev mod Esbjerg indgår i tre hovedzoner. Rømødæmningen og økyster indgår ikke i fastlandslinjen. To ejer-godkendte forbindelser ved den fragmenterede digekyst og Ribe Å er dokumenterede undtagelser fra den direkte officielle linje.

Brugeren ser fortsat én scorefarve, ét navn, én klikflade og kun en sort grænsemarkering ved hver ende af hovedzonen. Interne beregningsdele skaber ingen sorte markeringer. RavScore-reglerne er uændrede.

Den aktive kyst kan efterfølgende kontrolleres uden at bygge en ny kandidat. Et privat read-only kontrolkort læser den versions- og hash-låste produktionsbestand, viser først hele Danmark og kan derefter søge og zoome til hver lokal del. Kortet må dokumentere mulige problemer, men må ikke aktivere eller rette geometri automatisk. En ændring kræver fortsat dokumenteret årsag, relevant ejerafgørelse og de fulde geometri-, DMI-, runtime- og releasegates.

## Redigering af hovedzonens kystgrænse

I administrationen redigeres den præcise kyststreg. Et endehåndtag kan trækkes hen til en eksisterende valideret nabokystdel. Når flytningen gemmes, følger kystdelens geometri, landpunkt, vandpunkt, DMI-grid og lokale scoreidentitet samlet med; zonens afgrænsning følger automatisk.

Viskelæderet deaktiverer en hel valideret kystdel og dens datakontrakt samlet. Den stiplede del kan gendannes, før eller efter central gemning. Værktøjet opfinder ikke målepunkter til en frit tegnet ny linje. En helt ny kystdel skal først gennem den private geometri-, punkt-, DMI- og score-neutrale kontrol.

## Ét land-/havpunktpar pr. kyststrækning

Hver af de 673 aktive lokale kyststrækninger har ét blåt havpunkt og ét grønt landpunkt. Punktparret er fælles sandhed for DMI-sampling, den røde hav→land-retning, lokal RavScore og offentlig forklaring. Administratoren retter en placering ved at trække de eksisterende markører; der oprettes ikke ekstra aktive punktpar på samme uændrede strækning.

På bugtede strækninger vælger ejeren manuelt det sted, som bedst repræsenterer den relevante ravstrand. En bred orienteringsaudit har flagget 199 kontrolkandidater i 122 hovedzoner, men 171 er fragmenterede `MultiLineString`-dele. Listen er derfor et arbejdsredskab til gradvis kontrol og ikke 199 dokumenterede fejl eller tilladelse til automatisk genopdeling.

Efter **Godkend og gem centralt** skal punktparret læses tilbage fra central lagring og bestå en frisk DMI-/releasekørsel, før det bliver autoritativt. Ved afvisning aktiveres kladden ikke. Den manuelle ejerreview kan udskydes, men skal afsluttes før endelig faglig godkendelse af alle lokale scorer, større scorekalibrering og domæne-/brugerrelease.

## Stabilt valg af DMI-strømmodel i 4.0.212

RavRadar kan hente strøm, vandstand og vandtemperatur fra overlappende DMI-havmodeller. En zones autoritative havmodel vælges ud fra et gyldigt fælles strømpar, hvor øst-/vest- og nord-/sydkomponenten kommer fra samme fysiske gittercelle.

Et vandstands- eller temperaturpunkt kan ligge lidt nærmere kystpunktet end strømcellens centrum. Det må ikke alene skifte hele havmodellen og slette en sammenhængende strømprognose. Fra 4.0.212 følger disse felter derfor det eksisterende modelvalg uden at ændre det. Kun en kandidat med et reelt bedre fælles strømpar kan overtage.

Rettelsen ændrer ikke DMI-kilder, fallback eller RavScore. Manglende strøm forbliver manglende, og den videre femdøgnsanalyse gennemføres fortsat under DEC-0030.

## Rå og verificeret strømhistorik i 4.0.220

RavRadar gemmer op til 72 timers rå vejrprøver, men en gemt prøve er ikke automatisk sikker nok til transport- eller scoreanalyse. Strøm tæller kun som verificeret, når øst-/vest- og nord-/sydkomponenten har et fælles DMI-bevis for samme sted, dybde, modelkørsel og tidspunkt.

Den skrivebeskyttede kontrol viser derfor både rå længde og verificeret længde. I det første målte datasæt havde alle 210 zoner 37,149 timers rå historik og verificeret strøm ved nutiden, mens det verificerede historiske spænd varierede fra 1,43 til 37,149 timer. Ingen zone var endnu på 72 verificerede timer.

Det betyder, at historikken bevares som planlagt, men endnu ikke er klar som landsdækkende grundlag for et nyt mobiliserings- eller scoremodul. Systemet rekonstruerer ikke fortiden, tæller ikke fallback som DMI og gentager ikke en gammel værdi for at lukke et hul.

## Alarm for valgte vandstandskilder i 4.0.221

RavRadar skelner mellem en aktuel måling, kildens DMI-prognose og den routede forecastcache. En målestation kan holde op med at levere nye observationer, mens en allerede hentet prognose stadig er gyldig. Det er ikke straks et databrud.

Kun kilder, der faktisk er valgt automatisk eller af administratoren, overvåges. Hvis en aktiv valgt kilde ikke leverer observationer, ser alarmen på det seneste gyldige tidspunkt fra både kildeprognosen og cachen. Inden for den centralt gemte tærskel vises en advarsel; ved udløb eller helt manglende gyldighed vises kritisk status. Historiske/inaktive kilder og stationer, der leverer nu, udløser ikke denne cachealarm.

Alarmen ændrer ikke stationvalg, vandstandsserien eller RavScore. Den fortæller kun ejeren, hvornår en effektiv kilde nærmer sig et reelt hul.

Den første produktionskontrol viste samtidig forskellen på gammel registrering og faktisk brug: Hals Barre og Hals Havn stod med gamle lister på 15 og 21 zoner, men den producerede serie brugte dem både før og efter rettelsen i 5 og 6 zoner. Alarmen følger nu den faktisk producerede rute. Det er en rettelse af diagnosen, ikke en ændring af stationvalget.

## Sådan tæller RavRadar nye vejrcyklusser i 4.0.222

En ny GitHub-kørsel er ikke nødvendigvis en ny vejrprognose. DMI udsender modellerne i bestemte modelkørsler, og flere RavRadar-kørsler kan genbruge præcis den samme. Derfor viser P1-kontrollen nu både DMI-model, modellens starttid og om timen er native eller interpoleret.

Når vi senere sammenligner spring mellem DMI og fallback, tæller flere artifacts med samme model-starttid ikke som flere uafhængige vejrcyklusser. De kan stadig bevise stabil drift og voksende historik. Hvis en DMI-time mangler modelnavn eller starttid, står den som udokumenteret; RavRadar gætter ikke oplysningerne.

Kontrollen ændrer ingen prognose eller RavScore. Den sikrer kun, at beslutninger om senere overgangsgrænser bygger på reelt forskellige modelkørsler.

## Delvise nye DMI-modelkørsler i 4.0.223

En ny DMI-modelkørsel kan begynde med få timer, mens den foregående kørsel stadig leverer resten af femdøgnsprognosen. Derfor viser P1-kontrollen nu både antallet af timer og antallet af zoner, som hver modelkørsel faktisk bidrager til.

Artifact #2783 viste den første nye HARMONIE 12 UTC-cyklus efter 4.0.222, men kun med 416 timer fordelt på 208 zoner. Den tidligere 03 UTC-cyklus bar fortsat hovedparten af vindhorisonten. Det tæller som en ny, delvis cyklus – ikke som et fuldt landsdækkende bevis.

Kontrollen ændrer ingen værdier eller kilder. Den forhindrer kun, at en tidlig indfasning bruges som grundlag for en permanent overgangsgrænse.
