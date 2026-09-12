# RavRadar 4.0.346 – reelle bounded DMI-multipass

Dato: 2026-09-12
Status: lokal releasekandidat; exact-head-CI, merge og produktion afventer

## Produktionsgrundlag

- 4.0.345 bestod exact-head-sourcegate `34666410182`, blev merged som `64d2f23f`, og oneoff `34667430392` genbrugte det byteidentiske PR-bevis uden en anden fuld kildegate.
- Oneoffen sluttede sikkert uden handoff/deploy: DMI 64.400/79.414, Copernicus-fasen 39m25s, regional 928 og Open-Meteo 2.284/2.468 gav 184 afsluttende provider-negative par.
- Alle 184 var forsøgt og isoleret genprøvet. Der var intet runtime-, attempt- eller købudgetstop i Open-Meteo; null-/grid-resultaterne er kilde-/runafgrænset upstream-fravær.
- DMI behandlede én roteret NSBS-leadasset, lukkede begge WAM-familier og fortsatte med 21 IDW- og 29 LF-assets, men sluttede runtimebegrænset med lokale officielle DKSS-assets ubehandlet.

## Rettet

- Oneoffens tidligere tre-pass-loop kunne ikke fortsætte en runtime-uafsluttet currentledger: producentens korrekte exit 2 blev returneret før den gemte fremgang blev klassificeret, og alle kald delte samme 3.000-sekundersramme.
- Højst tre separate 3.000-sekunders DMI-pass tillades nu. Hvert pass beholder 180 sekunders slutreserve samt 4-GiB download- og råcacheloft.
- Exit-2-fortsættelse kræver samme target, ny validerbar slutcache, kun allowlistet lokal-current/runtime-evidens, faktisk behandlede assets og sikker cache-/diskgrænse. Alle andre fejl stopper fortsat.
- En tredje strict-current-runtimepassage kræver stigende verificeret DMI-parantal; ellers stopper wrapperen `NO_VERIFIED_PAIR_GAIN`. Den særskilte, eksisterende exit-0-fortsættelse for et entydigt bevaret downloadbudgetstop er uændret.
- Oneoff-DMI-trinnet er hævet til 160 minutter og hele jobbet til 330 minutter, så de højst tre pass samt Copernicus/Open-Meteo og mindst 60 minutters øvrig closure-/gateplads kan rummes.

## Uændret

Normalproduktionen, DMI-producenten og dens per-pass-rotation er uændret. Det samme gælder 673 × 118-registeret, sourceorder, afstande, gridvalg, Copernicus-/Open-Meteo-admission, WAM/Feggesund, cache/provenance, scoreformel, modelbundles, databaseskema/migrationer, geometri og land-/vandpunkter. Installations-SQL'ens indlejrede håndbogskopi følger webhåndbogen. Current skal fortsat være 79.414/79.414 før handoff og integreret modelcutover.

## Lokal validering

- DMI-wrapper 12/12, Python compile, DMI-rotation og fuldt workflowinventar er grønne.
- Exact-content-kildeproofet, one-gate-kontrakten, private-runtime/handoff, RavScore-bindingen på otte forbrugere, det uændrede 56-filers modelbundle, cutover-readiness, RDKS, begge håndbøger, releaseversion og geodataversion er måltestet.
- Den fulde sourcegate gentages ikke lokalt; den skal køre præcis én gang på PR'ens endelige head. Produktionsdata, fuld post-data-validering, releasegate og offentlig modelverifikation afventer main.

Se DEC-0128.
