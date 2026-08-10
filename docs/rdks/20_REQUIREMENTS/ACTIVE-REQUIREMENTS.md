# Aktive krav – samlet register

Denne fil er den operationelle kravoversigt. Detaljer og historik findes i beslutninger, chatkilder og kode.

## Data og prognoser
- **REQ-DATA-011 – IMPLEMENTERET LOKALT I 4.0.120:** Vandstandsrouting må kun ændre vandstandsfelter. Den må ikke erstatte en offentlig blandet komponentserie med den rene DMI-cache eller slette gyldig fallback.
- **REQ-DATA-012 – IMPLEMENTERET LOKALT I 4.0.120:** En timebaseret fallbackhale skal forespørge om mindst 120 fremtidige timer; allerede forløbne timer siden midnat må ikke tælle med i produktets forecastbudget.
- **REQ-DATA-001 – AKTIV:** DMI prioriteres; fallback må ikke skabe timevis pendlen.
- **REQ-DATA-002 – AKTIV:** Komponentserier filtreres separat før interpolation og merges på faste UTC-timer.
- **REQ-DATA-003 – IMPLEMENTERET:** Ingen dublerede eller ikke-monotone forecasttider.
- **REQ-DATA-004 – AKTIV:** 118–119 timers realistisk horisont accepteres.
- **REQ-DATA-005 – AKTIV:** Vandstandsspring vurderes efter kilde og tidevandsmønster; reelle Vadehavssvingninger må ikke blindt udglattes.
- **REQ-DATA-006 – AKTIV:** Diagnostik viser kilde, friskhed, horisont og fallback pr. komponent og zone.
- **REQ-DATA-007 – AKTIV / ANALYSE FØR IMPLEMENTERING:** Hver forecast- og RavScore-komponent skal have en dokumenteret cirka 120-timers kildekæde efter DEC-0030: bedste relevante DMI-kilde først, derefter eventuel anden DMI-kilde og først derefter ekstern fallback for den manglende hale. Fungerende DMI-data må ikke erstattes af fallback for at skabe en ensartet serie.
- **REQ-DATA-008 – BINDENDE:** Hale-fallback må begynde ved den faktiske sidste valide DMI-time pr. komponent. Skiftet skal være UTC-entydigt, monotont, uden huller/dubletter, falske nuller, stale gentagelser eller skjult proveniens.
- **REQ-DATA-009 – IMPLEMENTERET LOKALT I 4.0.125, AFVENTER PRODUKTION:** Automatisk dækningsaudit skal pr. komponent og zone vise kildeinterval, run/lead time, prognosealder, native/interpoleret/fallback-status samt manglende rest mod cirka 120 timer. Identiteten gemmes ved STAC/GRIB-indlæsning og føres gennem komponentmerge; den rekonstrueres ikke bagefter.
- **REQ-DATA-010 – BINDENDE:** Hvis en forsvarlig cirka 120-timers kæde ikke findes, forbliver resten missing. UI og RavScore skal kommunikere eller respektere den større usikkerhed; systemet må ikke konstruere data for at opfylde horisontmålet.

## DMI-stationer
- **REQ-STATION-001 – DELVIST:** Alle kendte stationer bevares med DMI-status og datalivscyklus.
- **REQ-STATION-002 – IMPLEMENTERET OG REGRESSIONSSIKRET I 4.0.103:** Vis automatisk primær/sekundær, afstand, vægt og valgmetode pr. zone. Automatikken genberegnes fra aktuelle brugbare vandstandskilder, vælger fortsat topologisk egnede kilder, men interpolerer efter reel geografisk haversineafstand ligesom administratoroverride. Én kompatibel kilde bruges med 100 % vægt. Et gammelt auditresultat må ikke skjule et nyere gyldigt valg.
- **REQ-STATION-003 – IMPLEMENTERET OG REGRESSIONSSIKRET I 4.0.102:** Adminoverride erstatter automatik, når override kan levere efter de valgte krav. Admin viser de faktiske afstandsvægte. Kortet viser kun den aktive routing: grøn ved automatik, rød ved aktivt administratorvalg; grønne markører skjules under override, og lilla “begge valg” er fjernet. Dublerede administratorvalg samles til én kilde med 100 % vægt.
- **REQ-STATION-004 – AKTIV:** Nye stationer, udfald og genoptaget levering udløser meningsfulde notifikationer ved tilstandsændring – ikke spam ved ét manglende tidspunkt.
- **REQ-STATION-005 – IMPLEMENTERET:** Skeln observationsstatus fra prognose-/cachestatus og vis samlet anvendelighed.
- **REQ-STATION-006 – DELVIST:** Vis seneste observation, cache gyldig til, historisk stabilitet og om stationen kan bruges nu.
- **REQ-STATION-007 – AKTIV:** Foreslå bedre station til en zone, men ændr ikke administratorens valg automatisk.
- **REQ-STATION-008 – AKTIV:** Historiske/inaktive stationer markeres tydeligt og kræver ekstra bekræftelse ved override.
- **REQ-STATION-009 – AKTIV:** Stationskortet skal kunne verificeres mod DMI's officielle register.
- **REQ-STATION-010 – IMPLEMENTERET I 4.0.103, AFVENTER PRODUKTIONSBEKRÆFTELSE:** DMI-prognosepunkter opdages via `tidewaterstation`-collectionen. Alle vandstandskilder auditeres med kildetype, discovery-resultat, prognosehorisont, gyldighed og routingberettigelse.

## Retning, zoner og kort
- **REQ-GEO-001 – IMPLEMENTERET:** Strøm er bevægelsesretning; vind er fra-retning.
- **REQ-GEO-002 – AKTIV:** Alle zoners pålandsretning skal kunne auditeres og dokumenteres.
- **REQ-GEO-003 – IMPLEMENTERET:** Als Odde/Helberskov er placeret nord for Mariager Fjord.
- **REQ-GEO-004 – AKTIV:** Hav-/landpunktsfunktionen ændres kun ved en udtrykkelig bestilling; spørgsmål om betydning er ikke implementeringskrav.
- **REQ-GEO-005 – IMPLEMENTERET I 4.0.90:** Kystlinjeeditoren bevarer lokale krumninger, Flyt kort og Præcis redigering. Søgning vælger og viser den matchende zone, og navn/geometri gemmes centralt med readback og anvendes automatisk ved deployment.
- **REQ-GEO-006 – IMPLEMENTERET I 4.0.93:** Administratoren kan omdøbe, ændre kystlinje, ændre land-/havpunkter og retningsankre samt slette zoner. Godkendte ændringer, også en fuld 180° korrektion, må gå til produktion uden håndrettede tests; tests validerer integritet og konsistens frem for gamle værdier.
- **REQ-GEO-007 – AKTIV / PILOT:** Kystgeometri v2 skal bygges parallelt og score-neutralt efter DEC-0032. Produktionszoner og centrale administratorændringer må ikke overskrives i pilotfasen.
- **REQ-GEO-008 – BINDENDE:** Den viste kystlinje beskriver relevante ravstrande og må springe over havne, åudløb og irrelevante kystdele. Alle indre fjorde undtagen Limfjorden udelukkes efter en eksplicit revisionsbar afgrænsning.
- **REQ-GEO-009 – BINDENDE:** Utilsigtede zoneoverlap, fuldt indlejrede zoner og huller accepteres ikke i v2. Bevidste undtagelser kræver en maskinlæsbar begrundelse og test.
- **REQ-GEO-010 – AKTIV / PILOT:** En zone kan have flere navngivne lokale kystdele med egne land-/vandpunkter og retninger. De må kun fremstilles som selvstændige målepunkter, når DMI-sampling, provenance, merge, score/state og UI faktisk understøtter dem ende til ende.
- **REQ-GEO-011 – BINDENDE:** Eksisterende zone-ID'er bevares som udgangspunkt. Flytning eller omdøbning, der ændrer et IDs geografiske betydning, kræver eksplicit migration af eller afgrænsning mod historik, observationer, regler og læringsdata.
- **REQ-GEO-012 – BINDENDE:** Zonenavne valideres mod faktisk geografi og autoritative danske stednavne. Et eksisterende navn må ikke bruges som geografisk facit.
- **REQ-GEO-013 – BINDENDE:** Admin skal efter v2 bevare central, revisionsbar redigering af navn, kystlinje, lokale kystdele, land-/vandpunkter og retninger med readback og rollback.
- **REQ-GEO-014 – PLANLAGT SCORE-NEUTRAL REGISTRERING:** Høfder, læsider, odder og lignende ravfælder kan registreres som morfologiske featurehypoteser, men må ikke ændre RavScore uden DEC-0029-forskning og en senere særskilt godkendelse.
- **REQ-GEO-028 – IMPLEMENTERET LOKALT I 4.0.141 / AFVENTER PRIVAT CI:** En privat kystdelsvisning må ikke ligne selvstændige aktive zoner. Parent-zonens eksisterende RavScore-farvede kystlinje, score, klikmål, tooltip og rangering bevares. Delkonturer er neutrale, stiplede, ikke-interaktive og tydeligt mærket ikke aktive; delscore, scorefarve, rangering og “bedste del” er forbudt.
- **REQ-GEO-029 – IMPLEMENTERET LOKALT I 4.0.142 / AFVENTER PRIVAT CI:** Admin-roundtrip skal bruge en unik midlertidig, aldrig aktiv kladde, verificere create/read/update/delete og fravær efter rollback samt bevise med hash og version, at centrale runtime-dokumenter er uændrede.
- **REQ-GEO-030 – AKTIV PRODUKTBESLUTNING / IKKE AKTIVERET:** For en zone med validerede lokale kystdele bestemmes zonescoren af den højeste gyldige delscore pr. tidspunkt og jagtform. UI skal tydeligt angive, om scoren gælder hele zonen, bestemte navngivne dele eller har usikker dækning, og forklare vind, strøm, bølger, vandstand, state/historik og øvrige aktive bidrag samt forskellen til de andre dele. Se DEC-0033.
- **REQ-GEO-031 – AKTIV MIDLERTIDIG PRODUKTREGEL:** Dækningsforklaringen må ikke være krakilsk. En forskel på højst 7 point behandles som praktisk hele zonen uden delopdeling; først over 7 point udløses navngiven delvis dækning. Marginen skal genanalyseres i den store planlagte RavRadar-/RavScore-analyse.
- **REQ-GEO-032 – AKTIV NATIONAL BESTILLING / TESTSIDE-AKTIVERING TILLADT EFTER NATIONAL GATE:** Kystgeometri-v2, stedbaserede lokale delnavne, lokale datapunkter og dækningsvisning skal bygges og aktiveres for hele Danmark på den nuværende pre-domain GitHub Pages-testside. Kandidaten skal fortsat være central-admin-hydreret og bestå national geometri-, topologi-, navne-, DMI/proveniens-, state-, UI-, rollback- og releasevalidering. Se DEC-0034.
- **REQ-GEO-033 – BINDENDE MILJØAFGRÆNSNING:** Den nuværende side har ingen aktive brugere og behandles som testmiljø. En senere flytning til købt domæne og egentlig brugerrelease kræver ny eksplicit modenheds-/produktionsgate; testaktivering er ikke automatisk domæneproduktionsgodkendelse.
- **REQ-GEO-034 – PRIVAT CI-VERIFICERET I #2029:** Den nationale kildekæde skal starte fra præcis den centralt hydrerede effektive zonebestand, danne reproducerbare kildefliser og klassificere semantik-, partition-, topologi- og admin-konflikter maskinlæsbart. Den må ikke aktivere noget.
- **REQ-GEO-035 – PRIVAT CI-VERIFICERET I #2029:** Gratis officielle GeoDanmark-lag skal kunne hentes nationalt i et isoleret job, deduplikeres på tværs af fliseoverlap og gemmes credential-frit i et privat artifact. Jobbet må ikke have Pages-rettigheder eller ændre admin, vejr, score eller aktiv geometri.
- **REQ-GEO-036 – PRIVAT CI-VERIFICERET I #2029:** National hentning skal have begrænset parallelitet og synlig flisefremdrift. Før upload skal en streng gate verificere 208-zoners planbinding, alle eksponerede lags komplette filer/hashes, deduplikering, falske mutationsflag og credentialfravær; derefter skal rumligt indekseret source-QA dække alle zoner.
- **REQ-GEO-037 – PRIVAT CI-VERIFICERET I #2033:** Det private nationale job skal bevare det fulde råartifact og samtidig udgive plan, manifest og 208-zone-QA som et særskilt kompakt privat artifact, så efterfølgende audit ikke kræver download af hele råpakken.
- **REQ-GEO-038 – PRIVAT CI-VERIFICERET I #2037 / ÅMUNDINGSPOLICY FAGLIGT AFVIST:** Før nationale kystdele må genereres, skal en read-only topologiaudit for alle 208 effektive zoner måle officielle fjord-/normasker uden for Limfjorden, havne, synlige reelle åmundinger, klit-/skræntevidens og høfter. En fail-closed gate skal kræve komplette officielle masker, entydigt zoneoutput og falske mutations-/aktiveringsflag.
- **REQ-GEO-039 – PRIVAT CI-VERIFICERET I #2040:** En zone med flere end 20 målte åmundingsklynger må ikke få åmasker anvendt; den skal markeres oversegmenteret. Artifactet skal indeholde en aggregeret profil af scalar-egenskaber og højst 200 geometri-frie diagnostiske inputposter, så den nationale regel kan skærpes evidensbaseret.
- **REQ-GEO-040 – PRIVAT CI-VERIFICERET I #2043:** En åmundingskandidat skal have officiel `midtebredde` på mindst 2,5 m og mindst 100 m fysisk linjelængde. Smalle/korte fravalg skal tælles, og den eksisterende overdense no-go-gate skal fortsat gælde efter filtrering.
- **REQ-GEO-041 – PRIVAT CI-VERIFICERET I #2047:** Maskeret national topologi skal grupperes til private kystdele uden nogen konstrueret forbindelseslinje. Alle 208 zoner skal have entydig status; del-ID'er skal være stabile, navne må ikke opfindes, og punkter/sampling/state/score/aktivering skal forblive falske.
- **REQ-GEO-042 – PRIVAT CI-VERIFICERET I #2050:** En genereret del over 20 km eller med over 20 fysiske fragmenter må ikke gå videre som lokal vejrdel. Den skal markeres til lokalitetsreview, mens eksisterende plan-, kilde-, å- og fragmenteringsblokeringer bevares revisionsbart.
- **REQ-GEO-043 – VERIFICERET I #2055:** Officielle stednavnekandidater skal hentes for de faktiske nationale kystdele via den nøglefri officielle kilde og den central-hydrerede fliseplan. Hver del skal få balanceret direkte kyst-, bebyggelses-, havne- og øvrig kontekst med ID, status og afstand; kandidatloft og aggregerede summer valideres. `proposedName`, automatisk omdøbning og aktivering skal forblive falske/null.
- **REQ-GEO-044 – IMPLEMENTERET LOKALT I 4.0.152 / AFVENTER PRIVAT CI:** Lokalitetssplittet må kun behandle flaggede dele, bevare den officielle kildelinje 1:1 og holde hvert forslag på højst 20 km. Nærliggende kildefragmenter må grupperes inden for 3 km, men der må ikke tegnes forbindelsesgeometri. Output er privat og read-only med null-navn samt falsk admin-, DMI-, state-, score- og aktiveringsstatus.
- **REQ-GEO-045 – IMPLEMENTERET LOKALT I 4.0.154 / AFVENTER PRIVAT CI:** Den endelige nationale delbestand skal have private, zoneunikke og revisionsbare navneforslag med officielt kandidat-ID, afstand, relevansklasse og alternativer. Kyst-/strandnavne og nære lokale bebyggelser prioriteres med en eksplicit policy; havne er kun kontekst. Forslag må ikke omdøbe eller aktivere automatisk.
- **REQ-GEO-046 – PRIVAT CI-VERIFICERET I #2115:** Et lokalt land-/vandpunktpar må kun foreslås, når et officielt landvidne og et officielt Farvand-vidne eller zonens centralt hydrerede marinepunkt beviser modsatte sider af den lokale kystnormal. Tvivl giver null-punkter, maskinlæsbar blokering og to neutrale normalalternativer. Sampling, state, score og aktivering forbliver falsk.
- **REQ-GEO-047 – PRIVAT CI-VERIFICERET I #2127:** Alle vandkandidater testes på relevante native WAM-/DKSS-modelområder ud fra central `coastType`. Mindst én komplet havmodelfamilie er tilstrækkeligt vand/gridbevis; fuld vejrdækning kræver begge familier, og mangler må aldrig blive nul. Et tvivlstilfælde løses kun ved præcis ét gyldigt alternativ. Rapporten indeholder ingen rå vejrserier og aktiverer ikke runtime.
- **REQ-GEO-048 – IMPLEMENTERET LOKALT I 4.0.159 / AFVENTER PRIVAT CI:** Hver gridvalideret lokal del skal have unik serie- og historikidentitet, egen samplingpoint/gridproveniens og egne komponentgab. Parentfallback, krydsmerge, interpolation og historikgenbrug er forbudt. Blokerede dele må ikke få kontrakt. Alle 208 parent-zoner forbliver autoritative, og sampling/state/score/public projection er falsk.
- **REQ-GEO-049 – IMPLEMENTERET LOKALT I 4.0.160 / AFVENTER PRIVAT CI:** Hver faktisk tilgængelig WAM-/DKSS-familie pr. lokal del skal have mindst to komplette native trin med provider, collection, modelrun, native tid og gridpunkt. Current-U/V skal dele fysisk celle og vertikallag. Kendte familiegab forbliver missing; artifacts må kun indeholde tilstedeværelse, digests og provenance, aldrig rå værdier.
- **REQ-GEO-050 – IMPLEMENTERET LOKALT I 4.0.162 / AFVENTER PRIVAT CI:** Privat part-state må kun beregnes for dele med komplette native current-U/V-trin. Hver del skal have egen historiknøgle; parent-/krydslæsning er forbudt. De fire WAM-only dele skal forblive uden state. Rå replayværdier skal slettes, og `shadow-v2` må ikke ændre RavScore-komponenter eller totalscore.
- **REQ-GEO-051 – IMPLEMENTERET I 4.0.163 / #2157 STOPPEDE PÅ TIDSBUDGET / 4.0.164 AFVENTER CI:** En lokal del må ikke indgå i shadow-score uden egen native HARMONIE-vindserie. Wind-U/V skal komme fra samme fysiske celle ved mindst to forecasttrin og bære provider, collection, modelrun, native tid og gridpunkt. Parentfallback, interpolation og råværdier i artifact er forbudt. Det private 774-dels trin må få et større kørselsbudget, men datagaten må ikke svækkes.
- **REQ-GEO-052 – IMPLEMENTERET LOKALT I 4.0.164 / AFVENTER PRIVAT CI:** National shadow-score må kun bruge den eksisterende `calculateRavScore` på eksakt tidsfælles native lokale vind-, bølge-, strøm- og vandstandsdata samt isoleret part-state. Alle 752 fuldt WAM+DKSS-dækkede dele skal faktisk scores; en tom eller delvis population må ikke bestå. De 22 kendte deldækningsgab skal give `uncertain`. Ved komplette dele bruges 7-pointmarginen til `whole-zone`, `only-part` eller `several-parts`. Rå input skal slettes, og aktiv score, UI, admin og public runtime må ikke ændres.
- **REQ-GEO-015 – BINDENDE:** Kystgeometri v2 må kun anvende gratis data og gratis teknisk adgang. En gratis API-nøgle er tilladt, men løsningen må ikke kræve køb, betalingsplan eller en betalt fallback. Attribution, fair use, cache og reproducerbar kildeudskiftning er obligatorisk.
- **REQ-GEO-016 – PRODUKTIONSVERIFICERET I #1936:** GeoDanmark hentes kun i et særskilt manuelt valgt, privat og score-neutralt workflowjob. Jobbet hydrerer central admingeometri/tombstones før fetch, læser `DATAFORDELER_API_KEY` kun fra GitHub Secrets, skriver aldrig nøgle eller request-URL med nøgle til filer/logs/artifacts og har ingen Pages-skriverettigheder.
- **REQ-GEO-017 – IMPLEMENTERET LOKALT / AFVENTER CI-PILOT:** Piloten skal analysere den centralt effektive pilotbestand mod de komplette GeoDanmark-kyst- og kontekstlag og levere private målinger og kort. Resultatet er reviewmateriale, ikke et automatisk produktionsforslag; alle manuelle kystlinjekonflikter, store afstande og fragmenterede kilder skal stoppe blind snapping.
- **REQ-GEO-018 – IMPLEMENTERET LOKALT / AFVENTER CI-PILOT:** Hvert fysisk GeoDanmark-kildestykke skal klassificeres som nær eksisterende linje, delvist match eller semantisk/grænsemæssigt review. Danmarks officielle stednavneregister anvendes geografisk afgrænset til kandidater og migrationstriage. Ingen rå kildedel eller navnekandidat må aktiveres eller omdøbe automatisk.
- **REQ-GEO-019 – IMPLEMENTERET LOKALT / AFVENTER CI-PILOT:** Sammenhængende kystdelsforslag må kun bygges privat af geometrisk støttede kildestykker. Semantiske stykker stoppes; havne og faktiske kystskærende åmundinger udskæres revisionsbart; fjordpolitikken er eksplicit pr. pilotområde. Output må ikke ændre admin, vejrsampling, produktion eller RavScore.
- **REQ-GEO-020 – IMPLEMENTERET LOKALT / AFVENTER CI-PILOT:** Indre fjord-/norfravalg uden for Limfjorden skal håndhæves med officielle polygoner, ikke kun dokumenteres som tekst. Hver pilotzone skal have eget højopløseligt reviewkort og en maskinlæsbar geografisk dom. Kun udtrykkeligt frigivne detailkandidater må gå videre til land-/vandpunktdesign.
- **REQ-GEO-021 – IMPLEMENTERET LOKALT / AFVENTER CI-PILOT:** Blåvands detailforslag skal splitte ved det officielle Blåvands Huk, danne to navngivne retningsdele og forskyde den fysiske kyst et dokumenteret lokalt bånd mod en verificeret landside. Punktpar og høfter forbliver private og score-neutrale; DMI-grid, admin-roundtrip og produktion kræver senere særskilte gates.
- **REQ-GEO-022 – PRODUKTIONSVERIFICERET I #1982:** Blåvand skal kontrolleres reproducerbart mod gratis officielt GeoDanmark-ortofoto gennem det isolerede pilotjob. API-key og credential-bærende URL må aldrig gemmes eller logges; tiles og overlays forbliver private. Ortofotogaten kræver et visuelt go/no-go og må ikke aktivere geometri, punkter, vejrsampling, admin-data eller RavScore.
- **REQ-GEO-023 – PRODUKTIONSVERIFICERET I #1982:** En ortofotoafvist indadgående huk-hårnål må kun fjernes via eksplicitte route/chord-tærskler, bevarelse af det søværts apex og fail-closed regression. Ingen generel udglatning eller håndtegnet produktionskyst er tilladt.
- **REQ-GEO-024 – PRODUKTIONSVERIFICERET I #1987:** Hver privat Blåvand-vandpunktkandidat valideres direkte mod aktuelle native `wam_nsb`- og `dkss_nsbs`-GRIB-felter med samme nearest-valid-cell-, afstands- og fælles U/V-gridregler som produktionen. Rapporten skelner gyldige celler fra faktisk uafhængige gridserier og aktiverer ikke sampling, admin-data, geometri eller RavScore.
- **REQ-GEO-025 – PRODUKTIONSVERIFICERET I #1992/#1991:** Fremtidige lokale vejserier skal have stabil `zoneId::partId`-identitet, egen samplingproveniens og separat historik. Data fra forskellige kystdele må ikke krydsmerges, og den eksisterende zoneserie/-score forbliver autoritativ, indtil hele private flertidsserie-, provenance-, state-, UI- og admin-kæden er valideret og ejeren træffer særskilt go/no-go.
- **REQ-GEO-026 – PRODUKTIONSVERIFICERET I #1997/#1996:** Hver Blåvand-del skal bevise mindst to fælles komplette native WAM-/DKSS-tidstrin. Hver komponent skal fastholde delserie-ID, modelkørsel, native tid, fysisk gridpunkt, vertikallag, nul interpolation og nul fallback. Privat evidens må ikke gemme rå vejrværdier, krydsmerge dele eller aktivere runtime, state, score, UI eller admin.
- **REQ-GEO-027 – PRODUKTIONSVERIFICERET I #2004/#2003:** Privat state-replay skal bruge en unik `historyKey` pr. kystdel og den faktiske score-neutrale `shadow-v2`-funktion. Parent-historik, krydslæsning, delte nøgler og scorepåvirkning er forbudt. Rå replayværdier må kun findes midlertidigt uden for artifactet og skal slettes efter validering; state forbliver deaktiveret.
- **REQ-ADMIN-007 – AKTIV:** Tekniske nødkladder og eksportmellemtrin må ikke være en del af ejerens normale arbejdsgang. De kan bevares internt som fejlsikring; faglige statusser som en endnu ikke aktiv regel må fortsat vises forståeligt.

## RavScore og forklaring
- **REQ-SCORE-001 – AKTIV:** Debug forklarer rådata, kilder, retninger, delscorer, caps, regler og AI.
- **REQ-SCORE-002 – AKTIV:** Statiske kystforhold må kun forstærke dokumenteret dynamisk transport.
- **REQ-SCORE-003 – AKTIV:** Høje eller nabomæssigt usandsynlige scorer flagges til audit.
- **REQ-SCORE-004 – AKTIV:** Scorepræsentation skal være konsistent på kort, bedste områder og femdøgnsvisning.

## Admin, regler og eksperter
- **REQ-ADMIN-001 – AKTIV:** Ikke-teknisk administrator skal kunne forstå hvert felt og dets effekt.
- **REQ-ADMIN-002 – AKTIV:** Regelbygger i trin med livepreview, forklaringsknap, geografiske grupper og konflikttjek.
- **REQ-ADMIN-003 – AKTIV:** Dialoglukning virker via kryds, Annuller, Escape og klik udenfor med advarsel ved ikke-gemte ændringer.
- **REQ-ADMIN-004 – AKTIV:** Prioritet vises som Lav/Normal/Høj/Kritisk med forståelig effekt; internt tal kan bevares.
- **REQ-ADMIN-005 – AKTIV:** Centrale ændringer har versionshistorik og rollback.
- **REQ-ADMIN-006 – IMPLEMENTERET LOKALT I 4.0.153 / AFVENTER SUPABASE- OG PRODUKTIONSVERIFIKATION:** Scheduler-readback må kun hente payload for nødvendige centrale adminnøgler. Identiske writes må ikke skabe nye versioner. Udskiftelige maskindiagnostikker beholder kun aktuel tilstand; menneskeligt redigerede admin-data bevarer bounded rollback. Oprydning kræver read-only audit og må aldrig slette `admin_documents`.

## Projektstyring
- **REQ-RDKS-001 – IMPLEMENTERET:** RDKS læses før arbejde og opdateres ved hver ny version.
- **REQ-RDKS-002 – IMPLEMENTERET:** Historiske chats er normaliseret, kronologiseret og sporbare.
- **REQ-RDKS-003 – AKTIV:** Samtalens nye beslutninger og status indarbejdes automatisk ved versionsaflevering.
- **REQ-RDKS-004 – AKTIV:** Håndbogen opdateres ved relevante arkitektur-, data-, score- og adminændringer.
- **REQ-AI-MODEL-001 – BINDENDE:** Codex skal selv vurdere modelbehov før hvert væsentligt arbejdsafsnit og aktivt anbefale den billigste aktuelt tilgængelige model, der kan levere samme nødvendige kvalitet og sikkerhed.
- **REQ-AI-MODEL-002 – BINDENDE:** Sol bruges ved kritisk/komplekst arbejde og ved tvivl. Hvis Codex har anbefalet en billigere model, skal Codex stoppe og anbefale skift tilbage til Sol før næste kritiske del; ansvaret må ikke overlades til den ikke-tekniske ejer.
- **REQ-AI-QUOTA-001 – BINDENDE:** Kvotegrænser må ikke reducere analyse, forskning, tests eller validering. En nødvendig pause kræver et permanent, genoptageligt checkpoint med evidens, status, hypoteser, ændringer, tests, næste trin og anbefalet model.
- **REQ-AI-CHAT-001 – BINDENDE:** Når ejeren beder om en ny chat, skal Codex først synkronisere projekthukommelsen, skrive et permanent aktuelt handoff-checkpoint og levere en indsættelsesklar startbesked. Halvfærdig kode, worktree-status, manglende tests/gates og anbefalet model skal fremgå.
## Release og domæne
- **REQ-WORKFLOW-INVENTORY-001 – IMPLEMENTERET I 4.0.121:** `.github/workflows/update-and-deploy.yml` er eneste repository-ejede aktive workflow. Nye workflowfiler kræver en udtrykkelig aktiv test-, release- eller recoveryrolle og opdateret kontrakttest/dokumentation; GitHubs `pages-build-deployment` er ikke en repositoryfil.
- **REQ-RELEASE-001 – IMPLEMENTERET:** En samlet release-gate skal bestå før en ZIP kan erklæres installationsklar.
- **REQ-RELEASE-002 – IMPLEMENTERET:** Releasepakker må ikke indeholde `.git`, secrets, caches eller `node_modules`.
- **REQ-RELEASE-003 – AKTIV:** CI-fejl udløser samlet release-audit og dokumenteret ny pakke – ikke manuelle enkeltlapninger som slutleverance.
- **REQ-RELEASE-004 – IMPLEMENTERET I 4.0.103:** `_support/` og support-ZIP må aldrig indgå i det offentlige GitHub Pages-artifact.
- **REQ-DOMAIN-001 – AKTIV:** RavRadar klargøres til `ravradar.dk` med relative stier, Supabase redirects, HTTPS og kontrolleret canonical-strategi.
- **REQ-HANDBOOK-001 – IMPLEMENTERET:** Håndbogen beskriver grundigt rav-/sedimentprocesser og kortlægger dem til den faktiske scorekode og ekspertregler.

- **REQ-HANDBOOK-002 – IMPLEMENTERET:** Håndbogen skal beskrive rav- og sedimenttransport ekstremt grundigt, herunder alle centrale mekanismer, aktive scoretærskler, usikkerheder, forskningsanalogier og prioriterede ekspertspørgsmål.
- **REQ-HANDBOOK-003 – IMPLEMENTERET:** Ekspertspørgsmål skal have stabile ID'er og være sporbare til kode og evidensklasse.
- **REQ-RELEASE-002 – IMPLEMENTERET:** Release Gate skal stoppe ændringer, hvor centrale scorekonstanter eller fagkapitler ikke længere stemmer med håndbogen.


## 4.0.66 – regressioner, strøm og frisk opstart
- Admin-login skal virke med eksisterende Supabase-opsætning og må aldrig hænge uendeligt.
- Kritiske brugerrejser skal regressionssikres.
- Strømretning skal kunne spores fra rådata til pil og RavScore.
- Spørg RavRadar skal forstå almindelige spørgsmål.
- Forsiden skal starte progressivt uden gamle eller blandede data.

## 4.0.86 – komplette brugerrejser
- **REQ-ADMIN-006 – IMPLEMENTERET:** En funktion er først færdig, når den har en synlig indgang, kan gennemføres og resultatet kan findes igen i den aktive admin.
- **REQ-HANDBOOK-004 – IMPLEMENTERET:** Håndbogsreview har synlig reviewkø, direkte genvej, statusbehandling, central implementering og håndtering af lokale nødkladder.
- **REQ-DIAGNOSTIC-001 – IMPLEMENTERET:** Sitetestens deploykontrol skelner 404, timeout, netværksfejl og øvrige HTTP-fejl.
- **REQ-DIAGNOSTIC-002 – IMPLEMENTERET:** Opstartsprofilen opdeles i netværk/data, beregning og rendering.

- **REQ-ADMIN-008 – IMPLEMENTERET I 4.0.94:** Aktive centrale regler skal automatisk publiceres til én fælles offentlig regelfil. Offentlig RavScore må ikke afhænge af browserens lokale adminlager, og rå adminmellemdata må ikke udstilles på GitHub Pages.

## Vandstandsserier og administratorvalg – bindende regressionkrav
- `null`, `undefined` og tomme DMI-værdier må aldrig normaliseres til fysisk 0 cm.
- En vandstandskilde må kun være routingberettiget, når den indeholder en reel, tilstrækkelig femdøgnsserie.
- Første klik på en vandstandskilde i en zone uden tidligere routing skal straks oprette zonens routingpost, aktivere override, vise valget rødt og gøre det centralt gemmeligt.

## Vandstandsadmin – prioriteret og atomisk initialisering
- **REQ-WATER-ADMIN-INIT-001 – IMPLEMENTERET I 4.0.105:** Vandstandsfanen må først være klikbar, når zoner, vandstandskilder og central routing er indlæst som én sammenhængende tilstand.
- **REQ-WATER-ADMIN-INIT-002 – IMPLEMENTERET I 4.0.105:** Øvrige admin- og diagnosekald må ikke blokere eller senere overskrive brugerens aktive vandstandsrouting.
- **REQ-MAP-ARROWS-ZOOM-001 – AKTIV, IKKE IMPLEMENTERET:** Ved indzoomning skal kortet vise mærkbart flere verificerede vind- og strømpile, når flere faktiske DMI-gitterpunkter findes i udsnittet. Pilene må ikke flyttes eller kunstigt kopieres, og ændringen må ikke påvirke DMI-data eller RavScore.

- Vandstandskortets klik, røde markører og Fjern skal reagere straks, også hvis browserens localStorage er fuld. Central Supabase-lagring må ikke afhænge af lokal cache.

## Tilstandsmodel og læring – 4.0.107+
- **REQ-STATE-001 – IMPLEMENTERET I SKYGGETILSTAND I 4.0.107:** Historikken skal akkumulere faktisk indadgående og udadgående DMI-strøm over tid i stedet for kun at bruge et øjebliksbillede.
- **REQ-STATE-002 – AKTIV:** Den numeriske score skal senere stige gradvist med varigheden og styrken af dokumenteret indadgående strøm; der må ikke indføres et fast universelt krav om 3–5 timer.
- **REQ-STATE-003 – AKTIV:** Efter meget kraftig mobilisering skal roligere forhold og indadgående strøm kunne opbygge potentialet gradvist mod et stærkt niveau omkring et cirka 10-timers forløb, ikke via en hård kontakt.
- **REQ-STATE-004 – AKTIV:** Tidligere indtransport skal kunne skabe et vedvarende nærkystpotentiale, som ikke nulstilles af svage vinddrejninger, men kan nedbrydes af stærk/vedvarende udtransport.
- **REQ-STATE-005 – BINDENDE:** Generelle strømbånd må ikke bruges i score, tilstand eller fallback. Kun faktiske marine data må styre strømtransporten.
- **REQ-RESEARCH-RAVSCORE-001 – PLANLAGT:** Efter afsluttet/klart afgrænset forecaststabilisering og højere P0/P1-opgaver skal RavScore og den samlede fysiske ravkæde gennemgå en kildekritisk forsknings- og modelvalideringsrunde efter DEC-0029. Første fase er score-neutral og uden produktionskode.
- **REQ-RESEARCH-RAVSCORE-002 – BINDENDE FOR DEN PLANLAGTE OPGAVE:** Forskningen skal skelne frigivelse, transport, koncentration/aflejring og jagtbarhed, kortlægge faktisk kode regel for regel og bevare kilder, evidensstyrke, geografisk/tidsmæssig relevans, antagelser og forkastede hypoteser permanent.
- **REQ-RESEARCH-RAVSCORE-003 – BINDENDE STOPREGEL:** Ingen forskningskonklusion må automatisk ændre RavScore, regler, vægte, data eller fallback. Konkrete ændringer kræver efterfølgende særskilt godkendelse, valideringsdesign, regressionanalyse og versionering.
- **REQ-RESEARCH-CURRENT-STRUCTURES-001 – PLANLAGT UDEN PRODUKTIONSMANDAT:** Rumlige strømstrukturer, opstrøms transport, konvergens/divergens og persistente korridorer skal undersøges for selvstændig informationsværdi. REQ-STATE-005 forbliver bindende, indtil stærk evidens og en senere eksplicit beslutning eventuelt erstatter den.
- **REQ-RESEARCH-WIND-FIELD-001 – PLANLAGT UDEN PRODUKTIONSMANDAT:** Den store DEC-0029-analyse skal undersøge det relevante rumlige og historiske vindfelt over hav og kyst, inklusive områder uden viste kortpile. Pile er UI-visualiseringer og må ikke definere analyseområdet. Opstrøms/regional vind, kobling til bølger og strøm, tidsforsinkelse, persistens, overlap og dobbelt-tælling skal vurderes, før et eventuelt nyt signal overhovedet kan foreslås.
- **REQ-PERFORMANCE-STATE-001 – BINDENDE:** Historik og tilstandsberegning sker i pipeline. Offentlig runtime må kun modtage kompakte afledte felter, og opstart må ikke forringes væsentligt.
- **REQ-MORPHOLOGY-001 – BINDENDE:** Eksisterende dokumenteret morfologi må fortsat påvirke scoren. Manglende data er neutralt, og administratoren pålægges ikke ny landsdækkende manuel kortlægning.
- **REQ-OBSERVATION-ZONE-001 – AKTIV:** En fundrapport skal kræve valg af jagtzonen. GPS bruges som plausibilitetskontrol og må ikke automatisk antages at være jagtstedet, fordi rapporten kan indsendes hjemmefra.

## Historisk model og brugerfund – aktivt
- Den historiske tilstandsmodel skal valideres i skyggetilstand, før den får lov at ændre RavScore.
- Indtransport skal senere påvirke score gradvist efter varighed og styrke; der må ikke indføres en fast generel forsinkelse.
- Brugerfund skal kræve valgt zone; GPS bruges kun til plausibilitetskontrol.
- Projektet skal være kildeneutralt og må ikke indeholde navne på eksterne analysekilder.


## Chat-overlevering og referencevalidering – 4.0.112
- **REQ-HANDOFF-001 – IMPLEMENTERET:** Hver release før en ny projektchat skal bære en selvstændig RDKS-overlevering med læserækkefølge, aktuel baseline, næste plantrin, risici, referencezoner og bindende afgrænsninger.
- **REQ-REFERENCE-001 – IMPLEMENTERET:** Tilstandsmodellen skal kunne valideres automatisk på faste referencezoner uden gentagne manuelle billedserier.
- **REQ-REFERENCE-002 – BINDENDE:** Referencezonerapporten er diagnostik og må ikke i sig selv ændre RavScore.
- **REQ-REFERENCE-003 – BINDENDE:** Als Odde og Helberskov må ikke klassificeres som fjordzone.
- **REQ-SITETEST-DASHBOARD-001 – IMPLEMENTERET:** Sitetesten må først kontrollere samlet-test-knappen efter at dashboardfanen er aktiv og knappen er synlig og klikbar.
- **REQ-SCREENSHOT-001 – BINDENDE:** Ejeren skal kun bedes om nye manuelle screenshots i yderste nødstilfælde, når projekt-ZIP, logs, sitetest og automatisk diagnostik ikke kan afgøre spørgsmålet.

## Workflowcache og produktionsbevis – 4.0.113
- **REQ-DMI-CACHE-PROGRESS-001 – IMPLEMENTERET:** Rå DMI GRIB-cache skal kunne akkumulere fremdrift mellem GitHub-kørsler. Save-nøglen skal være unik, og næste kørsel skal gendanne seneste kompatible cache.
- **REQ-REFERENCE-PRODUCTION-001 – IMPLEMENTERET:** Hver frisk produktion skal logge referencezonernes datasæt-id, strømverifikation og skyggefelter i maskinlæsbart format.
- **REQ-REFERENCE-PRODUCTION-002 – BINDENDE:** Frisk produktion må ikke bestå den strenge referencekontrol, hvis en af de fire zoner mangler en score-neutral skyggetilstand. Nye produktioner skal bruge `shadow-v2`. Manglende verificeret DMI-strøm skal logges som advarsel og må ikke erstattes af generelle strømbånd eller anden transportfallback.
- **REQ-SCHEDULER-MEASURE-001 – AKTIV:** Croninterval må først ændres efter måling af mindst tre kørsler med fungerende progressiv cache.

## Release- og deployrobusthed – 4.0.114
- **REQ-DEPLOY-ISOLATION-001 – IMPLEMENTERET:** Den tunge data-/buildkæde og GitHub Pages-deploy skal være separate jobs. Kun deployjobbet må holde `github-pages`-miljøet og Pages-skriverettighederne.
- **REQ-DEPLOY-RETRY-001 – IMPLEMENTERET:** Et fejlet Pages-deploy skal kunne genkøres som fejlet job mod det eksisterende artifact uden ny DMI-kørsel og uden ny artifact-upload.
- **REQ-RELEASE-PRIORITY-001 – IMPLEMENTERET:** En push- eller udtrykkeligt tvungen releasekørsel må afbryde en ældre almindelig vejropdatering. Almindelige eksterne vejrkald må ikke afbryde den aktive tunge kørsel.
- **REQ-DEPLOY-SCORE-NEUTRAL-001 – BINDENDE:** Workflowrettelser må ikke ændre RavScore, marine audits, DMI-proveniens, skyggetilstand eller offentlig startupberegning.


## Verificeret strømhistorik – 4.0.115
- **REQ-STATE-VERIFIED-CURRENT-001 – IMPLEMENTERET:** Historiske transportfelter må kun bruge prøver med verificeret marin DMI-proveniens.
- **REQ-STATE-ACTIVE-RUN-001 – IMPLEMENTERET:** Akkumuleret 24-timers transport og aktuelt sammenhængende strømforløb skal være separate felter.
- **REQ-STATE-GAP-001 – BINDENDE:** En ikke-verificeret prøve eller et hul over to timer stopper det aktive forløb; manglende data må ikke blive til nulstrøm.
- **REQ-STATE-SCORE-NEUTRAL-002 – BINDENDE:** `shadow-v2` må ikke ændre RavScore eller eksisterende morfologibidrag.


## DMI-vektorintegritet og femdøgns-null-sikkerhed – 4.0.116
- **REQ-DMI-SHARED-VECTOR-GRID-001 – BINDENDE:** U/V-komponenter for strøm og vind må kun kombineres fra samme fysiske DMI-gitterpunkt og samme forecasttid. Ingen fælles kandidat betyder manglende data.
- **REQ-DMI-OLD-VECTOR-INVALIDATION-001 – BINDENDE:** Cachede vektorpar med dokumenteret forskellige gitterpunkter må ikke genbruges som gyldige.
- **REQ-WATER-SOURCE-SAMPLING-001 – BINDENDE:** `SOURCE::`-vandstandskilder må kun samples for DKSS-vandstand og må ikke indgå i dækning/schedulerunderskud for forecastzonernes strøm, vind eller bølger.
- **REQ-MISSING-WEATHER-NULL-001 – BINDENDE:** `null`, tom eller ikke-numerisk vind/bølge er manglende data, ikke 0. UI, score, regler og prognosevalg skal bevare denne forskel.
- **REQ-TRUE-ZERO-WEATHER-001 – BINDENDE:** En eksplicit numerisk 0-værdi fra datakilden er gyldig og må ikke forveksles med manglende data.

## 4.0.117 / Codex-overgang – aktive tværgående krav
- **REQ-RELEASE-NO-SKIPPED-GATES – IMPLEMENTERET OG PRODUKTIONSVERIFICERET I #1772:** Et nyt produktionsartifact/deploy efter reel dataopbygning kræver, at både `npm run validate` og `npm run release:gate` kører og består. Preflight-skip uden build/deploy er bevaret. #1772 beviste begge gates, artifact og deploy som `success` i samme friske kæde.
- **REQ-CODEX-BOOTSTRAP-001 – ERSTATTET:** Den midlertidige pre-Codex undtagelse ophørte med første Codex-workflowrettelse. Historikken bevares, men tillader ikke længere deploy med skipped gates.

- **SYSTEMISK FEJLRETNING – AKTIV:** En fejl må ikke behandles som isoleret fil/test. Hele input→produktion→UI→release-kæden skal vurderes, og seneste fungerende reference skal bruges ved regressioner.
- **STABILITETSBEGREB – AKTIV:** Lokal grøn validering er ikke bevis for CI eller produktion. DMI-/Supabase-/pipelineændringer kræver frisk ekstern verifikation før de betegnes produktionsstabile.
- **CENTRAL ADMIN-GEOMETRI – AKTIV OG PRODUKTIONSVERIFICERET:** Centralt gemte kystlinjer, land-/havpunkter, retninger og øvrige redigerbare zonefelter skal være autoritative og propagere gennem hele produktionskæden. Tests må ikke hardcode historiske adminværdier.
- **DMI U/V VERTIKALLAG – AKTIV KONTRAKT:** Current-U/V må kun parres på samme forecasttid, samme fysiske DMI-gridpunkt og samme vertikallag. Kandidater fra forskellige lag må ikke overskrive eller blandes.
- **FORECAST-EDGE-COVERAGE – AKTIV:** Yderste del af femdøgnshorisonten skal undersøges for `missing` strøm/vandstand/vind/bølge. Manglende data må ikke fyldes med stale værdi eller 0.
- **REQ-DATA-007 – IMPLEMENTERET LOKALT, AFVENTER PRODUKTION:** Vind bruger HARMONIE først og DKSS 10-meter U/V som separat DMI-hale. HARMONIE vinder i overlap, og modellerne må ikke krydsinterpoleres.
- **REQ-DATA-008 – IMPLEMENTERET LOKALT, AFVENTER PRODUKTION:** Open-Meteo fallback canonicaliseres fra GMT/UTC og må kun udfylde manglende komponenttimer efter DMI.
- **REQ-DATA-009 – DELVIST IMPLEMENTERET:** Vindtimer bærer DMI-collection og fallbackstatus. Fuld model-run-, lead-time-, alder- og native/interpoleret-proveniens pr. komponenttime mangler fortsat.
- **REQ-DATA-010 – AKTIV:** Frisk produktion skal bevise 118–119 timers faktisk dækning pr. komponent. Vandtemperaturhale og eventuelle resterende huller må ikke erklæres dækket uden dette bevis.
- **CODEX-HUKOMMELSE – AKTIV:** `docs/ai/`, RDKS, håndbog, tests, Git-historik og chatarkiv skal vedligeholdes som projektets persistente AI-hukommelse. Væsentlige beslutninger må ikke kun leve i en samtale.
