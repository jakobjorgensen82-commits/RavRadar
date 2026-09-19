# Automatisk driftsstatus uden gentagne alarmer

Status: lokal afgrænset implementering, 2026-09-19; ikke produktionsbevis. Ingen ændring af score, vejrinput, geometri, deploykrav eller eksisterende dispatchpolitik.

Den eksisterende vagthund reagerer på dokumenteret stilhed. Den må fortsat ikke starte en ny kørsel, når produktionen allerede er aktiv eller nyligt forsøgt. Men nye fejlede kørsler beviser ikke, at hjemmesidens prognoser bliver fornyet.

`check-production-watchdog.mjs` danner derfor også en payloadfri tidsrapport. Den foretrækker det offentlige manifests `productionReferenceAt`; `generatedAt` er kun eksplicit mærket fallback for gamle manifestformater. En ny fil med gammel vejrreference bliver ikke kaldt frisk. En ugyldig/fremtidig vejrreference er uafklaret, ikke et sundhedsbevis.

Forsinkelse måles mod den allerede valgte stilhedsgrænse: 45 minutter i den normale vagthund, 15 minutter i den eksisterende eksplicitte eksterne overvågningsvej. Mindst to fejlede planlagte kørsler, som er nyere end vejrreferencen og ligger inden for samme interval, giver den særskilte status `PUBLIC_WEATHER_STALE_AFTER_REPEATED_FAILURES`. Kun normale `schedule`-kørsler med `failure`, `timed_out` eller `startup_failure` tæller. Manuelle geometri-/modeloperationer, annullerede kørsler og andre branches tæller ikke. En aktiv genkørsel skjuler ikke status, men teksten beder først om at lade den afslutte.

## Eksisterende notifikationslivscyklus og afgrænsning

Stationsnotifikationer deduplikeres på statusskift i produktionsdokumentet (`water-station-routing-alerts.mjs`). Vejrhealth har et begrænset `alertHistory` i `update-weather.mjs`. Begge tilstande afhænger af vejrproduktionen og findes ikke som fælles skrivbar notifikationstilstand i den payloadfri vagthund. At kopiere dem hertil ville kræve nye private læse-/skrivebeføjelser og en særskilt livscyklus.

Derfor sendes ingen mail, issue, workflow-warning eller ny alarm. `notificationSent` er altid falsk. Hver observation viser kun én dansk GitHub-joboversigt og gemmer en lille JSON-rapport i runnerens midlertidige mappe; den udløser ikke ekstra dispatch eller rødt workflow. Tidspunkt vises i dansk tid. Teksten siger tydeligt, om en igangværende kørsel skal afventes, eller hvilken eksisterende produktionsoversigt man skal læse. Ingen kørselstitler, rå payloads, credentials eller vejrkomponenter kopieres ind.

Dette er altså en brugbar driftsrapport, ikke en færdig deduplikeret fjernalarm. Hvis der senere kræves en alarm uden at åbne GitHub, er næste afgrænsede opgave en holdbar payloadfri hændelsesidentitet med åbnet/ændret/løst-tilstand i en allerede godkendt kanal. Den skal kunne fungere, selv når selve vejrproduktionen er stoppet; en forgængelig Actions-cache er ikke sikkert deduplikeringsbevis. Ingen ny ekstern service eller AI-afhængighed er indført.

## Målrettet kontrol

`node scripts/test-production-watchdog-4.0.289.mjs` kontrollerer eksisterende bounded dispatch, stale efter gentagne fejl, aktiv genkørsel, frisk vejrreference, gammel vejrreference i ny fil, gamle/manuelle/annullerede/non-main-kørsler, ugyldigt tidspunkt og payloadfri dansk tekst. Workflowet får kun rapportflag på første observation, ikke på genkontrollen før dispatch. Det er ikke føjet til en ny eller større driftsgate.
