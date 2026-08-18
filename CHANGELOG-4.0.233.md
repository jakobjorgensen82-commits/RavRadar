# RavRadar 4.0.233

## Lokal kystdel bruger ikke moderzonens retningsankre

- Retter en systemisk modsigelse, hvor en lokal del kunne vise eget navn og eget land-/havpunkt, men beregne strømtransport mod en anden del af moderzonen.
- Liveaudit fandt 216 berørte dele i 52 zoner og 49 aktuelle zonevindere. Havsande nordkyst brugte konkret `Syd for fyret` som scoreanker.
- Hver af de 673 aktive dele får nu præcis ét lokalt retningsanker med eget navn, vandpunkt, landpunkt og hav→land-retning.
- Score, historik, debug og forklaring bruger dermed samme lokale geometriske sandhed. Moderzonens øvrige statiske kystegenskaber bevares.
- Strømpilene ændres ikke: auditten bekræfter nul U/V/retning-, pil/grid-, provenance-, kildeklasse- eller afstandsfejl i det kontrollerede live-datasæt.
- Ny landsdækkende regression dækker 673/673 dele og et direkte Blåvand-modbevis.
- De fire aktive workflow-User-Agents er versionslukket til 4.0.233, så den centrale versionstest ikke kan afvise releasen på et efterladt 4.0.232-mærke.
- Commit `286ea9e5` er produktionsverificeret i `#32165688946` og den efterfølgende fulde kørsel `#32165969786`: frisk central geometri og vejr, 673/673, fuld validering, releasegate, Supabase, Pages-artifact og deploy er grønne.
- Direkte liveaudit af datasæt `rr-20260818173528-210` kontrollerer 673 dele og 43.064 prognose-/jagtformstimer. Der er nul lokale anker-, vinder/navn/score-, vand→land-retning-, U/V-retning-, pil/grid-, provenance- eller afstandsfejl; detaljefilens byteantal og SHA-256 matcher manifestet.
- Håndbogens to efterladte historiske 95 %-formuleringer er rettet til den bindende dynamiske 100 %-gate, aktuelt 673/673.

## Uændret

- Kildeordenen er fortsat DMI ≤5 km → Baltic ≤5 km → AMM15 ≤5 km → kun otte godkendte `dkss_lf`-proxyer ≤15 km.
- Normal drift kræver fortsat præcis 673/673. Copernicus-livepiloten, 168-timersopsamlingen og `dmi-only-rollback` er uændrede.
- Ingen land-/vandpunkter, strømværdier, modelceller, dybdelag eller scorevægte flyttes af rettelsen.
