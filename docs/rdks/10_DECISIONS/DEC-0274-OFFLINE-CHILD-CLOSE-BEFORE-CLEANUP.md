# DEC-0274 – Afvent egen hjælpeproces før oprydning

**Status:** Lokal 4.0.527-kandidat; måltests bestået, exact-head CI og levering afventer.
**Dato:** 2026-10-01.

## Fejl og afgrænset rettelse

Tre faste offline Python-kald afviste straks deres Promise efter timeout/kill
eller procesfejl. Det kunne frigive input og midlertidige mapper i kalders
finally, før den ejede proces faktisk var lukket. Det gælder CP pack-inventory,
CP-progressunion og current-donor-union, også under autentificeret progressrestore
og privat installation. En exception fra kill kunne desuden undslippe timeren.

Hvert kald fastholder nu første sikre fejlkode, forsøger SIGKILL én gang på
sin egen bevarede ChildProcess og afviser først ved denne childs close.
Kill-returværdi eller kill-exception er ikke stopbevis; senere exit0 gør ikke
en timeout til succes. Ingen vilkårlig PID-/gruppesignalering eller ny executor.
Valgt Python, argumenter, miljø og arbejdsfrister120/180s er uændrede.

Uden close forbliver operationen pending, så den ydre oprydning ikke starter.
Dette har bevidst IKKE en garanteret in-process-returfrist efter timeout;
den eksisterende ydre jobgrænse består. Det er direkte-child-ejerskab, IKKE
descendant-isolation, writer-eksklusivitet, failureworkerens4minuttersløsning
eller beskyttelse mod runner-tab. Delvise filer bliver ikke gyldige af dette.

Pack-inventory bevarer også den oprindelige læse-/validerings-/procesfejl,
hvis oprydning derefter fejler. Oprydning forsøges stadig; cleanup-only er
fortsat hård fejl før gammel pack erstattes. Bevarede data er ikke reparation.

## Målrettet evidens

I519 reproducerede ni kunstige actual-caller-grene (tre kald gange timeout,
kastende kill og process-error) plus parent RED10/10. Efter rettelsen bestod
de to berørte scripts85/85. En separat faktisk disponibel Node-child viste
close før inventorycleanup1/1; ikke Python-descendant- eller providerbevis.
Den eksisterende kunstige CP-originalpakke reproducerede desuden masking ved
inventory-read+cleanup; cleanup-only var allerede hård. Originaler bevares.

Kun tre funktionsdeltaer og de eksisterende regressioner er udtaget fra519.
Ingen native-proof/session/capture/pin/HKDF/Node-tail- eller descriptor-optins.
Isoleret releasekommando med eksisterende bundled Python:
node --test scripts/test-private-weather-component-pack.mjs scripts/test-weather-component-progress-cache.mjs
bestod60/60,0fail/skip,24676.2432ms. Inkluderer faktisk kunstig CP-originalpack
og krypteret save/restore; ikke60nye cases eller summering med519-prøver.

Efter versionsløft bestod særskilt docs/security/modelversion/browser7/7,
1097.5931ms,0skip. RDKS527/14chat, sourceplan47, model67/c557f91a… og otte
bindinger består. Geodata er byte- og objektverificeret kun topversion;
61 browserfiler er kun versionsreferencer. SQL er LF-identisk uden for
eksakt håndbogspayload; ingen SQLinstallation eller modelbundle-regenerering.

Ingen model-/format-/crypto-/inventory-/loft-/geodata-/provider-/workflowgate-
ændring. DMI-først,CPførOM,96h og alle efterdatagates bevares. Særskilt afviste
opgaver genåbnes ikke. Produktionsforekomst og fejlvejens virkning er ikke målt.

## Levering og samtaledelta

Ordinary36896697919 på524 afsluttede21.58 med gemt cache og verificeret deploy.
525/PR493 merged21.59 som3283af62; code-only36918367977 SUCCESS22.09 uden
providers, offentlig525/samme prognose rootverificeret.526/PR494/d3200eb2
er exact-head-grøn, retargetet/main og merged3b9f3212 kl22.11; indholdsdiff
er tom. Code-only36919772809 leverer526 fra22.11 uden providers.
527 må ikke ændre disse heads eller main under aktiv produktion. Ingen fuld
lokal sourcegentagelse; én exact-head source-CI kræves før senere sikker merge.

Ejeren ønsker velkendte ord: vejrhentning, beregning, cache, kontrol og deploy.
Den ekstra valgfrie Copernicus-hentning er eksisterende DEC-0251: op til360s
efter beregningen og før krypteret gemning, til forbedring af næste kørsel.
Placeringen er et designvalg, ikke teknisk nødvendighed. Spørgsmålet ændrer
ikke workflow eller model; en senere vurdering må ikke forsinke klare fixes.

Historik er fortsat ufuldstændig for210zoner x2modes;420 er ikke420huller.
Ny offentlig target17Z/rr-20261001184358-210 er ikke ny femfamiliedækningsmåling.
Browserkontrol er særskilt blokeret; ingen omvej eller ny chat uden tilladelse.
