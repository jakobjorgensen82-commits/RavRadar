# DEC-0241 – fremtidig lokal vind får en afgrænset, selvstændig DMI-tur

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.469; normal produktionskørsel afventer

## Målt problem

Normalrun `35823773587` havde en sund officiel HARMONIE-fortegnelse med
23 valgte prognosetrin og cirka 57 timers fremtid fra samme DMI-modelrun.
Kørslen behandlede den første fil for den aktuelle time, men senere
HARMONIE-horisont nåede ingen fil og blev afbrudt af tidsbudgettet efter
DKSS/WAM. Den rå DMI-cache havde da lokal vind i 218/673 kystdele på
mindst 24 timer og i 0/673 på 96 timer. Det er ikke bevis for, at de
officielle værdier ville blive accepteret på alle steder, men det viser
en planlægningsbarriere før værdierne overhovedet blev forsøgt.

Horisontpassagen var desuden kun oprettet, når DMI-vind manglede i den
aktuelle time. En allerede dækket aktuel time kunne dermed forhindre
den særskilte, afgrænsede fremtidspassage, selv om senere timer manglede.

## Beslutning

- Aktuel-times-fundamentet bevarer sit første, højst ene assetforsøg.
  DKSS- og WAM-familierne beholder rækkefølge og reserver til havstrøm,
  vandstand og bølger.
- Manglende vindhorisont planlægges uafhængigt af aktuel-times-vind.
  Dens egen tur kommer efter de kritiske DKSS/WAM-ture, roterer over de
  officielle assets og forsøger som standard højst fire pr. normal kørsel.
  Når denne
  tur findes, køres ikke samtidig en ubegrænset ordinær HARMONIE-tur.
- Højst 120 sekunder af det **overskydende** arbejdsbudget beskyttes
  til et startforsøg. Der reserveres intet, hvis tiden efter de
  eksisterende marine reserver og sikker startmargin er for kort.
  Afslutningsreserve, checkpoint og asset-watchdog ændres ikke.
- DMI's cirka 57 timers officielle vindhorisont kan ikke alene dække
  hele RavRadars 118 timer. Den gyldige rest skal fortsat forsøges af
  godkendte reservekilder uden at overskrive gyldige DMI-værdier.

## Afgrænsning og bevis

Denne rettelse ændrer kun DMI-arbejdsplanen, ikke rå værdiers adgang,
stedkrav, interpolation, datakildernes prioritet eller RavScore. Testen
beviser separat tur med og uden H0-hul samt at reservationen forsvinder,
når marine reserver bruger tiden. Den kan ikke bevise fuld vinddækning.

Efter grøn kodelevering køres én kontrolleret normal vejrhentning på
den gemte aktuelle cache. Den nye komponentrapport skal måle vind,
bølger, vandstand og vandtemperatur før og efter både DMI og reserver.
De 5.201 resterende havstrømspar undersøges separat. Først en fuld
normal vedligeholdelse med gemt fremgang og vellykket deploy kan begrunde
genaktivering af den automatiske tidsplan.
