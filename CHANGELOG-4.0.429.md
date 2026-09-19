# RavRadar 4.0.429

## Rettet

- Providerfri saved-weather-fortsættelse kan nu føre en kendt diagnostisk
  runtimeaudit videre til de afgørende privacy-, artifact- og deploykontroller,
  ligesom almindelig integrated maintenance allerede gør.
- HARMONIE bruger nu en korrekt officiel STAC-identitet i stedet for den
  marine-only identitetskontrol og binder samme identitet til cache-resume.
- Normal DMI får 1.500 sekunders totalbudget mod tidligere 900, så det ene
  H0-vindasset faktisk kan starte uden at fjerne de reserverede WAM-/DKSS-
  forsøg.

## Produktionsstatus

4.0.428 bestod exact-head `35416314162`, PR #373 og main `a2d03d95`.
Normalrun `35416641052` gemte alle providercacher, men stoppede sent på gammel
readiness. Providerfri fortsættelse `35419876748` beviste den resterende
diagnostiske auditkant. Den gemte 02:00-runtime genbruges efter 4.0.429; der
hentes ikke vejret igen for selve leveringen.

Datasættet er ikke komplet: den aktuelle pakke havde nul H0-vindtupler, 420
utilgængelige aktuelle modes og 156 manglende Feggesund-bølgedeltimer. Næste
almindelige kørsel skal bevise faktisk HARMONIE-behandling og samlet fremgang.
Se DEC-0209.
