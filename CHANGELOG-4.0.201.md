# RavRadar 4.0.201

- Retter den forældede faste 783-dels kontrol, som stoppede privat nationalkørsel #31798588868 efter 33 grønne faglige trin.
- Gennemgangskortets fordeling af komplette, delvise og blokerede kystdele afledes nu fail-closed af de allerede validerede geometri-, punkt- og shadow-scorefiler.
- Den efterfølgende centrale admin-roundtrip bruger samme dynamiske, 1:1-validerede delbestand i stedet for et historisk fast antal.
- Den aktuelle private kandidat på 835 dele, heraf 828 komplette, fire delvise og tre blokerede, er dækket af målrettede regressioner. Offentlig geometri og RavScore ændres ikke.
