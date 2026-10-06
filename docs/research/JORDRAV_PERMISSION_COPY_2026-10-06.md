# Jordrav 4.0.546 – kortdeling og lodsejerens tilladelse

Ejerønske 6. oktober 2026: Omdøb den uklare knap til **Gem eller del
kortvisning**, og gør det tydeligt, at man altid spørger lodsejeren om lov
før adgang til deres jord. Ændringen gennemføres på dansk, tysk og engelsk.

Et fast, fremhævet felt før kortet viser opfordringen og forklarer, at
kortfarver og markgrænser ikke giver adgangstilladelse. Knappens titel
forklarer kopiering af område, zoom, baggrund og lagvalg. Selve kopieringen,
URL-formatet, den lokale fragmentbinding og clipboard-fallback er bevaret.
Ingen konto eller central gemning tilføjes. Opfordringen er praktisk vejledning;
der udledes ingen juridisk regel for andre adgangsformer.

## Afgrænsning og evidens

- Kun jordrav.html, jordrav.css og js/jordrav/context-messages.js ændrer
  produktadfærd semantisk. Andre produktændringer følger mekanisk version
  545→546. Model 0.2, alle Jordravdata og RavScore-bindinger er bevaret.
- En særskilt JSON-sammenligning beviser, at kystdata/zones kun skifter
  topversionsfelt. Alle øvrige håndbogsafsnit er identiske, bortset fra det
  eksisterende RavScore-afsnits mekaniske releaseversion. Begge håndbøger
  og installationsfilens statiske håndbogskopi følger den nye betjening.
- Seks eksisterende designforløb består ved 360/390/768/1024 px og DA/DE/EN.
  Desktop og mobil er visuelt læst. Ingen fysisk telefonprøve påstås.
- 15 gemte-visningsforløb består, herunder faktisk clipboard, genåbnet
  detailfragment, lagvalg, dybt punkt, forkert datasæt, manglende fragment,
  mobilens sprognavigation og manuel kopiering ved clipboard-afvisning.
- Første gemte-visningstest stoppede ved en forventning om den tidligere
  tyske label efter 12 beståede funktionschecks. Forventningen er rettet til
  ejerens nye tekst; alle 15 består. Produktfunktionen blev ikke ændret.
- Source-critical-gate, RDKS, security-hardening, releaseversion,
  module-version-closure, 428 håndbogskapitler og målrettede datalinktests
  består. Første sourcegate manglede Python i PATH; eksplicit bundlet runtime
  blev anvendt ved den vellykkede kontrol. Ingen gate blev sprunget over.

Lokale rapporter: copy-4.0.546-isolation.json,
copy-4.0.546-browser-audit.json og design-4.0.546-ux-browser-audit.json.
Fuld validate:source skal bestå på PR'ens eksakte head i GitHub. Leveringen
følger DEC-0148 med eksakt runtimegenbrug, privacy/artifact/backend-gates og
kontrol af faktisk offentlig commit og tekst. En aktiv normal produktions-
skriver skal være terminal før main ændres. Den igangværende normale
37462444444 er eksisterende drift, ikke startet for denne tekstrettelse.

## Faktisk offentlig levering

PR #527s head 6369732e består CI 37467552872, attempt 1. De fire faktiske
obligatoriske trin og downloadet sourceproof er uafhængigt afstemt. Efter
normal 37462444444 blev terminal success, blev PR'en merget som d9c57798
med identisk tree. Kode-only 37485854000 attempt 1 er terminal success; de
ti hårde trin og alle forventede jobudfald er live kontrolleret.

Otte offentlige Chrome-checks består. 18 release-/kortfiler matcher kilden;
390/1440 px på DA/DE/EN viser den faste tilladelse, det forklarede delelink,
faktisk clipboard og genåbnet luftfoto/marklag uden sidefejl. Screenshots er
visuelt læst. Den første verifikatoradresse havde dobbelt #, som korrekt
blev afvist som visningsstate; det var en testadressefejl. En efterfølgende
kildehentning svarede non-OK uden gemt status; en direkte læsning gav 200,
og hele den strenge kilde-/browserkontrol blev gentaget med PASS. Ingen
produktændring eller svækket assertion blev brugt til at skjule dette.
Metadataaudittens første antagelse om success i forventet skipped recovery
blev rettet til faktisk forventet udfald. Alle hårde checks består.

Kvittering: docs/research/jordrav/publication-evidence-4.0.546.json.
Den udførte offentlige verifikator arkiveres med oprindelig og normaliseret
SHA-256; kun BOM, linjeskift og tomme slutlinjer normaliseres.
