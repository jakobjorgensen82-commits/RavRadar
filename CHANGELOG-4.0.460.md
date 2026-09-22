# 4.0.460 – gør predecessor-mismatch synlig uden at svække kontrollen

## Hvad der blev rettet

Code-only-run `35738220142` gennemførte sourcekontrol, migration,
database-readback, private-runtime-restore og importkontrol, men stoppede igen
i predecessor-genbindingen med en generisk identitetsfejl. 4.0.460 ændrer kun
diagnostikken: ved mismatch logges feltnavn samt forventet/faktisk
ikke-følsom værdi for de seks flade identitetsfelter. Den fail-closed
sammenligning er uændret.

## Afgrænsning

Ingen vejrleverandør, cache, score, geometri, databasepayload eller public
artifact ændres. Næste code-only-kørsel skal genbruge de allerede grønne trin
og vise den konkrete mismatch, før en endelig identitetsrettelse vælges.

Det additive bindingregister fra 4.0.459 består: et senere fund kan tilføjes
som én klassificeret post med producent, consumers og målrettet validator,
uden at sprede nye identitetskopier i runtimekoden.
