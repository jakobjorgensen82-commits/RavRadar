# DEC-0033 – Bedste lokale kystdel bestemmer zonescoren med tydelig dækningsforklaring

**Status:** Aktiv produktbeslutning, 2026-08-09. Landsdækkende aktiveret; 4.0.233 præciserer den bindende lokale retningsisolation.

## Beslutning
Når en zone har flere selvstændigt validerede lokale kystdele, bestemmes zonens viste RavScore af den kystdel, der har den højeste gyldige RavScore for det valgte tidspunkt og den valgte jagtform. Resultatet må ikke fremstilles som dækkende hele zonen, hvis de øvrige dele har mærkbart dårligere eller utilstrækkeligt dokumenterede forhold.

Væsentlighed anvendes pragmatisk, ikke krakilsk. Små scoreforskelle skal samles som praktisk samme zonedækning og må ikke udløse delopdeling eller en unødvendig forklaring. Ejerens eksempel `78` mod `75` skal fremstilles som hele zonen. Frem til den store planlagte RavRadar-/RavScore-analyse anvendes en fast margin på **7 point**: først en forskel over 7 point udløser “kun en del af zonen”. Den store analyse skal genvurdere marginen fagligt og må ændre den.

Zonevisningen skal altid angive én af disse dækningsstatusser tydeligt tæt ved scoren:

- **Hele zonen:** forholdene er fagligt sammenlignelige på tværs af de validerede kystdele.
- **Kun en del af zonen:** vis den vindende kystdels lokale navn og geografiske strækning.
- **Flere bestemte dele:** navngiv præcis de dele, som den viste vurdering gælder for.
- **Usikkert dækningsområde:** hvis lokale data mangler eller ikke kan sammenlignes forsvarligt.

Ved delvis dækning skal forklaringen vise, hvorfor den valgte del klarer sig bedst, herunder relevante lokale bidrag fra vind, strøm, bølger, vandstand, historik/state og andre aktive RavScore-komponenter. Den skal også kort forklare, hvorfor de øvrige dele klarer sig dårligere eller mangler data.

## Sikkerheds- og præsentationskrav
- Kortets zonefarve følger den valgte zonescore, men ledsages af en umiddelbart synlig delvis-dækningstekst; farven alene må ikke antyde, at hele zonen er lige god.
- Vindende del vælges pr. tidspunkt og jagtform og kan derfor skifte. Identitet og provenance skal følge resultatet hele vejen til UI og debug.
- Manglende lokale data må ikke erstattes af parentdata, nul, interpolation eller en anden dels data for at skabe en vinder.
- En lokal del må heller ikke arve moderzonens retningsankre. Dens score, state/historik, debug og forklaring skal bruge præcis samme eget land-/havpunktpar og eget lokale navn; et anker fra en anden navngiven del må aldrig blive valgt som dens transportgrundlag.
- Ligheds-, dæknings- og usikkerhedstærskler fastlægges og valideres fagligt før aktivering; de må ikke vælges alene for at give flere høje scorer.
- Den midlertidige produktionsregel er 7 point. Den er bevidst foreløbig og skal undersøges igen i den store analyse.
- Lokale delnavne skal være stedbaserede og forståelige uden teknisk kompasjargon, fx `Nord for Blåvands Huk`, `Syd for Hvide Sande` eller `Nord for havnemolen`. Korte former som `Nord for hukket` må kun bruges, når zonekonteksten er synlig.
- National rangliste må gerne bruge zonescoren fra den bedste del, men zonerækken og detaljevisningen skal kunne kommunikere delvis dækning uden at kræve, at brugeren gætter.

## Afgrænsning
Den historiske før-aktiveringsafgrænsning er afsluttet af de senere nationale geometri-, DMI-, score- og releasegates. Fremtidige scoreændringer kræver fortsat særskilt validering; 4.0.233 ændrer ikke kildeorden, punktplacering eller dækningskrav, men retter identiteten mellem den allerede aktive lokale kystdel og dens beregning.
