# DEC-0240 – gyldig native fastholdelse skal kunne checkpointes under warmup

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.469; livebevis afventer

**Installationspræcisering:** Den første PR-kontrol viste, at
checkpointrettelsen ændrer implementeringshashen, som den allerede anvendte
`20260923052100`-migration binder. Den migration ændres ikke.
`20260923091500` er den append-only efterfølger med den nye hash; schema,
installer, readiness og kode-only-planen følger samme migrationsrækkefølge.

Kode-only-run `35835042039` på 4.0.468 blev med vilje standset før
beskyttede writes og deploy. Den aktuelle private runtime blev verificeret
og genbrugt, og offentlig runtime blev genbygget fra gemte data. Det nye
målte scorecheckpoint afviste derefter kystdel
`dk-b05-12-national-part-01`: havstrømstilstanden modsagde ifølge
checkpointet dens kompakte bevis.

Årsagen var en forskel mellem producent og checkpoint. Den integrerede
scoremodel identificerer en godkendt regional fastholdelse ved, at dens
eksakte verificerede havstrømsreference er ældre end scoretimen, og at den
har samme godkendte kildebevis. Det gælder også, når den øvrige 48-timers
historik endnu er ufuldstændig. Checkpointet krævede derimod status
`READY_NATIVE_HOLD`, som netop ikke foreligger under denne opbygning, og
gav ikke det eksakte referencetidspunkt videre til replay. Replayet skabte
derfor en kunstig modsigelse.

Checkpointet bruger nu samme tids-/autorisationsbetingelse og
`nativeHoldReferenceTime` som modellens egen tilstandsvalidator. Den
efterfølgende fulde modelvalidator forbliver aktiv; ingen modsigende eller
ukendt fastholdelse accepteres. En regression konstruerer en ægte kort
regional fastholdelse uden fuld historik og gemmer den i et checkpoint med
673 dele. Ændringen giver ikke manglende havstrøm kunstige værdier og
påvirker ikke vejrdata, scoreformel eller leverandørprioritet.

Ingen provider blev kaldt af det fejlede kode-only-run. Den offentlige
4.0.467-prognose og private vejrpakke blev ikke overskrevet. Først når
4.0.469 har bestået eksakt-head-kildekontrol og et kode-only-run faktisk
har gemt checkpoint, kan en kontrolleret normal vejrkørsel teste
historikfortsættelse og de særskilte vind-/havstrømshuller. Den automatiske
tidsplan forbliver deaktiveret imens.
