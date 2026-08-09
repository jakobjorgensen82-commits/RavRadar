# RavRadar 4.0.140

- Tilføjer en privat state-/historik-replaygate for Blåvands to isolerede kystdele.
- Genbruger den eksisterende score-neutrale `shadow-v2`-statefunktion med hver dels egen `historyKey`.
- Afviser delte historiknøgler, parent-historikgenbrug, krydslæsning og numerisk scorepåvirkning.
- Bruger kun aktuelle current-U/V-værdier i en midlertidig, ikke-uploadet cachefil, som slettes efter replay; artifactet indeholder kun kompakt state og kontekstbundne hash.
- Aktiverer ikke state, RavScore, UI, public runtime, admin-write, sampling eller geometri.

Status ved kandidat: lokale state-/workflow-self-tests består; privat CI-pilot, artifactreview og normal produktionsverifikation afventer.
