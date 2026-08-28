# DEC-0095 – Om RavRadar-knappen skal lave en frisk, verificeret forsidenavigation

## Status

Produktionsudgivet i 4.0.298 gennem PR #203, exact-head `33164570642`, merge `077b6fb9`, produktion `33164639052`, build `98827073610` og Pages `98829261896`. Den unikke navigation virker, men offentlig DOM-måling og fysisk iPhone-test viste, at sundhedsværnets kortselector og sekssekundersbudget var fejlbehæftede. 4.0.298 må ikke kaldes fysisk løst; den afgrænsede korrektion står i DEC-0096/4.0.299.

## Problem

4.0.297 blev udgivet gennem grøn exact-head, fuld produktion og offentlig desktopkontrol, men ejerens fysiske iPhone-test fejlede fortsat: kort og prognoser kom ikke frem efter tryk på RavRadars egen tilbageknap inde på **Om RavRadar**.

Den efterfølgende præcisering ændrer fejldiagnosen. Brugeren aktiverer ikke browserens tilbageknap og dermed ikke nødvendigvis en `pageshow.persisted`-retur. Den interne knap var et almindeligt relativt link til `./`, så Safari eller en installeret Hjemmeskærm-app kunne genbruge en eksisterende root-navigation uden at udløse 4.0.297's bfcache-værn. DEC-0094 var derfor korrekt for den hændelse, den dækkede, men utilstrækkelig for den faktisk brugte returvej.

## Beslutning

1. **Om RavRadar**-sidens RavRadar-link peger statisk på `./?return=about&v=<version>`. Linket virker derfor også, hvis sidens JavaScript ikke når at starte.
2. Et umodificeret venstreklik tilføjer en unik tidsnonce og bruger en almindelig `location.assign`-navigation. Safari og Hjemmeskærm-app får dermed en ny root-URL i stedet for at være afhængige af browserhistorik eller en bestemt bfcache-hændelse.
3. Forsiden indlæser et lille, selvhostet returværn synkront i `<head>`, før Leaflet og den asynkrone appopstart. Værnet aktiveres kun ved `return=about`.
4. En vellykket retur kræver synligt Leaflet-kort, fem rækker i **Bedste områder**, fem prognosedagsfaner og fem rækker i den viste **5-dages RavRadar**-dag.
5. Hvis forsiden ikke er komplet efter seks sekunder, udføres højst én ny `location.replace` med `retry=1` og en ny nonce. En fortsat usund retry markeres som fejl og navigerer ikke igen; der kan derfor ikke opstå en reloadløkke.
6. 4.0.297's generelle `pageshow.persisted`-recovery bevares for browserens tilbage-/fremnavigation. Den nye kontrakt er den særskilte fail-safe for det interne Om-link.

## Afgrænsning

Ændringen læser kun offentlig DOM-sundhed og skriver ingen produktdata. Candidate G, RavScore, vejr, prognoseinput, scorer, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter er uændrede. Sibirien forbliver privat staged og uaktiveret.

## Beviskrav

- Målrettede tests skal bevise sund direkte retur uden reload, præcis én timeout-retry, ingen retryløkke og ingen virkning uden `return=about`.
- Kildekontrollen skal låse det statiske fail-safe-link, unik nonce, tidlig head-installation og service-worker-cache af værnet.
- Fuld `validate:source` skal bestå på PR'ens eksakte head.
- Et nyt produktionsartifact skal bestå fuld frisk produktion, releasegate og Pages.
- Offentlig 4.0.298 skal vise farvet kort, fem **Bedste områder** og fem resultater på alle fem prognosedage med fortsat sund, tydeligt markeret Candidate G-nøddrift.
- Ejeren skal efter liveudgivelsen kontrollere **Om RavRadar** → RavRadar på en fysisk iPhone først i Safari og derefter fra Hjemmeskærm-appen. 4.0.298-testen var rød; prøven gentages først efter DEC-0096's produktion. Fejlen må ikke kaldes fysisk løst før begge krævede veje er grønne.
