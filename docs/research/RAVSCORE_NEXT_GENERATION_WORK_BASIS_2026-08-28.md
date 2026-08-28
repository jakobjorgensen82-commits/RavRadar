# Arbejdsgrundlag – næste samlede RavScore-model

**Status:** Ejer-godkendt udviklingsgrundlag under DEC-0102

**Baseline:** Produktionsverificeret RavRadar 4.0.305

**Arbejdsform:** Én isoleret model-worktree, én samlet kandidat, ingen offentlig fragmentudgivelse

## Målet

Byg en ny hel RavScore-model, som genbruger alt det veldokumenterede fra Candidate G og forbedrer de led, hvor kode, forskning eller scenarier viser en reel mangel. Det er ikke et krav om mest mulig ny kode. Det er et krav om den bedst begrundede samlede model.

Den nye model skal være:

- fysisk sammenhængende fra mobilisering og tilførsel til levering, aflejring og jagtbarhed;
- ærlig om, hvad DMI-/Copernicus-griddata kan og ikke kan fortælle om surfzonen;
- robust over for missing, cadence, stategrænser og produktionsafbrydelser;
- forklarlig i almindeligt sprog uden at gøre forskningspriorer til naturkonstanter;
- integreret med den eksisterende 210-zone/673-kystdels-, privacy-, admin-, cache-, release- og browserkontrakt;
- mindre tilbøjelig til dobbelt-tælling af samme vind-/bølge-/strømhændelse.

Den skal desuden være **plug-and-play i RavRadar**. Det betyder, at modelarbejdet selv omfatter alle nødvendige adaptere, model-/stateversioner, migration, rollback, forklaringer og dataminimerede projektioner. Den færdige kandidat skal passe til seneste `main`; RavRadar må ikke bagefter kræve et nyt ombygningsprojekt for at passe til kandidaten.

Plug-and-play betyder også, at alle eksisterende forbrugere følger den nye kontrakt i samme leverance. Det gælder ikke kun scoremotoren, men også dansk/tysk/engelsk, **Spørg RavRadar** lokalt og gennem Edge, evidens-id'er og faste svar, ranglister og bedste tidspunkt, zonedetaljer og femdøgnsvisning, konto-/tur-/observationsbindinger, admin og ekspert, begge håndbøger, startup-/detaljepayloads og hashes, central profil, state/cache/recovery, workflows, audits og releasegates.

## Det nuværende stærke fundament

Disse dele skal behandles som bevaringskandidater, ikke som affald:

| Nuværende del | Hvorfor den er værdifuld | Krav til den nye model |
|---|---|---|
| Lokal kystretning og verificeret U/V-proveniens | Gør retning sted- og tidssporbar og forhindrer opdigtet strøm | Bevar fail-closed, afstand, celle/lag/tid og lokal retningssemantik |
| 48 timers kausal transporthukommelse | Undgår maskinstart som skjult prior og bevarer hændelsesforløb | Genbrug eller erstat kun med dokumenteret bedre bounded state |
| Adskilt mobilisering | Bølgeenergi er ikke det samme som nettotransport | Bevar procesadskillelse; undersøg bedre nærkystkobling uden dobbeltbonus |
| Højde² × periode som relativ energiproxy | Bruger mere fysik end bølgehøjde alene | Bevar som proxy eller erstat med stærkere tilgængeligt mål; kald den aldrig bundskærspænding |
| Bølgeretning mod lokal kyst | Indeholder relevant leveringsinformation | Revider hele landingsforløbet og uafhængig informationsværdi |
| Særskilt strand/waders-jagtbarhed | Søgemetode er ikke fysisk ravtilstedeværelse | Bevar adskillelsen og test kurver/lofter som egne kontrakter |
| Missing og lokal utilgængelighed | Forhindrer falsk præcision og gammel model som skjult fallback | Skal fortsat være fail-closed og forklarligt |
| Kompakt state, provenance og releasegates | Har vist værdi under virkelige driftsudfald | Bevar hele driftsdisciplinen og migrations-/rollbackbeviset |

## Det, der faktuelt kan forbedres uden brugerfund

1. **Korrekt begrebsmodel.** Skeln mellem bølgeorbitaler, regional/lokal modelstrøm og surfzonens returstrømme. Det kan verificeres mod forskning og kode, selv uden funddata.
2. **Bedre kausal opdeling.** Gør ydre/kystnær tilførsel, lokal levering/retention, mobilisering og jagtbarhed til tydelige led med veldefineret dataansvar.
3. **Mindre dobbelt-tælling.** Brug ablation og scenarier til at sikre, at vindens virkning ikke belønnes flere gange gennem bølger, strøm, historik og jagtbarhed uden selvstændig grund.
4. **Bedre bølgeforløb.** Den eksisterende højde/periode/retning kan analyseres som en tidslig sekvens frem for kun øjeblikkelig støtte. Vandstand kan vurderes som kontekst for sidste levering uden at blive automatisk bonus.
5. **Mere sandfærdig strømsemantik.** Den valgte bundnære modelcelle kan beskrive et lokalt transportled, men ikke præcis undertow mellem revle og strand. Modellen og forklaringen kan afspejle denne grænse.
6. **Bedre gates og usikkerhed.** Den hårde udtransportnul-gate og afhængigheden `delivery = transportPotential × factor` kan testes systematisk mod modstridende fysiske scenarier. Manglende surfzoneinput kan udløse markeret usikkerhed frem for skjult sikkerhed.
7. **Teknisk konsistens.** Stateversion, cadence, recovery, release og offentlige forklaringer kan valideres ende til ende for den nye kontrakt.

Det, der ikke kan bevises uden repræsentative fund/nul-fund, er at en bestemt vægt eller scoregrænse giver højere faktisk fundrate. Dokumentationen skal holde denne grænse tydelig.

## Obligatoriske leverancer i model-worktree

1. En opdateret evidensbase med primærkilder og evidensklasse.
2. En komplet kode-/bevaringsmatrix for Candidate G med **BEVAR/FORBEDR/ERSTAT/FJERN/UTILSTRÆKKELIG EVIDENS**.
3. En samlet konceptuel årsagsmodel og en præcis ny modelkontrakt.
4. Implementering med nyt versionsbundet model-/state-id og sikker migration/rollback.
5. Plug-and-play-integration med eksisterende input, 210/673-struktur, produktionsgenerator, kompakt startup/detaljer, ranglister, femdøgnsvisning, admin, assistentforklaringer, state-recovery og releasegates.
6. En komplet producent-/forbrugermatrix med før/efter-bevis for DA/DE/EN, lokal/Edge-assistent, konto/ture/observationer, admin/ekspert, håndbøger, payloads/hashes, profil, state/cache/recovery, workflows og audits.
7. Deterministiske tests for monotoni, grænser, missing, cadence, state, modstridende strøm/bølge/vandstand, strand/waders og forklaringer.
8. Ablation, følsomhed og gammel-mod-ny-sammenligning uden private payloads eller koordinater.
9. RDKS, kendte issues, roadmap, changelog og begge håndbøger synkroniseret med den faktiske slutkode.
10. Seneste `main` integreret efter det parallelle smårettelsesspor.
11. Exact-head CI og, hvis produktkode ændres som forventet, fuld frisk produktion og offentlig kontrol før lukning.

## Autonom arbejdsregel

Modelopgaven opretter et varigt mål og fortsætter selv gennem forskning, design, implementering, test, dokumentation, PR og sikker integration. Den skal ikke bede ejeren om rutinegodkendelser eller løbende statusvalg. Den stopper kun, hvis næste handling kræver ny ejerautoritet, credentials, privat data, geodata/land-/vandpunkter, en irreversibel handling eller et fagligt valg uden for DEC-0102.

Den må ikke love, at eksterne tjenester, CI eller credentials aldrig kræver opmærksomhed. Hvis et sådant reelt stop opstår, skal checkpointet være komplet nok til, at ejeren ikke behøver følge den løbende proces.
