# RavRadar 4.0.53

## RDKS og historik
- Importerer syv historiske RavRadar-chats fra brugerens samlede arkiv.
- Rekonstruerer rækkefølgen ud fra tekst, versionsforløb og sammenhæng i stedet for filnavne eller filmetadata.
- Bevarer normaliseret kildetekst med SHA-256 og et maskinlæsbart importmanifest.
- Opretter aktivt beslutningsregister, kravoversigt, kendte issues, implementeringsstatus og gældende projektviden.
- Skelner udtrykkeligt mellem aktive, implementerede, planlagte, erstattede, forkastede, forældede og uklare udsagn.
- Historiske chats kan ikke alene udløse produktionsændringer.

## Automatisk fremtidig arbejdsgang
- `AGENTS.md` og RDKS kræver nu automatisk import af samtaledeltaet ved hver ny version.
- Changelog, RDKS, implementeringsstatus, issues og relevante håndbogsafsnit skal opdateres før release.
- RDKS-valideringen kontrollerer chatmanifest, syv kilder, versionssynkron håndbog og den bindende sikkerhedsregel.

## Håndbog
- Udbygger Markdown-håndbogen fra et kort grundlag til en samlet faglig og teknisk reference.
- Udbygger den synlige webhåndbog til 16 kapitler.
- Dokumenterer projektets udvikling, DMI-pipeline, observation/prognose/cache, stationer, retninger, zoner, RavScore, vandstand, admin, AI, central lagring, drift, RDKS og aktuelle prioriteter.
- Markerer faglige antagelser og åbne valideringsbehov uden at fremstille dem som dokumenterede fakta.

## Stationer
- Registrerer det fortsat aktive krav om at adskille observationsstatus fra prognose-/cachestatus.
- En station skal fortsat kunne være prognosebrugbar, mens gyldige cachedata findes, selv om en ny observation mangler.
- Selve den fulde cache-statusfunktion er registreret som planlagt og er ikke fejlagtigt markeret som færdig.

## Produktionskode
- Ingen prognose-, score-, geometri- eller stationsalgoritmer er ændret alene på baggrund af de historiske chats.
