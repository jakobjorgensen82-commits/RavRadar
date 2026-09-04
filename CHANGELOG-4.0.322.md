# RavRadar 4.0.322

Dato: 2026-09-05

## Rettet

- Ét fastlåst HARMONIE-forecasttrin kan ikke længere bruge hele GitHubs 55-minutters DMI-trin.
- Normal vejrdrift og stor engangsopfyldning bruger samme bounded supervisor: 180 sekunder pr. aktiv HARMONIE-behandling og højst 420 sekunders finalisering.
- Allerede atomisk gemte DMI-assets bevares. Den eksisterende producent genvaliderer cachen og genbygger strict current-ledger; kun reel `DMI_READY` åbner Copernicus og resten af kæden.
- Et finalizer-timeout giver ikke længere blanke workflowoutputs.

## Uændret

DMI-first, Copernicus exact-gap, regionalpolitikken, 673 × 118-slutgaten, 48-timershistorik, scoreformel, model-id/state, migration/rollback, geometri og land-/vandpunkter er uændrede. Candidate G forbliver offentlig, indtil den samlede integrerede cutover er bevist.

## Evidensstatus

Fejlen er dokumenteret i run `33918250039`; alle tre cache-save-trin bestod. Fem nye supervisortests og de berørte oneoff-, DMI-workflow-, rækkefølge- og private-runtimekontrakter er lokale grønne. Exact-head, merge og frisk main-opfyldning afventer.
