# RavRadar 4.0.231

## Rettet

- Lokale kystdelspile bindes nu til præcis den scoretime, som runtime viser. Scoreposten vælges først; derefter beregnes `flowPoints.current` fra samme times verificerede DMI-proveniens.
- Hvis byggetiden mangler strøm, men en senere time kan scores, må pilen ikke falde tilbage til administratorens vandpunkt eller låne en anden times celle. Uden verificeret celle på den viste time er der ingen lokal DMI-pil.
- Zoom-/pilregressionen indeholder nu et tidsligt datagab, som beviser forskellen mellem byggetidens fallbackanker og den viste scoretimes DMI-celle.

## Bevidst uændret

- DMI-værdier, nærmeste-vandkolonne-først, dybeste gyldige lag, semantik v3, 5-km-grænse, RavScore, administratorens punkter og den geografiske gate er uændrede.
- Den private 168-timers 0/5/15-km flerlagscache er fortsat `scoreImpact=false` og `publicRuntime=false`. Roadmap og beslutning bevarer forskningskæden **ydre tilførsel → overgang mod kyst → lokal bundnær levering**.

## Produktionsstatus

- #31930644562/#2875 genopbyggede IDW og målte 114/210 hovedzoner samt 414/673 lokale dele. #31930976129/#2876 genopbyggede NSBS og nåede 182/210 samt 574/673 uden at lempe gaten.
- Havknude er frisk artefaktbevist rettet i #2876 med 38 native tider fra NSBS-cellen 2,80363 km fra det centrale vandpunkt.
- #2876 fandt den særskilte tidskoblingsfejl ved `PART::dk-b04-12-owner-approved-01` og stoppede korrekt før Supabase/Pages. Limfjordsgenopbygning, nul-mismatch-audit, fulde gates og livekontrol mangler; 4.0.231 er ikke deployet eller produktionsverificeret.
- Målrettede pil-, DMI-, forecast-, provenance-, runtime-, versions-, håndbogs- og RDKS-kontroller samt lokal releasegate består. Fuld lokal `validate` stopper som forventet ved repositoryets dokumenterede forældede 31. juli-snapshot; friske centrale data må ikke erstattes af dette snapshot.
