# 4.0.464 – samlet rebind af public-hour-pakken

Code-only-run `35749000940` kom igennem den nye bounded JSON-writer, men
stoppede med `Private public-hour startup national forecast digest is invalid`.
Det var den næste del af samme modelhash-overgang: migreringen ændrede
`modelBundleSha256` i conditions-markøren, men ikke den hashbundne start-
prognose og den bevarede public-hour-pakke.

Rettelsen gør public-hour-overgangen eksplicit og atomisk:

- details-digest og modelbinding beregnes for den migrerede runtime;
- alle 118 pakkede timefiler får den nye delivery-binding og details-digest;
- `nationalForecast.modelBinding` opdateres uden at ændre score- eller
  vejrdata;
- manifest, raw/compressed filhashes, byteantal og conditions-markør skrives
  samlet og kontrolleres igen ved materialisering.

Hvis et trin fejler, bliver den gamle runtime urørt. Ingen providerkald,
scoreændringer, geometriændringer eller fallbackændringer indgår.

PR-gaten fandt bagefter den tilbagevendende versions-/bindingfejl: den nye
transitive modelpakke havde hash
`2c26b855fc0e93754c5f0ba586f6d2a2864c6de17880717ab6cd6c8cbc3bcad7`, mens den
historiske 20260922100000-migration stadig bandt forgængerens hash. Den gamle
migration er immutable. Det nye append-only led
`20260922170000_integrated_model_binding_successor.sql` er nu den aktuelle
bindingkilde, og schema, installer, Edge, admin, fixtures og release/readback
refererer til samme binding.
