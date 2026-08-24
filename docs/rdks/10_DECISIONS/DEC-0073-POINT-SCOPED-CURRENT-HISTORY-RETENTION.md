# DEC-0073 – strømhistorik bevares pr. kystpunkt

**Status:** GODKENDT TIL 4.0.276 – AFVENTER PRODUKTIONSVERIFIKATION

**Dato:** 2026-08-25

**Berører:** privat Copernicus-strømcache, Candidate G's 48-timers evidensvindue, dynamiske indsamlingsmål og lokal scoretilgængelighed

**Ændrer ikke:** Candidate G's 20/50/30-formel, strøm-/mobiliseringsregler, offentlig datakontrakt, zoner, kystgeometri eller land-/vandpunkter

## Problem

Copernicus-cachen bandt en hel indsamlingstime til den delmængde af kystpunkter, som blev hentet i netop den kørsel. Når DMI-dækningen ændrede sig, eller ét centralt punkt blev flyttet, kunne den valgte delmængde få en ny identitet. Ved en genindsamling af samme time blev hele timen erstattet, og ældre timer kunne miste deres fælles godkendelse. Dermed kunne uændrede kystpunkter miste gyldig historik på grund af et andet punkts ændring.

Den kompakte Candidate G-state var ikke gået tabt. En dataminimeret kontrol dokumenterede cirka 36 timers sammenhængende fortsættelse ved den seneste kontrollerede reference. Den ældre brede cache kunne ikke bruges som landsdækkende genvej: kun 43 dele havde et sikkert sammenhængende vindue frem til målreferencen, 621 var ufuldstændige, og otte manglede. Manglende timer må derfor ikke rekonstrueres eller kaldes historik.

## Beslutning

1. Den fulde centrale liste over kystpunkters eksakte identiteter følger hver opdatering af den private Copernicus-cache. Den valgte indsamlingsdelmængde angives særskilt.
2. En ny række accepteres kun, når kystdel, moderzone og vandpunkt matcher den centrale identitet, og delmængdens fingeraftryk er eksakt.
3. Genindsamling af samme time erstatter kun rækker for de valgte kystpunkter. Verificerede rækker for uændrede punkter bevares.
4. Når et punkt flyttes, fjernes kun det punkts ældre historik. Et uændret søsterpunkt beholder sin dokumenterede historik.
5. Efter hver opdatering genopbygges timens samlingsbevis ud fra de eksakte identiteter, som faktisk er bevaret. Dubletter, ukendte punkter eller identitetsmismatch accepteres ikke som evidens.
6. Der udføres ingen backfill, interpolation eller rekonstruktion. Candidate G bliver lokalt utilgængelig, indtil det konkrete punkt igen har et sammenhængende 48-timers vindue.
7. Candidate G 20/50/30 forbliver eneste offentlige scoremodel. Den gamle 25/40/35-model genindføres ikke.

## Kontrol

- En målrettet regression flytter ét punkt og beviser, at både samme time og en ældre time for et uændret søsterpunkt overlever med nyt eksakt samlingsbevis.
- Eksisterende tests for 168-timersgrænse, dubletter, DMI-først, cachebevaring og Candidate G's native tretimerskadence skal bestå.
- RDKS- og kildegaten skal bestå på PR'ens eksakte head.
- En frisk produktion skal bestå central hydrering, vejrbyg, fuld validering, releasegate og deploy. Den efterfølgende dataminimerede kontrol skal bekræfte fortsat Candidate G-only og lokal tilgængelighed uden rå strømvektorer, koordinater eller private payloads.
