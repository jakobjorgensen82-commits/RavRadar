# DEC-0090 – Trinvis og nedbrudssikker aktivering af land-/vandpunkter

## Status

Besluttet og implementeret i 4.0.292; exact-head- og produktionsverifikation afventer.

## Problem

Et centralt godkendt punktreview blev tidligere læst direkte ind i den offentlige kystdelsfil ved næste build. Hvis det nye vandpunkt ikke havde en gyldig fælles DMI U/V-vandkolonne inden for 5 km, eller hvis Candidate G's kontekstnøgle ændrede sig, kunne den berørte kystdel miste data og nulstille sin 48-timers hukommelse. Fordi en moderzone kræver alle sine kystdele, kunne én fejl også gøre hele zonen utilgængelig.

Den historiske `dmi-grid-proof.json` er bundet til de oprindelige punkter og er ikke bevis for et senere administratorpunkt. For Sibirien viste den senest gemte kontrol desuden 5,045 km til strømgrid, mens den aktive produktionsgrænse er 5,0 km. En kommende konkret flytning skal derfor bevise den nye koordinat fra bunden.

## Beslutning

1. En redigering gemmes som `stagedChange` med en unik revision. Det eksisterende aktive punkt forbliver offentlig sandhed.
2. Kandidaten samples i de samme hentede DMI-GRIB-filer, men kun i `.cache/coastal-point-staging`. Kandidatkoordinater, rå U/V-værdier og privat serie må ikke indgå i Pages- eller supportartifact.
3. Kandidaten skal have eksakt fælles U/V-vandkolonne højst 5 km væk, mindst 96 timers strøm-, bølge-, vind- og vandstandshorisont samt 48 timers sammenhængende Candidate G-hukommelse. Offentlig adminstatus indeholder kun part-id, revision, dækningsmål og årsagskoder.
4. `READY` aktiverer intet automatisk. Ejeren skal særskilt vælge aktivering.
5. En aktiveringskørsel indsætter kandidatens private DMI-serie og hashbundne kompakte Candidate G-state lokalt, bygger den eksakte nye runtime og kører fuld validering og releasegate.
6. Først efter grønne gates opdateres `direction-reviews` centralt med compare-and-swap på den version, der blev læst ved buildstart. Versionskonflikt stopper deployet.
7. Den tidligere aktive override gemmes som `rollbackPartOverrides`. Kandidatcachen kan genindsættes efter et efterfølgende deployproblem, så en allerede centralaktiveret placering ikke starter forfra.
8. Som ekstra forsvar må den komplette senest verificerede offentlige fallback bruges ved højst seks lokale Candidate G-warmups (ca. 1 %). Delvise blandingsdatasæt er fortsat forbudt.

## Sikkerhedsgrænser

- Ingen eksisterende geometri eller konkrete land-/vandpunkter ændres af 4.0.292.
- Et ukomplet, for gammelt eller forkert revisionsbundet kandidatgrundlag fejler lukket.
- Offentlig RavScore, sortering og moderzone skifter kun samlet efter grøn eksakt-runtimekontrol.
- Central skrivning sker ikke før de fulde gates og må ikke overskrive en nyere adminredigering.

## Verifikation

Målrettede tests dækker privat cacheisolering, uændrede offentlige punkter før aktivering, 48-timers READY, koordinat-/U/V-fravær i offentlig status, state-/DMI-injektion, genoptagelse efter deployfejl, central versionskonflikt samt hel fallback ved 672/673 READY og afvisning over seks lokale warmups.
