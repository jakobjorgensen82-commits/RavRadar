# DEC-0028 – Balanceret DMI-recovery efter etableret marinegrundlag

**Status:** Aktiv
**Dato:** 2026-08-08

## Beslutning
Marine data er fortsat release-kritiske og har første schedulerplads under recovery. Hvis mindst 95 % af de aktive forecastzoner allerede har et gyldigt marinegrundlag, må de resterende geografiske huller dog ikke optage begge produktive collection-pladser på ubestemt tid. Den mest relevante DKSS-model får første plads; anden plads går til den mest underdækkede vind- eller bølgefamilie.

Under bred marinefejl eller opstart, hvor mindre end 95 % har marinegrundlag, gælder den hidtidige marine-first-prioritet for begge pladser. Grænsen ændrer ikke audits, accepteret gridafstand, DMI-only-kravet eller håndteringen af manglende værdier.

## Evidens og begrundelse
Supportpakken fra den strengt grønne produktion #1774 viste 208 aktive zoner: 203 havde mindst 96 timers marinegrundlag, mens fem manglede enhver strømserie. Alligevel satte den binære `marineFoundationMissing`-tilstand `dkss_lf` og `dkss_nsbs` på begge produktive pladser. HARMONIE blev derfor ikke kørt, og offentlig runtime manglede vind i 187 zoner; bølger manglede i 33. Public projection bevarede manglerne korrekt, så rodårsagen lå i schedulerens budgetfordeling, ikke i UI eller null-konvertering.

## Verifikation
Regressionstesten skal bevise både bred marine-first recovery og den balancerede 203/208-profil. Endelig lukning kræver en frisk produktionskørsel, hvor fulde gates består, HARMONIE faktisk forsøges, og den offentlige vind-/bølgedækning måles igen.

#1778 og #1779 bekræftede efterfølgende schedulerpolitikken, HARMONIE-success, fulde gates og deploy. Offentlig vind steg til 199/208 zoner med mindst noget data. 96-timers dækning var fortsat kun 14/208 og forbliver et aktivt progressivt målepunkt.
