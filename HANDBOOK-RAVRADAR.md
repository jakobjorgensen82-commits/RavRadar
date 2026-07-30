# RavRadar – projektdrejebog

> Version 1.0.0 · 30. juli 2026

Den browserbaserede udgave findes i `handbook.html`. Ekspertrettelser indsendes derfra og gemmes centralt i Supabase.

## 1. Forord og formål

Hvad RavRadar er, hvem drejebogen er til, og hvordan den skal bruges.

RavRadar er et dansk beslutningsstøttesystem til ravjagt. Systemet samler prognoser for vind, bølger, strøm, vandstand og andre relevante forhold og omsætter dem til en forklarlig vurdering af, hvor og hvornår forholdene kan være gunstige. Målet er ikke at love ravfund. Målet er at give brugeren et bedre, mere gennemsigtigt og mere fagligt funderet grundlag for at vælge tid og sted.
Denne drejebog er projektets fælles reference. Den er skrevet til fire grupper: brugere, administratorer, udviklere og eksterne fagpersoner. En bruger skal kunne forstå, hvad en score betyder. En administrator skal kunne kontrollere zoner, datakilder og regler. En udvikler skal kunne ændre systemet uden at bryde grundlæggende principper. En ekspert skal kunne vurdere faglige antagelser og foreslå præcise rettelser.
Dokumentets statusDrejebogen beskriver RavRadars tilsigtede arkitektur og arbejdsform. Den er levende: når systemets grundlæggende metode ændres, skal den relevante del af dokumentationen opdateres samtidig. Dokumentationen er dog ikke en erstatning for tests, kodedokumentation eller rå diagnostik. Den binder disse elementer sammen og forklarer deres formål.
GrundregelRavRadar skal altid kunne forklare, hvilke data der blev brugt, hvordan de blev fortolket, og hvorfor vurderingen blev som den blev. Hvis en vurdering ikke kan forklares, er den ikke moden nok til at være en autoritativ del af systemet.

## 2. Vision og produktprincipper

RavRadars rolle, begrænsninger og vigtigste designprincipper.

RavRadar bygger på den antagelse, at ravjagt kan understøttes af bedre data og bedre sammenhæng mellem data, men ikke reduceres til én simpel regel. Fralandsvind, kraftige bølger eller en bestemt vandstand kan hver for sig være relevante, men deres virkning afhænger af kystens geometri, havbund, hændelsesforløb og tidspunkt.
Produktets løfteRavRadar lover ikke fund. Det lover en sporbar vurdering baseret på de bedste tilgængelige data og en model, som kan forbedres gennem dokumenteret ekspertviden og observationer.
Ufravigelige principperDMI først: DMI er den foretrukne autoritative kilde for danske forhold, når en relevant og gyldig DMI-datakilde findes.Ingen opdigtede data: Manglende data må ikke maskeres som sikre målinger. Fallback skal markeres som fallback.Forklarlighed: Score, datakilde, retninger, vægte og begrænsninger skal kunne vises.Geografi før generalisering: En national regel må ikke uden videre overtrumfe dokumenteret lokal geografi.Kontrolleret læring: Observationer og AI må foreslå ændringer, men ikke aktivere dem uden review.Robusthed: Midlertidige netværks- eller kildesvigt må ikke få systemet til at blande data ukontrolleret.Versionssporbarhed: Vigtige model-, data- og regelændringer skal kunne spores og rulles tilbage.
Ikke et facitEn ravscore er en prioritering, ikke en sandhed. Den kan være høj uden fund og lav med fund. Brugerens faktiske observationer er derfor værdifulde, men de skal behandles med hensyn til søgetid, erfaring, præcision, sted og datakvalitet.

## 3. Rav, kystprocesser og faglig model

Den fysiske tankemodel bag transport, ophobning og tilgængelighed.

Rav er lettere end de fleste mineralske sedimenter, men dets bevægelse afhænger stadig af størrelse, form, densitet, indkapslet luft, begroing og vandets saltholdighed. Rav kan transporteres sammen med tang, træ, kulstumper og andet organisk materiale, men ikke nødvendigvis på samme måde som sand.
En hændelseskæde frem for et øjebliksbilledeRavRadar betragter gode forhold som resultatet af en kæde. Energi kan først løsne eller omfordele materiale. Strøm og bølger kan derefter transportere det. Vandstand og kystgeometri kan flytte den zone, hvor materialet aflejres. Senere kan roligere vand, lavere bølger eller fralandsvind gøre materialet synligt og tilgængeligt.
Mobilisering: Kraftigt vejr og bølgeenergi påvirker bund og strandprofil.Transport: Strøm, bølgeinduceret bevægelse og vindpåvirkning flytter materiale.Sortering: Materialer med forskellig størrelse og densitet adskilles.Aflejring: Lokale strømfelter, revler, høfder, pynter, bugter og tangbælter skaber ophobning.Tilgængelighed: Sigt, bølger, vandstand og adgang afgør, om ravet kan findes.
VindVind påvirker overfladestrøm, bølger og vandstand. Vindretning alene fortæller ikke sikkert, hvor rav transporteres. Derfor må vind ikke behandles som en direkte erstatning for strømdata. Fralandsvind kan efter en energirig hændelse give roligere kystvand og bedre adgang, men kan også føre let materiale væk fra en bestemt kyst under andre forhold.
StrømStrømretning er central, men kræver en entydig retningskonvention. RavRadar skal altid kende forskellen på retningen, som en strøm bevæger sig mod, og en meteorologisk retning, som vind kommer fra. En 180-graders fejl kan vende modellens fysiske fortolkning. Derfor sammenlignes strømvektoren med zonens lokalt definerede retning fra hav mod land.
BølgerBølger kan mobilisere og omfordele materiale, men kraftige bølger kan samtidig gøre søgning vanskelig og skjule rav. Scoren bør derfor skelne mellem energien, som har været til stede, og forholdene på selve søgetidspunktet.
VandstandVandstanden ændrer, hvor bølger bryder, hvilke revler og strandafsnit der påvirkes, og hvor ophobet materiale ender. En gunstig vandstand er ikke universel; den afhænger af kystprofil og hændelsesforløb.
UsikkerhedRavtransport er ikke fuldt observerbar gennem de nuværende datakilder. Modellen skal derfor udtrykke usikkerhed og undgå overdreven præcision. Nye faglige antagelser bør indføres som hypoteser, testes mod historiske og fremtidige observationer og kun derefter få permanent vægt.

## 4. Systemarkitektur og dataflow

Fra eksterne kilder gennem cache og kvalitetssikring til zoneprognose.

RavRadar er opdelt i lag, så dataindsamling, databehandling, faglig fortolkning og præsentation kan kontrolleres hver for sig.
Eksterne kilder
      ↓
Indsamling og rå cache
      ↓
Parser og normalisering
      ↓
Komponentserier pr. tidspunkt
      ↓
Kvalitetskontrol og kildevalg
      ↓
Zone-routing og interpolation
      ↓
Forecast Store
      ↓
Proces- og scoremotor
      ↓
Forklaring, kort og administration
IndsamlingIndsamlingslaget henter rå data og registrerer tidspunkt, kilde, modelkørsel og resultat. En mislykket hentning må ikke automatisk slette sidste kendte gyldige datasæt.
CacheCachen reducerer belastning på datakilderne og gør systemet mere robust. Den er ikke blot en hastighedsoptimering; den gør det muligt at genbruge gyldige assets, når en ekstern kilde midlertidigt fejler eller ikke har publiceret en nyere model. Cachen skal have eksplicit retention, kapacitetsgrænse og audit.
NormaliseringAlle tidsserier normaliseres til fælles enheder og kanoniske UTC-tidspunkter. Vind, strøm, bølger, vandstand og temperatur skal filtreres og valideres som separate komponentserier, før de kombineres. Det forhindrer, at manglende værdier i én komponent forurener en anden.
KildevalgEn gyldig DMI-serie har forrang. Fallback bruges kun for de manglende perioder eller komponenter efter en kontrolleret grænse. Systemet må ikke skifte frem og tilbage mellem kilder time for time, hvis det skaber kunstige spring eller inkonsistente forløb.
Forecast StoreForecast Store er det fælles, normaliserede datagrundlag for resten af systemet. Hver værdi bør kunne spores til kilde, issue-tid, forecast-tid og kvalitetsstatus. Scoremotoren skal ikke selv hente eksterne data.

## 5. Zoner, geometri og routing

Hvordan Danmark opdeles, og hvordan data kobles korrekt til hver kyst.

En zone repræsenterer et kystafsnit, som er tilstrækkeligt ensartet til at få én prognose og én faglig kontekst. Zonen har identitet, navn, geometri, kysttype, land- og havrelationer samt routing til relevante datakilder.
Havpunkt og landpunktFor at fortolke transport skal systemet kende den lokale retning fra åbent vand mod land. Et havpunkt og et landpunkt danner et kontrolbart anker. Retningen skal valideres visuelt på kortet og mod kystens faktiske geometri.
OnshoreDirectionDegonshoreDirectionDeg angiver kompasretningen fra hav mod land. Den bruges til at beregne, hvor stor en del af en vind- eller strømvektor der peger ind mod eller væk fra kysten. Værdien må ikke udledes blindt af et polygoncentrum, hvis kysten er buet, smal eller består af flere eksponerede sider.
Flere ankreBuede zoner kan kræve flere retningsankre. Prognosen kan da vægte ankeret efter nærmeste kystafsnit eller relevante datapunkter. Formålet er ikke større matematisk kompleksitet, men at undgå en grov retning, som er korrekt i den ene ende af zonen og forkert i den anden.
VandstandsstationerStationer vælges efter mere end afstand. Systemet skal tage hensyn til hydrologisk forbindelse, samme bassin eller fjordside, stationens status, datadækning og mulighed for interpolation mellem en primær og sekundær station. Automatisk valg skal vises i admin før en eventuel override.
PersistensEn station, som tidligere er fundet i DMI-registeret, bør bevares i RavRadars stationsregister, selv hvis den senere bliver inaktiv eller midlertidigt ikke leverer data. Status skal ændres; historikken skal ikke forsvinde.

## 6. Procesmodel og RavScore

Hvordan komponenter bliver til en forklarlig prioritering.

RavScore er en samlet vurdering på en begrænset skala. Den skal fortolkes som relativ mulighed og praktisk egnethed, ikke som sandsynligheden for at finde et bestemt antal gram rav.
LagdelingDatakvalitet: Er input friskt, komplet og troværdigt?Fysisk proces: Understøtter hændelsesforløbet mobilisering, transport eller aflejring?Lokal geografi: Passer retninger og eksponering til zonen?Tilgængelighed: Er bølger, vandstand og sigt forenelige med søgning?Regler og begrænsninger: Findes veldokumenterede lokale eller nationale korrektioner?Forklaring og sikkerhed: Hvor sikkert er resultatet, og hvilke kilder bar vurderingen?
RetningsvirkningVektorer bør fortolkes med projektion mod zonens onshore-retning. En strøm næsten parallelt med kysten er ikke det samme som en strøm direkte ind mod land. Samtidig kan langs-kyst-transport være vigtig ved pynter og bugter. Modellen skal derfor kunne skelne mellem direkte onshore-komponent og langs-kyst-komponent.
HændelseshukommelseGode forhold kan afhænge af vejret i timerne eller dagene før søgetidspunktet. Scoren bør derfor kunne medtage akkumuleret energi og tid siden en kraftig hændelse fremfor kun øjebliksværdien.
Caps og gatesVed alvorlige datamangler eller farlige forhold kan systemet begrænse eller blokere en score. En cap skal altid forklares. Den må ikke skjule, at de fysiske signaler ellers var positive.
Forklaringen er en del af resultatetEt scoretal uden forklaring er utilstrækkeligt. Brugeren bør kunne se de vigtigste positive og negative bidrag, anvendte datakilder og usikkerheder.

## 7. Administration og faglige arbejdsgange

Hvordan ændringer foretages sikkert og forståeligt.

Administrationen er RavRadars kontrolrum. Den skal være brugbar for en person, som ikke har skrevet koden. Hvert modul skal derfor forklare formål, arbejdsgang, resultat og risiko.
Arbejdsgang for en ny regelBeskriv observationen eller den faglige sammenhæng i almindeligt sprog.Angiv kilde, geografi, betingelser og forventet virkning.Opret reglen som kladde.Test med realistiske og grænsetilfælde.Kontrollér at forklaringen til brugeren er forståelig.Aktivér først efter review.Følg effekten i observationer og scorefordeling.
Arbejdsgang for stationsroutingVælg zone og se systemets automatiske forslag.Kontrollér stationernes officielle status og geografiske placering.Kontrollér hydrologisk forbindelse og afstand.Brug kun override, når automatisk valg er dokumenteret uhensigtsmæssigt.Registrér begrundelsen.Kør routing- og kontinuitetstest.
Arbejdsgang for geometriFind zonen på kortet.Kontrollér at den dækker det navngivne kystafsnit.Kontrollér hav- og landpunkt.Kontrollér pilen for hav mod land.Tilføj flere ankre ved kurvede zoner.Kør retningsaudit og scoringsregression.
EkspertrettelserFaglige rettelser indsendes fra denne drejebog og gemmes centralt. En rettelse ændrer ikke automatisk teksten eller modellen. Den får en status og behandles som et review-emne. Når en rettelse accepteres, skal dokumentation, kode, regler og tests vurderes samlet.

## 8. Ekspertreview og sikker lagring

Hvordan ekspertkommentarer bevares, vurderes og omsættes til ændringer.

Ekspertforslag er projektdata, ikke midlertidige kommentarer. De må derfor ikke ligge alene i en projektfil, en browser eller en ZIP-pakke.
Autoritativ lagringForslag gemmes i en særskilt Supabase-tabel. Tabellen ligger uden for GitHub Pages-deployet og påvirkes ikke, når projektfiler udskiftes. Hver post indeholder dokumentversion, afsnit, markering, foreslået tekst, begrundelse, fagområde, status, opretter og tidsstempler.
Uforanderlig historikÆndringer i status eller indhold kopieres til en historiktabel. Dermed kan man senere se, hvad der oprindeligt blev foreslået, hvem der behandlede det, og hvorfor det blev accepteret eller afvist.
NødlagringHvis central lagring ikke er tilgængelig, gemmes forslaget som lokal kladde på enheden og kan eksporteres som JSON. Lokal lagring er ikke betragtet som en sikker endelig aflevering. Brugerfladen skal tydeligt vise, om et forslag er gemt centralt eller kun lokalt.
BehandlingsstatusNy: Modtaget, ikke vurderet.Under vurdering: Faglig og teknisk konsekvens analyseres.Accepteret: Ændringen er godkendt til implementering.Implementeret: Dokumentation og relevante systemdele er opdateret.Afvist: Forslaget er vurderet og fravalgt med begrundelse.
Ingen direkte modelændringSelv en højt kvalificeret kommentar må ikke direkte ændre produktionsscore. Den skal først omsættes til en præcis hypotese, konsekvensanalyse og tests.

## 9. AI, læring og menneskelig kontrol

AI som analyseværktøj uden automatisk autoritet.

AI kan hjælpe med at sammenfatte observationer, finde mønstre, formulere regler, analysere ekspertrettelser og pege på berørte kodeområder. AI må ikke opfinde manglende data eller præsentere en statistisk sammenhæng som en fysisk årsag uden grundlag.
Tilladte rollerForeslå hypoteser og testcases.Sammenligne ekspertkommentarer med nuværende dokumentation.Finde mulige konflikter mellem regler.Udarbejde konsekvensanalyse og implementeringsplan.Forklare resultater i almindeligt sprog.
Ikke tilladte rollerAktivere scoreændrende regler uden review.Overskrive DMI-data med genererede værdier.Skjule usikkerhed eller kildeblanding.Ændre geometri alene på baggrund af tekst uden kortkontrol.
Fra kommentar til systemændringNår en ekspert indsender en rettelse, bør AI først udtrække den konkrete påstand, berørte zoner eller processer, forventet effekt og nødvendige tests. Derefter vurderer et menneske, om forslaget skal implementeres.

## 10. Drift, kvalitet og release

Krav til opdateringer, tests og overvågning.

En RavRadar-release er ikke færdig, blot fordi siden kan åbnes. Dataflow, tests, versionsnumre og dokumentation skal stemme overens.
Minimumskontrol før releaseForecast-tider er unikke og monotone.Horisonten er realistisk og tydeligt angivet.Ingen ukontrolleret timevis kildezigzag.DMI- og fallback-status kan aflæses pr. komponent.Aktive og historiske stationer skelnes.Zone- og retningsaudit består.Score- og regeltests består.Versionen er ens i relevante filer.Drejebogen er opdateret ved metodeændringer.
DiagnostikDiagnostik skal beskrive årsager, ikke kun symptomer. Tilstanden “ingen frisk marine data” bør eksempelvis skelne mellem ingen nyere model, genbrugt gyldig cache, downloadfejl, parsefejl og manglende assets.
Backup og persistensKildekode versionsstyres i GitHub. Ekspertrettelser og andre løbende admin-data lagres centralt i databasen med historik. Projektopdateringer må aldrig nulstille disse tabeller.

## 11. Ordbog

Fælles betydning af centrale begreber.

AssetEn fil eller datapakke fra en ekstern modelkørsel.BracketPrimær og eventuel sekundær station, som tilsammen repræsenterer en zone.CacheKontrolleret genbrugslager for hentede data.FallbackAlternativ kilde, der kun bruges, når den foretrukne kilde ikke dækker gyldigt.Forecast StoreDet normaliserede fælles datagrundlag for prognoser.OnshoreDirectionDegKompasretningen fra hav mod land for et kystafsnit.RoutingReglerne, som kobler en zone til relevante stationer eller modelpunkter.ZoneEt afgrænset kystafsnit med egen geometri, prognose og faglig kontekst.Issue-tidTidspunktet hvor en modelprognose blev udstedt.Forecast-tidTidspunktet som prognoseværdien gælder for.
