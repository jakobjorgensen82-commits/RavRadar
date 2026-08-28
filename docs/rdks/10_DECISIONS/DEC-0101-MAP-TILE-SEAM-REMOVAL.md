# DEC-0101 – Fjern rasterkortets flisesømme uden at ændre kortdata

- **Status:** Kildevalideret kandidat til 4.0.305; produktion afventer.
- **Dato:** 2026-08-28
- **Ejerobservation:** Det offentlige kort viste pludselig et synligt gitter.

## Evidens og rodårsag

Offentlig visuel kontrol reproducerede hårfine vandrette og lodrette linjer ved grænserne mellem Leaflets 256 px-rasterfliser. DOM-målingen viste korrekt kant-mod-kant-placering, men hele fliselaget stod på en brøk-pixel. Det er en kendt browser-/Leaflet-antialiaseringsklasse, ikke geometri eller prognosedata; Leaflets officielle issue #3575 følger fortsat problemet på tværs af Safari og Chromium.

Et første lokalt forsøg med 0,5 px overlap alene gjorde sømmen lysere i Chromium, fordi Leaflet 1.9.4 samtidig bruger `mix-blend-mode: plus-lighter`. Forsøget blev visuelt afvist før commit. Overlap sammen med normal blanding fjernede gitteret.

## Beslutning

1. Kun `.leaflet-tile-pane .leaflet-tile` med Leaflets eksisterende inlinebredde på 256 px får bredde og højde 256,5 px.
2. Det samme præcise rasterlag bruger `mix-blend-mode: normal`, så overlap ikke bliver en lys additiv søm.
3. Der ændres ikke i Leaflet-JavaScript, tileadresser, map bounds, zoom, vektorpanes, zoner, geometri, pile, labels eller klikflader.
4. En kontrakttest låser selector, overlap, blanding og de eksisterende standard-/satellitlag.

## Verifikation

Målrettede tests for tilelag, mobilopstart og Om-retur er grønne. Lokal visuel kontrol viser ingen flisegitter på standardkortet efter rettelsen; satellitkort, zoom og 211 lokale zonepaths bevares uden kort-/tilekonsolfejl. RDKS, særskilt geodatabevis, fuld sourcegate og releasegate er grønne. Exact-head, produktion og offentlig kontrol afventer.

## Grænser

Candidate G, RavScore, vejr, prognoser, sortering, konto-/turdata, privatliv, assistent, geometri og land-/vandpunkter er uændrede. Geodatafiler må kun få topversion 4.0.305. Sibirien forbliver privat staged og uaktiveret.
