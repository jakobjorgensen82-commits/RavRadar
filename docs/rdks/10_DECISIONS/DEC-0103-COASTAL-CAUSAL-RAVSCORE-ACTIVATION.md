# DEC-0103 – Kystkausal RavScore som én integreret offentlig model

**Status:** Implementeret releasekandidat; offentlig aktivering afventer exact-head, frisk produktion og browserkontrol
**Dato:** 2026-08-28
**Erstatter som aktiv model:** Candidate G efter de gates, som DEC-0102 kræver

## Beslutning

RavRadar aktiverer ved samlet release én ny offentlig RavScore-model med id `RRS-COASTAL-CAUSAL-CHAIN-1`, kontrakt `1.0.0`, state-schema `3.0.0` og stateprofil `coastal-supply-smooth-in6.578813-out8.312951-window48-boundary0-wave-build4-decay48`. Candidate G forbliver historisk/offline sammenligningsreference og må ikke publiceres som en ekstra shadowmodel eller fallbackscore.

Modellen følger denne kausale rækkefølge:

1. Verificeret kystnær gridstrøm bygger eller dæmper et afledt **tilførselspotentiale**. Det er en dokumenteret transportvej, ikke et observeret ravlager eller en undertowmåling.
2. Bølgehøjde og periode bygger den genbrugte kausale **mobiliseringstilstand** for allerede tilgængeligt let materiale.
3. Tilførsel og mobilisering kobles med geometrisk middel, så begge nødvendige led skal være positive: `P = 100 × sqrt(S/100 × M/100)`.
4. Bølgeretning kan kun reducere den uopløste **nærkyststøtte** med højst 20 %. Bølgeenergi tælles ikke igen, og leddet hævdes ikke at være undertow, ripstrøm, beaching eller en lokal surfzonemodel.
5. **Jagtbarhed** påvirker efterfølgende højst 20 % af den fysiske mulighed: `R = round(P × F_nærkyst × (0,8 + 0,2 × H/100))`. Waders beholder sit synlige jagtbarhedsloft.
6. Missing er utilgængelighed, ikke nul. Ingen legacy-, nabo-, moderzone- eller tidsfallback må skabe en score.

## Strømtilstand og den tidligere 13-timers gate

Strømgrænserne 0,03 og 0,15 m/s bevares som versionsbundne responspriorer; forskningen begrunder ikke bedre universelle danske ravgrænser. Candidate G's lineære `+10/-8` og kategoriske nul efter 13 effektive udgående timer erstattes af en glat, bounded tilstand med 48-timers vindue og rand 0:

- indgående evidens bygger mod 100 med halveringstid 6,578813 timer;
- udgående evidens dæmper eksisterende potentiale med halveringstid 8,312951 timer;
- 13 timer er ikke længere en naturgrænse eller en separat totalscore-gate;
- værdierne matcher omtrent Candidate G's første fulde time som overgangskontinuitet, ikke fundkalibreret fysik;
- gridudstrømning må aldrig beskrives som bevis for, at strand, revler, render eller surfzone er tømt.

Den eksisterende kompakte, afledte 48-timers evidens, proveniens, gap-regler, native cadence hold, checkpoint og privacykontrakt genbruges. Migrationen kopierer hverken råt vejr, rå U/V, koordinater eller gammel score. Inkompatibel model/state afvises. En intern rollbackadapter kan oversætte den kompakte nye state til Candidate G-format, men en offentlig rollback må altid være et helt tidligere verificeret artifact og aldrig en blandet scorevej.

## Faldende vand og ekspertens præcisering

Faldende vand kan både flytte noget rav væk fra den inderste strand og koncentrere det bag en revle eller i en smallere rende. Det kan gøre et mindre område lettere at afsøge end en bred flade. Dette er en anden påstand end, at ravet er transporteret ud af hele brændingszonen.

RavRadar har hverken lokal batymetri, revle-/rendeobservation eller en bølgeopløst surfzonemodel. Derfor bruges faldende vand kun som en bounded søgefokus-/jagtbarhedsprior:

- nul effekt til og med et fald på 3 cm over tre timer;
- glat stigende effekt frem mod 15 cm over tre timer;
- højst 10 jagtbarhedspoint og i den samlede model typisk højst cirka 2 RavScore-point;
- præcis nul påvirkning af tilførsel, mobilisering og nærkyststrøm;
- ingen ekstra strømvektor, ingen påstået lokal revle/rende og ingen påstand om tab ud over surfzonen.

Dette er ejer-/ekspertbaseret, versionsbundet domæneviden, ikke empirisk fundkalibrering. Manglende vandstandsændring forbliver ukendt og giver ingen bonus.

## Genbrug og erstatning

Den fulde klassifikation står i `docs/research/RAVSCORE_NEXT_GENERATION_MODEL_AUDIT_2026-08-28.md`. Hovedresultatet er:

- **BEVAR:** DMI-first, samme U/V-celle/tid/lag, afstands- og proveniensgates, lokale kystnormaler, 48-timers kompakt evidens, 4/48-timers bølgemobilisering, ingen direkte vind-/strømdobbelt-tælling, strand/waders, missing/fail-closed, 210/673, atomiske payloads/hashes og recovery.
- **FORBEDR:** bølgeretning til bounded nærkyststøtte, forklaringer/usikkerhed, modelbinding i konto/ture/observationer og faldende vand som afgrænset jagtbarhedskontekst.
- **ERSTAT:** 20/50/30-arkitekturen, lineær +10/-8, 13-timers nul-gaten, gentaget `delivery = transportPotential × factor` og den milde efterfølgende bottleneck.
- **FJERN:** ældre eventtiming og enhver direkte mobiliseringsbonus fra vind eller strøm.
- **UTILSTRÆKKELIG EVIDENS:** nye universelle naturtærskler eller lokal surfzone-, retention- og beachingkalibrering.

## Plug-and-play og offentlig kontrakt

Kandidaten leverer selv producent-/forbrugerkompatibilitet for DMI/Copernicus, 210 zoner/673 kystdele, state/migration/rollback, minimal startup og fulde detaljer med hashes, ranglister, bedste tidspunkt, zonedetaljer, fem dage, strand/waders, DA/DE/EN, lokal og Edge-baseret Spørg RavRadar, konto/ture/observationer, admin/ekspert, begge håndbøger, central profil, scheduler, checkpoint/recovery, audits, releasegates og desktop/mobil. Startup kan fortsat være minimal; behovshentede detaljer bærer den fulde model-, state-, forklarings- og usikkerhedsproveniens.

Den centrale profil skal være schema 3 og vælge præcis det nye model-id. Produktionsgeneratoren beregner kun den valgte nye score. Gammel Candidate G-state må kun bruges én gang som eksplicit migrationskilde; gammel Candidate G-score må aldrig bruges som offentlig fallback.

## Første release og eksisterende data

Modellen skal være scoreklar i den samme release, der aktiverer den. Produktionskæden genbruger derfor allerede hentet og verificeret vejrhistorik, eksisterende DMI/Copernicus-cache samt kompatibel kompakt state. Schema-2-state migreres eksplicit til schema 3; hvis direkte migration ikke er kompatibel, må generatoren datasikkert replaye de allerede hentede verificerede prøver. Den må ikke vente flere dage på en ny historik, fremskynde state med kunstige timer eller bruge gammel Candidate G-score.

Manglende eller inkompatibel evidens er fortsat fail-closed. Den valgte model kræver ingen ny datakilde. Hvis senere forskning dokumenterer et nyt databehov, må det kun etableres som et separat score-neutralt anskaffelsesforløb efter konfliktkontrol mod seneste `main`; det må ikke ændre offentlig model, state, score, geometri eller punkter før en ny samlet beslutning.

## Evidens og påstandsgrænse

Det koordinatfrie offlinebevis omfatter 288 syntetiske scenarier, gammel-mod-ny, ablation, følsomhed, glathed ved den tidligere 13-timers grænse, wadersloft og faldende vand. Supply- og mobiliseringsablation giver begge ny score 0, rangkorrelationen med Candidate G er 0,871988, og vandstandssweepet ændrer højst slutscoren 1 point i referencecasene. Det beviser struktur og regressioner, ikke højere empirisk fundpræcision.

## Aktiverings- og rollbackgate

Aktivering kræver seneste grønne `origin/main`, målrettede regressioner, fuld `validate:source` på PR'ens eksakte head, frisk central hydrering og vejropbygning med dokumenteret genbrug af eksisterende historik/cache, faktisk 210/673-runtimeaudit, fuld `npm run validate`, `npm run release:gate`, sikker merge, frisk Pages-deploy samt offentlig desktop- og 390 px-mobilkontrol. En grøn status kan ikke overtrumfe konkret modstridende evidens.

Før disse beviser er registreret, er status kun releasekandidat. Ved fejl bevares eller gendannes det seneste hele, verificerede artifact; state, scorer, dataset-id'er eller hashes må aldrig blandes på tværs af modeller.

## Uændrede grænser

Beslutningen ændrer ingen geometri, land-/vandpunkter, koordinater, rå U/V, private payloads eller credentials. RavScore er fortsat et fysisk informeret søgemulighedsindeks, ikke en fundprocent, fundgaranti eller sikkerhedsvurdering.
