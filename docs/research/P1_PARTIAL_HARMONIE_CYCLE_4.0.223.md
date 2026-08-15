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
