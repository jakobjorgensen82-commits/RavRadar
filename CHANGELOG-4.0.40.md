# RavRadar 4.0.40 – enkel ekspertadgang

- Tilføjer særskilt ekspertlogin i projektdrejebogen.
- Eksperten logger ind med et enkelt brugernavn (`ekspert`) og en kode.
- Brugernavnet oversættes internt til en Supabase Auth-konto; koden gemmes aldrig i projektet.
- Drejebogen kan fortsat læses uden login.
- Kun en autentificeret ekspert eller ejer kan åbne formularen til faglige rettelser.
- Rettelser gemmes i Supabase med eksisterende RLS og versionshistorik.
- Ekspertrollen giver ikke adgang til administrationen.
- Supabase-konfigurationen ligger nu i projektets `config.js`, så den separate opsætningsside er ikke en del af den normale arbejdsgang.
