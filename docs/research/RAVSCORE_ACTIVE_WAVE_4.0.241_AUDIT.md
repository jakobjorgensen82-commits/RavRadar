# RavScore 4.0.241 - audit af aktiv bølgeprior

## Formål

Kontrollen måler den aktive, begrænsede bølgeeffekt isoleret fra den planlagte vægtændring. Den sammenligner 4.0.241 med samme scoreberegning uden bølgeretning og bølgeperiode.

## Syntetisk sweep

- 55.296 scenarier på tværs af begge jagtformer.
- Variation i vind, bølgehøjde, bølgeperiode, bølgeretning, strømstyrke, strømretning og tre historiktilstande.
- Gennemsnitlig ændring i samlet RavScore: -0,334 point.
- Spænd i samlet RavScore: -5 til +5 point.
- Spænd i transportkomponenten: -12 til +12 point, præcis inden for beslutningens loft.
- 3.900 scenarier skiftede farveniveau; de ligger i et bredt ekstremt syntetisk rum og er ikke et estimat for normal dansk forekomst.
- Pålandsbølger gav i gennemsnit +1,238 RavScore-point.
- Fralandsbølger gav i gennemsnit -1,614 RavScore-point.
- Middelstøtten steg gradvist fra periode 3 sekunder til 10 sekunder.
- Eksisterende loft ved tydelig fralandsstrøm blev bevaret i alle relevante scenarier.

## Aktuelt offentligt nationalt datasæt

- Datasættet dækkede 210 zoner og angav 673 forventede og beregnede kystdele.
- Det dynamiske public-udsnit indeholdt 218 aktuelle delposter, svarende til 436 beregninger på tværs af begge jagtformer.
- Alle 436 beregninger var tilgængelige.
- Gennemsnitlig ændring i samlet RavScore: +0,005 point.
- Spænd i samlet RavScore: -1 til +1 point.
- Ingen beregning skiftede farveniveau.
- Én zone manglede bølgeperiode og brugte den score-neutrale fallback.
- Højde, retning og lokal pålandsretning var tilgængelig i alle publicerede delposter.

## Vurdering

Den aktive prior er konservativ i de aktuelle forhold, reagerer i den forventede retning i det syntetiske rum og overholder alle aftalte lofter. Resultatet er go til fulde gates og browserkontrol. Det er ikke i sig selv en lokal kalibrering af bundfysik eller en tilladelse til at ændre vægte samtidig.

## Lokal browserkontrol før PR
- Browser-pluginet indlæste lokal 4.0.241-kode med det friske offentlige datasæt r-20260820181214-210 fra et grønt Pages-artefakt.
- Desktop viste rangliste, 5-døgnsprognose, pile, lokal kystdel, RavScore og transportforklaring uden konsol-, side- eller HTTP-fejl.
- System-Chrome/Playwright-fallback bestod ved 390 x 844 px uden vandret overløb, manglende data, manglende ressourcer eller skjult transportforklaring.
- Den fulde systematiske onlineaudit af 210 zoner og 673 kystdele udføres efter deploy, fordi produktionssiden før merge fortsat bruger 4.0.240.