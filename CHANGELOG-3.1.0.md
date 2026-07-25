# RavRadar 3.1.0

## Samlet platformrelease

- Bevarer de korrigerede B12-kystzoner ved Kolding, Haderslev, Aabenraa, Sønderborg og Als.
- Komplet søgbar zonevælger og færdig Ja/Nej-feedbackdialog med dato, zone, gram og Indsend.
- Observationer gemmes straks lokalt til Administratorcenteret og lægges i en synkroniseringskø ved midlertidige netværksfejl.
- Valgt historisk dato kobles nu til nærmeste forecasttime på datoen frem for altid at bruge de aktuelle forhold.
- AI Prediction Engine bruger udglattet empirisk fundrate, zone/kysttype/lignende vejr og tydeligere confidence.
- Machine Learning Studio har permanente modelversioner. Godkendelse aktiverer en ny version; tidligere versioner kan aktiveres som en ny revisionsversion.
- DMI forbliver autoritativ for vandstand. RavRadar anvender kun DMI-data og den aftalte interpolation mellem højst to relevante stationer.
- Service worker er optimeret med versionsbaseret cache-first, stale-while-revalidate og network-first til HTML, version og livevejr.
- Releaseversion kan fremover opdateres samlet med `npm run version:set -- X.Y.Z`.
- Nye tests kontrollerer modelversionering, rollback og versionskonsistens.
