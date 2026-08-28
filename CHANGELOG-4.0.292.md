# RavRadar 4.0.292

## Sikker flytning af land-/vandpunkter

- Et redigeret punkt bliver nu en isoleret kandidat; det eksisterende punkt fortsætter uændret i produktion.
- Kandidaten forhåndsvalideres privat på DMI's eksakte fælles U/V-grid, samler fuld 96-timers vejrhorisont og opbygger sin egen 48-timers Candidate G-hukommelse.
- READY er kun information. Ejeren skal særskilt bestille aktivering, hvorefter den eksakte kandidat bygges og valideres gennem alle gates før et atomisk, versionskontrolleret centralt skift.
- Kandidatkoordinater og rå DMI-værdier forbliver i `.cache`; den offentlige adminstatus viser kun revision, fremdrift og årsagskoder.
- Det tidligere aktive punkt bevares til rollback og kan genindsættes efter et deployproblem. Den komplette senest verificerede nødvisning accepterer desuden højst seks lokale warmups uden at blande gamle og nye zoner.
- Ingen eksisterende punkter eller geometri flyttes i denne version. Se DEC-0090.
- Gør punktstaging-testens syntetiske reference eksplicit, så workflowets låste produktionstime ikke kan ændre testfixturet. Første post-merge-kørsel stoppede derfor sikkert før DMI og deploy; hotfixen ændrer ikke runtimevalget af produktionstime.
- Opdaterer schedulerens kildekontrakt til den nye tilsigtede nævner: aktive zoner og kystdele tæller, mens vandkilder, forskningspunkter og private punktkandidater ikke tæller. Den målrettede test indgår nu i punktstagingens PR-kildegate.
- Gør schedulerens adfærdstest selvstændig før de dyre DMI-afhængigheder installeres; ubrugte `requests`/`urllib3`-overflader stubbes lokalt, mens den virkelige schedulerfunktion fortsat importeres og testes.

## Mobil retur til forsiden

- Retter den Safari-/mobilklasse, hvor retur fra **Om RavRadar** kunne gendanne en halvfærdig forside fra browserens back/forward-cache og efterlade kort, **Bedste områder** og **5-dages RavRadar** tomme.
- Installerer et tidligt værn før asynkron bootstrap. En ufuldstændig eller afbrudt opstart genindlæses automatisk og rent.
- En færdig forside genoptages uden nye data: Leaflet-layout, zonefarver, rangliste, valgt zone og femdøgnsvisning gengives idempotent fra den eksisterende offentlige tilstand.
- Samtidige genoptagelser samles, og enhver genoptegningsfejl falder fail-safe tilbage til ren genindlæsning.
- Tilføjer en deterministisk livscyklustest og bevarer de eksisterende mobil-, første-paint-, progressive prognose- og modulversionskontrakter.

Candidate G 20/50/30, vejr, prognoseinput, sortering, konto-/turdata, privatliv, geometri og de faktiske land-/vandpunkter er uændrede. Geodatafilerne ændrer kun topversionsfeltet. Se DEC-0089 og DEC-0090.

## Produktionsverifikation

- PR #192 bestod exact-head `33127353135` på `e555680f`, blev merged som `d22d0867` og gennemførte produktion `33127437790`, build `98708851478` samt Pages `98711255270`.
- Offentlig 390 × 844-kontrol bestod **Om RavRadar** → tilbage med synligt kort, alle 210 zoner i scorefarver, fem **Bedste områder**, fem færdige 5-dagesresultater og nul konsolfejl/advarsler.
- Dansk, tysk og engelsk skifter korrekt, og Spørg RavRadar viser den godkendte daglige kvotetekst samt isolation fra prognoser og RavScore.
- Offentlig punktstatus er tom og saniteret med automatisk aktivering slået fra. Ingen kandidat, koordinat, rå U/V, faktisk punktflytning eller promotion indgik.
- Den nye primær er fortsat i ærlig 0/673 `READY` warmup; den komplette tidligere prognose leverer atomisk og tydeligt markeret, indtil de virkelige 48 timer er modne.
