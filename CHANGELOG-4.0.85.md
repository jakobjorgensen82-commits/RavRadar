# RavRadar 4.0.85

## Korrekt kanonisk DMI-strømvektor

GitHub-valideringen i 4.0.84 afslørede, at den viste strømretning i enkelte prognosetimer ikke kunne genskabes præcist fra de lagrede `currentUMps/currentVMps`.

Rodårsagen var afrundingsrækkefølgen i proveniensberigelsen:

- `currentUMps/currentVMps` blev gemt afrundet til fem decimaler.
- `currentDirectionDeg/currentSpeedMps` blev beregnet fra de oprindelige, ikke-afrundede værdier.
- Audit, scoremotor og debug læste senere den afrundede vektor.
- Ved meget svag strøm kunne få decimaler ændre vinklen mærkbart, selv om hastigheden var tæt på nul.

Rettelsen fastlægger nu først én kanonisk lagret u/v-vektor. Hastighed og retning beregnes derefter udelukkende fra præcis den samme vektor. Auditgrænserne er ikke løsnet.

## Betydning for RavScore

RavScore bruger de afledte strømfelter. Inkonsistente felter kunne derfor påvirke transportbidraget, især tæt på retningsgrænser. Efter 4.0.85 kan score, pil, debug og videnskabelig audit ikke længere se forskellige versioner af samme strømvektor.

## Verifikation

- 197/209 aktive zoner har dokumenteret DMI-u/v-gitterpunkt.
- 23.049 prognosetimer verificeres direkte mod lagret u/v.
- 1.613 timer uden fuld proveniens forbliver tydeligt ikke-verificerbare.
- De 12 kendte zoner uden dokumenteret gitterpunkt er fortsat advarsler og skjules ikke.
