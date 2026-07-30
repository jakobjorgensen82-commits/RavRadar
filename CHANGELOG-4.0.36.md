# RavRadar 4.0.37 – realistisk DMI-cache og guidet administration

## DMI og cache
- Rå GRIB-cache hævet fra 1.400 MB til 4.096 MB. Det giver realistisk plads til både store HARMONIE-filer og marine forecast-trin.
- Downloadbudget pr. kørsel hævet til 2.048 MB.
- DMI-jobbet har nu op til 18 minutter / 1.020 sekunder, mens afsluttende checkpoint stadig reserveres.
- Parser-signaturen er hævet, så ændrede cacheforudsætninger behandles kontrolleret.
- En collection med fuldt genbrugte, allerede komplette forecast-trin rapporteres nu som `unchanged-valid` og sund succes i stedet for misvisende `success=false`.
- Collection-diagnostik viser nu genbrugte og tidligere færdigbehandlede assets.

## Administration
- Alle 11 moduler har fået en synlig introduktion med formål, trinvis arbejdsgang og vigtig konsekvens.
- Guiden kan skjules og vises uden at forlade modulet.
- Fanenavne er omskrevet til mere konkrete brugerbegreber.
- Regelmodulet viser en fast firetrinsproces: observation → kladde → test → aktivering.
- Tekniske engelske statusvalg er erstattet af danske betegnelser.
- Mobilvisningen af guider og arbejdsgange er forbedret.

## Sikkerhed
- Kladder påvirker fortsat ikke RavScore.
- Override, geografisk kontrol og modelændringer forklares som særskilte processer med tydelige kontroltrin.
