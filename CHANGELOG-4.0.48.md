# RavRadar 4.0.48 – konservativ kystlinjeforfinelse

Denne version erstatter den brede 4.0.47-ruteudvælgelse med en begrænset metode, hvor den auditerede 4.0.44-linje fortsat bestemmer hvilken kyststrækning zonen tilhører.

- 4.0.47-kysten bruges kun som nærliggende geometrisk mål.
- Hvert punkt projiceres til nærmeste naturlige kyst og skal bevare rækkefølge.
- Store afstande, tilbagespring eller urimelig længdeændring giver automatisk fallback.
- 60 zoner blev sikkert forfinet; 150 beholdt 4.0.44-geometrien.
- Alle 210 zoner har eksplicit rollback til 4.0.44.
- Ingen ændringer i score, klik, zone-ID, DMI-routing, onshore-retning, Supabase eller admin.

Audit: `data/diagnostics/constrained-coastline-4.0.48.json`.
