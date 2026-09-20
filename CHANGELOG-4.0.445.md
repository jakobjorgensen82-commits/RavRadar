# 4.0.445 – source-stage-kontrol bruger også DMI’s challenge-plan

## Ændret

- Copernicus-range-kontrollens donorbank-sammenligning bruger nu den samme
  `agedDmiChallengePlan`, som source-stage'en brugte ved beregningen.
- En ældre, stadig gyldig DMI-model behandles derfor ens i stage, donorbank-
  projektion og den efterfølgende kontrol. Det forhindrer en falsk
  projektion-mismatch, som ellers kunne stoppe Open-Meteo før det fik den
  reelle rest.
- Der er tilføjet en målrettet regressionstest, som sikrer at challenge-planen
  faktisk føres med gennem kontrollen.
- Versionsfelter er løftet til 4.0.445. Geodata er kun versionssynkroniseret;
  ingen geometri eller punkter er ændret.

## Live-fund

I run `35501561874` gennemførte DMI-kæden med et ærligt fallback-signal
(`DMI_LOCALLY_SKIPPED_DKSS_ASSET`) og Copernicus gemte validerede delresultater.
Stoppet kom ved den efterfølgende source-stage-kontrol, før Open-Meteo, score,
artifact og deploy. Fejlen var en manglende DMI-challenge-binding i kontrollens
genberegning; datasættet er derfor ikke kompletheds- eller driftsbevist.

## Verifikation

Den eksisterende range-checker-test og den nye challenge-regression er grønne.
Exact-head sourcegate, merge og en ny almindelig continuation skal stadig vise,
at Open-Meteo, afsluttende cache, score, artifact og deploy gennemfører.
