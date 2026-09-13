# RavRadar 4.0.352

## Privat runtime kan pakkes uden Nodes kunstige tekstgrænse

- Cache-only-preflight `34738698219` på 4.0.351-main bestod de komplette gemte vejrdata, WAM, freshness, modelbygning og offentlig 210/673/118-struktur uden providerhentning.
- Runnet stoppede først ved den produktionsækvivalente private størrelsesmåling, fordi rå base64-data blev samlet i én tekststreng over Nodes faste maksimum. Intet handoff, cutover eller deploy blev udstedt.
- Hver privat fil komprimeres nu deterministisk før base64. Det reducerer tekstkonvolutten uden at ændre filindhold, model eller vejrdata.
- Udpakning er bagudkompatibel, bounded til deklareret filstørrelse og genkontrollerer byteantal og SHA-256 før skrivning.
- PR #289-sourcegate `34740223620` fortsatte hele releasegaten og rapporterede kun to hardcodede testforventninger om 4.0.351. De udledes nu af package-versionen, og den direkte fejlede test er grøn.
- Storage-, checkpoint-, privacy-, integritets-, rollback-, CAS-, readback- og offentlighedskrav er uændrede. DEC-0122's engangsundtagelse gælder alene exact 4.0.352.
- Den målrettede pakke/udpakke/rollback/anonym-adgangstest og private workflowtest er grønne lokalt. Næste GitHub-kørsel genbruger den låste cache og henter ikke nyt providervejr.
- En one-time fortsættelsesrute er bundet til exact failed run `34738698219` og fire konkrete cacher. Den verificerer de gamle grønne trin hos GitHub, men kører ikke providerproducenter eller 210/673-auditen igen. Kun de tabte midlertidige runtimefiler genskabes; den rettede kapacitetsmåling og handoff køres stadig, og cutoverens fulde gates er uændrede.
- Den forældede sourcegate `34741128298` blev annulleret før den kunne bruges som bevis. Næste push får én samlet exact-head-kørsel for hele den færdige rettelse.
- Sourcegate `34742976226` blev derefter kørt helt til slut. Alle tidligere release-, model-, runtime-, privacy-, vejr- og migrationskontroller var grønne; kun en gammel test talte det nye separate handoff-artifact med i det oprindelige preflight-job. Testen er afgrænset korrekt, og fire bogstavelige patch-`+` i fortsættelseskommandoerne er erstattet af gyldige shellfortsættelser med en direkte regressionstest.
