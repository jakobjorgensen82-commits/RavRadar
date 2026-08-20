# P1: timeskarp reference i verificeret stroemhistorik

Dato: 2026-08-20  
Fundet i: naturlig produktion `#3242`, datasæt `rr-20260819235244-210`  
Status: kode- og regressionstestet kandidat; frisk central produktion mangler.

## Produktionsbevis

`#3242` har 64 raa `samples72h`-proever i alle 210 zoner over 30,903 timer. 198 hovedzoner har samtidig verificeret aktuel DMI-stroem. Alligevel stod de nye proever ved 22:00 og 23:00 UTC som `currentVerified=false`, og det verificerede historiespaend blev staaende paa 22,563 timer.

Eksempel `DK-B01-01`: aktuel stroem er `verified`, `productionReferenceAt` er `2026-08-19T23:00:00.000Z`, og den gemte historiesample har samme 23:00-tid. Dokumentets `generatedAt` er derimod `23:52:44.856Z`.

## Rodarsag

Den timeskarpe produktionskaede gemmer historikproeven paa `productionReferenceAt`. Efterberigelsen kaldte fortsat `attachVerifiedCurrentToSample` med `conditions.generatedAt`. Der fandtes derfor ingen sample med den senere byggetid, og verifikationsmaerket blev ikke skrevet tilbage til hverken 24- eller 72-timersvinduet.

## Rettelse

`historySampleReferenceAt` vaelger `productionReferenceAt`, naar feltet findes, og falder ellers tilbage til `generatedAt` for aeldre dokumenter. `enrich-current-provenance.mjs` bruger samme reference til begge historikvinduer.

Den eksisterende retentionstest beviser nu:

- en timeskarp sample verificeres trods en senere byggetid;
- aeldre dokumenter uden `productionReferenceAt` bruger fortsat `generatedAt`;
- aeldre uverificeret fortid omskrives ikke;
- successive verificerede proever akkumuleres stadig.

Ingen raa vaerdier, score, state, kilde, fallback, geometri eller land-/vandpunkt aendres. Frisk central produktion skal vise, at det verificerede spaend igen vokser naturligt.

## Replay paa produktionsartifact

Den rettede berigelse er koert paa en isoleret kopi af hele `#3242`-artifactet. Den berigede 21.978 verificerede prognosetimer og bevarede 2.802 ikke-verificerbare timer. Resultatet i historikmatricen er:

- 197 zoner vokser fra 55 til 56 verificerede proever;
- en zone vokser fra 49 til 50;
- verificeret spaend vokser fra 22,563 til 30,903 timer i alle 198 verificerede zoner;
- de samme 12 reelle parent-zonehuller forbliver ved nul;
- ingen fortid rekonstrueres eller omskrives.

Replayet beviser rettelsen mod faktiske produktionsdata. Frisk central produktion er fortsat noedvendig som drift-/deploybevis.
