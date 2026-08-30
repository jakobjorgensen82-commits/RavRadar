# RavRadar 4.0.315 – retirement af stale Candidate G-rekonstruktionssti

**Status:** Lokal hotfixkandidat pr. 2026-08-30. Ikke produktionsverificeret.

## Hvorfor releasen er nødvendig

Den planlagte DEC-0109-engangsoperation blev trukket tilbage, før et inspect kunne forsegle en descriptor og før nogen apply eller mutation. 4.0.314 krævede imidlertid fortsat et succesfuldt descriptorbundet apply+Pages-bevis på samme SHA, før normal vejrproduktion måtte bygge. Det bevis kunne aldrig eksistere. Workflowet kunne derfor se grønt ud, mens build, artifact og Pages blev sprunget over.

Offentlig primary blev mere end otte timer gammel, og den komplette measured-only recovery overskred sin absolutte 72-timersgrænse. RavRadar lukkede ærligt med **“Aktuelle data kunne ikke hentes. Gamle data vises ikke.”**, men viste ikke aktuelle eller femdøgnsprognoser.

## Ændring

- DEC-0111 tilbagetrækker DEC-0109 uden anvendelse og forbyder videre eksekvering.
- Den operationelle workflowflade, CLI-aktuator, admin-descriptor og gamle operationstest-/package-/releasegatebindinger pensioneres.
- Apply+Pages-attestationen fjernes fra normal vejrproduktion. Det eksisterende historical exact-D1-job bevares for 4.0.311–4.0.314, men returnerer eksplicit `ready=true` for 4.0.315 og kan ikke blokere hotfixen.
- En negativ retirement-regression skal bevise, at ingen rekonstruktionsinput, steps, actuatorsti, descriptor eller reconstruction-cache findes.
- Normal measured-only gap-checkpoint, continuation og senest-komplet recovery bevares sammen med current-hour-, DMI/Copernicus-, 210/673-, validate-, release-, artifact- og Pages-gates.
- Defensive schema-, trust-, provenance- og turkvalitetslæsere bevares fail-closed. De kan klassificere eksisterende input, men kan ikke skabe syntetisk state.
- Den eksisterende trip-quality workflowtest normaliserer CRLF i den indlæste workflowtekst, så den samme regexgate også kører på Windows. Det er test-only og ændrer ingen produktionssemantik.

## Datastatus og afgrænsning

Ingen descriptor blev forseglet, ingen apply/rollback/cleanup blev kørt, og ingen syntetiske eller interpolerede data blev anvendt eller deployet. Candidate G-formel, RavScore, vejrsemantik, storagekontrakt, geometri, zoner og land-/vandpunkter ændres ikke.

## Krævet bevis før produktionslukning

1. Målrettede retirement-, workflow-, RDKS-, håndbogs-, versions- og releasegates skal være grønne.
2. `validate:source` skal bestå på PR'ens eksakte head.
3. Efter merge skal en frisk normal produktion på den mergede SHA faktisk køre og bestå build, fuld `npm run validate`, `npm run release:gate`, artifact og Pages.
4. Offentlig manifest, startpakke og detaljer skal være friske og konsistente på 210 zoner/673 kystdele, og aktuelle samt femdøgnsprognoser skal kunne vises.

En grøn workflowoversigt med skipped produktion opfylder ikke beviset.
