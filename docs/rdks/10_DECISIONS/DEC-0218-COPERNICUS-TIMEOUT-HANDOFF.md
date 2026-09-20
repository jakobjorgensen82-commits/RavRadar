# DEC-0218 – Copernicus-timeout skal afslutte med genbrugelig fremgang

**Status:** Aktiv; implementeret lokalt i 4.0.440, exact-head og produktionsbevis åbne

**Dato:** 2026-09-20

**Bevarer:** DEC-0118, DEC-0124, DEC-0127, DEC-0170, DEC-0191 og DEC-0210

## Produktionsfund

4.0.439 bestod exact-head `35481877393`, PR #384 og merge `badf84e9`.
Almindelig weather `35482138050` beviste, at den eksakte private forgænger
nu bliver tilpasset og installeret korrekt. DMI gennemførte derefter og gemte
sin fremgang.

Copernicus afsluttede fem validerede segmenter. Dækningen voksede trinvist
til 5.855 operationelle par, og hvert segment blev skrevet som en fsync'et,
hashbundet kvittering i den varige segmentjournal. Det sjette netkald
overskred den hårde 360-sekunders procesgrænse. Processen blev dræbt, før de
fem kvitteringer kunne samles i den genbrugelige source-stage.

Den efterfølgende gate gjorde det rigtige ved ikke at kalde en usammenhængende
bank/shadow/stage-generation gyldig. Men workflowet stoppede dermed før
Open-Meteo, selv om de allerede hentede Copernicus-resultater var gemt, og
den ærlige rest kunne være afleveret til næste leverandør.

## Beslutning

1. Den eksisterende samlede Copernicus-tidsgrænse bevares. Normal drift har
   fortsat 360 sekunder; det udvidede bootstrap har fortsat 3.300 sekunder.
2. Budgettet opdeles deterministisk. Normal drift bruger 288 sekunders
   arbejde, 300 sekunders hård procesgrænse og 60 sekunders lokal recovery.
   Det udvidede budget bruger 3.120/3.180/120 sekunder.
3. Den bløde grænse giver producenten mulighed for at stoppe mellem shards.
   Den hårde grænse kan fortsat dræbe et fastlåst providerkald, så en ekstern
   tjeneste aldrig kan gøre kørslen ubundet.
4. Efter netop en hård timeout må wrapperen bruge den reserverede sidste del
   på pilots `--checkpoint-only`-vej. Den vej må ikke kalde Copernicus eller
   anden ekstern vejrleverandør og må ikke kræve providercredentials.
5. Recovery genlæser targetregister, donorbank, shadow, source-stage og den
   varige segmentjournal gennem de eksisterende bindings-, hash-, mask-,
   source-order- og friskhedsvalidatorer. Gyldige journalposter føres gennem
   den uændrede atomiske bank → shadow → source-stage-transaktion.
6. Journalen slettes først efter den fulde transaktion. En forkert base,
   targetbinding, hash eller payload må aldrig blive positiv evidens.
7. Wrapperen må kun omsætte timeouten til kontrolleret `IN_PROGRESS`, hvis
   den netværksfri recovery afslutter grønt. Recoveryfejl og ukendt fejl er
   fortsat hårde fejl.
8. Den efterfølgende `--require-source-stage-reusable`-gate består uændret.
   Open-Meteo får kun den eksakte ærlige rest efter et valideret stage.
9. DMI-first og prioriteten DMI → Copernicus → Open-Meteo ændres ikke.
   Rettelsen ændrer ingen målinger, modelvalg, RavScore, vandstand, geometri
   eller gyldighedsgrænser.

## Verifikation

Måltesten skal bevise både almindelig exit 75 og ægte proces-timeout. Ved
timeout skal en separat recoverykommando kunne afslutte grønt inden for sit
reserverede budget og give `IN_PROGRESS`; uden recovery skal timeout fortsat
fejle. En realistisk source-stage-regression skal efterlade en journalpost,
køre `--checkpoint-only` uden credentials eller fixtures, fjerne journalen
først efter transaktionen og bestå den samme strenge gate som workflowet.

Efter exact-head og merge køres én almindelig weather fra den allerede gemte
krypterede fremgang. Produktionsbevis kræver, at Copernicus-timeout ikke
stopper kæden, at Open-Meteo får lov at udfylde resten, og at score, fulde
datagates, privat lagring, artifact og deploy gennemføres eller giver et nyt
konkret og uafhængigt fund.
