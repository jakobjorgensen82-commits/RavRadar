# RavRadar 4.0.303

## Mobil opstart uden dobbeltarbejde

- Ruller 4.0.302's fysisk afviste parallelle kort-/manifest-/prognosestart tilbage til den prioriterede sekvens fra 4.0.301.
- Undgår fuld genindlæsning, når service workeren overtager siden første gang; senere reelle workeropdateringer genindlæser fortsat én gang.
- Fjerner kortfilen og de store responsive Om-billeder fra første installations forhåndshentning. Filerne er fortsat tilgængelige og cachelagres ved faktisk brug.
- Bevarer DEC-0098's fungerende `history.back()`-retur fra **Om RavRadar** og `./`-fallback ved direkte eller fremmed åbning.

## Dokumenteret regression og releasegrænse

- 4.0.302 bestod PR #207/exact-head og produktion på desktop, men blev fysisk afvist på iPhone Safari med cirka 30 sekunders kold og 7–8 sekunders varm indlæsning samt langsom første Om-navigation.
- PR #208's eksakte rollback-head var grøn, men den efterfølgende produktion `33177494546` stoppede korrekt før deploy på `INVALID_SWITCH_VERSION`; den offentlige side blev derfor på 4.0.302.
- 4.0.303 må først kaldes løst efter grøn exact-head, fuld produktion/Pages, offentlig funktionskontrol og ejerens kolde og varme fysiske Safari-prøve.

Ingen prognose-, score-, vejr-, bruger-, privatlivs-, assistent- eller geodatakontrakt ændres. Geodatafilerne ændrer kun topversionen. Sibirien forbliver privat staged og uaktiveret.
