# Jordrav: konkrete boringer og forbindelsen til marken

**Dato:** 4. oktober 2026. **Status:** lokal faglig efterprøvning før ejerens kortgennemgang. App 4.0.541 og model/datasæt 0.1.0-prototype er uændrede.

Den nye gennemgang undersøger, hvordan boreoplysninger kan gøre ravmuligheder mere præcise. Den sammenholder to offentlige profiler med prototypens faktiske kortflader. Resultatet er en bedre skelnen mellem mulige lag, deres dybde og forbindelsen til pløjelaget. Et geologisk ræsonnement kan udvikles uden kendte fund; nutidig marktilgængelighed kræver sin egen forklaring.

## Faktisk kilde og efterprøvning

Begge boringer er fundet i GEUS' offentlige Jupitergrænseflade. Deres aktuelle geologiske tabeller er læst 4. oktober 2026. [Observationerne](jordrav/profile-observations-2026-10-04.json) indeholder udvalgte dybder og koder, ikke en ny landsdækkende boringsdatabase. “Aktuelle” betyder læst nu, ikke nyboret eller nyligt undersøgt markjord.

Gravesen, Nilsson, Pedersen og Binderups [GEUS 2011/50](https://www.geus.dk/media/6746/geus_rap_2011-50.pdf) er en geologisk lokaliseringsundersøgelse for affaldsdeponering, ikke et ravstudie. Kun geologien anvendes. Fig. 5–6 gengiver boringerne, mens fig. 15 og 19 viser regionale lagkorrelationer. Forside og trykte sider 13, 16, 29 og 36 er visuelt kontrolleret. Den regionale lagmodel er ikke en prøve af dagens pløjelag. Rapport og Jupiter genbruger boreevidens; de tælles ikke som uafhængige ravbeviser.

PDF-identitet: SHA-256 `23effad2181adec021a5f66644541ff45919a3b0717f8be2ee8f2513b5b8cb05`, 5.113.987 bytes. Originalen og sidebillederne ligger i systemets midlertidige forskningsmappe og indgår ikke i appen.

## To punktprofiler mod kortets faktiske flader

| Case og kilde | Registreret geologi, meter under terræn | Prototypens kortoplysninger ved punktet |
|---|---|---|
| [Åsted Vest, DGU 10.934](https://data.geus.dk/JupiterWWW/borerapport.jsp?dgunr=10.934), boring fra 2005 | 0–14: sand med siltintervaller ved 3–4 og 5–6. 14–20: smeltevandsler. 31–32: smeltevandsgrus. 63–82: ældre marint ler. 82–89: ældre marint sand. Første beskrevne prøve ved 1 m. | Nyere jordarter: øvre `MS`, nedre `DS`; randmorænebakke. Klassen er muligt, med lagdelt overfladerelevans. |
| [Ålbæk Lyngshede, DGU 6.30](https://data.geus.dk/JupiterWWW/borerapport.jsp?dgunr=6.30), boring fra 1945 | 0–55: generelt sand. 55–66: generelt ler. 66–70,5: vekslende små lag. 80–90,5 og 107–112: ældre marint sand. Ingen bestemt første prøvedybde i den læste tabel. | Nyere jordarter: `ES` over `ES`; flyvesandsflade. Klassen er muligt, med dække. |

Kortoplysningerne er **egen punktanalyse af prototypen**: SHA-kontrolleret katalog og to detailfiler, `29-318` og `29-319`. Hvert punkt rammer én eksporteret flade. Afstanden til den generaliserede flades grænse er cirka 45 og 43 m. Tallene angiver hverken borepunktets nøjagtighed, en markgrænse eller en tilladt interpolationsafstand.

### Åsted: sand omkring én meter afklarer ikke det øvre lag

**Vores fortolkning:** Første sandprøve ved én meter passer med kortets nedre DS. Den løser ikke spørgsmålet om det overliggende MS eller det bearbejdede muldlag. Et registreret 0–1 m-interval med en prøve ved én meter er ikke en centimetervis undersøgelse fra jordoverfladen. Sammenfaldet skal derfor ikke udlægges som hverken verificeret pløjesand eller en sikker fejl i kortet.

**JH-010:** Undersøg, om en plausibel ravkæde kan knyttes til det øvre materiale, eller om en kontakt til underliggende sand kan nå nutidig blotlægning. Et lokalt profil med kendt topjord, lagkontakt og jordbearbejdning kan skærpe dette. En nærliggende boring kan støtte lagkorrelation, men må ikke erstatte den uden vurdering af terræn og struktur.

**Afprøvning af alternativ:** Hvis en ravforklaring alene anvender et dybt sandlag, må den forklare senere løft, erosion eller omlejring til dagens materiale. Pløjning og regn kan indgå i det sidste trin, når materialet er nået til det bearbejdede lag. Regn skaber ikke i sig selv en forbindelse gennem et tykt dæklag. Ingen fast pløjedybde eller ravbonus er indført.

### Ålbæk: et generelt sandinterval kan skjule vigtige forskelle

**Vores fortolkning:** Boringskoden `s` fastlægger ikke et havstadium eller en flyvesandsformation. Den kan ikke gøre hele intervallet til ét ravrelevant lager. Jordartskortets ES fastlægger omvendt ikke hele dækkets tykkelse. De to kilder besvarer forskellige spørgsmål og skal beholdes sammen med deres opløsning.

**JH-011:** Søg et profil, som kan skelne det øvre flyvesand fra en mulig underliggende modtager og fastlægge kontakten. Derefter kan det vurderes, om modtageren er bevaret og har forbindelse til overfladen. Hypotesen svækkes som markprioritet, hvis relevant materiale kun findes dybt, mens dagens bearbejdning foregår i et andet lag. Rav kan stadig tænkes i yngre materiale, men det kræver en særskilt tilførselsforklaring.

Den sidste Jupiterpost ved boringens bund mangler en nedre grænse. Den er registreret som ufuldstændig og udeladt fra tykkelsessummer; den bliver ikke forlænget nedad.

## Regional korrelation skal have en tidsrækkefølge

Knudsen, Kristensen og Larsen beskriver afbrydelser i Vendsyssels marine sedimentation, blandt andet ved Åsted Vest. De beskriver også dalnedskæring og senere ikke-marin opfyldning samt en ny senglacial havfase. Her er det originale abstract gennemgået, ikke hele artiklen. Det støtter en flerleddet historie frem for én sammenhængende marin pakke. [Knudsen m.fl. 2009](https://researchprofiles.ku.dk/en/publications/marine-glacial-and-interglacial-stratigraphy-in-vendsyssel-northe/).

**Vores undersøgelsesregel:** Samme materialekode er ikke nok til at forbinde to lag. Registrer først, hvilken fase der muligvis leverer materiale, hvilken hændelse der flytter det, og hvilken yngre aflejring der modtager det. En erosionspause kan både fjerne et lager og åbne for transport til en modtager. Der skal angives, hvilken mulighed man undersøger. Fravær af rav i en rutinebeskrivelse er ikke en målrettet negativ ravprøve.

For Rubjerg beskriver Pedersen rav sammen med omlejrede planterester i Rubjerg Knude Formationen. Den kan spores omkring 10 km ind mod øst i boringer, men afgrænses af senere erosion; ældre kort har lokalt kaldt den morænesand. Overlejring og glaciotektonisk forskydning varierer. Det skærper den tidligere regionale case: aflejringens forløb og kontakter er mere relevante end en cirkel omkring klinten. [Pedersen 2005, s. 46–49](https://www.geus.dk/media/13810/nr8_p001-192.pdf).

**Vores overførselshypotese:** En historisk materialebetegnelse kan derfor kræve kontrol af formationen. Det giver anledning til at undersøge sedimentpakker og bevarede kontakter; det giver ikke en automatisk opgradering af al MS. Åsted- og Ålbæk-profilerne er heller ikke identificeret som Rubjergs ravførende lag.

## En brugbar arbejdsgang før markvalg

Følgende er RavRadars foreslåede undersøgelsesmetode, ikke et nyt pointsystem:

1. **Skriv tilførselskæden.** Angiv mulig kilde, transport og modtager. Registrer kilden til hver forbindelse og hvilket led der fortsat er en hypotese.
2. **Kontrollér lagidentitet.** Skeln materiale fra formation og alder. En velbeskrevet sandprøve kan forbedre materialekendskabet uden at forbedre ravtilførslen tilsvarende.
3. **Kontrollér dybden.** Behold meter under terræn særskilt fra højdekote. Registrer prøvedybde, dæklag, manglende intervaller og kildens opløsning.
4. **Kontrollér overførslen til marken.** Vurder lokal lagkontinuitet, terræn og mulige strukturændringer. Undlad faste cirkler omkring boringer og automatisk udvidelse til hele kortpolygonen.
5. **Vurder dagens synlighed separat.** Ejerens erfaring med pløjning og regn gælder blotlagt materiale. Jordbearbejdning, vegetation og afvaskning kræver aktuelle observationer; et ældre luftfoto er utilstrækkeligt.

Resultatet for en kandidat skal kunne udtrykkes i tre sætninger: hvorfor ravtilførsel er mulig, hvad der vides om lagets position, og hvad der vides om nutidig blotlægning. Et ubesvaret spørgsmål skal blive stående som ubesvaret. Kendte ravfund er fortsat ikke adgangskrav.

## Gentagelig kontrol og præcis leveringsstatus

[audit_profile_points.py](jordrav/audit_profile_points.py) læser observationer og frosne visningsdata. [Resultatet](jordrav/profile-point-audit-2026-10-04.json) er PASS for intervalkontinuitet, katalog-/model-/filidentiteter og punktopslag. Det er ikke en ravvalidering. Åsteds udvalgte 89 m summerer til 42 m DS, 2 m DI, 18 m DL, 1 m DG, 19 m QL og 7 m QS; summen bruges kun som konsistenskontrol.

Ingen polygoner, regler, klasser, UI, appversion eller geologiske producentfiler er ændret. Rapporten skærper JORDRAV-001 og JORDRAV-007; forbindelsen til aktuelle marker er stadig åben. RDKS, Markdown-håndbogen, det forberedte webhåndbogstillæg og changelog følger arbejdet. Den aktive webhåndbog med SQL-installationskopi forbliver uden for denne gren. Tidligere UI-testresultater er dateret evidens; denne dokumentationsudvidelse kræver ikke en ny browserkørsel eller vejrhentning.

Slutkontrol: uafhængig efterregning af intervalsummer, script-/observationsidentiteter,
Python-syntaks, lokale rapportlinks og håndbogstillæg PASS. RDKS med 14 chatkilder,
håndbog og 4.0.541 samt de eksisterende sikkerhedshærdningskontrakter PASS.
