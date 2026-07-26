# RavRadar 3.1.9

## Rettet pålandsretning i detaljerede kystzoner

- Alle 210 aktuelle `DK-Bxx-xx`-zoner er valideret efter den samme entydige konvention: `dataPoint` er det marine prognosepunkt, `pinPoint` er strand-/landpunktet, og `onshoreDirectionDeg` går derfor fra hav mod land.
- 176 zoner fik justeret retningen; 133 af dem havde tidligere mere end 45° afvigelse, og 126 mere end 90°.
- `DK-B02-12` Øster Hurup og Als er rettet fra 100° til 268°. Strøm mod 135° klassificeres dermed som udgående, ikke indgående.
- Vestkystzoner peger nu generelt mod øst; Kattegat-østkyster peger generelt mod vest.
- Ny regressionstest validerer alle 210 zoner og kendte referencezoner ved Øster Hurup, Grenaa og Blåvand.
- En maskinlæsbar ændringsrapport er gemt i `ONSHORE-DIRECTION-CORRECTIONS-3.1.9.json`.
