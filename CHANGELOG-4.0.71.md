# RavRadar 4.0.71

## Synlig og robust samlet sitetest

- Den samlede sitetest viser nu straks et synligt testpanel direkte under knappen.
- Hver deltest vises mens den kører og opdateres til bestået eller fejlet med forklaring.
- Slutrapporten vises altid, og panelet rulles automatisk frem på skærmen.
- En fatal fejl eller samlet timeout giver en tydelig rød fejlrapport; tavs afslutning kan ikke længere tolkes som succes.
- Seneste rapport gemmes lokalt og vises igen efter genindlæsning af admin.
- Der er indført en samlet timeout på fire minutter, så testen ikke kan hænge uendeligt.
- Regressionstesten kræver nu fremdrift, delresultater, slutstatus, fejlstatus og downloadbar rapport.

## Egenkontrol

Ændringen er lagt oven på 4.0.70. Ingen eksisterende funktion er bevidst fjernet.
