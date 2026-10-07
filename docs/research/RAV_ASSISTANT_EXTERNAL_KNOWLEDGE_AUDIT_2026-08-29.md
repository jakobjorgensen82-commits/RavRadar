# Spørg RavRadar – ekstern videns- og kildeaudit 2026-08-29

## 2026-10-07 01.04 DK – tre afgrænsede offentlige visningshjælpsemner

Den normale lokale kalder gav på ni DA/DE/EN-eksempler enten en afvisning,
et irrelevant vandstandsfysiksvar eller krav om zonevalg i stedet for
instruktion om eksisterende kontroller. Tre nye produktvidensemner forklarer
zoneprognosens vejr, vandstandstabellens eget dagvalg og den normale
spærring af turstart fra ældre nødvisning. Kodegrundlag: `app.js`,
`js/ui/info-panel.js` og `js/i18n.js`; eksisterende produktkilder genbruges.

449 selvstændige emner, 1347 sprogsvar, 16164 testformuleringer og 466
kontrakter består i den eksisterende normale vidensmålprøve uden netværk:
162 UI-hjælps-, 270 naturlige UI- og 24 sammensatte UI-scenarier.
Private kvalifikationer, sikkerhed og opfølgninger bevares. Der hentes
ingen vejrdata, loves ingen sikker vadedybde og nulstilles ingen browserdata.
Kildeantallet og de eksterne AI-fakta er uændrede. 440-emnebindinger og de
afviste genberegninger er fortsat uafsluttede; kun lokal viden, ikke ny
browser-, ekstern AI- eller offentlig leveringsprøve.

## 2026-10-06 15.34 DK – seks offentlige UI-hjælpsemner, ikke privat brugeradgang

6. oktober kl.15.34: Den offentlige 545-browser afviste det almindelige
spørgsmål »Hvordan skifter jeg til satellitkort?«. Den normale lokale
vidensparent reproducerede den manglende hjælp før rettelsen.

Seks nye selvstændige DA/DE/EN-emner forklarer kortbaggrund, søgemåde,
prognosedag, sprog, grundbog og kontaktindgang fra de verificerede normale
UI-kaldere. Dagsvalget i Top 20 må ikke omskrives til et løfte om samme dato
i den åbnede zone; dato og tidspunkt kontrolleres særskilt. Satellitkort er
ikke en måling af dagens rav. Waders-valget er ikke en sikkerhedsgodkendelse.
Svarene ændrer ikke indstillinger eller sender en kontaktmail.

Kataloget har nu 437 selvstændige emner, 1311 skrevne sprogsvar,
15732 formuleringer og 454 lokale kontrakter. De 109 kilder og 95 eksterne
AI-fakta er uændrede i antal. Formuleringer er testvarianter, ikke nye fakta.
108 nye UI-hjælpsscenarier består i den eksisterende normale vidensparent:
sprog, opfølgning, valgt zone, private afgrænsninger, ingen vejrhentning og
hele beskedens sikkerhed. De 552 kontohjælpsscenarier og den normale
prognoseparent består fortsat. Vejr, RavScore, konti og private data er urørt.

Kun lokal kandidat på 543; ikke offentlig rettelse af 545 eller bevis
for fungerende ekstern AI. Bindingsafklaring, kendt metadata-CAS-håndbogsgate,
egen eksakt kildekontrol, sikker levering og offentlig svarprøve er åbne.
Ingen nye bindinger, versioner, migrationer, destinationswrites eller deploy.
GDPR-forslag er en særskilt undersøgelse, ikke allerede leverede funktioner.
Ejerens roadmap-fravalg består; vandstand og den store revision er særskilte.

Kildegrundlag: index.html, app.js (setMode og renderNationalForecast),
js/map/map-view.js (createMap), js/i18n.js, about.html og learn.html.
De tre sprog bruger de faktiske knapnavne. Eksisterende kildeposter
rr-current-product og rr-user-spec bruges; ingen nye eksterne fakta eller
påstået juridisk compliance tilføjes. Offentlig prøve bruger kun en egen
midlertidig tab og et almindeligt kortspørgsmål, ikke en privat konto.

## 2026-10-06 14.13 DK – kildebunden kontohjælp uden privat adgang

6. oktober kl.14.13: Offentlig browserkontrol på 545 afviste både
»Skal jeg have en konto for at bruge RavRadar?« og »Hvor finder jeg
Mine ture og fund?«. En regression i den normale lokale vidensparent
reproducerede den manglende kontohjælp før rettelsen.

Fjorten nye selvstændige emner forklarer kontoens valgfrie rolle,
kontofordelen, anonyme ture, tidligere gæsteindsendelser, den private
turlog, dens 100-tursvisning, ventende indsendelser, en tom oversigt,
loginlink, manglende mail, positionsprivatliv, efterregistrering,
nul-fund og tidligere modelbinding. DA/DE/EN-svarene er kontrolleret
mod de eksisterende normale UI-, login- og turkontrakter samt håndbogen.

Kataloget er nu 428 selvstændige emner, 1284 skrevne sprogsvar,
15408 formuleringer og 445 lokale kontrakter. 109 eksisterende
kildeposter og de 95 eksternt bundne AI-fakta er uændrede i antal.
Formuleringer er testvarianter, ikke nye fakta. Den normale vidensparent
består med 279 nye kontohjælpsscenarier; tidligere metode-, ravstart-
og prognosescenarier samt sprog- og sikkerhedsparents består.

Svarene læser ikke en session, indbakke, leveringskø eller privat tur.
De lover ikke, at en mail er leveret, at ventende data er gemt centralt,
eller at anonyme ture kan overtages. Hele beskedens sikkerhedsfilter
er uændret; følsomme login- og backendspørgsmål afvises fortsat.
En tidligere model og efterregistreret tur får ikke ny binding eller
dagens vejr, og oplysningerne ændrer ikke automatisk RavScore.

Kun lokal kandidat på 543, ikke offentlig rettelse af 545 eller
uafhængigt bevis for fungerende ekstern AI. Egen eksakt kildekontrol,
bindingsafklaring, den kendte metadata-CAS-håndbogsgate, sikker levering
og ny offentlig svarprøve er fortsat åbne. De afviste destinationer er
urørte. Ingen ny version, migration, konto, mail, modelbinding,
produktion, ekstra vejrhentning eller ændring af den aktive plan.

## 2026-10-06 13.50 DK – tolv kystbegreber og sammenligninger, lokal kandidat

6. oktober kl.13.50: En faktisk offentlig browserprøve på 544 viste,
at »Er bølgeopløb det samme som vandstand?« fik generel bølgemodeltekst
i stedet for at forklare forskellen. Den lokale regression reproducerede
fejlen før rettelsen. Tolv nye kildebundne emner forklarer nu bølgeopløb,
bølgesetup, stormovervask, vedvarende kystoversvømmelse, klitkollision,
barriereøer, landværts barrierevandring og sandfodring samt fire konkrete
sammenligninger. Begge rækkefølger og »er det samme som« dækkes på DA/DE/EN.

Kataloget er nu 414 selvstændige emner, 1242 skrevne sprogsvar,
14904 formuleringer, 431 lokale kontrakter og 109 kildeposter.
De 95 eksterne AI-fakta er uændrede. Fem nye primære USGS-henvisninger
er kontrolleret; forskningsartiklerne er læst som abstracts, og
sedimentrapporten som myndighedens sammendrag, ikke som fulde rapporter.
Fremmede risikogrænser, modelkoefficienter og lokale vejrtal overføres ikke.

Den normale vidensparent består med 3936 metode- og kystscenarier,
900 flere end før denne ændring, plus seks bogstavelige sammenligninger.
Sted, dato, private målekrav og hele beskedens sikkerhed bevares.
Prognose-, sprog- og sikkerhedsparents består også. Svarene ændrer ikke
vandstand, geometri eller RavScore og giver ikke sikre vadegrænser.

Kun lokal kandidat på 543, ikke offentlig rettelse af 544 eller bevis
for ekstern AI. Bindingsafklaring, den kendte metadata-CAS-håndbogsgate,
egen kildekontrol, sikker levering og ny offentlig svarprøve er åbne.
Tidligere lokale leveringsafvisninger omgås ikke. Ingen ny version,
migration, modelbinding, produktion eller ekstra vejrhentning.

De nye fem direkte kilder står i rav-assistant-sources-v1.js og bindes
til hvert relevant emne i den eksisterende metodeguide. USGS' skitse og
2006-abstract bruges til setup/swash/opløb; stormregimer og 2000-abstract
til klitfod, klittop, overvask og vedvarende oversvømmelse; 2021-sammendraget
til barriereøer og sandfodring. Den eksisterende NOAA-stormstuvningskilde
er genkontrolleret. Tilførslen af sand er ikke bevis for tilførsel af rav.

## 2026-10-06 13.10 DK – konkret startvejledning fra eksisterende grundbog

6. oktober kl.13.10: Et almindeligt »Hvor finder jeg rav?« gav lokalt
kun et ukendt-svar. Det nye startemne giver nu konkret, afgrænset
feltvejledning på DA/DE/EN fra RavRadars aktuelle grundbog. Et stednavn
eller et krav om garanteret fund må ikke fjernes for at passe til svaret.

Et udtrykkeligt dateret spørgsmål som »Hvor finder jeg rav i morgen?«
bruger derimod den eksisterende validerede nationale prognose. Tolv
naturlige DA/DE/EN-varianter er dækket af 72 nye scenarier med og uden
valgt zone, ukendt afstand, utilgængelige data og forkert binding.
Den almindelige vejledning er ikke en geografisk fundrangering.

60 nye scenarier beskytter det generelle startemne, korte opfølgninger,
sammensatte spørgsmål og hele beskedens sikkerhed. De normale videns-
og prognoseparents består. Kataloget er nu 402 forskellige emner,
1206 skrevne DA/DE/EN-svar, 14472 formuleringer og 419 lokale kontrakter.
104 kilder og 95 eksterne AI-fakta er uændrede. Formuleringer tæller
ikke som nye fakta; det større vidensmål er stadig åbent.

Kun lokal kandidat på 543, ikke ny version eller offentlig levering.
Score, kildeprioritet, administratorpunkter, prognosedata, modelbinding,
kvote og privat autentificering er urørt. Den kendte metadata-CAS-
håndbogskontrol og bindings-/leveringskontroller er fortsat åbne;
deres gates er ikke omgået. Ingen produktion under aktiv vejrhentning.

Ingen nye eksterne kildeposter. Det nye praktiske emne er kontrolleret
mod den aktuelle grundbogs afsnit om selve jagten, opskylslinjer,
waders, ravkese og UV-kontrol. De eksisterende kildeposter
rr-learning-design og rr-user-spec bruges med deres udtrykkelige
afgrænsninger; ældre forskningsforslag aktiveres ikke som nye funktioner.

## 2026-10-06 12.50 DK – 48 nye metode- og kystemner, kun lokal kandidat

6. oktober kl.12.50: Spørg RavRadar har lokalt fået 48 nye, selvstændige
emner om prognoser, målinger, statistik og kystprocesser. Der er nu 401
emner og 1203 skrevne svar på dansk, tysk og engelsk. De 14436
spørgeformuleringer er testvarianter, ikke nye fakta. 418 lokale
kontrakter og 104 kildeposter; de 95 eksterne AI-fakta er uændrede.

De nye forklaringer handler blandt andet om ensembleprognoser,
prognoseusikkerhed, målenøjagtighed, middelværdi og median, opvelling,
strømmålinger og sediment. 26 primære kildeposter er kontrolleret.
Svarene skelner mellem generel faglig viden og det, RavRadar faktisk
viser. De udleder ikke lokale tal, nye scoreinput, fundchancer eller
sikker vadedybde. Kildekontrollen af sedimentbudgettet er afgrænset til
myndighedens tilgængelige indekserede beskrivelse, ikke en fuld rapport.

3036 nye scenarier i den eksisterende vidensparent består lokalt med
opfølgninger, sammenligninger, ukendte afgrænsninger og helbeskedens
sikkerhed. Den normale prognoseparent og sprogparent består også.
46 nye prognosescenarier omfatter naturlige spørgsmål om næste ravtur
og bevarer dato-, afstands-, tilgængeligheds- og bindingskontroller.

En faktisk offentlig 544-browserprøve reproducerer stadig afvisningen
på både »hvor er det bedste sted i morgen?« og den tilsvarende hurtigknap,
selv om morgendagens Top20 vises. Den lokale rettelse er derfor ikke
offentlig effekt. Der er ikke lavet ny version, modelbinding, migration,
offentlig levering eller ekstra vejrhentning. Praktisk ekstern AI,
bindingsafklaring, sikker levering og samlet revision er fortsat åbne.

Kildeafgrænsning: Met Office og ECMWF bruges kun til prognosemetoder;
NIST til måle- og statistikbegreber; NOAA til kystprocesser og
strømmålemetoder; USGS til vandføring, ledningsevne, turbiditet og
sediment. Fremmede modelparametre, oliepartiklers vindfaktorer,
instrumentintervaller, lokale miljømålinger og nationale prognoser
overføres ikke til RavRadar. De 26 fulde henvisninger og emnernes
afgrænsninger står i det offentlige kilderegister. Kun en tilgængelig
indekseret myndighedsbeskrivelse er brugt til sedimentbudget, uden
påstand om adgang til den komplette rapport.

## 2026-10-06 04.43 DK – tolv nye kildebundne emner, ingen nye vejrdata

Tolv nye kildebundne nedbørs-, sky- og frontemner er lokalt skrevet på
DA/DE/EN efter direkte kontrol af ti myndighedskilder. Kataloget er 353
emner, 1059 sprogsvar, 12708 formuleringer, 370 kontrakter og 78 kilder;
103 guideemner og uændrede 95 AI-fakta. 318 nye normalcaller-scenarier
bevarer faglig usikkerhed, opfølgninger og hele spørgsmål. Betyder/Giver,
Bedeutet/Bringt og Does er selvstændige delspørgsmål; en ny konkret RED
viste ellers et forkert vandstandssvar efter et regnmængdespørgsmål.
Ingen nye prognosefelter, aktuelle regntal, scoreinput eller fundgarantier.
Kun lokal dirty 543; praktisk AI- og browserkontrol samt sikker levering
mangler. Ejerens ønske om tusindvis af selvstændige svar er stadig åbent.

Kontrolleret 6. oktober 2026; kun afgrænsede begreber, ingen fremmed
prognose, varseltærskel eller lokal dataværdi:

- [Met Office: What does this forecast mean? – Chance of precipitation](https://weather.metoffice.gov.uk/guides/what-does-this-forecast-mean) (`metoffice-precipitation-probability`): Chance of precipitation in a stated place/period, distinct from duration and amount. Met Office thresholds, UK forecast fields and warning criteria are not copied into RavRadar.
- [DMI: Følg et regnvejr med DMI – nedbør i millimeter](https://www.dmi.dk/nyheder/generiske-nyheder/folg-et-regnvejr-med-dmi/) (`dmi-rainfall-millimetres`): Only the rain-depth unit: 1 mm equals 1 litre per square metre. Historical UI directions and warning criteria are not imported; not sea level or safe wading depth.
- [Bureau of Meteorology: IFD FAQ – depth, duration and rainfall intensity](https://www.bom.gov.au/water/designRainfalls/ifd-arr87/ifdFAQ.shtml) (`bom-rainfall-intensity`): Rate versus accumulation and duration; arithmetic example is explicitly hypothetical. Australian design rainfall statistics, return periods and flood thresholds are not imported.
- [Met Office: Rain – convective rain and showers](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/rain) (`metoffice-rain-showers`): Local intermittent shower patterns, not arrival time at a Danish beach, foreign climate frequency or amber yield.
- [Met Office: How we measure cloud – cloud amount](https://weather.metoffice.gov.uk/guides/observations/how-we-measure-cloud) (`metoffice-cloud-amount`): Sky fraction and clear/overcast okta endpoints, not rain probability, water clarity, local cloud readings or a new RavRadar weather field.
- [NOAA NWS Glossary: Front](https://forecast.weather.gov/glossary.php?word=front) (`nws-weather-front`): Air-mass transition definition only, not ocean current, exact Danish beach arrival or an amber transport route.
- [NOAA NWS Glossary: Cold Front](https://forecast.weather.gov/glossary.php?word=cold%20front) (`nws-cold-front`): Advancing colder denser air replacing warmer air. US regional fronts, storm thresholds and local current/yield predictions are excluded.
- [NOAA NWS Glossary: Warm Front](https://forecast.weather.gov/glossary.php?word=warm%20front) (`nws-warm-front`): Advancing warmer air replacing colder air, not immediate seawater temperature, local wave conditions or amber guarantee.
- [NOAA NWS Glossary: Occluded Front](https://forecast.weather.gov/glossary.php?word=occluded%20front) (`nws-occluded-front`): Cold front overtaking a warm or quasi-stationary front; not a forecast data gap, local event diagnosis or missing-value substitute.
- [NOAA JetStream: Climate vs. Weather](https://www.noaa.gov/jetstream/global/climate-vs-weather) (`noaa-climate-normal-weather`): Time-scale distinction and normally 30-year climate averages only. No foreign climate values, exact Danish season prediction or amber-yield statistic.

## 2026-10-06 04.24 DK – direkte forespørgsler må ikke miste begrænsninger

En normalcaller-prøve viste, at “Bedste sted i morgen højst 10 km væk?”
gav en fri landsrangering, selv om afstanden ikke var anvendt. Den normale
områdesvarvej kontrollerer nu hele spørgsmålet efter kun kendte dato-,
søgemåde- og kystkvalifikatorer. Afstand fra by, køretid, navngivet sted,
butik og fundgaranti må ikke bortfalde. Svaret forklarer den uunderstøttede
afgrænsning og giver et brugbart eksempel; det påstår ikke datamangel.

En anden konkret RED viste, at et dateret “Hvor kan jeg finde rav den
2026-09-01 på vestkysten til waders?” blev til generel kystviden.
Et udtrykkeligt dateret best-place-intent bruger nu prognosevejen før
generelle feltforklaringer. Udateret feltviden bevares. Tysk “wo sollte”
bevares som selvstændigt spørgsmål, også med udstyr først.

144 nye optalte scenarier dækker begrænsninger, gyldig national prognose,
kyst og søgemåde, dato/klokke, gamle bindende datagates, to rækkefølger,
sikkerhed og udaterede feltspørgsmål. De tre berørte normale assistentparents
består uden netværk. Tidligere 80+90 og nye 144 er 314 scenarier, ikke 314 nye
skrevne svar. Stadig 341 emner, 1023 sprogsvar, 12276 formuleringer, 358
kontrakter, 68 kilder og 95 AI-fakta; modelbinding og provider er uændrede.

Kun lokal dirty 543, ingen CI eller offentlig levering. Den naturlige
vejrhentning arbejder fortsat i den centrale beregning ved læsning 04.18 DK;
DMI og Copernicus er afsluttet, men faktisk restore/save/upload/deploy og
nyt offentligt datasæt er ikke aflæst. Afviste efterfølgerwrites og tidligere
nødvendige afklaringer består. Praktisk browser-/AI-kvalitet, tusindvis af
selvstændige svar, Fur, privat syvzonehistorik og samlet revision er åbne.
Model, indsats, kadence og notifikationer er uændrede.

## 2026-10-06 04.04 DK – klassifikation og normal prognose deler hele datoformen

En konkret normalcaller-prøve viste, at “Hvilke strande ser lovende ud
den 2026-09-01?” blev unknown, selv om prognoseparseren allerede kunne
læse datoen og havde en gyldig national liste. Klassifikationen genkender
nu komplette ISO-/dag-måned-år-datoer, kendte datokvalifikatorer, korte
datoer med rette form, ugedage og “om/in” antal dage. Ugedagsnavnene
deles med den eksisterende parser; kalenderberegningen er uændret.

Klassifikation bekræfter ikke en dato. Den normale parser vælger og
validerer stadig dagen i dansk tid. Ugyldige datoer, tocifrede år,
modstridende datoer og en næste ugedag uden data giver ingen opfundet
rangering. En kort decimal med punktum uden datokvalifikator forbliver
ukendt. Sted, afstand, søgemåde, tidsinterval, sikkerhed og modelbinding
må ikke bortnormaliseres. Selvstændige udstyrs- og datospørgsmål virker
også med udstyr først.

90 nye optalte scenarier består sammen med de tidligere80 og hele den
berørte lokalvidensparent. Det er170 afgrænsede normalcaller-scenarier,
ikke170 skrevne svar. Stadig341 emner,1023 DA/DE/EN-svar,12276
formuleringer,358 kontrakter,68 kilder og95 AI-fakta; modelbinding og
providerfil er uændrede. Praktisk AI-/browserbevis og tusindvis af
selvstændige svar er fortsat åbne mål.

Kun lokal dirty543, ingen CI eller offentlig levering. Ved faktisk
metadataread04.01 DK havde den naturlige vejrhentning afsluttet DMI og
Copernicus og var i den centrale vejrberegning. Faktisk restore/save/
upload/deploy og nyt offentligt datasæt er stadig ikke målt. Ingen
produktionsændring under aktiv writer, ingen afviste efterfølgerwrites
gentaget og ingen ny destinationstilladelse udledt. Fur, privat
syvzonehistorik og samlet revision er åbne; næste generations faktiske
effekt skal kontrolleres. Model, indsats, kadence og notifikationer består.

## 2026-10-06 03.54 DK – afgrænset normalcallerrettelse, ikke ny viden eller AI-bevis

Spørg RavRadar forstår nu også hele daterede spørgsmål som “Hvilke
strande ser lovende ud i morgen?”, tysk “Welche Strände sehen morgen
vielversprechend aus?” og engelsk “Which beaches look promising tomorrow?”.
Den normale caller var konkret RED med unknown, selv med gyldig national
prognose. En separat RED viste, at udstyr først kunne opsluge det
efterfølgende prognosespørgsmål. Begge fejl er rettet afgrænset lokalt.

Den samme centrale, validerede nationalprognose bruges fortsat: korrekt
dag, søgemåde, kysttype og områdescore, ikke valgt enkeltzone eller AI-gæt.
Kun kendte dato-/søgemåde-/kystkvalifikatorer og deres indbyrdes bindeord
fjernes ved klassifikation. Konflikter afvises af den normale parser;
afstande, butikker og fundgarantier må ikke blive en fri landsrangering.
To selvstændige spørgsmål besvares i begge rækkefølger. Sikkerhedsafvisning
gælder hele beskeden. Forkert binding, manglende rækker eller unavailable
må fortsat ikke producere en liste.

80 optalte scenarier udvider den eksisterende normale forecast-parent.
Forecast- og lokalvidensparent består; den afsluttende count-kontrol
består også. Ingen nye skrevne emner eller sprogsvar: stadig341 emner,
1023 DA/DE/EN-svar,12276 formuleringer,358 kontrakter,68 kilder og95
AI-fakta. De95-faktabindinger, RavScore-bindingen og providerfilen består.

Kun lokal dirty543. Ingen commit, CI, merge, installation, offentlig
levering, ny vejrhentning eller eksternt AI-/browserbevis. Naturlig writer
arbejder stadig i Copernicus ved seneste læsning03.45 DK; faktisk
restore/save/upload/deploy og ny offentlig effekt er ikke målt. Afviste
private efterfølgerwrites og allerede stillede nødvendige afklaringer
består. Næste er fortsat sikre ikke-blokerede trin og faktisk generation
med kilde-, Fur-, dæknings-, Top20-, Nibe- og deploykontrol; storrevisionen
er ikke færdig. Model, indsats, kadence og notifikationer er uændrede.

## Lokal AI-vidensparitet6. oktober kl.03.35 –32 tidligere kontrollerede forklaringer

32 allerede kildekontrollerede guideforklaringer er nu ført fuldt ind i
den eksisterende offentlige AI-faktabank: otte marine, tolv vejrbegreber,
seks havbølgeforklaringer og seks sammenligninger. AI havde stadig kun63
fakta, selv om den lokale caller kendte disse emner. Alle oprindelige63
bevares i samme rækkefølge og med samme tekst; nu95 unikke faktareferencer.
Dette er ikke32 nye lokale emner eller nye skrevne sprogsvar. De341 emner,
1023 DA/DE/EN-svar,12276 formuleringer,358 kontrakter og68 kilder består.

Normal prompt, Edge, offentlig JSON og Pages kræver samme nye faktachecksum.
96 hele sprogsvar og192 ugyldige referenceprøver udvider den eksisterende
Edge-parent; alle32 tekster skal nå prompten. Først konkret RED på63/95,
derefter fire berørte assistentparents samlet GREEN uden eksternt AI-kald.
Den gamle63-faktabinding, tidligere bindinger, manglende og ukendte hashes
afvises fortsat. RavScore-bindingens11 felter og providerfilen er uændrede.

Den målte eksempelprompt vokser fra22008 til35596 UTF-8-byte. Byte er ikke
tokens, og et større officielt kontekstvindue beviser ikke syv sekunders
svartid eller gratis drift. Faktisk token-/neuronforbrug, AI-svar og tid
skal måles før sikker levering. Model, kvoter, timeout, nøgler, tjenester,
planer, aktivering og kontekstprivacy ændres ikke. Kun lokal dirty543;
ingen ny version, commit, push, CI, merge, installation eller deploy.
Tusindvis af selvstændige svar, praktisk AI-kvalitet, Fur og samlet revision
er stadig åbne. Afviste successorwrites og nødvendige konkrete afklaringer
omgås ikke; ældre63-status nedenfor er tidsbestemt historik.

Der er ingen nye naturpåstande eller kildeposter i denne overførsel. De fulde
forklaringer og forbehold følger de tidligere kildekontrollerede guideemner.
[Cloudflares modelside](https://developers.cloudflare.com/workers-ai/models/gpt-oss-20b/)
angiver128000 tokens. [Den officielle prisoversigt](https://developers.cloudflare.com/workers-ai/platform/pricing/)
angiver10000 neuroner pr. døgn samt18182/27273 neuroner pr. million input-/outputtokens.
Disse grænser er genkontrolleret6. oktober; kontoplan og faktisk forbrug er ikke målt.
De er ikke en garanti for gratis drift, svartid eller faktisk AI-kvalitet.

## Lokal præcision6. oktober kl.03.22 – seks kildebundne sammenligninger

Seks selvstændige sammenligningssvar gør forskelle mellem middelvind og
vindstød, vindstød og vindbyge, sø- og landbrise, temperatur- og saltspringlag,
relativ luftfugtighed og dugpunkt samt havbølgers længde og højde konkrete.
Otte allerede registrerede primærkilder er genkontrolleret. Det er18 nye
skrevne DA/DE/EN-svar, ikke216 nye svar fra katalogets formuleringer.

Tre faktiske normalcaller-prøver afviste før rettelsen almindelige
sammenligningsspørgsmål som uvedkommende. Begge begreber genkendes nu som
hele, afgrænsede fraser, også i omvendt rækkefølge, venlige ønsker,
tyske kasusformer og engelske sammentrækninger. Sted, dato, tal, tredje
emne og målekrav fjernes ikke for at passe til en generel forklaring.

Den første lokale samling afslørede desuden, at »? og Hvad ...« efterlod
»og« på den næste selvstændige sætning. Den normale splitter fjerner nu
kun forbindelsesordet i en senere, udtrykkeligt spørgende del; »og
vindstød ved Hals i morgen« bliver ikke omdøbt til en definition.
219 nye scenarier i én eksisterende parent dækker dette, opfølgning,
afgrænsning og helbeskeds-sikkerhed. Efter konkret RED består alle tre
berørte assistentparents samlet uden netværk eller AI-kvote.

Nu341 emner,1023 skrevne sprogsvar,12276 formuleringer,358 emnekontrakter,
91 guideemner og68 kildeposter. Det er ikke1023 selvstændige emner.
63 AI-fakta og deres eksisterende offentlige binding er uændrede.
Ingen nye vejrtal, score, datakilder, geometri, historik eller tidsbudgetter.
Kun lokal dirty kandidat på4.0.543; ingen commit, push, CI, ny version,
merge, deploy eller praktisk ekstern AI-verifikation. Tusindvis af
selvstændige svar og sikker levering er fortsat åbne; de afviste
successorwrites og nødvendige konkrete leveringsafklaringer omgås ikke.

Faglige grundlag er genkontrolleret i de eksisterende kildeposter:
[DMI's observationsdefinitioner](https://www.dmi.dk/friedata/guides-til-frie-data/sadan-males-data/)
adskiller midling og stød; [NWS' squall-definition](https://forecast.weather.gov/glossary.php?word=squall)
bruges uden at importere amerikanske varslingsgrænser.
[NWS om søbrise](https://forecast.weather.gov/glossary.php?word=sea%20breeze) og
[landbrise](https://forecast.weather.gov/glossary.php?word=land%20breeze) underbygger
kvalitative forskelle, ikke lokale starttider.
[NOAA om temperaturspringlag](https://oceanservice.noaa.gov/facts/thermocline.html)
og [PMEL's vertikale havstruktur](https://www.pmel.noaa.gov/people/cronin/encycl/ms0149.pdf)
adskiller temperatur- og saltspringlag, uden en faktisk dansk zoneprofil.
[Met Office om fugtighed og dugpunkt](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/humidity)
underbygger forskellige størrelser/enheder, ikke regnsandsynlighed eller
fysiologiske råd. [NWS' bølgeordbog](https://forecast.weather.gov/glossary.php?word=wave)
underbygger vandret længde kontra lodret højde; ingen lokal brydningsratio,
ravrute eller enkeltbølgeprognose overføres. Ingen nye kildeposter.

## Lokal kildeudvidelse6. oktober kl.03.04 – tolv vejrbegreber

Tolv nye, selvstændige vejrforklaringer skelner middelvind fra vindstød,
vindbyge fra korte stød, Beaufort fra lokal bølgehøjde, søbrise fra landbrise,
trykgradient fra tryk ét sted, isobar fra strømpil og barometer fra vandstand.
Relativ luftfugtighed er ikke regnsandsynlighed; dugpunkt er ikke vandtemperatur,
og tåge er ikke uklart havvand. Ni DMI/NOAA/NWS/Met Office-primærkilder er
kontrolleret. DMI's observationsmidling overføres ikke automatisk til
modelprognoser; ingen vindstød, sigtbarhed eller andre vejrtal opfindes.

Normal eksisterende matcher/caller svarer på korte, venlige og sammensatte
DA/DE/EN-spørgsmål uden at fjerne sted, dato eller målekrav.144 direkte,
36 opfølgende,45 negative,6 sammensatte og3 sikkerhedsscenarier er234
prøver i én eksisterende parent, ikke234 nye fakta eller testfiler. Først
konkret RED for manglende middelvind-emne, derefter tre berørte parents GREEN
uden netværk eller AI-kvote.

Nu335 kildebundne emner,1005 skrevne DA/DE/EN-svar og12060 formuleringer;
352 emnekontrakter,85 guideemner og68 kildeposter. Det er36 nye sprogsvar,
ikke432 nye svar fra formuleringer eller1005 selvstændige emner. Den lokale
AI-faktabank har fortsat63 fakta og uændret binding. Udvidelsen er lokal,
dirty og ikke udgivet; det er ikke fungerende ekstern AI eller produktionseffekt.
De afviste successorwrites, kendte røde integritetsprøver og nødvendige
leveringsafklaringer består. Gamle RAM-bindingsprojektioner er forældede.
Tusindvis af ægte svar, praktisk AI-kvalitet og hele vejrhentningsrevisionen
er fortsat åbne; næste sikre trin er kildebunden udvidelse og krydsafprøvning.

- [DMI: Sådan måles data – middelvind og vindstød](https://www.dmi.dk/friedata/guides-til-frie-data/sadan-males-data/)
- [NOAA NWS Glossary: Squall](https://forecast.weather.gov/glossary.php?word=squall)
- [Met Office: Beaufort wind force scale](https://weather.metoffice.gov.uk/guides/coast-and-sea/beaufort-scale)
- [NOAA NWS Glossary: Sea Breeze](https://forecast.weather.gov/glossary.php?word=sea%20breeze)
- [NOAA NWS Glossary: Land Breeze](https://forecast.weather.gov/glossary.php?word=land%20breeze)
- [NOAA JetStream: Origin of Wind](https://www.noaa.gov/jetstream/synoptic/origin-of-wind)
- [NOAA NWS Glossary: Barometer](https://forecast.weather.gov/glossary.php?word=barometer)
- [Met Office: Understanding humidity](https://weather.metoffice.gov.uk/learn-about/weather/types-of-weather/humidity)
- [NOAA NWS Glossary: Fog](https://forecast.weather.gov/glossary.php?word=fog)


## Lokal kildeudvidelse6. oktober kl.02.35 – otte marine begreber

Otte nye, selvstændige forklaringer dækker batymetri, estuarier, brakvand,
temperatur-, salt- og tæthedsspringlag, havets lagdeling og blandingslag.
Fem afgrænsede NOAA/PMEL-kilder er kontrolleret; de dokumenterer begreber,
ikke en aktuel Limfjordsprofil, Fur-årsag, lokal dybde eller ravets rute.
Vandstand er ikke dybde, én temperatur er ikke en lodret profil, og en
strømpil er fortsat det valgte models lagmiddel. Ingen nye vejrtal eller
RavScore-point beregnes, og manglende timer udfyldes ikke med forklaringer.

Den eksisterende normale matcher/caller forstår korte og venlige DA/DE/EN-
spørgsmål samt selvstændige delspørgsmål. Sted, dato, præcise målekrav og
andre domæner må ikke fjernes for at passe til et generelt svar. Den lokale
emneopfølgning bevarer forbehold; hele beskedens sikkerhed kommer først.
96 direkte spørgsmål,24 opfølgninger,33 negative,6 sammensatte og3
sikkerhedsprøver er162 scenarier i én eksisterende parent, ikke162 nye
fakta eller testfiler. Først konkret RED for manglende batymetri-emne,
derefter de tre berørte assistentparents GREEN uden netværk eller AI-kvote.

Nu323 kildebundne emner,969 skrevne DA/DE/EN-svar,11628 formuleringer og
340 lokale emnekontrakter;73 guideemner og59 kildeposter. De24 nye svar
er ikke288 nye svar fra formuleringerne. Den offentlige AI-faktabank,
model-/vidensbinding og63 fakta er uændrede. Udvidelsen er lokal, dirty,
ikke udgivet og ikke bevis for fungerende ekstern AI. De allerede afviste
successorwrites og den kendte røde metadata-CAS-prøve omgås ikke. Gamle
RAM-bindingsprojektioner er forældede efter dette kodedelta. Tusindvis af
ægte svar, praktisk AI-kvalitet, sikker levering og hele vejrhentnings-
revisionen er fortsat åbne. Næste er flere selvstændige kildebundne emner
og krydsafprøvning; offentlig levering afventer den nødvendige afklaring.

Kilder, læst6. oktober: [NOAA batymetri](https://oceanservice.noaa.gov/facts/bathymetry.html),
[NOAA estuarier](https://oceanservice.noaa.gov/facts/estuary.html),
[NOAA estuariecirkulation](https://oceanservice.noaa.gov/education/tutorial_estuaries/est05_circulation.html),
[NOAA termoklin](https://oceanservice.noaa.gov/facts/thermocline.html) og
[Sprintall/Cronin2001, NOAA PMEL](https://www.pmel.noaa.gov/people/cronin/encycl/ms0149.pdf).
PMEL er en forskningssyntese, ikke direkte ravforskning eller en målt
RavRadar-profil. Dybvandstal, faste sæsonregler og gradientgrænser overføres
ikke til danske strandpunkter. Der ændres ikke sourcevalg eller geometri.

## Lokal feltforståelse5. oktober kl.21.00 – ikke leveret

Seks nye prognoseforklaringer skelner signifikant højde fra største bølge,
peakperiode fra middel og stormvarighed, dønning fra vindsø, negativ vandstand
fra dybde, m/s fra km/t samt bølgehøjde fra vandstand. DMI og NOAA/NDBC/NWS
underbygger felternes betydning; liveprognosespørgsmål bliver ikke generelle
definitioner. Normale svar og opfølgninger består måltesten uden AI-kald.
Nu35 kildeposter; de51 AI-fakta er uændrede. Nye kodedeltaer gør gamle
RAM-bindingsprojektioner forældede. Den afviste successorwrite gentages ikke.
Afklaring og kontrolleret levering mangler stadig.

Nu271 emner/813 skrevne svar/9756 formuleringer/288 lokale emnekontrakter.
Dette er18 nye skrevne sprogsvar, ikke216 nye svar fra formuleringerne.
DMI Bølger på havet, NDBC wavecalc og NWS marine definitions er nye kilder.
NDBC-observationsperioder og udenlandske sikkerhedsgrænser bruges ikke som
lokale prognose- eller sikkerhedsbeviser. Tusindvis af ægte svar er åbne.

## Ny offentlig krydsafprøvning5. oktober kl.20.20 – lokal rettelse, ikke leveret

Den eksisterende tilladte browserforbindelse virker igen. Morgen-spørgsmålet
afvises fortsat offentligt, også efter at Top20 er indlæst. Tolv naturlige
stedformuleringer og seks tidsformuleringer er måltestet i normal caller;
seks negative fag-/udstyrsspørgsmål bliver ikke prognoserangeringer.

Et molekylært/optisk spørgsmål blev offentligt til generelle mole-råd.
Unicode-ordgrænser skelner nu molekylære ord fra moler, med tre positive
molekontroller bevaret. Et sjældent anisotropispørgsmål gav en synlig AI-tekst,
men påstod krystallag og generelt uigennemsigtigt rav. GIA beskriver rav som
amorft; den eksisterende spektroskopikilde dokumenterer prøvevariation,
ikke universelle krystalakser eller en anisotropibaseret strandtransport.
To nye DA/DE/EN-emner forklarer disse evidensgrænser. AI-instruktionen
afviser opfundne krystallag, konstanter og transport fra optik. Ingen nye
providerkald, nøgler eller planer er nødvendige for de lokale svar.

Nu265 emner/795 skrevne svar/9540 formuleringer/282 lokale emnekontrakter,
32 kildeposter og51 AI-fakta. Først RED i eksisterende lokalparent, dernæst
fire berørte parents GREEN4/0/0. Faktisk ekstern AI-kvalitet efter levering
er stadig åben. Den lokale tekniske successorhash-opdatering blev afvist
af sikkerhedskontrollen; den omgås ikke. Friske RAM-metadata er ikke native
installation eller releasebevis. Tusindvis af selvstændige svar mangler stadig.

## Historisk krydsafprøvning tidligere5. oktober – lokal kandidat, ikke leveret

Ejeren kræver både betydelig udvidelse og grundig afprøvning af faktisk
spørgsmålsforståelse. Målet om tusindvis af selvstændige svar er fortsat åbent.
Den lokale bank er nu 263 emner med 789 skrevne DA/DE/EN-svar. 9468
testformuleringer er variationer, ikke 9468 nye svar eller fakta. De 51
offentlige AI-fakta og 32 kildeposter tælles særskilt.

En yderligere lokal browserprøve fandt, at et spørgsmål om en ravtur på
30 minutter blev opslugt af det generelle turplansvar. Tre naturlige
DA/DE/EN-spørgsmål reproducerer fejlen i den normale caller. Det konkrete
feltspørgsmål prioriteres nu før generel produktvejledning, og rav-/tids-
afgrænsningen kræves uanset ordrækkefølge. Eksisterende fire berørte parents
består efter rettelsen; den faktiske lokale browser viser det præcise svar
med begrænset opskylslinje og fund-/indsatsforbehold. Det er ikke offentlig
levering, en ny faktatælling eller bevis for samtlige naturlige formuleringer.

En efterfølgende normalcaller-prøve fandt, at2/9 uden år tavst kunne vælge
i dag. Kontrol med gyldig95-score reproducerede også forkert årslængde.
Gyldige korte datoer læses nu på dansk kalenderdag, inklusive årsskifte;
ugyldige og modstridende datoer afklares. To eksisterende målparents består
efter begge RED-reproduktioner. Fire grænseprøver dækker dansk/UTC-dag,
årsskifte og begge sommertidsgrænser. Dette lukker ikke tidsvinduer,
regionale ønsker, alle datoformater eller offentligt AI-/deploybevis.

| Flade | Faktisk fund | Lokal ændring / resterende arbejde |
|---|---|---|
| National prognose uden valgt zone | Offentlig 543 nægtede at rangere morgendagen, mens Top20 viste gyldige rækker. Zonens detaljer er ikke en national prognose. | Normal caller bruger den allerede validerede nationale startup for præcis dag og søgemåde. Åbning af én zone ændrer ikke svaret. Offentlig levering mangler. |
| Rækkefølge og score | Højeste lokale delscore er ikke nødvendigvis højeste områdescore. | Samme nationale sortering som UI; områdescore og bedste lokale score vises særskilt, inklusive eksisterende historikinterval. Ingen genberegnet eller AI-opfundet score. |
| Søgemåde og kalender | Strandspørgsmål brugte waders; overmorgen, ugedag og korte datoer blev ikke forstået korrekt. | DA/DE/EN, overmorgen, ugedage, ISO og europæisk dato med/uden år måltestet, også dansk årsskifte og sommertidsgrænser. Ugyldige/modstridende datoer, forkert årslængde og weekend afklares uden et falsk dagsvalg. Klokkeslæts-/regionalafgrænsning og øvrige tvetydige datoformater kræver yderligere review. |
| Udstyr | Ejeren afviser vadestav som det tilsigtede ravredskab. | Grundsvaret bruger waders og ravkese; tysk/engelsk tilsvarende. Ingen ændret sikkerhedsgrænse. |
| Kystforståelse | Vestkystspørgsmål returnerede østkystens højeste række i normal caller. | Reproduceret RED og rettet med central kysttype efter hele listens strenge validering. DA/DE/EN, strand, forkert valgt zone, tvetydig kyst og ugyldig række på anden kyst er måltestet. Top20-subset er ikke komplet regional rangering. |
| Emneforståelse | Offentlig dielektrisk-konstant-spørgsmål fik statisk-elektricitet-svar. | Den lokale kandidat skelner mellem emnerne og opfinder ikke konstanter. Almindelige omformuleringer testes uafhængigt af katalogeksempler. |
| Sammensatte spørgsmål | Sikkerhedsdelen og korte opfølgninger kunne forsvinde. | Sekventielle clauses bevarer seneste lokale emne samt hvert selvstændigt spørgsmål. Credentials/scope-afvisning sker før splitting. Ingen samtale eller tidligere svar sendes til AI. |
| Ukendt AI-spørgsmål | Offentlig prøve om chirale biomarkører viste ventebesked og sluttede i ukendt-svaret. | Dette er observeret fallback, ikke bevis for providerfejl eller fungerende ekstern AI. Faktisk accepteret svar og hashparitet kræves efter levering. Mocktest alene er utilstrækkelig. |
| Viden og kilder | Nyttig grundviden, men mange praktiske beslutninger og produktforklaringer manglede. | 48 nye feltbeslutninger og 29 forskellige produkt-/prognoseemner. To overlappende produktposter blev fjernet, ikke blot omdøbt. Praktiske råd markeres som råd med begrænsninger, ikke direkte naturvalidering. |

Normal datalæser har kontrolleret fem små offentlige filer, samlet
15.948.106 bytes, fra rr-20261005055145-210. Seks DA/DE/EN × søgemåde-kald
matcher de samme nationale førstepladser. Lokal browserprøve giver konkrete
steder for ejerens præcise spørgsmål; en separat strandforespørgsel bruger
strandlisten. Dette er ikke et offentligt assistentdeploy eller en national
felt-/kildevurdering over alle 118 timer. Ingen privat payload gemmes.

De fire berørte lokale testparents består, 4 PASS/0 FAIL/0 SKIP. Nye
selvstændigt skrevne naturlige formuleringer og negative kontrolspørgsmål
supplerer wrappers. Sikkerhed, eksakte model-/vidensheaders, lokal fallback,
rategrænser og tidsbudgetter består. Stale native bindings, ny eksakt
543-originalpolitik er nu måltestet lokalt med faktisk produceridentitet;
append-only overgang, relevante leverancegates og offentlig
DA/DE/EN-/AI-effekt er stadig åbne. Underliggende historiske optællinger
nedenfor beskriver augustversionen og må ikke bruges som aktuel status.

## Formål

Ejeren krævede en mange gange større netværksfri vidensbase, som ikke kun genfortæller Grundbogen. Auditten samler derfor ekstern ravforskning, officiel geologi, kystfysik, sikkerhed og danske regler med RavRadars eksisterende systematiske analyser og Rav Jagt som navngiven praktisk ekspert. Resultatet er en read-only forklaringsbase; det er **ikke** en ændring af Candidate G, RavScore, forecastinput eller modelsemantik.

Den maskinlæsbare kildefortegnelse er `knowledge/rav-assistant-sources-v1.js`. Hvert nyt forskningsemne i `knowledge/rav-assistant-research-material-v1.js` og `knowledge/rav-assistant-research-coast-v1.js` har en evidensklasse og mindst ét gyldigt kilde-ID.

## Evidenshierarki

1. **Direkte ravforskning:** selve ravmaterialet måles eller analyseres. Resultaterne er stærke for den undersøgte prøve, men laboratorietal er ikke automatisk universelle naturgrænser.
2. **Fagfællebedømt kystanalogi:** bølger, revler, levende bund og lavdensitetspartikler undersøges realistisk, men materialet er ikke altid rav.
3. **Officiel myndighedsvejledning:** styrer sikkerhed, adgang, indsamling og danefæ. Regler og varsler er volatile og skal kontrolleres aktuelt.
4. **RavRadars systematiske syntese:** forbinder direkte evidens, analogi og produktets forklaringsgrænser uden at opfinde nye naturkonstanter.
5. **Navngiven praktisk erfaring:** Rav Jagt bidrager med feltforståelse om blandt andet koldt vand. Erfaringen markeres særskilt og fremstilles ikke som fagfællebedømt evidens.

## Centrale eksterne kilder og sikre anvendelser

| Område | Primær/officiel kilde | Hvad assistenten må bruge |
|---|---|---|
| Alder og lag | [Ross, kritisk review af baltisk ravs alder](https://doi.org/10.1017/S1755691025100960) | Hovedhorisonten cirka 36–35 mio. år; bredere cirka 37,7–34 mio. år uden sikker lagproveniens; et løst stykke kan ikke dateres fra udseendet. |
| Harpiks til rav | [Seyfullah m.fl., resinproduktion og bevaring](https://doi.org/10.1111/brv.12414) | Harpiks er ikke almindelig træsaft; hærdning, begravelse og langsom kemisk modning er nødvendig. |
| Botanisk oprindelse | [Wolfe m.fl., forslag til producenten af baltisk rav](https://doi.org/10.1098/rspb.2009.0806) | Nåletræsharpiks og en stærk FTIR-/fossilbaseret hypotese; præcis producent er ikke endeligt afgjort. |
| Direkte partikeltransport | [Lofty m.fl., kontrolleret saltation med ravpartikler](https://doi.org/10.1016/j.watres.2023.120329) | Rav kan transporteres i små hop. Forsøgets 5 mm-kugler, tæthed og faldhastighed er prøvebestemte og ikke en universel ravtærskel. |
| Spektroskopi og fluorescens | [Kritisk spektroskopisk analyse af baltisk rav](https://pmc.ncbi.nlm.nih.gov/articles/PMC12196071/) | Fluorescens varierer med materiale, forvitring og behandling; flere analysemetoder supplerer hinanden. Laboratoriebølgelængder omskrives ikke til praktisk lygteanbefaling. |
| Identifikation og behandling | [GIA Amber](https://www.gia.edu/amber), [rekonstrueret og imiteret rav](https://www.gia.edu/gems-gemology/winter-2022-gemnews-identification-of-natural-reconstructed-and-imitation-root-amber0), [varmebehandling](https://www.gia.edu/gems-gemology/summer-2014-wang-heat-treatment-of-baltic-amber) | Plast, glas, copal, presset rav, kompositter og behandling kan snyde. Ingen enkelt hjemmetest beviser alle tilfælde. |
| Konservering | [Konservering og billeddannelse af rav](https://www.sciencedirect.com/science/article/pii/S0012825221001549) | Undgå varme, stærkt lys, opløsningsmidler og olie; behandl mulige vigtige indeslutninger skånsomt. |
| Dansk geologi | [GEUS om Fanø, geologi og rav](https://www.geus.dk/media/8348/fanoe.pdf) | Gentagen erosion, istidstransport og genaflejring forklarer sekundære danske ravlagre. |
| Revlehuller | [Kystdirektoratet om revlehuller](https://kyst.dk/klimatilpasning/kystdynamik/revlehuller) | Dannelse, synlige tegn og myndighedens sikkerhedsråd; aktuelle råd har forrang. |
| Bølger og sediment | [Kystdirektoratet om bølger, strøm og sand](https://kyst.dk/klimatilpasning/kystdynamik/sedimenttransport/boelger-og-stroem-flytter-sand), [NOAA om bølger og kyststrøm](https://oceanservice.noaa.gov/education/tutorial_currents/03coastal1.html) | Vindstyrke, varighed og fetch; shoaling, brydning, swash/backwash og sortering. |
| Koldt vand og mobilisering | [Naturstyrelsens praktiske efterårsvejledning](https://naturstyrelsen.dk/aktiviteter-i-naturen/aaret-rundt/efteraar), [Rav Jagts video](https://youtu.be/TiR96bdTRr0?is=W-cXDa-m4sUaZzXF) | Koldere saltvand er tættere og giver mere opdrift, hvilket kan gøre rav væsentligt lettere at mobilisere; det meste rav synker stadig, og dette aktiverer intet nyt scoreinput. |
| Kuldesikkerhed | [National Weather Service om koldt vand](https://www.weather.gov/safety/coldwater) | Kuldechok, hurtig fysisk svækkelse, påklædning efter vandtemperatur og flydeudstyr. |
| Fosforfare | [Forsvaret: Pas på fosfor i naturen](https://www.forsvaret.dk/da/nyheder/2007/pas-pa-fosfor-i-naturen/) | Hvidt fosfor kan ligne rav og selvantænde efter tørring: lad det ligge, gå væk og kontakt politiet. |
| Adgang og indsamling | [Naturstyrelsen om færdsel](https://naturstyrelsen.dk/om-naturstyrelsen/kontakt/faq/hvor-maa-jeg-faerdes-paa-naturstyrelsens-arealer), [indsamling til privat brug](https://naturstyrelsen.dk/regler-og-tilladelser/hvad-maa-jeg-samle-til-privat-brug-i-naturen) | Generelle rammer med tydelig besked om lokale undtagelser, ejerforhold, skilte og aktuelle regler. |
| Danefæ | [Nationalmuseet om danefæ](https://natmus.dk/salg-og-ydelser/museumsfaglige-ydelser/danefae/hvad-kan-vaere-danefae/) | Naturligt rav er normalt ikke danefæ; usædvanlige forarbejdede eller arkæologiske ravgenstande kan være det. |

## Bevidst afviste generaliseringer

- Ingen laboratorieværdi gøres til én universel strøm-, bølge- eller faldtærskel for naturligt rav.
- 365 nm fra laboratorieopsætninger gøres ikke til RavRadars praktiske anbefaling. Den ejerfastlagte offentlige vejledning er **395 nm**, og UV er stadig kun et indicium.
- Koldt vand får større og mere korrekt forklaringsvægt, men bliver ikke et nyt Candidate G-input, en scorevægt eller en fundgaranti.
- Kystanalogi må forklare mekanismer, men må ikke præsenteres som direkte dansk naturvalidering af alle ravstørrelser.
- Regler og sikkerhedsråd markeres volatile; assistenten skal henvise til aktuelle myndighedskilder frem for at love en permanent regel.
- Ingen privat turdata, koordinater, rå U/V, credentials, komplette vejrdata eller intern diagnostik indgår i kildebasen eller Edge-konteksten.

## Implementeret bredde og kontrol

- 27 offentligt registrerede kilder.
- 152 deterministiske lokale emner med DA/DE/EN-svar.
- 456 katalogevals plus 51 eksisterende basisevals og tre naturlige formuleringer uden netværkskald.
- 38 versionsbundne offentlige Edge-fakta mod tidligere 23.
- Negativ kontrol for aktiv `365 nm`, ukendte kilde-ID'er, manglende evidensklasse og netværksbrug.
- Candidate G, 20/50/30, kurver, vejrinput, state/cache/recovery, geometri og land-/vandpunkter er uændrede.
