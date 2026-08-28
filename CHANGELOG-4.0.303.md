# RavRadar 4.0.303

## Mobil opstart uden dobbeltarbejde

- Ruller 4.0.302's fysisk afviste parallelle kort-/manifest-/prognosestart tilbage til den prioriterede sekvens fra 4.0.301.
- Undgår fuld genindlæsning, når service workeren overtager siden første gang; senere reelle workeropdateringer genindlæser fortsat én gang.
- Fjerner kortfilen og de store responsive Om-billeder fra første installations forhåndshentning. Filerne er fortsat tilgængelige og cachelagres ved faktisk brug.
- Bevarer DEC-0098's fungerende `history.back()`-retur fra **Om RavRadar** og `./`-fallback ved direkte eller fremmed åbning.

## Dokumenteret regression og releasegrænse

- 4.0.302 bestod PR #207/exact-head og produktion på desktop, men blev fysisk afvist på iPhone Safari med cirka 30 sekunders kold og 7–8 sekunders varm indlæsning samt langsom første Om-navigation.
- PR #208's eksakte rollback-head var grøn, men den efterfølgende produktion `33177494546` stoppede korrekt før deploy på `INVALID_SWITCH_VERSION`; den offentlige side blev derfor på 4.0.302.
- 4.0.303 bestod PR #209/exact-head `33178940206`/job `98874825239`, merge `19886fc0`, produktion `33179036658`, build `98875217073` og Pages `98877901727`.
- Den offentlige side viste version 4.0.303, 210 interaktive zoner, fem **Bedste områder** og fem resultater på alle fem prognosedage. Isoleret varm desktopstart var cirka 1,6 sekunder; første Om-åbning cirka 0,9 sekund og retur cirka 1,7 sekunder.
- Ejeren bekræftede derefter på fysisk iPhone Safari korrekt version, fungerende Om-retur og både kold og varm start på 4–5 sekunder. Regressionen er produktions- og fysisk verificeret løst.

Ingen prognose-, score-, vejr-, bruger-, privatlivs-, assistent- eller geodatakontrakt ændres. Geodatafilerne ændrer kun topversionen. Sibirien forbliver privat staged og uaktiveret.
