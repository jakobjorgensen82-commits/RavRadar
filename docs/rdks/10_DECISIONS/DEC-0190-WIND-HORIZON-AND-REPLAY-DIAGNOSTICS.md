# DEC-0190 – Vindhorisont og payloadfri replaydiagnose

**Status:** Aktiv og bindende; implementeret lokalt i 4.0.407, livebevis afventer
**Dato:** 2026-09-17

## Evidens

4.0.406 blev leveret gennem exact-head `35242940822`, PR #350, main
`459dc41c77a55ed1ec8b705591be267319256a84` og code-only-run
`35252644724`. En frisk browser viste version 4.0.406, scorer og femdøgn.

Normalrun `35253587766` gennemførte DMI, Copernicus og Open-Meteo og gemte
alle providerfremskridt. Den byggede runtime havde 192 utilgængelige aktuelle
modes mod op til 592 før kørslen. Deploy blev stoppet før protected writes og
Pages, fordi replay af den kompakte tilstand fejlede ens for 673/673 dele.

DMI forsøgte `dkss_idw`, `wam_dw` og `dkss_nsbs`, men ikke HARMONIE. Den
konkrete trigger brugte `missingAnyWind`: et punkt med blot én gammel
vindværdi talte derfor som fundet, selv når den krævede horisont var tom.

## Beslutning

1. HARMONIE-grundbehovet udledes af `missingWind`, dvs. aktive punkter uden
   den krævede sammenhængende 96-timers vindhorisont, ikke af “ingen vind
   nogensinde”.
2. Den eksisterende grænse består: højst ét HARMONIE-asset forsøges først;
   derefter fortsætter normal DKSS/WAM og resten af fallbackkæden.
3. `STATE_REPLAY_FAILED` forbliver en hård artifactfejl. Den må ikke omgås.
4. Replayundtagelser klassificeres i en fast, payloadfri ordliste og tælles.
   Ingen state, evidens, vejrdata, koordinater eller providerpayload logges.
5. De gemte providerfremskridt fra `35253587766` genbruges. Ingen oneoff
   startes. Udvidet bootstrap anvendes kun, hvis efterfølgende målinger viser,
   at normale kørsler ikke kan lukke det reelle dækningsgab.

## Verifikation

Efter exact-head, merge og providerfri kodeleverance køres én almindelig
weather. Den skal vise HARMONIE før DKSS/WAM, gemte cacher og enten grøn
673-state-replay eller én præcis samlet replaykategori. Først efter et grønt
deploy og en efterfølgende normal vedligeholdelse må scheduler genaktiveres.

