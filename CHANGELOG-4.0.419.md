# Changelog 4.0.419

4.0.418 bestod exact-head `35366221956`, blev merged gennem PR #362 som main
`9573264f389bd9f68413be031dd289309eb6b270`, men kunne ikke leveres videre.

Code-only `35366953774` gendannede den eksakte beskyttede forgængerruntime og
klassificerede overgangen korrekt som en ren kontraktombinding. Workflowet
behandlede den bagefter fejlagtigt som en score-reparation og krævede, at en
score skulle ændre sig. Derfor stoppede det før private writes og Pages.
Gentagelsen `35368826476` blev afbrudt, da samme resultat var sikkert.

Normal weather `35369122090` stoppede derefter før alle providerkald, fordi
den gamle private runtime endnu ikke var genbundet til den nye vejrkontrakt.
De gemte DMI-, Copernicus-, regionale DMI- og Open-Meteo-cacher blev ikke
ændret.

4.0.419 fører nu migrationens forseglede klassifikation gennem hele code-only-
og Pages-kæden. En ren kontraktombinding skal bevise uændret vejr, uændrede
scorer, uændret geometri, samme datasæt/time og nul providerkald. En egentlig
modelbindingsovergang beholder det strengere krav om en reel scoreændring.
Kontrakthash-beskyttelsen er ikke svækket. Ingen oneoff.
