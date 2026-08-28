# RavRadar 4.0.296

## Mindre Candidate G-startpakke

- 4.0.295 fjernede den fulde 90–132 MB detaljepakke fra normal opstart, men offentlig produktion viste, at den aktive READY-nødvisnings startfil fortsat var 3.562.253 byte og kunne tage 23,36 sekunder koldt.
- 4.0.296 holder kun den aktuelle score, dækningsfelter, tre komponenttal, kompakt vejr, minimale vinder-/dellabels og vinderdelens lille `flowPoints`-bevis i startup. Forklaringsdiagnoser, fulde kystdelsobjekter, timeforløb og Candidate G-state forbliver i den behovshentede detaljepakke.
- Samme projektion bruges til primær runtime og til en ældre auditeret Candidate G-nødvisning, så payloaden ikke vokser igen ved 673/673 READY.

## Integritet og isolation

- Recovery-opgraderingen ændrer kun startup-dokumentet og dets hash. Detaljepakken og dens hash, dataset-id, tider, scoreværdier, bestetid, national rangering og state er uændrede.
- Geodatafilerne ændrer kun det tilladte topversionsfelt 4.0.295 → 4.0.296. Ingen geometri eller faktiske land-/vandpunkter ændres.
- Ejerens Sibirien-revision forbliver privat staged uden koordinataflæsning, kunstig historik eller aktivering.

## Verifikation

- En READY-lignende syntetisk recovery-startpakke falder fra 591.295 til 29.670 byte, cirka 95 %, med identisk aktuel score og rangeringsscore for begge søgemåder.
- Detaljepakkens objekt og hash er identiske før/efter; eksisterende 4.0.295-, Candidate G-recovery- og data-service-regressioner er grønne.
- PR #199's exact-head-kildegate `33156988524` var grøn og blev merged som `bdd23cc0`. Første produktion `33157055276`/build `98802272478` stoppede korrekt før releasegate og deploy, fordi den eksisterende zoomtest krævede vinderdelens DMI-pilproveniens i startup. Korrektionen bevarer alene `flowPoints.current`, `flowPoints.wind` og `flowPoints.sources`.
- PR #200 bestod exact-head `33158782786`/job `98807893242` på `5dad21c6`, blev merged som `f1cd5868` og gennemførte grøn produktion `33158840203`, build `98808126976` og Pages `98814032394`.
- Offentlig startup er 399.801 byte og tog 1,37 sekunder no-cache mod tidligere 3.562.253 byte/23,36 sekunder. Varm komplet browservisning tog cirka 1,31 sekunder; version, farvet kort, fem aktuelle områder og fem resultater på hver af fem prognosedage er grønne. Candidate G-recovery er fortsat tydelig og sund.
- Se DEC-0093.
