# RavRadar 4.0.407 – korrekt vindgrund og sikker replaydiagnose

Dato: 2026-09-17

## Ændret

- En aktiv kystdel regnes ikke længere som vinddækket, blot fordi cachen har
  ét ældre vindpunkt. Mangler den rullende 96-timers vindhorisont, planlægges
  ét afgrænset HARMONIE-asset før DKSS og WAM i den almindelige DMI-kørsel.
- Den uafhængige RavScore-audit samler nu replayfejl i faste, payloadfrie
  kategorier. Den logger hverken tilstand, vejrdata, koordinater eller rå
  providerdata og stopper fortsat et ugyldigt produktionsartifact.
- Leverancen genbruger DMI-, Copernicus- og Open-Meteo-cacherne fra
  normalrun `35253587766`. Der startes ingen oneoff.

## Baggrund

4.0.406 kom online gennem PR #350, main `459dc41c` og code-only-run
`35252644724`. Normalrun `35253587766` gennemførte alle tre providerled og
gemte deres fremskridt, men HARMONIE blev ikke planlagt, fordi triggeren kun
søgte punkter helt uden vindhistorik. Den byggede runtime reducerede de
utilgængelige aktuelle modes til 192, men blev ikke udgivet, fordi den
efterfølgende replayaudit afviste alle 673 tilstande med den hidtil for brede
kode `STATE_REPLAY_FAILED`.

## Drift

Efter exact-head, merge og en kort providerfri kodeleverance køres én
almindelig weather på de gemte cacher. Loggen skal vise HARMONIE først og en
præcis replayfejlkategori eller et grønt deploy. Bootstrap bruges kun, hvis
den målte restdækning efter normal drift viser et reelt kapacitetsbehov.

