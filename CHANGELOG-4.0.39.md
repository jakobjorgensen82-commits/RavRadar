# RavRadar 4.0.39 – Supabase Connection Test Fix

## Rettet

- Supabase-opsætningen tester nu Project URL og Publishable key mod Supabase Auths offentlige indstillingsendpoint.
- Den tidligere test mod `app_user_roles` er fjernet, fordi tabellen er beskyttet af Row Level Security og derfor korrekt svarede 401 før login.
- Klarere fejlbeskeder ved ugyldig URL, forkert nøgle eller netværksfejl.
- Efter en vellykket test vises et direkte link til administrationen.
- Download af `config.js` validerer nu felterne først.

## Sikkerhed

- Testen bruger kun Publishable key.
- Secret key, `service_role`, databaseadgangskode og JWT secret anvendes ikke.
