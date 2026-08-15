# RavRadar 4.0.209

## Historisk vejrhukommelse
- Bevarer separat 72 timers rå zonehistorik til senere mobiliserings- og stateanalyse.
- Bevarer aktiv RavScore og `shadow-v2` uændret på deres eksisterende 24-timersvindue.
- Udelader begge rå historikvinduer fra den kompakte offentlige browserpayload.

## DMI-proveniens og analyse
- Bevarer vandstandens oprindelige DMI-identitet gennem continuity-trinnet.
- Dokumenterer providerforløb og skelner timekant, progressive HARMONIE/DKSS-overgange og komponentvis DKSS-dækning.
- Ændrer ingen DMI-kilde, fallbackprioritet, mergepolitik eller score.

## Validering
- Målrettede tests dækker retention, public projection, current-history, water-continuity og DMI forecast-store.
- Fuld validate, releasegate og frisk produktionsverifikation kræves.
