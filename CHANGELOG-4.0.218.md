# RavRadar 4.0.218

- Beskytter en eksisterende strømserie omkring nu mod at blive ryddet af et geografisk bedre DMI-strømpar, som kun findes i prognosens fjerne hale.
- En anden havmodel må fortsat overtage, når den selv har et fælles U/V-par inden for seks timer af datasættets genereringstid.
- Hvis den eksisterende model ikke har aktuel strøm, er recovery fortsat tilladt; manglende data skjules ikke.
- DMI-kilder, fallback, RavScore og det autoritative hav-/landpunktpar er uændrede.
- Regressionen er afledt af 27 zoner i artifact #2750, hvor et sent `dkss_idw`-par 19. august tidligere kunne erstatte en aktuel `dkss_nsbs`-serie.
