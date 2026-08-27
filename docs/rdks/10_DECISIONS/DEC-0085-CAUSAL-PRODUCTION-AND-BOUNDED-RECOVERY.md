# DEC-0085 – Produktionstimen og genopretningen skal være årsagstro og tidsafgrænset

**Status:** Godkendt af ejeren og implementeret lokalt i 4.0.289; exact-head, produktion og offentlig kontrol afventer

**Dato:** 2026-08-27

**Scorepåvirkning:** Ingen
**Offentlig runtimepåvirkning:** Ja, stærkere kontinuitet og afgrænset nøddrift

## Ny rodårsagsevidens

Run `33051959643` startede 07:58 UTC. DMI-bulksteget lykkedes og gav verificeret lokal strøm til 622 af 673 kystdele. Målresolveren valgte alligevel 09 UTC, fordi den historiske 4.0.246-regel tillod timer inden for plus/minus tre timer og ved lighed foretrak en fremtidig prognosetime. Den efterfølgende målrettede Copernicus-hentning stoppede efter cirka 11,5 minutter med exit 1. Samme Copernicus-kæde lykkedes senere ved 09 UTC; der er derfor ikke evidens for et varigt DMI- eller credentialnedbrud.

4.0.288 rettede konsekvensen ved at bevare et komplet offentligt fallbackdatasæt og genstarte Candidate G ærligt efter et hul. Den rettede ikke den fremtidige timebinding, havde ikke et hårdt afgrænset providerretry og bevarede kun det konkrete 09-checkpoint gennem en engangsregel. Desuden kunne den tidligere 48-timers fallbackgrænse udløbe cirka ti timer før alle 673 dele havde genopbygget et fuldt 48-timersvindue.

## Beslutning

1. Den workflowlåste UTC-time er en kausal øvre grænse. Ved nul eksakt DMI-strømdækning må resolveren kun vælge den bedst dækkede, derefter nærmeste verificerede DMI-time på eller før grænsen og højst tre timer tilbage. En fremtidig DMI-prognosetime må aldrig blive produktionstime.
2. Den målrettede Copernicus-hentning kører i en separat proces med præcis to forsøg, seks minutters hard timeout pr. forsøg og 20 sekunders pause. Begge fejl stopper fortsat før runtime, validering og deploy; credentialværdier og rå U/V må ikke logges.
3. Umiddelbart efter hver vellykket runtimegenerering gemmes et privat, integritetskontrolleret checkpoint med præcis 673 kompakte Candidate G-states. Det må kun indeholde versions-/modelbinding, tider, afledt kystnormal styrke, transporttilstand og mobiliseringstilstand. Vejr, scoreoutput, rå vektorer, koordinater, geometri, land-/vandpunkter og private data er forbudt.
4. Næste kørsel må kun anvende checkpointet, når det er nyere end deployet state, ikke ligger efter den låste målreference, er højst 72 timer gammelt, har korrekt hash og delantal, og alle 673 model-/profil-/variant-/stateKey-bindinger matcher. Ugyldig eller delvis state stopper fail-closed.
5. Det seneste komplette, auditerede 210/673/1.346-datasæt kan bruges som tydeligt mærket nødvisning i højst 72 timer, men aldrig efter datasættets egen seneste prognosetime. 72 timer dækker Candidate G's 48 timers naturlige genopbygning plus et afgrænset driftsvindue; den er ikke tilladelse til ubegrænset gammel prognose.
6. Startup, detaljer, ranglister og femdøgnsvisning skal fortsat komme fra samme hashkontrollerede fallbackdataset. En delvis primær runtime må aldrig blandes ind.
7. En fejlet, timeoutet eller før-start-fejlet planlagt produktionskørsel må automatisk genbestilles én gang. Et separat payloadfrit watchdog må kun dispatch'e produktion efter mindst 45 minutters dokumenteret stilhed, når både workflowhistorikken og det offentlige manifest er gamle, og ingen kørsel står som aktiv. Watchdoget er et ekstra internt sikkerhedsnet; total stilhed i hele GitHubs egen scheduler kræver fortsat ekstern overvågning og må ikke fremstilles som løst af et andet schedule.
8. Alle normale produktioner deler fortsat én concurrencygruppe. Retry og watchdog må ikke starte parallelle tunge builds, svække kilde-/releasegates eller omgå den faktiske Candidate G-runtimeaudit.
9. GitHub Actions forbliver normal scheduler. Den tidligere eksterne cron genindføres ikke.
10. Candidate G 20/50/30, +10/-8-/13-timersfysikken, 48-timers evidenskravet, DMI-først, kildeafstande, score, vejrberegning, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter ændres ikke.

## Verifikation

- Målregistertesten beviser, at en 08 UTC-request med lige dækkede 06/09-prognoser vælger 06 og aldrig 09.
- Retrytesten beviser ét fejlet og ét vellykket forsøg samt procesdræbning ved timeout; budgetter over 3 forsøg, 600 sekunder eller 120 sekunders pause afvises.
- Checkpointtesten beviser hash, part-/modelbinding, tidsretning, 72-timersgrænse og nul kopieret vejr, score, rå vektorer, koordinater eller private data.
- Fallbacktestene beviser 72-timersgrænsen, udløb ved egen prognosehorisont, atomisk startup-/detaljevalg og fjernelse ved 673/673 `READY`.
- Watchdogtesten beviser ingen dispatch ved aktiv eller nylig produktion og dispatch alene ved både gammelt manifest og gammel workflowhistorik.
- Målrettede lokale kontrakter er grønne. Exact-head CI, frisk produktion og offentlig kontrol afventer.

DEC-0085 erstatter DEC-0084 punkt 3's 48-timersgrænse med den smallere kombination **højst 72 timer og aldrig efter egen prognosehorisont**. DEC-0084's atomiske fallback, ærlige suffixgenstart og produktionsbevis for 4.0.288 består som historik.
