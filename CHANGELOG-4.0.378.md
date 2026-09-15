# RavRadar 4.0.378

## Lokal samlet releasekandidat efter Astra-gennemgang

Ikke leveret endnu. Fund A–G i
`docs/ai/ASTRA_DELIVERY_CHAIN_REVIEW_2026-09-15.md` er implementeret samlet
oven på pointerrettelsen. Main og produktion er fortsat uændret; ingen
provider, weather eller oneoff er startet.

## Rettet

- 4.0.377 bestod sourcegate `34946601576`, blev merged gennem PR #319 som
  main `ec26f8e4`, og providerfri code-only `34947169348` beviste rettelsen af
  DMI-stien: privat specifikation og bundle blev bygget fra den installerede
  kanoniske cache efter grøn offentlig genopbygning og 210/673-audit.
- Den private publicering stoppede før writes, fordi pointerlæseren krævede,
  at den aktuelle gemte forgænger allerede havde den nye modelhash. Dermed
  blev det eksakte migrationsbevis aldrig nået.
- 4.0.378 accepterer før publicering kun den historiske current-binding, der
  matcher det medsendte forgængermanifest eksakt. Efter publicering skal current
  matche aktuel model, mens previous må bevare en ældre, stramt formvalideret
  rollbackbinding.
- To private generationer må nu have samme vejrtid, når selve publiceringen er
  godkendt af 4.0.377’s eksakte migrationsbevis. En nyere vejrtid må fortsat
  ikke efterfølges af en ældre.
- Code-only deployer kun den eksakte `ravradar-assistant` før readiness.
  Privat spec/bundle og Pages/privacy køres som fire uafhængige prewrite-led,
  og en samlet beslutning stopper før enhver produktionwrite ved fejl.
- Rene releaseversions- og cachebusterændringer påvirker ikke private
  kontrakthashes. Reelle kildeændringer er fortsat hashfølsomme. Identisk
  privat indhold fra en ny commit genbruger den oprindelige pointer uændret.
- CAS- og pointerwrites med mistet svar afgøres ved eksakt versions- og
  payloadreadback uden blind gentagelse. Sikre læsninger og idempotente
  Storage-kald genprøves én gang ved netværk/429/502/503/504.
- Historisk restore vælger generation efter eksakt forventning og bundlebytes,
  selv om pointerens current tilhører en nyere model. Udløbet kompatibel
  current plus uegnet historik fører til målt koldstart, ikke falsk friskhed.
- Den offentlige detailfil downloades med manifestets eksakte byteantal under
  samme 192 MiB-loft som læseren. Historical maintenance accepterer eksakt
  verificeret reconciliation ved et mistet completion-svar.

## Kontrol

- Regressionen gennemfører gammel current → ny current på samme vejrtid og
  kontrollerer readback, anonym-afvisning, senere generationer, retention og
  cleanup ved tabt samtidig skrivning. En særskilt test bruger to reelt
  forskellige, selvkonsistente arkiver og gendanner den historiske generation.
- Version-only kontra reel kontraktændring, samme indhold/ny source, gemt
  write med mistet svar, transient 502, udløbet/uegnet blanding, prewrite-
  rækkefølge, eksakt assistentdeploy og manifestgrænse er måltestet.
- Uden eksakt forgængerbinding og migrationsbevis afvises overgangen fortsat.
- Ingen vejrdata, scoreformel, state, geometri eller land-/vandpunkt er ændret.
- Fysisk runnerdød efter `PENDING`, holdbart kildebevis efter 14 dage,
  exact-head, merge, live code-only og normal weather er fortsat åbne beviser.
