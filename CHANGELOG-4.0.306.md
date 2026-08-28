# RavRadar 4.0.306

## Driftsgenopretning

- Candidate G forbliver den eneste offentlige model. Den for tidligt mergede næste model er ført tilbage til den rene ejerbaseline, efter at to produktionskørsler stoppede sikkert før deploy.
- En præcis, hashkontrolleret checkpointadapter kan føre den afbrudte schema-3-state tilbage til Candidate G, når modelkontekst og `stateKey` matcher. Den genbruger kun signerede strømevidens og mobilisering og rekonstruerer Candidate G's egne +10/-8-/13-timerstal; ukendte kontekster ændrer intet.
- Adapteren kopierer ingen vejrdata, scores, rå U/V, koordinater, geometri, land-/vandpunkter eller private data. Se DEC-0104.

## Produktionsbevis

- PR #217 bestod exact-head `33212348031` på `91dffaa3` og blev merged som `8ebbd4e7`. Produktion `33212435923` bestod checkpointrestore, frisk DMI/Copernicus/proveniens, Candidate G-runtimeaudit, fuld validering, releasegate, Pages-artifact og deploy; Pages-deployment `6148930627` er grøn på samme commit.
- Offentlig 4.0.306 viser frisk primary `rr-20260828213450-210` og komplet 210/673. Den friske primary modnes årsagstro med `0/673 READY`, mens den tydeligt markerede, atomiske recovery `rr-20260827013448-210` består 210/673, 673 memory-ready dele, 1.346 modeevalueringer og nul rekonstruktionsafvigelser. Der er intet dækningshul.
- Desktop 1440 x 900 og mobil 390 x 844 viser farvet kort, fem aktuelle områder, fem resultater på alle fem prognosedage, fungerende zonedetalje, korrekt version/recoverybesked og nul konsolfejl; mobil har ingen vandret overflow. Broen bevarede cirka 36/48 timers sammenhængende suffix. Naturlig primary-READY forventes cirka 2026-08-29T09:00:00Z, omkring 16,5 timer før recoveryens effektive grænse 2026-08-30T01:34:48Z.

## Rettet

- **Vejrforløb** erstatter stavefejlen *vejforløb* på Om-siden.
- Grundbogen, Spørg RavRadar og den aktuelle håndbog bruger **395 nm** for ravlygten.
- Koldt vands betydning for ravets mulighed for at blive mobiliseret beskrives tydeligere og linkes til Rav Jagts video uden at ændre RavScore.
- Kyst B viser lodret kyst og en opadgående pil for strøm langs kysten.
- Mobilknappen **Spørg RavRadar** kan bryde over to linjer.

## Tilføjet

- Et responsivt, krediteret kysttværsnit bygget på Rav Jagts syv skitser med seks ordnede placeringer fra havbund til strand.
- Seks nye lokale emnefamilier i Spørg RavRadar: ravlygte, farver, behandling af fund, årstider, geologiske sekundærlagre og strand kontra vand.
- Søgning på hele eller dele af zonenavnet ved afsluttet tur og manuel indberetning, samtidig med at rullemenuen bevares.
- Signaturforklaring for blå strømretning og hvid vindretning samt en mørkere blå strømpil.
- Synlige betegnelser **BernsteinScore** på tysk og **AmberScore** på engelsk.

## Uændret

Candidate G, 20/50/30, scorekurver og -semantik, bølge-/strøm-/mobiliserings-/leveringslogik, DMI/Copernicus, modelprofil, geometri, koordinater og land-/vandpunkter er uændrede. Kun den private checkpointovergang udvides; geodatafilerne ændrer kun topversionsfeltet til 4.0.306. Se DEC-0103/0104.
