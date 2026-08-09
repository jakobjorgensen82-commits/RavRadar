# RavRadar 4.0.140

- Tilføjer en privat state-/historik-replaygate for Blåvands to isolerede kystdele.
- Genbruger den eksisterende score-neutrale `shadow-v2`-statefunktion med hver dels egen `historyKey`.
- Afviser delte historiknøgler, parent-historikgenbrug, krydslæsning og numerisk scorepåvirkning.
- Bruger kun aktuelle current-U/V-værdier i en midlertidig, ikke-uploadet cachefil, som slettes efter replay; artifactet indeholder kun kompakt state og kontekstbundne hash.
- Aktiverer ikke state, RavScore, UI, public runtime, admin-write, sampling eller geometri.

Produktionsverificeret: privat pilot #2004 bestod med to unikke historiknøgler, nul parent-genbrug/krydslæsning, verificerede replay-samples, nul scorepåvirkning og slettet transient råinput. Artifactet har ingen rå replayfelter eller credentialbærende URL. Normal produktion #2003 bestod central adminsync, frisk DMI/vejr, fuld Linux-validate, release-gate, Pages-artifact og deploy på `0f8171b`; offentlig `version.json` viser 4.0.140.
