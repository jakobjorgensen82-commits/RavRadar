# Changelog 4.0.423

4.0.422 kom online gennem normalrun `35386276428`, men den efterfølgende
analyse viste to forskellige forhold: Pages-deployet var verificeret, mens
vejrdækningen ikke var komplet. Den gamle slutstatus blandede disse ting og
sendte en fejlmail, selv om deployet var færdigt.

4.0.423 giver manuel og planlagt produktion én fælles slutkontrakt. Et run er
kun deployet, når weather, artifact, privacy, seal, Pages og offentlig
verifikation er gennemført. Diagnostiske valideringsfund registreres fortsat,
men ændrer ikke et faktisk verificeret deploy til et opdigtet deploystop.

Selve vejrhentningen er rettet samlet. Vindplanen måler nu brugbare komplette
speed+direction-timer med korrekt proveniens; HARMONIE kan finde en sikker
alternativ bracket inden for samme native serie; privat replay beholder sin
historiske start; WAM-lukningen medregner Feggesunds to nødvendige
parentzoner; og køretidsestimatet holdes adskilt pr. providerfamilie.

`MISSING` er kun sikker nødadfærd. Det gør resten af RavRadar brugbar, men
tæller aldrig som gyldig data eller komplethed. Rapporten skelner nu mellem
alle sikkert håndterede kystdele og den faktiske scoreklare dækning; kun
673/673 uden `MISSING` er komplet.

En payloadfri stageoversigt gemmes ved hver normal kørsel, så eventuelle
rester kan placeres præcist i inputkæden uden at gentage providerarbejde.
RavScore-formel, vægte, geometri, punkter og providerprioritet er uændrede.
Den fælles inputændring bindes append-only i migration `20260918190000`.
Se DEC-0206.
