# RavRadar 4.0.401

## Hvad er rettet

Den normale produktionskørsel sikrer nu den fastlåste historiske Candidate G-
kilde, før den fulde validering starter. Hvis committen allerede findes fra
en tidligere kildekontrol i samme runner, genbruges den. Ellers hentes kun den
ene eksakte commit, og dens kendte Git-træ bekræftes.

## Hvorfor

Run `35181918091` gennemførte alle vejrleverandører, gemte cacher, byggede
closure, historik og offentlig runtime og bestod runtimeaudit. Den stoppede
først senere, fordi rollbacktesten krævede commit `49dd4cb`, mens et genbrugt
sourceproof betød, at runneren ikke tidligere havde hentet denne commit.

## Uændret

RavScore, vejrdata, providerprioritet, cacheindhold, geometri og offentlig
score er uændrede. Næste almindelige weather genbruger de gemte cacher; ingen
oneoff er nødvendig.
