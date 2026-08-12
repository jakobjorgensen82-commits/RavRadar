# RavRadar 4.0.192

- Samler land-/vandredigeringen pr. hovedzone: administratorsøgning viser hele hovedzonen og alle dens aktive præcise kyststrækninger på samme kort.
- Hver kyststræknings hav- og landpunkt kan trækkes eller sættes på ny. Den eksisterende rangering, hovedkortlinket og det centrale godkendelsesflow er bevaret.
- Kun centralt gemte og readback-verificerede godkendelser anvendes i runtime; kladder påvirker hverken DMI eller RavScore.
- DMI-sampling læser den byggede aktive kystdelskontrakt, så godkendte land-/vandpunkter, cachesignatur, gridvalg, lokal score og offentlig runtime bruger samme data.
- Målrettede regressionstests for admin-editor, central roundtrip, aktiv kystdelsbygning, DMI-cache, scheduler, offentlig UI og RDKS er grønne lokalt. Produktionsverifikation kræver fortsat en fuld grøn GitHub-kørsel og deploy.
