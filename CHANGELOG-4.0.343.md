# RavRadar 4.0.343

## Fair lukning af hele vejrvinduet

- DMI's uløste strenge currentfamilier får nu bounded, fair service med en vedvarende rotationsmarkør i stedet for at kunne blive sultet af den fælles collectionkvote.
- Eksakt prefetch flytter en familie ud af den kritiske kø, når den kun har kvalitetsrefresh tilbage, så reel hultid ikke reserveres til allerede dækkede data.
- Copernicus roterer Baltic og AMM15 i separate produktkøer og fletter dem round-robin. AMM15-only-par kan starte straks, mens overlap kun venter på det eksakte pars Baltic-bevis.
- Et fejlet shard er lokalt; senere shards og det andet Copernicus-produkt kan fortsætte inden for samme bounded kørsel.

## Eksakt og fælles WAM-ejerskab

- Én fælles owner-policy bruges nu af DMI-plan, staging, salvage, historik og slutvalidering.
- To auditerede vestlige dele, `dk-b10-10-national-part-02-locality-02` og `dk-b10-10-national-part-03`, hentes fra `wam_dw`, fordi `wam_nsb` ikke kan levere dem. De øvrige native dele følger den eksisterende kysttyperegel.
- Targetregister, receipts, historik og privat runtime bindes til owner-policy-id'et. Gamle partielle receipts invalideres uden at nulstille den aktive cache.
- Forkert gammel ejerproveniens ommærkes ikke og må ikke blokere en senere korrekt, fuldt valideret række.

## Drift, sikkerhed og bevis

- Normal vejropdatering og oneoff bruger samme producenter og regler; oneoff giver kun flere bounded pass.
- Reelle huller/ugyldige rækker går stadig foran kvalitetsrefresh, og kildeprioriteten DMI → Copernicus → Open-Meteo er uændret.
- Current kræver fortsat 79.414/79.414. Bølger kræver 79.060 native WAM plus Feggesund 354/354. Delvis fremgang er ikke handoff eller launchbevis.
- Ingen geometri, land-/vandpunkter, tærskler, interpolation, fysik eller score er ændret.
- De målrettede DMI-, Copernicus-, WAM-, workflow-, runtimebinding- og syntaxkontroller er grønne lokalt. Exact-head-CI og main-provider-/closurebevis er fortsat åbne.

Se DEC-0125 for den bindende kontrakt og runtimebeviset fra oneoff `34565347360`.
