# RavRadar 4.0.437

## Resultat

4.0.437 retter den konkrete formatfejl, som stoppede normalrun
`35462863128` før nogen vejrleverandør blev startet. Workflowets gyldige
produktionstime uden millisekunder accepteres nu af den eksakte
forgængerovergang og normaliseres til samme interne UTC-form som resten af
den private runtime.

## Produktionsbevis og rettelse

- 4.0.436 bestod exact-head `35462534974`, PR #381 og merge `0d72ce41`.
- `35462863128` låste korrekt timen `2026-09-19T18:00:00Z`, men den nye
  overgangstest havde kun dækket den ækvivalente `.000Z`-form.
- Begge overgangsveje accepterer nu kun de to eksakte heltimeformer og
  normaliserer dem til `.000Z`. Ugyldig dato, tidszone, minut, sekund eller
  brøkdel afvises fortsat.
- Den aktive regression bruger nu den samme no-millis-form som det rigtige
  produktionsworkflow. Den historiske nabovej er rettet og testet samtidig.
- Engangsovergangen er exact-release-låst til 4.0.437; alle tidligere faste
  head-, bundle-, binding-, 210/673- og kontrakthashkrav er uændrede.

## Uændret

Der ændres ingen vejrdata, score, providerprioritet, vandstand, geometri,
zoner eller land-/vandpunkter. Den fejlede 4.0.436-kørsel nåede ingen
provider og publicerede intet. Næste almindelige kørsel skal genbruge den
allerede gemte krypterede fremgang og bevise hele leveringen.
