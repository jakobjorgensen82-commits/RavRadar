# Changelog 4.0.417

4.0.416 bestod exact-head `35351272955`, blev merged gennem PR #360 som main
`496ba27832ce7994fd3351d2aa4ebceca85807ac` og startede providerfri code-only
`35351928923`.

Kørselen reparerede alle 673 gemte last-mile-continuations og beviste
`measurementsChanged=false`. State-replay var derefter grøn. Runtimeauditten
fandt dog 156 `MODE_RECONSTRUCTION_MISMATCH`: den reparerede state var rigtig,
men de gemte aktuelle mode-resultater, de offentlige kystdelsscorer og den
aktuelle zonevinder var ikke blevet genberegnet ovenpå den. Ingen privat
runtime eller offentlig Pages-pakke blev skrevet.

4.0.417 genberegner hele den afledte aktuelle scorekæde i samme atomiske
ombinding. Tilgængelighed, historikkvalitet og reason codes skal være uændrede;
ellers stopper reparationen. Den providerfri publicering tillader kun de
forventede scoreændringer og beviser særskilt, at datasæt/tid, alle offentlige
vejrrækker, kystdelenes aktuelle vejr, geometri, flowpunkter og scoretidsakser
er uændrede. Ingen provider kaldes, og modelbundle `039abdfe...` er uændret.
