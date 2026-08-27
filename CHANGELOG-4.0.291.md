# RavRadar 4.0.291

## Offentlig Spørg RavRadar

- Aktiverer den valgte Cloudflare `@cf/openai/gpt-oss-20b` gennem den server-side Supabase Edge-gateway efter ejerens udtrykkelige go.
- Viser en rolig dansk/tysk/engelsk forklaring i assistentdialogen: den daglige AI-kvote er begrænset for at holde RavRadar gratis, mens prognoser og lokale RavRadar-svar fortsætter ved kvoteudløb.
- Bevarer afvisning af uvedkommende og sikkerhedsfølsomme spørgsmål før provider samt lokale Candidate G-svar for bedste sted, bedste tid og konkret score.
- Bevarer CORS, tre server-side rate limits, syv sekunders timeout, struktureret output-/evidensvalidering, dataminimering og lokal fallback. Ingen providercredential findes i browseren.
- Cloudflare-kontoen er direkte kontrolleret som Workers Free / $0 med 10.000 neuroner pr. døgn og fejl ved overskridelse. Betalt overflow er ikke tilladt.

Candidate G 20/50/30, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede. Se DEC-0088.
