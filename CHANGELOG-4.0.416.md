# Changelog 4.0.416

4.0.415 bestod exact-head `35348220691`, blev merged gennem PR #359 som main
`3a705259`, og beviste i `35349088863`, at den historiske integrerede handling
nu accepteres. Saved-weather stoppede derefter korrekt, fordi det beskyttede
target ikke var nyere end den offentlige 09:00-time.

Samme-time code-only `35349313096` gendannede den eksakte 4.0.410-private
runtime. Omdanneren stoppede, fordi den kendte 673-dels last-mile-fejl først
skulle bestå den gamle 4.0.410-validator, før den nyere sikre reparation blev
nået. Den samlede meget lange fejllinje blev ikke vist af GitHub.

4.0.416 lader kun den aktuelle kanoniske validator reparere denne kendte
last-mile-kant. Den tilladte diff er begrænset til minimums- og maksimumssporet
i det åbne last-mile-interval samt det allerede godkendte modelhashskifte.
Alle andre ændringer stopper. Ens fejl tælles nu i korte grupper. RavScore-
formel, modelbundle, vejr, målinger, Candidate G, geometri og providerorden er
uændrede.
