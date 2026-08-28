# RavRadar 4.0.302

## Parallel offentlig opstart – fysisk afvist

- Kort-/kystprojektion og manifestbundet prognosehentning blev startet parallelt for at forsøge at reducere ventetiden.
- PR #207/exact-head og produktion var grønne, og desktopkontrol viste komplet kort og prognoser.
- Ejerens fysiske iPhone Safari-test viste cirka 30 sekunders kold indlæsning, 7–8 sekunders varm indlæsning og langsom første åbning af **Om RavRadar**. Ændringen er derfor afvist og erstattet af DEC-0099/4.0.303.
- PR #208 forsøgte en byteidentisk 4.0.301-rollback. Exact-head var grøn, men produktion `33177494546` stoppede korrekt før deploy på `INVALID_SWITCH_VERSION`; offentlig 4.0.302 blev ikke ændret.

Versionen ændrede ingen Candidate G-, RavScore-, vejr-, prognose-, bruger-, privatlivs- eller geodatakontrakter.
