# RavRadar 4.0.478 – fair DMI-tid og retvisende efterkontrol

- Den rumlige kontrol genkender integreret RavScores dokumenterede
  ikke-klare historik ved en eksakt verificeret Limfjord-fastholdelse.
  Ingen tom strømværdi gøres til en måling, og ukendte statusser afvises.
- DMI's kritiske bølge- og havsamlinger deler den resterende normale
  køretid proportionalt, så bølger ikke udsulter DMI-only-vandstand
  og havstrøm. Eksisterende kildekrav, reserver og checkpoint består.
- Run `35887652848` gemte cache, checkpoint og deployede, men havde
  én fejlet diagnostisk efterkontrol og ufuldstændig vejrdækning.
  4.0.478 er først lokalt testet; produktionsvirkning afventer næste
  kontrollerede normale vejrkørsel.
