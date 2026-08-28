# Spørg RavRadar – ekstern videns- og kildeaudit 2026-08-29

## Formål

Ejeren krævede en mange gange større netværksfri vidensbase, som ikke kun genfortæller Grundbogen. Auditten samler derfor ekstern ravforskning, officiel geologi, kystfysik, sikkerhed og danske regler med RavRadars eksisterende systematiske analyser og Rav Jagt som navngiven praktisk ekspert. Resultatet er en read-only forklaringsbase; det er **ikke** en ændring af Candidate G, RavScore, forecastinput eller modelsemantik.

Den maskinlæsbare kildefortegnelse er `knowledge/rav-assistant-sources-v1.js`. Hvert nyt forskningsemne i `knowledge/rav-assistant-research-material-v1.js` og `knowledge/rav-assistant-research-coast-v1.js` har en evidensklasse og mindst ét gyldigt kilde-ID.

## Evidenshierarki

1. **Direkte ravforskning:** selve ravmaterialet måles eller analyseres. Resultaterne er stærke for den undersøgte prøve, men laboratorietal er ikke automatisk universelle naturgrænser.
2. **Fagfællebedømt kystanalogi:** bølger, revler, levende bund og lavdensitetspartikler undersøges realistisk, men materialet er ikke altid rav.
3. **Officiel myndighedsvejledning:** styrer sikkerhed, adgang, indsamling og danefæ. Regler og varsler er volatile og skal kontrolleres aktuelt.
4. **RavRadars systematiske syntese:** forbinder direkte evidens, analogi og produktets forklaringsgrænser uden at opfinde nye naturkonstanter.
5. **Navngiven praktisk erfaring:** Rav Jagt bidrager med feltforståelse om blandt andet koldt vand. Erfaringen markeres særskilt og fremstilles ikke som fagfællebedømt evidens.

## Centrale eksterne kilder og sikre anvendelser

| Område | Primær/officiel kilde | Hvad assistenten må bruge |
|---|---|---|
| Alder og lag | [Ross, kritisk review af baltisk ravs alder](https://doi.org/10.1017/S1755691025100960) | Hovedhorisonten cirka 36–35 mio. år; bredere cirka 37,7–34 mio. år uden sikker lagproveniens; et løst stykke kan ikke dateres fra udseendet. |
| Harpiks til rav | [Seyfullah m.fl., resinproduktion og bevaring](https://doi.org/10.1111/brv.12414) | Harpiks er ikke almindelig træsaft; hærdning, begravelse og langsom kemisk modning er nødvendig. |
| Botanisk oprindelse | [Wolfe m.fl., forslag til producenten af baltisk rav](https://doi.org/10.1098/rspb.2009.0806) | Nåletræsharpiks og en stærk FTIR-/fossilbaseret hypotese; præcis producent er ikke endeligt afgjort. |
| Direkte partikeltransport | [Lofty m.fl., kontrolleret saltation med ravpartikler](https://doi.org/10.1016/j.watres.2023.120329) | Rav kan transporteres i små hop. Forsøgets 5 mm-kugler, tæthed og faldhastighed er prøvebestemte og ikke en universel ravtærskel. |
| Spektroskopi og fluorescens | [Kritisk spektroskopisk analyse af baltisk rav](https://pmc.ncbi.nlm.nih.gov/articles/PMC12196071/) | Fluorescens varierer med materiale, forvitring og behandling; flere analysemetoder supplerer hinanden. Laboratoriebølgelængder omskrives ikke til praktisk lygteanbefaling. |
| Identifikation og behandling | [GIA Amber](https://www.gia.edu/amber), [rekonstrueret og imiteret rav](https://www.gia.edu/gems-gemology/winter-2022-gemnews-identification-of-natural-reconstructed-and-imitation-root-amber0), [varmebehandling](https://www.gia.edu/gems-gemology/summer-2014-wang-heat-treatment-of-baltic-amber) | Plast, glas, copal, presset rav, kompositter og behandling kan snyde. Ingen enkelt hjemmetest beviser alle tilfælde. |
| Konservering | [Konservering og billeddannelse af rav](https://www.sciencedirect.com/science/article/pii/S0012825221001549) | Undgå varme, stærkt lys, opløsningsmidler og olie; behandl mulige vigtige indeslutninger skånsomt. |
| Dansk geologi | [GEUS om Fanø, geologi og rav](https://www.geus.dk/media/8348/fanoe.pdf) | Gentagen erosion, istidstransport og genaflejring forklarer sekundære danske ravlagre. |
| Revlehuller | [Kystdirektoratet om revlehuller](https://kyst.dk/klimatilpasning/kystdynamik/revlehuller) | Dannelse, synlige tegn og myndighedens sikkerhedsråd; aktuelle råd har forrang. |
| Bølger og sediment | [Kystdirektoratet om bølger, strøm og sand](https://kyst.dk/klimatilpasning/kystdynamik/sedimenttransport/boelger-og-stroem-flytter-sand), [NOAA om bølger og kyststrøm](https://oceanservice.noaa.gov/education/tutorial_currents/03coastal1.html) | Vindstyrke, varighed og fetch; shoaling, brydning, swash/backwash og sortering. |
| Koldt vand og mobilisering | [Naturstyrelsens praktiske efterårsvejledning](https://naturstyrelsen.dk/aktiviteter-i-naturen/aaret-rundt/efteraar), [Rav Jagts video](https://youtu.be/TiR96bdTRr0?is=W-cXDa-m4sUaZzXF) | Koldere saltvand er tættere og giver mere opdrift, hvilket kan gøre rav væsentligt lettere at mobilisere; det meste rav synker stadig, og dette aktiverer intet nyt scoreinput. |
| Kuldesikkerhed | [National Weather Service om koldt vand](https://www.weather.gov/safety/coldwater) | Kuldechok, hurtig fysisk svækkelse, påklædning efter vandtemperatur og flydeudstyr. |
| Fosforfare | [Forsvaret: Pas på fosfor i naturen](https://www.forsvaret.dk/da/nyheder/2007/pas-pa-fosfor-i-naturen/) | Hvidt fosfor kan ligne rav og selvantænde efter tørring: lad det ligge, gå væk og kontakt politiet. |
| Adgang og indsamling | [Naturstyrelsen om færdsel](https://naturstyrelsen.dk/om-naturstyrelsen/kontakt/faq/hvor-maa-jeg-faerdes-paa-naturstyrelsens-arealer), [indsamling til privat brug](https://naturstyrelsen.dk/regler-og-tilladelser/hvad-maa-jeg-samle-til-privat-brug-i-naturen) | Generelle rammer med tydelig besked om lokale undtagelser, ejerforhold, skilte og aktuelle regler. |
| Danefæ | [Nationalmuseet om danefæ](https://natmus.dk/salg-og-ydelser/museumsfaglige-ydelser/danefae/hvad-kan-vaere-danefae/) | Naturligt rav er normalt ikke danefæ; usædvanlige forarbejdede eller arkæologiske ravgenstande kan være det. |

## Bevidst afviste generaliseringer

- Ingen laboratorieværdi gøres til én universel strøm-, bølge- eller faldtærskel for naturligt rav.
- 365 nm fra laboratorieopsætninger gøres ikke til RavRadars praktiske anbefaling. Den ejerfastlagte offentlige vejledning er **395 nm**, og UV er stadig kun et indicium.
- Koldt vand får større og mere korrekt forklaringsvægt, men bliver ikke et nyt Candidate G-input, en scorevægt eller en fundgaranti.
- Kystanalogi må forklare mekanismer, men må ikke præsenteres som direkte dansk naturvalidering af alle ravstørrelser.
- Regler og sikkerhedsråd markeres volatile; assistenten skal henvise til aktuelle myndighedskilder frem for at love en permanent regel.
- Ingen privat turdata, koordinater, rå U/V, credentials, komplette vejrdata eller intern diagnostik indgår i kildebasen eller Edge-konteksten.

## Implementeret bredde og kontrol

- 27 offentligt registrerede kilder.
- 152 deterministiske lokale emner med DA/DE/EN-svar.
- 456 katalogevals plus 51 eksisterende basisevals og tre naturlige formuleringer uden netværkskald.
- 38 versionsbundne offentlige Edge-fakta mod tidligere 23.
- Negativ kontrol for aktiv `365 nm`, ukendte kilde-ID'er, manglende evidensklasse og netværksbrug.
- Candidate G, 20/50/30, kurver, vejrinput, state/cache/recovery, geometri og land-/vandpunkter er uændrede.
