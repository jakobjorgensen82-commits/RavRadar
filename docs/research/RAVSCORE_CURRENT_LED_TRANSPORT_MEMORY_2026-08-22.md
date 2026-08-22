# Strømstyret transporthukommelse i Candidate G

## Kort fortalt

Den nye private kandidat gør transportdelen mere direkte: indgående strøm bygger ravpotentiale op nær kysten, mens kraftig udgående strøm spiser af det fra første time. Bølger må hjælpe med den sidste levering over revle eller op på strand, men kan ikke selv transportere rav ind.

Ejeren har godkendt den præcise udtransportkurve: et potentiale på 100 falder med 8 point for hver effektiv time med fuld kraftig udgående strøm og når 0 ved 13 timer. Indgående fuld strøm bygger med 10 point pr. effektiv time og når 100 omkring 10 timer. Reglerne beregnes på 0–100 transportpotentiale, før Candidate G's private vægtning `20/50/30` anvendes.

Det er en bedre fysisk og forklaringsmæssig model end den tidligere generelle 24/48-timers forstærker. Den er dog endnu ikke klar til offentlig aktivering, fordi to kalibreringsvalg stadig flytter resultatet meget: grænsen for kraftig kystnormal strøm og reservoirværdien ved analysens begyndelse.

## Den godkendte mekanik

- Verificeret strøm mod kysten bygger potentiale.
- Verificeret strøm væk fra kysten reducerer potentialet straks.
- Fuld udtransport taber 8 point pr. effektiv time: 100, 92, 84, 76, 68, 60, 52, 44, 36, 28, 20, 12, 4 og derefter 0.
- Fuld indtransport bygger 10 point pr. effektiv time og når 100 efter cirka 10 timer.
- Svagere strøm giver en forholdsmæssig del af timevirkningen.
- Ikke-verificeret strøm pauser beregningen; den fortolkes hverken som god eller dårlig.
- Bølger alene giver nul transport.
- Bølgers og hændelsestimings samlede leveringskorrektion er begrænset til 15 procent og kan kun virke, når strømmen allerede har skabt et potentiale.

## Hvad replayet viser

Der er genbrugt 1.460 private evalueringer i den allerede flyttede, Git-ignorerede cache. Ingen nye rådata er hentet, og private rækker eller komplette kontrolsummer er ikke lagt i rapporten.

| Privat profil | Gennemsnitligt potentiale | 90-percentil | Maksimum | Candidate G-score mod reference |
|---|---:|---:|---:|---:|
| 0,05→0,20 m/s, start 0 | 7,246 | 41,563 | 63,549 | reference |
| 0,03→0,15 m/s, start 0 | 13,302 | 42,451 | 100 | +3,068 |
| 0,02→0,12 m/s, start 0 | 16,129 | 58,671 | 100 | +4,296 |
| 0,05→0,20 m/s, start 50 | 49,684 | 78,013 | 100 | +21,136 |

Referenceprofilen giver i gennemsnit potentiale 21,03 i de 436 indgående forløb og 0 i de 146 forløb med modgående strøm. Det er den ønskede retning. Langsstrømsforløb ligger lavt, fordi den kystnormale del er lille.

Samtidig er forskellen mellem profilerne for stor til at kalde en af strømgrænserne “rigtig” uden yderligere evidens. Warm-start-kørslen viser endnu tydeligere, at replayets begyndelsestilstand ikke er en detalje: en start på 50 flytter Candidate G-scoren mere end 21 point i gennemsnit.

## Hvad der er besluttet, og hvad der ikke er

Besluttet:

- strømmen er transportleddet;
- den eksakte 8-pointskurve for kraftig udtransport;
- cirka 10 timers opbygning ved fuld indtransport;
- bølger kan kun have en lille, afhængig landingsrolle;
- `20/50/30` er kandidatens private analyseprior;
- waders-vindkurven og jagtbarhedsloftet fra DEC-0054 fortsætter.

Ikke besluttet:

- om fuld styrke starter ved 0,12, 0,15, 0,20 m/s eller en anden dokumenteret værdi;
- hvordan det eksisterende potentiale rekonstrueres ved starten af en prognose eller et historisk replay;
- om neutral strøm skal give et passivt tab over 24–48 timer, og i givet fald hvor hurtigt;
- om modellen faktisk forudsiger ravfund bedre end den aktive score.

## Anbefaling

Behold den strømstyrede variant som det foretrukne private Candidate G-spor, fordi den matcher ejerens faglige forståelse og har tydeligere årsagssammenhæng. Aktivér den ikke offentligt endnu. Næste beslutningsarbejde skal især vælge eller afvise en passiv 24–48-timers forældelsesregel og fastlægge strømstyrken på baggrund af bedre evidens, før tur-/hold-out-validering og et endeligt ejer-go/no-go.

Offentlig RavScore forbliver `25/40/35`. Der er ikke ændret UI, data, geometri, land-/vandpunkter, artifact eller protected-dirty-data.
