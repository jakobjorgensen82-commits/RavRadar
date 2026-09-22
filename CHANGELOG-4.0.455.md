# 4.0.455 – Selvstændig backend-forhåndskontrol og robust vejrkæde

## Hvad der blev rettet

- Tilføjet den append-only migration `20260922100000_integrated_trip_binding_repair.sql`, som genindsætter de tre integrerede trip-policy-funktioner efter den konstaterede Supabase-drift. Den verificerede policy-hash er den samme som den forventede hash i den eksisterende binding.
- Regenereret de to modelbundles efter den fælles recovery-ændring, så den
  aktive integrerede bundle (`dafee019…`) og den inaktive Candidate G-reserve
  (`6bdae434…`) igen stemmer med deres faktiske transitive kildefiler. Den
  isolerede Candidate G-kontrakt eksporterer nu også den fælles 118-timers
  offentlige horisont, så rollback-læseren kan bygge samme leveringspakke.
- Ført den aktuelle checkpoint-CAS/continuation-binding ind i samme append-only
  successor. Mutable schema og installationsscript synkroniseres derfra;
  historiske migrationsfiler er uændrede.
- Flyttet databasekontrollen frem i den integrerede vejrworkflow. En run med forkert backend-binding stopper før DMI, Copernicus og Open-Meteo bruger tid på en kørsel, der alligevel ikke kan afsluttes.
- Opdateret migrationsplan, release-gate, source-gate, workflowkontrakt og code-only-plan til den nye append-only successor. Ingen historiske migrationer fjernes eller omskrives.
- Rettet tre statiske UI-kontroller, så de kontrollerer de aktuelle `ensureConditionDetails`-, `loadConditionDetails`- og retningskald i stedet for forældede tekststrenge.
- Rettet public-manifest-auditen, så den ikke sammenligner den statiske manifestdel med den dynamiske `detailDelivery`-oversigt. Leveringsoversigten kontrolleres fortsat særskilt.
- Opdateret cutover-readiness-testens midlertidige migrationshistorik, så den
  også indeholder 4.0.455-successoren; code-only readback og append-only
  placeholder-reglen ser dermed samme komplette lokale migrationsbillede.
- Bevaret source-gaten som fem afgrænsede kildegrupper. Den dokumenterede
  grænse er rettet til den eksisterende 29-kommando-plan; der er ikke tilføjet
  historiske validate- eller release-tests til den tidlige gate.

## Driftsmål

Vejrkørslen skal kunne køre selvstændigt i GitHub/cron. Codex er ikke en
runtime-afhængighed: workflowet udfører selv forhåndskontrol, retry,
checkpoint, provider-fallback og afsluttende readiness-kontroller. En virkelig
backend-, datatabs-, artifact- eller sikkerhedsfejl stopper stadig med en
konkret årsag; almindelig drift kræver ikke manuel overvågning.

## Ikke ændret

Scoreformel, modelbinding, DMI-first-prioritet, fallbackregler, bevarelse af
gamle gyldige værdier og MISSING-semantik er ikke ændret. Den første normale
kørsel efter merge skal stadig bevise hele kæden fra cache til offentlig runtime.
