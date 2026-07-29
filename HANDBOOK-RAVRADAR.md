# RavRadar – levende faglig og teknisk drejebog

## Formål
RavRadar lover ikke fund. Appen skal give ravjægeren den bedst mulige chance for succes ved at rangere tid og sted ud fra vejr, hav, geografi, kystprocesser, historik og senere validerede brugerobservationer.

## Beslutningskæden
Rav skal først være til stede, derefter frigøres, transporteres, koncentreres eller aflejres og til sidst være tilgængeligt under jagtbare og sikre forhold. RavScore er beslutningsstøtte og ikke en konstatering af, at rav ligger på stranden.

## Dataprincip
DMI prioriteres i den nære prognose. Godkendte fallbackkilder kan udfylde resten af femdøgnsvisningen, så brugeren oplever én sammenhængende prognose. Kilder, skift, dækning og afvigelser auditeres internt.

## Retningskonventioner
Vind er meteorologisk: hvor vinden kommer fra. Strøm er oceanografisk: hvor vandet bevæger sig hen. Lokal pålandsretning går fra havpunkt mod landpunkt. Fejl på 180° kan vende indtransport til udtransport og skal derfor testes ende til ende.

## Nuværende scoremodel
Basismodellen vægter jagtbarhed 40 %, transport 35 % og frigivelse 25 %. Vægtene er arbejdsvægte, ikke naturkonstanter. Statiske forhold som rev, lavt vand og vegetation må kun forstærke allerede dokumenteret indtransport.

## Hændelsesforståelse
Ravtransport beskrives som faser: høj energi og mobilisering, efterstorm og transport, aflejring samt sen efterfase. Version 4.0.33 beregner et internt skyggeindeks for hændelsesfasen uden endnu at ændre produktionens RavScore.

## Kyst- og bundforhold
Zoner klassificeres foreløbigt ud fra eksisterende data: eksponering, lavt vand, rev, vegetation, fjordpræg, odder og flere kystorienteringer. Klassifikationen er heuristisk og skal senere valideres mod officielle geodata og ekspertviden.

## Ekspertregler
Ekspertviden indtastes i fri tekst, omsættes til en struktureret kladde og skal kontrolleres, testes og godkendes før aktivering. Regler mærkes som dokumenterede, ekspertbaserede, dataafledte eller hypoteser.

## Brugerdata
Både fund og ture uden fund er nødvendige. Observationer skal knyttes til zone, tidspunkt, jagtform, den viste prognose, scoremotorversion og samtykke. Data må ikke lære direkte uden kvalitetskontrol og hold-out-validering.

## Kendte forbedringsspor
Officielt stationsregister, hydrologisk routing, zoneretningsaudit, retningsankre, land-/havpunkter, fuld debugkæde, kyst- og bunddata, hændelsesmodel, produktionssikker indsamling, ekspertaudit af vægte og løbende dokumentation.

## Evidensstatus
Alle regler skal have status: dokumenteret, observeret, hypotese eller valideret i RavRadar. Appens forklaring skal kunne vise hvilke data og regler der førte til en score.
