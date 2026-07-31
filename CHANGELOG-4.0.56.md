# RavRadar 4.0.56 — Supabase-sikret administration

- Hele admin-UI låses, indtil en frisk Supabase-session, aktiv profil og `admin_access` er bekræftet.
- Håndbogen er flyttet ind i administrationen og hentes fra `admin_documents` via RLS.
- Offentlige `handbook.html` og `documentation.html` deployes ikke længere.
- Ny særskilt rettighed: `handbook_view`; `handbook_review` styrer indsendelse af rettelser.
- Rettigheder er opdelt i læse-, redigerings-, publicerings-, download- og systemrettigheder.
- Ny obligatorisk SQL-installation: `supabase/INSTALL-RAVRADAR-4.0.56-SECURITY.sql`.

Bemærkning: GitHub Pages kan ikke skjule HTML-/JavaScript-skallen kryptografisk. Sikkerheden ligger derfor i, at ingen admin-data kan læses uden Supabase JWT og RLS.

- `conditions.json` afvises, hvis `generatedAt` er ugyldig eller mere end 8 timer gammel; gammel service-worker-cache kan derfor ikke vises som aktuel.
- Nye appversioner aktiveres automatisk og udløser automatisk genindlæsning.
