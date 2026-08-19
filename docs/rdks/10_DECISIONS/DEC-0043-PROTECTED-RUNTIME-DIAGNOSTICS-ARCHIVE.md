# DEC-0043 – Tabsfrit komprimeret beskyttet runtime-diagnostik

- **Status:** Aktiv beslutning, lokalt implementeret i 4.0.234; produktionsbevis afventer
- **Besluttet:** 2026-08-19
- **Ejerbeslutning:** Ja

## Baggrund

`runtime-diagnostics` var vokset til cirka 24 MB som indrykket produktionsfil. Supabase/PostgreSQL annullerede flere upserts med HTTP 500/kode `57014`; i et senere run fejlede både første forsøg og den snævre tilladte genprøvning. Releasekæden stoppede korrekt før Pages, men den store JSONB-skrivning var selve den gentagne driftsrisiko.

## Beslutning

1. Den fulde oprindelige runtime-diagnostik bevares bytepræcist som kompakt JSON i et gzip/base64-arkiv under den eksisterende beskyttede dokumentnøgle `runtime-diagnostics`.
2. Kun de små felter, som adminoversigten bruger direkte (`schemaVersion`, `generatedAt`, `version` og `componentCoverage`), ligger ukomprimeret ved siden af arkivet.
3. Arkivet indeholder schema, encoding, medietype, komprimeret og ukomprimeret byteantal samt SHA-256 af den ukomprimerede JSON.
4. Administratorens download pakker først arkivet ud efter rettighedskontrol og verificerer begge størrelser, SHA-256, version og genereringstid. Fejl stopper download; den må ikke udlevere en delvis eller ukontrolleret rapport.
5. Ældre ukomprimerede `runtime-diagnostics`-dokumenter forbliver bagudkompatible.
6. Den eksisterende snævre én-gangs genprøvning for eksakt `500/57014` bevares som sidste sikkerhedsnet. Andre eller gentagne fejl stopper fortsat fail-closed.
7. Komprimeringen må ikke ændre vejrdata, offentlig runtime, score, pile, central geometri, adminhistorik eller Supabase-rettigheder.

## Målt lokalt bevis

Den repræsentative kompakte original er 4.014.169 byte og det nye Supabase-format 208.874 byte, cirka 5,2 % af originalen. Regressionen beviser fuld roundtrip, Unicode, ældre dokumenter og afvisning af korruption.

## Produktionsgate

Løsningen kaldes først produktionsverificeret, når et frisk centralt workflow har bestået fuld validering, releasegate, den komprimerede Supabase-upsert, readback, Pages-artifact og deploy. Den faktiske gemte payloadstørrelse og admin-download skal efterkontrolleres uden at logge rapportens rå indhold.
