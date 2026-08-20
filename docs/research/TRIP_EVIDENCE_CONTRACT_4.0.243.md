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

Ved turstart fastholdes en lille prognosereference fra det allerede indlæste manifest og datasæt. Referencen indeholder kun datasæt-id, udstedelsestid, gyldighedstid og hentetid. Den indeholder hverken rå vejrdata eller følsomme brugerdata, og manifest og prognose skal have samme datasæt-id.

Der fastholdes desuden et lille, eksplicit tilladt sæt kalibreringstal: den viste total og de tre delscorer samt de centrale vind-, bølge-, strøm-, vandstands- og hændelsesmål. Der gemmes retning og fart, ikke rå U/V-komponenter eller komplette diagnostikpayloads. Det gør turen analyserbar efter et halvt år, selv hvis det gamle live-datasæt ikke længere er tilgængeligt.

Zone og kystdel ved turstart gemmes adskilt fra den kystdel, brugeren bagefter bekræfter at have afsøgt. Hvis de ikke er ens, bevares turen som dækningsdata, men `calibrationEligible` bliver falsk. Dermed lærer modellen ikke af et vejrsnapshot fra det forkerte sted.

## Lokal kø og fejltolerance

Turstart og ventende uploads gemmes under nye, versionsstyrede lokale nøgler. Ved afslutning skrives den komplette tur til uploadkøen, før den aktive tur fjernes. Hvis lokal lagring fejler, bliver startposten derfor liggende. En køpost fjernes kun af den særskilte succesfunktion, som senere skal kaldes efter en bekræftet databaseindsættelse.

Den nye kø ændrer eller sletter ikke historiske ruter fra det gamle turflow. Nye v2-poster accepterer ikke rute eller koordinater, heller ikke hvis en kalder ved en fejl sender dem med.

Uploadadapteren bygger databasepayloaden fra en fast tilladelsesliste og kontrollerer privatlivskontrakten igen lige før afsendelse. Hver tur har et unikt `trip_id` i databasen, så et uklart netværkssvar kan genforsøges idempotent. Ved en fejl bliver posten i den lokale kø, og statusresultatet indeholder kun tur-id og en kort fejltekst, aldrig den fulde payload.

## Enkel brugerformular

Den isolerede dialog spørger kun om fund/ikke fund, faktisk zone og kystdel, søgegrundighed og frivillige gram. Den forklarer tydeligt, at den præcise position og ruten ikke gemmes. Hvis stedet ændres i forhold til turstart, forklarer dialogen også, at turen bevares men ikke bruges til automatisk scorejustering. “Svar senere” lukker dialogen uden at færdiggøre eller slette turdata.

Den kanoniske objektform findes også som `trip-evidence-v2.schema.json`. Skemaet afviser ukendte felter både på topniveau og i kalibreringssnapshotten. Dermed er det ikke nok, at UI-koden ser rigtig ud; producenter og forbrugere har samme maskinlæsbare tilladelsesliste.

## Stop nu, svar senere

Når turen stoppes, gemmes sluttidspunktet lokalt før dialogen åbnes. Vælger brugeren “Svar senere”, bevares både start og slut uændret. En senere besvarelse kan derfor ikke gøre turen kunstigt længere eller flytte observationen til besvarelsestidspunktet.

En controller samler start, stop, genoptagelse, dialog, lokal kø og upload bag et lille interface. Den returnerer kun kort status og tur-id til UI-laget. Hvis upload mangler eller fejler, er status `queued`; den komplette payload bliver ikke lagt i fejlstatus eller konsollog.

## Adapter til den offentlige score

En særskilt adapter bygger turstarten fra den allerede viste offentlige kystdel og zone. Den kræver samme datasæt i manifest og vejrdata, kontrollerer at kystdelen tilhører zonen og kræver totalscore plus alle tre komponenter for den valgte søgemetode. Vandstand og tretimerstendens omregnes eksplicit fra centimeter til meter. Ukendte felter kopieres ikke, og rå vektorkomponenter findes ikke i tilladelseslisten.

En tynd offentlig runtime samler kontekstadapteren og controlleren. Den eksisterende app skal derfor kun levere den allerede valgte tilstand gennem `getContext()` og kalde `start()`, `stop()`, `resume()` eller `flush()`. Runtime-koden læser ikke kortets position, flytter ingen punkter og ændrer ikke scoreberegningen.

Hvis appen ikke allerede har en entydig valgt kystdel, kan den kalde `startWithPrompt()`. Startdialogen beder om søgemetode, zone og kystdel før uret starter. Det giver et korrekt lokalt prognosesnapshot uden at kræve GPS eller antage, at nærmeste kystdel er den, brugeren faktisk vil afsøge.

## Dataminimering

GPS-punkter, ruter, koordinater og spor indgår ikke i fjernkontrakten. Den faktiske kystdel er præcis nok til faglig kalibrering og langt mindre følsom end brugerens bevægelsesspor. Lokale historiske ruter ændres eller slettes ikke af denne kontrakt.

## Bagudkompatibilitet

Eksisterende observationer bevares som kontraktversion 1 og må fortsat kun bruges som dækningsdata. Nye, komplette ture bruger version 2. Databasemigrationen tilføjer kun nullable felter og kontrolregler; den opdaterer eller sletter ingen historiske rækker.

## Før kontrakten må bruges til vægtændringer

Brugerflowet skal kobles på, privatlivstesten skal være grøn, og ture skal have repræsentativ spredning på årstid, område, vejr og både fund/ikke-fund. Først derefter må 25/40/35 eller andre RavScore-regler genestimeres. Enkeltfund må ikke blive fit-enheden.
