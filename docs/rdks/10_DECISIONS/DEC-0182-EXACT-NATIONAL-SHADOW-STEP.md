# DEC-0182 – National shadow-test skal læse det eksakte workflowtrin

**Status:** Aktiv og bindende; implementeret og måltestet lokalt i 4.0.400,
livebevis afventer
**Dato:** 2026-09-17

## Baggrund

4.0.399 er online. Normalrun `35176561317` gennemførte DMI, Copernicus og
Open-Meteo, gemte cacher, byggede offentlig runtime og bestod den uafhængige
210/673-audit. Fuldvalideringen stoppede bagefter i
`test-national-weather-shadow-contract.mjs`.

Workflowets trin `Validate isolated private native wind series for coastal
parts` havde allerede det krævede
`DMI_BULK_MAX_RUNTIME_SECONDS: "3000"`. Testen søgte imidlertid kun de næste
180 tegn efter en kortere tekstmarkør. En længere `continue-on-error`-linje
flyttede budgettet uden for vinduet og skabte en falsk fejl.

## Beslutning

Testen skal finde det eksakte navngivne YAML-trin og læse hele trinnet frem
til næste trin. Budgettet kontrolleres kun inde i denne afgrænsning. Samme
billige statiske test indgår i `test:deploy-source-critical`, så en reel
kontraktfejl fanges før dyrt providerarbejde.

`set-version.mjs` bruger samtidig callback-erstatninger ved capture groups.
Dermed kan en replacement som `$1` ikke længere blive fortolket som `$14`,
når den efterfølges af versionen `4.x.x`.

## Data- og driftsbetydning

Runnet bogførte alle 79.414 identiteter, heraf 420 som ærligt lokalt
`MISSING`. Det er ikke et komplet vejrdatasæt, men DEC-0173 kræver, at resten
af RavRadar fortsætter. Ingen provider ramte tids-, forsøgs-, kø- eller global
fejlgrænse.

Rettelsen ændrer ikke RavScore, vejrdata, providerresultater, cache,
kildeprioritet, geometri eller offentlig score. 4.0.400 leveres providerfrit
efter én exact-head. Derefter køres én almindelig weather på de gemte cacher;
ingen oneoff.
