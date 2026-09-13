# RavRadar 4.0.352

## Privat runtime kan pakkes uden Nodes kunstige tekstgrænse

- Cache-only-preflight `34738698219` på 4.0.351-main bestod de komplette gemte vejrdata, WAM, freshness, modelbygning og offentlig 210/673/118-struktur uden providerhentning.
- Runnet stoppede først ved den produktionsækvivalente private størrelsesmåling, fordi rå base64-data blev samlet i én tekststreng over Nodes faste maksimum. Intet handoff, cutover eller deploy blev udstedt.
- Hver privat fil komprimeres nu deterministisk før base64. Det reducerer tekstkonvolutten uden at ændre filindhold, model eller vejrdata.
- Udpakning er bagudkompatibel, bounded til deklareret filstørrelse og genkontrollerer byteantal og SHA-256 før skrivning.
- Storage-, checkpoint-, privacy-, integritets-, rollback-, CAS-, readback- og offentlighedskrav er uændrede. DEC-0122's engangsundtagelse gælder alene exact 4.0.352.
- Den målrettede pakke/udpakke/rollback/anonym-adgangstest og private workflowtest er grønne lokalt. Næste GitHub-kørsel genbruger den låste cache og henter ikke nyt providervejr.
