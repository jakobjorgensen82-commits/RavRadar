# DEC-0077 – Candidate G-native tekniske forklaringer

**Status:** AKTIV – KANDIDAT 4.0.281

**Dato:** 2026-08-25

**Berører:** offentlig teknisk kontrolvisning, Candidate G's offentlige forklaringskontrakt og bevaring af forklaringsfelter gennem vejrpipelinen

**Ændrer ikke:** Candidate G's 20/50/30-vægte, scorekurver, vejrkilder, 48-timershukommelse, zoner, geometri, land-/vandpunkter, admin-data eller brugerdata

## Problem

Candidate G beregnede allerede den aktuelle strømklassifikation, transporthukommelsen og de værdier, som forklarer transportscoren. Den offentlige tekniske visning læste imidlertid fortsat en række pensionerede felter fra den gamle scoremotor. Samtidig fjernede zoneaggregationen dele af Candidate G-forklaringen. Derfor kunne brugeren se **Mangler**, **Ukendt**, tankestreger og **Ikke beregnet**, selv om den viste Candidate G-score var beregnet på et gyldigt grundlag.

Fejlen lå i forklarings- og dataflowet, ikke i selve RavScore-beregningen.

## Beslutning

1. Den offentlige tekniske visning må kun beskrive Candidate G og viser scoreprofilen som **20 % søgeforhold, 50 % transport og 30 % rav i bevægelse**.
2. Candidate G's offentlige forklaringskontrakt bevarer gennem både kystdels- og zonevisning:
   - status for den aktuelle strømtilstand,
   - forskel mellem strøm og lokal pålandsretning samt klassifikation, når der findes en ny verificeret måling,
   - transportens reference og dokumenterede dækning i det rullende 48-timersvindue,
   - historisk fase, udgående forløb, gradvist transporttab og eventuel transport-nul-gate,
   - transportpotentiale, levering mod kysten, endelig transportkomponent, rav i bevægelse og samlet RavScore.
3. I de tilladte mellemtimer for en native tretimerskilde skal visningen sige: **Ingen ny måling denne time; seneste verificerede tilstand fastholdes**. Den må ikke opfinde eller genvise en rå retning, forskel eller klassifikation som en ny måling.
4. Vind må ikke fremstilles som et direkte input til Candidate G's transportkomponent. Den kan fortsat indgå andre steder efter den aktive modelkontrakt.
5. **Mangler** eller **Ukendt** må kun vises, når det konkrete Candidate G-grundlag faktisk er fraværende. En navneforskel mellem gammel og ny motor må aldrig igen skabe en falsk mangelstatus.
6. Pensionerede felter som transport før/efter scoreloft, nærkystpotentiale og vindens bevægelse fjernes fra den tekniske Candidate G-visning.
7. Candidate G's trin er ikke en simpel additiv regneliste. Den tekniske tabel forklarer derfor status, hukommelse og gates uden at påstå, at alle viste størrelser kan lægges direkte sammen.

## Kontrol

- En målrettet kontrakttest skal bevise felterne i både Candidate G-projektionen, zoneaggregationen og UI'et.
- Den eksisterende scoreforklaringstest skal kontrollere, at teknisk visning ikke falder tilbage til legacyfelter.
- Alle offentlige zoner og kyststrækninger skal efter deploy kunne åbne den samme Candidate G-native tekniske visning uden falsk **Mangler/Ukendt**.
- Native mellemtimer skal kontrolleres særskilt, så der ikke offentliggøres opdigtet rå retning eller måling.
- Exact-head-kildegate og den fulde produktionskæde skal bestå før offentliggørelse.

## Erstattede beskrivelser

Alle håndbogs- og UI-beskrivelser, der knytter den tekniske kontrolvisning til den pensionerede scoremotors felter, er erstattet. Candidate G's fysiske model og scoretal er uændrede.
