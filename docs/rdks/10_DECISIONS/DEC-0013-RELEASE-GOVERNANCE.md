# DEC-0013 – Obligatorisk Release Governance

- **Status:** Aktiv og bindende
- **Besluttet:** 2026-08-01
- **Gælder fra:** 4.0.58

## Beslutning
En RavRadar-version er ikke færdig, før den samlede release-gate er bestået. En ZIP må ikke leveres som installationsklar på baggrund af kodegennemgang alene.

## Obligatoriske kontroller
1. Samme version i app, admin, service worker, data, håndbog, RDKS og changelog.
2. `npm run validate` og `npm run release:gate` skal bestå.
3. Supabase-workflow, servernøgletyper og beskyttede adminfiler auditeres.
4. GitHub Pages-artifact må ikke indeholde beskyttede admin-data.
5. Leverance-ZIP må ikke indeholde `.git`, secrets, caches eller `node_modules`.
6. CI-fejl udløser samlet downstream-audit, ikke en serie uverificerede enkeltlapninger.
7. Den leverede release skal ledsages af en maskinlæsbar release-rapport.

## Begrundelse
Forløbet omkring 4.0.56 viste, at lokal kode kunne se korrekt ud, mens SQL, RDKS, håndbogsversion, nøglekompatibilitet og CI stadig fejlede. RDKS skal forhindre gentagelse – ikke blot beskrive den bagefter.

## Tillæg 4.0.59 – genererede artefakter

Genererede datafiler må gerne bygges fra historiske snapshots, men generatoren skal bevare den aktuelle releaseidentitet. En generator må aldrig kopiere et ældre snapshots topniveau-`version` ind i den aktive produktionsfil. Release Gate skal køres efter de generatortrin, som GitHub Actions udfører før deployment.

## Tillæg 2026-08-07 – grøn runstatus er ikke nok
Ved 4.0.117-overgangen blev det konstateret, at workflowets almindelige `workflow_dispatch` kan springe `npm run validate` og `npm run release:gate` over og stadig nå Pages-deploy. Det er i strid med denne beslutnings hensigt. Releasebevis kræver derfor ikke kun grøn samlet runstatus, men at de bindende gate-trin faktisk er kørt og har status `success`. Første Codex-opgave er at bringe workflowimplementeringen i overensstemmelse med denne allerede bindende beslutning.
