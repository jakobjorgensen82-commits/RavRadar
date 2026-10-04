# DEC-0292 – Privat diagnose af Fur-vandstand i normale vejrhentninger

**Status:** IMPLEMENTERET LOKALT i 4.0.542-kandidat; exact-head og produktion åbne.
**Dato:** 2026-10-04

Ejeren kræver fremtidig diagnose af Fur-hullerne og levering sammen med den
klargjorte syvzonerettelse efter aktiv vejrhentning. Dette erstatter det gamle
faste læseværktøj som næste arbejdsvej, ikke tilladelse til en anden gammel
cipher eller offentliggørelse af private produktionsdata.

Den faktiske normale verified-PART→SOURCE-routing indsamler kun ved Fur del04
et privat, bounded 118h-spor. Det indeholder præcise dataset-/tidsidentiteter,
hashes af faktisk kontekst, valgte brackets og anvendt konfiguration samt
boolean/counts for direkte PART, verificerede/tilladte valgte SOURCE-input,
routet output og den tidligere valgte SOURCE-bank. Det gemmes i eksisterende
private conditions/hourpack/cache-flow, ikke en ny destination eller provider.
Ingen rå værdier, source-ID-liste, koordinater eller configpayload gemmes i sporet.

Eksisterende no-loss-kontrol sammenholder reelle offentlige Fur-tab med de to
private, korrekt tidsbundne spor og skriver kun en fast kode/count-rapport.
Manglende legacy-spor, ændret kontekst og manglende identitetsjoin er eksplicit
ukendt. En ændret bracket med bevarede tidligere kilder er en målt mekanisme,
ikke bevis for den gamle kørsel. De gamle 7/12 timers rodårsag er stadig OPEN.
Rapporten ændrer ikke score, datatilgængelighed, routing, budget eller no-loss.

Normal caller-, actual-router-, privat komprimerings-/restore- og offentlig
byte-neutral projektionstest er genbrugt og består lokalt. Ingen nyt nationalt
produktionsinput, frozen-model-eval eller privat cache er læst. Første nye
generation kan ærligt mangle et tidligere spor; diagnose sammenligner kun
korrekt matchede faktisk gemte generationer.

**Separat OPEN:** Bevarelse af gyldige tidligere timer, så et genvindeligt tab
ikke stopper deploy. Den skal ske før uændret slutkontrol med ægte provenance
og alle relevante model-/publickontrakter. Ingen blanket-bypass, falsk nulværdi,
rå public-payload-reparation eller skjult tab er godkendt eller implementeret.

**Release:** Lokal 542-kandidat, ikke commit/push/merge/deploy. Naturlig
vejrhentning og deploy afsluttede kl.20:31 DK med faktisk cachegemning og
ingen tab. Eksakt originalpin er frisk bundet til den nye 16Z-generation.
Exact-head CI/proof, fornyet main/writer og faktisk produktionskontrol mangler.
Se DEC-0291 og privat checkpoint for eksakte hashes og test-/kørselsevidens.
