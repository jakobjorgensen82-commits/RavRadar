# RavRadar 4.0.284

4.0.284 reducerer browserens tillid og flytter offentlige skrive- og gatewaykontrakter til serveren.

- Alle offentlige HTML-sider får en lukket CSP; inline scripts flyttes til versionsstyrede filer, og dynamisk håndbogs-HTML saniteres med allowlist.
- Ekspertadministration afgrænses i RLS, skrive-RPC og UI til ekspertprofiler samt `admin_access`, `handbook_view` og `handbook_review`.
- Direkte browserinsert på observationstabellen tilbagekaldes. Den nye `submit-observation`-gateway håndhæver felt-, payload-, privatlivs-, bruger-, tids-, idempotens- og rate-limit-kontrakten.
- Begge Edge-funktioner genbruger én delt gateway med origin-allowlist, CORS, timeouts og sikre fejl. De er deployet og negativt/pre-store-verificeret uden private rækker eller testobservationer.
- Rav-assistentens fjernflag er slået fra. Den lokale Candidate G-assistent er standard og udfører intet skjult 503-kald, mens ingen godkendt OpenAI-secret er installeret.
- Supabases mulige begrænsning fra 9. september 2026 overvåges som driftsrisiko.

Windows Application Control blev ikke svækket eller omgået. Candidate G 20/50/30, scorekurver, vejr, zoner, geometri, land-/vandpunkter og private data er uændrede. Se DEC-0080.
