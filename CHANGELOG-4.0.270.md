# Changelog 4.0.270 – før-lancering, ekspert og synlig rangering

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

## Data og drift

- En naturlig produktion, Supabase Free-planens forbrug, fallback, tidsintervaller og vandstandsdiagnostik er kontrolleret uden at vise private data.
- Der er ikke ændret scoretal, farvegrænser, fysisk model, vejrdata, geometri eller land-/vandpunkter.
