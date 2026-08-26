# RavRadar 4.0.284

4.0.284 reducerer browserens tillid og flytter offentlige skrive- og gatewaykontrakter til serveren.

- Alle offentlige HTML-sider får en lukket CSP; inline scripts flyttes til versionsstyrede filer, og dynamisk håndbogs-HTML saniteres med allowlist.
- Ekspertadministration afgrænses i RLS, skrive-RPC og UI til ekspertprofiler samt `admin_access`, `handbook_view` og `handbook_review`.
- Direkte browserinsert på observationstabellen tilbagekaldes. Den nye `submit-observation`-gateway håndhæver felt-, payload-, privatlivs-, bruger-, tids-, idempotens- og rate-limit-kontrakten.
- Begge Edge-funktioner genbruger én delt gateway med origin-allowlist, CORS, timeouts og sikre fejl. De er deployet og negativt/pre-store-verificeret uden private rækker eller testobservationer.
- Rav-assistentens fjernflag er slået fra. Den lokale Candidate G-assistent er standard og udfører intet skjult 503-kald, mens ingen godkendt OpenAI-secret er installeret.
- Supabases mulige begrænsning fra 9. september 2026 overvåges som driftsrisiko.

Windows Application Control blev ikke svækket eller omgået. Candidate G 20/50/30, scorekurver, vejr, zoner, geometri, land-/vandpunkter og private data er uændrede. Se DEC-0080.

PR #155 bestod exact-head `32986025916`, blev merged som `a92e270419404f249c526ed06d821cc2c2cf5cb2`, og pushproduktionen `32987875007` bestod central hydrering, frisk data, fuld validering, releasegate, artifact og Pages. Den offentlige sikkerheds- og 210/673-strukturkontrol er grøn.

Den efterfølgende funktionskontrol viste, at den aktuelle Candidate G-rangliste var fail-closed på grund af en særskilt cadencefase ved 48-timersgrænsen. Sikkerhedshærdningen er live, men 4.0.284 kaldes ikke stabil baseline; driftsrettelsen følger i 4.0.285/DEC-0081.
