# RavScore 4.0.242 produktionsaudit

Dato: 2026-08-20 til 2026-08-21

## Konklusion

Den foreløbige RavScore-vægtning er produktionsverificeret som:

- Jagtbarhed: 25 %
- Transport: 40 %
- Mobilisering: 35 %

Score, delscorer, pile, pointbidrag og brugerforklaringer stemmer sammen i den deployede 4.0.242. Ingen geometri, kystdelspunkter eller land-/vandpunkter blev flyttet.

## Levering

- Featurecommit: `d31ed53df8fe0d43ff44b4d1a55bbcb0162cc831`
- Pull Request: #28
- Mergecommit på `main`: `4f3481f272de11554fb64ad602555804f362b715`
- Produktionsworkflow: `32421188352`
- Workflowresultat: frisk data, fuld validering, release-gate, Supabase-synkronisering og GitHub Pages-deploy bestået.

## Browserkontrol

Browser-pluginet blev forsøgt først. Det kunne ikke opløse produktionsdomænet og returnerede `ERR_NAME_NOT_RESOLVED`. Den godkendte system-Chromium/Playwright-fallback blev derfor brugt mod den direkte GitHub Pages-adresse.

Den almindelige fulde kontrol bestod på datasættet `rr-20260820215229-210`:

- 210 zoner
- 673 kystdelsreferencer
- 420 aktuelle zonevisninger, to jagtformer
- 2.100 prognosevisninger, fem dage og to jagtformer
- 0 funktionsfejl
- 0 konsolfejl
- 0 sidefejl
- 0 HTTP-fejl

Den udvidede vægt- og forklaringskontrol bestod på det efterfølgende naturlige datasæt `rr-20260820220004-210`:

- De samme 210 zoner, 673 kystdelsreferencer, 420 aktuelle visninger og 2.100 prognosevisninger
- 7.560 viste delscoreforklaringer kontrolleret
- Hver forklaring brugte henholdsvis 25 %, 40 % og 35 %
- Den viste delscore var den samme som tallet i bidragsregnestykket
- Det viste pointbidrag var korrekt afrundet for den viste delscore og vægt
- Den viste samlede score, niveau, pile, vejrdata og begrundelser stemte med runtime-data
- 0 fejl

Datasættet skiftede under kontrolperioden på grund af den naturlige planlagte opdatering. Hver enkelt browserkørsel brugte ét internt sammenhængende datasæt og den samme deployede 4.0.242-kode.

## Mobilkontrol

System-Chromium blev kørt ved 390 x 844:

- Version 4.0.242 vist
- Intet vandret overløb
- Zonepanel inden for viewporten
- Samlet score vist
- To aktive retningspile vist
- Fem prognosedage vist
- Tre delscorer vist
- 25/40/35-regnestykke korrekt
- 0 sidefejl og 0 HTTP-fejl

## Status

4.0.242 er produktionsverificeret. Vægtningen er fortsat fagligt foreløbig og skal senere kalibreres mod et tilstrækkeligt stort og repræsentativt datasæt af både fund- og nul-fundsture. Enkeltfund bruges ikke som selvstændigt kalibreringsgrundlag.
