# RavRadar 4.0.576 – lokal strømfortolkning og originalovergang

Status: kildekandidat, ikke installeret eller offentligt verificeret. Den separate frosne 4.0.575-kandidat er ikke omskrevet.

PR577-opfølgning: Den første native-kontrol fandt en gammel LF-testforventning til rå decoderkoordinater. Den ene prøve kontrollerer nu hver valgt koordinat mod originalens endpoint/indeks og værdi, mens rå afvigelser fortsat måles. Producent/rapport er uændret; ny præcis Linux-kontrol afventer. Historisk aflevering af gamle FFC-køture er en separat ulukket leveringsgate.

- CURRENT_U/V fortolkes efter originalens GRIB1-gitter og native indeks. Scalarfelter, gyldige originale værdier og nulstrøm bevares.
- Ny strømfortolkning adskilles fra gammel cachekvalifikation gennem normale input-, historik-, kildevalgs-, strømhukommelses- og scorekaldere. Scoreformel, kildeprioritet, centrale administratorpunkter og geometri ændres ikke.
- Særskilt strengt nyere originalovergang med fuld gammel validering, forseglede inputbytes og normal CURRENT/TARGET-restore. Code-only og gammel checkpoint-fallback afviser denne overgang.
- Append-only SQL-kilde og præcis readback for den nye faktiske kildebinding; alle 54 tidligere migrationsfiler bevares. Lokal kilde er ikke SQL-installation.
- Normale lokale måltests bevarer 673 tilstandspar og 118 timers egne kontrollerede historikdata og afviser korrupte originaler; nye Linux-native og præcis GitHub-kildekontrol afventes.

Ingen flere/større pile, renormalisering, historikreset, datapruning, nye tjenester eller ekstra vejrhentning. Alle fem hovedmål og efterfølgende no-loss-/produktionsgates er åbne. Se DEC-0294.
