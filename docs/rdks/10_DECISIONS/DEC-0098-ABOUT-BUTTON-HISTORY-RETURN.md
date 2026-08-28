# DEC-0098 – Om-knappen skal udføre en rigtig historikretur

## Status

Implementeret som lokal 4.0.301-kandidat efter ejerens røde fysiske Safari-test på bekræftet version 4.0.300. Målrettede historik-, resume-, startup-, ydelses- og versionskontroller er grønne; exact-head, produktion, offentlig runtime og fysisk iPhone-test afventer.

## Problem

4.0.300 gendannede det statiske `./`-link fra 4.0.292, men det var ikke den mekanisme, som tidligere var verificeret. 4.0.292's dokumenterede 390-pixel-prøve brugte **browserens tilbagefunktion**. Et almindeligt link til `./` opretter derimod en ny navigation og udløser ikke nødvendigvis `pageshow.persisted` eller appens eksisterende redraw.

Den offentlige 4.0.300-side bekræfter, at **Om RavRadar** modtager den fulde samme-origin-referrer fra forsiden. Knappen kan derfor sikkert vælge en rigtig historikretur, når brugeren kom fra RavRadar, uden at antage noget om direkte åbnede Om-sider.

## Beslutning

1. Det statiske link forbliver `./`, så direkte åbnet Om-side og deaktiveret JavaScript altid har en fungerende fallback.
2. Ved et almindeligt primært klik kontrolleres `document.referrer` mod den kanoniske samme-origin-forsidevej. Queryparametre ignoreres, og `/index.html` sidestilles med `/`.
3. Kun når referreren er den faktiske RavRadar-forside, forhindres linkets nye navigation, og `history.back()` udføres. Det rammer samme historik-/bfcache-retur som den tidligere beviste browsertilbage.
4. Ved tom, ugyldig, fremmed eller anden referrer samt modificerede klik overtages navigationen ikke; browserens almindelige `./`-link bruges.
5. Den eksisterende `pageshow.persisted`-handler genoptegner fortsat kort, zonefarver, **Bedste områder**, valgt zone, femdøgnsprognose og pile. Ingen timer, reload eller DOM-watchdog tilføjes.

## Afgrænsning

Ændringen er kun browserhistorik og read-only genoptegning. Candidate G, RavScore, vejr, prognoseinput, scorer, bestetid, sortering, konto-/turdata, privatliv, assistent/Edge, geometri og land-/vandpunkter er uændrede. Sibirien forbliver privat staged og uaktiveret.

## Beviskrav

- En isoleret kontrakt skal bevise samme-origin root/referrer, `/index.html`, query, direkte åbning, fremmed referrer og modificeret klik.
- Den statiske `./`-fallback og fravær af `location.assign`/`replace`/`reload` skal låses.
- Eksisterende bfcache-redraw og 4.0.295/296-startup-/ydelseskontrakter skal bestå.
- Fuld `validate:source` skal bestå på PR'ens eksakte head, efterfulgt af frisk produktion, releasegate og Pages.
- Offentlig kontrol skal bevise 4.0.301, referrerforudsætningen, 210 kortzoner, fem aktuelle områder og fem rækker på alle fem prognosedage efter den interne knap.
- Ejeren skal til sidst bekræfte den interne knap på fysisk iPhone Safari; derefter testes Hjemmeskærm særskilt. Fejlen er åben indtil den fysiske prøve er grøn.
