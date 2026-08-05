# RavRadar 4.0.100 – fælles vandstandskilder

- Vandstandssystemet skelner nu mellem DMI-målestationer og DMI-prognosepunkter.
- Prognosepunkter hentes fra DMI's `tidewaterstations`-register og vises som prognosekilder, ikke som fejlede observationer.
- Både målestationer og prognosepunkter samples i den samme DKSS STAC/GRIB-model ved kildens koordinat. Dermed får begge typer sammenlignelige femdøgnsserier med total modelvandstand.
- Aktiv administratorrouting bruges først; ellers bruges RavRadars automatiske topologiske valg.
- Én eller to valgte kilders femdøgnsserier anvendes direkte i zonens aktuelle vandstand, RavScore, Aktuelt bedste områder, 5-døgnsprognosen og “Næste fem dage – Vandstand time for time”.
- Ved to kilder bruges inverse afstandsvægte fra zonens datapunkt.
- Admin viser “Modtager prognose” eller “Modtager ikke prognose” for prognosepunkter og bevarer de eksisterende farver for automatisk valg, override, begge og udfaset.
- Hals-punkterne kan dermed anvendes som prognosekilder, når deres DKSS-serie har tilstrækkelig horisont.
- OceanObs-observationer og deres livscyklus er fortsat adskilt fra prognosekildernes DKSS-prognosestatus.
