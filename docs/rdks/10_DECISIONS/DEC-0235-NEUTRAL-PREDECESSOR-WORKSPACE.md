# DEC-0235 – predecessor-workspace må ikke binde historisk source

**Dato:** 2026-09-22  
**Status:** Gældende fra 4.0.458

## Problem

Code-only-run `35732235540` læste den levende protected-runtime descriptor
korrekt, men workflowets miljøvariabel pegede stadig på en gammel SHA i selve
arbejdsstien. Det skabte en skjult historisk binding, som gjorde den korrekte
runtime svær at genbruge.

## Beslutning

Workflowet bruger en neutral `source-predecessor`-sti. Den faktiske forgænger
kommer altid fra den levende descriptor, valideres som en eksakt ancestor til
den aktuelle main-head og arkiveres ind i stien under kørslen. Ingen SHA må
ligge i den permanente workflow-konfiguration.

Det er ikke en beslutning om at fjerne bindinger. Kilde-, model-, bundle-,
database- og dataintegritetsbindinger er fortsat nødvendige; de skal blot have
én levende identitetskilde i stedet for skjulte historiske sti-navne.

## Afgrænsning

Rettelsen ændrer ikke private målinger, modelmatematik, leverandørprioritet,
cacheindhold eller public UI. En ukendt eller uoverensstemmende runtime skal
stadig stoppe fail-closed.
