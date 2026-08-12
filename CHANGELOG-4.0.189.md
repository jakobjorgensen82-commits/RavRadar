# RavRadar 4.0.189

- Retter et dokumenteret scheduler-loop fra GitHub Actions #2423–#2426, hvor `dkss_idw` gentagne gange brugte hele tidsbudgettet og blev valgt igen, mens strømdækningen stod fast på 125/210 hovedzoner.
- En tidsafbrudt DKSS-model roterer nu bag ikke-forsøgte eller ældre afbrudte havmodeller i næste recoverykørsel.
- Den progressive private zonecache og rå GRIB-cache bevares fortsat. Markeringen for tidsafbrydelse fjernes først efter fuld eller dokumenteret uændret gyldig behandling.
- Den strenge 90 %-audit, fælles U/V-gitterpunkt, DMI-proveniens, fallback, RavScore, kystgeometri og offentlig deploygate er uændrede.
