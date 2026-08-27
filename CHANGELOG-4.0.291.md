# RavRadar 4.0.291

## Offentlig Spørg RavRadar

- Aktiverer den valgte Cloudflare `@cf/openai/gpt-oss-20b` gennem den server-side Supabase Edge-gateway efter ejerens udtrykkelige go.
- Viser en rolig dansk/tysk/engelsk forklaring i assistentdialogen: den daglige AI-kvote er begrænset for at holde RavRadar gratis og gælder kun Spørg RavRadar uden indflydelse på kort, prognoser, RavScore eller øvrige funktioner.
- Bevarer afvisning af uvedkommende og sikkerhedsfølsomme spørgsmål før provider samt lokale Candidate G-svar for bedste sted, bedste tid og konkret score.
- Bevarer CORS, tre server-side rate limits, syv sekunders timeout, struktureret output-/evidensvalidering, dataminimering og lokal fallback. Ingen providercredential findes i browseren.
- Låser og normaliserer fagord deterministisk pr. sprog efter live-smoke-testen. Candidate G-vægtspørgsmål får et fast evidensbundet DA/DE/EN-svar med `ravmobilisering`, `Bernsteinmobilisierung` eller `amber mobilisation`; sproglige modelhybrider kan derfor ikke nå brugeren.
- Cloudflare-kontoen er direkte kontrolleret som Workers Free / $0 med 10.000 neuroner pr. døgn og fejl ved overskridelse. Betalt overflow er ikke tilladt.
- PR #187 bestod exact-head `33114501539` på `d781e464` og blev merged som `c6c9998c`. Produktion `33114598957`, build `98665953481`, Pages `98668455689` og offentlig DA/DE/EN-/390 px-kontrol er grønne. Kort, fem aktuelle områder og fem dagsfaner er synlige; den særskilt markerede Candidate G-nøddrift fortsætter, mens frisk data modnes.

Candidate G 20/50/30, vejr, sortering, konto-/turdata, privatliv, geometri og land-/vandpunkter er uændrede. Se DEC-0088.
