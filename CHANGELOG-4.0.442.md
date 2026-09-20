# 4.0.442 – Copernicus-timeout afleverer genbrugelig baseline

## Ændret

- En almindelig Copernicus-kørsel reserverer nu 120 sekunder til sikker
  afslutning/genindgang. Den normale providergrænse er 420 sekunder, og et
  nyt netværksshred startes kun, hvis der er mindst 45 sekunder tilbage til
  journal- og stategemning.
- Ved wrapper-timeout kontrolleres den allerede eksakte bank-, shadow- og
  source-stage-baseline først. Hvis den stadig matcher donorprojektionen,
  genbruges den uden at afspille journalen under den korte recoveryfrist.
  Validerede segmentkvitteringer bliver liggende til næste almindelige kørsel.
- Hvis baseline ikke kan bevises eksakt, bruges fortsat den strenge lokale
  consolidation. Ingen ukendt eller delvis state accepteres som READY.
- Release- og workflowkontrakten er synkroniseret til 420 sekunder. Der er
  ikke ændret providerprioritet, scorelogik, geometri eller datakomplethedskrav.

## Live-evidens og begrænsning

Den seneste almindelige kørsel `35486533929` gennemførte DMI og gemte DMI-
fremgangen. Copernicus nåede 6.501 verificerede par efter fire durable
segmenter, men stoppede ved den tidligere timeout under et femte netkald.
Open-Meteo, afsluttende samling, score, artifact og deploy blev derfor ikke
kørt i det run. Der må ikke konkluderes komplet datasæt ud fra denne kørsel.

## Verifikation

Den målrettede bounded-retry-test, source-stage-testen, segmentjournalens
tamper-test, workflowkontrakterne og releaseversionens målchecks er grønne.
Den næste driftsprøve skal være én almindelig weather-continuation fra den
gemte fremgang; ingen ny oneoff er nødvendig for denne rettelse.
