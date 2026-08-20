# P1-komponentcyklusser efter 4.0.238-produktion

## Formål

Denne read-only kontrol afgør, om produktionens komponentovergange repræsenterer nye uafhængige DMI-modelcyklusser eller kun fortsat drift på allerede observerede modelkørsler. Kontrollen ændrer ingen data, kilder, fallback, RavScore eller geometri.

## Grundlag

- `#3246`: datasæt `rr-20260820040308-210`.
- `#3249`: datasæt `rr-20260820055859-210`.
- 4.0.238 push `#32344813967`/support `RavRadar-support-3252`: datasæt `rr-20260820074127-210`.
- Alle tre er analyseret med `scripts/audit-p1-component-matrix.py`.

## Modelcyklusser

Det nye 4.0.238-artifact introducerer ingen ny modelstart i forhold til det umiddelbart foregående produktionsgrundlag:

- Vind bruger HARMONIE `2026-08-20T00:00:00Z`.
- Bølger bruger WAM DW og WAM NSB `2026-08-19T18:00:00Z`.
- Strøm, vandstand og vandtemperatur bruger fortsat DKSS `2026-08-19T12:00:00Z` som nyeste marine modelstart.

Kørslen tæller derfor som stabil drift, releasebevis og naturlig historikvækst. Den tæller ikke som en ny uafhængig HARMONIE-, WAM- eller DKSS-cyklus i DEC-0030.

## Overgange

- Vind har fortsat én DMI-til-fallback-overgang pr. zone. Middel/p95 for hastighed er 1,027/2,5 m/s mod 1,109/3,1 m/s i #3246; retning er 37,957/128 grader mod 39,8/152 grader.
- Bølgeovergangenes sammenfattede deltaer er uændrede fra #3246: højde 0,107/0,38 m, retning 21,121/106 grader og periode 0,344/1,3 s for middel/p95.
- De seks `missing->fallback`-overgange fra #3246 er væk, fordi den låste referencetime igen er med. Den øvrige bølgekildeorden er uændret.
- Verificeret parentstrøm skifter ikke til fallback. De 198 verificerbare zoner går først til `missing` ved den reelle hale; de 12 geografiske huller forbliver `missing` hele vejen.
- Vandstand og vandtemperatur har fortsat 202 DMI-til-fallback-overgange og otte DMI-til-missing-haler. Ingen stale gentagelse eller kunstig udfyldning er indført.

## Konklusion

4.0.238 viser ingen overgangsregression, men giver heller ikke et nyt uafhængigt cyklusgrundlag. Permanente tærskler, ny fallback eller scoreændringer er derfor fortsat ikke fagligt godkendt. Næste kvalificerede artifact skal indeholde en ny modelstart for den komponent, der vurderes.

## Post-merge artifact #3256
- `#32354210495`/`RavRadar-support-3256`/`rr-20260820093508-210` har fortsat HARMONIE 20. august 00Z, WAM 19. august 18Z og DKSS 19. august 12Z som nyeste modelstarter.
- Vindens DMI-til-fallback-delta er fortsat 1,027/2,5 m/s og 37,957/128 grader for middel/p95. Bølgeovergangene er fortsat 0,107/0,38 m, 21,121/106 grader og 0,344/1,3 s.
- De 198 verificerbare strømzoner går fortsat `dmi -> missing`; de 12 geografiske huller har ingen konstrueret strøm. Feggesund er fortsat den ene zone uden bølgedata.
- Artifactet tæller som stabil drift og historikvækst, ikke som ny uafhængig cyklus. Ingen tærskel, fallback, score, geometri eller punkt ændres.
