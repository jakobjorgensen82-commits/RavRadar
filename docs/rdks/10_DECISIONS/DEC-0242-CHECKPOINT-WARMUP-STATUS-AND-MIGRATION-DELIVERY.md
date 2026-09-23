# DEC-0242 – checkpoint og migrationslevering må bruge samme status

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.471; produktionsbevis afventer

## Observeret problem

Godkendt trip-storage-run `35849255295` anvendte og verificerede de
manglende migrationer. Providerfri `35849615112` genbrugte derefter
den gemte vejrpakke og byggede checkpoint for 673 kystdele, men den
beskyttede RPC afviste det før offentliggørelse. Wrapperen viste kun
"failed closed" og skjulte derfor den præcise afvisningsklasse.

Kode- og SQL-gennemgang viste en konkret modstrid: Et målepunkt på
præcis sidste time med `strength: null` findes, men mangler værdi.
Scorekoden kalder det `WINDOW_HAS_MISSING_EVIDENCE`. SQL kaldte det
`LATEST_SAMPLE_MISSING`, som kun bør betyde, at ingen række findes
på den sidste time. Det er en sandsynlig, men endnu ikke livebevist
årsag til RPC-stoppet.

## Beslutning

- Ret SQL i en ny append-only migration `20260923110000`; tidligere
  anvendte migrationer må ikke redigeres. Schema og installationskopi
  skal have samme definition.
- Den normale integrerede kode-only-levering skal planlægge, anvende
  og læse den præcise nyeste migration tilbage. Historikvedligeholdelse
  er ikke den eneste handling, som kan kræve en ny binding.
- Behold RPC's afvisning ved reelle fejl. Log kun HTTP-/SQL-kode og
  en statisk, godkendt fejlklasse; aldrig payload, private målinger,
  credentials eller hele databasens fejltekst.
- Test JS-status mod SQL-kontrakten for en tom sidste time. En
  providerfri liveprøve skal bevise migration, checkpoint, beskyttede
  writes og Pages, før rettelsen kaldes driftsverificeret.

Dette ændrer ikke RavScore-formlen, DMI/CP/OM-prioritet, rå vejrdata,
gyldighedskrav eller geometri. Leverandørernes nul/REST-fremgang og
andre vejrtypehuller forbliver særskilte åbne problemer.
