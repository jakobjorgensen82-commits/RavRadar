# RavRadar 4.0.12

## DKSS parserVersion 6

- Tilføjer robuste aliases for `water-temperature`.
- Aliasopslag bruger nu `.get(..., ())`, så en manglende aliasnøgle aldrig kan vælte bulkjobbet.
- Parserfejl klassificeres særskilt som `parser-exception` og bindes til parserVersion.
- En nylig, men funktionelt fejlet marine-cache blokerer ikke længere et nyt DKSS-forsøg.
- Ocean EDR bruger 60 sekunders timeout og trinvis parametersplit ved timeout/HTTP 400.
- Ocean-observationer forsøges straks, når der endnu ikke findes en registreret succes.
- DMI-specifik vandstandsmetadata fjernes fra timer, hvor vandstanden faktisk kommer fra fallback.
- Weather Engine opdateret til 2.18.0.
