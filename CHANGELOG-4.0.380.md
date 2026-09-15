# RavRadar 4.0.380

## Rettet

- Retter auditforbrugerens historikform, så den matcher producentens fire
  faktiske felter, inklusive antal utilgængelige aktuelle modes.
- Bevarer `calibrationEligible=false`, når aktuelle scores er utilgængelige;
  der opfindes ingen scorer og ingen manglende input accepteres som komplette.
- Gør gentagne kode-only-opgraderinger current-bundne. Migrationen bruger den
  private pointers faktiske current-commit og manifest i stedet for den
  oprindelige hardkodede forgænger.
- Kræver GitHub-bevis for, at current-kilden er en forfader til ny main, eksakt
  descriptor-/manifest-/bundlebinding og fortsat kun modelbundlehashændringer.
- Giver current-restore højst tre korte forsøg ved midlertidige Supabase-fejl.

## Evidens

- 4.0.379 sourcegate `34959283992`, PR #321 og main `0cc4a867` er grønne.
- Providerfri `34959875107` bestod Pages-privacy, privat publicering,
  anonym-afvisning, assistentdeploy og readiness. Den stoppede før Pages-begin
  alene på den tre-felts auditforbruger; ingen provider kørte.
- Det gamle source-handoff, recoverybevis og Pages-artifact fra `34877443841`
  findes stadig og er ikke udløbet.
- De målrettede 210/673-audit-, activation-, protected-runtime-, migration-,
  code-only-, workflow-, outcome- og readinesskontroller er grønne lokalt.
- Geometri, koordinater, vejrdata, målinger, scoreformel og modelstate ændres
  ikke. Geodata får alene topversionsløft til 4.0.380.

## Næste bevis

Én exact-head sourcegate, merge og providerfri code-only skal gennemføre Pages
og central completion. Først derefter køres normal tidsbegrænset weather for at
bevise numeriske scorer, DMI-rotation og cache. Ingen oneoff.
