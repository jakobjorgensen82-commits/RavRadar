# P1 – GitHub-plan, timeskifterace og Supabase runtime-diagnostik

## Observerede fejl

1. cron-job.org startede produktionsworkflowet ved hel time samtidig med, at den nye Copernicus-time skulle indsamles. Produktionscachen indeholdt da 622 DMI + otte regionalproxyer, mens de 43 Copernicus-dele for den nye eksakte time endnu manglede. 630/673-stoppet var derfor en sikker gate, men triggerne var ordnet forkert.
2. Senere kørsler med fuld 673/673 nåede Supabase og fejlede på `runtime-diagnostics` med HTTP 500/PostgreSQL `57014`. Den indrykkede produktionsfil var cirka 24 MB. En repræsentativ lokal fil er 7.684.492 byte indrykket og 4.014.169 byte som den kompakte JSON, PostgREST modtager.

## Valgt rettelse

- GitHub Actions ejer produktionen ved minut 14/29/44/59; piloten ligger ved minut 6.
- En planlagt kørsel kræver sikker metadata-bekræftelse af aktuel UTC-time før det tunge job. Ved mangel bliver kørslen grønt udsat uden artifact eller deploy, mens det eksisterende heartbeat dispatcher piloten.
- Runtime-diagnostikken komprimeres tabsfrit under samme Supabase-nøgle. Admin-summary beholder de direkte brugte felter, og hele originalen ligger i gzip/base64 med SHA-256 og byteantal.

## Fravalg

- 673/673-gaten sænkes ikke.
- Produktionen venter ikke aktivt på en cache, som allerede er gendannet; en GitHub Actions-cache er uforanderlig under en igangværende jobkørsel. Næste 15-minutterskørsel bruger pilotens nye cache.
- Supabases statement-timeout hæves ikke, og der indføres ikke brede retries. Payloadens størrelse er den dokumenterede rodårsag, så den reduceres i stedet.
- Diagnostikfelter slettes ikke, splittes ikke til offentlige filer og gemmes ikke under en ny dokumentnøgle, som ville kræve nye rettigheds-/versionsregler.

## Lokalt bevis

- Tabsfri roundtrip, Unicode, legacy-dokument og korruptionsafvisning består.
- 4.014.169 byte kompakt original bliver 208.874 byte lagret envelope, ratio 0,052.
- Workflow-, heartbeat-, Supabase-kvote- og admin-downloadregressioner består målrettet.
- RDKS, version, geometri-v2, alle runtimeuafhængige rester af testmatrixen og lokal releasegate består. Den samlede lokale `validate` stopper fortsat korrekt på repositoryets forældede 209/211-vejrsnapshot og den manglende centralt byggede `public-condition-details.json`.
- Frisk central projektvalidering, Supabase-readback, Pages-deploy og naturlig GitHub-schedule dokumenteres særskilt før status ændres til produktionsverificeret.
