# DEC-0079 – Candidate G-slutkontrollen bevarer moderzonen

**Status:** Produktionsverificeret i 4.0.283.

## Problem

Produktion `32912103679` byggede en livepilot og Candidate G-state med 673/673 scoreklare kyststrækninger. Otte af dem brugte den allerede godkendte, verificerede native-tretimersreference. Den afsluttende videnskabelige kontrol rapporterede alligevel 665/673 og stoppede korrekt før deploy.

Kystdelskilden gemmer moderzonen som nøglen i objektet `zones`. De enkelte kystdelsobjekter behøver ikke gentage `zoneId`. Slutkontrollen brugte en almindelig udfladning, som fjernede denne nøgle. Derfor kunne de otte native-kadencereferencer ikke matches på både moderzone og kystdel.

## Beslutning

Alle kontroller, som behøver en flad kystdelsliste med moderzonekontekst, bruger `flattenCoastalPartsWithParentZoneId`. Funktionen kopierer den autoritative zone-nøgle ind i kontrolobjektet og tilsidesætter et eventuelt gammelt indlejret felt.

Slutkontrollen og regressionen bruger samme hjælpefunktion. Regressionen skal bevise, at en kystdel uden korrekt indlejret `zoneId` fortsat kan matches til sin verificerede native-kadencereference via den autoritative zonegruppe.

## Afgrænsning

- Kravene til eksakt verificeret strøm eller ejer-godkendt native kadence ændres ikke.
- Der opfindes ingen måling, mellemtime, historik, rå retning, pil eller mobilisering.
- Candidate G 20/50/30, scorekurver, vejr, zoner, geometri, land-/vandpunkter, admin-data og brugerdata ændres ikke.
- De beskyttede geodatafiler må kun ændre topversionsfelt fra 4.0.282 til 4.0.283.

## Kontrol

1. Målrettet regression for udfladning og native-kadencematch.
2. RDKS- og versionskontrol.
3. Exact-head kildegate i GitHub.
4. Fuld produktionskæde med frisk data og releasegate.
5. Offentlig dataminimeret kontrol af 673/673 kyststrækninger.

## Produktionsbevis

- PR #153 bestod exact-head-kildegaten `32914734446` og blev merged som `1caad399`.
- Produktion `32914887586` bestod fuld validering, releasegate, artifact og Pages-deploy.
- Offentlig runtime er 4.0.283 og komplet på 210 zoner samt 673/673 kyststrækninger.
- Candidate G 20/50/30 er eneste aktive og ønskede scoreprofil. Rollbackprofilen er tom, og legacyfallback er forbudt.
- 657 kyststrækninger har komplet transporthukommelse. 16 har 30–48 timers naturligt videreført historik uden reset og gør kun deres fem moderzoner lokalt utilgængelige. Der bygges ingen kunstig historik.
