# Changelog 4.0.270 – før-lancering, ekspert og synlig rangering

## Produktionslukning

- PR #125 bestod exact-head `32728525467` på `3fe579ab`, blev merged som `7861079b`, og produktion `32728654553` gennemførte central håndbogsfletning, fuld validering, releasegate, supportartifact og Pages. Den beskyttede håndbog blev migreret som `source-update` med aktiv Candidate G-readback.
- Den aktive browseraudit havde én forældet testlabel: brugerfladen viste korrekt **Vandstandsændring på 3 timer**, mens 4.0.238-auditten søgte **3-timers trend**. PR #126 retter kun auditkontrakten; brugerflade og score er uændrede.
- Den gentagne fulde liveaudit af 4.0.270 bestod 210 zoner, 673 kystdele, 420 aktuelle visninger og 2.100 femdøgnsvisninger med nul kontrol-, konsol-, side- eller HTTP-fejl.
- PR #126 blev merged som `fda934ae`. Den eksakte mergeproduktion `32730674577` (#3522) bestod hele kæden og udgav Pages-artifact `9521472172` samt supportartifact `RavRadar-support-3522` (`9521463897`).

## Brugerflade

- **Bedste områder** og **5-dages RavRadar** viser nu den korrigerede områdescore, som listerne faktisk sorterer efter, så det højeste viste tal altid står øverst.
- DEC-0049's beskyttelse mod ekstra “lotterilodder” i områder med mange kyststrækninger bevares fuldt ud.
- Forklaringsteksten skelner nu almindeligt mellem områdescoren i toplisten og den bedste kyststræknings RavScore i områdets detaljevisning.

## Administrator og ekspert

- Den første adminoversigt kontrollerer alle fem centrale dokumenter og viser ikke længere en falsk fejl for kystoverstyringer.
- Den centrale eksperthåndbog, reviewkø, rettigheder og relevante adminfunktioner er gennemgået og målrettet testet.
- Begge håndbøger er gennemgået for forældede modeludsagn. Aktuel 20/50/30-model er adskilt tydeligt fra historiske kandidater.
- Ekspertens kodekapitel, scenarier, hypoteseregister og 22-punkts arbejdsplan følger nu den faktiske aktive Candidate G-kode.
- Nye Supabase-installationer får nu hele den aktuelle webhåndbog i stedet for en ældre indlejret kopi.
- Releasegaten kræver nu de aktive Candidate G-spor og kontrollerer den aktive motor særskilt fra 25/40/35-rollback.
- Deploysynkroniseringen trevejsfletter officielle håndbogsopdateringer med allerede godkendte centrale ekspertændringer. En ukendt central håndbog uden tidligere baseline stopper sikkert frem for at blive overskrevet.
- Den første 4.0.270-produktion stoppede netop sikkert, fordi den centrale håndbog var ændret, mens den nye baseline endnu ikke fandtes. PR #123 bestod exact-head `32724526697` og blev merged som `00f59456`; den efterfølgende produktion `32724616331` bestod alle kode-, data- og releasegates, men stoppede før deploy, fordi den slanke Pages-pakke med vilje ikke indeholder håndbogens kildefil.
- PR #124 bestod exact-head `32726897134`, blev merged som `fd7bc868`, og produktion `32727025187` bestod igen alle kode-, data- og releasegates. Hashkontrollen stoppede fortsat sikkert før deploy og viste, at manifestet svarer til den senere produktionsgrønne 4.0.269-dokumentationsmerge, ikke den første 4.0.269-merge.
- Første overgang bruger derfor den seneste 4.0.269-håndbog, som faktisk blev synkroniseret centralt: den uforanderlige commit `fc13fb5ab326d8824ca55235ac454ac230e3db3e` fra grøn produktion `32706573863`. Kilden accepteres kun, når dens SHA-256 matcher det tidligere beskyttede manifest; hentefejl eller hashafvigelse stopper fortsat synkroniseringen.

## Data og drift

- En naturlig produktion, Supabase Free-planens forbrug, fallback, tidsintervaller og vandstandsdiagnostik er kontrolleret uden at vise private data.
- Der er ikke ændret scoretal, farvegrænser, fysisk model, vejrdata, geometri eller land-/vandpunkter.

