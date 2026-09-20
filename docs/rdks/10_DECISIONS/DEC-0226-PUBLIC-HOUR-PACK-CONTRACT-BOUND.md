# DEC-0226 – Privat timepakke følger offentlig timekontrakt

**Dato:** 2026-09-20  
**Status:** Aktiv  
**Gælder fra:** 4.0.448

## Beslutning

Den private, resumérbare timepakke skal acceptere de samme gyldige offentlige
timefiler som den offentlige leveringskontrakt. Den maksimale rå filstørrelse
og den maksimale komprimerede enkeltpost følger derfor
`PUBLIC_DELIVERY_MAX_BYTES` (16 MiB). Den samlede private pakke beholder sin
egen samlede grænse på 256 MiB.

Kapacitetskontrollen skal bruge den samme grænse, når den henter og måler
offentlige timefiler. En offentlig timefil må ikke først godkendes af
producenten og derefter afvises af den private fortsættelsespakke på grund af
to forskellige enkeltfilgrænser.

## Baggrund

Normalrun `35530859518` gennemførte DMI, fallback, offentlig zoneprognose,
komponentruntime og alle 673 scoredele. Den stoppede først i den afsluttende
private timepakke med `Public hour delivery descriptor is invalid`. Den
offentlige writer bruger 16 MiB, mens den private pakke fortsat brugte 8 MiB.
Det var en kontraktmismatch i leveringslaget, ikke et bevis på manglende
vejrdata eller en scorefejl.

## Afgrænsning

Rettelsen ændrer ikke DMI-first, leverandørprioritet, scoreformel, geometri,
MISSING-regler eller cachevalg. Den gør kun de to leveringslag ens og tilføjer
en regression med en gyldig offentlig timefil over 8 MiB. Fordi leveringskoden
ligger i den transitive model-lukning, bruger release 4.0.448 en ny
append-only successor-migration; den tidligere migration ændres ikke.
Produktionsbevis kræver fortsat exact-head sourcegate, merge og en normal
kørsel, der når privat save, artifact og deploy.
