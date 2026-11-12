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

De første dokumenterede Pages-timeouts er kørslerne #274 og #275 den 7. november 2026; #293 og #294 tilhører en senere episode den 10. november. Den bagvedliggende årsag hos Pages er fortsat ukendt. Produktionskoden var uændret fra kørsel #292 til kørsel #293. Kørsel #293 og den vellykkede kørsel #295 havde begge 1.107 regulære filer og 766.835.628 ukomprimerede byte i Pages-pakken; digests var forskellige. Det er samme målte størrelse og filantal, ikke en byteidentisk pakke, og det beviser ingen størrelsesårsag.

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
