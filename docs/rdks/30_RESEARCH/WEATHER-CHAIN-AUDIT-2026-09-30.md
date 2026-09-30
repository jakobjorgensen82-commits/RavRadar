# Vejrkæden – samlet audit 30. september 2026

Status: analyse og lokal 4.0.519-kandidat. Ingen ny produktion eller
komplethed påstås. DEC-0266 omfatter kun de dokumenterede kontinuitets-
og forecast-I/O-fejl; andre problemer nedenfor forbliver eksplicit åbne.

## Offentlig dækning og sammenligning

Seneste succes er normalrun `36596877513`, offentlig 4.0.510,
dataset `rr-20260929175636-210`, target 29/9 kl. 16 UTC.
673 kystdele × 118 timer = 79.414 par pr. vejrtype.

| Vejrtype | Udfyldt | Mangler | Mulige |
|---|---:|---:|---:|
| Vind | 73.566 | 5.848 | 79.414 |
| Bølger | 79.414 | 0 | 79.414 |
| Havstrøm | 77.133 | 2.281 | 79.414 |
| Vandstand | 69.969 | 9.445 | 79.414 |
| Vandtemperatur | 69.925 | 9.489 | 79.414 |
| Alle fem | 370.007 | 27.063 | 397.070 |

På det præcise fælles 110-timersvindue med forrige pakke steg dækningen
fra 350.866 til 357.392 af 370.150 par: +6.526, nul tab. Det er reel
fremgang på fælles timer, selv om et forskudt helt målrum kan have et
lavere råt totalantal. Hver time udskiftes én time; større forskydning
i en sammenligning er tiden mellem de to sammenlignede targets.

Datadækning er ikke det samme som scoreklarhed. Den offentlige score
er tilgængelig i 71.677/79.414 kystdel-timer pr. jagtmåde. Af 7.737
manglende scorer ligger 6.886 i timerne 96–117. Den første rapporterede
mangel i denne hale er vind i 5.714 tilfælde og direkte havstrøm i
1.172. Havstrøm testes først og kan derfor skjule en samtidig vindmangel;
det er ikke en fuldstændig årsagsfordeling. Parent-zonernes vejr er en
anden 210-zone-serie og må ikke forveksles med scoreinput for 673 dele.

B05-21/23/24 er ikke længere helt tomme: de har 96/96/116 scoretimer.
Baltic leverer 2.172/2.596 direkte havstrømspar til deres 22 kystdele;
424 mangler stadig. AMM15's 9,5°-grænse udpeges ikke som årsag på dette
grundlag, og ændres ikke uden faktiske gyldige native celler.

## Bekræftede fejl og lokal rettelse

- Seneste run `36698472505` fejlede efter leverandørerne ved same-run-
  DMI-havstrømsreplay. Tre kandidatpar havde forskelligt grid, collection
  og celle; ét blev afvist isoleret af uændret replay. Første fulde par
  er ikke bevist. Beskyttet tidligere valg skal bevares ved ubevist
  ændring, ikke forveksles med en ny rekonstruktion af samme gamle data.
- Forecastrestore afviste både base og progress over 256 MiB i tre
  runs. Den autentificerede pakke tillader 768 MiB. Det tabte genbrug
  af parentprognose og EDR-cursor er ikke i sig selv bevis for tab af
  den separat gemte native bulkrotation eller forklaring på alle vindhuller.
- Den historiske recoveryvej brugte ikke alle de samme relevante gemte
  DMI-donorer som prognosevejen. De samles under samme atomiske valg.
  Historisk strøm må kun genbruges med en oprindelig cachekontekst, som
  den uændrede validator godkender for samme punkt/time. Manglende PART
  i den primære cache må ikke alene kassere en sådan historisk donor.
  Ingen syntetisk header må opfindes for at få den godkendt; øvrige
  felter, herunder T+3-vandstandstrend, ændres ikke af dette genbrug.
- Rigtige validators reproducerer en bølgetabsvej: en numerisk retning
  uden matchende kildeattest kunne overtage, før adapteren fjernede den.
  Kontrollen flyttes før kildevalg, både ved forecastrestore og produktion.

DEC-0266 bevarer scorebundle og de fysiske regler. En syntetisk virkelig
fletning af to filer på 566.260.680 byte hver bestod med cirka 220 MiB
peak RSS i den målte hjælpeproces. Det er ikke et bevis for producentens
samlede hukommelse eller de faktiske private pakkers fremtidige størrelse.

## De resterende problemer må ikke blandes sammen

### DMI, vandkolonne og rotation

Den gamle vandkolonneerfaring er relevant, men betyder ikke, at man nu
skal bede om overfladestrøm. DEC-0040 vælger pr. native time nærmeste
gyldige originale vandsøjle og dens dybeste fælles gyldige U/V-lag.
U og V skal tilhøre samme punkt, lag og prognose. Timeinterpolation
stopper ved skift af kildeidentitet. Dette kan efterlade ærlige huller;
der er endnu ikke en målt optælling af, hvor mange aktuelle huller der
skyldes sådanne brud. At vælge et andet, sammenhængende lag alene for
at fylde hullerne ville være en fysisk modelændring, ikke fejloprydning.

De syv særlige Limfjordszoner havde 71/118 vandstandstimer i seneste
pakke mod 103/106 i de øvrige grupper. Sidste fulde DMI-LF-arbejde nåede
48/117 assets. Den faktiske rotation og adminvalgte kilders tidsakse
skal måles; et samlet tomt halefelt beviser ikke en leverandørgrænse.
DMI dokumenterer fem dages DKSS-prognose og 5,5 dages WAM, som også
indeholder 10-m vind. Det eksisterende DMI-wind-tail-spor skal derfor
undersøges før tilføjelse af en ny leverandør.

Kilde: [DMI WAM](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-wave-model-wam).

### Copernicus og Open-Meteo har flere forskellige budgetter

Copernicus-havstrøm har vist reelt bidrag, bl.a. Baltic til de tre
zoner. Copernicus-bølge/vandtemperatur havde derimod nul nye admissioner
i fire målte fulde runs med statiske celle-/maske-/feltfejl og retrybare
transportfejl. Mere tid kan hjælpe transport, men reparerer ikke en
forkert statisk kontrakt. Originale produkter, dybder, masker og
faktiske kystceller skal undersøges særskilt pr. komponent.

| Arbejde | Aktuelt normalt budget | Må ikke forveksles med |
|---|---:|---|
| Copernicus-havstrøm | 1.500 s; udvidet 3.300 s | CP-bølger/temperatur |
| Open-Meteo-havstrøm | 900 s | OM-vind/temperatur |
| CP-bølge/temperatur | 90 s kritisk + 90 s opgradering | Havstrømsbudgettet |
| OM-vind/bølge/temperatur | 90 s samlet | De separate 900 s havstrøm |

Det sidste OM-havstrømsregnskab (61 forespørgsler, tre timeouts, ingen
budgetudløb) viser ikke, at vindbudgettet har overskud. Seneste succes
fik +3.258 vindpar og +669 temperaturpar fra OM-komponentkæden. Den
har 15-s forespørgsler med to retries; komponenter kan være parallelle
inden for én del, men delene gennemgås sekventielt med gemt cursor.
En timeout kan derfor være væsentlig i et samlet 90-s-budget. Faktisk
komponenttid, forsøg, afvisninger og udskudte behov skal måles, før tid
flyttes mellem leverandørerne. De sikre tidlige tællere i 4.0.519 skal
gøre disse fakta tilgængelige, selv om senere replay stopper.

Copernicus Marines WIND-katalog er observationer/nær-realtidsanalyser,
ikke femdøgns fremtidig atmosfærisk vind. Produktets "wind wave" er
bølger, ikke vindstyrke. Direkte ECMWF-open-data er et muligt separat
vindspor, men OM bruger allerede IFS og er derfor ikke nødvendigvis
en uafhængig reserve. Ingen ny leverandør aktiveres af denne analyse.

Kilder: [Copernicus om vindprognoser](https://help.marine.copernicus.eu/en/articles/4707826-availability-of-wind-forecast-products-in-copernicus-marine),
[ECMWF open data](https://www.ecmwf.int/en/forecasts/datasets/open-data),
[Open-Meteo historiske prognoser](https://open-meteo.com/en/docs/historical-forecast-api).

### MET Norway som tidligere aftalt nødkilde

DEC-0068 indeholder aftalen. Den nuværende kode læser dog kun første
Locationforecast-tidspunkt som parent-zonens aktuelle vindreserve;
den fylder ikke en 118-timers kystdelbank. Det er ikke en eksisterende
kontakt, der blot kan slås til for alle scoreinput.

Locationforecast giver 10-m vind og FROM-retning. Kort nordisk horisont
er MEPS, omtrent 0–60 timer/timeopløsning; senere ECMWF-ensembledata
har grovere tidsopløsning. En senere seks-timersserie må ikke udgives
som 118 oprindelige timeværdier uden en aftalt aflednings-/proveniensregel.
Den er en reel kandidat til nødforsyning af vind, ikke bevist komplet
time-for-time dækning af de 673 danske kystdele.

Oceanforecast har overfladetemperatur samt overfladenær strøm og bølger,
men det dokumenterede API har ikke bølgeperiode, som vores bølgetuple
kræver. Strøm kan ikke udgives som vores dybeste fælles U/V-lag. MET's
GRIB-strøm er særskilt dokumenteret ved 3 m, heller ikke samme kontrakt.
Overfladetemperatur er derimod semantisk relevant som nødkandidat.
Oceanforecast kan flytte et forespurgt punkt til en havcelle; faktisk
returneret position, afstand og dansk dækning skal valideres. Tidalwater
er udvalgte norske havne og beviser ikke brugbar dansk vandstandsreserve.

Inden eventuel integration kræves identificerende User-Agent,
HTTP-cache/Expires/Last-Modified/If-Modified-Since, begrænset og rolig
trafik, afrundede forespørgselskoordinater efter leverandørens regler,
attribution samt en eksplicit reserveprioritet. Retrieval/updated_at er
ikke automatisk en dokumenteret modelkørsel og må ikke bruges til at
omgå 96-timersreglen.

Kilder: [Locationforecast datamodel](https://api.met.no/doc/locationforecast/datamodel),
[Oceanforecast datamodel](https://docs.api.met.no/doc/oceanforecast/datamodel.html),
[GRIB-filer](https://api.met.no/weatherapi/gribfiles/1.1/documentation),
[Tidalwater](https://api.met.no/weatherapi/tidalwater/1.1/documentation),
[MET-vilkår](https://api.met.no/doc/TermsOfService).

### Historik, pakning og selvkørende drift

Fire vellykkede runs (`36502517098`, `36521120303`, `36542029836`,
`36596877513`) videreførte alle 673 states, med nul cold/migration/replay-
fejl. Der er således ikke bevis for en generel nulstilling hver gang.
Ved H0 havde 621/673 dele 48/48 strømhistorik, men alle 673 stadig
ufuldstændig bølgehistorik. Den konservative bølgemodel husker ukendt
tid længere, op til 288 timer. Den private `lastUnknownAt` og årsag
skal aggregeres for at skelne oprindelig opstart fra senere huller.
48/48 strøm må ikke beskrives som fuld historik for alle vejrtyper.

Sidste målte centrale bygning tog cirka 45m19s, heraf 23m56s til
offentlige artifacts. Der er gentaget arbejde, men ejeren ønsker ingen
risikabel hastighedsændring, hvis firetimersvedligeholdelse kan følge med.
Før optimering kræves profilering og identisk outputbevis. Et stort
oneoff kan ikke hente fremtidige, endnu uudgivne prognoser én gang for
alle og løser ikke forkert admission/restore/transport.

Progressionspakken har 768 MiB samlet rågrænse og 384 MiB cipherloft.
Slutpakke har særskilt 768 MiB pr. fil, 2 GiB råsum og 350 MB samlet
arkiv. Seneste mislykkede run gemte krypteret fremdrift, hvilket viser
at den aktuelle progresspakke passede; eksakt råsum og fremtidig margen
er ikke målt. Slutarkivets envelope-streng er et særskilt latent loft.
Næste kontrol skal læse autentificerede eksisterende metadata/input,
uden leverandørhentning eller ny cachebygning. Ingen Free-garanti gives
uden R2- og Supabase-forbrug for en målt driftsperiode.

## Ekstra tværgående gennemgang – 30/9 eftermiddag

Ejeren bad om alternative ruter og hidtil uovervejede fejlgrene. Derfor
er kontrollen udvidet fra hovedfejlen til kontrakterne mellem lagene:

| Grænse | Reproduceret eller verificeret fund | Afgrænsning |
|---|---|---|
| Historik → offentlig prognose | Den gamle PART-projektion kunne afvise historisk gyldig havstrøm, fordi alene den aktive caches header blev brugt | Lokal kandidat bruger original, gyldig kontekst også i den faktiske offentlige scorersti. Punktaktivering må stadig ikke genbruge gammel kontekst. Andre fire familier og T+3-trend ændres ikke |
| Implementering → GitHub-test | Flere nye regressionstests var ikke nåelige fra den egentlige sourceplan | Koblet ind i eksisterende grupper; en reachability-test kræver hver relevant test præcis én gang. De 47 kommandogrupper og den fulde 54-blads artifactgate bevares |
| Ældre alternativ restore | Den historiske, identitetslåste paired-recoveryvej kunne fortsætte efter afvist DMI-forecast | Skal stoppe før installation, ligesom normal og kort restore. Det er ikke forklaring på seneste runs, der ikke bruger denne vej |
| OM-bank → runtime → næste request | Syntetisk positiv bølgeperiode kan afrundes til nul; banken kalder rækken udfyldt, men runtime kan ikke bruge den, og næste request springes over | Reproduceret med de faktiske kald. Produktionsomfang ukendt. Afhjælp kun fysisk ubrugelige, originalt autentificerede tupler; bevar første gyldige værdi ved ukendt modelalder |
| R2-publicering → oprydning | Best-effort-oprydningsfejl blev talt internt, men ikke vist i CLI-resultatet | Lokal kandidat viser faste tællere. Det er ikke automatisk oprydning af tidligere efterladte generationer |
| Færdig bygning → central gemning | Krypteret Actions-artifact gemmes før CAS, men kun ét døgn; den særskilte præ-CAS-genoptagelsesworkflow er låst til et historisk run | Generel genoptagelse af en ny præ-CAS-fejl er fortsat åben. Den centrale terminal-recovery dækker en anden, senere grænse |
| Slot → genkørsel | Watchdoggens slotdetektion bruger oprindelig created_at, ikke en senere attempts starttid | Et genkørt gammelt run kan derfor overses som samme-slot-forsøg. Ingen bevist overlap; den globale lås består. Scheduler ændres ikke i denne rettelse |

Copernicus-komponentkæden genvaliderer derimod originale bytes og
spatial admission både før request-skip og ved slutprojektion. Dårlige
originaler kan frigives til retry. Der er ikke reproduceret samme bank-
blokering som i OM-bølgeeksemplet. OM-havstrømsbanken er også en anden
kontrakt end scalar-banken; resultaterne må ikke generaliseres til alle
reservekilder eller alle manglende felter.

Den efterfølgende uafhængige integrationstest fandt også, at ren
udeladelse af en ubrugelig OM-post kunne give et negativt recovered-tal.
Optællingen måler nu nye brugbare sted/time/komponent-felter: ren
retirement giver nul, reel huludfyldning én og erstatning af en allerede
gyldig værdi nul. Det ændrer ingen data- eller prioriteringsregel.

### Kapacitet er også tidsforbrug

En tæt syntetisk DMI-test med 210 zoner, 121 timer og fem komponenters
rigtige kildebeviser gav en zonepost på 1.218.717 byte, 32.409 nøgler og
dybde 8. Postgrænserne er henholdsvis 64 MiB, 250.000 nøgler og dybde 64.
En beslægtet tæt national rundtur på 256.107.731 byte bestod; 250 nested
JSON/hash-prøver og 750 afkortede input blev desuden prøvet. Det er
syntetisk format-/kapacitetsbevis, ikke prognosedækning eller privat
produktionsmargin.

Den første generiske atomicskriver målte 14,21 sekunder ved 188.446.000
kompakte byte mod 1,16 sekunder for den gamle nationale pretty-streng.
Det er en reel mulig tidsregression, ikke noget filgrænsetesten alene
afslører. Normalworkflowet begrænser EDR til højst fire zoneopdateringer
og to afsluttende checkpoints; en antagelse om 210 checkpoints pr. normal
kørsel ville være forkert. Den nye afgrænsede postskrivers samlede tid
skal måles med de samme stage-/strukturkontroller før levering.

Efter rettelse til native JSON-serialisering pr. afgrænset post målte
samme benchmark 5,03 sekunder mod 13,43 sekunder for den første generiske
bounded writer, med identiske 188.446.000 outputbyte. Fuld stageinspektion,
fsync og atomisk installation består. Det er stadig langsommere end den
gamle ubegrænsede nationale streng, men normalforløbet har højst seks
checkpoints, ikke 210. Den reelle >V8-producerprøve skrev 566.244.280 byte
på 11,02 sekunder; samlet prøvepeak var omtrent 210 MiB. Målingerne er
syntetiske og siger ikke, at national cachebygning nu er hurtigere.

Den valgfri historiske remote forecastvej via DMI_DEPLOYED_CACHE_URL
bruger stadig response.json. Ingen aktiv workflow sætter den variabel;
den må ikke beskrives som en allerede moderniseret storfillæser eller
som forklaring på den aktuelle stopfejl.

### Næste produktionsbevis skal være leverandørfrit først

Autentificér aktuel beskyttet baseline og eksakt krypteret fremskridt,
mål rå/envelope/cipher/forecast-størrelser og den faktiske fletning i et
isoleret arbejdsområde. Ingen vejrprovider, ny scoring/cachebygning,
Supabase-/R2-write eller Pages-publicering må indgå i den første audit.
En gammel færdig pakke er ikke automatisk det rigtige grundlag for den
nyere fremdrift: baselinehash og kildekontrakt skal stadig passe. Et
grønt syntetisk replay eller et grønt restore alene beviser ikke fuldt
produktionsreplay eller en færdig offentlig levering.
