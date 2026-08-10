# RavRadar 4.0.153

- Supabase-readback filtreres nu server-side til de seks dokumenter, produktionskæden faktisk hydrerer. Den lokale payloadækvivalent falder fra mindst 8,4 MB til cirka 144 KB pr. schedulerkørsel.
- Beskyttede maskindokumenter får SHA-256-manifest og skrives kun, når indholdet er ændret.
- Ny Supabase-triggerkontrakt annullerer identiske updates, bevarer rollback for menneskeligt redigerede admin-data og versionskopierer ikke udskiftelige maskindiagnostikker.
- En read-only SQL-audit viser tabelstørrelser og forventet oprydning. Den separate transaktionelle migration sletter aldrig aktuel sandhed i `admin_documents`, fjerner historiske maskinkopier og beholder de nyeste 100 rollbackpunkter pr. øvrigt dokument.
- Central drift 2026-08-10: 8.647 historikrækker/cirka 600 MB blev fjernet, og `VACUUM FULL` reducerede databasen fra 699 MB til 24 MB. Alle 14 aktuelle admin-dokumenter blev bevaret; produktionskørsel #2056 bestod fulde gates og deploy.
- Automatisk `VACUUM FULL` er bevidst forbudt; eventuel fysisk komprimering besluttes først efter audit og backup.
