# Klassifikation af 12 parent-zone-huller - 4.0.237

## Konklusion

De 12 parent-zoner uden verificeret current er en ensartet, fail-closed klasse og ikke tab af current-historik. I produktionsartifact `#3242` har alle 12:

- `currentSpeedMps=null` og `currentDirectionDeg=null`
- `flowPoints.current=null`
- `currentProvenance.status=unverified`
- `currentProvenance.reason=no-marine-grid-point`
- current-kilde `missing` uden fallback

Der maa derfor ikke opfindes en parent-vektor, kopieres en lokal vektor til parent-zonen eller flyttes land-/vandpunkter for at lukke tallet kosmetisk.

## Omfang

| Omraade | Parent-zoner | Lokale kystdele med egne marine flowpunkter |
|---|---:|---:|
| B05 | 6 | 28 |
| B07 | 4 | 14 |
| B08 | 1 | 2 |
| B12 | 1 | 3 |
| I alt | 12 | 47 |

Zonerne er `DK-B05-10`, `DK-B05-17`, `DK-B05-20`, `DK-B05-22`, `DK-B05-23`, `DK-B05-24`, `DK-B07-12`, `DK-B07-13`, `DK-B07-15`, `DK-B07-17`, `DK-B08-19` og `DK-B12-01`.

Den lokale kontrollerede runtime har fortsat 673/673 aktive kystdele. De 47 lokale dele i disse 12 parent-zoner har deres egne marine flowpunkter og maa vurderes gennem den lokale identitet. Parent- og lokal identitet skal ikke blandes.

## Betydning for historikrettelsen

Reference-time-rettelsen giver efter isoleret replay 30,903 timers verificeret historik for de 198 parent-zoner, der faktisk har en verificerbar DMI-current. De samme 12 zoner forbliver korrekt paa nul verificerede samples. Det viser, at rettelsen hverken backfiller eller maskerer manglende marine gridpunkter.

Et senere roadmaptrin kan forbedre produktets forklaring af forskellen mellem parent- og lokal current. En faglig aendring af identiteter, punkter, kilder eller fallback kraever derimod selvstaendig ejerbeslutning og ny geometri-/DMI-/scorevalidering.
