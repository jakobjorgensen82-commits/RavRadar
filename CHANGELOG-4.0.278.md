# RavRadar 4.0.278

## Regelværksted og samlet ekspert-håndbog

- Det tidligere Regelværksted og Vidensbase er fjernet fra den aktive adminflade. Deres enkle test kunne ikke validere Candidate G's historik, lokale datagater og bindende scoreinvariants og var derfor ikke en sikker vej til en offentlig scoreændring.
- Regelrettighederne er fjernet, og produktionsworkflowet fremstiller ikke længere en offentlig `admin-active-rules`-fil. Historiske centrale og lokale regelkladder bevares uden runtimeeffekt.
- Det gamle browserværksted, regelmotoren, regeltjenesten og regelfilerne kopieres ikke med i den offentlige Pages-udgave; forskningskilderne bevares kun i repositoryet.
- Ekspertens håndbogsreview er fortsat den faglige indgang. Accepterede scoreændringer skal indarbejdes i Candidate G-koden og følge RDKS-, test-, exact-head-, produktions- og efterkontrolkæden.
- Hele ekspert-håndbogen og systemspecifikationen er gennemgået mod den aktive Candidate G-model med 20/50/30, 48-timers tilstand, lokal fail-closed og uden legacyfallback.
- Candidate G-beregningen, vejrregler, zoner, geometri og land-/vandpunkter er uændrede. I de to beskyttede geodatafiler ændres kun versionsfeltet fra 4.0.277 til 4.0.278.

## Naturlig Candidate G-modning

- Den seneste offentlige kontrol efter 4.0.277 viser 673 accepterede statefortsættelser og ingen nye resets ved kørselsskift.
- 657 af 673 kyststrækninger har nået 48 timers naturlig historik, og 205 af 210 zoner er aktive. De resterende lokale kæder har 15–23 timers historik og fortsætter uden kunstig backfill.

## Verifikation

- Den aktuelle liste og alle dage i 5-dages prognosen er kontrolleret med både strand og waders. Begge veje bruger den valgte jagtform selvstændigt. Ens placeringer og afrundede scorer kan være korrekte under rolige forhold, mens prognosedage med forskellige søgeforhold giver forskellige lister.
- En målrettet regressionstest låser både den aktuelle rangering og dagsrangeringen, så et senere brud ikke kan få strand og waders til at dele samme beregning.
- Målrettede lokale kontrakttests, versions- og geodatakontrol, RDKS-validering, exact-head-kildegate, frisk produktion og offentlig efterkontrol gennemføres som releasekæde.
- PR #143 bestod exact-head-kildegaten og blev merged som `d627b5ee`. Den første produktion `32837294743` byggede frisk vejr og fortsatte Candidate G-historikken, men stoppede før release og deploy, fordi en gammel valideringstest stadig krævede Regelværkstedets pensionerede gemmevej. Testen følger nu den nye kontrakt og kræver, at gemmevejen er fraværende. Ingen fejlende udgave blev offentliggjort.
