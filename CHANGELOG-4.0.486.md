# RavRadar 4.0.486 – forklaringer i almindeligt sprog

- Score- og prognosetekster forklarer nu strøm over flere timer, bølger,
  søgeforhold og manglende historik på dansk, tysk og engelsk.
- En strøm ind mod kysten lige nu beskrives ikke længere som om den
  alene burde give en høj strømscore. De tidligere timer tæller med.
- Hovedforklaringen er forståelig uden tekniske begreber. De
  modelpræcise årsager er bevaret i en frivillig teknisk detalje.
- Ingen scoreformel, vejrdata, geometri eller modelbinding ændres.
  Bundlehash er fortsat `61ec54746fdf1ac58f3d7859d4d55a901fcc6376d0412acf2d6f4f418ae5c0a1`.
- 4.0.485 er merged og kode-only-deployet. Normalrun `35993736090`
  på samme main gennemførte cachegemning og Pages. Ingen gyldige
  felter gik tabt på 114×673 fælles offentlige par, men alle fem
  vejrtyper har fortsat huller. Næste normalrun `36009816840` er
  siden afsluttet med bølgekonflikt før deploy. 4.0.486 blev ikke
  leveret separat; teksten følger med i 4.0.487 sammen med DEC-0253.
