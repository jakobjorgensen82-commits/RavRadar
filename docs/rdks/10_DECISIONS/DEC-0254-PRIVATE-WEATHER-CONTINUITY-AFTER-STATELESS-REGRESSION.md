# DEC-0254 – Ingen normal vejrhentning uden bevaret produktionscache

## Tillæg 2026-09-25 – vælg 11Z, genhent resten, behold 15Z som tabsanker

Implementeringstillæg: Den første exact-head-kontrol af PR #449
afslørede, at de ændrede vejrvalg også er del af den kryptografisk
bundne modelkode. Identiteterne for den aktive model, den inaktive
Candidate G-kompatibilitet og checkpointets continuation-kode er
regenereret. Migration `20260925150000` fører kun den aktuelle
binding videre og bevarer de senere checkpointrettelser. Tidligere
anvendte migrationer og den fysiske scoreformel ændres ikke.

Den nye identitet gør også 11Z/15Z's gamle modelmetadata uforenelige
med den aktuelle læser. Derfor hentes begge kun med deres eksakte
arkivhashes og den verificerede 4.0.487-læser. 11Z's private state
kontrolleres dernæst med den oprindelige 4.0.485-kilde og genbindes
til den aktuelle model. Migreringen skal bevise uændrede vejrmålinger
og Candidate G-state; den må kun ændre identificerede bindingsfelter
og genopbygge den tilsvarende offentlige timepakke. Det gamle
checkpoint gendannes ikke i dette ene forløb: 11Z's verificerede
private conditions indeholder fortsættelsesstaten, og den nye kørsel
bygger et nyt checkpoint. 15Z forbliver på sin oprindelige identitet
og bruges alene til tabsammenligning.

Før normalrun installeres databasebindingen via det afgrænsede
manuelle workflow `apply-weather-model-binding-only.yml`. Det
anvender kun den ene dry-run-verificerede migration og læser den
tilbage; det må ikke gemme checkpoint, ændre privat cachepointer,
kalde vejrleverandører eller deploye Pages. Almindelig code-only
deploy afvises, mens den beskyttede 11Z/15Z-pair stadig er aktiv:
den ville ellers kunne fortrænge 11Z fra pointerens to pladser.

Ejeren bad om at sammenligne en engangssammenfletning, fortsættelse fra
én cache og en helt frisk cache, før der kodes videre. På 92 stadig
fremtidige fælles timer pr. 25/9 kl. 13 UTC har 11Z 72.520 gyldige
feltpar, som 15Z tabte; 15Z har 3.238, som 11Z mangler. 11Z er derfor
det verificerede private udgangspunkt. En tom start ville miste langt
mere og også skade scorehistorik; fuld sammenfletning af to komplette
private runtimegenerationer udvider risiko og tidsforbrug uden
bevist behov.

Kun når den beskyttede pointer fortsat er den kendte 15Z-generation,
skal restore verificere både denne og den eksakte 11Z-forgænger fra
samme pointer. Kun 11Z installeres. 15Z's offentlige timepakke
gendannes særskilt som revisionsanker og må ikke fodre privat score-
eller leverandørstate. Den almindelige kæde må forsøge at genhente
dens unikke gyldige felter. Før ny privat publish eller Pages kræves
nul gyldig→tom mod **begge** ankre på samme fremtidige kystdel,
time og vejrtype. Et mislykket forsøg må bevare den krypterede 11Z-
bundne fremdrift, men ikke udgive en tyndere prognose. Den eksisterende
72-timersgrænse forlænges ikke skjult; ved udløb må recoveryplanen
vurderes på ny.

Efter verificeret privat install skal conditions, DMI-candidate og
DMI-forecast-store kunne læses. En læse-/parsefejl er en reel
fortsættelsesfejl, ikke en tom bootstrap. Vandstand forbliver
DMI-only, den godkendte Limfjord-fastholdelse forbliver uændret,
og 96-timersundtagelsen for andre felter forbliver gældende.

Dette tillæg erstatter den nedenstående enkelt-11Z-fortolkning som
tilstrækkeligt tabsbevis. Lokal kode er endnu ikke merged eller
produktionsverificeret; ingen påstand om komplette vejrdata følger
af denne beslutning.

**Dato:** 2026-09-24
**Status:** Lokal 4.0.488; exact-head og livebevis afventer

Normalrun `36022310055` blev grønt og deployede 15:00 UTC-pakken, men
mistede mange tidligere gyldige vejrpar. Den forrige gemte private
generation var 11:00-pakken fra `35993736090`. Mellemliggende run
`36009816840` stoppede før privat produktionscache blev gemt.
4.0.487 ændrede vejropbyggerens kildebytes, ikke den gemte models
fortsættelses- eller offentlige projektionskontrakt. Den brede hash
afviste både den daværende aktuelle og forrige beskyttede generation.
Normal `integrated` fik alligevel lov at fortsætte uden fuld cache.
En grøn deploy var derfor ikke bevis for tabfri fortsættelse.

På 114 fælles prognosetimer × 673 kystdele fra 11:00 til 15:00 blev
34.885 tidligere gyldige vindpar, 32.646 bølgepar, 530 strømpar,
4.864 vandstandspar og 24.513 temperaturpar tomme. De fem sidste
118-timers-resttal var henholdsvis 42.100, 42.804, 5.740, 69.615
og 54.147 af 79.414. Tallene er offentlige gyldige feltpar på
deres respektive mål; de må ikke forveksles med en leverandørs
arbejdsliste. Cachetab er påvist; de resterende leverandørbarrierer
er stadig særskilte åbne problemer.

Normal drift må nu stoppe før vejrhentning og deploy, hvis ingen
fuld privat runtime er gendannet. Den beskyttede restore må kun
acceptere den eksakte, arkiv- og hashverificerede 4.0.485-generation
fra `cc45e971`, 11:00 UTC og dataset
`rr-20260924122409-210`. Dens tre kontrakthashes er genberegnet fra
den eksakte kilde. Den anden lokale restore bindes til den faktisk
valgte generation med referencetime, datasæt-id og bundlesum; to
generationer kan dele både tid og datasæt-id. Den gamle brede hash
erstattes fremadrettet af en eksplicit lagrings-ABI: kildekodeændringer
alene gør ikke cachen ulæselig. ABI, bundlebytes, filinventar, modelbinding,
fortsættelseskontrakt og offentlig projektionskontrakt verificeres stadig.
En inkompatibel ændring af lagringsformatet kræver ABI-løft og en
udtrykkelig migration, aldrig tavs genstart uden cache.

Før en normal offentlig levering sammenlignes den nye prognose med den
sidst gendannede, beskyttede offentlige timepakke for alle fælles timer,
alle 673 kystdele og vind, bølger, strøm, vandstand og temperatur hver for
sig. Et tidligere gyldigt felt må ikke blive tomt; en ændret kystidentitet
må ikke skjule tab. Fejl stopper offentliggørelse og ny privat
produktionsgeneration, men den hidtil offentlige pakke forbliver i drift.
Dette er en reel dataintegritetsfejl, ikke en kosmetisk testfejl.

DMI's normale budget vælges nu fra den faktisk gendannede 118-timers
PART-cache. Hvis mindst 15 % af kystdelene mangler en DMI-komponent i
mindst 12 timer, får producenten eksisterende afgrænset 60-minutters
recoverybudget og plads til alle seks collections. Små lokale huller
giver ikke alene lange kørsler. Et langt forsøg uden mindst 100 færre
manglende DMI-par på næste planlægningskontrol udløser fire timers pause
for lange forsøg; de normale afgrænsede kørsler fortsætter imens.
Denne tilstand gemmes i den private DMI-cache, så cron ikke behøver
Codex. Vandstand og strøm opgøres særskilt;
bred mangel på DMI-only-vandstand skal give de tre DKSS-familier en
kritisk tur, også når strøm-leddet har en verificeret cache eller den
rådgivende tværleverandørplan er midlertidigt utilgængelig. Kritiske
native tider roterer, så første prognosetimer ikke altid spiser
resten. Copernicus' efterfølgende kvalitetstur roterer spatial shard
og højst 24-timers segment og gentager ikke samme shard i samme tur.
Den ændrer ikke kildebevis eller den godkendte Limfjord-fastholdelse.

Lokal kode og måltests beviser reglerne, ikke at leverandørerne allerede
har leveret et komplet datasæt. Før merge kræves exact-head-kildekontrol
og geodata/version/RDKS-bevis. Derefter skal almindelige, ikke-overlappende
kørsler bevise faktisk cachegenbrug, fremgang pr. vejrtype og leverandør,
gemt næste generation og offentlig prognose. Ved uventet tab eller
stagnation må næste kørsel ikke startes blindt. Cron forbliver pauset
indtil autonom normaldrift er målt; ingen oneoff uden konkret behov.
