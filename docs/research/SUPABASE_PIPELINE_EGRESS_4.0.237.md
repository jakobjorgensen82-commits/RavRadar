# Supabase pipeline-estimator – 4.0.237

Dato: 2026-08-20  
Grundlag: supportartifact fra naturlig produktion `#3238`  
Metode: `scripts/audit-supabase-pipeline-egress.mjs` i read-only mode.

## Resultat

Den beregnede nedre pipelinegraense er 1.358.425 bytes pr. koersel eller 3,644 GiB over 30 dage ved 96 koersler dagligt. 4.0.219-artifactet gav cirka 1,13 MB og 3,03 GiB. Den nye vaerdi er derfor cirka 0,614 GiB hoejere pr. beregnet periode.

Routingauditrettelsen virker fortsat: den undgaar 527.796 bytes pr. koersel, beregnet til 1,416 GiB over perioden.

## Stoerste aktuelle bidrag

`dmi-water-stations` fylder 565.218 kompakte bytes og indgaar baade i central hydration og beskyttet readback. Dokumentet indeholder 373 stationer. Stationerne fylder 497.264 bytes, heraf cirka 115.203 bytes i de bevarede raa `properties`; 250 historiske notifikationer fylder 67.428 bytes.

Det er ikke i sig selv bevis for overfloediige felter. Stationsdokumentet er baade runtimeinput og ejerdiagnostik. At splitte raa properties, notifikationer eller readback ud kraever derfor en konkret kontrakt for central autoritet, admin-download, rettigheder, retention, rollback og releasegate.

## Afgrænsning

Tallet er ikke Supabases faktiske billing-egress. HTTP-overhead, manifestreadback, admin-/brugertrafik og anden trafik er ikke inkluderet. Dashboardets naeste billingperiode er fortsat det autoritative forbrugsbevis.

Ingen produktionskode, payloadkontrakt eller retention er aendret i denne maaling.
