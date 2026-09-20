# RavRadar 4.0.440

## Copernicus-timeout afleverer gemt fremgang til fallbackkæden

4.0.439 bestod exact-head-kildegaten `35481877393`, blev merged via PR #384
som `badf84e9` og startede almindelig weather `35482138050`. Kørslens
restore, eksakte forgængertilpasning og installation var grønne. Det beviser,
at 4.0.439 rettede den tidligere modelbindingsfejl.

DMI gennemførte og gemte sin fremgang. Copernicus nåede derefter fem
validerede segmenter og 5.855 operationelle par. Hvert segment blev straks
fsync'et i den varige private segmentjournal. Et sjette leverandørkald varede
imidlertid længere end wrapperens hårde tidsgrænse. Processen blev derfor
stoppet, før journalens fem kvitteringer blev samlet til den genbrugelige
`IN_PROGRESS`-source-stage. Den efterfølgende strenge gate afviste den
manglende samlede kvittering, og Open-Meteo blev ikke startet. Den krypterede
fremgang blev stadig gemt.

4.0.440 deler det eksisterende Copernicus-budget i tre faste dele. Ved den
normale 360-sekunders kørsel er der 288 sekunders almindeligt arbejde, en
hård procesgrænse ved 300 sekunder og 60 sekunder reserveret til lokal
aflevering. Ved det udvidede 3.300-sekunders bootstrapbudget er grænserne
3.120/3.180/120 sekunder. Den samlede tidsgrænse hæves ikke.

Hvis leverandørprocessen hænger til den hårde grænse, starter wrapperen kun
samme pilots `--checkpoint-only`-vej. Den foretager ingen provider- eller
netværkskald og kræver ingen Copernicus-login. Den genlæser donorbank,
targetregister og segmentjournal gennem de eksisterende validatorer og
udfører den samme atomiske bank → shadow → `IN_PROGRESS`-source-stage-
transaktion. Først når det lykkes, rapporterer wrapperen kontrolleret gemt
fremgang. Ellers forbliver fejlen hård.

Den strenge source-stage-gate er ikke fjernet eller lempet. DMI-first,
Copernicus før Open-Meteo, vejrdata, RavScore, DMI-only-vandstand, geometri
og gyldighedsregler er uændrede. Produktionsbeviset er én almindelig kørsel,
som skal fortsætte fra den allerede gemte private fremgang gennem
Copernicus, Open-Meteo, score, fulde datagates og deploy.
