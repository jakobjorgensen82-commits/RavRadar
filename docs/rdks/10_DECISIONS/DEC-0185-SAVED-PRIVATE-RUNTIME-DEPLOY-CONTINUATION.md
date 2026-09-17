# DEC-0185 – Gemte, validerede vejrdata må fortsætte uden nye providerkald

**Status:** Aktiv og bindende; 4.0.403 bestod exact-head, første liveforsøg
afgrænsede tidsformatkanten, og 4.0.404-livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.402 bestod exact-head `35203813380`, blev merged gennem PR #346 som
main `0132900c2d9ae6770c910e12579dabf32e316768` og blev leveret
providerfrit i `35204369048`.

Den almindelige vejrkørsel `35205052150` gennemførte DMI, Copernicus,
Open-Meteo, cachelagring, closure, historik, offentlig runtime, den
uafhængige runtimeaudit samt de 52 artifact- og tre releasekontroller.
Den nye private produktionsruntime for `2026-09-17T09:00:00Z` blev derefter
gemt centralt med sin beskyttede rollbackgeneration.

Kørslen stoppede først bagefter i synkronisering af beskyttede adminaktiver.
Scriptet kaldte den ikke-definerede funktion `stableDigest`, da det skulle
sammenligne aktiveringsdokumentets readback. Pages blev derfor ikke nået.
Fejlen ændrer ikke den allerede validerede og gemte vejr- og scorepakke.

## Beslutning

1. Den stabile kanoniske JSON-sammenligning eksporteres som
   `stableJsonDigest` og bruges både af håndbogs- og aktiveringsreadback.
   Indholdsforskel skal fortsat stoppe.
2. Det providerfrie reparationsworkflow får en særskilt, eksplicit
   `saved-weather-continuation`. Standardens almindelige code-only-rute
   ændres ikke.
3. Fortsættelsen må kun bruge den nyeste centralt beskyttede private runtime,
   når dens produktionstime er strengt nyere end den offentlige, højst 240
   minutter gammel og dens kildecommit er forfader til den nye main-head.
4. Ruten kræver den aktive integrerede model, tomt offentligt repair-id,
   præcis 210 zoner og 673 kystdele, samme geometri, fuld privacy-audit og
   en offentlig runtime, som identitetsmæssigt svarer til den beskyttede
   runtime.
5. Hvis den gemte runtime har den foregående kildebinding, bruges den
   eksisterende afgrænsede predecessor-migration. Målinger og vejrdata må
   ikke genhentes eller ændres under denne genbinding.
6. Fortsættelsen må ikke kalde DMI, Copernicus, regional DMI eller
   Open-Meteo. Den normale Pages-freshness, artifactlukning og deploykontrol
   består som hårde krav.
7. Der køres én exact-head sourcegate på 4.0.403. Efter merge køres kun den
   særskilte gemte-vejr-fortsættelse; der startes ingen ny oneoff eller
   almindelig vejrindsamling for at gentage allerede udført providerarbejde.

## Risiko og afgrænsning

Ruten er kun en manuel fortsættelse af en runtime, som den normale
produktionskæde allerede har bygget, auditeret og gemt. Den er ikke en
generel mulighed for at udgive vilkårlige cacher eller gamle artifacts. Alle
identitets-, alder-, kilde-, privacy-, zone-, kystdels-, artifact- og
deploykrav er hårde. Ved afvigelse stopper ruten før offentlig udgivelse.

## Første liveforsøg

4.0.403 bestod exact-head 35214029193 og blev main c685c83d. Deploy
35214668708 stoppede før writes og Pages, fordi descriptorens gyldige
09:00:00.000Z skulle normaliseres til freshness-kontraktens kanoniske
09:00:00Z. DEC-0186 retter kun denne grænse og håndhæver fortsat FRESH under
240 minutter.
