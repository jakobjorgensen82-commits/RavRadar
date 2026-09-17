# DEC-0188 – Brugbar, tidsmærket nødvisning uden den store detaljefil

**Status:** Aktiv og bindende; implementeret lokalt i 4.0.406, livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.405 blev korrekt deployet fra main `e128b15d` i run `35222128772`.
Manifest, hashes, modelbinding, 210 zoner og 673 kystdele var grønne. En rigtig
browser viste alligevel ingen scorer eller prognoser.

Den offentlige startpakke på 1.446.969 byte havde 141 brugbare zonescorer og
69 lokalt utilgængelige zoner. Når browserens time lå efter pakkens
produktionstime, forsøgte runtimekontrakten at vælge den præcise nye time fra
detaljepakken på 174.972.297 byte. Mobilværnet fra DEC-0175 udskød korrekt
denne fil, men appen skjulte derefter også den allerede verificerede
startpakke. Teksten om, at data ikke kunne hentes, var derfor forkert.

Den sidste offentlige Candidate G-runtime i 4.0.316 havde en bedre afgrænset
visningsregel: dens lille, verificerede startpakke kunne vises som en tydeligt
tidsmærket nødvisning uden at hente den store detaljepakke. 4.0.406 genbruger
denne driftserfaring, men genindfører ikke Candidate G, en anden model eller
en separat fallbackpakke.

## Beslutning

1. En stor detaljepakke over 8 MiB forbliver uden for mobilens kritiske
   opstart.
2. Når den præcise aktuelle time derfor ikke kan projekteres, må den aktive
   integrerede models egen hash-, dataset-, model- og evidensbundne startpakke
   vises som et ældre snapshot ved dens eksakte `productionReferenceAt`.
3. Snapshot-tiden skal stå direkte ved ranglisten og i den samlede
   datastatus. Den må aldrig kaldes den aktuelle time.
4. Den kompakte nationale prognose må bruges, men alle allerede passerede
   prognoserækker filtreres væk. Der må ikke relabeles gamle tider.
5. Vind-/strømpile og turstart forbliver lukkede i snapshottilstanden, fordi
   de ellers kunne blive opfattet eller gemt som aktuelle.
6. Lokalt utilgængelige zoner forbliver lokalt utilgængelige; de 141 gyldige
   zoner må ikke skjules på grund af de 69 øvrige zoner.
7. En ny almindelig vejrpakke overtager automatisk ved næste sideindlæsning.
   Den normale vedligeholdelse skal fortsat bevise, at den aktuelle time og
   cacheprioriteten holdes ved lige.

## Grænser

- Ingen score, vejrpost, providerprioritet, geometri eller modelstate ændres.
- Snapshotvisningen er samme integrerede model og samme forseglede fire-fils
  pakke. Candidate G bliver ikke runtime, fallback eller scoreejer.
- Strukturel korruption, forkert hash/model/dataset, udløbet horisont eller
  ukendt manifest lukker fortsat globalt.
- DEC-0175's krav om mobil opstart og forbud mod at fremstille ældre data som
  aktuelle består. Dets blanke score-/prognosevisning ved en stor pakke er
  erstattet af denne smallere, eksplicit tidsmærkede samme-model-visning.

## Verifikation

Målrettede kontroller skal bevise, at detaljefilen ikke hentes under opstart,
at snapshotreferencen kommer fra den forseglede startpakke, at passerede
prognoser filtreres, at turstart er lukket, og at almindelig frisk drift er
uændret. Efter exact-head, merge og providerfri deploy kontrolleres den rigtige
side i desktopbrowser og på iPhone/Safari. Derefter køres én almindelig
vejropdatering; ingen oneoff.
