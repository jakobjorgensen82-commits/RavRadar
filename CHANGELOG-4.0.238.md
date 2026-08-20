# RavRadar 4.0.238

## Produktionsverificeret: låst produktionstime bevares i fallback og historik

- Open-Meteo-forespørgslen udvider nu sit tilladte fortidsvindue ud fra forskellen mellem den låste `productionReferenceAt` og den faktiske byggetid. En planlagt produktion, der krydser en UTC-time, mister derfor ikke den allerede godkendte første forecasttime.
- Fallbackserien trimmes fortsat til den låste referencetime og højst 120 fremtidige timer. DMI er stadig førstevalg, og fallback må kun udfylde reelle huller eller en manglende hale.
- Verificeret strømhistorik knyttes nu til `productionReferenceAt` i stedet for den senere `generatedAt`. Dermed kan de 198 zoner med et verificeret fælles DMI-U/V-par vokse naturligt i den score-neutrale historik.
- De 12 kendte zoner uden et dokumenteret fælles marint gitterpunkt forbliver eksplicit `missing`. Fortid, nulværdier eller nabotimer opfindes ikke.

## Browserbevis

- Den versionsbundne 4.0.238-kontrol gennemgår begge jagtformer i alle 210 zoner: 420 aktuelle paneler, 2.100 femdøgnsvalg og reference til alle 673 kystdele.
- Kontrollen sammenholder score, label, farveniveau, vind- og strømpile, tre scorekomponenter, forklaring, lokal del/tid og alle seks synlige vejrmetrikker: vind, bølger, vandstand, strøm, vandtemperatur og tretimerstrend.
- Browserkontrollen fejler nu også, hvis livesidens synlige version ikke er præcis 4.0.238. Lokal JavaScript kan derfor ikke alene få en ældre liveside til at fremstå som den nye kandidat.

## Produktionsbevis

- PR #1 blev merged som `b8844841`. Push-kørsel `#32344813967` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, Supabase, Pages-artifact og deploy.
- Supportartifact `RavRadar-support-3252` byggede datasæt `rr-20260820074127-210` med 210 zoner. De seks bølgehuller fra #3246 har nu alle 118 timer uden ændret DMI-first-kildeorden; Feggesund forbliver det ene dokumenterede bølge-missing.
- Verificeret strømhistorik vokser igen: 198 verificerbare zoner har op til 56 prøver over 39,594 timer mod det tidligere fastlåste spænd på 22,563 timer. De 12 dokumenterede parent-huller er fortsat eksplicit `missing`.
- Den fulde online Playwright-kontrol er grøn for 210 zoner, 673 kystdele, 420 aktuelle paneler og 2.100 femdøgnsvalg. Mobil 390 x 844 og desktop 1440 x 900 er desuden kontrolleret uden overflow eller funktionsfejl.
- Den særskilte naturlige timeskiftekontrol er afsluttet. Schedule `#32351140886` byggede og deployede datasæt `rr-20260820085852-210` med fuld `validate`, releasegate, Supabase og Pages; den efterfølgende 210/673-browserkontrol var uden fejl.

## Sikkerhed og status

- PR-kontrollen er kildebaseret og må hverken hente secrets, hydrere central admin-sandhed, bygge produktionsdata eller deploye. Den kontrollerer de relevante regressions- og releasekontrakter før merge.
- Ingen land-/vandpunkter, kystgeometri, U/V-værdier, afstandsgrænser, kildeorden eller RavScoreformel er ændret.
- 4.0.238 er produktions- og browserverificeret, inklusive det naturlige timeskiftebevis. Ingen manuel genvej eller gateomgåelse blev brugt.
## Naturlig P1-driftsevidens

- Copernicus-pilot #72 fortsætter den private score-neutrale opsamling med 46 eksakte timetidspunkter, 28.934 observationer, 625 unikke mål og 629 mål/kilde-par.
- Nul mål/kilde-par har skiftet gitterpunkt eller lag. `scoreImpact=false`, `publicRuntime=false` og `interpolation=false` er bevaret; det fulde 168-timersvindue er endnu ikke nået.
