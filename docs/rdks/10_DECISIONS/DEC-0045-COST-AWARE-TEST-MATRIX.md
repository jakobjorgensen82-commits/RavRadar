# DEC-0045 - Omkostningsbevidst testmatrix

- **Status:** IMPLEMENTERET
- **Dato:** 2026-08-21
- **Besluttet af:** Ejer og Codex

## Problem

RavRadar brugte for meget tid på at gentage den samme kildekodekontrol lokalt, i PR og igen ved hver planlagt vejropdatering. Den virkelige 4.0.245-fejl skyldtes derimod samspillet mellem en frisk DMI-cache og den valgte strømtime og blev kun fundet af den fulde produktionsdatagate.

## Beslutning

### Bindende præcisering 2026-09-04 – samme kode må ikke udsulte vejrindsamlingen

Ejeren har bedt om at fjerne gentaget kildekontrol, når den ikke giver ny evidens. Målt på uændret main tog kontrollen 36–40 minutter før en DMI-arbejdsramme på 13 minutter. Dette tillæg erstatter punkt 3 nedenfor, ikke PR-gaten eller produktionsdatagates.

- Alle events bruger samme regel: ny/ukendt kode kontrolleres før DMI; en identisk main-commit kan genbruge et faktisk grønt source-step fra produktionsworkflowet.
- En lille Actions-cache indeholder kun en locator med repository, head, run, attempt og udfald. GitHub skal live bekræfte identitet og det faktiske source-step; en grøn workflowtitel eller cachehit er ikke nok.
- Senere kildefejl og reruns undersøges særskilt i GitHubs paginerede runhistorik. En ældre grøn locator må ikke skjule en nyere fejl, heller ikke hvis fejlens cachemarkør er væk. API-fejl, manglende/ufuldstændig evidens eller overskredet afgrænset inspektionsbudget kræver ny kildekontrol.
- Udfald gemmes også ved source-failure/cancellation. Der gemmes ingen private vejrdata, credentials eller produktionspayloads i denne locator.
- Frisk central hydrering, vejr/proveniens, fuld `npm run validate` og `npm run release:gate` er fortsat obligatoriske før hvert nyt produktionsartifact/Pages. Intet nyt datahul må skjules af genbrugt kildebevis.

Implementeringsstatus: lokal måltestet 4.0.321-driftsrettelse; ny exact-head og faktisk drift skal stadig bevises. Ingen ny scheduler eller concurrencygruppe.

### Oprindelig beslutning (punkt 3 supersederet ovenfor)

1. Under udvikling køres målrettede tests for den berørte kontrakt samt nødvendige RDKS- og versionskontroller.
2. Den fulde validate:source skal bestå én gang på PR'ens eksakte head i GitHub. Lokal gentagelse kræves kun ved bred/tværgående risiko, manglende CI eller konkret fejlevidens.
3. Push og manuelle produktionsbyg kører den tidlige kildekodegate. Planlagte vejropdateringer på den allerede kontrollerede main-kode gentager den ikke.
4. Hvert nyt deploybart produktionsartifact skal fortsat bestå fuld npm run validate og npm run release:gate efter central hydrering, frisk vejr og proveniens.
5. Fuld browserkontrol af 210 zoner og 673 kystdele køres ugentligt eller ved relevante ændringer i UI, score eller offentlig datakontrakt. Andre ændringer får målrettet kontrol.
6. Kendte fejl, reel usikkerhed og modstridende evidens tilsidesætter altid den normale minimumsmatrix og udløser den ekstra kontrol, som problemet kræver.

## Sikkerhedsgrænse

Beslutningen ændrer kun placeringen og hyppigheden af dublerede kontroller. Den sænker ingen datakrav, 673/673-gate, releasegate, DMI-first-regel, scorekontrol eller mergekrav.

## Produktionsbevis

PR #37 blev merged som 3dc331ca. Exact-head-kildegaten og push-produktion 32468752244 bestod. Push-kørslen beholdt den tidlige kildekodegate og gennemførte derefter frisk data, fuld validering, releasegate, Supabase, artifact og Pages. Live viser 4.0.247 med 210 zoner og 673 kystdele.
