# RavRadar 4.0.229

## Strømmen hentes ved det rigtige sted og lag

- DMI-strøm vælges nu i to faste trin: først den nærmeste vandkolonne med et komplet U/V-par, derefter det dybeste gyldige lag i den samme kolonne.
- Et dybt punkt længere væk kan ikke længere slå et nærmere gyldigt punkt. Op til 3 km er foretrukket, 3–5 km er reserve, og over 5 km afvises.
- Strømpil, prognose, historik og aktivt scoreinput kræver samme samplingpunkt, U/V-koordinat, tidspunkt og dybdelag.
- Kun verificeret DMI-GRIB-strøm må bruges aktivt. Direkte ForecastEDR-strøm uden dokumenteret fælles vandkolonne og dybdelag samt Open-Meteos overfladestrøm og anden fallbackstrøm lukkes ude før scoring; fallbackkilderne kan fortsat reparere deres øvrige understøttede vejrfelter.
- Gamle cachedata med tidligere strømsemantik eller et flyttet vandpunkt fjernes fail-closed og skal genopbygges fra DMI.
- Dybdelaget vælges nu pr. native forecasttid. Hvis DMI skifter mellem fx et 9-meterlag og overfladelaget, bevares begge eksakte tider, men der interpoleres aldrig på tværs af lag, vandkolonne eller modelkørsel.
- Pilepositionen følger den viste times egen verificerede celle. Lokale scoreposter bevarer samme tidsbestemte provenance.
- Centralt reviewede kystdelspunkter bygges før DMI-kørslen. Ved en adminflytning genbruges cache kun for uændrede punkter; den flyttede del bliver `missing`, indtil den er samplet igen.

## Privat syvdøgnsgrundlag til senere analyse

- Den eksisterende DKSS-download genbruges til et roterende privat udsnit ved kystens vandpunkt samt cirka 5 og 15 km søværts.
- Overflade, øverste tilgængelige lag, et mellemlag og bundlag gemmes, når de findes, og slettes efter 168 timer.
- Rå forskningsvektorer er hverken offentlig runtime eller RavScore-input. Kun en kompakt status med antal og tidsdækning udgives som diagnostik.

## Permanent faglig retning

- DEC-0040, DEC-0029, roadmap, krav, kendte issues og håndbog fastholder, at den kommende analyse skal undersøge hele kæden: ydre tilførsel, overgang mod kyst og lokal bundnær levering med dybde, persistens og tidsforsinkelse.
- Der er ikke indført nye scorevægte eller regler. Et nyt scoremodul kræver senere forskningsbevis og særskilt godkendelse.

## Validering

- Målrettede regressioner dækker rumligt-først-valg, dybeste lag i samme kolonne, femkilometergrænse, cacheinvalidering, score-/pileproveniens, syvdøgnsretention og privat/offentlig isolation.
- Lokal releasegate og alle dataneutrale valideringstrin består. Den fulde lokale `validate` stopper forventet på repositoryets historiske 209/211-snapshot.
- Første produktionskørsel #31919296190/#2846 byggede frisk semantik-v2-DMI og forskningscachen, men stoppede korrekt i auditten før Supabase/Pages. Artifactet viste, at 33 native tider kunne bruge et bundlag og én senere tid overfladelaget i samme zone; den gamle efterkontrol antog fejlagtigt ét fast lag for hele serien.
- Read-only replay af artifactet med rettelsen bevarer 11.400 verificerede hovedzone-prognosetimer. Alle viste lokale pile i de 353 aktuelt matchende kystdele stod på deres valgte times provenienspunkt; resterende dækning forblev fail-closed.
- En ny fuld central DMI-genopbygning, CI-`validate`, Supabase, Pages og direkte livekontrol er stadig obligatorisk, før 4.0.229 er produktionsverificeret.
