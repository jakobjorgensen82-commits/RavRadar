# DEC-0046 - Automatisk gammel/nuværende/kandidat-sammenligning

- **Status:** AKTIV
- **Dato:** 2026-08-21
- **Scorepåvirkning:** Ingen

## Beslutning

RavScore sammenlignes lokalt og deterministisk i syv spor:

1. RRS-LEGACY-WEIGHTS-4.0.241: tidligere 40/35/25 på samme observerede komponenter.
2. RRS-CURRENT-B0-4.0.247: aktiv 25/40/35 og nuværende regler.
3. RRS-CAND-A-SMOOTH-EVENT: glatte kurver og hændelseshukommelse med 25/40/35.
4. RRS-CAND-B-DELIVERY-RETENTION: A plus særskilt levering og fastholdelse.
5. RRS-CAND-C-WEAKEST-LINK: B plus en mild glat reduktion på højst 25 %, når et nødvendigt led er klart svagt.
6. RRS-CAND-D-WAVE-DELIVERY-PATH: A-C bevares som reference, mens D kræver en bølge-/strømunderstøttet leveringsvej og holder udokumenteret lokal fastholdelse neutral.
7. RRS-CAND-E-PHYSICAL-BOTTLENECK: D plus højst 15 % reduktion, når mobilisering eller samlet transport/levering er under 35. Jagtbarhed indgår ikke i denne gate.

Det offentlige produktionsdatasæt bruges direkte til gammel-mod-nuværende. A-C kræver rå hændelseshistorik, som den offentlige scorepost ikke fuldt indeholder, og sammenlignes derfor først på det deterministiske scenariegitter og faste fysiske kontrolsituationer.

## Ejeroplevelse

Et read-only værktøj skriver én kort dansk rapport med aggregater, niveauændringer, fysiske paradokser og automatisk udvalgte kontrolsituationer. Ejeren skal ikke analysere rå payloads eller tusindvis af rækker.

## Sikkerhedsgrænse

Værktøjet kan ikke skrive score, regler, data eller geometri. Ingen kandidat aktiveres automatisk. Resultatet er ikke fundkalibrering, og komplette ture er fortsat den senere empiriske enhed.

## 4.0.251-skygge og D/E

Den grønne aktive skyggekørsel viste, at C sænkede 238 af 243 scorede kystdele i hver søgemåde, mens B manglede komplet lokal fastholdelsesdækning. Den faste scenariematrix viste samtidig, at B kunne give cirka 67 point, selv når både bølger og strøm førte væk fra kysten, fordi timing og aftagende energi kunne skabe 65 leveringspoint uden en reel leveringsvej.

D og E er derfor nye score-neutrale forskningskandidater. De ændrer ikke A-C's identitet eller den aktive produktion. D bruger bølgeretning og periode sammen med strømmen og lader kun timing forstærke en eksisterende leveringsvej. E's smallere gate bruges kun på den fysiske kæde.

## v4.0.248-kandidatgennemgang (2026-08-21)

Den automatiske ejeroversigt og den faglige gennemgang er nu genereret. Dette afsnit erstatter tidligere status om, at rapporten manglede. Konklusionen er at beholde den aktive vaegtning 25/40/35 og ikke aktivere A, B eller C samlet. A er for volatil, B skal skelne levering fra passage, og C er en mulig mild fysisk gate, men der er kun 3 af 1.346 aktuelle kystdele med mindst middel score og et tydeligt svagt fysisk led. Naeste trin er derfor score-neutral intern skyggekoersel og maalrettet retningskontrol, ikke en offentlig scoreaendring. Se `docs/research/RAVSCORE_CANDIDATE_REVIEW_2026-08-21.md`.
