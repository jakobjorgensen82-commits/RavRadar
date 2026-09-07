# RavRadar 4.0.330 – vedligeholdelig vejrcache gennem hele fallbackkæden

Dato: 2026-09-07

## Formål

- Gør almindelige vejrkørsler i stand til at vedligeholde en komplet operationel currentcache uden praktisk nulstilling ved time- eller modelrunskift.
- Lad en enkelt leverandørfil eller shard fejle lokalt, så den eksakte rest kan fortsætte i samme kørsel fra DMI til Baltic, AMM15, regional DMI og Open-Meteo.
- Bevar den strenge udgivelsesgrænse: ingen prognose eller modelaktivering før præcis 673 × 118 = 79.414 operationelle par er valide og entydigt kildeklassificerede.

## Indsamling og cache

- DMI behandler reelle huller, ugyldige eller udløbne rækker og halen før sekundær vedligeholdelse af stadig gyldige rækker. Den sekundære refresh er bounded; en gyldig ældre currenttuple bliver stående, indtil en nyere tuple er fuldt valideret og kan erstatte den atomisk.
- Copernicus isolerer provider-/dataproblemer pr. shard. Afsluttede records og forsøg bevares som genbrugelig `IN_PROGRESS`, og en stale forsøgsjournal må ikke udvide den aktuelle residual. Modelrun- og targetrollover sletter ikke fysisk validerede records.
- Ved en times reference-rebase kan et kryptografisk, domæne- og tidsmæssigt validt Baltic-forudsætningsforsøg fortsat attestere et overlappende AMM15-fallbackpar inden for den eksisterende højst fire timers genbrugsgrænse. Det forhindrer falsk missing, men kun et forsøg bundet til den eksakte aktuelle reference må undertrykke et frisk Baltic-retry eller postbuild-upgrade; AMM15-rækken er derfor aldrig kildelåst.
- Den primære Copernicus-kørsel må genbruge eksisterende verificeret historik i target−48..−1, men må ikke netværkshente historikken. Rådgivende history/advisory-refresh ejes alene af et kort, bounded postbuild-job, som skriver og validerer en kandidat før atomisk promotion; fejl bevarer aktiv historik og blokerer aldrig artifact/deploy. Reelle operationelle huller har altid førsteprioritet.
- En defekt valgfri regional shadowheader, anchor eller sample isoleres til det konkrete par som missing, så næste provider kan forsøges. Autoritativ policy, targets, registry, DMI-ledger/attestation og gapmatrix forbliver fatal control plane.
- Open-Meteo bruger schema v2 for den private progresscache med per-record `acquiredAt`. Normal og oneoff deler cachefamilie, genbaserer valideret overlap til nyt target og checkpoint'er før første request samt efter hver færdig batch.
- Open-Meteo behandler først hele den kritiske rest i fair, bredde-først batches med bounded retry. Kun når residualen er nul, bruges resterende tid på de ældste stadig gyldige records, som er mindst to timer gamle. En mislykket refresh bevarer den tidligere validerede record.
- Open-Meteo HTTP-/payloadfejl isoleres til den konkrete batch. De må ikke slette gemt fremgang eller forhindre andre batches i at blive forsøgt inden for samme deadline.

## Workflow og drift

- Normal og oneoff bruger samme provider-, cache-, proveniens- og closurekontrakt; de adskiller sig kun i ydre tidsbudget og i, at oneoff alene er accelerator og ikke deployer.
- Shared cachewrites kræver eksakt `main`-commit og kontrolleret write authority. Partial progression gemmes før terminalkontrollen; en efterfølgende fejl må ikke gøre et cachecheckpoint til releasebevis.
- Den særskilte planlagte Copernicus-pilot er fjernet for ikke at konkurrere med produktionskøen. Ekstern cron er fortsat primær dispatcher for almindelige vejrkørsler, og GitHubs native schedule er reserve.
- Det operationelle vindue er fortsat 79.414/79.414 med én kilde pr. par, nul overlap og nul missing. De foregående højst 48 timers verificerede historik er rådgivende og kan give `HISTORY_INCOMPLETE`, men må ikke blokere en komplet fremadrettet prognose eller opfindes.

## Releasegrænse

- 4.0.330 er ved dette checkpoint en lokalt valideret releasekandidat: den fokuserede kontraktmatrix samt versions-, RDKS-, håndbogs- og workflowkontroller er grønne, og den særskilte geodatadiff viser kun de autoriserede topversionsfelter. GitHub exact-head CI, merge, frisk runtime, 79.414/79.414, fulde produktionsgates, kapacitet og modelcutover er fortsat åbne.
- Candidate G forbliver offentlig. Den integrerede scoremodel må først aktiveres efter frisk komplet vejrclosure, Feggesund 354/354, hydreret spatial audit, live kapacitetsbevis, fuld post-data `validate` og `release:gate`, artifact/deploy samt den særskilte autoriserede Phase B-cutover.
- Ingen geometri, kystnormal, land-/vandpunkter, scoreformel eller offentlig modelstatus ændres af vejrcachepakken.
