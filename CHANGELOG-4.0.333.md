# RavRadar 4.0.333 – exact-unresolved Open-Meteo

Dato: 2026-09-07
Status: Lokal releasekandidat; exact-head CI, merge og produktionsruntime afventer.

## Runtimegrundlag

4.0.332 bestod exact-head sourcegate `34125927405` på `f23f306b7181b0502f1560e3eea37bfa32542bcc` og blev merged via PR #265 som `1e1093dead7fbbf5adcd401592d11c6b1c21d746`.

Main-oneoff `34127986853` ved target `2026-09-07T13:00:00Z` genbrugte de private cacher. DMI dækkede 65.409/79.414 og afleverede 14.005 operationelle huller. Copernicus dækkede 12.661 og efterlod 1.344. Efter regional DMI modtog Open-Meteo 472 par, retained 76, fetched 114, filled 190 og missing 282. Slutgaten stoppede, og closure, artifact, deploy og cutover blev skipped. Den tidlige optælling 70.280/79.414 var donorrestore på gammel reference og må ikke bruges som slutstatus.

## Rettelse

- Succesfulde Open-Meteo-par checkpointes straks; kun eksakte uløste par genbestilles.
- FIFO/BFS-køen splitter tvetydigt work binært med fan-out højst to, parts før timer, helt ned til singleton.
- Hvert exact work har højst tre transportforsøg og ét same-work content-retry.
- Hele fetchforløbet har requestcap 1.024, pending-cap 2.048 og én fælles monotonic deadline. Hvert stop bevarer current og kø som ærlig residual.
- Retrybar HTTP bruger provider-wide cooldown. Retry-After sekunder eller HTTP-date begrænses til 15 sekunder. HTTP 400/ukendt permanent status stopper hele providerfamilien; kun 413/414 må isoleres.
- Nye privacy-safe aggregater skelner unresolved work/par, split, transport/HTTP, container/cardinality, payloadkontrakt/enhed/tidszone/afstand/timeakse, pairfejl og budgetstop uden private identiteter eller rå værdier.

## Uændrede sikkerhedskrav

Open-Meteo bruger fortsat `meteofrance_currents` alene i target..+117, med samme punkt/time, UTC/GMT, m/s og grader, højst 15 km, combined-current-only og `calibrationEligible=false`. Der er ingen interpolation, carry, nabolån, historiksyntese eller bølge-/tidevandsreprojektion. Et nyt artifact/modelskift kræver fortsat præcis 673 × 118 = 79.414 par, én kilde pr. par, nul overlap/missing og alle fulde gates.

## Lokal evidens og næste trin

Py_compile, den udvidede Open-Meteo-test med 8 og 50 dele, poisoned hour, per-work retry, caps, 429 og global 400 samt hele den målrettede DMI/Copernicus/regional/closure- og live-runtime-kæde er grøn. To uafhængige reviews er GO. Dette er ikke CI- eller runtimebevis.

Næste rækkefølge er én exact-head GitHub sourcegate, merge, frisk main-oneoff og kun ved 79.414/79.414 et run-bundet handoff til central runtime, Feggesund/spatial, kapacitet, fuld validate/releasegate, artifact/deploy og den autoriserede Phase B-cutover. Candidate G forbliver offentlig, og normal workflow er deaktiveret indtil da.
