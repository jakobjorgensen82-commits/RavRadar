# RavRadar 4.0.108

## Rettet workflow-rækkefølge for DMI og strømaudit

4.0.107 kunne fejle på en push/forceret kørsel, fordi den fulde validering blev kørt på det hydrerede, tidligere deployede datasæt, før den nye DMI-kørsel havde bygget friske u/v-data og videnskabelig strømproveniens. `test:current-spatial-audit` kunne derfor se 0 direkte verificerede prognosetimer og stoppe workflowet, før vejropdateringen overhovedet blev kørt.

### Ny rækkefølge

1. Hydrér seneste deployede vejrtilstand.
2. Afgør om vejret skal opdateres.
3. Kør DMI- og vejropdateringen.
4. Byg videnskabelig u/v-proveniens og eksakte DMI-gitterpunkter.
5. Genbyg det deterministiske offentlige datasæt.
6. Kør fuld projektvalidering og release gate.
7. Deploy først derefter.

Den tidlige strømaudit på det hydrerede datasæt er fjernet. Der er tilføjet regressionstesten `test:workflow-validation-order`, som låser rækkefølgen.

## Uændret funktionalitet

- RavScore og 4.0.107-tilstandsmodellen i skyggetilstand er ikke ændret.
- DMI-u/v er fortsat eneste strømkilde; generelle strømbånd bruges ikke.
- Offentlig load-rækkefølge og kompakte public-data er uændret.
- Vandstationsrettelsen fra 4.0.106, herunder røde administratorprikker, override, Fjern og beskyttelse mod `QuotaExceededError`, er bevaret.
