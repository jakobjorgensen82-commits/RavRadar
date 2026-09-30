# DEC-0267 – Læs gemte vejrpakker før ændret produktion

**Status:** Aktiv; lokal 4.0.520-analyselevering, ikke kørt mod produktion.
**Dato:** 2026-09-30

## Begrundelse og samtaledelta

Ejeren kræver en udvidet helhedsgennemgang, inklusive alternative
fejlveje, før flere funktionelle rettelser. Undersøg eksisterende
krypteret `36698472505-1` og beskyttet produktion uden ny vejrhentning
eller cachebygning. Cron er pauset; offentlig 4.0.510 er sidste bevis.

Den funktionelle kandidat i PR #487 er ikke merged. Første head
`765089b5` har grøn source-CI `36732477177`, men senere lokale
ændringer og en åben bevispersistensrisiko er ikke dækket. En værdi
kan stadig findes, selv om de originale DMI-modelværdier, som
artifactkontrollen kræver, mangler i aktive donorer. Kontekstmetadata
alene beviser ikke, at originalværdierne findes.

Ingen eksisterende main-arbejdsgang måler dette uden produktionsarbejde.
Et særskilt læseværktøj kan bryde denne afhængighed, mens den samlede
funktionelle rettelse holdes tilbage. Det aktiverer ikke PR #487.

## Bindende afgrænsning

1. Manuelt workflow på main med eksakt forventet head, bekræftelsestekst
   og afsluttet normalrun/attempt. Source-CI skal være live-verificeret
   for det identiske kildetræ; den eksisterende produktionslås anvendes.
2. Kun præcis krypteret Linux/main/run/attempt-cache, ingen prefix-fallback
   eller genhentning. GCM, hash, baselinebinding og packformat bevares.
3. Supabase læses kun for den beskyttede pointer. R2 læses kun fra
   descriptorens præcise immutable objekter. Klienten afviser andre mål,
   redirects, requestbody og mutationer. Ingen nye credentials.
4. Original producentkontrakt bruges ved læsning. Pointerkontrol før og
   efter inspektion, private midlertidige filer, kun faste koder,
   tællere og størrelser i rapporten. Ingen privat payload offentliggøres.
5. Ingen providerkald, semantisk installation, score/cachebygning,
   progress-save, CAS, R2-publicering eller Pages. Eksisterende normal
   save/restore/capture-base og modelbundle ændres ikke; den
   autentificerende læseeksport er additiv.
6. Original kontekst og komplette native kildebeviser måles særskilt.
   Kun faktiske originale modelværdier og uændret genprojektion, aldrig
   konstruerede modelværdier fra afledte timer. Første måling omfatter
   højst 121 offentlige prognosetimer, ikke fuld 288-timershistorik.
7. Komplet bevis søges inden for hver donor. Manglende bevis er ikke
   i sig selv datatab: tværdonorunion, andre historiske kilder, fuldt
   replay og fremtidig persistens er særskilte spørgsmål. Regional
   reserve er ikke det samme som direkte lokal DMI.
8. Netværkslæsetid, hvert request, antal requests, bytes, filer, poster
   og jobvarighed er afgrænset. Offline beregning må ikke fejlagtigt
   forbruge netværksbudgettet. Produktionsbudgetter ændres ikke.

## Kontrol og åbne beviser

Kræv autentificerings-, sti-, byte-, tids-, output- og native-bevistests,
uændret modelbundle, versions-/RDKS-kontrol og grøn fuld exact-head
source-CI før merge. Eksisterende produktionsfunktioner bevares ud over
nødvendig releaseidentitet. Før dispatch genkontrolleres main, præcis
cacheidentitet og fravær af nye aktive/ventende produktionskørsler.

Audit er ikke releasegate, fuld femfeltsmåling eller stabilitetsbevis.
R2-plads beviser ikke RAM-/V8-/transportkapacitet. Målingerne skal bruges
til at færdiggøre den samlede funktionelle rettelse før ny produktion.
DMI-først, Copernicus før Open-Meteo, 96-timersundtagelsen, DMI-vandstand,
Limfjord-reglen, scoremodel, scheduler og geometri forbliver uændrede.
