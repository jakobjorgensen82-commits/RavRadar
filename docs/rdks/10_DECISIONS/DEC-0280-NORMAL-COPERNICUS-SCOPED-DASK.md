# DEC-0280 – Afgrænset Dask-valg i den normale Copernicus-hentning

**Dato:** 2026-10-02. **Status:** Lokal 4.0.533-kandidat; ikke leveret.

## Behov og faktisk caller

Ejeren har bestilt færdiggørelse af hele vejrhentningsrevisionen samtidig
med Top20. GPT-6.1 Sol/Ekstra høj bevares; ingen automatisk model-, indsats-
eller planændring. Den allerede RED-reproducerede normalsti-delta i stor519
isoleres på verificeret mainccc5a7c1/532, ikke ved helkopi eller OFF-aktivering.

`acquire_shard_rows` bruger `download_subset` uden fixture. Dets faste
`copernicusmarine.subset`-kald for geoseries/NetCDF bruges af den eksisterende
pilot og dens almindelige opfølgning. Et arvet Dask-valg af processcheduler
eller ekstern pool kan udføre beregningen uden for pilotens direkte proces.
Den faktiske offline PID-prøve reproducerede dette før rettelsen i stor519.
Det er ikke bevis for en konkret lækage eller efterladt produktionsproces.

## Mindste ændring

Kun det eksisterende subset-kald omsluttes af
`dask.config.set(scheduler="threads", pool=None)`. Den eksisterende afhængighed
genbruges; ingen installation. Tidligere konfiguration genoprettes også ved
exception. Argumenter, produktvalg, native tid/punkter, antal workers,
DatasetUpdating-retry, soft/hard budgetter og DMI→CP→OM bevares. Den separate
componenttransport/OFF-driver får ingen ændring eller ny autoritet.

Dask beskriver threads som lokal trådpool i samme proces, modsat processes.
Konfiguration kan afgrænses med context manager. Primærkilder:
[scheduling](https://docs.dask.org/en/stable/scheduling.html) og
[configuration](https://docs.dask.org/en/stable/configuration.html).
Dette giver ikke filesystem-/netværksisolering, fuldt descendant-stop,
trådquiescens efter fejl, runner-loss-, writer-eksklusivitets- eller
fireminutters failure-worker-bevis. De resterende integritetskrav består.

## Genbrugte målprøver og sourcekobling

To eksisterende syntetiske regressioner overføres: rigtig Dask compute/PID
under ambient processes samt afvisning af ambient pool/genopretning ved fejl.
Den eksisterende faktiske checkpoint→OM-rest→resume-prøve får kun de to
allerede obligatoriske CLI-defaultfelter i sin fixture, ingen gatelempelse.
Samlet lille suite8/8PASS0.538s; den samme suite gennem den eksisterende
pilot-sourcegruppe8/8PASS0.432s. Det er overlap, ikke16unikke prøver.
Gamle selection/sharding-assertions bevares; sourceplan er stadig47grupper.
Caller/wireup6/6PASS104595.5477ms/0skip efter eksisterende Python-valg;
første4 childchecks kunne ikke starte pga. Windows Store-alias, ikke runtime-
kodefejl. Ingen installation/testlempelse. Særskilt docs/code-only3/3PASS
227.1441ms, RDKS533/14/411kapitler/version/sourcegate102 består.
65browserfiler/2workflows er bevisligt version-only; geodata kun topversion,
SQL uden for præcis håndbogspayload LFhash154c3443… uændret, anvendte
migrationer urørte. Ikke11nye testcases:8-case suite og6callerparents har
egne roller/overlap; kilde-CI er ikke kørt lokalt i fuld udgave.
Ingen ny generisk testexecutor, providerkald eller privat input/log.

Model67/Top20bundle3a14f458…/otte bindinger, fysisk kontrakta226e7d1…,
scoreformler/handicap/sortering/historik og anvendte SQLmigrationer er urørte.
Ny versionspligt/RDKS/begge håndbøger og exact-head source-CI består.

## Leveringsgrænse og aktuel drift

532 er faktisk leveret via PR500/exactCI36982260948 og kode-only36983293056
SUCCESS10:28:57DK; checkpoint54 bestod52s.008/00945 er anvendt/immutabel.
Cron8348098 er genaktiveret/uændret. De gamle autentificerede fem rækker
bevares; offentligt20/day/to modes er endnu ikke målt.

Ejeren bestilte konkret én normal vejrhentning nu.36988295501 blev startet
11:10:54DK på532/mainccc5a7c1 med quickfalse/defaulttom source og normale
budgetter efter main/writers0/exakt tre legacyqueued/jobs0. Lad den køre.
533 må ikke merges/deployes under aktiv vejrhentning. Efter actual completion
og resultatkontrol kræves fornyet main/head/CI/writerbevis og sikker DEC-0148
kode-only med bevarede aktuelle data. Ingen ekstra provider/SQL/manuel testkørsel.
Faktisk næste Copernicus-/Top20-effekt er åben, ikke udledt af lokal PID-test.

Tidligere private-log-, admission11.08-, donor- og SOURCEallassets-afvisninger
består. Stor519 fuld CP/S-før-T/writer/kill/runner/nationalkapacitet er separat
og OFF; denne kandidat afslutter ikke hele revisionen.
