# DEC-0020 – Samlet funktionel accept af hele RavRadar

- **Status:** Gældende
- **Version:** 4.0.70
- **Dato:** 2026-08-02

## Beslutning

En RavRadar-release må ikke erklæres funktionelt færdig alene på baggrund af fil-, data- eller Supabase-tests. Den samlede sitetest skal dække de vigtigste dele af den offentlige side og administrationen samt sammenhængen mellem data, deploy og browser.

## Minimumsdækning

- Offentlig side åbner i en rigtig browserkontekst.
- Kort, zonefarver, rangliste, jagtform og femdøgnsprognose virker.
- Manifest, conditions, dataset-id, friskhed og zonedækning kontrolleres.
- Spørg RavRadar testes med realistiske danske spørgsmål.
- Admin-session, centrale faner og deployede moduler kontrolleres.
- Supabase readback, opdatering og oprydning testes med mærkede testdata.
- Service worker, versioner, manglende filer og browserfejl kontrolleres.
- Opstartstider og langsomme ressourcer rapporteres.

## Bevisniveau

Lokale tests beviser kode og release-artifact. Den ejerstyrede test i den deployede administration giver produktionsbevis for browser, GitHub Pages og den eksisterende Supabase-installation.
