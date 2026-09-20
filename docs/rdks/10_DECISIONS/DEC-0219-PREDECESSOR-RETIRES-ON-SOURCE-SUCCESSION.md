# DEC-0219 – Forgængerbro pensioneres af faktisk sourceafløsning

**Status:** Aktiv; implementeret lokalt i 4.0.441, exact-head og produktionsbevis åbne

**Dato:** 2026-09-20

**Supersederer:** 4.0.440-antagelsen om exact-release-pensionering i DEC-0218-handoffet

**Bevarer:** DEC-0158, DEC-0169, DEC-0170, DEC-0215, DEC-0217 og DEC-0218

## Produktionsfund

4.0.440 bestod exact-head `35485303951`, PR #385 og merge `c00e6c5a`.
Almindelig weather `35485561037` gendannede den rå DMI-GRIB-cache, men
stoppede i `Prepare strict active DMI donor or resumable candidate`, før en
provider blev kaldt. Den aktuelle beskyttede private runtime blev afvist med
`MODEL_OR_CONTRACT_INELIGIBLE`, og bounded-forgængerbroen gav ikke en
restoreforventning, fordi dens releasevagt kun tillod 4.0.439.

4.0.439 havde bevist, at exact restore, rebind og installation virker. Samme
kørsel stoppede dog senere ved Copernicus og publicerede aldrig den nye
kompatible private runtime. Derfor pegede den beskyttede pointer fortsat på
den eksakte gamle generation, mens en ren versionsændring havde lukket den
eneste kontrollerede læsevej til både basisruntime og den dertil bundne
krypterede fremgang.

## Beslutning

1. Releaseversion er ikke længere et pensionssignal for denne bro.
2. Broen gælder kun, når den beskyttede descriptor fortsat matcher den
   forseglede forgænger eksakt: source-head, bundlehash, sourcekontrakter,
   sourcebinding, 210/673 og `privatePayloadIncluded=false`.
3. Den aktuelle targetbinding, kontrakternes eksakte form, uændret
   continuationkontrakt, eksakt target-publickontrakt og en reel nyere
   produktionstime kræves fortsat.
4. Restore udføres fortsat med forgængerens egen reader. Den hærdede
   migrering, inventar-, 210/673- og importkontrol skal lykkes før install.
5. Når en kompatibel efterfølger er publiceret, ændres den beskyttede
   pointers sourceidentitet. Den gamle bro bliver da automatisk
   uanvendelig uden versionsspecifik kode.
6. Ændret eller ukendt source, binding, kontrakt, hash, inventar eller tid
   stopper fortsat. Ingen bred historisk kompatibilitet indføres.
7. Den krypterede providerfremgang forbliver bundet til den eksakte
   beskyttede basispakke og åbnes først efter vellykket restore/rebind/install.
8. Copernicus-timeoutrettelsen, providerprioritet, data, score, vandstand,
   geometri og leverandørtider ændres ikke.

## Verifikation

Regressionen skal med den aktuelle release acceptere den præcise forseglede
descriptor og bygge den samme eksakte restoreforventning. Den skal i samme
test ændre source-head og bevise `required=false`, tom transitionstype og
intet forventningsdokument. Workflowrækkefølgen restore → rebind → install →
krypteret progress restore består.

Efter exact-head og merge køres én almindelig weather. Den skal gendanne og
installere den eksakte forgænger, åbne den gemte private fremgang, fortsætte
gennem DMI og 4.0.440's Copernicus-timeoutaflevering og derefter nå
Open-Meteo, score, fulde gates, privat publicering, artifact og deploy eller
give et nyt konkret, uafhængigt fund. Ingen oneoff.
