# Astra – samlet gennemgang af leveringskæden, 2026-09-15

## Første produktionsforsøg efter gennemgangen

4.0.378 bestod exact-head-kildekontrol, blev merged som `348d4a28` og blev
kørt providerfrit i `34957362872`. Kørselen bestod central binding, privat
restore og migration, offentlig genopbygning, 210/673-strukturkontrol, privat
specifikation og bundle samt Pages-prebuild. Den samlede prewrite-afgørelse
stoppede derefter korrekt før nye produktionswrites, fordi Pages-pakken tog tre
interne, offentligt ubrugte filer med. Ingen DMI-, Copernicus- eller
Open-Meteo-provider blev kaldt.

4.0.379 udelader `data/kystdata.json`, `data/zone-plan.json` og
`js/services/runtime-diagnostics-archive.js` fra både code-only- og
normal-weather-Pages-pakken. Privacyreglerne og den aktive offentlige
`data/zones.geojson` bevares uændret. Det er én fælles pakkefejl og ikke evidens
for en fejl i RavScore, vejrdata eller den centrale modelbinding.

## Status og afgrænsning

Gennemgangen og den efterfølgende samlede implementation er afsluttet lokalt
på 4.0.378, branch `codex/4.0.378-historical-private-binding`, i worktree
`RavRadar-4.0.366`. Main er fortsat
`ec26f8e447c12fa47e6dadec7207cbbb418a663b` (4.0.377).

Efter ejerens krævede skift fra Astra til Sol/Ekstra høj blev fund A–G
implementeret i én batch. A, C, E, F og G er dækket direkte. B samler alle
uafhængige prewrite-fejl, men bevarer fail-safe rækkefølge for afhængige
produktionswrites. D dækker mistede svar, sikre retries, post-commit-oprydning
og historical-maintenance-reconciliation. Et fysisk dræbt GitHub-job efter en
`PENDING`-write bruger fortsat den eksisterende store recovery og er flyttet
til en afgrænset efterfølgende fællesgørelse. H er fortsat senere arbejde.

Der er ikke startet ny sourcegate, installation, vejrkørsel eller oneoff under
gennemgang og lokal implementation. Ingen eksterne writes er udført.

Senest observerede Pages er 4.0.365. Run `34947169348` beviste restore,
metadataoverførsel, offentlig genopbygning, 210/673-inventar og privat
specifikation/bundle, men stoppede før privat publicering, Pages og central
completion. Det er ikke bevis for numerisk komplette vejrdata eller fungerende
scorer. Offentlig numerisk dækning er fortsat en åben driftsopgave.

## Fund, der skal håndteres samlet

### A. Den efterfølgende backend er faktisk gammel

**Livebekræftet:** Anonym OPTIONS til `ravradar-assistant` den
2026-09-15 kl. 08:59:55 UTC gav HTTP 204 og modelbundle
`327b989b731e6e84bf05bdb6bd54707d47c04d5bdf80038d437332e84a4c8e01`.
Den aktuelle assistentkontrakt kræver
`65148b4ae3e0bee78826f82cefe8d002ec5b0adcc17f97a1aca81ef1b2c095fa`.

- `deploy-code-only-repair.yml:639` kræver ny readiness efter privat write,
  men workflowet deployer ingen Edge-funktioner.
- `integrated-cutover-readiness.mjs:1137–1139` kræver den aktuelle livebinding.
- `supabase/functions/_shared/rav-assistant-contract.ts:15` angiver målhashen.

Hvis den private publicering består, vil den nuværende readiness derfor
afvise backend. Dette er fundet før endnu et produktionsforsøg.

**Rettelse:** Medtag afgrænset installation af `ravradar-assistant` fra den
eksakte kilde før readiness; genbrug liveidentiteten, hvis den allerede matcher.
Genstart ikke hele `deploy-trip-storage.yml`, migrationshistorik eller weather.
Vurdér assistentens øvrige delte afhængigheder i samme afgrænsede installation.

### B. Fejlopsamlingen omfatter ikke den vej, vi faktisk bruger

**Kodebekræftet:** `deploy-code-only-repair.yml` er stadig sekventielt
fail-fast efter sine tre restoreforsøg. Privat publicering ved linje 610 ligger
før readiness, plan, Pages-pakke, privacyaudit og deployhandoff. Et stop dér
skjuler senere, uafhængigt undersøgte fejl.

`reusable-pages-deploy.yml` sætter kun `continue-on-error` ved
`integrated-cutover`. Denne levering bruger
`integrated-historical-maintenance`, som ikke får samme opsamling.

**Rettelse:** Lad de uafhængige dele af den faktiske kodelevering gennemføres
og skriv én slutrapport med udført/fejlet/afhængigt-sprunget-over pr. del.
Backendidentitet, planforberedelse og offentlig pakkebygning kan undersøges uden
et vellykket privat pointer-write. Bevar og genbrug færdige artifacts og beviser.
Fortsæt til deploy, når dens konkrete forudsætninger foreligger; en uvæsentlig
rapport- eller oprydningsfejl må ikke gøre en færdig installation ugennemført.
Manglende private filer eller en privacyfejl må ikke omsættes til et falsk
vellykket artifact. Ingen nye providerkald er nødvendige for denne rettelse.

### C. Hurtig kodelevering er stadig låst til første overgang

Der er to selvstændige stop:

1. `private-production-runtime-workflow.mjs:400–414` hasher rå kodefiler.
   Listen indeholder filen selv med releasekonstanter og
   `local-zone-score.js` med versionsbestemte imports. Et mekanisk versionsløft
   ændrer dermed restorekontrakten uden at ændre model eller vejrdata.
   Restore afviser ændrede kontrakter ved
   `private-production-runtime-bundle.mjs:471–474`.
   Fallback i `deploy-code-only-repair.yml:377–395` kræver historisk
   modelovergang og er fastlåst til den første forgænger `fa418f43`.
2. Hvis restore kan genbruges, publicerer workflowet alligevel med den nye
   Git-commit som `sourceHead`. Den indgår i descriptoren ved
   `protected-private-production-runtime.mjs:470`, og hele descriptoren
   sammenlignes ved linje 1064–1069. Identiske data på samme vejrtid bliver
   derfor en konflikt alene på grund af ny kodecommit.
   Den eksisterende test ved linje 481–494 forventer netop denne afvisning.

**Rettelse:** Skil den private datagenerations producentidentitet fra den nye
hjemmesideleverings identitet. Er bundle, filer, model og relevante kontrakter
identiske, genbruges pointeren uændret med særskilt leveringsbevis.
For mekaniske releaseændringer kræves en eksplicit, snæver
kompatibilitetsvurdering bundet til det faktisk lagrede forgængermanifest og
kilde. Ignorér ikke vilkårlige kontrakthashes. En generel næste-releasevej må
ikke altid vende tilbage til `fa418f43`.

### D. Supabase kan have gemt ændringen, selv om svaret går tabt

**Kodebekræftet:** `ravscore-operational-activation.mjs:4006–4040` stoler på
CAS-svaret uden præcis readback ved usikkert udfald.
REST-klienten genprøver kun `PGRST303` og `57014`, ikke almindelige
netværksfejl eller 502/503.

Hvis begin er gemt som PENDING, men svaret mistes, markeres begin fejlet.
Reconciliation ved `reusable-pages-deploy.yml:661` kræver imidlertid en
vellykket begin-step. Den næste kodelevering kræver ACTIVE allerede ved
`deploy-code-only-repair.yml:136–138`. Dermed kan vi sidde fast, selv om
den relevante ændring er gemt.

Efter et gemt complete med mistet svar er der en anden fejl: reconciliation
kræver stadig `pending=true` ved linje 670, selv om central state allerede
er ACTIVE. Og selv en vellykket reconciliation accepteres ikke som afslutning
for historical-maintenance ved linje 868–870.

**Rettelse i samme batch:**

- Ved usikkert write læses operation og profil atomisk tilbage. Kun præcis
  forventet version, payloadhash og deploymentidentitet tæller som gennemført.
- Genbrug den eksisterende pending-recovery fra `update-and-deploy.yml:252`
  i en providerfri genoptagelsesvej. Start ikke weather for at reparere deploy.
- Godtag præcis verificeret completion gennem normal write, readback eller
  reconciliation for den faktisk anvendte action.
- Begrænsede retries på sikre læsninger og immutable uploads til samme hashsti.
  Et uklart CAS-svar er ikke tilladelse til blindt at gentage et nyt write.
- Retentionfejl efter bekræftet publicering registreres til oprydning og må ikke
  fremstilles som om publiceringen aldrig skete.

Storageklienten bruger også enkelte fetch-kald ved
`protected-private-production-runtime.mjs:1457–1550`. En isoleret
reproduktion af midlertidig bucket-502 gav straks fejl med kun ét netværkskald.

### E. Første normale vejrkørsel kan standse, før den henter noget

**Betinget, konkret kodevej:** Den genbrugte productionReferenceAt er
2026-09-12T08:00:00Z. Normal restore kræver mindst target minus 72 timer
(`private-production-runtime-workflow.mjs:543–554`).
Ved et target efter 2026-09-15T08:00:00Z er den dermed udløbet.

Den nye current bliver afvist som EXPIRED, mens historisk previous kan blive
afvist for modelbinding/kontrakt. `protected-private-production-runtime.mjs:
1349–1364` accepterer kun udløb uden fejl, når ALLE afvisninger er EXPIRED.
Blandet EXPIRED/MODEL_BINDING giver exit 1. Almindelig weather-restore ved
`reusable-weather-build.yml:605` er blokerende; providerleddene nås ikke.

**Rettelse:** Skil brugbar, hashkontrolleret vejr-cache fra frisk score-state.
Bevar dokumenterede cacheværdier med deres rigtige alder i en eksplicit
cache-only-restorevej. Udløbet state må ikke fremstilles som frisk fortsættelse;
72-timersreglen i `ravscore-recovery-replay.mjs` bevares, og manglende frisk
state vælger den målte koldstart. At en bundle eksisterer, er ikke bevis for
frisk state. Historiske, inkompatible generationer kan sorteres fra som
kandidater efter strukturel kontrol; korrupte payloads må ikke kaldes udløb.

Dette skal klargøres sammen med leveringsrettelsen, men normal weather starter
stadig først efter offentlig modeldeploy. Ingen ny oneoff.

### F. Historisk previous er læsbar metadata, ikke bevist brugbar rollback

`restoreProtectedPrivateProductionRuntime` læser pointeren med krav om, at
current matcher den kørende kode, før previous vælges (linje 1278).
Når forgængerkode forsøger at hente sin previous, afvises nyere current først.
Forgængerens anonymkontrol rammer samme fejl.

En isoleret reproduktion gav `incompatible modelBundleSha256` og nul
storagekald for både restore og anonymkontrol.

Den lokale test fremstiller desuden gammel descriptor ved at ændre hashes,
men bevarer samme arkivobjekt (`test-protected-private-production-runtime.mjs:
497–521`). Dens senere rollbackcase køres først efter to nyere generationer,
hvor den gamle previous er væk. Tidligere formuleringer om fuldt bevist
historisk rollback er derfor for stærke.

**Rettelse:** Valider pointerens struktur uafhængigt af læserens model; vælg
derefter hver kandidat ud fra dens eksakte binding, manifest og filer.
Publiceringens snævrere current-/migrationskrav bevares.
Én målrettet regression skal bruge to ægte, forskellige og selvkonsistente
arkiver og faktisk gendanne den historiske generation.

### G. To størrelsesgrænser kan afvise en ellers gyldig offentlig fil

`deploy-code-only-repair.yml:115` downloader højst 128 MiB, mens den fælles
manifestbundne læser accepterer 192 MiB
(`prepare-code-only-public-runtime.mjs:27,95`).
`source-critical-gate.mjs:83` fastholder endda den gamle 128 MiB-streng.

Den aktuelle fil på cirka 117,8 MB passer; dette er ikke dagens stop.
**Rettelse:** Brug samme manifestvaliderede bytegrænse ved download og læsning,
så en gyldig voksende fil ikke udløser endnu en særskilt release.

### H. Nødvendige kildebeviser udløber efter 14 dage

`reusable-pages-deploy.yml:209–234` genskaber aktiv modelkilde fra et
GitHub-artifact med 14 dages retention. Det historiske artifact findes stadig,
så dette er ikke en akut blocker.

**Efterfølgende afgrænset opgave:** Gem det lille privacy-sikre kildebevis
holdbart, bundet til deployment og hashes. Dette må ikke udvide den nuværende
rettelse til en lang redesignopgave eller forsinke en ellers klar installation.

## Afviste mistanker og ting, der skal bevares

- Offentlig hydrering af zones, coastal registry og vandstandsrouting ændrer
  ikke private kontrakthashes; disse datafiler indgår ikke i hashlisten.
  Normal central hydrering ligger desuden før restoreforventningen.
- Ingen fundet generationId-konflikt: create-spec og forgængeren bruger datasetId.
- Normal weather skriver med vilje `.cache/dmi-candidate-progress.json`.
  Den skal ikke mekanisk ændres til code-only's installerede DMI-sti.
- Handoff-, plan- og checkpoint-dispositionfelterne er konsistente på den
  undersøgte aktuelle vej; der er ikke grundlag for endnu en blind omlægning.
- Den lokale pointerrettelse ser relevant ud for det observerede 4.0.377-stop,
  men et syntetisk testresultat beviser ikke hele den faktiske migration.
- Rapporten er en installations-/genbrugs-/driftsanalyse, ikke et nyt bevis
  for scoremodellens videnskabelige kvalitet eller komplet numerisk vejrinput.

## Aktuel leveringsrækkefølge efter implementation

1. De målrettede scenarier for historisk arkiv, ren version kontra reel
   kontraktændring, samme private data fra ny kode, gemt write med mistet svar,
   midlertidig 502, udløbet state og samlet prewrite er grønne lokalt.
2. Synkronisér versions-/RDKS-/håndbogsændringer og bevis særskilt, at geodata
   kun har versionsfeltændringer.
3. Kør én exact-head GitHub-kildegate, merge og én providerfri kodelevering.
4. Følg assistent, privat pointer, central completion, Pages og offentlig
   modelidentitet. Derefter normal tidsbegrænset weather, numerisk score-/
   inputdækning, rotation og site. Udfyldte registryposter er ikke komplette tal.

Der må ikke gives løfte om, at der ikke findes flere fejl. Formålet er at
fjerne de nu konkret påviste stop i samme arbejdsgang frem for endnu en
release pr. enkelt stop.
