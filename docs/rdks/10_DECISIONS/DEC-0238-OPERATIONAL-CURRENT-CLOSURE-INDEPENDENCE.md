# DEC-0238 – verificeret strøm må ikke forsvinde ved fejl i valgfri historik

**Dato:** 2026-09-23
**Status:** Implementeret lokalt i 4.0.467; livebevis afventer

Den offentlige 4.0.466-prognose viste ved starttimen verificeret strøm for
622/673 kystdele, og alle 622 kom fra DMI. Ved prognosetime 36 var ingen
kystdel verificeret for strøm, selv om den private strøm-closure i samme
kørsel rapporterede mange gyldige Copernicus/Open-Meteo-par frem til T+117.
Dette er ikke bevis for, at alle 79.414 par havde data: 5.651 manglede i den
closure. Men den offentlige DMI-only-profil er en særskilt og større fejl.

`controlledDocumentProofs` havde siden 2026-09-20 krævet både gyldig
operational closure og to valgfri historikbeviser, før nogen supplerende
prognoserække måtte bruges. Det modsagde den eksisterende kontrakt og
regressionstest: ugyldig advisory/private-reference-historik må kun afvise
sin egen række, ikke den selvstændigt forseglede target..T+117-closure.
En måltest fejlede på main med netop denne kontrakt og består efter rettelsen.

4.0.467 lader den verificerede closure godkende sine egne eksakte rækker,
mens advisory og privat regional reference fortsat hver kræver eget bevis.
Fuld dokumentgodkendelse afviser fortsat en ødelagt regional reference eller
en påstået, men ugyldig advisory-historik. Sikkerhed og kildeprioritet er
ikke lempet. En dataminimeret status i vejrbygningens log viser, om closure,
advisory og regional reference blev godkendt hver for sig. Første normale
produktionskørsel skal bevise, at fallback faktisk ses i score ved de timer,
hvor DMI ikke leverer.

Den efterfølgende rumlige runtimekontrol indekserer nu også alene den
selvstændigt forseglede operationelle closure. Før rettelsen brugte denne
kontrol fortsat den strengere fuld-dokument-gate og kunne derfor stoppe en
korrekt supplerende score på grund af en ødelagt *valgfri* historikpost.
Måltesten kræver både, at ugyldig advisory/regional reference ikke fjerner
gyldige operationelle rækker, og at en manglende operationel closure fortsat
afvises. Hver vist supplerende strømvektor bevises stadig mod sin eksakte
private closure-række, sted, tid, kilde og afstand.

Ændringen rammer den transitive model- og continuation-binding. Den allerede
anvendte SQL-migration `20260922170000` forbliver uændret; append-only
successor `20260923052100_integrated_current_projection_binding.sql`
genindsætter kun de aktuelle model-, rollback- og continuation-hashes i de
eksisterende kontraktfunktioner. Forgængerhashen forbliver i den snævre
overgangsliste, så eksisterende gyldig scoretilstand kan videreføres.

Historisk scoretilstand blev videreført for alle 673 kystdele i sidste
offentlige runtimeaudit, men nul aktuelle zonetilstande havde fuldt
48-timershistorik. Offentlige kystdele havde ved T0 590×33 timer,
32×12 timer og 51 utilgængelige. Rettelsen beviser ikke i sig selv, at
tidligere manglende timer kan genskabes; historikdækningen skal måles i
næste gennemførte run og må ikke kaldes fuld alene fordi tilstanden blev
gemt og genbrugt.
