# Turdata-kontrakt før RavScore-kalibrering

Dato: 2026-08-21  
Status: teknisk kontrakt klar; brugerflow og fjernlagring mangler tilkobling

## Formål

RavRadar skal lære af hele søgeture, ikke af enkelte ravstykker. En tur uden fund er også vigtig evidens, hvis vi ved hvor længe og hvor grundigt brugeren søgte, hvilken kystdel der blev undersøgt, og hvilken prognose der var synlig ved turens start.

## Ny evidensenhed

En ny komplet tur gemmer:

- start- og sluttid samt beregnet antal søgeminutter,
- vadersøgning eller strandsøgning,
- faktisk zone og faktisk kystdel,
- delvis, normal eller grundig afsøgning,
- fund eller intet fund; gram er kun en frivillig sekundær oplysning,
- datasæt-id, prognosens udstedelsestid, gyldighedstid og tidspunktet hvor grundlaget blev fastholdt.

Turens repræsentative observationstid er midtpunktet mellem start og slut. Dermed undgår vi den hidtidige kunstige middagstid fra en senere kalenderbesvarelse.

## Dataminimering

GPS-punkter, ruter, koordinater og spor indgår ikke i fjernkontrakten. Den faktiske kystdel er præcis nok til faglig kalibrering og langt mindre følsom end brugerens bevægelsesspor. Lokale historiske ruter ændres eller slettes ikke af denne kontrakt.

## Bagudkompatibilitet

Eksisterende observationer bevares som kontraktversion 1 og må fortsat kun bruges som dækningsdata. Nye, komplette ture bruger version 2. Databasemigrationen tilføjer kun nullable felter og kontrolregler; den opdaterer eller sletter ingen historiske rækker.

## Før kontrakten må bruges til vægtændringer

Brugerflowet skal kobles på, privatlivstesten skal være grøn, og ture skal have repræsentativ spredning på årstid, område, vejr og både fund/ikke-fund. Først derefter må 25/40/35 eller andre RavScore-regler genestimeres. Enkeltfund må ikke blive fit-enheden.
