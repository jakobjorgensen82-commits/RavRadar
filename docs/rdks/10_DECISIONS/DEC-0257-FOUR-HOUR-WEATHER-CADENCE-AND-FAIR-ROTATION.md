# DEC-0257 – Firetimers vejrkadence, tidsmargin og fair reservekø

**Dato:** 2026-09-28
**Status:** Besluttet af ejeren; lokal 4.0.505, liveeffekt afventer

Ejeren ønsker én normal vejrhentning hver fjerde time, længere tidsgrænser
og mere tid til Copernicus. Dette afløser den tidligere 15-minuttersplan,
men ikke kravet om én produktion ad gangen, fuld artifactgate eller
kildeprioriteten DMI → Copernicus → Open-Meteo. Den gamle Copernicus-
watchdog og tidligere eksterne cron-dispatchere forbliver deaktiverede.
Aktivering af GitHubs normale schedule sker først efter grøn exact-head
kildekontrol, sikker merge og kontrol af, at intet vejr-run overlapper.

Fuldt normalrun `36347957014` på offentlig 4.0.504 gendannede nyeste
gyldige fremdrift, hentede hos alle tre leverandører, gemte og deployede.
Det brugte cirka 59 minutter på DMI, knap fem aktive minutter på
Copernicus, 18 minutter på Open-Meteo og 55 minutter på cachebygningen
ud af den hidtidige grænse på 60. Hele buildjobbet tog 158 minutter.
Derfor får normal Copernicus 1.500 sekunder, cachetrinnet 80 minutter
og buildjobbet 230 minutter. Kort bekræftelse beholder 120 sekunder
til Copernicus; udvidet bootstrap beholder 3.300 sekunder og 240 minutter.
Dette er tidsbudgetter, ikke bevis for større dækning eller garanteret
færdiggørelse inden næste firetimersslot. Concurrency forhindrer overlap.

Firetimerskadencen kræver også ændret rotation: den tidligere beregning
tog UTC-timen modulo antal Copernicus-shards/Open-Meteo-batches.
Fire timer mellem normale runs kunne dermed springe de samme tre af
fire grupper over permanent, især når kølængden var delelig med fire.
En skiftende minutkvart fra DMI's varierende varighed gav yderligere
uforudsigelighed. Begge reservekøer roterer nu én position pr. UTC-
firetimersslot modulo køens **faktiske** længde, med forsøgsnummer som
retry-offset. En isoleret manuel kørsel kan gentage et slot; den
regelmæssige serie skal afprøves live før fuld fair dækning påstås.
Ingen kilde-, gyldigheds-, geometri- eller RavScore-regel ændres.

DMI skal også rotere, men bruger allerede en anden mekanisme:
samlingernes gemte `lastAttemptAt`/`lastBudgetInterruptedAt` og det
gemte `criticalNativeCursorValidTime` for faktisk forsøgte native
timer. Den prioriterer stadig de tre nærmeste kritiske timer først og
giver derefter de senere timer en tur; en afbrudt DKSS-model skal vige
for andre relevante modeller. Denne rotation er ikke afledt af
UTC-klokkeslættet modulo et antal grupper og får derfor ikke den
samme firetimers-aliaseffekt. Bevar DMI-mekanismen uændret i 4.0.505,
men verificér dens gemte cursor, faktisk forsøgte modeller og
femfeltsbidrag i de kommende normale runs. En gemt planlægningstur
er ikke i sig selv bevis for hentede gyldige data.
`update:weather`-rapportens `DMI_SCHEDULE_INTERVAL_MINUTES` sættes
fra 15 til 240, så dens optimistiske estimat for EDR-restzoner
bruger den faktiske plan. Feltet styrer ikke DMI-bulkmodellernes
rotation eller antal hentninger og giver ikke DMI færre minutter.

Den offentlige pakke fra `36347957014` har 79.414 kystdel/time-par pr.
vejrtype: vind 77.142, bølger 79.414, havstrøm 74.986, vandstand
76.193 og vandtemperatur 75.319 gyldige. De fem tilsammen er
383.054/397.070. Tre zoner har nul offentlige scoretimer i alle 118
timer: `DK-B05-21` Nibe og Sebbersund, `DK-B05-23` Aalborg vest og
Egholm, `DK-B05-24` Aalborg øst og Nørresundby. De mangler især
havstrøm, selv om andre vejrfelter findes. Ejeren har omtalt fire;
en fjerde helt tom zone kan ikke påvises i denne præcise pakke og
skal identificeres, hvis den stadig ses på siden. Alle 22 berørte
kystdele ligger i den valgte Copernicus-Baltic-domæneramme, men det
beviser ikke en gyldig våd modelcelle eller et leverandørsvar.
Ingen nye proxydele, flyttede punkter, løsere afstandsgrænser eller
opfundne scoreværdier godkendes her. Efter næste fulde run måles
de 22 dele og alle fem vejrtyper på samme sted/time; fortsat nul
kræver konkret svar-/grid- og tidligere August-kildeanalyse.

Udgået er påstanden om, at grøn 4.0.504 betyder komplette eller
selvkørende vejrdata. Den offentlige pakke og deployment er bevist;
fuld dækning, kildeandel, firetimersrotation og nye budgetter er
fortsat åbne til livekontrol. Genbrug af gyldige gamle komponenter,
DMI-først, den dokumenterede 96-timersundtagelse, centralt valgt
DMI-vandstandsinterpolation og godkendt Limfjord-regel består.
