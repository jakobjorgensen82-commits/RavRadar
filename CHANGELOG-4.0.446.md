# 4.0.446 – DMI-first fallbackvagt efter normalrun-timeout (2026-09-20)

Normalrun `35506992220` gennemførte DMI, Copernicus, Open-Meteo og den samlede
DMI-first closure. Den stoppede først i `npm run update:weather`, som nåede sin
25-minutters arbejdsgrænse uden at afslutte cache-/scorebygget. Deploy blev
derfor ikke udført, og der blev ikke startet en ny kørsel automatisk.

Den konkrete kodeårsag var, at `resolveZone` kaldte Open-Meteo fallback for
alle zoner med en gyldig DMI-cache, også når DMI allerede havde komplet vind- og
bølgedækning — altså de komponenter fallbacken reelt kan udfylde. Det gav en
stor, unødvendig anden leverandørhentning efter den allerede gennemførte
providerkæde.

4.0.446 lader kun den offentlige fallbackhentning starte, når DMI's
fallback-egnede atmosfæredækning faktisk mangler. DMI-only-vandstand og
verificeret strøm bliver ikke behandlet som en grund til at hente Open-Meteo,
og nye gyldige fallbackværdier overskriver fortsat ikke gyldige DMI-værdier.
En målrettet regressionstest dækker begge cacheveje.

Dette er en performance- og kædekorrektion; det er ikke et komplethedsbevis.
Næste trin er exact-head sourcegate, PR/merge og én almindelig continuation,
som skal vise at cache-/scorebygget afslutter og derefter nå artifact, deploy og
live-verifikation.
