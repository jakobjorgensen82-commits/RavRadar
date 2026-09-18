# Changelog 4.0.420

Normal weather `35374238410` gennemførte alle provider-, cache-, build-,
validerings-, release-, artifact-, privacy- og Pages-trin. Den offentlige
pakke fra 18. september kl. 19 dansk tid blev verificeret med 210 zoner, 673
kystdele og alle 79 browserfiler.

Kørslen stoppede først i den efterfølgende centrale afslutning. Den centrale
readiness pegede på main `1ec8358f`, mens den nye offentlige pakke var bygget
fra den operationelle efterfølger `779fd7a9`. Derfor er Pages foran den
centrale RavScore-registrering. Providerfri `35379571657` afviste sikkert den
ukendte kombination før skrivning og deploy.

4.0.420 fastlåser en engangsgenopretning til netop disse to deployments og
deres eksakte artifact-, manifest-, modelbindings-, browserluknings- og
implementeringshashes. Kilden kræver 79 af 79 filer og nul manglende filer.
Alle andre kombinationer afvises.

Rettelsen leveres gennem code-only uden providerkald eller ændring af gemte
vejrcacher. RavScore-formel, modelbundle, vejrdata, providerprioritet,
DMI-rotation og geometri er uændrede. Se DEC-0203.
