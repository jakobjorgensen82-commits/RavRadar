# DEC-0266 – Sammenhængende DMI-kontinuitet og filkapacitet

**Status:** Aktiv målbeslutning; genstartsleverancen er afgrænset i DEC-0268. Den samlede 4.0.519-kandidat er ikke produktionsbevist.
**Dato:** 2026-09-30

# NYESTE – 2026-10-06 17.10 DK – kold SOURCE-bevarelse og fremrykkede referencer består lokalt

Den normale lokale kandidat gemmer nu selvstændigt kvalificerede SOURCE-
vandstandstimer som en separat valgfri bank i den eksisterende autentificerede
private forecastfil. Det er ikke et SOURCE-as-zone/PART-aggregat, en ny privat
destination eller en kopi af hele 519-revisionen. Native/protected/historical
input har fortsat prioritet; kun manglende kvalificerede timer genvindes.
Gamle snapshots uden banken kan læses. Originale timestamps og kildebeviser
bevares; ændret centralt målepunkt, beskadiget indhold, fremtidig markør og
udløb afvises. 121 private timer inkluderer allerede offentlig118h plus T+3.

Tre faktiske kolde filgenindlæsninger ved samme reference består med192
no-loss-timekontroller. Tre fremrykkede referencer består med yderligere192
kontroller på syv zoner plus Fur og både dkss_nsbs/dkss_lf. Det eksisterende
95-minutters native-edge-hold er uændret; ingen ny native måling opfindes.
De oprindelige SOURCE-records ændres ikke, mens den nye routede projektion
beregner konservativ prognosealder ved den aktuelle generationstid.

Den første samlede kompressionspakke fejlede den målte kildekapacitet og er
erstattet lokalt af særskilt begrænsede SOURCE-records. Faktisk filgenbrug
af256 kilder/30976 kvalificerede timer består; det er ikke national heljob-
kapacitet. Eksisterende samlede fil-, arkiv- og krypteringsbudgetter bevares.
Normal krypteret gemning/genbrug genvinder fire kvalificerede SOURCE-huller.
En indre ugyldig kildeforsegling afvises af forecast-recovery og den faktiske
workflow-gate uden at erstatte beskyttede forecastbytes. Den komplette
krypterede fil synkroniseres fortsat før erstatning, jf.89.167.

De direkte berørte cache-/filprøver består:10 rapporterede enheder,
0FAIL/SKIP/CANCEL. Den berørte filtestfamilie har12PASS og én eksplicit
fravalgt stor opt-in-kapacitetsprøve, ikke et fuldt nationalt kapacitetsbevis.
Dette lukker lokale kolde SOURCE-huller, ikke faktisk upload, tab af runner,
gamle Fur-årsag eller offentlig ny-generationseffekt. Bindingsopdatering og ny
migration er udtrykkeligt godkendt6oktober; de er endnu ikke gennemført her.
Gamle migrationer, scoreformel, central routing, kildevægte, strøm/hukommelse,
vandtemperatur, Limfjord-data og hård no-loss bevares. Ingen installation,
merge eller anden produktionsændring under aktiv writer. Lokalversion543;
PR522/Jordrav527-koordinering, egen exact-head-kontrol og sikker levering
mangler. Den samlede revision, Spørg RavRadar og GDPR er ikke færdigmeldt.
Ældre beskrivelser af manglende lokal SOURCE-bank er historiske; de tidligere
negative legacy-prøver bevares og dokumenterer hvorfor banken er nødvendig.

---

### Tillæg 6. oktober kl.16.31 – fuldt krypteret snapshot synkroniseres lokalt før erstatning

En snæver driftsrettelse er isoleret i den normale cachegemmer: det komplette
krypterede indhold inklusive autentificeringsmærket synkroniseres til disk,
og eget filhåndtag lukkes, før tidligere snapshot atomisk erstattes.
Synkroniseringsfejl og lukningsfejl giver faste fejlkoder; første fejl bevares.
Tidligere gyldige bytes bevares ved fejl før erstatning, og egne tempfiler ryddes.
Kun ti runtime-linjer og én eksisterende testfamilie er tilføjet; ingen hel
kopi af den separate 519-revision, nyt format, originalbinding eller scoreændring.

Målprøven var først rød og består nu i fire fejlforløb samt faktiske normale
save-/restore-CLI-kald i særskilte processer. Seks rapporterede test-enheder
består, ikke seks nye uafhængige tests. To eksisterende roundtrip-/budgetprøver
og den eksisterende normale workflow-kontrakt består også. Originalbaseline,
beskyttede conditions og originale bankrecords er uændrede. Dette er lokal
krypteret gemning og genbrug på samme disk, ikke faktisk Actions-upload,
strømsvigt, tab af runner, national kapacitet eller offentlig levering.

Statisk sporing af de normale modelimporter finder ikke cachegemmeren i
integrated-/Candidate-closure eller fortsættelsesinventaret; ingen nye model-
kontrolsummer blev beregnet i denne kontrol. Gemmeren er i det eksisterende
producentinventar, mens det persistente ABI-format er uændret. Normal upload
kræver fortsat faktisk saved=true. Exact-head-kontrol, sikker integration,
deploy og dokumenteret produktionseffekt er åbne. Lokal version forbliver543.

Ejeren ønsker revisionen afsluttet i dag og alle aktive opgaver videreført.
Det er ikke en garanti eller lempelse af hård no-loss og autentiske originaler.
Kl.16.31 gav ejeren konkret ja til genberegning/opdatering af de tre tidligere
blokerede efterfølgerbindinger samt nødvendige bindingsfiler og ny migration.
Tilladelsen omfatter ikke scoreformelændring, gamle migrationsændringer eller
installation under aktiv vejrhentning. Den endelige kode skal først være fast.
Syvzonernes vandstandsundtagelse, kold SOURCE-bevarelse, Fur, samlet processtop,
holdbar upload/runner-tab, B/S-før-T, nationalkapacitet og privat/offentlig
slutkontrol er fortsat åbne. >95% dækning er accepteret; gyldige timer må
stadig ikke gå tabt. Produktroadmap og planlagt revision er forskellige;
de ejerfravalgte roadmap-punkter genindføres ikke. Spørg RavRadar og GDPR-
arbejdet forbliver særskilt aktive og er ikke leveret af denne rettelse.

### Tillæg 5. oktober – indre CP-banklukning isoleret i NORMAL, kun lokalt

På faktisk leveret 4.0.542/main892b er kun den eksisterende
save_component_bank og ét eksisterende normalproducent-testforløb udtaget.
Ingen whole519copy. Actual produce_component_bank/checkpoint reproducerede
første fsync-fejl maskeret af eget fil-close. Minimal indre failed/try/finally
bevarer primærfejlen, forsøger eget close og egen unlink; close-only HARD.
Før atomic replace er tidligere bank byteidentisk. Cleanup-only efter
komplet replace beholder den nye komplette bank, men returnerer ikke succes.
Frisk faktisk normalproducent genkontrollerer den overlevende diskbank,
oprindelige kvitteringer og kandidater gennem uændret adgangskontrol.

Ét genbrugt parentforløb/four subcases: konkret RED1failure2.139s →
GREEN1parent/4subcases2.433s, ikke fem nye unikke tests. Første setup-forsøg
stoppede før subcases på midlertidig h5py-backendimport; direkte import og
samme kommando virkede derefter uden installation/ændret testmiljø.
Den transient årsag er ikke bevist. Streng inversdiff viser resten af
runtime/test uændret; den nye funktion/parent matcher allerede prøvede BIG-bytes.

Normale byggere matcher integrated4ebe68/Candidate3e5a66/physicala226c73;
continuation3dd9/private ABIede0/publicc495 uændrede. Python-bankgemmeren
er eksisterende producerinventory, ikke modelclosure/persisted ABIændring.
Ingen metadata-generation, alias, modelbodycopy/eval, version, commit,
push, CI, SQL-runtime eller produktion. Egen exact-head kildekontrol og
sikker levering mangler. Fuld CP-S-før-T/writer/descendants/kill/failure4min/
runner/nationalkapacitet og Fur-timeretention er fortsat åbne/OFF.

### Tillæg 3. oktober kl.09.34 — godkendt child-close isoleret, genbinding uafsluttet

Ejeren valgte konkret "Godkend den afgrænsede rettelse" til den låste CP-kalder.
Første sikre fejl bevares mod cleanup; startet child-close kræves før cleanup/
reservehentning. Nødvendige direkte callers/tests/korrekt modelgenbinding er
omfattet; alle andre afvisninger, adgangskrav og score/priority/geometry/budgetter
bevares. Ingen bred kilde-/privatlog-/admissionworkflowtilladelse er givet.

Efter ordinary37096157187 actualcompletion/resultkontrol/writers0 er kun
loadCopernicusComponentAuthority og to eksisterende testparents isoleret fra
BIG til RELEASE/main8df. De direkte callers/CLI er uændrede og awaited.
Fejlet stop/repeatederror er ikke closebevis; cleanup-only HARD efter close.
Isolerede10parent/subtestunitsPASS8374.027ms/0fail/0skip, fem+treunderprøver.
IndexLFcfdfdab9…/testLF6052bb37… matcher prøvede BIG-bytes,12gamleparents
bevares. Ikke fuld OSdescendant/kill/writer/runner/failure4min/fullCP-SførT-prøve.

Normal nativebundle-builder beregner nu0dfa6c2bb7943a1e7f79d3aff10a3c90a64bd40423058b6909166e5c693b0c05/67files:
ONLYindex og samletbundlehash i manifestet; physicalcontracta226/andre66hashes
uændrede. Kun lokal metadata-generation, ikke modelbody-copy/eval/hashalias.
Otte consumers er stadig stale3a14. Append-only successor/read-onlyanchor/
exactpredecessorbridge/live55s-readback/private-runtime/historiskgate er næste
integration. Applied008/00945 immutable; intet SQL installeret eller runtime-
bindingsforbrug synkroniseret endnu. Ingen ny releaseversion/CI/commit/push/deploy.
Public540/main8df/seneste04Z er urørt. Samlet revision og OFF er fortsat åbne.
Se allerøverste checkpoint09.34 for productionproof/caveats/branchstatus.

## Observeret årsag og afgrænsning

### Nyere3. oktober – sharedindex med korrekt afledt genbinding

DEC-0288 og allerøverste checkpoint supersederer ovenstående09.34s lokale
0dfa/stale8consumer-status. Sharedindex ligger også i Candidate G65; normal
generation giver Candidate28a6, afledt continuationd983 og integrated29ea67.
Den første0dfa var et forkastet mellemtrin, aldrig deployet. Fysiske a226/c73
og øvrige65/64/11filehashes er uændrede, ingen alias/modelbody-copy/eksklusion.
Append-only20261003080000/8consumers er nu LOKALT genereret/synkroniseret;
applied008/00945 immutable, begge helpers/full673/same-T/55s readback bevares.
Finalsource-/forbruger-/installkontrakt3PASS143.3309ms er ikke actualSQL/private-
restore/fullfactory/productionproof. Ingen ny version/commit/push/CI/deploy;
samletrevision og alle øvrige afvisninger/OFF består.

### Tillæg2. oktober – faktisk539 og smal540, ikke færdig livscyklus

ONEordinary37036350223 afsluttet21:02:23 med faktisk gemning/upload/nytcache,
no-loss/private/CAS/R2/privacy/Pages/reseal/terminal/requireddeploy.
538/539 merged/publiceret21:21:47/21:42:04; tidligere pendingordrer udført.
Public539/main42e15819/samme16Z210673118/3a14/a226/8bindinger er bekræftet.
FIELD395244/397070=99.540131463% mod12Z92.179464578% sammehasValue-metode
og hashes/bytes; Nibe118brugbare/BOTH/59incomplete+59futureFULL_HISTORY.
Ikke privat historik/nativeprovider/score/kausal forbedring/kalenderETA.

540 udtager kun atomic_json, download og save_component_bank samt tre
genbrugte testparents fra lokale519.23gamleparents identiske; strictinverse
og model67-3a14-8bindingerPASS.5målparentsPASS4.011s/0skip påisolatedmainbasis;
BIG RED/26fuldsuite ikke gentaget. Owncleanup forsøges/cleanup-onlyHARD,
old/newcompletebytes og faktisk lille diskresume bevares. EgenCI/produktion
afventer DEC-0287. CP-no-closeRED URETTET/fullCP-SførT/writer/kill/failure4min/
runner/nationalkapacitet/OFF åben. Ingen frozenindex/admission/executor/API/
hash/format/budget/SQLruntime/model-/kadenceændring; alle afvisninger består.
Cron8348098 aktiv/uændret; ingen main/merge/code-only mensweatheraktiv.

Nedenstående historiske rootcauseforløb er ikke nye dispatch- eller læseautorisationer.

4.0.518 blev merged som `b076968e` efter source-CI `36696989835`.
Normalrun `36698472505` passerede leverandørerne, men stoppede i
historisk havstrømsreplay. Tre mulige DMI/DMI-par fra samme modelkørsel
havde forskellige collections/gitrene/prøveceller; ét blev afvist af
den uændrede validator i isolation. Det beviser ikke første fejlpar i
fuld replay eller fejl i DMI's officielle rådata. Krypteret fremdrift
`36698472505-1` er gemt; ingen færdig produktionspakke blev bygget.

Tre faktiske runs afviste desuden en parent-DMI-prognose som
`FORECAST_BASE_INVALID_SIZE` eller `FORECAST_PROGRESS_INVALID_SIZE`.
Læserens grænse var 256 MiB, selv om den autentificerede pakke tillader
768 MiB pr. fil. Ydre `RESTORED` skjulte dermed manglende genbrug af
prognosekomponenter og parent-EDR-cursor. Den særskilte native bulk-
modelrotation er ikke bevist tabt af denne årsag.

En integrationstest med rigtige validators reproducerer yderligere
en potentiel tabsvej: en nyere bølgerække med numerisk retning, men
uden tilsvarende `mean-wave-dir`-bevis, kunne erstatte en komplet gammel
række; adapteren fjernede bagefter den ubeviste retning. Antallet af
sådanne tilfælde i produktion er endnu ikke målt.

## Beslutning

1. Den installerede, autentificerede tidligere DMI-time er den beskyttede
   komponent, ikke en ny rekonstruktion af samme gamle råcache. Den
   bevares ved ubevist samme-modelkørsels-skift af collection, gitter,
   celle, lag eller native tidsgrundlag, når begge komponenter er fuldt
   og selvstændigt gyldige for samme kystdel, prøvepunkt, time og vejrtype.
   Replay-kalderen skal levere den konkrete beskyttede kilde som samme
   objektreference som fallback; en tekstlabel alene giver ingen ret.
2. Nyere gyldig modelkørsel eller sammenlignelig, bevist officiel revision
   må stadig overtage. Begge konkurrerende strøm-/bølgekomponenter prøves
   med den uændrede replayvalidator før prioritering. Ugyldige beviser,
   forkerte steder/tider, dubletter og ikke-godkendte kildepar undertrykkes
   ikke. Regional DMI-proxy har fortsat sin særskilte fysiske kontrakt.
3. Prognose og historisk replay skal begge medtage relevante beskyttede,
   persistente og historiske DMI-donorer. De fem vejrfamilier vælges
   atomisk og hver for sig. Numerisk bølgeretning skal være attesteret,
   før rækken kan fortrænge en komplet gammel bølge. Ingen løs retning
   må lånes fra en anden prognose. Gyldig nulbølge kan fortsat mangle retning.
   Historisk strøm valideres mod en oprindelig beskyttet cachekontekst,
   ikke en fremstillet header eller nødvendigvis den første cache i en
   liste. Genbrug af en alternativ godkendt kontekst må kun udfylde den
   manglende strøm; andre komponenter og T+3-vandstandstrend forbliver
   resultatet af den uændrede, samlede adapterprojektion.
4. DMI-forecastfilen beholder sit logiske JSON-format, men læses, flettes
   og skrives med afgrænsede poster frem for én national JSON-streng.
   Filgrænsen hentes fra den eksisterende autoritative 768-MiB-politik.
   Metadata, zoner og komprimerede PART-poster har særskilte grænser;
   dubletnøgler, ugyldig UTF-8, ændrede input og delvise skriveresultater
   afvises. Den beskyttede PART-kontinuitet kopieres fra baseline, ikke
   fra en uafsluttet progressionspakke. Installation forbliver atomisk.
5. Genbrug rapporterer `MERGED`, `ACCEPTED_NO_CHANGE`, `NOT_PRESENT`
   eller `REJECTED` særskilt. En faktisk afvist DMI-forecast inde i en
   ellers gendannet pakke må ikke kaldes vellykket kontinuitet eller
   fortsætte til ny dyr hentning. Gyldigt no-change og ældre pakker uden
   valgfri forecastfil er ikke fejl. Almindeligt cache-miss ændrer ikke
   den beskyttede baseline.
6. De fire scalar-fallbackfamiliers før/efter-tal logges sikkert allerede
   inden score/replay, så de ikke forsvinder ved en senere fejl. Kun faste
   tællere og eksplicit tilladte årsagskoder; ukendt er `null`, ikke nul.
   Den særskilte havstrømskørsel skal stadig opgøres separat.
7. Den ekstra helhedskontrol skal dække faktiske offentlige og alternative
   restorestier, ikke kun nye hjælpefunktioner. Nye regressionstests skal
   være nåelige præcis én gang fra kildegaten. Samme forecast-afvisning
   skal stoppe før installation i den gamle identitetslåste paired-vej.
8. En autentificeret OM-post, hvis kanoniske afrunding giver en fysisk
   ubrugelig tuple efter den eksisterende runtimekontrakt, må ikke blokere
   ny hentning. Originalbinding kontrolleres før udeladelse; forfalskede
   poster må ikke skjules. Gyldige gamle værdier, ukendt-modelalder-reglen,
   generation-unionens no-loss og den låste scoremodel bevares.
9. Fejlet best-effort-R2-oprydning skal vises som faste sikre tællere.
   Publicering må stadig være succes, hvis commit er verificeret og kun
   oprydningen fejler. Dette tilføjer ingen automatisk sletning og løser
   ikke tidligere efterladte objekter eller færdigpakkens genoptagelse.

Punkt 1–2 supersederer alene DEC-0264's krav om identisk collection,
gitter og lag mellem to ellers selvstændigt gyldige, beskyttede DMI-
komponenter. Kravet om samme målsted/time og streng proveniens består.
DEC-0040's nærmeste gyldige vandsøjle/dybeste fælles U/V-lag, ingen
interpolation hen over identitetsbrud, DMI-først, Copernicus før
Open-Meteo, 96-timersundtagelsen, adminvalgt DMI-vandstandsinterpolation,
Limfjord-reglen, scorebundle, geometri og scheduler ændres ikke.

## Kontrol, kapacitet og åbne spørgsmål

Måltests omfatter ti generationer med huller, nyere model/revision,
alle fem familier, ugyldig vektor/retning/proveniens, ændret målsted,
dubletter, mutation, rollback og reel krypteret syntetisk progressionspakke.
En syntetisk fil på 566.244.280 byte er læst og postvist skrevet uden
national JSON-streng; observeret peak RSS var cirka 211 MiB i denne test.
Det er ikke en total RAM-garanti for producenten, som stadig har flere
objekttræer i hukommelsen. Syntetisk replay-admission af 158.828 valg tog
cirka 27 sekunder; heller ikke dette er en produktionsmåling.

Progressionspakkens samlede 768 MiB, cipherens 384 MiB, slutpakkens
2 GiB råsum og 350 MB komprimerede arkivgrænse er separate lofter.
De hæves ikke blindt. Eksakte private filstørrelser, samlet margin og
slutarkivets nationale envelope-streng skal kontrolleres før en ny
produktion. R2-lagerplads beviser ikke plads i Node eller transporten.

Kræv version/RDKS, måltests, uændret modelbundle, grøn exact-head source-CI,
sikker merge uden aktiv vejrkørsel og derefter dokumenteret genbrug af
`36698472505-1` og beskyttet produktion. Start ingen blind genhentning,
oneoff eller cron på lokalt testbevis. Fuld artifactgate, ingen tab på
identiske steder/timer, central CAS, R2, Pages og synlig prognose skal
måles, før produktionseffekt eller stabil drift påstås. Hele projektets
resterende dækningsproblemer er ikke løst af denne rettelse.
