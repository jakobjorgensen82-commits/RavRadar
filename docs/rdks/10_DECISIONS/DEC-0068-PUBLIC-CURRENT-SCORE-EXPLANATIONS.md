# DEC-0068 – Aktuelle scoreforklaringer og enkel zonevisning

- **Status:** Implementeret og produktionsverificeret i 4.0.269.
- **Dato:** 2026-08-24
- **Ejerbeslutning:** Den offentlige visning skal forklare de konkrete forhold, brugeren ser, og skjule tekniske eller statistisk umodne felter, som ikke hjælper brugeren.

## Beslutning

1. **Søgeforhold**, **Transport mod kysten** og **Rav i bevægelse** skal under *Hvorfor denne score?* forklare den valgte kystdels faktiske vind, bølger, strømretning/-styrke og relevante opbyggede forløb. En generisk sætning ud fra delscorens farve eller interval er ikke tilstrækkelig.
2. **Rav i bevægelse** betyder, at bølger – ofte skabt af vind – kan løsne allerede tilgængeligt rav og andet let materiale fra havbund, tang eller kystnære aflejringer og holde det i bevægelse. Vind giver ikke selv mobiliseringspoint direkte.
3. Et lavt aktuelt vandniveau og en stigende vandstand kan godt forekomme samtidig. Det er stigningen, ikke det lave udgangspunkt, der kan føre flydende materiale længere ind. Den tidligere sætning om, at lavt vand i sig selv hjælper materiale ind i strandzonen, må ikke vises.
4. Faste lokale reserveegenskaber skal mærkes som faste egenskaber og må ikke fremstilles som aktuelle målinger. Candidate G ændres ikke til at bruge bund, dybde, revler, tang, ålegræs eller lavvandsprofil som nye scorefaktorer.
5. Den offentlige **Fundprognose** skjules, fordi to indberettede ture ikke er et repræsentativt grundlag for en procentvis fundchance. Indberetninger, observationskontrakt og intern læringsmulighed bevares uden dobbeltlagring.
6. **Anvendte scorelofter** og den sorte tekniske **Samlet score**-JSON skjules i den offentlige visning. De bagvedliggende caps, scorefelter, tests og tekniske fejlsøgning slettes ikke.
7. Det tomme informationsfelt **Vælg et område på kortet** skjules. Kortet og selve områdevalget bevares uændret; informationspanelet vises først efter et valg eller ved en reel indlæsningsfejl.
8. Kilde- og licensafsnittet skal beskrive den aktive kæde: DMI først, dokumenteret Copernicus Marine- og DMI-regionaldækning for godkendte strømhuller samt Open-Meteo/MET Norway for dokumenterede øvrige vejrdatagab. Kortkilderne er OpenStreetMap, Leaflet og de angivne satellitbilledleverandører. Den private GeoDanmark-pilot må ikke omtales som offentlig runtimekilde.

## Aktiv profil og observeret reservevisning

Candidate G med **20 % søgeforhold, 50 % transport mod kysten og 30 % rav i bevægelse** forbliver den aktive model. Ejerens skærmbillede med 25/40/35 svarer tidsmæssigt til en kort offentlig kørsel, hvor hele datasættet viste den versionsbundne reserveprofil. Den næste naturlige produktion viste igen Candidate G på alle 210 zoner og 673 kystdele.

Den globale reserve bevares som fail-closed adfærd: RavRadar må ikke blande profiler eller udgive en ufuldstændig Candidate G-beregning som komplet. 4.0.269 skal forklare aktuelle forhold korrekt i både Candidate G og reserveprofilen. En reservevisning må aldrig beskrives som den normale aktive model.

## Dataminimering og afgrænsning

- Den nye offentlige forklaringskontekst må kun indeholde allerede offentligt viste afledte værdier og tilstandsord.
- Rå U/V-vektorer, koordinater, private payloads og beskyttede cachedata må ikke følge med.
- Scoretal, Candidate G-regler, transporthukommelse, vejrkildevalg, Supabase-kontrakt, geometri og land-/vandpunkter ændres ikke.
- De to geodatafiler må i 4.0.269 kun ændre versionsfeltet.

## Verifikation før produktionslukning

- Målrettede kontrakttests for begge scoreprofiler og de fjernede offentlige felter.
- RDKS-, versions- og modulversionskontrol.
- Exact-head `validate:source` i PR.
- Frisk central hydrering, fuld validering og releasegate i produktion.
- Fuld offentlig 210/673-browserkontrol, fordi ændringen rammer scoreforklaring og offentlig visningskontrakt.

## Produktionsbevis

- PR #120 bestod exact-head `32703138969` på `37de330c` og blev merged som `d745e0ba4ad88dde91c308a9ad9810797f951c91`.
- Produktion `32703271897` gennemførte central adminhydrering, frisk DMI-strøm og vejr, deterministisk offentlig runtime, fuld projektvalidering, releasegate, artifact og Pages-deploy som grøn.
- Live datasæt `rr-20260824080543-210` viser 4.0.269, 210 zoner, 673/673 kystdele og global Candidate G med 20/50/30.
- Browserauditen kontrollerede begge søgemåder, 420 aktuelle paneler, 2.100 femdøgnsvisninger og 673 kystdelsreferencer. Den fandt nul kontrol-, konsol-, side- eller HTTP-fejl.
- Den offentlige stikprøve viste konkrete aktuelle vind-, bølge- og strømforklaringer i alle tre komponenter. Fundprognose, scorelofter, rå samlet score, det tomme kortvalgsfelt og den gamle lavvandsformulering forekom ikke.
