# RavRadar 4.0.332 – gyldig prognosehorisont frem for kunstig aldersstop

**Status:** Ejerbesluttet og lokalt implementeret releasekandidat 2026-09-07. Målrettede kontrakttests for de ændrede kodeveje er grønne. Exact-head-CI, merge og positiv komplet produktionsruntime er fortsat åbne.

## Tilgængelighed og udgivelse

- En strukturelt valid current-/future-række er brugbar, uanset hvornår den blev hentet eller genereret, så længe dens eksakte prognosetime ligger i det forseglede vindue og pakkens `validUntil`/`operationalRangeEndAt` ikke er passeret.
- De tidligere 90/150/240-minutters targetgrænser klassificerer nu alene `FRESH` eller `STALE_TARGET_VALID` og giver advarsel. De må ikke gøre valide fremtidstimer missing eller blokere artifact, deploy eller modelcutover.
- Den eksakte sidste prognoseinstant er gyldig. Først én millisekund efter `validUntil`/`operationalRangeEndAt` er pakken udløbet og utilgængelig.
- Den gamle absolutte 72-timersgrænse for same-model emergency/public runtime og continuation er supersederet. Alder er fortsat synlig som nød-/confidence-advarsel, og emergency-/historikufuldstændige ture og observationer er ikke kalibreringsegnede. Udløbet horizon, ukendt identitet, hashfejl, modelmismatch, ufuldstændighed eller manipulation stopper fortsat fail-closed.
- Et nyt vejrartefakt kræver stadig præcis `673 × 118 = 79.414` entydigt klassificerede operationelle par, nul overlap og nul missing. Alderslempelsen er ikke en completeness-, provenance- eller privacylempelse.

## Kontrolleret første modelcutover

- En afsluttet grøn 118-timerskørsel kan forsegle de fem eksakte private weather-source-cacher som et run-/attempt-/main-head-/runner-/registry-/closurebundet handoff. Det offentlige artifact indeholder kun en aggregeret privacy-safe attestering; private rækker og vektorer ligger i den eksakte Actions-cache.
- Første integrerede modelcutover kan med ejerens eksakte manuelle bekræftelse og run-id hente netop denne producentkørsel, verificere repository, workflow, event, branch, head, attempt, artifactdigest, cachekey, filinventar og hver inputhash, installere kilderne atomisk og genbygge closure.
- Den genbyggede closure skal matche handoffets target, registry, source counts, closure-id og safe projection eksakt. Handoffet udløber ved vejrpakkens egen sidste prognosetime; ved udløb eller mismatch hentes der ikke tværs over runs eller caches.
- `update:weather` og de almindelige generelle vejrkald forbliver bounded. Handoffet undgår alene en unødvendig ny lang providerindsamling under den kontrollerede cutover; det omgår ikke central hydrering, modelbyg, kapacitet, fuld `validate`, `release:gate`, artifactkontrol, Pages eller offentlig verifikation.

## Granulær cachebevarelse

- DMI, Copernicus og Open-Meteo fejler fortsat lukket på ulæselig JSON, topidentitet, target-/registrybinding eller anden autoritativ control-plane-korruption.
- En parsebar cache med en lokalt ugyldig acquisition, record, zone, time, komponentkilde eller gitteropsummering mister kun den berørte proof-enhed. Dens værdier/proof fjernes samlet, den konkrete position bliver et ærligt hul, og canonical hashes, seals, ledgers og source-stage genbygges fra de tilbageværende positive beviser.
- En defekt leaf må aldrig skabe positiv availability, men må heller ikke nulstille uafhængige verificerede par. En nyere fuldt verificeret tuple fra en højere prioriteret kilde erstatter fortsat en ældre tuple atomisk; indtil da forbliver den ældre horizon-gyldige tuple brugbar.

## Historik og offentlig status

- Manglende 48-timers mobiliserings-/transporthistorik gør ikke zoner eller fremtidsscorer utilgængelige. Alle 210 zoner skal fortsat være aktive med numeriske `FULL_HISTORY`-/`HISTORY_INCOMPLETE`-optællinger, forklarende reason codes, konservative bounds og `calibrationEligible=false`, hvor historikken er ufuldstændig.
- Admins sitetest behandler en gammel, men stadig eksakt verificeret og horizon-gyldig pakke som warning, ikke som falsk rød utilgængelighed.

## Runtimeevidens og åbne forhold

- 4.0.331-run `34083611297` nåede `78.856/79.414`, efterlod `558` missing og deployede ikke. Det er positivt progressionsbevis, men ikke kompletheds- eller releasebevis.
- Run `34093354004` sluttede sikkert efter et succesfuldt Copernicus-led. Open-Meteo havde 2.735 krævede par, bevarede 1.873, hentede 750 og udfyldte samlet 2.623; præcis 112 kritiske par manglede fortsat. Cachen blev gemt, men closure, artifact og deploy skete ikke.
- Run `34104536681` er aktivt på eksakt `main` `c2ce63ff`. Det normale workflow er fortsat deaktiveret.
- Det normale workflow forbliver deaktiveret under den kontrollerede cutover. Genaktivering følger ejerens plan efter den konkrete modelrelease.
- Kildeoverganges eventuelle scorehop og behov for overlap/hysterese samt en varig, immutable historik med flere komplette weather-artifacts er separate post-launch-issues. De er ikke skjult implementeret i 4.0.332.

Se `docs/rdks/10_DECISIONS/DEC-0119-HORIZON-VALID-WEATHER-AND-RUN-BOUND-CUTOVER.md`.
