# RavRadar 4.0.402

## Ændret

- Normal produktion kører 52 artifactkritiske kontroller og tre
  version-/modelbindingskontroller i stedet for 277 brede bladkontroller
  efterfulgt af 44 historiske releasegatetests.
- Alle valgte kontroller gennemføres og samles i payloadfri rapporter, før
  workflowet træffer én samlet afgørelse.
- De faktiske runtime-, Supabase-, checkpoint-, privacy-, artifact- og
  deploytrin forbliver hårde.
- Forældede DMI-testforventninger følger nu den eksisterende
  extended-bootstrap-kontrakt med 70/55 minutter, 3600/3000/900 sekunder og
  seks/tre collections.
- Browseren læser appversionen fra den versionssynkroniserede runtime/DOM i
  stedet for en hardkodet 4.0.398-fallback.

## Drift

- 4.0.401 er leveret som main 82f4fb08; normalrun 35187767148 gennemførte
  hele provider-, cache-, closure-, historik-, runtime- og uafhængige
  auditkæde, men deployede ikke efter den gamle DMI-testfejl.
- Providercacherne er bevaret. Efter 4.0.402 code-only køres én almindelig
  weather, ikke en oneoff. Scheduler forbliver pauset til frisk deploy og
  efterfølgende normal vedligeholdelse er bevist.

Se DEC-0184.
