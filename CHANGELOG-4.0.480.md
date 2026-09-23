# RavRadar 4.0.480 – gyldige DMI-timer ved modelrunskift

- Sammenligning af de to seneste deployede vejrpakker på præcis samme
  113 prognosetimer viste 22 tabte strøm-, 41 vandstands- og 41
  temperaturpositioner i Limfjorden; vind og bølger mistede ingen.
- Ved et bevist skift mellem to ellers identiske DMI-serier vælges en
  stadig gyldig native kantværdi separat for hvert havfelt. Ingen
  krydsinterpolation, dybdeblanding eller forlængelse af tidsgrænser.
- Den eksakte 4.0.479-private produktionspakke kan genbruges efter
  fuld byte-, kontrakt- og tidskontrol trods ændret DMI-producentkode.
  Andre pakker får ingen generel undtagelse.
- Lokal måltest er grøn. Exact-head CI, merge og frisk normalrun er
  endnu ikke produktionsbevist. De øvrige leverandør- og datahuller
  er fortsat åbne. Se DEC-0250.
