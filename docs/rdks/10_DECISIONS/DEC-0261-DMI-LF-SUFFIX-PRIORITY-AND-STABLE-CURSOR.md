# DEC-0261 – Samme DMI-prioritet ved Limfjord-omplanlægning

**Dato:** 2026-09-28
**Status:** Implementeret på main i 4.0.509; vejrproduktionsbevis afventer

Den normale firetimershentning skal fortsætte med at udfylde reelle
mangler før den opgraderer allerede gyldige reserveværdier. For
`dkss_lf` gælder dette både den første plan og en genberegnet restkø,
når regionale input ændrer sig. En omplanlægning må ikke flytte den
lagrede rotationsmarkør under samme samlingstur: markøren fra turens
start bestemmer rækkefølgen, mens hvert faktisk forsøg stadig gemmer
en ny markør til **næste** tur. De tre første kritiske timer forbliver
først. Kildeaccept, U/V-dybdevalg, DMI-only-vandstand, central
interpolation, gyldighed og no-loss ændres ikke.

To normale runs viste, at forsøgte Limfjord-timer gik kronologisk:
`36421101118` behandlede 31 timer fra 28/9 kl. 12 UTC til 29/9 kl.
18 UTC; `36450204193` behandlede 36 timer fra 28/9 kl. 16 UTC til
30/9 kl. 03 UTC. Den seneste offentlige pakke havde vandstand i
Limfjordsdelene kun til prognosetime 70, mens andre dele nåede time
93. Dette er observation, ikke bevis for at leverandøren mangler
senere filer. Kodegennemgang viste to lokale fejl i restkøen:
`criticalPriority` blev ikke ført med, og den senest forsøgte time
blev genbrugt som sorteringspivot i stedet for turens startmarkør.
Begge adfærd er reproduceret mod den aktuelle produktionssortering.

4.0.509 samler de to planlægningssteder om én adapter, så
komponentprioriteten følger begge, og bruger turens uændrede
startmarkør ved restkøsortering. Måltesten kræver, at et faktisk
vandstandshul går før en allerede dækket havstrømsopgradering, og
at restkøen efter første forsøg fortsætter ved den ubetjente sene
horisont. Den kræver også, at begge produktionskald bruger adapteren
og startmarkøren. Lokal test alene beviser ikke reel senere DMI-
dækning: normalt run, cache/no-loss, Supabase/R2/Pages og offentlig
femfeltskontrol afventer. PR #475 bestod exact-head source-CI `36476446904`
på `4f61ff84` og blev merged som `9fcd996f`; den planlagte
firetimerskørsel skal stadig give det nødvendige livebevis. Hvis
den senere vandstand stadig mangler, skal
faktisk leverandørkatalog, afvisninger og adminvalgte kilder måles
før en ny ændring; en reservekilde aktiveres ikke på formodning.

DEC-0251's oprindelige rotationsintention og DEC-0257's
firetimerskadence består; dette er en rettelse af deres konkrete
implementering, ikke en ny score- eller vejrmodel.
