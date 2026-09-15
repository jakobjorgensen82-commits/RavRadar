# DEC-0151 – store private runtimefiler gendannes strømmet

**Dato:** 2026-09-15  
**Status:** Aktiv og bindende

## Beslutning

Validering af lange base64-felter må være lineær og må ikke bruge et
gentagende regulært udtryk over hele strengen. Private runtimefiler dekodes og
dekomprimeres i begrænsede bidder med løbende maksimumstørrelse og SHA-256.
Destinationen bliver først synlig ved en atomisk mappeflytning efter alle ni
filer er verificeret.

En bounded shell-retry skal indkapsle den forventede fejlkode i `if`, så
GitHub Actions' implicitte `errexit` ikke afslutter løkken efter første forsøg.
Ved endeligt stop må loggen kun vise faste fase- eller filsystemkategorier.

## Begrundelse

Run `34919375457` installerede og beviste sikkerhedsmigration 17, men viste
`UNKNOWN_ARCHIVE_EXTRACTION` efter download. En 5 MiB produktionslignende
cache reproducerede udpakningsstoppet som stackfejl i base64-regexen. Den
lineære kontrol og strømmede udpakning består efterfølgende publicering,
restore, hashkontrol, rollback, korruption og privacy i samme målrettede test.

## Ikke ændret

Ingen migration, runtimepointer, vejrdata, modelbinding, scoreformel, geometri
eller provideranskaffelse ændres. Migration 17 er allerede installeret og
genbruges.
