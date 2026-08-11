# RavRadar 4.0.177

- Retter den dokumenterede produktionsflaskehals fra 4.0.176: 605 lokale vindpunkter blev tidligere slået op ét ad gangen i hvert HARMONIE-grid, så første vindtrin ikke nåede at blive færdigt inden workflowets tidsgrænse.
- Bruger nu ecCodes' samlede flerpunktsopslag til hele HARMONIE-registeret én gang pr. grid og genbruger resultatet for alle forecasttider.
- Bevarer den grundige flerpunktssøgning og alle eksisterende afstands-, landmaske- og fælles U/V-krav for bølge- og havmodeller.
- 4.0.176's første normale run bestod fulde Linux-gates, central aktivering, Pages-deploy og online geometri, men offentlig scorekontrol viste 0/605 lokale scorer. 4.0.177 må først kaldes færdig, når en frisk produktion viser lokale scorer online.
