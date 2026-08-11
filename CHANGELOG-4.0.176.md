# RavRadar 4.0.176

- Aktiverer den ejer-godkendte nationale kystgeometri fra privat run `31480089490`: 605 lokale kystdele i 190 hovedzoner, nul overlap og 605 land-/vandpunktpar.
- Sampler lokale dele i de eksisterende DMI-GRIB-downloads uden et netkald pr. del og uden at udvide schedulerens hovedzonenævner.
- Beregner RavScore pr. lokal del og tidspunkt. Bedste gyldige del bestemmer hovedzonens score; 7-punktsreglen beskriver hel zone, én del eller flere dele.
- Stopper sikkert ved manglende lokal sammenligning. Den gamle hovedzonescore bruges ikke som fallback, når kystdelene er aktive.
- Viser de nye præcise kyststreger på det offentlige kort og publicerer kun afledte lokale scorer, ikke rå private QA-data.
- Versionslåser geometri, navne, punkter og gridbevis med SHA-256 og gemmer en kompakt central aktiveringspost med dokumenteret rollback.
- Dokumenterer en senere, privat og kvotesikker besøgstæller i roadmapet; den er ikke implementeret i denne version.

Produktionsstatus: lokale kontrakt- og syntakstests er grønne. Frisk Linux-produktion, central readback, Pages-deploy og online smoke-test af denne commit afventer.
