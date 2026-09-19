# RavRadar 4.0.428

## Rettet

- Et gammelt HARMONIE-cooldown kan ikke længere skjule det ene nødvendige
  forsøg på eksakt vind ved produktionstimen.
- Den midlertidige historical-maintenance-afslutning følger nu samme
  afgrænsede diagnostikregel som resten af produktionskæden, så et sikkert
  bygget artifact kan nå Pages. Privacy, artifact og deploykrav er uændrede.
- En diagnostisk fejlet offentlig audit kan aldrig gøre runtime egnet til
  kalibrering.
- Strømauditten skriver nu den allerede beregnede liste over ubekræftede
  timer i stedet for at stoppe på et forkert variabelnavn.

## Produktionsstatus

4.0.427 bestod exact-head `35410861514`, PR #372, backend `35411487128` og
alle provider-, build-, artifact- og releaseled i normalrun `35411701055`.
Kørslen stoppede sent før Pages på en for snæver seal-regel. Den beviste også,
at gyldig aktuel strøm nu bevares til 665/673 dele, men ikke fuld dækning:
2.334 af 79.414 providerpar og 153 af 354 Feggesund-bølgedeltimer manglede.

4.0.428 ændrer ikke RavScore-formel, geometri, punkter eller providerorden.
Næste bevis er én almindelig vejrkørsel; `MISSING` er robusthed, aldrig
komplethed. Se DEC-0208.
