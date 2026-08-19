# DEC-0030: komponentovergange i 4.0.237, produktionskoersel 3237

Dato: 2026-08-20  
Produktionskoersel: `#3237` / `32303477126`  
Datasæt: `rr-20260819213342-210`  
Metode: read-only analyse af supportartifactets fulde `data/live/conditions.json` med artifactets egen `scripts/audit-p1-component-matrix.py`.

## Konklusion

Koerslen giver et nyt uafhaengigt WAM- og DKSS-bevis. HARMONIE 12 UTC er kun delvist indfaset og taeller derfor ikke som en ny fuld vindcyklus. Tallene bekraefter, at overgangene varierer med komponent, retning, modelkoersel og indfasning; de giver ikke grundlag for en enkelt permanent graense.

Ingen datakilde, fallback, RavScore, state, landpunkt eller vandpunkt er aendret. Manglende verificeret stroem forbliver `missing` og erstattes ikke af en kunstig vaerdi.

## Datadaekning

| Komponent | Daekning | Aktivt nyt modelbevis |
|---|---:|---|
| Vind | 210 zoner x 118 timer | DKSS 2026-08-19 12Z; HARMONIE 03Z + delvis 12Z |
| Boelger | 194 zoner x 118 timer; 15 x 97; 1 x 0 | WAM 2026-08-18 18Z |
| Stroem | 198 zoner x 113 timer; 12 x 0 | DKSS 2026-08-19 12Z |
| Vandstand | 202 zoner x 118 timer; 8 x 113 | DKSS 2026-08-19 12Z |
| Vandtemperatur | 202 zoner x 118 timer; 8 x 113 | DKSS 2026-08-19 12Z |

De 12 hovedzoner uden verificeret parent-zone-stroem er `DK-B05-10`, `DK-B05-17`, `DK-B05-20`, `DK-B05-22`, `DK-B05-23`, `DK-B05-24`, `DK-B07-12`, `DK-B07-13`, `DK-B07-15`, `DK-B07-17`, `DK-B08-19` og `DK-B12-01`. Det er ikke et hul i den aktive lokale kystdelsvisning: browserkontrollen af samme produktion bestod 673/673 kystdele med 622 DMI-, 43 Copernicus- og otte godkendte proxykilder.

## Maalte overgange

| Komponent/felt | Overgang middel | P95 | Almindelig time middel | Almindelig P95 |
|---|---:|---:|---:|---:|
| Vindhastighed | 1,133 m/s | 2,7 | 0,419 | 1,3 |
| Vindretning | 40,790 grader | 161 | 7,450 | 28 |
| Boelgehoejde | 0,134 m | 0,53 | 0,036 | 0,13 |
| Boelgeretning | 17,974 grader | 75 | 5,771 | 23 |
| Boelgeperiode | 0,401 s | 1,5 | 0,080 | 0,3 |
| Vandstand | 2,099 cm | 9 | 5,439 | 16 |
| Vandtemperatur | 1,653 C | 2,9 | 0,055 | 0,2 |

Stroem har 198 `dmi -> missing`-overgange og ingen numerisk overgangsdelta. Det er korrekt fail-closed adfaerd. Vindretningens 40,79/161 er hoejere end de seneste fulde cyklusser, mens boelgeretningens 17,97/75 er markant lavere end de tidligere 34-40/148-153. Variationen er direkte evidens imod at fastlaase en global overgangsgraense nu. Vandstand er rolig i forhold til almindelig timevariation. Vandtemperatur er fortsat tydeligt mere foelsom ved kildeskift og forbliver score-neutral.

## 72-timershistorik

Alle 210 zoner har 62 raa proever fra `2026-08-18T16:05:48.548Z` til `2026-08-19T21:00:00.000Z`, i alt 28,903 timer. 197 zoner har 55 verificerede proever, en zone har 49, og 12 parent-zoner har nul; det verificerede maksimum er 22,563 timer.

Det kortere vindue er ikke tilfaeldigt retentiontab. Starttidspunktet er den foerste aktivering af 4.0.232's `controlled-live`-stroemkaede. Den nye lokale kystdelsstroem har anden identitet og proveniens end den tidligere parent-zonehistorik, som derfor ikke maa bruges som kunstigt bagudfyldt bevis. Det bindende exitkriterium er fortsat mindst 72 timers naturligt bevaret, kompatibel historik. Det er ikke naaet.

## Naeste maaling

1. Lad normale produktionskoersler opbygge det nye vindue uden tvungne koersler eller bagudfyldning.
2. Gentag matrixen efter en fuldt indfaset ny HARMONIE-cyklus og efter naeste naturlige WAM-/DKSS-run.
3. Hold parent-zonehuller og den aktive 673-dels lokale daekning adskilt i alle konklusioner.
4. Overvej foerst permanente komponent-/retningsspecifikke intervaller, naar flere uafhaengige fulde cyklusser og 72 timers kompatibel historik foreligger.
