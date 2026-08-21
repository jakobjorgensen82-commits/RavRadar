# RavRadar 4.0.249

## Privat RavScore-kandidat-shadow

- Udvider den eksisterende private nationale shadow-validator med A/B/C på samme lokale context som den aktive score.
- Udleder 24 timers hændelseshistorik og 72 timers strømforløb fra transiente nationale input.
- Kontrollerer kandidat B særskilt for strøm mod, langs og væk fra kysten.
- Gemmer kun dataminimerede scoreforskelle og fem yderpunkter; rå vejrvektorer gemmes ikke.
- Markerer manglende lokale fastholdelsesfeatures eksplicit, så leveringsresultater ikke fejltolkes som fuld validering af kandidat B.
- Bevarer aktiv score, offentlig runtime, UI, vejrsampling, admin-data og geometri uændret.

## Validering

- National shadow-score selftest.
- National weather-shadow kontrakttest.
- RDKS-, versions- og release-gates før merge.
- Første virkelige nationale shadow-artefakt køres efter merge i det eksisterende private job.
