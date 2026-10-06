# Jordrav – samlet design og betjening, 6. oktober 2026

Status: lokal designkandidat 4.0.545. Offentlig forgænger: 4.0.544.
Exact-head CI, merge, kode-only publicering og internetkontrol følger.

Ejeren oplever siden som utilstrækkeligt indbydende og intuitiv og bestiller
»den helt store omgang, hele vejen rundt«. Det omfatter hele Jordravsidens
navigation, kortværktøjer, lag, farveforklaring, områdepanelet, guider,
metode og mobilbetjening. Kystprognose og andre produktflader er uden for
designopgaven. Ingen eksisterende kortfunktion er ejerfravalgt.

## Gennemført ændring

| Før | Designkandidat |
| --- | --- |
| Værktøjer neden for kortet | Baggrund, Danmarksoverblik, deling og lagpanel ved kortets top |
| Mange detaljer på samme niveau | Mulighed, uafklaret jagtbarhed og ravhistorie først; uddybning kan åbnes |
| Regioner som en sen indgang | Synlig indgang på desktop; kompakt regionsvalg før kortet på mobil |
| Lang vej fra mobilkort til forklaring | Valgt sted viser en knap, som ruller til og fokuserer forklaringen |
| Spredte lagvalg | Geologi, marker og supplerende kilder samlet i et rulleligt panel |
| Tæt faktavisning | Fem kildefakta i læselige blokke under Geologisk grundlag |
| Generisk visuel struktur | Mørk blågrøn navigation, varm baggrund, klarere typografi og roligere kort |

Almindeligt kort og luftfoto er synlige, uafhængige baggrunde. Lagpanelet
bruger native `details`, labels og fieldsets. Enter/Tab fungerer; Escape,
klik udenfor og tastaturnavigation ud lukker panelet. Fokus returnerer til
lagknappen ved Escape. Betjeningsflader er mindst 44 px for hovedhandlinger.
Et springlink fører tastaturbrugeren til kortet. Ingen fokusfælde indføres.

Regionens historie kan åbnes særskilt. Vis på kortet bevarer den eksisterende
kø for en regionsændring under et igangværende kortzoom. Mobil ruller til
kortets start, når navigationen gennemføres. Den tidligere ekstra
center-rulning er fjernet på mobil, så den ikke modarbejder den nye handling.

Et områdeklik bevarer alle fakta, materialer, lagadgangsplaner, 27
landskabsforløb, fem evidenskædeled, usikkerheder og kildelinks. Materiale-
vejledning, lagadgang og geologisk grundlag er foldbare. JB-opslaget gælder
fortsat kun det konkrete kliksted. Boringer og registrerede profiler har
deres egne forklaringer. Nye valg starter øverst i desktop-panelet.

Alle nye brugerord findes på DA/DE/EN. Geologiske polygonfarver og lilla
dybdemarkører bevares. Kortfarvernes forklaring ligger under kortet;
markguide og metode ligger som foldbare læsekort længere nede.

## Funktioner og faglige grænser

Datasæt 0.2, 192 udsnit, 4.652 kombinationer og 505.834 fragmenter ændres ikke.
De 16 profilpunkter/126 rækker, deres kildebinding og manglende oplysninger
bevares. Ingen ny geologisk grænse, ravrangliste, RavScorebonus eller lokal
pløjedybde indføres. Alle opt-in-kilder er fortsat opt-in.

Muligheder er egne geologiske slutninger, ikke validerede fundsteder.
Ufarvet geologi er vurderet uden særskilt procesudpegning. Jagtbarhed er
uafklaret på materialeflader; lilla dybe eksempler er ikke umiddelbart
tilgængelige. Dybdeinterval og totaldybde sammenblandes ikke.

Punkt 4 om automatisk dagens nypløjede/bare/regnvaskede marker er udgået
efter ejerbeslutning. Ældre kort og luftfoto bliver ikke aktuelle feltmålinger.
Der påstås ingen fysisk telefonprøve. Den tidligere 4.0.544-layoutbeskrivelse
er erstattet; dens geologiske analyse og historiske testbeviser består.

## Kontrol

99 eksisterende faktiske Chrome-regressioner er genkørt i særskilte
designrapporter: nationalt kort (20), marker/materialer (8), gemte
visninger (15), lagadgang (13), landskabsforløb (34), offentlige kilder
og profiler (9). Testene åbner de nye native paneler gennem faktiske
UI-handlinger. Ingen tvungne klik eller produkt-DOM-ændringer omgår lagpanelet.
De ældre rapporter for 4.0.544 er ikke overskrevet.

`scripts/test-jordrav-design-browser.mjs` tilføjer seks samlede UX-forløb
i faktisk Chrome på uændrede produktfiler, uden injiceret testharness:
primære handlinger, tastatur/lukning, områdeklik og læsbare fakta,
mobilens forklaringsknap, regional navigation samt DA/DE/EN ved
360/390/768/1024 px. Rapporten binder HTML, CSS og alle Jordravmoduler
med SHA-256. Screenshotkontrol er selvstændig visuel evidens.

Den lille kildegate består med 118 browserfiler og Jordravs målprøver.
RDKS, begge håndbøger, versionsbinding, privacy, modulclosure og isolation
skal bestå før PR. Kystdata/zones kræver en særskilt diff med alene
topversionsløft. CI skal kontrollere det endelige eksakte PR-head.
Kodelevering følger DEC-0148 med eksakt runtimegenbrug uden vejrhentning.
Aktiv produktion må afsluttes, før main ændres.

Udviklingsfejl i browserhelperens håndtering af en nested summary og et
testklik dækket af et åbent lagpanel er rettet i testforløbet. Den reelle
dobbelte mobilscroll er rettet i produktet og genkontrolleret. De er ikke
geologiske/datafejl eller begrundelse for at omgå tests.
