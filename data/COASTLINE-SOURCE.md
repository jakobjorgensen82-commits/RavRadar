# Kystlinjekilde — RavRadar 4.0.47

RavRadars synlige, RavScore-farvede zoneforløb bygges under deployment fra en immutable OSM-afledt kystkilde:

- Pakke: `@geo-maps/countries-coastline-100m`
- Version: `0.6.0`
- Fil: `map.geo.json`
- CDN: jsDelivr
- Oprindelse: OpenStreetMap-afledte kystdata
- Licens: ODbL / OpenStreetMap contributors

Kilden har væsentligt højere geometrisk opløsning end den tidligere GSHHS intermediate-master. Hver zone klippes som et sammenhængende udsnit af den virkelige kystlinje, hvorefter kompakte havne-/moleafstikkere brobygges. Den viste linje flyttes 5 meter væk fra zonens marine datapunkt, så stregen ligger på strandsiden.

Kildeprojektet indeholder fortsat den auditerede 4.0.44-geometri som rollback. En deployment accepteres kun, hvis mindst 190 af 210 aktive zoner kan genereres sikkert; ellers publiceres ændringen ikke.
