# RavRadar 4.0.227

## Rettet

- Administratorens lokale vinkelmåling ved land-/havpunkter er nu vejledende og kan ikke længere låse **Godkend og gem centralt**.
- På bugtede og detaljerede kyster kan den nærmeste korte kysttangent afvige kraftigt fra den repræsentative retning, som ejeren vurderer ud fra hele kyststrækningen.
- Admin viser fortsat vinkelafvigelsen som en advarsel og forklarer nu direkte, at ejerens manuelle helhedsvurdering afgør godkendelsen.

## Fortsat blokerende integritetskontrol

- Manglende eller ugyldige punkter, afstand uden for 0,05–8 km, manglende kryds med den valgte kyststrækning og punkter på samme side af kysten blokerer fortsat.
- De tre manuelle bekræftelser, central Supabase-readback og den efterfølgende DMI-/releasegate er uændrede.

## Rodårsag og regression

- Ved Svansodde blev et cirka 461 meter langt, visuelt godkendt punktpar afvist ud fra tangenten på et cirka 15 meter langt mikrostykke af den detaljerede kystlinje.
- Regressionen beviser, at en stor lokal vinkelafvigelse giver `warning`, men stadig er gyldig til ejerens godkendelse, mens et punktpar uden kystkryds fortsat afvises.

## Uændret

- Ingen land-/havpunkter, kystlinjer, DMI-data, RavScore-vægte, tærskler, fallback eller offentlige vejrdata ændres af 4.0.227.

## Lokal validering

- Målrettet adminregression, RDKS, releaseversion, modulversionering, adminfrontend, feature-reachability, sitetest, håndbog, persistens, kortlivscyklus og lokal releasegate består.
- Den fulde lokale `validate` gennemførte geometri-v2-kæden og stoppede derefter fail-closed på repositoryets kendte historiske 209/211-vejrsnapshot før central adminhydrering. Forholdet blev ikke omgået.

## Produktionsverifikation

- GitHub Actions #31908498204/#2824 på commit `6e920c297ef58f997ae95b3b6da16adfdf66bfe6` bestod central adminhydrering, frisk DMI, fuld `validate`, releasegate, supportartifact, beskyttet Supabase-sync, Pages-artifact og deploy.
- Supportartifactet har bestået releasegate og datasæt `rr-20260815210805-210` med 210 zoner og 673 kyststrækninger. SHA-256 matcher manifestet for både den offentlige startpakke og detaljepakken.
- Direkte Pages-kontrol viste version 4.0.227 og den deployede ikke-blokerende vinkeladvarsel. Den tidligere hårde 20-graders blokering findes ikke længere i live admin-koden.
