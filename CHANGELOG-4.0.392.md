# RavRadar 4.0.392 – mobil nøddrift og regional closure-identitet

## Offentlig opstart

- Den levende 4.0.391-side kunne hænge på `Kontrollerer aktuelle data…`.
- Årsagen var, at nøddrift hentede og kontrollerede den cirka 118 MB store
  detaljepakke under selve opstarten. Det kunne især få Safari på iPhone til
  at hænge eller lukke fanen.
- 4.0.392 holder store detaljepakker ude af den kritiske browseropstart.
  Kort og øvrig side åbner, mens berørte scorer og vejrdata vises ærligt som
  utilgængelige frem til næste friske vejrpakke.
- Gamle værdier fremstilles ikke som aktuelle, og manifest-, hash- og
  modelbindingerne lempes ikke.

## Normal vejropdatering

- Run `35105048864` gemte fremgang fra alle tre providerled og lukkede
  79.147 af 79.414 par med validerede værdier; 267 blev ærligt `MISSING`.
- Closure bestod, men public-history-adapteren afviste bagefter en regional
  DMI-prøve, som closure allerede havde godkendt.
- Adapteren matcher nu closureens eksakte kanoniske identitet
  (collection, modelRun, validTime og sourceAssetSha256) i stedet for at
  genindføre en selvstændig 12-timers capture-heuristik.
- Dubletter, forkert kildeidentitet og ændrede vektorer afvises fortsat.

## Kontrol

- Målrettet data-service-test, JavaScript-syntaks og nonblocking-prognosetest
  er grønne.
- Den nye kode er prøvet i en rigtig browser mod de nuværende offentlige
  produktionsdata: opstarten afsluttede på cirka fem sekunder uden browserfejl
  og uden download af detaljepakken.
- Exact-head sourcegate, merge og liveverifikation af 4.0.392 afventer.
