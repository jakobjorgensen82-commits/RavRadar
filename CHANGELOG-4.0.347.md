# RavRadar 4.0.347 – terminalbevist DMI-fortsættelse

Dato: 2026-09-12
Status: lokal releasekandidat; exact-head-CI, merge og produktion afventer

## Faktisk produktionsgrundlag

- 4.0.346 bestod exact-head-sourcegate `34673860241`, blev merged som `e912ef9a`, og oneoff `34675040245` genbrugte det byteidentiske proof uden en anden fuld kildegate.
- DMI nåede 66.998/79.414 direkte currentpar i pass 1. NSBS og HARMONIE sluttede begge på bevaret runtime; 4.0.346's snævre wrapperallowlist stoppede derfor sikkert før pass 2.
- DMI-GRIB, DMI-kandidat, regional, Copernicus-donor/source-stage/valideret cache samt Open-Meteo-donor/progress blev gemt. Open-Meteo løste 2.170/2.212 restpar og efterlod 42 provider-negative par fordelt på 21 kystdele efter isolerede genforsøg. Ingen runtime-, attempt- eller køgrænse forklarede de 42. Slutgaten fejlede; intet handoff, artifact, cutover eller modelskift blev udført.

## Rettet

- Producenten udsteder kun den oneoff-interne exitkode 75 efter fuld normal finalisering, når strict current stadig blokerer. Normal drift uden opt-in og `FINALIZE_ONLY` beholder den gamle exitkontrakt; alle exceptions beholder generisk exit 2.
- Wrapperen læser aldrig cache efter generisk exit 2. Kode 75 kræver ny same-target-slutcache uden pending checkpoint, eksakt ledger/runtimeallowlist, dette kalds positive assettæller og alle råcache-/diskgrænser. Koden normaliseres udadtil til 2, hvis passgrænsen nås uden READY.
- Supervisoren videresender ikke kode 75, hvis en tidligere child i samme pass blev watchdogstoppet, og watchdog-finalisering kan ikke udstede fortsættelsesbevis.
- Runtime og downloadbudget adskilles med eksakte beskeder. Et HARMONIE-stop kan kun være en ledsagefejl til faktisk DKSS-runtime: enten den eksakte ydre tre-feltsform før collectionstart eller den indre form med `partialProgressPreserved:true`. WAM, HARMONIE alene, download, request, parser, katalog og ukendte felter stopper.
- `assetsProcessedThisInvocation` nulstilles for hvert producentkald og tæller kun færdigbehandlede assets; historiske runmetadata kan ikke åbne et nyt pass. Pass 3 kræver fortsat stigende `verifiedPairCount`.
- Pages kontrollerer `productionReferenceAt + 117h` før enhver begin-CAS og igen umiddelbart før deployment. Fejl efter begin går gennem den eksisterende reconciliation/abort. 90/150/240 minutter er fortsat advarsler, ikke nye hårde aldersgrænser.

## Uændret

DMI planlægger fortsat hele 673 × 118-registeret, og normal/oneoff deler producent, supervisor, cache og rotation. Kildeorden, grids, afstande, interpolation, donoradmission, WAM/Feggesund, geometri, land-/vandpunkter, scoreformel og modelbundles er uændrede. De 42 mangler accepteres ikke. Current kræver 79.414/79.414, native WAM 79.060 og Feggesund 354/354 før handoff og cutover.

Exact-content-proofet fjerner alene den dobbelte kildegate: én `validate:source` skal bestå på PR'ens eksakte endelige head, og byteidentisk main kan genbruge det efter live GitHub-verifikation. Frisk central hydrering, providerdata, fuld `npm run validate`, fuld `npm run release:gate`, handoff, artifact/privacy, cutover og offentlig modelkontrol kan aldrig genbruges eller springes over.

## Lokal validering

- DMI-wrapper 15/15, supervisor 12/12 og transaktionel checkpoint 32/32 er grønne.
- Python compile, DMI-modeldownloadkontrakten, target-freshness-grænser og hele workflowrækkefølgen er grønne.
- Serialiseret cache-seam, generic-exit/post-cache-exception, watchdoghistorik, indre/ydre HARMONIE, downloadkollision, ukendte felter, historisk assettæller og pending checkpoint er dækket.
- PR #281's første exact-head-run `34680013012` bestod hele releasegaten, men stoppede senere i én forældet statisk WAM-test, som søgte de erstattede direkte `return 2/0`-linjer. Testen beviser nu den nye helper og dens fail-closed kald; hele dens 63-scenarie-suite er grøn lokalt. Ingen produktionskode blev ændret i opfølgningen.
- Exact-head-CI, main-runtime med faktisk pass 2/3, komplet closure, cutover, offentlig integreret model og normal vedligeholdelseskapacitet er fortsat åbne. Se DEC-0129.
