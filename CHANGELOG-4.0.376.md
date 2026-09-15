# RavRadar 4.0.376

## Rettet

- 4.0.375 bestod exact-head-kontrollen `34939186051`, blev merged gennem PR
  #317 som main `e95339e5`, og providerfri code-only `34939798892` beviste den
  komplette rekursive metadataoverførsel og atomiske installation af den gemte
  private runtime.
- Den efterfølgende offentlige genopbygning blev fejlagtigt stoppet, fordi tre
  ekstra privacykald brugte menneskelige beskrivelser som tekniske rodstier.
  Derfor kunne den eksisterende allowlist ikke genkende de godkendte
  `flowPoints.current`- og `flowPoints.wind`-koordinater.
- Kaldstederne bruger nu de kanoniske rødder `startup`, `details` og `manifest`.
  Selve privacyreglerne er ikke lempet, og ukendte koordinater, rå strømvektorer
  og private statefelter afvises fortsat.

## Kontrol

- Code-only-kontrakten låser de tre rodstier og afviser den gamle label-form.
- Den fulde offentlige 210/673-runtimekontrakt og Pages-privacykontrollen er
  grønne.
- Ingen provider, oneoff, score, vejrdata, state eller geometri ændres.
