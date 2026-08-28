# DEC-0098 – Om-knappen skal udføre en rigtig historikretur

## Status

Produktionsverificeret og fysisk godkendt i 4.0.301. PR #206 bestod exact-head `33172111444`/job `98851532431` på `f1ca4677`, blev merged som `21aac8f6` og gennemførte grøn produktion `33172186373`, build `98851836126` samt Pages `98854056109`. Ejeren bekræftede derefter på fysisk iPhone Safari, at den interne RavRadar-knap viser kort og prognoser korrekt.

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
- Den offentlige interne knap var komplet på cirka 1,27 sekunder med 210 kortzoner, fem aktuelle områder og fem rækker på alle fem prognosedage og forblev stabil efter otte sekunder.
- Ejeren bekræftede den samme rejse grøn på fysisk iPhone Safari 28. august 2026. Hjemmeskærm kan fortsat efterkontrolleres særskilt, men den rapporterede Safari-fejl er lukket.
