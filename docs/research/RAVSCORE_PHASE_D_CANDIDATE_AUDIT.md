# RavScore fase D: kandidat- og tærskelaudit

Status: reproducerbar, score-neutral diagnose. Ingen kandidat er aktiveret i appen.

## Metode

`scripts/audit-ravscore-sensitivity.mjs` beregner 43.200 syntetiske situationer for hver af tilstandene `waders` og `beach`, i alt 86.400. Alle kandidater bruger de samme eksisterende B0-delscorer. Analysen måler derfor forskellen mellem vægt- og kombinationsstrukturer, ikke endnu effekten af reviderede fysiske regler.

Undersøgte kandidater:

- `b0`: den aktive referencescore.
- `equalAdditive`: næsten lige vægte.
- `phaseDAdditive`: jagtbarhed 25, transport 40 og mobilisering 35.
- `phaseDSoftGate`: `25/40/35` med højst 25 % gradvis reduktion, når den svageste delscore er under 50.
- `phaseDChain`: jagtbarhed 25 % plus en harmonisk fysisk kæde af transport og mobilisering.
- `phaseDFullChain`: harmonisk kæde af alle tre dele med vægtene `25/40/35`.

## Samlet resultat

### Vadersøgning

| Kandidat | Gennemsnit | Forskel fra B0 | Ændret niveau | Korrelation med B0 |
|---|---:|---:|---:|---:|
| B0 | 44,698 | 0 | 0 | 1,000 |
| Lige vægte | 46,338 | +1,640 | 4.247 | 0,994 |
| `25/40/35` | 48,592 | +3,894 | 11.600 | 0,950 |
| Mild port | 41,885 | -2,813 | 6.397 | 0,977 |
| Fysisk kæde + jagtbarhed | 45,853 | +1,155 | 11.461 | 0,923 |
| Fuld kæde | 26,165 | -18,533 | 16.197 | 0,814 |

### Strandsøgning

| Kandidat | Gennemsnit | Forskel fra B0 | Ændret niveau | Korrelation med B0 |
|---|---:|---:|---:|---:|
| B0 | 57,895 | 0 | 0 | 1,000 |
| Lige vægte | 57,578 | -0,316 | 2.434 | 0,994 |
| `25/40/35` | 56,843 | -1,052 | 6.097 | 0,974 |
| Mild port | 53,799 | -4,095 | 9.419 | 0,975 |
| Fysisk kæde + jagtbarhed | 54,120 | -3,774 | 9.408 | 0,952 |
| Fuld kæde | 51,253 | -6,641 | 11.409 | 0,925 |

“Ændret niveau” er antal af de 43.200 situationer, der skifter mellem dårlig, svag, middel og god i forhold til B0. Tallene viser modelvirkning, ikke naturmæssig nøjagtighed.

## Fysiske konflikter

### Let at søge, men lav mobilisering

Gennemsnitlig B0 er 50,5 for vadersøgning og 43,4 for strandsøgning. `25/40/35` sænker dem til 40,8 og 35,7. Den milde port sænker dem yderligere til 34,7 og 30,1.

Konklusion: B0 kan lade gode søgeforhold fylde for meget, selv om den fysiske leveringskæde er svag.

### Høj mobilisering, men dårlig transport

Gennemsnitlig B0 er 38,8 for vadersøgning og 52,3 for strandsøgning. Ren `25/40/35` øger vaderscoren til 43,2, fordi mobilisering får større vægt. Den fysiske kæde sænker i stedet resultaterne til 31,7 og 40,1; den milde port giver 35,4 og 44,7.

Et tydeligt ekstremeksempel har jagtbarhed 100, transport 0 og mobilisering 84. Her giver B0 61, ren `25/40/35` giver 54, den fysiske kæde 25 og den fulde kæde 0.

Konklusion: nye vægte alene kan forværre en situation, hvor et nødvendigt transportled mangler.

### God fysisk mulighed, men dårlig jagtbarhed

Ren `25/40/35` hæver gennemsnittet fra B0's 49,2 til 60,1 for vadersøgning og fra 61,0 til 67,5 for strandsøgning. Den milde port giver 46,1 og 61,6. Den fulde kæde falder til 6,7 for vadersøgning, fordi de nuværende jagtbarhedsregler ofte rammer præcis nul.

Konklusion: resultatet afhænger af, om overskriftsscoren skal betyde fysisk ravmulighed eller realistisk fundmulighed nu. Brugerfladen bør under alle omstændigheder vise jagtbarhed særskilt og tydeligt.

### Alle dele er høje

Når jagtbarhed, transport og mobilisering alle er mindst 60, ligger kandidaternes gennemsnit tæt: cirka 75,6-77,5. Den milde port ændrer ikke `25/40/35` i disse situationer.

Konklusion: den store uenighed ligger i konfliktsituationerne, ikke når hele proceskæden peger samme vej.

## Tærskelspring i B0

40 af 54 undersøgte grænser giver et spring i den endelige score ved en inputændring på 0,001.

De største fund er:

- vadervind lige over 6 m/s: jagtbarhed falder 43 delpoint og RavScore falder 18 point,
- strandvind lige over 13 m/s: jagtbarhed falder 30 delpoint og RavScore falder 12 point,
- strøm omkring 0,15 m/s: transport stiger 30 delpoint og RavScore stiger 10-11 point,
- vadervind lige over 8 m/s: RavScore falder 10 point,
- vaderbølger lige over 0,7 m: RavScore falder 10 point,
- og strømretningen giver flere spring på 5-8 RavScore-point ved faste vinkelgrænser.

Disse spring er ikke bevis for, at selve grænsernes placering er forkert. De viser, at en næsten umærkelig ændring i input kan give en uforholdsmæssig stor ændring i brugerens vurdering.

## Foreløbig beslutning

1. `40/35/25` bør ikke bevares ukritisk.
2. `25/40/35` er fortsat den bedst begrundede additive prior, men må ikke stå alene.
3. Den fulde harmoniske kæde er for hård sammen med B0's nuværende nulværdier, især for vadersøgning.
4. Den milde port er den mest afbalancerede samlede kandidat i denne første strukturtest, men er ikke godkendt til produktion.
5. En fysisk kæde med jagtbarhed vist særskilt er den klareste forklaringsmodel.
6. Næste arbejde skal rette delregler og tærskelspring, før kandidatvalget gentages.

## Næste regelprioriteter

1. Udglat vind- og bølgevirkning på jagtbarhed uden at skjule reelle sikkerhedsgrænser.
2. Udglat strømhastighed og retningsvirkning på transport.
3. Adskil stormhændelsens mobilisering fra de aktuelle søgeforhold.
4. Gør aflevering og fastholdelse tydeligere end en generel transportbonus.
5. Undersøg bølgeperiode, relevant dybdelag og længere hændelsesvindue.
6. Kør hele kandidat- og konfliktanalysen igen efter hver samlet regelrevision.

## Reproduktion

Kør:

```powershell
node scripts/audit-ravscore-sensitivity.mjs --self-test
node scripts/audit-ravscore-sensitivity.mjs
```

Det første kald validerer rapportstrukturen. Det andet skriver den komplette JSON-rapport til standardoutput og ændrer ingen filer.
