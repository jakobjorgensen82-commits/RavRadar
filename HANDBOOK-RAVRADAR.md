# RavRadar – levende faglig og teknisk håndbog

**Håndbogsversion:** 4.0.59  
**Opdateret:** 31. juli 2026  
**Status:** Levende dokument; tekniske forhold skal verificeres mod aktuel kode og RDKS.

## 1. Formål og løfte
RavRadar er beslutningsstøtte til ravjagt langs danske kyster. Systemet skal hjælpe brugeren med at vælge **sted og tidspunkt**, men må aldrig fremstille en høj score som et løfte om fund. Rav skal både være til stede i området, frigøres fra sit miljø, transporteres i en gunstig retning, koncentreres eller aflejres og være tilgængeligt under jagtbare forhold.

RavScore er derfor en samlet vurdering af processer og usikkerhed. Appen skal være ærlig om datakilder, mangler, fallback og antagelser.

## 2. Projektets udvikling
Projektet begyndte som et ønske om en gratis, samlet visning af vandstandsprognoser langs så meget af Danmarks kyst som muligt. Det udviklede sig hurtigt til et landsdækkende ravværktøj med zoner, femdøgnsprognose, strøm, vind, bølger, vandstand, scoring, diagnostik og administration.

Historikken viser flere vigtige kursændringer:
- Open-Meteo gik fra at være en praktisk hovedkilde til at være fallback, fordi DMI blev valgt som autoritativ dansk kilde.
- En tidlig zoneopdeling med brede områder blev erstattet af ét detaljeret officielt zoneregister.
- Simpelt afstandsbaseret stationsvalg blev udbygget med kysttopologi, persistent register og administratoroverride.
- Fokus flyttede fra blot at få tal på skærmen til at sikre sammenhængende tidsserier, forklarbarhed, audits og driftssikkerhed.
- Projektets viden blev flyttet fra spredte chats til RDKS, så gamle idéer kan bevares uden at blive genindført ukritisk.

Den rekonstruerede chatkronologi ligger i `docs/rdks/90_INDEX/CHRONOLOGY.md`.

## 3. Faglig procesmodel
RavRadar arbejder med en kæde af betingelser:
1. **Tilstedeværelse:** Der skal være rav i sediment, tang, opskyl eller nærliggende depoter.
2. **Frigivelse:** Energi fra bølger, strøm og storm kan mobilisere materiale.
3. **Transport:** Vandbevægelse skal føre rav og ledsagemateriale i en relevant retning.
4. **Koncentration/aflejring:** Kystform, rev, læ, vegetation, odder og ændret energi kan samle materialet.
5. **Tilgængelighed:** Vandstand, bølger, mørke, sigt og adgang skal gøre jagten realistisk og sikker.

Det er en fejl at lade én enkelt faktor dominere uden procesmæssig sammenhæng. Eksempelvis kan en statisk lavvandszone ikke i sig selv skabe ravtransport. Den kan højst forstærke en allerede dokumenteret transport- eller aflejringssituation.

### Evidensniveauer
- **Dokumenteret:** Understøttet af pålidelig faglig kilde eller direkte måling.
- **Observeret:** Gentaget praktisk erfaring, men ikke fuldt dokumenteret.
- **Hypotese:** Plausibel forklaring, der stadig skal testes.
- **Valideret i RavRadar:** Understøttet af projektets egne kontrollerede data uden at blive forvekslet med universel naturvidenskabelig sandhed.

## 4. Datakilder og prioritet
DMI er RavRadars autoritative kilde for danske prognoser, når DMI-data er tilgængelige og brugbare. Open-Meteo og andre kilder er fallback. Fallback skal beskytte brugeroplevelsen uden at skjule, at kilden er ændret.

Hver komponent behandles som sin egen tidsserie:
- vind
- bølger
- strøm
- vandstand
- vandtemperatur

Serierne filtreres og canonicaliseres til faste UTC-timer før sammensmeltning. Et centralt krav er, at systemet ikke må skifte DMI → fallback → DMI time for time. Den slags pendlen kan skabe kunstige spring, som ser meteorologiske eller oceanografiske ud, men i virkeligheden skyldes databehandlingen.

En praktisk horisont på cirka 118–119 timer accepteres. Det er bedre at levere 118 sammenhængende og ærlige timer end at tvinge to kunstige timer ind for at ramme 120.

## 5. DMI-modeller og forecastpipeline
RavRadar anvender DMI’s bulkmodeldata og cache, så mange zoner kan opdateres uden et stort antal separate API-kald. Pipelineprincipperne er:
- bulkdownload og genbrug af allerede behandlede modeltrin
- model- og parameterspecifik udtrækning
- nærmeste gyldige marine gridpunkt med kontrol mod land/manglende felter
- separat håndtering af vind og marine komponenter
- cache, så tidligere gyldige prognoser ikke forsvinder ved midlertidige hentefejl
- sekventiel reparation/fallback, hvor det er nødvendigt

Diagnostikken skal skelne mellem fejl i acquisition, konvertering, geografisk dækning, horizon og observationer. En grøn brugerprognose er ikke nødvendigvis det samme som fuld DMI-dækning; fallback kan gøre brugerproduktet komplet, mens DMI-sundheden er degraderet.

## 6. Observationer, prognoser og cache
En observation er en måling af den aktuelle eller nylige vandstand. En prognose er modelberegnet fremtid. Cache er en tidligere hentet prognose eller observation, som stadig kan være gyldig. De tre må ikke blandes sprogligt eller logisk.

For en DMI-vandstandsstation skal RavRadar på sigt vise mindst:
- DMI-registerstatus
- seneste observation og tidspunkt
- om stationen nogensinde har leveret
- observationsstatus nu
- prognose-/cachestatus
- cache gyldig til
- samlet anvendelighed
- historisk leveringsstabilitet

En station må ikke markeres som død alene, fordi den mangler én ny observation. Hvis gyldige cachede prognosedata stadig findes, kan stationen fortsat være relevant for prognosen. Omvendt er det ikke nok, at DMI kalder stationen aktiv; RavRadar skal vide, om den faktisk har leveret den datatype, systemet har brug for.

## 7. DMI-stationsregister og routing
Stationsregisteret skal være vedvarende. Når en station først er opdaget, bevares den med historik i stedet for at forsvinde, hvis en senere kørsel er tom eller midlertidigt mangelfuld.

Admin skal tydeligt skelne mellem:
- alle kendte DMI-stationer
- automatisk valgte stationer
- administratorvalgte overrides
- stationer der både er auto- og administratorvalgte
- aktive, historiske/inaktive og midlertidigt tavse stationer

For hver zone bør systemet vise automatisk primær og sekundær station, afstand, vægte og valgmetode. Administratoren kan vælge en override. Når override er aktiv og opfylder kravene, erstatter det automatikken; det automatiske valg kan fortsat vises som reference, men må ikke samtidig påvirke beregningen.

Nye stationer, stationer der holder op med at levere, stationer der genoptager levering og stationer der sandsynligvis er et bedre valg for en zone, skal udløse meningsfulde notifikationer. Et forslag om bedre routing må ikke automatisk overskrive et administratorvalg.

## 8. Retningskonventioner
Retninger er en af de mest fejlkritiske dele af RavRadar.

- **Vind:** meteorologisk konvention – hvor vinden kommer fra.
- **Strøm:** bevægelsesretning – hvor vandet bevæger sig hen.
- **Pålandsretning:** den lokale retning fra hav mod land.

En 180°-fejl kan få fralandsstrøm til at ligne indtransport. Derfor skal testkæden dække rå komponentvektorer, konvertering til grader, UI-pil, lokal pålandsretning, klassifikation og score.

Selv når matematikken er korrekt, kan en zone stadig være forkert, hvis dens land-/havpunkt, kystorientering eller `onshoreDirectionDeg` er fejlplaceret. Alle zoner skal derfor kunne auditeres visuelt og maskinelt.

Havmarkøren og landmarkøren er en eksisterende redigeringsfunktion. Diskussioner om, hvad markørerne betyder, er ikke automatisk et krav om at ombygge funktionen. Funktioner må kun ændres ved en udtrykkelig bestilling.

## 9. Zoner og kystgeometri
RavRadar bruger ét detaljeret officielt zoneregister på tværs af kort, forecast, admin, feedback og audits. Gamle brede førstegenerationszoner er udfaset.

Zonerne skal følge den naturlige kyst og ikke ukritisk følge moler, kajer eller havneanlæg. Kunstige udstikkere kan være relevante lokalt, men bør ikke alene definere kystens naturlige pålandsretning.

Kystlinjeeditoren er et centralt administrationsværktøj. Den skal:
- bevare præcisionsmarkøren
- tillade tydeligt skift mellem navigation og redigering
- kunne påvirke nabopunkter med en glat lokal kurve
- kunne deaktivere og genaktivere en kystdel uden at miste historikken
- gemme stabilt centralt
- understøtte rollback

Den konkrete zone “Als Odde og Helberskov” skal ligge nord for Mariager Fjord mod Øster Hurup. Denne placering er en fast regressionskontrol.

## 10. RavScore og forklarbarhed
RavScore samler flere delprocesser. Tidlige arbejdsvægte har blandt andet grupperet jagtbarhed, transport og frigivelse, men vægte er ikke naturkonstanter og må ændres på grundlag af dokumentation, tests og ekspertvurdering.

En forklaring bør kunne vise:
- råværdier og tidspunkter
- datakilde for hver komponent
- retning før og efter konvertering
- lokal pålandsafvigelse
- delscore for vind, strøm, bølger, vandstand og procesfase
- bonusser og fradrag
- caps, minimum eller maksimum
- aktive ekspertregler
- AI-input og AI-output, hvis AI er involveret
- endelig score og usikkerhed

Systemet skal også kunne forklare, hvorfor én zone scorer højere end en nabo. Store forskelle kan være korrekte, men de skal kunne føres tilbage til data, geometri eller regler.

## 11. Vandstand og spring
Historisk opstod tusindvis af store vandstandsspring, fordi DMI og Open-Meteo blev blandet time for time. Det er en forbudt regression.

Store sekventielle ændringer i Vadehavet kan derimod være realistiske tidevandssvingninger. De skal vurderes ud fra mønster, kildekontinuitet og geografisk kontekst. Et simpelt filter, der udglatter alle store spring, kan ødelægge ægte data.

Aktuelle observationer kan bruges til at vise “nu” og kontrollere modellen. Hvis en observation og prognose ikke stemmer, skal forskellen være synlig og auditerbar. Frederikshavn-mismatchet mellem DMI’s aktuelle måling og RavRadars viste værdi er et eksempel på en konkret regressions- og forklaringstest.

## 12. Regelmotor og ekspertviden
Ekspertregler skal kunne oprettes af en administrator uden kendskab til interne feltnavne. Den ønskede arbejdsgang er:
1. Beskriv observationen i almindeligt sprog.
2. Vælg betingelser som vind, strøm, bølger, vandstand, varighed og geografi.
3. Vælg effekt: point, fradrag, cap, minimum eller advarsel.
4. Se konkret preview på score og berørte zoner/timer.

Hvert felt skal forklare betydning, effekt og eksempel. Prioritet vises som Lav, Normal, Høj eller Kritisk; interne tal kan eksistere bagved. Geografi vælges som hele Danmark, større kystregion, flere zoner eller kortvalg. Fri tekst skal omsættes til konkrete zoner før lagring.

Regelbyggeren skal advare ved:
- regel uden geografi
- regel der altid gælder
- meget stor scoreeffekt
- umulige betingelser
- konflikt med andre regler
- kritisk prioritet

Dialogen skal kunne lukkes via kryds, Annuller, Escape og klik udenfor, med advarsel om ikke-gemte ændringer.

## 13. Brugerfeedback, AI og læring
Både fund og ture uden fund er nødvendige for at evaluere modellen. Feedback skal knyttes til zone, tid, jagtform, viste data, scoremotorversion og samtykke.

AI må hjælpe med:
- strukturering af fri tekst til regelkladde
- forklaring og audit
- mønstergenkendelse
- forslag til områder, datafejl og mulige forbedringer

AI må ikke aktivere regler, ændre vægte eller lære direkte af rå brugerdata uden menneskelig kontrol, kvalitetsfiltrering og hold-out-validering. En AI-analyse er ikke i sig selv faglig evidens.

## 14. Administration, sikker lagring og rollback
Admin skal være forståelig for en ikke-teknisk ejer og samtidig bevare avancerede muligheder. Centrale indstillinger – zoner, geometri, stationer, regler, reviews og rettigheder – skal lagres centralt med revisionshistorik.

Supabase er den planlagte/brugte centrale platform for login, roller, regler, ekspertreviews og adminændringer. Lokale kladder kan være nødmekanisme, men må ikke blive skjult autoritativ sandhed.

Rollback er nødvendig, fordi geografiske og regelmæssige ændringer kan påvirke mange prognoser. Systemet skal kunne vise, hvem der ændrede hvad, hvornår og fra hvilken tidligere værdi.

## 15. Diagnostik og sundhed
RavRadar har flere lag af sundhed:
- brugerprognosens komplethed
- DMI-dækning
- acquisition og API-forbindelse
- konvertering
- horisont
- observationer
- cache
- fallback

En samlet status som “degraded” skal forklares. Det er muligt, at brugerprognosen er næsten komplet via fallback, mens DMI-dækningen samtidig er utilstrækkelig.

Runtime Diagnostics og den almindelige diagnostik skal gøre det muligt at følge en zones data fra kilde til slutresultat. Stationsdiagnostik skal udvides med stationernes konkrete leveringshistorik, seneste observation og cacheanvendelighed.

## 16. Drift og releaseproces
Ved hver release skal projektet:
1. Læse aktive RDKS-beslutninger og krav.
2. Indarbejde samtaledeltaet siden seneste ZIP.
3. Kontrollere om ny kode strider mod aktive beslutninger.
4. Opdatere RDKS, changelog og relevante håndbogsafsnit.
5. Opdatere versionsnumre konsekvent.
6. Køre hele den relevante valideringspakke.
7. Aflevere en ZIP, hvor kode og projektviden er synkroniseret.

Gamle chats må ikke bruges som direkte specifikation. De analyseres som historiske kilder, og nyere løsninger vinder.

## 17. Aktuel status og næste prioriteringer
Se `docs/rdks/90_INDEX/IMPLEMENTATION_STATUS.md` for den operationelle status. De vigtigste åbne spor er:
- fuld adskillelse af observationsstatus og prognose-/cachestatus pr. station
- seneste observation, cacheudløb og historisk stabilitet i admin
- notifikation ved nye stationer, udfald, genoptagelse og bedre routing
- fortsat officiel audit af DMI-stationsregisteret
- komplet forklaringskæde for RavScore
- mobil regressionstest af kysteditor og regelbygger
- faglig ekspertvalidering af sediment- og ravantagelser

## 18. Ordbog
- **Canonical UTC-time:** fast timepunkt uden minutforskydning, brugt ved merge.
- **Fallback:** sekundær datakilde ved manglende eller ugyldig primær data.
- **OnshoreDirectionDeg:** lokal retning fra hav mod land.
- **Observation:** faktisk måling.
- **Prognose:** modelberegnet fremtidig værdi.
- **Cache:** tidligere hentet data, som stadig kan være gyldig.
- **Routing:** valg og vægtning af stationer eller modelområder for en zone.
- **Override:** administratorens bevidste erstatning af automatisk valg.
- **RDKS:** RavRadar Decision & Knowledge System.
- **Regression:** tidligere løst fejl eller fjernet adfærd, som vender tilbage.


## Dokumentationscenter
Administrationens dokumentationscenter samler den læsevenlige håndbog og RDKS-filerne. Her kan administratoren åbne gældende projektviden, implementeringsstatus, aktive krav, kendte problemer og masterloggen uden at lede i projektmappen.

## Stationsstatus: observation, cache og anvendelighed
En DMI-vandstandsstation har tre adskilte statuslag:

1. **Observationsstatus** beskriver, om stationen leverer en ny brugbar måling nu, midlertidigt mangler en måling eller ikke har leveret i flere gennemførte observationskørsler.
2. **Prognose-/cachestatus** beskriver, om RavRadar fortsat har en gyldig DMI-prognosecache, som bygger på stationens seneste dokumenterede bidrag, og hvornår den cache udløber.
3. **Samlet anvendelighed** afgør, om stationen kan anvendes nu. En station kan derfor være markeret som “kun cache” og stadig være brugbar, selv om observationsfeedet er midlertidigt tavst.

Friske observationer har altid forrang. Cachede stationsværdier bruges kun frem til det dokumenterede cacheudløb. Når cache bliver tilgængelig eller udløber, oprettes en tilstandsnotifikation.
