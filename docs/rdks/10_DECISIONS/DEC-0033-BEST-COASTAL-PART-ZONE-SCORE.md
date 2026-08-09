# DEC-0033 – Bedste lokale kystdel bestemmer zonescoren med tydelig dækningsforklaring

**Status:** Aktiv produktbeslutning, 2026-08-09. Implementering og aktivering kræver fortsat særskilt validering.

## Beslutning
Når en zone har flere selvstændigt validerede lokale kystdele, bestemmes zonens viste RavScore af den kystdel, der har den højeste gyldige RavScore for det valgte tidspunkt og den valgte jagtform. Resultatet må ikke fremstilles som dækkende hele zonen, hvis de øvrige dele har mærkbart dårligere eller utilstrækkeligt dokumenterede forhold.

Væsentlighed anvendes pragmatisk, ikke krakilsk. Små scoreforskelle skal samles som praktisk samme zonedækning og må ikke udløse delopdeling eller en unødvendig forklaring. Ejerens eksempel `78` mod `75` skal som udgangspunkt fremstilles som hele zonen. Først en væsentlig og fagligt valideret forskel må udløse “kun en del af zonen”. Den endelige margin fastlægges på shadow-data og kan afhænge af usikkerhed og komponentdækning, ikke kun et råt pointtal.

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
- Ligheds-, dæknings- og usikkerhedstærskler fastlægges og valideres fagligt før aktivering; de må ikke vælges alene for at give flere høje scorer.
- En justerbar 5-points margin må bruges som forståelig UI-prototype, men er ikke i sig selv den endelige produktionsregel.
- National rangliste må gerne bruge zonescoren fra den bedste del, men zonerækken og detaljevisningen skal kunne kommunikere delvis dækning uden at kræve, at brugeren gætter.

## Afgrænsning
Beslutningen giver ikke i sig selv tilladelse til at aktivere Blåvand-geometri, lokal sampling, state, part-score eller offentlig UI. Først leveres en forståelig visuel ejerpræsentation og derefter en shadow-validering af scorevalg og dækningsstatus.
