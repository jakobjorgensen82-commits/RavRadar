# RavRadar 4.0.259

## Central Candidate G-tilstand

- DEC-0057 kobler den valgte `RESEARCH-3`-kandidat til den centrale 673-deles vejrproduktion som et adskilt `diagnostic-only`-navnerum.
- Transport bruger `0,03→0,15 m/s`, +10/-8 point pr. effektiv time, nul fra 13 timers faktisk udtransport og intet passivt neutralt tab.
- Mobilisering bruger én bølgeenergitilstand med fire timers opbygning og 48 timers aftrapning.
- Den centrale fortsættelse persistérer kun model-/profilversion, konteksthash, tidspunkt, transportpotentiale, effektive udtransporttimer og mobiliseringspotentiale ved zonens fælles aktuelle referencetime.
- Same-time-rekørsel og missing holder tilstanden. Ændret model, profil, vandpunkt eller kystretning nulstiller fail-closed.

## Fallback-kompatibel landskontrol

- Den manuelle Candidate G-shadow læser nu den publicerede `public-condition-details.json` fra den samme kontrollerede DMI/Copernicus/proxy-kæde som produktet.
- Den tidligere native-only 243/673-prøve bevares som historisk forskning og bruges ikke længere som almindelig dækningsgate.
- Den nye audit kræver 210 zoner, 673 dele og 1.346 modeevalueringer, rekonstruerer 20/50/30-scoren og kontrollerer waders-loft, udtransportgate og forklaring.
- Shadowrapporten er dataminimeret og indeholder ingen del-id'er, koordinater, rå U/V eller private replaypayloads.

## Aktiv score og rollback

- Offentlig RavScore er fortsat `25/40/35`. Aktiv score, farver, zonevindere, regler og UI læser ikke Candidate G-navnerummet.
- `automaticActivationAllowed=false` og `publicScoreChanged=false` er låst i runtime og tests.
- Rollback i 4.0.259 er den uændrede aktive motor. En senere reel aktivering kræver en særskilt versionsbundet omskifter og testet tilbagekobling til `25/40/35`.
- Første produktion starter Candidate G-tilstanden på 0. Den må ikke kaldes en modnet 48-timersfordeling; naturlig state-alder og en frisk slutshadow kræves før aktiv kobling.

## Uændret

- Ingen nye rådata er hentet, og den private cache indgår ikke i committen.
- Bund, dybde, render, revler, adgang, stedegnethed og sikkerhedsadvarsler indgår ikke.
- Geometri og land-/vandpunkter er uændrede; `data/zones.geojson` og `data/kystdata.json` har kun automatisk versionsmetadata.
- Artifact og protected-dirty-data er urørte.

## Validering

- De nye tests låser opdelt/ubrudt tilstandsidentitet, same-time-hold, missing-hold, kontekstreset, dataminimering, offentlig projektion og syntetisk 210/673-shadow.
- RDKS, versionskonsistens, modelversioner, browsermodullukning og workflowkontrakter er kontrolleret for 4.0.259.
- Den samlede lokale `scripts/validate-source.ps1`, inklusive releasegaten, er grøn.
- Exact-head `32609888406` bestod på `337466b5`; PR #89 blev merged som `31e50acb`.
- Fuld produktion `32609952992` deployede 4.0.259/`rr-20260823011924-210` efter central hydrering, frisk data/proveniens, fuld validering, releasegate, Supabase og artifact.
- Frisk read-only shadow `32610281620` bestod 210 zoner, 673 dele og 1.346 modeevalueringer uden rekonstruktionsfejl. Alle 673 tilstande er dokumenteret første bootstrap, ikke modnet historik.
