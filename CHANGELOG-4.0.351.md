# RavRadar 4.0.351 – ens offentlig modelrekonstruktion før cutover

Dato: 2026-09-13

## Rettet

- Lokal `UNAVAILABLE` nulstiller ikke længere en gyldig hukommelses- eller migrationsstatus for hele den integrerede profil.
- Producent og offentlig audit bruger samme H0-currentregel, samme publicerede strøm/provenance og samme bølge-/last-mile-fortolkning.
- Den kompakte startpakke beholder en deterministisk kystdelsidentitet for lokalt utilgængelige modes, så den ikke bliver tom uden at opfinde en score eller en vinder.
- Den afsluttende 210/673-audit er ikke lempet; rettelsen fjerner kun forskelle mellem producentens og auditens fortolkning af de samme publicerede data.

## Binding og drift

- PR #285 blev merged som main `f6e725ec`, og backendrun `34720600286` anvendte migration 12 og bestod readback.
- Cache-only-run `34720789985` hentede intet nyt providervejr og beholdt current 79.414/79.414. Det nåede alle 210 zoner, 673 kystdele og 1.346 aktuelle resultater, men stoppede før cutover/deploy på de fire nu rettede offentlige kontrolkoder.
- Ny append-only migration `20260913010000_public_runtime_oracle_binding.sql` fører kun 4.0.351-forseglinger og readbackversion frem. Migration 12 er byteuændret.
- Integrated bundle: `79d5118a1b37b542532721ebe1b943df00b646e1625b991d5a9ad597d36d0ae8`.
- Candidate G-rollbackbundle: `84311c920b3f2697f31fe32ebef4d7932f59f5fe784b2b7d1dbf679d9007a28c`.
- Continuationhash: `9d3960137054a1ab40ec10e4514425c436f979fac18ce3f92137512e47b629e6`.
- Der startes ingen ny oneoff. Næste rækkefølge er én exact-head GitHub-sourcegate, merge, migration-13-readback, cache-only preflight, faktisk cutover og offentlig kontrol.

Se DEC-0133.
