# DEC-0109 – én afgrænset rekonstruktion af Candidate G-transportbevis

**Status:** Ejer-godkendt, lokalt implementeret og målrettet lokalt testet kildekandidat; ikke exact-head-CI-valideret, merged, anvendt, live-storage- eller produktionsverificeret

**Dato:** 2026-08-29

**Incident:** `RRGAP-2026-08-29-CANDIDATE-G-01`

**Berører:** Candidate G-transportmemory, state/proveniens, checkpoint/recovery, public payloads, tur-/observationsbinding og produktionsworkflow

**Ændrer ikke:** DMI-/Copernicus-målinger, vejr, bølger, vandstand, rå U/V, koordinater, geometri, land-/vandpunkter, Candidate G-formlen eller den kommende samlede model under DEC-0102

## Hændelse og ejerautoritet

GitHubs native schedules udeblev om morgenen 29. august 2026. Den eksterne vagthund gendannede komplette aktuelle vejrdata, men den offentlige Candidate G-primary `rr-20260829095610-210` stod ved 0/673 `READY`, 673 `WINDOW_INCOMPLETE` og kun 5–12 af de krævede 48 sammenhængende timer. Den komplette, ældre nødvisning lod siden fungere, men eksperten kunne ikke arbejde med en frisk primary.

Ejeren har udtrykkeligt besluttet, at netop dette dokumenterede hul må rekonstrueres én gang, fordi perioden ikke skal bruges til reel ravjagt. Det er en bevidst undtagelse til DEC-0059, DEC-0085 og DEC-0108's normale forbud mod kunstig historik. Undtagelsen gælder kun incidentet ovenfor. Den må ikke blive automatisk schedule, generel fallback, standard-backfill eller præcedens for andre huller.

## Datagrænse og metode

1. De eneste tilladte kilder er de eksakte supportartifacts før og efter hullet: run `33225493339`/artifact `9707010150` og run `33233545688`/artifact `9709446092`, begge på source-head `a93082548c4cc1ddbe9c75ce303d334530a534c4`.
2. Kilderne genverificeres gennem run-/artifactbinding, payloadhash, model-/profil-/stateKey-identitet og præcis 210 zoner/673 kystdele. Data fra en anden run, artifact, commit, delbestand eller modelkontekst må ikke anvendes.
3. Kun Candidate G's allerede afledte, signerede kystnormale `strength` mellem -1 og 1 må rekonstrueres. Metoden er lineær interpolation mellem den sidste målte prøve før hullet og den første målte prøve efter hullet ved delens dokumenterede native kadence.
4. Rekonstruktionen omfatter 665 dele med en-timeskadence og otte dele med tre-timerskadence. Højst fem syntetiske prøver pr. del er tilladt. Eksakte tider og antal forsegles i en descriptor; de må ikke gættes eller udvides ved apply.
5. Hver syntetisk prøve mærkes med incident-id og provenance `OWNER_AUTHORIZED_LINEAR_INTERPOLATION_DERIVED_STRENGTH`. Den sanitiserede trustoversigt binder derudover `DEC-0109`, metoden `LINEAR_INTERPOLATION_OF_DERIVED_SIGNED_TRANSPORT_STRENGTH` og klassifikationen `RECONSTRUCTED_DERIVED_NOT_MEASURED`.
6. Vejr, vind, bølgehøjde/-periode/-retning, vandstand, rå U/V, fart, koordinater, geometri, punkt-id'er, scoreoutput og private payloads må hverken interpoleres, læses ud, gemmes i descriptoren eller publiceres.

## State- og tillidskontrakt

1. Almindelig, udelukkende målt Candidate G-state forbliver schema `2.0.0`. State med en levende rekonstruktionsmarkør bruger schema `2.1.0`, så kode før DEC-0109 afviser den fail-closed i stedet for at vaske proveniensen væk.
2. Schema 2.0 og 2.1 må eksistere samtidigt under det naturlige 48-timers rolloff, når alle dele fortsat er samme Candidate G-model, profil, variant og stateKey. Ukendt schema eller blandet modelkontekst afvises.
3. Rekonstrueret evidens må gøre det bounded 48-timers transportvindue teknisk `READY`, men tilliden skal følge state → Candidate G-mode → public mode/diagnostik → startup/detaljer → manifest/hash.
4. `evidenceTrust` er `RECONSTRUCTED_DERIVED_NOT_MEASURED`, `calibrationEligible=false` og `hardObservedOuttransportEligible=false`, så længe mindst én syntetisk prøve ligger i det aktive vindue.
5. En 13-timers nul-gate må kun udløses af faktisk målt udtransport. Hvis resultatet afhænger af den rekonstruerede sekvens, undertrykkes den hårde observerede udtransportgate; rekonstruktionen må ikke blive bevis for, at rav faktisk blev ført ud.
6. Continuation-checkpoint løftes til schema 2 med hashbundet state og trust. Gamle, udelukkende målte schema-1-checkpoints må læses gennem en snæver bro; nye checkpoints skrives kun som schema 2. Ukendt/tampered trust stopper uden mutation.

## Inspect, apply, rollback og cleanup

1. `inspect` er læse-only. Det downloader de to eksakte artifacts, beviser identitet, bracket, cadence, delantal, måltilstand og neutral/venstre/højre følsomhed og uploader kun en hashforseglet descriptor uden styrker, score, vejr, koordinater eller rå vektorer.
2. `apply` må kun køre via eksplicit manuel dispatch på den eksakte descriptor-SHA. Den genhenter samme artifacts og bruger compare-and-swap mod det aktuelt hydrerede måls dataset-, reference- og statehash før første mutation.
3. Før målet ændres, skrives en kompakt privat rollback med den eksakte før-state. Gentaget apply, ændret mål, ny produktion mellem inspect og apply, forkert descriptor eller kildeafvigelse stopper uden mutation og kræver ny inspect. Apply beviser derefter på en isoleret kopi, at `apply → direkte rollback` er byteidentisk, mens det egentlige anvendte mål forbliver urørt af beviset; checkpointet uploades før resten af produktionen fortsætter.
4. Den muterede runtime skal gå gennem normal frisk produktion, Candidate G-runtimeaudit, fuld `validate`, `release:gate`, artifact og Pages. Rekonstruktionsmode deler den normale produktions-concurrency og må ikke omgå current-hour-, DMI/Copernicus-, 210/673- eller deploygates. Ingen apply-/rollback-/cleanup-state må gemmes i den delte continuation- eller last-verified-fallbackcache; et senere fejlet run kan derfor ikke blive restorekilde.
5. Operativ `rollback` har to adskilte tidsdomæner. Eksakt før-state må kun gendannes, når hele det aktuelle dokument, Candidate G-state, dataset/reference og målidentitet stadig er byte-/hashidentisk med det umiddelbare post-apply-mål. Enhver senere descendant vælger automatisk descriptorbundet kausal cleanup i stedet; et gammelt checkpoint må aldrig overskrive nyere målt evidens.
6. Kausal `cleanup` fjerner kun syntetiske prøver fra dette incident, bevarer alle nyere målte prøver, genberegner fra den målte højresuffix og vender tilbage til schema `2.0.0`. Alle 673 delscorer, zonescorer og public modes lukkes eksplicit som `WINDOW_INCOMPLETE`, indtil en obligatorisk frisk normal vejrproduktion har genopbygget og valideret vinduet.
7. Før første 4.0.311-Pagesproduktion skal samme eksakte main-head have et succesfuldt `[d1]`-backenddeploy. Efter D1-schema, capacity og exact-main-CAS sættes umiddelbart før første Edge-deploy præcis ét installationstype-intent: `d1_edge_predeploy_intent` for eksisterende D1 eller `fresh_edge_predeploy_intent` for genuine fresh. Legacy uden markør får desuden `legacy_activation_intent`/varig fase efter sit kapacitetsbundne CAS. Begge maintenance-kapable Edge-funktioner deployes under uændret mode/gammel Worker. Existing D1 dobbeltattesteres i D1-mode, får `d1_repair_intent` og en 20-minutters `maintenance:<deadline>`-lease; Edge afviser over 30 minutter og fortolker udløb som D1. Alle Edge-prober har fem sekunders hard timeout. Efter dobbelt maintenance-attestation og 20-sekunders drain skal mindst 600 sekunders lease restere før første Worker-write; secret, deploy og health er én samlet højst syv minutter lang gate. Genuine fresh forbliver Supabase indtil første synk og fresh `activation_intent`/markør. Partial existing-D1 Edge-deploy udløser kun exact-main-bundet D1 roll-forward. Partial fresh Edge-deploy før activation udløser exact-main → Supabase-secret → eksakt Edge-redeploy → dobbelt Supabase-attestation. Fejl før capacity/predeploy-CAS sætter intet intent og tillader nul ekstern recoverymutation. Efter D1-aktivering følger dobbeltattestation, drain, slutreconciliation og Edge-/Worker-/registry-/SQL-verifikation; manglende bevis giver no-op uden artifact/Pages.
Legacy-D1 må kun klassificeres fra de eksakte ti EU-shards sammen med både run/head-bevis og GitHubs upaginerede jobbevis for run `33024408547`: ét job på første forsøg, alle ti bundne D1-trin `completed/success` og det alternative Supabase-rollbacktrin `completed/skipped`. Generel run-success uden stepattestation er tvetydig og skal stoppe før legacy-intent.

8. Koderollback må først ske efter data-cleanup; ellers kan ældre kode møde schema 2.1 og skal med vilje stoppe fail-closed.

## Offentlig fallback og ture

1. Den eksisterende komplette nødvisning skal være målt-only. En fallbackkandidat med rekonstrueret state eller manglende/tampered trust må ikke stages som `last verified`.
2. En historisk schema-1 fallback kan kun opgraderes internt til `VERIFIED_ONLY`, når dens oprindelige hashes, 210/673/1.346-audit og alle 673 målte schema-2.0-states er verificeret. Delvis eller markeret fallback afvises.
3. En tur, der bindes til en vist nødvisning, får `public-emergency-last-complete`. En tur, hvis viste RavScore bruger rekonstruktionen, får `ravscore-reconstructed-derived-evidence`. Begge markører gør turen brugbar som brugerhistorik, men `calibration_eligible=false`.
4. Appens turkontekst skal føre hele det faktisk aktive manifest videre. Både startup-pakkens og den valgte kystdels trust skal være til stede og byte-/feltidentiske med manifestets trust; manglende eller modstridende trust afvises fail-closed før turbinding.
5. Aktive eller afventende schema-v2-ture oprettet før 4.0.311 kan mangle de nye trustfelter. De må ikke fail-open som kalibreringsevidens og må heller ikke slettes. De migreres fail-closed med `ravscore-evidence-trust-unattested`, bevares som brugerhistorik og får `calibration_eligible=false`.
6. Allerede gemte schema-v2-observationer fra før 4.0.311 ændres eller slettes ikke i databasen. Den lokale prediction-/kalibreringsforbruger udelukker dem fail-closed, medmindre alle tre attestationer er opfyldt samtidigt: `calibration_features.appVersion >= 4.0.311`, `calibration_eligible=true`, og `data_quality_flags` er den eksakte attesterede tomme liste. Manglende, ældre eller modstridende feltværdi giver udelukkelse, ikke datamutation.
7. Markørerne og de eksakte reason codes skal være identiske gennem browser, lokal outbox, observationservice, Supabase Edge, D1/Supabase-lagring, schema og installationskopi. Ukendt eller modstridende binding afvises fail-closed.
8. Edge og D1 må ikke stole på en navneblokliste alene. De håndhæver samme rekursive privacygate samt en eksplicit allowlist med typer og intervaller for schema-v2-kalibreringsfelter og de legitime vejrsnapshot-formater; ukendte nested felter, rå U/V/eastward/northward, geohash, UTM, punktarrays, koordinataliaser og friform-metadata afvises før både Supabase- og D1-skrivning. Historiske schema-1-snapshots må kun føres videre gennem en deterministisk dataminimeret projektion, aldrig ved at lempe servergaten.
9. `calibration_eligible` og den interne snapshotkonsistens er ikke serverbevis mod et signeret offentligt manifest. Feltet må kun fungere som en konservativ udelukkelseslås, ikke som empirisk evidens eller tilladelse til global koefficientlæring. En senere læringsvej kræver særskilt server-side manifestbinding og beslutning.

## Beviser og statusgrænse

Den lokale kildekandidat omfatter policy, rekonstruktionsværktøj, state/proveniens, checkpoint, fallback, public audit, workflow, tur-/observationsbinding, databasekontrakt og negative no-mutation-tests. Dette er endnu ikke leveringsbevis.

Status må først ændres til produktionsverificeret, når målrettede tests og fuld sourcegate er grønne på kandidatens eksakte head, PR'en er merged, `inspect` og `apply` har bestået med den eksakte descriptor, frisk produktion har bestået alle fulde gates, offentlig desktop/mobil og 210/673 er verificeret, og rollback/cleanup-artifacts er bevaret privat. Ved enhver afvigelse forbliver den eksisterende målte nødvisning den sikre offentlige vej.

## Forholdet til næste model

DEC-0109 ændrer ikke Candidate G's 20/50/30, +10/-8, 13-timersregel, 4/48-timers mobilisering eller den faglige analyse under DEC-0102. Den kommende samlede model må ikke arve interpolation som normal missingregel. Den skal derimod bevare DEC-0109's tillids-, provenance-, trip-, checkpoint-, cleanup- og fail-closed-kontrakter gennem sin egen state-migration og rollback.

Den kommende model skal desuden selv have en Candidate G-lignende nøddrift: kun en senest komplet, atomisk og hash-/model-/statebundet 210/673-pakke må vises, når primary er ufuldstændig; rekonstrueret, tampered eller ukendt modelstate må aldrig stages. Visningen skal have en tydelig DA/DE/EN-aktualitetsadvarsel, udløbe konservativt, binde ture til det faktisk viste nøddatasæt som ikke-kalibreringsegnede og automatisk vende tilbage til frisk primary. Når nødgrundlaget udløber, skal modellen lukke fail-closed. Nøddrift må aldrig interpolere eller backfille. Modelsporets foreløbige beslutning om den integrerede model flyttes atomisk til **DEC-0110**, fordi DEC-0108 og DEC-0109 nu er optaget på `main`.
