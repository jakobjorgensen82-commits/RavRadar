# RavRadar 4.0.366 – kode-only rettelsesdeploy og post-cutover-reparation

**Dato:** 2026-09-15
**Status:** Lokal releasekandidat; exact-head-PR-gate, merge, manuel kode-only-deploy og offentlig verifikation mangler.

## Rettelser

- Gyldig DMI `windTail` bevares gennem merge som vind, og retninger normaliseres igen efter afrunding, så 359,6 grader bliver 0 og ikke den ugyldige værdi 360.
- DMI-atmosfære kan repareres, selv om havkaldet fejler. EDR bruges kun til komponenter, den faktisk kan levere, og dækning kræver det fulde forventede UTC-tidsraster med atomiske værdier.
- En eksplicit ukendt strømtime bryder nu et native holdinterval. Modellen må ikke attestere et sammenhængende interval hen over et hul.
- Manglende vandstand, fundvægt og national score bliver ikke længere lavet om til nul. Kun den aktuelle, ikke-fremtidige UTC-time mærkes som nu.
- Fanen Om RavRadar har fået en enkel installationsvejledning til iPhone og Android samt link til RavRadars Facebookfællesskab.

## Hurtigere, adskilt levering

- DEC-0148 gør kode-only til standard for almindelige rettelser: genbrug senest gyldige data eksakt, deploy kode først, og kør normal tidsbegrænset vejrhentning separat bagefter.
- Det nye `Deploy RavRadar code-only repair` kan kun startes manuelt på eksakt `main` med bekræftelsen `DEPLOY-CODE-ONLY-REPAIR`. Det kontakter ingen vejrleverandør og genbruger en grøn exact-head PR-kildekontrol.
- Den offentlige runtime gendannes fra de seks eksakte livefiler. Den private runtime bevarer alle ni tilladte filer; kun de gennemgåede modelbindinger må ændres.
- Den allerede installerede migration `20260914020000` er urørt. Den nye append-only migration er `20260914234500_post_cutover_current_hold_binding.sql`.
- Migrationen bevarer den eksakte offentlige forgængerbinding under selve deployovergangen. Den centrale `activeModelBinding` afgør fortsat enerådende, hvilken binding der må skrive, så forgængeren afvises automatisk efter fuldført aktivering.
- Den faste kildekontrol er reduceret til 24 korte produktkritiske kommandoer. Brede historiske, RDKS-, assistent- og releasepakker ligger ikke længere i den faste sourcegate.

## Bindinger og bevis

- Integrated bundle: `65148b4ae3e0bee78826f82cefe8d002ec5b0adcc17f97a1aca81ef1b2c095fa`.
- Candidate G rollback bundle: `7fe45de727963d9cbf0285465b48dbef1e11e4b8ba1f4469c9dea59d8ccfd97b`.
- Continuation contract: `81045427e86a26b7c853a1f8832aece9f73afc2a4092c5292ec9e6730154b8a2`.
- Målrettede vejr-, RavScore-, deploy-, migration-, runtimegenbrugs- og privacykontroller er grønne lokalt. Der er ikke kørt oneoff, providerhentning eller fuld lokal kildegate.

Efter offentlig kode-only-deploy startes normal vejrdrift særskilt. Den skal bevise numeriske scoreinput, faktiske scorer, cachevedligeholdelse og rotation; det bevis foreligger ikke endnu.

Se DEC-0148.
