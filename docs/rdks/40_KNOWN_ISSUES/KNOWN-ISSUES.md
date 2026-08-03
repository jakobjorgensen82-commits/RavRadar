# Kendte åbne og overvågede forhold

## Høj prioritet
1. **ISSUE-STATION-CACHE-STATUS – PLANLAGT:** Stationslivscyklus skelner endnu ikke fuldt mellem observation og gyldig prognosecache.
2. **ISSUE-HANDBOOK-EVIDENCE – LØBENDE:** Flere faglige antagelser om rav og sedimenttransport kræver ekstern ekspertvalidering.
3. **ISSUE-DMI-HORIZON – OVERVÅGES:** Komponenternes DMI-horisont kan være kortere end hele brugerprognosen; fallback og dækning skal forklares.
4. **ISSUE-WATERLEVEL-CONTINUITY – OVERVÅGES:** Kunstige spring må ikke genopstå ved kildeskift; Vadehavet skal vurderes særskilt.
5. **ISSUE-STATION-OFFICIAL-AUDIT – ÅBEN:** Kortets register skal løbende sammenholdes med DMI's officielle stationsliste.

## Produkt og admin
6. **ISSUE-RULE-USABILITY – DELVIST:** Regelbyggerens fulde menneskevenlige workflow og konfliktforklaring skal løbende verificeres i browseren.
7. **ISSUE-COASTLINE-EDITOR – DELVIST:** Kurver, navigation, deaktivering, gemning og rollback skal regressionstestes på mobil.
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
