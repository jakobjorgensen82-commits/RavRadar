# DEC-0268 – Replay-først genstart med uændret PUBLIC-grænse

**Status:** Aktiv fasebeslutning; lokal 4.0.521-kandidat, ikke releaseklar.
**Dato:** 2026-10-01.

## Ejerprioritet og faktisk udgangspunkt

Ejeren ønsker nye vejrhentninger sideløbende med færdiggørelsen, HVIS
det er sikkert. Stabilitet, bevarelse og mest mulig komplet cache har
forrang. Dette er ikke en bestilling på blind genhentning eller på at
publicere trods kendte fejl.

Audit-main 4.0.520 er merged som `590f01c6`. Den ene godkendte audit
`36749250698` læste eksakt krypteret `36698472505-1` og original
beskyttet baseline uden providers, union/replay, cachebygning eller
deploy. Rå progress var 684.633.367 af 805.306.368 byte; cirka 115,08 MiB
margin er ikke pladsbevis for næste generation. Den offentlige
4.0.510-prognose er uændret, og cron 8348098 er pauset.

## Afgrænset levering

1. En ren genstartskandidat bygges i `weather-restart-release` fra
   audit-main. Nattens større arbejde i `feggesund-preflight-recovery`
   bevares separat og kan fortsætte parallelt; det aktiveres ikke ved
   at udtage afgrænsede allerede undersøgte rettelser.
2. Historisk DMI-replay bruger den faktisk gemte tidligere komponent
   og en oprindelig godkendt donor-kontekst. En rekonstrueret række
   eller tekstlabel alene er ikke beskyttet previous. Begge sider
   skal bestå uændret validering; nyere gyldig modelkørsel eller bevist
   sammenlignelig revision kan stadig overtage. Ubeviste konflikter
   og kildepar må ikke skjules.
3. Parent-forecast læses, flettes og skrives recordvist under den
   eksisterende autoritative 768-MiB-filgrænse. Baselines PART beholdes;
   cursor, geometri, tidsvindue, dublet-/formatkontrol og atomisk
   installation bevares. `MERGED`, `ACCEPTED_NO_CHANGE`, `NOT_PRESENT`
   og `REJECTED` må ikke sammenblandes. Afvist forecast inde i en
   ellers autentificeret pakke stopper før ny dyr hentning.
4. Bølgetuple/retning kræver matchende kildeattest. OM-reparation må
   kun frasortere en autentificeret, efter kanonisk afrunding ubrugelig
   post under den uændrede validator; gyldige siblings og kildeprioritet
   bevares. Ukendt modelalder bliver ikke en opdigtet prioritet.
5. CP-loggens kendte årsagssum K, ufordelte rest U og konsistens må kun
   bygges af sikre faste tællere. Ufuldstændig tællehistorik må ikke
   kaldes komplet. R2-cleanup viser eksisterende sikre resultatantal;
   ingen nye sletninger eller påstand om oprydning af gamle objekter.
6. PUBLIC-admission og builderens standardsti forbliver main's
   active-context-only-kontrakt. Bredere originalkontekst i historisk
   replay er ikke ny offentlig admission. Nye PUBLIC-bank-, session-
   eller native-PUBLIC-opt-ins leveres/aktiveres ikke i denne fase.

Punkt 6 afgrænser den aktuelle levering af
[DEC-0266](DEC-0266-WEATHER-CONTINUITY-AND-CAPACITY.md), især dens brede
prognose-/replaymål. Det er udskydelse af endnu ikke-frigivet PUBLIC-
adfærd, ikke tilbagerulning af en eksisterende gate, data eller funktion.
Den videre originale bevispersistens forbliver åben. Ingen artifactgate
ændres for at få denne fase igennem; næste target kan legitimt stoppe.

DMI-først, Copernicus før Open-Meteo, 96h-undtagelsen, adminvalgt
vandstand, Limfjord-reglen, scoremodel, geometri og scheduler bevares.
Gamle gyldige værdier må ikke kasseres, og native beviser må aldrig
fremstilles af et afledt resultat. Audittens manglende endpointbevis
er ikke i sig selv konstateret tab eller et universelt råarkivkrav.

## Bevisniveau og næste grænse

Lokale delresultater: replaymåltest PASS, root 57/57 og forecast/progress
20 bestået, 0 fejl, 2 eksplicitte >V8-storfil-skips. Yderligere prøver
pågår. Disse tal er ikke fuld exact-head source-CI, national kapacitet
eller et gennemført produktionsrun. Historiske grønne heads beviser
ikke denne nye sammensætning.

Før release kræves de relevante mål-/regressionstests, uændret
modelbundle, version/RDKS/begge håndbøger og grøn fuld source-CI på
eksakt head. Før ny hentning skal det konkrete cachegrundlag,
bevarelsen af original progress/baseline og realistisk samlet
kapacitet/gemningsvej være kontrolleret. Alle eksisterende lofter
består; R2-plads er ikke Node-RAM-, V8-, disk- eller tidsbevis.

Faktisk restore/save, identiske sted/timers femfelts-no-loss,
artifactgate, central CAS, privat R2, Pages og synlig prognose skal
stadig måles. Ingen nye private læsninger, providerkald, merge,
deploy eller cronændring er foretaget som del af denne lokale fase.
Ingen lovning om, at næste target passerer eller at cachen er komplet.
