# Online mobil-/desktopaudit 4.0.237 - 2026-08-20

Live 4.0.237 er kontrolleret i en mobil viewport på 390 × 844 og en desktopviewport på 1440 × 900.

Begge visninger bestod:

- dokumentbredden matcher viewporten uden horisontal overflow,
- kort og informationspanel har positiv og viewporttilpasset bredde,
- zonepanel viser RavScore, lokal visningskontekst og tre scorekomponenter,
- to aktuelle retningspile vises,
- fem prognosedage indlæses,
- ingen page errors eller funktionelle HTTP-fejl.

Den eneste observerede 404 var GitHub Pages-faviconet og påvirker ikke RavRadar. Maskinresultatet ligger i `data/diagnostics/online-responsive-audit-4.0.237-20260820.json`; kontrollen kan gentages med `scripts/audit-online-responsive-4.0.237.py`.

Ingen produktionsdata, geometri eller land-/vandpunkter blev ændret.
