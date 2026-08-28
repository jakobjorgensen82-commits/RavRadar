# DEC-0093 – Minimal Candidate G-startprojektion i primær drift og nødvisning

## Status

Besluttet og implementeret som 4.0.296-kildekandidat. Målrettet score-/rangeringsparitet, recovery-integritet og størrelseskontrol samt fuld lokal sourcegate/releasegate er grøn; exact-head, produktion og offentlig cold/warm-verifikation afventer.

## Problem

4.0.295 fjernede den 90–132 MB store detaljepakke og den fulde femdøgnsberegning fra normal browseropstart. Offentlig produktion viste derefter cirka 3,7 sekunders varm start, men den aktive komplette Candidate G-nødvisnings startfil var stadig 3.562.253 byte og tog 23,36 sekunder i en afgrænset kold HTTP-måling. Den friske, endnu ikke READY primærstart var 694.288 byte og tog 4,09 sekunder.

Resten kom fra `coastalParts`: hver zone bar stadig en fuld aktuel scorepost med forklaringsdiagnoser og hver vinder var et komplet kystdelsobjekt. Detaljerne var dermed både i start- og detaljepakken. Når primæren igen blev 673/673 READY, kunne samme størrelse vende tilbage uden en permanent projektion.

## Beslutning

1. Den aktuelle Candidate G-startpost må kun indeholde tidspunkt, tilgængelighed/status, score, vinder-id/-navn, dæknings- og antalfelter, de tre numeriske scorekomponenter, kompakt aktuelt vejr og minimale `{partId,name,score}`-dækningsrækker.
2. Startpakkens vinderregister må kun indeholde identitet og de allerede offentlige metadata, som den øjeblikkelige områdevisning bruger. `current`, `forecast`, Candidate G-state, forklaringer, component reasons, unavailable-part-diagnostik og øvrige tunge felter forbliver alene i detaljepakken.
3. Uændrede eller utilgængelige startposter må fortsat fejle lukket. Manglende detaljer giver den eksisterende generiske utilgængeligheds- eller dækningsforklaring, indtil den behovshentede detaljepakke er indlæst.
4. En ældre bevaret Candidate G-nødvisning genprojekteres deterministisk fra sin egen allerede auditerede detaljepakke. Kun startup-dokumentet og dets hash ændres; detaljepakken og dens hash, dataset-id, tider, scorer og state er identiske.
5. Samme projektion bruges til friske primære runtimes, så payloaden ikke vokser igen ved 673/673 READY.

## Sikkerheds- og datagrænser

- Ingen RavScore-formel, komponentværdi, bestetid, national rangering, vejrinput eller Candidate G-state ændres.
- Den fulde offentlige detaljepakke bevares uændret og hentes fortsat kun ved behov efter DEC-0092.
- Ingen privat data, credential, rå U/V, geometri eller faktisk land-/vandpunkt ændres eller publiceres.
- Ejerens Sibirien-revision forbliver privat staged under DEC-0090. Ingen koordinater er læst, ingen historik er fabrikeret, og ingen aktivering er udført.

## Verifikation

Den målrettede 4.0.296-regression sammenligner aktuel score, vinder, komponenter, vejr, dækningsrækker og national rangeringsscore før og efter projektionen for begge søgemåder. Den kræver fravær af tunge detaljefelter, uændret detaljeobjekt og detaljehash samt korrekt ny startup-hash. Den syntetiske READY-lignende startpakke faldt fra 545.339 til 26.578 byte, cirka 95 %, uden score- eller rangeringsafvigelse. Eksisterende 4.0.295-, Candidate G-recovery- og data-service-regressioner samt fuld lokal RDKS-, privacy-, Edge-, Candidate G-, DMI-, workflow- og releasekontrol er grønne.
