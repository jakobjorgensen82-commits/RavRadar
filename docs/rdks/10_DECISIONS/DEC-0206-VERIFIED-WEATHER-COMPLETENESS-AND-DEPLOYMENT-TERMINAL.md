## Tillæg 2026-11-13 — fortsat afgrænset aflæsning efter ukendt Pages-status

Efter en positiv, identitetsvalideret CREATE-kvittering må en syntaktisk gyldig, men ukendt statusstreng kun forlænge de eksisterende GET-observationer inden for samme faste frist. Den samme kvittering, statusadresse, forseglede pakke og eksisterende antal forsøg bevares. Ukendt bliver hverken PENDING, succes eller terminal fejl og giver ingen selvstændig POST-, CANCEL-, genforsøgs- eller afslutningsret. Forkert body, route eller kendt id-/artifact-/kodeidentitet afvises fortsat straks.

Det konkrete forløb havde accepteret bestillingen og fejlede derefter som workflow ved første ukendte status; senere blev den nye prognose observeret offentligt uden en ny genforsøgskørsel. Fejlmailen beskrev derfor workflowets faktiske fejl, ikke bevis for en afvist CREATE. Den oprindelige statusstreng er tabt. Normal fuld målverifikation og skriverafslutning skal fortsat bevises særskilt; de gamle synkroniseringstimeouts er ikke forklaret af denne rettelse. Kandidaten er lokalt målprøvet, ikke dermed leveret. Se håndbog 89.340.

Den beskyttede ejerafslutning kan særskilt afklare et rødt observationstrin, når den autentificerede kørsel er afsluttet, den præcise forseglede målpakke findes i beskyttet lager, hele den normale offentlige verifikation består, to stabile manifestaflæsninger matcher, og alle skrivere samt den centrale peger genlæses uændret. En intern observation er ikke selv en afslutningskvittering. Ukendt offentlig kode eller ændret peger fastholder afslaget. Der gives hverken ny POST, genforsøg eller en klassifikation uden POST. Den normale CLI og reservationskalder giver den eksisterende beskyttede lagerklient videre til denne kontrol. Faktisk hosted afslutning og ny normal vejrlevering er fortsat særskilte åbne beviser.

En ny, kildekvalificeret hovedkode kan færdiggøre den samme almindelige generation, som allerede er beregnet og offentliggjort. Den oprindelige producentidentitet læses fra den beskyttede målpakke; den nye kørsel er kun en verificeret afslutter. Frisk database-/Edge-parathed, fuld offentlig kontrol og uændrede peger-/skriveraflæsninger kræves før den eksisterende atomiske versionskontrol kan færdiggøre aktiveringen. Denne afslutning forsøges før den gamle retirement- og genoptagelsesvej. Den sædvanlige efterkontrol skal derefter selv verificere og rydde den afsluttede fase. Næste planlagte kørsel skal hente frisk vejr på sin normale kanoniske UTC-time; den færdige gamle generation må ikke bruge næste vejrhentning. Der beregnes ikke nyt vejr eller scorer i selve afslutningen, og der sendes ingen ny Pages-bestilling. Originale fasearkiver bevares. Kildelevering, faktisk hosted afslutning og den næste friske vejrhentning kræver fortsat egne beviser.

## 12. november — samme kildegrundlag før kontrol og udgivelse

Udgivelsesreservationen og den tidlige genoptagelseskontrol læser samme tidligere kildefiler. Den tidlige kontrol havde hele Git-historikken, mens flere senere kaldere kun hentede den nyeste commit. Den afgrænsede rettelse giver hele historikken til de faktiske reservations-, afklarings-, claim- og afslutningskaldere. Kildehash, byteantal, autentificeret læsning, eksklusiv reservation og afvisning ved ukendt skriveudfald bevares. Der tilføjes ingen alternativ API-læser eller ny særregel for en bestemt kørsels fejltekst.

Dette ændrer kun runnerens kildegrundlag. Version 4.0.598, SQL-regler, modelbindinger, vejrdata og scorer bevares. Den lokale normale kalderprøve skal bestå før kilde-PR; faktisk hovedkode, genoptagelse og offentlig levering kvalificeres særskilt. Den oprindelige synkroniseringstimeout og alle fem hovedmål er fortsat åbne. Kørselsstatus føres i privat checkpoint.

# DEC-0206 – verificeret vejrkomplethed og sand produktionsslutstatus

**Status:** Aktiv; 4.0.423 backend installeret, normalrun fortsættes med 4.0.426
**Dato:** 2026-09-18

## Problem

Normalrun `35386276428` byggede, deployede og offentlig verificerede 4.0.422,
men sluttede rødt, fordi en diagnostisk fuldvalidering fejlede efter et ellers
gyldigt Pages-deploy. Samme run viste samtidig, at en strukturelt komplet
pakke ikke er det samme som fuld numerisk datadækning: 420 aktuelle
zone-/søgemådetilstande var utilgængelige, og Feggesund manglede 132 af 354
bølge-deltimer.

Den samlede analyse fandt fem sammenhængende årsager i den normale kæde:

1. vindplanlægningen målte rå vindhastighedspunkter, ikke de speed+direction-
   timer med proveniens, som forbrugeren faktisk kan opløse;
2. HARMONIE-vind havde ikke samme sikre seriesøgning som vindhalen, når den
   nærmeste bracketing krydsede en modelkørselskant;
3. privat replay byggede historik og skar den derefter væk på den offentlige
   +0..+117-akse;
4. WAM-lukningen målte de 670 native dele, men ikke de to parentrækker, som
   den godkendte Feggesund-proxy faktisk behøver;
5. én global tidspris lod en langsom WAM-fil gøre billige senere
   providerfamilier kunstigt for dyre.

## Beslutning

- RavRadars driftsmål er altid 100 % gyldig dækning af alle nødvendige felter,
  steder og timer. En `MISSING`-værdi er alene sikker nødadfærd; den tæller
  aldrig som data, komplethed eller afsluttet vejrarbejde.
- Tilføjelse 20. oktober 2026: Den eksisterende schema4-audits
  hovedpunktsprognose bevares som et særskilt, mærket målegrundlag. Den
  additive lokale zonemåling følger i stedet den normalt valgte kystdels
  vejr for hver zone, præcis alle 118 timer fra produktionstimen og hver
  søgemåde (`waders`/`beach`) særskilt. Nævneren bruger den hydrerede aktive
  GeoJSON-`FeatureCollection`, aldrig kun de eksisterende eller resterende
  timer. Vind, bølger, strøm, vandstand, vandtemperatur og deres samtidige
  intersektion samt dansk kalenderfordeling opgøres hver for sig.
- Den normale `hasValue`-semantik genbruges, inklusive gyldige nulbølger uden
  retning. Manglende/afvist række, mode, model eller registry giver aldrig
  dækning; ukendt og faktisk manglende numerisk input skelnes. Hovedpunkt,
  lokal mode, alle PART-timer og strøm-/scorehistorik er forskellige scopes.
  Rapporten giver ingen ny source-/native-/proveniensadgang, ændrer ingen
  målinger eller score og må ikke bruges til at ommærke gamle procenttal.
  Næste normale leverede slutmatrix skal bevise de nye faktiske tal.
- Den rumlige strømaudit fører derfor to adskilte mål: `accountedPartRatio`
  viser, om hver del enten er gyldig eller sikkert markeret, mens
  `requiredCoastalPartCoverageRatio` kun tæller scoreklare, verificerede eller
  tidsbegrænset fastholdte data. `dataCompletenessStatus=COMPLETE` kræver alle
  673 dele uden `MISSING`.
- Ét lokalt hul må stadig ikke gøre resten af hjemmesiden ubrugelig. Den
  berørte score er utilgængelig og kan ikke rangere, mens resten vises, hullet
  rapporteres som ufuldstændigt, og næste normale kørsel fortsætter reparationen.
- Normal vinddækning måles på komplette speed+direction-tupler med gyldig
  proveniens og de samme højst fire timers interpolation/95 minutters
  kantregler som runtimeforbrugeren. Frisk-shortcutten må ikke stole på en
  gammel diagnosesummering.
- HARMONIE `wind` og `windTail` må søge en alternativ bracket i én intakt
  native serie, når den nærmeste bracket alene fejler på en modelrunseam.
  Grid-, entity-, sampling- eller anden proveniensdrift afvises fortsat.
- Privat replay bruger sin eksplicitte historiske starttid. Offentlig runtime
  bruger fortsat præcis produktionstimen +0..+117.
- WAM-DW-promotion og closure medregner parentzonerne `DK-B05-10` og
  `DK-B05-12` som særskilt Feggesund-støtte. Native 670 forbliver et separat
  tal; komplet Feggesund kan ikke længere skjules bag det.
- Estimeret assettid holdes pr. providerfamilie. En dyr WAM-fil må ikke
  blokere en hidtil uset DKSS- eller HARMONIE-fil alene via fælles p95.
- Manuel og planlagt produktion bruger samme terminal. Weather, artifact,
  privacy, seal, Pages og offentlig verifikation er hårde. Fuldvalidering og
  releasegate skal være kørt og rapporteret; et diagnostisk fund efter et
  verificeret deploy giver `DEPLOYED ... WITH_DIAGNOSTIC_FINDINGS`, ikke en
  falsk påstand om at deployet mangler. Fundet og dataufuldstændigheden er
  fortsat åbne og skal rettes.
- Hver normal vejropbygning uploader en payloadfri 673-dels stageoversigt, så
  næste rest kan bindes til rå DMI, record, sanitering eller modelinput uden
  endnu en providerkørsel.

## Binding og afgrænsning

RavScore-formel, vægte, geometri, land-/vandpunkter og providerprioritet
ændres ikke. Fælles inputkode ændrer både den integrerede og Candidate G's
tekniske implementeringsidentitet. Derfor bruges den append-only migration
`20260918190000_weather_input_resolution_binding.sql`; den anvendte
`20260918125600` ændres ikke.

Produktionsbevis kræver efter merge en almindelig vejrkørsel, ikke en oneoff.
Kun den kørsel kan bevise 100 % gyldig datadækning, Feggesund 354/354,
faktisk providerfremgang, aktuel time, scorer og stabil cachevedligeholdelse.

## Tillæg 2026-09-19 – inkompatibel forgængerruntime

Backendrun `35400575522` installerede og verificerede den nye binding. Normalrun
`35400832705` stoppede før providerkald, fordi begge beskyttede private runtime-
generationer korrekt blev klassificeret `MODEL_OR_CONTRACT_INELIGIBLE`, men
restore-trinnet stoppede før den eksisterende active-integrated stateless
recovery. 4.0.424 lader kun handlingen `integrated` fortsætte efter tre
mislykkede restoreforsøg. Første cutover, Candidate G og andre handlinger
forbliver fail-closed. Det er recovery af runtime, ikke lempet datakomplethed.

## Tillæg 2026-09-19 – den midlertidige historical-maintenance-action

4.0.424 bestod exact-head `35401458027`, PR #369 og main `0b4a08ec`, men
normalrun `35401927838` viste en anden sikker vedligeholdelsesaction end den
første fallback omfattede. Den centrale model er allerede `integrated`, mens
bindingen først bliver current efter en frisk pakkes verificerede deploy og
reseal. Indtil da er actionen korrekt `integrated-historical-maintenance`.

Efter tre afviste private runtimes må denne action fortsætte uden runtimebundle,
men kun hvis det eksisterende schema-6-checkpoint først består den samme fulde
struktur-, integritets-, modelbindings-, 673-dels- og tidsvalidering, som
vejrbyggeren senere bruger, og `continuationAvailable` er sand. Manglende,
udløbet, fremtidigt, beskadiget eller inkompatibelt checkpoint stopper før
providerarbejde. Historical maintenance får aldrig den stateless cold-start-
vej, der fortsat er begrænset til exact `integrated`. Candidate G, første
cutover, retur og ukendte handlinger åbnes ikke. Datakomplethedskravet ændres
ikke: næste normale run skal stadig bevise 100 % gyldige nødvendige felter.

## Tillæg 2026-09-19 – checkpointet findes ikke

4.0.425 bestod exact-head `35403040711`, PR #370 og main `05892afc`.
Normalrun `35403510608` viste den konkrete forskel, som den foregående regel
ikke dækkede: GitHub-cache havde ingen checkpointfil, og den beskyttede
Supabase-restore svarede `protected-checkpoint-not-found`. Der var derfor
intet checkpoint at validere eller fortsætte fra.

Den allerede aktive integrerede model må i dette præcise fraværstilfælde bruge
den eksisterende state-less recovery: 48 afgrænsede historiske positioner
bygges kun af målte vejrdata, manglende historiske positioner markeres som
ukendte, og der opfindes ingen data. Dette gælder både action `integrated` og
dens midlertidige samme-model-reseal `integrated-historical-maintenance`.

En checkpointfil, der findes, er fortsat autoritativ. Den skal være aktuel og
bestå struktur-, hash-, modelbindings-, 673-dels- og tidsvalidering; udløb,
fremtid, beskadigelse eller inkompatibilitet stopper og må aldrig omskrives til
fravær. Candidate G, første cutover, retur og ukendte handlinger åbnes ikke.
Datakomplethedskravet ændres ikke, og næste bevis er én almindelig weather.

## Tillæg 2026-11-12 – Pages-intent, genforsøg og lukket vedligeholdelse

### Hold de dokumenterede årsager adskilt

Rodårsagen til de første Pages-timeouts i kørslerne #293 og #294 er fortsat ukendt. Produktionskoden var uændret fra kørsel #292 til kørsel #293. Kørsel #293 og den vellykkede kørsel #295 havde begge 1.107 regulære filer og 766.835.628 ukomprimerede byte i Pages-pakken; digests var forskellige. Det er samme målte størrelse og filantal, ikke en byteidentisk pakke, og det beviser ingen størrelsesårsag.

Den senere API-kompatibilitetsfejl omkring PR #867 er et særskilt fund. Kørsel #303 blev stoppet før Pages af en gammel vandvisningsforventning efter UI-ændringen i PR #874. PR #880 rettede testen, og kørsel #304 blev senere offentligt verificeret. Ingen af disse fund fastslår den oprindelige timeoutårsag.

### Krav til den lokale kandidat

- Hver publiceringshensigt skal være genuint unik og bindes til det id, GitHub faktisk kvitterer for ved CREATE, gennem den kompatible API-vej. Artifactets og udgivelsens identiteter holdes adskilt.
- Kendt terminal lukning og ret til genforsøg er særskilte afgørelser. Højst ét umiddelbart genforsøg må bruge præcis samme forseglede pakke efter de eksisterende identitets-, forgænger- og tidskontroller. Kendt lukning giver ikke alene genforsøgsret.
- Alle tre reelle writerroller autentificeres. Hvis A genoptages af B, skal B være holdbart registreret som udførende ejer for det konkrete mål i den eksisterende pointer/CAS før B's POST. En senere C må ikke overse B. Ukendt skriveudfald giver HOLD. Intet globalt register eller ny tjeneste oprettes.
- Retire før frisk default gælder kun **nye** faser med en valgfri `ordinary-maintenance`-oprindelsespost i lukket format, afledt af autentisk `run-current`/default-kontekst. En konkret lukket, upubliceret vedligeholdelsesfase kræver `current.pending=false`, autentisk oprindelse og **uændret hel ACTIVE/source-/targetbinding**. Afslutningen bruger én phase-CAS med genlæsning til NONE; den udfører ingen BEGIN, source-abort eller ny POST og ændrer ikke B/S, originaler eller leveringskrav. Gamle faser uden posten får ingen retire-ret. Første installation og eksplicit recovery bevares; reelle SOURCE-/modelovergange i PENDING følger fortsat den eksisterende eksplicitte færdiggørelse.

Dette er krav til en lokal kandidat under klargøring, ikke samlet grøn CI eller offentlig levering. 4.0.613 er ikke installeret og må ikke installeres, fordi de nødvendige RAW-/C-/I-bundne Pages-værn endnu ikke indgår. Dens kilde-CI blev derfor bevidst annulleret. Rettelsen skal med før RAW i en ny genuine NULL-førsteudstedelse, planlagt som 4.0.614; den gamle udstedelse og SQL bevares. Ændret SOURCE→SOURCE-binding understøttes ikke af denne kandidat. Alle fem mål forbliver åbne. Se håndbog 89.340; detaljeret kausal evidens og skiftende driftsidentiteter føres privat.

## 12. november — tom Pages-status før oprettelse

En faktisk almindelig vejrhentning er stoppet før CREATE, fordi GitHubs statusopslag for en ubrugt udgivelsesidentitet svarer HTTP 200 med præcis objektet {"status":""}. Den nye afgrænsede rettelse klassificerer dette som ukendt/tom status, på samme måde som et tomt objekt. Det er ikke bevis for fravær eller ret til genforsøg. En ny bestilling kræver fortsat unik hensigt, den beskyttede eksklusive reservation og en positiv CREATE-kvittering; ukendt skriveudfald, fremmed metadata og kendte igangværende udgivelser stopper fortsat.

Rettelsen er lokalt målprøvet, ikke endnu samlet kildekvalificeret eller offentligt verificeret. Vejr, score, originaler, SQL, modelbindinger og den faste cronplan ændres ikke. Den tidligere synkroniseringstimeouts rodårsag er fortsat et særskilt åbent punkt. Alle fem mål består; faktiske kørsler og genoptagelse føres i privat checkpoint.

## 12. november — bevis for afvisning før Pages-bestilling

Den lokale efterfølger skelner et bevist forløb uden Pages-POST fra et ukendt skriveudfald efter POST. Transporten udsteder kun intern, ikke-kopiérbar evidens, før POST er forsøgt; den almindelige caller kan derefter bruge det eksisterende afslutningstrin. Kendt igangværende eller allerede brugt fjernidentitet forbliver afvist. Et blandet forløb med tidligere POST og senere afvisning får ingen ny automatisk afslutningsret.

Den konkrete gamle kørsel308 kan kun få denne klassifikation efter den normale autentificerede læsers kontrol af fast ejer/job, hele loggens bytes og fire præcise kildeblade samt alle tre writerroller. En faktisk skrivefri gennemlæsning er bestået. Tomt API-svar, afsluttet job, en løs fejltekst eller selvskrevet JSON er ikke lukningsbevis. Kildekvalifikation, kontrolleret genoptagelse og offentlig levering er fortsat åbne. Den oprindelige synkroniseringstimeout er et særskilt åbent årsagsspor; alle fem mål består.

## 13. november — faktisk Pages-kodeversion og afvist CREATE

Den installerede kildevælger skelner nu også mellem en almindelig kodeopdatering og det eksisterende valg om at udgive nyere gemt vejr. Hvert formål skal passe præcist med sine flag. Begge veje kræver fortsat den faktisk aktuelle model og installeret SQL, afsluttet genoptagelseskontrol og en inaktiv skriver. En standardkodeopdatering beholder den offentlige prognosetime; gemt vejr skal stadig være nyere, komme fra en godkendt forfader og bestå de normale kontroller af horisont, 210 zoner, 673 kystdele, originale data og offentlig levering. Ingen leverandørhentning eller opgraderingsret følger af kildevalget.

Den almindelige current-installed-kildevælger blev indført 26. oktober med standardformålets saved=false-krav, selvom workflowet allerede havde det særskilte saved-weather-valg. Den præcise rettelse accepterer kun de allerede deklarerede formål/flag-par. Alle øvrige upgrade-/recovery-/writerafslag og faktiske I/C/T-/SQL-kontroller bevares. Den aktuelle kontrolfortegnelse har et særskilt currentInstalledCodeOnly-område med kun de to præcise kode-/prøvestier og deres eksisterende normale kalderprøve. Den brede kompatibilitetskategori kører også hele jordravsamlingen og passer derfor ikke til denne ændring; dens eksisterende ejere og prøver bevares byteidentisk. Ukendte stier, manglende kvalifikation og reelle PG-/C/I/T-ændringer følger fortsat den normale afvisning eller fulde kontrolvej. Der indføres ingen ny parser, hashgruppe eller modelbinding.

Den særlige almindelige Pages-transport sendte en afledt lokal bestillingshash som serverens byggeversion; den officielle action sender den faktiske Git-commit. Den afgrænsede kandidat følger den officielle kontrakt og bevarer den fulde lokale hensigt, den beskyttede reservation, det præcise artifact og den faktisk modtagne CREATE-identitet. Et delt commit-opslag kan vise en ældre pakke: uden observeret ny PENDING eller en særskilt kvitteret serveridentitet giver den gamle terminalstatus ingen luknings- eller retryautoritet. En allerede synlig præcis ny prognose kan kun gå videre til den fulde offentlige verifier.

En faktisk CREATE-HTTP404 får en intern særskilt afvisningsklassifikation. Alle transportinvocations, outcomes og deliveries skal være bogført, og forgængeren skal være frisk uændret, før CLOSED_UNPUBLISHED må udstedes. Afvisningen er aldrig NO_POST, en terminal deployment eller ret til endnu et POST. Timeout, uklart svar, GET-/token404 og modstridende metadata beholder deres afslag.

En enkelt allerede afsluttet historisk hændelse uden den nye klassifikation kvalificeres i den eksisterende ejerlæser gennem dens faktiske run/attempt/job, alle skrivere, seks oprindelige Git-blobs og hele den autentiske private log. Loggen indgår ikke i repositoryet. Dette er en eksplicit historisk hændelsesafgrænsning, ikke et nyt per-head testcohort, kildekatalog eller kontrolsystem. Den eksisterende før-POST-historik bevares. Normal genoptagelse kræver stadig fase, friskhed, ny eksklusiv ejer, præcist gemt mål, no-loss og offentlig effekt.

Transportforskellen er dokumenteret; HTTP404's serverinterne rodårsag er endnu ikke bevist. Tidligere Pages-timeouts og artifact-metadata404 er særskilte fejl. Kandidaten ændrer hverken C/I/T, scoreformel, SQL, kildeprioritet, geometri eller providerbudgetter. Kildekvalifikation, sikker levering, faktisk genoptagelse og næste almindelige vejrhentning udestår; alle fem hovedmål består. Se håndbog 89.340 og privat checkpoint.


## 13. november — almindelig offentlig målpakke uden pre-activation

Den afgrænsede completionvej omfatter nu også en almindelig, allerede offentliggjort Pages-skriver uden pre-activation-fase. Den beskyttede målpakke binder producent, ejer, model og oprindelig centralversion; frisk ACTIVE/nonpending operation/profil skal passe præcist. Samme normale kildekvalifikation, terminalitetskontrol, fulde offentlige verifier, database-/Edge-parathed og atomiske maintenance-CAS består. Kun faktisk færdiggørelse giver den eksisterende TARGET_RECONCILE-disposition; den næste almindelige kørsel vælger fortsat frisk UTC-time. Reservations- og snapshot-hashkrav bevares. Private B/S og en eventuelt nyere gemt generation ændres ikke; gamle forseglede håndoffs får ingen implicit ny centralversion. Dette er en lokal kildekandidat, ikke hosted afslutning eller ny vejrlevering. Se håndbog 89.340.

Den centrale manifesthash er den senest afsluttede offentlige generation, ikke kun en modelaktiveringsmarkør. Ved almindelig completion er frisk centralversion sammenholdt med den autentiske mål-håndoff og uændret præcis model den normale kildeautoritet; et gammelt, lovligt roteret manifestarkiv er ikke et nyt krav, når dets data ikke genbruges. Målpakken læses direkte fra den validerede Pages-skrivers descriptor, også hvis current/previous allerede indeholder nyere upublicerede mål. En allerede præcist aktiv målidentitet er idempotent efter aktuel modelkontrol; den er ikke i sig selv ny offentlig afslutningsevidens.


## Tillæg 2026-11-14 — særskilte autentiske readiness-roller

Ved afslutning af en allerede offentlig almindelig prognose kan den installerede backend-parathed være fra en nyere, færdig vejrkørsel. Målarkivets oprindelige kontrakt og den aktuelt beskyttede parathed bevares da hver for sig. Begge skal passe fuldt til den normale builder på deres egne autentiske kildeidentiteter; den faktiske Git-afstamning og uændrede backend-, model-, SQL-, kontrol-, profil- og vidensinput bevises positivt. Den aktuelle kontrakt gennemgår fortsat den normale friske database-, tur- og assistentkontrol. Kun målarkivets uændrede kontrakt gives til den eksisterende atomiske vedligeholdelse. Den aktuelle parathed genlæses med samme version og payload før CAS. Ingen kontrakt ommærkes eller skrives baglæns, og manglende original eller drift stopper afslutningen. Private pakker og reservationskrav bevares. Kildeændringen kræver normal kvalifikation og faktisk afslutningsbevis; den er ikke i sig selv hosted succes.
