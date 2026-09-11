# DEC-0125 – fair providerbetjening og eksakt WAM-ejerskab

- **Status:** Ejerbesluttet, implementeret og måltestet lokalt i 4.0.343; exact-head-CI, main-runtime og produktion er åbne
- **Dato:** 2026-09-11

## Baggrund

Oneoff `34565347360` på merged 4.0.342/main `6a3133fe` bevarede og gemte providercacherne, men sluttede uden handoff og cutover. Current endte på 77.859/79.414 med 1.555 manglende par. Før Copernicus manglede 2.841 par; Copernicus gav 572 og Open-Meteo 714. WAM fejlede særskilt terminalt.

Det samlede runtimebevis viste tre uafhængige planlægningsfejl:

1. DMI's strenge currentplan kunne bruge den fælles collectionkvote på de først valgte familier. `idw` og `wam_nsb` fik gentagne ture, mens `dkss_nsb` ikke fik en eneste i tre oneoff-pass. Tidsstempler for sidste forsøg var ikke en fair, vedvarende kømarkør.
2. Copernicus gennemløb Baltic før AMM15 i en global produktkø. Baltic kunne derfor bruge budgettet, før AMM15-only-par overhovedet fik en startmulighed. AMM15 gav nul live progression i de tre forsøg, selv om 106 rester var AMM15-only.
3. Den hidtidige grove vest/øst-regel sendte to konkrete vestlige WAM-dele til `wam_nsb`, selv om den auditerede gitterdækning viste, at kun `wam_dw` kan levere dem. Af 670 native WAM-dele er 668 valide i begge collections og præcis to kun i DW.

Det var ikke et cache-reset og ikke alene et spørgsmål om mere runtime. Gyldige cacher består. Fejlen lå i, hvem der fik en garanteret tur, og hvilken collection der ejede de to eksakte WAM-dele.

## Beslutning

1. **Samme producent i normal og oneoff.** Almindelig vejropdatering og oneoff skal fortsat kalde de samme DMI- og Copernicus-producenter. Oneoff må kun give flere bounded pass; det må ikke have en anden prioriterings- eller ejerskabskontrakt.
2. **DMI-familier får bounded fair service.** Alle uløste strenge DKSS-currentfamilier er kritiske. Planen vælger én lead-familie, giver begge kritiske WAM-collections deres eksisterende nødvendige ture og reserverer derefter en reel startmulighed til hver resterende kritisk DKSS-familie. En vedvarende `lastStrictCurrentTurnAt`-markør roterer lead-familien mellem pass og kørsler; ugyldige eller fremtidige markører behandles fail-closed som ikke betjent.
3. **Prefetch må nedgradere refresh-only arbejde.** Når den eksakte prefetch beviser, at en DKSS-familie ikke længere har reelle mangler og kun er kvalitetsrefresh, fjernes dens kritiske tidsreservation og flyttes efter de reelle huller. Dermed reserveres hultid ikke til allerede dækket kvalitet.
4. **Collectionkvote må ikke sulte kritisk current.** Kritiske DKSS-currentture tæller ikke mod den almindelige produktivitetskvote. Budget- og reservegrænser består, men hver kritisk familie får den planlagte bounded startmulighed, medmindre et dokumenteret globalt runtime-/interruptionsstop indtræffer.
5. **Copernicus-produkter har hver sin roterede kø.** Baltic og AMM15 får separate stabile shardkøer, der roteres deterministisk pr. attempt og flettes i fast round-robin. Et lokalt shardproblem stopper ikke det andet produkt eller senere shards.
6. **AMM15-only må starte straks.** Et par, som kun kræver AMM15, må ikke vente på Baltic. Et overlappar må først forsøges i AMM15, når det eksakte samme pars current-run Baltic-forudsætning er dokumenteret; der findes ingen produktbred barriere. Et overlap, der blev udskudt tidligere i passet, genbesøges efter Baltic-fremgang.
7. **Forsøgsnummer er ikke providerbevis.** Ydre oneoff-pass, GitHub run-attempt og deterministisk tidslot bruges kun til fair arbejdsrotation. De må ikke genbruges som positivt source-/admissionsbevis.
8. **Én eksakt WAM-ejer pr. native del.** Den fælles owner-policy `coast-type-exact-part-overrides-v2` anvendes af planlægning, staging, salvage, historik og slutvalidering. Normalreglen er vest→`wam_nsb`, øst/limfjord→`wam_dw`, med eksakt override af `dk-b10-10-national-part-02-locality-02` og `dk-b10-10-national-part-03` til `wam_dw`. Det giver 458 DW- og 212 NSB-ejede native dele. Feggesunds tre proxydele er ikke native WAM og indgår ikke i de 670.
9. **Ejerskab er fail-closed og attesteret.** En override, hvis kysttype ændres, ukendt kysttype eller asset med en del, som ikke ejes af collectionen, afvises. Owner-policy-id indgår i targetregister, receipt, historik- og runtimebinding. Gamle partielle receipts uden ny owner-policy invalideres; den aktive cache eller parsergeneration nulstilles ikke.
10. **Gamle gyldige rækker består.** En forkert ejerklassificeret gammel række kan ikke blokere en ny korrekt ejer for samme target. Den gamle række ommærkes ikke; den forbliver uændret og er et ærligt hul, indtil korrekt collection leverer en fuldt valideret erstatning.
11. **Kildeprioritet og slutclosure er uændret.** Reelle huller og ugyldige rækker behandles før kvalitetsrefresh. DMI → Copernicus → Open-Meteo består, og en midlertidig lavere prioriteret række kan senere erstattes atomisk. Current kræver fortsat 79.414/79.414. Bølger kræver 79.060 native WAM plus Feggesund 354/354, nul mangler og nul uløste lineage-konflikter før handoff/cutover.
12. **Ingen geometri- eller fysiklempelse.** Beslutningen ændrer ikke kystgeometri, land-/vandpunkter, afstandstærskler, interpolation, fysik, score eller offentlig datakontrakt.

## Lokal evidens

- DMI-scheduler-, DKSS-, modeldownload-, supervisor- og oneoff-regressionerne er grønne, inklusive rotation, reserve, prefetch-nedgradering og samme producentvej for normal/oneoff.
- Den fælles owner-regression beviser 670 native dele, 458 DW, 212 NSB, præcis de to overrides til DW og udelukkelse af Feggesunds parent/proxydele.
- WAM-historik er grøn 36/36, WAM-integration 63/63 og checkpoint 21/21.
- Copernicus pilot, range-runner, current-source-stage, bounded retry og targetregister er grønne; den eksisterende partial-hour- og fallbackkontrakt består.
- Workflowtestene for normal/oneoff, reusable runtime, privat runtimehash og validation-order er grønne. Python compile, Node syntax, packageparse og diff-check er grønne.

Dette er lokal kontraktevidens, ikke provider- eller produktionsbevis. Før merge kræves én `validate:source` på den eksakte endelige PR-head. Før modelcutover kræves kontrolleret main-opfyldning, begge komplette closures, fulde post-data-gates, runbundet handoff og offentlig verifikation.

## Supersession og åbne opgaver

DEC-0125 supersederer alene de tidligere grove scheduler- og WAM-owner-antagelser. DEC-0124's granulære admission, DEC-0123's candidate/promotion, persistent cache, proveniens, sourceprioritet, fuld slutclosure og op til 48 timers verificeret historik består.

Normalworkflow og watchdog/shadow-dispatch forbliver deaktiveret gennem den kontrollerede release- og cutoversekvens. Efter launch består arbejdet med tabsfri cachetransport, ekstern cron, faktisk provider-rækkefølge/tidsforbrug og bevis for normalt vedligeholdelsesoverskud.
