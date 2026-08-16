# DEC-0040 – Nærmeste vandkolonne, bundnær strøm og privat strømfeltsforskning

- **Status:** Aktiv
- **Besluttet:** 2026-08-16
- **Ejerbeslutning:** Ja

## Baggrund

Kortkontrol viste blå strømpile over land og afdækkede et systemisk valgproblem. DMI-parseren foretrak det dybeste gyldige strøm-U/V-lag globalt. Et dybt punkt mange kilometer væk kunne derfor slå en væsentligt nærmere vandkolonne. Pilen blev derefter vist ved den valgte datakoordinat, men datakoordinaten repræsenterede ikke længere det lokale sted, som vandpunktet skulle forankre.

Overfladestrøm er heller ikke automatisk det bedste mål for ravtransport. Rav kan synke eller ophvirvles og transporteres i flere dele af vandsøjlen. Den aktive model skal derfor bruge bundnær strøm, når den findes lokalt, mens den kommende videnskabelige analyse skal undersøge hele transportfeltet og tidsforløbet uden at foregribe en ny score.

## Beslutning for aktiv strøm

1. Hvert centralt gemt vandpunkt er samplinganker for både den viste strømpil og den strøm, som den aktive RavScore kan bruge.
2. DMI-U og DMI-V skal være gyldige på præcis samme koordinat, forecasttid og vertikallag. Et sådant par er havmodellens bevis for en aktiv vandcelle; manglende par er `missing`.
3. Vandkolonnen vælges før dybden: nærmeste gyldige vandkolonne vinder altid. Et dybere lag må aldrig flytte valget til en fjernere koordinat.
4. Inden for den valgte vandkolonne bruges det dybeste gyldige fælles U/V-lag som den aktive bundnære repræsentation.
5. 0–3 km er foretrukket afstand. En gyldig celle mellem 3 og 5 km kan accepteres, når nærmere data ikke findes. Over 5 km er fail-closed og må ikke skabe pil, verificeret provenance eller scoreinput.
6. Pilen står på den eksakte valgte DMI-koordinat. Gamle cacher uden denne semantik, lagidentitet eller aktuelt samplingpunkt må ikke videreføres som verificeret strøm.
7. Kun strøm fra den verificerede DMI-GRIB-kæde må bruges aktivt. Den direkte ForecastEDR-positionstjeneste må fortsat reparere vandstand og overfladetemperatur, men dens strøm må ikke bruges, fordi svaret ikke dokumenterer den krævede fælles vandkolonne og lagidentitet. Open-Meteos overfladestrøm og enhver anden ekstern eller gammel fallbackstrøm holdes tilsvarende ude. Manglende verificeret bulkstrøm forbliver `missing` før både score og kort.
8. Valget af dybeste gyldige lag foretages særskilt for hvert native forecasttidspunkt. DMI kan mangle et dybt lag ved ét tidspunkt og levere det igen senere; derfor må hele serien ikke låses til det lag, som tilfældigvis blev læst sidst.
9. Mellemtimer må kun interpoleres, når begge omgivende native trin har samme modelkørsel, collection, samplingpunkt, gitterkoordinat og vertikallag. Et skift i lag eller vandkolonne giver et ærligt `missing`-gab mellem de native tider; vektorer fra forskellige dybder må aldrig blandes.
10. Den viste pil bruger den viste/valgte times egen verificerede gitterkoordinat og lag. En anden forecasts times koordinat må ikke bruges som repræsentativ pilposition.
11. Centralt reviewede kystdelspunkter skal bygges før DMI-sampling. Når et punkt flyttes, kasseres kun cachen for netop det ændrede samplingpunkt; uændrede punkter må genbruge deres dokumenterede cache, mens ændrede punkter forbliver `missing`, indtil de er samplet igen.

## Privat syvdøgnsopsamling

1. De allerede downloadede DKSS-GRIB-felter genbruges til et roterende privat forskningsudsnit af lokale kystdele.
2. Der samples på transekter ved det aktuelle vandpunkt samt cirka 5 og 15 km søværts. For hver nærmeste vandkolonne gemmes eksplicit overfladelag, øverste tilgængelige lag, et repræsentativt mellemlag og bundlaget, når de findes.
3. Rå forskningsprøver opbevares højst 168 timer i en privat workflowcache. Den offentlige diagnostik må kun vise ufølsomme antal/statusfelter, ikke vektorerne.
4. Opsamlingen er `scoreImpact=false` og `publicRuntime=false`. Den må ikke ændre pile, aktiv RavScore, historik, zoner eller administratorens punkter.
5. Et flyttet vandpunkt nulstiller den pågældende forskningsankers gamle prøver, så forskellige fysiske steder ikke blandes.
6. Den geografiske rotation skal kunne gå videre på hver almindelig vellykket workflowkørsel, også når DMI-modelgenerationen er uændret. Kun allerede downloadede, tidsrelevante GRIB-filer må genlæses, og genlæsningen må kun modtage private forskningsmål. Den må ikke skrive til offentlig zonecache eller udløse ekstra DMI-download.
7. Med 15 kystdele pr. 15-minutters kørsel er én fuld 673-dels rotation 45 kørsler eller cirka 11 timer og 15 minutter. Dermed kan hele geografien besøges mange gange inden for 168-timersretentionen; en rotation, der kun flytter sig ved nye modelgenerationer, er utilstrækkelig.

## Krav til den kommende analyse og scoremodel

Den store RavScore-analyse under DEC-0029 skal behandle ravtransport som en sammenhængende kæde: ydre tilførsel over det rumlige strømfelt, overgang mod kysten, lokal bundnær levering, eventuel ophvirvling/sænkning, tidsforsinkelse og persistens. Strøm længere ude kan derfor få selvstændig betydning senere, men må ikke tælles dobbelt med lokal strøm, vind eller bølger.

Først når forskningen og de indsamlede data dokumenterer skala, relevante lag, tidsforsinkelse, ikke-redundans og validerbar forbedring, kan en ny mekanisme foreslås. Implementering kræver en særskilt ejerbeslutning og fuld regressions-, rollback- og produktionsvalidering.

## Konsekvens

Den aktive rettelse er en korrektion af sted-, lag- og provenanceintegritet, ikke en ny vægtning. RavScoreformlen ændres ikke, men ugyldigt eller for fjernt tidligere strømgrundlag fjernes fail-closed, indtil friske DMI-data er bygget efter den nye kontrakt.
