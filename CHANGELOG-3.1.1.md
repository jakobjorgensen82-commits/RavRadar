# RavRadar 3.1.1 – natlig DMI-opbygning og vandstandsdiagnostik

- Gyldige DMI-prognoser bruges cache-first, så næste centrale kørsel fortsætter med manglende zoner i stedet for at hente de samme zoner igen.
- Manglende og snart udløbende zoner prioriteres automatisk.
- Standardkvote på seks live DMI-zoner pr. kørsel reducerer risikoen for HTTP 429 og gør det muligt at fylde cachen gradvist natten over.
- Vandstandsdiagnosen indeholder nu DMI-modelværdi, interpoleret stationsestimat, forskel, stationernes rå værdier, afstande, vægte, observationstid og modeltid.
- Administratorcenterets diagnoseeksport indeholder vandstandsdiagnostik for samtlige zoner.
- DMI-modelvandstanden forbliver autoritativ; stationsobservationer bruges kun som kontrol.
