# Intern analyse: RavRadar sammenholdt med Ravudsigten

Status: **STOPPET EFTER EJERBESLUTNING 6. OKTOBER 2026, INTERN OG SCORE-NEUTRAL**

Første datasnit: **27. august 2026**

RavScore-påvirkning: **ingen**

Offentlig runtime: **ingen**

## Nyeste ejerbeslutning – sammenligningen stoppet og taget ud af roadmap

Ejeren har efter dagens afprøvning bedt om at stoppe sammenligningen og
fjerne punkt 3 sammen med de øvrige fravalgte punkter. Der indsamles ikke
flere data til denne opgave. Ingen betaling, videre analyse eller ny
planlagt sammenligning følger. De følgende daterede resultater bevares
kun som historisk evidens, ikke som aktuelle opgaver eller genstartsautoritet.
Scoremodellen ændres ikke. `scoreImpact=false` og `publicRuntime=false`.

## Historisk kontroldatasnit 6. oktober 2026, ca. 08.40–08.50 dansk tid

Roadmap-punkt 3 er ikke opgivet. Browserskill og den eksisterende Chrome-
forbindelse er brugt til faktisk at aflæse FREE-vind og FREE-strøm for
Agger, Hasmark Strand og Amager Strand. Kun byvalg og vind-/strømfaner
blev brugt; ingen LIVE-detaljer, login, betaling, adgangsomgåelse eller
indtastning i Ravine. Resultaterne er interne og ændrer ikke RavScore.

RavRadar blev genindlæst efter det naturlige deploy kl. 08.38. Det lille
offentlige manifest viste `rr-20261006055015-210`, genereret
`2026-10-06T05:50:15.337Z`. UI viste version 4.0.543 og prognosereference
6. oktober kl. 08.00 dansk tid. Der blev ikke genhentet store timepakker.
Den første detaljevisning viste kun den aktuelle time, mens den asynkrone
prognose hentede ind; en senere aflæsning viste alle fem dage. Den første
ufærdige visning er ikke evidens for manglende produktionsdata.

### Aflæste aktuelle forhold og sammenligningsgrænser

Ravudsigten vises fortsat som forsinket FREE uden synligt generations-id,
beregningstid, entydig tidszone, præcist prøvepunkt eller definition af,
hvordan en sekstimersperiodes tal er valgt. Derfor er følgende en
beskrivende side-om-side-aflæsning, ikke et beregnet prognosefejlmål.
Vindretning er **fra**, strømretning **mod**. Farver omregnes ikke til
RavScore eller en sandsynlighed for fund.

| Sted | Ravudsigten FREE 6/10, perioden 06–12 | RavRadar kl. 08.00, waders | Geografisk kontrol |
|---|---|---|---|
| Agger | Vind fra VNV 7,8 m/s; strøm mod ØSØ 0,12 m/s; violet kl. 08, gul kl. 11 | Agger Tange: vind fra V 284°, 7,6 m/s; strøm mod N 2°, 0,13 m/s; RavScore 68 | Navn og kyst er relevante, men FREE-prøvepunktet er ikke kendt |
| Hasmark Strand | Vind fra V 3,2 m/s; strøm mod S 0,13 m/s; rød kl. 08 | Hasmark Strand: vind fra V 290°, 5,2 m/s; strøm mod S 171°, 0,12 m/s; RavScore 72 | Den viste RavRadar-kystdel har samme navn; eksakt FREE-prøvepunkt ukendt |
| Amager Strand | Vind fra VNV 4,7 m/s; strøm mod SV 0,57 m/s; rød kl. 08 | Amager Strandpark: RavScore 69 i kystdelslisten; zonevinder Mormorstranden har 74 | Zonevinderens vind/strøm må ikke fejlagtigt mærkes som Amager Strandpark; ingen kvantitativ vejrparring for dette sted |

Agger har omtrent samme viste vind-/strømhastighed i dette snit, men
forskellig strømretning. Hasmark har en lignende grov strømretning og
hastighed, men forskellige viste vindhastigheder. Det er observationer,
ikke bevis for samme input, forkert routing eller den ene models overlegenhed.
Tidsaggregation, datalder og prøvepunkter er stadig ukontrollerede.

RavRadars aflæste daglige bedste **lokale** waders-score 6.–10. oktober
var Agger 88/65/71/84/75, Hasmark 72/59/43/58/84 og Amager-zonevinderen
74/74/70/74/76. Den 6. oktober viste UI bedste tidspunkt henholdsvis
10.00, 15.00 og 12.00. Amager Strandpark stod særskilt med 71 ved zonens
valgte time kl. 12.00. Disse tal er ikke den nationale områdescore, ikke
daglige maksimumværdier for hvert Amager-punkt og ikke fundprocenter.
FREE-perioderne viste også farveskift uden at deres præcise modelbetydning
blev nyverificeret; på Hasmark rød kl. 20 og grøn kl. 23, på Agger grøn
kl. 20. Det skal ikke læses som samme mål som RavRadars bedste time.

**Delkonklusion:** Betalingssiden gør ikke punkt 3 umuligt. En begrænset
gratis, intern og score-neutral sammenligning er faktisk startet på tre
kysttyper. Den kan beskrive synlig enighed/uenighed og undgå forkerte
geografiske koblinger; den kan endnu ikke rangere præcision eller leadlag.
Næste sikre trin er at fastholde disse tids-/stedafgrænsninger i kommende
nye naturlige generationer. En præcisionskonklusion kræver uafhængige
observationer og sammenlignelige tider/steder, ikke blot enighed med
Ravudsigten. Punktet er derfor aktivt, ikke afsluttet eller en ny modelopgave.

Kilder: [Ravudsigten FREE](https://ravudsigten.ravfund.dk/ravkort),
[RavRadar](https://ravradar.dk/) og
[det lille offentlige manifest](https://ravradar.dk/data/live/manifest.json).

## Ejerafgrænsning og første offentlig afprøvning – 6. oktober 2026

Ejeren fastholder den nuværende scoremodel. Fremtidig efterkalibrering,
nye modelinput og eventuel fundprocent er ikke aktive roadmap-opgaver.
Denne sammenligning fortsætter kun internt og score-neutralt, som ejeren
igen har bedt om at prøve. Augustafsnittenes Candidate G og prognoser
er historik, ikke den aktuelle RavRadar-model eller nye modelændringstilladelser.

Browserskill er brugt med den eksisterende browserforbindelse, uden login,
betaling, ny tjeneste, ændrede browser-/sikkerhedsindstillinger eller
omgåelse af adgang. `https://ravudsigten.com/` gav faktisk en
forbindelsestimeout; dette beviser ikke, at den viste en betalingsside.
Den allerede dokumenterede offentlige adresse
[Ravudsigten-kortet](https://ravudsigten.ravfund.dk/ravkort) virker.

Den offentlige UI viste »Du er ikke logget ind«. FREE giver en bred
regionsoversigt og beskrives som forsinkede vind-/strømprognoser.
Præcise steder, friske data, femdøgnsprognose og ravposition beskrives
som LIVE. Et særskilt LIVE-demo-panel er ikke måling af betalt liveadgang.

Den offentlige syvdøgns-vindoversigt blev faktisk åbnet, og Agger valgt
gennem UI. Efter indlæsning viste FREE-dialogen 6.–12. oktober 2026,
fire sekstimersperioder pr. dag, vindretning/-hastighed og farvesignaler
med tidspunkter. Det er 28 offentligt synlige oversigtsceller, ikke 28
kontrollerede strandprognoser. Den 6. oktober skiftede oversigten blandt
andet fra gul/violet til grøn; kommende dage viste også røde/violette
perioder. Farvernes præcise interne betydning er ikke verificeret her.
Der blev ikke klikket på LIVE-detaljer, købt adgang eller sendt navn,
lokation, spørgsmål eller andre oplysninger til tjenesten. Strømoversigtens
konkrete tabelværdier blev ikke aflæst i denne afprøvning.

**Konklusion:** En begrænset gratis sammenligning af brede regioner og
byoversigtens vind-/farvesignaler er mulig. Der er ikke aflæst et entydigt
beregnings-/generations-id, og FREE-data er beskrevet som forsinkede.
Derfor kan dette datasnit ikke bevise samtidig prognoseenighed, hvem der
varsler først, præcise lokale forskelle eller hvilken tjeneste der er bedst.
Næste sammenlignelige datasnit kræver en faktisk ny RavRadar-generation,
synlig Ravudsigten-tid og et forsvarligt geografisk match. Betalt adgang
kræver særskilt ejervalg; manglende data omgås ikke. Ingen fundgaranti,
scoreændring eller offentlig funktion følger af denne afprøvning.

## Formål og fast grænse

Analysen skal over tid gøre det forståeligt:

1. hvor RavRadar og Ravudsigten peger på de samme kyster;
2. hvor de peger forskelligt;
3. hvilke observerbare forskelle i data, tid, sted og modelbetydning der sandsynligvis forklarer afvigelserne;
4. hvem der varsler en ændring først, hvor længe signalet holder, og om en senere uafhængig observation støtter det ene eller det andet signal.

Der bruges kun offentligt synlige resultater og offentlige metodebeskrivelser. Ingen adgang omgås, ingen privat kode eller skjult endpointlogik kopieres, og ingen bruger-, tur- eller funddata indgår uden en senere særskilt datakvalitets- og samtykkebeslutning.

Dokumentet er internt RDKS-materiale. Det må ikke kopieres til appen, den offentlige håndbog, ekspert-/adminflader eller offentlige prognosedata. En observation herfra må aldrig ændre Candidate G automatisk.

## Sådan læses evidensen

- **Bekræftet:** direkte observeret i offentlig UI, offentlig runtimefil eller offentlig metodebeskrivelse.
- **Stærk hypotese:** flere uafhængige observationer peger samme vej, men den anden models interne regel er ikke kendt.
- **Mulig forklaring:** fagligt plausibel, men endnu ikke adskilt fra andre forklaringer.
- **Uafklaret:** datagrundlaget kan endnu ikke afgøre årsagen.

Enighed mellem de to tjenester er ikke i sig selv bevis for, at prognosen er rigtig. Uenighed er heller ikke i sig selv bevis for, at en af dem er forkert.

## Offentligt beskrevet modelbetydning

### Ravudsigten

Ravfund beskriver offentligt, at Ravudsigten:

- indlæser data fra mere end 400 målepunkter hvert femte minut;
- læser vindretning, vindhastighed, strøm i to lag, højvande og lavvande;
- gemmer vejrdata i 180 dage;
- beregner, hvor ravet befinder sig i vandet;
- bruger grøn for rav i området, gul for rav på vej ind, violet for rigtig vind men forkert eller for kraftig strøm og rød for ringe mulighed;
- viser en femdøgnsprognose, som begynder 24 timer fremme.

Kilde: [Ravfunds offentlige beskrivelse af Ravudsigten](https://www.ravfund.dk/ravudsigten.aspx) og [det offentlige Ravkort](https://ravudsigten.ravfund.dk/ravkort).

Den aktuelle femdøgnsdialog forklarer dog violet kortere som **vinden er for kraftig**. Det er ikke helt den samme betydning som metodebeskrivelsen. Denne interne uoverensstemmelse hos kilden skal følges i kommende snapshots.

### RavRadar

RavRadar vurderer forholdene for den enkelte kyststrækning og søgemåde. Candidate G kombinerer:

- søgeforhold: 20 %;
- transport mod kysten: 50 %;
- rav i bevægelse: 30 %.

RavRadar bruger 48 timers dokumenteret transporthukommelse, en særskilt mobiliseringstilstand og lokale kystdele. En score kan være utilgængelig, hvis det nødvendige sammenhængende strømbevis mangler. Den offentlige **Bedste områder**-score er desuden en områdesammenligning, som både ser på bedste kyststrækning og støtte fra flere kyststrækninger. Den er derfor ikke det samme som en enkelt RavScore eller Ravudsigtens farve.

Kilde: [RavRadars offentlige side](https://jakobjorgensen82-commits.github.io/RavRadar/) og [Om RavRadar](https://jakobjorgensen82-commits.github.io/RavRadar/about.html).

## Metode for første datasnit

### Tid og datakilder

- RavRadar UI blev aflæst 27. august 2026 omkring kl. 02.08–02.51 CEST.
- Den offentlige RavRadar-runtime var version `4.0.287`, datasæt `rr-20260827000855-210`, genereret `2026-08-27T00:08:55.011Z`.
- Den offentlige detaljefil var 132.149.637 byte og dækkede 210 zoner, 673 kystdele og 118 timer fra 27. august kl. 00.00Z til 31. august kl. 21.00Z.
- Ravudsigten blev aflæst live i samme periode. Siden viste ikke et tilsvarende synligt datasæt-id eller genereringstidspunkt.
- RavRadars tider er omregnet til `Europe/Copenhagen`. For hvert Ravudsigten-sted og hver dato er den højeste tilgængelige RavRadar-zonescore på den samme lokale kalenderdato fundet for både waders og strand.

Den store offentlige runtimefil opbevares ikke i Git. Kun dataminimerede sammenfatninger står her.

### Geografisk sammenkobling

Ravudsigten bruger punktnavne. RavRadar bruger zoner med flere lokale kystdele. Et sted kobles derfor til den nærmeste logiske RavRadar-zone. Match mærkes:

- **høj:** stednavnet findes direkte i zonen eller en kystdel;
- **middel:** placeringen er geografisk sandsynlig, men zonen dækker mere end det navngivne sted;
- **lav:** må ikke bruges til kvantitativ konklusion.

RavRadar-resultatet i tabellerne er zonevinderens score. Det er ikke nødvendigvis præcis samme strandpunkt som Ravudsigten.

## Snapshot 001 – aktuelt billede

### Ravudsigtens synlige top fem

Alle fem stod som **Gode forhold**:

1. Danzigmann;
2. Jegens Strand;
3. Tårnby Strand;
4. Hirtshals;
5. Skagen fyr.

Det synlige kort-DOM indeholdt ved målingen 202 farvede stedmarkører: 195 røde, fem grønne, to violette og ingen gule. Derudover fandtes 66 markørelementer uden farveikon, hovedsageligt kortets retningslag. Tallet må ikke forveksles med Ravfunds oplysning om mere end 400 målepunkter; ikke alle målepunkter behøver være et selvstændigt synligt stedikon.

De to violette popups var:

- **Birkemose Strand:** østlig vind 8,4 m/s, kystretning 95° og efter indlæsning vestlig strøm 0,3 m/s;
- **Bukkemose Strand:** østlig vind 9,8 m/s, kystretning 104°; strømfeltet var endnu ikke indlæst i det aflæste popupøjeblik.

Birkemose passer direkte til Ravfunds længere violetforklaring: vinden matcher kysten, mens strømmen går modsat. Observationen passer dårligere til dialogens kortere forklaring, som kun nævner for kraftig vind.

### RavRadars aktuelle top fem

| Nr. | Waders | Områdescore | Strand | Områdescore |
|---:|---|---:|---|---:|
| 1 | Lønstrup og Nørlev | 76 | Falster øst og Pomlenakke | 76 |
| 2 | Langeland vest og Ristinge | 72 | Lønstrup og Nørlev | 76 |
| 3 | Falster øst og Pomlenakke | 64 | Langeland vest og Ristinge | 72 |
| 4 | Hals og Nordmandshage | 62 | Fanø nord og Nordby | 64 |
| 5 | Lyngby og Lodbjerg | 61 | Grenen og Skagen øst | 62 |

Toplisterne ser umiddelbart meget forskellige ud, men den direkte sted-til-zone-sammenligning viser større enighed end top fem alene.

### Samme aktuelle steder i RavRadar

`H/T/R` betyder søgeforhold, transport og rav i bevægelse ved snapshotets aktuelle time.

| Ravudsigten | RavRadar-match | Sikkerhed | Waders | Strand | H/T/R | Foreløbig læsning |
|---|---|---|---:|---:|---|---|
| Danzigmann | Læsø øst og syd | høj | 52 | 52 | 99/80/2 | Begge ser indtransport; RavRadar ser næsten ingen mobilisering. |
| Jegens Strand | Læsø øst og syd | høj | 52 | 52 | 99/80/2 | Samme RavRadar-zone som Danzigmann; to Ravudsigten-punkter bliver ét zonematch. |
| Tårnby Strand | Amager Strand og Dragør | middel | 60 | 62 | 84/97/8 | Bred enighed om stærk transport, men lav mobilisering. |
| Hirtshals | Tornby og Hirtshals | høj | 23 | 24 | 99/0/26 | Klar modeluenighed: RavRadar ser ingen indtransport og kun svag mobilisering. |
| Skagen fyr | Grenen og Skagen øst | høj | 61 | 62 | 99/96/6 | Bred enighed om stedet; RavRadar-toplisten for strand indeholder området. |

Fire af de fem Ravudsigten-steder ligger således i RavRadar på 52–62 point. Hirtshals er den store aktuelle afvigelse. RavRadar-toplisten udelader nogle af de ellers rimelige match, fordi den er en national rangering med områdestøtte, mens Ravudsigten viser fem steder i samme grønne kategori.

## Snapshot 001 – femdøgnsdata

### RavRadars nationale top fem pr. dag – waders

| Lokal dato | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 27. aug. | Lyngby/Lodbjerg 81 kl. 14 | Lønstrup/Nørlev 76 nu | Langeland/Ristinge 72 nu | Skagen øst 71 kl. 17 | Hals/Nordmandshage 71 kl. 16 |
| 28. aug. | Fornæs/Grenaa 94 kl. 21 | Skagen øst 93 kl. 01 | Hals/Nordmandshage 88 kl. 01 | Asaa/Melholt 86 kl. 21 | Falster øst 84 kl. 16 |
| 29. aug. | Lyngby/Lodbjerg 94 kl. 01 | Fornæs/Grenaa 93 kl. 02 | Skagen øst 92 kl. 02 | Hals/Nordmandshage 87 kl. 02 | Asaa/Melholt 83 kl. 02 |
| 30. aug. | Lyngby/Lodbjerg 91 kl. 09 | Tornby/Hirtshals 90 kl. 11 | Skagen øst 87 kl. 03 | Hals/Nordmandshage 82 kl. 02 | Agger/Krik 79 kl. 06 |
| 31. aug. | Tornby/Hirtshals 88 kl. 02 | Skagen øst 83 kl. 02 | Høve/Gudmindrup 81 kl. 07 | Hals/Nordmandshage 78 kl. 02 | Blåvand/Hvidbjerg 78 kl. 02 |

### RavRadars nationale top fem pr. dag – strand

| Lokal dato | 1 | 2 | 3 | 4 | 5 |
|---|---|---|---|---|---|
| 27. aug. | Lyngby/Lodbjerg 82 kl. 14 | Fornæs/Grenaa 82 kl. 00 | Falster øst 80 kl. 23 | Hals/Nordmandshage 78 kl. 01 | Lønstrup/Nørlev 76 nu |
| 28. aug. | Fornæs/Grenaa 94 kl. 01 | Skagen øst 93 kl. 01 | Hals/Nordmandshage 88 kl. 21 | Asaa/Melholt 86 kl. 21 | Falster øst 84 kl. 18 |
| 29. aug. | Lyngby/Lodbjerg 94 kl. 01 | Fornæs/Grenaa 93 kl. 02 | Skagen øst 92 kl. 02 | Hals/Nordmandshage 87 kl. 02 | Asaa/Melholt 83 kl. 02 |
| 30. aug. | Lyngby/Lodbjerg 91 kl. 06 | Tornby/Hirtshals 89 kl. 07 | Skagen øst 87 kl. 02 | Hals/Nordmandshage 82 kl. 02 | Agger/Krik 79 kl. 05 |
| 31. aug. | Tornby/Hirtshals 88 kl. 02 | Skagen øst 83 kl. 02 | Høve/Gudmindrup 81 kl. 06 | Hals/Nordmandshage 79 kl. 02 | Blåvand/Hvidbjerg 78 kl. 02 |

De to søgemåder vælger næsten de samme områder i dette vejrvindue. De vigtigste forskelle er klokkeslæt og enkelte point. Det er et snapshotfund, ikke en generel regel.

### Ravudsigtens femdøgnssignaler

- **28. august, grøn:** Faxe Ladeplads.
- **29. august, grøn:** Egholm Vest, Grønhøj Strand, Henne Strand, Hyldtofte Østersøbad, `Lidl Strand`, Rødbyhavn, Skiveren Strand, Slettestrand, Thorup Strand og Vejers Strand.
- **29. august, gul:** Bakkebølle Strand, Horne Næs og Reersø.
- **30. august, grøn:** Sillerslev og Vallensbæk Strand.
- **30. august, gul:** Faaborg.
- **31. august og 1. september:** ingen grønne eller gule steder i den viste tabel.

`Lidl Strand` vurderes foreløbigt som en mulig navnefejl for **Lild Strand**. Match og konklusion står derfor med middel sikkerhed.

### Alle Ravudsigten-signaler koblet til RavRadar

RavRadar-kolonnen viser dagens bedste `waders/strand`-score og lokalt klokkeslæt. H/T/R er waderskomponenterne ved wadersdagens bedste tidspunkt.

| Dato | Ravudsigten | Farve | RavRadar-match | Sikkerhed | RavRadar w/s | H/T/R | Forklaring på forskellen eller enigheden |
|---|---|---|---|---|---:|---|---|
| 28. aug. | Faxe Ladeplads | grøn | Rødvig og Faxe Ladeplads | høj | 35/35 kl. 18 | 96/0/72 | RavRadar ser stærk bevægelse, men ingen indtransport. |
| 29. aug. | Egholm Vest | grøn | Aalborg vest og Egholm | høj | utilgængelig | – | 0/6 kystdele har komplet nødvendigt strømforløb; forskellen er først en availability-forskel. |
| 29. aug. | Grønhøj Strand | grøn | Saltum og Grønhøj | høj | 34/34 kl. 18 | 95/8/50 | Let at søge, men svag transport. |
| 29. aug. | Henne Strand | grøn | Henne Strand og Grærup | høj | 29 kl. 20 / 32 kl. 16 | 68/4/60 | Nogen bevægelse, næsten ingen transport. |
| 29. aug. | Hyldtofte Østersøbad | grøn | Lolland syd og Hyllekrog | middel | 63/63 kl. 00 | 99/96/9 | Tydelig enighed om transport; RavRadar ser lav mobilisering. |
| 29. aug. | `Lidl`/Lild Strand | grøn | Vigsø og Lild Strand | middel | 39/39 kl. 00 | 99/22/33 | Muligt navnematch; RavRadar ser kun begrænset transport og bevægelse. |
| 29. aug. | Rødbyhavn | grøn | Lolland sydvest og Kramnitse | middel | 23 kl. 01 / 24 kl. 18 | 100/0/22 | Klar forskel: ingen RavRadar-transport. |
| 29. aug. | Skiveren Strand | grøn | Tversted og Skiveren | høj | 60/61 kl. 00 | 99/67/29 | Bred enighed; RavRadar ser både transport og nogen bevægelse. |
| 29. aug. | Slettestrand | grøn | Slettestrand og Svinkløv | høj | 26 kl. 22 / 26 kl. 21 | 96/0/37 | Klar forskel: ingen RavRadar-transport. |
| 29. aug. | Thorup Strand | grøn | Bulbjerg og Thorup Strand | høj | 41/41 kl. 18 | 96/20/50 | Delvis enighed; RavRadar ser nogen bevægelse, men begrænset transport. |
| 29. aug. | Vejers Strand | grøn | Vejers og Børsmose | høj | 35 kl. 11 / 37 kl. 12 | 64/9/73 | Høj bevægelse, men svag transport og vanskeligere wadersforhold. |
| 29. aug. | Bakkebølle Strand | gul | Bøgestrømmen vest | middel | 61/61 kl. 01 | 100/97/5 | Meget interessant delvis enighed: begge signalerer indtransport, mens RavRadar ser næsten ingen mobilisering. |
| 29. aug. | Horne Næs | gul | Horne Land og Bøjden | høj | 45 kl. 22 / 51 kl. 23 | 64/33/53 | Begge kan læses som et mellemstadie; strand er mere anvendelig end waders. |
| 29. aug. | Reersø | gul | Reersø og Mullerup | høj | 27 kl. 01 / 29 kl. 16 | 100/4/28 | RavRadar ser næsten ingen indtransport trods gult signal. |
| 30. aug. | Sillerslev | grøn | Mors syd og Nykøbing | høj | 24/24 kl. 16 | 99/11/5 | Klar forskel: meget lidt transport og bevægelse i RavRadar. |
| 30. aug. | Vallensbæk Strand | grøn | Køge Bugt nord | høj | utilgængelig | – | 6/7 kystdele er beregnelige; hele zonen er ærligt utilgængelig på grund af manglende strømforløb i én del. |
| 30. aug. | Faaborg | gul | Faaborg og Dyreborg | høj | 28 kl. 21 / 29 kl. 00 | 96/0/45 | RavRadar ser bevægelse, men ingen indtransport. |

Kvantitativt første snapshot:

- de 13 fremtidige grønne Ravudsigten-signaler gav to RavRadar-dagsmaksima på mindst 60, ni på 23–41 og to utilgængelige zoner;
- de fire gule signaler gav RavRadar-dagsmaksima på 61, 45/51, 27/29 og 28/29;
- gul hos Ravudsigten kan derfor i dette snapshot både falde sammen med meget stærk RavRadar-transport og med næsten ingen RavRadar-transport;
- ét snapshot kan ikke afgøre, om forskellen skyldes model, stedmatch, datakilde, timing eller en fejl.

## Hvorfor kan resultaterne være forskellige?

### 1. Tjenesterne svarer på forskellige spørgsmål – bekræftet

Ravudsigten beskriver en tilstand for ravet: i området, på vej ind eller ringe mulighed. RavRadar beskriver en beregnet mulighed for at lede ved en bestemt kyststrækning og søgemåde. Et sted kan derfor være grønt hos Ravudsigten, selv om RavRadar vurderer, at ravet ikke aktuelt bliver mobiliseret eller transporteret godt nok til en høj score.

### 2. Kategorifarve mod kontinuerlig score og national rangering – bekræftet

Ravudsigtens fem grønne steder ser ud som en kategoriliste. RavRadars top fem er en konkurrence mellem hele landets områder og bruger støtte fra flere kyststrækninger. Et RavRadar-område på cirka 60 kan derfor mangle i top fem uden at være dårligt. Det forklarer især Tårnby/Amager og delvist Skagen.

### 3. Forskellig historiklængde – bekræftet som designforskel, virkning uafklaret

Ravudsigten oplyser 180 dages gemt vejrhistorik. RavRadar kræver 48 timers sammenhængende transportbevis og bruger en 48-timers mobiliseringstilstand. En lang historik kan gøre Ravudsigten mere vedholdende, mens RavRadar reagerer stærkere på det dokumenterede nyere forløb. Vi kender ikke Ravudsigtens konkrete vægtning af de 180 dage.

### 4. Strøm i forskellige lag og på forskellige punkter – stærk hypotese

Ravudsigten oplyser overflade- og understrøm, men ikke hvilket lag der afgør farven. RavRadar bruger den dybeste gyldige fælles U/V-repræsentation i en verificeret nærliggende vandkolonne. To korrekte datasæt kan derfor vise forskellig retning eller styrke på samme kyst. Hirtshals, Faxe, Rødbyhavn, Slettestrand, Reersø og Faaborg er oplagte steder at følge.

### 5. RavRadars mobilisering er et selvstændigt krav – bekræftet

RavRadar giver 30 % til rav i bevægelse. Danzigmann/Jegens, Tårnby, Skagen, Hyldtofte og Bakkebølle havde stærk transport, men meget lav mobilisering. Hvis Ravudsigten hovedsageligt følger placering eller indtransport, kan den blive grøn/gul tidligere end RavRadar bliver høj.

### 6. Punkt mod zone og lokal kystdel – bekræftet

Et Ravudsigten-punkt kan ramme én strand, mens RavRadar-zonen indeholder flere kystdele med forskellig orientering. Danzigmann og Jegens bliver eksempelvis samme RavRadar-zone, og dagens RavRadar-vinder kan være en anden lokal del end det navngivne sted. Dette er en væsentlig fejlkilde i analysen og registreres altid med match-sikkerhed.

### 7. Forskellig opdateringsrytme og manglende fælles timestamp – bekræftet

Ravfund oplyser femminutters dataindlæsning og beregning 60 gange i timen. RavRadar publicerer normalt hvert kvarter. Ravudsigten viste ikke et synligt datasæt-timestamp. Kortvarige forskelle kan derfor være en tidsforskydning, ikke en modeluenighed. De to Ravfund-oplysninger, femminutters indlæsning og 60 beregninger i timen, beskriver desuden forskellige trin og må ikke blandes til én opdateringsfrekvens.

### 8. Manglende data behandles forskelligt – bekræftet for RavRadar, ukendt for Ravudsigten

Egholm og Vallensbæk var grønne hos Ravudsigten, mens RavRadar var utilgængelig på de matchende datoer. RavRadar stoppede ærligt på manglende sammenhængende strømtimer. Det er ikke en lav prognose, men fravær af tilstrækkeligt bevis. Ravudsigtens tilsvarende missing-kontrakt er ikke offentligt beskrevet detaljeret.

### 9. Søgning i vand og på strand – bekræftet designforskel

Ravudsigten viste ingen separat søgemåde i den aflæste UI. RavRadar beregner waders og strand særskilt. I det første vejrvindue var rangeringen næsten ens, men tider og enkelte scorer var forskellige. I kraftigere vind kan forskellen blive langt større.

### 10. Lokale navne og datakvalitet – mulig forklaring

`Lidl Strand` ligner en fejlskrivning af Lild Strand. Tårnby-, Hyldtofte-, Rødbyhavn- og Bakkebølle-matchene dækker større RavRadar-zoner og er derfor kun middel sikre. En fejlkobling kan ligne modeluenighed. Ingen lav- eller middel-sikker kobling må bruges til modelændring.

## Foreløbige stedkonklusioner

- **Hirtshals nu:** ægte, tydelig outputforskel. RavRadars interne forklaring er transport 0 og bevægelse 26; Ravudsigtens grønne årsag er uafklaret.
- **Skagen nu:** tjenesterne er mere enige end toplisterne viser. RavRadar har stærk transport, men lav mobilisering.
- **Danzigmann/Jegens nu:** samme hovedmønster som Skagen, men lavere RavRadar-score på grund af næsten ingen mobilisering.
- **Faxe 28. august:** forskellen ser ud til at ligge mellem høj bølge-/bevægelsesværdi og manglende indtransport.
- **Hyldtofte og Skiveren 29. august:** de stærkeste fremtidige konvergenser i første snapshot.
- **Bakkebølle 29. august:** det mest lærerige gule signal. Ravudsigten siger på vej ind; RavRadar har transport 97 og bevægelse 5. Det kan være samme proces beskrevet på to måder.
- **Egholm og Vallensbæk:** må ikke bruges som modelduel, før RavRadar har et komplet scoregrundlag.
- **31. august:** stor prognoseforskel. Ravudsigten viser ingen grønne/gule steder, mens RavRadar har høje nationale dagsmaksima ved Hirtshals, Skagen, Odsherred, Hals og Blåvand. Dette skal følges, fordi prognoser kan ændre sig markant inden dagen.

## Løbende måleprotokol

Hvert meningsfuldt snapshot skal mindst registrere:

1. lokalt tidspunkt og synligt/generated timestamp for begge tjenester;
2. RavRadar-version og datasæt-id;
3. RavRadar-top fem for begge søgemåder;
4. Ravudsigtens top fem og alle ikke-røde femdøgnssignaler;
5. geografisk match og sikkerhed;
6. RavRadar-score, bedste tidspunkt og H/T/R-komponenter;
7. om RavRadar er utilgængelig og den almindelige årsagsklasse;
8. ændring siden sidste snapshot: ny, fortsat, opgraderet, nedgraderet eller forsvundet;
9. sandsynlig årsagsfamilie og evidensniveau;
10. eventuelt senere uafhængigt facit uden private data.

Følgende mål beregnes først efter flere snapshots:

- stedmæssigt overlap ved høj-sikre match;
- lead/lag mellem Ravudsigten gul/grøn og RavRadars transport-/scorestigning;
- signalernes varighed og antal skift;
- prognoserevision fra fem døgn til samme dag;
- fejlrate for tilgængelighed, stale UI eller manglende timestamp;
- kalibrering mod uafhængige ture med dokumenteret indsats, også nul-fund, hvis senere godkendt.

## Åbne spørgsmål

- Hvilket af Ravudsigtens to strømlag styrer farven, og hvordan kombineres lagene?
- Hvor meget af de 180 dages historik påvirker dagens farve, og med hvilken aftagning?
- Er grøn en tærskel, en vedvarende tilstand eller en kombination?
- Betyder violet primært forkert/for kraftig strøm eller for kraftig vind i den aktive UI?
- Har Ravudsigten et eksplicit missing-signal, eller fastholdes sidste gyldige tilstand?
- Hvor præcist svarer punktnavnene til RavRadars lokale kystdele?
- Hvilken tjeneste ændrer prognosen først før de store forskelsdage 28., 29. og 31. august?

## Beslutning efter første datasnit

Analysen fortsætter. Der er allerede nyttige proceshypoteser, men ingen evidens for at ændre Candidate G, vægte, tærskler, kystgeometri eller offentlige forklaringer. Første prioritet er gentagne snapshots gennem forskellige vejrregimer og kontrol af forecastrevisionerne frem mod de varslede dage.
