# Sidste engangstrin til Supabase-forbindelsen

1. Upload RavRadar 4.0.40 til GitHub som normalt.
2. Åbn `supabase-setup.html` på RavRadar-siden.
3. Indsæt Supabase **Project URL** og **Publishable key**.
4. Tryk **Gem og test**.
5. Tryk **Download config.js**.
6. Erstat projektets eksisterende `config.js` på GitHub med den downloadede fil.

Derefter er forbindelsen permanent for alle enheder. Ved senere RavRadar-versioner skal den udfyldte `config.js` bevares. Brug aldrig secret key eller service_role.
