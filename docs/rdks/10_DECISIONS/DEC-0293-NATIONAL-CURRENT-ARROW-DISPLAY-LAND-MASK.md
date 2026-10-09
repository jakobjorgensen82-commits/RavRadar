# DEC-0293 – Landsdækkende landkontrol for strømpile

- **Status:** Visningsrettelse produktionsleveret og målrettet browserverificeret; numerisk diagnose åben
- **Ejerordre:** 8. oktober 2026: Rettelsen skal gælde hele landet og også hidtil usete tilfælde.
- **Omfang:** Kortets præsentation, ikke kilders fysiske gyldighed eller RavScore.

## Beslutning

Den fælles pilekalder kontrollerer både hovedzoners og lokale deles blå
strømpile mod et selvstændigt, landsdækkende landpolygonudtræk fra
OpenStreetMaps officielle kystbehandling. Ingen zone- eller stednavneliste
må styre undtagelser. Teststeder er ikke en produktionsregel.

En pil kræver fortsat sin dokumenterede oprindelige position. Genbrugt DMI
er stadig DMI: `dmi-cache` må ikke falde tilbage til administratorens
zonepunkt. En verificeret gitterkildetype uden gyldige koordinater er ikke
et verificeret pilepunkt. Manglende valgte-time-punkter må ikke låne H0.

Den originale modelkoordinat kontrolleres, men flyttes aldrig. Pile på land,
selve kystgrænsen eller uden for maskens dokumenterede dækning vises ikke.
Manglende eller beskadiget maske åbner ikke kontrollen. Vindpile og øvrige
brugerfunktioner fortsætter; vejrdata, provenance, cache, gyldige originaler,
strømhukommelse, prognoser, central routing og scoreformler bevares uændret.
Denne visningsbeslutning er ikke en erklæring om, at en marinemodels grovere
kystmaske, oprindelige U/V eller den valgte strømværdi er ugyldig.

Ejerens opfølgning 8. oktober kræver særskilt kontrol af scoregrundlaget.
Scoren læser ikke den tegnede pil, men pil og score kan bruge samme strømdata.
At landpile skjules, udelukker derfor ikke deres data fra score eller den
eksisterende strømhukommelse. Uændret score er ikke bevis for korrekt score.
Native celle/maskestatus, koordinatafkodning, original kilde, valgt time og
faktisk anvendelse i score og begge strømtilstande skal spores samlet.
Kortets landmaske må ikke alene udløse kildeafvisning, historikreset,
renormalisering eller tab af gyldige originaler. Denne datadiagnose er åben;
visningsleverancen må ikke beskrives som en fuld rettelse af scoregrundlaget.

Masken er en lokal statisk fil med låst SHA-256 og ODbL-kildeangivelse.
Hjemmesiden kontakter ingen ny GIS-tjeneste, og vejrhentningen downloader
eller genberegner ikke masken. Masken indlæses efterfølgende uden at blokere
kort, rangliste eller prognose; blå pile afventer gyldig kystviden. Det
kompakte kystformat bevarer alle ringe og punkter med 1e-7-graders præcision;
hele afrundingsusikkerheden omkring grænsen forbliver ukendt. Administratorens
geometri og land-/vandpunkter ændres ikke.

## Kontrol og grænser

### Fast rapportstørrelse for originaldiagnosen – 9. oktober 2026

Det tredje særskilt godkendte forsøg er gennemført efter bestået præcis kildekontrol, 20 native måltests og sikker integration. Begge faste originalfiler blev gennemgået, men diagnosens rapport overskred sin egen grænse på 64 KiB. Rapporten blev derfor ikke publiceret. Dette er en fejl i diagnoseværktøjets rapportering, ikke dokumentation for ugyldige DMI-data. Alle tre tidligere engangstilladelser er forbrugt; numerisk strømgeografi, strømhukommelse og score er fortsat uafklaret.

Den lokale rettelse opsummerer alle undersøgte strømfelter i to faste komponentoversigter pr. fil. Tællerne omfatter forekomster på tværs af felter og lag, ikke unikke geografiske punkter. Alle afvigelser og de største koordinatforskelle bevares, også i sidste felt. Parring kræver fortsat samme oprindelige gitter, lag og tid; gentagne eller uparrede lag skjules ikke. Hver felttid kontrolleres. Ingen felter springes over for at få rapporten til at passe. Originale værdier, decoder, filgrænser, 4096-feltsgrænse, 120/180-sekundersgrænser og 64-KiB-rapportgrænse er uændrede.

Nitten netfri lokale måltests består. En prøve med 4096 kunstige strømfelter i hver fil giver 3772 bytes rapport og bevarer fejl i sidste felt. Størst tilladte tællere, blandede gitre, tomme celler, ændret sidste felttid og ugyldige tællersammenhænge kontrolleres særskilt. GitHub skal desuden kontrollere to komplette kunstige GRIB-filer med 500 felter gennem den normale analyse, rapportkodning og forældrekontrol. Lokal kontrol er ikke native produktionsbevis eller en faktisk originalrapport.

Ejeren har givet én ny, afgrænset tilladelse til et fjerde skrivefrit forsøg på de samme to filer efter ny præcis GitHub-kontrol og afsluttet aktiv vejrhentning. Engangskontrollen kræver alle tre præcise fejlede forgængere og ét nyt første forsøg på verificeret main; femte forsøg, genkørsel og gamle bekræftelser afvises. Tilladelsen er endnu ikke brugt. Lokal rettelse, PR og kildekontrol kan forberedes under vejrhentningen, men merge og diagnose venter. Ingen annullering, ekstra vejrhentning, data-/score-/historikændring, bindingsændring eller deploy følger af dette arbejde.

### Historik: Diagnosens feltgrænse og tredje særskilte tilladelse – 9. oktober 2026

Det andet, særskilt godkendte originalforsøg er gennemført efter præcis grøn kildekontrol og sikker integration. Begge faste filer blev hentet og identitetskontrolleret. Analysen stoppede ved diagnosens egen grænse på 128 GRIB-felter i NSBS-filen; ingen færdig rapport blev produceret. Dette er en diagnosebegrænsning, ikke dokumentation for fejl i DMI-data. Det første forsøgs præcise fejlårsag kan stadig ikke fastslås. Begge engangstilladelser er forbrugt.

Den lokale rettelse tillader højst 4096 felter i både analysen og rapportkontrollen. De præcise filadresser, størrelser og headerhashes, den uændrede decoder, 120 sekunders analysegrænse, 180 sekunders procesgrænse og højst 64 KiB ufølsom rapport bevares. Hele filen skal være gennemgået; en delrapport må ikke kaldes fuld kontrol. Femten lokale måltests består, herunder strømfelter efter 300 andre felter og bevarede hårde grænser. En rigtig kunstig GRIB-fil med 302 felter skal også bestå i GitHub; lokal kontrol er ikke native eller offentlig leveringsdokumentation.

Ejeren har givet én ny, præcis tilladelse til et tredje skrivefrit forsøg på de samme to filer efter bestået GitHub-kontrol. Engangsreglen kræver begge præcise fejlede forgængere og ét nyt første forsøg på kontrolleret main. Fjerde forsøg, genkørsel, gammel bekræftelse eller ændret forgænger afvises. Ny præcis kildekontrol og sikker integration uden aktiv writer mangler. Der er ikke foretaget en numerisk rettelse, ny vejrhentning, ændring af scorer/historik/cache eller deploy. Kortvisningen er leveret; det samlede strøm- og scoregrundlag er fortsat åbent.

### Historik: Diagnoseprocessens runtime og private fejlkvittering – 9. oktober 2026

Den særskilt godkendte originaldiagnose er forsøgt efter præcis grøn kilde-/native-kontrol og sikker integration uden aktiv writer. Læse-/analyseleddet fejlede uden rapport. Det kan ikke udledes af den begrænsede log, om stoppet skete under download, processtart eller rapportkontrol. Engangstilladelsen er forbrugt; ingen automatisk gentagelse eller nye providerlæsninger. Kortrettelsen er leveret, men numerisk strømgeografi, historik, strømhukommelse og score er fortsat åbne.

En ny lokal prøve går gennem den faktiske private Python-proces med kunstige filer og blokeret netværk. Den viste, at runtime-indstillingen for delte biblioteker blev fjernet. Den lokale rettelse bevarer denne eksisterende runtime-indstilling, men ingen credentials. Hele kaldet samt syv fejlforløb består lokalt. Faste, ufølsomme fase-/fejlkoder erstatter den anonyme fejl; rå stderr, koordinater og strømværdier offentliggøres ikke. Første fejl bevares ved oprydningsfejl, og succes meldes først efter oprydning.

Den første præcise kilde-CI består. Den kunstige Linux-prøve viser, at både det gamle og det rettede procesmiljø kan gennemføre en native start. Den fjernede runtime-indstilling er derfor ikke dokumenteret som originalstoppets årsag. Diagnosen returnerer nu kun faste kilde-/fejlkoder ved kendte analysefejl; ukendt, for stor eller tvetydig bibliotekstekst forbliver skjult.

Ejeren har efter fejlen givet en ny, præcis tilladelse til én yderligere skrivefri diagnose af de samme to filer. Den nye engangskontrol kræver præcis den kendte fejlede forgænger og ét nyt første forsøg på verificeret main. Ændret forgænger, tredje forsøg, genkørsel og gammel bekræftelse afvises. Den faktiske workflow-skal afprøves med kunstige kørselskvitteringer i Linux-kildekontrollen. Den udvidede kode kræver sin egen nye præcise kilde-CI før merge og diagnose. Decoderen, filadresserne, datagrænser og produktionsdata er uændrede. Ingen numerisk rettelse, ekstra vejrhentning, bindingsændring eller deploy udføres her.

Følgende forberedelsesstatus er historisk; engangsdiagnosen er nu forsøgt.

Opfølgning 9. oktober: Ejeren har godkendt én skrivefri GitHub-diagnose af præcis to allerede identificerede DMI-filer. Der må ikke hentes andre filer eller gentages efter fejl. Den eksisterende låste decoder fra verificeret main læser originale strømfelter; kandidatindeks, koordinater, værdimatch samt parring af samme gitter, lag og tid kontrolleres uden at eksponere rå strømværdier. En særskilt kontrol sammenholder decoderens koordinater med de deklarerede endepunkter. Det er ikke en produktionsrettelse eller bevis for korrekt score.

Diagnosen har læserettigheder, ingen produktionshemmeligheder, samme eksklusive kø som vejrhentningen og kræver præcis grøn kilde-CI. Den accepterer kun første forsøg og første dispatch, faste filadresser, størrelser og allerede læste headerhashes. Decoderen arbejder i privat midlertidigt område; kun en strengt feltkontrolleret, størrelsesbegrænset rapport kan uploades. Ingen cache, produktionsdata, geometri, kildevalg, historik, strømhukommelse, scoreformel, binding eller deploy ændres.

Ti lokale måltests består uden providerdata. Afvigelser tælles særskilt for alle gitterceller, gyldige strømværdier og de faktiske afprøvede kandidater. Manglende værdier må ikke frikende eller belaste de gyldige data; gyldig nulstrøm bevares. En ekstra kunstig native GRIB-prøve er koblet til den normale PR-kontrol og skal bestå før originalerne læses. Ny præcis kilde-CI, sikker integration uden aktiv writer og faktisk diagnose mangler stadig. Den tidligere anden pakkediagnose er allerede gennemført; dens tilladelse er forbrugt og kan ikke genbruges. Den store revision, numerisk kildeårsag, brugerdata, Spørg RavRadar og selvstændig drift er fortsat åbne.

Opfølgning 8. oktober sent om aftenen: Den første godkendte originaldiagnose
er nu udført efter sin præcise kilde-CI og sikre integration. Den giver
afgrænsede match i strømhukommelsen, men frikender ikke scoregrundlaget.
Rapportens nul scoretimer skyldtes, at diagnosen overså den normale separate
timepakke. Hovedfilens aktuelle score og pakkens prognosetimer læses nu
lokalt med originale læsere og uændret autentificering. Privat proveniens
og offentlig projektion sammenlignes hver for sig. En samlet normal
gemnings-/krypteringsprøve med 673 syntetiske dele består. Manglende timer
opfindes ikke; der beregnes ingen nye scorer. Ny præcis CI, integration og
en særskilt godkendt gentagen pakkediagnose mangler. Første engangsordre er
forbrugt. Native vådmaske og numerisk korrekthed er fortsat åbne.

Følgende daterede statusser er historiske, hvor de er erstattet ovenfor.

Visningskandidatens præcise rettede kilde-CI har faktisk bestået, og koden er
sikkert merget efter den af ejeren annullerede writers terminale ophør.
Ny konkret engangsordre er forbrugt ved én almindelig manuel vejrhentning;
derefter bruges eksisterende cron. Antal/størrelse af pile ændres ikke.
Deploy og faktisk offentlig effekt kan ikke udledes af merge eller start.

Visningsleverancen er senere samme aften bekræftet gennem faktisk normal
gemning/deploy, offentlig 210/673-kontrol og målrettet browserkontrol. Det
lukker ikke den særskilte numeriske diagnose.

Den nye udtrykkeligt godkendte gemte originalpakke undersøges fortsat via
separat fast læsning og original producentkode, AAD og kontrakter. Den lokale
diagnose er udvidet til den normale Copernicus/Open-Meteo-kildevalgsvej og
begge gemte strømhukommelser. Manglende gemte timer skabes ikke ud fra scorer.
Den private Candidate G-rod skal være entydig, korrekt bundet og genafspillelig
med den oprindelige tilstandslæser. 13 måltests består efter udvidelsen,
inklusive originalversionens normale læsere og GCM/AAD med syntetiske input.
Ny præcis kilde-CI, sikker integration og faktisk pakkeinspektion mangler.
Match er ikke et kausalt join eller native vådmaskebevis. Ingen numerisk
rettelse, ny score, historikændring eller produktionsskrivning er udført.

Måltests omfatter hoved-/lokalpile, DMI og cache, Copernicus og regionale
kilder, ukendte punkter, manglende/beskadiget maske, øer, polygonhuller,
overlappende kyststykker, grænser og valgt-time-adskillelse. Kildetesten
kræver den faktiske landsmaske og dens checksum – syntetisk grønt er ikke
nationsbevis. Den faktiske normale app-kalder testes også med strøm uden
vind under en forsinket maskelæsning: den beholder samme lag og må ikke
starte en fejlagtig ekstra installation. Browserkontrol og normal kontrolleret levering er særskilte
gates; lokal test er ikke offentlig effekt.

Masken er et dateret kortgrundlag, ikke en garanti mod fremtidig ændret
kyst eller alle tænkelige fejl. Ændret maskekilde skal dokumenteres, testes
og låses igen. DEC-0024/0039 gælder fortsat for autenticitet og originale
pilepositioner. Den store vejrhentningsrevision, brugerdata og Spørg
RavRadar afsluttes ikke af denne rettelse; deres særskilte grænser består.

Den statiske fil er 4,48 MB før HTTP-komprimering. Første visning af blå
pile har en reel netværks- og beregningsomkostning; genbrug er cachebundet.
At hovedvisningen ikke afventer filen er ikke en garanti for nul kortvarig
browserbelastning på langsomme enheder.

Den normale GitHub-kildekontrol har faktisk bestået en original NetCDF-prøve
gennem Copernicus-læseren: deklarerede manglende værdier udelades, og gyldige
nulværdier bevares. Det beviser ikke konkrete produktionscellers fysiske
gyldighed. En ældre korttests data-URL-adapter kræver en fil-URL til den nye
maskemodul; den rigtige modul indlæses, og de gamle kortmål bevares. Kandidatens
samlede præcise kildekontrol og offentlig effekt er fortsat særskilte gates.

Kilde: https://osmdata.openstreetmap.de/data/land-polygons.html
Licens: https://osmdata.openstreetmap.de/info/license.html
