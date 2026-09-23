# Åbent: lokal dækning for flere vejrtyper

**Status:** Åbent, 2026-09-23. DEC-0239.

Offentlig 4.0.467-prognose `rr-20260923063008-210` viser ved T0 lokal
vind og bølger for 673/673 kystdele, verificeret havstrøm for 639,
otte særskilt markerede tilstandsfastholdelser og 26 uden brugbart
strøminput. Ved T+36 er lokal vind kun 384/673, bølger 673/673 og
verificeret havstrøm 638/673. Ved T+117 er lokal vind 360/673, bølger
673/673 og verificeret havstrøm 616/673. Score falder tilsvarende til
358 henholdsvis 304 tilgængelige dele. Vandstand og dens ændring er
DMI-only og skal opgøres særskilt; disse tal er ikke en samlet vejrstatus.

De samme 289 kystdele i B07–B12 mangler vind fra T+12; T+117 er 313
uden. I mindst én berørt zone findes zonevind, mens lokal kystdelsvind
mangler. Det er ikke bevis for, at zonevinden kan bruges sikkert på delen.
Rå DMI-sporet angiver 669 dele med vind på *mindst én* prognosetime,
ikke 669 ved T+117. Første 4.0.467-run kunne ikke gendanne den ældre
private runtime og dens reserve-rotationsmarkør; om den gemte markør
fører til geografisk komplet opfyldning skal bevises i næste normale run.

Den separate havstrøm-rest er 5.201 kystdel×time-par i 57 dele efter
Open-Meteo. Den rapporterede hverken global leverandørfejl eller udløbet
runtimebudget, men mange null-værdier og 24 gitterafvisninger. Det kan
ikke repareres ved at kalde alle vejrtyper “strøm”, ved at godkende tomme
data eller ved blot at gentage validering. Undersøg sted/time/kilde og
korrekt rotation, og bevar DMI-først og eksisterende sikker afstand.
