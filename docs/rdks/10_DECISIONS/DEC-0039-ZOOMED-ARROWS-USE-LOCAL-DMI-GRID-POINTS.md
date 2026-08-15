# DEC-0039 – Indzoomede pile bruger lokale DMI-gitterpunkter

- **Status:** Aktiv
- **Besluttet:** 2026-08-16
- **Ejerbeslutning:** Ja

## Baggrund

Kortet kunne allerede tegne vind- og strømpile igen ved zoom og reducere den visuelle minimumsafstand mellem dem. Det gav ikke flere informationsbærende pile, fordi den offentlige runtime kun tilbød ét repræsentativt flowpunkt pr. hovedzone.

De aktive 673 lokale kystdele har egne vejrrækker og kan derfor også have selvstændige DMI-gitterpunkter. Disse punkter kan give en sand tættere kortvisning, men kun hvis koordinaten og U/V-proveniensen bevares. En kopi af hovedzonens pil eller et vilkårligt forskudt punkt ville fremstille en rumlig opløsning, som data ikke dokumenterer.

## Beslutning

1. Ved fjernzoom bevarer kortet én repræsentativ vind- og strømpil pr. aktiv hovedzone.
2. Fra zoomniveau 9 kan kortet tilføje lokale kystdeles egne pile i det synlige udsnit.
3. En lokal strømpil kræver et eksakt fælles DMI-gitterpunkt for strøm-U og strøm-V.
4. En lokal vindpil kræver et eksakt fælles DMI-gitterpunkt for vind-U og vind-V.
5. Ufuldstændig provenance, fallbackankre og kunstige kopier eller forskydninger må ikke skabe ekstra tæthed.
6. Den progressive startpakke må bære aktuelle vinderdeles flowpunkter; den fulde detaljepakke bærer alle dokumenterede lokale punkter og skal udløse en opdatering af pilelaget.
7. Den eksisterende pixelafstand og udsnitsfiltrering må fortsat begrænse visuel overlap. Den må ikke flytte pile væk fra deres datakoordinat.

## Konsekvens

Indzoomning kan vise mere af det rumlige DMI-grundlag, der allerede findes for lokale kystdele. Antallet af synlige pile afhænger af udsnit, zoom, faktiske unikke gitterpunkter og den visuelle overlapkontrol; det er ikke et fast antal.

Beslutningen ændrer kun kortets præsentation og den offentlige transport af flowpunktproveniens. DMI-værdier, kildevalg, forecast, interpolation, fallback, RavScore, historik, zoner, kyster og land-/vandpunkter er uændrede.
