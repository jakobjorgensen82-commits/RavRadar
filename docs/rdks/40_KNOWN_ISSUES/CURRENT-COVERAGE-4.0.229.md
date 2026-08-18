# Strømdækning efter semantik v2 – snapshot fra #2855

## Status og fortolkning

### 4.0.232 – Copernicus-cachekvote

- Første planlagte Copernicus-run `#32134686185` hentede et nyt 12:00Z-tidspunkt, men den tidligere 11:00Z-råcache var allerede fortrængt. GitHub API viste cirka 10,2 GB aktiv Actions-cache, domineret af flere DMI-GRIB-nøgler på 2,48–2,52 GB.
- Deduplikering og to-timers merge består syntetisk; fejlen er cache-LRU, ikke datamodellen. En separat restore-only keepalive opdaterer derfor cachens brugstid hvert tiende minut uden credentials, upload eller rå logning. Den manuelle centrale verifikation og den eksakte 11:00Z-genhentning er gennemført nedenfor.
- En råcache-artifact er udtrykkeligt forkastet, fordi repositoryet er offentligt. Den må ikke indføres uden ny eksplicit ejerbeslutning og særskilt sikkerhedsdesign.
- Den manuelle verifikationskæde er nu lukket: #32136328681 ramte 12:00Z-cachen, #32136391556 genhentede 11:00Z og producerede 1.258 records/to tider med nul grid-/lagskift, og #32136642330 ramte den nye cache. Issue forbliver åbent kun for første automatiske keepalive-event og efterfølgende naturlig time under fortsat kvotepres.
- Selve retentionkoden er nu lukket med en normal release-regression: præcis 168 timer bevares, ældre/fremtidige eller beskadigede restoreposter genbruges ikke, dubletter samles, og nye poster uden gyldigt lokalt samme-tid/celle/lag-U/V-bevis stopper lukket. Det åbne driftsbevis er stadig første naturlige fulde syvdøgnsvindue under cachepres.
- `#32143798560` CI-verificerede regressionen i normal produktionsvalidering og stoppede først bagefter på den tilsigtede 622/673-gate. Cache-API'en viste fortsat `copernicus-current-shadow-v1-32141772134-1` efter kørslen. Det lukker kode-/integrationsdelen, men ikke det naturlige syvdøgnsvindue.

Dette er et uforanderligt handlingssnapshot fra GitHub Actions #31923212215/#2855, genereret 16. august 2026 kl. 03:21 UTC på commit `a24a13d87de379eef0b2bab5a5d6b1c7a2ae4548`.

- 187/210 hovedzoner har verificeret fælles DMI-U/V inden for 5 km.
- 596/673 lokale kystdele har samme bevis; 77 dele i 32 zoner mangler.
- 20.924 forecasttimer er verificerede; 3.856 er `non-dmi-current` og dermed `null`.
- Uverificerede poster får hverken strømværdi, scoreinput eller pil.
- Alternative aktive DMI-modelområder gav ikke et gyldigt fælles U/V-punkt inden for 5 km for de 23 hovedzoneankre.
- Listen er arbejdsgrundlag for ejerens punktreview, ikke tilladelse til automatisk at flytte centrale land-/vandpunkter.

## Senere rotationsbevis og målrettet ejerdiagnostik

### Korrigeret evidens fra #2872 og konsekvens for 4.0.230

- #31929171918/#2872 fortsatte til cursor 240 med 873 private prøver for 469 ankre/179 kystdele. Coverage-auditten havde besøgt 60 dele i alt og 36 af de 77 offentlige mangler; 41 manglede fortsat første besøg.
- Blandt de 36 besøgte offentlige mangler havde én faktisk et eksakt fælles U/V-punkt inden for 5 km, fire lå ved 5–6 km, fem ved 6–8 km, 23 over 8 km og tre havde intet observeret fælles U/V-par. Den tidligere formulering om, at alle 77 var geografiske mangler, er dermed forkastet.
- Inden-for-5-km-posten er Havknude (`dk-b06-06-national-part-01`, DK-B06-06): centralt vandpunkt 10,8679278/56,2998934; nærmeste fælles `dkss_nsbs`-U/V-celle 10,8751453/56,2750000; afstand 2,80363 km; dybeste gyldige lag `depthBelowSea:17` ved den målte tid.
- Den offentlige v2-cache havde valgt `dkss_idw` til skalare marinefelter ved 10,95108/56,299 og afstand 5,131 km. Den globale modelprioritet lod dette skalarvalg blokere den nærmere NSBS-strøm. Det var en pipeline-/udvælgelsesfejl, ikke et dårligt Havknude-vandpunkt.
- 4.0.230 adskiller valgene: strøm sammenlignes pr. native tid på tværs af alle DKSS-collections, mens skalarfelter beholder deres eget valg. Havknude må først flyttes fra pipelineklassen efter frisk parser-v18/semantik-v3-produktionsbevis; ingen punktflytning er nødvendig eller autoriseret af fundet.
- #2872-ejeroversigten indeholder fortsat ingen rå `uMps`/`vMps`. Offentlig v2-dækning var uændret 187/210 hovedzoner og 596/673 lokale dele, og gaten stoppede før Supabase/Pages.

| Klasse | Zone | Kystdel | Nærmeste U/V-kolonne |
|---|---|---|---:|
| Pipelinefejl ≤5 km | DK-B06-06 | Havknude | 2,804 km (`dkss_nsbs`, lag 17) |
| Nær-tærskel 5–6 km | DK-B05-22 | Gjøl | 5,301 km |
| Nær-tærskel 5–6 km | DK-B02-10 | Skellet | 5,938 km |

De to øvrige nær-tærskelposter er Aggersborgrimme 5,370 km og Nibe Badestrand 5,661 km. Den samlede #2872-fordeling – ikke den tidligere #2869-delfordeling – er nu det gældende rotationssnapshot.

- #2866 på commit `f661913c4e51e64876dc68ef6bf8f6cbafbe1109` fortsatte den private rotation til cursor 150, 118 besøgte kystdele og 667 prøver. Den offentlige dækning var fortsat 187/210 og 596/673, og deploy stoppede før Supabase/Pages.
- 17 af de 23 manglende hovedzoner har mindst én lokal kystdel med verificeret strøm og dermed et fysisk referencepunkt til ejerens optiske hovedpunktsreview. Seks zoner har ingen verificeret lokal del: `DK-B02-03`, `DK-B05-20`, `DK-B05-23`, `DK-B05-24`, `DK-B05-25` og `DK-B07-13`. En flytning af hovedpunktet alene kan derfor ikke løse deres lokale dækning.
- Den private rotation måler afstanden til den nærmeste eksakte fælles U/V-kolonne, også over 5 km, men gemmer ingen fjerne U/V-værdier. `data/diagnostics/current-coverage-owner-audit.json` er support-only og opdeler de 77 dele i endnu ikke besøgt, intet observeret U/V-par, pipelinehul inden for 5 km, nær-tærskel 5–6 km til rent manuelt geometrireview, modelhul 6–8 km eller strukturelt modelhul over 8 km.
- #31928382898/#2869 besøgte de næste 15 dele. Fire havde U/V inden for 5 km; blandt de 11 aktuelle mangler lå 2 ved 5,37–5,66 km, 4 ved 7,80–7,93 km og 5 ved 8,26–12,11 km. De sidste 66 mangler er endnu ikke besøgt af den nye audit. Ejerfilens 64.156 byte indeholder hverken `uMps` eller `vMps`; offentlig dækning forblev 187/210 og 596/673.
- Ingen klassifikation flytter punkter automatisk. Selv 5–6 km-nær-tærskel må kun føre til en ejerrettelse, hvis punktet i sig selv er fysisk forkert. Fra 6 km og opefter er afstanden for stor til en ren tærskeljustering og må ikke skjules ved at flytte et korrekt kystpunkt.

| Klasse | Zone | Kystdel | Nærmeste U/V-kolonne |
|---|---|---|---:|
| Nær-tærskel 5–6 km | DK-B05-18 | Aggersborgrimme | 5,370 km |
| Nær-tærskel 5–6 km | DK-B05-21 | Nibe Badestrand | 5,661 km |
| Modelhul 6–8 km | DK-B05-18 | Løgstør | 7,934 km |
| Modelhul 6–8 km | DK-B05-18 | Petersborg | 7,846 km |
| Modelhul 6–8 km | DK-B05-21 | Klosterholm | 7,892 km |
| Modelhul 6–8 km | DK-B05-21 | Binderup Mølle | 7,799 km |
| Strukturelt modelhul >8 km | DK-B05-20 | DK-B05-20 | 12,110 km |
| Strukturelt modelhul >8 km | DK-B05-21 | Lundbæk Huse | 9,815 km |
| Strukturelt modelhul >8 km | DK-B05-21 | Nibe | 8,262 km |
| Strukturelt modelhul >8 km | DK-B05-21 | Valsted | 9,786 km |
| Strukturelt modelhul >8 km | DK-B05-21 | Sebbersund | 9,800 km |

## Hovedzoner uden verificeret strøm

| ID | Zone |
|---|---|
| DK-B01-20 | Grenen og Skagen øst |
| DK-B02-02 | Napstjert og Jerup |
| DK-B02-03 | Bratten og Strandby |
| DK-B02-04 | Frederikshavn og Bangsbo |
| DK-B02-07 | Asaa og Melholt |
| DK-B05-10 | Thisted og Vildsund |
| DK-B05-17 | Fur syd |
| DK-B05-20 | Nibe Bredning vest |
| DK-B05-22 | Gjøl og Attrup |
| DK-B05-23 | Aalborg vest og Egholm |
| DK-B05-24 | Aalborg øst og Nørresundby |
| DK-B05-25 | Hals Barre og Egense |
| DK-B06-07 | Jernhatten og Rugård |
| DK-B06-12 | Kalø og Følle |
| DK-B06-14 | Aarhus nord og Egå |
| DK-B07-12 | Tårup og Kongshøj |
| DK-B07-13 | Lundeborg og Elsehoved |
| DK-B07-14 | Thurø og Smørmosen |
| DK-B07-15 | Svendborg og Christiansminde |
| DK-B07-17 | Langeland nord og Lohals |
| DK-B08-19 | Ålsgårde og Helsingør |
| DK-B10-06 | Falster nord og Orehoved |
| DK-B12-01 | Kolding Fjord og Løverodde |

## Lokale kystdele – berørte zoner

Kolonnen viser `manglende dele / alle dele i zonen`. De individuelle del-ID'er, navne og vandpunkter ligger i #2855-supportartifactets offentlige runtime- og auditfiler; dette permanente indeks bruges til triage.

| Zone-ID | Zone | Mangler |
|---|---|---:|
| DK-B01-20 | Grenen og Skagen øst | 1/2 |
| DK-B02-03 | Bratten og Strandby | 2/2 |
| DK-B02-04 | Frederikshavn og Bangsbo | 1/7 |
| DK-B02-08 | Hou og Bisnap | 1/6 |
| DK-B02-09 | Hals og Nordmandshage | 1/2 |
| DK-B02-10 | Egense og Mou | 5/5 |
| DK-B03-04 | Thorsminde og Husby Klit | 4/4 |
| DK-B05-12 | Mors vest og Ejerslev | 1/5 |
| DK-B05-17 | Fur syd | 3/4 |
| DK-B05-18 | Løgstør og Aggersund | 3/5 |
| DK-B05-20 | Nibe Bredning vest | 1/1 |
| DK-B05-21 | Nibe og Sebbersund | 7/7 |
| DK-B05-22 | Gjøl og Attrup | 4/5 |
| DK-B05-23 | Aalborg vest og Egholm | 6/6 |
| DK-B05-24 | Aalborg øst og Nørresundby | 9/9 |
| DK-B05-25 | Hals Barre og Egense | 5/5 |
| DK-B06-06 | Karlby og Glatved | 1/1 |
| DK-B06-13 | Vosnæs og Havhuse | 1/2 |
| DK-B06-17 | Hou og Odderkysten | 1/9 |
| DK-B07-13 | Lundeborg og Elsehoved | 2/2 |
| DK-B07-14 | Thurø og Smørmosen | 1/2 |
| DK-B07-15 | Svendborg og Christiansminde | 4/8 |
| DK-B09-08 | Køge Bugt nord | 1/7 |
| DK-B09-12 | Stevns Klint og Højerup | 2/2 |
| DK-B09-16 | Karrebæksminde og Enø | 1/4 |
| DK-B10-06 | Falster nord og Orehoved | 2/11 |
| DK-B10-11 | Lolland sydøst og Nysted | 2/11 |
| DK-B10-19 | Bornholm nordøst og Gudhjem | 1/4 |
| DK-B10-21 | Bornholm sydøst og Dueodde | 1/3 |
| DK-B10-22 | Bornholm syd og Boderne | 1/2 |
| DK-B12-01 | Kolding Fjord og Løverodde | 1/3 |
| DK-B12-05 | Kruså og Flensborg Fjord nord | 1/2 |

## Næste sikre trin

1. Ejerens centralt gemte punktrettelser er autoritative og genopbygges før næste DMI-sampling.
2. Efter relevante rettelser sammenlignes en frisk kørsel mod dette snapshot; der må ikke genbruges strøm fra et flyttet punkt.
3. Ejeren har nu udtrykkeligt fastholdt fuld geografisk dækning. Den historiske 95 %-deldækningsgate er derfor erstattet af et dynamisk krav om alle aktive kystdele, aktuelt 673/673. En lavere gate må kun genindføres ved en ny udtrykkelig ejerbeslutning; kravet om 100 % dokumentation for hver vist pil ændres aldrig.
