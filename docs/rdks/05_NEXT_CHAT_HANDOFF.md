# RavRadar – overlevering til næste chat

## Aktiv kandidat 4.0.235 – afslut før andre kodeopgaver

- Browser-P1 er implementeret lokalt: én lokal visningskontekst bærer del, tid, score, forklaring, debug og vejr gennem nuvisning og femdøgnsfaner.
- National prognose og zonepanel bruger samme `selectLocalBestForDay`; runtime bevarer vinderdelens kompakte præsentationsfelter pr. fælles time.
- Manglende lokal post låner ikke hovedzoneværdier. En ufuldstændig fælles lokal række vises som tydeligt mærket, samlet hovedzonefallback.
- Syntetisk landsregression består for 210 zoner, 673 dele, begge jagtformer og 2.100 femdøgnsvisninger. RDKS, versionslukning og lokal releasegate er grønne; fuld lokal `validate` stopper forventet på det gamle 209/211-vejrsnapshot efter geometri-v2. Central 673/673/Supabase/Pages og direkte livebrowser mangler endnu.
- Ingen ejerpunkter, geometri, U/V, pilceller, scoreformel, kildeorden, afstandsgrænser eller dækningskrav er ændret. De fire dirty diagnostik-/geometrifiler og `data/live/coastal-parts-v2.json` må ikke stages.
- Fælles aktuel timedækning for alle 673 dele er fortsat et særskilt åbent bevis; ændret kildeplan kræver ejerens beslutning.

## Produktionsverificeret 4.0.234-drift

- Begge godkendte driftsrettelser er implementeret lokalt: GitHub-ejet plan `14,29,44,59 * * * *` med fail-closed kontrol af den aktuelle private Copernicus-time, samt tabsfri komprimering og integritetskontrol af den beskyttede Supabase-`runtime-diagnostics`-payload.
- Copernicus-piloten kører ved minut 06, så dens time kan være klar før første produktionsforsøg. Manglende time giver et billigt sikkert skip; den normale produktion må stadig kun frigive præcis 673/673 efter DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → otte ejerallowlistede `dkss_lf`-proxyer ≤15 km.
- Overgangens almindelige cron-job.org-`workflow_dispatch` bruger nu samme current-hour-gate, så et hel-timeskald uden den nye Copernicus-time udsættes uden rød release. Push og en bevidst manuel `force=true`-release bevarer hele kæden.
- Arkivet indeholder hele originalen som deterministisk gzip/base64 med SHA-256 og bytekontrol. Admin-download dekoder og verificerer filen efter sædvanlig adgangskontrol. Den målte repræsentative størrelse er 208.874 bytes mod 4.014.169 bytes kompakt original.
- Lokal RDKS, version, geometri-v2, runtimeuafhængig testmatrix og releasegate er grønne. Commit `7409d461` er fast-forwardet til `main`; pushrun `#32237507059`/`#3202` bestod frisk central geometri, fuld validering, releasegate, 673/673, Supabase på otte sekunder, Pages og deploy. Overgangscommit `4ab7a659` bestod derefter i pushrun `#32242510084`/`#3207` og eksterne gentagelser `#3208`/`#3209`.
- Det første nye naturlige GitHub-`schedule`-event `#32244914347`/`#3210` startede 2026-08-19T10:53:50Z og bestod current-hour-gate, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Overdragelsesgaten er opfyldt, og ejeren er bedt om at deaktivere RavRadar-jobbene i cron-job.org. Bekræft ved næste opstart, at de faktisk er slået fra, og verificér derefter mindst én efterfølgende native kørsel uden ekstern dublet.
- Eksternt hel-timeskald `#32245473213`/`#3211` beviste samtidig den nye sikre udsættelse: readiness var grøn, mens build, Supabase og Pages blev sprunget over. Dokumentationspush `#32245605472`/`#3212` bestod derefter hele den centrale kæde.
- Der er ikke ændret ejerens land-/vandpunkter eller anden geometri.

## Start her

Læs `AGENTS.md`, `docs/ai/CODEX_START_HERE.md`, den obligatoriske RDKS-kæde samt DEC-0024, DEC-0029, DEC-0030, DEC-0031, DEC-0037, DEC-0038, DEC-0039, DEC-0040, DEC-0041, DEC-0042, DEC-0043 og DEC-0044. Kontrollér derefter gitstatus, seneste commit og GitHub Actions.

## Aktuel sandhed

- **Nyeste åbne P1 er browserpræsentationen, ikke ejerens punktpar eller strømvektorer.** En fuld Chromium-audit 2026-08-18 bekræftede 210 zoner, 673 dele, 622 DMI + 43 Copernicus + 8 godkendte proxyer, ejersource = runtimepunkt for 673/673 og korrekte U/V-retninger/pilceller inden for tolerancen. Ingen land-/vandpunkter blev ændret.
- Zonepanelet blander imidlertid hovedzonens aktuelle vejrkort med den lokale vinderdels score, forklaring og debug. 371/414 sammenlignelige aktuelle visninger havde forskellig synlig og lokal strømretning. Blåvand viste vinderen `Havsande – sydkyst` og lokal NV 315° i debug, men N 11° i det synlige strømkort.
- Femdøgnspanelet bruger tilsvarende hovedzonens generiske dagsvalg i stedet for den lokale kystdels `bestForDay`: 1.660/1.964 sammenlignelige faner havde forskellig score, og 897 havde forskelligt bedste tidspunkt. En rettelse skal føre én og samme lokale del/tid/vejrpost gennem navn, kort, score, tekst, debug og alle metrikker; fallback skal være eksplicit.
- Samlet 673/673 må desuden adskilles fra fuld fælles timedækning. I det auditerede datasæt manglede den aktuelle 20:00-række dele i `DK-B05-12`, `DK-B05-17` og `DK-B05-18`, selv om artifactet rapporterede 673/673 samlet. Hvis det stadig gælder ved genoptagelsen, skal ejeren have en plan før nogen kildeændring. Sænk aldrig dækningskravet.
- **Næste sikre kodeforløb:** reproducer mod det aktuelle live-datasæt; saml nuvisning og femdøgnsvisning om samme lokale vinderpost; tilføj landsdækkende browser-/regressionstest for begge jagtformer og Blåvand-modbeviset; indfør særskilt metadata/gate for eksakt fælles aktuel time; kør fuld RDKS-, release- og produktionsvalidering. Brug GPT-5.6 Sol med Ekstra høj. Der blev ikke ændret programkode, geometri, score, live-data eller deploy i checkpointsessionen.

- Ejeren har godkendt kontrolleret live-aktivering af Copernicus/regionalproxy på den nuværende ikke-offentlige side. Gyldige U/V-data, fuld provenance og nye pile må publiceres; kun credentials forbliver hemmelige. Syvdøgnsstabiliteten eftermåles live.
- 4.0.233 er gældende produktionsverificeret liveversion. Commit `286ea9e5`, `#32165688946` og `#32165969786` bestod frisk central geometri, vejrbygning, 673/673, fuld validering, releasegate, Supabase og Pages. Direkte liveaudit af `rr-20260818173528-210` kontrollerede 673 dele og 43.064 prognose-/jagtformstimer med nul lokale anker-, vinder-, retning-, pil/grid-, provenance- eller afstandsfejl.
- Den aktive runtime bygger en separat online `data/live/current-pilot-history.json`, fletter eksakt DMI-first strøm til RavScore og kort og placerer hver pil på den valgte posts faktiske kildecelle. Normal gate er fortsat 673/673.
- `data/current-live-pilot-control.json` giver en auditerbar `dmi-only-rollback`, som fjerner supplementet fra score/pile og lader berørte strømme være `missing`, mens friske vind-, bølge-, vandstands- og øvrige prognoser fortsætter. Rollback må ikke kalde reduceret dækning fuld.
- Commit `5a7780e4` og central `#32158041877`/support `#3127` har bestået præcis 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy. Det første aktiveringsdatasæt `rr-20260818160548-210` blev direkte HTTP-/hashverificeret live med 673 scorede dele og credentialfri historik. Efterkontrol `#32160090899`/support `#3129` bestod igen hele kæden og live artifactmatch.
- Næste operation er at følge den naturlige live-drift i syv døgn uden at tage siden offline. Gentag også den visuelle kliktest af farver, prognoser og pile, når Codex' lokale browser-plugin igen kan starte; artifact-, hash- og HTTP-beviset er allerede grønt.

- Commit `cda7358b` med collectoren, `161ba79e` med liveintegrationen og `5a7780e4` med den kanoniske regionale anchorvalidering er på `main`. Seneste deploy er `controlled-live`, ikke DMI-only.
- #3079 efter ejerens fulde centrale punktgennemgang gav 622/673 lokale DMI-strømpunkter. Alle 51 mangler er auditeret.
- Autentificeret privat Toolbox-run `#32129799346` bekræftede på friske centrale punkter Baltic-par til 39/51 og AMM15-par til yderligere fire. Alle 43 var dybere end øverste lag ved 11:00Z. Samlet potentiale er 665/673; en privat timeplan samler nu op til syv døgns flerruns-bevis.
- DEC-0041 og `data/current-regional-proxy-policy.json` tillader kun otte vestlige Limfjordsdele at bruge nærmeste `dkss_lf`-par op til 15 km. Den aktive pipeline og fulde 673/673-kæde er produktionsverificeret; alle øvrige dele beholder 5-km-grænsen.
- Den aktive kildeorden og de otte regionale proxyer er implementeret bag fulde gates. Pushrun `#32129778162` er historisk bevis for det gamle 622/673-stop; `#32158041877` er det nye produktionsbevis for 673/673-runtime og deploy.
- Run `#32131021153` bekræftede cachegendannelse, deduplikering og rekursivt sikker flerrunsrapport på commit `406353be`: 629 records, én gyldig time, 625 unikke mål, nul mål/kildepar med grid-/lagskift og ingen rå U/V. Første cron-event er siden bevist i #32134686185; to tider i samme cache afventer keepalive og backfill.
- Central `#32134021410`/artifact `#3094` beviste private `dkss_lf`-data til alle otte regionale mål: 32 prøver ved fire forecasttider, 5,416–12,110 km, dybere lag til alle mål, ingen rå U/V i supportrapporten og ingen `.cache` i artifactet. Offentlig dækning forblev 622/673 som tilsigtet.
- #32134021410 stoppede sikkert før deploy, fordi én test stadig forventede workflowets gamle User-Agent 4.0.229. Testen følger nu `package.json`; rettelsen er centralt verificeret i #32135079819.
- Rettelsen er pushed som `d00d55bc`; #32135079819 passerede den og stoppede først ved den uændrede 622/673-gate uden deploy.
- Første faktiske Copernicus-cron #32134686185 var grøn ved 12:00Z, men 11:00Z-råcachen var blevet LRU-fortrængt af cirka 10,2 GB Actions-cache med flere 2,5 GB DMI-generationer. Restore-only keepalive er pushed i `0224ea6a`; #32136328681 ramte 12:00Z, #32136391556 samlede 1.258 records ved 11/12 UTC uden grid-/lagskift eller supportlæk, og #32136642330 ramte den nye cache. Første automatiske keepalive og næste naturlige time skal fortsat kontrolleres. En artifact med råcache er forkastet, fordi repositoryet er offentligt.
- Den faktiske gamle audit brugte stadig 95 %/640. Ejerens nyere 100 %-beslutning er nu kode: alle aktuelle kystdele, aktuelt 673/673, kræves. Den nye statiske regression forbyder 95 %-formlen, og #3094-replay stopper korrekt på 622/673.
- Commit `9e2164b8` og #32139054129 beviser det centralt: regressionen passerer, auditten skriver “622/673; alle 673 kræves”, og releasegate/Supabase/Pages springes over.
- GitHub leverede ingen automatisk keepalive før næste DMI-save; #32139755594 fandt derfor den private Copernicus-cache væk igen. Produktionsworkflowet har nu en restore-only pre-DMI-refresh uden rå log/upload. #32140001424/#32140470201 har genopbygget 11/12 UTC og to-timersbeviset; næste DMI-/pilotkontrol skal bevise, at dette lukker LRU-hullet.
- `b6cf0383`/#32140865173 lukkede DMI-delen af beviset: cache-hit før DMI, ny 2,905-GB DMI-save, Copernicus-cache stadig til stede, begge nye regressioner grønne og fortsat 622/673-stop uden deploy. #32141443152 ramte samme cache bagefter. Næste naturlige pilot skal bevise, at historikken også udvides videre.
- Manuel aktuel-time-pilot #32141772134 har allerede udvidet den sikkert til 1.887 records ved 11/12/13 UTC uden grid-/lagskift eller supportlæk. Første nye naturlige schedule-event efter rettelsen er stadig et særskilt åbent driftsbevis.
- Den private syvdøgnsgrænse er nu også dækket af normal releasevalidering: præcis 168 timer, deduplikering, beskæring af ugyldige restoreposter og fail-closed kontrol af nye lokale samme-tid/celle/lag-U/V-poster. Det naturlige fulde syvdøgnsvindue er fortsat åbent og må ikke erklæres bevist af fixturetesten.
- `7f22e8e1`/`#32143798560` CI-verificerede retentiontesten og den fortsatte 673/673-kontrakt; den faktiske 622/673-audit stoppede før Supabase/Pages, og Copernicus-cachen overlevede DMI. Næste bevis er naturlig schedule-/syvdøgnsdrift.

### Historiske mellemtrin – ikke aktuelle opgaver

- 4.0.230/4.0.228 nedenfor er historiske mellemtrin, som er erstattet af den produktionsverificerede 4.0.233. #2872 viste dengang, at Havknude havde gyldig NSBS-strøm 2,804 km væk, men blev blokeret af det gamle fælles havmodelvalg, fordi IDW var valgt til skalare felter 5,131 km væk.
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

- Ejeren har afsluttet den landsdækkende gennemgang af land-/vandpunkter og vandstandskilder. De centralt godkendte værdier er autoritative og hydreres før hvert frisk produktionsbuild.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil mere naturligt datagrundlag er opsamlet. Dataopsamling og eksisterende gates fortsætter; intet må bagudfyldes eller skjules.

## Første opgave i næste chat

1. Fortsæt den godkendte syvdøgnsovervågning af den aktive 168-timers strømcache uden at tage siden offline. Dokumentér kun nye milepæle eller reelle fejl; log aldrig rå U/V eller credentials.
2. Bevar normalrækkefølgen DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → kun otte ejerallowlistede `dkss_lf`-proxyer ≤15 km, eksakt samme tid/celle/lag og præcis 673/673.
3. Ved en reproducerbar live-dataintegritetsfejl bruges den versionsstyrede `dmi-only-rollback` gennem fulde gates. En enkelt kø-, platform- eller netværksfejl er ikke i sig selv et datamodbevis.
4. Når det naturlige 168-timersvindue er afsluttet, dokumentér slutbeviset i RDKS og vælg derefter næste særskilt godkendte roadmapopgave. Fem-døgnsdækning og den store RavScore-/strømfeltsanalyse er fortsat udsat, indtil datagrundlaget er tilstrækkeligt.

## Beskyttede beslutninger

- Ét autoritativt land-/havpunktpar pr. aktiv kyststrækning; bugtede kyster vurderes repræsentativt af ejeren.
- Flere kortpile kræver flere faktiske dokumenterede DMI-gitterpunkter; pile må ikke kopieres eller flyttes.
- Central adminstatus er autoritativ, `missing` forbliver `missing`, og ingen gate må svækkes for at få grønt.
- Kritisk arbejde udføres med GPT-5.6 Sol og Ekstra høj indsats.
