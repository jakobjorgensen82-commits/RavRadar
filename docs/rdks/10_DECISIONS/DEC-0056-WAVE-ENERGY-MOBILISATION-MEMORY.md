# DEC-0056: Én bølgeenergistyret mobiliseringstilstand

**Status:** Aktiv Candidate G-modelregel; dette dokuments score-neutrale aktiveringsstatus er erstattet af DEC-0060

**Dato:** 2026-08-23

**Scorepåvirkning:** Ingen ved dette checkpoint; reglen blev senere aktiv via DEC-0060/4.0.261

## Problem

Candidate G arvede en mobilisering, hvor historisk bølgeenergi, historisk vind, varighed, aktuelle bølger og aktuel strøm kunne give delvist overlappende point. Vind skaber allerede bølger og strøm og bruges desuden direkte i waders-jagtbarheden. En ekstra additiv vind-, strøm- og varighedsscore i mobilisering risikerer derfor at belønne samme hændelse flere gange.

Ejeren har samtidig fravalgt en statisk model for bund, dybde, render, revler og lokal grundegnethed. Den kan give misvisende fradrag på kyster, hvor kendte lokale passager gør området velegnet, selv om en grov model ser ugunstig ud.

## Beslutning

1. Den foretrukne private Candidate G-revision er `RRS-CANDIDATE-G-CURRENT-LED-WAVE-MOBILISATION-RESEARCH-3`.
2. Mobilisering beskrives af én kausal 0–100-tilstand, som kun bruger lokal, tidsmæssigt sammenhængende bølgehøjde og bølgeperiode.
3. Det øjeblikkelige mål beregnes fra den allerede dokumenterede relative energiproxy `signifikant bølgehøjde² × bølgeperiode`. Proxyen er ikke bundskærspænding og må ikke beskrives som en direkte måling af ravbevægelse.
4. Energiproxyen omsættes med den eksisterende glatte forskningskurve: `0/0`, `0,25/8`, `1/25`, `3/50`, `7/75`, `14/92` og `25/100`, med lineær interpolation mellem punkterne.
5. Når energimålet ligger over tilstanden, bygges tilstanden eksponentielt med fire timers halveringstid mod målet. Når målet ligger under tilstanden, aftrappes den med 48 timers halveringstid mod målet.
6. Manglende bølgeinput holder den seneste afledte tilstand uændret. Missing er ikke roligt vejr. En offentlig pipeline skal stadig afvise forældet eller ufuldstændigt input efter sine freshness- og coveragegates.
7. En kompakt afledt tilstand med tidspunkt og mobiliseringspotentiale skal føres videre mellem produktionskørsler. En kørselsgrænse må ikke nulstille et igangværende hændelsesforløb.
8. Direkte vind, aktuel strømhastighed og en separat varighedsscore giver ingen mobiliseringspoint. Vindens fysiske virkning må komme indirekte gennem de verificerede bølger og strømdata; vind bruges fortsat særskilt i waders-jagtbarheden, og strøm bruges fortsat i transportleddet.
9. Bølgeretning må fortsat påvirke den afhængige levering efter DEC-0055, men den må ikke ændre selve mobiliseringsenergiens størrelse. Mobilisering og nettotransport holdes dermed adskilt.
10. Bund, dybde, render, revler, vadebredde, adgang og statisk stedegnethed indgår ikke. Modellen giver ingen sikkerhedsrådgivning.
11. Candidate G beholder `20/50/30`, DEC-0054's modeafhængige jagtbarhed, DEC-0055's strømstyrede transport og den ejerbesluttede slutscore 0 ved dokumenteret udtømt udtransport.
12. Offentlig `25/40/35`, UI og runtime er uændret i dette beslutningstrin. Automatisk aktivering er falsk.

## Hvorfor 4/48 er den anbefalede forskningsprofil

Fire timers opbygning gør, at en kort høj spids ikke kan ligne et udviklet stormforløb. I den syntetiske audit giver én høj time 15,910, fire moderate timer 27,625 og tolv høje timer 87,500. Det er en glidende dosis, ikke en hård stormkontakt.

48 timers aftrapning matcher ejerens ønskede 24–48-timers hukommelse og bevarer en tydelig eftervirkning efter mobilisering. Efter præcis 48 rolige timer er en opbygget tilstand halveret. Profilen er valgt som en begrundet produktprior mellem de kontrollerede 24- og 72-timers yderpunkter, ikke som en fundkalibreret naturkonstant.

## Privat, dataminimeret replay

Den eksisterende Git-ignorerede cache blev genafspillet uden nye downloads og uden geometri eller beskyttede data:

- 12 hændelsesvinduer og 1.460 evalueringer;
- tidligere mobilisering i gennemsnit 57,651;
- ny bølgeenergitilstand i gennemsnit 73,348;
- Candidate G i gennemsnit 31,775, svarende til +3,484 point mod den allerede valgte strømstyrede revision;
- 332 af 1.460 evalueringer skifter referencebånd;
- start 50 i stedet for 0 flytter efter 24 timers forhistorie kun mobiliseringen +0,578 og totalscoren +0,130 i gennemsnit;
- opbygning 3/6 timer flytter totalscoren +0,336/-0,711, mens aftrapning 24/72 timer flytter den -1,651/+0,703.

Hændelsesvinduerne er bevidst udvalgt omkring kraftige bølgeforløb. De kan derfor teste mekanik og følsomhed, men de kan ikke bevise den generelle danske scorefordeling eller optimal fundforudsigelse. Aftrapningen er den vigtigste tilbageværende parameterusikkerhed.

## Reproducerbar grænsekontrol

`scripts/audit-ravscore-candidate-g-mobilisation-readiness.mjs` bruger kun syntetiske input og er en del af `test:score`. Den låser:

- kort spids under vedvarende moderat hændelse;
- vedvarende høj hændelse over begge;
- eksakt 48-timers halvering;
- byte-uafhængig eksakt fortsættelse over en simuleret kørselsgrænse;
- missing-hold;
- nul direkte mobiliseringsvirkning fra vind, strøm og statiske stedfelter;
- fortsat synlig mobilisering, selv når DEC-0055's udtransportgate sætter slutscoren til 0;
- score-neutralitet, ingen offentlig runtimeændring og intet automatisk aktiveringsmandat.

## Bevarede usikkerheder og næste gate

- `Hs² × T` er en relativ hændelsesproxy og ikke en model af bundskærspænding, dybdeafhængig orbitalhastighed eller kystnær bølgeomformning.
- Fire og 48 timer er forskningspriorer, ikke fundkalibrerede konstanter.
- Den private replaystart er ikke observeret, selv om warm-start-følsomheden er lille efter vinduets 24 timers forhistorie.
- Komplette ture med fund/nul-fund findes endnu ikke; det må stå som modelusikkerhed og må ikke erstattes af skjult tilpasning.
- Før en offentlig kobling skal transport- og mobiliseringstilstande persistéres centralt, køres gennem den aktuelle 673-deles inputkontrakt, forklares i UI og have dokumenteret rollback samt alle fulde produktgates.

DEC-0056 erstatter den additive Candidate G-mobilisering som foretrukken privat model. Den ældre mobilisering bevares som revisionsreference, ikke som parallelt produktforslag.

## Databeskyttelse

- Ingen nye rådata er hentet.
- Private cachepayloads, koordinater og komplette diagnostikposter må ikke lægges i Git eller offentlige artifacts.
- Artifact, protected-dirty-data, geometri og land-/vandpunkter er urørte.
