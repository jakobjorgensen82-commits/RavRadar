# DEC-0017 – Flere veje til fundbart rav

- **Status:** Aktiv og implementeret
- **Besluttet:** 2026-08-01

## Beslutning
RavRadars proceskæde må ikke behandles som en absolut gate. Den fulde kæde fra primærlager til synligt opskyl skal fortsat vægte højt, men systemet skal også modellere genmobilisering fra sekundære nærkystlagre.

## Bindende krav
1. Produktionsmodellen forbliver én samlet RavRadar-model; der oprettes ikke en parallel “Model 2”.
2. Mobiliseringskomponenten skal skelne mellem ny frigivelse og nærkystnær genmobilisering.
3. Genmobilisering må kunne give en meningsfuld score uden ny storm, men må ikke alene ligne en fuld frisk frigivelseshændelse.
4. Strøm væk fra land skal fortsat begrænse transporten gennem eksisterende caps.
5. Håndbogen og debugdiagnostikken skal vise, hvilket spor der bærer vurderingen.
6. Antagelsen skal ekspertvalideres som E-22 og kunne ændres versionsstyret.

## Begrundelse
Tidligere indskyllet rav kan trækkes kortvarigt ud i swash-/revlezonen og senere føres ind igen. Det kræver ikke nødvendigvis ny erosion af et geologisk lager eller en ny storm, men kræver stadig fysisk tilstedeværelse, mobilisering, transport og aflejring.
