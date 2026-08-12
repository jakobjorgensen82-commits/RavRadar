# RavRadar 4.0.188

- Retter den fastlåste progressive DMI-opbygning: en vellykket sammenbygget privat DMI-zonecache gemmes nu mellem GitHub-kørsler, også når en efterfølgende streng releasegate stopper deployment.
- Den private cache bruges kun, hvis dens signatur passer til det aktuelle zone-, kystdels- og land/hav-punktregister. Ellers vælges den senest deployede kompatible cache eller en tom sikker genopbygning.
- Den offentlige side får fortsat kun nye data, når fuld validering og releasegate består. Ingen DMI-værdier konstrueres, ingen tærskel sænkes, og fallback-/RavScore-regler ændres ikke.
- Bevarer det godkendte seks-zonearbejde og den aktive 4.0.187-geometri uændret.
