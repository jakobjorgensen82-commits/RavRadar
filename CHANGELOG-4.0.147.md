# RavRadar 4.0.147

## Åmundings-oversegmentering tilbageholdes
- Artifactaudit af #2037 afviser første nationale åmundingsregel: 2.868 klynger i 180 zoner og op til 189 i én zone er ikke troværdige dokumenterede åmundinger.
- Zoner over den eksplicitte auditgrænse på 20 får ikke anvendt åmasker og markeres `oversegmentation-review-required`.
- Den private rapport gemmer en aggregeret scalar-egenskabsprofil og højst 200 geometri-frie diagnostiske poster til næste regelrevision.
- Validatoren kræver, at alle overdense masker faktisk er tilbageholdt og at national policystatus er konsistent.

## Evidens og afgrænsning
- #2036 produktionsverificerede 4.0.146; privat #2037 bestod den tekniske 208-zone topologikæde.
- #2037 målte 90 officielle fjord-/norpolygoner, 1.225 havneobjekter, 3.347 høfter og klit-/skræntevidens i 183/168 zoner.
- Ingen aktiv geometri, admin-data, vejr, state, offentlig UI eller RavScore ændres.
- 4.0.147 afventer lokale gates, privat egenskabsprofil/artifactaudit og normal produktionskæde.
