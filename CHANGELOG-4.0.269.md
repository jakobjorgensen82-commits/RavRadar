# Changelog 4.0.269 – aktuelle scoreforklaringer

## Brugerflade

- Alle tre RavScore-komponenter forklarer nu de konkrete vind-, bølge-, strøm- og forløbsforhold for den viste kystdel.
- **Rav i bevægelse** forklares som bølgevirkning på allerede tilgængeligt rav og let materiale; vind virker her gennem bølgerne.
- Lavt vand fremstilles ikke længere som en selvstændig hjælp til indtransport. Ved lavt, men stigende vand er det stigningen, der kan føre materiale længere ind.
- Den statistisk umodne **Fundprognose**, **Anvendte scorelofter** og den rå sorte **Samlet score**-visning er fjernet fra den offentlige zonevisning. Bagvedliggende data og teknisk logik er bevaret.
- Det tomme **Vælg et område på kortet**-felt er fjernet; informationspanelet vises først efter et valg eller ved en reel fejl.
- Kilde- og licensteksten er opdateret til den aktive data- og kortkæde.

## Score og data

- Candidate G forbliver den aktive 20/50/30-model. Den globale 25/40/35-reserve er ikke ændret og må fortsat kun vælges samlet, når Candidate G ikke kan publiceres komplet.
- Der er ikke ændret scoretal, tærskler, transporthukommelse, vejrdata, Supabase-kontrakt, geometri eller land-/vandpunkter.
- `data/kystdata.json` og `data/zones.geojson` ændrer kun versionsfeltet til 4.0.269.

## Dokumentation og kontrol

- DEC-0068, RDKS, roadmap, begge håndbøger, forskningsnote og changelog beskriver samme kontrakt.
- Målrettede tests låser de aktuelle forklaringer, de skjulte offentlige felter, kildekrediteringen og begge scoreprofiler.
- PR #120 bestod exact-head `32703138969` på `37de330c`, blev merged som `d745e0ba`, og produktion `32703271897` bestod central hydrering, frisk vejr og strøm, fuld validering, releasegate og Pages-deploy.
- Live `rr-20260824080543-210` viser 4.0.269 med Candidate G 20/50/30 på 210 zoner og 673 kystdele.
- Den fulde offentlige browseraudit bestod 420 aktuelle visninger, 2.100 femdøgnsvisninger og 673 kystdelsreferencer med nul kontrol-, konsol-, side- eller HTTP-fejl.
