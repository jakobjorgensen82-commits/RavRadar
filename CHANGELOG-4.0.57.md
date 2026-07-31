# RavRadar 4.0.57

## Samlet stabilisering af Supabase-sikret administration

- Retter SQL-installationen, så constraint-inspektion henter både `oid` og navn.
- Understøtter Supabases nye `sb_secret_...` servernøgler uden ugyldig Bearer-header.
- Bevarer kompatibilitet med den klassiske `service_role`-nøgle.
- Synkroniserer håndbogen til den beskyttede `admin_documents`-tabel ved hvert deploy.
- Runtime-diagnostik downloades fra den allerede adgangskontrollerede Supabase-kopi og ikke fra en offentlig filadresse.
- Samler og opdaterer alle aktive versionsreferencer.
- Udvider versionsværktøjet, så håndbog, dokumentation og adminfiler ikke igen kommer ud af takt.
