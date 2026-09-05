# DEC-0115 – Open-Meteo lukker kun validerede operationelle strømhuller

- **Status:** Ejerbesluttet, bindende og lokalt implementeret/måltestet; exact-head, merge og frisk runtimebevis afventer
- **Dato:** 2026-09-05
- **Ejer:** RavRadar
- **Supplerer:** DEC-0030, DEC-0041, DEC-0112 og DEC-0114
- **Erstatter snævert:** tidligere aktive formuleringer, som ubetinget udelukkede Open-Meteo-current efter den regionale DMI-vej. Alle øvrige krav til DMI-first, fysisk semantik, provenance, privacy, 673 × 118 og fail-closed publicering består.

## Beslutning

1. Den eksakte operationelle prioritet for hvert `(partId, validTime)` er DMI DKSS, Copernicus Baltic, Copernicus AMM15, den allerede godkendte regionale DMI-vej for dens præcise otte policydele og derefter Open-Meteo for alle resterende operationelle huller.
2. Open-Meteo må kun kaldes, når DMI-terminalen og Copernicus source-stage er fuldt validerede som `READY`. Timeout, fejl, `IN_PROGRESS`, manglende disposition eller budgetstop er ikke udtømning og kan aldrig åbne fallback eller publicering. Valideret delvis Copernicus-fremgang må gemmes og genoptages i en senere kørsel.
3. Den regionale bygger må kun modtage de rester, som ligger i dens otte-delspolitik. Rester uden for politik sendes ikke gennem den regionale builder; de bevares til Open-Meteo. Denne partition retter den konkrete situation med 984 rester, hvor 944 var policypositioner og 40 lå udenfor.
4. Open-Meteo bruger alene den dokumenterede `meteofrance_currents`-model og et fælles, komplet speed/direction-par fra samme punkt og time. Retningen er strømningens **toward**-retning og omregnes deterministisk til øst/nord-komponenter. Maksimal afstand er 15 km. Records bindes til `eulerian-waves-and-tides-combined-surface-current` og `combined-current-single-channel-no-wave-or-tide-reprojection-v1`.
5. Kilden er et kombineret overfladestrømsfelt, ikke lokal bundstrøm, ripstrøm eller et separat tide-/bølgebidrag. Den må kun levere currentkanalen. RavScore må ikke projektere bølge eller tidevand ud af feltet eller lægge et sådant bidrag oven i de eksisterende bølge-/vandstandsled. Alle timer, states, ture og observationer, der afhænger af denne kilde, har `calibrationEligible=false`.
6. Fallbacken må kun udfylde `productionTarget..productionTarget+117 h`. Den må ikke opfinde target−48..target−1-historik, interpolere, carry-forwarde, låne en nabodel eller genbruge en anden time. Ufuldstændig historik giver fortsat `HISTORY_INCOMPLETE`, men blokerer ikke en ellers gyldig direkte prognose.
7. En senere kørsel lader automatisk DMI, Baltic, AMM15 eller godkendt regional DMI vinde over Open-Meteo på samme eksakte par. Open-Meteo bliver ikke en ny offentlig leverandøretiket; intern provenance og sikker, aggregeret diagnostik bevares, mens koordinater, id-lister og rå U/V ikke logges eller publiceres.
8. Slutgaten kræver fortsat præcis 79.414 positioner, én kildeklasse pr. position, nul overlap og nul missing. Fejl, nulls, ufuldstændige batches, fysisk scope-drift eller provenancefejl stopper det nye build og bevarer seneste komplette offentlige artifact.

## Driftstid og friskhed

Normal drift og engangsopfyldning bruger samme kilde- og sikkerhedslogik, men forskellige bounded rammer. Normal Copernicus får højst 360 sekunder og Open-Meteo højst 240 sekunder. Forecasttarget må højst være 90 minutter gammelt efter leverandørleddene og 150 minutter gammelt før beskyttede writes/artifact. Engangsopfyldning får højst 3.300 sekunder til Copernicus, 900 sekunder til Open-Meteo, et samlet jobloft på 200 minutter og højst 240 minutter gammelt target efter leverandørleddene.

Den normale 15-minutters plan ændres ikke på forhånd. Efter den første komplette engangskørsel måles varighed, rækkefølge, cachegenbrug og bidrag fra DMI, Baltic, AMM15, regional DMI og Open-Meteo. Budgetter eller scheduler ændres kun på konkret evidens; friskhedsgaterne forhindrer i mellemtiden et langt gammelt snapshot i at blive publiceret.

## Binding og migration

Den nye fysiske provenance ændrer de transitive modelbundter. Gældende lokale hashes er integrated `b7ac1e2b180ede66c25fcc764b344390969a772dcfbc846194166290b2430147`, Candidate G-rollback `7f5f6c93649b93f6a61892b31811c57603ff6c3a0a47cc218deae39c87960484` og continuation `08f0a635a0460c2afe196200e7b786245608f006624b17d984cac1ae603fd48f`. Append-only migration `20260905090000_open_meteo_current_fallback_binding.sql` fremfører kun disse bindinger og readbackversionen. Ældre migrationer ændres ikke.

## Evidensstatus

Seneste sikre optælling er 79.414 samlede operationelle positioner, 78.430 dækket af DMI/Copernicus og 984 rester. Af resterne er 944 i den eksisterende regionale politik og 40 udenfor, alle 40 ved sidste forecasttime. Den nye kode og måltests lukker kontraktfejlen lokalt; tallene er ikke et nyt komplet runtimebevis. Første rettede main-engangskørsel skal genmåle dem og bestå hele 673 × 118-gaten.

