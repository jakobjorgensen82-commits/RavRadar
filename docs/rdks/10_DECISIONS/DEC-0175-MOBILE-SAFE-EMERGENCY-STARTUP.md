# DEC-0175 – Stor nøddriftspakke må ikke blokere mobil opstart

**Status:** Aktiv og bindende for mobilgrænsen; den blanke visning i punkt 3-4 er erstattet af DEC-0188 i 4.0.406
**Dato:** 2026-09-16

## Baggrund

Den offentlige 4.0.391-runtime er i nøddrift. Startpakken er cirka 0,9 MB,
mens detaljepakken er cirka 118 MB. Browserkoden hentede detaljepakken under
selve opstarten for at projektere den aktuelle time. Desktop-Chrome stod
fast på `Kontrollerer aktuelle data…`, og Safari på iPhone kunne slet ikke
gøre siden brugbar.

## Beslutning

En verificeret offentlig startpakke skal altid kunne åbne RavRadar uden at
hente en meget stor monolitisk detaljepakke. Når nøddrift kræver
timeprojektion, og detaljepakken overstiger 8 MiB, udskydes detaljepakken.

I denne tilstand:

1. kort, navigation og øvrig side må åbne;
2. gamle score- og vejrværdier må ikke vises som aktuelle;
3. rangliste, prognose og berørte zoner vises ærligt som utilgængelige;
4. status forklarer, at næste friske vejr-opdatering skal levere data;
5. manifest-, filhash-, bodyhash-, model- og datasætbindinger består.

## Supersession 2026-09-17

4.0.405-livebeviset viste, at punkt 3-4 gjorde hele RavRadar tom, selv om den
verificerede startpakke bar 141 gyldige zonescorer. DEC-0188 bevarer forbuddet
mod den store detaljedownload og mod at kalde ældre værdier aktuelle, men
erstatter den blanke visning med den aktive models egen tydeligt tidsmærkede
startpakke og kun fremtidige kompakte prognoser.

Den browserlokale markør indgår ikke i den kanoniske signerede payload.
Små verificerede nødpakker kan fortsat projekteres efter den eksisterende
fulde fire-fils kontrakt.

## Bevis

4.0.392 er lokalt prøvet i en rigtig browser mod de faktiske offentlige
produktionsdata. Siden afsluttede opstarten på cirka fem sekunder, hentede
ikke 118 MB-detaljepakken og rapporterede ingen browserfejl eller advarsler.
Exact-head, merge og kontrol på den levende iPhone/Safari-side mangler.
