# RavRadar 4.0.296

## Mindre Candidate G-startpakke

- 4.0.295 fjernede den fulde 90–132 MB detaljepakke fra normal opstart, men offentlig produktion viste, at den aktive READY-nødvisnings startfil fortsat var 3.562.253 byte og kunne tage 23,36 sekunder koldt.
- 4.0.296 holder kun den aktuelle score, dækningsfelter, tre komponenttal, kompakt vejr og minimale vinder-/dellabels i startup. Forklaringsdiagnoser, fulde kystdelsobjekter, timeforløb og Candidate G-state forbliver i den behovshentede detaljepakke.
- Samme projektion bruges til primær runtime og til en ældre auditeret Candidate G-nødvisning, så payloaden ikke vokser igen ved 673/673 READY.

## Integritet og isolation

- Recovery-opgraderingen ændrer kun startup-dokumentet og dets hash. Detaljepakken og dens hash, dataset-id, tider, scoreværdier, bestetid, national rangering og state er uændrede.
- Geodatafilerne ændrer kun det tilladte topversionsfelt 4.0.295 → 4.0.296. Ingen geometri eller faktiske land-/vandpunkter ændres.
- Ejerens Sibirien-revision forbliver privat staged uden koordinataflæsning, kunstig historik eller aktivering.

## Verifikation

- En READY-lignende syntetisk recovery-startpakke falder fra 545.339 til 26.578 byte, cirka 95 %, med identisk aktuel score og rangeringsscore for begge søgemåder.
- Detaljepakkens objekt og hash er identiske før/efter; eksisterende 4.0.295-, Candidate G-recovery- og data-service-regressioner er grønne.
- Fuld lokal sourcegate/releasegate er grøn. PR exact-head, frisk produktion og offentlig cold/warm-verifikation afventer.
- Se DEC-0093.
