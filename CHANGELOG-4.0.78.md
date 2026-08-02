# RavRadar 4.0.78

## Sikker strømproveniens

- Manglende DMI-komponenter kan ikke længere blive fortolket som `0 m/s` via JavaScripts `Number(null) === 0`.
- `current-u` og `current-v` gemmes kun, når begge værdier kan dokumenteres fra samme DMI-gitterpunkt og et gyldigt tidsmatch.
- Eksakte tidspunkter og kontrolleret lineær interpolation mærkes særskilt med kildetider.
- Open-Meteo og andre ikke-DMI-rækker får aldrig DMI-proveniens.
- Ikke-verificerbare timer beholder den eksisterende viste strømværdi, men u/v-felterne fjernes og status sættes til `unverified` med en konkret årsag.
- Strømauditten skelner nu mellem verificerede timer, ikke-verificerbare timer og reelle uoverensstemmelser.
- Release Gate stopper fortsat ved forkert gitterpunkt, hastighed, retning eller pil, men ikke blot fordi rå proveniens mangler.
- Ny null-sikkerhedstest forhindrer, at manglende data igen bliver til falsk fysisk nulstrøm.

## Verificeret på medfølgende datasæt

- 197 af 209 aktive zoner har dokumenteret marine DMI-u/v-gitterpunkter.
- 23.049 prognosetimer er verificeret direkte fra rå u/v-komponenter.
- 1.613 prognosetimer er tydeligt markeret som ikke-verificerbare uden at blive overskrevet.
