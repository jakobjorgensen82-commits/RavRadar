# RavRadar 4.0.344 – merged, men uden komplet produktionsresultat

PR #278 bestod exact-head-sourcegaten og blev merged som `f2cc2a77`. Main-run `34635781802` og oneoff `34642214559` gav intet handoff eller cutover; oneoff sluttede 78.381/79.414 med 1.033 provider-negative Open-Meteo-rester og grøn WAM/Feggesund. DEC-0127/4.0.345 følger op på den efterfølgende målte Copernicus-checkpointflaskehals.

## Genbrug og DMI

- Regionale samples beholder deres oprindelige fuldt validerede kildebevis, selv om en anden native DMI-række overtager. Migration sker før proof kan tabes ved recovery, og en afvist ny leaf må ikke erstatte gammel gyldig data/proof.
- Faktisk læsende prøve på eksisterende cache genbruger 656 af den faste 1.658-rest uden tab; serialisering, idempotens og inputbevarelse er bevist. Det er ikke opdateret produktionsstatus.
- Leadrotation opdaterer kun den faktisk valgte familie; resterende kritiske DMI-familier deler tiden. LF prioriterer faktisk direkte/regional hulunion og godkendt holdgevinst, inklusive locked T−3-kant.
- Katalogets +120-terminal kan observeres uden udvidelse af producentkø eller official118. Separat sanitiseret terminalidentitet følger samme collection/modelkørsel og eksisterende ledger-/filbindinger.
- Offphase og uændrede regionale inputs giver ikke unødvendig tung replan. Eksakte schedulerobservationer kan spare gentaget nulresultat, men godkender aldrig data.

## Copernicus

- Konsolideret privat precommit undgår gentagne fulde recordgennemløb, men bevarer offentlige validators, masks, originale positive certifikater, disk-readback og strict recovery. Bank, shadow og stage kontrolleres samlet før første atomiske replace.
- Efter-readback-prøve: 40.120 syntetiske Baltic-rækker gav identiske filer på 27,536 mod 45,926 sekunder med to recordgennemløb. Reelt Linux-/providerforbrug er fortsat åbent.
- Kølængdebevidst faktisk UTC-rotation undgår, at timekadence kun besøger halvdelen af Baltics 34 mulige førstepladser.
- Requests opdeles ved mindst 24 hele tomme native timer; små mellemrum beholdes samlet for at undgå mikrokald. Stabile geografiske shards får ét segment pr. fair pass, ingen ny maksimal parkvote.
- Segmentfejl er lokale og producerer ikke completed source-witness. Gamle brede attempts pensioneres først ved kollektiv fuld erstatning fra aktuelle samme-reference/source/shard-forsøg. Baltic→AMM15-prioriteten og originalpositive donorbeviser består.
- Privacy-sikre requeststørrelser samt acquire/hash/parse- og admission/merge/checkpointtider gør den efterfølgende drift målbar. Hard-/softbudgetter ændres ikke på gæt; aktivt endnu ikke gemt arbejde kan fortsat tabes ved timeout.

## Grænser og status

- Første exact-head-kildekontrol stoppede i en forældet testforventning om katalogforespørgslens højre kant. Testen forventer nu den allerede implementerede separate observation af en mulig kausal modelkørsels +120-terminal; producentkø, required ledger og 118-timersakse ændres ikke. Produktionskoden er uændret af denne opfølgning.
- Anden exact-head-kildekontrol passerede den rettede schedulerfixture og stoppede senere i en cachebevaringstest, som forventede recovery-hash/quarantine direkte inde i commitfunktionen. Kontrollen ligger nu i den fælles `prepare_recovered_donor_replacement`, som bruges af både den klassiske og den forberedte, hurtigere commitvej. Kildetesten følger den fælles helper; den funktionelle crash-/bytebevaringstest består uændret. Hele den korte workflowkontrakt og de efterfølgende source-tail-kontroller er grønne lokalt.

Normal og oneoff bruger samme operationelle producentkode. Vedvarende cache, huller/hale før kvalitet, DMI → Copernicus → Open-Meteo, op til 48 timers verificeret historik, geometri, afstande, fysik, score og allerede anvendte SQL-migrationer er uændrede. DEC-0122's stående godkendte first-cutover-undtagelse flyttes kun til exact-release 4.0.344; ingen materiel grænse eller gate lempes.

4.0.343/main `5587001b` er den aktuelle produktionskode; Candidate G er offentlig. 4.0.344 er committed/pushet i PR #278, men en ny exact-head-CI efter testopfølgningen, merge og produktionsverifikation mangler. Current 79.414/79.414, native WAM 79.060, Feggesund 354/354, fulde post-data-gates, runbundet handoff, offentlig modelverifikation og faktisk normal vedligeholdelse mangler. Se DEC-0126 og de aktuelle AI-/RDKS-checkpoints.
