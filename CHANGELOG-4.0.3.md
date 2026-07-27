# RavRadar 4.0.3

## DMI datakvalitet

- Rettet fejlen hvor sidste DMI-modeltrin blev kopieret gentagne gange med samme tidsstempel.
- Forecastposter bruger nu det tilsigtede timepunkt og accepterer kun kildedata inden for 90 minutter.
- Dublerede tidsstempler samles og begrænses til 120 unikke timer.
- DMI/fallback-sammenfletning sker nu efter tidsstempel frem for array-indeks.
- Dækning beregnes på unikke gyldige timer.
- Tilføjet komponentvis kvalitetsrapportering for vind, bølger, strøm, vandstand, komplette zoner og dubletter.
- Tilføjet permanent DMI-baselinedokument.
