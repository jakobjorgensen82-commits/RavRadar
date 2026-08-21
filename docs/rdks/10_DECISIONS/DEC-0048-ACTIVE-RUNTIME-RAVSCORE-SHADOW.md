# DEC-0048: Privat RavScore-shadow fra den aktive kyst

- Status: Aktiv
- Dato: 2026-08-21
- Version: 4.0.250

## Baggrund

Den private nationale geometripilot kan bygge en ny kystkandidat, men dens uafhaengige land-/vandbevis er med vilje laast til praecis den punktbestand, som blev kontrolleret. Koersel `32474884163` stoppede derfor korrekt, da bevis og kandidat ikke laengere var identiske. Den gate maa ikke omgaas, og der maa ikke flyttes punkter for at kunne analysere RavScore.

RavScore-analysen har et andet formaal: at sammenligne den aktive model med private kandidater paa de 210 zoner og 673 kystdele, som brugerne faktisk har nu. Den behoever ikke en ny kystgeometri.

## Beslutning

Der indfoeres et separat manuelt GitHub-job, `ravscore_active_shadow`, som:

1. laeser det aktive offentlige detaljedatasaet og den eksisterende zonefil,
2. bygger et midlertidigt input i den allerede validerede private kontrakt,
3. bruger de aktive land- og vandpunkter uden at flytte eller gemme dem,
4. koerer de eksisterende native DMI-, marine-, historik-, vind- og A/B/C-shadowkontroller,
5. gemmer kun en kompakt privat analyserapport som artifact.

Jobbet har kun laeseret. Det kan ikke skrive til admin, aktivere geometri, aendre offentlig score eller deploye en produktion. Alle aktiveringsflag er `false`.

Den aktive score er fortsat 25 % jagtbarhed, 40 % transport og 35 % mobilisering. Kandidat A, B og C er fortsat private og score-neutrale.

## Sikkerhedsregler

- Det aktive datasaet skal vaere komplet: 210 aktive zoner og 673 scorede kystdele i det aktuelle grundlag.
- Hver aktiv zone skal findes i repositoryets zonefil. Historiske, ikke-aktive zoner i filen maa ignoreres.
- DMI er eneste marine grundlag i dette shadow-job. Den offentlige DMI-first/fallback-kontrakt aendres ikke.
- Et hul eller en uoverensstemmelse stopper jobbet. Det maa ikke udfyldes med nul, nabodata eller flyttede punkter.
- Raa vejrserier, koordinater og komplette diagnostikpayloads maa ikke uploades som artifact.
- Jobbet koeres manuelt ved relevante RavScore-analyser, ikke ved hver vejropdatering eller lille kodeaendring.

## Faglig begraensning

Fastholdelse og aflejring bruger foreloebigt grove, afledte egenskaber paa parentzonen. Det er nyttigt som privat sammenligningssignal, men er ikke tilstraekkeligt til automatisk aktivering. Den videnskabelige analyse og senere funddata skal bruges til at forbedre og kalibrere disse regler.

## Konsekvens

RavScore-arbejdet er ikke laengere blokeret af GeoDanmark-kandidatens separate punktbevis. Geometripiloten bevarer sin strenge gate, mens scorekandidater kan sammenlignes sikkert paa den aktive kyst, som brugerne faktisk ser.

## Driftspraecisering i 4.0.251

Foerste koersel `32479158213` verificerede 673/673 aktive punkter paa mindst ét native DMI-havgitter. Shadowkontrakten viste foreloebigt 622 fulddaekkede og 51 deldaekkede dele, men marinegaten stoppede paa en del, hvor DKSS-komponenter var fordelt over flere collections. Gridgaten var mindre streng end den eksisterende flertrinskontrakt.

En familie maa derfor kun maerkes komplet, naar alle dens komponenter findes i samme collection. U/V skal desuden dele fysisk gitterpunkt og collection. Blandede collections er ikke fuld dækning og maa ikke fortsætte til state eller score. Tallene fra den fejlede koersel er diagnostik, ikke faglig A/B/C-evidens.
