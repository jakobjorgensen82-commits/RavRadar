# RavRadar 4.0.92

## Rettet

- GitHub-deployment accepterer nu godkendte ændringer af retningsankre, når den aktive `onshoreDirectionDeg` fortsat stemmer med zonens hav→land-geometri.
- Hårdkodede gradkrav til Blåvand, Grenaa, Øster Hurup og Djursland er fjernet fra produktionsdatatests.
- Retningskonventioner testes fortsat med faste syntetiske geometrier, så 0/90/180/270-konventionen og scoremotorens påland/fraland-logik stadig er beskyttet.
- Alle aktive produktionszoner kontrolleres fortsat for gyldige land-/havpunkter og geometrisk konsistent `onshoreDirectionDeg`.
- Den valgfrie reviewmetadata-test låser ikke længere en administrativt redigerbar zone til en historisk gradværdi.

## Rodårsag

Version 4.0.91 anvendte ejerens godkendte retningsankre korrekt, men `test-onshore-zone-geometry.mjs` krævede stadig, at Blåvand altid var præcis 90°. Efter en legitim adminændring bestod den generelle geometri-audit, men den efterfølgende historiske særregel stoppede deployment.
