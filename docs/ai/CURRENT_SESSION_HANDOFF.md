# Aktuelt sessionshandoff – 2026-08-16

## Aktiv 4.0.230-kandidat – endnu ikke produktionsverificeret

- #31929171918/#2872 beviste, at Havknude havde fælles NSBS-U/V 2,804 km fra vandpunktet, selv om offentlig v2-runtime manglede strøm. Et fælles `marineSelection` lod et IDW-skalarpunkt 5,131 km væk blokere det nærmere strømpar.
- 4.0.230 vælger strøm selvstændigt for hvert native tidspunkt på tværs af alle aktive DKSS-collections: nærmeste komplette U/V-vandkolonne først, derefter dybeste gyldige lag i samme kolonne. Skalarfelter beholder separat modelvalg.
- Parser v18/semantik v3 invaliderer gammel strøm selektivt og bevarer gyldige skalarfelter. Interpolation over collection-, run-, celle-, lag- eller samplingpunktskift forbliver forbudt.
- Havknude-regressionen, de berørte målrettede DMI-/forecast-/piltests, RDKS/version og lokal releasegate består. Fuld `validate` stopper forventet ved det forældede lokale 209/211-vejrsnapshot efter bestået RDKS/geometri; commit, push og frisk central produktion mangler endnu.
- #2872 nåede cursor 240, 873 private prøver, 469 ankre og 179 dele. Af 77 offentlige mangler var 36 besøgt: én pipelinefejl ≤5 km, fire ved 5–6 km, fem ved 6–8 km, 23 over 8 km og tre uden observeret fælles U/V; 41 afventer rotation.

## Historisk 4.0.229-kandidat

- Rodårsagen til fejlplaceret strøm var globalt dybdevalg: et dybt DMI-lag ved en fjern koordinat kunne slå den nærmeste vandkolonne.
- Ny bindende rækkefølge er nærmeste gyldige fælles U/V-vandkolonne først, derefter dybeste gyldige lag i samme kolonne. 0–3 km foretrækkes, 3–5 km accepteres, og over 5 km er `missing`.
- Verificeret strøm er bundet til aktuelt centralt samplingpunkt, fælles U/V-koordinat, forecasttid, lag og afstand gennem score, provenance og kort. Den geografiske afstand genberegnes som kontrol; gamle semantik-v1-data, direkte ForecastEDR-strøm uden kolonne-/lagbevis, Open-Meteos overfladestrøm og anden fallbackstrøm lukkes ude før historik, scoring og kort.
- Laget vælges særskilt pr. native forecasttid. Interpolation er kun tilladt ved identisk lag, celle, samplingpunkt, collection og modelkørsel; ellers er mellemtimen `missing`. Pilen følger den valgte times egen celle.
- Centralt reviewede kystdelspunkter bygges før DMI. Ved et ændret register bevares kun cacheposter med uændret eget samplingpunkt; flyttede dele nulstilles selektivt.
- Privat 168-timers strømfeltsopsamling roterer 15 kystdele pr. DMI-kørsel ved 0/5/15 km og flere lag. Den er `scoreImpact=false`, `publicRuntime=false` og publicerer kun kompakt status. Det lille udsnit beskytter workflowets tidsbudget og når fortsat hele bestanden inden for syvdøgnsvinduet ved normal drift.
- DEC-0040 og den udvidede DEC-0029 kræver, at kommende analyse og et eventuelt nyt scoremodul vurderer ydre tilførsel → overgang → lokal bundnær levering, inkl. tidsforsinkelse og risiko for dobbelt-tælling.
- Commit `14ce8908bcfd219055d622ef88c2e94d6f9ad37c` er pushed til `main`. #31919296190/#2846 byggede frisk DMI og privat cache, men stoppede i fuld audit før deploy, fordi efterkæden antog ét fast lag for hele serien. Artifactreplay med rettelsen bevarer 11.400 verificerede prognosetimer og nul pil/grid-mismatch i 353 matchende lokale dele. Den opfølgende rettelse er pushed til `main`, men endnu ikke produktionsverificeret.

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

1. Kør fuld lokal 4.0.230-validering og releasegate uden at iscenesætte worktreets kendte uvedkommende diagnose-/arbejdsfiler.
2. Commit og push parser-v18/semantik-v3-rettelsen, og følg den friske centrale DMI-kørsel. Havknude skal få NSBS-strøm inden for 5 km; alle viste pile skal fortsat matche valgt times gittercelle.
3. Sammenlign ny hovedzone-/kystdelsdækning mod 187/210 og 596/673. Gaten må ikke sænkes. Fortsæt rotationen og kontrollér 168-timers pruning samt fravær af rå U/V i ejeroversigten.
4. Kræv fulde gates, Supabase, Pages og direkte livekort før 4.0.230 kaldes produktionsverificeret. Lad ejerens manuelle punktreview fortsætte sideløbende.

## Bindende arbejdsregler

- Brug GPT-5.6 Sol og **Ekstra høj** indsats til DMI, RavScore, geometri, ukendt rodårsag, systemiske regressioner og endelig kritisk validering.
- Central adminstatus er runtime-sandhed. Historiske hardcodede værdier må ikke overskrive den.
- DMI er primær kilde. Manglende data er `missing`, aldrig nul, stale gentagelse eller skjult interpolation.
- En grøn automatisk kørsel er kun releasebevis, når den fulde gatekæde faktisk har kørt.
- Gamle chats er historik, ikke ændringstilladelse.
