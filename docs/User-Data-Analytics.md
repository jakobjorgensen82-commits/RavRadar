# User Data & Analytics 1.0

## Formål
At kunne undersøge hvor, hvornår og under hvilke forløb rav registreres, samt forbedre algoritmen uden at gøre enkeltbrugeres adfærd offentlig.

## Analyseprincipper

- Skeln mellem fund og manglende fund; begge er værdifulde, men manglende fund er ikke sikkert bevis på manglende rav.
- Registrér søgeindsats, når muligt: varighed, jagtform og dækket strækning.
- Undgå leakage: en regel må ikke evalueres på de samme observationer, som den blev udledt fra.
- Brug tidsopdelte datasæt og geografiske kontrolzoner.
- Rapportér datamængde og usikkerhed sammen med resultater.

## Standardudtræk
Se `schemas/analysis-export.schema.json`. Udtrækket kan efterfølgende gives til en analysemodel sammen med en beskrivelse af den konkrete hypotese.

## Fysisk lager og identitetsgrænse

Supabase er fortsat identitetssandhed. Normal turdata ligger i ti EU-låste D1-shards under et versionsbåret HMAC-pseudonym. Direkte bruger-id, anonym-id, mail, navn, JWT, GPS, rute, fri tekst og billeder må ikke nå D1. Analyse må aldrig forsøge at vende pseudonymet eller koble det til Supabase-identitet.

En brugerhenvendelse om sletning håndteres med den eksplicit bekræftede driftskommando, som sletter og verificerer både D1 og Supabase uden payloadlog. Se DEC-0082.
