# RavRadar – overlevering til næste chat

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde samt DEC-0024, DEC-0029, DEC-0030, DEC-0031, DEC-0037, DEC-0038, DEC-0039, DEC-0040 og DEC-0041. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- Commit `0c010090` med den private Copernicus-pilot er på `main`. Den offentlige app er fortsat DMI-only; ingen supplerende strøm eller regionalproxy er aktiv.
- #3079 efter ejerens fulde centrale punktgennemgang gav 622/673 lokale DMI-strømpunkter. Alle 51 mangler er auditeret.
- Autentificeret privat Toolbox-run `#32129799346` bekræftede på friske centrale punkter Baltic-par til 39/51 og AMM15-par til yderligere fire. Alle 43 var dybere end øverste lag ved 11:00Z. Samlet potentiale er 665/673; en privat timeplan samler nu op til syv døgns flerruns-bevis.
- DEC-0041 og `data/current-regional-proxy-policy.json` tillader efter fulde gates kun otte vestlige Limfjordsdele at bruge nærmeste `dkss_lf`-par op til 15 km. Policytesten består mod #3079; aktiv pipeline mangler.
- Næste konkrete opgave er at overvåge timeprøvernes stabilitet og derefter implementere den aktive kildeorden samt de otte regionale proxyer bag fulde gates. Pushrun `#32129778162` stoppede korrekt på 622/673 og deployede ikke. Intet kobles til score/pile før flerruns-stabilitet og alle aktiveringsgates.
- Run `#32131021153` bekræftede cachegendannelse, deduplikering og rekursivt sikker flerrunsrapport på commit `406353be`: 629 records, én gyldig time, 625 unikke mål, nul mål/kildepar med grid-/lagskift og ingen rå U/V. Første cron-event afventede stadig; kontrollér at næste schedule-run øger `validTimeCount` til mindst 2.

- 4.0.230 er den lokale kandidat; 4.0.228 er stadig seneste produktionsverificerede release. #2872 viste, at Havknude havde gyldig NSBS-strøm 2,804 km væk, men blev blokeret af det gamle fælles havmodelvalg, fordi IDW var valgt til skalare felter 5,131 km væk.
- Strøm vælges nu pr. native tid på tværs af alle aktive DKSS-collections, uafhængigt af vandstand/temperatur: nærmeste komplette U/V-kolonne først, dybeste lag i samme kolonne bagefter. Parser v18/semantik v3 genopbygger gammel strøm selektivt.
- RavScore, administratorpunkter, 5-km-grænse og geografisk gate er uændrede. Havknude-regressionen og berørte målrettede tests består; fuld lokal og central produktionsvalidering mangler.
- #2872 fortsatte privat rotation til cursor 240 med 873 prøver/469 ankre/179 dele. 36 af 77 offentlige mangler var besøgt: én pipelinefejl ≤5 km, 4 ved 5–6 km, 5 ved 6–8 km, 23 over 8 km og 3 uden observeret U/V; 41 afventer rotation.
- 4.0.229 var den første kandidat, der rettede “dybeste lag globalt” til “nærmeste vandkolonne først, dybeste lag i samme kolonne” og håndhævede højst 5 km, men dens globale havmodelvalg var stadig utilstrækkeligt.
- Samme aktuelle samplingpunkt, U/V-koordinat, forecasttid og dybdelag kræves gennem bulkcache, forecast, score, provenance og pil. Gamle strømdata invalideres, og direkte ForecastEDR-strøm uden samme bevis, Open-Meteos overfladestrøm samt anden fallbackstrøm lukkes ude før historik, scoring og kort.
- Dybdelaget vælges pr. native forecasttid; interpolation kræver samme lag, celle og run. Pilen bruger den valgte times egen celle. Centralt reviewede kystdelspunkter bygges før DMI, og cache genbruges kun for uændrede samplingpunkter.
- En privat syvdøgnscache genbruger DKSS ved 0/5/15 km og flere lag uden score- eller public-runtimepåvirkning. Helhedsmodellen er permanent gemt i DEC-0040 og DEC-0029.
- #2853–#2855 gentager 187/210 verificerede hovedzoner og 596/673 lokale kystdele. #2855 har 20.924 verificerede timer, 3.856 `non-dmi-current`-timer og nul kendt pil/grid-mismatch blandt verificerede poster. De 23/77 rester er `null` uden pil.
- Den private cache har 491 prøver for 153 ankre/58 dele og er fortsat 168 timer, score-neutral og ikke offentlig. #2855 tilføjede ingen dubletter fra det uændrede modelrun.
- #2855 afdækkede, at cursoren ikke gik videre på `unchanged-valid`, og #2859 beviste LRU-gabet ved cursor 90/491 prøver/58 dele. Efterrettelsen er nu bevist: #2863 brugte tre bootstrapfiler/29,8 MB og nåede cursor 105/531 prøver/73 dele; #2864 genbrugte samme tre filer med nul download og nåede cursor 120/573 prøver/88 dele; #2866 fortsatte til cursor 150/667 prøver/118 dele. Alle var score-neutrale og ikke-offentlige. DMI's aktuelle STAC-href er efterkontrolleret som stabil; objektsti-ID er fremtidssikring.
- Rotationens coverage-audit registrerer afstand/koordinat/lag til nærmeste eksakte fælles U/V-kolonne uden at gemme fjerne U/V-værdier. Den private ejeroversigt skelner ≤5 km-pipelinehul, 5–6 km rent manuelt geometrireview, 6–8 km modelhul og >8 km strukturelt modelhul. #2869 beviser nul `uMps`/`vMps`, cursor 195, 755 prøver/157 dele og 11 målte af de 77 aktuelle mangler: 2/4/5 i de tre afstandsklasser; 66 afventer rotation. Den flytter aldrig punkter.
- Produktionsgaten er ikke sænket. 4.0.229 er ikke deployet; næste beslutning er fortsat punktrettelser til fuld dækning eller en udtrykkelig fail-closed deldækningspolitik.

- 4.0.228 er produktionsverificeret i #31913779486/#2835 på commit `93b8c0216821d02bf913f7aab369406ba2365fe9` med central adminhydrering, frisk DMI, fulde gates, Supabase og Pages.
- Fra zoomniveau 9 viser kortet flere lokale vind- og strømpile, men kun ved kystdelenes egne eksakt parrede DMI-U/V-gitterpunkter. Vindkilden kan være HARMONIE eller den faktisk anvendte DKSS-`wind-tail`-serie og mærkes særskilt.
- Fjernzoom bevarer hovedzonernes oversigtspile. Fallbackankre og kunstige kopier må ikke skabe ekstra tæthed.
- Den fulde detaljepakke opdaterer automatisk pilelaget. DMI-værdier, forecast, RavScore, historik og geometri er uændrede.
- Produktcommit `bb1892e4072deb77dbc83a203587221c666013d2` førte først til #2830: forsøg 1 stoppede på en delvis Limfjordshentning med 629/673 lokale strømpunkter; forsøg 2 nåede 670/673, men stoppede før Pages på gentaget Supabase `57014`.
- Artifactauditten fandt derefter, at DKSS-`wind-tail-u/v` ikke blev ført til lokale vindpunkter. Commit `93b8c021` rettede transporten. #2835-artifact og livefiler har 670 eksakte strøm- og vindpunkter uden mismatch, 461/544 unikke gitterpunkter og matchende manifesthashes.
- Livebrowseren havde nul konsolfejl og viste 54 pile på oversigten mod 87 efter to zoomtrin.

## Ejerens parallelle arbejde

- Ejeren gennemgår land-/vandpunkter zone for zone. Centralt godkendte punkter er autoritative og skal hydreres før hvert frisk produktionsbuild.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet. Dataopsamling og eksisterende gates fortsætter; intet må bagudfyldes eller skjules.

## Første opgave i næste chat

1. Afslut fuld lokal 4.0.230-validering, commit/push og frisk parser-v18/semantik-v3-produktion. Verificér Havknude, samlet dækning, pil/grid-identitet og selektiv cachemigration.
2. Følg samtidig de automatiske 15-delsrotationer, indtil alle 77 oprindelige v2-mangler er klassificeret. Verificér ingen `uMps`/`vMps`, cursorfremdrift, 168-timers pruning og højst 4 GB råcache.
3. Læs `docs/rdks/40_KNOWN_ISSUES/CURRENT-COVERAGE-4.0.229.md`; den indeholder både det historiske #2855-snapshot og #2872-korrektionen. Brug kun ejeroversigten til at skelne pipelinefejl fra optisk punktreview og strukturelle modelhuller.
4. Bevar den uændrede gate. Kræv fuld CI-`validate`, releasegate, Supabase, Pages og direkte livekontrol af semantik v3, højst 5 km og tidsbestemt lag/celle før produktionsverifikation.

## Beskyttede beslutninger

- Ét autoritativt land-/havpunktpar pr. aktiv kyststrækning; bugtede kyster vurderes repræsentativt af ejeren.
- Flere kortpile kræver flere faktiske dokumenterede DMI-gitterpunkter; pile må ikke kopieres eller flyttes.
- Central adminstatus er autoritativ, `missing` forbliver `missing`, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
