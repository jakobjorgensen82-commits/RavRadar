# DEC-0096 – Direkte Om-retur må ikke vente på eller tvinge en genindlæsning

## Status

**ERSTATTET AF DEC-0097.** 4.0.299 bestod PR #204/exact-head `33166362478`, merge `0ac66199`, produktion `33166424816`, build `98832864492` og Pages `98834824939`. Offentlig desktopkontrol viste 210 zonelinjer og 5 + 5 + 5 samt cirka 1,36 sekunders Om-retur, men ejerens efterfølgende fysiske iPhone-test viste stadig en forside uden kort og prognoser. Lås/oplåsning fik visningen frem, hvilket pegede på suspenderet layout/genoptagelse. Den unikke navigation og 4.0.297's mobile reload fjernes derfor i DEC-0097.

## Problem

4.0.298 blev udgivet gennem grøn exact-head, frisk produktion og Pages. Den unikke navigation fra **Om RavRadar** virkede, men det ekstra head-værn var forkert:

- Den eksakte offentlige Om-retur havde allerede efter cirka ét sekund 210 interaktive zonelinjer, fem **Bedste områder**, fem dagsfaner og fem viste prognoserækker.
- Værnet søgte zonelinjer i Leaflets standard-overlay-pane, mens RavRadar bruger custom panes. Det stod derfor fortsat `pending`, genstartede den allerede komplette side efter cirka seks sekunder og endte `failed` efter retry.
- Ejeren oplevede samtidig meget langsom og derefter helt udeblevet visning på fysisk iPhone.

Det ekstra værn gjorde den hurtige, komplette retur dårligere. En længere frist ville ikke løse dette designproblem; den ville blot forsinke den samme unødvendige handling.

## Beslutning

1. RavRadar-linket på **Om RavRadar** beholder den versionsbundne `return=about`-URL og den unikke nonce. Safari og Hjemmeskærm-app får dermed én frisk root-navigation.
2. Det særskilte synkrone head-værn fjernes helt. Forsiden får ingen ekstra kritisk scriptrequest på grund af Om-returen.
3. Der findes ingen Om-specifik timer og ingen automatisk `location.replace`/reload. Den friske appopstart får lov at fuldføre én gang.
4. 4.0.292/297's eksisterende sidecache-/bfcache-recovery bevares for browserhistorik og afbrudt bootstrap. Den nye direkte navigation er ikke afhængig af den hændelse.
5. Regressionstesten låser det statiske fail-safe-link, nonce/`location.assign` og fravær af både head-script, service-worker-cachepost og den forkastede 4.0.298-testkæde.

## Afgrænsning

Ændringen er kun en browsernavigation og fjernelse af fejlagtig recoverykode. Candidate G, RavScore, vejr, prognoseinput, scorer, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter er uændrede. Sibirien forbliver privat staged og uaktiveret.

## Beviskrav

- Den målrettede 4.0.299-test skal bevise én unik navigation uden timer, tvungen reload eller ekstra head-script.
- Fuld `validate:source` skal bestå lokalt og på PR'ens eksakte head.
- Et nyt artifact skal bestå frisk produktion, releasegate og Pages.
- Offentlig kontrol skal bevise version, farvet kort, fem aktuelle områder, fem rækker på hver af fem prognosedage og præcis Om-retur uden efterfølgende URL-skift.
- Målet er den faktisk målte hurtige retur, ikke en timeout: varm offentlig Om-retur skal være komplet omkring den eksisterende cirka ét-sekundsorden.
- Ejeren skal derefter bekræfte Safari og Hjemmeskærm-app på fysisk iPhone. Indtil begge er grønne, er problemet fortsat åbent.
