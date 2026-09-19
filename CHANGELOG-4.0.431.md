# RavRadar 4.0.431

## Historisk PENDING kan afsluttes uden at omskrive sit bevis

- Den providerfri 4.0.430-genoptagelse fandt og verificerede det allerede
  offentlige 4.0.429-target, backfillede både source- og targetbevis til den
  holdbare private lagring og klassificerede targetet korrekt. Den stoppede
  før central afslutning, deploy og providerkald.
- Rodårsagen var to efterfølgende kontraktkanter i samme historiske
  reconciliation: den forseglede readiness blev fejlagtigt målt mod dagens
  længere migrationsliste, og en oprindeligt tilladt diagnostisk audit blev
  fejlagtigt krævet helt grøn ved genoptagelse.
- Historisk readiness valideres nu mod den eksakte centrale hash, source head,
  model- og implementationsbinding, profil, assistantbinding, unik bounded
  migrationsliste og gyldige policyidentiteter. Nye overgange skal fortsat
  opfylde dagens fulde readiness inklusive alle aktuelle migrationer.
- En historisk integrated-maintenance-audit må kun genoptages med diagnostiske
  fund, når den uforanderlige plan allerede har forseglet
  `calibrationEligibleAfterVerifiedActivation=false`. Fejlkoder og positive
  tællere er bounded og eksakt hashbundet; 210/673, privacy, rollback/warmup,
  historik, offentlig identitet og central CAS er uændret strenge.
- Regressionen efterligner den faktiske forgængermigration, de tre observerede
  auditkoder og measured warmup. Pages-rækkefølge, holdbar reentry,
  workflow-slutstatus og terminalkontrol er fortsat grønne i måltests.

## Status

- 4.0.430 er merged som `f7c954fe` efter grøn exact-head-kildegate
  `35446765316`.
- Providerfri run `35447099504` foretog ingen ny vejrhentning og intet deploy;
  central PENDING er derfor fortsat åben, indtil 4.0.431 er merged og samme
  reentry gennemføres.
- Den samlede 4.0.430-vejrrettelse er ikke endnu produktionsbevist. Efter
  providerfri central afslutning/deploy skal almindelige vejrkørsler bevise
  komplethed, DMI-first, reservekæde, cachefortsættelse og browseradfærd.

