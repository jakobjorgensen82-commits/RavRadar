# Changelog 4.0.421

4.0.420 bestod exact-head `35381401273`, blev merged gennem PR #365 som
main `069de220` og startede providerfri code-only `35381918986`. Den fandt
og verificerede den eksakte offentlige 79/79-kilde og den aktuelle private
runtime, men stoppede før skrivning og deploy i den uafhængige
RavScore-audit.

Auditrapporten var ikke ny: den var byte-identisk med både `public-audit.json`
og `checkpoint-runtime-audit.json` fra den allerede offentlige og fuldt
verificerede vejrkørsel `35374238410`. Den kanoniske SHA-256 er
`82d4d18de4c41977bf589ca4de72387ec3e4aaaac51dd0a90bb012cb1403d3fa`.

4.0.421 lader kun code-only fortsætte for netop DEC-0203-kilden, når den nye
audit og begge uafhængige kildeaudits alle matcher den fastlåste hash. En
ukendt, manglende eller ændret audit stopper fortsat. Alle efterfølgende
private-runtime-, privacy-, artifact-, Pages-, offentlig-verifikations- og
centrale afslutningskontroller bevares.

Der hentes ikke vejr, og caches, RavScore-formel, scorer, geometri,
providerprioritet og DMI-rotation ændres ikke. Se DEC-0204.
