# RavRadar 4.0.45 – præcise scorelinjer og fælles scoresignatur

## Kystlinjer

- 209 af 210 aktive zoners scorelinjer er genberegnet mod RavRadars masterkystlinje. Fur nord bevarer den tidligere auditerede geometri, fordi masterkysten ikke har tilstrækkelig lokal dækning; dette markeres eksplicit som sikker fallback.
- Linjerne samples med højst ca. 120 meter mellem punkterne og placeres 8 meter landværts mod den eksisterende auditerede zonegeometri.
- Formålet er, at den dynamiske scorefarvede linje visuelt følger stranden i stedet for at ligge ude i vandet.
- Hver zone forbliver et selvstændigt, klikbart segment med sin egen aktuelle RavScore-farve.
- Der er tilføjet reproducerbart generatorscript og tests for afstand til masterkyst, punktkontinuitet og alle 210 zoner.

## Scoresignatur

- Den særskilte kortkategori `Fremragende` er fjernet.
- Kortet bruger nu fire scorefarver plus `Ingen data`:
  - 75–100: God
  - 55–74: Middel
  - 35–54: Svag
  - 0–34: Dårlig
- Exceptionelle forhold er fortsat defineret som RavScore 90 eller højere, men vises som `★` ved den numeriske score i `Bedste områder` og `5-dages RavRadar`.
- Kortlinjen får ikke en særskilt stjerne eller ekstra farvekategori.
- Grænser, etiketter og exceptionel-status styres nu centralt i `score-engine.js`.

## Sikkerhed og drift

- Ingen Supabase-migration er nødvendig.
- Eksisterende central lagring og rettighedsmodel ændres ikke.
