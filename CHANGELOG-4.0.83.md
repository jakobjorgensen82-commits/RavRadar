# RavRadar 4.0.83 – permanent rettelse af offentlig opstart

## Dokumenteret rodårsag
- Versionssammenligning viste, at 4.0.76 blev fuldt klar på ca. 3,5 sekunder, mens 4.0.78 brugte ca. 21,5 sekunder, selv om offentlig appkode og runtimefilens størrelse var næsten uændret.
- Den adaptive model blev læst fra localStorage, JSON-parset, kopieret og normaliseret for hver scoreberegning. Landsprognosen udfører ca. 24.662 beregninger. En voksende model gjorde derfor opstarten proportional med modelstørrelsen.

## Permanent løsning
- `loadAdaptiveModel()` memoiserer nu både rå lagertekst og den normaliserede model. Uændret lagerindhold parses og normaliseres kun én gang.
- Gemning opdaterer cache atomisk, så alle UI- og servicekodeveje får samme aktuelle model uden gentagen behandling.
- Hovedvisningen sender fortsat modellen eksplicit gennem bulkberegninger. Memoiseringen beskytter også ældre eller oversete kaldesteder.
- Første paint og tidsopdelt prognoserendering bevares som ekstra robusthed, ikke som erstatning for performance-rettelsen.

## Målt regressionstest
- 24.662 beregninger med normal model: ca. 0,25 sekunder.
- Samme belastning med kunstigt stor model på 1.000 regler før rettelsen: ca. 12–14 sekunder.
- Samme belastning med én genbrugt model: ca. 0,5 sekunder.
