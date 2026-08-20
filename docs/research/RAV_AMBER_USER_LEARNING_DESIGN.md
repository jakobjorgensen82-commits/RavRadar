# RavRadar: brugerforklaring og læring

Status: forsknings- og designspecifikation. Dokumentet ændrer ikke RavScore eller produktion.

## 1. Formål

RavRadar skal ikke blot vise et tal. Systemet skal hjælpe brugeren med at forstå:

1. hvor lovende stedet og tidspunktet er,
2. hvad havet sandsynligvis har gjort med ravet,
3. hvorfor netop disse forhold giver vurderingen,
4. hvad brugeren konkret kan kigge efter,
5. og hvor sikker eller usikker vurderingen er.

Forklaringen må aldrig være en fri tekst, som kan modsige score eller pil. Alle tre skal dannes fra den samme beregnede tilstand og det samme tidspunkt.

## 2. Den faste brugerhistorie

Den enkleste fagligt korrekte fortælling er:

> Ravet skal først være til stede. Havet skal derefter løsne det, flytte det mod et søgbart område, aflevere eller fastholde det og til sidst gøre det muligt at se og samle det.

De fem brugerord er derfor:

- **Løsner:** bølger og strøm sætter materiale i bevægelse.
- **Flytter:** strøm, bølger og kystens form bestemmer transporten.
- **Afleverer:** materialet føres ind på strand, revle eller lavt vand.
- **Fastholder:** faldende energi, tang, læ, høfder eller kystform kan holde det tilbage.
- **Synliggør:** vandstand, bølger, dagslys og søgeforhold afgør, om det kan findes.

Ordene er en brugeroversættelse af proceskæden inventar, tilgængelighed, mobilisering, transport, aflejring og observerbarhed. De må ikke bruges som dokumentation for processer, som modellen ikke faktisk beregner.

## 3. Fire forskellige oplysninger må ikke blandes

RavRadar skal holde følgende adskilt:

| Oplysning | Brugerens spørgsmål | Må ikke fremstilles som |
|---|---|---|
| Ravmulighed | Hvor lovende er kombinationen af sted og forhold? | En bogstavelig procentchance for fund |
| Søgeforhold | Er det praktisk muligt at lede nu? | Bevis for at der ligger rav |
| Modeltillid | Hvor gode og relevante er data og modellen her? | Sikkerhedsgaranti |
| Sikkerhed | Er forholdene forsvarlige for brugeren? | En del af ravscoren |

En høj ravmulighed må derfor godt ledsages af dårlige søgeforhold eller lav modeltillid. Det skal forklares tydeligt i stedet for at blive skjult i ét samlet tal.

## 4. Et indeks er ikke en sandsynlighed

En værdi på 72/100 betyder foreløbig, at de modellerede forhold er mere lovende end ved en lavere indeksværdi. Den betyder ikke, at 72 ud af 100 ture giver rav.

En bogstavelig fundprocent kræver blandt andet:

- registrerede ture med og uden fund,
- ensartet registrering af søgetid, område og metode,
- korrektion for brugerens erfaring og indsats,
- adskilt validering på nye storme, tidsperioder og kysttyper,
- og dokumenteret kalibrering mellem vist sandsynlighed og observeret fundhyppighed.

Indtil dette findes, skal brugerfladen kalde værdien en **RavScore**, et **indeks** eller en **vurdering**, ikke en fundchance i procent.

## 5. Forklaringen vises i tre lag

### Lag 1: hurtigt overblik

Skal kunne forstås på få sekunder:

- **Vurdering:** lav, middel, god eller meget god RavScore.
- **Hovedårsag:** den vigtigste positive eller negative proces.
- **Handling:** hvor og hvornår det giver mening at kigge.
- **Tillid:** høj, middel eller lav med en kort årsag.

Eksempel:

> **God RavScore.** Gårsdagens bølger kan have løsnet materiale, og strømmen peger nu mod denne kystdel. Kig efter nye tanglinjer og gruslommer, når vandet falder. **Middel tillid:** strømmen dækker det øverste vandlag, ikke bunden ved stranden.

### Lag 2: hvorfor denne vurdering?

Vis højst tre drivere i prioriteret rækkefølge:

- hvad hjælper,
- hvad begrænser,
- og hvad har ændret sig siden den foregående vurdering.

Hver driver skal angive retning og virkning. “Kraftig vind” er ikke nok. En forklaring skal eksempelvis sige, om vinden forventes at øge mobilisering, føre materiale langs kysten eller gøre søgning vanskelig.

### Lag 3: lær mere

Den frivillige uddybning kan vise:

- proceskæden fra havbund til strand,
- hvilket vandlag pilen repræsenterer,
- forskellen mellem nuværende forhold og gårsdagens storm,
- relevante lokale kystforhold,
- datakilder og tidspunkt,
- kendte begrænsninger,
- og den faglige evidens bag forklaringen.

Denne lagdeling følger princippet om gradvis uddybning: høj faglig præcision bevares uden at tvinge alle brugere gennem hele forklaringen.

## 6. Den faste forklaringsskabelon

Alle automatiske forklaringer skal bygges i samme rækkefølge:

1. **Vurdering:** “RavScoren er ...”
2. **Tid:** “Det skyldes især forholdene nu / de seneste ... timer.”
3. **Proces:** “Bølgerne kan have løsnet ...; strømmen kan have flyttet ...; faldende energi kan nu aflevere ...”
4. **Sted:** “Det er mest relevant ved ...”
5. **Handling:** “Kig efter ... når ...”
6. **Begrænsning:** “Vurderingen er usikker fordi ...”

Et led skal udelades, hvis systemet ikke har fagligt grundlag for det. Det må aldrig udfyldes med et generisk positivt udsagn.

## 7. Score, pil og tekst er én kontrakt

For hver visning skal systemet kunne fremlægge én intern forklaringspost med:

- beregningstid og prognosetid,
- den kystdel og det punkt data gælder for,
- scorekomponenter og bidrag,
- anvendt vind-, bølge-, strøm- og vandstandsperiode,
- pilens fysiske størrelse, dybdelag og retning,
- de valgte forklaringsårsager,
- datamangler og fallback,
- samt modeltillid.

Automatiske kontroller skal afvise visningen, hvis eksempelvis:

- teksten siger transport mod kysten, mens den viste pil peger væk fra kysten,
- pilen viser overfladestrøm, men teksten kalder den bundtransport,
- en positiv forklaring ikke har et positivt scorebidrag,
- forklaringen omtaler en stormperiode, som scoren ikke bruger,
- et gammelt eller erstattet datapunkt fremstilles som aktuelt,
- eller lav datadækning præsenteres med høj modeltillid.

En uenighed kan være fysisk rimelig, hvis pilen og ravtransporten beskriver forskellige lag eller processer. I så fald skal forskellen forklares direkte; den må ikke skjules.

## 8. Pilen skal navngives efter det, den faktisk viser

“Strømretning” er for upræcist. En pil skal mindst have:

- **hvad:** vind, bølgeretning, overfladenær strøm, lagmiddel eller estimeret ravtransport,
- **hvor:** modelpunkt/kystdel og eventuelt afstand fra kysten,
- **dybde:** det relevante model- eller observationslag,
- **tid:** observation, analyse eller prognose,
- **betydning:** om pilen er en måling/modelstørrelse eller en beregnet transporthypotese.

Hvis RavRadar senere viser en “ravpil”, skal den være et selvstændigt modelresultat med validering. Den må ikke blot være en omdøbt strøm- eller vindpil.

## 9. Hvad brugeren kan lære

Korte læringskort kan forklare én ting ad gangen:

### Rav flyder ikke altid

Det meste baltiske rav er tættere end almindeligt havvand og synker. Lette stykker kan flyde eller holdes svævende, mens tungere stykker typisk flyttes nær bunden eller sammen med andet let materiale.

### Stormen og fundtidspunktet er ikke det samme

Høj energi kan løsne og flytte materiale, mens faldende bølger og vandstand senere kan gøre det tilgængeligt. Derfor kan de bedste søgeforhold opstå efter den kraftigste del af stormen.

### Tang er et spor, ikke et bevis

Tang, træ og andet let strandmateriale kan vise, hvor havet har samlet og afleveret materiale. Rav kan følge noget af den samme sortering, men kan også have en anden tæthed, form og bane.

### Kysten ændrer transporten

Revler, høfder, bugter, skrænter, sandbund og stenbund kan ændre, hvor materiale løsnes, bremses, begraves eller samles. Samme vejr giver derfor ikke nødvendigvis samme resultat overalt.

### Pile kan vise forskellige lag

Vand kan bevæge sig forskelligt ved overfladen og nær bunden. En modelpil for det øverste vandlag er derfor ikke automatisk retningen for et ravstykke tæt på havbunden.

### Et nul-fund er også nyttigt

En tur uden fund hjælper med at teste modellen, hvis søgetid, område og forhold er registreret. Kun fundmeldinger kan få modellen til at virke bedre, end den er.

## 10. Sprogkrav

Forklaringer skal:

- bruge korte sætninger og konkrete verber,
- begynde med konklusion og handling,
- angive sted og tidsrum,
- skelne mellem “viser”, “tyder på”, “kan” og “ved vi ikke”,
- forklare et fagord første gang det bruges,
- undgå falsk præcision,
- og fortælle, hvad der mangler, når tilliden er lav.

Undgå:

- “optimale forhold” uden dokumenteret sammenligningsgrundlag,
- “ravet kommer ind” når modellen kun viser overfladestrøm,
- “72 % chance” før faktisk sandsynlighedskalibrering,
- “vinden presser ravet ind” som universel regel,
- og lange lister af vejrtal uden forklaring af deres betydning.

## 11. Usikkerhed skal være konkret

“Usikkert” alene hjælper ikke. Systemet skal angive årsagen, eksempelvis:

- strømdata dækker et tykt overfladelag,
- bølgemodellen medregner ikke strøm og skiftende vanddybde,
- kystnære dybder og revler er groft beskrevet,
- den lokale ravkilde er ukendt,
- data er gamle eller mangler,
- eller modellen er endnu ikke valideret på nok uafhængige ture.

Tillid skal handle om datagrundlag og dokumenteret modelydelse. Den må ikke automatisk stige, fordi RavScoren er høj.

## 12. Handlingsråd og sikkerhed

Et råd skal være koblet til den proces, der begrunder det:

- ny tanglinje: mulig afleverings- og fastholdelseszone,
- grus- eller skalstribe: mulig hydraulisk sortering,
- læside ved kyststruktur: mulig lokal tilbageholdelse,
- faldende vand: et tidligere dækket område bliver søgbart,
- kraftig brænding: vent på sikrere og mere observerbare forhold.

Sikkerhed er overordnet. Systemet må aldrig anbefale en handling, fordi RavScoren er høj, hvis bølger, vind, mørke, kulde, oversvømmelse eller adgang gør handlingen uforsvarlig.

## 13. Brugerprøver før release

Forklaringen er ikke valideret, blot fordi udvikleren forstår den. Den skal prøves med både nye og erfarne ravjægere.

Mindstekrav til en første kvalitativ prøve:

- brugeren forklarer med egne ord, hvad scoren betyder,
- brugeren siger, hvad pilen viser,
- brugeren peger på den vigtigste positive og negative årsag,
- brugeren vælger et fornuftigt søgetidspunkt eller vælger at vente,
- brugeren kan skelne lav RavScore fra lav modeltillid,
- og brugeren kan finde den dybere dokumentation uden hjælp.

Mål ikke kun, om brugeren kan gentage ordene. Mål også, om forklaringen fører til en bedre og mere sikker beslutning. Usikkerhedsvisninger bør sammenlignes i kontrollerede varianter; forskning i vejrudsigter viser, at format, kompleksitet og den præcise reference for et tal påvirker forståelsen.

## 14. Evidens bag kommunikationsdesignet

- WMO's handlingsorienterede kommunikation fremhæver de faste spørgsmål hvad, hvor, hvornår, alvor/omfang, sikkerhed og handling. RavRadar overtager strukturen, men ikke katastrofevarslingens alvor eller terminologi: <https://public.wmo.int/media/magazine-article/communicating-life-saving-action-enhancing-messaging-early-warnings-systems>
- Et stort eksperiment med vejrudsigter fandt, at brugere kunne anvende sandsynlighedsinformation, og at ekstra usikkerhed ikke i sig selv skabte mere forvirring. Mere kompleksitet var dog ikke altid bedre: <https://gc.copernicus.org/articles/2/101/2019/>
- Undersøgelser af “30 % chance for regn” viser, at selv tal misforstås, når det er uklart, hvilken hændelse, lokation og periode procenten refererer til: <https://doi.org/10.1111/j.1539-6924.2005.00608.x>
- En systematisk gennemgang af sandsynlighedskommunikation i vejrudsigter viser, at visuelle, numeriske og sproglige valg bør testes frem for antages at være selvforklarende: <https://journals.ametsoc.org/view/journals/wcas/14/2/WCAS-D-21-0034.1.xml>
- En gennemgang af beslutningsstøtte for Østersøens miljø viser behovet for at synliggøre datamæssig, strukturel og parameterrelateret usikkerhed i stedet for kun at vise et resultat: <https://pmc.ncbi.nlm.nih.gov/articles/PMC7782639/>

## 15. Releasekrav for forklaringer

En fremtidig forklaringsændring må først frigives, når:

1. forklaringen kan spores til de faktiske scorebidrag og data,
2. score, pil, tid, sted og tekst består automatiske sammenhængskontroller,
3. fallback og datamangler fremgår korrekt,
4. indeks ikke markedsføres som kalibreret fundprocent,
5. sikkerhed er adskilt og kan tilsidesætte handlingsråd,
6. centrale brugerudsagn er forståelsestestet,
7. og faglig dokumentation samt brugerhåndbog er opdateret.

## 16. Anbefalet produktretning

Det mest værdifulde næste trin er ikke mere tekst i den eksisterende visning. Det er at etablere én fælles, maskinlæsbar forklaringskontrakt mellem beregning og brugerflade. Derefter kan samme sandhed vises som kort svar, uddybning, læringskort, browserkontrol og diagnostik uden at udvikle fem forskellige forklaringer.

Denne kontrakt bør designes og testes som en særskilt roadmap-del. Implementering kræver ejerens godkendelse af den samlede videnskabelige analyse og cost/benefit-vurdering først.
