# DEC-0099 – Første service-worker-overtagelse må ikke genindlæse koldstarten

## Status

Implementeret som lokal 4.0.302-kandidat efter reproduceret cirka 14 sekunders førstegangsindlæsning i både ejerens iPhone Safari og en frisk offentlig browserkontrol. Målrettet service-worker-, startup-, mobilresume- og ydelseskontrakt samt fuld lokal `validate:source`/releasegate er grøn; exact-head, produktion, offentlig koldkontrol og fysisk efterprøve afventer.

## Problem

4.0.301 lukkede Om-returfejlen fysisk, men det første besøg var stadig markant langsommere end nye faner. Den offentlige kode registrerede service workeren efter første load. Workerens `activate` kaldte `clients.claim()`, hvilket ifølge den officielle browserkontrakt udløser `controllerchange` for en åben side, som bliver kontrolleret. Appen reagerede ubetinget på enhver `controllerchange` med `location.reload()` og kørte derfor den dyre første opstart igen.

Startkæden afventede desuden hele zone-/kystdelsgrenen, før manifest og prognosestart overhovedet blev hentet. De to netværksgrene er uafhængige, men blev kørt sekventielt.

## Beslutning

1. Siden registrerer, om den allerede havde en service-worker-controller. Den første overgang fra ukontrolleret til kontrolleret side efter `clients.claim()` accepteres uden reload.
2. En senere `controllerchange` på en allerede kontrolleret side genindlæser fortsat præcis én gang, så en rigtig ny version overtages sikkert.
3. `clients.claim()`, versionskontrol, `SKIP_WAITING`, cacheversionsskifte og updatebanner bevares.
4. Manifesthentning og den deraf afledte prognosestarthentning startes parallelt med zone-/kystdelsgrenen. Den synlige initialiseringsrækkefølge forbliver zoner, manifestkontrol, prognoser, farver, top-5 og fem dage.
5. Ingen timeout, automatisk retry, geometriudsættelse eller ny fallback tilføjes.

## Evidens og afgrænsning

- Ejerens og den friske browserkontrol reproducerede cirka 14 sekunders første load; efterfølgende faner var hurtige.
- Dataminimeret produktionsmåling viste, at de offentlige startgrene er reelle netværksomkostninger, men den afgørende dobbelte start kom fra den ubetingede controller-reload. Komprimering og efterfølgende cachegenbrug fungerer allerede.
- Den isolerede kontrakt beviser: første claim nul reloads, efterfølgende opdatering én reload, allerede kontrolleret side én reload og parallel start før den tunge zonegren afventes.
- Candidate G, RavScore, vejr, prognoseindhold, sortering, konto-/turdata, privatliv, service-worker-cacheindhold, geometri og land-/vandpunkter er uændrede. Sibirien forbliver privat staged og uaktiveret.

## Beviskrav

- Målrettet cold-start-, mobilresume-, Om-retur-, modulversions-, RDKS- og releaseversionskontrol skal være grøn.
- Fuld `validate:source` skal bestå på PR'ens eksakte head; derefter kræves frisk produktion, releasegate og Pages.
- Offentlig 4.0.302 skal fortsat vise 210 kortzoner, fem aktuelle områder og fem rækker på alle fem prognosedage samt bestå Om → RavRadar-retur.
- En fysisk eller ellers reelt cachekold browserprøve skal bekræfte, at første installation ikke længere udfører en ekstra automatisk reload. Ingen løsningserklæring for koldstarten før dette bevis.
