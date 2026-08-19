# Online browseraudit 4.0.237 - 2026-08-20

## Resultat

- Live index og bootstrap returnerede begge version `4.0.237` med HTTP 200.
- Auditeret live datasæt: `rr-20260819211124-210`.
- 210/210 zoner og 673/673 kystdele blev indlæst.
- 420/420 aktuelle zonevisninger blev åbnet og kontrolleret i både Waders og Strand.
- 2.100/2.100 femdøgnsvisninger blev klikket og kontrolleret.
- 0 mismatch i RavScore, label, farveniveau, vindpil, strømpil, komponentforklaringer, kystforklaring, lokal vinderkontekst og debug-ID.
- 0 page errors. Eneste HTTP-fejl var den ikke-funktionelle `https://jakobjorgensen82-commits.github.io/favicon.ico` med 404.

Maskinresultatet ligger i `data/diagnostics/online-browser-audit-4.0.237-20260820.json`. Auditværktøjet ligger i `scripts/audit-online-browser-4.0.237.py`.

## Browservej

Browser-pluginet blev forsøgt først. Det fejlede før navigation i pluginets trusted-code-path. Den ejer-godkendte lokale Chromium-fallback blev derfor brugt mod den faktiske online GitHub Pages-side.

## Afgrænsning

Auditen ændrede ingen land-/vandpunkter, geometri, U/V, score, kildeorden eller live-data. Den kontrollerede den synlige DOM mod samme runtimepost, som 4.0.237 bruger til score og visning.

En tidligere Spark-kørsel arbejdede fejlagtigt i den gamle desktopkopi på 4.0.220. Branchen `codex/browser-zone-audit-20260820` og commit `526509f2` må ikke flettes. Den gældende audit og dokumentation findes kun i den korrekte 4.0.237-worktree.
