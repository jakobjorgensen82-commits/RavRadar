# 4.0.469 – gem gyldig historik og giv vindhuller en egen tur

- Kode-only-run `35835042039` genbrugte den aktuelle private vejrpakke og
  byggede offentlig runtime, men stoppede før deploy ved checkpointbygning.
  Ingen ny vejrpakke eller offentlig ændring blev skrevet.
- Checkpointets havstrømsreplay krævede fejlagtigt status `READY_NATIVE_HOLD`.
  En godkendt fastholdelse kan have ufuldstændig 48-timershistorik og stadig
  være gyldig. Replay bruger nu samme kilde- og tidsregel som scoremodellens
  egen tilstandsvalidator, inklusive det faktiske referencetidspunkt.
- En produktionsformet regression gemmer et checkpoint med netop en sådan
  fastholdelse blandt 673 kystdele. Ingen scoreformel, fallbackregel eller
  havstrømsværdi ændres.
- Den seneste DMI-kørsel behandlede én aktuel HARMONIE-fil, men ingen af de
  23 valgte prognosetrin i den senere vindpassage: havarbejdet brugte den
  resterende tid. Vindens fremtidige timer får nu en særskilt, roterende tur,
  også når den aktuelle time allerede er dækket. Normalt forsøges højst fire
  assets pr. almindelig kørsel. Op til 120 sekunder reserveres kun af tid ud over
  de eksisterende havstrøms- og bølgereserver. Den automatiske vejrplan
  forbliver pauset til en kontrolleret normal kørsel har vist reel fremgang.
