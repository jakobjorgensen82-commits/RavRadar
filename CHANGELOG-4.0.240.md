# RavRadar 4.0.240

## Jagtbarhed og sikkerhed

- Jagtbarhed beskrives nu som den praktiske mulighed for at lede efter rav, ikke som en sikkerhedsgodkendelse.
- Aktuel visning og fem-døgnsvisning viser en særskilt, fast sikkerhedsnote.
- Markdown-håndbog og webhåndbog er opdateret med samme skelnen.
- En kildekontakt sikrer, at formuleringerne ikke igen blander jagtbarhed og sikkerhed sammen.
- Workflowgaten læser nu Copernicus-workflowet ens på Windows- og Linux-linjeskift; selve workflowet er uændret.

## Uændret

- RavScore, delscorevægte, tærskler, pile og forklaringslogik er uændrede.
- Vejr-, strøm- og kystdata er uændrede.
- Ingen land-/vandpunkter eller anden geometri er flyttet.

## Validering

- validate:source og release-gate bestod lokalt og i PR-gaten. Efter merge bestod frisk fuld produktionsvalidering, deploykontrol og systematisk onlineaudit af 210 zoner, 673 kystdele, 420 aktuelle visninger og 2100 femdøgnsvisninger uden fejl.
