# RavRadar 4.0.230

## Rettet

- Strøm vælges nu for hvert native forecasttidspunkt på tværs af alle aktive DMI-DKSS-modelområder. Først findes den nærmeste eksakte fælles U/V-vandkolonne, og derefter vælges det dybeste gyldige lag i netop den kolonne.
- Vandstand, overfladetemperatur og andre skalare havfelters modelvalg kan ikke længere blokere, rydde eller flytte strøm. Kysttypeprioriteringen gælder fortsat for disse skalare felter, men ikke for strøm.
- Havknude-regressionen beviser den systemiske rettelse: en fælles NSBS-U/V-kolonne 2,804 km fra vandpunktet vinder over et IDW-skalarpunkt 5,131 km væk. En fjernere strømkolonne må ikke overtage.
- Strømmens semantik er hævet til v3. Gamle v2-strømfelter invalideres og genopbygges, mens gyldige skalare havfelter bevares. Interpolation kræver fortsat samme collection, modelkørsel, celle, lag og samplingpunkt på begge sider.

## Bevidst uændret

- RavScoreformlen, scorevægte, administratorens punkter, afstandsgrænsen på 5 km, DMI-prioritet, `missing`-adfærd og den geografiske releasegate er ikke ændret.
- Den private score-neutrale 0/5/15-km flerlagscache opbevarer fortsat højst 168 timer. Den kommende analyse skal fortsat undersøge helheden **ydre tilførsel → overgang mod kyst → lokal bundnær levering**, før et nyt scoremodul kan foreslås.

## Produktionsstatus

- GitHub Actions #31929171918/#2872 gav rodårsagsbeviset på 4.0.229: 187/210 hovedzoner og 596/673 lokale dele var offentligt verificerede, mens den private audit fandt Havknudes gyldige U/V-kolonne inden for 5 km. Ét fælles havmodelvalg havde skjult den i offentlig runtime.
- #2872 fortsatte den private rotation til cursor 240 med 873 prøver for 469 ankre/179 dele. Af de 77 offentligt manglende dele var 36 besøgt: én pipelinefejl inden for 5 km, fire nær-tærskel ved 5–6 km, fem modelhuller ved 6–8 km, 23 strukturelle huller over 8 km og tre uden observeret fælles U/V. 41 afventede fortsat rotation.
- 4.0.230 består de målrettede regressioner, RDKS/version, håndbog og lokal releasegate. Fuld lokal `validate` stopper forventet ved repositoryets forældede 31. juli-vejrsnapshot efter bestået geometri-v2-kæde; den centrale, friske datakæde må ikke erstattes af lokal stale data. Versionen må ikke kaldes deployet eller produktionsverificeret, før en frisk parser-v18/semantik-v3-kørsel har bestået de uændrede fulde gates, Supabase, Pages og direkte livekontrol.
