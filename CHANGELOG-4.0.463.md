# 4.0.463 – bounded skrivning i post-cutover-migreringen

Code-only-run `35746937526` kom igennem sourcebevis, predecessor-/target-
identitet, database-readback, restore, import og unpack. Den stoppede i
`Rebind saved private runtime to current source` med `Invalid string length`.

Fejlen var samme underliggende V8-strenggrænse som 4.0.436, men i en ny
skrivevej. 4.0.462 havde allerede gjort struktur-sammenligningen iterativ;
denne kørsel viste, at `migrate-post-cutover-private-runtime.mjs` stadig
byggede hele det migrerede private conditions-dokument med
`JSON.stringify(value, null, 2)`.

Rettelsen i 4.0.463 genbruger `scripts/lib/bounded-json-writer.mjs`, som
skriver kompakt JSON i begrænsede stykker, atomisk og med en øvre størrelses-
grænse. Filens SHA-256 beregnes efter den vellykkede skrivning. Writer-
regressionen bruger den samme store form som migreringen: 673 dele og 118
timer, uden selv at fremstille en samlet forventet streng.

Ingen providerkald, cacheændringer, scoreændringer, geometriændringer,
prioritetsændringer eller fallbackændringer indgår.
