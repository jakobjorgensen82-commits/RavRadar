# RavRadar 4.0.345 – varige Copernicus-segmenter og én exact-content kildegate

Dato: 2026-09-12
Status: lokal releasekandidat; exact-head-CI, merge og produktion afventer

## Hvorfor

4.0.344 blev merged, men normalrun `34635781802` sluttede med 1.335 currentrester. Oneoff `34642214559` sluttede 78.381/79.414 med 1.033 terminalt provider-negative Open-Meteo-par. WAM/Feggesund var grøn, men der blev ikke dannet handoff eller cutover.

DMI roterede alle seks currentcollections og planlagde mod hele det autoritative 79.414-register. Den dominerende kontrollerbare flaskehals var i stedet Copernicus: 31 gentagne fulde admission/checkpoints brugte cirka 2.376 sekunder/78,2 % af den 54 minutter lange fase.

## Ændret

- Hvert afsluttet Copernicus-segment skrives straks som en atomisk, fsync'et og readback-hashet receipt bundet til eksakt donorbase, produktionstime og targetregister.
- Positive receipts bevarer fuld acquisition/record-proveniens. Et ærligt nulresultat gemmer kun det immutable attempt og opfinder ikke en native provider-tid.
- Seks receipts konsolideres gennem den uændrede strenge bank→shadow→stage-transaction. Komplet residual, naturlig afslutning og soft boundary udløser også consolidation.
- Journalen slettes kun efter fuld succes, genafspilles sikkert efter restart og quarantines ved base-, target-, struktur- eller hashmismatch.
- Normal, pilot, oneoff og post-build maintenance restore/save'r samme private journal under exact-main write-authority.
- Pull-request-workflowet validerer exact head én gang, afviser tracked ændringer skabt under valideringen og uploader derefter et privacy-sikkert artifact bundet til SHA-256 af hele tracked kildeindholdet.
- Main genbruger kun sourcebeviset ved identisk content samt live GitHub-verificeret same-repository PR, mergecommit, artifact, run/attempt/head, job og grønne trin. GitHubs tomme valgfrie `run.pull_requests` erstattes som identitetskilde af det autoritative PR-endpoint.
- Enhver proofmismatch eller API-usikkerhed falder sikkert tilbage til en fuld main-sourcegate. Fuld post-data `validate`/`release:gate` ændres ikke.

## Målt og testet lokalt

- 40.120-record, seks-segment før/efter: 115,905 sekunder → 46,438 sekunder; journal 0,127 sekunder; bank, shadow og source-stage byteidentiske.
- Positive og tomme receipts, tamper/basebinding, seks-segment-batch, soft/naturlig consolidation, restart/replay og injiceret precommitfejl.
- Samlet Copernicus source-stage/range/closure/Open-Meteo/retry-pakke og alle journalcache-workflowkontrakter.
- Source-tree-digest, PR-discovery og fail-closed content/PR/repository/head/run/job/step/artifact-scenarier.
- Første PR-head `72db0a70` afslørede i run `34659873681` en forældet statisk pre-journal-rebaseforventning. Ingen proof blev udstedt. Testen beviser nu den autoritative bankmerge af journalens validerede acquisitions/records og den efterfølgende fulde donorbuild; funktionel restart/source-stage-evidens er genkørt grøn.
- Anden head `581dfae9` bestod hele sourcegaten i run `34661632590`, men ren-tree-trinnet blokerede proof ved en Linux-tracked ændring. Alle 151 underkommandoer var enkeltvis rene på Windows. Renhedstrinnet viser nu exact short status samt diff summary/stat ved fejl og forbliver fail-closed.

## Uændret og åbent

Geometri, land-/vandpunkter, afstande, DMI-/Copernicus-/Open-Meteo-prioritet, fysik, RavScore-modelbundle, SQL og offentlige tærskler er uændrede. Current kræver fortsat 79.414/79.414; bølger kræver 79.060 native WAM plus Feggesund 354/354. Candidate G forbliver offentlig, indtil én exact-head-PR er grøn, den eksakte head er merged, main-kæden er komplet, fulde gates/handoff/cutover er gennemført og den integrerede model er verificeret offentligt.

Se DEC-0127.
