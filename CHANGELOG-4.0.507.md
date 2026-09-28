# RavRadar 4.0.507 – præcis undtagelse for tre fastlåste legacy-kørsler

- Første levende tørkørsel af 4.0.506-kontrollen viste, at GitHub
  stadig returnerer tre gamle `queued`-poster fra det ældre
  vejrworkflow. De blokerede en planlagt start, selv om ingen
  faktisk produktion var aktiv.
- Kun disse tre eksakt verificerede runidentiteter ignoreres.
  Ukendte eller ændrede ventende kørsler blokerer fortsat.
  Næste planlagte slot må stadig starte efter en afsluttet fejl,
  men aldrig oven i en aktiv kørsel eller igen i samme slot.
- Ingen ændring af vejrdata, cache, kildeprioritet, score, geometri,
  artifact- eller releasegates. Exact-head CI, merge og ekstern
  starttest afventer.
