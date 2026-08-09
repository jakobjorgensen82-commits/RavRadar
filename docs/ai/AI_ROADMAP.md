# AI Roadmap – RavRadar efter 4.0.117

Roadmappet prioriterer stabilitet og verificerbarhed før nye features. Status skal løbende flyttes til RDKS, når noget implementeres.

## Aktiv P1 – kystgeometri v2-pilot
- Arbejdet følger DEC-0032 og udføres parallelt uden at ændre produktionszoner eller centrale adminoverrides.
- Første leverance er en permanent kilde-/licenskontrakt, v2-skema, national topologi-/navneaudit og tre repræsentative pilotområder.
- Flere lokale kystdele skal vurderes med selvstændig DMI-sampling og provenance; eksisterende multi-ankerretninger er ikke alene et dataprodukt.
- Høfder og andre ravfælder registreres score-neutralt. RavScore ændres ikke som del af geometri-piloten.
- National udrulning kræver særskilt go/no-go efter dokumenteret geometri-, admin-, DMI-, score/state-, runtime- og migrationskontrol.
- GeoDanmark-adgangen køres kun via et manuelt privat pilotjob med `geometry_v2_pilot=true`. #1931 beviste faktiske udtræk fra syv aktuelle lag i tre områder. 4.0.128 lukker den resterende afkortningsrisiko med pagination og privat upload af råfiler; næste trin er komplethedsverifikation og derefter parallel generering.
- Fra 4.0.129 har pilotjobbet sin egen concurrency-gruppe, så 15-minutters vejropdateringer ikke kan erstatte en ventende pilot.

## P0 – ægte Codex-baseline etableret i #1772
- **Første opgave – implementeret lokalt:** workflowets gate-bypass er lukket. En positiv preflight kræver nu `npm run validate` og `npm run release:gate` før artifact; negativ preflight kan fortsat stoppe billigt.
- Auditér de seneste to dages røde push-runs og grønne auto-runs som historik. Grøn topstatus på runs med `skipped` fulde gates er ikke releasebevis.
- **Gennemført:** #1772 på `292b4024…` brugte central admin-geometri og gennemførte frisk data, begge fulde gates, artifact og Pages-deploy med `success`.
- Hvis den strenge kørsel fejler, ret rodårsagen systemisk uden stale data, nulkonvertering, hardcodede zoner eller svækkede audits.
- Femdøgnsdiagnosen fra #1774 er gennemført: public runtime manglede vind i 187/208 zoner og bølger i 33/208, mens 203/208 havde mindst 96 timers marinegrundlag. Balanceret recovery er produktionsbekræftet i #1778/#1779; vind steg til 199/208 zoner med mindst noget data. HARMONIE-kildens native horisont er cirka 60 timer; det er et kilde-/retentionmål, ikke en reduktion af produktets cirka 120-timers mål.
- #1785 bekræftede valg af 18Z frem for et kortere 21Z-run. #1788 produktionsverificerede 48-timersfastholdelsen: 18Z blev bevaret, fire assets blev genbrugt, og den progressive serie voksede fra 4 til 7 behandlede tidspunkter. Fulde gates og deploy bestod.
- Fortsæt måling af workflowtid/schedulerbudget og DMI-coverage uden at svække marine audits.

## P1 – komplette DMI-first femdøgnskæder pr. komponent
- **Status: timeproveniens implementeret lokalt i 4.0.125; frisk produktion og de kendte Limfjord-halehuller er næste gate.** HARMONIE/cache-stabilisering og fuld vinddækning er produktionsbevist; opgaven ligger før P3 RavScore-forskningen.
- **Model efter DEC-0031:** Rutinemæssig overvågning og registrering af allerede definerede LF/NSBS-coverage-målinger kan udføres med GPT-5.6 Terra. Skift til GPT-5.6 Sol før ny faglig kildesyntese, provenance-/fallbackdesign, ændring af datakæden eller endelig kritisk validering.
- **Fase A startet:** `docs/research/DMI_FIRST_FIVE_DAY_SOURCE_AUDIT.md` kortlægger aktuel kode og officielle modelrammer. DMI dokumenterer HARMONIE til 54 timer, WAM til 5½ døgn og DKSS til 5 døgn. WAM/DKSS-vind er derfor første DMI-halekandidater, før ekstern fallback vurderes.
- Kortlæg for vind, bølger, strøm, vandstand, vandtemperatur og alle øvrige aktive score-/forecastkomponenter: nuværende DMI-kilde, native og typisk resterende horisont, runfrekvens, alternative DMI-produkter, lovlig/teknisk anvendelighed, opløsning og kvalitet.
- Design derefter den bedste kæde individuelt: primær DMI så langt den er valid, eventuel anden relevant DMI-kilde som forlængelse og kun ekstern fallback for den resterende hale mod cirka 120 timer.
- Revurdér eksisterende Open-Meteo-fallback fagligt og teknisk; historisk brug er ikke i sig selv et valg.
- Auditér overgangene for spring, tidsforskydning, dubletter, huller, enheder, retninger, stale data og interpolation. UTC og fuld timeproveniens er bindende.
- [x] Udvid diagnostik og pipeline med faktisk intervaldækning pr. komponent/zone samt collection, model-run, lead time, prognosealder, native/interpoleret/fallback-status og native kildetider. Frisk 4.0.125-produktion mangler som endeligt bevis.
- Vurder separat konsekvensen for RavScore, state og UI. Dag 5 må ikke fremstå lige så sikker som dag 1 uden evidens, og missing må aldrig opfindes som nul eller kopieret sidste værdi.
- **Stopregel:** Ingen ny produktionskilde, sammensyning eller scoreændring implementeres før kortlægning, design og regressionplan er dokumenteret og godkendt.

## P1 – vandstandskilder
- Gør forecast/cache-brugbarhed uafhængig af midlertidigt observationsstop.
- Vis observationsstatus, forecaststatus, cache gyldig til og samlet brugbarhed separat.
- Bevar opdagede kilder i registry; vis status frem for at lade dem forsvinde.
- Admin skal vise auto primær/sekundær, reel geodistance, vægte og metode samt tydelig override.
- Auditér Hals/prognosepunkter og end-to-end routing i RavScore, rangliste og femdøgnsvisninger.
- Etabler alarmtærskel for aktive observationskilder, der stopper før forecastcache udløber.

## P1 – Supabase/admin drift
- Reparer **Kontroller nu** under Supabase-lagringskontrollen.
- Test ekspertens håndbogsreview direkte mod Supabase: write, readback, reload og ejerens visning.
- Gør reviewkøen i stand til at slette/arkivere automatiske systemtestposter med auditspor.
- Bevar central autoritet for zonegeometri, regler og routing og udvid propagationstests frem for hardcoding.

## P2 – håndbog og ekspertarbejde
- Gennemarbejd hele håndbogen sprogligt og pædagogisk i almindeligt dansk.
- Omskriv ekspertens valideringsmatrix, så hvert punkt forklarer betydning, nuværende RavRadar-adfærd, usikkerhed, konkret ekspertspørgsmål og mulig effekt på regel/score.

## P2 – historisk state og faglig validering
- Bevar skyggetilstanden score-neutral, indtil faktiske produktionsdata og ekspertvalidering viser, at den er robust.
- Når et numerisk transportbidrag senere introduceres, gør det gradvist, versioneret, forklarligt og med regressionssammenligning.
- Bevar eksisterende pålidelige morfologidata; kræv ikke manuel landsdækkende morfologikortlægning.

## P2 – performance
- Bevar/udbyg startupmålinger for page load, JS-init, manifest/data fetch, parsing, scoreberegning og maprendering.
- Hold tunge state-/historikberegninger i pipeline og send kompakte præberegnede data til public klient.

## P3 – planlagt videnskabelig forskningsrunde og RavScore-modelvalidering
- **Status: registreret, må ikke startes endnu.** Afhænger af afsluttet/klart afgrænset forecast- og schedulerstabilisering samt de højere P0/P1-opgaver.
- **Model efter DEC-0031:** Centrale forskningsfaser, synteser, evidenskonflikter, hypoteser, RavScore-vurdering og slutkonklusion udføres med GPT-5.6 Sol. Terra må kun bruges til klart afgrænsede mekaniske støtteopgaver uden tab af faglig kvalitet.
- Opbyg et permanent forskningsgrundlag i `docs/research/RAVSCORE_RESEARCH_EVIDENCE_BASE.md` baseret primært på peer-reviewed forskning, universiteter, myndigheder, oceanografi, hydrodynamik, kystteknik og sedimenttransport.
- Hold frigivelse, transport, koncentration/aflejring og jagtbarhed analytisk adskilt; kortlæg derefter deres samspil og tidsrækkefølge som en samlet fysisk systemmodel før score og vægte vurderes.
- Auditér den faktiske RavScore-kode regel for regel for korrekt mekanisme, input, tids-/geografiafhængighed, evidensstyrke, overlap og risiko for dobbelt-tælling.
- Udarbejd evidensmatrix og klassificér anbefalinger som `BEVAR`, `FORBEDR`, `TEST`, `NY MEKANISME`, `FJERN/NEDVÆGT` eller `UTILSTRÆKKELIG EVIDENS`, samt forslag i evidensklasse A–D.
- Gennemfør en særskilt analyse af punktstrøm kontra opstrøms transporthistorik, rumlige strømfelter, konvergens/divergens, persistente transportkorridorer og det historiske begreb “strømbånd”. Det aktuelle produktionsforbud består, indtil stærk evidens, ikke-redundans, validering og særskilt godkendelse eventuelt begrunder noget andet.
- Design senere validering mod strukturerede fundrapporter, ekspertvurderinger, historiske DMI-forløb, referenceperioder og kontrollerede backtests med selection bias eksplicit behandlet.
- **Stopregel:** Fase A–D er analyse uden produktionskode. Ingen scoremekanisme, vægt eller nyt datalag må aktiveres automatisk; fremlæg først samlet model, usikkerheder, eksperimenter og prioriterede forslag til særskilt godkendelse.
- Hvis senere godkendte mekanismer kræver tunge rumlige/historiske beregninger, udføres de i pipeline og sendes kompakt til klienten. Der konstrueres aldrig manglende data.

## Ikke-roadmap / forbudte genveje
Roadmappet må aldrig opfyldes ved at genindføre stale data, regionale strømbånd, falske nulværdier, hardcodede administratorzoner eller ved at gøre audits svagere.

Den planlagte P3-forskning må undersøge, om rumlige strømstrukturer har selvstændig fysisk informationsværdi. Det er ikke tilladelse til at genindføre regionale strømbånd i produktionen; den nuværende bindende regel gælder, indtil en senere eksplicit beslutning eventuelt erstatter den.
