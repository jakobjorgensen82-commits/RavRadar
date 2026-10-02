# DEC-0282 – Afgrænset Dask-valg i den eksisterende komponentworker

**Dato:** 2026-10-02. **Status:** Lokal 4.0.535-kandidat; ikke leveret.

## Behov, caller og mindste ændring

Ejeren bestiller fortsat hele vejrhentningsrevisionen og Top20 sideløbende.
535 udtager kun den allerede RED/måltestede worker-delta fra separat519,
oven på verificeret534head. Ingen hel519kopi eller aktivering af OFF-driveren.
533/PR501 og534/PR502 er exact-head-grønne, urørte og leveres først i rækkefølge.

`BoundedComponentTransport.download` bruger den eksisterende faste Python-
kommando `--subset-worker`. `main` kalder den faktiske `subset_worker`;
`subset_arguments` bevarer valideret sealed request, pinned dataset/variables,
NetCDF/geoseries eller static-arco, tider og sted. Dette er en anden caller
end533s normale pilot. Kun det faktiske `copernicusmarine.subset` omsluttes
af eksisterende `dask.config.set(scheduler="threads", pool=None)`.

Et arvet processes-/poolvalg må ikke flytte Dask-beregningen til en anden
proces. Konfigurationen genoprettes ved succes, primærfejl og DatasetUpdating
med uændret exit76. Argumenter, workers, retries, timeout, downloadbytegrænser,
request/cacheformat, pathkontrol og alle gamle admissiongates er urørte.
Ingen installation, providerkald, privat input, ny executor eller supervisor.

Dasks primærvejledning beskriver lokale tråde og scoped config:
[scheduling](https://docs.dask.org/en/stable/scheduling.html) og
[configuration](https://docs.dask.org/en/stable/configuration.html).
Dette beviser ikke trådquiescens, descendants-/killstop, writer-eksklusivitet,
fireminutters failure-worker, runner-loss eller national kapacitet.

## Genbrugte tests og bevaringsgrænser

Tre tests overføres til den eksisterende component-production-suite: real
Dask compute/PID fra sealed request, ambient pool/primærfejl og static
DatasetUpdating/genoprettelse. Tidligere BIG RED3FAIL1.643s genbruges;
ingen ny REDgentagelse. Isoleret535:23/23PASS11.693s,20gamle+3nye,0skip.
De gamle originale byte-/receipt-/spatial-/retry-/tamperprøver bevares.
Suite er allerede nåelig fra eksisterende provider-continuity/sourceplan;
ingen ny gruppe eller dubletkørsel tilføjes.

Særskilt535 docs/privacy/browserversion/code-only/sourceplan:5/5PASS
276.9706ms,0skip. RDKS535/14/413 håndbogsafsnit, model67/3a14/otte bindinger,
releaseversion, sourcegate102 og diffcheck består. Bevaringsdiff viser65
browserfiler og2 workflows kun version, geodata kun topversion, normalpilot/
CSS/anvendte migrationer urørte. SQL uden den eksakte håndbogsblok har
uændret LF-SHA256154c3443752d840124f4caed95663e8a2c5bea346302e4dc6231a13f8ff62325.
Worker/test er identiske med gennemgået519-delta: rå CRLF-hashes c7043902…/
dd526034…; LF-hashes8dfa15fe…/a8e04827… . Første lokale kontrol sammenlignede
fejlagtigt LF-normaliserede bytes med rå CRLF-hashes; begge konventioner blev
efterprøvet i begge checkouts. Ingen runtimeændring eller svækket gate.

Scoreformler, handicap, rangering, historik, Top20-grænse og pc-læseretning
bevares. Model67/3a14f458…/otte bindinger/fysisk kontrakta226e7d1…,
geometri, anvendte migrationer008/00945 og DMI→CP→OM er urørte. Geodata må
kun få topversion; browser/workflows kun mekanisk releaseversion.

## Samtaledelta: Lyngby og Nibe

Ejeren spørger kun, om strømpilen på land ved Lyngby/Lodbjerg kan hænge
sammen med hyppig top5. Han har kontrolleret adminens land-/havpunkt.
Hashbundet PUBLIC time13:00DK i rr-20261002055102-210 viser lokalpil58°
fra DMI-modelcellen; kortets flowPoints er ikke scoreinput. Pil og score
deler dog strømdata, så et input-/celleproblem kan påvirke begge. Der er
ikke påvist en kausal top5-fejl eller uafhængigt bevist marinemaske ved
cellen.48h strøm og uafklaret bølgehistorik er særskilte. Ingen pil-/score-
eller geometrijustering, privat vektor-/logaudit eller modelændring.

Nibe/DK-B05-20 har én forventet/beregnet del og30/118 unavailable timer
pr. mode ved CURRENT_DIRECT_INPUT_NOT_READY,88andre brugbare timer.
Det er ikke en helt tom zone eller bevis for upstreamårsagen. Sammenlign
begge offentlige zoner efter aktuel ordinary, uden at hente hele forecast.

## Sikker levering og resterende arbejde

Ordinary36988295501 kører på uændret532/mainccc5a7c1. Ingen mainændring,
merge, ekstraweather, kode-only eller cancel under aktiv kørsel. Cron8348098
og14:19DK består. Efter faktisk save/upload/no-loss/deploy/resultatkontrol
leveres533, derefter534, dernæst535 efter retarget/exacthead/base/content/
CI/proof/writerkontrol. DEC0148 bevarer senest gyldige data og bruger
publish_newest_saved_weather=false.535 har endnu ingen exact-head CI eller
produktionseffekt. Ready533 må ikke forsinkes af uafhængigt kandidatværk.

Fuld CP/S-før-T-driver, writer/kill/failure4min/runner/nationalkapacitet
forbliver åbne. Ingen673H0-lempelse/fakefactory/dyr nationalførstegenerering.
Separate admission11:08/privateRAWlog/donor/PROXY/SOURCEallassets-afvisninger
består. GPT-6.1Sol/Ekstra høj bevares, ingen model-/indsats-/planændring.
