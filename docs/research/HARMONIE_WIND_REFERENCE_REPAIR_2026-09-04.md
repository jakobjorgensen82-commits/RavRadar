# HARMONIE-vind: filformat, retning og sikker fortsættelse

Status: lokal 4.0.321-rettelse på `bd47dc9f`; ikke nyt produktions- eller 210/673/118-bevis. Sol/Ekstra høj. Ingen private payloads, koordinater eller rå produktionsvektorer er læst, gemt eller vist.

## Den konkrete driftsfejl

Engangsrun `33871205875` bestod DMI-current-terminalen, men HARMONIE fejlede med `GRID_IDENTITY_READ_FAILED`; primær vind var 0/210 zoner og 0/673 dele. Den grønne current-terminal var derfor ikke bevis for komplet DMI-vind, bølger, vandstand eller hele vejrsættet. Det tidligere modsatte chatsvar er forkastet.

Copernicus fortsatte derimod fra 4.373/7.890 til 6.246/7.890 operationelle restpar og gemte sine afsluttede shards. Stoppet efter cirka 43 minutter var wrapperens soft-budget-grænse, ikke credentialfejl eller hard timeout. 1.644 restpar var åbne. Gemte DMI-, regionale og Copernicus-cacher er konkret verificeret i loggens allowlistede cachekey-linjer. Dette er fremdrift, ikke samlet closure. Normal efterfølger `33871347088` overtog automatisk.

## Faglig og teknisk årsag

DMI dokumenterer, at HARMONIE DINI bruger Lambert-projektion og grid-relative vindvektorer, som skal omregnes til geografiske retninger. HARMONIE har 60 timers native horisont; den eksisterende separate DKSS-vindhale fortsætter mod fem døgn. Kildeordenen ændres ikke. [DMI HARMONIE](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-weather-model-harmonie-for-dini-and-ig).

Lambert GRIB2-template 3.30 har dimensioner, første punkt og projektionsparametre, men ikke de fire regular-lat/lon-felter for sidste punkt og vinkeltrin. Det er formatets definition, ikke manglende vejrdata. Den gamle reader gav null for dem; den nye generelle strict reader afviste dem. [ECMWF template 3.30](https://github.com/ecmwf/eccodes/blob/develop/definitions/grib2/templates/template.3.30.def).

Reproduktion med rigtig ecCodes 2.48.0 og syntetisk GRIB bekræfter præcis disse fire fravær. Rettelsen bevarer den gamle offentlige gridhash og kræver stadig fuld `md5GridSection` internt samt alle nødvendige metadata. En manglende nødvendig nøgle eller en regular-grid-fil uden angular keys afvises fortsat.

## Samlet afgrænset rettelse

1. Begge workflowveje kalder samme `update-dmi-bulk.py`; ingen scheduler- eller cronændring er nødvendig.
2. Hvert HARMONIE-komponentpar bindes til samme faktiske GRIB-grid/frame og samme eksisterende celle. Earth-relative felter bevares. Northern Lambert omregnes ved dens metadataafledte meridiankonvergens. Ukendte projektioner, fraværende flags, uens frames/celler og ugyldige tal stopper. Ingen kystnormal, geometri eller punkt ændres.
3. Den geografiske vind beregnes én gang, før almindelig fart/FROM-retning udledes. Primær vind attesteres med vector version 2, `earth-relative-east-north` og en af to eksakte transformationer. Python og JavaScript afviser gamle uattesterede primærkilder; DKSS-vindhale beholder version 1.
4. Kun HARMONIE får `wind-reference:2` i processing-signaturen. Parser 20, grid 9, råcachefamilier, DKSS-/WAM-/Copernicus- og regional progression bevares. Historik syntetiseres ikke, og manglende historik bliver ikke adgangskrav til prognosen.
5. Den fælles forecastlæser indgår i begge modelbundles. Integrated er nu `5c523675393981cea770b8bec62e8287130206f5c4560afddbff5eb39f0582a1` (55 filer), rollback `dd3845b10dafefa70c664c3c1c8f3cb3e5576b4f24d16bc0505b048f28faa195` (56), continuation `80cb9d926a5096fe29139c2c7599692b5d97bd011de417fb4e42f4d648353926`. Model-id, fysisk scoreformel og stateversion ændres ikke. Ældre hashes er revisionsspor, ikke current binding.
6. Gamle SQL-migrations ændres ikke. Ny `20260904140000_harmonie_wind_reference_binding.sql` fører de eksisterende trip-/checkpointdefinitioner frem med alene eksakte hashes og readbackversion. En særskilt test sammenligner hele SQL-kroppen med de to gamle migrationer og tillader kun disse substitutioner. Ingen rækkeomskrivning, historie-sletning eller bredere state-admission. Alle fem migrations kontrolleres i den eksisterende dry-run/apply/readback-kæde; ingen databaseoperation er udført lokalt.

## Beviser og næste grænse

- Syntetiske tests dækker Lambert/regular-grid, nødvendige nøgler, uændret legacy gridhash, forskelligt md5, rotationsfortegn, fart, nulvind, allerede-geografisk vind, frame-/cellemismatch, sourceadmission og fuld producent→source→gentaget finalisering uden dobbelt rotation.
- Reel ecCodes-kontrol er kørt lokalt. Uafhængig PROJ-kontrol af 45 tangent-/secant-/øst-/vest-scenarier gav absolut afvigelse under 1e-8. Bibliotekerne behandler kun syntetiske prøver; ingen nye driftsafhængigheder er installeret.
- Eksisterende native-provenance, forecast-store, staging, produktionsadapter, modelbundle, workflow og installations-/readiness-måltests er grønne. Den stale fastlåste rollback-hash i release-metadata-testen er opdateret, og testen er genkørt grønt. Håndbogens aktive bindinger er tilsvarende ført frem; historiske hashes bevares som revisionsspor. Samlet ny exact-head og runtime er fortsat nødvendige.
- Efter exact-head og sikker merge bestilles én stor opfyldning på rettet main, uden kildegate i selve opfyldningen. Fortsæt fra gemte gyldige data. Bevis alle aktive komponenter, regional closure, 673 × 118 og Feggesund, og mål derefter normal vedligeholdelse. Ingen garanti for ét forsøg eller en bestemt sluttid før slutoptællingen.
- Ved negativ runtimeevidens bevares den offentlige Candidate G og gemt progression. Ingen flytning af punkter, fiktive huller, modelaktivering eller SQL-history repair bruges som genvej. En anvendt append-only migration tilbagerulles ikke ved at slette migrationshistorik.
