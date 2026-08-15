# P1 – første delvise nye HARMONIE-cyklus

**Grundlag:** GitHub Actions #31891391302 og artifact #2783, datasæt `rr-20260815150229-210`

## Resultat

Kørslen bestod central adminhydrering og tombstones, frisk DMI-bygning, fuld validering, releasegate, Supabase-synkronisering, Pages-artifact og deploy.

HARMONIE 15. august kl. 12 UTC optræder som en ny modelkørsel i vindkæden, men bidrager foreløbig kun med 416 timer fordelt på 208 zoner. Den tidligere HARMONIE 03 UTC-cyklus leverer fortsat 9.776 timer i de samme 208 zoner. WAM står fortsat på 00 UTC, og DKSS står fortsat på 06 UTC.

Det er dermed den første nye uafhængige vindcyklus efter 4.0.222-grundlaget, men kun en delvis indfasning. Den må ikke alene bruges til permanente overgangsgrænser.

## Observeret overgang

Sammenlignet med artifact #2782 faldt den samlede vindhastighed ved DMI/fallback-overgange fra middel 0,848 m/s og p95 2,4 m/s til middel 0,710 m/s og p95 2,0 m/s. Vindretning faldt fra middel 20,414° og p95 50° til middel 13,433° og p95 47°. Det er et observeret datasætpar, ikke en godkendt tærskel.

## Historik

Strømhistorikken voksede til 38,965 rå timer. Verificeret spænd er 3,246–38,965 timer; ingen zone har endnu 72 verificerede timer. Ingen fortid er rekonstrueret.

## Næste evidens

Vent på at HARMONIE 12 UTC dækker en større del af den viste horisont og på nye WAM-/DKSS-run-id'er. Audit og roadmap skal fortsat skelne modelkørsel, antal timer og antal dækkede zoner.

## Produktionsverifikation af 4.0.223

Push-kørsel #31891984360 bestod central adminhydrering/tombstones, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy på commit `61abd292`.

Artifact #2785, datasæt `rr-20260815151511-210`, viser at HARMONIE 12 UTC voksede fra 416 til 3.744 timer i 208 zoner, mens 03 UTC faldt fra 9.776 til 6.032 timer. Den nye cyklus er dermed tydeligt under indfasning, men dækker endnu ikke hele vindhorisonten. WAM- og DKSS-run-id'erne er fortsat uændrede.

Den nye zonetælling virker i selve produktionsartifactet. Strømhistorikken er vokset til 39,176 rå timer og 3,457–39,176 verificerede timer; alle 210 zoner er fortsat under 72 verificerede timer.

Den efterfølgende grønne dokumentationskørsel #31892505177 gav artifact #2787. HARMONIE 12 UTC voksede videre til 5.616 timer, mens 03 UTC faldt til 4.160 timer, fortsat i de samme 208 zoner. Vindens målte DMI/fallback-overgange var uændrede fra #2785. Det viser en trinvis, konsistent indfasning – ikke et nyt uafhængigt overgangsdatasæt for hvert artifact.

Historikken nåede 39,364 rå timer og 3,644–39,364 verificerede timer. WAM og DKSS har fortsat ingen nye run-id'er.

#31892947409 bestod igen hele kæden, inklusive Supabase og deploy. Artifact #2789 fortsætter indfasningen til 7.488 timer fra HARMONIE 12 UTC og 2.288 timer fra 03 UTC i 208 zoner. Vindovergangen ændrede sig til hastighed middel 0,824 m/s/p95 2,3 m/s og retning middel 18,102°/p95 46°. Variationen under samme indfasning bekræfter, at tidlige del-artifacts ikke må danne permanente tærskler.

Historikken nåede 39,516 rå timer og 3,797–39,516 verificerede timer. WAM 00 UTC og DKSS 06 UTC er fortsat uændrede.

## Fuldt indfaset 12 UTC-cyklus

#31893406911 bestod hele kæden. Artifact #2790, datasæt `rr-20260815154421-210`, har 9.360 HARMONIE 12 UTC-timer i 208 zoner, svarende til 45 timer pr. zone. 03 UTC er reduceret til 416 timer, to pr. zone. Den aktive HARMONIE-del er dermed fuldt skiftet til den nye cyklus.

Sammenligning af det fulde gamle #2782-grundlag og det fulde nye #2790-grundlag viser:

- DMI→fallback er identisk i begge: vindhastighed middel 0,813 m/s, p95 2,2 m/s, maksimum 2,9 m/s; vindretning middel 21,333°, p95 54°, maksimum 76°.
- fallback→DMI ændres fra hastighed middel 0,883/p95 2,7/maksimum 3,9 m/s til 0,834/2,5/3,4 m/s.
- fallback→DMI-retning ændres fra middel 19,495°/p95 38°/maksimum 68° til 14,871°/30°/46°.
- almindelige vindtimer ligger i de to cyklusser omkring p95 1,0–1,1 m/s og 20–21°.

Det er to uafhængige fulde vindcyklusser. De viser samme størrelsesorden, men DMI→fallback-halen er endnu ikke ny, og to cyklusser er et spinkelt grundlag for en permanent produktionsgate. Tallene registreres som foreløbig ramme, ikke som aktiveret tærskel.

Historikken nåede 39,662 rå timer og 3,943–39,662 verificerede timer; alle 210 zoner er fortsat under 72 verificerede timer.
