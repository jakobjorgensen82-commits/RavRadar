# RavScore fase D: audit af bølgeretning og bølgeperiode

Status: diagnostisk kandidat. Ingen offentlig score, zonegeometri eller produktionsdata er ændret.

## Formål

Den første fase D-proceskandidat registrerede manglende bølgeperiode, men brugte hverken perioden eller bølgeretningen i selve scoren. Det stemte dårligt med forskningen, som viser, at bølgeenergi, bølgeretning og brændingszone kan påvirke både mobilisering og kystnær transport.

Denne audit undersøger en isoleret kandidatversion, som:

- bevarer den foreløbige hovedvægt 25 procent jagtbarhed, 40 procent transport og levering samt 35 procent mobilisering,
- omregner DMI's bølgeretning fra "kommer fra" til bølgens bevægelsesretning,
- sammenholder bevægelsesretningen med zonens godkendte hav-til-land-retning,
- bruger `bølgehøjde² × bølgeperiode` som en relativ energiproxy,
- lader den aktuelle bølgepåvirkning vokse gradvist med energien,
- og falder tilbage til den tidligere kandidat uden scoreeffekt, hvis retning eller periode mangler.

Energiproxyen er ikke en beregning af forskydningsspænding ved havbunden. Den mangler blandt andet lokal dybde, bundruhed, kystprofil og bølge-strøm-vekselvirkning. Derfor er modellen fortsat markeret med lav modelsikkerhed.

## Kontrolomfang

Auditten gennemløber 57.600 syntetiske scenarier fordelt på:

- strandsøgning og vadning,
- fire vindniveauer,
- fem bølgehøjder,
- fire bølgeperioder,
- seks bølgeretninger fra direkte påland til direkte fraland,
- fire strømhastigheder,
- fem strømretninger,
- og rolige, friske samt ældre hændelsesforløb.

24.000 scenarier er fysisk sammenhængende i den enkle betydning, at aktuel vind og bølge ikke overstiger det registrerede maksimum for døgnforløbet. De resterende scenarier beholdes som robusthedstest, men må ikke bruges som normal adfærd.

## Resultater

### Alle 57.600 scenarier

| Mål | Resultat |
|---|---:|
| Gennemsnit, tidligere proceskandidat | 48,083 |
| Gennemsnit, bølgekandidat | 48,600 |
| Gennemsnitlig ændring | +0,517 |
| Mindste ændring | -8 |
| Største ændring | +14 |
| Ændret scorekategori | 4.620, svarende til 8,0 procent |

### De 24.000 fysisk sammenhængende scenarier

| Mål | Resultat |
|---|---:|
| Gennemsnit, tidligere proceskandidat | 55,351 |
| Gennemsnit, bølgekandidat | 55,315 |
| Gennemsnitlig ændring | -0,036 |
| Mindste ændring | -8 |
| Største ændring | +14 |
| Ændret scorekategori | 1.526, svarende til 6,4 procent |

Kandidaten flytter dermed ikke det generelle scoreniveau. Den ændrer primært rangeringen af situationer, hvor bølger og strøm peger forskelligt.

### Retningseffekt i alle scenarier

| Bølgens afvigelse fra pålandsretningen | Gennemsnitlig scoreændring |
|---|---:|
| 0 grader | +3,365 |
| 30 grader | +2,846 |
| 60 grader | +1,366 |
| 90 grader | -0,763 |
| 120 grader | -1,855 |
| 180 grader | -1,855 |

Overgangen er gradvis. Der er intet kunstigt spring ved en bestemt vinkel, og retningsberegningen er testet omkring 0/360 grader.

### Periodeeffekt i alle scenarier

| Bølgeperiode | Gennemsnitlig scoreændring |
|---|---:|
| 3 sekunder | +0,385 |
| 5 sekunder | +0,456 |
| 7 sekunder | +0,584 |
| 10 sekunder | +0,646 |

Perioden har en lille, monoton effekt ved samme bølgehøjde. Det er bevidst forsigtigt, fordi RavRadar endnu ikke beregner den faktiske bundpåvirkning.

## Fejl fundet og rettet under auditten

### Manglende retning blev først læst som nul grader

Den fælles talfortolkning omdannede JavaScript-værdien `null` til tallet nul. Den målrettede test fangede fejlen. Kandidaten afviser nu `null`, tom tekst, `undefined` og booleske værdier som manglende data. Når bølgeretningen mangler, bevares den tidligere kandidats score, og sikkerheden sænkes.

### Rolige bølger efter en hændelse blev straffet for hårdt

Den første version blandede altid den aktuelle bølgeproxy ind i både transport og levering. Dermed kunne næsten roligt vand trække en frisk hændelse kraftigt ned, selv om faldende energi kan være tidspunktet, hvor allerede transporteret rav bliver søgbart.

Den rettede kandidat lader derfor kun bølgernes andel vokse, når den aktuelle relative bølgeenergi er mærkbar. Ved næsten rolige forhold bevares hændelseshistorikkens leveringssignal.

## Største faglige uenigheder

### Stærke pålandsbølger mod udadgående modelstrøm: +14 point

I det største fysisk sammenhængende løft har strandsøgning 2 meter bølger med 7 sekunders periode direkte mod land, mens den registrerede strøm er svag og udadgående. Den tidligere kandidat giver 38, mens bølgekandidaten giver 52.

Det er fysisk muligt, at bølger og brænding fører partikler mod land, selv om en modelstrøm peger udad. Men RavRadar ved ikke, om strømdata gælder overfladen, et lag eller bunden, og WAM beskriver ikke den lokale bølge-strøm-vekselvirkning. Scenariet er derfor en vigtig styrke ved kandidaten, men også et krav om senere validering.

### Indadgående strøm mod skråt fralandsrettede bølger: -8 point

I det største fald har vadning en stærk indadgående strøm, men bølgerne bevæger sig 120 grader fra pålandsretningen. Den tidligere kandidat giver 76, mens bølgekandidaten giver 68.

Faldet er fagligt rimeligt som advarsel mod at lade strømmen stå alene. Størrelsen kan dog ikke kalibreres sikkert uden lokale målinger eller mange ensartede ture.

## Sikkerheds- og produktionsvurdering

Kandidaten er bedre fysisk struktureret end en model, der ignorerer bølgeretning og periode. Den består de målrettede tests og giver moderate ændringer i det brede scenariegitter.

Den er ikke klar til offentlig aktivering, fordi:

- energiproxyen ikke bruger lokal dybde eller bundforhold,
- WAM ikke indeholder bølge-strøm-vekselvirkning eller skiftende vanddybde,
- partikelstørrelse og massefylde ikke kan repræsenteres med ét ravscenarie,
- overflade- eller lagstrøm ikke sikkert beskriver bundtransport,
- og modellen endnu ikke er kontrolleret på brede, ensartede ture med både fund og nul-fund.

Kandidaten må bruges til diagnostisk sammenligning og til at forbedre forklaringsstrukturen. Den må ikke importeres af den offentlige scoremotor endnu.

## Næste trin

1. Kør kandidaten på et nationalt diagnostisk datasæt, hvor bølgeretning, periode, datakilde og alder er kendt.
2. Opgør hvor ofte bølger og strøm er enige, uenige eller mangler data.
3. Kontrollér særskilt kystdele med flere retningsankre; én primær retning kan skjule lokale forskelle.
4. Bevar de største uenighedsscenarier som faste regressionstests.
5. Først derefter vurderes, om bølgekandidaten skal indgå i den samlede før-lancering-model.

## Reproducerbar kontrol

```text
node scripts/test-phase-d-wave-process-candidate.mjs
node scripts/audit-phase-d-wave-process-candidate.mjs
```
