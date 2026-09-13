# RavRadar 4.0.353

## Privat runtime kan rumme den komplette cache uden at lempe fil- eller Storage-grænser

- Handoff-fortsættelse `34745557797` gendannede de fire eksakte cacher, hentede intet providervejr, gentog ikke 210/673-auditen og genbyggede den private runtime.
- 4.0.352's komprimering før base64 virkede; runnet passerede den tidligere V8-strengfejl og stoppede først, fordi flere private filer samlet oversteg det gamle råpayloadloft på 768 MiB.
- Efter ejerens udtrykkelige godkendelse må det nye `GZIP_BASE64`-format indeholde højst 2 GiB ukomprimeret payload samlet. Hver fil må fortsat højst være 768 MiB.
- Legacyarkiver uden encodingmarkør beholder det gamle samlede loft på 768 MiB.
- Udpakning afkoder, dekomprimerer, kontrollerer SHA-256 og skriver én fil ad gangen til et privat midlertidigt område. Først når alle filer er grønne, omdøbes området atomisk til den endelige bundle.
- Første cutover kræver fortsat højst 50.000.000 komprimerede byte, inden for det uændrede tekniske 50 MiB-objectloft. Over 2 GiB samlet, over 768 MiB i én fil, ukendt encoding eller integritetsafvigelse stopper før publicering.
- Vejrdata, kildeprioritet, RavScore, modelstate, geometri, 210/673/118-kontrakten og databasebindingerne er uændrede.
- Næste produktionsbevis er én exact-head sourcegate, byteidentisk merge og samme cachebaserede fortsættelse uden oneoff. Derefter følger den eksisterende fuldt gatede cutover.
