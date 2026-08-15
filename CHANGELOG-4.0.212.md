# RavRadar 4.0.212

- Forhindrer vandstand, vandtemperatur og andre skalare marinefelter i at genvælge en zones autoritative DMI-havmodel og rydde en sammenhængende strømserie.
- Bevarer fortsat muligheden for at skifte havmodel, når en kandidat leverer et reelt bedre fælles strøm-U/V-par.
- Genlæser den aktuelle DMI-kørsel én kontrolleret gang for at genoprette de 27 produktionszoner, som mistede deres strømserie ved kørsel #31857361460.
- Ændrer ingen datakilde, fallback, RavScore eller mobiliseringstærskel.
