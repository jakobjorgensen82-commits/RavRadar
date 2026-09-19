# DEC-0214 – Delvis DMI-fremgang er kandidat, ikke aktiv generation

**Status:** Besluttet og implementeret lokalt i 4.0.435; produktionsbevis åbent
**Dato:** 2026-09-19

## Problem

Normalrun `35456148104` gendannede en delvis DMI-fil fra den beskyttede
runtime. Før DMI-producenten blev startet, krævede workflowet, at filen
allerede havde et gyldigt `currentOperationalLedger` og dermed var strict
READY. Det skabte en cirkel: den delvise fil skulle være færdig, før den fik
lov at blive færdig. Ingen provider blev startet.

## Beslutning

RavRadar holder tre tilstande adskilt:

1. En **strict aktiv generation** har bestået operationel READY-kontrol og
   registerkontrol. Den kan bruges som aktiv donor og fallback. En fejl i en
   fil, der er udpeget som aktiv, er fortsat hard fail.
2. En **resumérbar kandidat** er en delvis arbejdskopi. Den bevares og gives
   til DMI-producenten, men må ikke deklareres aktiv eller komplet.
3. En **deployed legacy-base** forsøges valideret som strict aktiv. Består
   den, bootstrappes aktiv generation. Består den ikke, seedes den som
   kandidat i stedet for at stoppe producenten.

Materialisering er fortsat bounded. Efter producenten må kun den eksisterende
READY- og registervaliderede promotionsvej skrive den aktive generation.
En kandidatfejl må ikke overskrive en tidligere gyldig aktiv donor.

## Konsekvens

Rettelsen lemper ikke komplethed, opfinder ikke værdier og gør ikke en delvis
fil til aktiv reserve. Den gør normaldriften i stand til at fortsætte privat
gemt DMI-fremgang på en ren runner. Copernicus og Open-Meteo kan derefter
udfylde de resterende tilladte huller efter DMI-fasen under DEC-0210.

Produktionsbevis kræver mindst, at en almindelig vejrkørsel når DMI-producenten,
bevarer eller forbedrer komponentdækningen, gennemfører fallbackkæden og kun
promoverer en generation, der faktisk består strict READY og registerkontrol.
