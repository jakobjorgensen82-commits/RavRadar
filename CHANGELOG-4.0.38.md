# RavRadar 4.0.38 – Supabase Owner Integration

## Formål
Koble den eksisterende Supabase-installation sikkert til RavRadar uden at ændre den normale GitHub/ZIP-arbejdsgang.

## Implementeret
- Rigtigt Supabase-login beskytter `admin.html`.
- Kun en bruger med rollen `owner` kan indlæse administrationen.
- Den tidligere lokale `sessionStorage`-lås er fjernet som adgangskontrol.
- Engangssiden `supabase-setup.html` kan gemme og teste Project URL og Publishable key lokalt.
- Opsætningssiden kan generere en færdig `config.js`, som kan uploades én gang til GitHub.
- Admins systemside viser Supabase-forbindelse, ejerkonto og central lagringsstatus.
- Logout afslutter Supabase-sessionen.
- Service worker og versionsfiler er opdateret til 4.0.38.

## Sikkerhed
- Secret key, `service_role`, databaseadgangskode og JWT secret må aldrig indsættes.
- Browseren bruger kun Project URL og Publishable key.
- Owner-kontrollen sker mod `app_user_roles` under Row Level Security.

## Drift
Almindelige RavRadar-opdateringer kræver fortsat kun upload af en ny komplet ZIP til GitHub. Supabase-konfigurationen ligger i `config.js` og bevares i efterfølgende versioner.

## Validering
`npm run validate` gennemført. Alle automatiske tests består. Den eksisterende geometriaudit markerer fortsat 8 zoner til manuel kontrol.
