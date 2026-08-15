# Aktuelt sessionshandoff – 2026-08-16

## Sikker produktionsbaseline

- 4.0.227 er seneste produktionsverificerede release.
- Commit `6e920c297ef58f997ae95b3b6da16adfdf66bfe6` bestod i #31908498204/#2824 central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- Datasæt `rr-20260815210805-210` har 210 aktive zoner og 673 kyststrækninger med matchende manifesthashes.
- Den lokale kystvinkel er nu en vejledende advarsel. Ejerens repræsentative helhedsvurdering kan gemmes, mens reelle punkt-/kystintegritetsfejl fortsat blokerer.

## Aktiv 4.0.228-kandidat

- REQ-MAP-ARROWS-ZOOM-001 implementeres i den isolerede worktree `C:\Users\jakob\AppData\Local\Temp\ravradar-40228-arrows` på branch `codex/map-arrow-density-4.0.228`.
- Landsoversigten bevarer ét repræsentativt vind- og strømpunkt pr. hovedzone.
- Fra zoomniveau 9 tilføjes kun lokale kystdelspile, når deres egne DMI-U/V-komponenter har præcis samme gitterkoordinat. Vind kan være den valgte primære HARMONIE-serie eller DKSS-`wind-tail`; kildetypen bevares særskilt.
- Lokale fallbackankre, ufuldstændig provenance og kunstige kopier eller forskydninger afvises.
- Den fulde kystdelsdetaljepakke bærer alle flowpunkter og udløser automatisk opdatering af pilelaget.
- Ændringen påvirker kun kortvisning og transport af punktproveniens; DMI-værdier, kildevalg, forecast, RavScore, historik og geometri er uændrede.
- Målrettet zoomtæthedsregression og eksisterende zoom-, provenance-, null-safety-, DMI-bulk- og progressiv-runtime-tests består lokalt. RDKS-, versions-, håndbogs- og lokal releasegate er også grønne.
- Den fulde lokale `validate` gennemfører hele geometri-v2-kæden og stopper derefter forventet fail-closed på repositoryets historiske 209/211-vejrsnapshot før central adminhydrering.
- Produktcommit `bb1892e4072deb77dbc83a203587221c666013d2` er pushed til `main`.
- #31911509244/#2830 forsøg 1 stoppede korrekt ved 629/673 lokale strømpunkter efter delvis Limfjordshentning. Forsøg 2 nåede 670/673 og bestod fuld `validate` og releasegate, men stoppede før Pages på gentaget Supabase `57014` efter den tilladte retry.
- Artifactaudit af datasæt `rr-20260815224811-210` fandt 670 ægte lokale strømpunkter, men nul ægte lokale vindpunkter, fordi `wind-tail-u/v` ikke blev transporteret. Rettelsen er implementeret og målrettet testet lokalt; ny fuld produktion, artifact- og livekontrol mangler.

## Aktuel ejerbeslutning og parallelle spor

- Ejeren fortsætter nu den manuelle gennemgang af land-/vandpunkter. Central adminstatus er autoritativ, og nye produktioner skal hydrere de senest godkendte punkter.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil flere naturlige data og modelkørsler er opsamlet. De er ikke annulleret.
- Automatisk historikopsamling, DMI- og releasegates fortsætter uændret i pausen. Historik må ikke bagudfyldes kunstigt.

## Næste trin

1. Commit og push DKSS-vindproveniensrettelsen til `main`, og kræv frisk central adminhydrering, DMI, fuld `validate`, releasegate, Supabase og Pages.
2. Kontrollér supportartifactets lokale flowpunkter: mindst 640 verificerede strømdele, faktiske vindgitterpunkter fra ærligt mærkede DMI-kilder og nul accepterede U/V-mismatch.
3. Kontrollér direkte livekort ved nærzoom og opdatér produktionsbeviset i projekthukommelsen.

## Bindende arbejdsregler

- Brug GPT-5.6 Sol og **Ekstra høj** indsats til DMI, RavScore, geometri, ukendt rodårsag, systemiske regressioner og endelig kritisk validering.
- Central adminstatus er runtime-sandhed. Historiske hardcodede værdier må ikke overskrive den.
- DMI er primær kilde. Manglende data er `missing`, aldrig nul, stale gentagelse eller skjult interpolation.
- En grøn automatisk kørsel er kun releasebevis, når den fulde gatekæde faktisk har kørt.
- Gamle chats er historik, ikke ændringstilladelse.
