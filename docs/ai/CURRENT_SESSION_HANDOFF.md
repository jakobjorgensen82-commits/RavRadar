# Aktuelt sessionshandoff – 2026-08-16

## Sikker produktionsbaseline

- 4.0.228 er seneste produktionsverificerede release.
- Commit `93b8c0216821d02bf913f7aab369406ba2365fe9` bestod i #31913779486/#2835 central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- Datasæt `rr-20260815231859-210` har 210 aktive zoner, 673 forventede og 670 verificerede/offentliggjorte kystdele mod minimum 640. Alle 670 har eksakte DMI-strøm- og vindpunkter uden U/V-mismatch; manifesthashes matcher artifact og live.
- Den lokale kystvinkel er nu en vejledende advarsel. Ejerens repræsentative helhedsvurdering kan gemmes, mens reelle punkt-/kystintegritetsfejl fortsat blokerer.

## Afsluttet 4.0.228

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
- Artifactaudit af datasæt `rr-20260815224811-210` fandt 670 ægte lokale strømpunkter, men nul ægte lokale vindpunkter, fordi `wind-tail-u/v` ikke blev transporteret. Rettelsen blev implementeret og målrettet testet.
- #2835 produktionsverificerede rettelsen med 461 unikke strøm- og 544 unikke vindpunkter. Direkte livebrowserkontrol gik fra 27+27 pile på oversigten til 45+42 efter to zoomtrin og havde nul konsolfejl.

## Aktuel ejerbeslutning og parallelle spor

- Ejeren fortsætter nu den manuelle gennemgang af land-/vandpunkter. Central adminstatus er autoritativ, og nye produktioner skal hydrere de senest godkendte punkter.
- Fem-døgnsdækning og historikanalyse er midlertidigt udsat, indtil flere naturlige data og modelkørsler er opsamlet. De er ikke annulleret.
- Automatisk historikopsamling, DMI- og releasegates fortsætter uændret i pausen. Historik må ikke bagudfyldes kunstigt.

## Næste trin

1. Lad ejerens manuelle punktreview fortsætte og behandl centralt gemte punkter som runtime-sandhed i alle nye builds.
2. Vælg næste uafhængige roadmapopgave uden at genåbne den midlertidigt udsatte fem-døgns-/historikanalyse.
3. Bevar 4.0.228's pileproveniens- og releasegates i alle senere versioner.

## Bindende arbejdsregler

- Brug GPT-5.6 Sol og **Ekstra høj** indsats til DMI, RavScore, geometri, ukendt rodårsag, systemiske regressioner og endelig kritisk validering.
- Central adminstatus er runtime-sandhed. Historiske hardcodede værdier må ikke overskrive den.
- DMI er primær kilde. Manglende data er `missing`, aldrig nul, stale gentagelse eller skjult interpolation.
- En grøn automatisk kørsel er kun releasebevis, når den fulde gatekæde faktisk har kørt.
- Gamle chats er historik, ikke ændringstilladelse.
