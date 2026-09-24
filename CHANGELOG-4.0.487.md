# RavRadar 4.0.487 – bølgehistorik og forståelige forklaringer

Normalrun `36009816840` hentede fra alle tre leverandører og gemte
krypteret privat fremgang, men stoppede før cachebygning og deploy på
en modstridende bølge i RavScores historik. Den lokale rettelse
genbruger samme DMI-first- og 96-timerspolitik som den offentlige
vejrkomponent ved samling af gammel og ny bølgehistorik. Kun præcist
verificerede bølger må afgøre en konflikt; ukendte konflikter stopper
fortsat. Gammel gyldig strøm bevares uafhængigt af en ny bølge.

4.0.486-arbejdets forståelige score- og prognoseforklaringer på dansk,
tysk og engelsk følger med. Scoreformel, modelbundle, geometri og
vejrproducent er uændrede. Lokale måltests er grønne. Exact-head
sourcegate, merge, rigtig normalrun og offentlig kontrol afventer;
ingen påstand om komplet vejr eller stabil autonom drift endnu.

Se DEC-0253 og DEC-0210.
