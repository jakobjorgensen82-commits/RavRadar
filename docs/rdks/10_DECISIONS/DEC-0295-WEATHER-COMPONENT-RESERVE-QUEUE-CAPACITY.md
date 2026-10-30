# DEC-0295 – Afgrænset kapacitet og retfærdig kø i komponentreserven

**Dato:** 2026-10-29
**Status:** Godkendt afgrænset lokal leveringskandidat; præcis kildekvalifikation, sikker levering og faktisk produktionseffekt er åbne.

## Problem og bevisgrænse

Det normale forløb har et påvist kapacitets- og køproblem: nødvendige vindopgaver kan stå ufærdige, mens den afgrænsede komponentreserve løber ud. Offentlige sammenligninger over de samme timer skal skelnes fra de nye timer, som kommer til sidst i en rullende prognose. Et sammenhængende stop i den valgte lokale vejrvisning er ikke i sig selv bevis for, at originale data er slettet.

Den offentlige times kildelabel skal følges gennem dens normale timekonstruktør, før den bruges som tidsbestemt evidens. En tidligere gyldig marine-vindlabel beviser ikke en senere models horisont. Samlede firefamilietællere er heller ikke hele landets femfamiliedækning. Aktuelle kørselsidentiteter, konkrete observationstal og diagnostikpayloads bevares alene i det private checkpoint.

## Beslutning

Bevar den eksisterende kildeprioritet DMI → Copernicus → Open-Meteo. Ret kun den normale komponentreserves kapacitet og opgaverækkefølge:

- Almindelig vej: 600.000 ms. Kort vej: uændret 60.000 ms. Cachevej: nul nye leverandørkald.
- Fortsat højst to samtidige transporter. De deles om en global startafstand på mindst 150 ms og højst 800 faktiske HTTP-forsøg, inklusive genforsøg. Loft og startgate gælder hele denne reserve, ikke hver komponent, kystdel eller slot.
- Alle opgaver om vind- og bølge-GAP kommer før temperatur-GAP. PART-rækkefølgen roteres retfærdigt inden for hver gruppe. Fremdriftsmærket følger den sidste faktisk startede førstegangs-HTTP pr. komponentopgave; også et fejlet startet kald tæller. En opgave udskudt før sin første HTTP-start må ikke flytte mærket.
- Én monoton deadline begynder før banklæsning, validering og første checkpoint. Pacing og retry må ikke forlænge eller genoprette den. Ingen HTTP-start efter deadline eller forsøgsloft. Allerede startede transporter skal stadig afsluttes eller annulleres sikkert, og gyldige søskenderesultater skal gemmes. Hele returforløbet loves derfor ikke afsluttet efter præcis 600 sekunder.
- Bevar bankformat, parser, autoriseret kildevalg, eksakte punkter, eksisterende originaler, historik, no-loss og de normale transport-/stop-/gemmegrænser. DMI-tidsbudgetterne ændres ikke. Ingen scoreformel, geometri, modeludstedelse eller ny migration.

## Kvoter og afgrænsning

800 forsøg gange seks almindelige kørsler giver et loft på 4.800 faktiske HTTP-forsøg pr. døgn for denne komponentreserve alene. Det er ikke hele RavRadars Open-Meteo-forbrug eller et målt kontotal. Andre strømme, genoptagelser eller andre forbrugere indgår ikke i regnestykket og skal vurderes særskilt. 150 ms mellem starter svarer til højst 400 starter pr. minut for denne kø; det er ikke en måling af alle fælles forbrugeres hastighed.

[Open-Meteos officielle vilkår](https://open-meteo.com/en/terms), kontrolleret 29. oktober 2026, angiver under 10.000 kald pr. døgn, 5.000 pr. time og 600 pr. minut for Free ved ikke-kommerciel brug. De lover ikke uafbrudt tilgængelighed. Det lokale loft fritager ikke for de øvrige vilkår eller kontrol af samlet forbrug. Ingen ny nøgle, tjeneste, konto eller betalt plan følger af beslutningen.

## Kvalifikation og levering

1. Gennemgå den konkrete samlede kandidat og normale målprøver for rækkefølge, cursor, begge slots, global startafstand, alle genforsøg, deadline fra bankstart, transportstop og bevarelse af gyldige søskende. En isoleret grøn prøve er ikke offentlig effekt.
2. Den præcise kilde skal kvalificeres før sikker levering gennem den eksisterende kontrollerede kanal. Ingen produktionsændring under en aktiv writer, ekstra udbyderdiagnose eller omgåelse af afvisninger.
3. Følg en virkelig almindelig generation gennem hentning, beregning, gemning/genbrug, B før S, upload, deploy og offentlig kontrol. Springede trin er ikke udførte handlinger.
4. Mål hele den forventede 118-timersakse for alle 210 zoner i begge søgemåder, alle fem familier og hver prognosedag. Sammenlign fælles timer og gyldige originaler; ændr ikke måledefinitionen for at få et bedre resultat. Manglende valgt score gør ikke de skjulte vejrkomponenter til dokumenterede nuller.
5. Registrér faktisk drifts-/kvotevirkning privat. Fuld dækning, Free-råderum, selvstændig fejlgenopretning og de øvrige åbne opgaver må først lukkes med deres egne relevante beviser.

## Dokumentation og isolation

Håndbog 89.281 er kanonisk i Markdown og spejles til webhåndbog og den normale statiske INSTALL-payload. Alle ældre håndbogsafsnit og SQL-migrationer bevares. Hullerne i kapitelnumrene skyldes særskilt reserverede leverancer; de er ikke invitation til at kopiere private kandidater ind.

Pages-delingen efter DEC-0294, assistentens næste efterfølger, den kompakte delingsprojektion og den inaktive SOURCE-revision er uafhængige leverancer. Denne beslutning aktiverer dem ikke. Ingen ny version/C/I/T, numerisk SQL-regel eller installation udstedes her.
