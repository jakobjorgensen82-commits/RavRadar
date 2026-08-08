# RavRadar 4.0.123 – bredere marint U/V-gridvindue

- Produktionsaudit af #1851 og #1852 bekræftede 118 offentlige vindtimer i alle 208 zoner, men samme fem zoner uden direkte DKSS-vindhale: `DK-B05-17`, `DK-B05-21`, `DK-B05-22`, `DK-B05-23` og `DK-B10-10`.
- Den centralt gemte admin-geometri blev verificeret som faktisk input til bulkjobbet; rettelsen genindfører ikke historiske lokale datapunkter.
- Marine kandidater udvides fra 16/48 til 64/128 for henholdsvis øvrige kyster/Limfjorden. De fysiske afstandsgrænser er uændrede.
- Diagnostikken viser nu særskilt, om strøm- eller vindhale-U/V mangler et fælles fysisk gridpunkt.
- Den deployede fulde cache fjernes ikke: den er fortsat persistent pipeline-state, mens den offentlige klient kun henter `public-conditions.json`.
