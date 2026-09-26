# Afgrænset leverandør- og genbrugsaudit – 26. september 2026

## Efterfølgende live-status, 26/9

4.0.493/PR #456 blev merged efter grøn exact-head-kontrol, men det
korte live-run `36232521656` stoppede før R2-publish og Pages.
Den præcise bestilte krypterede fremdrift blev gendannet. Ny pakke
havde 1.380 gyldig-til-tom-vindpar og 1.045 temperaturpar mod den
stadig offentlige 15Z-generation; mod 11Z var der nul fremtidige tab.
15Z's verificerede private kildepakke er fortsat kun tabsanker.
De tidligere 34 temperaturpar ved 26/9 07 UTC er ikke retestet,
fordi det nye target startede senere. Copernicus optog nul nye
bølge-/temperaturkandidater i 13 faktiske forsøg. Dermed er de
oprindelige lokale rettelser **ikke** en produktionsverificeret
afslutning på kontinuitet, leverandørfremgang eller deploy. Se
`docs/rdks/90_INDEX/CURRENT_TRUTH.md` for aktuel arbejdsstatus.

**Kontinuitetskrav for både genopretning og almindelig drift:** En
verificeret værdi for eksakt kystdel, prognosetime og vejrtype må
overleve vilkårligt mange efterfølgende vejrkørsler (også 4 eller 10),
så længe timen stadig ligger i den relevante gyldige prognose- eller
historikhorisont, og ingen nyere gyldig kilde må erstatte den efter
leverandørreglerne. Antal kørsler er aldrig en udløbsregel. Kun den
konkrete tidslige/videnskabelige gyldighed, kildebevis og eventuel
ændret stedidentitet må pensionere værdien. Et tomt, fejlbehæftet
eller ufuldstændigt nyt svar må ikke gøre det. Samme invariant skal
testes over flere normale beskyttede generationsskift, ikke kun ved
den særlige 11Z/15Z-sammenlægning. No-loss-kontrollen er sidste værn,
ikke en erstatning for bevaring af de oprindelige kildebanker.

## Status og afgrænsning

Ejeren bad om at bruge resterende Astra Ultra-tid på konkrete korte
krydstjek, mens den aftalte korte vejrkørsel fortsætter. Rapportens
konkrete rettelser er nu implementeret samlet i **lokal 4.0.493**;
exact-head CI, merge og livebevis mangler. Analyseafsnittene nedenfor
bevarer årsagerne og de afviste alternativer.
Ingen scoreformel, geometri, gyldighedsgrænse eller leverandørprioritet
er ændret. Dagens Supabase/R2-kvotekontrol er fortsat sprunget over.

### Lokal integration efter analysen

20 CP-original-/metadatatests, 22 banktests, 9 cursortests, 10
runtime-tests, 23 krypterede DMI/progress-tests og 10 eksisterende
pakketests består. DMI-budget-, workflow-, privacy-, versions- og
RDKS-kontroller består; aktiv modelbundle og otte forbrugere er
uændrede. Geodatadiff ændrer kun topversion. En ældre VM-wireup-test
manglede vandstandsrouting i sin isolerede testkontekst; den bruger
nu den eksisterende rigtige routingfunktion og kontrollerer samme
context til planlægning og scoring. Ingen produktionsfunktion
blev ændret af denne testreparation.

Krydstjek af ny DMI-progress-helper fandt før release to vigtige
tids-/retentionshensyn: hentetid sammenlignes med restore-uret, ikke
den låste prognosetime; den rullende EDR-prognose afgrænses til samme
121 aktuelle timer som producenten, så udløbne rækker ikke skubber
ny hale ud. Gyldige gamle komponenter på fælles aktuelle timer
bevares. Scorehistorikken ligger i særskilte urørte banker.
Copernicus' rester opgøres før Open-Meteo, så den sidstes fremgang
ikke tilskrives den forkerte leverandør.

Den obligatoriske sourceplan får fem afgrænsede offlinekommandoer
for disse direkte produktionsrisici (37 → 42), ikke en historisk
fuldsuite eller nye leverandørkald. Den forældede 29-kommandogrænse
i test af sourceplanen er synkroniseret med den faktiske plan.

PR #455 / 4.0.492 bestod exact-head CI `36227603554` på
`7f0fce03654302d62121d4aebaf1f16195195024` og blev merged som
`c41aa4721406392bddc49cb92f4b523f95a41858`. De to source-træer er ens.
Kort normalrun `36228162505` startede 26/9 kl. 09.54 dansk tid med
`quick_confirmation=true`, `quick_progress_source=36183093672-1`.
Ingen anden aktiv vejrkørsel; tre historiske køposter ligger i den
deaktiverede gamle indgang. R2 er verificeret valgt backend.

Live-måling cirka 10.00 dansk tid: `Bind optional progress to the exact
protected baseline` og `Require recovered progress before short
confirmation` er begge bestået. DMI sluttede grønt kl. 10.04.37 dansk
tid; kl. cirka 10.07 kører det særskilte Copernicus-havstrømsled. Den tidligere
startfejl er dermed passeret i denne kørsel; ny R2-publish, Pages og
de historiske 34 temperaturtab er endnu ikke bevist.

## 1. Reproduceret: kort DMI-forsøg tæller som langt

`reusable-weather-build.yml:1377` sender planlæggerens `extended` som
`DMI_BULK_ADAPTIVE_RECOVERY`, selv når quick-mode ved linje 1382 giver
kun 360 sekunders faktisk budget. `update-dmi-bulk.py:11655–11665`
gemmer derfor `lastExtendedAt` og startmangler som et langt forsøg.
`plan-dmi-recovery.py:177–183` kan efterfølgende deaktivere lange
recoveryforsøg i fire timer, hvis forbedringen er under 100 DMI-par.

Reproduktion med den faktiske `decide`, syntetisk PART og 118 mangler
i **hver af de fem felttyper**: først `extended=true`; efter den state,
som quick-mode skriver, bliver resultatet ti minutter senere
`extended=false,cooldownActive=true`; efter fire timer igen true.

Rettelse: én effektiv udførelsestilstand skal styre både budget og
recoveryregistrering. En kort kørsel må ikke oprette en ny markør for
et langt forsøg. Afklar eksisterende fejlagtige markører fra de korte
forsøg eksplicit; en rettelse fremadrettet sletter ikke deres effekt.
Bevar cooldown efter et reelt langt forsøg. Test kombinationen af
workflowoverride, gemt state og næste plan, ikke kun hver del alene.

## 2. Reproduceret: Copernicus-køerne nulstiller hinandens rotation

`weather-component-runtime.mjs:92–102` kører først huller/ældre-DMI-
udfordringer og derefter CP-opgradering af Open-Meteo, med samme bank.
`run-copernicus-weather-components.py:419–427` har kun én `nextCursor`.
`copernicus_weather_component_bank.py:657–660` fortsætter kun efter
markøren, hvis dens gruppe stadig findes i den aktuelle kø; ellers
starter den forfra.

Faktisk `build_component_plan` og `produce_component_bank`, syntetiske
disjunkte køer og fake timeouttransport, ét forsøg pr. passage:

```
Hulkø: GAP-A, GAP-B. Opgraderingskø: UPGRADE-A, UPGRADE-B.
Tre cyklusser: GAP-A, UPGRADE-A, GAP-A, UPGRADE-A, GAP-A, UPGRADE-A.
B-grupperne bliver aldrig forsøgt.
```

Dette rammer **bølger/vandtemperatur**, ikke automatisk det separate
Copernicus-havstrømsled. Antallet af livehuller forårsaget heraf er
ikke målt. Rettelse kræver både særskilte markører pr. arbejdsform og
stabil rækkefølge med efterfølgervalg, også når forrige gruppe er blevet
udfyldt og ikke længere er i køen. Separate markører alene er ikke nok.
Bevar gammelt cursorformat som eksplicit læsbar migration, og gem ingen
fremrykning før et faktisk forsøg. Test disjunkte passager, slettet
markørgruppe, skiftende targettimer og gentagne negative svar.

## 3. Reproduceret: vores Copernicus-læser afviser faktisk NWS-format

To officielle statiske 202511-produkter er kontrolleret via deres
offentlige katalog/metadata, uden private vejrdata eller credentials:

- `cmems_mod_nws_phy_anfc_1.5km_static`
- `cmems_mod_nws_wav_anfc_1.5km_static`

Begge har `deptho.standard_name=sea_floor_depth_below_geoid`, men
mangler `deptho.units`. Vores `copernicus_component_spatial.py:48`
kræver præcis `m`. De officielle manualer angiver dybden i meter.
Offlinekald med de faktiske metadata og syntetisk dybde 20 giver
`CP_STATIC_FIELD_UNIT_INVALID`.

NWS-bølgemasken har også en tredje dybdedimension. SDK 2.4.1 omdanner
`elevation` til `depth`/positive down, men tilføjer ikke deptho-enheden.
Vores `nws-wave.surfaceMaskDepth=null` i spatial-policy forbyder den
dimension. Med de faktiske dimensioner og syntetisk overfladelag giver
parseren `CP_STATIC_FIELD_DIMENSIONS_INVALID`. Den tilsvarende
NWS-fysikpolitik tillader allerede et afgrænset overfladelag.

Rettelse: dokumenteret, fastlåst NWS-202511-fortolkning ved **manglende**
enhed; en udtrykkeligt forkert enhed skal stadig afvises. Bølger skal
bruge det beviste overfladelag på samme nærmeste gridcelle, ikke et
vilkårligt dybt lag eller søgning efter en bekvem nabocelle. Baltic er
anderledes og må ikke få en generel lempelse. Bevar afstands-/dybdekrav.
Test virkelige metadataformer, ikke kun syntetiske filer med `units=m`
og todimensional maske, som hidtil skjulte uoverensstemmelsen.

Officielle kilder (læst 26/9):

- https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-013.pdf
  side 14: deptho i meter og delt bathymetri/maske med bølgeproduktet.
- https://documentation.marine.copernicus.eu/PUM/CMEMS-NWS-PUM-004-014.pdf
  side 12: deptho i meter og samme bathymetri som fysikproduktet.
- https://s3.waw3-1.cloudferro.com/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_PHY_004_013/cmems_mod_nws_phy_anfc_1.5km_static_202511--ext--bathy/static.zarr/.zmetadata
- https://s3.waw3-1.cloudferro.com/mdl-arco-time-041/arco/NWSHELF_ANALYSISFORECAST_WAV_004_014/cmems_mod_nws_wav_anfc_1.5km_static_202511--ext--bathy/static.zarr/.zmetadata

`copernicus_component_transport.py:303` skjuler parserfejlen som None,
hvorefter linje 320 siger `CP_COMPONENT_STATIC_EVIDENCE_UNAVAILABLE`.
Bevar faste, ikke-private parserårsager i stedet for vilkårlige payloads.
En ændret spatial-policy ændrer dens globale hash; eksisterende bankers
originaler, kvitteringer og genvalidering skal krydstestes før release.
En rettelse må ikke gøre tidligere gyldige Baltic/NWS-poster tomme.

### Efterfølgende kompatibilitetsbevis, stadig uden kodeændring

Den eksisterende original-NetCDF-fixture blev genverificeret med ændret
NWS-maskepolitik i hukommelsen: global policyhash ændredes, men statisk
requesthash og bankens bytes var uændrede; 3 kandidater før og efter,
0 originalfejl, 12 bevarede originalfiler og nye certifikater under den
nye policy. `static_request` indeholder ikke den globale policyhash.
Historiske dynamiske requests beholder deres oprindelige hash, mens
originalbytes genvalideres og får friske certifikater/projektioner.

Det giver en sikker retning uden kassation af banker: bevar originale
requests/kvitteringer uændret, byg friske planer og genvalider originale
data. En gammel gemt plan må ikke bruges som ny produktionsplan; den
kontrolleres fortsat mod aktuel policy. Ændr ikke dataset/version/
variableliste/target i den statiske request. Fixturebeviset er ikke et
livebevis for samtlige produktionsposter; mål før/efter på samme par.

## 4. Påvist i kode: eksplicit cachevalg vælger ikke downloadkilden

`reusable-weather-build.yml:982–995` downloader bredeste seneste
progress-prefix. `quick_progress_source` bruges først ved efterkontrol
i linje 1031–1043. Hvis en nyere snapshot eksisterer, kan den ønskede
ældre snapshot derfor ikke vælges, selv om den stadig findes.

Quick-mode skal bruge den præcise angivne run/attempt-nøgle uden
prefixfallback. Normaldrift beholder sit kontrollerede latest-valg.
Test to eksisterende snapshots, hvor den ønskede ikke er nyest,
cache-miss og forkert baseline. Den aktuelle kørsel har allerede
bekræftet den ønskede kilde, så dette er ikke dens aktuelle stopårsag.

## 5. Påvist i kode: to DMI-erhvervelsesfiler mangler i failed-run-progress

`private-weather-component-inventory.mjs` har disse i den fulde
produktionspakke, men ikke i det krypterede fremdriftsinventar:

- `data/live/dmi-forecast-cache.json`: nye EDR-prognoser samt
  `nextZoneCursor`/cooldown, skrevet af `update-weather.mjs:4037–4045,4151`.
- `data/live/dmi-water-stations.json`: faktisk seneste stationsvandstand
  og måletid, skrevet ved `:745,4368` og genbrugt ved `:708–719`.

Fejl efter disse opdateringer, men før beskyttet publish, kan miste
netop de nye værdier og EDR-rotationen, selv om bulk-DMI/CP/OM overlever.
De skal fortsat være private/krypterede, ikke offentlige artifacts.
En afgrænset erhvervelsesudvidelse må ikke tage scorestate/conditions med.

**Kompatibilitetsfælde:** Tilføj ikke bare nye keys til det fælles
komponentinventar. `private-weather-component-pack.mjs:114–131,275`
genskaber et presence-manifest over alle keys og kræver eksakt lighed.
Det ville afvise gamle packs. Inventarmodulet er desuden i den aktive
modelbundle og offentlig projektionskontrakt; en naiv ændring ville
udløse nye bindinger og kunne bryde eksisterende krypteret baseline.
Vælg en eksplicit bagudkompatibel, separat progress-only udvidelse eller
en fuldt planlagt migration. Original version-2-progress fra
`36183093672-1` skal forblive læsbar. Gamle gyldige målinger må ikke
erstattes af tomme eller ældre værdier ved genindlæsningen.

### Konkret isoleret design til implementering

En ny operationel allowlist/helper kan kun aktiveres ved eksplicit
`includeOperationalProgress === true` i packmodulet. Det modul er ikke
i den aktive modelbundle/offentlige projektionskontrakt, mens det
fælles inventarmodul er. Bevar det fælles inventar uændret. De to ekstra
presence-keys må kun optræde, når de ekstra filer faktisk findes;
tilføj ikke nye false-keys til gamle manifests. Unpack må kun tillade
disse to ekstra paths i netop progress-mode. Bevar gamle v2 ciphertexts,
AES-GCM, baselinebinding, filhashes, bytelofter og atomisk rollback.
Producér ikke en falsk ny modelmigration for en driftsteknisk udvidelse.

Flet EDR i en separat operationel helper, som importerer uændrede
`normalizeForecastHourly`, `verifiedDmiForecastComponentSource` og
`preferQualifiedDmiComponentSource`. Forventet zone/punkt skal komme fra
centralt hydreret `data/zones.geojson` med samme `dataPoint`-regel som
den virkelige producent. Verificér begge donors komponenter og flet
hele komponenttupler med deres kilde pr. tid, ikke løse tal. Importér
ikke `update-weather.mjs`, som har top-level produktionssideeffekter.

Bevar beskyttet stationsregister og adminrouting; flet kun en nyere
gyldig observationstuple ved præcis samme sourceKey/stationId/punkt.
Kopiér ikke gammel validUntil eller status, som forlænger målingen.
Ukendte stationer kræver frisk registerbekræftelse. Overtag kun EDR-
cursor/cooldown fra nyere gyldig lastAttemptAt ved samme aktive
zone-id-rækkefølge og punkter; aldrig et blindt runtime-object-spread.

Måltests: gammel v2 uden ekstradata; ny med begge ekstradata; forkert
geometri; nyere men delvis prognose; ugyldig/ældre station; gyldig→tom;
markør ved ændret zoneliste; rollback af samlet atomisk installation.
De nye operationelle helpers skal registreres i producentinventaret.

Progress-seal/save har korrekt `always()` ved almindelige fejl, men
ligger efter centralbygningen. Hard runner-/jobstop før seal er ikke
dækket. Tidligere holdbar gemning kan forbedres, men er ikke bevist
årsagen til de aktuelle resthuller.

## 6. Tal må ikke blandes sammen

Sidste forsøg med faktiske leverandører er `36183093672`, job
`108230290751`. Den fulde afsluttede joblog blev læst via direkte
GitHub job-API; CLI's cachede delvise logs var ikke tilstrækkelige.

- Havstrøm: CP's valgte DMI-hulpar steg 5.311 → 5.321 (+10).
  Dens rå native dækning var 6.316; det er et andet, overlappende mål.
- Havstrømsleddenes endelige valgte fordeling ved target 25/9 kl. 20Z:
  DMI 23.384, regional DMI 832, CP 5.321, OM 43.641, manglende 6.236;
  tilsammen 79.414. Dette er **ikke alle fem vejrtyper**.
- CP bølger/vandtemperatur: before/afterCopernicus viste ingen ny
  dækning. Slutrapporten viste fire statiske afvisninger og én timeout,
  men `weather-component-runtime.mjs:74,141` overskriver summary ved
  hver passage. De fem forsøg er kun den sidste opgraderingspassage,
  ikke hele CP-leddets antal forsøg. Rapporter passagerne separat.
- Det korte OM-havstrømsled nåede budgettet efter tre batches og
  hentede 470 nye par. 2.969 parværdier var ugyldige/tomme, 11
  gridafstande blev afvist. Dette er hændelsestal, ikke en disjunkt
  opdeling af de 6.236 slutrester. Langtidsresten kan ikke forklares
  som kun køretid eller kun leverandørfravær ud fra disse tal.
- Central komponentopgørelse (ikke en uafhængig slutoptælling af
  offentlig side): vind 64.383 gyldige/15.031 manglende; bølger
  76.834/2.580; vandstand 29.255/50.159; temperatur 52.228/27.186,
  hver af 79.414. Vandstandens SOURCE-interpolation og native DMI-
  planlægger bruger forskellige dækningsmål; bland dem ikke sammen.
- Første offentlige no-loss-sammenligning mod 11Z ved dette run:
  85 identiske timer × 673 dele, nul tab i vind/bølger/havstrøm/
  vandstand og 34 temperaturtab ved 26/9 kl. 07Z. Gevinst på samme
  overlap: vind 4.524, bølger 8.992, havstrøm 2.131, vandstand 25.111,
  temperatur 14.364. Ny pakke blev ikke publiceret.

Copernicus vind har ingen implementeret/verificeret kontrakt i den
nuværende adapter (`pinned_plan` routes er tomme). Vandstand er
bevidst DMI-only. Derfor må DMI > CP > OM ikke præsenteres som tre
reelt aktive leverandører for hver af de fem felttyper.

## 7. Bekræftet, ikke behov for ny ændring

- DMI kan planlægge egne mangler, selv når OM/CP dækker dem; prioritet
  og CP-over-OM er til stede. Ingen generel OM-lås på DMI er fundet.
- 96-timersundtagelsen bruger oprindelig modeltid, ikke downloadtid.
- Central admin-vandstandsinterpolation bruges i plan og produktion.
- Godkendt Limfjord-fastholdelse er ikke ændret.
- De historiske 34 temperaturtab er kun med i no-loss, hvis nyt target
  stadig er <= 26/9 kl. 07Z. Timer før nyt target filtreres ud ved
  `check-public-weather-continuity.mjs:91`. Et senere grønt resultat
  alene beviser derfor ikke, at den historiske fejl blev repareret.
- Muligheden for, at anden CP-passage mister førstes kandidater, blev
  undersøgt og afvist i den aktuelle kode: `verify_original_components`
  projicerer med `include_retained_bank=True`, også når need-listen er
  anderledes. Det er forsøgsstatistik og cursor, der overskrives;
  konkludér ikke tab af alle tidligere kandidater af den grund.

## Samlet næste arbejdsgang

Lad den ene korte kørsel afslutte. Ændr ikke main eller start parallel
weather under dens lås. Følg fem feltresultater, R2-publish og Pages.
Gem nye snapshot-id'er før næste dispatch, også hvis slutdeploy fejler.

Forbered én sammenhængende leverandør-/fortsættelsesrettelse ud fra
ovenstående beviser. Hold datagyldighed, scoremodel og offentlig
adfærd uændret. Afklar policyhash- og packkompatibilitet før kodning,
og brug små reproduktioner for de fundne kontrakter. Ingen ny bred
sourcegate før den samlede release er klar; almindelige releasekrav
og versions-/geodatadiff består. Ingen lang ny hentning før kort
save/deploy-bevis og rettet quick/recovery-registrering.

Åbne måleopgaver: geografisk opdeling af rester pr. vejrtype; gentagne
identiske DMI-assets med samme manglende scalarfelt; faktisk fremgang
fra CP-metadata/rotation efter rettelse; separat DMI-native versus
offentligt interpoleret vandstand. Ingen påstand om komplet cache.
