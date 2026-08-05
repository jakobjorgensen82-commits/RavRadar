# RavRadar 4.0.110

## DMI-pipeline: marine recovery før HARMONIE

- Retter produktionsfejlen, hvor et HARMONIE-GRIB på ca. 600 MB brugte næsten hele bulkjobbets tidsbudget, så DKSS kun nåede få timer og u/v-auditten endte med 0 verificerede prognosetimer.
- Når marinehorisonten er ufuldstændig, prioriteres DKSS-collections nu før atmosfære og bølger.
- HARMONIE må ikke længere sulte de release-kritiske strøm- og vandstandsdata.
- Eksisterende cache flettes fortsat; auditten er ikke svækket, og manglende u/v accepteres ikke som gyldig nulstrøm.
- RavScore og skyggetilstandsmodellen er uændret.
- Tilføjer regressionstesten `test-dmi-marine-first-recovery-4.0.110.mjs`.

## Udviklingsregel

RDKS fastholder, at workflowændringer skal analyseres end-to-end: planlægning, tidsbudget, cache, datagenerering, validering, artifact og deploy skal tænkes igennem samlet før release.
