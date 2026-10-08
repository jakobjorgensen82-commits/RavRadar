# DEC-0293 – Landsdækkende landkontrol for strømpile

- **Status:** Godkendt krav; visningskode sikkert merget, offentlig effekt og numerisk diagnose åbne
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

Visningskandidatens præcise rettede kilde-CI har faktisk bestået, og koden er
sikkert merget efter den af ejeren annullerede writers terminale ophør.
Ny konkret engangsordre er forbrugt ved én almindelig manuel vejrhentning;
derefter bruges eksisterende cron. Antal/størrelse af pile ændres ikke.
Deploy og faktisk offentlig effekt kan ikke udledes af merge eller start.

Ny udtrykkeligt godkendt gemt originalpakke undersøges via en separat fast
læsning med original producentkode, AAD og kontrakter, ikke via ændret gammel
autoritet. Første afgrænsede måling kan sammenholde gemte DMI-valg med score-
projektioner og aktiv 48-timers hukommelse i 673 dele. Match er ikke et kausalt
join; andre leverandører, beholdt transportkontekst og native vådmaske er
fortsat ikke målt. 39 lokale mål består med syntetiske input og autentisk
oprindelig kode/kryptering. Faktisk pakkeinspektion og egen kilde-CI mangler;
ingen numerisk rettelse, ny score, historieændring eller production write.

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
