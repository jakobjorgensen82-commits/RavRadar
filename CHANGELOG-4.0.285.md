# RavRadar 4.0.285

4.0.285 retter en Candidate G-cadencefase, som gjorde den aktuelle rangliste tom efter den ellers grønne 4.0.284-sikkerhedsrelease.

- Offentlige Pages-artifacts lokaliserede faldet til første 4.0.284-build: 672/673 `READY` og 209/210 aktive zoner blev til 8/673 og 0/210.
- 48-timersvinduet accepterer nu en reference mellem native prøver, men kun når et verificeret kompakt bevis før grænsen og første bevis efter grænsen dokumenterer højst tre timers sammenhæng.
- Den faste rand er fortsat 0 ved den eksakte grænse. Der indsættes ingen måling, interpolation eller evidenspost.
- Et ægte 47-timersdatasæt uden forgænger, missing og interne huller over tre timer forbliver fail-closed.
- Den deployede fejllinje kan gendannes én gang ved at sammenflette kun kompakte transportbeviser fra den eksakte hash-låste offentlige 4.0.283-kilde. En virkelig artifactprøve genskabte 672/673 `READY` og gjorde recoveryen inaktiv.
- Onlineaudits kræver nu en faktisk aktiv aktuel zone, og Candidate G-shadowgaten afviser den brede accepterede 45–48-timers `WINDOW_INCOMPLETE`-fejlsignatur.
- Målrettede regime-, statepipeline-, recovery-, shadow- og ablationstests er grønne.

Candidate G 20/50/30, +10/-8-/13-timersreglerne, sikkerhedsgrænserne fra 4.0.284, zoner, geometri og land-/vandpunkter er uændrede. De to beskyttede geodatafiler ændrer kun topversionsfeltet til 4.0.285 som godkendt i DEC-0076. Se DEC-0081.
