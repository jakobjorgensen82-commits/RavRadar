# RavRadar 4.0.101

## Automatisk valg af vandstandskilder

- Admin beregner igen det automatiske valg fra de aktuelt brugbare vandstandskilder med samme topologiske funktion som produktionen.
- Et gammelt eller tomt centralt routing-audit kan ikke længere skjule Hirtshals eller andre kilder, som nu har gyldig status og prognoseserie.
- To kompatible kilder interpoleres fortsat med inverse afstandsvægte.
- Hvis kun én kompatibel kilde findes, anvendes den automatisk med 100 % vægt i stedet for et tomt valg.
- Administratoroverride, vandstandskildernes datamodel, DKSS-serier, RavScore, aktuelle bedste områder, femdøgnsprognosen og tabellen “Næste fem dage – Vandstand time for time” er ikke ændret.

## Regressionstest

- Ny test dokumenterer, at Tornby og Hirtshals automatisk kan vælge Hirtshals Havn II.
- Testen beskytter afstandsvægtene og forhindrer, at et gammelt auditresultat igen bliver autoritativt i admin.
