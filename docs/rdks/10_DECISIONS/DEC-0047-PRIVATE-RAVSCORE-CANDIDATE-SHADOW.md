# DEC-0047: Privat RavScore-kandidat-shadow

**Status:** Aktiv, implementeret lokalt, virkelig national kørsel afventer merge

## Beslutning

RavScore-kandidaterne A, B og C må beregnes i den eksisterende private nationale shadow-kørsel. Beregningen er diagnostisk og må ikke påvirke den aktive score, det offentlige runtime, brugerfladen, vejrsamplingen, administratorens data eller geometri.

Den aktive model forbliver `RRS-CURRENT-B0-4.0.247` med vægtningen 25 procent jagtbarhed, 40 procent transport og 35 procent mobilisering.

## Hvorfor

Den syntetiske og offentlige sammenligning i v4.0.248 viste store forskelle mellem kandidaterne, men kunne ikke afgøre, om kandidat B måler levering mod stranden eller blot passage langs kysten. Den private nationale pipeline har de kortlivede rå vind-, bølge- og strømserier, som kan besvare dette uden at offentliggøre rå data.

## Bindende afgrænsning

- Genbrug den eksisterende private nationale shadow-validator og dens forgates.
- Udled 24 timers hændelseshistorik og 72 timers strømforløb pr. lokal kystdel.
- Beregn gammel aktiv score og A/B/C på præcis samme context.
- Opdel kandidat B minus A i strøm mod kysten, langs kysten, væk fra kysten og ukendt retning.
- Gem kun model-id'er, scorer, summerede forskelle, retningstype og højst fem største afvigelser.
- Gem aldrig rå vejrvektorer i rapporten.
- Markér eksplicit, at den nuværende nationale kontrakt ikke giver fuld dækning af lokale rev-, ålegræs- og lavtvandsfeatures. Den første rapport kan derfor vurdere levering og retning, men ikke bevise hele fastholdelsesdelen.
- Slet de transiente marine- og vindinput som hidtil.
- Sæt altid `scoreChanged`, `publicRuntimeChanged` og `automaticActivationAllowed` til `false`.
- Kør shadowen i de allerede afgrænsede private nationale jobs, ikke ved hver almindelig produktion eller PR.

## Aktivering

Ingen kandidat eller delregel må aktiveres alene på baggrund af et grønt job. Før en offentlig ændring kræves faglig gennemgang af retning, yderpunkter, scoreforklaring, scorebånd og konsekvens for hele systemet.

## Evidens

- `scripts/validate-national-shadow-score.mjs`
- `scripts/test-national-weather-shadow-contract.mjs`
- `docs/research/RAVSCORE_PRIVATE_SHADOW_METHOD_2026-08-21.md`
- DEC-0046 og v4.0.248-ejerrapporten
