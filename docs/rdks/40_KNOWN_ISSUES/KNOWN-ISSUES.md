# Kendte åbne og overvågede forhold

## Høj prioritet
1. **ISSUE-STATION-CACHE-STATUS – DELVIST LØST I 4.0.97:** Admin skelner nu mellem observation, stationsbaseret cache og zonebaseret DMI-modelcache. Historisk stabilitet og produktionsverifikation af alle stationers livscyklus overvåges fortsat.
2. **ISSUE-HANDBOOK-EVIDENCE – LØBENDE:** Flere faglige antagelser om rav og sedimenttransport kræver ekstern ekspertvalidering.
3. **ISSUE-DMI-HORIZON – OVERVÅGES:** Komponenternes DMI-horisont kan være kortere end hele brugerprognosen; fallback og dækning skal forklares.
4. **ISSUE-WATERLEVEL-CONTINUITY – OVERVÅGES:** Kunstige spring må ikke genopstå ved kildeskift; Vadehavet skal vurderes særskilt.
5. **ISSUE-STATION-OFFICIAL-AUDIT – ÅBEN:** Kortets register skal løbende sammenholdes med DMI's officielle stationsliste.

## Produkt og admin
6. **ISSUE-RULE-USABILITY – DELVIST:** Regelbyggerens fulde menneskevenlige workflow og konfliktforklaring skal løbende verificeres i browseren.
7. **ISSUE-COASTLINE-EDITOR – RETTET I 4.0.90, OVERVÅGES:** Søgning, zonevalg, omdøbning og central gemning er samlet i én brugerrejse. Mobil browsertest og rollback overvåges fortsat.
8. **ISSUE-CENTRAL-STORAGE – DELVIST:** Supabase-opsætning og rettigheder kræver fortsat driftsverifikation.

## Historiske problemer, der ikke må genindføres
- Timevis DMI/Open-Meteo-pendlen.
- Global 180°-vending som hurtigfix uden lokal geometri-audit.
- Afstandsbaseret stationsvalg uden kysttopologi og datastatus.
- Fjernelse af kendte stationer, fordi én kørsel mangler observationer.
- Genindførelse af brede førstegenerationszoner.
- Implementering af funktioner alene fordi de blev diskuteret teoretisk.

## Senest løst, kræver produktionsbekræftelse
- **ISSUE-PUBLIC-FORECAST-MAIN-THREAD – RETTET I 4.0.83, AFVENTER PRODUKTIONSBEKRÆFTELSE:** Dagens rangliste kunne ikke males, fordi 5-dages landsberegningen blokerede browserens hovedtråd synkront. Beregningen er nu opdelt og giver løbende browseren kontrollen tilbage.

## Løst i 4.0.85 – afrundingsinkonsistent strømvektor
**Status:** LØST

4.0.84 kunne gemme afrundet u/v, men beregne retning og hastighed fra uafrundede værdier. Det kunne påvirke audit og RavScore tæt på retningsgrænser. 4.0.85 bruger én kanonisk lagret vektor i hele kæden.

## Løst i 4.0.86 – funktioner uden synlig brugerrejse
**Status:** LØST

Reviewkøen fandtes kun i en parallel/inaktiv adminimplementering, mens den aktive admin kunne indsende reviews uden at ejeren kunne finde dem igen. Samme audit afdækkede manglende håndtering af lokale nødkladder, et tomt dokumentationscenter og uklar lokal virkning af model-forslag. Den aktive admin og sitetesten kontrollerer nu hele brugerrejsen.

## Løst i 4.0.87 – manglende kortpile, admin-kortrace og blandet modulcache
**Status:** LØST, AFVENTER PRODUKTIONSBEKRÆFTELSE

Pileinstallationen var gjort afhængig af browserens idle-callback uden runtimekontrol. Samtidig kunne retningskortets forsinkede Leaflet-start køre efter faneskift, og aktive browserimports bar flere ældre versionsparametre. 4.0.87 gør pileinstallationen deterministisk efter de centrale visninger, beskytter kortcontainerens livscyklus og kræver én releaseversion gennem hele importgrafen.

## Løst i 4.0.96 – vandstandsstationsfanen
- `stationDeliveryLabel` stoppede kortinitialisering for zoner med gemt override. Løst ved at bruge de aktive observations-, cache- og anvendelighedslabels.
- Beskyttet stationsstatus blev ikke hydreret fra Supabase og kunne blive forringet til ukendt/utilgængelig. Løst med central readback og ikke-destruktiv merge.

## Løst i 4.0.97 – misvisende cache- og anvendelighedstekst
- “Ingen prognosecache” kunne fejlagtigt læses som om zonens DMI-modelprognose manglede, selv om feltet kun beskrev stationsbaseret interpolation.
- Admin viser nu “Ingen stationsbaseret cache” og “Ingen brugbar stationsværdi nu”.
- Status forklarer, at et override kun anvendes, når de valgte stationer faktisk har brugbare værdier; den offentlige zoneprognose er en separat kæde.
