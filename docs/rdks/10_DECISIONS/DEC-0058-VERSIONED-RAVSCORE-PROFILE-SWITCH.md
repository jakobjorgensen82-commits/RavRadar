# DEC-0058: Versionsbundet RavScore-profilomskifter med fail-closed rollback

**Status:** Aktiv score-neutral produktbeslutning for 4.0.260

**Dato:** 2026-08-23

**Scorepåvirkning:** Ingen. Den offentlige RavScore er fortsat `RRS-CURRENT-B0-4.0.247` med `25/40/35`.

## Problem

Candidate G er ført naturligt videre i den centrale 673-deles pipeline og kan rekonstrueres i den fallback-kompatible offentlige runtime. Før en eventuel aktivering skal RavRadar kunne vælge én eksakt scoreprofil for hele datasættet og vende tilbage til den hidtidige profil uden at blande komponenter, zoner eller jagtformer.

En almindelig boolesk aktivering er ikke tilstrækkelig. Den ville ikke i sig selv dokumentere modelversion, komplet landsdækning, slutshadow, ejerbeslutning eller rollbackmål.

## Beslutning

1. 4.0.260 indfører `RAVSCORE-PROFILE-SWITCH-4.0.260` med eksakte profil-id'er for ønsket, aktiv og rollbackprofil.
2. Standard, ønsket og aktiv profil er `RRS-CURRENT-B0-4.0.247`. Den eksisterende score genbruges som det samme resultatobjekt; versionen ændrer derfor ikke score, farve, zonevinder eller bedste tidspunkt.
3. Candidate G-profilen er `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3` med `20/50/30`.
4. Candidate G kan kun vælges, hvis alle følgende forhold samtidigt er opfyldt: eksplicit aktiveringsflag, komplet global Candidate G-dækning, id for en frisk grøn slutshadow og id for en særskilt ejerbeslutning.
5. Manglende eller ukendt konfiguration, forkert rollbackprofil, manglende dækning eller manglende evidens vælger fail-closed den hidtidige profil for hele datasættet. Der findes ingen per-zone- eller per-række-fallback, som kan skabe blandede offentlige scoreprofiler.
6. `automaticActivationAllowed` er altid falsk. En naturlig produktionskørsel kan aldrig selv aktivere Candidate G.
7. Omskifteren anvendes, før lokale rækker, zonevindere og aktuelle delresultater bygges. Den valgte profil følger den offentlige startpakke, detaljepakke og manifest, så browser og audit kan kontrollere samme kontrakt.
8. Candidate G-adapteren oversætter de interne komponenter til den eksisterende offentlige kontrakt: jagtbarhed, transport og mobilisering. Den bruger forståeligt dansk og den ejerbesluttede udtransportforklaring. Den tilføjer ikke sikkerhedsråd eller bund-, dybde-, rende-, revle-, adgangs- eller stedegnethedsregler.
9. Rollback vælger eksakt `RRS-CURRENT-B0-4.0.247`, slår kandidataktivering fra og bevarer automatisk aktivering som falsk. Testen kræver, at det oprindelige legacy-resultat returneres uændret.
10. Nattens naturlige forløb dokumenterer seks timers videreført state i alle 673 dele uden nulstilling eller modstridende evidens. Ejeren har accepteret det som praktisk evidens til næste gennemgang. Det er ikke og må ikke kaldes et 48-timersbevis.
11. 4.0.260 aktiverer ikke Candidate G. Før offentlig aktivering kræves stadig frisk slutshadow på den eksakte aktiveringskode, grøn fuld produktion og browserkontrol, central admin-roundtrip for aktiveringsvalget samt en ny særskilt ejer-gennemgang.

## Verifikation

- Standardprofilen skal returnere legacy-resultatet identisk.
- Simuleret Candidate G må først kunne vælges med alle fire aktiveringsforudsætninger.
- Manglende Candidate G i blot én nødvendig række skal holde hele datasættet på legacyprofilen.
- Ukendt profil og ugyldigt rollbackmål skal falde sikkert tilbage.
- Udtransportgaten skal give score 0 og den eksakte godkendte danske forklaring uden at overskrive de øvrige delscorer.
- Offentlig startpakke, detaljepakke og manifest skal bære samme profilkontrakt.
- Exact-head-kildegate, fuld post-merge-produktion, frisk dataminimeret 210/673-shadow og fuld browserkontrol kræves som leverancebevis.

## Bevarede begrænsninger

- Candidate G er ikke fundkalibreret. Repræsentative ture og hold-out er senere efterkalibrering.
- Seks timers naturlig fortsættelse beviser mekanisk kontinuitet, ikke hele 48-timers aftrapningshorisonten.
- Artifact, protected-dirty-data, privat cache, geometri og land-/vandpunkter er uden for ændringen.

DEC-0058 erstatter DEC-0057's rækkefølgekrav om først at bygge omskifteren efter mindst 48 timers observation. DEC-0057's dataminimering, statekontrakt og krav om ærlig alder består uændret.
