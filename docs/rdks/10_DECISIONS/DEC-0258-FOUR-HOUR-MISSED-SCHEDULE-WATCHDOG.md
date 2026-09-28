# DEC-0258 – vagthund for en udebleven firetimersstart

**Dato:** 2026-09-28
**Status:** Erstattet af DEC-0259 før release. Den nedenstående GitHub-schedule-variant blev aldrig aktiveret.

Ejeren præciserer, at vagthundens primære opgave er at starte én normal
vejrkørsel, hvis den planlagte firetimersstart udebliver. Den må ikke
være en automatisk genstart af en kørsel, som faktisk begyndte og fejlede.
Dette afløser den gamle 15-/45-minutters stilheds- og fejlretrypolitik i
DEC-0107/0108 for den nuværende firetimersdrift; den gamle separate
Copernicus-/produktionsvagt forbliver deaktiveret. DEC-0257's normale
`17 */4 * * *`-plan er uændret.

Den nye GitHub-vagt kontrollerer én gang pr. forventet starttid, ved
UTC 01:47, 05:47, 09:47, 13:47, 17:47 og 21:47 – 90 minutter efter
de normale 00:17, 04:17, ... . Den læser seneste main-runs for både
`update-and-deploy.yml` og `run-current-weather-once.yml`.
Aktiv/ventende kørsel, en kørsel oprettet siden forventet start eller
en ældre kørsel, der stadig krydsede starttidspunktet, giver no-op.
Et fejlet forsøg tæller også: en reel fejl skal undersøges, ikke
genhentes blindt. Kun når ingen af disse findes, kan vagten efter et
nyt API-tjek bestille én ordinær `force=false`-kørsel på `main`.
Vagten er serialiseret med sig selv; produktionens eksisterende
concurrencygruppe forhindrer samtidige tunge kørsler. Manuelt
`workflow_dispatch` af vagten er kun en tør inspektion.

Manglende eller ugyldig runhistorik, uventet workflow-state og
GitHub-API-fejl stopper vagten uden dispatch og gør dens eget run
rødt. Ingen privat vejrpayload eller secrets læses. Den ændrer ikke
cache, kildeprioritet, score, geometri, releasegates eller deploy.

Dette er **ikke** beskyttelse mod total tavshed i hele GitHubs
scheduler: vagten bruger selv et GitHub-`schedule`-event. Tidligere
ekstern cron-job.org blev slettet; en uafhængig ekstern vagt kræver
en særskilt aktiveringsbeslutning, kvote-/sikkerhedsvurdering og
produktionsbevis. GitHubs dokumentation tillader forsinkede eller
droppede schedule-events, så 90 minutter er en sikkerhedsventetid,
ikke en garanti for eksakt start.

Efter lokal måltest kræves exact-head source-CI, sikker merge uden
aktiv vejrkørsel og mindst én observeret watchdog-inspektion på
`main` før liveadfærden kan kaldes bevist. Et faktisk redningsdispatch
må kun påstås, hvis netop den manglende-slot-gren er set i produktion.
