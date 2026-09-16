# RavRadar 4.0.395 – lokale Feggesund-huller stopper ikke hele landet

## Levende fund

- 4.0.394 bestod exact-head `35137196497`, PR #338 og providerfri deploy
  `35137798403` som main `b67459b0`.
- Normalrun `35138332481` beviste den rettede Open-Meteo-rækkefølge, closure
  og syvdøgnshistorik, men stoppede i `update:weather`.
- Feggesund havde 336 direkte bølgepositioner, 0 proxypositioner og 18
  ærlige lokale huller i de sidste seks timer på tre kystdele.

## Rettelse

- Alle 354 Feggesund-positioner skal fortsat bogføres eksakt som direct,
  proxy eller missing.
- Et ærligt lokalt missing gør kun den berørte kystdel og time utilgængelig;
  det stopper ikke længere hele den nationale produktion.
- Ufuldstændig eller manipuleret bogføring, ukendt disposition og ugyldig
  direct/proxy-proveniens stopper fortsat.
- Den afsluttende public-runtimeaudit følger samme eksakte kontrakt.

## Driftsfund

- Ved det nye 19:00Z-target faldt DMI fra 39.309 til 38.660 dækkede par,
  mens Open-Meteo voksede til 33.072. Target flyttede to timer, og DMI nåede
  kun dele af fire collections inden for normalbudgettet.
- DMI-cachen og kandidatfremgangen blev gemt. Næste normale kørsel skal vise,
  om den fortsatte rotation igen øger DMI ved et sammenligneligt target.
- Scheduler forbliver pauset, indtil 4.0.395 har gennemført normal
  produktion, fulde gates, deploy og offentlig kontrol.
