# DEC-0031 – AI-modelvalg og kvotesikker arbejdsform

**Status:** AKTIV / BINDENDE  
**Dato:** 2026-08-08

## Beslutning
RavRadar arbejder under en begrænset ugentlig Codex-kvote. Kvalitet og sikkerhed kommer først, men den stærkeste model skal ikke bruges af bekvemmelighed. Codex har ansvaret for at vurdere modelbehovet og vejlede Jakob, som ikke forventes selv at kunne foretage den tekniske risikovurdering.

Før hvert væsentligt arbejdsafsnit vurderer Codex:
- nødvendig ræsonneringsdybde og kodebaseforståelse,
- fejlens eller ændringens konsekvens,
- påvirkning af RavScore, datalogik, DMI/fallback, fysisk/faglig model, arkitektur og produktion,
- og om en billigere aktuelt tilgængelig model kan levere samme nødvendige kvalitet.

## Sol-krævende arbejde
GPT-5.6 Sol er udgangspunkt for den videnskabelige RavRadar-/RavScore-analyse, forskning i rav- og sedimenttransport, syntese af vind/bølger/strøm/vandstand/bund/historik, eventuelle strømstrukturer, RavScore-design, nye fysiske modeller, ukendte rodårsager, komplekse regressioner, arkitektur, kritisk DMI-/forecast-/cache-/fallback-/dataintegritetslogik og større endelig validering. Ved reel tvivl vælges Sol.

## Aktiv anbefaling og tilbageskift
Hvis en billigere tilgængelig model kan levere samme nødvendige kvalitet, stopper Codex før hovedarbejdet, anbefaler den konkrete model og begrunder det kort. Efter en sådan anbefaling er Codex ansvarlig for at opdage, hvornår rutinearbejdet slutter, og stoppe før næste kritiske del med en anbefaling om at skifte tilbage til Sol.

Mekanisk dokumentation, formatering, oprydning, simple klart specificerede kodeændringer, ukomplicerede tests og gentagelse af allerede besluttede ændringer kan typisk udføres billigere. En mulig, men ikke tvungen arbejdsgang er Sol til analyse/design, billigere model til mekanisk implementering og Sol til kritisk review/integration.

## Kvote og kontinuitet
Kvotegrænser må aldrig føre til overfladisk forskning eller udeladte analyser, tests og valideringer. Hvis arbejdet må pauses, skal den permanente projekthukommelse registrere:
- hvad der er undersøgt og konkluderet,
- anvendte kilder og evidens,
- afviste og åbne hypoteser,
- allerede udførte ændringer og tests,
- resterende arbejde og næste konkrete trin,
- samt anbefalet model ved genoptagelse.

Den store videnskabelige analyse må pauses til næste kvotenulstilling frem for at sænke kvaliteten. Billigere modeller må udføre klart afgrænsede støtteopgaver, men centrale synteser, evidenskonflikter, nye hypoteser, scorebeslutninger og endelig vurdering udføres med Sol.

## Konsekvens
Reglen ændrer ikke roadmapprioritering, RavScore, data eller produktion. Den styrer alene, hvordan AI-arbejdet fordeles sikkert og økonomisk over fremtidige chats og sessioner.
