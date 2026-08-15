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
