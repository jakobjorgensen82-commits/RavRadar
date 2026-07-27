# RavRadar 3.2.1 — robust DMI STAC bulkhentning

## Rettelser

- DMI's dokumenterede `asset.data.href` understøttes nu sammen med standard-STAC-feltet `assets.data.href`.
- GRIB-downloads bruger en separat HTTP-session, så en eventuel DMI API-nøgle ikke automatisk føjes til S3/download-links.
- STAC- og GRIB-kald har kontrolleret retry med respekt for `Retry-After` ved HTTP 429 samt midlertidige 5xx-fejl.
- Forespørgsler begrænses til Danmark og sorteres nyeste først.
- Tidligere modelruns og zonedata bevares, hvis en ny bulkopdatering fejler helt eller delvist.
- Cachen skelner nu mellem tidspunktet for kørslen (`generatedAt`) og tidspunktet for senest vellykkede DMI-kildedata (`sourceUpdatedAt`).
- Bulkresultatet klassificeres som `ok`, `partial` eller `failed` og skrives til GitHub Actions-output og job summary.
- Workflowet viser en tydelig warning ved mislykket DMI-bulkrefresh uden at forhindre fallback/deploy.
- Valgfri repository secret `DMI_API_KEY` sendes kun til DMI API-kald.
- Det overflødige `schedule-test.yml` er fjernet. Ekstern cron-job.org → `workflow_dispatch` er fortsat den eneste planlagte trigger.
