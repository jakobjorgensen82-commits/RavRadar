# Tillæg 2026-09-11 – livebevis af for grov asset-/shardgrænse

Efter merge af 4.0.341 viste oneoff `34534764449`, at systemreviewets krav om isolation var rigtigt, men at whole-asset-admission var for grov. `wam_dw` kunne lukke, mens hver NSB-fil mistede sine gyldige søskenderækker ved enkelte delafvisninger. 4.0.342 bevarer derfor isolation og promotion, men flytter admission til komplette exact-asset-provenancebundne part/time-tuples efter fuldt filgennemløb. Rejected slices må ikke ændres, og global filfejl eller komplet anden native lineage bevarer whole-stage rollback.

Samme princip gælder Copernicus-current på timeparniveau: eksakte returnerede native U/V-par fra et strukturelt validt shard bevares, mens fraværende bestilte timer forbliver rest. Attempts gemmer de faktisk observerede native tider i nested v2, accepterer legacy 4.0.341 og bevarer Baltic-prerequisiten efter pruning af sidste søskende. Tom providerakse og subsekundtider er retryable malformed, ikke no-record; tidsinterpolation/hold og permissiv tidsakse er stadig forbudt. Dette supersederer alene reviewets whole-asset-formuleringer; den kritiske rest, providerordenen, persistent cache, WAM-lineage, private historikstatus og de komplette slutgates består.

Samlet WAM er grøn `63/63`, WAM-historik `35/35` og checkpoint `21/21`. De tre Copernicus-måltests, den varige schema-3 seamtest, 169-timers Baltic-prerequisite-regressionen, Python compile og code diff-check er grønne. Exact-head-CI, provider-runtime og closure er fortsat åbne; de historiske målinger nedenfor må ikke ommærkes som 4.0.342-runtimebevis.

# Samlet analyse og løsningsdesign for vejropsamling – 9. september 2026

## Nyere implementeringsstatus – lokal 4.0.341-kandidat, 10. september

Den oprindelige statuslinje nedenfor beskriver analysetidspunktet og er historik. Efter at 4.0.340 kom på main, viste en ny gennemgang en tværgående WAM-fejl: atomisk rækkeopdatering var ikke nok, når en ufuldstændig modelkørsels candidate kunne flytte aktiv run-/checkpointstate og gøre en ellers brugbar cache vanskeligere at fuldføre.

4.0.341 er derfor implementeret lokalt med følgende samlede grænse:

- Aktiv cache er persistent og nulstilles ikke. Hver collection/modelRun behandles isoleret. Et asset kræver en ikke-tom fuld denominator og `accepted == required`, før det kan bidrage.
- Når data mangler, fremmes et komplet forbedrende asset straks; interne huller og hale er samme kritiske kø. Når aktiv WAM allerede er komplet, samles primærfasens kvalitetsrefresh og vurderes én gang ved en fuldt gennemført faseafslutning. Det er både integritetsgrænsen og WAM-performanceforbedringen.
- Budgetstop, reservegrænse, exception eller interrupt kan ikke promovere en delvis kandidat eller flytte frisk run-identitet, `processedSteps`, optællinger og checkpoint. Allerede promoted fremgang består.
- Efter udtømt primærfase må højst én ældre axis-resolvable modelkørsel forsøges terminalt. Hvert asset bærer fortsat sin egen collection/modelRun/provenance; en række er ikke ommærket, og interpolation på tværs af modelkørsler er fortsat forbudt.
- Den komplette bølgeakse er 670 native WAM-dele plus Feggesunds tre godkendte direct/proxy-dele, alle 118 timer: 79.414. Currentkæden vedligeholder sin tilsvarende eksakte rest gennem DMI → Copernicus → Open-Meteo. Ældre strukturelt valide rækker bruges, så længe egen horizon dækker timen, og 48 timers faktisk historik bevares rådgivende.

Lokal målverifikation er grøn: WAM-integration 52/52, wave-history/bootstrap 35/35 samt compile-/runtimeattestationskontrol. Dette er ikke CI-, leverandør-, cache-, runtime- eller produktionsbevis. Normal og watchdog forbliver deaktiveret, mens 4.0.341 samles og valideres; den integrerede model er endnu ikke dokumenteret online.

Status: **analyse og implementeringsdesign, ikke en implementeret eller produktionsverificeret rettelse**. Udarbejdet med Astra/Ultra og tre afgrænsede, uafhængige kode-/logreviews. Den afsluttende gennemgang har ikke startet tests, vejrkørsler, leverandørdownloads, deploy eller merge. Tidligere lokale reproduktioner er angivet særskilt; de er ikke nye tests under ejerens stopinstruktion.

Dette dokument supersederer tidligere vurderinger om, at mere køretid eller WAM-rettelsen alene sandsynligvis afslutter vejrarbejdet. Det erstatter ikke eller forkaster den eksisterende 4.0.340-pakke. Det foreskriver ingen særregel om gamle huller før ny hale: **alle faktisk manglende eller ugyldige nødvendige positioner er kritiske**.

## 1. Konklusion på almindeligt dansk

Der er grundlæggende fejl i den samlede vedligeholdelse. Det er ikke tilstrækkeligt at kalde dem enkelte leverandørfejl, uheldige timeskift eller for korte kørsler.

1. Systemet gemmer ikke konsekvent sine brugbare reserver uafhængigt af, hvilken leverandør der tilfældigvis dækker i denne kørsel.
2. Noget Copernicus-data kan blive stående fysisk, mens det nødvendige oprindelige kildebevis forsvinder. Data bliver dermed praktisk ubrugelige uden at cachefilen er nulstillet.
3. DMI og Copernicus prioriterer mangler i deres egne data, ikke kun de faktiske huller efter genbrug fra alle kilder. Kvalitetsopgraderinger kan derfor konkurrere med helt manglende input.
4. Omkring 23 minutter i hvert af de to seneste cirka 48-minutters DMI-trin ligger i observerede checkpoint-/efterarbejdsintervaller. Koden genopbygger og validerer hele strømoversigten ved hvert checkpoint. Netværket er ikke alene eller primært forklaringen i de observerede intervaller.
5. Seneste DMI-kørsel brugte desuden cirka 16 minutter på WAM-historik før almindelig indsamling. Fuld historik er ikke et krav til den godkendte cold-start-lancering.
6. Open-Meteo bruger gentagne forsøg på uændrede indholdsproblemer. Den voksende kø kan samtidig skabe meget korte netværkstimeouts.

De enkelte kontroller har fanget reelle fejl, men har ikke dokumenteret en bæredygtig samlet arbejdsgang. Forløbet har derfor fået karakter af en reparationsspiral: lokale fejl er rettet og lokal succes er blevet overvurderet, mens tværgående bevaring, prioritering og tidsforbrug ikke var bevist. Ejerens gentagne mistanke om forkert prioritering var berettiget.

Den samlede løsning er ikke at genhente alt, opgive kildekontrol eller bygge en ny scoremodel. Det er at adskille **gemte brugbare data**, **den aktuelt valgte kilde**, **hvad der faktisk mangler**, og **arbejdet med at hente bedre data**. Disse fire ting er i dag koblet forkert sammen.

## 2. Hvad er faktisk bevist i kørslerne?

Alle targettider i tabellen er UTC. Dansk sommertid er UTC+2. Tallene er strømpar, dvs. én kystdel på én time, ikke samtlige vejrrækker eller cachebytes.

| Måling | [Run 34371642565](https://github.com/jakobjorgensen82-commits/RavRadar/actions/runs/34371642565) | [Run 34387410217](https://github.com/jakobjorgensen82-commits/RavRadar/actions/runs/34387410217) |
|---|---:|---:|
| Låst target 9. september | 15:00 UTC | 18:00 UTC |
| Krævede strømpar, 673 × 118 | 79.414 | 79.414 |
| Faktisk DMI-attesteret | 39.511 | 42.926 |
| DMI-rest til fallback | 39.903 | 36.488 |
| Rest krævet af Open-Meteo efter upstream | 2.381 | 1.451 |
| Genbrugte OM-par i denne rest | 1.787 | 739 |
| Nyhentede OM-par | 270 | 177 |
| OM-dækket rest | 2.057 | 916 |
| Tilbageværende strømpar | 324 | 535 |
| Kystdele med rester | 29 | 29 |
| Separat WAM-slutfejl | MIXED_RUN_INTERPOLATION | MISSING_HOUR |

Seneste run genbrugte præcis forrige runs OM-cachefamiliegeneration: `open-meteo-current-fallback-v2-Linux-oneoff-34371642565-1`. Cachegenbrug blev klassificeret gyldigt. DMI-, Copernicus- og OM-progressionssaves lykkedes. Slutclosure, runtime-handoff og publicering blev ikke gennemført. De beregnede 78.879/79.414 er derfor **ikke** et samlet forseglet vejr-/WAM-bevis.

DMI havde nettofremgang på 3.415 par over det flyttede vindue. De tidligere omtalte 70.280 par kom fra en separat gammel aktiv donor med reference 6. september 20:00 UTC og må ikke bruges som forrige kørsels targettal. Den store DMI-rest er ikke alene bevis for en forkert restberegning; den kan indeholde legitim tids-/rumlig utilgængelighed og lokalt uafsluttet arbejde.

### Timeskift forklarer ikke hele tilbagegangen

Vinduerne overlapper 115 timer. Blandt seneste runs 29 berørte kystdele kan højst 29 × 3 = 87 af de 535 mangler ligge i den nye hale. Mindst 448 ligger derfor i overlapvinduet. Forrige run manglede i alt 324. **Mindst 124 overlap-positioner, der før var dækket, er dermed nu udækkede**, forudsat det samme register som de to runs bruger.

Dette er et matematisk minimum, ikke en gættet fordeling. Det beviser tab af anvendelig dækning, men ikke fysisk sletning eller hvilken af nedenstående mekanismer der ramte hvert konkret par. Seneste run afleverede ingen artifact med den nødvendige slutjournal. De 739 genbrugte OM-par viser også, at genbruget ikke er nul. De øvrige tidligere OM-par kan være uden for den nye rest, uden for vinduet eller dækket upstream; deres præcise fordeling kan ikke udledes af tællerne.

Historisk har et run, `34161930631`, nået komplet strømclosure på 79.414/79.414, men ikke hele WAM/Feggesund-/launchkæden. Påstanden om, at der aldrig har været komplet strømdata, ville derfor også være forkert.

## 3. Årsager og præcise kodeveje

### A. OM-reserven beskæres af dagens restliste

`scripts/lib/open_meteo_current_fallback.py`, `reusable_records_with_salvage` omkring linje 545–625, beholder kun tidligere records, hvis deres par findes i den nye `required`-rest. `scripts/fill-open-meteo-current-fallback.py`, `persist_checkpoint` omkring linje 982–1021, skriver derefter dette reducerede udvalg til samme fil allerede før første request.

Konsekvens: OM fylder et hul; næste gang dækker DMI; den stadig gyldige OM-reserve forsvinder fra nyeste donorfil; senere mangler DMI igen, og OM skal hentes på ny. Den eksisterende v2-fil er både restprojektion og eneste nyeste donorbank. En tidligere afgrænset lokal reproduktion viste dette tre-kørselsforløb med uændret oprindelig recordidentitet. Kodevejen er verificeret igen ved læsning; dens konkrete bidrag til de seneste 535 er ikke målt.

**Retning:** separat privat donorbank; behold den eksisterende strenge v2-restprojektion til closure. Det er forkert blot at tilføje alle donorrecords til v2-dokumentet: dets kontrakt afviser records uden for den eksakte rest.

### B. Copernicus-værdier og positivt kildebevis har forskellig levetid

`scripts/run-copernicus-current-pilot.py`, `replace_stale_shard_attempt` omkring linje 400, fjerner ældre attempts for hele samme source/shard, når et nyt referencebundet forsøg indsættes. Et nyt forsøg kun for halen kan dermed fjerne det Baltic-bevis, som et eksisterende AMM15-overlappar behøver.

`scripts/lib/copernicus_current_source_stage.py`, `rebase_source_stage_progress` omkring linje 800–880, har desuden en firetimersgrænse og filtrerer attempts mod den nye DMI-rest. Fysisk gyldige records kan blive i shadow, mens disse proofs udløber eller bortfiltreres. Begge workflows kan slette en ikke-genbrugelig source-stage før runneren: normal omkring linje 1213, oneoff omkring linje 971. Den nuværende positive source-order-visning er ikke et varigt bevis bundet til den enkelte record og acquisition.

**Retning:** bevar oprindeligt verificeret positiv admission sammen med præcis recordId, acquisitionId, kystdel/time, register/policy og originalt Baltic-prerequisite. Bevar de originale immutable attempts; omskriv ikke deres requestedPairs eller hashes. Kortlivet negativ forsøgs-/retryevidens må fortsat begrænse NY indsamling. Et gammelt Baltic-udfald må kun bære den allerede beviste AMM15-tuple, aldrig en vilkårlig ny AMM15-acquisition.

### C. Den kritiske arbejdskø ser ikke den samlede dækning

I `scripts/update-dmi-bulk.py:8735` kommer `covered_current_pair_keys` alene fra DMI-proofs. Assetsorteringen omkring linje 1353 bruger DMI-mangler. Copernicus beregner sin `remaining` fra DMI-rest minus egne admissible records omkring runnerens linje 1167.

OM-cachen gendannes først efter Copernicus i både `.github/workflows/reusable-weather-build.yml:1307` og `.github/workflows/validate-copernicus-current-pilot.yml:1064`. DMI og Copernicus kan derfor ikke planlægge efter dens gyldige dækning. Selv de andre allerede gendannede fallbackcacher bruges ikke som samlet kritisk plan.

**Retning:** genbrug alle validerede kilder før første netværksindsamling. Hold to mængder adskilt:

- DMI-rest = hele det krævede strømregister minus faktisk DMI-dækning. Denne sandhed består til klassifikation.
- Reelle globale huller = hele det krævede register minus unionen af alle admissible kilder. Denne mængde styrer kritisk indsamling.

Det er utilstrækkeligt bare at føje OM-par til DMI's `covered_pair_keys`: `classify_dkss_primary_asset` omkring linje 1416 kræver også native current i zonerækkerne. Prioriteringsinput og native kildebevis skal derfor skilles ad. Vandstand, vind, temperatur og bølger kan samtidig gøre et asset nødvendigt, selv om strøm er dækket.

### D. DMI kan gøre en ældre tuple utilgængelig for tidligt

Omkring `scripts/update-dmi-bulk.py:6969` og `scripts/lib/dmi_native_provenance.py:1878` kan et nyere selected assets positive behandlingsmetadata afskære et ældre gyldigt retained proof, selv om den nye cacherække endnu ikke er materialiseret og attesteret. Den eksisterende fixture omkring `scripts/test-dmi-native-provenance.py:2724` forventer faktisk dette hul.

Dette er et verificeret kodet hjørnetilfælde, **ikke bevist som årsag i de to livekørsler**. Normal assetbehandling er transaktionel. Løsningen skal alligevel håndhæve den aftalte tilstandsregel: gammel gyldig tuple og dens proof består, indtil en konkret ny komplet tuple med korrekt proof kan erstatte den atomisk. Nye katalog-/outcomemetadata er ikke i sig selv en erstatningsrække. En officielt revideret assetidentitet inden for samme modelrun er en separat integritetsregel og må ikke ukritisk omgås.

### E. DMI bruger stor tid på gentaget helhedsarbejde

De observerede DMI-trin var 48m05s og 48m18s. Summerede indrammede download/rå-cache-operationer var cirka 94 og 197 sekunder; normal parsing cirka 703 og 596 sekunder. Sidste run har desuden cirka otte sekunders særskilt privat replay. Intervaller fra sidste asset-END til synligt checkpoint var samlet 1.366 og 1.378 sekunder, fordelt på 30 og 24 checkpoints.

Det sidste er checkpoint-/efterarbejdstid, ikke en CPU-profil eller bevis for ren disk-I/O. `ProgressCheckpointController` omkring linje 7828–7905 kalder `seal_current_operational_progress` omkring linje 8866 før hvert bulkcheckpoint. Denne genbygger ledger, attesterer og fuldvaliderer det operationelle register. Standardudløseren er otte assets eller 60 sekunder. Resten af writevejen omfatter også oprydning, serialisering/codec og filgemning.

**Retning:** behold atomiske, genlæselige checkpoints, men undgå at beregne uændrede bevisenheder igen. Genbrug skal bindes til eksakte inputidentiteter og nulstilles ved relevant target-, register-, katalog-, decoder-/policy- eller tupleændring. Det er ikke nok blot at gemme sjældnere, øge timeout eller springe slutvalideringen over. Den præcise fordeling mellem ledger/codec/skrivning er endnu ikke målt; derfor gives ingen opdigtet besparelse.

### F. Ikke-kritisk WAM-historik kommer foran driftsbehovet

Seneste run downloadede 49 + 49 WAM-historikassets i cirka 16m15s, før normal DKSS-behandling. `execute_private_wave_history_bootstrap` kaldes før collection-loop omkring linje 8904. Den komplette historikhurtigvej kan falde væk ved et lokalt hul; efterfølgende assetgenbrug er også bundet til det nyvalgte officielle asset. Det gør ikke historikken gratis, blot fordi tidligere acquisitioner findes.

DEC-0114 tillader `genuine-cold-start` med 0–48 faktisk tilgængelige historiktimer og `HISTORY_INCOMPLETE`. Det hårde krav er gyldige operationelle input, den eksakte nødvendige lagbro og 118-timersaksen; ikke 48 timers ny netværkshentning. Slutkoden omkring linje 10003–10039 skelner allerede mellem operationel completion og fuld historik.

**Retning:** tidlig validering/genbrug/bevaring af historik fortsætter; ren historiknetværk flyttes uden for den kritiske cold-start-kæde. Behold den nødvendige 1–4 timers bro, WAM-mode og slutkontrol. Flyt ikke hele helperen blindt til sidst: den henter også target og kan overskrive netop etableret operationelt target. Sen historik må afgrænses til før bootstrap-target. Den særskilte strenge `candidate-g-migration` ændres ikke. 48 timers bevaring til mobilisering består; cachebevaringen er i øvrigt normalt 60 timer med minimum 54, ikke en ordre om genhentning.

### G. Open-Meteo gentager arbejde, som ikke bliver bedre af flere splits

Seneste run: 666 requestforsøg, 190 splits, 93 transportfejl, 197 grid-/afstandspayloadafvisninger, 6.962 ugyldige parvurderinger, men kun 177 nye gemte par. Det er gentagne hændelsestællere, ikke 6.962 forskellige manglende positioner. HTTP-fejltællerne var nul. Den præcise type transport- og værdifejl blev ikke bevaret.

I `scripts/fill-open-meteo-current-fallback.py` omkring linje 543, 557 og 877 går forskellige indholdsfejl gennem samme retry/splitvej. Børn får nye retrytællere; 190 binære splits skaber 380 børn. Omkring linje 612–619 divideres resterende tid med kølængden. Med 192 åbne items kan timeouts presses mod ét sekund og budgetstop indtræffe med omkring tre minutter tilbage. De 93 transportfejl kan derfor omfatte selvfremkaldte timeouts; det er ikke bevist hvilken andel.

**Retning:** behold batchisolation og bounded retry, men gør dem fejlstyrede. Transport/midlertidig HTTP kan genforsøges; tvetydigt gruppesvar kan opdeles. Et isoleret bekræftet uændret gridproblem eller samme eksplicit ugyldige par skal efter afgrænset kontrol parkeres resten af denne kørsel, stadig som ærligt hul. Splits må ikke nulstille den kendte fejl. Ingen permanent blacklist; senere kørsel må prøve igen. Afstandskrav, units, target og kildeklassifikation lempes ikke.

## 4. Afgrænsning: hvad analysen ikke beviser

- Hvilke af de mindst 124 tilbagefaldne overlappar der skyldes hver konkret mekanisme. Det kræver par-/proofbaseret sammenligning af bevarede generationer.
- Den præcise fordeling af DMI's 36.488 rester mellem tid, rum, lokalt uafsluttet og manglende attestation. Logs viser blandt andet officielle assets efterladt som `LOCALLY_SKIPPED/RUNTIME_BUDGET_REACHED`; det er ikke det samme som leverandørfravær.
- Om alle 535 positioner faktisk kan leveres nu under den godkendte geografi, afstand og kildepolitik. Gentagne null-/gridafvisninger gør et løfte om komplethed i næste run uforsvarligt.
- At 4.0.340's same-series-WAM-rettelse alene løser seneste runs separate `MISSING_HOUR`.
- At almindelig drift kan vedligeholde fuld dækning inden for budgettet. Det er et driftsresultat, ikke noget grønne fixtures alene kan bevise.

Disse punkter må ikke skjules i endnu et generelt »så er vi klar«.

## 5. Samlet løsningskontrakt – ejerordre efter computerfrysning

Ejeren har bestilt en samlet, gennemarbejdet rettelse med kvalitet over hastighed. Den er nu under lokal implementation, ikke en færdig release. Den eksisterende 4.0.340-pakke/PR #274 bevares. Teststop består; ingen nye tests, vejr-/backend-/deployruns, push eller merge er startet.

### Fire adskilte lag

- **Vedvarende private donorer:** originale validerede tuples, acquisitions og positive kildebeviser, uafhængigt af dagens restliste.
- **Aktuelt kildevalg:** én gyldig kilde pr. nødvendig komponent/kystdel/time, uden ommærkning af oprindelse.
- **Arbejdsplan:** alle reelle huller i unionen først, både interne og hale; derefter bounded kvalitetsforbedringer.
- **Aflevering:** selvstændigt valideret, targetbundet komplet datasæt; partial-save eller rå donorbank er aldrig i sig selv closure.

### Fælles kørselsforløb

Gendan alle kildebanker, også OM, før første indsamling. Valider original envelope ved donorens egen reference, før gyldigt overlap vælges til det låste target og den centrale konfiguration. Dataalder alene er ikke ugyldighed, og ingen original hentetid, recordId eller kildeidentitet ommærkes.

Beregn et særskilt planlægningsgrundlag fra faktisk admissible dækning. DMI's native attestation og egenrest forbliver sandfærdig; fallback i planfilen giver aldrig DMI-proveniens. Planen skal omfatte relevante kilder, og alle øvrige nødvendige komponenter/WAM/lagbro skal fortsat kunne kræve arbejde. Et union-dækket strømpar gør ikke nødvendigvis et GRIB-asset med nødvendig vandstand, temperatur eller vind overflødigt.

Kritiske huller forsøges DMI først, derefter Copernicus og de eksisterende regionale/OM-led. Budgetter skal give downstream og begge kritiske WAM-familier en reel chance. Lokal timeout er ikke dokumenteret kildefravær. Gyldige resultater gemmes løbende; en gammel brugbar tuple bliver først erstattet sammen med sit proof, når en fuld ny tuple er kontrolleret.

**Ejerens seneste præcisering:** Ved komplet dækning skal DMI overtage flest mulige egnede positioner, derefter Copernicus; OM er sidste reserve. Kvalitetskøen må ikke blive permanent inaktiv, fordi cache allerede er komplet. Den eksisterende detaljerede currentorden består: native DMI → Baltic → AMM15 → policyregional DMI → OM. Ingen regional genvej foran ordinær CP. Kvalitetsarbejde kan fortsætte i næste normalrun og skal ikke forsinke en ellers gyldig første launch. Et modelrunskift må ikke slette reserver først; legitime prognoseændringer kan stadig ændre scorer.

### Migration uden nulstilling

OM får separat privat donorbank, mens den nuværende strenge v2-restfil fortsat er closureprojektion. Banken bevarer originale records og deduplikerede originale admission-envelopes, også når parret midlertidigt dækkes upstream. CP får en atomisk bank med shadowrecords/acquisitions og deduplikerede immutable attempts samt positiv admission bundet til præcis recordId/acquisitionId/part/time/register/policy og originalt gyldigt Baltic-prerequisite.

Positiv admission er adskilt fra kortlivet negativ forsøgs-/retryevidens: gammel Baltic-fejl må bevare den allerede beviste AMM15-record, aldrig autorisere ny acquisition. Immutable attempts må ikke omskrives for at passe til en ny reference. Legacy-shadow og stage indlæses med originale bindinger før rebase/sletning. Hvis originalt proof allerede er tabt, kan det ikke opfindes fra værdierne; ældre intakte cachegenerationer kan undersøges, men deres eksistens er ikke garanteret.

Skriv nye bankgenerationer ved siden af originalerne og verificér genlæsning før brug. CP-records/proofs er én atomisk generation, ikke to ubundne filudskiftninger. Gem bank før afledte projektioner. Fejl bevarer forrige generation. Begræns størrelse og retention; bevar gyldige fremtidige reserver og de aftalte 48 timers faktisk tilgængelige kildeattesterede historik. Historiklagring er ikke automatisk public-/kalibreringsadgang. Samme bank- og restore/savekontrakt skal gælde normal/oneoff; ingen parallelle writers eller halvt udrullet formatændring.

### Mindste sikre tidsrettelse

Bevar nuværende DMI-snapshotformat, checkpointcadence, atomisk writer, fsync og størrelsesgrænse. Først genbruges ledgerbyggerens fulde allerede validerede attestation i samme checkpoint i stedet for at genberegne den. En intern validationfejl skal forblive fejl. Genindlæsnings-/provider-/slutkontrol bevares.

Tvær-checkpointgenbrug kræver et eksakt fingerprint af alle faktiske current-inputafhængigheder; det må ikke implementeres ud fra et løst dirty-flag eller en antagelse om uændrede kilder. Det er derfor en separat afgrænset optimering, hvis afhængighederne kan lukkes sikkert. Ingen ny journal/inkrementel ledger indføres som første rettelse. Aggregate timings skal senere skelne ledger/attestation/codec/JSON/disk; der gives ingen minutgaranti. Lokal crashsikkerhed er ikke remote durabilitet ved tab af hele runneren før cache-save.

Cold-start bevarer tidlig historikvalidering/salvage/retention og operationel WAM-mode/lagbro, men må bruge faktisk delvis historik uden obligatorisk fuld 48h-netværksbootstrap før kritisk arbejde. Sæt ikke mode til none og flyt ikke hele helperen blindt til slutningen: dens targetfil kan overskrive det nye operationelle target. Strict candidate-g-migration forbliver uændret. Sen frivillig historik må alene gælde før bootstrap-target og ikke blokere launch.

OM bevarer gode svar og isolerer tvetydige grupper. Retry/split gøres fejlstyret: begrænsede transport-/HTTP-genforsøg, isolation når det kan hjælpe, og parkering af isoleret gentaget identisk negativt indhold alene resten af kørslen. Splits må ikke nulstille kendt fejl; senere runs må prøve igen. Ingen afstandslempelse/permanent blacklist, og køvækst må ikke skabe étsekundstimeouts.

### Driftsdiagnose og kontrolplan

Bevar privacy-sikker rapport før terminal stop, også ved partial failure: startdækning, nye kritiske par, kvalitetsopgraderinger, bevarede reserver, legitimt udløb og tilbagefald i overlap; current versus WAM/lagbro; DMI-tid/rum/lokalt uafsluttet/uattesteret; OM-unikke mangler versus gentagelser/null/type/grid/transport samt separate tidsfaser. Ingen private koordinater, rå U/V, hastigheder, retninger, URLs eller credentials i logs/artifacts. Eventuelle konkrete proofjournaler forbliver private og bounded.

Den almindelige uændrede main er ikke append-only og kan rammes af samme retentionfejl. Derfor er kontinuerlige små runs ikke iværksat. Normal acquisitionbudget er 900/360/240s for DMI/CP/OM, i alt25min før overhead; oneoff er3000/3300/900s, i alt120min. Første legacy-cutover i normal kan hæve DMI-budgettet. CP-wrapperen har ét forsøg. Maksimumrammer er ikke faktisk vedligeholdelsestid; bæredygtig drift kræver målt genbrug, bevaret overlap og opfyldning af ny hale, ikke blot downloadtællere. Ekstern cron forbliver primær og GitHub reserve, med én tung writer.

Når tests igen autoriseres: én sammenhængende målmatrix for OM→DMI→OM, CP-overlap/disjunkt hale/>4h/positivt versus negativt bevis, global hulprioritet og senere kildeopgradering, atomisk DMI-erstatning, delhistorik-cold-start, OM-defekt søskende, checkpointidentitet og bankcrash. Skrivning af tests er ikke kørsel eller grønt bevis. Den allerede gældende exact-head CI og konkrete post-data-produktionsgates består; ingen ny blind kildegatestart nu. De eksisterende fem tidlige bindingskontroller og source-deduplikation bevares.

### Præcis supersession af ældre tekniske regler

Ejerens aktuelle ordre præciserer DEC-0118/REQ-COPERNICUS-HOURLY-REBASE-PREREQUISITE-001 (recordbundet positivt bevis adskilt fra kortlivet negativt forsøg), DEC-0118-v2 (donorbank adskilt fra restprojektion), 4.0.333-splitreglen (kendt negativ evidence overlever split), DEC-0118/0119 (global kritisk dækning og atomisk gammel-til-ny tuple) og DEC-0114's før-loop-bootstrap alene for genuine-cold-start. Uændret består kildeorden, officiel samme-run-assetrevisionsintegritet, geometri, units, afstande, physical scope, privacy, nødvendig lagbro, strict migration og konkret slutclosure.

Implementeringen skal indarbejdes i aktive krav, issues/status, changelog og begge håndbøger. Ingen aktuel designtekst må kaldes implementeret/valideret alene fordi den er skrevet. Efter faktisk samlet kodeslutning synkroniseres model-/SQL-/Edge-/releasebindinger én gang før nødvendig verifikation.

## 6. Launchrækkefølge og permanent checkpoint

Bevar PR#274/head c4043bf7 og WAM-/bindingsrettelsen. Main er b0ca7f5d/4.0.339. Kildegate34398417483 er completed/cancelled, ikke grøn og ikke i gang. Seneste oneoff34387410217 gemte providerprogression men efterlod535 currentpar og WAM MISSING_HOUR. Senest verificerede offentlige model er Candidate G. Den afbrudte gate var en fejlagtig annullering, ikke et nødvendigt led i analysen.

Næste arbejde er samlet lokal implementation/integration efter denne kontrakt, ikke en ny analyse fra nul. Derefter nødvendig autoriseret verifikation, sikker merge, ny same-head-backendreadiness og målrettet cachefuldførelse med passende normal-/oneoffbudget. Først faktisk komplet current, WAM/lagbro/Feggesund, øvrige direkte input, handoff og produktionsgates autoriserer den aftalte atomiske cutover. Delvis48h-historik må ikke opfindes som nyt launchstop.

Efter launch består tabsfri runtime-/archive-/egress-transport i skygge uden sourcecachenulstilling, faktisk kildeattesteret historik og måling/aktivering af bæredygtig almindelig cron. Et enkelt grønt launch er ikke bevis for varig drift. De konkrete535-pars leverbarhed, faktisk overlapårsag og normal hastighed er stadig uafklarede driftsmålinger, ikke ting der må loves væk.

## 7. Afsluttende systemreview 2026-09-10 – kode skrevet, funktionelt bevis mangler

### Samlet diagnose

Arbejdet havde karakter af en reparationsspiral: fejl blev løst omkring den seneste afvisning, mens datalevetid, prioritering og aflevering ikke var konsekvent adskilt. Det er ikke dækkende at forklare tilbagefald alene med et flyttet prognosevindue. De observerede minimum 124 tilbagefaldne overlappar kræver yderligere forklaring. Analysen fandt flere konkrete mekanismer, der kan gøre stadig brugbare data utilgængelige, men den har ikke målt hver mekanismes andel af de 535 seneste rester.

Den lokale rettelse samler nu én kæde: bevaret original kildebank → valideret brugbart udvalg → fælles arbejdsplan → målrettet indsamling → selvstændig komplet aflevering. Ingen kilde må bruge sin egen mangelliste som facit for hele systemets kritiske behov. Ingen midlertidig bedre dækning må i sig selv slette en brugbar reserve.

| Problem | Implementeret lokal ændring | Hvad stadig skal bevises |
| --- | --- | --- |
| OM-reserve forsvinder fra dagens restfil | Privat original donorbank adskilt fra strict-v2-projektion | Donor→DMI→donor over flere rigtige generationer |
| CP-tal består, men positivt kildebevis bortfalder | Record-/acquisitionbundet original admission adskilt fra kort negativ journal | AMM15-genbrug gennem nyt target og kvalitetswrite |
| Leverandører arbejder efter egenrest | Fælles eksakt 118-timers unionplan før DMI og igen før CP | Faktisk tid og antal reelle huller lukket pr. kørselsfase |
| Gentaget fuld DMI-kontrol | Attestation genbruges alene inden for samme checkpoint | Netto tids-/RAM-besparelse uden ændret slutbevis |
| Historik fylder før nutid | Genuine-cold-start bruger faktisk bevaret delhistorik uden obligatorisk fuld netbootstrap | Operationel WAM og nødvendig lagbro i rigtig main-kørsel |
| OM-split genstarter kendte indholdsfejl | Bounded fejlstyret isolation, vedvarende negativ evidens i kørslen, senere nyt forsøg | Færre unproduktive requests og faktisk leverbarhed af rest |
| Én beskadiget række eller afbrudt save rammer mere end nødvendigt | Separat originalmanifest, vedvarende maskering, bankpointer bevaret til atomisk replace | Crash-, konflikt- og genstartsregressioner |
| Normal og oneoff kan få forskellige restoreforløb | Samme separate banker, kompatible legacy-cachepaths og fælles plan | Reelt restore/save i GitHub på final head |

### Kritiske fund i selve den nye lokale kandidat

Disse blev fundet og rettet FØR tests eller produktion; de er ikke nye observerede produktionshændelser:

1. **Skadet identitetsfelt:** Første OM-recovery brugte den skadede records part/time til at spærre kilden. Det kunne ramme forkert sted og genoplive en konflikt. Begge nye banker bruger nu et uafhængigt integritetsbundet originalmanifest. Maskerne bevares gennem generationer, timeskift, legacyimport og quality. Kun strengt nyere, entydig og positivt admitted tuple kan ophæve dem; eller legitimt retentionudløb. Ukendt header-/proofskade afvises fortsat.
2. **Afbrydelse mellem karantæne og gemning:** CP kunne kortvarigt fjerne canonical bankpath. En genstart kunne derfor vælge gammel legacy uden den nye spærring. Originalpointeren består nu indtil atomisk replace, både efter granulær recovery og whole-invalid startup.
3. **Lokal progression usynlig for GitHub-save:** Et efterfølgende projections-/rapportstop kunne skjule en allerede gemt bank. Succesflag eksporteres nu straks efter den konkrete atomiske bankwrite, og OM-projectionflag straks efter strict-v2-write. Remote save-success skal stadig bevises separat.
4. **Planner og reader uenige:** OM-kørslen kunne redde raske delmængder fra en leafskadet bank, men planbyggeren afviste hele banken. Planbyggeren bruger nu præcis samme recovery i hukommelsen, uden donorwrites og med originalfilhash.
5. **Falsk kritisk krav på parent-strøm:** Den første lokale vurdering om obligatorisk parent-current blev trukket tilbage. Den integrerede score bruger PART-serier (`update-weather.mjs`: scoreCoastalPartsRuntime/verifiedIntegratedPartHourly); kortet kan udelade parentpilen; spatial-audit advarer ved parent-missing, men kræver fuld PART-dækning. De 12 geografiske parenthuller er allerede dokumenteret som no-marine-grid-point. Parent-only strøm må derfor ikke genåbne samme DMI-asset eller blokere quality; reelle PART-huller og øvrige nødvendige komponenter består. Ingen parentværdier eller -beviser opfindes.

Hume har uafhængigt reviewet CP/OM-manifest, masker, startup, checkpoint, quality, checker og outputflag. Hooke har reviewet planbyggeren og normal/oneoff-integration. Root har gennemgået parent/PART-kravet mod faktiske gates og forbrugere samt de afsluttende koblinger. Der er ingen resterende konkret P0/P1 i disse afgrænsede reviews. Det er en kodevurdering, IKKE testbevis eller en garanti mod fejl.

### Test- og releasegrænse

Der er skrevet en sammenhængende lokal målmatrix: præcis target/union, skift tilbage til bevaret reserve, CP-positivt proof efter rebase, konflikt/leafskade, flere generationer, tilladt nyere erstatning, afbrudt bank/projectionwrite, kritiske PART-huller versus valgfri parentstrøm, checkpointgenbrug, delhistorik-cold-start og workflowrækkefølge. Ingen af disse nye tests er kørt. Ingen compile, providerkald, dispatch, staging, commit/push, merge, backendwrite eller deploy er sket i dette implementeringsafsnit.

Ejeren er spurgt om de korte lokale tests på den samlede kode. Den tidligere udtrykkelige ordre var at lade den annullerede GitHub-test være stoppet. Lokal eksekvering er også pauset som forsigtighed indtil svar; det må ikke omskrives til en permanent ejerbestemt afskaffelse af test.

Før videre release skal final producerbinding genberegnes, de relevante måltests bestå og den præcise nye head verificeres. De otte anvendte migrationer er urørte. Model-/continuation-ID må kun ændres efter faktisk ændret afhængighed; Pythonproducentændringer ændrer ikke automatisk scoremodellens JS-fingerprint. Den nye planbygger, common planlib, CPbanklib og targetidentity er med i fullRuntimeContract-inventory.

### Ærlige restpunkter

- De 535 seneste currentrester og WAM MISSING_HOUR er fortsat seneste levende måling, ikke den nye kodes resultat.
- Aktuel leverbarhed, faktisk genbrug og komplet 79.414-pars closure må bevises på samme afsluttede kodehead.
- CP-bank bevarer eksisterende 168 timers retention og flere versioner, plus fremtidige 117 timer; størrelse/RAM/vækst under 1GiB er umålt. OM har top-to konfliktvarianter og 48 timers historik. Et størrelsesloft er ikke kapacitetsbevis.
- Ingen ny garanti for normal driftstid eller minutoverskud. Første kontrollerede drift skal måle reelt kritisk arbejde, WAM/lagbro, gemmetid, donorbevaring og nettotilvækst/udløb.
- Efter launch består den allerede aftalte tabsfri cachetransport/egress i shadow og bæredygtig ekstern cron. Ingen automatisk nulstilling, betaling eller tilbageførsel til gammel model er tilføjet.
- Den nye model er stadig ikke dokumenteret online. Launchrækkefølgen i afsnit 6 består; ikke en ny reparationskarrusel omkring kosmetik eller valgfri parentstrøm.
