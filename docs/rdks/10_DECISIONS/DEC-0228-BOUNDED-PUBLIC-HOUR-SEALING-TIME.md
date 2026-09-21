# DEC-0228 – Bounded tid til public-hour-forsegling

**Status:** Bindende fra 4.0.450, livebevis afventer.

## Beslutning

`npm run update:weather` skal have en realistisk, men fast tidsgrænse, der
dækker både scorebygningen og den hashbundne forsegling/materialisering af de
118 offentlige timer. Den centrale vejrhandling og den tilsvarende private
kapacitetsfortsættelse bruger derfor 45 minutter.

## Grundlag

Run `35546109889` nåede alle tre leverandørled og 673/673 scoredele, men blev
afbrudt af workflowets 25-minuttersgrænse i stedet for en kode- eller
datakontraktfejl. Den providerfri genbygning `35544581922` brugte 21 minutter
på runtimeforseglingen alene. 45 minutter giver plads til den målte tid plus
normal variation uden at gøre processen ubundet.

## Afgrænsning

Providerbudgetter, DMI-first, fallback, score, dataregler og fail-closed
dataintegritet ændres ikke. En reel procesfejl, manglende data eller ugyldigt
artifact skal stadig stoppe; kun den for snævre tidsgrænse er ændret.
