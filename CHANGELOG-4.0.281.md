# Changelog 4.0.281

## Candidate G-diagnostik

- Den tekniske visning bruger nu Candidate G's egne beregningsled og tilstande i stedet for felter fra den udgåede scoremodel.
- Strømretningen vises kun som en aktuel, klassificeret måling, når den konkrete time har en verificeret strømmåling. Mellem DMI's naturlige tretimersmålinger forklarer visningen, at den seneste verificerede modeltilstand fastholdes.
- Den tekniske kontrol viser transportpotentiale, levering mod kysten, samlet transportkomponent, transportens måletid, 48-timers historikdækning, historisk fase og eventuelt tab ved kraftig udgående strøm.
- Felterne **Mangler** og **Ukendt** bruges derfor kun ved reel manglende eller ikke-verificeret evidens og ikke længere som følge af gamle feltnavne.
- Den offentlige produktionsprojektion bevarer den fulde, dataminimerede Candidate G-forklaring fra den vindende kystdel.

## Dokumentation og kontrol

- RDKS, roadmap, kendte issues, håndbog og webhåndbog beskriver den nye Candidate G-native diagnosekontrakt.
- Målrettede tests dækker verificerede strømtimer, naturlig tretimersfastholdelse, 48-timers hukommelse, alle 673 kystdeles retningsisolation og den offentlige forklaringsprojektion.

## Uændret

Candidate G 20/50/30, selve RavScore-beregningen, vejr- og havdata, zoner, geometri, land-/vandpunkter, admin-data og brugerdata er ikke ændret. De beskyttede geodatafiler ændrer kun topversionsfelt 4.0.280 → 4.0.281.
