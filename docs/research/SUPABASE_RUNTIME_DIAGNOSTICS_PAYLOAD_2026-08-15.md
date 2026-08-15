# Supabase – runtime-diagnostikkens skriveprofil

**Grundlag:** 4.0.223 artifact #2785 og GitHub Actions #31891504819/#31891984360

## Målt størrelse

`ravradar-runtime-diagnostics.json` er 16.584.116 byte som indrykket artifactfil og 9.287.456 byte som den kompakte JSON, der skrives til Supabase.

De 25 rå `zoneSamples` fylder 8.690.021 byte, svarende til 93,57 % af den kompakte payload. Resten af runtime-diagnostikken – health, acquisition, datakvalitet, dækning og friskhed – fylder cirka 597.420 byte.

Ved 96 kørsler pr. dag og 30 dage svarer hele den kompakte payload til cirka 24,911 GiB JSON-skrivninger, heraf cirka 23,308 GiB fra zoneeksemplerne. Det er en skrivevolumenberegning, ikke Supabases faktiske billing-egress.

## Sammenhæng med timeout

#31891504819 bestod alle vejr-, validerings- og releasegates, men Supabase stoppede `runtime-diagnostics`-skrivningen med `57014 statement timeout`. Deploy blev korrekt ikke udført. Den umiddelbart efterfølgende #31891984360 skrev samme dokument og deployede grønt, så én hændelse beviser ikke en permanent databasefejl.

## Sikker beslutningsramme

De 25 zoneeksempler bruges ikke i adminoversigtens beregnede statusfelter; de følger med den beskyttede rå diagnostikdownload. En senere ændring kan derfor overveje at:

1. bevare den kompakte statusrapport centralt,
2. bevare rå zonebeviser i supportartifactet eller en særskilt beskyttet pakke,
3. og gøre samme rå download tilgængelig for ejeren uden én stor JSONB-upsert.

Det er ikke implementeret. At flytte eller fjerne zoneeksempler ændrer ejerens diagnostikleverance og kræver en konkret godkendelse, migrations-/rettighedsdesign, regression og produktionsmåling. En bred retry er heller ikke indført på baggrund af ét transient timeout.
