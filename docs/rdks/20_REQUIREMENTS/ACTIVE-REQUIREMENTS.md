# Aktive krav – samlet register

Denne fil er den operationelle kravoversigt. Detaljer og historik findes i beslutninger, chatkilder og kode.

## Data og prognoser
- **REQ-DATA-001 – AKTIV:** DMI prioriteres; fallback må ikke skabe timevis pendlen.
- **REQ-DATA-002 – AKTIV:** Komponentserier filtreres separat før interpolation og merges på faste UTC-timer.
- **REQ-DATA-003 – IMPLEMENTERET:** Ingen dublerede eller ikke-monotone forecasttider.
- **REQ-DATA-004 – AKTIV:** 118–119 timers realistisk horisont accepteres.
- **REQ-DATA-005 – AKTIV:** Vandstandsspring vurderes efter kilde og tidevandsmønster; reelle Vadehavssvingninger må ikke blindt udglattes.
- **REQ-DATA-006 – AKTIV:** Diagnostik viser kilde, friskhed, horisont og fallback pr. komponent og zone.

## DMI-stationer
- **REQ-STATION-001 – DELVIST:** Alle kendte stationer bevares med DMI-status og datalivscyklus.
- **REQ-STATION-002 – DELVIST:** Vis automatisk primær/sekundær, afstand, vægt og valgmetode pr. zone.
- **REQ-STATION-003 – IMPLEMENTERET:** Adminoverride erstatter automatik, når override kan levere efter de valgte krav.
- **REQ-STATION-004 – AKTIV:** Nye stationer, udfald og genoptaget levering udløser meningsfulde notifikationer ved tilstandsændring – ikke spam ved ét manglende tidspunkt.
- **REQ-STATION-005 – PLANLAGT:** Skeln observationsstatus fra prognose-/cachestatus og vis samlet anvendelighed.
- **REQ-STATION-006 – PLANLAGT:** Vis seneste observation, cache gyldig til, historisk stabilitet og om stationen kan bruges nu.
- **REQ-STATION-007 – AKTIV:** Foreslå bedre station til en zone, men ændr ikke administratorens valg automatisk.
- **REQ-STATION-008 – AKTIV:** Historiske/inaktive stationer markeres tydeligt og kræver ekstra bekræftelse ved override.
- **REQ-STATION-009 – AKTIV:** Stationskortet skal kunne verificeres mod DMI's officielle register.

## Retning, zoner og kort
- **REQ-GEO-001 – IMPLEMENTERET:** Strøm er bevægelsesretning; vind er fra-retning.
- **REQ-GEO-002 – AKTIV:** Alle zoners pålandsretning skal kunne auditeres og dokumenteres.
- **REQ-GEO-003 – IMPLEMENTERET:** Als Odde/Helberskov er placeret nord for Mariager Fjord.
- **REQ-GEO-004 – AKTIV:** Hav-/landpunktsfunktionen ændres kun ved en udtrykkelig bestilling; spørgsmål om betydning er ikke implementeringskrav.
- **REQ-GEO-005 – AKTIV:** Kystlinjeeditoren skal kunne lave lokale krumninger og deaktivere/genaktivere kystdele uden datatab.

## RavScore og forklaring
- **REQ-SCORE-001 – AKTIV:** Debug forklarer rådata, kilder, retninger, delscorer, caps, regler og AI.
- **REQ-SCORE-002 – AKTIV:** Statiske kystforhold må kun forstærke dokumenteret dynamisk transport.
- **REQ-SCORE-003 – AKTIV:** Høje eller nabomæssigt usandsynlige scorer flagges til audit.
- **REQ-SCORE-004 – AKTIV:** Scorepræsentation skal være konsistent på kort, bedste områder og femdøgnsvisning.

## Admin, regler og eksperter
- **REQ-ADMIN-001 – AKTIV:** Ikke-teknisk administrator skal kunne forstå hvert felt og dets effekt.
- **REQ-ADMIN-002 – AKTIV:** Regelbygger i trin med livepreview, forklaringsknap, geografiske grupper og konflikttjek.
- **REQ-ADMIN-003 – AKTIV:** Dialoglukning virker via kryds, Annuller, Escape og klik udenfor med advarsel ved ikke-gemte ændringer.
- **REQ-ADMIN-004 – AKTIV:** Prioritet vises som Lav/Normal/Høj/Kritisk med forståelig effekt; internt tal kan bevares.
- **REQ-ADMIN-005 – AKTIV:** Centrale ændringer har versionshistorik og rollback.

## Projektstyring
- **REQ-RDKS-001 – IMPLEMENTERET:** RDKS læses før arbejde og opdateres ved hver ny version.
- **REQ-RDKS-002 – IMPLEMENTERET:** Historiske chats er normaliseret, kronologiseret og sporbare.
- **REQ-RDKS-003 – AKTIV:** Samtalens nye beslutninger og status indarbejdes automatisk ved versionsaflevering.
- **REQ-RDKS-004 – AKTIV:** Håndbogen opdateres ved relevante arkitektur-, data-, score- og adminændringer.
