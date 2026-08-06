# Rekonstrueret chatkronologi

Rækkefølgen er udledt af tekstens indhold, versionsnumre, funktionsudvikling, henvisninger til tidligere arbejde og eksplicitte datoer. Filnavne og redigeringshistorik er ikke brugt som kronologisk bevis.

## CHAT-0001
- **Kilde:** chat 1.txt
- **Forløb:** 2026-07-20 til projektets version 28
- **Funktion i historien:** Projektets opstart: gratis vandstandsprognose, første kort, zoner, scoring og den første retnings-/diagnostikfase.

## CHAT-0002
- **Kilde:** chat 7.txt
- **Forløb:** Efter version 28 til version 53 / 4.0.5
- **Funktion i historien:** Retningsaudit, DMI-cacheopbygning, zoner, scorer, diagnostik, administration og overgang til 4.0-serien.

## CHAT-0003
- **Kilde:** chat 2.txt
- **Forløb:** Version 54 til 66 / omkring 4.0.12
- **Funktion i historien:** Datakvalitet, kildegennemsigtighed, DMI-prioritet, forecastfiler, runtime-diagnostik og filarbejdsgang.

## CHAT-0004
- **Kilde:** chat 5.txt
- **Forløb:** Version 68 til 82 / 4.0.13–4.0.21
- **Funktion i historien:** DMI-bulkmodeller, marine dækning, observationer, stationer, Frederikshavn-mismatch og cachearbejde.

## CHAT-0005
- **Kilde:** chat 3.txt
- **Forløb:** Version 83 til 95 / 4.0.22–4.0.35
- **Funktion i historien:** Weather engine, GitHub-kørsler, stationsregister, zoneregister, Supabase og oprydning af gamle zoner.

## CHAT-0006
- **Kilde:** chat 6.txt
- **Forløb:** Version 96 til 111 / 4.0.35–4.0.49
- **Funktion i historien:** Langtidssundhed, kysteditor, admin, regler, scorepræsentation, stationsrouting og brugervenlighed.

## CHAT-0007
- **Kilde:** chat 4.txt
- **Forløb:** Version 112 til 4.0.52
- **Funktion i historien:** Havmarkør-afklaring, korrekt afgrænsning af ændringer, regelbygger, RDKS og stationers livscyklus.

## Sikkerhed ved fortolkning
Kronologien er stærk, fordi versionsforløbene overlapper sammenhængende: 1–28, 28–53, 54–66, 68–82, 83–95, 96–111 og 112–4.0.52. Et mindre hul omkring version 67 ændrer ikke rækkefølgen. Historiske forslag er bevaret i kildeteksterne, men kun aktive RDKS-poster styrer fremtidigt arbejde.

## 2026-08-06 – 4.0.113
Fem sammenhængende produktionskørsler afslørede, at samme ugentlige GitHub-cache blev gendannet og aldrig opdateret efter primary-key hit. Progressiv cache og streng referencezonevalidering blev implementeret uden scoreændring.
