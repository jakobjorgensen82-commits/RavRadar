# DEC-0070 – Samlet feltrettelse af den offentlige grundbog

**Status:** PRODUKTIONSVERIFICERET I 4.0.271
**Dato:** 2026-08-24  
**Berører:** `learn.html`, eksperthåndbog, RDKS og den målrettede grundbogstest  
**Ændrer ikke:** RavScore, vejrdata, runtime-state, kystgeometri eller land-/vandpunkter

## Beslutning

1. Den fejlvendte pil ved Kyst A rettes, så den peger mod kysten.
2. Koldt saltvand forklares nuanceret: lavere temperatur kan ved samme saltindhold øge vandets tæthed og opdriften en smule, men gør ikke det meste rav flydende.
3. Vind, overfladestrøm og bundnær strøm må ikke blandes sammen. RavRadars offentlige forklaring siger direkte, at vurderingen koncentrerer sig om en bundnær repræsentation.
4. Ingen vind- eller strømretning fremstilles som universelt god. Betydningen forklares i forhold til kystens orientering og det foregående forløb.
5. Ejerens felterfaring med rav i revlehuller, på kystsiden bag hullet og på bagsiden af revlen nær hullet medtages som mulige samlesteder, ikke som en universel regel.
6. Brugeren rådes også til at søge bag en frisk tanglinje. Grus fjernes som almindeligt ravtegn.
7. Ejerens erfaring med speciallygter med ikke offentligt oplyste bølgelængder må beskrives som praktisk erfaring. RavRadar må ikke opfinde en bølgelængde eller kalde virkningen dokumenteret.
8. Den overflødige boks med fem generelle påstande fjernes.

## Evidensgrænser

- Vandets tæthed og opdrift: dokumenteret fysik; se forskningsnotatet.
- Bundnær strøm: aktiv RavRadar-modelkontrakt.
- Revlehuller, tanglinjer og specialtygter: ejerens praktiske erfaring, skrevet med “kan” og uden nye scoreinput.
- Grus: ejerens korrektion af et misvisende almindeligt søgetegn.

## Kontrol

Kandidaten skal bestå den målrettede læringsmodultest og projektets normale exact-head-kildegate. Der køres ingen ekstra fuld browsermatrix for denne afgrænsede tekst- og illustrationsrettelse.

PR #128 bestod exact-head `32742727246` og blev merged som `a723ae8c`. Den første produktion `32743307402` stoppede korrekt før deploy ved en manglende læsehjælp. Hotfix-PR #129 bestod exact-head `32745213320`, blev merged som `499861e8`, og produktion `32745389504` udgav 4.0.271 efter grøn central hydrering, fuld validering og releasegate. De syv konkrete rettelser er derefter kontrolleret målrettet på den levende grundbog.
