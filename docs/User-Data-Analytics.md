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
