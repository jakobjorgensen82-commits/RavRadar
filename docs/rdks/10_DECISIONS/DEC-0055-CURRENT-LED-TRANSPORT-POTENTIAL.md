# DEC-0055: Strømstyret transportpotentiale med glidende udtransport

**Status:** Aktiv score-neutral forskningsbeslutning; ingen produktionsaktivering

**Dato:** 2026-08-22

**Scorepåvirkning:** Ingen offentlig scorepåvirkning

## Problem

Candidate G's hidtidige 24/48-timers historikspor blandede strøm, bølgeenergi og tidligere hændelser i en generel forstærkningsfaktor. Det var nyttigt som følsomhedsspor, men gjorde det ikke tydeligt nok, hvad der faktisk transporterer rav mod eller væk fra kysten.

Ejeren har præciseret den fysiske betydning: strømmen er transportleddet. Bølger kan hjælpe rav over en revle eller det sidste stykke op på stranden, men må ikke skabe transportpotentiale uden en indgående strømvej. Et opbygget nærkystpotentiale må overleve korte eller svage ugunstige perioder, men skal falde straks og glidende under kraftig udgående strøm.

## Beslutning

1. Candidate G's foretrukne transportsemantik er strømstyret. Kun verificeret kystnormal strøm kan bygge eller nedbryde transportpotentialet.
2. Kraftig indgående strøm bygger gradvist fra 0 mod 100 med 10 point pr. effektiv fuldstyrketime. Det når dermed et stærkt niveau omkring et 10-timers forløb i overensstemmelse med REQ-STATE-003.
3. Kraftig udgående strøm reducerer potentialet fra første time. Ved fuld styrke trækkes 8 point pr. effektiv time. Potentialet kan aldrig blive negativt.
4. Den bindende fuldstyrkekurve for udtransport er:

| Effektive fuldstyrketimer | Potentiale fra 100 |
|---:|---:|
| 0 | 100 |
| 1 | 92 |
| 2 | 84 |
| 3 | 76 |
| 4 | 68 |
| 5 | 60 |
| 6 | 52 |
| 7 | 44 |
| 8 | 36 |
| 9 | 28 |
| 10 | 20 |
| 11 | 12 |
| 12 | 4 |
| 13 og mere | 0 |

5. Svagere strøm mellem dødzone og fuld styrke tæller forholdsmæssigt som en brøkdel af en effektiv time. Svag udgående strøm giver derfor et mindre, men stadig glidende tab; neutral strøm ændrer ikke reservoiret.
6. Manglende eller ikke-verificeret strøm må hverken bygge eller nedbryde potentialet. Missing må ikke omskrives til nulstrøm.
7. Bølger kan ikke oprette transportpotentiale. Når strømmen allerede har skabt potentiale, må hændelsestiming og et forsigtigt bølgelandingssignal samlet kun påvirke leveringen inden for en faktor på 0,85–1,00. Transport/levering samles som 65 procent transportpotentiale og 35 procent levering.
8. Candidate G beholder ejerens private analyseprior `20/50/30` for jagtbarhed, transport/levering og mobilisering. Offentlig RavScore forbliver `25/40/35`.
9. DEC-0054's vindstyrede waders-jagtbarhed og waders-loft gælder uændret. Strandjagt får fortsat intet jagtbarhedsloft.
10. Bund, dybde, render, revler, adgang, automatisk stedegnethed, geometri og land-/vandpunkter indgår ikke i modellen.

## Forskningspriorer, ikke naturkonstanter

Den mekaniske reference bruger en kystnormal dødzone på 0,05 m/s og fuld styrke ved 0,20 m/s. Disse grænser er ikke fundkalibrerede. Privat følsomhed er derfor også kørt for 0,03→0,15 m/s og 0,02→0,12 m/s.

Den private historik begynder uden et observeret tidligere reservoir. Hovedreplayet starter fail-closed på 0. En særskilt warm-start på 50 viser, at starttilstanden har stor betydning. Ingen af startværdierne er dermed godkendt som produktionssandhed.

Neutral strøm holder i den aktuelle mekaniske kandidat reservoirværdien uændret. Om et opbygget potentiale skal have et særskilt passivt 24–48-timers tab, og hvordan analysen skal rekonstruere tilstanden før replayets første time, er åbent. Det må ikke opfindes uden evidens og en ny beslutning.

En efterfølgende score-neutral følsomhedskontrol implementerer valgfri neutral halvering på 24 eller 48 timer. Den ændrer ikke den mekaniske reference, hvor passivt tab er slået fra. Passivt tab gælder kun verificeret neutral strøm; det må ikke ændre den godkendte ind-/udtransportkurve, og missing pauser fortsat.

## Evidens

Den private, Git-ignorerede genafspilning omfatter 1.460 evalueringer uden nye rådata:

- referencegrænserne 0,05→0,20 m/s giver gennemsnitligt potentiale 7,246, median 0, 90-percentil 41,563 og maksimum 63,549;
- 0,03→0,15 m/s hæver gennemsnitligt potentiale til 13,302 og Candidate G-scoren med 3,068 point mod referencen;
- 0,02→0,12 m/s hæver gennemsnitligt potentiale til 16,129 og Candidate G-scoren med 4,296 point mod referencen;
- en diagnostisk start på 50 hæver gennemsnitligt potentiale til 49,684 og Candidate G-scoren med 21,136 point mod start på 0;
- de 146 klassificerede tilfælde med modgående strøm har potentiale 0 i referencekørslen, mens de 436 indgående tilfælde i gennemsnit har 21,03;
- bølger alene giver fortsat nul transport, og alle målrettede monotoni-, retning-, missing-, waders- og nationale shadow-self-tests består.

Tallene viser, at den godkendte kurve har den ønskede mekaniske adfærd. De viser samtidig, at strømgrænse og start-/forældelsesregel kan flytte scoren for meget til at blive valgt skjult.

Den afgrænsede efterkontrol viser desuden:

- alle 12 eventvinduer har 24 timers forhistorie og nul vinduer har 48 eller 72 timers forhistorie;
- neutral halvering på 24 timer flytter gennemsnitsscoren -1,182 point fra start-0-referencen, mens 48 timer flytter den -0,697;
- den beskedne start-0-forskel skjuler fortsat randusikkerhed: start 50/100 flytter cirka 6,2/11,1 point mod samme 24-timers profil og cirka 11,2/19,5 point mod samme 48-timers profil;
- referencegrænsen 0,05→0,20 m/s har ingen fuldstyrkeevalueringer i replayet. Selv 0,03→0,15 har nul fulde indgående og kun 10 fulde udgående; 0,02→0,12 har to og 44;
- den eksisterende eksterne evidens giver ingen fundvalideret dansk kystnormal m/s-grænse.

Kontrollen afviser derfor, at de 12 bølgeudvalgte vinduer alene kan vælge 24 mod 48 timer eller kalibrere strømgrænsen. Fail-closed start 0 uden passivt tab forbliver den mekaniske reference, mens begge halveringer bevares som følsomhedsspor. Dette er ikke en produktbeslutning om, at potentiale fysisk aldrig ældes.

## Aktiveringsblokeringer

Før offentlig aktivering kræves mindst:

1. en fagligt og empirisk begrundet kystnormal strømgrænse;
2. en godkendt regel for reservoir ved replay-/prognosestart og eventuelt passivt 24–48-timers tab;
3. komplette ture med fund/nul-fund og geografisk/tidslig hold-out eller tilsvarende stærk validering;
4. en frisk national score-neutral shadow med den endelige inputkontrakt;
5. særskilt ejer-go/no-go og alle relevante produktionsgates.

## Efterfølgende ejerbeslutning om udtømt udtransport

Den første reproducerbare grænseaudit viste, at `RESEARCH-1` kun satte transportpotentialet til 0. Den faste syntetiske kontrol endte derfor på 35/35 for strand/waders, fordi jagtbarhed og mobilisering fortsat bidrog. Denne adfærd bevares kun som revisionsspor.

Ejeren har efterfølgende besluttet, at den foretrukne `RESEARCH-2`-revision skal sætte den endelige Candidate G-score til 0, når den samme dokumenterede kraftige fralandsstrøm både har udløst faktisk udtransport og udtømt transportpotentialet. Komponenterne beregnes og bevares fortsat, så forklaringen kan vise, at mobilisering og jagtbarhed godt kan være positive, selv om slutscoren er 0.

Den bindende forklaring er:

`På grund af kraftig fralandsstrøm trækkes ravet ud i havet og derfor går scoren i nul, selv om der fortsat kan være mobilisering og god jagtbarhed`

Dette er ikke en generel `transportAndDelivery === 0`-regel. Den kræver både et udtømt transportpotentiale og den særskilte historikmarkør for faktisk udtransport. Et fail-closed startpotentiale på 0, missing, neutral strøm eller svag modstrøm må derfor ikke alene udløse nul-gaten.

DEC-0055 erstatter den hidtidige foretrukne transportfortolkning i Candidate G. G 24/48 og de tidligere modeller bevares som historisk evidens og følsomhedsspor, ikke som parallelle produktforslag.

## Bevarede kontrakter

- Offentlig RavScore, UI, runtime, DMI/fallback og central admin er uændret.
- Candidate G er privat, diagnostic-only og kan ikke aktivere sig selv.
- Ingen nye rådata er hentet.
- Private cachepayloads må ikke lægges i Git eller offentlige artifacts.
- Artifact, protected-dirty-data, geometri og land-/vandpunkter er urørte.
