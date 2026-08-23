# DEC-0060: Candidate G aktiveres under den første pre-public opvarmning

**Status:** Aktiv produktionsbeslutning for 4.0.261

**Dato:** 2026-08-23

**Scorepåvirkning:** Candidate G bliver den gældende RavScore med `20/50/30`; `25/40/35` bevares som global rollback

## Problem

Candidate G er implementeret centralt med fast 48-timers transporthukommelse og en versionsbundet global omskifter. Efter state-skiftet har den nye hukommelse endnu ikke 48 timers sammenhængende naturlige beviser. DEC-0059 holdt derfor den gældende profil på legacy under hele opbygningen.

Ejeren har nu præciseret, at RavRadar-siden endnu ikke er offentlig, og at det er acceptabelt, at de første scoreværdier bygger på et ufuldstændigt vindue og retter sig ind, efterhånden som de dokumenterede timer kommer til. Ejeren ønsker Candidate G gjort gældende nu og accepterer udtrykkeligt denne pre-public opvarmningsperiode.

## Beslutning

1. Version 4.0.261 vælger `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` som én samlet scoreprofil for hele Danmark.
2. Candidate G bruger uændret `20/50/30`, DEC-0054's vindstyrede waders-jagtbarhed, DEC-0055's strømstyrede transport og udtransportgate, DEC-0056's bølgeenergistyrede mobilisering samt DEC-0059's faste 48-timers transportvindue.
3. Ejeren accepterer, at Candidate G er aktiv, mens `transportMemoryReady=false`. Resultatet skal fortsat mærkes ærligt som `candidate-active-pre-public-warmup`, og hvert Candidate G-felt skal bevare sin faktiske `WINDOW_INCOMPLETE`-/coverage-status. Ufuldstændig historik må ikke foregives at være et komplet 48-timersvindue.
4. Aktivering kræver stadig komplette, beregnelige Candidate G-resultater for alle aktive kystdele, alle produktionstimer og begge jagtformer. Hvis blot én nødvendig kandidatscore mangler eller har forkert model-id, vælger hele datasættet legacy. Der må ikke opstå blandede profiler mellem zoner, timer eller jagtformer.
5. Pre-public-undtagelsen må kun anvendes med det versionsbundne flag `prePublicWarmupAccepted=true`, en eksplicit ejerbeslutnings-id, en navngiven aktiveringsautoritet og `automaticActivationAllowed=false`. En vejr- eller schedulerkørsel kan fortsat aldrig selv vælge en ny model.
6. Profilvalget gemmes i det centrale admin-dokument `ravscore-profile-selection`. En nyere, ejer-godkendt repositoryversion må krydse den centrale hydrering én gang; derefter er samme eller nyere central konfiguration autoritativ, også ved rollback.
7. Produktionskørslen skal skrive konfigurationen centralt og læse den tilbage byte-stabilt. Profilen skal fortsat følge startpakke, detaljepakke og manifest.
8. Rollback er eksakt `RRS-CURRENT-B0-4.0.247` med `25/40/35`. Rollback slår kandidataktivering og pre-public-undtagelsen fra samlet; legacyresultatet rekonstrueres ikke gennem Candidate G.
9. Den friske aktiveringsshadow og fulde browserkontrol gennemføres på den eksakte aktiveringskode efter den første ikke-offentlige produktionskørsel. Fejl eller manglende national projektion kræver øjeblikkelig global rollback og må ikke skjules af en grøn topstatus.
10. Når den naturlige state når et komplet 48-timersvindue, fortsætter samme model og profil uden et nyt aktiveringsskift. Det er tidspunktet, hvor transportresultatet er fuldt uafhængigt af opvarmningsranden; det er ikke en ny implementering eller en ny realtidsudviklingstest.

## Begrundelse for den ændrede rækkefølge

Den normale rækkefølge i DEC-0058/0059 var konservativt udformet til en offentlig side. Den aktuelle ejerbeslutning ændrer kun rækkefølgen for den endnu ikke offentlige installation: Candidate G vises under sin første naturlige opbygning, fordi de foreløbige scoreværdier må være midlertidigt skæve uden at påvirke eksterne brugere. Datakontrakten, dataminimeringen, den globale fallback og den efterfølgende leverancekontrol svækkes ikke.

## Verifikation

- Standard/manglende konfiguration skal fortsat vælge legacy fail-closed.
- Den konkrete centrale 4.0.261-konfiguration skal vælge Candidate G ved komplet scoreprojektion, selv om transporthukommelsen er ufuldstændig.
- Manglende projektion i én nødvendig række skal vælge legacy globalt.
- Ufuldstændig hukommelse uden den eksplicitte ejerbeslutning skal fortsat vælge legacy.
- Offentlig aktuel score, zonevinder, farve og bedste tidspunkt skal læse Candidate G; detailfeltet skal samtidig vise den ærlige hukommelsesstatus.
- Central write/readback, exact-head-kildegate, fuld post-data validering, releasegate, 210/673-shadow og fuld browserkontrol skal være grønne.
- Rollbacktesten skal returnere det oprindelige legacyresultat uændret.

## Bevarede begrænsninger

- Candidate G er ikke fundkalibreret. Repræsentative ture og hold-out forbliver senere efterkalibrering.
- Den første opvarmningsscore er ikke et 48-timersbevis og kan ændre sig, når nye dokumenterede strømforhold kommer ind i vinduet.
- Rå U/V, fart, retning, koordinater og private payloads må ikke indgå i offentlig state eller audit.
- Bund, dybde, render, revler, adgang, stedegnethed og sikkerhedsadvarsler indgår ikke.
- Artifact, protected-dirty-data, privat cache, geometri og land-/vandpunkter er urørte. I `data/kystdata.json` og `data/zones.geojson` må kun versionsfeltet ændres til 4.0.261.

DEC-0060 erstatter DEC-0059's krav om komplet 673/673 transporthukommelse **før** aktivering samt DEC-0058's krav om frisk slutshadow **før** den første pre-public produktionskobling. Alle øvrige krav i DEC-0054–0059 bevares.
