# Sammenligning af aktuelt current-stop og gamle prognosehaler

Status: samlet fejlklasse-review og lokal, måltestet sikker restdiagnostik. Ejeren har efter push-holdet igen krævet autonom fortsættelse frem til grøn rettelse og stor opfyldning. Præcis runtime-restfordeling er fortsat åben; ingen politikændring, kunstige data eller adgang til private caches.

## Hvad den aktuelle fejl beviser

Normalrun `33888805489`, buildjob `101075466167`, main `bd47dc9f`, havde reference `2026-09-04T15:00:00Z` og slut `2026-09-09T12:00:00Z`. DMI og Copernicus bestod deres kildeindsamlingstrin og gemte alle fire cachefamilier. Copernicus valgte 8.572/9.756 krævede par og forseglede 1.184 restpar efter 139 afsluttede forsøg. Current-closure fejlede `DMI_GAP_NOT_FALLBACK_ELIGIBLE`.

Koden validerer først DMI-ledger, eksakt komplement og Copernicus-kildejournal. Derefter gives post-Copernicus-resterne til den regionale builder. `_normalize_gap_pairs` tillader kun komplementpar inden for de otte policydele. Maksimum er 8 × 118 = 944, så mindst 240 af de 1.184 rester kan ikke være inden for politikken. En READY-kildejournal beviser udførte kildeforsøg, ikke fuld dækning.

Ingen aktuel sikker log oplyser post-Copernicus-resternes fordeling på timer/dele. Supportworkflowet udelader både `.cache`, `data/live` og `data/diagnostics`. Detaljen er derfor **ikke** udledt ved at læse private cache- eller journalpayloads. Resterne må ikke uden yderligere evidens kaldes Feggesund, 48 bestemte dele eller udelukkende prognosehale.

## DMI-før-Copernicus: sikkert bevist

Alle tre DKSS-kataloger havde valgt 06Z, som også var senest observerede run i deres udtømmende kataloger. Der var 112 VERIFIED timer og seks UPSTREAM_ABSENT: `2026-09-09T07:00:00Z` til `2026-09-09T12:00:00Z`. Det er 4.038 upstream-par = 673 × 6. Den øvrige spatialt manglende matrix var 5.718 par: 51 dele × 112 timer samt seks interne timer på én yderligere del.

Feggesunds tre dele havde tilsammen 18 komplementpar, alle i upstream-kategorien, **nul spatialt manglende par**. Den konkrete ekstra interne DMI-mangel er `dk-b04-12-owner-approved-01` ved 6. september 14/15/16Z og 7. september 03/04/16Z. Det er ikke bevist, at disse seks par også er blandt post-Copernicus-resterne.

Næste normalrun `33891678399`, buildjob `101084903552`, brugte samme låste reference og fandt nyt 12Z-run i alle tre kataloger. Alle 118 nødvendige officielle timer fandtes. LF nåede 118 VERIFIED; IDW 10 VERIFIED/108 LOCALLY_SKIPPED; NSBS 118 LOCALLY_SKIPPED. Terminalen stoppede `DMI_LOCALLY_SKIPPED_DKSS_ASSET` ved runtimebudget. Katalogerne var komplette, selectedNativeRunComplete=true og requiredHorizonEndCovered=true. Det nye run fjerner derfor den konkrete tidligere officielle hale ved samme target, men dets fulde processing/combined closure er endnu ikke bevist.

Observeret eksplicit STAC-publiceringslag var omkring 3,54–3,59 timer. [DMI's produktbeskrivelse](https://www.dmi.dk/friedata/dokumentation/data/forecast-data-storm-surge-model-dkss) angiver fire DKSS-runs dagligt og fem dages horisont. Det giver risiko for manglende sidste timer i en rullende target..+117-akse mellem publiceringerne; en længere køretid skaber ikke i sig selv nye officielle haletimer. Dette er en kontrakt-/driftsrisiko, ikke godkendelse til at lempe den aktive gate eller flytte target.

## Sammenligning med tidligere dokumentation

- `P1_LIMFJORD_WAVE_AND_TAIL_DECISION.md` skelner Feggesunds permanente bølgehul fra manglende vandstands-/temperaturhale i otte **hovedzoner**.
- `DMI_FIRST_FIVE_DAY_SOURCE_AUDIT.md`, 4.0.124, dokumenterer også current-hale: otte zoner havde kun 101 af 118 timer. Senere audit 4.0.208 dokumenterer fortsat eksplicitte current-, vandstands- og temperaturmangler i halen.
- `P1_COMPONENT_TRANSITIONS_4.0.237_RUN3245.md` viser ved vandstand/temperatur, at rå fallbackfelter manglede; værdier blev ikke tabt i merge. Den daværende løsning var at bevare de berørte timer som missing, mens øvrig prognose udkom. De otte hovedzoner må **ikke** forveksles med den særskilte otte-**kystdels**-regionalpolitik.
- Gamle dokumenter beviser således den samme type native horisontkant, men ikke identiteten af samtlige aktuelle post-Copernicus-rester. Den nye closure stopper hele bygningen ved manglende current-par uden for politikken. Den gamle frigivelsesadfærd er derfor ikke automatisk en aktiv ret til at ændre DEC-0114's gate.
- DEC-0114 supersederer alene den gamle Feggesund-wave-missing-konklusion med den faste B05-10/B05-12-to-nabo-bølgeproxy, som findes i koden. Den er ikke en eksisterende strøm- eller historikinterpolator.

## Andre nu kendte fejl

1. HARMONIE-vind: reproduceret Lambert-metadata/referencefejl; samlet PR #252 indeholder lokal/testet rettelse. Frisk runtime endnu ikke bevist.
2. Source-gate: run `33892021429` på `2fd5aa02` havde én samlet fejl: outcome-testen søgte sit filnavn i gatefilen frem for den nye fælles udførelsesliste. Lokalt rettet; outcome- og sourceplan-test er grønne. Alle øvrige testreferencer til releasegate er gennemgået for samme flyttede filmarkør.
3. Gammelt privat coastal-point-staging-cache har modelBundle-mismatch. Workflowets eksisterende continue-on-error isolerer dette fra offentlig vejrbygning; DMI/Copernicus/closure fortsatte. Ingen cache nulstilles og ingen geodatakontrakt ændres på dette grundlag.
4. Nyeste DMI-processing er budgetbegrænset, selv om de officielle 118 filer findes. Bevar og genoptag faktisk gemt progression; det er ikke evidens for upstream-fravær eller credentialfejl.

## Næste handling

Den samlede lokale opfølgning til PR #252 omfatter den rettede CI-reference og en afgrænset CLI-oversigt efter de eksisterende regional-stop. Efter valideret DMI-/Copernicus-grundlag tælles kun post-Copernicus-rester efter forecastoffset, Feggesund/inden for regionalpolitik/udenfor og kildemangelsklasse. Ingen private id-lister eller inputdata udskrives; en fejl i diagnostikken bevarer den oprindelige fejl. Fem syntetiske diagnostiktests og hele eksisterende current-closure-test er grønne. Den præcise aktuelle fordeling måles først i ny runtime og påstås ikke allerede kendt. Ingen generel interpolation, ny regional allowlist, kunstig historik eller ændret target/118-gate indføres.

Normal `33894480067` genbrugte de tre DMI-cacher fra `33891678399` og gemte dem igen under eget run. Ved reference 16Z havde DKSS 12Z 117 VERIFIED i både LF og NSBS; IDW havde 10 VERIFIED/107 LOCALLY_SKIPPED. Hver collection havde nu én UPSTREAM_ABSENT haletime. Det viser faktisk processingfremgang i NSBS, men fortsat budgetstop og den rullende prognosekant. Næste `33894818398` er aktiv. Ingen af disse kørsler beviser fuld vejr- eller strømcache.

Næste er samlet PR-opfølgning, exact-head, sikker merge og stor opfyldning med cachegenbrug. Ejeren har særskilt tilladt at prioritere den klarstående engangskørsel foran ventende normalruns; aktivt arbejde og normal scheduler skal bevares.

Ejerens næste analyse er udtrykkeligt placeret efter opfyldningen: kontroller, at normal drift prioriterer og vedligeholder alle nødvendige vejrtyper, og vurder dens tidsbudgetter og intervaller ud fra faktisk kørselsevidens. Dette er ikke godkendelse til at omfordele eller ændre scheduler blindt før engangskørslen.
