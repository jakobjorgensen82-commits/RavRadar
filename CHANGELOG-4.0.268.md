# RavRadar 4.0.268

- Tilføjer **Grundbog i ravjagt**, som lærer ravets egenskaber, havets processer, kystens betydning, felttegn og selve jagten, før den forklarer RavRadar.
- Dækker mobilisering, transport, vind, bølger, strøm, vandstand, revler, render, langs- og tværtransport, strandjagt, vandkant, waders, UV og typiske hændelsesforløb.
- Forklarer den kausale kæde i almindeligt dansk: bølger kan løsne og holde materiale i bevægelse, strømmen står for den vigtigste vedvarende transport, og kysten sorterer og samler.
- Viser kilder og skelner mellem dokumenteret viden, stærk kystfysisk analogi, praktisk erfaring og åbne spørgsmål.
- Forenkler offentlige standardtekster om opdatering, datakilder, score, Rav-assistent, login, konto, tur og fejl. Admin- og debugværktøjer forbliver tekniske.
- Låser grundbogens faglige rækkefølge, emner, aktive `20/50/30`, waders-vindkurve, udtransportregel, mobilopsætning og almindelige sprog i målrettede tests og releasegaten.
- Kører også landslisternes almindelige rangeringstekst og stateforklaringens nye overskrift i den tidlige kildegate, så forældede ordrette UI-tests ikke først opdages efter en fuld vejropbygning.
- Ændrer ingen RavScore-regel, Candidate G-profil, vejrdata, Supabase-kontrakt, geometri eller land-/vandpunkter. Geodatafilerne ændrer kun versionsfelt til 4.0.268.
- Produktionsverificeret via PR #118/exact-head `32672522334`, merge `3c22e40b`, produktion `32672578127` og live `rr-20260823230848-210` på 210/673. Den offentlige browseraudit bestod 420 aktuelle, 2.100 femdøgns- og 673 kystdelsvisninger uden fejl.
