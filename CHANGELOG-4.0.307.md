# RavRadar 4.0.307

Dato: 2026-08-29

## Leverance

- Hele 4.0.306-ejerpakken er gennemgået igen på Sol/Ekstra høj.
- Spørg RavRadar har 152 kildeklassificerede lokale emner og 456 reproducerbare DA/DE/EN-katalogspørgsmål oven på de 17 eksisterende intent-kontrakter. Viden kommer fra 27 offentligt registrerede forsknings-, myndigheds-, RavRadar-, Grundbogs- og ekspertkilder og virker uden AI-kvote eller netværk.
- Edge-kontrakten er udvidet fra 23 til 38 offentlige fakta og 66 balancerede evalcases. 395 nm er ensrettet, relevant ravrouting er bredere, og Unicode-helord forhindrer, at `Skagen` rammer afvisningsordet `kage`.
- Lokale fakta-, forsknings- og sikkerhedssvar afhænger ikke længere af prognosedetaljefilen. Dynamisk bedste sted, bedste tid og score er fortsat databundne.
- Femdøgnsvisningen fjerner udløbne datoer efter dansk kalenderdag, men bevarer de originale forecastdatoer og -værdier. Nøddrift må derfor vise færre end fem gyldige dage eller en tydelig udløbsbesked.
- Kyst B har lodret gul kyst og pil op på dansk, tysk og engelsk. De øvrige ejerrettelser fra 4.0.306 – tekst, 395 nm, koldt vand, Rav Jagt-video/illustration, zonesøgning, pilesignatur, mørkere strømfarve, mobilombrydning og BernsteinScore/AmberScore – er bevaret.

## Afgrænsning

- Ingen ændring af Candidate G, RavScore, vægte, kurver, bølge-/strøm-/mobiliserings-/leveringssemantik, DMI/Copernicus, modelprofil, state/cache/recovery, geometri eller land-/vandpunkter.
- Geodatafiler må ved versionslukning kun ændre deres godkendte topversionsfelt.

## Verifikation

- Grønne lokale katalog-, Edge-, sprog-, lærings-, forecast-, turzonesøge-, kortpile- og modelkontrakttests.
- Lokal browserkontrol ved 390 × 844 og 1440 × 900 er grøn for de berørte synlige flader og fandt/lukkede prognosedetaljeafhængigheden på ravlygtespørgsmålet.
- Lokal fuld `validate:source` inklusive RDKS, Candidate G-regressioner og releasegate er grøn på den afsluttede 4.0.307-kildekandidat. Exact-head, frisk produktion og offentlig slutkontrol dokumenteres efter merge i RDKS/PR.

Se `docs/rdks/10_DECISIONS/DEC-0105-EXTRA-HIGH-OWNER-CORRECTION-AUDIT.md` og `docs/research/RAV_ASSISTANT_EXTERNAL_KNOWLEDGE_AUDIT_2026-08-29.md`.
