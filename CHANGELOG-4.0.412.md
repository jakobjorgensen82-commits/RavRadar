# Changelog 4.0.412

4.0.412 tilføjer en engangsgenopretning for det allerede offentlige 4.0.410-
artifact fra run `35331664087`. Pages blev verificeret og lagt online, men den
efterfølgende centrale forsegling stoppede på de 673 kendte
`LAST_MILE_HISTORY_POINT`-fund. Derfor stod den centrale aktive tilstand stadig
på det forrige artifact, og en almindelig kode-only-fortsættelse blev korrekt
afvist.

Genopretningen accepterer kun de fastlåste, payloadfrie beviser fra source-run
`35331109332` og target-run `35331664087`, genverificerer den offentlige side
friskt og skriver den allerede offentlige same-binding-overgang som central
version 24. Diagnostiske fund holder kalibrering låst. Ukendt head, artifact,
hash, binding, deployment eller auditregnskab stopper uden skrivning.

Efter genopretningen kan den normale providerfri kode-only-rute genbruge de
gemte vejrdata, anvende den eksisterende append-only modelbinding og bygge
4.0.412 med 4.0.411's last-mile-rettelse. Formel, vægte, providerprioritet,
geometri og land-/vandpunkter er uændrede.
