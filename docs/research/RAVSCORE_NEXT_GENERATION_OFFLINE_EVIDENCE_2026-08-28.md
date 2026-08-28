# Næste RavScore – datasikkert offlinebevis

**Model:** `RRS-COASTAL-CAUSAL-CHAIN-1`
**Stateprofil:** `coastal-supply-smooth-in6.578813-out8.312951-window48-boundary0-wave-build4-decay48`
**Bevis-hash:** `b96a5da65c2c7becb30c72c3a886d9509eee410e30922e2b1326bc499058cb14`

Beviset bruger 288 syntetiske, koordinatfrie scenarier. Det bruger ingen private payloads, rå U/V eller fund-/nul-funddata og kan derfor dokumentere struktur og regressioner, men **ikke** bedre empirisk fundpræcision.

## Gammel mod ny

Candidate G sammenlignes kun offline. Rangkorrelationen er 0.871988; scoredeltaets median er -16 point og 10–90 %-intervallet er -35 til -9.7. Ændringerne er tilsigtede, fordi den nye model gør supply og mobilisering til nødvendige kausale led frem for additive vægte.

## Ablationer

- Uden supply: Candidate G 32, ny model 0.
- Uden mobilisering: Candidate G 44, ny model 0.
- Bølgeretningens bundne spænd i referencescenariet: 10 point; ingen surfzoneopløsning hævdes.
- Waders: roligt 70, hårdt 0; scoren overstiger ikke jagtbarhedsloftet.

## Fralandsrettet grid-evidens

Candidate G aktiverer sin gamle kategoriske gate ved 13 effektive timer. Den nye state er fortsat positiv efter både 13 og 14 timer, og timeforholdene 0.920000005 og 0.920000015 er ens. Dæmpningen er derfor glat og udlægges ikke som observeret tømning af strand eller surfzone.

## Faldende vand

Faldende vand påvirker kun den afgrænsede søgefokus-/jagtbarhedsprior. Det største scoreudsving i sweepet er 1 point. Supplypåvirkning og ekstra gridstrøm er nul; lokal revle/rende hævdes ikke observeret.
