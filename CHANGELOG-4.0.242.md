# RavRadar 4.0.242

## Ændret
- Den foreløbige RavScore-vægt er 25 % jagtbarhed, 40 % transport og 35 % mobilisering/tilgængelighed.
- Komponentregler, tærskler, bølgeprior, scoregrænser, pile, data og geometri er uændrede.
- Den adaptive models standardvisning følger de samme vægte; adaptive vægte overstyrer fortsat ikke den aktive score.
- Bølgebeslutningens kolliderende ID er rettet fra DEC-0032 til DEC-0040. Kystgeometri beholder det oprindelige DEC-0032.
- DEC-0041 dokumenterer, at 25/40/35 er en forskningsbaseret prior, som først må kalibreres på ny efter tilstrækkelige ture med både fund og nul-fund.

## Validering
- Målrettet vægttest, syntetisk 9.261-scenarieaudit og national audit af 673 dele/42.846 scoreposter er grøn. De 420 viste zoner falder i gennemsnit 6,314 point, og 7 skifter vindende del.
- Fuld source-/release-gate, browserkontrol og produktionsverifikation udføres før afslutning.
## Produktionsverificering

- PR #28 blev merged som `4f3481f272de11554fb64ad602555804f362b715`.
- Produktionsworkflow `32421188352` bestod frisk datagenerering, fuld validering, release-gate, Supabase-synkronisering og Pages-deploy.
- Onlinekontrollen bestod 210 zoner, 673 kystdele, 420 aktuelle visninger, 2.100 prognosevisninger og 7.560 vægt-/bidragsforklaringer uden fejl.
- Mobilvisningen bestod ved 390 x 844.
