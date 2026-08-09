# DEC-0034 – Landsdækkende aktivering på nuværende pre-domain testside

**Status:** Aktiv ejerbeslutning, 2026-08-09.

## Beslutning
Den nuværende GitHub Pages-side betragtes som RavRadars samlede testmiljø, fordi produktet endnu ikke har aktive brugere og endnu ikke er flyttet til det senere købte domæne. Kystgeometri-v2 skal derfor ikke begrænses til en Blåvand-specialaktivering: hele Danmark skal bygges, kendte fejl skal rettes, og den samlede løsning må aktiveres på den nuværende testside, når den nationale kandidat passerer sine tekniske integritets- og releasegates.

Blåvand er referenceimplementeringen for metode, datasikkerhed, lokale serier, historik, UI, admin-readback og rollback. Den er ikke den eneste zone, der skal aktiveres.

## Konsekvenser
- De dokumenterede fejl ved Rømø, Askø/Lilleø, Limfjorden, Lolland/Falster og øvrige zoner er arbejdslisten, ikke en begrundelse for permanent at fastholde gammel geometri.
- National bygning skal starte fra centralt hydreret admin-sandhed og gratis officielle kilder.
- Lokale kystdele navngives efter forståelige stedlige orienteringspunkter.
- Den foreløbige dækningsmargin er 7 point indtil den store RavScore-analyse.
- Aktivering på testsiden må ikke forveksles med en senere stabil domæne-/brugerrelease. Før domæneflytning kræves en ny eksplicit modenheds- og produktionsgate.
- Manglende data må fortsat ikke opdigtets, secrets må ikke eksponeres, og rollback skal bevares. Testmiljøstatus ophæver ikke dataintegritet eller releasegates.

## Næste implementeringsafsnit
Byg en national central-hydreret generator og revisionspipeline, ret semantiske zoner og topologi, før lokale dele gennem DMI/proveniens/state/UI/admin, og udgiv den samlede kandidat til den nuværende testside efter grøn national gate.
