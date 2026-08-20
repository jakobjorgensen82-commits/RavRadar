# RavRadar 4.0.238

## Releasekandidat: låst produktionstime bevares i fallback og historik

- Open-Meteo-forespørgslen udvider nu sit tilladte fortidsvindue ud fra forskellen mellem den låste `productionReferenceAt` og den faktiske byggetid. En planlagt produktion, der krydser en UTC-time, mister derfor ikke den allerede godkendte første forecasttime.
- Fallbackserien trimmes fortsat til den låste referencetime og højst 120 fremtidige timer. DMI er stadig førstevalg, og fallback må kun udfylde reelle huller eller en manglende hale.
- Verificeret strømhistorik knyttes nu til `productionReferenceAt` i stedet for den senere `generatedAt`. Dermed kan de 198 zoner med et verificeret fælles DMI-U/V-par vokse naturligt i den score-neutrale historik.
- De 12 kendte zoner uden et dokumenteret fælles marint gitterpunkt forbliver eksplicit `missing`. Fortid, nulværdier eller nabotimer opfindes ikke.

## Browserbevis

- Den versionsbundne 4.0.238-kontrol gennemgår begge jagtformer i alle 210 zoner: 420 aktuelle paneler, 2.100 femdøgnsvalg og reference til alle 673 kystdele.
- Kontrollen sammenholder score, label, farveniveau, vind- og strømpile, tre scorekomponenter, forklaring, lokal del/tid og alle seks synlige vejrmetrikker: vind, bølger, vandstand, strøm, vandtemperatur og tretimerstrend.
- Browserkontrollen fejler nu også, hvis livesidens synlige version ikke er præcis 4.0.238. Lokal JavaScript kan derfor ikke alene få en ældre liveside til at fremstå som den nye kandidat.

## Sikkerhed og status

- PR-kontrollen er kildebaseret og må hverken hente secrets, hydrere central admin-sandhed, bygge produktionsdata eller deploye. Den kontrollerer de relevante regressions- og releasekontrakter før merge.
- Ingen land-/vandpunkter, kystgeometri, U/V-værdier, afstandsgrænser, kildeorden eller RavScoreformel er ændret.
- Kandidaten er ikke produktionsverificeret, før den er ført sikkert til `main`, har bestået en frisk fuld central produktionskørsel og derefter den komplette online browserkontrol.
