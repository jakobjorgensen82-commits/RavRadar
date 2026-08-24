# Offentlig scoreforklaring – visuel og systemisk gennemgang 4.0.269

## Formål

Gennemgangen tager udgangspunkt i ejerens billeder af den virkelige offentlige zonevisning den 24. august 2026. Målet er, at en almindelig bruger kan forstå den aktuelle RavScore uden at læse intern modelstruktur eller blive præsenteret for en statistisk umoden fundprocent.

## Fund

- Candidate G-forklaringerne blev hidtil dannet generisk fra delscorens interval. Derfor kunne teksten være grammatisk rigtig uden at fortælle, hvilke aktuelle vind-, bølge- eller strømforhold der gav scoren.
- Den gamle reserveprofil havde flere aktuelle værdier, men blandede dem med faste lokale egenskaber uden altid at skelne tydeligt. Den kunne desuden vise både lavt vand og stigende vand på en måde, der fejlagtigt tillagde det lave niveau en indtransportvirkning.
- **Rav sat i bevægelse** var ikke forklaret tilstrækkeligt. Den fysiske årsag er bølgevirkning, ofte skabt af vind; vinden er ikke et selvstændigt mobiliseringsbevis.
- Fundprognosen byggede i den viste situation på to ture og en udglattet rate. Det er ikke et troværdigt grundlag for at vise en præcis chance til brugeren.
- Scorelofter og rå JSON er tekniske kontroloplysninger og hjælper ikke en almindelig bruger med at vælge tid og sted.
- Det tomme informationspanel optog plads uden at give ny handling eller information.
- Skærmbilledets 25/40/35-formel var ikke den aktuelle Candidate G-normaltilstand. Tids- og runtimekontrollen viste en kort global reservevisning efterfulgt af en naturlig produktion med Candidate G 20/50/30 og fuld 210/673-dækning. Det understøtter, at hele datasættet kortvarigt valgte reserveprofilen; det beviser ikke en blanding af modeller.

## Implementeret retning

Forklaringsgeneratoren modtager en lille offentlig kontekst med faktiske afledte værdier og tilstandsord. Candidate G og reserveprofilen bruger den samme regel: aktuelle målinger forklares som aktuelle, tidligere opbygget virkning forklares som historik, og faste lokale reservefakta mærkes som faste. Ingen rå strømvektorer, koordinater eller private data tilføjes.

Den offentlige fundprognose, scorelofter og rå JSON skjules, mens beregnings- og datakontrakterne bevares internt. Dermed kan observationerne fortsat bruges til et senere, kontrolleret læringsgrundlag uden at love brugeren en sandsynlighed, som data endnu ikke kan bære.

Se DEC-0068.

## Slutresultat

PR #120/exact-head `32703138969`, merge `d745e0ba` og produktion `32703271897` er grønne. Den udgivne 4.0.269-runtime `rr-20260824080543-210` har Candidate G 20/50/30 på 210 zoner og 673 kystdele. Den fulde browseraudit bestod 420 aktuelle og 2.100 femdøgnsvisninger samt alle 673 kystdelsreferencer uden kontrol-, konsol-, side- eller HTTP-fejl.
