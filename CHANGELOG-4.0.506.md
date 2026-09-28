# RavRadar 4.0.506 – ekstern firetimersplan med sikker GitHub-kontrol

- Fjerner GitHubs egen upålidelige `schedule` fra normal vejrkørsel.
  Det ene eksisterende cron-job.org-job skal udløse en ekstern
  kontrol hver fjerde time; det står deaktiveret indtil release.
- Kontrollen kan starte én ordinær `run-current-weather-once.yml`-kørsel
  med fulde leverandørbudgetter pr. slot.
  Aktiv/ventende eller allerede startet kørsel i samme slot giver
  no-op. To API-kontroller kræves før dispatch.
  Fejl i forrige slot stopper ikke næste ordinære slot, men samme
  fejlede run genstartes ikke inden for sit slot.
- Den tidligere separate 15-/45-minuttersvagt forbliver
  deaktiveret. Ingen ændring af vejrdata, cache, kildeprioritet,
  score, geometri eller deploygates.
- Lokal kontrakt- og dokumentationskontrol er ikke livebevis.
  Exact-head CI, sikker merge og faktisk eksternt kald
  kræves før driftsverifikation.
