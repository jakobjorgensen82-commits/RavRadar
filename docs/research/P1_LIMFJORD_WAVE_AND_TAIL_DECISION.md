# P1 – bølger og prognosehale i Limfjorden

**Status:** Analyse afsluttet, produktionsændring ikke godkendt
**Grundlag:** 4.0.213-artifact fra kørsel #31873118298, datasæt `rr-20260815080914-210`

## Eftermaaling paa 4.0.237 / koersel 3237

Det nye uafhaengige WAM 18Z-bevis aendrer ikke beslutningen. Supportartifactet fra `#3237`/`rr-20260819213342-210` viser 118 prognosetimer i `DK-B05-11`, men nul komplette boelgetimer og ingen boelgecollection i bulkcachen. Zonen har samtidig 53 marine rækker fra `dkss_lf`, saa manglen er specifik for boelger og ikke et generelt Limfjords- eller pipelineudfald. Nabozonerne `DK-B05-10` og `DK-B05-12` har begge `wam_dw` og 54 native boelgerækker; i den viste kaede har de 97 komplette boelgetimer.

Det er dermed endnu en naturlig modelcyklus, som bekraefter den kendte geografiske kildegraense. `missing` bevares. Et fjernere punkt, en ny kilde eller en punktflytning er fortsat en ny faglig beslutning og er ikke godkendt.

## Kort konklusion

Der er data nok til at forklare de to resterende Limfjordproblemer. De er ikke samme fejl:

1. **Mors nord/Feggesund (`DK-B05-11`) mangler bølger i hele femdøgnsvisningen.** DMI's Limfjordsmodel leverer vandstand, strøm og temperatur, men ikke bølger. DMI's bølgemodel for danske farvande giver ikke et gyldigt bølgepunkt inden for den tilladte afstand ved Feggesund. Den eksisterende reservekilde leverer heller ingen bølger dér. `missing` er derfor korrekt.
2. **Otte Limfjordszoner mangler cirka de sidste 15 timer for vandstand og vandtemperatur.** Den valgte DMI-havserie slutter tidligere end den samlede 118-timers visning. Hvor reservekilden ikke har en fagligt brugbar værdi, forbliver halen manglende.

## Faktisk dækning

- 210 aktive zoner indgår i datasættet.
- Bølgehøjde, bølgeretning og bølgeperiode findes i 209 zoner; kun `DK-B05-11` mangler alle tre komponenter i alle 118 viste timer.
- De øvrige undersøgte Limfjordszoner får 118 bølgetimer fra `wam_dw` og har gyldige bølgepunkter tæt på deres havpunkter.
- DMI-havmodellen giver cirka 102 native/interpolerede timer for vandstand og temperatur i de berørte Limfjordszoner. Den sidste del af den fælles 118-timersvisning kan derfor være `missing`.
- Ingen manglende værdi må erstattes af nul, stale gentagelse eller skjult interpolation.

## Løsningsmuligheder

### A. Bevar `missing` ved Feggesund – anbefalet nu

Fordel: Fagligt ærligt og i overensstemmelse med DMI-first samt fail-closed-princippet.
Ulempe: Brugeren ser ingen bølgeprognose for denne zone.
Konsekvens: UI og senere score skal kunne håndtere manglende bølger tydeligt; manglen må ikke blive til en neutral nulværdi.

### B. Brug et fjernere DMI-bølgepunkt

Fordel: Kan teknisk give en serie.
Ulempe: Punktet kan ligge på den anden side af smalle løb, land eller en anden bølgeeksponering og dermed være fysisk misvisende.
Konklusion: Ikke godkendt. Kræver særskilt geografisk og faglig validering samt konsekvensberegning før en eventuel ændring af afstandsgrænsen.

### C. Indfør en ny bølgekilde eller lokal model

Fordel: Kan potentielt dække indre Limfjord bedre.
Ulempe: Ny provenance, nye overgange, nye drifts- og egressomkostninger og risiko for brud i RavScore.
Konklusion: Ikke godkendt under den aktuelle analyse. Kandidater må først undersøges som et separat kildeprojekt.

### D. Forlæng vandstands-/temperaturhalen med eksisterende reservekilde

Fordel: Kan give flere viste timer, hvor reservekilden faktisk har data.
Ulempe: Overgangen kan have niveauspring eller anden fysisk betydning. Vandstand kan kun sammenføjes med dokumenteret bias/overgang; temperatur skal fortsat være havoverfladetemperatur.
Konklusion: Bevar den nuværende komponentvise og tydeligt mærkede fallback. Udvid ikke automatisk, før overgangsfejl er målt zone for zone.

## Beslutning og næste bevis

- Ingen kode-, kilde-, fallback- eller scoreændring foretages nu.
- `DK-B05-11` forbliver eksplicit uden bølger.
- Efter kommende produktionskørsler måles: DMI-sluttid, fallback-start, niveauspring ved vandstand, temperaturforskel ved kildeskift og antal manglende timer.
- Før scorearbejde skal det besluttes, hvordan en manglende bølgekomponent påvirker sikkerhed og forklaring. Den må ikke automatisk tælle som rolige bølger.
- P1 kan herefter gå videre til den samlede komponentmatrix og regressionsplan, mens 72-timershistorikken fortsat bygges naturligt.
