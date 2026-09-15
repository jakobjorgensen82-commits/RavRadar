# RavRadar 4.0.370 – stor privat runtime gendannes uden regex-stack

**Dato:** 2026-09-15  
**Status:** Merged som `9b5c82a8`; stor restore/udpakning livebevist. Efterfølgende bindingfixture afløst af 4.0.371/DEC-0152.

## Produktionsbevis før rettelsen

4.0.369 bestod sourcegate `34918950377`, blev merged gennem PR #311 som main
`329ce119dafdaf2ab4434a29601254a84c75fb65`, og code-only-run `34919375457`
genbrugte sourcebeviset og central version 1. Migration 17 blev installeret og
læst tilbage, og den gemte forgængergeneration blev bevist utilgængelig uden
login. Ingen provider blev kontaktet.

Runnet stoppede ved forgængerrestore. GitHubs shell-errexit betød samtidig, at
den planlagte tre-forsøgs-løkke kun tog ét forsøg. Den sikre kode var
`UNKNOWN_ARCHIVE_EXTRACTION`; ingen runtime, Pages eller central completion
blev skrevet.

## Samlet rettelse

- En produktionslignende 5 MiB cache reproducerede samme udpakningsfase: den
  gamle base64-regex løb tør for stack på lange gyldige strenge.
- Base64 syntakskontrolleres nu lineært uden regex-stack. Filen dekodes,
  dekomprimeres, størrelsesbegrænses og SHA-256-kontrolleres i højst 4 MiB
  bidder før atomisk mappeflytning.
- Restoreløkken bruger en shell-`if`, så GitHubs implicitte errexit ikke kan
  afbryde før andet og tredje forsøg. Faste filsystem- og udpakningsfasekoder
  forbliver uden private paths eller payload.

Migration 17 er allerede produktionstilstand og må ikke genkøres. Næste
code-only-run skal acceptere nul pending migrationer og fortsætte uden DMI,
Copernicus, Open-Meteo eller oneoff.
