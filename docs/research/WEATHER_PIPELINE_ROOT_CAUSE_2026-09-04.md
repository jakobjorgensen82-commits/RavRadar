# Vejrkædens stop og manglende konvergens – 2026-09-04

Status 2026-09-04: den nedenstående oprindelige analyse er efter ejerens efterfølgende implementeringsordre omsat til en lokal, måltestet driftsrettelse. Ny exact-head, merge og produktionsbevis afventer. Oprindelige formuleringer om skrivefri analyse er historiske, ikke den aktuelle arbejdsstatus.

## Implementeringsdelta og ekstra flaskehalskontrol

- Sammenlignet med den fungerende `8c03e25d`-baseline: den gamle `stride_selected` hentede alle tidlige timer og derefter hver tredje time, mens det nuværende currentbevis kræver hver eksakte time. Budgetterne var allerede dengang 900 sekunder med 120 sekunders reserve og to produktive collections. Der er derfor mere faktisk GRIB-arbejde; det er ikke i sig selv evidens for langsom DMI-levering.
- #3947's sikre timingfelter viser 39 IDW-assets, samlet behandling 536 sekunder, gennemsnit 13,74 sekunder, interval 10,6–68,9 sekunder. Timingen starter efter download og kan ikke bruges som måling af ren netværkshastighed eller hele cyklussen. Ingen bred DMI-/budgetomskrivning er begrundet af denne ene prøve.
- Kildegaten har nu en metadata-only cachelocator og live-verifikation hos GitHub, inklusive senere fejl og reruns. Identisk verificeret main kan genbruges på alle eventtyper. Ukendt/ufuldstændigt bevis og senere fejl kræver fuld source. Hvert frisk datasæts full validate/releasegate og PR-exact-head er uændrede. DEC-0045/AGENTS er opdateret efter ejerens aktuelle instruktion.
- Copernicus READY v3 / IN_PROGRESS v2 bevarer originale afsluttede kildeforsøg, men genberegner alle aktuelle matrixbindinger. Legacy-journal, original targetgeneration, shadowhash, produkt, request, acquisition, tid og selvhash valideres før genbrug. Ændret DMI-fil alene er ikke længere en nulstilling. Referenceskift og faktiske acquisitions er bounded til de eksisterende fire timer; nye par er ikke forsøgt af en gammel request. Der opfindes ingen resultater eller ny indsamlingstid.
- Shardinddeling følger hele det autoritative register, ligesom validatoren, ikke det skiftende gap-targetudsnit. Selve downloadlisten er stadig kun de eksakte rester. Ingen geometri eller punkter ændres.
- Grønne afgrænsede tests: source-stage inklusive hash-/time-/gapændringer, legacy, positive/nul-resultater, Baltic→AMM15, stale/tampered og resume; operational live builder; source-proof inkl. senere failures/reruns; workflow og cache; bundle/release metadata; RDKS/sikkerhed; håndbog/installationskopi. Intet nyt fuldt lokalt source-run.
- #3948 sluttede med Copernicus-step failure efter grøn DMI-terminal. Sidste syv checkpoints gik fra 3.516 til 4.034 dækkede par, 3.855 rester af 7.889. Dette er hverken ny model online eller fuld 673 × 118. Det præcise exceptionbudskab er ikke selvstændigt udledt.

## Arbejdsgrænse

- Remote main er verificeret som `a331e0dbb08a9ab9ffff26632a708828574bdcd8` (PR #249).
- Branch `codex/ravscore-real-bundle-closure` er pushet på `13e082a63de4b41aac6d1270236f25c2b003d816`. PR #250 er åben; exact-head `33779352790` er grøn, 36m29s. Tidligere dokumentation om kun lokal/ikke-pushet closure er historisk.
- PR #250 retter public modelbundle og pilotens ledger-reference, ikke nedenstående reproducerede fortsættelsesproblem.
- Ingen runtimekode, workflows, geodata, punkter, credentials eller private caches er ændret. Ingen dispatch, merge, databaseoperation eller modelaktivering er foretaget. Eksisterende untracked `.cache/` er urørt.
- Candidate G er fortsat offentlig. Den integrerede model må fortsat frigives med ufuldstændig ældre historik, når dens operationelle input og øvrige gates er komplette.

## 1. Den umiddelbare DMI-stopårsag

Run [33839881412 / #3947](https://github.com/jakobjorgensen82-commits/RavRadar/actions/runs/33839881412) stoppede i `Require successful DMI producer before current supplement` med `DMI_LOCALLY_SKIPPED_DKSS_ASSET`.

Downloaderens grønne stepkonklusion er ikke DMI-ready: workflowet bruger `continue-on-error`, så caches kan gemmes. Producenten rapporterede `refreshStatus=failed`. DMI-cache-save bestod; Copernicus, frisk runtime og deploy blev ikke nået.

Ved låst target 2026-09-04T05:00:00Z og valgt officielt modelrun 00Z:

| Collection | Officielle timer | Verificerede | Lokalt uafsluttede | Officielt fraværende |
| --- | ---: | ---: | ---: | ---: |
| dkss_idw | 116 | 98 | 18 | 2 |
| dkss_lf | 116 | 116 | 0 | 2 |
| dkss_nsbs | 116 | 90 | 26 | 2 |

Dette er collection-/assettimer, ikke antal kystdele. De lokale huller ledsages af `RUNTIME_BUDGET_REACHED` og bevaret progression. De må ikke omklassificeres til DMI-fravær for at åbne Copernicus.

Normal DMI-produktion har 900 sekunder inklusive 120 sekunders afslutningsreserve. Arbejdsrammen er 780 sekunder og kan stoppe tidligere ved næste assets forventede omkostning. Ledgeren kræver afsluttet asset/proveniens og et udfald for hver kystdel, ikke blot en gammel færdigmarkør.

### Faktisk progression gennem runskiftet

| Run | Target UTC | Verificerede DMI del/time-par | Valgt DKSS-run |
| --- | --- | ---: | --- |
| 33831850322 / #3944 | 03:00 | 12.378 | 00Z |
| 33835460323 / #3945 | 04:00 | 32.083 | 00Z |
| 33839881412 / #3947 | 05:00 | 60.179 | 00Z |

Vinduerne flytter sig, så differencerne er ikke en ren downloadtæller. De viser sammen med bevarede processed steps, at arbejdet fortsætter. Den normale DKSS-valgvej tilsidesætter `preferred_run` og vælger en nyere moden native run; ved 18Z→00Z skal den nye runs eget assetbevis opbygges. Dette er ikke et dokumenteret upstream-sammenbrud eller total cachetab.

DMI angiver fire DKSS-runs i døgnet, fem døgns native horisont og normalt cirka +3h15m til +3h20m før tilgængelighed. Native run, udgivelsestid og RavRadars target er forskellige begreber. [DMI DKSS](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss), [DMI leveringstider](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-availability).

## 2. Reproduceret fortsættelsesfejl mellem DMI og Copernicus

To efterfølgende kørsler havde samme target 01:00Z, samme DKSS-run 18Z, samme 70.903 DMI-par og samme 8.511 Copernicus-restpar:

| Run | Copernicus ved sidste checkpoint | Rester | Journalens afsluttede forsøg |
| --- | ---: | ---: | ---: |
| 33821713196 / #3942 | 1.015 | 7.496 | 8 |
| 33827341498 / #3943 | 5.123 | 3.388 | 10 |

Begge udførte `Remove only invalid production Copernicus source disposition`. #3943 startede journalens tæller igen ved 1, men genbrugte de 1.015 positive par. Rigtige data overlevede; tidligere kildeforsøg overlevede ikke som genbrugelig journal. Begge gemte cache og stoppede før publicering. Tallene er historiske snapshots, ikke en aktuel restoptælling.

### Mekanismen i den aktive kode

1. `scripts/update-dmi-bulk.py` bygger en ny cache med nyt `generatedAt`, diagnostik og eventuelt andre opdaterede vejrkomponenter.
2. `scripts/build-copernicus-target-registry.py:main` hasher hele DMI-filens bytes til `dmiCurrentInputSha256`, ikke kun strømkomplementet.
3. `scripts/lib/copernicus_current_source_stage.py:validate_source_stage_progress` kræver præcis samme filhash og `productionReferenceAt` som den friske registry.
4. `scripts/check-copernicus-current-range.py:inspect` oversætter afvisningen til `sourceStageReusable=false` i refresh-tilstanden.
5. Workflowet sletter journalen. Runneren genbruger positive records, men gentager tidligere produkt-/parforsøg, herunder nul-resultater og Baltic-forudsætninger.

En gammel matrix må korrekt ikke genbruges som frigivelsesbevis. Problemet er, at den samme snævre binding også styrer genbrug af faktisk afsluttet indsamlingsarbejde. Dermed bliver en ændret fil eller target en grov nulstilling af arbejdsviden.

### Syntetisk reproduktion mod aktuel kode

En hukommelsestest anvendte kun eksisterende syntetisk fixture og ét afsluttet Baltic-forsøg med nul records. Ingen produktionsdata, downloads eller filwrites:

- Samme snapshot: accepteret.
- Kun DMI-filhash ændret, target og krævede par identiske: afvist med `progress registry/cache binding is invalid`.
- Samme reference og frisk genvalidering af det dokumenterede forsøg mod ny registry: eksisterende builder accepterer uden ny download.
- Reference flyttet én time, samme eksakte efterspurgte validTime fortsat i vinduet: afvist med `source attempt reference mismatch`.

Dette beviser mekanismen og en snæver same-reference-genvalideringsmulighed. Det beviser ikke, at rebase over nye timer/ændrede huller allerede er sikkert implementeret. Ægte dataskift, ændret register/produkt, stale/tampered evidens og manglende acquisition skal fortsat afvises eller genhentes. Gamle nul-resultater må ikke uden videre attestere en senere kildeudgivelse.

## 3. Hele kæden og systemiske forstærkere

- **Scheduler:** Jobs starter. Alle skrivere deler `ravradar-weather-production`, `queue: max`, uden automatisk cancellation. Ingen generel schedulerstilhed er bevist; opret ingen ekstra watchdog.
- **Tidlig kildegate:** Automatiske watchdog-dispatches behandles som andre manuelle dispatches. Der er målt 36–40 minutter før DMI på uændret main. Det forlænger indsamlingen, men må ikke bare bypasses under gældende regler. Eksisterende data-only preflight er relevant til bootstrapbevis.
- **Cache:** Copernicus-cachen fra #3943 var stadig til stede og blev tilgået 07:04Z, cirka 1,06 MB. Bytevækst er ikke fuld dækning. Ingen bred sletning eller nulstilling er begrundet.
- **Faglig sortering:** Koden bevarer DMI først, Baltic før AMM15, exact time/celle/lag, 5 km og pinned produkter. De regler skal bevares; fortsættelsesproblemet løses ikke ved mere vilkårlig fallback.
- **Friskhed:** Fremtidige Copernicus-records har fire timers acquisition-friskhed. Opsamling kan ikke bare fortsætte i dage og kaldes fresh. Gentagelser, DMI-runskift og ny target skal måles samlet.
- **Privat pilot:** #560 / `33836396482` fejlede i target-ledgerforseglingen efter cirka 34 sekunders faktisk jobtid; resten var hovedsageligt kø. Den kendte referencebinding ligger i grøn PR #250. Den præcise tekst i #560 er ikke udlæst som selvstændigt rodårsagsbevis.
- **Current closure:** Kræver præcis 79.414 positioner med entydig kilde, ingen overlap og ingen missing. Historik klassificeres separat. At fjerne kontrollen skaber ikke gyldige scoreinput.
- **Øvrige scoreinput:** Bølger, vind og vandstand har egne kæder; Feggesund har sit separate wave-only-bevis. Komplet current er nødvendigt, ikke tilstrækkeligt. Ingen nye live fuldkomplethedsbeviser er lavet her.
- **Supabase:** Stoppene ligger før central weather-publicering, model-runtime og Pages. GitHub-cachetrafik er ikke i sig selv Supabase-egress. Migration/readback og den aftalte live kapacitetsmåling forbliver åbne.
- **Modelrelease:** Fase B er særskilt og manual-only. Fuld ældre historik er ikke et adgangskrav; ufuldstændig historik skal give synlig lokal advarsel, ikke fjerne en ellers gyldig prognose.

## 4. Afgrænset næste handling

1. Bevar cache, model, punkter, DMI-first og strenge slutgates. Ingen kunstig historik, brede fallbackændringer eller cache-reset.
2. Ret genvalideringen af gemt indsamlingsarbejde samlet: oprindelig journalintegritet, samme kilde/produkt/targetidentitet, eksakte stadig krævede par og uændret faktisk acquisitiontid. Hold genbrugelig indsamlingsviden adskilt fra den aktuelle releaseforsegling. Same-reference/hash-only og timeskift/ændrede huller er forskellige tilfælde. Relabel aldrig gammel evidens som ny indsamling.
3. Få måltests: to friske DMI-builds med samme huller; flyttet reference/overlap; delvist lukkede og nye huller; positive og nul-resultater; Baltic→AMM15; afbrydelse/atomisk save; ændret register/produkt samt stale/tampered evidens. Bevis både korrekt genbrug og påkrævet genhentning. Ingen fuld lokal sourcegentagelse.
4. Integrér den allerede CI-grønne PR #250 sikkert med den fokuserede rettelsesvej. Nye ændringer kræver ny exact-head CI; tidligere grøn status er ikke bevis for ændrede filer.
5. Brug eksisterende isoleret 118-timers datapreflight på korrigeret head og samme serielle cachevej. Mål faktiske restpar og bevarede forsøg efter næste friske DMI-opdatering. 2700-sekunders acquisitionramme findes allerede i denne preflight. Mere timeout alene er ikke rodrettelsen.
6. Derefter Feggesund/WAM og øvrige operationelle komponenter, backend-readback og Supabase-kapacitet, frisk produktion, særskilt Fase B samt offentlig desktop/mobil. Ingen ny ventetid på 48 timers ældre historik.

## Kontroller, afgrænsning og åbne hypoteser

- Bestået: syntetisk hukommelsesreproduktion; `node scripts/validate-rdks.mjs`; `node scripts/test-security-hardening-4.0.284.mjs` (de to dele af `validate:rdks`).
- Miljø: shell krævede escalation pga. Windows `apply deny-read ACLs`. Bundled Python mangler xarray; prøven bruger eksisterende stdlib-kontrakter uden installationer. Bundled npm-launcher mangler; RDKS-delene køres direkte med bundled Node. Dette ændrer ikke GitHubs datastop.
- Ikke kørt: fuld lokal sourcegate, live forecast-replay, privat payloadinspektion, migrationswrite, ny deploy eller kapacitetsmåling.
- Åbent: samlet throughput over et helt DKSS-runskift og præcis afslutningstid efter rettelsen. Der loves ingen ETA ud fra cachevækst. Der påstås ingen empirisk forbedret fundpræcision.
- Ved afsluttende kontrol var #3948 / `33843883868` kommet forbi DMI-terminalgaten og i gang med `Fill only exact-hour DMI gaps from Copernicus`. Det styrker evidensen for fortsættende DMI-progress, men er endnu ikke komplet current, slutligt success eller deploybevis.
- Næste kritiske implementering og review: Sol, Ekstra høj. Den tilbagetrukne morgenhulsrekonstruktion må ikke genoptages.
