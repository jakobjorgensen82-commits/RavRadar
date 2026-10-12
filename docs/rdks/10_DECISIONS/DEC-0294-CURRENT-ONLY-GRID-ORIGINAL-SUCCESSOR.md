# DEC-0294 – Strømgitter, originale data og afgrænset overgang

**Dato:** 2026-10-12

**Status:** Implementeret i lokal kildekandidat 4.0.576; præcis kildekontrol, installation og offentlig effekt afventer.

## Menneskelig beslutning og omfang

Ejerens godkendte overgang skal lade den dokumenteret korrekte fortolkning af DMI-strøm bruges til nye strømdata og ny strømhukommelse, også hvis fremtidige scorer derfor ændres. Gamle originalpakker og offentliggjort scorehistorik bevares uændret. Kildeprioritet, scoreformel, administratorens punkter og geometri ændres ikke. Godkendelsen giver ikke nye DMI-downloads, SQL-installation eller en ny privat destination. Den tidligere visningsrettelse i DEC-0293 bevares, men skjulte landpile frikender ikke strømdata eller score.

Rettelsen gælder kun CURRENT_U/CURRENT_V. Originalens deklarerede GRIB1-gitter og native indeks styrer strømkoordinaternes fortolkning. Gyldige U/V, herunder nulværdier, bevares. Vind, bølger, vandstand og vandtemperatur beholder deres hidtidige scalarfortolkning. En fælles blanketrettelse af alle felter er forkastet. Kortets landmaske er fortsat en visningskontrol, ikke en begrundelse for numerisk kassering.

Ny strøm og den gamle cachefortolkning får adskilte kvalifikationer. Det originale input og den valgte time skal følge den normale læser, projektion, kildevalg, historik, tilstand og score; en genberegnet hash alene må ikke opgradere gamle beviser. Centrale SOURCE-valg og T+3-reglen består. De syv afgrænsede kystzoner må stadig kun bruge dkss_lf til vandstand, ikke til strøm, tilhørende strømhukommelse eller vandtemperatur. Limfjordens egne zoner bevarer deres relevante data. Manglende timer bliver ikke automatisk gyldige.

## Legitimitet og tabsfri originalovergang

De normale generatorer giver den nye faktiske C69- og I71-kildebinding og den faktiske continuation-kontrakt. Den fysiske model, storage-ABI og offentlige kontrakt er uændrede. Dette er ikke ommærkning af gamle originaler. Den frosne brugerdata-/assistentkandidat ændres ikke for at passe til den nye strømrevision.

En særskilt typed original-restore accepterer kun den faste fulde forgænger og faktisk CURRENT-descriptor, efterfulgt af den normale TARGET-descriptor. Previous-fallback, gammelt cipher-checkpoint og code-only kan ikke bruges til denne overgang. Code-only afviser den nye overgang før skrivning. Kun en normal, strengt nyere time kan forberede den.

Den normale migrant validerer alle 673 originale tilstandspar med deres fulde gamle validatorer før kopiering. Den bevarer originale numeriske værdier, hele ældre første poster og 118 timers offentlig historik i de kontrollerede målforløb. Originale manifest-rækker, filantal, byteantal og hashes kontrolleres; conditions læses og kontrolleres fra samme bytes. Hver kopieret fil og kopien skal svare til det forseglede originalmanifest. En public-hour-pack er kun påkrævet, hvis originalmanifestet faktisk indeholder den, og dens originale indhold kontrolleres efter ombinding. Originalens fravær bevares.

Den normale kalder holder original-restore, separat successor og arbejdsrepository adskilt og afslutter restore før den læsende migrant. Dette er dokumenteret normal sekventiel ejerskab, ikke en generel garanti mod fjendtlig filstiudskiftning eller fysisk beholdning af faktiske produktionsoriginaler.

Den nye append-only kildefil er `20261012000000_current_grid_original_bound_successor.sql`. De 54 eksisterende migrationsfiler ændres ikke. Den kopierer de fulde faste originalvalidatorer til særskilte private kontrolfunktioner; kun et strengt nyere mål og en fuldt gyldig original central række kan bruge den afgrænsede CAS-gren. Den gamle række behandles ikke som en kompatibel same-reference-tilstandsprojektion. Nye payloads skal bestå før række-lås, og normalt versions-CAS, idempotens, sikkerhed og historikbeskyttelse består. Readback omfatter alle 14 fulde kontrolfunktioner i præcis rækkefølge. Lokal SQL-kilde eller kontrolleret HTTP-readback er ikke en installeret PostgreSQL-kontrol.

Den eksisterende normale resolver kan bevare den gamle centrale ACTIVE-/profilbinding og vælge historical-maintenance, når den nye kildebinding er anderledes. Der kræves derfor ingen forudgående blanketopdatering af central metadata. Den senere opdatering af teknisk ACTIVE-/profilbinding må først ske samlet efter de eksisterende faktiske offentlige afslutningskontroller og særskilt konkret myndighed. Lokal spejlsynkronisering er ikke den eksterne opdatering.

## Evidens, afvisninger og næste gates

Første præcise kildekontrol på PR577 stoppede i en eksisterende native headerprøve: diagnosen tæller koordinatafvigelser mod ecCodes' rå gitter, mens rettede CURRENT-kandidater bruger de deklarerede endepunkter ved samme native indeks. Den gamle prøve krævede fortsat nul raw-afvigelser for dkss_lf. Kun den ene testmetode er rettet: hvert faktisk valgt punkt kontrolleres nu uafhængigt mod originalheaderens endepunkter og sit indeks samt originalens decoded værdi; rapportens rå koordinatafvigelser genoptælles præcist og skal være positive for LF, stadig nul for NSBS. Alle gamle indeks-/værdi-/nulstrøms-, raw-native-, gyldigheds- og 64×Ni-kontroller bevares. Producent og diagnoserapport ændres ikke. Syntaks og hele det præcist gennemgåede testbillede består lokalt; ny faktisk Linux/native-kontrol kræves. Dette er ikke en produktionsvejrhentningsfejl eller tilladelse til ny diagnose.

En særskilt leveringsblokering er fundet i brugerdata: gamle FFC-ture i browserens kø bevares ved afvisning, men ny Edge-/ACTIVE-admission kan afvise dem permanent efter kildeovergangen. Kort vedligeholdelse alene løser ikke dette. Historisk aflevering uden ommærkning, falsk ny kalibrering eller blanketaccept skal afklares gennem de normale kaldere før levering. Det eksisterende binding-only-forløb opdaterer kun assistenten; alle tre relevante Edge-bindinger skal behandles i et konkret godkendt minimalt forløb. Ingen installation eller brugertur er ændret ved analysen.

- En fælles feltændring, kun skjulte pile, kun uændret score, ommærkede gamle originaler og en generel landmaske-afvisning er ikke løsningen.
- Den normale lokale projektion til score og strømhukommelse er afprøvet med fire egne kystnormaler; det er ikke fire nye DMI-diagnoser eller faktisk national produktionsdata.
- De normale lokale original-restore-/migrantmål bevarer både rollback og målt warmup for 673 dele og afviser 12 korruptionstilfælde. En faktisk modificeret conditions-fil efter restore blev først accepteret; den forseglede inputkontrol er rettet, og det samme normale forløb afviser nu ændringen. En tidligere svag korruptionsoracle ved mætning blev forkastet, ikke brugt som grøn evidens.
- Readiness, de præcise bindingskopier og normale C/I-kontroller består lokalt. Gamle migrationsbytes bevares. Ny native GRIB1-strømprøve er koblet til den eksisterende Linux-kaldevej, men dens nye resultat og den samlede præcise kildekontrol afventes.
- De eksisterende syv download-/transaktionskald beholder stopkontrollen. Den foregående lease-opfølgning er nu præcist kildeverificeret og merget; en almindelig cron-vejrhentning kører på den. Det er ikke bevis for den nye koordinatrettelse.

Før aktivering mangler præcis GitHub-kildekontrol, konkret myndighed til ny SQL/destination og eventuel central teknisk metadataovergang, faktisk bevarelse af autentificerede originaler, relevante backendkontroller og afsluttet writer. Dernæst kræves en faktisk ny normal generation, gemning, upload/genbrug, alle efterdatagates, deploy og målrettet offentlig/browserkontrol. Ingen ekstra vejrhentning eller ændret cron følger af denne beslutning. All-site geometri og scoreformel er uændrede, ikke påstande om fuld datadækning.

Alle fem hovedmål er fortsat åbne. Den separate proces-/gemningsrevision forbliver isoleret og inaktiv; dens lokale SOURCE-publisher- og owner-loss-rettelser er ikke integreret eller produktionsbevist. Brugerdata og Spørg RavRadars konkrete installationer, anonymitet/adgangskontrol, virkelig ekstern AI og offentlig effekt er ikke afsluttet. Selvstændig drift kræver normal drift uden Codex-redninger, ikke blot grønne lokale tests eller overvågning.
