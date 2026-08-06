# RavRadar 4.0.112

## Sikker chat-overlevering og næste plantrin
- RDKS er udvidet med en obligatorisk næste-chat-overlevering, som samler aktuel sandhed, arbejdsrækkefølge, plan, referencezoner, kendte driftsrisici og bindende afgrænsninger.
- Håndbog, current truth, implementeringsstatus, aktive krav, kendte issues og masterlog er opdateret med beslutninger og læring fra det samlede forløb frem til 6. august 2026.
- End-to-end konsekvensanalyse er gjort til et eksplicit releasekrav: scheduler, tidsbudget, cache, datakæde, tests, artifact, deploy og browser skal tænkes samlet.

## Automatisk referencezonerapport
- Ny generator producerer `data/diagnostics/state-reference-zones.json` for fire faste referencezoner.
- Rapporten samler aktiv zonegeometri, pålandsretning, morfologi, aktuelle verificerede DMI-strømdata og skyggetilstandens historiske felter.
- Rapporten erstatter normalt behovet for manuelle billedserier. Screenshots kræves kun i yderste nødstilfælde.
- Als Odde og Helberskov beskrives korrekt som åben kyst nord for Mariager Fjord og ikke som fjordzone.

## Sitetest og baseline
- Sitetesten venter nu på, at dashboardet faktisk er aktivt og at knappen til samlet sitetest er synlig og klikbar, før den vurderer funktionen.
- Den historiske tilstandsmodel forbliver score-neutral. Denne release ændrer ikke RavScore, rangliste eller femdøgnsprognose.
- Vandstationsrettelserne, den kanoniske strømvektor, morfologiscore, strømbåndsforbud og kildeneutralitet er bevaret.
