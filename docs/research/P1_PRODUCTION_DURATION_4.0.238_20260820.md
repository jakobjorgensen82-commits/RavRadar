# P1-produktionsvarighed for 4.0.238

## Formål

Roadmapet kræver, at produktionsvarigheden følges uden at reducere gates, marine audits eller datakvalitet. Denne måling bruger GitHub-jobbets faktiske `build-and-prepare`-tider og ændrer ingen workflowbetingelser.

## Seneste fulde builds

| Run | Event | Buildtid |
|---|---|---:|
| `#32314498838` | schedule | 689 sekunder |
| `#32327270685` | schedule | 473 sekunder |
| `#32330101853` | schedule | 478 sekunder |
| `#32337383441` | schedule | 451 sekunder |
| `#32343974644` | schedule | 544 sekunder |
| `#32344813967` | push, 4.0.238 | 415 sekunder |

Medianen for de seks fulde builds er 475,5 sekunder. 4.0.238-buildet ligger 60,5 sekunder eller cirka 12,7 procent under medianen.

## Skip-adfærd

Readiness-kørslerne `#32318506884`, `#32323804299`, `#32332623657`, `#32334839264`, `#32339983386` og `#32347036227` sprang `build-and-prepare` over og producerede intet artifact, når den eksakte aktuelle Copernicus-time ikke var klar. Det er forventet fail-closed adfærd og skal ikke tælles som hurtige produktioner.

## Konklusion

4.0.238 viser ingen performanceforringelse i den fulde centrale kæde. Kørsel `#32344813967` gennemførte fortsat central adminhydrering, frisk DMI, fuld validering, releasegate, supportartifact, Supabase og Pages. Målingen er driftsevidens, ikke et nyt uafhængigt modelrotationsbevis; varighed skal fortsat følges, når nye HARMONIE-, WAM- og DKSS-cyklusser faktisk optræder.

## Post-merge måling #3256
- `build-and-prepare` i `#32354210495` tog 410 sekunder og gennemførte fortsat frisk DMI, fuld validering, releasegate, supportartifact, Supabase og Pages.
- De syv målte fulde builds er nu 689, 473, 478, 451, 544, 415 og 410 sekunder; medianen er 473 sekunder.
- Resultatet er fortsat stabilt og begrunder ingen reduktion af gates, marine audits eller datakrav. Målingen gentages ved en reel ny modelrotation.

## Produktion 3259 efter workflowoptimering
- Push-produktion 32359944007 på merge-commit 8e4c11c3 brugte 328 sekunder på build-and-prepare og cirka seks minutter samlet inklusive Pages-deploy.
- De seneste otte fulde buildtider er 689, 473, 478, 451, 544, 415, 410 og 328 sekunder; medianen er nu 462 sekunder.
- Kilde-PR-gaten brugte 17 sekunder trods de ekstra workflowkontrakter, så den tidligere produktionsfejlklasse er flyttet frem uden mærkbar PR-ventetid.