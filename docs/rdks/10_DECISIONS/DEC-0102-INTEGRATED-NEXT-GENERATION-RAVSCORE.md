# DEC-0102 – Integreret næste generation af RavScore i separat worktree

- **Status:** Ejer-godkendt udviklingsprogram; ikke implementeret eller aktiveret offentligt
- **Dato:** 2026-08-28
- **Udgangspunkt:** Produktionsverificeret 4.0.305 på `main`
- **Offentlig påvirkning nu:** Ingen

## Baggrund

En ekstern faglig gennemgang rejste et relevant spørgsmål: vand, som bølger fører ind i surfzonen, skal også tilbage, og den lokale bundnære returtransport kan ophøre et andet sted end RavRadars nuværende modelpunkt. Spørgsmålet viser ikke i sig selv, at Candidate G er forkert, men det rammer en kendt begrænsning: den verificerede modelstrøm ved nærmeste tilladte vandkolonne er en repræsentation af lokal bundnær strøm og ikke en bølgeopløst model af de sidste meter gennem revler, render, brydningszone, undertow og ripstrømme.

Den viste bølgeskitse beskriver primært orbitalbevægelse. En halv bølgelængde er en praktisk bølgebase-tilnærmelse, ikke en hård grænse for al strøm eller partikeltransport. Nær stranden kan returvand fordeles som bred undertow, feeder-/langskyststrøm og kanaliserede ripstrømme. RavRadar har ikke den lokale batymetri eller surfzonemodel, der kan opløse disse processer direkte.

Aktuel kode har allerede flere stærke skel, som skal bevares som udgangspunkt:

- jagtbarhed er adskilt fra fysisk ravtransport;
- strøm bygger og nedbryder et 48-timers transportpotentiale fra verificeret kystnormal evidens;
- bølgeenergi bruger højde og periode i en særskilt mobiliseringstilstand;
- bølgeretning, højde og periode indgår i et afgrænset landingssignal;
- bølger kan ikke skabe et transportlager uden en dokumenteret transportvej;
- missing, provenance, lokal utilgængelighed og produktionsgates er fail-closed.

Samtidig er flere tal og koblinger ejer-/forskningspriorer, ikke naturkonstanter eller fundkalibrerede resultater. Det gælder blandt andet 20/50/30, strømgrænserne, +10/-8-forløbet, 13-timers nul-gaten, fire/48 timers mobiliseringsdynamik, den maksimale bølgelandingsandel og den nuværende matematiske afhængighed mellem transportlager og levering.

## Ejerbeslutning

1. Der bygges én ny, samlet modelgeneration fra ende til anden i en isoleret Codex-worktree. Den udvikles som en hel kandidat og udgives ikke i offentlige fragmenter.
2. Arbejdet er ikke en blind nybygning. Før ændring klassificeres hvert aktivt Candidate G-led som **BEVAR**, **FORBEDR**, **ERSTAT**, **FJERN** eller **UTILSTRÆKKELIG EVIDENS** mod aktuel kode, test, produktionserfaring og forskning. Fungerende dele genbruges eksplicit; udskiftning kræver en dokumenteret årsag og en før/efter-regression.
3. Slutresultatet skal være én sammenhængende ny modelkontrakt med fælles model-id, komponentsemantik, state, forklaringer, usikkerhed og releasegates. Interne offline-sammenligninger er tilladt som udviklingsbevis, men der oprettes ikke en ekstra offentlig shadowmodel eller endnu en samtidig produktionsscore.
4. Den nuværende Candidate G forbliver eneste offentlige model, mens arbejdet står på. Den nye model må først erstatte den efter fuld integration med seneste `main`, samlet validering, exact-head CI, særskilt modelbeslutning, produktion og offentlig kontrol.
5. Brugerfund og nul-fund er efter ejerens beslutning ikke en forudsætning for dette arbejdsforløb. Arbejdet skal bruge peer-reviewed forskning, verificeret kodeadfærd, deterministiske invariants, følsomhed/ablation, scenariomatricer og forsvarlige historiske/offentlige replays. Uden et repræsentativt fundgrundlag må resultatet ikke kaldes empirisk bevist bedre til at forudsige ravfund; det kan derimod dokumenteres som mere fysisk sammenhængende, mindre selvmodsigende og teknisk bedre valideret.
6. Modelarbejdet skal særskilt behandle hele kæden: muligt ravlager/tilførsel, mobilisering, transport frem mod kystzonen, sidste nærkystlevering/aflejring/retention, jagtbarhed og modelusikkerhed. Den må ikke foregive at opløse lokale revler, render, undertow eller ripstrømme uden tilstrækkelige input.
7. Den eksisterende 20/50/30-vægt, den hårde udtransportnul-gate og andre ejerpriorer skal analyseres, ikke tavst videreføres eller ændres. En ændret vægt eller ny væsentlig produktsemantik skal begrundes i den afsluttende modelbeslutning. Automatisk aktivering er forbudt.
8. Ingen geometri, land-/vandpunkter, kystdele, koordinater, central admin-geodata eller private payloads må læses, flyttes eller ændres i dette spor. Lokal batymetri må ikke opfindes. En ønsket geodataændring er et særskilt ejer-stop.
9. Et andet isoleret worktree må sideløbende implementere mindre, ikke-modelrelaterede rettelser på `main`. Modelsporet henter `origin/main` ved dokumenterede checkpoints og integrerer seneste grønne `main` før slutvalidering. Det mindre spor må ikke ændre Candidate G, RavScore, DMI-/strøm-/bølge-/statekæden eller modelbeslutninger uden eksplicit koordinering.
10. Modelopgaven skal arbejde autonomt frem til et reelt ejer-stop. Almindelig analyse, forskning, kode, test, dokumentation, egne PR'er og sikre merges følger den stående autoritet. Den må kun stoppe for en nødvendig ejerbeslutning, credentialhandling, privat data, geodata, destruktiv/irreversibel handling eller en konflikt, som ikke kan løses inden for den godkendte kontrakt.
11. Kandidaten skal tilpasses RavRadar og være **plug-and-play**, når den er færdig. Den skal levere gennem de eksisterende input-, 210-zone/673-kystdels-, state-, runtime-, UI-, admin-, privacy-, cache-, forklarings- og releasegrænser. Der må ikke afleveres en model, som kræver en efterfølgende særskilt ombygning af RavRadar for at kunne bruges. Nødvendige adaptere, state-migration, versionsbinding, rollback og kompatibilitet er en del af modelleverancen selv.
12. Plug-and-play-gaten er tværgående. Før design skal modelsporet oprette en komplet producent-/forbrugermatrix, og før release skal hvert berørt led være migreret og regressionsbevist. Den omfatter mindst DA/DE/EN, lokal og Edge-baseret **Spørg RavRadar**, scoreforklaringer/evidens-id'er, **Bedste områder**, bedste tidspunkt, zonedetaljer, femdøgnsvisning, konto-/tur-snapshots, observationers modelbinding, admin-/ekspertflader, begge håndbøger, public startup/detaljepayloads og hashes, central profilkonfiguration, state/cache/recovery, scheduler/workflows, audits, releasegates og offentlig browserkontrol.

## Bindende arbejdsrækkefølge

1. Revider hele startkæden, alle aktive modelbeslutninger og den faktiske 4.0.305-kode.
2. Opret en sporbar bevaringsmatrix for nuværende input, kurver, state, gates, forklaringer, UI-kontrakter og releasekæde.
3. Opdater evidensgrundlaget med primær forskning om bølgeomformning, orbitalbevægelse, undertow/returstrøm, rip-/langskyststrømme, lette partikler, aflejring/retention, vandstand og kystnær modelusikkerhed.
4. Design den nye samlede årsagsmodel før numeriske point. Undgå dobbelt-tælling mellem vind, bølger, strøm og historik.
5. Implementér kandidaten sammenhængende med versionsbundet state, migration/rollback, forklaringer, missing-/usikkerhedssemantik og deterministiske tests.
6. Opret og vedligehold en producent-/forbrugermatrix for alle steder, der producerer, gemmer, oversætter, forklarer, viser, auditerer eller bruger RavScore.
7. Bevis plug-and-play-kompatibilitet mod RavRadars eksisterende kaldesteder, produktionsgenerator, kompakte startup/detaljepakker, lokale scorer, ranglister, femdøgnsvisning, DA/DE/EN, lokal/Edge-assistent, konto/ture/observationer, admin/ekspert, håndbøger, state/cache/recovery og releasegates. Kompatibilitetsarbejdet hører til kandidaten og må ikke skubbes til en senere RavRadar-ombygning.
8. Sammenlign gammel og ny model på kanoniske, ekstreme, manglende og modstridende scenarier samt tilgængelige datasikre replays. Dokumentér både forbedringer, regressioner og områder uden afgørelse.
9. Integrér seneste `origin/main`, løs overlap eksplicit og kør den fulde tværgående score-, DMI-, privacy-, RDKS-, release- og browserkontrol.
10. Opret først derefter den samlede model-PR og følg exact-head, merge, frisk produktion og offentlig verifikation. Ingen halvfærdig kandidat må beskrives som ny offentlig model.

## Første konkrete analysepunkter

- Bevar transportpotentiale som et særskilt mål for dokumenteret tilførsel, men undersøg om sidste levering skal kunne variere uden at blive en ren multiplikation af samme lager.
- Bevar princippet om, at bølger ikke opfinder fjern tilførsel, men forbedr den nærkystnære sekvens med højde, periode, retning, hændelsesforløb og relevant vandstandskontekst, når den giver selvstændig information.
- Undersøg, om lokal modelstrøm skal beskrives tydeligere som et kystnært transportbevis og ikke som en direkte måling af undertow i surfzonen.
- Genprøv den hårde 13-timers nul-gate mod scenarier, hvor regional tilførsel, lokal udstrømning og ny mobilisering peger forskelligt.
- Gør usikkerhed eksplicit, når manglende batymetri eller surfzoneopløsning forhindrer en sikker sidste-meter-konklusion; usikkerhed må ikke skjules som et præcist tal.

## Parallelle worktrees og sammenfletning

Det mindre rettelsesspor må merge først og løbende til `main`. Modelsporet må ikke antage, at dets start-`main` forbliver aktuel. Før modelrelease skal det bevise, at seneste smårettelser og alle deres regressioner er bevaret. Ved reel fil-/kontraktkonflikt vælger modelsporet ikke tavst en side, men følger nyere RDKS og faktisk `main`-adfærd.

## Konsekvens nu

Dette dokument er alene plan-, scope- og autoritetsgrundlag. Versionen forbliver 4.0.305. Der ændres ingen kode, score, state, vejrdata, offentlig runtime, geometri, land-/vandpunkter, privat data eller produktionsartifact.
