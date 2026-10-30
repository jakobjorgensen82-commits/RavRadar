# DEC-0297 – Samme runtime-audit med mindre kopiering og faste fejlkvitteringer

**Dato:** 2026-10-30
**Status:** AKTIV afgrænset lokal kandidat; samlet kvalifikation, sikker levering og produktionseffekt er åbne.

## Begrundelse og årsagsgrænse

En observeret normal kørsel nåede gennem central beregning, offentlig generering og no-loss, men stoppede før privat checkpoint og offentligt deploy, fordi den krævede runtime-auditrapport manglede. Den hidtidige generiske fejlhåndtering beskrev ikke, hvilken fase eller fejlklasse der stoppede rapportskrivningen. En efterfølgende fejl ved læsning af den manglende fil er ikke bevis for auditprocessens oprindelige fejl.

Den præcise udløser er fortsat ubevist. Samme kilde havde også en faktisk vellykket almindelig forgænger. Leverandørfallback, ugyldige input, I/O, importfejl, strenggrænse og hukommelsesloft må ikke vælges som forklaring alene ud fra efterfølgende stop eller en lokal ressourceforbedring. Afviste rålogs må ikke genhentes ad andre kanaler eller med usikre flag.

## Mindste afgrænsede ændring

Auditten skal fortsat kontrollere samme model, proveniens, private/offentlige tilstand og præcise data. Den monolitiske sammenkædning og omdannelse til små bogstaver bruges alene til tre faste private bevismarkører. Kandidaten gennemgår denne tekst i 64 KiB-bidder med tilstrækkeligt overlap hen over både bidder og filer. Ikke-strengbaserede hjælpekalderes gamle join-konvertering bevares. Ingen kontrol fjernes, og ingen afvist model eller oplysning bliver gyldig ved ændringen.

Hele det normale auditprogram er lokalt kørt på den eksisterende store syntetiske fixture før og efter ændringen. Rapportbytes og afslutningskode var identiske, og maksimal proceshukommelse faldt cirka 111 MiB eller 7,7 procent i denne ene sammenligning. En kendt gyldig lille audit og præcise brudte/grænsetilfælde bevarede hele deres rapporter. Den store fixture er ikke produktionsdata eller en bestået national produktionsaudit; lokal Windows-måling er ikke kapacitetsbevis for Linux-runneren og ikke bevis for nattens rodårsag.

## Faste observationer før en manglende rapport

Den samlede kandidat omfatter små .failure- og .execution-sidefiler. Tilladte oplysninger er faste faser, afgrænsede fejlklasser, faktisk afslutningsstatus, filstørrelser og faktisk heapgrænse eller normal heapkonfiguration. Ingen rå fejltekst, stakspor, spørgsmål/svar, filindhold, native strømværdier, koordinater, private provenienspayloads eller nøgler må kopieres til de nye observationer.

Programmets .failure-sidefil kan kun beskrive en håndteret exception før den krævede rapport. Den omgivende normale proces skal registrere sit faste udfald og bevare eller uploade eventuelle sidefiler separat. Et fatalt processtop, en mistet runner eller en importfejl kan ligge før programmets egen catch; fravær af observation er ukendt. Ukendt skriveudfald må ikke føre til blind genkørsel.

Den oprindelige almindelige processtatus skal bevares og gøres tydelig. En fejl før rapportskrivning må ikke beskrives alene som en færdig audit med modelfund. Sidefiler er aldrig erstatning for den krævede auditrapport, et READY-bevis eller en anden acceptgate. Der må ikke fremstilles en kunstig tom auditrapport eller anvendes en fejlkvittering som normal rollbackstatus.

Der hæves ingen heapgrænse i denne kandidat. Den normale gatestruktur, no-loss, original-B før beregningscheckpoint-S, friskhed, CAS og faktisk offentlig efterkontrol bevares. Fuld kildekvalifikation skal ske på den præcise samlede head; en lokal måling eller en omgivende grøn status er ikke tilstrækkelig.

## Bevarelse og levering

- Kilden forbliver 4.0.591 med uændrede C/I/T, SQL-migrationer, gemte originaler og offentliggjort historik. Ingen ny bindings- eller versionsudstedelse.
- DEC-0295s gennemgåede reservekapacitet bevares: 600 sekunders normalramme, højst 800 faktiske HTTP-forsøg inklusive genforsøg, mindst 150 ms mellem starter, to samtidige transporter og samme sikre deadline-/gemmeregler. Kort- og cachevej bevares.
- DMI → Copernicus → Open-Meteo, gyldige nyere input, administratorpunkter, geometri, kildekrav og scoreformel ændres ikke. Ingen nye leverandørkald eller nye tjenester følger af observationen.
- Ingen produktionsændring under en aktiv skrivende vejrhentning. ROOT koordinerer det sikre leveringsvindue og genbrug af et faktisk gyldigt checkpoint, når det findes; leverandørfremdrift er ikke et færdigt beregningscheckpoint.
- Faktisk efterfølgende normal drift gennem audit, privat gemning, offentligt deploy og fuld forventet dækningsmåling skal stadig dokumenteres. Fejlårsagen og selvstændig drift må først kaldes bevist, når den relevante nye evidens foreligger.

Håndbog 89.283 tilføjes fra kanonisk Markdown og spejles til web og normal INSTALL-håndbogspayload. Alle 532 eksisterende afsnit bevares. Andre fremtidige assistent-, delings- og revisionskandidater kopieres ikke ind i denne kritiske kilde. Detaljerede kørselsidentiteter og målinger ligger i det private checkpoint.
